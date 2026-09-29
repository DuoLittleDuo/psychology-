/**
 * 「同频」Same Wavelength — 应用使用行为数据接口
 *
 * 定义从鸿蒙系统 UsageStats 获取的应用使用数据聚合结构。
 * 系统每小时推一次聚合值，Agent 不能实时监控。
 */

// ============================================================================
// 应用使用时长
// ============================================================================

/** 应用类别 */
export enum AppCategory {
  /** 社交类：微信、QQ、微博、小红书等 */
  SOCIAL = 'social',
  /** 视频/短视频类：抖音、B站、腾讯视频等 */
  VIDEO = 'video',
  /** 学习/教育类：超星、知到、网易公开课等 */
  STUDY = 'study',
  /** 游戏类 */
  GAME = 'game',
  /** 音乐/音频类 */
  MUSIC = 'music',
  /** 浏览器/阅读类 */
  READING = 'reading',
  /** 购物类 */
  SHOPPING = 'shopping',
  /** 工具/效率类 */
  TOOLS = 'tools',
  /** 其他 */
  OTHER = 'other',
}

/** 各类应用使用时长（小时） */
export type UsageByCategory = Record<AppCategory, number>;

/** 每小时应用使用聚合 */
export interface UsageStatsAggregate {
  /** 聚合时段开始时间戳 */
  windowStart: number;
  /** 聚合时段结束时间戳 */
  windowEnd: number;
  /** 各类应用使用时长（小时） */
  usageByCategory: UsageByCategory;
  /** 总屏幕使用时长（小时） */
  totalScreenTime: number;
  /** 屏幕唤醒次数 */
  screenWakeCount: number;
  /** 最常用应用包名 Top 3 */
  topApps: string[];
  /** 是否在深夜时段 (23:00-05:00) 有使用记录 */
  lateNightUsage: boolean;
}

// ============================================================================
// 行为事件
// ============================================================================

/** 行为事件（离散事件，非聚合） */
export interface BehaviorEvent {
  /** 事件ID */
  id: string;
  /** 事件时间戳 */
  timestamp: number;
  /** 事件类型 */
  type: BehaviorEventType;
  /** 事件关联的应用包名（可选） */
  packageName?: string;
  /** 额外数据 */
  extra?: Record<string, unknown>;
}

/** 行为事件类型 */
export enum BehaviorEventType {
  /** 应用前台切换 */
  APP_FOREGROUND_SWITCH = 'app_foreground_switch',
  /** 长时间连续使用（>2小时不间隔） */
  PROLONGED_USAGE = 'prolonged_usage',
  /** 深夜使用标记 */
  LATE_NIGHT_USE = 'late_night_use',
  /** 社交应用使用突增 */
  SOCIAL_USAGE_SPIKE = 'social_usage_spike',
  /** 学习应用使用突增 */
  STUDY_USAGE_SPIKE = 'study_usage_spike',
}

// ============================================================================
// 行为分析
// ============================================================================

/** 行为趋势分析（由感知Agent融合计算） */
export interface BehaviorTrend {
  /** 分析时间窗口起始 */
  windowStart: number;
  /** 分析时间窗口结束 */
  windowEnd: number;
  /** 社交应用使用趋势 */
  socialUsageTrend: 'increasing' | 'stable' | 'decreasing';
  /** 屏幕时间变化率（相对于用户基准） */
  screenTimeChangeRate: number;
  /** 深夜使用频率（过去 N 天有深夜使用的天数） */
  lateNightFrequency: number;
  /** 学习投入度变化 */
  studyEngagementChange: number;
  /** 行为异常标记 */
  anomalyFlags: BehaviorAnomalyFlag[];
}

/** 行为异常标记 */
export enum BehaviorAnomalyFlag {
  /** 社交退缩：社交应用使用持续减少 */
  SOCIAL_WITHDRAWAL = 'social_withdrawal',
  /** 视频沉迷：视频/短视频使用持续增加 */
  VIDEO_BINGE = 'video_binge',
  /** 昼夜颠倒：深夜使用频率持续增加 */
  CIRCADIAN_DISRUPTION = 'circadian_disruption',
  /** 学习荒废：学习类应用使用骤降 */
  STUDY_NEGLECT = 'study_neglect',
  /** 行为正常 */
  NORMAL = 'normal',
}
