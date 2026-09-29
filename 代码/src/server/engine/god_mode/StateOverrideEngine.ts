/**
 * 「同频」Same Wavelength — 状态覆盖引擎
 *
 * 上帝模式核心组件：允许手动拖拽/修改用户的情绪评分、社交意愿、独处标记。
 * 覆盖后的状态会实时影响 L1 决策和 L2 规划。
 *
 * 核心功能：
 *   1. 手动覆盖情绪评分 (0.0–1.0)
 *   2. 手动覆盖社交意愿评分 (0.0–1.0)
 *   3. 手动切换独处意愿标记
 *   4. 追踪每次覆盖导致的决策变化（用于上帝模式可视化）
 *   5. 支持一键切换到预置 Demo 场景
 */

import {
  StateOverrideRequest,
  StateOverrideLog,
  DemoScenario,
  DEMO_SCENARIOS,
} from './types/GodModeTypes';
import { GridQuadrant } from '../decision/types/DecisionTypes';
import { GRID_MATRIX, MoodTier, SocialWillingnessTier } from '../decision/types/DecisionTypes';
import { MOOD_THRESHOLD_LOW, MOOD_THRESHOLD_HIGH, SOCIAL_THRESHOLD_LOW, SOCIAL_THRESHOLD_HIGH } from '../core/Config';

// ============================================================================
// 状态覆盖引擎
// ============================================================================

export class StateOverrideEngine {
  /** 当前覆盖状态 */
  private overrides: {
    moodScore: number | null;
    socialWillingnessScore: number | null;
    solitudePreference: boolean | null;
    riskLevel: string | null;
  } = {
    moodScore: null,
    socialWillingnessScore: null,
    solitudePreference: null,
    riskLevel: null,
  };

  /** 覆盖前的原始值（用于回退） */
  private originalValues: {
    moodScore: number;
    socialWillingnessScore: number;
    solitudePreference: boolean;
    riskLevel: string;
  } = {
    moodScore: 0.5,
    socialWillingnessScore: 0.5,
    solitudePreference: false,
    riskLevel: 'green',
  };

  /** 覆盖日志 */
  private overrideLogs: StateOverrideLog[] = [];

  /** 是否启用手动覆盖 */
  private enabled: boolean = true;

  /** 当前激活的 Demo 场景 ID */
  private activeScenarioId: string | null = null;

  // ==========================================================================
  // 覆盖操作
  // ==========================================================================

  /**
   * 手动设置情绪评分
   *
   * 拖拽后立即生效，下一次快照生成时会使用覆盖值。
   */
  setMoodScore(score: number, reason: string = '上帝模式手动拖拽'): StateOverrideLog {
    const clampedScore = Math.max(0, Math.min(1, Math.round(score * 100) / 100));
    const previousQuadrant = this.getCurrentQuadrant();

    // 保存原始值
    if (this.overrides.moodScore === null) {
      this.originalValues.moodScore = clampedScore;
    }

    this.overrides.moodScore = clampedScore;

    // 计算决策变化
    const newQuadrant = this.getCurrentQuadrant();
    const log = this.createOverrideLog(
      'mood_score',
      clampedScore,
      this.originalValues.moodScore,
      previousQuadrant,
      newQuadrant,
      reason,
    );

    this.overrideLogs.push(log);
    return log;
  }

  /**
   * 手动设置社交意愿评分
   */
  setSocialWillingnessScore(score: number, reason: string = '上帝模式手动拖拽'): StateOverrideLog {
    const clampedScore = Math.max(0, Math.min(1, Math.round(score * 100) / 100));
    const previousQuadrant = this.getCurrentQuadrant();

    if (this.overrides.socialWillingnessScore === null) {
      this.originalValues.socialWillingnessScore = clampedScore;
    }

    this.overrides.socialWillingnessScore = clampedScore;

    const newQuadrant = this.getCurrentQuadrant();
    const log = this.createOverrideLog(
      'social_willingness_score',
      clampedScore,
      this.originalValues.socialWillingnessScore,
      previousQuadrant,
      newQuadrant,
      reason,
    );

    this.overrideLogs.push(log);
    return log;
  }

  /**
   * 切换独处意愿标记
   */
  toggleSolitudePreference(reason: string = '上帝模式手动切换'): StateOverrideLog {
    const previousQuadrant = this.getCurrentQuadrant();
    const previousValue = this.overrides.solitudePreference ?? this.originalValues.solitudePreference;
    const newValue = !previousValue;

    this.overrides.solitudePreference = newValue;

    const newQuadrant = this.getCurrentQuadrant();
    const log = this.createOverrideLog(
      'solitude_preference',
      newValue,
      previousValue,
      previousQuadrant,
      newQuadrant,
      reason,
    );

    this.overrideLogs.push(log);
    return log;
  }

  /**
   * 一键切换到预置 Demo 场景
   */
  applyDemoScenario(scenarioId: string): DemoScenario | null {
    const scenario = DEMO_SCENARIOS.find(s => s.id === scenarioId);
    if (!scenario) return null;

    this.activeScenarioId = scenarioId;
    this.setMoodScore(scenario.presets.moodScore, `场景切换: ${scenario.name}`);
    this.setSocialWillingnessScore(scenario.presets.socialWillingnessScore, `场景切换: ${scenario.name}`);

    console.log(`[StateOverride] 🎬 切换场景: ${scenario.name}\n  预期行为: ${scenario.expectedBehavior}`);

    return scenario;
  }

  /**
   * 重置所有覆盖，回到原始值
   */
  resetAll(): void {
    this.overrides.moodScore = null;
    this.overrides.socialWillingnessScore = null;
    this.overrides.solitudePreference = null;
    this.overrides.riskLevel = null;
    this.activeScenarioId = null;
    console.log('[StateOverride] 🔄 所有覆盖已重置');
  }

  // ==========================================================================
  // 查询方法
  // ==========================================================================

  /** 获取当前生效的情绪评分（覆盖值优先） */
  getMoodScore(actualScore: number): number {
    return this.enabled ? (this.overrides.moodScore ?? actualScore) : actualScore;
  }

  /** 获取当前生效的社交意愿评分（覆盖值优先） */
  getSocialWillingnessScore(actualScore: number): number {
    return this.enabled ? (this.overrides.socialWillingnessScore ?? actualScore) : actualScore;
  }

  /** 获取独处意愿 */
  isSolitudePreferred(actualValue: boolean): boolean {
    return this.enabled ? (this.overrides.solitudePreference ?? actualValue) : actualValue;
  }

  /** 是否有任何覆盖生效 */
  hasOverrides(): boolean {
    return this.overrides.moodScore !== null ||
           this.overrides.socialWillingnessScore !== null ||
           this.overrides.solitudePreference !== null;
  }

  /** 计算当前覆盖状态下的九宫格象限 */
  getCurrentQuadrant(): GridQuadrant {
    const moodScore = this.overrides.moodScore ?? this.originalValues.moodScore;
    const socialScore = this.overrides.socialWillingnessScore ?? this.originalValues.socialWillingnessScore;

    const moodTier: MoodTier = moodScore < MOOD_THRESHOLD_LOW
      ? MoodTier.LOW : moodScore > MOOD_THRESHOLD_HIGH
        ? MoodTier.HIGH : MoodTier.MEDIUM;

    const socialTier: SocialWillingnessTier = socialScore < SOCIAL_THRESHOLD_LOW
      ? SocialWillingnessTier.LOW : socialScore > SOCIAL_THRESHOLD_HIGH
        ? SocialWillingnessTier.HIGH : SocialWillingnessTier.MEDIUM;

    return `${moodTier}_${socialTier}` as GridQuadrant;
  }

  /** 获取覆盖日志 */
  getOverrideLogs(): StateOverrideLog[] {
    return [...this.overrideLogs];
  }

  /** 获取当前覆盖状态摘要 */
  getOverrideSummary(): {
    moodOverridden: boolean;
    socialOverridden: boolean;
    solitudeOverridden: boolean;
    activeScenario: string | null;
    currentQuadrant: GridQuadrant;
    quadrantNumber: number;
  } {
    const quadrant = this.getCurrentQuadrant();
    const moodTier = quadrant.split('_')[0] as MoodTier;
    const socialTier = quadrant.split('_')[1] as SocialWillingnessTier;
    const cell = GRID_MATRIX[moodTier][socialTier];

    return {
      moodOverridden: this.overrides.moodScore !== null,
      socialOverridden: this.overrides.socialWillingnessScore !== null,
      solitudeOverridden: this.overrides.solitudePreference !== null,
      activeScenario: this.activeScenarioId,
      currentQuadrant: quadrant,
      quadrantNumber: cell.quadrantNumber,
    };
  }

  /** 设置原始值（由外部在快照生成时调用） */
  setOriginalValues(mood: number, social: number, solitude: boolean, risk: string): void {
    this.originalValues.moodScore = mood;
    this.originalValues.socialWillingnessScore = social;
    this.originalValues.solitudePreference = solitude;
    this.originalValues.riskLevel = risk;
  }

  /** 获取所有可用 Demo 场景 */
  getAvailableScenarios(): DemoScenario[] {
    return DEMO_SCENARIOS;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  // ==========================================================================
  // 私有方法
  // ==========================================================================

  private createOverrideLog(
    field: string,
    newValue: number | boolean | string,
    previousValue: number | boolean | string,
    previousQuadrant: GridQuadrant,
    newQuadrant: GridQuadrant,
    reason: string,
  ): StateOverrideLog {
    const prevMood = previousQuadrant.split('_')[0] as MoodTier;
    const prevSocial = previousQuadrant.split('_')[1] as SocialWillingnessTier;
    const newMood = newQuadrant.split('_')[0] as MoodTier;
    const newSocial = newQuadrant.split('_')[1] as SocialWillingnessTier;

    return {
      request: {
        requestId: `override_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        field: field as any,
        value: newValue,
        timestamp: Date.now(),
        reason,
      },
      previousValue,
      decisionChange: {
        before: {
          quadrant: previousQuadrant,
          primaryAction: GRID_MATRIX[prevMood][prevSocial].description,
        },
        after: {
          quadrant: newQuadrant,
          primaryAction: GRID_MATRIX[newMood][newSocial].description,
        },
      },
      timestamp: Date.now(),
    };
  }
}
