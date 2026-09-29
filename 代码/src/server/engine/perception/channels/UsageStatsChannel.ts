/**
 * 「同频」Same Wavelength — 通道2: 应用使用行为信号通道
 *
 * 数据源: 鸿蒙系统 UsageStats（系统每小时推送一次聚合值）
 * 可获取数据: 各类App使用时长、屏幕唤醒次数、深夜使用标记
 */

import { ISensorChannel, ChannelEvent, ChannelSnapshot, ChannelConfig, ChannelHealthStatus } from '../SensorChannel';

export class UsageStatsChannel implements ISensorChannel {
  readonly channelId = 'usage_stats';
  readonly channelName = '应用使用行为信号';
  readonly description = '通过鸿蒙系统UsageStats获取应用使用时长聚合数据';
  readonly dataSource = 'HarmonyOS UsageStats API';

  onEventPublish: ((event: ChannelEvent) => Promise<void>) | null = null;

  private _isActive = false;
  private config: ChannelConfig = { samplingStrategy: 'scheduled' };
  private lastSnapshot: ChannelSnapshot | null = null;

  get isActive(): boolean { return this._isActive; }

  async initialize(): Promise<void> {
    console.log('[UsageStatsChannel] 已初始化');
  }

  async start(): Promise<void> {
    this._isActive = true;
    console.log('[UsageStatsChannel] 已启动监听');
  }

  async stop(): Promise<void> {
    this._isActive = false;
  }

  async getLatestSnapshot(): Promise<ChannelSnapshot> {
    const now = Date.now();
    const snapshot: ChannelSnapshot = {
      snapshotId: `usage_${now}`,
      channelId: this.channelId,
      windowStart: now - 4 * 3600 * 1000,
      windowEnd: now,
      data: {
        totalScreenTime: this.lastSnapshot?.data?.totalScreenTime ?? 0,
        socialAppHours: this.lastSnapshot?.data?.socialAppHours ?? 0,
        videoAppHours: this.lastSnapshot?.data?.videoAppHours ?? 0,
        studyAppHours: this.lastSnapshot?.data?.studyAppHours ?? 0,
        screenWakeCount: this.lastSnapshot?.data?.screenWakeCount ?? 0,
        lateNightUsage: false,
      },
      freshness: 0.7,
      confidence: 0.9,
    };
    this.lastSnapshot = snapshot;
    return snapshot;
  }

  async healthCheck(): Promise<ChannelHealthStatus> {
    return {
      channelId: this.channelId,
      healthy: true,
      lastDataTime: this.lastSnapshot?.windowEnd ?? 0,
      errorCount: 0,
      needsDegradation: false,
    };
  }

  configure(config: ChannelConfig): void {
    this.config = { ...this.config, ...config };
  }
}
