/**
 * 「同频」Same Wavelength — 通道1: 穿戴设备生理信号通道
 *
 * 数据源: 鸿蒙 Health Kit（系统事件推送，非轮询）
 * 可获取数据: 每日睡眠摘要、活动摘要、静息心率趋势、压力估计
 * 获取时机: 系统事件广播时（起床/运动结束/日终汇总）
 */

import { ISensorChannel, ChannelEvent, ChannelSnapshot, ChannelConfig, ChannelHealthStatus } from '../SensorChannel';

export class HealthKitChannel implements ISensorChannel {
  readonly channelId = 'health_kit';
  readonly channelName = '穿戴设备生理信号';
  readonly description = '通过鸿蒙Health Kit获取睡眠、活动、心率、压力等摘要数据';
  readonly dataSource = 'HarmonyOS Health Kit API';

  onEventPublish: ((event: ChannelEvent) => Promise<void>) | null = null;

  private _isActive = false;
  private config: ChannelConfig = { samplingStrategy: 'event_driven' };
  private lastSnapshot: ChannelSnapshot | null = null;
  private errorCount = 0;

  get isActive(): boolean { return this._isActive; }

  async initialize(): Promise<void> {
    // 检查 Health Kit 权限
    // 订阅系统事件: 睡眠状态变化、活动摘要、心率趋势
    console.log('[HealthKitChannel] 已初始化');
  }

  async start(): Promise<void> {
    this._isActive = true;
    console.log('[HealthKitChannel] 已启动监听');
  }

  async stop(): Promise<void> {
    this._isActive = false;
    console.log('[HealthKitChannel] 已停止监听');
  }

  async getLatestSnapshot(): Promise<ChannelSnapshot> {
    const now = Date.now();
    const snapshot: ChannelSnapshot = {
      snapshotId: `health_${now}`,
      channelId: this.channelId,
      windowStart: now - 4 * 3600 * 1000,
      windowEnd: now,
      data: {
        sleep: this.lastSnapshot?.data?.sleep ?? null,
        activity: this.lastSnapshot?.data?.activity ?? null,
        heartRate: this.lastSnapshot?.data?.heartRate ?? null,
        stress: this.lastSnapshot?.data?.stress ?? null,
      },
      freshness: 0.8,
      confidence: 0.85,
    };
    this.lastSnapshot = snapshot;
    return snapshot;
  }

  async healthCheck(): Promise<ChannelHealthStatus> {
    return {
      channelId: this.channelId,
      healthy: this.errorCount < 3,
      lastDataTime: this.lastSnapshot?.windowEnd ?? 0,
      errorCount: this.errorCount,
      needsDegradation: this.errorCount >= 3,
    };
  }

  configure(config: ChannelConfig): void {
    this.config = { ...this.config, ...config };
  }
}
