/**
 * 「同频」Same Wavelength — 多端执行类型定义
 *
 * 多端执行Agent的核心类型：跨端意图流转事件、执行指令、
 * 设备路由决策、元服务卡片交互。
 */

import { InterventionType } from '../../core/IntentTypes';

// ============================================================================
// 执行指令
// ============================================================================

/** Agent 执行指令（由决策Agent发出，执行Agent接收） */
export interface ExecutionCommand {
  /** 指令ID */
  commandId: string;
  /** 指令来源决策ID */
  decisionId: string;
  /** 指令创建时间 */
  createdAt: number;
  /** 指令类型 */
  type: ExecutionCommandType;
  /** 指令优先级 */
  priority: 'critical' | 'high' | 'medium' | 'low';
  /** 目标设备（可多个） */
  targetDevices: DeviceRole[];
  /** 指令载荷 */
  payload: ExecutionPayload;
  /** 指令过期时间（超时自动取消） */
  expiresAt: number;
  /** 是否需要用户确认 */
  requiresUserConfirmation: boolean;
}

/** 执行指令类型 */
export enum ExecutionCommandType {
  /** 推送通知 */
  PUSH_NOTIFICATION = 'push_notification',
  /** 元服务卡片更新 */
  CARD_UPDATE = 'card_update',
  /** 手表震动提醒 */
  WATCH_VIBRATE = 'watch_vibrate',
  /** 发起对话 */
  START_DIALOGUE = 'start_dialogue',
  /** 意图流转 */
  INTENT_CONTINUE = 'intent_continue',
  /** 设备同步 */
  DEVICE_SYNC = 'device_sync',
}

/** 执行载荷 */
export interface ExecutionPayload {
  /** 干预类型 */
  interventionType: InterventionType;
  /** 标题（手表=1行，手机=通知标题） */
  title: string;
  /** 内容 */
  body: string;
  /** 富文本/卡片数据 */
  richContent?: CardRenderData;
  /** 动作按钮 */
  actions?: ExecutionAction[];
  /** 触觉反馈类型 */
  hapticType?: 'light' | 'medium' | 'heavy' | 'none';
  /** 声音 */
  soundType?: 'default' | 'gentle' | 'urgent' | 'none';
}

/** 执行动作按钮 */
export interface ExecutionAction {
  /** 动作标签 */
  label: string;
  /** 动作类型 */
  type: 'navigate' | 'dialogue' | 'deep_link' | 'dismiss';
  /** 动作数据 */
  data: Record<string, unknown>;
}

// ============================================================================
// 设备路由
// ============================================================================

/** 设备角色 */
export enum DeviceRole {
  /** 手表：轻交互、感知、震动提醒、语音入口 */
  WATCH = 'watch',
  /** 手机：主交互、决策中枢、负一屏 */
  PHONE = 'phone',
  /** 平板：可视化、周报、趋势图 */
  TABLET = 'tablet',
  /** 负一屏：零门槛、元服务卡片 */
  NEGATIVE_ONE_SCREEN = 'negative_one_screen',
}

/** 设备状态 */
export interface DeviceStatus {
  /** 设备角色 */
  role: DeviceRole;
  /** 设备是否在线 */
  online: boolean;
  /** 屏幕是否解锁 */
  screenUnlocked: boolean;
  /** 当前前台应用 */
  foregroundApp?: string;
  /** 设备是否正在被用户使用 */
  inUse: boolean;
  /** 设备当前模式 */
  mode: 'normal' | 'dnd' | 'sleep' | 'gaming';
  /** 最后活跃时间 */
  lastActiveTime: number;
}

/** 设备路由决策 */
export interface DeviceRoutingDecision {
  /** 主要呈现设备 */
  primaryDevice: DeviceRole;
  /** 辅助呈现设备（同步展示，如手表震动+手机卡片） */
  secondaryDevices: DeviceRole[];
  /** 路由原因 */
  reason: string;
  /** 各设备的交互形式 */
  interactionForms: Map<DeviceRole, InteractionForm>;
}

/** 设备上的交互形式 */
export interface InteractionForm {
  /** 设备角色 */
  device: DeviceRole;
  /** 交互类型 */
  type: 'notification' | 'card' | 'dialogue' | 'vibration' | 'sound';
  /** 内容（按设备适配） */
  content: {
    /** 最大字符数 */
    maxChars: number;
    /** 显示文本 */
    displayText: string;
    /** 是否可交互 */
    interactive: boolean;
  };
}

// ============================================================================
// 意图流转
// ============================================================================

/** 意图流转事件 */
export interface IntentContinuationEvent {
  /** 流转事件ID */
  eventId: string;
  /** 源设备 */
  sourceDevice: DeviceRole;
  /** 目标设备 */
  targetDevice: DeviceRole;
  /** 流转的意图 */
  intent: ContinuationIntent;
  /** 流转时间 */
  timestamp: number;
  /** 流转状态 */
  status: IntentContinuationStatus;
  /** 流转数据（通过鸿蒙分布式软总线传输） */
  transferData: TransferData;
}

/** 流转意图 */
export interface ContinuationIntent {
  /** 意图类型 */
  type: string; // 'find_buddy' | 'check_data' | 'vent' | ...
  /** 意图来源 */
  source: 'voice_wake' | 'watch_gesture' | 'card_tap' | 'app_action';
  /** 用户原始输入 */
  userInput: string;
  /** 意图槽位 */
  slots: Record<string, string>;
}

/** 流转状态 */
export enum IntentContinuationStatus {
  /** 源设备识别成功 */
  RECOGNIZED = 'recognized',
  /** 流转中 */
  TRANSFERRING = 'transferring',
  /** 目标设备已接收 */
  RECEIVED = 'received',
  /** 目标设备已渲染 */
  RENDERED = 'rendered',
  /** 流转完成 */
  COMPLETED = 'completed',
  /** 流转失败 */
  FAILED = 'failed',
}

/** 流转数据 */
export interface TransferData {
  /** 数据大小（字节） */
  sizeBytes: number;
  /** 是否经过云端 */
  viaCloud: boolean;  // 永远是 false —— 走分布式总线
  /** 是否加密 */
  encrypted: boolean;
  /** 传输耗时（毫秒） */
  latencyMs: number;
}

/** 卡牌渲染数据（跨设备通用） */
export interface CardRenderData {
  /** 卡片类型 */
  cardType: 'mood_card' | 'buddy_card' | 'weekly_card' | 'activity_card' | 'crisis_card';
  /** 卡片标题 */
  title: string;
  /** 卡片副标题 */
  subtitle: string;
  /** 卡片图标/表情 */
  emoji: string;
  /** 数据字段 */
  fields: CardField[];
  /** 动作按钮 */
  actions: ExecutionAction[];
  /** 卡片样式 */
  style: 'warm' | 'neutral' | 'alert' | 'celebratory';
}

/** 卡片字段 */
export interface CardField {
  /** 字段标签 */
  label: string;
  /** 字段值 */
  value: string;
  /** 是否为主要字段 */
  primary: boolean;
}
