import { useState, useEffect, useCallback, useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { motion, AnimatePresence } from 'framer-motion'
import TopBar from '../components/TopBar'
import {
  Brain as BrainIcon,
  ChevronLeft,
  ChevronRight,
  Database,
  Eye,
  Play,
  Shield,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Target,
  type LucideIcon,
} from 'lucide-react'
import StateControl from '../components/StateControl'
import DecisionPanel from '../components/DecisionPanel'
import DeviceMocks from '../components/DeviceMocks'
import MemoryLayerVisualization from '../components/MemoryLayerVisualization'
import { GRID_MATRIX, MoodTier, SocialWillingnessTier, DEMO_SCENARIOS, initSnapshots, type DashboardState } from '../engine/GodModeBridge'
import type { Snapshot } from '../engine/GodModeBridge'

const MOOD_LOW = 0.4; const MOOD_HIGH = 0.65
const SOCIAL_LOW = 0.4; const SOCIAL_HIGH = 0.65

function classifyTier(score: number, low: number, high: number): 'low' | 'medium' | 'high' {
  if (score < low) return 'low'; if (score > high) return 'high'; return 'medium'
}

function cleanLabel(label: string) {
  return label.replace(/^[^A-Za-z0-9\u4e00-\u9fff]+/, '').trim()
}

interface SlideMeta {
  id: string
  eyebrow: string
  title: string
  relation: string
  icon: LucideIcon
}

const SLIDES: SlideMeta[] = [
  { id: 'state', eyebrow: '01 · INPUT', title: '状态输入台', relation: '原始状态与约束', icon: SlidersHorizontal },
  { id: 'decision', eyebrow: '02 · DECISION', title: 'L1 决策矩阵', relation: '状态 → 风险与动作', icon: Target },
  { id: 'memory', eyebrow: '03 · CONTEXT', title: '记忆与深度规划', relation: '决策 → 记忆召回 / L2', icon: Database },
  { id: 'agents', eyebrow: '04 · AGENTS', title: 'Agent 协作链', relation: '多 Agent → 推理解释', icon: BrainIcon },
  { id: 'delivery', eyebrow: '05 · 执行', title: '多端执行结果', relation: '决策 → 卡片与设备', icon: Smartphone },
]

const AGENT_ICONS: Record<string, LucideIcon> = {
  eye: Eye,
  brain: BrainIcon,
  target: Target,
  shield: Shield,
  smartphone: Smartphone,
  sparkles: Sparkles,
}

const AGENT_PIPELINE = [
  { name: '感知 Agent', icon: 'eye', role: '采集生理、环境与使用信号', color: '#34d399' },
  { name: '记忆 Agent', icon: 'brain', role: '召回长期偏好与近期变化', color: '#a78bfa' },
  { name: '决策 Agent', icon: 'target', role: '执行 L1 九宫格与 L2 规划', color: '#22d3ee' },
  { name: '安全 Agent', icon: 'shield', role: '检查风险、预算与危机协议', color: '#f59e0b' },
  { name: '执行 Agent', icon: 'smartphone', role: '生成卡片并下发到多端设备', color: '#6366f1' },
  { name: '反思 Agent', icon: 'sparkles', role: '回收效果并更新后续策略', color: '#ec4899' },
]

const DEMO_STAGES = [
  { slideId: 'state', mood: 0.68, social: 0.60, agent: '模拟器', message: '载入初始状态与约束条件' },
  { slideId: 'decision', mood: 0.52, social: 0.48, agent: '决策Agent', message: '状态变化触发 L1 九宫格重新判断' },
  { slideId: 'memory', mood: 0.40, social: 0.38, agent: '记忆Agent', message: '召回近期趋势与长期偏好，触发 L2 深度规划' },
  { slideId: 'agents', mood: 0.36, social: 0.34, agent: 'Agent联邦', message: '感知、记忆、决策、安全、执行与反思开始协作' },
  { slideId: 'delivery', mood: 0.62, social: 0.56, agent: '执行Agent', message: '生成关怀卡片并同步到手表、手机和桌面端，状态回到稳定区间' },
]

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 60 : -60, opacity: 0, scale: 0.985 }),
  center: { x: 0, opacity: 1, scale: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -60 : 60, opacity: 0, scale: 0.985 }),
}

export default function GodModePage() {
  const appRef = useRef<HTMLDivElement>(null)
  const [mood, setMood] = useState(0.68)
  const [social, setSocial] = useState(0.60)
  const [solitude, setSolitude] = useState(false)
  const [nightMode, setNightMode] = useState(false)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [demoStage, setDemoStage] = useState(0)
  const [events, setEvents] = useState<{ time: string; type: string; description: string }[]>([])
  const [crisisActive, setCrisisActive] = useState(false)
  const [overrideLabel, setOverrideLabel] = useState('')
  const [demoRunning, setDemoRunning] = useState(false)
  const [thinkChain, setThinkChain] = useState<{ time: string; agent: string; icon: string; color: string; message: string }[]>([])
  const [autoPlay, setAutoPlay] = useState(false)
  const [slideIndex, setSlideIndex] = useState(0)
  const [slideDirection, setSlideDirection] = useState(1)
  const prevQuadrant = useRef<number | null>(null)
  const autoPlayRef = useRef(false)

  const addEvent = (type: string, desc: string) => {
    const now = new Date().toLocaleTimeString()
    setEvents(prev => [{ time: now, type, description: desc }, ...prev].slice(0, 80))
  }

  // 入口动画
  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { duration: 0.5, ease: 'power2.out' } })
    tl.fromTo('.entrance-top', { y: -30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4 })
      .fromTo('.entrance-left', { x: -30, opacity: 0 }, { x: 0, opacity: 1 }, '-=0.2')
      .fromTo('.entrance-center', { scale: 0.96, opacity: 0 }, { scale: 1, opacity: 1 }, '-=0.2')
      .fromTo('.entrance-right', { x: 30, opacity: 0 }, { x: 0, opacity: 1 }, '-=0.2')
  }, [appRef])

  // 初始化快照
  useEffect(() => {
    initSnapshots().then(snaps => {
      setSnapshots(snaps)
    })
  }, [])

  const goToSlide = useCallback((target: number) => {
    setSlideIndex((current) => {
      const count = SLIDES.length
      const next = ((target % count) + count) % count
      setSlideDirection(next >= current ? 1 : -1)
      return next
    })
  }, [])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.isContentEditable || target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.tagName === 'SELECT') return
      if (event.key === 'ArrowLeft') goToSlide(slideIndex - 1)
      if (event.key === 'ArrowRight') goToSlide(slideIndex + 1)
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goToSlide, slideIndex])

  const applyDemoStage = useCallback((index: number, writeLog = true) => {
    const stage = DEMO_STAGES[index]
    if (!stage) return

    setDemoStage(index)
    setMood(stage.mood)
    setSocial(stage.social)

    const targetSlide = SLIDES.findIndex((slide) => slide.id === stage.slideId)
    if (targetSlide >= 0) goToSlide(targetSlide)
    if (writeLog) addEvent(stage.agent, stage.message)
  }, [goToSlide])

  // 当前九宫格
  const moodTier = classifyTier(mood, MOOD_LOW, MOOD_HIGH) as MoodTier
  const socialTier = classifyTier(social, SOCIAL_LOW, SOCIAL_HIGH) as SocialWillingnessTier
  const cell = GRID_MATRIX[moodTier][socialTier]

  // 象限变化时触发 GSAP
  useGSAP(() => {
    if (prevQuadrant.current !== null && prevQuadrant.current !== cell.quadrantNumber) {
      gsap.fromTo('.quadrant-transition', { scale: 0.9, opacity: 0.5 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.5)' })
    }
    prevQuadrant.current = cell.quadrantNumber
  }, [cell.quadrantNumber])

  // 风险等级
  let riskLevel: DashboardState['riskLevel'] = 'green'
  if (mood < 0.3) riskLevel = 'red'
  else if (mood < 0.45) riskLevel = 'orange'
  else if (mood < 0.6) riskLevel = 'yellow'

  // 应用场景
  const applyScenario = (id: string) => {
    const s = DEMO_SCENARIOS.find(d => d.id === id)
    if (!s) return
    setMood(s.presets.moodScore)
    setSocial(s.presets.socialWillingnessScore)
    setOverrideLabel(cleanLabel(s.name))
    addEvent('override', `切换: ${cleanLabel(s.name)}`)
  }

  // 危机
  const triggerCrisis = () => {
    setCrisisActive(true)
    setMood(0.22)
    setSocial(0.12)
    addEvent('crisis', '🔴 危机关键词 → 安全Agent接管')
    gsap.fromTo('.crisis-overlay', { opacity: 0 }, { opacity: 1, duration: 0.15, yoyo: true, repeat: 3 })
    setTimeout(() => setCrisisActive(false), 5000)
  }

  // 卡片数据
  const cardData = (() => {
    if (crisisActive) return { type: 'crisis_card' as const, title: '🛡️ 我在这里', subtitle: '你不必一个人面对', body: '校心理咨询: 021-xxxx-xxxx\n24h热线: 400-161-9995', actionLabel: '和我聊聊' }
    const q = cell.quadrantNumber
    if (q >= 7) return { type: 'mood_card' as const, title: '🌙 今日心情', subtitle: '状态不错', body: '睡眠7.1h · 步数6800', actionLabel: '查看详情' }
    if (q <= 3) return { type: 'mood_card' as const, title: '🌧️ 我在听', subtitle: '最近好像有点累？', body: '不想说话也没关系\n我一直在。', actionLabel: '和我聊聊' }
    if (cell.primaryIntervention?.includes('buddy')) return { type: 'buddy_card' as const, title: '🔗 搭子推荐', subtitle: '图书馆3楼，2个同学', body: '用户A: 大三计科\n用户B: 大二软工', actionLabel: '看看是谁' }
    return { type: 'mood_card' as const, title: '🌤️ 今日心情', subtitle: '一切还好', body: '今日推送0次', actionLabel: '查看详情' }
  })()

  // 记忆数据（传递给可视化组件）
  const memoryItems = [
    { id: 'm1', content: '用户人格: 偏内向(0.65), 偏好1v1', layer: 'long_term' as const, relevance: 0.82, lastUsed: '2h前' },
    { id: 'm2', content: '有效干预: 运动建议(响应率80%)', layer: 'long_term' as const, relevance: 0.75, lastUsed: '6h前' },
    { id: 'm3', content: '硬性约束: 21:00后不推送', layer: 'long_term' as const, relevance: 0.90, lastUsed: '立即' },
    { id: 'm4', content: '最近3天情绪下降趋势', layer: 'short_term' as const, relevance: 0.68, lastUsed: '1h前' },
    { id: 'm5', content: '当前对话上下文: 算法作业写不出来', layer: 'instant' as const, relevance: 0.95, lastUsed: '现在' },
  ]

  const dashboard: DashboardState = {
    moodScore: Math.round(mood * 100) / 100,
    socialScore: Math.round(social * 100) / 100,
    solitudeMode: solitude, nightMode,
    riskLevel,
    currentQuadrant: cell.quadrant,
    quadrantNumber: cell.quadrantNumber,
    quadrantDescription: cleanLabel(nightMode ? '夜间—仅危机推送' : solitude ? '独处—社交降级' : cell.description),
    primaryAction: cell.primaryIntervention ?? '无',
    moodTrend: snapshots.slice(0, Math.max(1, (demoStage + 1) * 4)).map((s, i) => ({
      date: `Day${Math.floor(i/8)+1}`, score: s.mood.overallScore, overridden: false,
    })),
    recalledMemories: memoryItems.map(m => ({ id: m.id, content: m.content, source: m.layer === 'long_term' ? '长期记忆' : m.layer === 'short_term' ? '短期记忆' : '瞬时记忆', relevance: m.relevance })),
    activeConstraints: (nightMode ? ['夜间勿扰', '21:00后不推送'] : solitude ? ['独处模式', '社交降级'] : ['21:00后不推送']),
    l2TaskChain: cell.quadrantNumber <= 2 ? {
      name: '3天渐进干预计划', progress: 'Day 1/3', status: 'active',
      nodes: [{ name: 'Day1: 共情对话', status: 'active' }, { name: 'Day2: 运动建议', status: 'pending' }, { name: 'Day3: 效果评估', status: 'pending' }],
    } : null,
    safetyStatus: crisisActive ? '接管' : riskLevel === 'red' ? '警戒' : '运行',
    pushBudget: { used: Math.min(5, demoStage + 1), max: 5 },
    activeCooldowns: [],
    crisisProtocol: crisisActive ? '一级响应—延长陪伴' : '无活跃协议',
    simulationDay: Math.min(3, Math.floor(demoStage / 2) + 1),
    simulationProgress: Math.round((demoStage + 1) / DEMO_STAGES.length * 100),
    events,
  }


  // ===== Agent 自动演示 =====
  const addThink = (agent: string, icon: string, color: string, message: string) => {
    const now = new Date().toLocaleTimeString()
    setThinkChain(prev => [...prev, { time: now, agent, icon, color, message }])
    addEvent(agent, message)
  }

  const runAutoDemo = async () => {
    if (demoRunning) return

    autoPlayRef.current = true
    setAutoPlay(true)
    setDemoRunning(true)
    setThinkChain([])

    for (let index = 0; index < DEMO_STAGES.length; index += 1) {
      if (!autoPlayRef.current) break
      const stage = DEMO_STAGES[index]
      applyDemoStage(index)

      if (stage.slideId === 'agents') {
        for (const agent of AGENT_PIPELINE) {
          if (!autoPlayRef.current) break
          await new Promise((resolve) => window.setTimeout(resolve, 340))
          addThink(agent.name, agent.icon, agent.color, agent.role)
        }
        await new Promise((resolve) => window.setTimeout(resolve, 900))
      } else {
        await new Promise((resolve) => window.setTimeout(resolve, index === 0 ? 1000 : 2200))
      }
    }

    autoPlayRef.current = false
    setAutoPlay(false)
    setDemoRunning(false)
  }

  const advanceDemoStep = () => {
    if (demoRunning) return
    const currentStage = DEMO_STAGES.findIndex((stage) => stage.slideId === activeSlide.id)
    const next = currentStage < 0 ? 0 : (currentStage + 1) % DEMO_STAGES.length
    applyDemoStage(next)
  }

  const toggleAutoDemo = () => {
    if (autoPlayRef.current) {
      autoPlayRef.current = false
      setAutoPlay(false)
      setDemoRunning(false)
      return
    }
    void runAutoDemo()
  }

  const resetDemo = () => {
    autoPlayRef.current = false
    setAutoPlay(false)
    setDemoRunning(false)
    setThinkChain([])
    setEvents([])
    setCrisisActive(false)
    setSolitude(false)
    setNightMode(false)
    setOverrideLabel('')
    goToSlide(0)
    applyDemoStage(0, false)
  }

  const activeSlide = SLIDES[slideIndex]
  const ActiveSlideIcon = activeSlide.icon

  return (
    <div ref={appRef} className={`h-screen min-h-0 flex flex-col overflow-hidden ${crisisActive ? 'crisis-flash' : ''}`}>
      <div className="crisis-overlay fixed inset-0 pointer-events-none z-50 opacity-0 bg-red-500/5" />

      <div className="entrance-top">
        <TopBar onScenario={applyScenario} onStep={advanceDemoStep}
          snapIdx={demoStage} totalSnaps={DEMO_STAGES.length} overrideLabel={overrideLabel}
          autoPlay={autoPlay} onAutoPlay={toggleAutoDemo} onReset={resetDemo} />
      </div>

      <main className="flex-1 min-h-0 flex flex-col gap-3 overflow-hidden p-4">
        <div className="shrink-0 flex items-center gap-1.5 overflow-x-auto rounded-xl border border-purple-100/40 bg-white/55 p-2 backdrop-blur-md">
          {SLIDES.map((slide, index) => {
            const Icon = slide.icon
            const active = index === slideIndex
            return (
              <div key={slide.id} className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => goToSlide(index)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-all ${
                    active ? 'bg-gray-950 text-white shadow-sm' : 'text-gray-600 hover:bg-white hover:text-gray-950'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{slide.title}</span>
                </button>
                {index < SLIDES.length - 1 && <ChevronRight className="h-3 w-3 text-purple-300" />}
              </div>
            )
          })}
        </div>

        <section className="relative flex-1 min-h-0 overflow-hidden rounded-2xl border border-purple-100/50 bg-white/55 shadow-sm backdrop-blur-md">
          <button
            type="button"
            aria-label="上一页"
            title="上一页"
            onClick={() => goToSlide(slideIndex - 1)}
            className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-purple-100 bg-white/95 text-gray-700 shadow-md transition-all hover:border-purple-300 hover:text-purple-700"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <div className="h-full overflow-hidden px-16 py-4">
            <AnimatePresence mode="wait" custom={slideDirection}>
              <motion.div
                key={activeSlide.id}
                custom={slideDirection}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="h-full min-h-0 overflow-y-auto pr-1"
              >
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
                      <ActiveSlideIcon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold tracking-[0.18em] text-purple-500">{activeSlide.eyebrow}</p>
                      <h2 className="mt-0.5 text-xl font-bold text-gray-950">{activeSlide.title}</h2>
                    </div>
                  </div>
                  <span className="rounded-full border border-purple-200 bg-purple-50 px-3 py-1.5 text-xs font-semibold text-purple-700">
                    {activeSlide.relation}
                  </span>
                </div>

                {activeSlide.id === 'state' && (
                  <div className="grid gap-4 xl:grid-cols-[minmax(300px,0.78fr)_minmax(0,1.22fr)]">
                    <StateControl mood={mood} social={social} solitude={solitude} nightMode={nightMode}
                      crisisActive={crisisActive}
                      onMoodChange={v => { setMood(v); setOverrideLabel('手动') }}
                      onSocialChange={v => { setSocial(v); setOverrideLabel('手动') }}
                      onSolitudeToggle={() => { setSolitude(!solitude); addEvent('override', `独处: ${!solitude ? '开' : '关'}`) }}
                      onNightToggle={() => { setNightMode(!nightMode); addEvent('override', `夜间: ${!nightMode ? '开' : '关'}`) }}
                      onCrisis={triggerCrisis} />

                    <div className="grid auto-rows-fr items-stretch gap-3 md:grid-cols-2">
                      <div className="rounded-xl border border-purple-100/50 bg-white/75 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500">核心变量</p>
                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div className="rounded-lg bg-purple-50 p-3">
                            <p className="text-[10px] text-gray-500">情绪评分</p>
                            <p className="mt-1 text-2xl font-bold tabular-nums text-gray-950">{dashboard.moodScore.toFixed(2)}</p>
                          </div>
                          <div className="rounded-lg bg-sky-50 p-3">
                            <p className="text-[10px] text-gray-500">社交意愿</p>
                            <p className="mt-1 text-2xl font-bold tabular-nums text-gray-950">{dashboard.socialScore.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-purple-100/50 bg-white/75 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500">环境约束</p>
                        <div className="mt-3 space-y-2">
                          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs">
                            <span className="text-gray-600">独处模式</span>
                            <span className={`font-bold ${solitude ? 'text-purple-700' : 'text-gray-400'}`}>{solitude ? '开启' : '关闭'}</span>
                          </div>
                          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs">
                            <span className="text-gray-600">夜间免打扰</span>
                            <span className={`font-bold ${nightMode ? 'text-indigo-700' : 'text-gray-400'}`}>{nightMode ? '开启' : '关闭'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl border border-purple-100/50 bg-white/75 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500">场景扰动</p>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          {DEMO_SCENARIOS.map(scenario => (
                            <button key={scenario.id} type="button" onClick={() => applyScenario(scenario.id)}
                              className={`rounded-lg border px-3 py-2 text-left text-xs font-semibold transition-colors ${
                                overrideLabel === scenario.name ? 'border-purple-300 bg-purple-50 text-purple-700' : 'border-gray-200 bg-white text-gray-600 hover:border-purple-200'
                              }`}>
                              {cleanLabel(scenario.name)}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl border border-purple-100/50 bg-white/75 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500">即时风险</p>
                        <div className="mt-3 flex items-center gap-3">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold ${
                            riskLevel === 'red' ? 'bg-red-100 text-red-700' : riskLevel === 'orange' ? 'bg-orange-100 text-orange-700' : riskLevel === 'yellow' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {dashboard.quadrantNumber}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-gray-950">{dashboard.quadrantDescription}</p>
                            <p className="mt-1 text-xs text-gray-500">{dashboard.primaryAction}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSlide.id === 'decision' && (
                  <DecisionPanel dashboard={dashboard} moodTier={moodTier} socialTier={socialTier} crisisActive={crisisActive} />
                )}

                {activeSlide.id === 'memory' && (
                  <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.75fr)_minmax(0,1.25fr)]">
                    <MemoryLayerVisualization memories={memoryItems} activeQuadrant={cell.quadrantNumber} />
                    <div className="space-y-3">
                      <div className="rounded-xl border border-purple-100/50 bg-white/75 p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500">本次决策召回</p>
                            <h3 className="mt-1 text-sm font-bold text-gray-950">记忆如何影响判断</h3>
                          </div>
                          <Database className="h-5 w-5 text-purple-500" />
                        </div>
                        <div className="mt-3 grid gap-2 md:grid-cols-2">
                          {dashboard.recalledMemories.map(memory => (
                            <div key={memory.id} className="rounded-lg border border-gray-100 bg-gray-50/80 p-3">
                              <p className="text-xs font-medium leading-relaxed text-gray-800">{memory.content}</p>
                              <div className="mt-2 flex items-center justify-between text-[10px]">
                                <span className="text-purple-600">{memory.source}</span>
                                <span className="font-mono text-gray-500">相关度 {(memory.relevance * 100).toFixed(0)}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl border border-purple-100/50 bg-white/75 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500">L2 触发关系</p>
                        {dashboard.l2TaskChain ? (
                          <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                              <p className="text-sm font-bold text-gray-950">{dashboard.l2TaskChain.name}</p>
                              <p className="mt-1 text-xs text-gray-500">连续低状态才会进入深度规划，避免单次波动过度干预。</p>
                            </div>
                            <span className="rounded-full bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700">{dashboard.l2TaskChain.progress}</span>
                          </div>
                        ) : (
                          <p className="mt-3 text-xs leading-relaxed text-gray-500">当前状态未触发 L2。只有持续下降并满足风险条件时，才会进入多日渐进计划。</p>
                        )}
                      </div>

                      <div className="rounded-xl border border-purple-100/50 bg-white/75 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500">当前约束</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {dashboard.activeConstraints.map(constraint => (
                            <span key={constraint} className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600">{constraint}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeSlide.id === 'agents' && (
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 rounded-xl border border-purple-100/50 bg-white/75 p-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-950">一次状态输入会经过六个协作阶段</p>
                        <p className="mt-1 text-xs text-gray-500">演示不会改变前面板块的职责，只展示 Agent 之间的信息交接。</p>
                      </div>
                      <button onClick={runAutoDemo} disabled={demoRunning}
                        className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-xs font-bold transition-colors ${
                          demoRunning ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-950 text-white hover:bg-gray-800'
                        }`}>
                        <Play className="h-4 w-4" />
                        {demoRunning ? '推演进行中' : '运行完整推演'}
                      </button>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {AGENT_PIPELINE.map((agent, index) => {
                        const Icon = AGENT_ICONS[agent.icon] ?? Sparkles
                        return (
                          <div key={agent.name} className="rounded-xl border border-purple-100/50 bg-white/75 p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ backgroundColor: `${agent.color}18`, color: agent.color }}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <span className="text-[10px] font-bold tracking-wider text-gray-400">STEP {index + 1}</span>
                            </div>
                            <p className="mt-3 text-sm font-bold text-gray-950">{agent.name}</p>
                            <p className="mt-1 text-xs leading-relaxed text-gray-500">{agent.role}</p>
                          </div>
                        )
                      })}
                    </div>

                    <div className="rounded-xl border border-purple-100/50 bg-white/75 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500">Agent Think Chain</p>
                          <h3 className="mt-1 text-sm font-bold text-gray-950">实时协作风暴</h3>
                        </div>
                        <span className="text-xs text-gray-500">{thinkChain.length} 条推理记录</span>
                      </div>
                      <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                        {thinkChain.length === 0 ? (
                          <div className="rounded-lg border border-dashed border-gray-200 py-10 text-center text-xs text-gray-400">
                            运行完整推演后，这里会按时间显示各 Agent 的协作过程
                          </div>
                        ) : (
                          <AnimatePresence>
                            {thinkChain.map((item, index) => {
                              const Icon = AGENT_ICONS[item.icon] ?? Sparkles
                              return (
                                <motion.div key={`${item.time}-${index}`} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                                  className="flex items-start gap-3 rounded-lg border border-gray-100 bg-gray-50/70 p-3">
                                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${item.color}18`, color: item.color }}>
                                    <Icon className="h-3.5 w-3.5" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold" style={{ color: item.color }}>{item.agent}</span>
                                      <span className="text-[10px] tabular-nums text-gray-400">{item.time}</span>
                                    </div>
                                    <p className="mt-1 text-xs leading-relaxed text-gray-600">{item.message}</p>
                                  </div>
                                </motion.div>
                              )
                            })}
                          </AnimatePresence>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {activeSlide.id === 'delivery' && (
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
                    <DeviceMocks cardData={cardData} crisisActive={crisisActive} mood={mood} social={social} />
                    <div className="space-y-3">
                      <div className="rounded-xl border border-purple-100/50 bg-white/75 p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500">执行状态</p>
                        <div className="mt-3 space-y-2">
                          {[
                            ['安全状态', dashboard.safetyStatus],
                            ['危机协议', dashboard.crisisProtocol],
                            ['推送预算', `${dashboard.pushBudget.used} / ${dashboard.pushBudget.max}`],
                            ['当前象限', `#${dashboard.quadrantNumber} ${dashboard.quadrantDescription}`],
                          ].map(([label, value]) => (
                            <div key={label} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs">
                              <span className="text-gray-500">{label}</span>
                              <span className="font-bold text-gray-900">{value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl border border-purple-100/50 bg-white/75 p-4">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-purple-500">最近事件</p>
                          <span className="text-xs text-gray-400">{dashboard.events.length} 条</span>
                        </div>
                        <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                          {dashboard.events.slice(0, 8).map((event, index) => (
                            <div key={`${event.time}-${index}`} className="grid grid-cols-[52px_1fr] gap-3 rounded-lg bg-gray-50/70 px-3 py-2 text-xs">
                              <span className="tabular-nums text-gray-400">{event.time}</span>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-800">[{event.type}]</p>
                                <p className="mt-0.5 break-words text-gray-500">{event.description}</p>
                              </div>
                            </div>
                          ))}
                          {dashboard.events.length === 0 && <p className="py-8 text-center text-xs text-gray-400">暂无事件</p>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <button
            type="button"
            aria-label="下一页"
            title="下一页"
            onClick={() => goToSlide(slideIndex + 1)}
            className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-purple-100 bg-white/95 text-gray-700 shadow-md transition-all hover:border-purple-300 hover:text-purple-700"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </section>

        <nav aria-label="上帝模式功能页" className="shrink-0 rounded-xl border border-purple-100/50 bg-white/60 px-4 py-3 backdrop-blur-md">
          <div className="relative flex items-start justify-between">
            <div className="absolute left-[10%] right-[10%] top-4 h-px bg-gray-200" />
            <div
              className="absolute left-[10%] top-4 h-px bg-purple-500 transition-all duration-300"
              style={{ width: `${(slideIndex / Math.max(1, SLIDES.length - 1)) * 80}%` }}
            />
            {SLIDES.map((slide, index) => {
              const reached = index <= slideIndex
              const active = index === slideIndex

              return (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => goToSlide(index)}
                  className="relative z-10 flex min-w-0 flex-1 flex-col items-center gap-1.5"
                >
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-colors ${
                    active
                      ? 'border-purple-600 bg-purple-600 text-white'
                      : reached
                        ? 'border-purple-300 bg-white text-purple-700'
                        : 'border-gray-200 bg-white text-gray-400'
                  }`}>
                    {index + 1}
                  </span>
                  <span className={`max-w-full truncate text-[10px] font-semibold ${active ? 'text-purple-800' : reached ? 'text-gray-700' : 'text-gray-400'}`}>
                    {slide.title}
                  </span>
                </button>
              )
            })}
          </div>
        </nav>
      </main>
    </div>
  )
}
