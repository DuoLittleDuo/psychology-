/**
 * 「同频」Same Wavelength — 瞬时记忆类型（工作台）
 *
 * 瞬时记忆 = 当前对话 + 过去4小时多模态信号快照 + 当前激活的干预任务链。
 * 生命周期：对话结束或状态切换时压缩为摘要 → 写入短期记忆。
 * 最多保留4小时。
 */

import { MemoryEntry, MemoryType, MemoryId } from './MemoryEntry';
import { Snapshot } from '../../perception/types/Snapshot';
import { SentimentPolarity, UserIntentType } from '../../core/IntentTypes';

// ============================================================================
// 瞬时记忆条目
// ============================================================================

/** 瞬时记忆条目 */
export interface InstantMemoryEntry extends MemoryEntry {
  type: MemoryType.INSTANT;
  /** 过期时间戳（创建时间 + 4小时） */
  expiresAt: number;
  /** 条目内容 */
  content: InstantMemoryContent;
}

/** 瞬时记忆内容类型（联合类型） */
export type InstantMemoryContent =
  | DialogueTurnMemory    // 对话轮次
  | SnapshotMemory        // 信号快照
  | TaskChainMemory       // 当前任务链
  | PendingActionMemory;  // 待执行动作

/** 对话轮次记忆 */
export interface DialogueTurnMemory {
  kind: 'dialogue_turn';
  /** 文本内容 */
  text: string;
  /** 发言者 */
  speaker: 'user' | 'agent';
  /** 用户意图 */
  intent: UserIntentType;
  /** 情感极性 */
  sentiment: SentimentPolarity;
}

/** 信号快照记忆 */
export interface SnapshotMemory {
  kind: 'snapshot';
  /** 快照数据 */
  snapshot: Snapshot;
}

/** 当前任务链记忆 */
export interface TaskChainMemory {
  kind: 'task_chain';
  /** 任务链ID */
  chainId: string;
  /** 任务链简要状态 */
  status: 'pending' | 'active' | 'paused' | 'completed' | 'failed';
  /** 已完成步骤数 */
  completedSteps: number;
  /** 总步骤数 */
  totalSteps: number;
}

/** 待执行动作记忆 */
export interface PendingActionMemory {
  kind: 'pending_action';
  /** 动作类型 */
  actionType: string;
  /** 计划执行时间 */
  scheduledTime: number;
  /** 动作参数 */
  params: Record<string, unknown>;
}

// ============================================================================
// 瞬时记忆工作台
// ============================================================================

/**
 * 瞬时记忆工作台
 *
 * 这是Agent的"当前认知状态"——它知道自己在哪、在做什么、用户刚才说了什么。
 */
export interface InstantMemoryWorkspace {
  /** 工作台ID */
  id: MemoryId;
  /** 创建时间戳 */
  createdAt: number;
  /** 过期时间戳 */
  expiresAt: number;

  /** 当前活跃对话上下文 */
  activeConversation: ActiveConversation;
  /** 最近信号快照（按时间排序，最多保留过去4小时） */
  recentSnapshots: Snapshot[];
  /** 当前激活的干预任务链（如果有） */
  activeTaskChain: ActiveTaskChain | null;
  /** 待执行动作队列 */
  pendingActions: PendingActionMemory[];

  /** 工作台摘要（随写入更新） */
  summary: InstantMemorySummary;
}

/** 活跃对话上下文 */
export interface ActiveConversation {
  /** 是否在对话中 */
  isActive: boolean;
  /** 对话轮次列表（最近20轮） */
  turns: DialogueTurnMemory[];
  /** 最大轮次数 */
  maxTurns: number;
  /** 当前意图 */
  currentIntent: UserIntentType;
  /** 情感轨迹 */
  emotionalTrajectory: {
    startPolarity: SentimentPolarity;
    currentPolarity: SentimentPolarity;
    trend: 'improving' | 'stable' | 'worsening';
    description: string;
  };
  /** 对话开始时间 */
  conversationStartTime: number;
  /** 最后活跃时间 */
  lastActiveTime: number;
}

/** 活跃任务链 */
export interface ActiveTaskChain {
  /** 任务链ID */
  chainId: string;
  /** 任务链名称 */
  name: string;
  /** 当前步骤索引（从0开始） */
  currentStepIndex: number;
  /** 步骤总数 */
  totalSteps: number;
  /** 步骤列表 */
  steps: TaskStep[];
  /** 创建时间 */
  createdAt: number;
  /** 计划完成时间 */
  plannedCompletionTime: number;
  /** 当前状态 */
  status: 'pending' | 'active' | 'paused' | 'completed' | 'failed';
}

/** 任务步骤 */
export interface TaskStep {
  /** 步骤ID */
  stepId: string;
  /** 步骤描述 */
  description: string;
  /** 步骤状态 */
  status: 'pending' | 'active' | 'completed' | 'skipped' | 'failed';
  /** 计划执行时间 */
  scheduledTime: number;
  /** 实际执行时间 */
  executedTime?: number;
  /** 执行结果 */
  result?: string;
  /** 评估指标 */
  evaluation?: {
    /** 是否成功 */
    success: boolean;
    /** 用户反馈 */
    userFeedback: string;
    /** 效果评分 */
    effectScore: number;
  };
}

/** 瞬时记忆摘要 */
export interface InstantMemorySummary {
  /** 快照时间范围 */
  snapshotRange: {
    earliest: number;
    latest: number;
    count: number;
  };
  /** 当前对话状态 */
  dialogueState: 'idle' | 'active' | 'waiting_user' | 'terminated';
  /** 当前情绪评分 */
  currentMoodScore: number;
  /** 活跃任务链ID */
  activeChainId: string | null;
  /** 待执行动作数 */
  pendingActionCount: number;
}

// ============================================================================
// 瞬时记忆 → 短期记忆 压缩
// ============================================================================

/**
 * 瞬时记忆压缩结果
 *
 * 当瞬时记忆过期或对话结束时，压缩为摘要写入短期记忆。
 */
export interface InstantMemoryCompression {
  /** 压缩时间 */
  compressedAt: number;
  /** 覆盖的时间范围 */
  timeRange: { start: number; end: number };
  /** 对话摘要 */
  dialogueSummary: string;
  /** 情感轨迹摘要 */
  emotionalSummary: string;
  /** 关键事件列表 */
  keyEvents: string[];
  /** 用户当前关注点 */
  currentConcerns: string[];
  /** 干预结果摘要（如果有） */
  interventionSummary?: string;
}
