/**
 * 「同频」Same Wavelength — 环境上下文数据接口
 *
 * 定义位置、天气、日历、时间等环境上下文信号的数据结构。
 */

import { LocationType, TimeOfDay, DayOfWeek } from '../../core/IntentTypes';

// ============================================================================
// 位置上下文
// ============================================================================

/** 地理围栏点位 */
export interface GeofencePoint {
  /** 点位标识 */
  id: string;
  /** 点位名称 */
  name: string;
  /** 位置类型 */
  type: LocationType;
  /** 纬度 */
  latitude: number;
  /** 经度 */
  longitude: number;
  /** 围栏半径（米） */
  radiusMeters: number;
}

/** 位置轨迹点 */
export interface LocationTracePoint {
  /** 时间戳 */
  timestamp: number;
  /** 位置类型 */
  locationType: LocationType;
  /** 停留时长（分钟），0表示路过 */
  stayDurationMinutes: number;
}

/** 位置摘要 */
export interface LocationSummary {
  /** 当前位置类型 */
  currentLocation: LocationType;
  /** 过去 N 小时的位置轨迹 */
  recentTraces: LocationTracePoint[];
  /** 当前是否在校园内 */
  onCampus: boolean;
  /** 最近一次围栏事件 */
  lastGeofenceEvent: GeofenceEvent | null;
}

/** 围栏事件 */
export interface GeofenceEvent {
  /** 事件类型 */
  type: 'enter' | 'exit';
  /** 围栏位置 */
  location: GeofencePoint;
  /** 事件时间戳 */
  timestamp: number;
}

// ============================================================================
// 天气上下文
// ============================================================================

/** 天气摘要 */
export interface WeatherSummary {
  /** 天气状况 */
  condition: WeatherCondition;
  /** 温度（摄氏度） */
  temperatureCelsius: number;
  /** 体感温度 */
  feelsLikeCelsius: number;
  /** 湿度 (0–100%) */
  humidity: number;
  /** 空气质量指数 */
  aqi: number;
  /** 是否适合户外活动 */
  suitableForOutdoor: boolean;
}

/** 天气状况枚举 */
export enum WeatherCondition {
  SUNNY = 'sunny',
  CLOUDY = 'cloudy',
  OVERCAST = 'overcast',
  RAINY = 'rainy',
  STORMY = 'stormy',
  SNOWY = 'snowy',
  FOGGY = 'foggy',
  HAZY = 'hazy',
}

// ============================================================================
// 日历上下文
// ============================================================================

/** 日历事件 */
export interface CalendarEvent {
  /** 事件ID */
  id: string;
  /** 事件标题 */
  title: string;
  /** 事件类型 */
  type: CalendarEventType;
  /** 开始时间戳 */
  startTime: number;
  /** 结束时间戳 */
  endTime: number;
  /** 地点 */
  location?: string;
  /** 是否为全天事件 */
  isAllDay: boolean;
}

/** 日历事件类型 */
export enum CalendarEventType {
  /** 课程 */
  CLASS = 'class',
  /** 考试 */
  EXAM = 'exam',
  /** 作业截止 */
  DEADLINE = 'deadline',
  /** 社团活动 */
  CLUB_ACTIVITY = 'club_activity',
  /** 个人事件 */
  PERSONAL = 'personal',
  /** 其他 */
  OTHER = 'other',
}

/** 考前/考试周标记 */
export interface ExamPeriodContext {
  /** 是否处于考试周 */
  isExamPeriod: boolean;
  /** 最近考试日期 */
  nearestExamDate: string | null;
  /** 考试周期压力等级 (0.0–1.0) */
  examStressLevel: number;
}

// ============================================================================
// 时间上下文
// ============================================================================

/** 时间上下文 */
export interface TimeContext {
  /** 当前时间戳 */
  now: number;
  /** 时段 */
  timeOfDay: TimeOfDay;
  /** 星期 */
  dayOfWeek: DayOfWeek;
  /** 是否为周末 */
  isWeekend: boolean;
  /** 是否为节假日 */
  isHoliday: boolean;
  /** 明天是否有早课（8:00前的课） */
  hasEarlyClassTomorrow: boolean;
}

// ============================================================================
// 环境上下文聚合
// ============================================================================

/** 环境上下文聚合快照 */
export interface ContextSnapshot {
  /** 时间戳 */
  timestamp: number;
  /** 位置摘要 */
  location: LocationSummary;
  /** 天气摘要 */
  weather: WeatherSummary;
  /** 时间上下文 */
  time: TimeContext;
  /** 考试周上下文 */
  examContext: ExamPeriodContext;
  /** 当前活跃的日历事件 */
  activeCalendarEvents: CalendarEvent[];
  /** 接下来2小时的日历事件 */
  upcomingEvents: CalendarEvent[];
}
