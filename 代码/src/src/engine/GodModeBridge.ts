/**
 * 上帝模式引擎桥接层（API 版本）
 *
 * 通过 HTTP 调用真正的 TypeScript 核心引擎 (localhost:3001)。
 * 如果 API 不可用，回退到内联模拟数据。
 */

const API = 'http://localhost:3001/api'
let apiAvailable = false

async function apiCall<T>(method: string, path: string, body?: any): Promise<T | null> {
  try {
    const opts: RequestInit = {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    }
    const res = await fetch(`${API}${path}`, opts)
    if (!res.ok) return null
    return await res.json() as T
  } catch {
    return null
  }
}

async function checkApi(): Promise<boolean> {
  const r = await apiCall<{ status: string; snapshots: number }>('GET', '/health')
  apiAvailable = r?.status === 'ok'
  if (apiAvailable) console.log('[Bridge] ✅ 已连接引擎 API, 快照数:', r?.snapshots)
  else console.warn('[Bridge] ⚠️ API 不可用，使用内联模拟数据')
  return apiAvailable
}

// ============================================================================
// 类型定义（与后端 API 响应匹配）
// ============================================================================

export interface Snapshot {
  id: string; timestamp: number; windowHours: number
  mood: { overallScore: number; dimensions: Record<string,number>; confidence: number; inferenceSources: string[] }
  socialWillingness: { overallScore: number; preferredDepth: number; solitudePreference: boolean; confidence: number }
  health: { sleepTrend: string; activityTrend: string; latestSleep: { totalHours: number; qualityScore: number } | null; latestActivity: { stepCount: number; outdoorMinutes: number } | null }
  usage: { totalScreenTimeHours: number; socialAppHours: number; videoAppHours: number; studyAppHours: number; lateNightUsage: boolean }
  behaviorTrend: { anomalyFlags: string[] }
  isManualOverride: boolean
}

export interface DashboardState {
  moodScore: number; socialScore: number
  solitudeMode: boolean; nightMode: boolean
  riskLevel: 'green' | 'yellow' | 'orange' | 'red'
  currentQuadrant: string; quadrantNumber: number
  quadrantDescription: string; primaryAction: string
  moodTrend: { date: string; score: number; overridden: boolean }[]
  recalledMemories: { id: string; content: string; source: string; relevance: number }[]
  activeConstraints: string[]
  l2TaskChain: { name: string; progress: string; status: string; nodes: { name: string; status: 'done' | 'active' | 'pending' }[] } | null
  safetyStatus: string
  pushBudget: { used: number; max: number }
  activeCooldowns: string[]
  crisisProtocol: string
  simulationDay: number; simulationProgress: number
  events: { time: string; type: string; description: string }[]
}

export interface DemoScenario {
  id: string; name: string; description: string
  presets: { moodScore: number; socialWillingnessScore: number; sleepQuality: number; activityLevel: number; riskLevel: string }
  expectedBehavior: string
}

// ============================================================================
// 九宫格矩阵（内联，确保即使 API 不可用也能工作）
// ============================================================================

export enum MoodTier { LOW = 'low', MEDIUM = 'medium', HIGH = 'high' }
export enum SocialWillingnessTier { LOW = 'low', MEDIUM = 'medium', HIGH = 'high' }
export type GridQuadrant = `${MoodTier}_${SocialWillingnessTier}`

export interface GridCellDecision {
  quadrant: GridQuadrant; quadrantNumber: 1|2|3|4|5|6|7|8|9
  primaryIntervention: string; secondaryInterventions: string[]
  maxSocialDepth: 0|1|2|3|4; description: string; priority: number
}

export const GRID_MATRIX: Record<MoodTier, Record<SocialWillingnessTier, GridCellDecision>> = {
  [MoodTier.LOW]: {
    [SocialWillingnessTier.LOW]: { quadrant: 'low_low', quadrantNumber: 1, primaryIntervention: 'crisis_response', secondaryInterventions: ['warm_card', 'resource_guide'], maxSocialDepth: 0, description: '危机关怀：完全不推社交，陪伴+转介资源', priority: 1.0 },
    [SocialWillingnessTier.MEDIUM]: { quadrant: 'low_medium', quadrantNumber: 2, primaryIntervention: 'empathy_dialogue', secondaryInterventions: ['buddy_l1'], maxSocialDepth: 1, description: '情绪对话+L1：先做共情对话，顺利则推L1', priority: 0.9 },
    [SocialWillingnessTier.HIGH]: { quadrant: 'low_high', quadrantNumber: 3, primaryIntervention: 'empathy_dialogue', secondaryInterventions: ['buddy_l1'], maxSocialDepth: 1, description: '谨慎社交：先了解动机，仅推L1', priority: 0.75 },
  },
  [MoodTier.MEDIUM]: {
    [SocialWillingnessTier.LOW]: { quadrant: 'medium_low', quadrantNumber: 4, primaryIntervention: 'warm_card', secondaryInterventions: ['buddy_l1'], maxSocialDepth: 1, description: '轻关怀+L1：留一个出口，但不过度', priority: 0.6 },
    [SocialWillingnessTier.MEDIUM]: { quadrant: 'medium_medium', quadrantNumber: 5, primaryIntervention: 'activity_push', secondaryInterventions: ['buddy_l2', 'buddy_l3'], maxSocialDepth: 3, description: '正常运营：搭子推荐L2-L3 + 活动推送', priority: 0.5 },
    [SocialWillingnessTier.HIGH]: { quadrant: 'medium_high', quadrantNumber: 6, primaryIntervention: 'buddy_l3', secondaryInterventions: ['buddy_l3', 'activity_push'], maxSocialDepth: 4, description: '深度社交：深度搭子+项目组队+社群', priority: 0.5 },
  },
  [MoodTier.HIGH]: {
    [SocialWillingnessTier.LOW]: { quadrant: 'high_low', quadrantNumber: 7, primaryIntervention: 'none', secondaryInterventions: [], maxSocialDepth: 0, description: '不打扰：用户状态好但想独处——尊重', priority: 0.0 },
    [SocialWillingnessTier.MEDIUM]: { quadrant: 'high_medium', quadrantNumber: 8, primaryIntervention: 'activity_push', secondaryInterventions: ['buddy_l2', 'buddy_l3'], maxSocialDepth: 3, description: '活动推送：搭子推荐L2-L3', priority: 0.3 },
    [SocialWillingnessTier.HIGH]: { quadrant: 'high_high', quadrantNumber: 9, primaryIntervention: 'buddy_l3', secondaryInterventions: ['buddy_l3', 'activity_push'], maxSocialDepth: 4, description: '深度匹配：最优窗口，促成高质量连接', priority: 0.4 },
  },
}

export const DEMO_SCENARIOS: DemoScenario[] = [
  { id: 'healthy_happy', name: '😊 状态良好', description: '情绪高涨、社交活跃', presets: { moodScore: 0.82, socialWillingnessScore: 0.78, sleepQuality: 0.8, activityLevel: 0.7, riskLevel: 'green' }, expectedBehavior: '象限⑨ → 深度匹配' },
  { id: 'mild_decline', name: '😔 轻度低落', description: '情绪中等偏低、社交意愿中等', presets: { moodScore: 0.45, socialWillingnessScore: 0.50, sleepQuality: 0.5, activityLevel: 0.4, riskLevel: 'yellow' }, expectedBehavior: '象限② → 共情对话 + L1' },
  { id: 'severe_depression', name: '🔴 重度下滑', description: '情绪极低、拒绝社交', presets: { moodScore: 0.25, socialWillingnessScore: 0.15, sleepQuality: 0.2, activityLevel: 0.1, riskLevel: 'orange' }, expectedBehavior: '象限① → 危机关怀 → 安全接管' },
  { id: 'want_solitude', name: '🧘 想独处', description: '情绪高但想独处', presets: { moodScore: 0.75, socialWillingnessScore: 0.20, sleepQuality: 0.7, activityLevel: 0.6, riskLevel: 'green' }, expectedBehavior: '象限⑦ → 不打扰' },
]

// ============================================================================
// API 方法（调用真实引擎）
// ============================================================================

export async function initSnapshots(): Promise<Snapshot[]> {
  await checkApi()
  if (apiAvailable) {
    await apiCall('POST', '/sim/init')
    const trend = await apiCall<any[]>('GET', '/sim/trend')
    if (trend) {
      fallbackSnapshots = trend.map((t: any, i: number) => ({
        id: `snap_${i}`,
        timestamp: Date.now() + i * 10800000,
        windowHours: 3,
        mood: { overallScore: t.mood, dimensions: {}, confidence: 0.75, inferenceSources: [] },
        socialWillingness: { overallScore: t.social, preferredDepth: 2, solitudePreference: false, confidence: 0.7 },
        health: { sleepTrend: 'stable', activityTrend: 'normal', latestSleep: null, latestActivity: null },
        usage: { totalScreenTimeHours: 0, socialAppHours: 0, videoAppHours: 0, studyAppHours: 0, lateNightUsage: false },
        behaviorTrend: { anomalyFlags: [] },
        isManualOverride: false,
      }))
      return fallbackSnapshots
    }
  }
  return generateFallbackSnapshots()
}

export function getSnapshot(index: number): Snapshot | null {
  return fallbackSnapshots[index] ?? null
}

export function getSnapshotCount(): number {
  return fallbackSnapshots.length
}

// ============================================================================
// 实时引擎调用
// ============================================================================

export async function callL1Decision(params: {
  snapshotIndex: number; overrideMood?: number; overrideSocial?: number
  overrideSolitude?: boolean; nightMode?: boolean
}) {
  if (apiAvailable) {
    const r = await apiCall<any>('POST', '/decision/l1', params)
    if (r) return r
  }
  // 回退：本地计算九宫格
  const moodTier = (params.overrideMood ?? 0.5) < 0.4 ? MoodTier.LOW : (params.overrideMood ?? 0.5) > 0.65 ? MoodTier.HIGH : MoodTier.MEDIUM
  const socialTier = (params.overrideSocial ?? 0.5) < 0.4 ? SocialWillingnessTier.LOW : (params.overrideSocial ?? 0.5) > 0.65 ? SocialWillingnessTier.HIGH : SocialWillingnessTier.MEDIUM
  const cell = GRID_MATRIX[moodTier][socialTier]
  return {
    quadrant: cell.quadrant,
    quadrantNumber: cell.quadrantNumber,
    primaryAction: cell.primaryIntervention,
    description: cell.description,
    needsDeepPlanning: (params.overrideMood ?? 0.5) < 0.4,
    solitudeDowngrade: params.overrideSolitude ?? false,
  }
}

export async function callSafetyScan(text: string, moodScore: number) {
  if (apiAvailable) {
    return await apiCall<any>('POST', '/safety/scan', { text, moodScore })
  }
  // 回退：简单关键词匹配
  const crisisWords = ['自杀', '结束生命', '想死', '自残']
  const alertWords = ['撑不住了', '活不下去了', '不想活了']
  const matched = crisisWords.some(w => text.includes(w)) ? 'CRISIS' : alertWords.some(w => text.includes(w)) ? 'ALERT' : null
  return {
    detectedLevel: matched ? (matched === 'CRISIS' ? 3 : 2) : null,
    matchedKeywords: matched ? [text] : [],
    shouldInterrupt: matched === 'CRISIS',
    shouldInitiateSafetyDialogue: matched !== null,
    riskScore: matched === 'CRISIS' ? 0.9 : matched === 'ALERT' ? 0.6 : 0,
    recommendedAction: matched === 'CRISIS' ? 'interrupt_all' : matched === 'ALERT' ? 'initiate_safety_dialogue' : 'none',
  }
}

export async function callCrisisTrigger(text: string) {
  if (apiAvailable) {
    return await apiCall<any>('POST', '/safety/crisis', { text })
  }
  return {
    scan: { detectedLevel: 3, matchedKeywords: [text], shouldInterrupt: true },
    crisis: { currentStage: 'stage_1', riskLevel: 'red', riskScore: 0.9 },
  }
}

export async function callCrisisResolve() {
  if (apiAvailable) await apiCall('POST', '/safety/crisis-resolve')
}

export async function callApplyScenario(scenarioId: string) {
  if (apiAvailable) {
    return await apiCall<any>('POST', '/godmode/scenario', { scenarioId })
  }
  const s = DEMO_SCENARIOS.find(d => d.id === scenarioId)
  if (!s) return null
  const moodTier = s.presets.moodScore < 0.4 ? MoodTier.LOW : s.presets.moodScore > 0.65 ? MoodTier.HIGH : MoodTier.MEDIUM
  const socialTier = s.presets.socialWillingnessScore < 0.4 ? SocialWillingnessTier.LOW : s.presets.socialWillingnessScore > 0.65 ? SocialWillingnessTier.HIGH : SocialWillingnessTier.MEDIUM
  const cell = GRID_MATRIX[moodTier][socialTier]
  return {
    scenario: { id: s.id, name: s.name, expectedBehavior: s.expectedBehavior },
    override: { currentQuadrant: cell.quadrant, quadrantNumber: cell.quadrantNumber, description: cell.description, primaryAction: cell.primaryIntervention, moodOverridden: true, socialOverridden: true },
  }
}

export async function callOverride(params: { mood?: number; social?: number; solitude?: boolean }) {
  if (apiAvailable) {
    return await apiCall<any>('POST', '/godmode/override', params)
  }
  const moodTier = (params.mood ?? 0.5) < 0.4 ? MoodTier.LOW : (params.mood ?? 0.5) > 0.65 ? MoodTier.HIGH : MoodTier.MEDIUM
  const socialTier = (params.social ?? 0.5) < 0.4 ? SocialWillingnessTier.LOW : (params.social ?? 0.5) > 0.65 ? SocialWillingnessTier.HIGH : SocialWillingnessTier.MEDIUM
  const cell = GRID_MATRIX[moodTier][socialTier]
  return { currentQuadrant: cell.quadrant, quadrantNumber: cell.quadrantNumber, description: cell.description, primaryAction: cell.primaryIntervention }
}

export async function callReset() {
  if (apiAvailable) await apiCall('POST', '/godmode/reset')
}

export async function callMemoryRecall(query: string) {
  if (apiAvailable) {
    const r = await apiCall<any>('POST', '/memory/recall', { query })
    if (r) return r.entries
  }
  return [
    { id: 'm1', content: '用户人格: 偏内向(0.65), 偏好1v1', source: '长期记忆', relevance: 0.82 },
    { id: 'm2', content: '有效干预: 运动建议(响应率80%)', source: '长期记忆', relevance: 0.75 },
    { id: 'm3', content: '硬性约束: 21:00后不推送', source: '长期记忆', relevance: 0.90 },
    { id: 'm4', content: '最近趋势: 情绪下降(3天)', source: '短期记忆', relevance: 0.68 },
  ]
}

// ============================================================================
// 回退模拟数据（API 不可用时）
// ============================================================================

let fallbackSnapshots: Snapshot[] = []

const DAY_BASELINES = [
  { mood: 0.68, social: 0.60, sleepH: 7.1, sleepQ: 0.72, steps: 6800, outdoor: 45, screenTotal: 4.5, screenSocial: 1.2, screenVideo: 1.0, screenStudy: 1.8, stress: 0.35, lateNight: false },
  { mood: 0.52, social: 0.45, sleepH: 5.8, sleepQ: 0.48, steps: 3200, outdoor: 15, screenTotal: 6.8, screenSocial: 0.3, screenVideo: 3.5, screenStudy: 1.2, stress: 0.55, lateNight: true },
  { mood: 0.35, social: 0.30, sleepH: 4.2, sleepQ: 0.28, steps: 1200, outdoor: 0, screenTotal: 9.2, screenSocial: 0.1, screenVideo: 6.5, screenStudy: 0.3, stress: 0.72, lateNight: true },
]
const TIME_MOD = [-0.08, -0.05, 0.02, 0.02, 0.05, 0.05, 0.0, -0.05]

function generateFallbackSnapshots(): Snapshot[] {
  fallbackSnapshots = []
  let idCounter = 0
  for (let day = 0; day < 3; day++) {
    const base = DAY_BASELINES[day]
    for (let slot = 0; slot < 8; slot++) {
      const hour = slot * 3
      const ts = Date.now() + day * 86400000 + hour * 3600000
      const noise = () => (Math.random() - 0.5) * 0.1
      const clamp = (v: number) => Math.round(Math.max(0, Math.min(1, v)) * 100) / 100
      fallbackSnapshots.push({
        id: `snap_${day}_${slot}_${++idCounter}`,
        timestamp: ts, windowHours: 3,
        mood: { overallScore: clamp(base.mood + TIME_MOD[slot] + noise()), dimensions: {}, confidence: 0.75, inferenceSources: [] },
        socialWillingness: { overallScore: clamp(base.social + noise()), preferredDepth: 2, solitudePreference: false, confidence: 0.7 },
        health: { sleepTrend: base.sleepQ < 0.5 ? 'declining' : 'stable', activityTrend: 'normal', latestSleep: { totalHours: base.sleepH, qualityScore: base.sleepQ }, latestActivity: { stepCount: base.steps, outdoorMinutes: base.outdoor } },
        usage: { totalScreenTimeHours: base.screenTotal, socialAppHours: base.screenSocial, videoAppHours: base.screenVideo, studyAppHours: base.screenStudy, lateNightUsage: slot >= 7 && base.lateNight },
        behaviorTrend: { anomalyFlags: base.screenSocial < 0.3 ? ['social_withdrawal'] : ['normal'] },
        isManualOverride: false,
      })
    }
  }
  return fallbackSnapshots
}
