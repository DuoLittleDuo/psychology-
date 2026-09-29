/**
 * 「同频」Same Wavelength — 决策类型定义
 *
 * 规划决策Agent的核心类型：九宫格矩阵、L1/L2决策输入输出、
 * 干预决策结果、时机评分模型。
 */

import { InterventionType, UserFeedbackType } from '../../core/IntentTypes';
import { MoodAssessment, SocialWillingnessAssessment } from '../../perception/types/Snapshot';
import { ShortTermMemoryView } from '../../memory/types/ShortTermMemoryTypes';
import { LongTermMemoryView } from '../../memory/types/LongTermMemoryTypes';

// ============================================================================
// L1: 九宫格联动决策矩阵
// ============================================================================

/** 情绪档位 */
export enum MoodTier {
  LOW = 'low',       // 0.0 – 0.40
  MEDIUM = 'medium', // 0.40 – 0.65
  HIGH = 'high',     // 0.65 – 1.0
}

/** 社交意愿档位 */
export enum SocialWillingnessTier {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
}

/** 九宫格象限编码 */
export type GridQuadrant = `${MoodTier}_${SocialWillingnessTier}`;

/**
 * 九宫格决策矩阵
 *
 * 格式：GridMatrix[mood][social] → 决策条目
 *
 *   社交意愿 →   低               中               高
 *  ┌────────┬─────────────────┬─────────────────┬─────────────────┐
 *  │情绪 高 │ ⑦ 不打扰          │ ⑧ 活动推送        │ ⑨ 深度匹配        │
 *  ├────────┼─────────────────┼─────────────────┼─────────────────┤
 *  │情绪 中 │ ④ 轻关怀+L1       │ ⑤ 正常运营        │ ⑥ 深度社交        │
 *  ├────────┼─────────────────┼─────────────────┼─────────────────┤
 *  │情绪 低 │ ① 危机关怀        │ ② 情绪对话+L1     │ ③ 谨慎社交        │
 *  └────────┴─────────────────┴─────────────────┴─────────────────┘
 */
export interface GridCellDecision {
  /** 象限编码 */
  quadrant: GridQuadrant;
  /** 象限编号(1-9) */
  quadrantNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  /** 主要干预类型 */
  primaryIntervention: InterventionType;
  /** 次要干预类型 */
  secondaryInterventions: InterventionType[];
  /** 社交推荐最大深度（0=不推社交） */
  maxSocialDepth: 0 | 1 | 2 | 3 | 4;
  /** 决策描述 */
  description: string;
  /** 干预优先级 (0.0–1.0) */
  priority: number;
}

/** 完整九宫格决策矩阵定义 */
export const GRID_MATRIX: Record<MoodTier, Record<SocialWillingnessTier, GridCellDecision>> = {
  [MoodTier.LOW]: {
    [SocialWillingnessTier.LOW]: {
      quadrant: 'low_low',
      quadrantNumber: 1,
      primaryIntervention: InterventionType.CRISIS_RESPONSE,
      secondaryInterventions: [InterventionType.WARM_CARD, InterventionType.RESOURCE_GUIDE],
      maxSocialDepth: 0,
      description: '危机关怀：完全不推社交，陪伴+转介资源',
      priority: 1.0,
    },
    [SocialWillingnessTier.MEDIUM]: {
      quadrant: 'low_medium',
      quadrantNumber: 2,
      primaryIntervention: InterventionType.EMPATHY_DIALOGUE,
      secondaryInterventions: [InterventionType.BUDDY_L1],
      maxSocialDepth: 1,
      description: '情绪对话+L1：先做共情对话，顺利则推L1',
      priority: 0.9,
    },
    [SocialWillingnessTier.HIGH]: {
      quadrant: 'low_high',
      quadrantNumber: 3,
      primaryIntervention: InterventionType.EMPATHY_DIALOGUE,
      secondaryInterventions: [InterventionType.BUDDY_L1],
      maxSocialDepth: 1,
      description: '谨慎社交：先了解动机，仅推L1',
      priority: 0.75,
    },
  },
  [MoodTier.MEDIUM]: {
    [SocialWillingnessTier.LOW]: {
      quadrant: 'medium_low',
      quadrantNumber: 4,
      primaryIntervention: InterventionType.WARM_CARD,
      secondaryInterventions: [InterventionType.BUDDY_L1],
      maxSocialDepth: 1,
      description: '轻关怀+L1：留一个出口，但不过度',
      priority: 0.6,
    },
    [SocialWillingnessTier.MEDIUM]: {
      quadrant: 'medium_medium',
      quadrantNumber: 5,
      primaryIntervention: InterventionType.ACTIVITY_PUSH,
      secondaryInterventions: [InterventionType.BUDDY_L2, InterventionType.BUDDY_L3],
      maxSocialDepth: 3,
      description: '正常运营：搭子推荐L2-L3 + 活动推送',
      priority: 0.5,
    },
    [SocialWillingnessTier.HIGH]: {
      quadrant: 'medium_high',
      quadrantNumber: 6,
      primaryIntervention: InterventionType.BUDDY_L3,
      secondaryInterventions: [InterventionType.BUDDY_L3, InterventionType.ACTIVITY_PUSH],
      maxSocialDepth: 4,
      description: '深度社交：深度搭子+项目组队+社群',
      priority: 0.5,
    },
  },
  [MoodTier.HIGH]: {
    [SocialWillingnessTier.LOW]: {
      quadrant: 'high_low',
      quadrantNumber: 7,
      primaryIntervention: InterventionType.NONE,
      secondaryInterventions: [],
      maxSocialDepth: 0,
      description: '不打扰：用户状态好但想独处——尊重',
      priority: 0.0,
    },
    [SocialWillingnessTier.MEDIUM]: {
      quadrant: 'high_medium',
      quadrantNumber: 8,
      primaryIntervention: InterventionType.ACTIVITY_PUSH,
      secondaryInterventions: [InterventionType.BUDDY_L2, InterventionType.BUDDY_L3],
      maxSocialDepth: 3,
      description: '活动推送：搭子推荐L2-L3',
      priority: 0.3,
    },
    [SocialWillingnessTier.HIGH]: {
      quadrant: 'high_high',
      quadrantNumber: 9,
      primaryIntervention: InterventionType.BUDDY_L3,
      secondaryInterventions: [InterventionType.BUDDY_L3, InterventionType.ACTIVITY_PUSH],
      maxSocialDepth: 4,
      description: '深度匹配：最优窗口，促成高质量连接',
      priority: 0.4,
    },
  },
};

// ============================================================================
// L1 决策输入/输出
// ============================================================================

/** L1 快速决策输入 */
export interface L1DecisionInput {
  /** 触发事件类型 */
  triggerEvent: string;
  /** 当前情绪评估 */
  mood: MoodAssessment;
  /** 当前社交意愿评估 */
  socialWillingness: SocialWillingnessAssessment;
  /** 当前时间上下文 */
  timestamp: number;
  /** 瞬时记忆摘要 */
  instantContext: string;
}

/** L1 快速决策输出 */
export interface L1DecisionOutput {
  /** 决策ID */
  decisionId: string;
  /** 决策时间戳 */
  timestamp: number;
  /** 匹配的象限 */
  quadrant: GridQuadrant;
  /** 主要动作 */
  primaryAction: InterventionType;
  /** 备选动作 */
  secondaryActions: InterventionType[];
  /** 社交推荐最大深度 */
  maxSocialDepth: number;
  /** 是否需要触发L2深度规划 */
  needsDeepPlanning: boolean;
  /** L2触发原因（如果有） */
  deepPlanningReason?: string;
  /** 干预时机评分 (0.0–1.0, <0.5=延迟) */
  timingScore: number;
  /** 决策置信度 */
  confidence: number;
  /** 独处意愿降级：是否因独处意愿降低了社交推荐 */
  solitudeDowngrade: boolean;
}

// ============================================================================
// 干预时机决策
// ============================================================================

/** 干预时机评估 */
export interface TimingAssessment {
  /** 时机评分 (0.0–1.0) */
  score: number;
  /** 各维度得分 */
  dimensions: {
    /** 紧急度 (0.0–1.0) */
    urgency: number;
    /** 用户可用性 (0.0–1.0) */
    availability: number;
    /** 历史响应率 (0.0–1.0) */
    historicalResponseRate: number;
    /** 上下文适合度 (0.0–1.0) */
    contextFitness: number;
  };
  /** 如果延迟，建议的下一个时间窗口 */
  nextAvailableWindow?: {
    start: number;
    end: number;
    reason: string;
  };
  /** 是否满足所有硬性条件 */
  conditionsMet: boolean;
  /** 未满足的条件 */
  unmetConditions: string[];
  /** 如果所有窗口都不合适，是否为静默记录 */
  fallbackToSilent: boolean;
}

// ============================================================================
// 干预执行状态
// ============================================================================

/** 干预执行记录 */
export interface InterventionExecution {
  /** 执行ID */
  executionId: string;
  /** 关联的L1/L2决策ID */
  decisionId: string;
  /** 干预类型 */
  interventionType: InterventionType;
  /** 干预内容 */
  content: string;
  /** 目标设备 */
  targetDevice: 'watch' | 'phone' | 'tablet' | 'negative_one_screen';
  /** 执行时间 */
  executedAt: number;
  /** 用户反馈 */
  feedback: UserFeedbackType | null;
  /** 反馈时间 */
  feedbackTime?: number;
  /** 是否为安全Agent拦截后降级的版本 */
  downgraded: boolean;
  /** 原始方案（如果被降级） */
  originalPlan?: string;
}

// ============================================================================
// 决策上下文（L1/L2共用）
// ============================================================================

/** 完整决策上下文（供L1和L2使用） */
export interface DecisionContext {
  /** 触发快照 */
  snapshot: import('../../perception/types/Snapshot').Snapshot;
  /** 记忆召回结果 */
  memory: {
    instant: string;       // 瞬时记忆摘要
    shortTerm: ShortTermMemoryView | null;
    longTerm: LongTermMemoryView | null;
    recommendedApproach: string;
  };
  /** 当前安全状态 */
  safety: {
    /** 当前风险等级 */
    crisisLevel: import('../../core/Config').CrisisLevel | null;
    /** 是否处于安全接管 */
    safetyOverride: boolean;
    /** 今日剩余推送次数 */
    remainingPushes: number;
    /** 活跃的冷却限制 */
    activeCooldowns: string[];
  };
}
