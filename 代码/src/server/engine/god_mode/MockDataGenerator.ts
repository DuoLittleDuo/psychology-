/**
 * 「同频」Same Wavelength — Mock 数据发生器
 *
 * 上帝模式核心组件：模拟连续3天的用户数据。
 *
 * 模拟场景：大学生"小林"的3天生活轨迹
 *   Day 1 (周一): 正常状态 — 情绪0.68, 社交0.60, 睡眠7.1h
 *   Day 2 (周二): 轻度下滑 — 情绪0.52, 社交0.45, 睡眠5.8h, 深夜使用手机
 *   Day 3 (周三): 持续恶化 — 情绪0.35, 社交0.30, 睡眠4.2h, 社交退缩
 *
 * 每次调用 generateNextSnapshot() 推进3小时，生成一个融合快照。
 */

import { Snapshot, MoodAssessment, SocialWillingnessAssessment, UsageSignalSummary, SnapshotTriggerType } from '../perception/types/Snapshot';
import { HealthSnapshot, SleepSummary, ActivitySummary, HeartRateSummary, StressEstimate, SleepTrend, ActivityTrend } from '../perception/types/HealthData';
import { DialogueSignalSummary } from '../perception/types/DialogueData';
import { ContextSnapshot, LocationSummary, WeatherSummary, TimeContext, CalendarEvent, ExamPeriodContext, WeatherCondition } from '../perception/types/ContextData';
import { BehaviorTrend, BehaviorAnomalyFlag } from '../perception/types/UsageData';
import { LocationType, SentimentPolarity, UserIntentType, TimeOfDay } from '../core/IntentTypes';

// ============================================================================
// 模拟场景配置
// ============================================================================

/** 3天模拟场景定义 */
export interface MockScenario {
  /** 场景名称 */
  name: string;
  /** 模拟起始日期 */
  startDate: string;
  /** 模拟天数 */
  totalDays: number;
  /** 每天的快照数（每3小时一个 = 每天8个） */
  snapshotsPerDay: number;
  /** 每日情绪/社交/睡眠预设基线 */
  dailyBaselines: DayBaseline[];
}

/** 每日基线数据 */
export interface DayBaseline {
  day: number;
  label: string;
  /** 情绪基线 */
  moodBaseline: number;
  /** 社交意愿基线 */
  socialBaseline: number;
  /** 睡眠数据 */
  sleep: { totalHours: number; qualityScore: number; deepHours: number; wakeCount: number };
  /** 活动数据 */
  activity: { stepCount: number; outdoorMinutes: number; mvpaMinutes: number };
  /** 屏幕使用 */
  screen: { totalHours: number; socialHours: number; videoHours: number; studyHours: number };
  /** 压力水平 */
  stressLevel: number;
  /** 是否有深夜使用 */
  lateNightUsage: boolean;
  /** 对话情感 */
  dialogueSentiment: SentimentPolarity;
}

// ============================================================================
// 预置场景：小林3天情绪下滑
// ============================================================================

export const DEFAULT_MOCK_SCENARIO: MockScenario = {
  name: '小林-3天情绪持续下滑',
  startDate: '2026-07-18',
  totalDays: 3,
  snapshotsPerDay: 8,
  dailyBaselines: [
    {
      day: 1,
      label: '周一：正常状态',
      moodBaseline: 0.68,
      socialBaseline: 0.60,
      sleep: { totalHours: 7.1, qualityScore: 0.72, deepHours: 2.1, wakeCount: 1 },
      activity: { stepCount: 6800, outdoorMinutes: 45, mvpaMinutes: 20 },
      screen: { totalHours: 4.5, socialHours: 1.2, videoHours: 1.0, studyHours: 1.8 },
      stressLevel: 0.35,
      lateNightUsage: false,
      dialogueSentiment: SentimentPolarity.NEUTRAL,
    },
    {
      day: 2,
      label: '周二：轻度下滑',
      moodBaseline: 0.52,
      socialBaseline: 0.45,
      sleep: { totalHours: 5.8, qualityScore: 0.48, deepHours: 1.2, wakeCount: 3 },
      activity: { stepCount: 3200, outdoorMinutes: 15, mvpaMinutes: 5 },
      screen: { totalHours: 6.8, socialHours: 0.3, videoHours: 3.5, studyHours: 1.2 },
      stressLevel: 0.55,
      lateNightUsage: true,
      dialogueSentiment: SentimentPolarity.NEGATIVE,
    },
    {
      day: 3,
      label: '周三：持续恶化',
      moodBaseline: 0.35,
      socialBaseline: 0.30,
      sleep: { totalHours: 4.2, qualityScore: 0.28, deepHours: 0.8, wakeCount: 6 },
      activity: { stepCount: 1200, outdoorMinutes: 0, mvpaMinutes: 0 },
      screen: { totalHours: 9.2, socialHours: 0.1, videoHours: 6.5, studyHours: 0.3 },
      stressLevel: 0.72,
      lateNightUsage: true,
      dialogueSentiment: SentimentPolarity.NEGATIVE,
    },
  ],
};

// ============================================================================
// Mock 数据发生器
// ============================================================================

export class MockDataGenerator {
  private scenario: MockScenario;
  private currentDay: number = 0;
  private currentSnapshotIndex: number = 0;
  private generatedSnapshots: Snapshot[] = [];
  private snapshotIdCounter: number = 0;

  /** 是否启用随机噪声（让数据看起来更真实） */
  private noiseEnabled: boolean = true;

  /** 噪声幅度 */
  private readonly NOISE_AMPLITUDE = 0.05;

  constructor(scenario?: MockScenario) {
    this.scenario = scenario ?? DEFAULT_MOCK_SCENARIO;
  }

  // ==========================================================================
  // 模拟控制
  // ==========================================================================

  /** 重置到模拟开始 */
  reset(): void {
    this.currentDay = 0;
    this.currentSnapshotIndex = 0;
    this.generatedSnapshots = [];
    this.snapshotIdCounter = 0;
  }

  /** 获取模拟总快照数 */
  getTotalSnapshots(): number {
    return this.scenario.totalDays * this.scenario.snapshotsPerDay;
  }

  /** 获取当前进度 (0.0–1.0) */
  getProgress(): number {
    const total = this.getTotalSnapshots();
    if (total === 0) return 1;
    return this.generatedSnapshots.length / total;
  }

  /** 是否还有更多快照可生成 */
  hasMore(): boolean {
    return this.generatedSnapshots.length < this.getTotalSnapshots();
  }

  /** 获取已生成的快照 */
  getSnapshots(): Snapshot[] {
    return [...this.generatedSnapshots];
  }

  // ==========================================================================
  // 快照生成
  // ==========================================================================

  /**
   * 生成下一个快照（每次推进 ~3 小时）
   */
  generateNextSnapshot(
    triggerType: SnapshotTriggerType = SnapshotTriggerType.MANUAL_TRIGGER,
    overrideMood?: number,
    overrideSocial?: number,
    overrideSolitude?: boolean,
  ): Snapshot {
    // 计算当前模拟的绝对时间
    const dayIndex = Math.floor(this.generatedSnapshots.length / this.scenario.snapshotsPerDay);
    const snapshotInDay = this.generatedSnapshots.length % this.scenario.snapshotsPerDay;

    if (dayIndex >= this.scenario.totalDays) {
      throw new Error('模拟已完成所有3天数据');
    }

    const baseline = this.scenario.dailyBaselines[dayIndex];
    const dayStart = this.getDayStart(dayIndex);
    const hourOfDay = snapshotInDay * 3; // 0, 3, 6, 9, 12, 15, 18, 21
    const timestamp = dayStart + hourOfDay * 3600 * 1000;

    // 添加时间维度的情绪波动（早晨低，下午回升，晚上再降）
    const timeModifier = this.getTimeModifier(hourOfDay);

    // 带噪声的情绪和社交评分
    const moodScore = this.clampScore(
      (overrideMood ?? baseline.moodBaseline) + timeModifier + this.noise()
    );
    const socialScore = this.clampScore(
      (overrideSocial ?? baseline.socialBaseline) + this.noise()
    );

    // 构建各维度信号
    const health = this.buildHealthSnapshot(baseline, timestamp, dayIndex);
    const usage = this.buildUsageSummary(baseline, hourOfDay);
    const dialogue = this.buildDialogueSummary(baseline, hourOfDay);
    const context = this.buildContextSnapshot(timestamp, hourOfDay, dayIndex);
    const mood = this.buildMoodAssessment(moodScore);
    const socialWillingness = this.buildSocialAssessment(
      socialScore,
      overrideSolitude ?? false,
    );
    const behaviorTrend = this.buildBehaviorTrend(baseline);

    const snapshot: Snapshot = {
      id: `mock_snap_${dayIndex + 1}_${snapshotInDay}_${++this.snapshotIdCounter}`,
      timestamp,
      windowHours: 3,
      health,
      usage,
      dialogue,
      context,
      mood,
      socialWillingness,
      behaviorTrend,
      version: this.snapshotIdCounter,
      triggerEvent: `mock_day${dayIndex + 1}_h${hourOfDay}`,
      isManualOverride: overrideMood !== undefined || overrideSocial !== undefined,
    };

    this.generatedSnapshots.push(snapshot);
    return snapshot;
  }

  /**
   * 生成完整3天的所有快照（批量模式）
   */
  generateAll(overrideDayBaselines?: Partial<DayBaseline>[]): Snapshot[] {
    this.reset();
    const allSnapshots: Snapshot[] = [];

    // 如果有覆盖，应用
    if (overrideDayBaselines) {
      for (let i = 0; i < Math.min(overrideDayBaselines.length, this.scenario.dailyBaselines.length); i++) {
        Object.assign(this.scenario.dailyBaselines[i], overrideDayBaselines[i]);
      }
    }

    while (this.hasMore()) {
      allSnapshots.push(this.generateNextSnapshot(SnapshotTriggerType.SCHEDULED_FUSION));
    }

    return allSnapshots;
  }

  // ==========================================================================
  // 手动干预：修改当前模拟状态
  // ==========================================================================

  /** 修改指定天的基线数据（用于上帝模式拖拽） */
  overrideDayBaseline(
    dayIndex: number,
    updates: Partial<DayBaseline>,
  ): void {
    if (dayIndex >= 0 && dayIndex < this.scenario.dailyBaselines.length) {
      Object.assign(this.scenario.dailyBaselines[dayIndex], updates);
    }
  }

  /** 获取指定天的基线数据（用于上帝模式展示当前值） */
  getDayBaseline(dayIndex: number): DayBaseline | null {
    return this.scenario.dailyBaselines[dayIndex] ?? null;
  }

  /** 获取场景元信息 */
  getScenarioInfo(): { name: string; startDate: string; totalDays: number; dayLabels: string[] } {
    return {
      name: this.scenario.name,
      startDate: this.scenario.startDate,
      totalDays: this.scenario.totalDays,
      dayLabels: this.scenario.dailyBaselines.map(b => b.label),
    };
  }

  // ==========================================================================
  // 各维度构建器
  // ==========================================================================

  private buildHealthSnapshot(baseline: DayBaseline, timestamp: number, dayIndex: number): HealthSnapshot {
    const sleep: SleepSummary = {
      date: this.getDateString(dayIndex),
      totalHours: baseline.sleep.totalHours,
      deepSleepHours: baseline.sleep.deepHours,
      lightSleepHours: baseline.sleep.totalHours - baseline.sleep.deepHours,
      wakeCount: baseline.sleep.wakeCount,
      sleepOnsetHour: 23.5 + this.noise(0.5),
      wakeUpHour: 7.0 + this.noise(0.3),
      qualityScore: baseline.sleep.qualityScore,
      deviationFromBaseline: baseline.sleep.totalHours < 6 ? -0.3 : baseline.sleep.totalHours > 7 ? 0.1 : 0,
    };

    const activity: ActivitySummary = {
      date: this.getDateString(dayIndex),
      stepCount: baseline.activity.stepCount,
      moderateToVigorousMinutes: baseline.activity.mvpaMinutes,
      outdoorMinutes: baseline.activity.outdoorMinutes,
      activeEnergyKcal: baseline.activity.stepCount * 0.04,
    };

    const heartRate: HeartRateSummary = {
      date: this.getDateString(dayIndex),
      restingHeartRateAvg: 65 + baseline.stressLevel * 15 + this.noise(3),
      deviationFromBaseline: baseline.stressLevel * 0.4,
    };

    const stress: StressEstimate = {
      date: this.getDateString(dayIndex),
      stressLevel: baseline.stressLevel + this.noise(0.05),
      confidence: 0.75,
      sourceDevice: 'watch',
    };

    const sleepTrend: SleepTrend = baseline.sleep.qualityScore < 0.5
      ? 'declining' : baseline.sleep.qualityScore > 0.65 ? 'stable' : 'declining';
    const activityTrend: ActivityTrend = baseline.activity.stepCount < 3000
      ? 'sedentary' : baseline.activity.stepCount < 5000 ? 'below_baseline' : 'normal';

    return { timestamp, latestSleep: sleep, latestActivity: activity, latestHeartRate: heartRate, latestStress: stress, sleepTrend, activityTrend };
  }

  private buildUsageSummary(baseline: DayBaseline, hourOfDay: number): UsageSignalSummary {
    const dayProgress = Math.min(1, hourOfDay / 24);
    return {
      totalScreenTimeHours: Math.round(baseline.screen.totalHours * dayProgress * 10) / 10,
      socialAppHours: Math.round(baseline.screen.socialHours * dayProgress * 10) / 10,
      videoAppHours: Math.round(baseline.screen.videoHours * dayProgress * 10) / 10,
      studyAppHours: Math.round(baseline.screen.studyHours * dayProgress * 10) / 10,
      screenWakeCount: Math.round(30 * dayProgress),
      lateNightUsage: hourOfDay >= 23 ? baseline.lateNightUsage : false,
      deviationFromBaseline: baseline.screen.totalHours > 6 ? 0.3 : 0,
    };
  }

  private buildDialogueSummary(baseline: DayBaseline, hourOfDay: number): DialogueSignalSummary {
    const hasDialogue = hourOfDay >= 12 && hourOfDay <= 21; // 只在白天可能有对话
    return {
      lastDialogueTime: hasDialogue ? Date.now() - 3600000 : null,
      lastIntent: hasDialogue ? UserIntentType.CHAT : null,
      lastSentiment: baseline.dialogueSentiment,
      inActiveConversation: false,
      activeTurnCount: 0,
      lastWakeTime: null,
      hasUnfinishedDialogue: false,
      lastIntentResult: null,
    };
  }

  private buildContextSnapshot(timestamp: number, hourOfDay: number, dayIndex: number): ContextSnapshot {
    const timeOfDay: TimeOfDay =
      hourOfDay < 8 ? TimeOfDay.EARLY_MORNING :
      hourOfDay < 12 ? TimeOfDay.MORNING :
      hourOfDay < 18 ? TimeOfDay.AFTERNOON :
      hourOfDay < 23 ? TimeOfDay.EVENING : TimeOfDay.NIGHT;

    const dayOfWeek = (new Date(this.getDayStart(dayIndex)).getDay() || 7) as 1|2|3|4|5|6|7;

    const location: LocationSummary = {
      currentLocation: hourOfDay < 8 || hourOfDay >= 22 ? LocationType.DORMITORY :
                       hourOfDay < 12 ? LocationType.CLASSROOM :
                       hourOfDay < 14 ? LocationType.CANTEEN :
                       hourOfDay < 17 ? LocationType.LIBRARY :
                       LocationType.DORMITORY,
      recentTraces: [],
      onCampus: true,
      lastGeofenceEvent: null,
    };

    const weather: WeatherSummary = {
      condition: WeatherCondition.CLOUDY,
      temperatureCelsius: 28,
      feelsLikeCelsius: 30,
      humidity: 65,
      aqi: 55,
      suitableForOutdoor: true,
    };

    const time: TimeContext = {
      now: timestamp,
      timeOfDay,
      dayOfWeek,
      isWeekend: dayOfWeek >= 6,
      isHoliday: false,
      hasEarlyClassTomorrow: hourOfDay < 23 && dayOfWeek < 5,
    };

    return {
      timestamp,
      location,
      weather,
      time,
      examContext: { isExamPeriod: false, nearestExamDate: null, examStressLevel: 0 },
      activeCalendarEvents: [],
      upcomingEvents: [],
    };
  }

  private buildMoodAssessment(score: number): MoodAssessment {
    return {
      overallScore: score,
      dimensions: {
        energy: Math.round((score - 0.1 + this.noise(0.05)) * 100) / 100,
        pleasure: Math.round((score + this.noise(0.05)) * 100) / 100,
        calmness: Math.round((score - 0.05 + this.noise(0.05)) * 100) / 100,
        focus: Math.round((score - 0.15 + this.noise(0.05)) * 100) / 100,
      },
      confidence: 0.75,
      inferenceSources: ['sleep_quality', 'activity_level', 'screen_usage_pattern', 'dialogue_sentiment'],
    };
  }

  private buildSocialAssessment(score: number, solitudePreference: boolean): SocialWillingnessAssessment {
    return {
      overallScore: score,
      preferredDepth: score > 0.65 ? 3 : score > 0.4 ? 2 : 1,
      solitudePreference,
      confidence: 0.7,
    };
  }

  private buildBehaviorTrend(baseline: DayBaseline): BehaviorTrend {
    return {
      windowStart: Date.now() - 3 * 3600 * 1000,
      windowEnd: Date.now(),
      socialUsageTrend: baseline.screen.socialHours < 0.5 ? 'decreasing' : 'stable',
      screenTimeChangeRate: baseline.screen.totalHours > 6 ? 0.3 : 0,
      lateNightFrequency: baseline.lateNightUsage ? 1 : 0,
      studyEngagementChange: baseline.screen.studyHours < 1 ? -0.4 : 0,
      anomalyFlags: baseline.screen.socialHours < 0.3
        ? [BehaviorAnomalyFlag.SOCIAL_WITHDRAWAL]
        : [BehaviorAnomalyFlag.NORMAL],
    };
  }

  // ==========================================================================
  // 工具方法
  // ==========================================================================

  private getDayStart(dayIndex: number): number {
    const base = new Date(this.scenario.startDate);
    base.setDate(base.getDate() + dayIndex);
    base.setHours(0, 0, 0, 0);
    return base.getTime();
  }

  private getDateString(dayIndex: number): string {
    const d = new Date(this.scenario.startDate);
    d.setDate(d.getDate() + dayIndex);
    return d.toISOString().split('T')[0];
  }

  private getTimeModifier(hourOfDay: number): number {
    // 模拟日内情绪波动: 早晨偏低 → 上午回升 → 午后最高 → 晚上回落
    if (hourOfDay < 8) return -0.08;
    if (hourOfDay < 12) return 0.02;
    if (hourOfDay < 17) return 0.05;
    if (hourOfDay < 21) return 0;
    return -0.05;
  }

  private noise(amplitude?: number): number {
    if (!this.noiseEnabled) return 0;
    const amp = amplitude ?? this.NOISE_AMPLITUDE;
    return (Math.random() - 0.5) * 2 * amp;
  }

  private clampScore(value: number): number {
    return Math.round(Math.max(0, Math.min(1, value)) * 100) / 100;
  }

  setNoiseEnabled(enabled: boolean): void {
    this.noiseEnabled = enabled;
  }
}
