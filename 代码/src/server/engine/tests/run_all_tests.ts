/**
 * 「同频」全量测试入口
 *
 * 依次运行所有子系统测试，汇总结果。
 *
 * 运行: npx tsx src/tests/run_all_tests.ts
 */

import { runGodModeDemo } from './run_godmode_demo.js';

async function main() {
console.log('═══════════════════════════════════════════');
console.log('  🧪 「同频」全量测试套件');
console.log('═══════════════════════════════════════════\n');

let passed = 0;
let failed = 0;
const failures: string[] = [];

function test(name: string, fn: () => boolean | void) {
  try {
    const result = fn();
    if (result === false) throw new Error('断言失败');
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e: any) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
    failures.push(name);
  }
}

console.log('── 测试 1: L1 九宫格决策矩阵 ──\n');
{
  const { DecisionAgent } = await import('../decision/DecisionAgent.js');
  const { MockDataGenerator } = await import('../god_mode/MockDataGenerator.js');

  const agent = new DecisionAgent();
  const mockGen = new MockDataGenerator();
  mockGen.setNoiseEnabled(false); // 关闭噪声确保测试确定性
  const snapshots = mockGen.generateAll();

  test('L1 决策: Day1正常状态 → 象限5-8(中高情绪)', () => {
    const snap = snapshots[5]; // Day1 下午
    const decision = agent.executeL1Decision(snap);
    const isMidHigh = decision.quadrant.includes('medium') || decision.quadrant.includes('high');
    return isMidHigh;
  });

  test('L1 决策: Day3恶化 → 象限1-3(低情绪)', () => {
    const snap = snapshots[16]; // Day3 h0:00 (情绪基线0.35-0.08=0.27)
    const decision = agent.executeL1Decision(snap);
    return decision.quadrant.startsWith('low');
  });

  test('L1 决策: 独处意愿降级', () => {
    const snap = { ...snapshots[0] };
    snap.socialWillingness = { ...snap.socialWillingness, solitudePreference: true, overallScore: 0.5 };
    const decision = agent.executeL1Decision(snap);
    return decision.solitudeDowngrade === true;
  });

  test('L1 决策: L2触发判断(连续低情绪)', () => {
    for (let i = 0; i < 10; i++) {
      agent.executeL1Decision(snapshots[16]); // Day3 h0 情绪0.27 → 明确低情绪
    }
    const decision = agent.executeL1Decision(snapshots[16]);
    return decision.needsDeepPlanning === true;
  });
}

console.log('\n── 测试 2: 三层记忆系统 ──\n');
{
  const { MemoryRecallEngine } = await import('../memory/MemoryRecall.js');
  const { MemoryConsolidationEngine } = await import('../memory/MemoryConsolidation.js');
  const { MemoryAgent } = await import('../memory/MemoryAgent.js');

  const consolidation = new MemoryConsolidationEngine();

  test('记忆晋级: 3次以上重复模式检测', () => {
    // 4天情绪+社交持续下降，跨越周末
    const mockSummaries = [
      { kind: 'daily_summary' as const, date: '2026-07-16', moodAvg: 0.52, socialWillingnessAvg: 0.48, sleep: { totalHours: 6, qualityScore: 0.5 }, activity: { stepCount: 3500, outdoorMinutes: 15 }, screenUsage: { totalHours: 5, socialHours: 0.3, videoHours: 2, studyHours: 1.5, lateNightUsage: false }, highlights: [], interventionCounts: {}, socialInteractionCount: 0 },
      { kind: 'daily_summary' as const, date: '2026-07-17', moodAvg: 0.48, socialWillingnessAvg: 0.44, sleep: { totalHours: 5.5, qualityScore: 0.45 }, activity: { stepCount: 3000, outdoorMinutes: 10 }, screenUsage: { totalHours: 5.5, socialHours: 0.25, videoHours: 2.5, studyHours: 1.2, lateNightUsage: false }, highlights: [], interventionCounts: {}, socialInteractionCount: 0 },
      { kind: 'daily_summary' as const, date: '2026-07-18', moodAvg: 0.44, socialWillingnessAvg: 0.40, sleep: { totalHours: 5, qualityScore: 0.4 }, activity: { stepCount: 2500, outdoorMinutes: 5 }, screenUsage: { totalHours: 6, socialHours: 0.2, videoHours: 3, studyHours: 1, lateNightUsage: true }, highlights: [], interventionCounts: {}, socialInteractionCount: 0 },
      { kind: 'daily_summary' as const, date: '2026-07-19', moodAvg: 0.40, socialWillingnessAvg: 0.36, sleep: { totalHours: 4.8, qualityScore: 0.35 }, activity: { stepCount: 2000, outdoorMinutes: 0 }, screenUsage: { totalHours: 7, socialHours: 0.15, videoHours: 3.5, studyHours: 0.8, lateNightUsage: true }, highlights: [], interventionCounts: {}, socialInteractionCount: 0 },
      { kind: 'daily_summary' as const, date: '2026-07-20', moodAvg: 0.38, socialWillingnessAvg: 0.33, sleep: { totalHours: 4.5, qualityScore: 0.3 }, activity: { stepCount: 1800, outdoorMinutes: 0 }, screenUsage: { totalHours: 8, socialHours: 0.05, videoHours: 4, studyHours: 0.5, lateNightUsage: true }, highlights: [], interventionCounts: {}, socialInteractionCount: 0 },
    ];
    const candidates = consolidation.evaluatePromotions(mockSummaries as any, []);
    return candidates.length > 0; // 检测到4天连续社交意愿下降(0.48→0.33)
  });

  test('记忆衰减: >30天未访问降权', () => {
    const daysAgo = 60; // 60天确保衰减超过20%
    const oldEntry = {
      id: 'old_memory',
      type: 'long_term' as const,
      createdAt: Date.now() - daysAgo * 86400 * 1000,
      lastAccessedAt: Date.now() - daysAgo * 86400 * 1000,
      accessCount: 0,
      source: 'test',
      tags: [],
      importance: 0.5,
      decayRate: 0.01,
      decay: { initialWeight: 1.0, currentWeight: 1.0, lastConfirmedAt: Date.now() - daysAgo * 86400 * 1000, confirmationCount: 0, status: 'active' as const },
      content: { kind: 'personality' as const },
    };
    const candidates = consolidation.evaluateDecay([oldEntry as any]);
    return candidates.length > 0 && candidates[0].suggestedWeight < 1.0;
  });

  const recall = new MemoryRecallEngine();

  test('记忆召回: 标签过滤', () => {
    const shortTermStore = new Map();
    shortTermStore.set('test1', {
      id: 'test1', type: 'short_term', createdAt: Date.now(), lastAccessedAt: Date.now(),
      accessCount: 1, source: 'test', tags: ['mood', 'decline'], importance: 0.7, decayRate: 0.01,
      content: { kind: 'daily_summary', highlights: ['情绪偏低'] },
      expiresAt: Date.now() + 7 * 86400 * 10000,
    });
    const result = recall.recallAcrossLayers(
      { tags: ['mood'], limit: 10 },
      new Map(), shortTermStore, new Map(), null,
    );
    return result.entries.length > 0;
  });
}

console.log('\n── 测试 3: 安全监控系统 ──\n');
{
  const { DialogueGuard } = await import('../safety/DialogueGuard.js');
  const { PushBudgetGuard } = await import('../safety/PushBudgetGuard.js');
  const { CrisisEscalationManager } = await import('../safety/CrisisEscalation.js');
  const { SafetyEventType } = await import('../safety/types/SafetyTypes.js');
  const { CrisisLevel } = await import('../core/Config.js');

  const guard = new DialogueGuard();

  test('对话安全: L3危机关键词 → 立即中断', () => {
    const result = guard.scan('我真的想结束生命了', 0.45, []);
    return result.detectedLevel === CrisisLevel.CRISIS && result.shouldInterrupt === true;
  });

  test('对话安全: L2警惕关键词 + 低情绪 → 发起安全对话', () => {
    const result = guard.scan('我撑不住了，谁也帮不了我', 0.25, []);
    return result.detectedLevel !== null && result.shouldInitiateSafetyDialogue === true;
  });

  test('对话安全: 正常文本 → 无检测', () => {
    const result = guard.scan('今天天气真好，想去打球', 0.7, []);
    return result.detectedLevel === null && result.shouldInterrupt === false;
  });

  test('对话安全: L1关键词 + 情绪正常 → 标记但不中断', () => {
    const result = guard.scan('唉，感觉活得好累啊', 0.7, []);
    return result.detectedLevel === CrisisLevel.ATTENTION && result.shouldInterrupt === false;
  });

  const budgetGuard = new PushBudgetGuard();

  test('推送预算: 初始5次可用', () => {
    const result = budgetGuard.checkAll({
      timestamp: Date.now(), interventionType: 'exercise_suggestion',
      targetDevice: 'phone', decisionId: 'test', content: 'test'
    });
    return result.passed === true;
  });

  test('推送预算: 连续3次拒绝 → 触发冷却', () => {
    // 模拟3次拒绝
    budgetGuard.recordPush({ timestamp: Date.now() - 4000, interventionType: 'buddy_l2' as any, targetDevice: 'phone', decisionId: 'd1', content: 'test' });
    budgetGuard.recordFeedback(Date.now() - 4000, 'rejected');
    budgetGuard.recordPush({ timestamp: Date.now() - 3000, interventionType: 'buddy_l2' as any, targetDevice: 'phone', decisionId: 'd2', content: 'test' });
    budgetGuard.recordFeedback(Date.now() - 3000, 'rejected');
    budgetGuard.recordPush({ timestamp: Date.now() - 2000, interventionType: 'buddy_l2' as any, targetDevice: 'phone', decisionId: 'd3', content: 'test' });
    budgetGuard.recordFeedback(Date.now() - 2000, 'rejected');

    const result = budgetGuard.checkAll({
      timestamp: Date.now(), interventionType: 'buddy_l2',
      targetDevice: 'phone', decisionId: 'test2', content: 'test'
    });
    return result.passed === false; // 应该被拦截
  });

  const crisisManager = new CrisisEscalationManager();

  test('危机升级: 从一级开始', () => {
    const event = {
      id: 'test_crisis', timestamp: Date.now(), type: SafetyEventType.KEYWORD_HIT,
      level: CrisisLevel.CRISIS, description: '测试危机事件',
      trigger: '测试文本', actionTaken: 'interrupt_all' as any, resolved: false,
    };
    const state = crisisManager.activateCrisisProtocol(event);
    return state.currentStage === 'stage_1';
  });

  test('危机升级: 用户愿意倾诉 → 可进入二级', () => {
    const response = {
      timestamp: Date.now(),
      stage: 'stage_1' as any,
      willingToTalk: true,
      responseSummary: '用户表示最近压力很大',
      attitudeTowardHelp: 'open' as const,
      activelySeekingHelp: false,
    };
    const state = crisisManager.advanceStage(response);
    return state !== null && state.currentStage === 'stage_2';
  });
}

console.log('\n── 测试 4: 上帝模式模拟系统 ──\n');
{
  const { MockDataGenerator } = await import('../god_mode/MockDataGenerator.js');
  const { StateOverrideEngine } = await import('../god_mode/StateOverrideEngine.js');

  const mockGen = new MockDataGenerator();

  test('模拟数据: 生成完整3天数据(24快照)', () => {
    const snapshots = mockGen.generateAll();
    return snapshots.length === 24;
  });

  test('模拟数据: Day1情绪>Day3情绪(下降趋势)', () => {
    mockGen.reset();
    const snapshots = mockGen.generateAll();
    const day1Avg = snapshots.slice(0, 8).reduce((s, snap) => s + snap.mood.overallScore, 0) / 8;
    const day3Avg = snapshots.slice(16, 24).reduce((s, snap) => s + snap.mood.overallScore, 0) / 8;
    return day1Avg > day3Avg;
  });

  test('模拟数据: Day3检测到社交退缩异常标记', () => {
    mockGen.reset();
    const snapshots = mockGen.generateAll();
    const day3Snapshots = snapshots.slice(16, 24);
    return day3Snapshots.some(s =>
      s.behaviorTrend.anomalyFlags.includes('social_withdrawal' as any)
    );
  });

  const overrideEngine = new StateOverrideEngine();

  test('状态覆盖: 拖拽情绪→象限变化', () => {
    overrideEngine.setOriginalValues(0.7, 0.6, false, 'green');
    const log = overrideEngine.setMoodScore(0.25, '测试拖拽');
    return log.decisionChange.before.quadrant !== log.decisionChange.after.quadrant;
  });

  test('状态覆盖: 预置场景一键切换', () => {
    const scenario = overrideEngine.applyDemoScenario('healthy_happy');
    return scenario !== null && scenario.id === 'healthy_happy';
  });

  test('状态覆盖: 重置后回原始值', () => {
    overrideEngine.resetAll();
    return overrideEngine.hasOverrides() === false;
  });
}

// ============================================================================
// 汇总
// ============================================================================
console.log('\n' + '═'.repeat(60));
console.log('📊 测试汇总');
console.log('═'.repeat(60));
console.log(`  ✅ 通过: ${passed}`);
console.log(`  ❌ 失败: ${failed}`);
console.log(`  📈 通过率: ${Math.round(passed / (passed + failed) * 100)}%`);

if (failures.length > 0) {
  console.log(`\n  失败列表:`);
  for (const f of failures) {
    console.log(`    - ${f}`);
  }
  process.exit(1);
} else {
  console.log('\n  🎉 全部测试通过！\n');
}

// ============================================================================
// 运行上帝模式演示
// ============================================================================
console.log('─'.repeat(60));
console.log('  接下来运行上帝模式可视化演示...');
console.log('─'.repeat(60) + '\n');

runGodModeDemo();
}

main().catch(err => { console.error('测试失败:', err); process.exit(1); });
