/**
 * 「同频」Same Wavelength — Agent 抽象基类
 *
 * 所有子 Agent 继承此基类，统一生命周期管理、消息订阅、故障兜底。
 * 遵循鸿蒙 Agent 范式：事件驱动、异步协同、独立运行。
 */

import {
  WakeupSourceType,
  SystemEventType,
  UserIntentType,
} from './IntentTypes';

// ============================================================================
// 通用消息/事件类型
// ============================================================================

/** Agent 联邦内部消息基类 */
export interface AgentMessage {
  /** 消息唯一ID */
  id: string;
  /** 消息产生时间戳 */
  timestamp: number;
  /** 来源Agent标识 */
  sourceAgent: AgentId;
  /** 消息类型（子Agent自定义） */
  type: string;
  /** 消息载荷 */
  payload: unknown;
}

/** 感知事件消息（由感知Agent发布到总线） */
export interface PerceptionEvent extends AgentMessage {
  sourceAgent: 'PerceptionAgent';
  type: 'perception_event';
  payload: {
    /** 唤醒源类型 */
    wakeupSource: WakeupSourceType;
    /** 系统事件类型（如果是系统事件唤醒） */
    systemEventType?: SystemEventType;
    /** 用户意图类型（如果是意图唤醒） */
    userIntentType?: UserIntentType;
    /** 当前状态快照 */
    snapshot: unknown;   // 具体类型见 Snapshot.ts
  };
}

/** 安全拦截消息（由安全Agent发布） */
export interface SafetyInterceptMessage extends AgentMessage {
  sourceAgent: 'SafetyAgent';
  type: 'safety_intercept';
  payload: {
    /** 被拦截的动作类型 */
    interceptedAction: string;
    /** 拦截原因 */
    reason: string;
    /** 建议替代动作 */
    fallbackAction?: string;
    /** 冷却期（小时），-1 表示永久 */
    cooldownHours: number;
  };
}

// ============================================================================
// Agent 标识
// ============================================================================

/** Agent 联邦成员标识 */
export type AgentId =
  | 'PerceptionAgent'
  | 'MemoryAgent'
  | 'DecisionAgent'
  | 'SafetyAgent'
  | 'ExecutionAgent'
  | 'ReflectionAgent';

// ============================================================================
// Agent 生命周期状态
// ============================================================================

/** Agent 运行状态 */
export enum AgentStatus {
  /** 未初始化 */
  UNINITIALIZED = 'uninitialized',
  /** 初始化中 */
  INITIALIZING = 'initializing',
  /** 运行中 */
  RUNNING = 'running',
  /** 空闲（等待事件） */
  IDLE = 'idle',
  /** 暂停（被安全Agent挂起） */
  SUSPENDED = 'suspended',
  /** 已停止 */
  STOPPED = 'stopped',
  /** 故障降级 */
  DEGRADED = 'degraded',
}

// ============================================================================
// Agent 基类
// ============================================================================

/**
 * Agent 抽象基类
 *
 * 提供统一的生命周期钩子、消息订阅/发布、故障兜底机制。
 * 每个子 Agent 必须实现 onEvent() 方法处理属于自己的消息。
 */
export abstract class AgentBase {
  /** Agent 唯一标识 */
  abstract readonly agentId: AgentId;

  /** 当前运行状态 */
  protected status: AgentStatus = AgentStatus.UNINITIALIZED;

  /** 消息处理器映射 */
  protected messageHandlers: Map<string, (msg: AgentMessage) => Promise<void>> = new Map();

  /** 已订阅的消息类型列表 */
  protected subscriptions: string[] = [];

  /** 启动时间戳 */
  protected startedAt: number = 0;

  /** 最后心跳时间 */
  protected lastHeartbeat: number = 0;

  // ==========================================================================
  // 生命周期钩子
  // ==========================================================================

  /** 初始化：加载配置、建立连接、注册消息处理器 */
  async initialize(): Promise<void> {
    this.status = AgentStatus.INITIALIZING;
    try {
      await this.onInitialize();
      this.status = AgentStatus.IDLE;
      this.startedAt = Date.now();
      this.lastHeartbeat = Date.now();
    } catch (error) {
      this.status = AgentStatus.DEGRADED;
      throw new Error(`[${this.agentId}] 初始化失败: ${error}`);
    }
  }

  /** 启动：开始监听消息 */
  async start(): Promise<void> {
    if (this.status !== AgentStatus.IDLE && this.status !== AgentStatus.STOPPED) {
      throw new Error(`[${this.agentId}] 无法从 ${this.status} 状态启动`);
    }
    this.status = AgentStatus.RUNNING;
    await this.onStart();
    this.sendHeartbeat();
  }

  /** 暂停（被安全Agent调用） */
  suspend(reason: string): void {
    if (this.status !== AgentStatus.RUNNING) return;
    this.status = AgentStatus.SUSPENDED;
    this.onSuspend(reason);
  }

  /** 恢复（安全Agent放行） */
  resume(): void {
    if (this.status !== AgentStatus.SUSPENDED) return;
    this.status = AgentStatus.RUNNING;
    this.onResume();
  }

  /** 停止 */
  async stop(): Promise<void> {
    this.status = AgentStatus.STOPPED;
    await this.onStop();
  }

  /** 心跳发送 */
  sendHeartbeat(): void {
    this.lastHeartbeat = Date.now();
  }

  /** 检查是否存活 */
  isAlive(): boolean {
    return this.status === AgentStatus.RUNNING ||
           this.status === AgentStatus.IDLE;
  }

  /** 获取当前状态 */
  getStatus(): AgentStatus {
    return this.status;
  }

  // ==========================================================================
  // 消息处理
  // ==========================================================================

  /** 接收消息入口（由消息总线调用） */
  async receiveMessage(msg: AgentMessage): Promise<void> {
    // 安全Agent可以拦截所有消息（危机模式）
    if (this.agentId !== 'SafetyAgent' && msg.sourceAgent === 'SafetyAgent') {
      await this.handleSafetyMessage(msg as SafetyInterceptMessage);
      return;
    }

    // 如果已挂起，不处理非安全消息
    if (this.status === AgentStatus.SUSPENDED && msg.sourceAgent !== 'SafetyAgent') {
      return;
    }

    const handler = this.messageHandlers.get(msg.type);
    if (handler) {
      try {
        await handler(msg);
      } catch (error) {
        await this.onError(msg, error as Error);
      }
    }
  }

  /** 注册消息处理器 */
  protected registerHandler(msgType: string, handler: (msg: AgentMessage) => Promise<void>): void {
    this.messageHandlers.set(msgType, handler);
    this.subscriptions.push(msgType);
  }

  // ==========================================================================
  // 故障兜底
  // ==========================================================================

  /** 心跳检查（由外部调度器定时调用） */
  checkHeartbeat(now: number, timeoutMs: number = 30000): boolean {
    if (now - this.lastHeartbeat > timeoutMs) {
      this.status = AgentStatus.DEGRADED;
      return false;
    }
    return true;
  }

  /** 降级恢复 */
  async recover(): Promise<void> {
    if (this.status === AgentStatus.DEGRADED) {
      await this.stop();
      await this.initialize();
      await this.start();
    }
  }

  // ==========================================================================
  // 子类必须实现的抽象方法
  // ==========================================================================

  /** 子类初始化逻辑 */
  protected abstract onInitialize(): Promise<void>;

  /** 子类启动逻辑 */
  protected abstract onStart(): Promise<void>;

  /** 子类停止逻辑 */
  protected abstract onStop(): Promise<void>;

  // ==========================================================================
  // 子类可选覆写的钩子
  // ==========================================================================

  /** 处理安全Agent发来的拦截消息 */
  protected async handleSafetyMessage(msg: SafetyInterceptMessage): Promise<void> {
    // 默认：暂停当前操作
    const payload = msg.payload;
    console.warn(`[${this.agentId}] 收到安全拦截: ${payload.reason}`);
  }

  /** 子类挂起时钩子 */
  protected onSuspend(reason: string): void {
    console.warn(`[${this.agentId}] 已挂起，原因: ${reason}`);
  }

  /** 子类恢复时钩子 */
  protected onResume(): void {
    console.log(`[${this.agentId}] 已恢复运行`);
  }

  /** 消息处理错误钩子 */
  protected async onError(msg: AgentMessage, error: Error): Promise<void> {
    console.error(`[${this.agentId}] 处理消息 ${msg.type} 时出错:`, error);
  }

  // ==========================================================================
  // 工具方法
  // ==========================================================================

  /** 生成唯一消息ID */
  protected generateId(): string {
    return `${this.agentId}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  /** 获取运行时长（毫秒） */
  getUptime(): number {
    return this.startedAt > 0 ? Date.now() - this.startedAt : 0;
  }
}
