/**
 * 「同频」Same Wavelength — 统一多模态快照数据结构
 *
 * 这是感知Agent最核心的输出：将不同频率、不同格式的多模态信号
 * 融合为时序对齐的"当前状态快照"，供决策/记忆Agent使用。
 *
 * 融合策略：
 *   事件驱动融合（高频）：每次事件触发 → 收集过去4h所有通道最新快照
 *   定时融合（低频）：每日3次 → 汇总自上次融合以来的所有事件
 */

import { HealthSnapshot } from './HealthData';
import { UsageStatsAggregate, BehaviorTrend, BehaviorAnomalyFlag } from './UsageData';
import { DialogueSignalSummary } from './DialogueData';
import { ContextSnapshot } from './ContextData';
import { LocationType } from '../../core/IntentTypes';

// ============================================================================
// 情绪评分
// ============================================================================

/**
 * 情绪评分（综合推断）
 *
 * 注意：这不是"诊断"，而是基于行为/生理/对话信号的"状态评估"。
 * 在初赛文档中必须强调这是"辅助工具"而非"医疗诊断"。
 */
export interface MoodAssessment {
  /** 综合情绪评分 (0.0–1.0，1.0 = 最佳状态) */
  overallScore: number;
  /** 各维度得分 */
  dimensions: {
    /** 精力/活力 (0.0–1.0) */
    energy: number;
    /** 愉悦度 (0.0–1.0) */
    pleasure: number;
    /** 平静度 (0.0–1.0) */
    calmness: number;
    /** 专注度 (0.0–1.0) */
    focus: number;
  };
  /** 置信度 */
  confidence: number;
  /** 推断来源 */
  inferenceSources: InferenceSource[];
}

/** 情绪推断来源 */
export enum InferenceSource {
  SLEEP_QUALITY = 'sleep_quality',
  ACTIVITY_LEVEL = 'activity_level',
  HEART_RATE_TREND = 'heart_rate_trend',
  STRESS_ESTIMATE = 'stress_estimate',
  SOCIAL_ENGAGEMENT = 'social_engagement',
  SCREEN_USAGE_PATTERN = 'screen_usage_pattern',
  DIALOGUE_SENTIMENT = 'dialogue_sentiment',
  LOCATION_PATTERN = 'location_pattern',
  MANUAL_OVERRIDE = 'manual_override',  // 上帝模式手动设置
}

// ============================================================================
// 社交意愿评分
// ============================================================================

/** 社交意愿评估 */
export interface SocialWillingnessAssessment {
  /** 社交意愿评分 (0.0–1.0，1.0 = 非常愿意社交) */
  overallScore: number;
  /** 社交偏好粒度 */
  preferredDepth: 1 | 2 | 3 | 4;  // 对应 SocialDepth L1-L4
  /** 独处意愿标记：用户可能需要独处 */
  solitudePreference: boolean;
  /** 推理置信度 */
  confidence: number;
}

// ============================================================================
// 统一快照
// ============================================================================

/**
 * 统一多模态快照
 *
 * 这是感知Agent的核心输出，每次事件触发或定时融合时生成一份。
 * 快照包含当前时间窗口内所有通道的最新数据 + 融合后的综合评估。
 */
export interface Snapshot {
  /** 快照ID（唯一） */
  id: string;
  /** 快照生成时间戳 */
  timestamp: number;
  /** 快照覆盖的时间窗口（小时） */
  windowHours: number;

  // ---- 原始信号 ----
  /** 健康信号（睡眠/活动/心率/压力） */
  health: HealthSnapshot;
  /** 行为信号（应用使用/屏幕时间） */
  usage: UsageSignalSummary;
  /** 对话信号 */
  dialogue: DialogueSignalSummary;
  /** 环境上下文信号 */
  context: ContextSnapshot;

  // ---- 融合推断 ----
  /** 综合情绪评估 */
  mood: MoodAssessment;
  /** 社交意愿评估 */
  socialWillingness: SocialWillingnessAssessment;
  /** 行为趋势分析 */
  behaviorTrend: BehaviorTrend;

  // ---- 元数据 ----
  /** 快照版本号（用于增量更新检测） */
  version: number;
  /** 触发此快照生成的事件类型 */
  triggerEvent: string;
  /** 是否为手动触发（上帝模式） */
  isManualOverride: boolean;
}

// ============================================================================
// 行为信号摘要（快照子结构）
// ============================================================================

/** 行为信号摘要 */
export interface UsageSignalSummary {
  /** 总屏幕时长（小时） */
  totalScreenTimeHours: number;
  /** 社交App使用时长（小时） */
  socialAppHours: number;
  /** 视频App使用时长（小时） */
  videoAppHours: number;
  /** 学习App使用时长（小时） */
  studyAppHours: number;
  /** 屏幕唤醒次数 */
  screenWakeCount: number;
  /** 深夜使用标记 */
  lateNightUsage: boolean;
  /** 与用户基线的偏离 */
  deviationFromBaseline: number;
}

// ============================================================================
// 情绪趋势
// ============================================================================

/**
 * 情绪趋势分析（用于L1/L2决策）
 *
 * 由感知Agent在定时融合时计算，用于判断情绪是否持续下降。
 */
export interface MoodTrend {
  /** 趋势方向 */
  direction: 'improving' | 'stable' | 'declining' | 'volatile';
  /** 趋势斜率（每天的变化率） */
  slope: number;
  /** 连续下降天数 */
  consecutiveDeclineDays: number;
  /** 最近 N 天的情绪评分序列 */
  recentScores: Array<{
    date: string;
    score: number;
  }>;
  /** 最低评分 */
  lowestScore: number;
  /** 最高评分 */
  highestScore: number;
}

// ============================================================================
// 快照元数据
// ============================================================================

/** 快照生成触发类型 */
export enum SnapshotTriggerType {
  /** 事件驱动（系统事件/用户意图） */
  EVENT_DRIVEN = 'event_driven',
  /** 定时融合（每日3次自检） */
  SCHEDULED_FUSION = 'scheduled_fusion',
  /** 手动触发（上帝模式/调试） */
  MANUAL_TRIGGER = 'manual_trigger',
  /** 安全Agent触发（紧急状态评估） */
  SAFETY_TRIGGER = 'safety_trigger',
}

// ============================================================================
// 快照差异（用于检测变化）
// ============================================================================

/** 两个快照之间的差异 */
export interface SnapshotDiff {
  /** 快照A的ID */
  snapshotAId: string;
  /** 快照B的ID */
  snapshotBId: string;
  /** 时间间隔（小时） */
  intervalHours: number;
  /** 情绪评分变化 */
  moodChange: number;    // 正 = 改善，负 = 恶化
  /** 社交意愿变化 */
  socialWillingnessChange: number;
  /** 睡眠质量变化 */
  sleepQualityChange: number;
  /** 活动水平变化 */
  activityChange: number;
  /** 社交App使用变化 */
  socialUsageChange: number;
  /** 综合变化摘要 */
  summary: string;
}

// ============================================================================
// 历史快照序列
// ============================================================================

/** 快照时间序列（用于3天/7天趋势分析） */
export interface SnapshotSeries {
  /** 快照列表（按时间升序） */
  snapshots: Snapshot[];
  /** 时间范围 */
  range: {
    start: number;
    end: number;
  };
  /** 快照总数 */
  count: number;
  /** 平均生成间隔（小时） */
  averageIntervalHours: number;
}
