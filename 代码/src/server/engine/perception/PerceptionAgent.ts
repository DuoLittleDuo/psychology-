/**
 * 「同频」Same Wavelength — 感知Agent (PerceptionAgent)
 *
 * 感知Agent是系统唯一的输入门户。所有来自外部世界的信号——
 * 穿戴设备生理数据、应用使用行为、用户对话、环境上下文——
 * 都经过感知Agent统一处理后，转化为结构化的"感知事件"，发布到消息总线。
 *
 * 运行位置：手表(轻量) + 手机(主)
 * 唤醒方式：系统事件 + 意图唤醒
 */

import { AgentBase, AgentMessage, PerceptionEvent, AgentId } from '../core/AgentBase';
import { ISensorChannel, ChannelEvent, ChannelSnapshot } from './SensorChannel';
import { SnapshotBuilder, ISnapshotBuilder } from './SnapshotBuilder';
import { Snapshot, SnapshotTriggerType } from './types/Snapshot';
import { MessageBus } from '../core/MessageBus';
import { WakeupSourceType, SystemEventType } from '../core/IntentTypes';

// ============================================================================
// 感知Agent
// ============================================================================

export class PerceptionAgent extends AgentBase {
  readonly agentId: AgentId = 'PerceptionAgent';

  /** 传感器通道注册表 */
  private channels: Map<string, ISensorChannel> = new Map();

  /** 快照构建器 */
  private snapshotBuilder: ISnapshotBuilder;

  /** 当前最新快照（缓存） */
  private latestSnapshot: Snapshot | null = null;

  /** 消息总线引用 */
  private messageBus: MessageBus;

  constructor(snapshotBuilder?: ISnapshotBuilder) {
    super();
    this.snapshotBuilder = snapshotBuilder ?? new SnapshotBuilder();
    this.messageBus = MessageBus.getInstance();
  }

  // ==========================================================================
  // 通道管理
  // ==========================================================================

  /**
   * 注册一个传感器通道
   */
  registerChannel(channel: ISensorChannel): void {
    channel.onEventPublish = async (event: ChannelEvent) => {
      await this.onChannelEvent(event);
    };
    this.channels.set(channel.channelId, channel);
  }

  /**
   * 注销一个传感器通道
   */
  unregisterChannel(channelId: string): void {
    const channel = this.channels.get(channelId);
    if (channel) {
      channel.onEventPublish = null;
      this.channels.delete(channelId);
    }
  }

  /**
   * 获取已注册的通道
   */
  getChannel(channelId: string): ISensorChannel | undefined {
    return this.channels.get(channelId);
  }

  // ==========================================================================
  // 生命周期
  // ==========================================================================

  protected async onInitialize(): Promise<void> {
    // 初始化所有通道
    for (const channel of this.channels.values()) {
      await channel.initialize();
    }
    console.log('[PerceptionAgent] 已初始化，注册通道数:', this.channels.size);
  }

  protected async onStart(): Promise<void> {
    // 启动所有通道
    for (const channel of this.channels.values()) {
      await channel.start();
    }
    console.log('[PerceptionAgent] 已启动');
  }

  protected async onStop(): Promise<void> {
    // 停止所有通道
    for (const channel of this.channels.values()) {
      await channel.stop();
    }
    this.snapshotBuilder.clearCache();
    console.log('[PerceptionAgent] 已停止');
  }

  // ==========================================================================
  // 通道事件处理
  // ==========================================================================

  /**
   * 通道事件到达时的处理
   *
   * 这是感知Agent的核心逻辑：
   * 1. 接收通道事件
   * 2. 请求通道获取最新数据快照
   * 3. 提交到快照构建器
   * 4. 触发快照融合
   * 5. 发布感知事件到消息总线
   */
  private async onChannelEvent(event: ChannelEvent): Promise<void> {
    console.log(`[PerceptionAgent] 收到通道事件: ${event.channelId}.${event.type}`);

    // 从通道获取最新数据快照
    const channel = this.channels.get(event.channelId);
    if (!channel) {
      console.warn(`[PerceptionAgent] 未知通道: ${event.channelId}`);
      return;
    }

    const channelSnapshot = await channel.getLatestSnapshot();
    this.snapshotBuilder.submitChannelSnapshot(channelSnapshot);

    // 事件驱动融合：生成当前状态快照
    const snapshot = await this.snapshotBuilder.buildSnapshot(
      SnapshotTriggerType.EVENT_DRIVEN,
      `${event.channelId}.${event.type}`,
    );

    this.latestSnapshot = snapshot;

    // 发布感知事件到消息总线 → 触发决策Agent
    const perceptionEvent = this.createPerceptionEvent(event, snapshot);
    await this.messageBus.publish(perceptionEvent);
  }

  /**
   * 定时融合（每日3次自检）
   */
  async scheduledFusion(): Promise<Snapshot> {
    const snapshot = await this.snapshotBuilder.buildSnapshot(
      SnapshotTriggerType.SCHEDULED_FUSION,
      'scheduled_self_check',
    );
    this.latestSnapshot = snapshot;

    // 发布自检事件
    const event = this.createPerceptionEvent(
      { id: 'scheduled', channelId: 'system', type: 'scheduled_check', timestamp: Date.now(), data: {}, priority: 'low' },
      snapshot,
    );
    await this.messageBus.publish(event);

    return snapshot;
  }

  /**
   * 获取当前最新快照
   */
  getLatestSnapshot(): Snapshot | null {
    return this.latestSnapshot;
  }

  /**
   * 获取快照历史
   */
  getSnapshotHistory(): Snapshot[] {
    return (this.snapshotBuilder as SnapshotBuilder).getSnapshotHistory();
  }

  // ==========================================================================
  // 私有方法
  // ==========================================================================

  private createPerceptionEvent(channelEvent: ChannelEvent, snapshot: Snapshot): PerceptionEvent {
    return {
      id: this.generateId(),
      timestamp: Date.now(),
      sourceAgent: 'PerceptionAgent',
      type: 'perception_event',
      payload: {
        wakeupSource: channelEvent.channelId === 'dialogue'
          ? WakeupSourceType.USER_INTENT
          : channelEvent.channelId === 'system'
            ? WakeupSourceType.SCHEDULED_SELF_CHECK
            : WakeupSourceType.SYSTEM_EVENT,
        systemEventType: channelEvent.type as SystemEventType,
        snapshot,
      },
    };
  }
}
