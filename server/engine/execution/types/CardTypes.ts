/**
 * 「同频」Same Wavelength — 元服务卡片类型定义
 *
 * 鸿蒙负一屏元服务卡片（Atomic Service Card）的渲染数据结构。
 * 三种卡片类型：心情卡片、搭子推荐卡片、周报卡片。
 *
 * 元服务优势：
 *   - 无需下载App即可使用核心功能
 *   - 右滑负一屏 = 1秒触达
 *   - 卡片内容由决策Agent动态生成，千人千面
 */

// ============================================================================
// 卡片类型枚举
// ============================================================================

/** 元服务卡片类型 */
export enum AtomicServiceCardType {
  /** 今日心情卡片 */
  MOOD_CARD = 'mood_card',
  /** 搭子推荐卡片 */
  BUDDY_CARD = 'buddy_card',
  /** 周报小记卡片 */
  WEEKLY_CARD = 'weekly_card',
  /** 活动提醒卡片 */
  ACTIVITY_CARD = 'activity_card',
  /** 危机资源卡片 */
  CRISIS_CARD = 'crisis_card',
}

// ============================================================================
// 心情卡片
// ============================================================================

/** 今日心情卡片数据 */
export interface MoodCardData {
  cardType: AtomicServiceCardType.MOOD_CARD;
  /** 卡片标题（动态） */
  title: string;
  /** 情绪emoji */
  emoji: string;
  /** 状态摘要文字 */
  statusText: string;
  /** 一句话关怀 */
  careMessage: string;
  /** 健康指标摘要 */
  indicators: {
    /** 😴 睡眠 */
    sleep: CardIndicator;
    /** 🏃 活动 */
    activity: CardIndicator;
    /** ❤️ 心率 */
    heartRate?: CardIndicator;
  };
  /** 主要动作按钮 */
  primaryAction: CardAction;
  /** 卡片样式 */
  style: CardVisualStyle;
  /** 更新时间 */
  updatedAt: number;
}

// ============================================================================
// 搭子推荐卡片
// ============================================================================

/** 搭子推荐卡片数据 */
export interface BuddyCardData {
  cardType: AtomicServiceCardType.BUDDY_CARD;
  /** 卡片标题 */
  title: string;
  /** 匹配摘要 */
  matchSummary: string;
  /** 推荐的搭子列表（最多3个） */
  recommendations: BuddyCardRecommendation[];
  /** 匹配上下文 */
  context: string;
  /** 社交深度 */
  depth: 1 | 2 | 3 | 4;
  /** 主要动作 */
  primaryAction: CardAction;
  /** 拒绝动作 */
  dismissAction: CardAction;
  /** 卡片样式 */
  style: CardVisualStyle;
  /** 更新时间 */
  updatedAt: number;
}

/** 搭子卡片中的单个推荐 */
export interface BuddyCardRecommendation {
  /** 匿名ID */
  peerId: string;
  /** 匹配理由 */
  matchReason: string;
  /** 推荐深度 */
  recommendedDepth: number;
  /** 共同点摘要 */
  commonPoints: string[];
}

// ============================================================================
// 周报卡片
// ============================================================================

/** 周报小记卡片数据 */
export interface WeeklyCardData {
  cardType: AtomicServiceCardType.WEEKLY_CARD;
  /** 卡片标题 */
  title: string;
  /** 周情绪趋势 */
  moodTrend: {
    direction: '↑' | '→' | '↓';
    label: string;
  };
  /** 周社交趋势 */
  socialTrend: {
    direction: '↑' | '→' | '↓';
    label: string;
  };
  /** 周睡眠趋势 */
  sleepTrend: {
    direction: '↑' | '→' | '↓';
    label: string;
  };
  /** 亮点 */
  highlight: string;
  /** 主要动作 */
  primaryAction: CardAction;
  /** 卡片样式 */
  style: CardVisualStyle;
  /** 更新时间 */
  updatedAt: number;
}

// ============================================================================
// 活动提醒卡片
// ============================================================================

/** 活动提醒卡片数据 */
export interface ActivityCardData {
  cardType: AtomicServiceCardType.ACTIVITY_CARD;
  /** 卡片标题 */
  title: string;
  /** 活动描述 */
  description: string;
  /** 活动时间 */
  time: string;
  /** 活动地点 */
  location: string;
  /** 相关人数 */
  participantsHint: string;
  /** 主要动作 */
  primaryAction: CardAction;
  /** 卡片样式 */
  style: CardVisualStyle;
  /** 更新时间 */
  updatedAt: number;
}

// ============================================================================
// 危机资源卡片
// ============================================================================

/** 危机资源卡片数据（仅在安全Agent触发时显示） */
export interface CrisisCardData {
  cardType: AtomicServiceCardType.CRISIS_CARD;
  /** 卡片标题 */
  title: string;
  /** 危机级别 */
  level: 'attention' | 'alert' | 'crisis';
  /** 资源列表 */
  resources: CrisisResource[];
  /** 主要动作 */
  primaryAction: CardAction;
  /** 卡片样式（始终 alert） */
  style: 'alert';
  /** 更新时间 */
  updatedAt: number;
}

/** 危机资源 */
export interface CrisisResource {
  /** 资源名称 */
  name: string;
  /** 联系方式/详情 */
  contact: string;
  /** 资源类型 */
  type: 'hotline' | 'counseling_center' | 'emergency_contact';
}

// ============================================================================
// 通用卡片组件
// ============================================================================

/** 卡片数据联合类型 */
export type AtomicServiceCardData =
  | MoodCardData
  | BuddyCardData
  | WeeklyCardData
  | ActivityCardData
  | CrisisCardData;

/** 卡片指标 */
export interface CardIndicator {
  /** 指标名 */
  label: string;
  /** 指标值 */
  value: string;
  /** 状态 */
  status: 'good' | 'normal' | 'poor';
}

/** 卡片动作 */
export interface CardAction {
  /** 动作标签 */
  label: string;
  /** 动作意图 */
  intent: string;
  /** 动作参数 */
  params: Record<string, unknown>;
  /** 目标（拉起对话/卡片/应用） */
  target: 'dialogue' | 'deep_link' | 'card_detail' | 'dismiss';
}

/** 卡片视觉样式 */
export type CardVisualStyle = 'warm' | 'neutral' | 'alert' | 'celebratory';

/** 卡片主题色 */
export const CARD_THEME_COLORS: Record<CardVisualStyle, { bg: string; accent: string; text: string }> = {
  warm: { bg: '#FFF8F0', accent: '#FF8C42', text: '#3D2C1E' },
  neutral: { bg: '#F5F5F5', accent: '#607D8B', text: '#263238' },
  alert: { bg: '#FFF0F0', accent: '#E53935', text: '#3E1A1A' },
  celebratory: { bg: '#F0FFF4', accent: '#43A047', text: '#1B3D1F' },
};

// ============================================================================
// 卡片渲染引擎
// ============================================================================

/** 卡片渲染请求 */
export interface CardRenderRequest {
  /** 请求ID */
  requestId: string;
  /** 卡片类型 */
  cardType: AtomicServiceCardType;
  /** 卡片数据 */
  data: AtomicServiceCardData;
  /** 目标设备 */
  targetDevice: 'phone' | 'tablet';
  /** 过期时间（秒，超时移除卡片） */
  ttlSeconds: number;
  /** 刷新间隔（秒，-1=不自动刷新） */
  refreshIntervalSeconds: number;
}

/** 卡片渲染状态 */
export interface CardRenderStatus {
  /** 请求ID */
  requestId: string;
  /** 是否已渲染 */
  rendered: boolean;
  /** 渲染设备 */
  device: string;
  /** 渲染时间 */
  renderedAt: number;
  /** 过期时间 */
  expiresAt: number;
  /** 用户是否已查看 */
  viewed: boolean;
  /** 用户是否已交互 */
  interacted: boolean;
  /** 交互类型 */
  interactionType?: 'tap_primary' | 'tap_dismiss' | 'swipe_away' | 'expired';
}
