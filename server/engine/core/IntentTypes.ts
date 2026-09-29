/**
 * 「同频」Same Wavelength — 意图与事件类型枚举
 *
 * 定义 Agent 联邦中所有意图类别、唤醒源类型、系统事件类型。
 * 遵循鸿蒙 Agent 范式：事件驱动 + 意图唤醒，而非轮询。
 */

// ============================================================================
// Agent 唤醒源类型
// ============================================================================

/** Agent 唤醒源分类（三大类） */
export enum WakeupSourceType {
  /** 类型1: 系统事件广播（被动唤醒） */
  SYSTEM_EVENT = 'system_event',
  /** 类型2: 用户意图唤醒（主动唤醒） */
  USER_INTENT = 'user_intent',
  /** 类型3: 定时自检（低频） */
  SCHEDULED_SELF_CHECK = 'scheduled_self_check',
}

// ============================================================================
// 系统事件类型（类型1）
// ============================================================================

/** 系统事件子类型 */
export enum SystemEventType {
  /** 睡眠事件：用户起床/闹钟关闭 → Health Kit 推送睡眠摘要 */
  SLEEP_SUMMARY = 'sleep_summary',
  /** 活动摘要：步数/运动数据每日汇总 */
  ACTIVITY_SUMMARY = 'activity_summary',
  /** 心率趋势：静息心率日均值 */
  HEART_RATE_TREND = 'heart_rate_trend',
  /** 压力估计：基于 HRV 的摘要值 */
  STRESS_ESTIMATE = 'stress_estimate',

  /** 位置围栏进入事件 */
  GEOFENCE_ENTER = 'geofence_enter',
  /** 位置围栏离开事件 */
  GEOFENCE_EXIT = 'geofence_exit',

  /** 应用使用时长聚合（系统每小时推送一次） */
  USAGE_STATS_AGGREGATE = 'usage_stats_aggregate',
  /** 深夜屏幕使用标记 */
  LATE_NIGHT_SCREEN = 'late_night_screen',

  /** 日历事件开始 */
  CALENDAR_EVENT_START = 'calendar_event_start',
  /** 日历事件结束 */
  CALENDAR_EVENT_END = 'calendar_event_end',

  /** 设备状态变化：手表佩戴/摘下 */
  DEVICE_WEAR_STATE = 'device_wear_state',
  /** 设备充电状态变化 */
  DEVICE_CHARGE_STATE = 'device_charge_state',

  /** 天气剧烈变化 */
  WEATHER_CHANGE = 'weather_change',
}

// ============================================================================
// 用户意图类型（类型2 — 对话/语音唤醒）
// ============================================================================

/** 用户意图类别（小艺 Intent API 返回的意图槽位） */
export enum UserIntentType {
  /** 倾诉：用户想表达情绪 */
  VENT = 'vent',
  /** 求助：用户主动寻求帮助 */
  SEEK_HELP = 'seek_help',
  /** 闲聊：日常对话 */
  CHAT = 'chat',
  /** 找搭子：主动寻求社交匹配 */
  FIND_BUDDY = 'find_buddy',
  /** 查数据：查看个人健康/行为数据 */
  CHECK_DATA = 'check_data',
  /** 设定偏好：修改个人配置/约束 */
  SET_PREFERENCE = 'set_preference',
  /** 拒绝：明确拒绝Agent建议 */
  REJECT = 'reject',
  /** 未知意图 */
  UNKNOWN = 'unknown',
}

// ============================================================================
// 情感倾向（端侧轻量分类器输出）
// ============================================================================

/** 情感极性三分类 */
export enum SentimentPolarity {
  POSITIVE = 'positive',
  NEUTRAL = 'neutral',
  NEGATIVE = 'negative',
}

// ============================================================================
// 干预动作类型
// ============================================================================

/** Agent 可发起的干预动作类型 */
export enum InterventionType {
  /** 无操作（静默观察） */
  NONE = 'none',
  /** 共情对话：发起温暖的非评判性对话 */
  EMPATHY_DIALOGUE = 'empathy_dialogue',
  /** 温暖卡片：推送一条关怀文字 */
  WARM_CARD = 'warm_card',
  /** 运动建议：轻量行为激活 */
  EXERCISE_SUGGESTION = 'exercise_suggestion',
  /** 搭子推荐 L1：空间共存 */
  BUDDY_L1 = 'buddy_l1',
  /** 搭子推荐 L2：轻量社交 */
  BUDDY_L2 = 'buddy_l2',
  /** 搭子推荐 L3：深度匹配 */
  BUDDY_L3 = 'buddy_l3',
  /** 活动推送：校园活动/社团 */
  ACTIVITY_PUSH = 'activity_push',
  /** 心理资源引导：推送校心理咨询/热线 */
  RESOURCE_GUIDE = 'resource_guide',
  /** 危机响应：启动安全协议 */
  CRISIS_RESPONSE = 'crisis_response',
  /** 周报推送：情绪/社交趋势总结 */
  WEEKLY_REPORT = 'weekly_report',
}

// ============================================================================
// 用户反馈类型
// ============================================================================

/** 用户对干预的反馈类型 */
export enum UserFeedbackType {
  /** 点击/查看 */
  CLICKED = 'clicked',
  /** 积极回复 */
  POSITIVE_REPLY = 'positive_reply',
  /** 中性回复 */
  NEUTRAL_REPLY = 'neutral_reply',
  /** 忽略 */
  IGNORED = 'ignored',
  /** 明确拒绝 */
  REJECTED = 'rejected',
}

// ============================================================================
// 位置类型（地理围栏）
// ============================================================================

/** 位置类型枚举 */
export enum LocationType {
  DORMITORY = 'dormitory',
  CLASSROOM = 'classroom',
  LIBRARY = 'library',
  PLAYGROUND = 'playground',
  CANTEEN = 'canteen',
  OTHER = 'other',
}

// ============================================================================
// 时段类型
// ============================================================================

/** 时段类型 */
export enum TimeOfDay {
  EARLY_MORNING = 'early_morning', // 05:00-08:00
  MORNING = 'morning',             // 08:00-12:00
  AFTERNOON = 'afternoon',         // 12:00-18:00
  EVENING = 'evening',             // 18:00-23:00
  NIGHT = 'night',                 // 23:00-05:00
}

// ============================================================================
// 星期类型
// ============================================================================

export enum DayOfWeek {
  MONDAY = 1,
  TUESDAY = 2,
  WEDNESDAY = 3,
  THURSDAY = 4,
  FRIDAY = 5,
  SATURDAY = 6,
  SUNDAY = 7,
}
