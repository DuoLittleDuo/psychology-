/**
 * 「同频」Same Wavelength — 通道3: 对话/语音信号通道
 *
 * 数据源: 小艺开放平台 Intent API（端侧NLU）
 * 处理: 端侧意图识别，不跑完整LLM
 * 获取: 用户主动唤醒时返回意图+槽位+情感倾向
 */

import { ISensorChannel, ChannelEvent, ChannelSnapshot, ChannelConfig, ChannelHealthStatus } from '../SensorChannel';
import { SentimentPolarity, UserIntentType } from '../../core/IntentTypes';

export class DialogueChannel implements ISensorChannel {
  readonly channelId = 'dialogue';
  readonly channelName = '对话/语音信号';
  readonly description = '通过小艺开放平台Intent API获取用户意图和情感倾向';
  readonly dataSource = '小艺开放平台 Intent API (端侧)';

  onEventPublish: ((event: ChannelEvent) => Promise<void>) | null = null;

  private _isActive = false;
  private config: ChannelConfig = { samplingStrategy: 'event_driven' };
  private lastSnapshot: ChannelSnapshot | null = null;

  get isActive(): boolean { return this._isActive; }

  async initialize(): Promise<void> {
    console.log('[DialogueChannel] 已初始化');
  }

  async start(): Promise<void> {
    this._isActive = true;
    console.log('[DialogueChannel] 已启动聆听');
  }

  async stop(): Promise<void> {
    this._isActive = false;
  }

  async getLatestSnapshot(): Promise<ChannelSnapshot> {
    const now = Date.now();
    const snapshot: ChannelSnapshot = {
      snapshotId: `dialogue_${now}`,
      channelId: this.channelId,
      windowStart: now - 4 * 3600 * 1000,
      windowEnd: now,
      data: {
        lastDialogueTime: this.lastSnapshot?.data?.lastDialogueTime ?? null,
        lastIntent: this.lastSnapshot?.data?.lastIntent ?? UserIntentType.UNKNOWN,
        lastSentiment: this.lastSnapshot?.data?.lastSentiment ?? SentimentPolarity.NEUTRAL,
        inActiveConversation: false,
        activeTurnCount: 0,
        lastWakeTime: null,
        hasUnfinishedDialogue: false,
      },
      freshness: 0.95,
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
