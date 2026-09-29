/**
 * 「同频」Same Wavelength — 记忆固化引擎
 *
 * 核心逻辑：
 *   1. 瞬时记忆 → 每日压缩 → 短期记忆
 *   2. 短期记忆 → 重复模式≥3次 → 长期记忆晋级
 *   3. 长期记忆 → >30天未出现 → 衰减降权
 *   4. 长期记忆 → >90天未出现 → 归档
 *   5. 硬约束自动学习：连续忽略/拒绝 → 晋级为长期硬性约束
 *
 * 执行时机：
 *   - 每日凌晨：压缩瞬时记忆、衰减检查
 *   - 每周日：生成周摘要、晋级候选评估
 */

import {
  MemoryEntry,
  MemoryId,
  MemoryType,
  PromotionCandidate,
  PromotionReason,
  DecayCandidate,
  DecayReason,
  MemoryWriteRequest,
} from './types/MemoryEntry';
import {
  InstantMemoryEntry,
  InstantMemoryWorkspace,
  InstantMemoryCompression,
} from './types/InstantMemoryTypes';
import {
  ShortTermMemoryEntry,
  DailySummary,
  InterventionRecord,
  WeeklySummary,
  RepeatedPattern,
} from './types/ShortTermMemoryTypes';
import {
  LongTermMemoryEntry,
  HardConstraint,
  ConstraintType,
  ConstraintSource,
  ConstraintCondition,
  IgnoredInterventionType,
  EffectiveStrategy,
  StrategyStep,
} from './types/LongTermMemoryTypes';
import {
  LONG_TERM_PROMOTION_THRESHOLD,
  LONG_TERM_DECAY_THRESHOLD_DAYS,
  LONG_TERM_ARCHIVE_THRESHOLD_DAYS,
  INSTANT_MEMORY_WINDOW_HOURS,
  REJECTION_COOLDOWN_THRESHOLD,
} from '../core/Config';
import { UserFeedbackType } from '../core/IntentTypes';
import { Snapshot } from '../perception/types/Snapshot';

// ============================================================================
// 记忆固化引擎
// ============================================================================

export class MemoryConsolidationEngine {
  /** 模式检测：用于跨日摘要比较发现重复模式 */
  private patternRegistry: Map<string, PatternOccurrence[]> = new Map();

  // ==========================================================================
  // 瞬时记忆 → 每日压缩 → 短期记忆
  // ==========================================================================

  /**
   * 将过期的瞬时记忆工作台压缩为每日摘要
   *
   * @param workspace 当前的瞬时记忆工作台
   * @param date 目标日期
   * @returns 每日摘要 + 压缩记录
   */
  compressInstantMemory(
    workspace: InstantMemoryWorkspace,
    date: string,
  ): { dailySummary: DailySummary; compression: InstantMemoryCompression } {
    const snapshots = workspace.recentSnapshots;
    const dialogueTurns = workspace.activeConversation.turns;

    // 计算当日指标均值
    const moodAvg = snapshots.length > 0
      ? snapshots.reduce((s, snap) => s + snap.mood.overallScore, 0) / snapshots.length
      : 0.5;
    const socialAvg = snapshots.length > 0
      ? snapshots.reduce((s, snap) => s + snap.socialWillingness.overallScore, 0) / snapshots.length
      : 0.5;

    // 提取高亮事件
    const highlights = this.extractHighlights(snapshots, dialogueTurns);

    // 生成对话摘要
    const dialogueSummary = this.summarizeDialogue(dialogueTurns);

    const dailySummary: DailySummary = {
      kind: 'daily_summary',
      date,
      moodAvg: Math.round(moodAvg * 100) / 100,
      socialWillingnessAvg: Math.round(socialAvg * 100) / 100,
      sleep: {
        totalHours: snapshots[snapshots.length - 1]?.health?.latestSleep?.totalHours ?? 0,
        qualityScore: snapshots[snapshots.length - 1]?.health?.latestSleep?.qualityScore ?? 0,
      },
      activity: {
        stepCount: snapshots[snapshots.length - 1]?.health?.latestActivity?.stepCount ?? 0,
        outdoorMinutes: snapshots[snapshots.length - 1]?.health?.latestActivity?.outdoorMinutes ?? 0,
      },
      screenUsage: {
        totalHours: snapshots[snapshots.length - 1]?.usage?.totalScreenTimeHours ?? 0,
        socialHours: snapshots[snapshots.length - 1]?.usage?.socialAppHours ?? 0,
        videoHours: snapshots[snapshots.length - 1]?.usage?.videoAppHours ?? 0,
        studyHours: snapshots[snapshots.length - 1]?.usage?.studyAppHours ?? 0,
        lateNightUsage: snapshots.some(s => s.usage.lateNightUsage),
      },
      highlights,
      interventionCounts: {}, // 由外部填充
      socialInteractionCount: 0,
    };

    const compression: InstantMemoryCompression = {
      compressedAt: Date.now(),
      timeRange: { start: workspace.createdAt, end: Date.now() },
      dialogueSummary,
      emotionalSummary: workspace.activeConversation.emotionalTrajectory.description,
      keyEvents: highlights,
      currentConcerns: [],
    };

    return { dailySummary, compression };
  }

  // ==========================================================================
  // 短期记忆 → 长期记忆晋级检查
  // ==========================================================================

  /**
   * 检查短期记忆中的重复模式，决定是否晋级为长期记忆
   *
   * @param dailySummaries 最近7天的每日摘要
   * @param interventions 最近10次干预记录
   * @returns 晋级候选列表
   */
  evaluatePromotions(
    dailySummaries: DailySummary[],
    interventions: InterventionRecord[],
  ): PromotionCandidate[] {
    const candidates: PromotionCandidate[] = [];

    // 1. 检查情绪模式重复
    const moodPatterns = this.detectMoodPatterns(dailySummaries);
    for (const pattern of moodPatterns) {
      if (pattern.occurrenceCount >= LONG_TERM_PROMOTION_THRESHOLD) {
        candidates.push({
          entry: this.createPromotionEntry(pattern, MemoryType.SHORT_TERM),
          reason: PromotionReason.REPEATED_PATTERN,
          repeatCount: pattern.occurrenceCount,
          targetType: MemoryType.LONG_TERM,
          confidence: Math.min(0.95, 0.5 + pattern.occurrenceCount * 0.15),
        });
      }
    }

    // 2. 检查社交行为模式重复
    const socialPatterns = this.detectSocialPatterns(dailySummaries);
    for (const pattern of socialPatterns) {
      if (pattern.occurrenceCount >= LONG_TERM_PROMOTION_THRESHOLD) {
        candidates.push({
          entry: this.createPromotionEntry(pattern, MemoryType.SHORT_TERM),
          reason: PromotionReason.REPEATED_PATTERN,
          repeatCount: pattern.occurrenceCount,
          targetType: MemoryType.LONG_TERM,
          confidence: Math.min(0.9, 0.4 + pattern.occurrenceCount * 0.15),
        });
      }
    }

    // 3. 检查干预偏好：连续忽略/拒绝 → 晋级为长期约束
    const constraintPatterns = this.detectConstraintPatterns(interventions);
    for (const pattern of constraintPatterns) {
      candidates.push({
        entry: this.createPromotionEntry(pattern, MemoryType.SHORT_TERM),
        reason: PromotionReason.HIGH_IMPORTANCE,
        repeatCount: pattern.occurrenceCount,
        targetType: MemoryType.LONG_TERM,
        confidence: 0.9,
      });
    }

    // 4. 检查有效干预策略 → 晋级为有效策略库
    const effectiveStrategies = this.detectEffectiveStrategies(interventions);
    for (const strategy of effectiveStrategies) {
      candidates.push({
        entry: this.createPromotionEntry(strategy, MemoryType.SHORT_TERM),
        reason: PromotionReason.EFFECTIVE_INTERVENTION,
        repeatCount: strategy.occurrenceCount,
        targetType: MemoryType.LONG_TERM,
        confidence: 0.8,
      });
    }

    return candidates;
  }

  // ==========================================================================
  // 长期记忆衰减检查
  // ==========================================================================

  /**
   * 检查长期记忆中需要衰减/归档的条目
   */
  evaluateDecay(longTermEntries: LongTermMemoryEntry[]): DecayCandidate[] {
    const now = Date.now();
    const candidates: DecayCandidate[] = [];

    for (const entry of longTermEntries) {
      const daysSinceLastAccess = (now - entry.lastAccessedAt) / (86400 * 1000);

      // >90天未访问 → 归档
      if (daysSinceLastAccess >= LONG_TERM_ARCHIVE_THRESHOLD_DAYS) {
        candidates.push({
          entry,
          reason: DecayReason.PATTERN_BROKEN,
          currentWeight: entry.decay.currentWeight,
          suggestedWeight: 0,
        });
        continue;
      }

      // >30天未访问 → 衰减降权
      if (daysSinceLastAccess >= LONG_TERM_DECAY_THRESHOLD_DAYS) {
        const decayFactor = 1 - (daysSinceLastAccess - LONG_TERM_DECAY_THRESHOLD_DAYS) /
          (LONG_TERM_ARCHIVE_THRESHOLD_DAYS - LONG_TERM_DECAY_THRESHOLD_DAYS);
        const newWeight = entry.decay.currentWeight * Math.max(0.1, decayFactor);

        if (newWeight < entry.decay.currentWeight * 0.8) {
          candidates.push({
            entry,
            reason: DecayReason.NOT_ACCESSED,
            currentWeight: entry.decay.currentWeight,
            suggestedWeight: Math.round(newWeight * 100) / 100,
          });
        }
      }
    }

    return candidates;
  }

  // ==========================================================================
  // 硬约束自动学习
  // ==========================================================================

  /**
   * 从用户反馈中自动学习硬性约束
   *
   * 规则：
   *   - 连续≥3次深夜推送被忽略 → 学习"深夜不推送"约束
   *   - 连续≥3次某类型拒绝 → 学习"该类型冷却"约束
   *   - 用户明确设定 → 直接晋级为约束
   */
  learnHardConstraints(
    interventions: InterventionRecord[],
    ignoredTypes: IgnoredInterventionType[],
    existingConstraints: HardConstraint[],
  ): HardConstraint[] {
    const newConstraints: HardConstraint[] = [];
    const now = Date.now();

    // 1. 从被忽略的类型学习
    for (const ignored of ignoredTypes) {
      if (ignored.consecutiveIgnores >= REJECTION_COOLDOWN_THRESHOLD) {
        // 检查是否已有此约束
        const exists = existingConstraints.some(c =>
          c.constraintType === ConstraintType.TYPE_RESTRICTION &&
          c.condition.interventionTypes?.includes(ignored.type)
        );
        if (!exists) {
          newConstraints.push({
            kind: 'constraint',
            id: `constraint_auto_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            description: `自动学习：用户连续${ignored.consecutiveIgnores}次忽略'${ignored.type}'类型推送`,
            constraintType: ConstraintType.TYPE_RESTRICTION,
            condition: {
              interventionTypes: [ignored.type],
            },
            source: ConstraintSource.AGENT_LEARNED,
            createdAt: now,
            enabled: true,
            userConfirmed: false, // 需用户确认后完全生效
          });
        }
      }
    }

    // 2. 从拒绝行为学习时间约束
    const nightRejections = interventions.filter(i => {
      const hour = new Date(i.timestamp).getHours();
      return (hour >= 23 || hour < 8) &&
        (i.userFeedback?.type === 'ignored' || i.userFeedback?.type === 'rejected');
    });

    if (nightRejections.length >= REJECTION_COOLDOWN_THRESHOLD) {
      const exists = existingConstraints.some(c =>
        c.constraintType === ConstraintType.TIME_RESTRICTION &&
        c.description.includes('夜间')
      );
      if (!exists) {
        newConstraints.push({
          kind: 'constraint',
          id: `constraint_night_${now}`,
          description: '自动学习：用户夜间多次拒绝推送，建议21:00后不推送',
          constraintType: ConstraintType.TIME_RESTRICTION,
          condition: {
            timeWindows: ['23:00-08:00'],
          },
          source: ConstraintSource.AGENT_LEARNED,
          createdAt: now,
          enabled: true,
          userConfirmed: false,
        });
      }
    }

    return newConstraints;
  }

  // ==========================================================================
  // 模式检测算法
  // ==========================================================================

  /**
   * 检测情绪模式重复
   * 例：连续3周"周末情绪比工作日好10%"
   */
  private detectMoodPatterns(dailySummaries: DailySummary[]): RepeatedPattern[] {
    const patterns: RepeatedPattern[] = [];
    if (dailySummaries.length < 3) return patterns;

    // 周末 vs 工作日比较
    const weekdayMoods: number[] = [];
    const weekendMoods: number[] = [];

    for (const s of dailySummaries) {
      const day = new Date(s.date).getDay();
      if (day === 0 || day === 6) {
        weekendMoods.push(s.moodAvg);
      } else {
        weekdayMoods.push(s.moodAvg);
      }
    }

    if (weekendMoods.length >= 2 && weekdayMoods.length >= 3) {
      const weekendAvg = weekendMoods.reduce((a, b) => a + b, 0) / weekendMoods.length;
      const weekdayAvg = weekdayMoods.reduce((a, b) => a + b, 0) / weekdayMoods.length;
      const diff = weekendAvg - weekdayAvg;

      if (Math.abs(diff) > 0.1) {
        patterns.push({
          description: diff > 0
            ? `周末情绪通常比工作日好${Math.round(Math.abs(diff) * 100)}%`
            : `周末情绪通常比工作日差${Math.round(Math.abs(diff) * 100)}%`,
          type: 'emotional',
          occurrenceCount: weekendMoods.length,
          lastOccurrenceDate: dailySummaries[dailySummaries.length - 1].date,
          confidence: 0.7,
          suggestedAction: 'promote_to_long_term',
        });
      }
    }

    return patterns;
  }

  private detectSocialPatterns(dailySummaries: DailySummary[]): RepeatedPattern[] {
    const patterns: RepeatedPattern[] = [];
    if (dailySummaries.length < 3) return patterns;

    // 检测社交退缩模式
    let declineCount = 0;
    for (let i = 1; i < dailySummaries.length; i++) {
      if (dailySummaries[i].socialWillingnessAvg < dailySummaries[i - 1].socialWillingnessAvg) {
        declineCount++;
      }
    }

    if (declineCount >= LONG_TERM_PROMOTION_THRESHOLD) {
      patterns.push({
        description: `检测到社交意愿持续下降模式(${declineCount}天)`,
        type: 'social',
        occurrenceCount: declineCount,
        lastOccurrenceDate: dailySummaries[dailySummaries.length - 1].date,
        confidence: 0.6,
        suggestedAction: 'monitor',
      });
    }

    return patterns;
  }

  private detectConstraintPatterns(
    interventions: InterventionRecord[],
  ): RepeatedPattern[] {
    const patterns: RepeatedPattern[] = [];
    const typeStats = new Map<string, { ignored: number; rejected: number; total: number }>();

    for (const i of interventions) {
      const stats = typeStats.get(i.interventionType) ?? { ignored: 0, rejected: 0, total: 0 };
      stats.total++;
      if (i.userFeedback?.type === 'ignored') stats.ignored++;
      if (i.userFeedback?.type === 'rejected') stats.rejected++;
      typeStats.set(i.interventionType, stats);
    }

    for (const [type, stats] of typeStats) {
      const negativeRate = (stats.ignored + stats.rejected) / stats.total;
      if (negativeRate > 0.8 && stats.total >= LONG_TERM_PROMOTION_THRESHOLD) {
        patterns.push({
          description: `用户对'${type}'类型干预负面响应率${Math.round(negativeRate * 100)}%`,
          type: 'constraint',
          occurrenceCount: stats.total,
          lastOccurrenceDate: new Date().toISOString().split('T')[0],
          confidence: 0.85,
          suggestedAction: 'promote_to_long_term',
        });
      }
    }

    return patterns;
  }

  private detectEffectiveStrategies(
    interventions: InterventionRecord[],
  ): RepeatedPattern[] {
    const patterns: RepeatedPattern[] = [];
    const effectiveInterventions = interventions.filter(i =>
      i.userFeedback?.type === 'clicked' || i.userFeedback?.type === 'positive_reply'
    );

    // 按类型统计有效干预
    const typeStats = new Map<string, number>();
    for (const i of effectiveInterventions) {
      typeStats.set(i.interventionType, (typeStats.get(i.interventionType) ?? 0) + 1);
    }

    for (const [type, count] of typeStats) {
      if (count >= LONG_TERM_PROMOTION_THRESHOLD) {
        patterns.push({
          description: `干预类型'${type}'被有效接受${count}次`,
          type: 'preference',
          occurrenceCount: count,
          lastOccurrenceDate: new Date().toISOString().split('T')[0],
          confidence: 0.8,
          suggestedAction: 'promote_to_long_term',
        });
      }
    }

    return patterns;
  }

  // ==========================================================================
  // 工具方法
  // ==========================================================================

  private extractHighlights(
    snapshots: Snapshot[],
    dialogueTurns: { text: string; speaker: string }[],
  ): string[] {
    const highlights: string[] = [];

    if (snapshots.length === 0 && dialogueTurns.length === 0) {
      highlights.push('今日无特别事件');
      return highlights;
    }

    // 从快照提取显著变化
    const latest = snapshots[snapshots.length - 1];
    if (latest) {
      if (latest.mood.overallScore < 0.4) highlights.push('情绪偏低');
      if (latest.socialWillingness.overallScore < 0.3) highlights.push('社交意愿低');
      if (latest.health?.latestSleep && latest.health.latestSleep.totalHours < 5) {
        highlights.push('睡眠不足');
      }
      if (latest.usage?.lateNightUsage) highlights.push('深夜使用手机');
    }

    // 从对话提取关键信息
    const userTurns = dialogueTurns.filter(t => t.speaker === 'user');
    if (userTurns.length > 0) {
      const lastTurn = userTurns[userTurns.length - 1];
      if (lastTurn.text.length > 5) {
        highlights.push(`用户最后发言: "${lastTurn.text.slice(0, 30)}..."`);
      }
    }

    return highlights.length > 0 ? highlights : ['今日无特别事件'];
  }

  private summarizeDialogue(
    turns: { text: string; speaker: string; intent?: string; sentiment?: string }[],
  ): string {
    if (turns.length === 0) return '今日无对话';
    const userTurns = turns.filter(t => t.speaker === 'user');
    if (userTurns.length === 0) return 'Agent发言但用户未回应';

    const sentiments = userTurns.map(t => t.sentiment).filter(Boolean);
    const dominantSentiment = sentiments.length > 0
      ? sentiments.sort()[Math.floor(sentiments.length / 2)]
      : '中性';

    return `今日${userTurns.length}轮对话，情绪基调: ${dominantSentiment || '中性'}`;
  }

  private createPromotionEntry(
    pattern: RepeatedPattern,
    sourceType: MemoryType,
  ): MemoryEntry {
    return {
      id: `promo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: sourceType,
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      accessCount: 1,
      source: 'MemoryConsolidation',
      tags: [pattern.type, 'auto_detected'],
      importance: pattern.confidence,
      decayRate: 0.01,
    };
  }
}

// ============================================================================
// 模式出现记录
// ============================================================================

interface PatternOccurrence {
  date: string;
  value: number;
  context: string;
}
