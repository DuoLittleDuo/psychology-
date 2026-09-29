/**
 * 「同频」Same Wavelength — 健康数据接口
 *
 * 定义从鸿蒙 Health Kit 获取的健康数据摘要结构。
 * 注意：Agent 只能拿到系统推送的摘要数据，不能轮询分钟级原始数据。
 */

// ============================================================================
// 睡眠数据
// ============================================================================

/** 每日睡眠摘要 */
export interface SleepSummary {
  /** 日期（ISO 8601 日期字符串），如 "2026-07-21" */
  date: string;
  /** 总睡眠时长（小时） */
  totalHours: number;
  /** 深睡时长（小时） */
  deepSleepHours: number;
  /** 浅睡时长（小时） */
  lightSleepHours: number;
  /** 夜间醒来次数 */
  wakeCount: number;
  /** 入睡时间（24小时制小时数，如 23.5 = 23:30） */
  sleepOnsetHour: number;
  /** 起床时间 */
  wakeUpHour: number;
  /** 睡眠质量评分 (0.0–1.0)，由 Health Kit 计算 */
  qualityScore: number;
  /** 与用户基准线的偏离程度 (-1.0 到 1.0，负=偏差，0=正常，正=偏好) */
  deviationFromBaseline: number;
}

/** 睡眠趋势 */
export type SleepTrend = 'improving' | 'stable' | 'declining' | 'significantly_low';

// ============================================================================
// 活动数据
// ============================================================================

/** 每日活动摘要 */
export interface ActivitySummary {
  /** 日期 */
  date: string;
  /** 步数 */
  stepCount: number;
  /** 中高强度活动时长（分钟） */
  moderateToVigorousMinutes: number;
  /** 户外活动时长（分钟，通过 GPS/位置估算） */
  outdoorMinutes: number;
  /** 总活动能量消耗（千卡） */
  activeEnergyKcal: number;
}

/** 活动趋势 */
export type ActivityTrend = 'above_baseline' | 'normal' | 'below_baseline' | 'sedentary';

// ============================================================================
// 心率数据
// ============================================================================

/** 静息心率日均摘要 */
export interface HeartRateSummary {
  /** 日期 */
  date: string;
  /** 日均静息心率 (bpm) */
  restingHeartRateAvg: number;
  /** 心率变异性（HRV）日均值（ms），如果设备支持 */
  hrvAvgMs?: number;
  /** 异常标记 */
  anomalyFlag?: 'tachycardia' | 'bradycardia' | 'normal';
  /** 与用户基准线的偏离 */
  deviationFromBaseline: number;
}

// ============================================================================
// 压力估计
// ============================================================================

/** 压力估计（基于 HRV 的摘要值） */
export interface StressEstimate {
  /** 日期 */
  date: string;
  /** 压力等级 (0.0–1.0，越高越紧张) */
  stressLevel: number;
  /** 置信度 */
  confidence: number;
  /** 来源设备 */
  sourceDevice: 'watch' | 'band' | 'other';
}

// ============================================================================
// 聚合健康快照
// ============================================================================

/** 健康数据聚合快照（在感知Agent融合时使用） */
export interface HealthSnapshot {
  /** 时间戳 */
  timestamp: number;
  /** 最近一次睡眠摘要 */
  latestSleep: SleepSummary | null;
  /** 最近一次活动摘要 */
  latestActivity: ActivitySummary | null;
  /** 最近一次心率摘要 */
  latestHeartRate: HeartRateSummary | null;
  /** 最近一次压力估计 */
  latestStress: StressEstimate | null;
  /** 睡眠趋势 */
  sleepTrend: SleepTrend;
  /** 活动趋势 */
  activityTrend: ActivityTrend;
}
