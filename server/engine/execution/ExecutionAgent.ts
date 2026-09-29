/**
 * 「同频」Same Wavelength — 多端执行Agent (ExecutionAgent)
 *
 * 多端执行Agent是Agent在用户面前"现身"的方式。
 * 核心任务：把决策Agent的输出转化为最适合当前设备、当前场景的交互形式。
 *
 * 核心能力：
 *   1. 跨端意图流转（Intent Continuation）
 *   2. 负一屏元服务卡片渲染
 *   3. 设备路由决策
 *   4. 多端同步推送
 *
 * 运行位置：手表/手机/平板/负一屏
 * 触发方式：决策Agent指令驱动
 */

import { AgentBase, AgentId, AgentMessage } from '../core/AgentBase';
import { ExecutionCommand, ExecutionCommandType, DeviceRole, DeviceRoutingDecision, IntentContinuationEvent, CardRenderData } from './types/ExecutionTypes';
import { AtomicServiceCardData, CardRenderRequest, CardRenderStatus } from './types/CardTypes';
import { MessageBus } from '../core/MessageBus';

// ============================================================================
// 多端执行Agent
// ============================================================================

export class ExecutionAgent extends AgentBase {
  readonly agentId: AgentId = 'ExecutionAgent';

  /** 卡片渲染状态追踪 */
  private cardStatuses: Map<string, CardRenderStatus> = new Map();

  /** 意图流转事件历史 */
  private continuationHistory: IntentContinuationEvent[] = [];

  /** 设备在线状态 */
  private deviceStates: Map<DeviceRole, boolean> = new Map();

  /** 消息总线 */
  private messageBus: MessageBus;

  constructor() {
    super();
    this.messageBus = MessageBus.getInstance();

    // 初始化设备状态
    this.deviceStates.set(DeviceRole.WATCH, true);
    this.deviceStates.set(DeviceRole.PHONE, true);
    this.deviceStates.set(DeviceRole.TABLET, false);  // 默认平板离线
    this.deviceStates.set(DeviceRole.NEGATIVE_ONE_SCREEN, true);
  }

  // ==========================================================================
  // 生命周期
  // ==========================================================================

  protected async onInitialize(): Promise<void> {
    this.registerHandler('execution_command', this.handleExecutionCommand.bind(this));
    console.log('[ExecutionAgent] 已初始化，多端执行就绪');
  }

  protected async onStart(): Promise<void> {
    console.log('[ExecutionAgent] 已启动');
  }

  protected async onStop(): Promise<void> {
    console.log('[ExecutionAgent] 已停止');
  }

  // ==========================================================================
  // 执行指令处理
  // ==========================================================================

  private async handleExecutionCommand(msg: AgentMessage): Promise<void> {
    const command = msg.payload as unknown as ExecutionCommand;

    switch (command.type) {
      case ExecutionCommandType.PUSH_NOTIFICATION:
        await this.executePush(command);
        break;
      case ExecutionCommandType.CARD_UPDATE:
        await this.renderCard(command);
        break;
      case ExecutionCommandType.WATCH_VIBRATE:
        await this.vibrateWatch(command);
        break;
      case ExecutionCommandType.INTENT_CONTINUE:
        await this.executeIntentContinuation(command);
        break;
      default:
        console.warn(`[ExecutionAgent] 未知执行指令类型: ${command.type}`);
    }
  }

  // ==========================================================================
  // 核心能力
  // ==========================================================================

  /** 设备路由决策 */
  routeDevice(availableDevices: DeviceRole[], command: ExecutionCommand): DeviceRoutingDecision {
    // 策略：用户正在使用的设备优先
    let primaryDevice: DeviceRole;

    // 危机→手机（确保可见）
    if (command.priority === 'critical') {
      primaryDevice = DeviceRole.PHONE;
    }
    // 低优先级→负一屏（不打扰）
    else if (command.priority === 'low') {
      primaryDevice = DeviceRole.NEGATIVE_ONE_SCREEN;
    }
    // 默认→手机
    else {
      primaryDevice = DeviceRole.PHONE;
    }

    return {
      primaryDevice,
      secondaryDevices: primaryDevice === DeviceRole.PHONE
        ? [DeviceRole.WATCH]
        : [],
      reason: `优先级: ${command.priority}, 主设备: ${primaryDevice}`,
      interactionForms: new Map(),
    };
  }

  /** 执行推送 */
  private async executePush(command: ExecutionCommand): Promise<void> {
    const route = this.routeDevice([], command);
    console.log(`[ExecutionAgent] 推送 → ${route.primaryDevice}: ${command.payload.title}`);
  }

  /** 渲染元服务卡片 */
  async renderCard(command: ExecutionCommand): Promise<CardRenderStatus> {
    const cardData = command.payload.richContent;
    const status: CardRenderStatus = {
      requestId: command.commandId,
      rendered: true,
      device: 'negative_one_screen',
      renderedAt: Date.now(),
      expiresAt: command.expiresAt,
      viewed: false,
      interacted: false,
    };
    this.cardStatuses.set(command.commandId, status);
    return status;
  }

  /** 手表震动 */
  private async vibrateWatch(command: ExecutionCommand): Promise<void> {
    console.log(`[ExecutionAgent] 手表震动: ${command.payload.title}`);
  }

  /** 跨端意图流转 */
  private async executeIntentContinuation(command: ExecutionCommand): Promise<IntentContinuationEvent> {
    const event: IntentContinuationEvent = {
      eventId: `ic_${Date.now()}`,
      sourceDevice: DeviceRole.WATCH,
      targetDevice: DeviceRole.PHONE,
      intent: {
        type: command.payload.interventionType,
        source: 'voice_wake',
        userInput: '',
        slots: {},
      },
      timestamp: Date.now(),
      status: 'completed' as any,
      transferData: {
        sizeBytes: 0,
        viaCloud: false, // 走鸿蒙分布式软总线
        encrypted: true,
        latencyMs: 50,
      },
    };
    this.continuationHistory.push(event);
    return event;
  }

  // ==========================================================================
  // 查询方法
  // ==========================================================================

  getCardStatus(requestId: string): CardRenderStatus | undefined {
    return this.cardStatuses.get(requestId);
  }

  getContinuationHistory(): IntentContinuationEvent[] {
    return [...this.continuationHistory];
  }

  isDeviceOnline(role: DeviceRole): boolean {
    return this.deviceStates.get(role) ?? false;
  }

  setDeviceOnline(role: DeviceRole, online: boolean): void {
    this.deviceStates.set(role, online);
  }
}
