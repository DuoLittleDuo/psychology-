/**
 * 「同频」Same Wavelength — 设备类型定义
 *
 * 设备角色、设备能力、设备状态、跨设备协同配置。
 */

import { DeviceRole } from './ExecutionTypes';

// ============================================================================
// 设备能力
// ============================================================================

/** 设备能力描述 */
export interface DeviceCapability {
  /** 设备角色 */
  role: DeviceRole;
  /** 支持的交互模式 */
  supportedModes: DeviceInteractionMode[];
  /** 屏幕尺寸分类 */
  screenClass: 'tiny' | 'small' | 'medium' | 'large';
  /** 是否有屏幕 */
  hasScreen: boolean;
  /** 是否支持触觉反馈 */
  hasHaptics: boolean;
  /** 是否支持语音输入 */
  hasVoiceInput: boolean;
  /** 是否支持语音输出 */
  hasVoiceOutput: boolean;
  /** 最大单次显示字符数 */
  maxDisplayChars: number;
  /** 是否常驻后台 */
  backgroundPersistent: boolean;
}

/** 设备交互模式 */
export enum DeviceInteractionMode {
  /** 触摸 */
  TOUCH = 'touch',
  /** 语音 */
  VOICE = 'voice',
  /** 手势 */
  GESTURE = 'gesture',
  /** 震动 */
  VIBRATION = 'vibration',
  /** 声音 */
  SOUND = 'sound',
  /** 通知栏 */
  NOTIFICATION = 'notification',
  /** 元服务卡片 */
  ATOMIC_SERVICE_CARD = 'atomic_service_card',
  /** 全屏应用 */
  FULLSCREEN_APP = 'fullscreen_app',
}

// ============================================================================
// 设备协同配置
// ============================================================================

/** 设备协同策略 */
export interface DeviceCoordinationConfig {
  /** 默认主设备 */
  defaultPrimary: DeviceRole;
  /** 设备切换策略 */
  switchPolicy: DeviceSwitchPolicy;
  /** 各场景下的设备优先级 */
  scenarioPriority: ScenarioDevicePriority[];
}

/** 设备切换策略 */
export enum DeviceSwitchPolicy {
  /** 用户正在使用的设备优先 */
  IN_USE_FIRST = 'in_use_first',
  /** 屏幕最大的设备优先 */
  LARGEST_SCREEN_FIRST = 'largest_screen_first',
  /** 始终手机优先 */
  PHONE_FIRST = 'phone_first',
  /** 手动指定 */
  MANUAL = 'manual',
}

/** 场景设备优先级 */
export interface ScenarioDevicePriority {
  /** 场景 */
  scenario: string;
  /** 主设备 */
  primary: DeviceRole;
  /** 辅助设备 */
  secondary: DeviceRole[];
  /** 说明 */
  description: string;
}
