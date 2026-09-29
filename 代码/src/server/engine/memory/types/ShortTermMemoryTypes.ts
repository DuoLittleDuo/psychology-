/**
 * 「同频」Same Wavelength — 短期记忆类型（7天上下文窗口）
 *
 * 存储过去7天的每日摘要、最近干预记录、最近社交匹配记录。
 * 生命周期：每24h将前一天压缩为日摘要，保留7天。超过7天的→周摘要→候选晋级长期记忆。
 */

import { MemoryEntry, MemoryType, MemoryId, KeyEvent } from './MemoryEntry';
import { SocialDepth } from '../../core/Config';

// ============================================================================
// 短期记忆条目
// ============================================================================

/** 短期记忆条目 */
export interface ShortTermMemoryEntry extends MemoryEntry {
  type: MemoryType.SHORT_TERM;
  /** 过期时间戳（创建时间 + 7天） */
  expiresAt: number;
  /** 条目内容 */
  content: ShortTermMemoryContent;
}

/** 短期记忆内容类型 */
export type ShortTermMemoryContent =
  | DailySummary
  | InterventionRecord
  | SocialMatchRecord
  | ActiveBuddyInfo;

// ============================================================================
// 每日摘要
// ============================================================================

/**
 * 每日摘要
 *
 * 由瞬时记忆在每天凌晨压缩生成，是短期记忆的核心组成。
 */
export interface DailySummary {
  kind: 'daily_summary';
  /** 日期 */
  date: string;
  /** 当日综合情绪评分均值 */
  moodAvg: number;
  /** 当日社交意愿评分均值 */
  socialWillingnessAvg: number;
  /** 当日睡眠数据 */
  sleep: {
    totalHours: number;
    qualityScore: number;
  };
  /** 当日活动数据 */
  activity: {
    stepCount: number;
    outdoorMinutes: number;
  };
  /** 当日屏幕使用 */
  screenUsage: {
    totalHours: number;
    socialHours: number;
    videoHours: number;
    studyHours: number;
    lateNightUsage: boolean;
  };
  /** 当日亮点事件（2-3条人类可读的概括） */
  highlights: string[];
  /** 当日被触发的干预类型和次数 */
  interventionCounts: Record<string, number>;
  /** 当日社交互动次数 */
  socialInteractionCount: number;
}

// ============================================================================
// 干预记录
// ============================================================================

/** 干预记录 */
export interface InterventionRecord {
  kind: 'intervention';
  /** 记录ID */
  id: MemoryId;
  /** 干预类型 */
  interventionType: string;
  /** 干预时间 */
  timestamp: number;
  /** 干预触发的快照上下文（引用） */
  triggeredBySnapshotId: string;
  /** 干预内容摘要 */
  content: string;
  /** 用户反馈 */
  userFeedback: {
    /** 反馈类型 */
    type: 'clicked' | 'positive_reply' | 'neutral_reply' | 'ignored' | 'rejected';
    /** 用户回复内容（如果有） */
    replyText?: string;
    /** 反馈时间 */
    timestamp: number;
  } | null;  // null = 尚未收到反馈
  /** 干预效果 */
  effect: InterventionEffect | null;
}

/** 干预效果评估 */
export interface InterventionEffect {
  /** 干预前情绪评分 */
  moodBefore: number;
  /** 干预后情绪评分（如果有数据） */
  moodAfter?: number;
  /** 行为变化：干预前后步数变化 */
  stepChange?: number;
  /** 行为变化：社交App使用变化 */
  socialUsageChange?: number;
  /** 效果定性描述 */
  assessment: 'positive' | 'neutral' | 'negative' | 'unknown';
}

// ============================================================================
// 社交匹配记录
// ============================================================================

/** 社交匹配记录 */
export interface SocialMatchRecord {
  kind: 'social_match';
  /** 记录ID */
  id: MemoryId;
  /** 匹配时间 */
  timestamp: number;
  /** 匹配深度 */
  depth: SocialDepth;
  /** 匹配对方的匿名ID */
  matchPeerId: string;
  /** 匹配上下文（如：图书馆L1、项目组队L3） */
  context: string;
  /** 匹配结果 */
  result: {
    /** 是否匹配成功（双方确认） */
    matched: boolean;
    /** 是否有后续互动 */
    hadFollowUp: boolean;
    /** 互动次数 */
    followUpCount: number;
    /** 用户满意度（如果有反馈） */
    userSatisfaction?: number; // 1-5
  };
}

// ============================================================================
// 活跃社交关系
// ============================================================================

/** 活跃搭子信息 */
export interface ActiveBuddyInfo {
  kind: 'active_buddy';
  /** 搭子ID */
  buddyId: string;
  /** 关系深度 */
  depth: SocialDepth;
  /** 最近互动时间 */
  lastInteractionTime: number;
  /** 互动总次数 */
  totalInteractions: number;
  /** 互动质量评分 */
  qualityScore: number;
  /** 共同话题/兴趣 */
  commonInterests: string[];
}

// ============================================================================
// 短期记忆聚合
// ============================================================================

/**
 * 短期记忆聚合视图
 *
 * 这是决策Agent查询短期记忆时获得的结构化结果。
 */
export interface ShortTermMemoryView {
  /** 最近7天的每日摘要 */
  dailySummaries: DailySummary[];
  /** 最近10次干预记录 */
  recentInterventions: InterventionRecord[];
  /** 最近5次社交匹配记录 */
  recentMatches: SocialMatchRecord[];
  /** 当前活跃的搭子关系 */
  activeBuddies: ActiveBuddyInfo[];
  /** 当前情绪趋势 */
  moodTrend: MoodTrendSummary;
  /** 最近的关注主题 */
  recentConcerns: string[];
  /** 生成时间戳 */
  generatedAt: number;
}

/** 短期情绪趋势 */
export interface MoodTrendSummary {
  /** 趋势方向 */
  direction: 'improving' | 'stable' | 'declining' | 'volatile';
  /** 当前7日均值 */
  weeklyAverage: number;
  /** 变化率（相对于上周） */
  weekOverWeekChange: number;
  /** 趋势可靠性（数据点越多越可靠） */
  confidence: number;
}

// ============================================================================
// 短期记忆 → 长期记忆 晋级
// ============================================================================

/**
 * 周摘要（短期记忆压缩结果）
 *
 * 7天短期记忆过期后压缩为周摘要，候选晋级长期记忆。
 */
export interface WeeklySummary {
  /** 生成时间 */
  generatedAt: number;
  /** 覆盖的周 */
  weekStartDate: string;
  weekEndDate: string;
  /** 周情绪均值 */
  weeklyMoodAvg: number;
  /** 周社交意愿均值 */
  weeklySocialAvg: number;
  /** 周睡眠均值 */
  weeklySleepAvg: number;
  /** 干预响应率 */
  interventionResponseRate: number; // 0.0-1.0
  /** 社交匹配成功率 */
  matchSuccessRate: number;
  /** 发现的重复模式 */
  repeatedPatterns: RepeatedPattern[];
  /** 关键事件 */
  keyEvents: KeyEvent[];
}

/** 重复模式（晋级长期记忆的关键证据） */
export interface RepeatedPattern {
  /** 模式描述 */
  description: string;
  /** 模式类型 */
  type: 'behavior' | 'emotional' | 'social' | 'preference' | 'constraint';
  /** 出现次数 */
  occurrenceCount: number;
  /** 最近一次出现日期 */
  lastOccurrenceDate: string;
  /** 模式置信度 */
  confidence: number;
  /** 建议操作 */
  suggestedAction: 'promote_to_long_term' | 'monitor' | 'discard';
}
