/**
 * 「同频」Same Wavelength — 分布式消息总线
 *
 * Agent 联邦内部的消息路由中枢。遵循鸿蒙分布式软总线范式：
 * - 发布/订阅模式
 * - 事件驱动而非轮询
 * - 支持跨设备意图流转（预留）
 */

import { AgentBase, AgentMessage, SafetyInterceptMessage, AgentId } from './AgentBase';

// ============================================================================
// 消息订阅者
// ============================================================================

interface Subscriber {
  agentId: AgentId;
  /** 入站消息处理器 */
  handler: (msg: AgentMessage) => Promise<void>;
  /** 过滤的消息类型（空 = 接收所有） */
  filters?: string[];
  /** 优先级：数字越小优先级越高 */
  priority: number;
}

// ============================================================================
// 消息路由规则
// ============================================================================

interface RouteRule {
  /** 源Agent */
  from: AgentId;
  /** 目标Agent */
  to: AgentId;
  /** 消息类型 */
  msgType: string;
  /** 优先级 */
  priority: number;
}

// ============================================================================
// 消息总线
// ============================================================================

/**
 * 分布式消息总线
 *
 * 单例模式，Agent 联邦中唯一的中枢路由。
 * 安全Agent的消息具有最高优先级，可中断其他Agent的消息处理。
 */
export class MessageBus {
  private static instance: MessageBus;

  /** 订阅者注册表 */
  private subscribers: Map<string, Subscriber[]> = new Map();

  /** 路由规则表 */
  private routeRules: RouteRule[] = [];

  /** 消息历史（用于调试和上帝模式回放） */
  private messageHistory: AgentMessage[] = [];

  /** 最大消息历史记录数 */
  private readonly MAX_HISTORY = 1000;

  /** 安全Agent是否处于接管模式 */
  private safetyOverride: boolean = false;

  private constructor() {}

  static getInstance(): MessageBus {
    if (!MessageBus.instance) {
      MessageBus.instance = new MessageBus();
    }
    return MessageBus.instance;
  }

  // ==========================================================================
  // 订阅管理
  // ==========================================================================

  /**
   * 注册一个 Agent 到消息总线
   */
  register(
    agent: AgentBase,
    filters?: string[],
    priority: number = 0,
  ): void {
    const subscriber: Subscriber = {
      agentId: agent.agentId,
      handler: agent.receiveMessage.bind(agent),
      filters,
      priority,
    };

    // 按消息类型索引（用于快速路由）
    const keys = filters && filters.length > 0 ? filters : ['*'];
    for (const key of keys) {
      const existing = this.subscribers.get(key) || [];
      existing.push(subscriber);
      // 按优先级排序
      existing.sort((a, b) => a.priority - b.priority);
      this.subscribers.set(key, existing);
    }
  }

  /**
   * 从消息总线注销一个 Agent
   */
  unregister(agentId: AgentId): void {
    for (const [key, subs] of this.subscribers.entries()) {
      this.subscribers.set(key, subs.filter(s => s.agentId !== agentId));
    }
  }

  // ==========================================================================
  // 路由规则
  // ==========================================================================

  /** 添加路由规则 */
  addRouteRule(rule: RouteRule): void {
    this.routeRules.push(rule);
  }

  // ==========================================================================
  // 消息发布
  // ==========================================================================

  /**
   * 发布消息到总线
   *
   * 路由逻辑：
   * 1. 安全Agent消息 → 全员广播（最高优先级）
   * 2. 普通Agent消息 → 按路由规则 + 订阅匹配分发
   * 3. 安全接管模式下 → 仅安全Agent消息可达
   */
  async publish(msg: AgentMessage): Promise<void> {
    // 记录历史
    this.messageHistory.push(msg);
    if (this.messageHistory.length > this.MAX_HISTORY) {
      this.messageHistory.shift();
    }

    // 安全Agent消息 → 广播给所有Agent
    if (msg.sourceAgent === 'SafetyAgent') {
      if ((msg as SafetyInterceptMessage).type === 'safety_intercept') {
        // 安全检查 → 仅发给目标
        const targetSubs = this.getAllSubscribers().filter(
          s => s.agentId !== 'SafetyAgent'
        );
        for (const sub of targetSubs) {
          try { await sub.handler(msg); } catch (e) { /* 吞掉错误，避免影响其他订阅者 */ }
        }
      }
      // 安全接管模式开关
      if (msg.type === 'safety_override_enable') {
        this.safetyOverride = true;
      }
      if (msg.type === 'safety_override_disable') {
        this.safetyOverride = false;
      }
      return;
    }

    // 安全接管模式 → 拒绝所有非安全消息
    if (this.safetyOverride && msg.sourceAgent !== 'SafetyAgent') {
      console.warn(`[MessageBus] 安全接管中，消息 ${msg.type} 被拦截`);
      return;
    }

    // 按消息类型匹配订阅者
    const matchedSubs = [
      ...(this.subscribers.get(msg.type) || []),
      ...(this.subscribers.get('*') || []),
    ];

    // 去重（同一订阅者可能匹配多个key）
    const uniqueSubs = this.deduplicateSubscribers(matchedSubs);

    // 按优先级排序后分发
    for (const sub of uniqueSubs) {
      if (sub.agentId === msg.sourceAgent) continue; // 不发给源Agent
      try {
        await sub.handler(msg);
      } catch (error) {
        console.error(`[MessageBus] 发送到 ${sub.agentId} 失败:`, error);
      }
    }
  }

  // ==========================================================================
  // 查询与调试
  // ==========================================================================

  /** 获取消息历史 */
  getHistory(limit: number = 100): AgentMessage[] {
    return this.messageHistory.slice(-limit);
  }

  /** 清空消息历史 */
  clearHistory(): void {
    this.messageHistory = [];
  }

  /** 获取当前安全接管状态 */
  isSafetyOverride(): boolean {
    return this.safetyOverride;
  }

  /** 获取所有订阅者 */
  getSubscribers(): Subscriber[] {
    return this.getAllSubscribers();
  }

  // ==========================================================================
  // 私有方法
  // ==========================================================================

  private getAllSubscribers(): Subscriber[] {
    const all = new Set<Subscriber>();
    for (const subs of this.subscribers.values()) {
      for (const sub of subs) {
        all.add(sub);
      }
    }
    return Array.from(all);
  }

  private deduplicateSubscribers(subs: Subscriber[]): Subscriber[] {
    const seen = new Set<string>();
    return subs.filter(s => {
      if (seen.has(s.agentId)) return false;
      seen.add(s.agentId);
      return true;
    });
  }
}
