/**
 * 「同频」Same Wavelength — 推送预算与硬约束类型
 *
 * 安全Agent任务线2（过度干预防护）的完整类型定义。
 * 包括推送预算管理、冷却拦截、硬约束检查。
 */

import { InterventionType } from '../../core/IntentTypes';

// ============================================================================
// 推送预算
// ============================================================================

/** 每日推送预算状态 */
export interface PushBudget {
  /** 日期 */
  date: string;
  /** 最大推送次数 */
  maxPushes: number;
  /** 已使用推送次数 */
  usedPushes: number;
  /** 剩余推送次数 */
  remainingPushes: number;
  /** 推送记录 */
  pushHistory: PushRecord[];
  /** 预算是否已耗尽 */
  exhausted: boolean;
  /** 预算耗尽时间 */
  exhaustedAt?: number;
}

/** 单次推送记录 */
export interface PushRecord {
  /** 推送时间 */
  timestamp: number;
  /** 推送类型 */
  type: InterventionType;
  /** 推送内容摘要 */
  content: string;
  /** 推送目标设备 */
  targetDevice: string;
  /** 用户反馈 */
  feedback: PushFeedback | null;
  /** 是否为安全Agent批准后推送 */
  safetyApproved: boolean;
}

/** 推送反馈 */
export interface PushFeedback {
  /** 反馈类型 */
  type: 'clicked' | 'positive_reply' | 'ignored' | 'rejected';
  /** 反馈时间（如果是忽略，则为推送后2h未响应） */
  timestamp: number;
  /** 反馈详情 */
  detail?: string;
}

// ============================================================================
// 冷却管理
// ============================================================================

/** 冷却状态（按干预类型维度） */
export interface CooldownState {
  /** 干预类型 */
  interventionType: string;
  /** 是否在冷却中 */
  isActive: boolean;
  /** 触发冷却的原因 */
  reason: CooldownReason;
  /** 冷却开始时间 */
  startedAt: number;
  /** 冷却结束时间 */
  endsAt: number;
  /** 连续被拒绝次数 */
  consecutiveRejections: number;
  /** 冷却期间是否需要尝试替代类型 */
  suggestAlternative: boolean;
  /** 建议的替代干预类型 */
  alternativeTypes?: string[];
}

/** 冷却触发原因 */
export enum CooldownReason {
  /** 连续拒绝超出阈值 (≥3次) */
  CONSECUTIVE_REJECTION = 'consecutive_rejection',
  /** 连续忽略超出阈值 */
  CONSECUTIVE_IGNORE = 'consecutive_ignore',
  /** 用户明确设定冷却 */
  USER_REQUESTED = 'user_requested',
  /** 安全Agent主动冷却（保护用户） */
  SAFETY_INITIATED = 'safety_initiated',
  /** 深夜时段自动冷却 */
  NIGHT_HOURS = 'night_hours',
  /** 考试/课堂时段自动冷却 */
  ACADEMIC_HOURS = 'academic_hours',
}

// ============================================================================
// 硬约束检查
// ============================================================================

/** 硬约束检查请求 */
export interface ConstraintCheckRequest {
  /** 请求时间 */
  timestamp: number;
  /** 计划推送的干预类型 */
  interventionType: string;
  /** 计划推送的目标设备 */
  targetDevice: string;
  /** 触发推送的决策ID */
  decisionId: string;
  /** 推送内容 */
  content: string;
}

/** 硬约束检查结果 */
export interface ConstraintCheckResult {
  /** 是否通过所有检查 */
  passed: boolean;
  /** 检查时间 */
  checkedAt: number;
  /** 各项检查结果 */
  checks: ConstraintCheckItem[];
  /** 如果未通过，拦截原因 */
  blockReason?: string;
  /** 如果未通过，建议的降级动作 */
  fallbackAction?: 'silent_record' | 'delay' | 'downgrade' | 'cancel';
  /** 建议延后的时间窗口 */
  suggestedDelay?: {
    delayMinutes: number;
    reason: string;
  };
}

/** 单项约束检查 */
export interface ConstraintCheckItem {
  /** 检查项名称 */
  name: string;
  /** 是否通过 */
  passed: boolean;
  /** 不通过原因 */
  reason?: string;
  /** 约束来源 */
  source: 'hard_constraint' | 'cooldown' | 'budget' | 'timing' | 'safety_rule';
}

// ============================================================================
// 预算统计
// ============================================================================

/** 推送预算统计（周/月维度） */
export interface PushBudgetStats {
  /** 统计周期 */
  period: 'weekly' | 'monthly';
  /** 总推送次数 */
  totalPushes: number;
  /** 按类型分布 */
  byType: Record<string, number>;
  /** 响应率 */
  responseRate: number;
  /** 忽略率 */
  ignoreRate: number;
  /** 拒绝率 */
  rejectionRate: number;
  /** 被安全拦截的次数 */
  safetyBlockCount: number;
  /** 被冷却拦截的次数 */
  cooldownBlockCount: number;
  /** 预算用尽的次数 */
  budgetExhaustedDays: number;
}
