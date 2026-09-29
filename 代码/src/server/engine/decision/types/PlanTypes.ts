/**
 * 「同频」Same Wavelength — 计划/策略类型
 *
 * L2 深度规划器的计划管理和策略选择类型。
 */

import { TaskChain, TaskChainStatus, TaskChainPriority } from './TaskNode';
import { L1DecisionOutput } from './DecisionTypes';

// ============================================================================
// L2 深度规划输入/输出
// ============================================================================

/** L2 深度规划输入 */
export interface L2PlanningInput {
  /** 触发规划的快照序列（最近3-7天） */
  snapshots: import('../../perception/types/Snapshot').Snapshot[];
  /** L1决策结果 */
  l1Decision: L1DecisionOutput;
  /** 记忆召回结果 */
  memoryContext: import('../types/DecisionTypes').DecisionContext['memory'];
  /** 规划原因 */
  reason: L2PlanningReason;
}

/** L2 规划触发原因 */
export enum L2PlanningReason {
  /** 情绪持续下降 ≥3 天 */
  MOOD_DECLINE = 'mood_decline',
  /** 社交隔离持续 */
  SOCIAL_ISOLATION = 'social_isolation',
  /** L1决策明确建议深度规划 */
  L1_RECOMMENDED = 'l1_recommended',
  /** 危机缓解后恢复方案 */
  POST_CRISIS_RECOVERY = 'post_crisis_recovery',
  /** 用户主动请求深度帮助 */
  USER_REQUESTED = 'user_requested',
  /** 定期策略优化 */
  PERIODIC_OPTIMIZATION = 'periodic_optimization',
}

/** L2 深度规划输出 */
export interface L2PlanningOutput {
  /** 规划ID */
  planId: string;
  /** 生成的任务链 */
  taskChain: TaskChain;
  /** 备选任务链（如果主要链效果不佳） */
  alternativeChains: TaskChain[];
  /** 规划的推理过程（用于上帝模式可视化） */
  reasoningTrace: ReasoningTrace;
  /** 基于的历史策略 */
  basedOnStrategies: string[];
  /** 规划生成时间 */
  generatedAt: number;
}

/** 推理追踪（上帝模式可视化用） */
export interface ReasoningTrace {
  /** 推理步骤 */
  steps: ReasoningStep[];
  /** 关键决策点 */
  decisionPoints: DecisionPoint[];
  /** 考虑过但未采用的方案 */
  rejectedAlternatives: string[];
}

/** 推理步骤 */
export interface ReasoningStep {
  /** 步骤序号 */
  order: number;
  /** 步骤描述 */
  description: string;
  /** 使用的数据来源 */
  dataSources: string[];
  /** 得出的结论 */
  conclusion: string;
}

/** 决策点 */
export interface DecisionPoint {
  /** 决策描述 */
  description: string;
  /** 备选方案 */
  options: string[];
  /** 选择方案 */
  selected: string;
  /** 选择原因 */
  reason: string;
}

// ============================================================================
// 计划管理器
// ============================================================================

/** 活跃计划追踪 */
export interface ActivePlanTracker {
  /** 当前活跃的任务链列表 */
  activeChains: TaskChain[];
  /** 等待执行的任务链 */
  pendingChains: TaskChain[];
  /** 暂停的任务链 */
  pausedChains: TaskChain[];
  /** 最近完成的任务链 */
  recentlyCompleted: TaskChain[];
  /** 最大并发任务链数 */
  maxConcurrentChains: number;
}

/** 计划调度器状态 */
export interface PlannerStatus {
  /** 当前活跃链数 */
  activeChainCount: number;
  /** 今日已规划链数 */
  todayPlannedCount: number;
  /** 平均链完成时间（小时） */
  avgChainCompletionHours: number;
  /** 链成功率 */
  chainSuccessRate: number;
  /** 调度器是否可以接受新的规划请求 */
  canAcceptNewPlan: boolean;
}
