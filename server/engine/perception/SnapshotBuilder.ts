/**
 * 「同频」Same Wavelength — 快照构建器
 *
 * 多模态时序对齐与统一快照构建。
 * 核心职责：将来自不同通道、不同频率的原始信号融合为时序对齐的统一快照。
 */

import { Snapshot, MoodAssessment, SocialWillingnessAssessment, MoodTrend, SnapshotTriggerType } from './types/Snapshot';
import { HealthSnapshot } from './types/HealthData';
import { UsageSignalSummary } from './types/Snapshot';
import { DialogueSignalSummary } from './types/DialogueData';
import { ContextSnapshot } from './types/ContextData';
import { ChannelSnapshot } from './SensorChannel';
import { SENSOR_FUSION_WINDOW_HOURS } from '../core/Config';

// ============================================================================
// 快照构建器接口
// ============================================================================

/**
 * 快照构建器
 *
 * 感知Agent的核心组件，负责：
 * 1. 接收各通道的 ChannelSnapshot
 * 2. 进行时序对齐（按时间窗口聚合）
 * 3. 融合推断（情绪评分、社交意愿、行为趋势）
 * 4. 生成统一 Snapshot
 */
export interface ISnapshotBuilder {
  /**
   * 提交一个通道快照
   */
  submitChannelSnapshot(channelSnapshot: ChannelSnapshot): void;

  /**
   * 构建融合快照
   * @param triggerType 触发类型
   * @param triggerEvent 触发事件描述
   * @returns 融合后的统一快照
   */
  buildSnapshot(triggerType: SnapshotTriggerType, triggerEvent: string): Promise<Snapshot>;

  /**
   * 计算情绪趋势（基于最近N天快照序列）
   */
  computeMoodTrend(snapshots: Snapshot[]): MoodTrend;

  /**
   * 获取当前缓存的通道快照
   */
  getCachedSnapshots(): Map<string, ChannelSnapshot>;

  /**
   * 清空缓存（新的一天开始）
   */
  clearCache(): void;
}

// ============================================================================
// 快照构建器实现
// ============================================================================

export class SnapshotBuilder implements ISnapshotBuilder {
  /** 通道快照缓存（按通道ID索引） */
  private channelCache: Map<string, ChannelSnapshot> = new Map();

  /** 已生成的历史快照 */
  private snapshotHistory: Snapshot[] = [];

  /** 快照版本计数器 */
  private versionCounter: number = 0;

  /** 最大保留历史快照数 */
  private readonly MAX_HISTORY = 200;

  submitChannelSnapshot(channelSnapshot: ChannelSnapshot): void {
    this.channelCache.set(channelSnapshot.channelId, channelSnapshot);
  }

  async buildSnapshot(triggerType: SnapshotTriggerType, triggerEvent: string): Promise<Snapshot> {
    const now = Date.now();
    const windowStart = now - SENSOR_FUSION_WINDOW_HOURS * 3600 * 1000;

    // 收集时间窗口内的通道快照
    const windowSnapshots = Array.from(this.channelCache.values())
      .filter(s => s.windowEnd >= windowStart);

    // 构建各维度信号
    const health = this.buildHealthSnapshot(windowSnapshots);
    const usage = this.buildUsageSummary(windowSnapshots);
    const dialogue = this.buildDialogueSummary(windowSnapshots);
    const context = this.buildContextSnapshot(windowSnapshots);

    // 融合推断
    const mood = this.inferMood(health, usage, dialogue, context);
    const socialWillingness = this.inferSocialWillingness(usage, dialogue, mood);

    const snapshot: Snapshot = {
      id: `snap_${triggerType}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now,
      windowHours: SENSOR_FUSION_WINDOW_HOURS,
      health,
      usage,
      dialogue,
      context,
      mood,
      socialWillingness,
      behaviorTrend: this.inferBehaviorTrend(windowSnapshots),
      version: ++this.versionCounter,
      triggerEvent,
      isManualOverride: triggerType === SnapshotTriggerType.MANUAL_TRIGGER,
    };

    // 记录历史
    this.snapshotHistory.push(snapshot);
    if (this.snapshotHistory.length > this.MAX_HISTORY) {
      this.snapshotHistory.shift();
    }

    return snapshot;
  }

  computeMoodTrend(snapshots: Snapshot[]): MoodTrend {
    if (snapshots.length < 2) {
      return {
        direction: 'stable',
        slope: 0,
        consecutiveDeclineDays: 0,
        recentScores: snapshots.map(s => ({ date: new Date(s.timestamp).toISOString().split('T')[0], score: s.mood.overallScore })),
        lowestScore: snapshots[0]?.mood.overallScore ?? 0.5,
        highestScore: snapshots[0]?.mood.overallScore ?? 0.5,
      };
    }

    const recentScores = snapshots.map(s => ({
      date: new Date(s.timestamp).toISOString().split('T')[0],
      score: s.mood.overallScore,
    }));

    const scores = recentScores.map(s => s.score);
    const slope = this.calculateSlope(scores);
    let consecutiveDeclineDays = 0;
    for (let i = 1; i < scores.length; i++) {
      if (scores[i] < scores[i - 1]) {
        consecutiveDeclineDays++;
      } else {
        consecutiveDeclineDays = 0;
      }
    }

    return {
      direction: slope < -0.05 ? 'declining' : slope > 0.05 ? 'improving' : 'stable',
      slope,
      consecutiveDeclineDays,
      recentScores,
      lowestScore: Math.min(...scores),
      highestScore: Math.max(...scores),
    };
  }

  getCachedSnapshots(): Map<string, ChannelSnapshot> {
    return new Map(this.channelCache);
  }

  clearCache(): void {
    this.channelCache.clear();
  }

  getSnapshotHistory(): Snapshot[] {
    return [...this.snapshotHistory];
  }

  // ==========================================================================
  // 私有方法：各维度信号构建
  // ==========================================================================

  private buildHealthSnapshot(windowSnapshots: ChannelSnapshot[]): HealthSnapshot {
    // 从缓存中提取 Health Kit 通道数据
    const healthData = windowSnapshots.find(s => s.channelId === 'health_kit');
    // 默认值（无数据时）
    return {
      timestamp: Date.now(),
      latestSleep: healthData?.data?.sleep as any ?? null,
      latestActivity: healthData?.data?.activity as any ?? null,
      latestHeartRate: healthData?.data?.heartRate as any ?? null,
      latestStress: healthData?.data?.stress as any ?? null,
      sleepTrend: healthData?.data?.sleepTrend as any ?? 'stable',
      activityTrend: healthData?.data?.activityTrend as any ?? 'normal',
    };
  }

  private buildUsageSummary(windowSnapshots: ChannelSnapshot[]): UsageSignalSummary {
    const usageData = windowSnapshots.find(s => s.channelId === 'usage_stats');
    return {
      totalScreenTimeHours: usageData?.data?.totalScreenTime as number ?? 0,
      socialAppHours: usageData?.data?.socialAppHours as number ?? 0,
      videoAppHours: usageData?.data?.videoAppHours as number ?? 0,
      studyAppHours: usageData?.data?.studyAppHours as number ?? 0,
      screenWakeCount: usageData?.data?.screenWakeCount as number ?? 0,
      lateNightUsage: usageData?.data?.lateNightUsage as boolean ?? false,
      deviationFromBaseline: usageData?.data?.deviationFromBaseline as number ?? 0,
    };
  }

  private buildDialogueSummary(windowSnapshots: ChannelSnapshot[]): DialogueSignalSummary {
    const dialogueData = windowSnapshots.find(s => s.channelId === 'dialogue');
    return {
      lastDialogueTime: dialogueData?.data?.lastDialogueTime as number ?? null,
      lastIntent: dialogueData?.data?.lastIntent as any ?? null,
      lastSentiment: dialogueData?.data?.lastSentiment as any ?? 'neutral',
      inActiveConversation: dialogueData?.data?.inActiveConversation as boolean ?? false,
      activeTurnCount: dialogueData?.data?.activeTurnCount as number ?? 0,
      lastWakeTime: dialogueData?.data?.lastWakeTime as number ?? null,
      hasUnfinishedDialogue: dialogueData?.data?.hasUnfinishedDialogue as boolean ?? false,
      lastIntentResult: dialogueData?.data?.lastIntentResult as any ?? null,
    };
  }

  private buildContextSnapshot(windowSnapshots: ChannelSnapshot[]): ContextSnapshot {
    const contextData = windowSnapshots.find(s => s.channelId === 'context');
    return contextData?.data as unknown as ContextSnapshot ?? {} as ContextSnapshot;
  }

  // ==========================================================================
  // 私有方法：融合推断
  // ==========================================================================

  private inferMood(
    health: HealthSnapshot,
    usage: UsageSignalSummary,
    dialogue: DialogueSignalSummary,
    context: ContextSnapshot,
  ): MoodAssessment {
    // 基于多维信号的启发式情绪推断
    let score = 0.5; // 基线

    // 睡眠影响 (+/- 0.15)
    if (health.latestSleep) {
      score += (health.latestSleep.qualityScore - 0.5) * 0.3;
    }

    // 活动影响 (+/- 0.1)
    if (health.latestActivity) {
      const activityFactor = Math.min(health.latestActivity.stepCount / 10000, 1.0);
      score += (activityFactor - 0.5) * 0.2;
    }

    // 对话情感影响 (+/- 0.15)
    if (dialogue.lastSentiment === 'negative') {
      score -= 0.1;
    } else if (dialogue.lastSentiment === 'positive') {
      score += 0.05;
    }

    // 压力影响 (+/- 0.1)
    if (health.latestStress) {
      score -= (health.latestStress.stressLevel - 0.5) * 0.2;
    }

    // 社交使用影响 (+/- 0.05)
    const socialRatio = usage.socialAppHours / Math.max(usage.totalScreenTimeHours, 0.1);
    if (socialRatio < 0.1 && usage.totalScreenTimeHours > 2) {
      score -= 0.05; // 社交退缩
    }

    // 深夜使用影响
    if (usage.lateNightUsage) {
      score -= 0.05;
    }

    // 夹紧到 [0, 1]
    score = Math.max(0, Math.min(1, score));

    return {
      overallScore: Math.round(score * 100) / 100,
      dimensions: {
        energy: Math.round(Math.max(0, Math.min(1, score)) * 100) / 100,
        pleasure: Math.round(Math.max(0, Math.min(1, score + 0.05)) * 100) / 100,
        calmness: Math.round(Math.max(0, Math.min(1, score - 0.05)) * 100) / 100,
        focus: Math.round(Math.max(0, Math.min(1, score)) * 100) / 100,
      },
      confidence: 0.7, // 启发式推断的置信度
      inferenceSources: this.determineSources(health, usage, dialogue),
    };
  }

  private inferSocialWillingness(
    usage: UsageSignalSummary,
    dialogue: DialogueSignalSummary,
    mood: MoodAssessment,
  ): SocialWillingnessAssessment {
    let score = 0.5;

    // 社交App使用比例
    const socialRatio = usage.socialAppHours / Math.max(usage.totalScreenTimeHours, 0.1);
    score += (socialRatio - 0.3) * 0.5;

    // 情绪极低时社交意愿下降
    if (mood.overallScore < 0.4) {
      score -= 0.15;
    }

    // 夹紧
    score = Math.max(0, Math.min(1, score));

    return {
      overallScore: Math.round(score * 100) / 100,
      preferredDepth: score > 0.65 ? 3 : score > 0.4 ? 2 : 1,
      solitudePreference: score < 0.25,
      confidence: 0.6,
    };
  }

  private inferBehaviorTrend(windowSnapshots: ChannelSnapshot[]): any {
    return {
      windowStart: windowSnapshots[0]?.windowStart ?? Date.now(),
      windowEnd: Date.now(),
      socialUsageTrend: 'stable',
      screenTimeChangeRate: 0,
      lateNightFrequency: 0,
      studyEngagementChange: 0,
      anomalyFlags: ['normal'],
    };
  }

  private determineSources(
    health: HealthSnapshot,
    usage: UsageSignalSummary,
    dialogue: DialogueSignalSummary,
  ): string[] {
    const sources: string[] = [];
    if (health.latestSleep) sources.push('sleep_quality');
    if (health.latestActivity) sources.push('activity_level');
    if (health.latestHeartRate) sources.push('heart_rate_trend');
    if (health.latestStress) sources.push('stress_estimate');
    if (usage.totalScreenTimeHours > 0) sources.push('screen_usage_pattern');
    if (dialogue.lastSentiment !== 'neutral') sources.push('dialogue_sentiment');
    return sources;
  }

  private calculateSlope(scores: number[]): number {
    if (scores.length < 2) return 0;
    const n = scores.length;
    const xMean = (n - 1) / 2;
    const yMean = scores.reduce((a, b) => a + b, 0) / n;
    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (scores[i] - yMean);
      denominator += (i - xMean) ** 2;
    }
    return denominator === 0 ? 0 : numerator / denominator;
  }
}
