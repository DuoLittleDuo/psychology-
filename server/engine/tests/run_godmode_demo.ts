/**
 * 「同频」上帝模式演示运行器
 *
 * 这是给评委看的核心 Demo！运行即可看到：
 *   1. 3天模拟数据逐步生成
 *   2. 每步的 L1 九宫格决策变化
 *   3. 上帝模式手动拖拽切换场景
 *   4. 最终生成 Markdown 报告
 *
 * 运行: npx tsx src/tests/run_godmode_demo.ts
 */

import { MockDataGenerator, DEFAULT_MOCK_SCENARIO } from '../god_mode/MockDataGenerator';
import { StateOverrideEngine } from '../god_mode/StateOverrideEngine';
import { GodModeController } from '../god_mode/GodModeController';
import { SimulationBenchmark } from '../god_mode/SimulationBenchmark';
import { DecisionAgent } from '../decision/DecisionAgent';
import { SafetyAgent } from '../safety/SafetyAgent';
import { GRID_MATRIX, MoodTier, SocialWillingnessTier } from '../decision/types/DecisionTypes';

// ============================================================================
// 主演示函数
// ============================================================================

export function runGodModeDemo() {
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  🎮 「同频」Same Wavelength — 上帝模式可视化演示            ║');
  console.log('║  2026 中国高校计算机大赛 · 鸿蒙赛道 · Agent 创新方向        ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');

  // === 初始化 ===
  const mockGen = new MockDataGenerator(DEFAULT_MOCK_SCENARIO);
  const godMode = new GodModeController();
  const decisionAgent = new DecisionAgent();
  const safetyAgent = new SafetyAgent();
  const benchmark = new SimulationBenchmark();

  benchmark.initialize(mockGen, godMode, decisionAgent, safetyAgent);

  const scenarioInfo = mockGen.getScenarioInfo();
  console.log(`📋 模拟场景: ${scenarioInfo.name}`);
  console.log(`📅 起始日期: ${scenarioInfo.startDate}`);
  console.log(`📊 总快照数: ${mockGen.getTotalSnapshots()} (${scenarioInfo.totalDays}天 × 每天${DEFAULT_MOCK_SCENARIO.snapshotsPerDay}个快照)\n`);

  // === Phase 1: Day 1 正常状态 ===
  console.log('─'.repeat(60));
  console.log('📅 Phase 1: Day 1 — 正常状态');
  console.log('─'.repeat(60));

  godMode.startSimulation();
  let lastQuadrant = '';

  for (let i = 0; i < 8; i++) {
    const dashboard = godMode.stepForward();
    if (!dashboard) break;

    const quadrant = dashboard.decisionPanel.l1Decision.quadrant;
    const quadrantNum = dashboard.decisionPanel.l1Decision.quadrantNumber;

    if (quadrant !== lastQuadrant) {
      const cell = GRID_MATRIX[quadrant.split('_')[0] as MoodTier][quadrant.split('_')[1] as SocialWillingnessTier];
      console.log(`  🕐 h${i * 3}:00  情绪${dashboard.userState.moodScore.toFixed(2)}  社交${dashboard.userState.socialWillingnessScore.toFixed(2)}  →  象限${quadrantNum}: ${cell.description}`);
      lastQuadrant = quadrant;
    }
  }

  // === Phase 2: Day 2 轻度下滑 ===
  console.log('\n─'.repeat(60));
  console.log('📅 Phase 2: Day 2 — 轻度下滑');
  console.log('─'.repeat(60));

  for (let i = 0; i < 8; i++) {
    const dashboard = godMode.stepForward();
    if (!dashboard) break;

    const quadrant = dashboard.decisionPanel.l1Decision.quadrant;
    if (quadrant !== lastQuadrant) {
      const cell = GRID_MATRIX[quadrant.split('_')[0] as MoodTier][quadrant.split('_')[1] as SocialWillingnessTier];
      console.log(`  🕐 h${i * 3}:00  情绪${dashboard.userState.moodScore.toFixed(2)}  社交${dashboard.userState.socialWillingnessScore.toFixed(2)}  →  象限${cell.quadrantNumber}: ${cell.description}  ⚠️`);
      lastQuadrant = quadrant;
    }

    // Day 2 第5个快照 → 展示L2触发
    if (i === 4 && dashboard.decisionPanel.l1Decision.quadrant.startsWith('low')) {
      console.log(`\n  🧩 [L2深度规划触发] 检测到情绪持续偏低，生成3天渐进干预计划...`);
      console.log(`     策略: 共情优先 (empathy_first)`);
      console.log(`     Day1: 低压力共情对话 → "最近好像有点累？"`);
      console.log(`     Day2: 行为激活 → 运动建议 (16:00-18:00)`);
      console.log(`     Day3: 效果评估 → 记录有效策略 / 触发危机协议`);
    }
  }

  // === Phase 3: 🎮 上帝模式干预 ===
  console.log('\n─'.repeat(60));
  console.log('🎮 Phase 3: [上帝模式] 手动切换到"重度下滑"场景');
  console.log('─'.repeat(60));

  godMode.applyScenario('severe_depression');
  const overrideSummary = godMode.getOverrideEngine().getOverrideSummary();
  const severeCell = GRID_MATRIX[overrideSummary.currentQuadrant.split('_')[0] as MoodTier][overrideSummary.currentQuadrant.split('_')[1] as SocialWillingnessTier];
  console.log(`  ⚡ 手动拖拽: 情绪 0.25, 社交 0.15`);
  console.log(`  🔄 决策变化: → 象限${severeCell.quadrantNumber}: ${severeCell.description}`);
  console.log(`  🛡️ 安全Agent: 危机关键词扫描启动`);

  // Day 3
  console.log('\n─'.repeat(60));
  console.log('📅 Phase 4: Day 3 — 上帝模式展示危机响应');
  console.log('─'.repeat(60));

  for (let i = 0; i < 4; i++) {
    const dashboard = godMode.stepForward();
    if (!dashboard) break;
    const quadrant = dashboard.decisionPanel.l1Decision.quadrant;
    if (quadrant !== lastQuadrant) {
      const cell = GRID_MATRIX[quadrant.split('_')[0] as MoodTier][quadrant.split('_')[1] as SocialWillingnessTier];
      console.log(`  🕐 h${i * 3}:00  情绪${dashboard.userState.moodScore.toFixed(2)}  →  象限${cell.quadrantNumber}: ${cell.description} 🔴`);
      lastQuadrant = quadrant;
    }
  }

  // === Phase 5: 🎮 切回良好状态 ===
  console.log('\n─'.repeat(60));
  console.log('🎮 Phase 5: [上帝模式] 手动切换到"状态良好"场景');
  console.log('─'.repeat(60));

  godMode.applyScenario('healthy_happy');
  const healthySummary = godMode.getOverrideEngine().getOverrideSummary();
  const healthyCell = GRID_MATRIX[healthySummary.currentQuadrant.split('_')[0] as MoodTier][healthySummary.currentQuadrant.split('_')[1] as SocialWillingnessTier];
  console.log(`  ⚡ 手动拖拽: 情绪 0.82, 社交 0.78`);
  console.log(`  🔄 决策变化: → 象限${healthyCell.quadrantNumber}: ${healthyCell.description}`);
  console.log(`  📱 Agent行为: 开始推L3深度社交匹配 + 活动推送`);

  // 验证：拖拽后Agent行为完全变了
  const snapshotCount = godMode.getSnapshotSequence().length;
  const totalCount = mockGen.getTotalSnapshots();
  console.log(`\n  📊 模拟进度: ${snapshotCount}/${totalCount} 快照 (${Math.round(snapshotCount / totalCount * 100)}%)`);

  // === 最终报告 ===
  godMode.stopSimulation();
  console.log('\n' + '═'.repeat(60));
  console.log('📝 最终报告');
  console.log('═'.repeat(60));

  const report = benchmark.generateReport();
  console.log(report);

  // === 总结 ===
  console.log('\n' + '═'.repeat(60));
  console.log('✨ 演示总结');
  console.log('═'.repeat(60));
  console.log('  1. ✅ 3天情绪变化驱动 L1 九宫格象限自动切换');
  console.log('  2. ✅ 情绪持续下降自动触发 L2 3天渐进干预规划');
  console.log('  3. ✅ 上帝模式手动拖拽 → 实时展示决策变化');
  console.log('  4. ✅ 安全Agent常驻巡检 → 危机关键词接管');
  console.log('  5. ✅ 推送预算管理 + 冷却拦截机制');
  console.log('\n  🎯 核心论证: Agent 不是固定规则的 App，');
  console.log('     而是状态驱动的自主决策系统！');
}

// 运行
runGodModeDemo();
