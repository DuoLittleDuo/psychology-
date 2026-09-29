/**
 * 「同频」Same Wavelength — 反思Agent类型定义
 *
 * 反思闭环的类型：即时反思、每日复盘、每周深度反思、
 * 策略自调整申请、反思报告。
 */

// ============================================================================
// 反思触发类型
// ============================================================================

/** 反思触发时机 */
export enum ReflectionTrigger {
  /** 即时反思：每次干预后 */
  INSTANT = 'instant',
  /** 每日复盘：凌晨自动 */
  DAILY = 'daily',
  /** 每周深度反思：周日 */
  WEEKLY = 'weekly',
  /** 异常触发：连续干预失败 */
  ANOMALY = 'anomaly',
}

// ============================================================================
// 即时反思
// ============================================================================

/** 即时反思输入 */
export interface InstantReflectionInput {
  /** 关联的干预执行记录ID */
  executionId: string;
  /** 干预类型 */
  interventionType: string;
  /** 用户反馈 */
  feedback: 'clicked' | 'positive_reply' | 'neutral_reply' | 'ignored' | 'rejected';
  /** 干预前状态 */
  stateBefore: {
    moodScore: number;
    socialScore: number;
  };
  /** 干预后状态（如果有） */
  stateAfter?: {
    moodScore: number;
    socialScore: number;
  };
  /** 反思时间 */
  timestamp: number;
}

/** 即时反思输出 */
export interface InstantReflectionOutput {
  /** 干预有效性评估 */
  effectiveness: 'effective' | 'neutral' | 'ineffective';
  /** 是否需要策略审查（连续3次无效则触发） */
  needsStrategyReview: boolean;
  /** 连续无效次数 */
  consecutiveFailures: number;
  /** 反思备注 */
  notes: string;
}

// ============================================================================
// 每日复盘
// ============================================================================

/** 每日复盘输入 */
export interface DailyReflectionInput {
  /** 复盘日期 */
  date: string;
  /** 昨日所有干预记录 */
  interventions: import('../memory/types/ShortTermMemoryTypes').InterventionRecord[];
  /** 昨日快照序列 */
  snapshots: import('../perception/types/Snapshot').Snapshot[];
  /** 昨日情绪趋势 */
  moodTrend: 'improving' | 'stable' | 'declining';
}

/** 每日复盘输出 */
export interface DailyReflectionOutput {
  /** 日期 */
  date: string;
  /** 干预总结 */
  interventionSummary: {
    /** 总干预次数 */
    total: number;
    /** 被接受的次数 */
    accepted: number;
    /** 被忽略的次数 */
    ignored: number;
    /** 被拒绝的次数 */
    rejected: number;
    /** 响应率 */
    responseRate: number;
  };
  /** 最有效的干预类型 */
  mostEffectiveType: string | null;
  /** 最有效的推送时段 */
  mostEffectiveTiming: string | null;
  /** 发现的问题 */
  issues: string[];
  /** 策略调整建议 */
  adjustmentSuggestions: AdjustmentSuggestion[];
}

/** 策略调整建议 */
export interface AdjustmentSuggestion {
  /** 调整类型 */
  type: 'timing_shift' | 'type_swap' | 'frequency_reduce' | 'frequency_increase' | 'cooldown';
  /** 调整描述 */
  description: string;
  /** 调整参数 */
  params: Record<string, number | string>;
  /** 需要安全Agent审核 */
  requiresSafetyApproval: boolean;
}

// ============================================================================
// 每周深度反思
// ============================================================================

/** 每周深度反思输入 */
export interface WeeklyReflectionInput {
  /** 周起始日期 */
  weekStartDate: string;
  /** 周结束日期 */
  weekEndDate: string;
  /** 7天每日摘要 */
  dailySummaries: import('../memory/types/ShortTermMemoryTypes').DailySummary[];
  /** 周情绪趋势 */
  moodTrend: import('../memory/types/ShortTermMemoryTypes').MoodTrendSummary;
  /** 周所有干预 */
  weeklyInterventions: import('../memory/types/ShortTermMemoryTypes').InterventionRecord[];
  /** 周所有社交匹配 */
  weeklyMatches: import('../memory/types/ShortTermMemoryTypes').SocialMatchRecord[];
}

/** 每周深度反思输出 —— 策略审计报告 */
export interface WeeklyReflectionOutput {
  /** 报告ID */
  reportId: string;
  /** 报告覆盖周 */
  weekLabel: string;
  /** 生成时间 */
  generatedAt: number;

  /** 情绪分析 */
  emotionalAnalysis: {
    /** 周均值 */
    average: number;
    /** 趋势 */
    trend: string;
    /** 最低点 */
    lowestPoint: { date: string; score: number };
    /** 最高点 */
    highestPoint: { date: string; score: number };
    /** 分析 */
    analysis: string;
  };

  /** 干预效果分析 */
  interventionAnalysis: {
    /** 总次数 */
    totalCount: number;
    /** 总体响应率 */
    overallResponseRate: number;
    /** 各类型效果排名 */
    typeEffectivenessRanking: Array<{
      type: string;
      responseRate: number;
      count: number;
    }>;
    /** 推送时间效果 */
    timingAnalysis: {
      bestTimeWindow: string;
      worstTimeWindow: string;
    };
  };

  /** 社交分析 */
  socialAnalysis: {
    /** 匹配成功率 */
    matchSuccessRate: number;
    /** 最佳匹配深度 */
    bestDepth: number;
    /** 互动率 */
    interactionRate: number;
  };

  /** 策略调整建议 */
  strategyAdjustments: AdjustmentSuggestion[];
}

// ============================================================================
// 反思Agent状态
// ============================================================================

/** 反思Agent状态 */
export interface ReflectionAgentStatus {
  /** 上次即时反思时间 */
  lastInstantReflection: number;
  /** 上次每日复盘时间 */
  lastDailyReflection: number;
  /** 上次每周反思时间 */
  lastWeeklyReflection: number;
  /** 连续干预失败计数 */
  consecutiveFailures: number;
  /** 今日反思次数 */
  todayReflectionCount: number;
  /** 待审核的调整建议数 */
  pendingAdjustments: number;
}
