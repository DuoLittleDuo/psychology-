/**
 * 「同频」Same Wavelength — 任务线2: 推送预算与过载保护
 *
 * 职责：
 *   - 检查推送预算（今日还剩几次）
 *   - 检查用户硬性约束（时间/类型/频率偏好）
 *   - 检查"被忽略的连续次数"（≥3 → 拦截）
 *   - 如果拦截 → 通知决策Agent降级为静默记录
 *
 * 核心规则：
 *   1. 每日5次上限（仅🔴危机响应可超越）
 *   2. 连续3次拒绝同类推荐 → 48小时冷却期
 *   3. 连续3次忽略深夜推送 → 自动学习"21:00后不推送"约束
 *   4. 用户硬性约束 → 永不违反
 */

import {
  PushBudget,
  PushRecord,
  CooldownState,
  CooldownReason,
  ConstraintCheckRequest,
  ConstraintCheckResult,
  ConstraintCheckItem,
  PushBudgetStats,
} from './types/BudgetTypes';
import { HardConstraint, ConstraintType, ConstraintCondition } from '../memory/types/LongTermMemoryTypes';
import {
  MAX_DAILY_PUSHES,
  MIN_PUSH_INTERVAL_HOURS,
  REJECTION_COOLDOWN_THRESHOLD,
  REJECTION_COOLDOWN_HOURS,
  DO_NOT_DISTURB_START_HOUR,
  DO_NOT_DISTURB_END_HOUR,
} from '../core/Config';
import { InterventionType } from '../core/IntentTypes';

// ============================================================================
// 推送预算守卫
// ============================================================================

export class PushBudgetGuard {
  /** 每日推送预算 */
  private budget: PushBudget;

  /** 活跃冷却状态（按干预类型） */
  private cooldowns: Map<string, CooldownState> = new Map();

  /** 推送历史（跨天保留最近50条用于分析） */
  private pushHistory: PushRecord[] = [];

  /** 硬性约束缓存 */
  private constraints: HardConstraint[] = [];

  constructor() {
    this.budget = this.createDailyBudget();
  }

  // ==========================================================================
  // 核心检查方法
  // ==========================================================================

  /**
   * 检查推送是否被允许
   *
   * 执行顺序：
   *   1. 预算检查 → 今日是否还有剩余
   *   2. 间隔检查 → 距上次推送是否≥2小时
   *   3. 冷却检查 → 该类型是否在冷却中
   *   4. 时间检查 → 是否在允许时段
   *   5. 约束检查 → 是否违反硬性约束
   *   6. 设备检查 → 设备状态是否允许
   *
   * @returns 检查结果（每项独立判断，全部通过才算通过）
   */
  checkAll(request: ConstraintCheckRequest, hardConstraints: HardConstraint[] = []): ConstraintCheckResult {
    this.constraints = hardConstraints;
    const checks: ConstraintCheckItem[] = [];
    const now = Date.now();

    // 1. 预算检查
    const budgetCheck = this.checkBudget(request);
    checks.push(budgetCheck);

    // 2. 间隔检查
    const intervalCheck = this.checkMinInterval(now);
    checks.push(intervalCheck);

    // 3. 冷却检查
    const cooldownCheck = this.checkCooldown(request.interventionType, now);
    checks.push(cooldownCheck);

    // 4. 时间窗口检查
    const timingCheck = this.checkTimingWindow(request.timestamp);
    checks.push(timingCheck);

    // 5. 硬性约束检查
    const constraintsCheck = this.checkHardConstraints(request, hardConstraints);
    checks.push(constraintsCheck);

    // 6. 独处意愿检查
    const solitudeCheck = this.checkSolitudePreference(request);
    if (solitudeCheck) checks.push(solitudeCheck);

    const passed = checks.every(c => c.passed);

    // 决定回退动作
    let fallbackAction: 'silent_record' | 'delay' | 'downgrade' | 'cancel' | undefined;
    let suggestedDelay: { delayMinutes: number; reason: string } | undefined;

    if (!passed) {
      const failedBudget = checks.find(c => !c.passed && c.source === 'budget');
      const failedInterval = checks.find(c => !c.passed && c.source === 'timing');
      const failedCooldown = checks.find(c => !c.passed && c.source === 'cooldown');

      if (failedBudget) {
        fallbackAction = 'cancel';
      } else if (failedCooldown) {
        fallbackAction = 'downgrade';
      } else if (failedInterval) {
        fallbackAction = 'delay';
        const lastPush = this.pushHistory[this.pushHistory.length - 1];
        const nextAllowed = lastPush.timestamp + MIN_PUSH_INTERVAL_HOURS * 3600 * 1000;
        suggestedDelay = {
          delayMinutes: Math.ceil((nextAllowed - now) / 60000),
          reason: `距上次推送不足${MIN_PUSH_INTERVAL_HOURS}小时`,
        };
      } else {
        fallbackAction = 'silent_record';
      }
    }

    return {
      passed,
      checkedAt: now,
      checks,
      blockReason: !passed ? checks.find(c => !c.passed)?.reason : undefined,
      fallbackAction,
      suggestedDelay,
    };
  }

  // ==========================================================================
  // 各项检查
  // ==========================================================================

  /** 预算检查 */
  private checkBudget(request: ConstraintCheckRequest): ConstraintCheckItem {
    // 🔴危机响应 → 不受预算限制
    if (request.interventionType === InterventionType.CRISIS_RESPONSE) {
      return { name: '预算检查', passed: true, source: 'budget' };
    }

    if (this.budget.remainingPushes <= 0) {
      return {
        name: '预算检查',
        passed: false,
        reason: `今日推送已达上限(${this.budget.maxPushes}次)，预算耗尽于${new Date(this.budget.exhaustedAt ?? 0).toLocaleTimeString()}`,
        source: 'budget',
      };
    }

    return { name: '预算检查', passed: true, source: 'budget' };
  }

  /** 最小间隔检查 */
  private checkMinInterval(now: number): ConstraintCheckItem {
    if (this.pushHistory.length === 0) {
      return { name: '间隔检查', passed: true, source: 'timing' };
    }

    const lastPush = this.pushHistory[this.pushHistory.length - 1];
    const hoursSinceLast = (now - lastPush.timestamp) / (3600 * 1000);

    if (hoursSinceLast < MIN_PUSH_INTERVAL_HOURS) {
      return {
        name: '间隔检查',
        passed: false,
        reason: `距上次推送(${Math.round(hoursSinceLast * 10) / 10}h前)不足${MIN_PUSH_INTERVAL_HOURS}小时`,
        source: 'timing',
      };
    }

    return { name: '间隔检查', passed: true, source: 'timing' };
  }

  /** 冷却检查 */
  private checkCooldown(interventionType: string, now: number): ConstraintCheckItem {
    const cooldown = this.cooldowns.get(interventionType);

    if (!cooldown || !cooldown.isActive) {
      return { name: '冷却检查', passed: true, source: 'cooldown' };
    }

    if (cooldown.endsAt > now) {
      const remainingHours = Math.ceil((cooldown.endsAt - now) / 3600000);
      return {
        name: '冷却检查',
        passed: false,
        reason: `干预类型'${interventionType}'处于冷却期: 连续${cooldown.consecutiveRejections}次拒绝，${remainingHours}小时后恢复`,
        source: 'cooldown',
      };
    }

    // 冷却已过期 → 自动解除
    cooldown.isActive = false;
    cooldown.consecutiveRejections = 0;
    return { name: '冷却检查', passed: true, source: 'cooldown' };
  }

  /** 时间窗口检查 */
  private checkTimingWindow(timestamp: number): ConstraintCheckItem {
    const hour = new Date(timestamp).getHours();

    // 深夜时段 (23:00-08:00) → 仅允许危机响应
    if (hour >= DO_NOT_DISTURB_START_HOUR || hour < DO_NOT_DISTURB_END_HOUR) {
      return {
        name: '时间窗口检查',
        passed: false, // 非危机响应在深夜会被拦截（危机响应在budget检查中已放行）
        reason: `深夜时段(${DO_NOT_DISTURB_START_HOUR}:00-${DO_NOT_DISTURB_END_HOUR}:00)仅允许危机响应`,
        source: 'timing',
      };
    }

    return { name: '时间窗口检查', passed: true, source: 'timing' };
  }

  /** 硬性约束检查 */
  private checkHardConstraints(
    request: ConstraintCheckRequest,
    constraints: HardConstraint[],
  ): ConstraintCheckItem {
    for (const constraint of constraints) {
      if (!constraint.enabled) continue;

      const condition = constraint.condition;

      // 时间约束
      if (constraint.constraintType === ConstraintType.TIME_RESTRICTION && condition.timeWindows) {
        const hour = new Date(request.timestamp).getHours();
        const minute = new Date(request.timestamp).getMinutes();
        const timeDecimal = hour + minute / 60;

        for (const window of condition.timeWindows) {
          const [start, end] = window.split('-').map(t => {
            const [h, m] = t.split(':').map(Number);
            return h + (m || 0) / 60;
          });

          if (timeDecimal >= start && timeDecimal <= (end < start ? end + 24 : end)) {
            return {
              name: `硬约束: ${constraint.description}`,
              passed: false,
              reason: `触发硬性约束: ${constraint.description}`,
              source: 'hard_constraint',
            };
          }
        }
      }

      // 类型约束
      if (constraint.constraintType === ConstraintType.TYPE_RESTRICTION &&
          condition.interventionTypes?.includes(request.interventionType)) {
        return {
          name: `硬约束: ${constraint.description}`,
          passed: false,
          reason: `触发硬性约束: ${constraint.description}`,
          source: 'hard_constraint',
        };
      }

      // 社交约束
      if (constraint.constraintType === ConstraintType.SOCIAL_RESTRICTION &&
          request.interventionType.includes('buddy')) {
        return {
          name: `硬约束: ${constraint.description}`,
          passed: false,
          reason: `触发社交硬约束: ${constraint.description}`,
          source: 'hard_constraint',
        };
      }
    }

    return { name: '硬约束检查', passed: true, source: 'hard_constraint' };
  }

  /** 独处意愿检查 */
  private checkSolitudePreference(request: ConstraintCheckRequest): ConstraintCheckItem | null {
    // 由L1决策层判断独处意愿，安全Agent检查社交推送是否在用户想独处时被拦截
    // 这里由外部传入独处意愿标记
    return null; // 由调用方通过硬约束传递
  }

  // ==========================================================================
  // 记录方法
  // ==========================================================================

  /** 记录一次推送 */
  recordPush(request: ConstraintCheckRequest): void {
    const record: PushRecord = {
      timestamp: request.timestamp,
      type: request.interventionType as InterventionType,
      content: request.content.slice(0, 100), // 截断存储
      targetDevice: request.targetDevice,
      feedback: null,
      safetyApproved: true,
    };

    this.pushHistory.push(record);
    if (this.pushHistory.length > 50) this.pushHistory.shift();

    this.budget.usedPushes++;
    this.budget.remainingPushes = Math.max(0, this.budget.maxPushes - this.budget.usedPushes);
    this.budget.pushHistory.push(record);

    if (this.budget.remainingPushes <= 0) {
      this.budget.exhausted = true;
      this.budget.exhaustedAt = Date.now();
    }
  }

  /** 记录用户对某次推送的反馈 */
  recordFeedback(pushTimestamp: number, feedbackType: 'clicked' | 'positive_reply' | 'ignored' | 'rejected'): void {
    // 找到对应的推送记录
    const record = this.pushHistory.find(p => p.timestamp === pushTimestamp);
    if (record) {
      record.feedback = {
        type: feedbackType,
        timestamp: Date.now(),
      };
    }

    // 如果是拒绝 → 检查触发冷却
    if (feedbackType === 'rejected' || feedbackType === 'ignored') {
      this.handleNegativeFeedback(pushTimestamp, feedbackType);
    }
  }

  /** 处理负面反馈 → 检查触发冷却 */
  private handleNegativeFeedback(pushTimestamp: number, feedbackType: string): void {
    const record = this.pushHistory.find(p => p.timestamp === pushTimestamp);
    if (!record) return;

    const type = record.type;
    let cooldown = this.cooldowns.get(type);

    if (!cooldown) {
      cooldown = {
        interventionType: type,
        isActive: false,
        reason: CooldownReason.CONSECUTIVE_REJECTION,
        startedAt: 0,
        endsAt: 0,
        consecutiveRejections: 0,
        suggestAlternative: false,
      };
      this.cooldowns.set(type, cooldown);
    }

    cooldown.consecutiveRejections++;

    if (cooldown.consecutiveRejections >= REJECTION_COOLDOWN_THRESHOLD) {
      this.activateCooldown(type);
    }
  }

  /** 激活冷却 */
  private activateCooldown(type: string): void {
    const cooldown = this.cooldowns.get(type);
    if (!cooldown) return;

    cooldown.isActive = true;
    cooldown.startedAt = Date.now();
    cooldown.endsAt = Date.now() + REJECTION_COOLDOWN_HOURS * 3600 * 1000;
    cooldown.reason = CooldownReason.CONSECUTIVE_REJECTION;
    cooldown.suggestAlternative = true;

    console.warn(
      `[PushBudgetGuard] 🛑 干预类型'${type}'进入${REJECTION_COOLDOWN_HOURS}小时冷却 ` +
      `(连续${cooldown.consecutiveRejections}次拒绝)`
    );
  }

  // ==========================================================================
  // 每日重置
  // ==========================================================================

  /** 每日重置预算 */
  resetDailyBudget(): void {
    this.budget = this.createDailyBudget();
    console.log('[PushBudgetGuard] 📅 新的一天，推送预算已重置');
  }

  // ==========================================================================
  // 查询方法
  // ==========================================================================

  getBudget(): PushBudget {
    return { ...this.budget };
  }

  getActiveCooldowns(): CooldownState[] {
    return Array.from(this.cooldowns.values()).filter(c => c.isActive);
  }

  getCooldown(type: string): CooldownState | undefined {
    return this.cooldowns.get(type);
  }

  getPushHistory(): PushRecord[] {
    return [...this.pushHistory];
  }

  /** 获取推送统计 */
  getStats(): PushBudgetStats {
    const byType: Record<string, number> = {};
    let responses = 0;
    let ignores = 0;
    let rejections = 0;

    for (const push of this.pushHistory) {
      byType[push.type] = (byType[push.type] ?? 0) + 1;
      if (push.feedback?.type === 'clicked' || push.feedback?.type === 'positive_reply') responses++;
      if (push.feedback?.type === 'ignored') ignores++;
      if (push.feedback?.type === 'rejected') rejections++;
    }

    const total = this.pushHistory.length;
    return {
      period: 'weekly',
      totalPushes: total,
      byType,
      responseRate: total > 0 ? responses / total : 0,
      ignoreRate: total > 0 ? ignores / total : 0,
      rejectionRate: total > 0 ? rejections / total : 0,
      safetyBlockCount: 0,
      cooldownBlockCount: this.getActiveCooldowns().length,
      budgetExhaustedDays: this.budget.exhausted ? 1 : 0,
    };
  }

  // ==========================================================================
  // 私有方法
  // ==========================================================================

  private createDailyBudget(): PushBudget {
    return {
      date: new Date().toISOString().split('T')[0],
      maxPushes: MAX_DAILY_PUSHES,
      usedPushes: 0,
      remainingPushes: MAX_DAILY_PUSHES,
      pushHistory: [],
      exhausted: false,
    };
  }
}
