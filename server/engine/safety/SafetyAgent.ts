/**
 * 「同频」Same Wavelength — 安全隐私Agent (SafetyAgent)
 *
 * 独立常驻安全巡检Agent。有自己的运行周期，不被其他Agent阻塞。
 *
 * 三条并行任务线：
 *   任务线1: 实时对话安全监控
 *   任务线2: 过度干预防护（推送预算+冷却拦截）
 *   任务线3: 隐私生命周期管理
 *
 * 运行位置：手机端侧（常驻）
 * 触发方式：独立运行
 */

import { AgentBase, AgentId, AgentMessage, SafetyInterceptMessage } from '../core/AgentBase';
import { CrisisLevel } from '../core/Config';
import { DialogueSafetyResult, SafetyPatrolStatus, SafetyEvent, SafetyEventType, SafetyActionType } from './types/SafetyTypes';
import { CrisisProtocolState, CrisisProtocolStage } from './types/CrisisProtocol';
import { PushBudget, CooldownState, ConstraintCheckRequest, ConstraintCheckResult } from './types/BudgetTypes';
import { MessageBus } from '../core/MessageBus';
import { MAX_DAILY_PUSHES, REJECTION_COOLDOWN_THRESHOLD, REJECTION_COOLDOWN_HOURS } from '../core/Config';

// ============================================================================
// 安全Agent
// ============================================================================

export class SafetyAgent extends AgentBase {
  readonly agentId: AgentId = 'SafetyAgent';

  /** 推送预算（每日重置） */
  private pushBudget: PushBudget;

  /** 活跃冷却状态 */
  private activeCooldowns: Map<string, CooldownState> = new Map();

  /** 安全巡检状态 */
  private patrolStatus: SafetyPatrolStatus;

  /** 安全事件日志 */
  private safetyEvents: SafetyEvent[] = [];

  /** 消息总线 */
  private messageBus: MessageBus;

  constructor() {
    super();
    this.messageBus = MessageBus.getInstance();

    const today = new Date().toISOString().split('T')[0];
    this.pushBudget = {
      date: today,
      maxPushes: MAX_DAILY_PUSHES,
      usedPushes: 0,
      remainingPushes: MAX_DAILY_PUSHES,
      pushHistory: [],
      exhausted: false,
    };

    this.patrolStatus = {
      safetyOverride: false,
      currentRiskLevel: null,
      consecutiveRiskEvents: 0,
      lastRiskEventTime: null,
      activeCrisisProtocol: null,
      lastPatrolTime: Date.now(),
      patrolIntervalSeconds: 60,
    };
  }

  // ==========================================================================
  // 生命周期
  // ==========================================================================

  protected async onInitialize(): Promise<void> {
    // 订阅所有消息以进行安全检查
    this.registerHandler('*', this.onAnyMessage.bind(this));
    console.log('[SafetyAgent] 已初始化，独立安全巡检就绪');
  }

  protected async onStart(): Promise<void> {
    // 启动定时巡检
    this.startPatrol();
    console.log('[SafetyAgent] 已启动，巡逻间隔:', this.patrolStatus.patrolIntervalSeconds, '秒');
  }

  protected async onStop(): Promise<void> {
    console.log('[SafetyAgent] 已停止');
  }

  // ==========================================================================
  // 任务线1: 实时对话安全监控（阶段二实现完整逻辑）
  // ==========================================================================

  /** 扫描用户输入文本 */
  scanDialogue(text: string): DialogueSafetyResult {
    // 阶段二实现完整关键词匹配逻辑
    console.log('[SafetyAgent] 对话安全扫描...');
    return {
      scannedAt: Date.now(),
      scannedText: text,
      detectedLevel: null,
      matchedKeywords: [],
      shouldInterrupt: false,
      shouldInitiateSafetyDialogue: false,
      contextRisk: {
        riskScore: 0,
        dimensions: { keywordSeverity: 0, historyRisk: 0, emotionalStateRisk: 0, behavioralRisk: 0 },
        isEscalating: false,
        recommendedAction: SafetyActionType.NONE,
      },
    };
  }

  // ==========================================================================
  // 任务线2: 推送预算与冷却拦截
  // ==========================================================================

  /** 检查推送是否被允许 */
  checkPushAllowed(request: ConstraintCheckRequest): ConstraintCheckResult {
    const checks: ConstraintCheckResult['checks'] = [];

    // 检查预算
    if (this.pushBudget.remainingPushes <= 0) {
      checks.push({
        name: '推送预算检查',
        passed: false,
        reason: `今日推送已达上限(${this.pushBudget.maxPushes}次)`,
        source: 'budget',
      });
    } else {
      checks.push({ name: '推送预算检查', passed: true, source: 'budget' });
    }

    // 检查冷却
    const cooldown = this.activeCooldowns.get(request.interventionType);
    if (cooldown && cooldown.isActive && cooldown.endsAt > Date.now()) {
      checks.push({
        name: '冷却状态检查',
        passed: false,
        reason: `干预类型'${request.interventionType}'处于冷却期，${Math.ceil((cooldown.endsAt - Date.now()) / 3600000)}小时后恢复`,
        source: 'cooldown',
      });
    } else {
      checks.push({ name: '冷却状态检查', passed: true, source: 'cooldown' });
    }

    // 检查深夜时段
    const hour = new Date(request.timestamp).getHours();
    if (hour >= 23 || hour < 8) {
      // 仅危机响应可通过
      const isCrisis = request.interventionType === 'crisis_response';
      checks.push({
        name: '深夜时段检查',
        passed: isCrisis,
        reason: isCrisis ? undefined : '深夜时段仅允许危机响应',
        source: 'timing',
      });
    }

    const passed = checks.every(c => c.passed);
    return {
      passed,
      checkedAt: Date.now(),
      checks,
      blockReason: !passed ? checks.find(c => !c.passed)?.reason : undefined,
      fallbackAction: !passed ? 'silent_record' : undefined,
    };
  }

  /** 记录一次推送 */
  recordPush(type: string): void {
    this.pushBudget.usedPushes++;
    this.pushBudget.remainingPushes = Math.max(0, this.pushBudget.maxPushes - this.pushBudget.usedPushes);
    if (this.pushBudget.remainingPushes <= 0) {
      this.pushBudget.exhausted = true;
      this.pushBudget.exhaustedAt = Date.now();
    }
  }

  /** 记录用户拒绝 → 检查是否触发冷却 */
  recordRejection(type: string): void {
    let cooldown = this.activeCooldowns.get(type);
    if (!cooldown) {
      cooldown = {
        interventionType: type,
        isActive: false,
        reason: 'consecutive_rejection' as any,
        startedAt: 0,
        endsAt: 0,
        consecutiveRejections: 0,
        suggestAlternative: false,
      };
      this.activeCooldowns.set(type, cooldown);
    }

    cooldown.consecutiveRejections++;

    if (cooldown.consecutiveRejections >= REJECTION_COOLDOWN_THRESHOLD) {
      cooldown.isActive = true;
      cooldown.startedAt = Date.now();
      cooldown.endsAt = Date.now() + REJECTION_COOLDOWN_HOURS * 3600 * 1000;
      cooldown.reason = 'consecutive_rejection' as any;
      cooldown.suggestAlternative = true;

      // 发布安全拦截消息
      this.emitSafetyIntercept(type, 'consecutive_rejection', REJECTION_COOLDOWN_HOURS);
    }
  }

  // ==========================================================================
  // 安全接管模式
  // ==========================================================================

  /** 启用安全接管 */
  enableSafetyOverride(reason: string): void {
    this.patrolStatus.safetyOverride = true;
    this.patrolStatus.overrideReason = reason;
    this.patrolStatus.overrideStartTime = Date.now();
    console.warn('[SafetyAgent] ⚠️ 安全接管模式启用:', reason);
  }

  /** 解除安全接管 */
  disableSafetyOverride(): void {
    this.patrolStatus.safetyOverride = false;
    this.patrolStatus.overrideReason = undefined;
    console.log('[SafetyAgent] ✅ 安全接管模式解除');
  }

  // ==========================================================================
  // 每日重置
  // ==========================================================================

  /** 每日重置推送预算 */
  resetDailyBudget(): void {
    const today = new Date().toISOString().split('T')[0];
    this.pushBudget = {
      date: today,
      maxPushes: MAX_DAILY_PUSHES,
      usedPushes: 0,
      remainingPushes: MAX_DAILY_PUSHES,
      pushHistory: [],
      exhausted: false,
    };
  }

  // ==========================================================================
  // 查询方法
  // ==========================================================================

  getPatrolStatus(): SafetyPatrolStatus {
    return { ...this.patrolStatus };
  }

  getPushBudget(): PushBudget {
    return { ...this.pushBudget };
  }

  getActiveCooldowns(): CooldownState[] {
    return Array.from(this.activeCooldowns.values()).filter(c => c.isActive);
  }

  // ==========================================================================
  // 私有方法
  // ==========================================================================

  private async onAnyMessage(msg: AgentMessage): Promise<void> {
    // 安全检查 —— 在每个消息到达时执行
    this.patrolStatus.lastPatrolTime = Date.now();
  }

  private startPatrol(): void {
    // 定时巡检循环（阶段二实现）
  }

  private emitSafetyIntercept(interceptedType: string, reason: string, cooldownHours: number): void {
    const msg: SafetyInterceptMessage = {
      id: this.generateId(),
      timestamp: Date.now(),
      sourceAgent: 'SafetyAgent',
      type: 'safety_intercept',
      payload: {
        interceptedAction: interceptedType,
        reason: `连续拒绝超过阈值，进入${cooldownHours}小时冷却期`,
        fallbackAction: 'silent_record',
        cooldownHours,
      },
    };
    this.messageBus.publish(msg).catch(console.error);
  }
}
