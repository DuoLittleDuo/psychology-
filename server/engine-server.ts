/**
 * 「同频」引擎 API 服务器
 *
 * 包装阶段一到三的全部 TypeScript 核心引擎：
 *   - DecisionAgent (L1 九宫格 + L2 深度规划)
 *   - SafetyAgent (对话安全 + 推送预算 + 危机升级)
 *   - MemoryAgent (三层记忆)
 *   - GodModeController + MockDataGenerator (上帝模式)
 *
 * 通过 HTTP API 暴露给前端 Dashboard 调用。
 *
 * 启动: npx tsx server/engine-server.ts
 */

import express from 'express'
import cors from 'cors'

// ============================================================================
// 动态导入核心引擎（tsx 解析 TypeScript，支持中文路径）
// ============================================================================

let DecisionAgent: any
let SafetyAgent: any
let MemoryAgent: any
let MockDataGenerator: any
let GodModeController: any
let SimulationBenchmark: any
let StateOverrideEngine: any
let GRID_MATRIX: any
let MoodTier: any
let SocialWillingnessTier: any
let DEMO_SCENARIOS: any
let CrisisLevel: any
let DialogueGuard: any
let PushBudgetGuard: any
let CrisisEscalationManager: any
let MemoryRecallEngine: any
let MemoryConsolidationEngine: any

let decisionAgent: any
let safetyAgent: any
let memoryAgent: any
let mockGen: any
let godMode: any
let benchmark: any
let dialogueGuard: any
let budgetGuard: any
let crisisManager: any
let memoryRecall: any
let memoryConsolidation: any

let engineReady = false

async function initEngine() {
  if (engineReady) return

  // 从 ../src/ 导入（相对于 dashboard/server/）
  const decisionMod = await import('../../src/decision/DecisionAgent.js')
  DecisionAgent = decisionMod.DecisionAgent

  const safetyMod = await import('../../src/safety/SafetyAgent.js')
  SafetyAgent = safetyMod.SafetyAgent

  const memoryMod = await import('../../src/memory/MemoryAgent.js')
  MemoryAgent = memoryMod.MemoryAgent

  const mockMod = await import('../../src/god_mode/MockDataGenerator.js')
  MockDataGenerator = mockMod.MockDataGenerator

  const godMod = await import('../../src/god_mode/GodModeController.js')
  GodModeController = godMod.GodModeController

  const benchMod = await import('../../src/god_mode/SimulationBenchmark.js')
  SimulationBenchmark = benchMod.SimulationBenchmark

  const overrideMod = await import('../../src/god_mode/StateOverrideEngine.js')
  StateOverrideEngine = overrideMod.StateOverrideEngine

  const gridMod = await import('../../src/decision/types/DecisionTypes.js')
  GRID_MATRIX = gridMod.GRID_MATRIX
  MoodTier = gridMod.MoodTier
  SocialWillingnessTier = gridMod.SocialWillingnessTier

  const scenarioMod = await import('../../src/god_mode/types/GodModeTypes.js')
  DEMO_SCENARIOS = scenarioMod.DEMO_SCENARIOS

  const configMod = await import('../../src/core/Config.js')
  CrisisLevel = configMod.CrisisLevel

  const guardMod = await import('../../src/safety/DialogueGuard.js')
  DialogueGuard = guardMod.DialogueGuard

  const budgetMod = await import('../../src/safety/PushBudgetGuard.js')
  PushBudgetGuard = budgetMod.PushBudgetGuard

  const crisisMod = await import('../../src/safety/CrisisEscalation.js')
  CrisisEscalationManager = crisisMod.CrisisEscalationManager

  const recallMod = await import('../../src/memory/MemoryRecall.js')
  MemoryRecallEngine = recallMod.MemoryRecallEngine

  const consolidMod = await import('../../src/memory/MemoryConsolidation.js')
  MemoryConsolidationEngine = consolidMod.MemoryConsolidationEngine

  // 初始化所有引擎实例
  decisionAgent = new DecisionAgent()
  safetyAgent = new SafetyAgent()
  memoryAgent = new MemoryAgent()
  mockGen = new MockDataGenerator()
  godMode = new GodModeController()
  benchmark = new SimulationBenchmark()
  dialogueGuard = new DialogueGuard()
  budgetGuard = new PushBudgetGuard()
  crisisManager = new CrisisEscalationManager()
  memoryRecall = new MemoryRecallEngine()
  memoryConsolidation = new MemoryConsolidationEngine()

  // 注入依赖
  godMode.setDecisionAgent(decisionAgent)
  godMode.setSafetyAgent(safetyAgent)
  godMode.setMemoryAgent(memoryAgent)
  benchmark.initialize(mockGen, godMode, decisionAgent, safetyAgent)

  // 预生成模拟快照
  mockGen.setNoiseEnabled(true)
  const snapshots = mockGen.generateAll()
  console.log(`[Engine] ✅ 核心引擎初始化完成, ${snapshots.length} 个快照已生成`)
  engineReady = true
}

// ============================================================================
// Express 服务器
// ============================================================================

const app = express()
app.use(cors())
app.use(express.json())

const PORT = 3001
const MAX_CROSS_DEVICE_SIGNALS = 120
const crossDeviceSignals: any[] = []

// 健康检查
app.get('/api/health', async (_req, res) => {
  await initEngine()
  res.json({ status: 'ok', engine: 'SameWavelength v2.0', snapshots: mockGen.getSnapshots().length })
})

// ============================================================================
// 模拟控制
// ============================================================================

// 初始化/重置模拟
app.post('/api/sim/init', async (_req, res) => {
  await initEngine()
  mockGen.reset()
  const snaps = mockGen.generateAll()
  res.json({ snapshotCount: snaps.length, scenario: mockGen.getScenarioInfo() })
})

// 获取指定快照
app.get('/api/sim/snapshot/:index', async (req, res) => {
  await initEngine()
  const idx = parseInt(req.params.index)
  const snaps = mockGen.getSnapshots()
  if (idx < 0 || idx >= snaps.length) {
    return res.status(404).json({ error: '快照索引超出范围' })
  }
  const s = snaps[idx]
  res.json({
    id: s.id,
    timestamp: s.timestamp,
    mood: { overallScore: s.mood.overallScore },
    social: { overallScore: s.socialWillingness.overallScore, solitudePreference: s.socialWillingness.solitudePreference },
    health: { sleepTrend: s.health.sleepTrend, activityTrend: s.health.activityTrend },
    usage: s.usage,
    behaviorTrend: { anomalyFlags: s.behaviorTrend.anomalyFlags },
  })
})

// 获取所有快照的简要数据（趋势图用）
app.get('/api/sim/trend', async (_req, res) => {
  await initEngine()
  const snaps = mockGen.getSnapshots()
  const trend = snaps.map((s: any, i: number) => ({
    index: i,
    day: Math.floor(i / 8) + 1,
    hour: (i % 8) * 3,
    mood: s.mood.overallScore,
    social: s.socialWillingness.overallScore,
  }))
  res.json(trend)
})

// ============================================================================
// L1 决策引擎
// ============================================================================

// 执行 L1 决策（可带覆盖参数）
app.post('/api/decision/l1', async (req, res) => {
  await initEngine()
  const { snapshotIndex, overrideMood, overrideSocial, overrideSolitude, nightMode } = req.body

  const snaps = mockGen.getSnapshots()
  const idx = snapshotIndex ?? (snaps.length - 1)
  let snapshot = snaps[Math.min(idx, snaps.length - 1)]

  // 应用覆盖
  if (overrideMood !== undefined || overrideSocial !== undefined || overrideSolitude !== undefined) {
    snapshot = {
      ...snapshot,
      mood: { ...snapshot.mood, overallScore: overrideMood ?? snapshot.mood.overallScore },
      socialWillingness: {
        ...snapshot.socialWillingness,
        overallScore: overrideSocial ?? snapshot.socialWillingness.overallScore,
        solitudePreference: overrideSolitude ?? snapshot.socialWillingness.solitudePreference,
      },
    }
  }

  const decision = decisionAgent.executeL1Decision(snapshot)

  // 夜间模式修正
  let effectiveQuadrant = decision.quadrant
  let effectiveDesc = GRID_MATRIX[effectiveQuadrant.split('_')[0] as any][effectiveQuadrant.split('_')[1] as any].description
  if (nightMode) effectiveDesc = '🌙 夜间模式——仅危机推送'
  if (overrideSolitude && decision.solitudeDowngrade) effectiveDesc = '🧘 独处模式——社交降级'

  res.json({
    decisionId: decision.decisionId,
    quadrant: effectiveQuadrant,
    quadrantNumber: GRID_MATRIX[effectiveQuadrant.split('_')[0] as any][effectiveQuadrant.split('_')[1] as any].quadrantNumber,
    primaryAction: decision.primaryAction,
    secondaryActions: decision.secondaryActions,
    maxSocialDepth: decision.maxSocialDepth,
    needsDeepPlanning: decision.needsDeepPlanning,
    deepPlanningReason: decision.deepPlanningReason,
    timingScore: decision.timingScore,
    solitudeDowngrade: decision.solitudeDowngrade,
    description: effectiveDesc,
  })
})

// ============================================================================
// 记忆召回
// ============================================================================

app.post('/api/memory/recall', async (req, res) => {
  await initEngine()
  const { query } = req.body
  const result = memoryRecall.recallAcrossLayers(
    { query: query ?? '情绪', limit: 10 },
    new Map(), new Map(), new Map(), null,
  )
  res.json({
    entries: result.entries.slice(0, 6).map((e: any) => ({
      id: e.id,
      content: e.tags?.join(', ') ?? '记忆条目',
      source: e.type === 'long_term' ? '长期记忆' : e.type === 'short_term' ? '短期记忆' : '瞬时记忆',
      relevance: 0.5 + Math.random() * 0.5,
    })),
    recommendedApproach: result.recommendedApproach,
  })
})

app.get('/api/memory/constraints', async (_req, res) => {
  await initEngine()
  const cooldowns = safetyAgent.getActiveCooldowns()
  const budget = safetyAgent.getPushBudget()
  res.json({
    activeCooldowns: cooldowns.map((c: any) => `${c.interventionType}: ${c.consecutiveRejections}次拒绝`),
    pushBudget: { used: budget.usedPushes, max: budget.maxPushes },
  })
})

// ============================================================================
// 安全引擎
// ============================================================================

// 对话安全扫描
// 对话安全扫描（内联关键词，避免跨模块依赖问题）
app.post('/api/safety/scan', async (req, res) => {
  await initEngine()
  const text = req.body?.text ?? ''
  const moodScore = req.body?.moodScore ?? 0.5

  // 内联关键词列表（与 src/core/Config.ts 同步）
  const CRISIS_WORDS = ['我想自杀', '我想死', '自残', '结束生命', '不想再醒来']
  const ALERT_WORDS = ['活不下去了', '谁也别管我', '撑不住了']
  const ATTENTION_WORDS = ['不想活了', '好累啊', '活得好累', '真想消失']

  const normalized = (text ?? '').toLowerCase()
  let detectedLevel: number | null = null
  let matchedKeywords: string[] = []

  for (const w of CRISIS_WORDS) {
    if (normalized.includes(w)) { detectedLevel = 3; matchedKeywords.push(w); break }
  }
  if (detectedLevel === null) {
    for (const w of ALERT_WORDS) {
      if (normalized.includes(w)) { detectedLevel = 2; matchedKeywords.push(w) }
    }
  }
  if (detectedLevel === null) {
    for (const w of ATTENTION_WORDS) {
      if (normalized.includes(w)) { detectedLevel = 1; matchedKeywords.push(w) }
    }
  }

  const mood = moodScore ?? 0.5
  const riskScore = detectedLevel === 3 ? 0.9 : detectedLevel === 2 ? (mood < 0.3 ? 0.8 : 0.5) : detectedLevel === 1 ? 0.3 : Math.max(0, (1 - mood) * 0.3)

  res.json({
    detectedLevel,
    matchedKeywords,
    shouldInterrupt: detectedLevel === 3,
    shouldInitiateSafetyDialogue: detectedLevel !== null && detectedLevel >= 2,
    riskScore: Math.round(riskScore * 100) / 100,
    recommendedAction: detectedLevel === 3 ? 'interrupt_all' : detectedLevel === 2 ? 'initiate_safety_dialogue' : detectedLevel === 1 ? 'flag' : 'none',
  })
})

// 推送预算检查
app.post('/api/safety/budget-check', async (req, res) => {
  await initEngine()
  const { interventionType } = req.body
  const result = budgetGuard.checkAll({
    timestamp: Date.now(),
    interventionType: interventionType ?? 'exercise_suggestion',
    targetDevice: 'phone',
    decisionId: 'api_test',
    content: 'test',
  })
  res.json({
    passed: result.passed,
    blockReason: result.blockReason,
    fallbackAction: result.fallbackAction,
    checks: result.checks.map((c: any) => ({ name: c.name, passed: c.passed, reason: c.reason })),
  })
})

// 触发危机协议
app.post('/api/safety/crisis', async (req, res) => {
  await initEngine()
  const { text } = req.body

  // 内联扫描
  const CRISIS_WORDS = ['我想自杀', '我想死', '自残', '结束生命', '不想再醒来']
  const normalized = (text ?? '我想自杀').toLowerCase()
  let matchedKeywords: string[] = []
  for (const w of CRISIS_WORDS) {
    if (normalized.includes(w)) matchedKeywords.push(w)
  }
  const shouldInterrupt = matchedKeywords.length > 0

  let crisisState = null
  if (shouldInterrupt && CrisisLevel) {
    try {
      const event = {
        id: `crisis_${Date.now()}`,
        timestamp: Date.now(),
        type: 'keyword_hit',
        level: CrisisLevel.CRISIS,
        description: `危机关键词命中: ${matchedKeywords.join(', ')}`,
        trigger: text,
        actionTaken: 'interrupt_all',
        resolved: false,
      }
      crisisState = crisisManager.activateCrisisProtocol(event)
      safetyAgent.enableSafetyOverride('危机关键词命中')
    } catch (e: any) {
      console.error('[crisis] 协议激活失败:', e.message)
    }
  }

  res.json({
    scan: {
      detectedLevel: shouldInterrupt ? 3 : null,
      matchedKeywords,
      shouldInterrupt,
    },
    crisis: crisisState ? {
      currentStage: crisisState.currentStage,
      activatedAt: crisisState.activatedAt,
      riskLevel: crisisState.overallRiskAssessment?.level ?? 'red',
      riskScore: crisisState.overallRiskAssessment?.score ?? 0.9,
    } : null,
  })
})

// 危机解除
app.post('/api/safety/crisis-resolve', async (_req, res) => {
  await initEngine()
  safetyAgent.disableSafetyOverride()
  res.json({ status: 'resolved' })
})

// ============================================================================
// 上帝模式
// ============================================================================

// 获取完整 Dashboard 状态
app.get('/api/dashboard', async (_req, res) => {
  await initEngine()
  const dashboard = godMode.refreshDashboard?.() ?? godMode.getDashboard?.()
  const safetyStatus = safetyAgent.getPatrolStatus()
  const budget = safetyAgent.getPushBudget()
  const cooldowns = safetyAgent.getActiveCooldowns()

  res.json({
    userState: dashboard?.userState ?? { moodScore: 0.5, socialWillingnessScore: 0.5 },
    decisionPanel: dashboard?.decisionPanel ?? {},
    safetyPanel: {
      status: safetyStatus.safetyOverride ? '🔴 接管' : '🟢 运行中',
      pushBudget: { used: budget.usedPushes, max: budget.maxPushes },
      activeCooldowns: cooldowns.map((c: any) => c.interventionType),
      crisisProtocol: safetyStatus.activeCrisisProtocol ?? '无活跃协议',
    },
    simulationControl: dashboard?.simulationControl ?? {},
  })
})

// 应用预置场景
app.post('/api/godmode/scenario', async (req, res) => {
  await initEngine()
  const { scenarioId } = req.body
  const override = godMode.getOverrideEngine()
  const scenario = override.applyDemoScenario(scenarioId)
  if (!scenario) return res.status(404).json({ error: '场景不存在' })

  const summary = override.getOverrideSummary()
  const cell = GRID_MATRIX[summary.currentQuadrant.split('_')[0] as any][summary.currentQuadrant.split('_')[1] as any]
  res.json({
    scenario: { id: scenario.id, name: scenario.name, expectedBehavior: scenario.expectedBehavior },
    override: {
      currentQuadrant: summary.currentQuadrant,
      quadrantNumber: summary.quadrantNumber,
      description: cell.description,
      primaryAction: cell.primaryIntervention,
      moodOverridden: summary.moodOverridden,
      socialOverridden: summary.socialOverridden,
    },
  })
})

// 手动覆盖状态（拖拽滑块）
app.post('/api/godmode/override', async (req, res) => {
  await initEngine()
  const { mood, social, solitude } = req.body
  const override = godMode.getOverrideEngine()

  let log: any = {}
  if (mood !== undefined) log = override.setMoodScore(mood, 'Dashboard手动拖拽')
  if (social !== undefined) log = override.setSocialWillingnessScore(social, 'Dashboard手动拖拽')
  if (solitude !== undefined) log = override.toggleSolitudePreference()

  const summary = override.getOverrideSummary()
  const cell = GRID_MATRIX[summary.currentQuadrant.split('_')[0] as any][summary.currentQuadrant.split('_')[1] as any]
  res.json({
    decisionChange: log.decisionChange,
    currentQuadrant: summary.currentQuadrant,
    quadrantNumber: summary.quadrantNumber,
    description: cell.description,
    primaryAction: cell.primaryIntervention,
  })
})

// 重置所有覆盖
app.post('/api/godmode/reset', async (_req, res) => {
  await initEngine()
  godMode.getOverrideEngine().resetAll()
  res.json({ status: 'reset' })
})

// ============================================================================
// 模拟基准报告
// ============================================================================

app.get('/api/report', async (_req, res) => {
  await initEngine()
  try {
    const report = benchmark.generateReport()
    res.json({ report })
  } catch {
    const report = benchmark.runFullBenchmark?.()
    res.json({ report: report ?? '报告生成中...' })
  }
})

// ============================================================================
// 启动
// ============================================================================

// ============================================================================
// Cross-device signal relay
// ============================================================================

app.post('/api/cross-device/signal', (req, res) => {
  const signal = req.body
  if (!signal?.id || !signal?.kind || !signal?.createdAt) {
    return res.status(400).json({ error: 'invalid_signal' })
  }
  if (signal.kind !== 'health' && signal.kind !== 'feedback') {
    return res.status(400).json({ error: 'invalid_signal_kind' })
  }

  if (
    signal.kind === 'feedback'
    && crossDeviceSignals.some((item) => item.kind === 'feedback' && item.payload?.replyTo === signal.payload?.replyTo)
  ) {
    return res.json({ ok: true, duplicate: true, stored: crossDeviceSignals.length, serverTime: Date.now() })
  }

  if (!crossDeviceSignals.some((item) => item.id === signal.id)) {
    crossDeviceSignals.push(signal)
    if (crossDeviceSignals.length > MAX_CROSS_DEVICE_SIGNALS) {
      crossDeviceSignals.splice(0, crossDeviceSignals.length - MAX_CROSS_DEVICE_SIGNALS)
    }
  }

  res.json({ ok: true, stored: crossDeviceSignals.length, serverTime: Date.now() })
})

app.get('/api/cross-device/state', (req, res) => {
  const after = Number(req.query.after ?? 0) || 0
  const signals = crossDeviceSignals
    .filter((signal) => Number(signal.createdAt) > after)
    .slice(-60)

  res.json({ signals, serverTime: Date.now() })
})

app.post('/api/cross-device/reset', (_req, res) => {
  crossDeviceSignals.splice(0, crossDeviceSignals.length)
  res.json({ ok: true, serverTime: Date.now() })
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🔧 「同频」引擎 API 服务器已启动: http://localhost:${PORT}`)
  console.log(`   📋 健康检查: http://localhost:${PORT}/api/health`)
  console.log(`   🎯 L1决策:   POST http://localhost:${PORT}/api/decision/l1`)
  console.log(`   🛡️ 安全扫描: POST http://localhost:${PORT}/api/safety/scan`)
  console.log(`   🎮 上帝模式: GET  http://localhost:${PORT}/api/dashboard\n`)
})
