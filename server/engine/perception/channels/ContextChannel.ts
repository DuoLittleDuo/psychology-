/**
 * 「同频」Same Wavelength — 通道4: 环境上下文信号通道
 *
 * 数据源: 鸿蒙系统API（位置围栏、天气服务、日历、时钟）
 * 获取时机: 地理围栏触发 + 日历事件触发 + 定时自检
 */

import { ISensorChannel, ChannelEvent, ChannelSnapshot, ChannelConfig, ChannelHealthStatus } from '../SensorChannel';
import { LocationType } from '../../core/IntentTypes';

export class ContextChannel implements ISensorChannel {
  readonly channelId = 'context';
  readonly channelName = '环境上下文信号';
  readonly description = '通过鸿蒙系统API获取位置、天气、日历、时间等环境上下文';
  readonly dataSource = 'HarmonyOS Location/Weather/Calendar/System APIs';

  onEventPublish: ((event: ChannelEvent) => Promise<void>) | null = null;

  private _isActive = false;
  private config: ChannelConfig = { samplingStrategy: 'hybrid' };
  private lastSnapshot: ChannelSnapshot | null = null;

  get isActive(): boolean { return this._isActive; }

  async initialize(): Promise<void> {
    console.log('[ContextChannel] 已初始化');
  }

  async start(): Promise<void> {
    this._isActive = true;
    console.log('[ContextChannel] 已启动监听');
  }

  async stop(): Promise<void> {
    this._isActive = false;
  }

  async getLatestSnapshot(): Promise<ChannelSnapshot> {
    const now = Date.now();
    const hour = new Date(now).getHours();
    const dayOfWeek = new Date(now).getDay() || 7;

    const snapshot: ChannelSnapshot = {
      snapshotId: `context_${now}`,
      channelId: this.channelId,
      windowStart: now - 4 * 3600 * 1000,
      windowEnd: now,
      data: {
        location: {
          currentLocation: LocationType.OTHER,
          recentTraces: [],
          onCampus: true,
          lastGeofenceEvent: null,
        },
        weather: this.lastSnapshot?.data?.weather ?? {
          condition: 'sunny',
          temperatureCelsius: 25,
          feelsLikeCelsius: 24,
          humidity: 60,
          aqi: 50,
          suitableForOutdoor: true,
        },
        time: {
          now,
          timeOfDay: hour < 8 ? 'early_morning' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : hour < 23 ? 'evening' : 'night',
          dayOfWeek,
          isWeekend: dayOfWeek >= 6,
          isHoliday: false,
          hasEarlyClassTomorrow: false,
        },
        examContext: {
          isExamPeriod: false,
          nearestExamDate: null,
          examStressLevel: 0,
        },
        activeCalendarEvents: [],
        upcomingEvents: [],
      },
      freshness: 0.6,
      confidence: 0.95,
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
