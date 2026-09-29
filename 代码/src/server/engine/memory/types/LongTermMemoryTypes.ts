/**
 * 「同频」Same Wavelength — 长期记忆类型（人格模型）
 *
 * 存储用户稳定人格特征、长期干预偏好、关键事件标记、社交风格。
 * 永久存储但会衰减：>30天未出现→降权，>90天→归档。
 *
 * 晋级规则：
 *   短期记忆中重复出现≥3次模式 → 晋级为长期记忆
 *   用户连续忽略/拒绝推送 → 晋级为长期硬性约束
 */

import { MemoryEntry, MemoryType, MemoryId, KeyEvent, KeyEventCategory } from './MemoryEntry';
import { SocialDepth, MAX_DAILY_PUSHES } from '../../core/Config';

// ============================================================================
// 长期记忆条目
// ============================================================================

/** 长期记忆条目 */
export interface LongTermMemoryEntry extends MemoryEntry {
  type: MemoryType.LONG_TERM;
  /** 衰减记录 */
  decay: {
    /** 初始权重 */
    initialWeight: number;
    /** 当前权重 */
    currentWeight: number;
    /** 最后确认时间（模式再次出现确认） */
    lastConfirmedAt: number;
    /** 确认次数 */
    confirmationCount: number;
    /** 衰减状态 */
    status: 'active' | 'decaying' | 'archived';
  };
  /** 条目内容 */
  content: LongTermMemoryContent;
}

/** 长期记忆内容类型 */
export type LongTermMemoryContent =
  | PersonalityTraits
  | InterventionPreferences
  | SocialStyleProfile
  | HardConstraint
  | KeyEvent
  | EffectiveStrategy;

// ============================================================================
// 人格特征
// ============================================================================

/**
 * 用户稳定人格特征
 *
 * 基于长期行为数据推断，不是心理学量表测量结果。
 * 在初赛文档中必须强调"行为推断"而非"人格诊断"。
 */
export interface PersonalityTraits {
  kind: 'personality';
  /** 内外向 (0.0=极端内向, 1.0=极端外向) */
  introversionExtroversion: number;
  /** 社交偏好：偏好的社交规模 */
  socialPreference: 'solo' | '1v1' | 'small_group' | 'large_group';
  /** 计划风格 */
  planningStyle: 'planner' | 'casual' | 'spontaneous';
  /** 压力触发因素 */
  stressTriggers: string[];
  /** 舒适活动 */
  comfortActivities: string[];
  /** 社交开放度 (0.0–1.0) */
  socialOpenness: number;
  /** 情绪稳定性 (0.0–1.0，越高越稳定) */
  emotionalStability: number;
  /** 更新日期 */
  lastUpdated: string;
  /** 数据置信度（随着数据积累提升） */
  confidence: number;
}

// ============================================================================
// 干预偏好
// ============================================================================

/**
 * 长期干预偏好
 *
 * Agent从用户反馈中自动学习的最有效的干预方式。
 */
export interface InterventionPreferences {
  kind: 'intervention_preferences';
  /** 偏好的推送时间段 */
  preferredTiming: string[];       // 如 ["16:00-18:00", "20:00-21:00"]
  /** 避免的推送时间段 */
  avoidedTiming: string[];         // 如 ["08:00-09:00", "23:00-07:00"]
  /** 偏好的干预类型（按响应率排序） */
  preferredTypes: string[];        // 如 ["运动建议", "轻量鼓励"]
  /** 被忽略的干预类型（连续忽略N次） */
  ignoredTypes: IgnoredInterventionType[];
  /** 每次推送的平均响应率 */
  averageResponseRate: number;
  /** 更新日期 */
  lastUpdated: string;
}

/** 被忽略的干预类型记录 */
export interface IgnoredInterventionType {
  /** 干预类型 */
  type: string;
  /** 连续被忽略次数 */
  consecutiveIgnores: number;
  /** 最后推送时间 */
  lastPushedAt: number;
  /** 冷却结束时间（如果有冷却） */
  cooldownUntil?: number;
  /** 是否已冷却 */
  isCooledDown: boolean;
}

// ============================================================================
// 社交风格画像
// ============================================================================

/**
 * 社交风格画像
 *
 * Agent 从社交匹配记录中学习用户偏好的社交方式。
 */
export interface SocialStyleProfile {
  kind: 'social_style';
  /** 偏好的社交深度 */
  preferredDepth: SocialDepth;
  /** 偏好的小组规模 */
  preferredGroupSize: number;
  /** 匹配成功率 */
  matchSuccessRate: number;
  /** 偏好时段 */
  preferredTimeOfDay: string[];
  /** 共同兴趣标签 */
  interestTags: string[];
  /** 社交节奏偏好 */
  socialPace: 'frequent_light' | 'occasional_deep' | 'minimal';
  /** 更新日期 */
  lastUpdated: string;
}

// ============================================================================
// 硬性约束
// ============================================================================

/**
 * 硬性约束
 *
 * 用户明确设定或Agent从行为中自动学习的不可违反的约束。
 * 安全Agent依赖这些约束来做拦截决策。
 */
export interface HardConstraint {
  kind: 'constraint';
  /** 约束ID */
  id: MemoryId;
  /** 约束描述 */
  description: string;
  /** 约束类型 */
  constraintType: ConstraintType;
  /** 约束条件（JSON Schema描述的条件） */
  condition: ConstraintCondition;
  /** 创建来源 */
  source: ConstraintSource;
  /** 创建时间 */
  createdAt: number;
  /** 是否启用 */
  enabled: boolean;
  /** 用户确认状态 */
  userConfirmed: boolean;
}

/** 约束类型 */
export enum ConstraintType {
  /** 时间约束：特定时段不允许推送 */
  TIME_RESTRICTION = 'time_restriction',
  /** 类型约束：特定干预类型不允许 */
  TYPE_RESTRICTION = 'type_restriction',
  /** 频率约束：每日推送上限 */
  FREQUENCY_CAP = 'frequency_cap',
  /** 社交约束：社交相关限制 */
  SOCIAL_RESTRICTION = 'social_restriction',
  /** 内容约束：特定话题/内容避免 */
  CONTENT_RESTRICTION = 'content_restriction',
  /** 设备约束：特定设备限制 */
  DEVICE_RESTRICTION = 'device_restriction',
}

/** 约束条件 */
export interface ConstraintCondition {
  /** 适用时段（HH:MM-HH:MM 格式列表，null=全天） */
  timeWindows?: string[] | null;
  /** 适用的星期 (1-7, null=全部) */
  daysOfWeek?: number[] | null;
  /** 拦截的干预类型列表（null=全部） */
  interventionTypes?: string[] | null;
  /** 最大每日推送次数 */
  maxDailyPushes?: number;
  /** 最小推送间隔（分钟） */
  minIntervalMinutes?: number;
  /** 特殊上下文条件 */
  contextConditions?: string[];
}

/** 约束来源 */
export enum ConstraintSource {
  /** 用户明确设定 */
  USER_SET = 'user_set',
  /** Agent自动学习（需用户确认后生效） */
  AGENT_LEARNED = 'agent_learned',
  /** 安全Agent强制要求 */
  SAFETY_MANDATED = 'safety_mandated',
  /** 系统默认 */
  SYSTEM_DEFAULT = 'system_default',
}

// ============================================================================
// 有效策略记录
// ============================================================================

/**
 * 有效策略
 *
 * Agent记录下来的"在特定情境下最有效的干预方案"。
 * 用于L2规划时快速检索最优策略。
 */
export interface EffectiveStrategy {
  kind: 'effective_strategy';
  /** 适用情境描述 */
  applicableSituation: string;
  /** 情境特征 */
  situation: {
    /** 情绪范围 */
    moodRange: { min: number; max: number };
    /** 社交意愿范围 */
    socialWillingnessRange: { min: number; max: number };
    /** 上下文标签 */
    contextTags: string[];
  };
  /** 策略步骤 */
  steps: StrategyStep[];
  /** 策略成功率 */
  successRate: number;
  /** 使用次数 */
  usageCount: number;
  /** 最后使用日期 */
  lastUsedDate: string;
  /** 创建日期 */
  createdDate: string;
}

/** 策略步骤 */
export interface StrategyStep {
  /** 步骤序号 */
  order: number;
  /** 干预类型 */
  interventionType: string;
  /** 时间偏移（小时，相对于策略触发时刻） */
  timeOffsetHours: number;
  /** 步骤描述 */
  description: string;
  /** 步骤成功率 */
  successRate: number;
  /** 失败后的备选方案 */
  fallback?: string;
}

// ============================================================================
// 长期记忆聚合视图
// ============================================================================

/**
 * 长期记忆聚合视图
 *
 * 这是决策Agent查询长期记忆时获得的完整用户画像。
 */
export interface LongTermMemoryView {
  /** 人格特征 */
  personality: PersonalityTraits;
  /** 干预偏好 */
  interventionPreferences: InterventionPreferences;
  /** 社交风格 */
  socialStyle: SocialStyleProfile;
  /** 活跃的硬性约束 */
  activeConstraints: HardConstraint[];
  /** 关键生命周期事件 */
  keyPeriods: KeyEvent[];
  /** 已验证的有效策略 */
  effectiveStrategies: EffectiveStrategy[];
  /** 生成时间戳 */
  generatedAt: number;
}

// ============================================================================
// 🤖 长期记忆 → 人格模型
// ============================================================================

/**
 * 用户人格模型
 *
 * 这是长期记忆的最高层聚合，被所有Agent共享。
 * 在上帝模式中，这是"记忆召回"面板显示的核心内容。
 */
export interface UserPersonaModel {
  /** 用户ID */
  userId: string;
  /** 模型版本 */
  modelVersion: number;
  /** 人格特征 */
  personality: PersonalityTraits;
  /** 干预偏好 */
  interventionPreferences: InterventionPreferences;
  /** 社交风格 */
  socialStyle: SocialStyleProfile;
  /** 活跃约束 */
  constraints: HardConstraint[];
  /** 关键时期 */
  keyPeriods: KeyEvent[];
  /** 有效策略库 */
  strategyLibrary: EffectiveStrategy[];
  /** 模型最后更新日期 */
  lastUpdated: string;
  /** 总数据天数 */
  totalDataDays: number;
  /** 模型置信度 */
  overallConfidence: number;
}
