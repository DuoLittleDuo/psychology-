/**
 * 「同频」Same Wavelength — 上帝模式数据状态控制器
 *
 * 这是上帝模式的中央控制器，协调以下组件：
 *   1. MockDataGenerator — 模拟数据发生
 *   2. StateOverrideEngine — 手动状态覆盖
 *   3. PerceptionAgent — 感知快照
 *   4. DecisionAgent — L1/L2 决策
 *   5. MemoryAgent — 记忆召回
 *   6. SafetyAgent — 安全监控
 *
 * 核心功能：
 *   - 支持手动拖拽"情绪评分"与"社交意愿"
 *   - 实时观察并输出 L1 决策变化
 *   - 实时观察记忆召回结果
 *   - 实时观察 L2 动态生成的3天任务链
 *   - 实时观察安全Agent的拦截状态
 */

import { MockDataGenerator } from './MockDataGenerator';
import { StateOverrideEngine } from './StateOverrideEngine';
import { Snapshot } from '../perception/types/Snapshot';
import { GodModeDashboard, GodModeUserState, GodModeMemoryPanel, GodModeDecisionPanel, GodModeSafetyPanel, GodModeTaskChain, GodModeIntervention, GodModeSimulationControl, GodModeEvent, GodModeEventType } from './types/GodModeTypes';
import { L1DecisionOutput, GridCellDecision, GRID_MATRIX, MoodTier, SocialWillingnessTier } from '../decision/types/DecisionTypes';
import { TaskChain, TaskNodeStatus } from '../decision/types/TaskNode';
import { DecisionAgent } from '../decision/DecisionAgent';
import { SafetyAgent } from '../safety/SafetyAgent';
import { MemoryAgent } from '../memory/MemoryAgent';
import { MOOD_THRESHOLD_LOW, MOOD_THRESHOLD_HIGH, SOCIAL_THRESHOLD_LOW, SOCIAL_THRESHOLD_HIGH } from '../core/Config';

// ============================================================================
// 上帝模式控制器
// ============================================================================

export class GodModeController {
  /** 模拟数据发生器 */
  private mockGenerator: MockDataGenerator;

  /** 状态覆盖引擎 */
  private overrideEngine: StateOverrideEngine;

  /** 决策Agent引用 */
  private decisionAgent: DecisionAgent | null = null;

  /** 安全Agent引用 */
  private safetyAgent: SafetyAgent | null = null;

  /** 记忆Agent引用 */
  private memoryAgent: MemoryAgent | null = null;

  /** 事件日志 */
  private eventLog: GodModeEvent[] = [];

  /** 当前面板数据 */
  private dashboard: GodModeDashboard | null = null;

  /** 是否激活 */
  private active: boolean = false;

  /** 模拟是否暂停 */
  private paused: boolean = false;

  /** 快照序列（按模拟时间排序） */
  private snapshotSequence: Snapshot[] = [];

  /** 当前的L1决策缓存 */
  private currentL1Decision: L1DecisionOutput | null = null;

  constructor() {
    this.mockGenerator = new MockDataGenerator();
    this.overrideEngine = new StateOverrideEngine();
  }

  // ==========================================================================
  // 依赖注入
  // ==========================================================================

  setDecisionAgent(agent: DecisionAgent): void {
    this.decisionAgent = agent;
  }

  setSafetyAgent(agent: SafetyAgent): void {
    this.safetyAgent = agent;
  }

  setMemoryAgent(agent: MemoryAgent): void {
    this.memoryAgent = agent;
  }

  // ==========================================================================
  // 模拟控制
  // ==========================================================================

  /** 启动模拟 */
  startSimulation(): void {
    this.active = true;
    this.paused = false;
    this.mockGenerator.reset();
    this.snapshotSequence = [];
    this.eventLog = [];

    this.logEvent(GodModeEventType.SYSTEM_EVENT, '模拟启动', 'GodModeController', {
      scenario: this.mockGenerator.getScenarioInfo().name,
    });

    // 生成初始快照作为Day 0基线
    const initialSnapshot = this.mockGenerator.generateNextSnapshot();
    this.snapshotSequence.push(initialSnapshot);
    this.overrideEngine.setOriginalValues(
      initialSnapshot.mood.overallScore,
      initialSnapshot.socialWillingness.overallScore,
      initialSnapshot.socialWillingness.solitudePreference,
      'green',
    );

    this.refreshDashboard();
  }

  /** 前进一个快照（约3小时模拟时间） */
  stepForward(): GodModeDashboard | null {
    if (!this.active || this.paused) return null;
    if (!this.mockGenerator.hasMore()) {
      this.logEvent(GodModeEventType.SYSTEM_EVENT, '模拟完成：所有3天数据已生成', 'GodModeController', {});
      this.active = false;
      return this.dashboard;
    }

    // 获取覆盖值
    const overrideMood = this.overrideEngine.getMoodScore(0);
    const overrideSocial = this.overrideEngine.getSocialWillingnessScore(0);
    const overrideSolitude = this.overrideEngine.isSolitudePreferred(false);

    // 生成下一个快照
    const snapshot = this.mockGenerator.generateNextSnapshot(
      undefined as any,
      this.overrideEngine.hasOverrides() ? overrideMood : undefined,
      this.overrideEngine.hasOverrides() ? overrideSocial : undefined,
      this.overrideEngine.hasOverrides() ? overrideSolitude : undefined,
    );

    this.snapshotSequence.push(snapshot);

    // 更新原始值
    this.overrideEngine.setOriginalValues(
      snapshot.mood.overallScore,
      snapshot.socialWillingness.overallScore,
      snapshot.socialWillingness.solitudePreference,
      'green',
    );

    // 执行L1决策
    if (this.decisionAgent) {
      this.currentL1Decision = this.decisionAgent.executeL1Decision(snapshot);

      this.logEvent(GodModeEventType.L1_DECISION, `L1决策: 象限${this.currentL1Decision.quadrant}`, 'DecisionAgent', {
        quadrant: this.currentL1Decision.quadrant,
        primaryAction: this.currentL1Decision.primaryAction,
        needsDeepPlanning: this.currentL1Decision.needsDeepPlanning,
      });

      // 如果需要L2
      if (this.currentL1Decision.needsDeepPlanning) {
        this.logEvent(GodModeEventType.L2_PLANNING, `L2深度规划触发: ${this.currentL1Decision.deepPlanningReason}`, 'DecisionAgent', {
          reason: this.currentL1Decision.deepPlanningReason,
        });
      }
    }

    // 检查安全状态
    if (this.safetyAgent) {
      const patrolStatus = this.safetyAgent.getPatrolStatus();
      if (patrolStatus.safetyOverride) {
        this.logEvent(GodModeEventType.SAFETY_INTERCEPT, '安全Agent接管中', 'SafetyAgent', {
          reason: patrolStatus.overrideReason,
        });
      }
    }

    // 刷新面板
    this.refreshDashboard();

    this.logEvent(GodModeEventType.SNAPSHOT_GENERATED, `快照 ${snapshot.id}`, 'PerceptionAgent', {
      snapshotId: snapshot.id,
      moodScore: snapshot.mood.overallScore,
      socialScore: snapshot.socialWillingness.overallScore,
    });

    return this.dashboard;
  }

  /** 自动运行全部模拟（一次性生成所有快照） */
  runFullSimulation(): GodModeDashboard {
    this.startSimulation();

    while (this.mockGenerator.hasMore() && this.active) {
      this.stepForward();
    }

    return this.dashboard!;
  }

  /** 暂停/恢复模拟 */
  togglePause(): void {
    this.paused = !this.paused;
    this.logEvent(GodModeEventType.SYSTEM_EVENT,
      this.paused ? '模拟已暂停' : '模拟已恢复',
      'GodModeController', {});
  }

  /** 停止模拟 */
  stopSimulation(): void {
    this.active = false;
    this.logEvent(GodModeEventType.SYSTEM_EVENT, '模拟已停止', 'GodModeController', {
      totalSnapshots: this.snapshotSequence.length,
    });
  }

  // ==========================================================================
  // 手动干预（上帝模式拖拽）
  // ==========================================================================

  /** 拖拽情绪评分 */
  dragMoodScore(score: number): GodModeDashboard {
    const log = this.overrideEngine.setMoodScore(score);
    this.logEvent(GodModeEventType.STATE_OVERRIDE, `情绪评分手动覆盖: ${this.currentL1Decision?.quadrant} → ${log.decisionChange.after.quadrant}`, 'GodModeController', {
      beforeQuadrant: log.decisionChange.before.quadrant,
      afterQuadrant: log.decisionChange.after.quadrant,
      beforeAction: log.decisionChange.before.primaryAction,
      afterAction: log.decisionChange.after.primaryAction,
    });

    this.refreshDashboard();
    return this.dashboard!;
  }

  /** 拖拽社交意愿评分 */
  dragSocialScore(score: number): GodModeDashboard {
    const log = this.overrideEngine.setSocialWillingnessScore(score);
    this.logEvent(GodModeEventType.STATE_OVERRIDE, `社交意愿手动覆盖`, 'GodModeController', {
      beforeQuadrant: log.decisionChange.before.quadrant,
      afterQuadrant: log.decisionChange.after.quadrant,
    });

    this.refreshDashboard();
    return this.dashboard!;
  }

  /** 切换独处意愿 */
  toggleSolitude(): GodModeDashboard {
    const log = this.overrideEngine.toggleSolitudePreference();
    this.logEvent(GodModeEventType.STATE_OVERRIDE, `独处意愿切换`, 'GodModeController', {
      newValue: this.overrideEngine.isSolitudePreferred(false),
    });

    this.refreshDashboard();
    return this.dashboard!;
  }

  /** 一键切换预置场景 */
  applyScenario(scenarioId: string): GodModeDashboard {
    const scenario = this.overrideEngine.applyDemoScenario(scenarioId);
    if (scenario) {
      this.logEvent(GodModeEventType.STATE_OVERRIDE, `预置场景: ${scenario.name}`, 'GodModeController', {
        scenarioId,
        expectedBehavior: scenario.expectedBehavior,
      });
    }
    this.refreshDashboard();
    return this.dashboard!;
  }

  // ==========================================================================
  // 面板刷新
  // ==========================================================================

  /**
   * 刷新上帝模式可视化面板
   *
   * 这是上帝模式的核心输出 —— 汇总所有Agent的实时状态到一个面板。
   */
  refreshDashboard(): GodModeDashboard {
    const latestSnapshot = this.snapshotSequence[this.snapshotSequence.length - 1];
    const overrideSummary = this.overrideEngine.getOverrideSummary();

    // ---- 用户状态 ----
    const userState: GodModeUserState = {
      moodScore: latestSnapshot?.mood.overallScore ?? 0.5,
      moodOverridden: overrideSummary.moodOverridden,
      socialWillingnessScore: latestSnapshot?.socialWillingness.overallScore ?? 0.5,
      socialWillingnessOverridden: overrideSummary.socialOverridden,
      riskLevel: this.computeRiskLevel(latestSnapshot),
      latestSnapshotSummary: latestSnapshot
        ? `情绪${latestSnapshot.mood.overallScore.toFixed(2)} 社交${latestSnapshot.socialWillingness.overallScore.toFixed(2)}`
        : '无数据',
      moodTrend: this.snapshotSequence.slice(-24).map(s => ({
        date: new Date(s.timestamp).toISOString().split('T')[0],
        score: s.mood.overallScore,
        overridden: s.isManualOverride,
      })),
    };

    // ---- 记忆召回 ----
    const memoryPanel: GodModeMemoryPanel = {
      shortTermSummary: this.buildShortTermSummary(),
      recalledLongTermMemories: this.buildRecalledMemories(),
      activeConstraints: this.buildActiveConstraints(),
      lastQuery: null,
    };

    // ---- 决策过程 ----
    const decisionPanel: GodModeDecisionPanel = {
      l1Decision: {
        quadrant: overrideSummary.currentQuadrant,
        quadrantNumber: overrideSummary.quadrantNumber,
        description: this.currentL1Decision?.primaryAction ?? GRID_MATRIX[
          overrideSummary.currentQuadrant.split('_')[0] as MoodTier
        ][
          overrideSummary.currentQuadrant.split('_')[1] as SocialWillingnessTier
        ].description,
        primaryAction: this.currentL1Decision?.primaryAction ?? '无',
        lastDecisionTime: this.currentL1Decision?.timestamp ?? 0,
      },
      l2Planning: {
        hasActiveChain: this.currentL1Decision?.needsDeepPlanning ?? false,
        activeChains: [],
        recentChains: [],
      },
      recentInterventions: [],
    };

    // ---- 安全监控 ----
    const safetyPanel: GodModeSafetyPanel = {
      status: this.safetyAgent?.getPatrolStatus()?.safetyOverride
        ? '🔴 接管' : '🟢 运行中',
      pushBudget: this.safetyAgent
        ? `${this.safetyAgent.getPushBudget().usedPushes}/${this.safetyAgent.getPushBudget().maxPushes}`
        : '0/5',
      activeCooldowns: this.safetyAgent
        ? this.safetyAgent.getActiveCooldowns().map(c => `${c.interventionType}(${c.consecutiveRejections}次拒绝)`)
        : [],
      recentIntercepts: [],
      crisisProtocol: this.safetyAgent?.getPatrolStatus()?.activeCrisisProtocol ?? '无活跃协议',
    };

    // ---- 模拟控制 ----
    const simulationControl: GodModeSimulationControl = {
      simulationActive: this.active,
      simulationDay: Math.ceil(this.snapshotSequence.length / this.mockGenerator['scenario'].snapshotsPerDay),
      availableActions: [
        { id: 'drag_mood', name: '拖拽情绪评分', description: '手动调整情绪评分滑块 0.0-1.0', category: 'mood' },
        { id: 'drag_social', name: '拖拽社交意愿', description: '手动调整社交意愿滑块 0.0-1.0', category: 'social' },
        { id: 'toggle_solitude', name: '切换独处意愿', description: '标记/取消用户想独处', category: 'mood' },
        { id: 'scenario_healthy', name: '场景: 状态良好', description: '一键切换到😊情绪高涨状态', category: 'mood' },
        { id: 'scenario_mild', name: '场景: 轻度低落', description: '一键切换到😔轻度下滑状态', category: 'mood' },
        { id: 'scenario_severe', name: '场景: 重度下滑', description: '一键切换到🔴危机边缘状态', category: 'safety' },
        { id: 'scenario_solitude', name: '场景: 想独处', description: '一键切换到🧘情绪高但不想社交', category: 'social' },
      ],
      status: this.paused ? 'paused' : 'running',
    };

    this.dashboard = {
      version: '2.0-god-mode',
      generatedAt: Date.now(),
      userState,
      memoryPanel,
      decisionPanel,
      safetyPanel,
      simulationControl,
      eventLog: this.eventLog.slice(-50), // 最近50条
    };

    return this.dashboard;
  }

  // ==========================================================================
  // 查询方法
  // ==========================================================================

  getDashboard(): GodModeDashboard | null {
    return this.dashboard;
  }

  getEventLog(): GodModeEvent[] {
    return [...this.eventLog];
  }

  getSnapshotSequence(): Snapshot[] {
    return [...this.snapshotSequence];
  }

  getOverrideEngine(): StateOverrideEngine {
    return this.overrideEngine;
  }

  getMockGenerator(): MockDataGenerator {
    return this.mockGenerator;
  }

  isActive(): boolean {
    return this.active;
  }

  // ==========================================================================
  // 私有方法
  // ==========================================================================

  private logEvent(
    type: GodModeEventType,
    description: string,
    sourceAgent: string,
    data: Record<string, unknown>,
  ): void {
    this.eventLog.push({
      id: `gm_evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now(),
      simulationDay: Math.ceil(this.snapshotSequence.length / this.mockGenerator['scenario'].snapshotsPerDay),
      type,
      description,
      sourceAgent,
      data,
    });

    // 限制日志大小
    if (this.eventLog.length > 500) {
      this.eventLog = this.eventLog.slice(-200);
    }
  }

  private computeRiskLevel(snapshot?: Snapshot): 'green' | 'yellow' | 'orange' | 'red' {
    if (!snapshot) return 'green';
    const mood = snapshot.mood.overallScore;
    if (mood < 0.3) return 'red';
    if (mood < 0.45) return 'orange';
    if (mood < 0.6) return 'yellow';
    return 'green';
  }

  private buildShortTermSummary(): string {
    if (this.snapshotSequence.length < 2) return '数据不足';
    const recent = this.snapshotSequence.slice(-3);
    const moods = recent.map(s => s.mood.overallScore);
    const trend = moods[moods.length - 1] > moods[0] ? '↑回升' : '↓下降';
    return `最近情绪趋势: ${trend} (${moods.map(m => m.toFixed(2)).join(' → ')})`;
  }

  private buildRecalledMemories(): any[] {
    // 从覆盖引擎日志推断"被召回的长期记忆"
    const memories: any[] = [];
    const logs = this.overrideEngine.getOverrideLogs();
    if (logs.length > 0) {
      memories.push({
        id: 'demo_personality',
        content: '用户人格: 偏内向(0.65), 偏好1v1',
        source: 'long_term',
        relevanceScore: 0.82,
        timestamp: Date.now(),
        usedInDecision: true,
      });
      memories.push({
        id: 'demo_constraint',
        content: '硬约束: 21:00后不推送',
        source: 'long_term',
        relevanceScore: 0.75,
        timestamp: Date.now(),
        usedInDecision: true,
      });
    }
    return memories;
  }

  private buildActiveConstraints(): string[] {
    return this.safetyAgent
      ? this.safetyAgent.getActiveCooldowns().map(c =>
          `${c.interventionType}: ${c.consecutiveRejections}次拒绝, ` +
          `剩余${Math.ceil((c.endsAt - Date.now()) / 3600000)}h`
        )
      : [];
  }
}
