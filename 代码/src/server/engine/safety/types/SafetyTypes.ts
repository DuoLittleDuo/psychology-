/**
 * 「同频」Same Wavelength — 安全类型定义
 *
 * 安全隐私Agent的核心类型：危机关键词分级、安全巡检状态、
 * 安全接管模式、对话安全监控结果。
 */

import { CrisisLevel } from '../../core/Config';

// ============================================================================
// 安全对话监控
// ============================================================================

/** 对话安全扫描结果 */
export interface DialogueSafetyResult {
  /** 扫描时间 */
  scannedAt: number;
  /** 扫描的文本 */
  scannedText: string;
  /** 检测到的最高危机等级 */
  detectedLevel: CrisisLevel | null;
  /** 命中的关键词 */
  matchedKeywords: string[];
  /** 是否需要中断 */
  shouldInterrupt: boolean;
  /** 是否需要发起安全对话 */
  shouldInitiateSafetyDialogue: boolean;
  /** 上下文风险评估 */
  contextRisk: ContextRiskAssessment;
}

/** 上下文风险评估 */
export interface ContextRiskAssessment {
  /** 综合风险评分 (0.0–1.0) */
  riskScore: number;
  /** 各维度 */
  dimensions: {
    /** 关键词严重度 */
    keywordSeverity: number;
    /** 历史风险记录 */
    historyRisk: number;
    /** 当前情绪状态风险 */
    emotionalStateRisk: number;
    /** 行为模式风险 */
    behavioralRisk: number;
  };
  /** 是否持续恶化（对比历史） */
  isEscalating: boolean;
  /** 建议的安全动作 */
  recommendedAction: SafetyActionType;
}

/** 安全动作类型 */
export enum SafetyActionType {
  /** 无动作 */
  NONE = 'none',
  /** 标记关注 */
  FLAG = 'flag',
  /** 发起安全对话 */
  INITIATE_SAFETY_DIALOGUE = 'initiate_safety_dialogue',
  /** 中断所有非安全动作 */
  INTERRUPT_ALL = 'interrupt_all',
  /** 推送心理资源 */
  PUSH_RESOURCES = 'push_resources',
  /** 建议联系紧急联系人 */
  SUGGEST_EMERGENCY_CONTACT = 'suggest_emergency_contact',
}

// ============================================================================
// 安全Agent运行状态
// ============================================================================

/** 安全Agent巡检状态 */
export interface SafetyPatrolStatus {
  /** 是否在安全接管模式 */
  safetyOverride: boolean;
  /** 接管原因 */
  overrideReason?: string;
  /** 接管开始时间 */
  overrideStartTime?: number;
  /** 当前风险等级 */
  currentRiskLevel: CrisisLevel | null;
  /** 连续风险事件计数 */
  consecutiveRiskEvents: number;
  /** 最后风险事件时间 */
  lastRiskEventTime: number | null;
  /** 活跃的危机协议 */
  activeCrisisProtocol: string | null;
  /** 安全Agent心跳 */
  lastPatrolTime: number;
  /** 巡检间隔（秒） */
  patrolIntervalSeconds: number;
}

/** 安全事件记录 */
export interface SafetyEvent {
  /** 事件ID */
  id: string;
  /** 事件时间戳 */
  timestamp: number;
  /** 事件类型 */
  type: SafetyEventType;
  /** 事件等级 */
  level: CrisisLevel;
  /** 事件描述 */
  description: string;
  /** 触发文本/信号 */
  trigger: string;
  /** 采取的动作 */
  actionTaken: SafetyActionType;
  /** 事件是否已解决 */
  resolved: boolean;
  /** 解决时间 */
  resolvedAt?: number;
}

/** 安全事件类型 */
export enum SafetyEventType {
  /** 关键词命中 */
  KEYWORD_HIT = 'keyword_hit',
  /** 行为异常 */
  BEHAVIOR_ANOMALY = 'behavior_anomaly',
  /** 情绪急剧恶化 */
  MOOD_CRASH = 'mood_crash',
  /** 社交完全退缩 */
  SOCIAL_WITHDRAWAL = 'social_withdrawal',
  /** 生理指标异常 */
  PHYSIOLOGICAL_ANOMALY = 'physiological_anomaly',
  /** 用户主动求助 */
  USER_HELP_REQUEST = 'user_help_request',
  /** 安全定时自检触发 */
  SCHEDULED_CHECK = 'scheduled_check',
}
