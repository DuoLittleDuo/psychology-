/**
 * 「同频」Same Wavelength — 模拟基准测试运行器
 *
 * 可执行的模拟系统（Simulation Benchmark）。
 * 用途：在初赛/复赛答辩中向评委展示 Agent 的完整决策链路。
 *
 * 功能：
 *   1. 运行完整3天模拟，输出每一步的状态变化
 *   2. 支持手动注入事件（模拟用户语音唤醒、点击推送等）
 *   3. 输出详细的决策追踪日志（Decision Trail）
 *   4. 生成模拟报告（Markdown 格式，可直接用于演示）
 *
 * 使用示例：
 *   const benchmark = new SimulationBenchmark();
 *   benchmark.initialize(mockGen, godModeCtrl, decisionAgent, safetyAgent);
 *   const report = benchmark.runFullBenchmark();
 *   console.log(benchmark.generateReport());
 */

import { MockDataGenerator } from './MockDataGenerator';
import { GodModeController } from './GodModeController';
import { StateOverrideEngine } from './StateOverrideEngine';
import { DecisionAgent } from '../decision/DecisionAgent';
import { SafetyAgent } from '../safety/SafetyAgent';
import { GodModeDashboard, GodModeEvent, GodModeEventType, DEMO_SCENARIOS } from './types/GodModeTypes';
import { Snapshot } from '../perception/types/Snapshot';
import { GRID_MATRIX, MoodTier, SocialWillingnessTier } from '../decision/types/DecisionTypes';
import { L1DecisionOutput } from '../decision/types/DecisionTypes';

// ============================================================================
// 基准测试运行器
// ============================================================================

export class SimulationBenchmark {
  private mockGen!: MockDataGenerator;
  private godMode!: GodModeController;
  private decisionAgent!: DecisionAgent;
  private safetyAgent!: SafetyAgent;
  private initialized = false;

  /** 决策追踪记录 */
  private decisionTrail: DecisionTrailEntry[] = [];

  /** 象限切换事件 */
  private quadrantSwitches: QuadrantSwitchEvent[] = [];

  // ==========================================================================
  // 初始化
  // ==========================================================================

  initialize(
    mockGen: MockDataGenerator,
    godMode: GodModeController,
    decisionAgent: DecisionAgent,
    safetyAgent: SafetyAgent,
  ): void {
    this.mockGen = mockGen;
    this.godMode = godMode;
    this.decisionAgent = decisionAgent;
    this.safetyAgent = safetyAgent;
    this.initialized = true;

    // 注入依赖
    this.godMode.setDecisionAgent(decisionAgent);
    this.godMode.setSafetyAgent(safetyAgent);
  }

  // ==========================================================================
  // 完整基准测试
  // ==========================================================================

  /**
   * 运行完整3天模拟基准测试
   *
   * 流程：
   *   1. 启动模拟
   *   2. 逐步推进（24步 = 8快照/天 × 3天）
   *   3. 在关键点手动切换预置场景（展示决策变化）
   *   4. 收集所有决策追踪数据
   *   5. 生成最终报告
   */
  runFullBenchmark(): SimulationReport {
    if (!this.initialized) throw new Error('请先调用 initialize()');

    console.log('═══════════════════════════════════════════');
    console.log('  🎮 「同频」上帝模式 - 模拟基准测试');
    console.log('  场景: ' + this.mockGen.getScenarioInfo().name);
    console.log('═══════════════════════════════════════════\n');

    this.decisionTrail = [];
    this.quadrantSwitches = [];
    let previousQuadrant = '';

    // Phase 1: 正常状态 (Day 1, 前8个快照)
    console.log('📅 Day 1: 正常状态 — 模拟用户日常行为');
    this.godMode.startSimulation();

    for (let i = 0; i < 8; i++) {
      const dashboard = this.godMode.stepForward();
      if (!dashboard) break;
      this.recordDecisionTrail(dashboard);
      const currentQuadrant = dashboard.decisionPanel.l1Decision.quadrant;
      if (i > 0 && currentQuadrant !== previousQuadrant) {
        this.recordQuadrantSwitch(previousQuadrant, currentQuadrant, dashboard);
      }
      previousQuadrant = currentQuadrant;
    }

    // Phase 2: 轻度下滑 (Day 2)
    console.log('\n📅 Day 2: 轻度下滑 — 睡眠质量下降，社交退缩');
    for (let i = 0; i < 8; i++) {
      const dashboard = this.godMode.stepForward();
      if (!dashboard) break;
      this.recordDecisionTrail(dashboard);
      const currentQuadrant = dashboard.decisionPanel.l1Decision.quadrant;
      if (currentQuadrant !== previousQuadrant) {
        this.recordQuadrantSwitch(previousQuadrant, currentQuadrant, dashboard);
      }
      previousQuadrant = currentQuadrant;
    }

    // Phase 3: 上帝模式干预 — 展示决策变化
    console.log('\n🎮 [上帝模式] 手动切换到"重度下滑"场景...');
    this.godMode.applyScenario('severe_depression');
    const severeDashboard = this.godMode.getDashboard()!;
    this.recordDecisionTrail(severeDashboard, true);

    console.log('   ✅ 决策已切换:', severeDashboard.decisionPanel.l1Decision.description);

    // 继续 Day 3
    console.log('\n📅 Day 3: 持续恶化 — 上帝模式展示危机响应');
    for (let i = 0; i < 8; i++) {
      const dashboard = this.godMode.stepForward();
      if (!dashboard) break;
      this.recordDecisionTrail(dashboard);
      const currentQuadrant = dashboard.decisionPanel.l1Decision.quadrant;
      if (currentQuadrant !== previousQuadrant) {
        this.recordQuadrantSwitch(previousQuadrant, currentQuadrant, dashboard);
      }
      previousQuadrant = currentQuadrant;
    }

    // Phase 4: 上帝模式展示 — 拖拽到良好状态
    console.log('\n🎮 [上帝模式] 手动切换到"状态良好"场景...');
    this.godMode.applyScenario('healthy_happy');
    const healthyDashboard = this.godMode.getDashboard()!;
    this.recordDecisionTrail(healthyDashboard, true);
    console.log('   ✅ 决策已切换:', healthyDashboard.decisionPanel.l1Decision.description);

    // 再推2步看Agent行为
    this.godMode.stepForward();
    this.godMode.stepForward();

    this.godMode.stopSimulation();

    // 生成报告
    return this.generateSimulationReport();
  }

  // ==========================================================================
  // 交互式演示
  // ==========================================================================

  /**
   * 运行交互式演示模式（适合现场答辩）
   *
   * 每推进一步后暂停，等待手动操作。
   */
  runInteractiveDemo(): {
    dashboard: GodModeDashboard;
    canContinue: boolean;
    actions: string[];
  } {
    if (!this.initialized) throw new Error('请先调用 initialize()');

    if (!this.godMode.isActive()) {
      this.godMode.startSimulation();
    }

    const hasMore = this.mockGen.hasMore();
    let dashboard: GodModeDashboard | null = null;

    if (hasMore) {
      dashboard = this.godMode.stepForward();
    }

    const scenarioInfo = this.mockGen.getScenarioInfo();
    const currentDay = Math.min(
      scenarioInfo.totalDays,
      Math.ceil((this.godMode.getSnapshotSequence().length) / 8),
    );

    const actions: string[] = [];
    actions.push('拖拽情绪评分 (0.0-1.0)');
    actions.push('拖拽社交意愿 (0.0-1.0)');
    actions.push('切换独处意愿');
    actions.push(`预置场景: 😊 状态良好 / 😔 轻度低落 / 🔴 重度下滑 / 🧘 想独处`);
    if (!hasMore) actions.push('⚠️ 模拟已完成，可继续拖拽查看决策变化');

    return {
      dashboard: dashboard ?? this.godMode.getDashboard()!,
      canContinue: hasMore,
      actions,
    };
  }

  // ==========================================================================
  // 报告生成
  // ==========================================================================

  /**
   * 生成模拟报告（Markdown格式，可直接用于答辩演示）
   */
  generateReport(): string {
    const report = this.generateSimulationReport();
    return this.formatReport(report);
  }

  private generateSimulationReport(): SimulationReport {
    const snapshots = this.godMode.getSnapshotSequence();
    const dashboard = this.godMode.getDashboard();
    const overrideLogs = this.godMode.getOverrideEngine().getOverrideLogs();
    const scenarioInfo = this.mockGen.getScenarioInfo();

    // 计算关键指标
    const moodScores = snapshots.map(s => s.mood.overallScore);
    const socialScores = snapshots.map(s => s.socialWillingness.overallScore);

    const avgMood = moodScores.length > 0
      ? moodScores.reduce((a, b) => a + b, 0) / moodScores.length
      : 0;

    const moodTrend = moodScores.length >= 2
      ? moodScores[moodScores.length - 1] - moodScores[0]
      : 0;

    const quadrantSwitches = this.quadrantSwitches.length;

    return {
      scenario: scenarioInfo.name,
      totalSnapshots: snapshots.length,
      simulationDays: scenarioInfo.totalDays,
      avgMood: Math.round(avgMood * 100) / 100,
      moodTrend: Math.round(moodTrend * 100) / 100,
      moodTrendLabel: moodTrend > 0.05 ? '改善' : moodTrend < -0.05 ? '恶化' : '持平',
      lowestMood: moodScores.length > 0 ? Math.min(...moodScores) : 0,
      highestMood: moodScores.length > 0 ? Math.max(...moodScores) : 0,
      quadrantSwitchCount: quadrantSwitches,
      manualOverrides: overrideLogs.length,
      decisionTrail: this.decisionTrail,
      quadrantSwitches: this.quadrantSwitches,
      finalDashboard: dashboard!,
    };
  }

  private formatReport(report: SimulationReport): string {
    const lines: string[] = [];

    lines.push('# 🎮 「同频」上帝模式 — 模拟基准测试报告');
    lines.push('');
    lines.push(`> 场景: **${report.scenario}**`);
    lines.push(`> 生成时间: ${new Date().toISOString()}`);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## 📊 核心指标');
    lines.push('');
    lines.push('| 指标 | 值 |');
    lines.push('|------|----|');
    lines.push(`| 总快照数 | ${report.totalSnapshots} |`);
    lines.push(`| 模拟天数 | ${report.simulationDays} |`);
    lines.push(`| 平均情绪评分 | ${report.avgMood} |`);
    lines.push(`| 情绪趋势 | ${report.moodTrendLabel} (${report.moodTrend > 0 ? '+' : ''}${report.moodTrend}) |`);
    lines.push(`| 最低情绪 | ${report.lowestMood} |`);
    lines.push(`| 最高情绪 | ${report.highestMood} |`);
    lines.push(`| 九宫格象限切换次数 | ${report.quadrantSwitchCount} |`);
    lines.push(`| 上帝模式手动干预次数 | ${report.manualOverrides} |`);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## 🔀 象限切换历史');
    lines.push('');

    if (report.quadrantSwitches.length === 0) {
      lines.push('> 无象限切换 — 模拟期间用户状态未跨越阈值');
    } else {
      lines.push('| 序号 | 切换前 | 切换后 | 触发原因 |');
      lines.push('|------|--------|--------|----------|');
      for (const sw of report.quadrantSwitches) {
        const beforeCell = GRID_MATRIX[sw.beforeQuadrant.split('_')[0] as MoodTier][sw.beforeQuadrant.split('_')[1] as SocialWillingnessTier];
        const afterCell = GRID_MATRIX[sw.afterQuadrant.split('_')[0] as MoodTier][sw.afterQuadrant.split('_')[1] as SocialWillingnessTier];
        lines.push(`| ${sw.index} | 象限${beforeCell.quadrantNumber} ${beforeCell.description} | 象限${afterCell.quadrantNumber} ${afterCell.description} | ${sw.trigger} |`);
      }
    }

    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## 📝 决策追踪（关键节点）');
    lines.push('');

    const keyTrails = report.decisionTrail.filter(t =>
      t.isManualOverride || t.quadrantNumber <= 3 // 低情绪象限
    );
    for (const trail of keyTrails) {
      const icon = trail.isManualOverride ? '🎮' : '🤖';
      lines.push(`- ${icon} **[Day ${trail.simulationDay}]** 情绪${trail.moodScore.toFixed(2)} 社交${trail.socialScore.toFixed(2)} → 象限${trail.quadrantNumber}: ${trail.primaryAction} ${trail.isManualOverride ? '*(手动覆盖)*' : ''}`);
    }

    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## 🛡️ 安全Agent状态');
    lines.push('');
    const safety = report.finalDashboard?.safetyPanel;
    if (safety) {
      lines.push(`- 运行状态: ${safety.status}`);
      lines.push(`- 推送预算: ${safety.pushBudget}`);
      lines.push(`- 活跃冷却: ${safety.activeCooldowns.length > 0 ? safety.activeCooldowns.join(', ') : '无'}`);
      lines.push(`- 危机协议: ${safety.crisisProtocol}`);
    }

    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('*报告由「同频」上帝模式 SimulationBenchmark 自动生成*');

    return lines.join('\n');
  }

  // ==========================================================================
  // 追踪记录
  // ==========================================================================

  private recordDecisionTrail(dashboard: GodModeDashboard, isManualOverride = false): void {
    this.decisionTrail.push({
      simulationDay: dashboard.simulationControl.simulationDay,
      timestamp: dashboard.generatedAt,
      quadrant: dashboard.decisionPanel.l1Decision.quadrant,
      quadrantNumber: dashboard.decisionPanel.l1Decision.quadrantNumber,
      moodScore: dashboard.userState.moodScore,
      socialScore: dashboard.userState.socialWillingnessScore,
      primaryAction: dashboard.decisionPanel.l1Decision.primaryAction,
      isManualOverride,
    });
  }

  private recordQuadrantSwitch(
    beforeQuadrant: string,
    afterQuadrant: string,
    dashboard: GodModeDashboard,
  ): void {
    this.quadrantSwitches.push({
      index: this.quadrantSwitches.length + 1,
      beforeQuadrant,
      afterQuadrant,
      trigger: dashboard.userState.moodOverridden || dashboard.userState.socialWillingnessOverridden
        ? '上帝模式手动覆盖'
        : '状态自然变化',
      timestamp: dashboard.generatedAt,
    });
  }
}

// ============================================================================
// 报告类型
// ============================================================================

interface DecisionTrailEntry {
  simulationDay: number;
  timestamp: number;
  quadrant: string;
  quadrantNumber: number;
  moodScore: number;
  socialScore: number;
  primaryAction: string;
  isManualOverride: boolean;
}

interface QuadrantSwitchEvent {
  index: number;
  beforeQuadrant: string;
  afterQuadrant: string;
  trigger: string;
  timestamp: number;
}

interface SimulationReport {
  scenario: string;
  totalSnapshots: number;
  simulationDays: number;
  avgMood: number;
  moodTrend: number;
  moodTrendLabel: string;
  lowestMood: number;
  highestMood: number;
  quadrantSwitchCount: number;
  manualOverrides: number;
  decisionTrail: DecisionTrailEntry[];
  quadrantSwitches: QuadrantSwitchEvent[];
  finalDashboard: GodModeDashboard;
}
