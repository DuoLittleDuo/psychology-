/**
 * 「同频」Same Wavelength — 反思Agent (ReflectionAgent)
 *
 * 反思闭环：Agent的自我进化机制。
 * Agent不仅执行决策，还会定期回顾自己的决策质量，从中学习。
 *
 * 三个触发时机：
 *   1. 即时反思：每次干预后
 *   2. 每日复盘：凌晨自动
 *   3. 每周深度反思：周日
 *
 * 反思产生的策略自调整需经过安全Agent审核后生效。
 */

import { AgentBase, AgentId, AgentMessage } from '../core/AgentBase';
import {
  ReflectionTrigger,
  InstantReflectionInput,
  InstantReflectionOutput,
  DailyReflectionInput,
  DailyReflectionOutput,
  WeeklyReflectionInput,
  WeeklyReflectionOutput,
  ReflectionAgentStatus,
  AdjustmentSuggestion,
} from './types/ReflectionTypes';
import { MessageBus } from '../core/MessageBus';

// ============================================================================
// 反思Agent
// ============================================================================

export class ReflectionAgent extends AgentBase {
  readonly agentId: AgentId = 'ReflectionAgent';

  /** 反思状态 */
  private status: ReflectionAgentStatus = {
    lastInstantReflection: 0,
    lastDailyReflection: 0,
    lastWeeklyReflection: 0,
    consecutiveFailures: 0,
    todayReflectionCount: 0,
    pendingAdjustments: 0,
  };

  /** 待审核的调整建议 */
  private pendingAdjustments: AdjustmentSuggestion[] = [];

  /** 消息总线 */
  private messageBus: MessageBus;

  constructor() {
    super();
    this.messageBus = MessageBus.getInstance();
  }

  // ==========================================================================
  // 生命周期
  // ==========================================================================

  protected async onInitialize(): Promise<void> {
    console.log('[ReflectionAgent] 已初始化，反思闭环机制就绪');
  }

  protected async onStart(): Promise<void> {
    console.log('[ReflectionAgent] 已启动');
  }

  protected async onStop(): Promise<void> {
    console.log('[ReflectionAgent] 已停止');
  }

  // ==========================================================================
  // 即时反思（每次干预后）
  // ==========================================================================

  async reflectInstant(input: InstantReflectionInput): Promise<InstantReflectionOutput> {
    this.status.lastInstantReflection = Date.now();
    this.status.todayReflectionCount++;

    // 评估有效性
    let effectiveness: 'effective' | 'neutral' | 'ineffective';
    if (input.feedback === 'clicked' || input.feedback === 'positive_reply') {
      effectiveness = 'effective';
      this.status.consecutiveFailures = 0;
    } else if (input.feedback === 'ignored' || input.feedback === 'rejected') {
      effectiveness = 'ineffective';
      this.status.consecutiveFailures++;
    } else {
      effectiveness = 'neutral';
    }

    // 连续3次失败 → 触发策略审查
    const needsStrategyReview = this.status.consecutiveFailures >= 3;

    return {
      effectiveness,
      needsStrategyReview,
      consecutiveFailures: this.status.consecutiveFailures,
      notes: needsStrategyReview
        ? `连续${this.status.consecutiveFailures}次干预无效，建议触发策略审查`
        : '',
    };
  }

  // ==========================================================================
  // 每日复盘（凌晨自动）
  // ==========================================================================

  async reflectDaily(input: DailyReflectionInput): Promise<DailyReflectionOutput> {
    this.status.lastDailyReflection = Date.now();

    const interventions = input.interventions;
    const total = interventions.length;
    const accepted = interventions.filter(i =>
      i.userFeedback?.type === 'clicked' || i.userFeedback?.type === 'positive_reply'
    ).length;
    const ignored = interventions.filter(i => i.userFeedback?.type === 'ignored').length;
    const rejected = interventions.filter(i => i.userFeedback?.type === 'rejected').length;

    // 找最有效的干预类型
    const typeStats = new Map<string, { accepted: number; total: number }>();
    for (const i of interventions) {
      const stats = typeStats.get(i.interventionType) ?? { accepted: 0, total: 0 };
      stats.total++;
      if (i.userFeedback?.type === 'clicked' || i.userFeedback?.type === 'positive_reply') {
        stats.accepted++;
      }
      typeStats.set(i.interventionType, stats);
    }

    let mostEffectiveType: string | null = null;
    let bestRate = 0;
    for (const [type, stats] of typeStats) {
      const rate = stats.accepted / stats.total;
      if (rate > bestRate) {
        bestRate = rate;
        mostEffectiveType = type;
      }
    }

    // 生成调整建议
    const suggestions: AdjustmentSuggestion[] = [];
    for (const [type, stats] of typeStats) {
      if (stats.accepted / stats.total < 0.2 && stats.total >= 3) {
        suggestions.push({
          type: 'type_swap',
          description: `干预类型'${type}'响应率仅${Math.round(stats.accepted / stats.total * 100)}%，建议降低权重`,
          params: { responseRate: stats.accepted / stats.total },
          requiresSafetyApproval: false,
        });
      }
    }

    return {
      date: input.date,
      interventionSummary: {
        total,
        accepted,
        ignored,
        rejected,
        responseRate: total > 0 ? accepted / total : 0,
      },
      mostEffectiveType,
      mostEffectiveTiming: null,
      issues: total === 0 ? ['今日无干预记录'] : [],
      adjustmentSuggestions: suggestions,
    };
  }

  // ==========================================================================
  // 每周深度反思（周日）
  // ==========================================================================

  async reflectWeekly(input: WeeklyReflectionInput): Promise<WeeklyReflectionOutput> {
    this.status.lastWeeklyReflection = Date.now();

    const report: WeeklyReflectionOutput = {
      reportId: `weekly_${input.weekStartDate}`,
      weekLabel: `${input.weekStartDate} - ${input.weekEndDate}`,
      generatedAt: Date.now(),
      emotionalAnalysis: {
        average: input.moodTrend.weeklyAverage,
        trend: input.moodTrend.direction,
        lowestPoint: { date: '', score: 0 },
        highestPoint: { date: '', score: 0 },
        analysis: `本周情绪${input.moodTrend.direction === 'declining' ? '呈下降趋势，需关注' : '趋于平稳'}`,
      },
      interventionAnalysis: {
        totalCount: input.weeklyInterventions.length,
        overallResponseRate: 0,
        typeEffectivenessRanking: [],
        timingAnalysis: { bestTimeWindow: '', worstTimeWindow: '' },
      },
      socialAnalysis: {
        matchSuccessRate: 0,
        bestDepth: 1,
        interactionRate: 0,
      },
      strategyAdjustments: [],
    };

    return report;
  }

  // ==========================================================================
  // 查询方法
  // ==========================================================================

  getReflectionStatus(): ReflectionAgentStatus {
    return { ...this.status };
  }

  getPendingAdjustments(): AdjustmentSuggestion[] {
    return [...this.pendingAdjustments];
  }
}
