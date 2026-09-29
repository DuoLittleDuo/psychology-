/**
 * 「同频」Same Wavelength — 危机协议类型
 *
 * 四级危机升级链的完整接口定义。
 *
 * 一级响应 → 二级响应 → 三级响应 → 长期低频关怀
 *
 * 关键原则：
 *   1. 绝不替用户做决定
 *   2. 绝不未经同意通知任何人
 *   3. 用户拒绝尊重、不行动、继续监测
 */

// ============================================================================
// 危机协议状态
// ============================================================================

/** 危机协议阶段 */
export enum CrisisProtocolStage {
  /** 未激活 */
  INACTIVE = 'inactive',
  /** 一级响应：延长陪伴 */
  STAGE_1_EXTENDED_COMPANIONSHIP = 'stage_1',
  /** 二级响应：专业资源引导 */
  STAGE_2_RESOURCE_GUIDANCE = 'stage_2',
  /** 三级响应：征询授权联系紧急联系人 */
  STAGE_3_CONSENT_INQUIRY = 'stage_3',
  /** 长期：低频持续关怀 */
  STAGE_LONG_TERM_CARE = 'stage_long_term',
  /** 已解除 */
  RESOLVED = 'resolved',
}

/** 危机协议完整状态 */
export interface CrisisProtocolState {
  /** 当前阶段 */
  currentStage: CrisisProtocolStage;
  /** 协议激活时间 */
  activatedAt: number;
  /** 触发协议的安全事件ID */
  triggeredByEventId: string;
  /** 每个阶段的执行历史 */
  stageHistory: CrisisStageExecution[];
  /** 用户在每个阶段的表现 */
  userResponses: CrisisUserResponse[];
  /** 解除条件是否满足 */
  resolutionConditions: ResolutionConditions;
  /** 总体风险评估 */
  overallRiskAssessment: CrisisRiskAssessment;
}

// ============================================================================
// 各阶段执行详情
// ============================================================================

/** 危机阶段执行记录 */
export interface CrisisStageExecution {
  /** 阶段 */
  stage: CrisisProtocolStage;
  /** 开始时间 */
  startedAt: number;
  /** 结束时间 */
  endedAt?: number;
  /** 执行的动作 */
  actionsTaken: CrisisAction[];
  /** 用户响应 */
  userResponse: CrisisUserResponse | null;
  /** 是否升级到下一阶段 */
  escalatedToNext: boolean;
}

/** 危机动作 */
export interface CrisisAction {
  /** 动作时间 */
  timestamp: number;
  /** 动作类型 */
  type: CrisisActionType;
  /** 动作内容 */
  content: string;
  /** 动作状态 */
  status: 'executed' | 'pending' | 'skipped';
}

/** 危机动作类型 */
export enum CrisisActionType {
  /** 持续陪伴对话 */
  EXTEND_DIALOGUE = 'extend_dialogue',
  /** 温暖卡片 */
  WARM_CARD = 'warm_card',
  /** 心理资源推送 */
  RESOURCE_PUSH = 'resource_push',
  /** 热线卡片 */
  HOTLINE_CARD = 'hotline_card',
  /** 征询授权 */
  CONSENT_INQUIRY = 'consent_inquiry',
  /** 通知紧急联系人 */
  NOTIFY_EMERGENCY = 'notify_emergency',
  /** 静默监测 */
  SILENT_MONITOR = 'silent_monitor',
}

/** 危机中的用户响应 */
export interface CrisisUserResponse {
  /** 响应时间 */
  timestamp: number;
  /** 响应阶段 */
  stage: CrisisProtocolStage;
  /** 用户是否愿意倾诉 */
  willingToTalk: boolean;
  /** 用户说了什么（脱敏摘要） */
  responseSummary: string;
  /** 用户对专业帮助的态度 */
  attitudeTowardHelp: 'open' | 'hesitant' | 'rejecting' | 'no_response';
  /** 用户是否授权联系紧急联系人 */
  authorizedContact?: boolean;
  /** 用户是否主动求助 */
  activelySeekingHelp: boolean;
}

// ============================================================================
// 解除条件
// ============================================================================

/** 危机解除条件 */
export interface ResolutionConditions {
  /** 情绪评分稳定回升（连续N天>阈值） */
  moodStabilized: boolean;
  /** 最后一次风险事件距今超过 N 天 */
  noRecentRiskEvents: boolean;
  /** 用户明确表示状态好转 */
  userReportedImprovement: boolean;
  /** 安全对话不再检测到风险 */
  safetyDialogueCleared: boolean;
  /** 解除建议 */
  resolutionRecommendation: ResolutionRecommendation;
}

/** 解除建议 */
export interface ResolutionRecommendation {
  /** 是否建议解除 */
  shouldResolve: boolean;
  /** 解除后建议行动 */
  postResolutionAction: string;
  /** 持续监测频率 */
  monitoringFrequency: 'daily' | 'every_other_day' | 'weekly';
  /** 监测持续时间（天） */
  monitoringDurationDays: number;
}

// ============================================================================
// 风险评估
// ============================================================================

/** 危机风险评估 */
export interface CrisisRiskAssessment {
  /** 综合风险等级 */
  level: 'green' | 'yellow' | 'orange' | 'red';
  /** 风险评分 (0.0–1.0) */
  score: number;
  /** 风险因子 */
  factors: RiskFactor[];
  /** 建议监控强度 */
  recommendedMonitoring: 'standard' | 'elevated' | 'intensive' | 'immediate';
  /** 评估时间 */
  assessedAt: number;
}

/** 风险因子 */
export interface RiskFactor {
  /** 因子名 */
  name: string;
  /** 严重度 */
  severity: 'low' | 'moderate' | 'high' | 'critical';
  /** 描述 */
  description: string;
  /** 是否可控 */
  controllable: boolean;
}

// ============================================================================
// 危机后的长期关怀
// ============================================================================

/** 长期关怀计划 */
export interface LongTermCarePlan {
  /** 关联的危机事件ID */
  crisisEventId: string;
  /** 危机解除日期 */
  resolvedDate: string;
  /** 关怀计划 */
  plan: {
    /** 推送频率 */
    frequency: 'every_2_days' | 'every_3_days' | 'weekly';
    /** 推送内容类型 */
    contentTypes: string[];
    /** 关怀截止日期 */
    endDate: string;
  };
  /** 是否在关怀中检测到再次恶化 */
  reEscalationDetected: boolean;
  /** 再次恶化时的处理 */
  reEscalationAction?: string;
}
