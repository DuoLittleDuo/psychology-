/**
 * 「同频」Same Wavelength — 感知通道接口
 *
 * 定义统一的多模态感知通道接口（SensorChannel Interface）。
 * 所有感知通道（Health Kit、UsageStats、Dialogue、Context）实现此接口。
 */

import { AgentMessage } from '../core/AgentBase';

// ============================================================================
// 传感器通道接口
// ============================================================================

/**
 * 传感器通道接口
 *
 * 每个感知通道负责一个信号源的接入、预处理和事件发布。
 * 通道不直接调用其他Agent，而是通过发布事件到消息总线通信。
 */
export interface ISensorChannel {
  /** 通道唯一标识 */
  readonly channelId: string;

  /** 通道名称 */
  readonly channelName: string;

  /** 通道描述 */
  readonly description: string;

  /** 通道是否已激活 */
  readonly isActive: boolean;

  /** 数据来源（鸿蒙系统API） */
  readonly dataSource: string;

  /**
   * 初始化通道
   * - 订阅系统事件/权限检查
   */
  initialize(): Promise<void>;

  /**
   * 激活通道：开始监听数据
   */
  start(): Promise<void>;

  /**
   * 停用通道：停止监听数据
   */
  stop(): Promise<void>;

  /**
   * 获取通道最新数据快照
   */
  getLatestSnapshot(): Promise<ChannelSnapshot>;

  /**
   * 检查通道健康状态
   */
  healthCheck(): Promise<ChannelHealthStatus>;

  /**
   * 设置通道配置
   */
  configure(config: ChannelConfig): void;

  /**
   * 事件发布回调（由感知Agent注入）
   */
  onEventPublish: ((event: ChannelEvent) => Promise<void>) | null;
}

// ============================================================================
// 通道事件
// ============================================================================

/** 通道事件（感知通道发布到感知Agent的内部事件） */
export interface ChannelEvent {
  /** 事件ID */
  id: string;
  /** 通道ID */
  channelId: string;
  /** 事件类型 */
  type: string;
  /** 事件时间戳 */
  timestamp: number;
  /** 事件数据 */
  data: unknown;
  /** 事件优先级 */
  priority: 'high' | 'medium' | 'low';
}

// ============================================================================
// 通道快照
// ============================================================================

/** 通道数据快照（通道返回给感知Agent的标准化数据） */
export interface ChannelSnapshot {
  /** 快照ID */
  snapshotId: string;
  /** 通道ID */
  channelId: string;
  /** 快照时间窗口起始 */
  windowStart: number;
  /** 快照时间窗口结束 */
  windowEnd: number;
  /** 快照数据（通道特定） */
  data: Record<string, unknown>;
  /** 数据新鲜度 (0.0–1.0，1.0=实时) */
  freshness: number;
  /** 数据置信度 */
  confidence: number;
}

// ============================================================================
// 通道健康
// ============================================================================

/** 通道健康状态 */
export interface ChannelHealthStatus {
  /** 通道ID */
  channelId: string;
  /** 是否健康 */
  healthy: boolean;
  /** 最后成功采集数据的时间 */
  lastDataTime: number;
  /** 错误计数 */
  errorCount: number;
  /** 最后错误信息 */
  lastError?: string;
  /** 是否需要降级处理 */
  needsDegradation: boolean;
}

// ============================================================================
// 通道配置
// ============================================================================

/** 通道配置 */
export interface ChannelConfig {
  /** 采样策略 */
  samplingStrategy: 'event_driven' | 'scheduled' | 'hybrid';
  /** 最小采样间隔（毫秒） */
  minSampleIntervalMs?: number;
  /** 数据有效期（毫秒） */
  dataTtlMs?: number;
  /** 是否启用降级模式 */
  degradationEnabled?: boolean;
  /** 降级后的替代策略 */
  degradationFallback?: string;
}

// ============================================================================
// 感知Agent内部消息
// ============================================================================

/** 感知Agent内部消息（通道→Agent） */
export interface PerceptionInternalMessage extends AgentMessage {
  sourceAgent: 'PerceptionAgent';
  type: 'channel_event' | 'snapshot_ready' | 'channel_error' | 'fusion_complete';
  payload: {
    channelId?: string;
    snapshot?: import('./types/Snapshot').Snapshot;
    error?: string;
  };
}
