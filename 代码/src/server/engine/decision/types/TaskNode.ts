/**
 * 「同频」Same Wavelength — 任务链与任务节点类型
 *
 * L2 深度规划器的核心输出：多步骤自主任务链。
 * 这是区分"静态App推送"和"智能Agent自主行动"的关键数据结构。
 */

import { InterventionType } from '../../core/IntentTypes';

// ============================================================================
// 任务链
// ============================================================================

/**
 * TaskChain: 多步骤自主任务链
 *
 * L2 规划器输出的结构化任务链，包含多个 TaskNode。
 * 每个 TaskNode 有前置条件、执行时间、评估标准和分支逻辑。
 *
 * 示例：3天渐进干预计划
 *   Day 1: 共情对话 → 根据结果分支
 *   Day 2: 行为激活（运动建议）
 *   Day 3: 效果评估 → 决定下一步
 */
export interface TaskChain {
  /** 任务链唯一ID */
  chainId: string;
  /** 任务链名称 */
  name: string;
  /** 任务链描述 */
  description: string;
  /** 触发此任务链的决策ID */
  triggeredByDecisionId: string;
  /** 触发时的快照ID */
  triggeredBySnapshotId: string;
  /** 任务链目标 */
  goal: TaskChainGoal;
  /** 任务节点列表（按执行顺序） */
  nodes: TaskNode[];
  /** 任务链创建时间 */
  createdAt: number;
  /** 计划完成时间 */
  plannedCompletionTime: number;
  /** 实际完成时间 */
  completedAt?: number;
  /** 任务链状态 */
  status: TaskChainStatus;
  /** 任务链优先级 */
  priority: TaskChainPriority;
  /** 任务链元数据 */
  meta: TaskChainMeta;
}

/** 任务链目标 */
export interface TaskChainGoal {
  /** 目标类型 */
  type: GoalType;
  /** 目标描述 */
  description: string;
  /** 目标指标 */
  targetMetrics: TargetMetric[];
  /** 最小可接受结果 */
  minimumAcceptableOutcome: string;
}

/** 目标类型 */
export enum GoalType {
  /** 情绪提升：将情绪评分从X提升到Y */
  MOOD_IMPROVEMENT = 'mood_improvement',
  /** 社交激活：从孤立状态过渡到轻社交 */
  SOCIAL_ACTIVATION = 'social_activation',
  /** 习惯建立：培养某个正向习惯 */
  HABIT_BUILDING = 'habit_building',
  /** 危机缓解：从危机状态降级到稳定 */
  CRISIS_DEESCALATION = 'crisis_deescalation',
  /** 信息收集：通过对话了解更多用户状态 */
  INFORMATION_GATHERING = 'information_gathering',
}

/** 目标指标 */
export interface TargetMetric {
  /** 指标名 */
  name: string;
  /** 当前值 */
  currentValue: number;
  /** 目标值 */
  targetValue: number;
  /** 单位 */
  unit: string;
  /** 评估日期 */
  evaluationDate: string;
}

// ============================================================================
// 任务节点
// ============================================================================

/**
 * TaskNode: 任务链中的一个执行步骤
 *
 * 每个节点包含：
 * - 执行内容（做什么）
 * - 前置条件（什么情况下执行）
 * - 时间约束（什么时候执行）
 * - 评估标准（怎么算成功）
 * - 分支逻辑（成功/失败后怎么做）
 */
export interface TaskNode {
  /** 节点ID */
  nodeId: string;
  /** 节点在链中的序号（从0开始） */
  order: number;
  /** 节点名称 */
  name: string;
  /** 节点类型 */
  type: TaskNodeType;
  /** 节点描述（人类可读） */
  description: string;
  /** 计划执行日期 */
  plannedDate: string;
  /** 计划执行时间窗口 */
  plannedWindow: TimeWindow;
  /** 实际执行时间 */
  executedAt?: number;

  /** 执行内容 */
  action: TaskNodeAction;

  /** 前置条件（必须全部满足才执行） */
  preconditions: Precondition[];
  /** 是否为可选步骤 */
  optional: boolean;

  /** 评估标准 */
  evaluation: TaskNodeEvaluation;

  /** 分支逻辑：根据执行结果决定下一个节点 */
  branches: TaskNodeBranch[];

  /** 节点状态 */
  status: TaskNodeStatus;

  /** 执行历史 */
  history: TaskNodeExecution[];
}

/** 任务节点类型 */
export enum TaskNodeType {
  /** 对话：发起一轮对话 */
  DIALOGUE = 'dialogue',
  /** 推送：推送一条消息/卡片 */
  PUSH = 'push',
  /** 等待：等待一段时间/等待用户反馈 */
  WAIT = 'wait',
  /** 评估：评估当前状态 */
  EVALUATE = 'evaluate',
  /** 分支：根据条件分支 */
  BRANCH = 'branch',
  /** 结束：任务链终止 */
  TERMINATE = 'terminate',
  /** 升级：将问题升级给安全Agent */
  ESCALATE = 'escalate',
}

/** 执行时间窗口 */
export interface TimeWindow {
  /** 日期 */
  date: string;
  /** 开始时间（24小时制小时数，如 16.0 = 16:00） */
  startHour: number;
  /** 结束时间 */
  endHour: number;
  /** 是否为硬性窗口（必须在此时，不能延迟） */
  strict: boolean;
}

/** 任务节点动作 */
export interface TaskNodeAction {
  /** 动作类型 */
  interventionType: InterventionType;
  /** 动作策略 */
  strategy: string;
  /** 动作内容模板 */
  contentTemplate: string;
  /** 动作参数 */
  params: Record<string, unknown>;
}

/** 前置条件 */
export interface Precondition {
  /** 条件描述 */
  description: string;
  /** 条件类型 */
  type: 'mood_range' | 'time_window' | 'user_response' | 'feedback_check' | 'safety_check';
  /** 条件表达式 */
  expression: string;
  /** 是否必须满足（false=最好满足，不满足也可执行） */
  required: boolean;
}

/** 任务节点评估标准 */
export interface TaskNodeEvaluation {
  /** 成功标准 */
  successCriteria: string;
  /** 失败标准 */
  failureCriteria: string;
  /** 评估指标 */
  metrics: {
    /** 用户是否回应 */
    userResponded?: boolean;
    /** 用户情感变化 */
    sentimentChange?: 'positive' | 'neutral' | 'negative';
    /** 行为变化 */
    behaviorChange?: string;
    /** 其他测量 */
    measurements?: Record<string, number>;
  };
}

/** 任务节点分支 */
export interface TaskNodeBranch {
  /** 分支条件 */
  condition: string;
  /** 条件匹配时跳转的节点ID（null=继续下一个） */
  nextNodeId: string | null;
  /** 分支描述 */
  description: string;
  /** 是否为默认分支 */
  isDefault: boolean;
}

/** 任务节点状态 */
export enum TaskNodeStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
  FAILED = 'failed',
}

/** 任务节点执行历史 */
export interface TaskNodeExecution {
  /** 执行次数（从1开始，支持重试） */
  attempt: number;
  /** 执行时间 */
  executedAt: number;
  /** 执行结果 */
  result: 'success' | 'failure' | 'partial' | 'skipped';
  /** 结果详情 */
  detail: string;
  /** 走的分支 */
  branchTaken: string | null;
  /** 用户反馈 */
  userFeedback?: string;
}

// ============================================================================
// 任务链状态
// ============================================================================

/** 任务链状态 */
export enum TaskChainStatus {
  /** 已创建，等待执行 */
  PENDING = 'pending',
  /** 执行中 */
  ACTIVE = 'active',
  /** 暂停（等待用户反馈/时间窗口） */
  PAUSED = 'paused',
  /** 已完成 */
  COMPLETED = 'completed',
  /** 失败 */
  FAILED = 'failed',
  /** 被安全Agent中止 */
  ABORTED_SAFETY = 'aborted_safety',
  /** 被用户取消 */
  CANCELLED_BY_USER = 'cancelled_by_user',
}

/** 任务链优先级 */
export enum TaskChainPriority {
  /** 最高：危机响应 */
  CRITICAL = 5,
  /** 高：安全相关 */
  HIGH = 4,
  /** 中：常规干预 */
  MEDIUM = 3,
  /** 低：非紧急社交推荐 */
  LOW = 2,
  /** 最低：静默观察 */
  BACKGROUND = 1,
}

/** 任务链元数据 */
export interface TaskChainMeta {
  /** 调试标签（上帝模式使用） */
  debugLabel: string;
  /** 创建原因 */
  creationReason: string;
  /** 关联的记忆条目ID */
  relatedMemoryIds: string[];
  /** 复用的历史策略ID（如果此任务链基于历史有效策略） */
  basedOnStrategyId?: string;
}
