import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  BatteryMedium,
  Bell,
  CheckCircle,
  ExternalLink,
  Heart,
  Monitor,
  Radio,
  RefreshCw,
  Server,
  Shield,
  ShieldAlert,
  SlidersHorizontal,
  Smartphone,
  Watch,
  Wifi,
  Zap,
} from 'lucide-react'
import { loadPreparedProfile } from '../lib/preparedProfile'

type Role = 'lab' | 'watch' | 'console'
type RiskLevel = 'stable' | 'attention' | 'high'
type SignalKind = 'health' | 'feedback'
type TransportState = 'connecting' | 'lan' | 'local' | 'offline'
type ActivityKind = 'running' | 'walking' | 'resting' | 'stress' | 'fatigue'
type HeartRateAssessment = 'low' | 'good' | 'high'

interface WatchTelemetry {
  steps: number
  heartRate: number
  sleepHours: number
  stress: number
  battery: number
  cadence: number
  hrv: number
  movement: number
  heartRateTrend: number
  scenario: string
}

interface ActivityInsight {
  kind: ActivityKind
  label: string
  detail: string
  confidence: number
  heartRateRange: [number, number]
  heartRateState: HeartRateAssessment
  heartRateLabel: string
  summary: string
}

interface HealthPacket extends WatchTelemetry {
  id: string
  deviceId: string
  sentAt: number
}

interface FeedbackPacket {
  id: string
  replyTo: string
  sentAt: number
  risk: RiskLevel
  moodScore: number
  socialScore: number
  title: string
  message: string
  action: string
  systemDecision: string
  activityLabel: string
  careNote: string
}

interface CrossDeviceSignal {
  id: string
  kind: SignalKind
  payload: HealthPacket | FeedbackPacket
  createdAt: number
  sender: string
}

interface TimelineItem {
  id: string
  time: string
  label: string
  detail: string
  tone: 'blue' | 'green' | 'amber' | 'red'
}

const CHANNEL_NAME = 'same-wavelength-cross-device'
const TICK_SECONDS = 10

const INITIAL_TELEMETRY: WatchTelemetry = {
  steps: 7200,
  heartRate: 74,
  sleepHours: 7.2,
  stress: 28,
  battery: 82,
  cadence: 18,
  hrv: 58,
  movement: 24,
  heartRateTrend: 0,
  scenario: '随机监测',
}

interface SimulationTarget {
  movement: number
  cadence: number
  stress: number
  hrv: number
  heartRate: number
}

interface RandomSimulationState {
  phase: ActivityKind
  ticksLeft: number
  target: SimulationTarget
}

const PHASE_LABELS: Record<ActivityKind, string> = {
  running: '随机状态 · 运动',
  walking: '随机状态 · 步行',
  resting: '随机状态 · 静息',
  stress: '随机状态 · 压力',
  fatigue: '随机状态 · 疲劳',
}

const PHASE_PROFILES: Record<ActivityKind, Record<keyof SimulationTarget, [number, number]>> = {
  running: { movement: [68, 94], cadence: [138, 180], stress: [35, 62], hrv: [30, 52], heartRate: [122, 164] },
  walking: { movement: [38, 62], cadence: [78, 118], stress: [26, 52], hrv: [42, 68], heartRate: [86, 118] },
  resting: { movement: [14, 28], cadence: [0, 30], stress: [22, 44], hrv: [52, 78], heartRate: [64, 84] },
  stress: { movement: [6, 24], cadence: [0, 20], stress: [66, 92], hrv: [20, 40], heartRate: [92, 116] },
  fatigue: { movement: [10, 25], cadence: [0, 34], stress: [48, 72], hrv: [24, 44], heartRate: [66, 92] },
}

const PHASE_TRANSITIONS: Record<ActivityKind, Array<[ActivityKind, number]>> = {
  running: [['running', 0.58], ['walking', 0.27], ['resting', 0.15]],
  walking: [['walking', 0.32], ['resting', 0.08], ['running', 0.5], ['stress', 0.1]],
  resting: [['resting', 0.08], ['walking', 0.55], ['stress', 0.3], ['fatigue', 0.07]],
  stress: [['stress', 0.35], ['resting', 0.15], ['walking', 0.35], ['fatigue', 0.15]],
  fatigue: [['fatigue', 0.3], ['resting', 0.3], ['walking', 0.4]],
}

const activityTone: Record<ActivityKind, { panel: string; icon: string; label: string }> = {
  running: { panel: 'border-sky-200 bg-sky-50/80', icon: 'bg-sky-100 text-sky-700', label: 'text-sky-700' },
  walking: { panel: 'border-cyan-200 bg-cyan-50/80', icon: 'bg-cyan-100 text-cyan-700', label: 'text-cyan-700' },
  resting: { panel: 'border-emerald-200 bg-emerald-50/80', icon: 'bg-emerald-100 text-emerald-700', label: 'text-emerald-700' },
  stress: { panel: 'border-amber-200 bg-amber-50/80', icon: 'bg-amber-100 text-amber-700', label: 'text-amber-700' },
  fatigue: { panel: 'border-violet-200 bg-violet-50/80', icon: 'bg-violet-100 text-violet-700', label: 'text-violet-700' },
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function moveWithInertia(
  current: number,
  target: number,
  maxRise: number,
  maxFall: number,
  jitter: number,
  min: number,
  max: number,
) {
  const maxStep = target >= current ? maxRise : maxFall
  const boundedDelta = clampNumber(target - current, -maxStep, maxStep)
  return clampNumber(current + boundedDelta + (Math.random() - 0.5) * jitter, min, max)
}

function randomBetween([min, max]: [number, number]) {
  return min + Math.random() * (max - min)
}

function createPhaseTarget(phase: ActivityKind): SimulationTarget {
  const profile = PHASE_PROFILES[phase]
  return {
    movement: randomBetween(profile.movement),
    cadence: randomBetween(profile.cadence),
    stress: randomBetween(profile.stress),
    hrv: randomBetween(profile.hrv),
    heartRate: randomBetween(profile.heartRate),
  }
}

function chooseNextPhase(current: ActivityKind): ActivityKind {
  const roll = Math.random()
  let cumulative = 0
  for (const [phase, weight] of PHASE_TRANSITIONS[current]) {
    cumulative += weight
    if (roll <= cumulative) return phase
  }
  return current
}

function advanceRandomTelemetry(current: WatchTelemetry, simulation: RandomSimulationState): WatchTelemetry {
  if (simulation.ticksLeft <= 0) {
    simulation.phase = chooseNextPhase(simulation.phase)
    simulation.ticksLeft = 2 + Math.floor(Math.random() * 3)
    simulation.target = createPhaseTarget(simulation.phase)
  }
  simulation.ticksLeft -= 1

  const target = simulation.target
  const nextMovement = moveWithInertia(current.movement, target.movement, 12, 6, 4, 0, 100)
  const nextCadence = moveWithInertia(current.cadence, target.cadence, 26, 14, 8, 0, 200)
  const nextStress = moveWithInertia(current.stress, target.stress, 4, 3, 2, 0, 100)
  const nextHrv = moveWithInertia(current.hrv, target.hrv, 4, 3, 2, 12, 120)
  const partial = {
    ...current,
    movement: Math.round(nextMovement),
    cadence: Math.round(nextCadence),
    stress: Math.round(nextStress),
    hrv: Math.round(nextHrv),
  }
  const activity = inferActivity(partial)
  const maxRise = activity.kind === 'running' ? 10 : activity.kind === 'walking' ? 8 : 6
  const maxFall = activity.kind === 'running' ? 4 : 5
  const nextHeartRate = moveWithInertia(current.heartRate, target.heartRate, maxRise, maxFall, 4, 45, 190)
  const stepDelta = Math.max(0, Math.round((current.cadence / 60) * TICK_SECONDS + (Math.random() - 0.4) * 2))
  const roundedHeartRate = Math.round(nextHeartRate)

  return {
    ...partial,
    steps: Math.max(0, Math.min(60000, current.steps + stepDelta)),
    heartRate: roundedHeartRate,
    heartRateTrend: roundedHeartRate - current.heartRate,
    battery: Math.max(5, Number((current.battery - (Math.random() < 0.12 ? 0.1 : 0)).toFixed(1))),
    scenario: PHASE_LABELS[simulation.phase],
  }
}

function inferActivity(data: WatchTelemetry): ActivityInsight {
  const trend = data.heartRateTrend ?? 0
  const isRunning = data.heartRate >= 118 && data.cadence >= 100 && data.movement >= 45
  const isWalking = data.heartRate >= 82 && data.cadence >= 45 && data.movement >= 25
  const isStressResponse = data.heartRate >= 95 && (data.cadence < 75 || data.movement < 40)
  const isFatigue = data.heartRate < 95 && data.hrv <= 40 && data.sleepHours < 5.5

  let kind: ActivityKind = 'resting'
  let label = '静坐 / 低活动状态'
  let detail = '步频和体动都较低，当前更像坐着、休息或短时间停下。'
  let confidence = 76
  let heartRateRange: [number, number] = [58, 92]

  if (isRunning) {
    kind = 'running'
    label = '跑步 / 高强度运动'
    detail = '步频和体动持续升高，更像跑步、爬坡或快速移动。'
    confidence = 91
    heartRateRange = [112, 165]
  } else if (isWalking) {
    kind = 'walking'
    label = '步行 / 日常移动'
    detail = '步频处于持续移动区间，更像散步、通勤或室内走动。'
    confidence = 82
    heartRateRange = [78, 122]
  } else if (isStressResponse) {
    kind = 'stress'
    label = '静坐压力 / 紧张反应'
    detail = '体动不高，但压力、HRV 和心率同时偏离，可能在紧张、焦虑或连续工作。'
    confidence = 86
    heartRateRange = [60, 96]
  } else if (isFatigue) {
    kind = 'fatigue'
    label = '疲劳 / 恢复不足'
    detail = '睡眠不足伴随较高压力和较低 HRV，当前更像疲劳或恢复不足。'
    confidence = 80
    heartRateRange = [55, 94]
  }

  const [low, high] = heartRateRange
  const heartRateState: HeartRateAssessment = data.heartRate < low ? 'low' : data.heartRate > high ? 'high' : 'good'
  const heartRateLabel = heartRateState === 'low' ? '心率偏低' : heartRateState === 'high' ? '心率偏高' : '心率合适'

  let summary = '当前心率落在这类活动的常见范围内，整体负荷较匹配。'
  if (kind === 'running' && heartRateState === 'high') {
    summary = '心率高于跑步常见区间，建议降低配速，并观察是否持续升高。'
  } else if (kind === 'running' && heartRateState === 'low') {
    summary = '心率低于强运动常见区间，可能刚开始、正在恢复，或设备信号仍不稳定。'
  } else if (kind === 'stress' && heartRateState === 'high') {
    summary = '心率高于静坐常见区间，可能正在紧张、焦躁，或身体正承受额外负荷。'
  } else if (kind === 'fatigue') {
    summary = '当前更像疲劳状态，建议降低高强度活动并留出恢复时间。'
  } else if (kind === 'resting' && heartRateState === 'high') {
    summary = '体动不高但心率偏高，可能存在压力、情绪波动或身体不适。'
  } else if (trend >= 6) {
    summary = '心率正在较快上升，建议继续观察变化趋势，避免突然增加运动强度。'
  } else if (trend <= -6) {
    summary = '心率正在稳定回落，当前更接近运动后的恢复阶段。'
  }

  return {
    kind,
    label,
    detail,
    confidence,
    heartRateRange,
    heartRateState,
    heartRateLabel,
    summary,
  }
}

const riskStyle: Record<RiskLevel, { label: string; color: string; bg: string; border: string; text: string }> = {
  stable: { label: '稳定', color: '#16a34a', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
  attention: { label: '关注', color: '#d97706', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
  high: { label: '高风险', color: '#dc2626', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
}

function createId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function clampScore(value: number) {
  return Math.max(0.08, Math.min(0.96, Math.round(value * 100) / 100))
}

function getInitialRole(): Role {
  const hashQuery = window.location.hash.split('?')[1] ?? ''
  const role = new URLSearchParams(hashQuery).get('role')
  return role === 'watch' || role === 'console' ? role : 'lab'
}

function analyzeTelemetry(packet: HealthPacket, safetyMode = false): FeedbackPacket {
  const activity = inferActivity(packet)
  const isRunning = activity.kind === 'running'
  const isWalking = activity.kind === 'walking'
  const sleepDebt = Math.max(0, (7 - packet.sleepHours) / 4)
  const expectedHeartRate = isRunning ? 145 : isWalking ? 98 : 78
  const heartPressure = Math.max(0, (packet.heartRate - expectedHeartRate) / (isRunning ? 38 : 52))
  const stressPressure = packet.stress / 100
  const inactivity = packet.steps < 3000 ? 0.28 : packet.steps < 6000 ? 0.12 : 0
  const recovery = packet.steps > 8500 && packet.sleepHours > 7 ? 0.12 : 0
  const exerciseCredit = isRunning ? 0.28 : isWalking ? 0.1 : 0
  const pressure = Math.max(0, Math.min(1, stressPressure * 0.44 + sleepDebt * 0.25 + heartPressure * 0.23 + inactivity - recovery - exerciseCredit))

  const moodScore = clampScore(0.86 - pressure * 0.68)
  const socialScore = clampScore(0.78 - pressure * 0.52 + (packet.steps > 8000 ? 0.08 : 0))
  const lowMotion = !isRunning && !isWalking
  const heartRateHigh = isRunning ? packet.heartRate > 165 : isWalking ? packet.heartRate > 138 : packet.heartRate >= 125
  const stressHigh = lowMotion && packet.stress >= 88 && packet.heartRate >= 112
  const heartRateAttention = isRunning
    ? packet.heartRate < 108
    : isWalking
      ? packet.heartRate >= 124
      : packet.heartRate >= 97
  const risk: RiskLevel = pressure > 0.68 || heartRateHigh || stressHigh ? 'high' : pressure > 0.36 || heartRateAttention ? 'attention' : 'stable'

  if (isRunning) {
    const runningRisk: RiskLevel = packet.heartRate > 165 ? 'high' : packet.heartRate < 108 ? 'attention' : 'stable'
    return {
      id: createId('feedback'),
      replyTo: packet.id,
      sentAt: Date.now(),
      risk: runningRisk,
      moodScore,
      socialScore,
      title: runningRisk === 'stable' ? '运动心率处于合适区间' : runningRisk === 'high' ? '运动心率过高' : '运动心率偏低',
      message: activity.summary,
      action: runningRisk === 'stable' ? '手表持续记录步频和心率，达到安全边界前不打扰' : '手表震动提醒，建议降低配速并观察 2 分钟',
      systemDecision: `Perception Agent 推测为「${activity.label}」，当前心率 ${packet.heartRate}bpm，Safety Agent 按运动场景评估。`,
      activityLabel: activity.label,
      careNote: runningRisk === 'stable'
        ? '你现在的运动心率很匹配，保持呼吸，按自己的节奏来就好。'
        : runningRisk === 'high'
          ? '如果开始气喘或头晕，先停下来缓一缓，不用逼自己继续。'
          : '刚开始运动不用着急，让身体慢慢热起来。',
    }
  }

  if (risk === 'high') {
    const protectedHealthResponse = safetyMode && lowMotion && packet.heartRate >= 125
    if (protectedHealthResponse) {
      return {
        id: createId('feedback'),
        replyTo: packet.id,
        sentAt: Date.now(),
        risk: 'high',
        moodScore,
        socialScore,
        title: '静息心率异常升高，优先排除紧急情况',
        message: `检测到体动较低，但心率达到 ${packet.heartRate} bpm。你已选择高风险健康背景，系统不会仅按运动或压力解释这次变化。`,
        action: '手表显示紧急求助卡片；若伴随胸痛、胸闷、呼吸困难、晕厥或大汗，请立即联系急救',
        systemDecision: 'Safety Agent 启用高风险健康背景保护规则，暂停普通情绪归因与社交推送。',
        activityLabel: activity.label,
        careNote: '这不是诊断结论。请先停下活动，按医生给你的方案处理；症状明显时不要等待系统判断。',
      }
    }

    const stressDriven = activity.kind === 'stress' || activity.kind === 'resting' || activity.kind === 'fatigue'
    return {
      id: createId('feedback'),
      replyTo: packet.id,
      sentAt: Date.now(),
      risk,
      moodScore,
      socialScore,
      title: stressDriven ? '静息心率显著偏高' : '系统已接管高压状态',
      message: stressDriven
        ? `当前步频和体动较低，但心率达到 ${packet.heartRate} bpm，明显高于静坐常见区间，建议暂停活动并复测。`
        : '心率和压力信号同时偏高，今天先降社交强度，保留安全陪伴和呼吸引导。',
      action: '手表轻震三次，弹出 60 秒呼吸卡片',
      systemDecision: stressDriven
        ? 'Safety Agent 结合低体动、低 HRV 和持续偏高心率，升级为红色关注。'
        : 'Safety Agent 提升到红色关注，暂停搭子推荐，保留低打扰陪伴。',
      activityLabel: activity.label,
      careNote: '先把其他事情放一放，和我一起慢慢呼吸几次，你不需要一个人硬撑。',
    }
  }

  if (risk === 'attention') {
    if (activity.kind === 'stress') {
      return {
        id: createId('feedback'),
        replyTo: packet.id,
        sentAt: Date.now(),
        risk,
        moodScore,
        socialScore,
        title: '静息心率偏高，先慢下来',
        message: activity.summary,
        action: '手表提示 1 分钟呼吸放松，稍后复测心率',
        systemDecision: `Perception Agent 检测到低体动、${packet.heartRate} bpm 心率，高于静坐常见区间，但尚未达到高风险阈值。`,
        activityLabel: activity.label,
        careNote: '如果你正紧张或专注很久，先松一下肩膀，慢慢呼吸几次。',
      }
    }

    return {
      id: createId('feedback'),
      replyTo: packet.id,
      sentAt: Date.now(),
      risk,
      moodScore,
      socialScore,
      title: '识别到轻度疲劳',
      message: '睡眠或压力指标有波动，系统建议先做低成本恢复，不主动推进复杂社交。',
      action: '手表显示散步提醒，并在 20 分钟后回收反馈',
      systemDecision: 'Decision Agent 落在中间象限，执行运动恢复和温和问候。',
      activityLabel: activity.label,
      careNote: '今天也在认真生活，已经做得够多了，先给自己一点恢复空间。',
    }
  }

  return {
    id: createId('feedback'),
    replyTo: packet.id,
    sentAt: Date.now(),
    risk,
    moodScore,
    socialScore,
    title: '状态稳定，可轻量支持',
    message: '运动、睡眠、心率信号较平衡，可以保持低频陪伴，并开放自愿社交入口。',
    action: '手表显示今日状态摘要，不强推通知',
    systemDecision: 'Decision Agent 保持绿色运行，允许搭子推荐但不打断用户。',
    activityLabel: activity.label,
    careNote: '现在整体挺稳，记得给自己留一点轻松和自在的时间。',
  }
}

function MetricRow({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="flex items-center justify-between border-b border-gray-100 py-2 last:border-b-0">
      <span className="text-xs text-gray-500">{label}</span>
      <span className={`text-xs font-semibold tabular-nums ${tone}`}>{value}</span>
    </div>
  )
}

function RoleButton({ active, label, icon, onClick }: { active: boolean; label: string; icon: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
        active ? 'bg-gray-950 text-white' : 'bg-white text-gray-700 border border-gray-200 hover:border-gray-400'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}

export default function CrossDevicePage({
  embedded = false,
  onBackToSetup,
}: {
  embedded?: boolean
  onBackToSetup?: () => void
}) {
  const [role, setRole] = useState<Role>(getInitialRole)
  const [transport, setTransport] = useState<TransportState>('connecting')
  const [liveTelemetry, setLiveTelemetry] = useState<WatchTelemetry>(INITIAL_TELEMETRY)
  const [heartRateHistory, setHeartRateHistory] = useState<number[]>([INITIAL_TELEMETRY.heartRate])
  const [latestHealth, setLatestHealth] = useState<HealthPacket | null>(null)
  const [latestFeedback, setLatestFeedback] = useState<FeedbackPacket | null>(null)
  const [timeline, setTimeline] = useState<TimelineItem[]>([])
  const [sending, setSending] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [packetsReceived, setPacketsReceived] = useState(0)
  const [watchNoticeOpen, setWatchNoticeOpen] = useState(false)
  const [preparedProfile] = useState(() => loadPreparedProfile())
  const preparedAt = useMemo(
    () => {
      const timestamp = preparedProfile?.preparedAt ? Date.parse(preparedProfile.preparedAt) : 0
      return Number.isFinite(timestamp) ? timestamp : 0
    },
    [preparedProfile]
  )

  const roleRef = useRef(role)
  const broadcastRef = useRef<BroadcastChannel | null>(null)
  const receiveSignalRef = useRef<(signal: CrossDeviceSignal, source: string) => void>(() => undefined)
  const seenSignalsRef = useRef<Set<string>>(new Set())
  const processedHealthRef = useRef<Set<string>>(new Set())
  const lastFeedbackReplyRef = useRef<string | null>(null)
  const lastApiSeenRef = useRef(preparedAt)
  const simulationRef = useRef<RandomSimulationState>({
    phase: 'resting',
    ticksLeft: 2,
    target: createPhaseTarget('resting'),
  })

  const deviceId = useMemo(() => {
    const existing = window.localStorage.getItem('same-wavelength-device-id')
    if (existing) return existing
    const next = createId('device')
    window.localStorage.setItem('same-wavelength-device-id', next)
    return next
  }, [])

  const apiBase = window.location.port === '5173'
    ? ''
    : `${window.location.protocol}//${window.location.hostname || 'localhost'}:3001`

  const roleLinks = useMemo(() => {
    const base = embedded
      ? `${window.location.origin}${window.location.pathname}#/app?stage=monitor`
      : `${window.location.origin}${window.location.pathname}${window.location.search}#/app/cross-device`
    return {
      watch: `${base}${embedded ? '&role=watch' : '?role=watch'}`,
      console: `${base}${embedded ? '&role=console' : '?role=console'}`,
    }
  }, [embedded])

  useEffect(() => {
    roleRef.current = role
  }, [role])

  const appendTimeline = useCallback((item: TimelineItem) => {
    setTimeline((prev) => [item, ...prev].slice(0, 8))
  }, [])

  const publishSignal = useCallback((signal: CrossDeviceSignal, includeLocal = true) => {
    if (includeLocal) receiveSignalRef.current(signal, 'local')

    broadcastRef.current?.postMessage(signal)

    fetch(`${apiBase}/api/cross-device/signal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(signal),
    })
      .then((response) => {
        if (response.ok) setTransport('lan')
      })
      .catch(() => {
        setTransport(broadcastRef.current ? 'local' : 'offline')
      })
  }, [apiBase])

  const processHealthPacket = useCallback((packet: HealthPacket) => {
    if (processedHealthRef.current.has(packet.id)) return
    processedHealthRef.current.add(packet.id)
    setProcessing(true)

    window.setTimeout(() => {
      const feedback = analyzeTelemetry(packet, preparedProfile?.safetyMode ?? false)
      const signal: CrossDeviceSignal = {
        id: createId('signal'),
        kind: 'feedback',
        payload: feedback,
        createdAt: Date.now(),
        sender: deviceId,
      }
      publishSignal(signal)
      setProcessing(false)
    }, 720)
  }, [deviceId, preparedProfile?.safetyMode, publishSignal])

  const receiveSignal = useCallback((signal: CrossDeviceSignal, source: string) => {
    if (!signal?.id || seenSignalsRef.current.has(signal.id)) return
    if (preparedAt > 0 && signal.createdAt < preparedAt) return
    seenSignalsRef.current.add(signal.id)
    lastApiSeenRef.current = Math.max(lastApiSeenRef.current, signal.createdAt)

    if (signal.kind === 'health') {
      const packet = signal.payload as HealthPacket
      setLatestHealth(packet)
      setLatestFeedback((current) => current?.replyTo === packet.id ? current : null)
      setPacketsReceived((prev) => prev + 1)
      appendTimeline({
        id: signal.id,
        time: formatTime(signal.createdAt),
        label: source === 'api' ? '局域网收到手表数据' : '本机收到手表数据',
        detail: `${packet.steps}步 · ${packet.heartRate}bpm · 睡眠${packet.sleepHours.toFixed(1)}h · 压力${packet.stress}`,
        tone: packet.stress >= 78 || packet.heartRate >= 106 ? 'red' : packet.stress >= 55 ? 'amber' : 'blue',
      })

      if (roleRef.current !== 'watch') {
        processHealthPacket(packet)
      }
      return
    }

    const feedback = signal.payload as FeedbackPacket
    if (lastFeedbackReplyRef.current === feedback.replyTo) return
    lastFeedbackReplyRef.current = feedback.replyTo
    setLatestFeedback(feedback)
    appendTimeline({
      id: signal.id,
      time: formatTime(signal.createdAt),
      label: '系统反馈回传',
      detail: `${riskStyle[feedback.risk].label} · 情绪${feedback.moodScore.toFixed(2)} · 社交${feedback.socialScore.toFixed(2)}`,
      tone: feedback.risk === 'high' ? 'red' : feedback.risk === 'attention' ? 'amber' : 'green',
    })
  }, [appendTimeline, preparedAt, processHealthPacket])

  useEffect(() => {
    receiveSignalRef.current = receiveSignal
  }, [receiveSignal])

  useEffect(() => {
    if (!latestFeedback || !latestHealth || latestFeedback.replyTo !== latestHealth.id || role === 'console') {
      setWatchNoticeOpen(false)
      return
    }

    setWatchNoticeOpen(true)
    const timer = window.setTimeout(() => setWatchNoticeOpen(false), 7600)
    return () => window.clearTimeout(timer)
  }, [latestFeedback?.id, latestHealth?.id, role])

  useEffect(() => {
    if ('BroadcastChannel' in window) {
      broadcastRef.current = new BroadcastChannel(CHANNEL_NAME)
      broadcastRef.current.onmessage = (event) => receiveSignalRef.current(event.data, 'broadcast')
    }

    let cancelled = false

    const poll = async () => {
      try {
        const overlapWindowStart = Math.max(0, lastApiSeenRef.current - 1000)
        const response = await fetch(`${apiBase}/api/cross-device/state?after=${overlapWindowStart}`, { cache: 'no-store' })
        if (!response.ok) throw new Error('cross-device api unavailable')
        const data = await response.json() as { signals?: CrossDeviceSignal[]; serverTime?: number }
        if (cancelled) return
        setTransport('lan')
        for (const signal of data.signals ?? []) {
          receiveSignalRef.current(signal, 'api')
        }
      } catch {
        if (!cancelled) setTransport(broadcastRef.current ? 'local' : 'offline')
      }
    }

    poll()
    const timer = window.setInterval(poll, 1100)

    return () => {
      cancelled = true
      window.clearInterval(timer)
      broadcastRef.current?.close()
      broadcastRef.current = null
    }
  }, [apiBase])

  const switchRole = (nextRole: Role) => {
    setRole(nextRole)
    if (embedded) {
      const roleQuery = nextRole === 'lab' ? '' : `&role=${nextRole}`
      window.history.replaceState(null, '', `${window.location.pathname}#/app?stage=monitor${roleQuery}`)
      return
    }
    const roleQuery = nextRole === 'lab' ? '' : `?role=${nextRole}`
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/app/cross-device${roleQuery}`)
  }

  const sendTelemetry = useCallback((snapshot: WatchTelemetry = liveTelemetry) => {
    const packet: HealthPacket = {
      ...snapshot,
      id: createId('health'),
      deviceId,
      sentAt: Date.now(),
    }
    const signal: CrossDeviceSignal = {
      id: createId('signal'),
      kind: 'health',
      payload: packet,
      createdAt: packet.sentAt,
      sender: deviceId,
    }

    setSending(true)
    publishSignal(signal)
    window.setTimeout(() => setSending(false), 420)
  }, [deviceId, liveTelemetry, publishSignal])

  const advanceAndSend = useCallback(() => {
    const next = advanceRandomTelemetry(liveTelemetry, simulationRef.current)
    setLiveTelemetry(next)
    setHeartRateHistory((history) => [...history, next.heartRate].slice(-18))
    sendTelemetry(next)
  }, [liveTelemetry, sendTelemetry])

  useEffect(() => {
    if (role === 'console') return

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.code !== 'Space' && event.key !== ' ') || event.repeat) return

      const target = event.target as HTMLElement | null
      if (target?.isContentEditable || target?.tagName === 'TEXTAREA' || (target?.tagName === 'INPUT' && (target as HTMLInputElement).type === 'text')) {
        return
      }

      event.preventDefault()
      advanceAndSend()
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [advanceAndSend, role])

  const resetSession = () => {
    seenSignalsRef.current.clear()
    processedHealthRef.current.clear()
    lastFeedbackReplyRef.current = null
    lastApiSeenRef.current = 0
    simulationRef.current = {
      phase: 'resting',
      ticksLeft: 2,
      target: createPhaseTarget('resting'),
    }
    setLiveTelemetry(INITIAL_TELEMETRY)
    setHeartRateHistory([INITIAL_TELEMETRY.heartRate])
    setLatestHealth(null)
    setLatestFeedback(null)
    setPacketsReceived(0)
    setTimeline([])
  }

  const transportLabel = {
    connecting: '连接中',
    lan: '设备已连接',
    local: '设备已连接',
    offline: '设备离线',
  }[transport]

  const currentFeedback = latestFeedback && latestHealth && latestFeedback.replyTo === latestHealth.id
    ? latestFeedback
    : null
  const activeRisk = currentFeedback?.risk ?? 'stable'
  const activeRiskStyle = riskStyle[activeRisk]
  const showWatch = role === 'lab' || role === 'watch'
  const showConsole = role === 'lab' || role === 'console'
  const activityInsight = useMemo(() => inferActivity(liveTelemetry), [liveTelemetry])
  const latestInsight = useMemo(() => latestHealth ? inferActivity(latestHealth) : null, [latestHealth])
  const feedbackMatchesCurrentPacket = Boolean(currentFeedback)
  const workflowStage = currentFeedback ? 3 : latestHealth ? 2 : sending ? 1 : 0
  const workflowLabels = ['采集中', '传输中', '系统分析', '反馈回传']
  const heartRateChart = useMemo(() => {
    const values = heartRateHistory.length > 1 ? heartRateHistory : [INITIAL_TELEMETRY.heartRate, liveTelemetry.heartRate]
    const rawMin = Math.min(...values)
    const rawMax = Math.max(...values)
    const min = rawMin - 4
    const max = rawMax + 4
    const span = Math.max(12, max - min)
    const coordinates = values.map((value, index) => ({
      x: (index / Math.max(1, values.length - 1)) * 240,
      y: 58 - ((value - min) / span) * 46,
    }))
    const last = coordinates[coordinates.length - 1]

    return {
      min: rawMin,
      max: rawMax,
      points: coordinates.map((point) => `${point.x},${point.y}`).join(' '),
      areaPath: coordinates.length > 0
        ? `M ${coordinates[0].x} ${coordinates[0].y} ${coordinates.slice(1).map((point) => `L ${point.x} ${point.y}`).join(' ')}`
        : '',
      lastX: last?.x ?? 0,
      lastY: last?.y ?? 58,
    }
  }, [heartRateHistory, liveTelemetry.heartRate])
  const activityVisual = activityTone[activityInsight.kind]
  const heartRateContext = activityInsight.kind === 'running'
    ? '运动'
    : activityInsight.kind === 'walking'
      ? '步行'
      : activityInsight.kind === 'fatigue'
        ? '恢复'
        : '静坐'
  const heartRateStateStyle = activityInsight.heartRateState === 'good'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : activityInsight.heartRateState === 'high'
      ? 'border-red-200 bg-red-50 text-red-700'
      : 'border-amber-200 bg-amber-50 text-amber-700'

  return (
    <div className="flex-1 min-h-0 overflow-y-auto bg-slate-50">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 md:px-6">
        <header className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              {preparedProfile && (
                <div className="mb-2 flex flex-wrap items-center gap-2">
                    <div className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                    <Watch className="h-3.5 w-3.5" />
                    {preparedProfile.modelName}
                  </div>
                  {preparedProfile.safetyMode && (
                    <div className="inline-flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      高风险健康背景保护
                    </div>
                  )}
                </div>
              )}
              <div className="mb-2 inline-flex items-center gap-2 rounded-md border border-sky-100 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
                <Radio className="h-3.5 w-3.5" />
                  设备监测与流转
              </div>
              <h1 className="text-2xl font-bold text-gray-950 md:text-3xl">手表与系统协作</h1>
              <p className="mt-1 text-sm text-gray-600">从生理数据采集到系统判断，再到关怀结果回传。</p>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center">
              <div className="flex flex-wrap gap-2">
                <RoleButton active={role === 'lab'} label="双端视图" icon={<SlidersHorizontal className="h-4 w-4" />} onClick={() => switchRole('lab')} />
                <RoleButton active={role === 'watch'} label="手表端" icon={<Watch className="h-4 w-4" />} onClick={() => switchRole('watch')} />
                <RoleButton active={role === 'console'} label="系统端" icon={<Monitor className="h-4 w-4" />} onClick={() => switchRole('console')} />
              </div>
              <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700">
                {transport === 'lan' ? <Server className="h-4 w-4 text-emerald-600" /> : <Wifi className="h-4 w-4 text-sky-600" />}
                {transportLabel}
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {embedded && onBackToSetup && (
              <button
                type="button"
                onClick={onBackToSetup}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
              >
                返回设备准备
              </button>
            )}
            <button
              type="button"
              onClick={advanceAndSend}
              disabled={role === 'console'}
              className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Activity className="h-3.5 w-3.5" />
              同步最新数据
            </button>
            <a
              href={roleLinks.watch}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:border-sky-300 hover:text-sky-700"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              打开手表端
            </a>
            <a
              href={roleLinks.console}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:border-sky-300 hover:text-sky-700"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              打开系统端
            </a>
            <button
              type="button"
              onClick={resetSession}
              className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:border-gray-400"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              清空本轮
            </button>
          </div>
        </header>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold tracking-[0.16em] text-sky-600">运行流程</p>
              <h2 className="mt-1 text-sm font-bold text-gray-950">数据如何完成跨端闭环</h2>
            </div>
              <span className="text-xs text-gray-500">当前阶段：{workflowLabels[workflowStage]}</span>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {[
              { title: '手表采集', detail: '心率 / 步数 / 体动', icon: Watch },
              { title: '跨端传输', detail: '设备间安全同步', icon: Wifi },
              { title: '系统分析', detail: '状态识别与决策', icon: Monitor },
              { title: '结果回传', detail: '建议与关怀卡片', icon: Bell },
            ].map((step, index) => {
              const Icon = step.icon
              const reached = index <= workflowStage
              const current = index === workflowStage

              return (
                <div key={step.title} className="contents">
                  <div className={`rounded-lg border p-2.5 transition-colors ${
                    current
                      ? 'border-sky-300 bg-sky-50'
                      : reached
                        ? 'border-emerald-200 bg-emerald-50/70'
                        : 'border-gray-200 bg-white'
                  }`}>
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                        current ? 'bg-sky-100 text-sky-700' : reached ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[10px] font-bold text-gray-950 sm:text-xs">{index + 1}. {step.title}</p>
                        <p className="mt-0.5 hidden text-[10px] text-gray-500 sm:block">{step.detail}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <main className={`grid gap-4 ${role === 'lab' ? 'xl:grid-cols-[minmax(320px,0.95fr)_minmax(160px,0.42fr)_minmax(420px,1.25fr)]' : 'grid-cols-1'}`}>
          {showWatch && (
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-bold text-gray-950">
                    <Watch className="h-5 w-5 text-sky-600" />
                    手表端
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">实时同步可穿戴设备采集到的运动和生理状态。</p>
                </div>
                <div className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-[11px] font-semibold text-gray-600">
                  <BatteryMedium className="h-3.5 w-3.5" />
                  {liveTelemetry.battery.toFixed(1)}%
                </div>
              </div>

              <div className="grid gap-4 2xl:grid-cols-[180px_1fr]">
                <div className="mx-auto flex w-[172px] flex-col items-center">
                  <div className="h-4 w-12 rounded-t-full bg-gray-300" />
                  <motion.div
                    className={`relative h-[214px] w-[160px] rounded-[2rem] border-[6px] border-gray-800 bg-gray-950 p-3 shadow-xl ${sending ? 'ring-4 ring-sky-200' : ''}`}
                    animate={sending ? { y: [0, -3, 0], scale: [1, 1.02, 1] } : { y: 0, scale: 1 }}
                    transition={{ duration: 0.42 }}
                  >
                    <div className="flex h-full flex-col justify-between rounded-[1.45rem] bg-[linear-gradient(180deg,#0f172a_0%,#111827_100%)] p-3 text-white">
                      <div className="flex items-center justify-between text-[10px] text-slate-300">
                        <span>Same</span>
                        <Wifi className="h-3 w-3" />
                      </div>
                      <div className="text-center">
                        <motion.div
                          className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-rose-500/15"
                          animate={{ scale: liveTelemetry.heartRate > 110 ? [1, 1.12, 1] : [1, 1.06, 1] }}
                          transition={{ duration: liveTelemetry.heartRate > 110 ? 0.72 : 1.4, repeat: Infinity }}
                        >
                          <Heart className="h-5 w-5 text-rose-300" />
                        </motion.div>
                        <div className="text-3xl font-bold tabular-nums">{liveTelemetry.heartRate}</div>
                        <div className="text-[10px] text-slate-300">bpm</div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-center text-[10px]">
                        <div className="rounded-lg bg-white/8 p-2">
                          <div className="font-semibold tabular-nums">{liveTelemetry.steps}</div>
                          <div className="text-slate-400">steps</div>
                        </div>
                        <div className="rounded-lg bg-white/8 p-2">
                          <div className="font-semibold tabular-nums">{liveTelemetry.stress}</div>
                          <div className="text-slate-400">stress</div>
                        </div>
                      </div>
                    </div>
                    <AnimatePresence>
                      {watchNoticeOpen && latestFeedback && feedbackMatchesCurrentPacket && (
                        <motion.div
                          role="status"
                          initial={{ opacity: 0, y: 22, scale: 0.92 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -14, scale: 0.95 }}
                          transition={{ type: 'spring', stiffness: 330, damping: 27 }}
                          onClick={() => setWatchNoticeOpen(false)}
                          className="absolute inset-[6px] z-20 flex cursor-pointer flex-col justify-between overflow-hidden rounded-[1.45rem] border border-white/15 bg-slate-950/96 p-3 text-white shadow-2xl"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <div className={`flex h-6 w-6 items-center justify-center rounded-full ${
                                latestFeedback.risk === 'high' ? 'bg-red-500/20 text-red-300' : latestFeedback.risk === 'attention' ? 'bg-amber-400/20 text-amber-300' : 'bg-emerald-400/20 text-emerald-300'
                              }`}>
                                {latestFeedback.risk === 'stable' ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
                              </div>
                              <span className={`rounded-full px-1.5 py-0.5 text-[7px] font-bold ${
                                latestFeedback.risk === 'high' ? 'bg-red-400/15 text-red-300' : latestFeedback.risk === 'attention' ? 'bg-amber-400/15 text-amber-300' : 'bg-emerald-400/15 text-emerald-300'
                              }`}>
                                {riskStyle[latestFeedback.risk].label}
                              </span>
                            </div>
                            <p className="mt-3 text-[12px] font-bold leading-snug text-white">{latestFeedback.title}</p>
                          </div>
                          <div className="rounded-lg border border-white/10 bg-white/8 p-2.5">
                            <p className="text-[8px] font-bold uppercase tracking-wider text-sky-300">同频想对你说</p>
                            <p className="mt-1.5 text-[9px] font-medium leading-relaxed text-white">{latestFeedback.careNote}</p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                  <div className="h-4 w-12 rounded-b-full bg-gray-300" />
                </div>

                <div className="space-y-4">
                  <motion.div
                    layout
                    className={`rounded-lg border p-3 ${activityVisual.panel}`}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.25 }}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md ${activityVisual.icon}`}>
                          <Activity className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className={`text-[11px] font-bold uppercase tracking-wider ${activityVisual.label}`}>可能正在发生</p>
                          <p className="mt-0.5 text-sm font-bold text-gray-950">{activityInsight.label}</p>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-md bg-white/80 px-2 py-1 text-[10px] font-semibold text-gray-600">
                        置信度 {activityInsight.confidence}%
                      </span>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-gray-600">{activityInsight.detail}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="rounded-md bg-white/75 p-2">
                        <p className="text-[10px] text-gray-500">步频</p>
                        <p className="mt-0.5 text-xs font-bold tabular-nums text-gray-950">{liveTelemetry.cadence} 步/分</p>
                      </div>
                      <div className="rounded-md bg-white/75 p-2">
                        <p className="text-[10px] text-gray-500">体动强度</p>
                        <p className="mt-0.5 text-xs font-bold tabular-nums text-gray-950">{liveTelemetry.movement}%</p>
                      </div>
                      <div className="rounded-md bg-white/75 p-2">
                        <p className="text-[10px] text-gray-500">HRV</p>
                        <p className="mt-0.5 text-xs font-bold tabular-nums text-gray-950">{liveTelemetry.hrv} ms</p>
                      </div>
                      <div className="rounded-md bg-white/75 p-2">
                        <p className="text-[10px] text-gray-500">心率变化</p>
                        <p className={`mt-0.5 text-xs font-bold tabular-nums ${liveTelemetry.heartRateTrend > 0 ? 'text-rose-700' : liveTelemetry.heartRateTrend < 0 ? 'text-sky-700' : 'text-gray-950'}`}>
                          {liveTelemetry.heartRateTrend > 0 ? '+' : ''}{liveTelemetry.heartRateTrend}
                        </p>
                      </div>
                    </div>
                    <div className={`mt-3 flex items-start gap-2 rounded-md border px-3 py-2 ${heartRateStateStyle}`}>
                      {activityInsight.heartRateState === 'good' ? <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                      <div>
                        <p className="text-xs font-bold">
                          {activityInsight.heartRateLabel} · {heartRateContext}建议区间 {activityInsight.heartRateRange[0]}-{activityInsight.heartRateRange[1]} bpm
                        </p>
                        <p className="mt-0.5 text-[11px] leading-relaxed text-gray-600">{activityInsight.summary}</p>
                      </div>
                    </div>
                  </motion.div>

                  <div className="rounded-lg border border-gray-100 bg-white p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold text-gray-950">心率轨迹</p>
                        <p className="mt-0.5 text-[10px] text-gray-500">最近 {heartRateHistory.length} 次采样</p>
                      </div>
                      <span className={`rounded-md px-2 py-1 text-[10px] font-bold tabular-nums ${
                        liveTelemetry.heartRateTrend > 0 ? 'bg-rose-50 text-rose-700' : liveTelemetry.heartRateTrend < 0 ? 'bg-sky-50 text-sky-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {liveTelemetry.heartRateTrend > 0 ? '+' : ''}{liveTelemetry.heartRateTrend} bpm
                      </span>
                    </div>
                    <svg viewBox="0 0 240 68" className="h-20 w-full overflow-visible" role="img" aria-label="心率变化轨迹">
                      <defs>
                        <linearGradient id="heartRateArea" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="#fb7185" stopOpacity="0.28" />
                          <stop offset="100%" stopColor="#fb7185" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d={`${heartRateChart.areaPath} L 240 68 L 0 68 Z`} fill="url(#heartRateArea)" />
                      <polyline points={heartRateChart.points} fill="none" stroke="#e11d48" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      <circle cx={heartRateChart.lastX} cy={heartRateChart.lastY} r="4" fill="#fff" stroke="#e11d48" strokeWidth="3" />
                    </svg>
                    <div className="flex items-center justify-between text-[10px] tabular-nums text-gray-500">
                      <span>最低 {heartRateChart.min} bpm</span>
                      <span>最高 {heartRateChart.max} bpm</span>
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {latestFeedback && feedbackMatchesCurrentPacket && (
                      <motion.div
                        key={latestFeedback.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        className={`rounded-lg border p-3 ${riskStyle[latestFeedback.risk].bg} ${riskStyle[latestFeedback.risk].border}`}
                      >
                        <div className="mb-2 flex items-center gap-2">
                          <Bell className={`h-4 w-4 ${riskStyle[latestFeedback.risk].text}`} />
                          <span className={`text-xs font-bold ${riskStyle[latestFeedback.risk].text}`}>手表收到反馈</span>
                        </div>
                        <p className="text-sm font-semibold text-gray-950">{latestFeedback.action}</p>
                        <p className="mt-1 text-[11px] font-semibold text-gray-500">活动推测：{latestFeedback.activityLabel}</p>
                        <p className="mt-1 text-xs leading-relaxed text-gray-600">{latestFeedback.message}</p>
                        <p className="mt-1 text-[11px] font-bold tabular-nums text-slate-700">
                          本次评估心率：{latestHealth?.heartRate ?? '--'} bpm
                        </p>
                        <div className="mt-2 rounded-md border border-white/70 bg-white/70 px-2.5 py-2">
                          <p className="text-[10px] font-bold text-sky-700">同频想对你说</p>
                          <p className="mt-1 text-xs leading-relaxed text-gray-700">{latestFeedback.careNote}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </section>
          )}

          {role === 'lab' && (
            <section className="flex min-h-[280px] flex-col justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">Transport</p>
                <h2 className="mt-1 text-sm font-bold text-gray-950">端侧流转</h2>
                <p className="mt-1 text-[11px] leading-relaxed text-gray-500">保留一条可解释链路：手表发出健康包，系统分析后只回传必要建议。</p>
              </div>

              <div className="my-5 grid gap-3">
                <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Watch className="h-4 w-4 text-sky-700" />
                    <span className="text-xs font-semibold text-slate-700">Watch</span>
                  </div>
                  <span className="text-xs font-bold tabular-nums text-slate-950">{liveTelemetry.heartRate} bpm</span>
                </div>

                <div className="relative flex h-20 items-center justify-center">
                  <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-slate-200" />
                  <motion.div
                    className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border border-cyan-100 bg-white shadow-sm"
                    animate={{ y: [-20, 20, -20] }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
                  >
                    <Wifi className="h-4 w-4 text-cyan-700" />
                  </motion.div>
                </div>

                <div className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-indigo-700" />
                    <span className="text-xs font-semibold text-slate-700">System</span>
                  </div>
                  <span className={`text-xs font-bold ${activeRiskStyle.text}`}>{activeRiskStyle.label}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md border border-slate-200 p-3">
                  <p className="text-[10px] text-slate-500">当前阶段</p>
                  <p className="mt-1 text-xs font-bold text-slate-950">{workflowLabels[workflowStage]}</p>
                </div>
                <div className="rounded-md border border-slate-200 p-3">
                  <p className="text-[10px] text-slate-500">接收次数</p>
                  <p className="mt-1 text-xs font-bold tabular-nums text-slate-950">{packetsReceived}</p>
                </div>
              </div>
            </section>
          )}

          {showConsole && (
            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="flex items-center gap-2 text-base font-bold text-gray-950">
                    <Monitor className="h-5 w-5 text-indigo-600" />
                    系统端
                  </h2>
                  <p className="mt-1 text-xs text-gray-500">接收信号后生成情绪、社交和安全决策。</p>
                </div>
                <div className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-bold ${activeRiskStyle.bg} ${activeRiskStyle.border} ${activeRiskStyle.text}`}>
                  {activeRisk === 'high' ? <AlertTriangle className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                  {activeRiskStyle.label}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="space-y-4">
                  <div className="rounded-lg border border-gray-100 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-gray-950">接收数据</h3>
                      <span className="text-xs text-gray-500">累计 {packetsReceived} 次</span>
                    </div>
                    {latestHealth ? (
                      <div className="space-y-1">
                        <MetricRow label="场景" value={latestHealth.scenario} tone="text-gray-900" />
                        <MetricRow label="活动推测" value={latestInsight?.label ?? '分析中'} tone={latestInsight ? activityTone[latestInsight.kind].label : 'text-gray-500'} />
                        <MetricRow label="步数" value={`${latestHealth.steps} 步`} tone="text-sky-700" />
                        <MetricRow
                          label="心率"
                          value={`${latestHealth.heartRate} bpm`}
                          tone={latestInsight?.heartRateState === 'high' ? 'text-red-700' : latestInsight?.heartRateState === 'low' ? 'text-amber-700' : 'text-emerald-700'}
                        />
                        <MetricRow
                          label="心率变化"
                          value={`${latestHealth.heartRateTrend > 0 ? '+' : ''}${latestHealth.heartRateTrend ?? 0} bpm`}
                          tone={latestHealth.heartRateTrend > 0 ? 'text-rose-700' : latestHealth.heartRateTrend < 0 ? 'text-sky-700' : 'text-gray-500'}
                        />
                        <MetricRow label="合理区间" value={latestInsight ? `${latestInsight.heartRateRange[0]}-${latestInsight.heartRateRange[1]} bpm` : '--'} tone="text-indigo-700" />
                        <MetricRow label="步频 / 体动" value={`${latestHealth.cadence} 步/分 · ${latestHealth.movement}%`} tone="text-cyan-700" />
                        <MetricRow label="睡眠" value={`${latestHealth.sleepHours.toFixed(1)} h`} tone={latestHealth.sleepHours < 5 ? 'text-red-700' : 'text-indigo-700'} />
                        <MetricRow label="压力" value={`${latestHealth.stress}/100`} tone={latestHealth.stress >= 78 ? 'text-red-700' : latestHealth.stress >= 55 ? 'text-amber-700' : 'text-emerald-700'} />
                        <MetricRow label="HRV" value={`${latestHealth.hrv} ms`} tone={latestHealth.hrv < 35 ? 'text-amber-700' : 'text-emerald-700'} />
                        <MetricRow label="时间" value={formatTime(latestHealth.sentAt)} tone="text-gray-900" />
                      </div>
                    ) : (
                      <div className="flex h-36 items-center justify-center rounded-md border border-dashed border-gray-200 text-center text-xs text-gray-500">
                        等待手表端数据
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border border-gray-100 bg-white p-4">
                    <h3 className="mb-3 text-sm font-bold text-gray-950">处理链路</h3>
                    <div className="space-y-3">
                      {[
                        { label: 'Perception Agent', active: Boolean(latestHealth), desc: '解析健康信号' },
                        { label: 'Decision Agent', active: Boolean(currentFeedback), desc: latestInsight ? `活动推测：${latestInsight.label}` : '映射九宫格策略' },
                        { label: 'Safety Agent', active: activeRisk !== 'stable', desc: '检查风险和打扰预算' },
                      ].map((node) => (
                        <div key={node.label} className="flex items-center gap-3">
                          <div className={`flex h-8 w-8 items-center justify-center rounded-md ${node.active ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                            {node.active ? <CheckCircle className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-gray-950">{node.label}</p>
                            <p className="text-[11px] text-gray-500">{node.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg border border-gray-100 bg-white p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-gray-950">回传反馈</h3>
                      {processing && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-sky-700">
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          处理中
                        </span>
                      )}
                    </div>

                    {latestFeedback && feedbackMatchesCurrentPacket ? (
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={latestFeedback.id}
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className={`rounded-lg border p-4 ${activeRiskStyle.bg} ${activeRiskStyle.border}`}
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                              <p className={`text-xs font-bold ${activeRiskStyle.text}`}>{activeRiskStyle.label}</p>
                              <h3 className="mt-1 text-lg font-bold text-gray-950">{latestFeedback.title}</h3>
                              <p className="mt-1 text-xs font-semibold text-gray-600">活动推测：{latestFeedback.activityLabel}</p>
                            </div>
                            <Smartphone className={`h-5 w-5 ${activeRiskStyle.text}`} />
                          </div>
                          <p className="text-sm leading-relaxed text-gray-700">{latestFeedback.message}</p>
                          <div className="mt-3 flex items-center justify-between rounded-md border border-white/70 bg-white/80 px-3 py-2 text-xs">
                            <span className="text-gray-500">本次评估心率</span>
                            <span className="font-bold tabular-nums text-gray-950">
                              {latestHealth?.heartRate ?? '--'} bpm
                              {latestHealth ? ` · ${formatTime(latestHealth.sentAt)}` : ''}
                            </span>
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-3">
                            <div className="rounded-md bg-white/80 p-3">
                              <p className="text-[11px] text-gray-500">情绪评分</p>
                              <p className="mt-1 text-xl font-bold tabular-nums text-gray-950">{latestFeedback.moodScore.toFixed(2)}</p>
                            </div>
                            <div className="rounded-md bg-white/80 p-3">
                              <p className="text-[11px] text-gray-500">社交意愿</p>
                              <p className="mt-1 text-xl font-bold tabular-nums text-gray-950">{latestFeedback.socialScore.toFixed(2)}</p>
                            </div>
                          </div>
                          <div className="mt-3 rounded-md bg-white/80 p-3">
                            <p className="text-[11px] font-bold text-gray-500">系统动作</p>
                            <p className="mt-1 text-xs leading-relaxed text-gray-700">{latestFeedback.systemDecision}</p>
                          </div>
                          <div className="mt-3 rounded-md bg-white/80 p-3">
                            <p className="text-[11px] font-bold text-gray-500">回传手表</p>
                            <p className="mt-1 text-xs leading-relaxed text-gray-700">{latestFeedback.careNote}</p>
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    ) : (
                      <div className="flex h-52 items-center justify-center rounded-md border border-dashed border-gray-200 text-center text-xs text-gray-500">
                        {processing ? '正在分析当前数据包' : '等待生成反馈'}
                      </div>
                    )}
                  </div>

                  <div className="rounded-lg border border-gray-100 bg-white p-4">
                    <h3 className="mb-3 text-sm font-bold text-gray-950">通信日志</h3>
                    <div className="space-y-2">
                      {timeline.length > 0 ? timeline.map((item) => (
                        <div key={item.id} className="grid grid-cols-[64px_10px_1fr] gap-3 text-xs">
                          <span className="pt-0.5 text-[11px] tabular-nums text-gray-400">{item.time}</span>
                          <span className={`mt-1.5 h-2.5 w-2.5 rounded-full ${
                            item.tone === 'red' ? 'bg-red-500' : item.tone === 'amber' ? 'bg-amber-500' : item.tone === 'green' ? 'bg-emerald-500' : 'bg-sky-500'
                          }`} />
                          <div className="min-w-0">
                            <p className="font-semibold text-gray-900">{item.label}</p>
                            <p className="mt-0.5 truncate text-gray-500">{item.detail}</p>
                          </div>
                        </div>
                      )) : (
                        <div className="rounded-md border border-dashed border-gray-200 py-8 text-center text-xs text-gray-500">
                          暂无通信记录
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}
