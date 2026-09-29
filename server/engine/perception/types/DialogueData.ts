/**
 * 「同频」Same Wavelength — 对话/语音信号数据接口
 *
 * 定义用户通过文本/语音与Agent交互时的数据结构。
 * 遵循鸿蒙Agent范式：小艺端侧NLU → 意图识别 → 不跑完整端侧LLM。
 */

import { UserIntentType, SentimentPolarity } from '../../core/IntentTypes';

// ============================================================================
// 对话信号
// ============================================================================

/** 单轮对话记录 */
export interface DialogueTurn {
  /** 轮次ID */
  turnId: string;
  /** 时间戳 */
  timestamp: number;
  /** 发言者 */
  speaker: 'user' | 'agent';
  /** 原始文本 */
  text: string;
  /** 语音输入标记 */
  isVoice: boolean;
}

/** 对话上下文窗口（最近 N 轮） */
export interface DialogueContext {
  /** 对话轮次列表 */
  turns: DialogueTurn[];
  /** 最大保留轮次 */
  maxTurns: number;
  /** 当前激活意图 */
  currentIntent: UserIntentType;
  /** 对话中的情感轨迹 */
  emotionalTrajectory: EmotionalTrajectory;
}

/** 情感轨迹 */
export interface EmotionalTrajectory {
  /** 起始情感极性 */
  startPolarity: SentimentPolarity;
  /** 当前情感极性 */
  currentPolarity: SentimentPolarity;
  /** 变化趋势 */
  trend: 'improving' | 'stable' | 'worsening';
  /** 极性变化描述 */
  description: string; // 如 "下降→平稳", "持续负向"
}

// ============================================================================
// 意图分析结果（小艺 Intent API 返回）
// ============================================================================

/** 小艺端侧意图分析结果 */
export interface IntentAnalysisResult {
  /** 识别到的用户意图 */
  intent: UserIntentType;
  /** 意图置信度 (0.0–1.0) */
  confidence: number;
  /** 意图槽位（意图参数） */
  slots: IntentSlot[];
  /** 情感倾向 */
  sentiment: SentimentPolarity;
  /** 情感置信度 */
  sentimentConfidence: number;
  /** 是否需要澄清（置信度低于阈值） */
  needsClarification: boolean;
}

/** 意图槽位 */
export interface IntentSlot {
  /** 槽位名 */
  name: string;
  /** 槽位值 */
  value: string;
  /** 槽位类型 */
  type: 'subject' | 'object' | 'time' | 'location' | 'activity' | 'mood' | 'other';
}

// ============================================================================
// 对话摘要
// ============================================================================

/** 对话信号摘要（在感知Agent快照中使用） */
export interface DialogueSignalSummary {
  /** 最近一次对话时间戳 */
  lastDialogueTime: number | null;
  /** 最近一次用户意图 */
  lastIntent: UserIntentType | null;
  /** 最近一次情感极性 */
  lastSentiment: SentimentPolarity;
  /** 当前是否在活跃对话中 */
  inActiveConversation: boolean;
  /** 活跃对话的轮次数 */
  activeTurnCount: number;
  /** 最近一次用户主动唤醒的时间 */
  lastWakeTime: number | null;
  /** 是否有未完成的对话 */
  hasUnfinishedDialogue: boolean;
  /** 完整意图分析结果 */
  lastIntentResult: IntentAnalysisResult | null;
}
