/**
 * 「同频」Same Wavelength — 干预时机决策器
 *
 * 核心问题：不是判断"该不该干预"，而是判断"此刻是不是干预的最佳时机"。
 *
 * 时机评分 = f(紧急度, 可用性, 历史响应率, 当前上下文)
 *
 * 干预执行前的时间窗口检查:
 *   ✅ 距上次推送 ≥ 2小时
 *   ✅ 今日推送 < 5次
 *   ✅ 不在勿扰时段
 *   ✅ 非课堂/考试时段
 *   ✅ 用户未标记"想独处"
 *   ✅ 设备状态允许（未在通话/未在游戏/未在导航）
 *
 * 如果当前时刻不满足 → 延迟到下一个满足条件的窗口
 * 如果24小时内无合适窗口 → 降级为静默记录，不强制推送
 */

import { TimingAssessment } from './types/DecisionTypes';
import { Snapshot } from '../perception/types/Snapshot';
import { InterventionRecord } from '../memory/types/ShortTermMemoryTypes';
import { InterventionPreferences } from '../memory/types/LongTermMemoryTypes';
import {
  DO_NOT_DISTURB_START_HOUR,
  DO_NOT_DISTURB_END_HOUR,
  MIN_PUSH_INTERVAL_HOURS,
  MAX_DAILY_PUSHES,
  CalendarEventType,
} from '../core/IntentTypes';
import { CalendarEvent } from '../perception/types/ContextData';

// ============================================================================
// 干预时机决策器
// ============================================================================

export class InterventionTimer {
  /** 上次推送时间 */
  private lastPushTime: number = 0;

  /** 今日推送次数 */
  private todayPushCount: number = 0;

  /** 用户偏好推送时段 */
  private preferredTiming: string[] = [];

  /** 用户避免的推送时段 */
  private avoidedTiming: string[] = [];

  // ==========================================================================
  // 时机评分
  // ==========================================================================

  /**
   * 评估当前时刻是否适合干预
   *
   * @param snapshot 当前状态快照
   * @param urgency 紧急度 (0.0–1.0)
   * @param recentInterventions 最近干预记录（用于计算历史响应率）
   * @param preferences 用户干预偏好
   * @returns 时机评估结果
   */
  evaluate(
    snapshot: Snapshot,
    urgency: number,
    recentInterventions: InterventionRecord[] = [],
    preferences: InterventionPreferences | null = null,
  ): TimingAssessment {
    const now = Date.now();
    const context = snapshot.context;
    const hour = new Date(now).getHours();
    const dayOfWeek = new Date(now).getDay() || 7;

    const dimensions = {
      urgency: urgency,
      availability: this.scoreAvailability(snapshot),
      historicalResponseRate: this.scoreHistoricalResponse(recentInterventions, hour),
      contextFitness: this.scoreContextFitness(snapshot),
    };

    // 加权综合评分
    const score = Math.min(1.0, Math.max(0,
      dimensions.urgency * 0.35 +
      dimensions.availability * 0.25 +
      dimensions.historicalResponseRate * 0.2 +
      dimensions.contextFitness * 0.2
    ));

    // 硬性条件检查
    const unmetConditions: string[] = [];
    let conditionsMet = true;

    // 检查1: 深夜勿扰
    if (hour >= DO_NOT_DISTURB_START_HOUR || hour < DO_NOT_DISTURB_END_HOUR) {
      if (urgency < 0.9) { // 非危机不打扰
        unmetConditions.push(`深夜时段(${DO_NOT_DISTURB_START_HOUR}:00-${DO_NOT_DISTURB_END_HOUR}:00)，仅危机响应可通过`);
        conditionsMet = false;
      }
    }

    // 检查2: 距上次推送间隔
    const hoursSinceLastPush = (now - this.lastPushTime) / (3600 * 1000);
    if (this.lastPushTime > 0 && hoursSinceLastPush < MIN_PUSH_INTERVAL_HOURS && urgency < 0.8) {
      unmetConditions.push(`距上次推送仅${Math.round(hoursSinceLastPush * 10) / 10}小时，需≥${MIN_PUSH_INTERVAL_HOURS}小时`);
      conditionsMet = false;
    }

    // 检查3: 今日推送配额
    if (this.todayPushCount >= MAX_DAILY_PUSHES && urgency < 0.9) {
      unmetConditions.push(`今日推送已达${MAX_DAILY_PUSHES}次上限`);
      conditionsMet = false;
    }

    // 检查4: 课堂/考试期间
    const activeClasses = context.activeCalendarEvents?.filter(
      e => e.type === CalendarEventType.CLASS || e.type === CalendarEventType.EXAM
    ) ?? [];
    if (activeClasses.length > 0 && urgency < 0.7) {
      unmetConditions.push('当前正在进行课程/考试');
      conditionsMet = false;
    }

    // 检查5: 独处意愿
    if (snapshot.socialWillingness.solitudePreference && urgency < 0.6) {
      unmetConditions.push('用户标记想独处');
      conditionsMet = false;
    }

    // 寻找下一个可用窗口
    let nextAvailableWindow: TimingAssessment['nextAvailableWindow'] = undefined;

    if (!conditionsMet) {
      const nextWindow = this.findNextAvailableWindow(now, snapshot, urgency);
      if (nextWindow) {
        nextAvailableWindow = nextWindow;
      }
    }

    return {
      score: Math.round(score * 100) / 100,
      dimensions: {
        urgency: Math.round(dimensions.urgency * 100) / 100,
        availability: Math.round(dimensions.availability * 100) / 100,
        historicalResponseRate: Math.round(dimensions.historicalResponseRate * 100) / 100,
        contextFitness: Math.round(dimensions.contextFitness * 100) / 100,
      },
      nextAvailableWindow,
      conditionsMet,
      unmetConditions,
      fallbackToSilent: !conditionsMet && nextAvailableWindow === undefined,
    };
  }

  // ==========================================================================
  // 各维度评分
  // ==========================================================================

  /** 用户可用性评分 */
  private scoreAvailability(snapshot: Snapshot): number {
    let score = 0.5;
    const context = snapshot.context;
    const hour = new Date(snapshot.timestamp).getHours();

    // 黄金时段加分
    if (hour >= 16 && hour <= 18) score += 0.3;
    else if (hour >= 19 && hour <= 21) score += 0.2;
    else if (hour >= 12 && hour <= 14) score += 0.1;

    // 有课扣分
    if (context.activeCalendarEvents?.some(e => e.type === 'class')) {
      score -= 0.3;
    }

    // 考试周扣分
    if (context.examContext?.isExamPeriod) {
      score -= 0.2;
    }

    // 周末加分
    const dayOfWeek = new Date(snapshot.timestamp).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      score += 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  /** 历史响应率评分 */
  private scoreHistoricalResponse(
    interventions: InterventionRecord[],
    currentHour: number,
  ): number {
    if (interventions.length === 0) return 0.5; // 无历史 → 中性

    // 找到同时段的干预记录
    const sameTimeInterventions = interventions.filter(i => {
      const h = new Date(i.timestamp).getHours();
      return Math.abs(h - currentHour) <= 2;
    });

    if (sameTimeInterventions.length === 0) return 0.5;

    const responded = sameTimeInterventions.filter(
      i => i.userFeedback?.type === 'clicked' || i.userFeedback?.type === 'positive_reply'
    ).length;

    const responseRate = responded / sameTimeInterventions.length;
    return Math.min(1.0, responseRate * 1.2); // 稍高于实际响应率
  }

  /** 上下文适配度评分 */
  private scoreContextFitness(snapshot: Snapshot): number {
    let score = 0.5;
    const context = snapshot.context;

    // 天气好 → 户外活动建议更合适
    if (context.weather?.suitableForOutdoor) {
      score += 0.1;
    }

    // 在图书馆/教室 → 推送搭子推荐更合适
    const location = context.location?.currentLocation;
    if (location === 'library' || location === 'classroom') {
      score += 0.1;
    }

    // 在宿舍 → 轻量关怀更合适
    if (location === 'dormitory') {
      score += 0.05;
    }

    // 考试压力大 → 降低推送意愿
    if (context.examContext?.examStressLevel > 0.5) {
      score -= 0.2;
    }

    return Math.max(0, Math.min(1, score));
  }

  // ==========================================================================
  // 窗口寻找
  // ==========================================================================

  /**
   * 寻找下一个满足条件的干预窗口
   *
   * 策略：从当前时刻开始，往后搜索24小时，
   * 找到第一个满足所有硬性条件的小时窗口。
   */
  private findNextAvailableWindow(
    now: number,
    snapshot: Snapshot,
    urgency: number,
  ): { start: number; end: number; reason: string } | undefined {
    const currentHour = new Date(now).getHours();

    // 搜索未来24小时
    for (let offset = 1; offset <= 24; offset++) {
      const candidateHour = (currentHour + offset) % 24;
      const candidateTime = now + offset * 3600 * 1000;

      // 跳过深夜
      if (candidateHour >= DO_NOT_DISTURB_START_HOUR || candidateHour < DO_NOT_DISTURB_END_HOUR) {
        if (urgency < 0.9) continue;
      }

      // 检查是否有课（简化：假设8:00-12:00和14:00-17:00可能是课堂时间）
      const isClassTime = (candidateHour >= 8 && candidateHour <= 11) ||
                          (candidateHour >= 14 && candidateHour <= 16);
      if (isClassTime && urgency < 0.7) continue;

      // 找到合适窗口
      return {
        start: candidateTime,
        end: candidateTime + 3600 * 1000,
        reason: `${candidateHour}:00 是下一个合适的推送时间`,
      };
    }

    return undefined; // 24小时内无合适窗口 → 静默记录
  }

  // ==========================================================================
  // 记录方法
  // ==========================================================================

  /** 记录一次推送 */
  recordPush(): void {
    this.lastPushTime = Date.now();
    this.todayPushCount++;
  }

  /** 每日重置 */
  resetDaily(): void {
    this.todayPushCount = 0;
  }

  /** 获取当前推送计数 */
  getTodayPushCount(): number {
    return this.todayPushCount;
  }

  /** 获取距上次推送的小时数 */
  getHoursSinceLastPush(): number {
    if (this.lastPushTime === 0) return Infinity;
    return (Date.now() - this.lastPushTime) / (3600 * 1000);
  }
}
