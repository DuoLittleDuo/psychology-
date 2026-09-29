/**
 * 「同频」Same Wavelength — 记忆召回引擎
 *
 * 负责从三层记忆中精确检索与当前情境最相关的信息。
 * 排序算法：相关性 = α × 语义匹配 + β × 时间新鲜度 + γ × 历史有效性
 *
 * 召回流程：
 *   Step 1: 瞬时记忆 → 当前对话上下文
 *   Step 2: 短期记忆 → 过去7天情绪趋势 + 最近干预效果
 *   Step 3: 长期记忆 → 用户人格 + 历史有效干预 + 硬性约束
 */

import {
  MemoryEntry,
  MemoryQuery,
  MemoryRecallResult,
  MemoryId,
  MemoryType,
} from './types/MemoryEntry';
import { InstantMemoryEntry, InstantMemoryWorkspace } from './types/InstantMemoryTypes';
import { ShortTermMemoryEntry, ShortTermMemoryView, DailySummary, InterventionRecord, SocialMatchRecord, ActiveBuddyInfo } from './types/ShortTermMemoryTypes';
import { LongTermMemoryEntry, LongTermMemoryView, UserPersonaModel, HardConstraint, EffectiveStrategy } from './types/LongTermMemoryTypes';
import { MEMORY_RECALL_WEIGHTS } from '../core/Config';

// ============================================================================
// 记忆召回引擎
// ============================================================================

export class MemoryRecallEngine {
  // ==========================================================================
  // 全层召回
  // ==========================================================================

  /**
   * 执行跨层记忆召回
   *
   * @param query 查询条件
   * @param instantStore 瞬时记忆存储
   * @param shortTermStore 短期记忆存储
   * @param longTermStore 长期记忆存储
   * @param workspace 当前瞬时工作台
   * @returns 召回结果（包含融合建议）
   */
  recallAcrossLayers(
    query: MemoryQuery,
    instantStore: Map<MemoryId, InstantMemoryEntry>,
    shortTermStore: Map<MemoryId, ShortTermMemoryEntry>,
    longTermStore: Map<MemoryId, LongTermMemoryEntry>,
    workspace: InstantMemoryWorkspace | null,
  ): MemoryRecallResult {
    const startTime = Date.now();
    const results: MemoryEntry[] = [];
    const relevanceScores = new Map<MemoryId, number>();

    // Step 1: 瞬时记忆（最高时效性）
    if (workspace) {
      const instantContext = this.recallFromInstant(workspace, query);
      for (const entry of this.convertWorkspaceToEntries(workspace)) {
        results.push(entry);
        relevanceScores.set(entry.id, this.computeRelevance(entry, query, 'instant'));
      }
    }

    // Step 2: 短期记忆（7天趋势 + 最近干预）
    const shortTermResults = this.recallFromShortTerm(shortTermStore, query);
    for (const entry of shortTermResults) {
      results.push(entry);
      relevanceScores.set(entry.id, this.computeRelevance(entry, query, 'short_term'));
    }

    // Step 3: 长期记忆（人格 + 策略 + 约束）
    const longTermResults = this.recallFromLongTerm(longTermStore, query);
    for (const entry of longTermResults) {
      results.push(entry);
      relevanceScores.set(entry.id, this.computeRelevance(entry, query, 'long_term'));
    }

    // 排序：按相关性降序
    results.sort((a, b) =>
      (relevanceScores.get(b.id) ?? 0) - (relevanceScores.get(a.id) ?? 0)
    );

    // 生成融合建议
    const recommendedApproach = this.synthesizeRecommendation(
      results.slice(0, 10),
      shortTermStore,
      longTermStore,
      workspace,
    );

    return {
      entries: results.slice(0, query.limit ?? 20),
      relevanceScores,
      latencyMs: Date.now() - startTime,
      sources: {
        instantCount: workspace ? 1 : 0,
        shortTermCount: shortTermResults.length,
        longTermCount: longTermResults.length,
      },
      recommendedApproach,
    };
  }

  // ==========================================================================
  // 分层召回
  // ==========================================================================

  /** 从瞬时记忆召回 */
  private recallFromInstant(
    workspace: InstantMemoryWorkspace,
    query: MemoryQuery,
  ): {
    activeIntent: string;
    currentMood: number;
    inDialogue: boolean;
    recentConcerns: string[];
  } {
    return {
      activeIntent: workspace.activeConversation.currentIntent,
      currentMood: workspace.summary.currentMoodScore,
      inDialogue: workspace.activeConversation.isActive,
      recentConcerns: [],
    };
  }

  /** 从短期记忆召回 */
  private recallFromShortTerm(
    store: Map<MemoryId, ShortTermMemoryEntry>,
    query: MemoryQuery,
  ): ShortTermMemoryEntry[] {
    let entries = Array.from(store.values());

    // 时间过滤
    if (query.timeRange) {
      entries = entries.filter(e =>
        e.createdAt >= query.timeRange!.start &&
        e.createdAt <= query.timeRange!.end
      );
    }

    // 标签过滤
    if (query.tags && query.tags.length > 0) {
      entries = entries.filter(e =>
        e.tags.some(t => query.tags!.includes(t))
      );
    }

    // 关键词模糊匹配
    if (query.query) {
      const lowerQuery = query.query.toLowerCase();
      entries = entries.filter(e => {
        if (e.content.kind === 'daily_summary') {
          return (e.content as DailySummary).highlights.some(
            h => h.toLowerCase().includes(lowerQuery)
          );
        }
        if (e.content.kind === 'intervention') {
          return (e.content as InterventionRecord).content
            .toLowerCase().includes(lowerQuery);
        }
        return false;
      });
    }

    return entries;
  }

  /** 从长期记忆召回 */
  private recallFromLongTerm(
    store: Map<MemoryId, LongTermMemoryEntry>,
    query: MemoryQuery,
  ): LongTermMemoryEntry[] {
    let entries = Array.from(store.values());

    // 只返回活跃条目（非归档）
    entries = entries.filter(e => e.decay.status !== 'archived');

    // 标签过滤
    if (query.tags && query.tags.length > 0) {
      entries = entries.filter(e =>
        e.tags.some(t => query.tags!.includes(t))
      );
    }

    // 关键词匹配
    if (query.query) {
      const lowerQuery = query.query.toLowerCase();
      entries = entries.filter(e =>
        e.tags.some(t => t.toLowerCase().includes(lowerQuery)) ||
        e.id.toLowerCase().includes(lowerQuery)
      );
    }

    return entries;
  }

  // ==========================================================================
  // 相关性计算（核心算法）
  // ==========================================================================

  /**
   * 计算记忆条目与查询的相关性评分
   *
   * 公式: score = α × 语义匹配 + β × 新鲜度 + γ × 历史有效性
   *
   * α = 0.5 (MEMORY_RECALL_WEIGHTS.semantic)
   * β = 0.3 (MEMORY_RECALL_WEIGHTS.recency)
   * γ = 0.2 (MEMORY_RECALL_WEIGHTS.effectiveness)
   */
  private computeRelevance(
    entry: MemoryEntry,
    query: MemoryQuery,
    source: string,
  ): number {
    let score = 0;

    // 因子1: 标签/关键词匹配 (α = 0.5)
    const semanticScore = this.computeSemanticMatch(entry, query);
    score += MEMORY_RECALL_WEIGHTS.semantic * semanticScore;

    // 因子2: 时间新鲜度 (β = 0.3)
    const recencyScore = this.computeRecency(entry);
    score += MEMORY_RECALL_WEIGHTS.recency * recencyScore;

    // 因子3: 历史有效性 (γ = 0.2)
    const effectivenessScore = this.computeEffectiveness(entry, source);
    score += MEMORY_RECALL_WEIGHTS.effectiveness * effectivenessScore;

    // 重要性权重乘数
    score *= (0.5 + entry.importance * 0.5);

    return Math.min(1.0, Math.round(score * 100) / 100);
  }

  /** 语义匹配评分 */
  private computeSemanticMatch(entry: MemoryEntry, query: MemoryQuery): number {
    let score = 0;
    const lowerQuery = (query.query ?? '').toLowerCase();

    // 标签匹配
    if (query.tags) {
      const matchCount = entry.tags.filter(t =>
        query.tags!.some(qt => t.toLowerCase().includes(qt.toLowerCase()))
      ).length;
      if (matchCount > 0) {
        score += Math.min(1, matchCount / query.tags.length) * 0.6;
      }
    }

    // 字符串包含匹配
    if (lowerQuery && entry.tags.some(t => t.toLowerCase().includes(lowerQuery))) {
      score += 0.3;
    }

    // 没有查询 → 基线分
    if (!query.query && (!query.tags || query.tags.length === 0)) {
      score = 0.3; // 无查询时的基线
    }

    return Math.min(1, score);
  }

  /** 新鲜度评分 */
  private computeRecency(entry: MemoryEntry): number {
    const ageHours = (Date.now() - entry.lastAccessedAt) / (3600 * 1000);

    if (ageHours < 1) return 1.0;       // < 1小时 → 满分
    if (ageHours < 24) return 0.9;       // < 1天  → 0.9
    if (ageHours < 72) return 0.7;       // < 3天  → 0.7
    if (ageHours < 168) return 0.5;      // < 7天  → 0.5
    if (ageHours < 720) return 0.3;      // < 30天 → 0.3
    return 0.1;                           // > 30天 → 接近遗忘
  }

  /** 历史有效性评分 */
  private computeEffectiveness(entry: MemoryEntry, source: string): number {
    // 长期记忆 → 更可信
    if (source === 'long_term') return 0.8;
    // 短期记忆 → 中等
    if (source === 'short_term') return 0.5;
    // 瞬时记忆 → 最即时但不确定
    return 0.3;
  }

  // ==========================================================================
  // 融合建议生成
  // ==========================================================================

  /**
   * 综合召回结果，生成给决策Agent的建议
   *
   * 返回格式：
   *   "immediate_context: xxx | recent_pattern: xxx | personality_insight: xxx |
   *    constraint: xxx | recommended_approach: xxx"
   */
  private synthesizeRecommendation(
    topEntries: MemoryEntry[],
    shortTermStore: Map<MemoryId, ShortTermMemoryEntry>,
    longTermStore: Map<MemoryId, LongTermMemoryEntry>,
    workspace: InstantMemoryWorkspace | null,
  ): string {
    const parts: string[] = [];

    // 1. 即时上下文
    if (workspace && workspace.activeConversation.isActive) {
      const lastTurns = workspace.activeConversation.turns.slice(-3);
      const lastUserTurn = lastTurns.reverse().find(t => t.speaker === 'user');
      if (lastUserTurn) {
        parts.push(`用户刚说"${lastUserTurn.text.slice(0, 50)}"`);
      }
    }

    // 2. 近期模式
    const dailySummaries = Array.from(shortTermStore.values())
      .filter(e => e.content.kind === 'daily_summary') as ShortTermMemoryEntry[];
    if (dailySummaries.length > 0) {
      const recentMoods = dailySummaries
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, 3)
        .map(e => (e.content as DailySummary).moodAvg);
      const trend = recentMoods.length >= 2
        ? (recentMoods[0] > recentMoods[recentMoods.length - 1] ? '回升' : '下降')
        : '平稳';
      parts.push(`最近情绪趋势: ${trend}`);

      // 最有效的干预
      const interventions = Array.from(shortTermStore.values())
        .filter(e => e.content.kind === 'intervention');
      const accepted = interventions.filter(e =>
        (e.content as InterventionRecord).userFeedback?.type === 'clicked' ||
        (e.content as InterventionRecord).userFeedback?.type === 'positive_reply'
      );
      if (accepted.length > 0) {
        const typeCounts = new Map<string, number>();
        for (const a of accepted) {
          const t = (a.content as InterventionRecord).interventionType;
          typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
        }
        const bestType = [...typeCounts.entries()].sort((a, b) => b[1] - a[1])[0];
        parts.push(`最有效干预类型: "${bestType[0]}" (${bestType[1]}次接受)`);
      }
    }

    // 3. 人格洞察（来自长期记忆）
    const personalityEntries = Array.from(longTermStore.values())
      .filter(e => e.tags.includes('personality'));
    if (personalityEntries.length > 0) {
      parts.push(`该用户有${personalityEntries.length}条长期人格记忆`);
    }

    // 4. 硬性约束
    const constraints = Array.from(longTermStore.values())
      .filter(e => e.tags.includes('constraint') && (e.content as any)?.enabled !== false);
    if (constraints.length > 0) {
      parts.push(`活跃约束: ${constraints.map(c => (c.content as HardConstraint).description).join('; ')}`);
    }

    // 5. 推荐策略
    if (parts.length > 0) {
      parts.push('建议综合以上信息进行个性化干预');
    } else {
      parts.push('无相关历史记录，建议基线干预');
    }

    return parts.join(' | ');
  }

  // ==========================================================================
  // 工具方法
  // ==========================================================================

  private convertWorkspaceToEntries(
    workspace: InstantMemoryWorkspace,
  ): InstantMemoryEntry[] {
    const entries: InstantMemoryEntry[] = [];
    const base = {
      type: MemoryType.INSTANT as const,
      createdAt: workspace.createdAt,
      expiresAt: workspace.expiresAt,
      lastAccessedAt: Date.now(),
      accessCount: 1,
      source: 'workspace_conversion',
      tags: ['instant', 'workspace'],
      importance: 0.6,
      decayRate: 0.05,
    };

    for (const turn of workspace.activeConversation.turns) {
      entries.push({
        ...base,
        id: `instant_turn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        content: { kind: 'dialogue_turn' as const, ...turn },
      });
    }

    return entries;
  }
}
