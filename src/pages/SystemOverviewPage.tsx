import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Brain as BrainIcon,
  ChevronLeft,
  ChevronRight,
  Database,
  Eye,
  Laptop,
  Moon,
  Radio,
  Shield,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Target,
  Watch,
  type LucideIcon,
} from 'lucide-react'
import TopBar from '../components/TopBar'
import { GRADIENT_BG, GRADIENT_BG_ALT, GRAIN_NOISE } from '../lib/theme'
import { GRID_MATRIX, MoodTier, SocialWillingnessTier, DEMO_SCENARIOS, initSnapshots, type DashboardState } from '../engine/GodModeBridge'
import type { Snapshot } from '../engine/GodModeBridge'

const MOOD_LOW = 0.4
const MOOD_HIGH = 0.65
const SOCIAL_LOW = 0.4
const SOCIAL_HIGH = 0.65

type SlideId = 'state' | 'decision' | 'memory' | 'agents' | 'delivery'
type Tone = {
  icon: string
  text: string
  soft: string
  border: string
  active: string
  bar: string
}

function classifyTier(score: number, low: number, high: number): 'low' | 'medium' | 'high' {
  if (score < low) return 'low'
  if (score > high) return 'high'
  return 'medium'
}

function cleanLabel(label: string) {
  return label.replace(/^[^A-Za-z0-9\u4e00-\u9fff]+/, '').trim()
}

/**
 * L1 九宫格配色:玫瑰粉 ↔ 月白。
 * 两色均取自传统色并做过淡化,保证放在渐变背景上能看出色块,又不压过前景文字。
 * 月白若取过淡(如 #EEF4F8)会与底色几乎融为一体,等于没有背景,故取 #D6ECF0 ——
 * 传统月白本就偏青白,这一档既保留色相又保证可见度。
 */
const GRID_ROSE = [244, 194, 202] as const // 玫瑰粉 #F4C2CA
const GRID_MOON = [214, 236, 240] as const // 月白   #D6ECF0

/**
 * 岫烟青 → 霜纨白,上下垂直渐变。多处面板共用(当前象限、协作记录等)。
 * 定义见 src/lib/theme.ts —— 与 Agent 运作说明页共用同一套令牌。
 */

function rgba(c: readonly [number, number, number] | readonly number[], alpha: number) {
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`
}

/**
 * 单元格 (rowIndex, colIndex) 的背景:每格内部都是玫瑰粉 ↔ 月白的双色渐变。
 * 渐变角度按格子位置轮转(30° → 330°),让每格的粉白朝向都不同,九格不雷同。
 * 透明度烘焙进 rgba 而非用元素 opacity,否则会连单元格内的文字一起淡化。
 */
function gridCellBackground(rowIndex: number, colIndex: number, alpha: number) {
  const angle = 30 + ((rowIndex * 3 + colIndex) * 300) / 8
  return `linear-gradient(${Math.round(angle)}deg, ${rgba(GRID_ROSE, alpha)} 0%, ${rgba(GRID_MOON, alpha)} 100%)`
}

interface SlideMeta {
  id: SlideId
  eyebrow: string
  title: string
  relation: string
  lead: string
  icon: LucideIcon
  tone: Tone
}

const SLIDES: SlideMeta[] = [
  {
    id: 'state',
    eyebrow: '01 / INPUT',
    title: '状态输入台',
    relation: '情绪 + 社交 + 场景约束',
    lead: '系统只先看最关键的两条主线，再叠加夜间、独处和危机边界。',
    icon: SlidersHorizontal,
    tone: {
      icon: 'bg-cyan-50 text-cyan-700',
      text: 'text-cyan-700',
      soft: 'bg-cyan-50',
      border: 'border-cyan-200',
      active: 'bg-cyan-700 text-white border-cyan-700',
      bar: 'bg-cyan-600',
    },
  },
  {
    id: 'decision',
    eyebrow: '02 / DECISION',
    title: 'L1 决策矩阵',
    relation: '状态映射到风险与动作',
    lead: '九宫格先决定“要不要出现”，避免把每次波动都处理成打扰。',
    icon: Target,
    tone: {
      icon: 'bg-indigo-50 text-indigo-700',
      text: 'text-indigo-700',
      soft: 'bg-indigo-50',
      border: 'border-indigo-200',
      active: 'bg-indigo-700 text-white border-indigo-700',
      bar: 'bg-indigo-600',
    },
  },
  {
    id: 'memory',
    eyebrow: '03 / CONTEXT',
    title: '记忆与深度规划',
    relation: '记忆解释当下，不替代当下',
    lead: '记忆只补充背景：什么方式更适合你、什么时间不该打扰。',
    icon: Database,
    tone: {
      icon: 'bg-emerald-50 text-emerald-700',
      text: 'text-emerald-700',
      soft: 'bg-emerald-50',
      border: 'border-emerald-200',
      active: 'bg-emerald-700 text-white border-emerald-700',
      bar: 'bg-emerald-600',
    },
  },
  {
    id: 'agents',
    eyebrow: '04 / AGENTS',
    title: 'Agent 协作链',
    relation: '五个 Agent 接力',
    lead: '每个 Agent 只负责自己的判断，最后由安全和执行层收口。',
    icon: BrainIcon,
    tone: {
      icon: 'bg-sky-50 text-sky-700',
      text: 'text-sky-700',
      soft: 'bg-sky-50',
      border: 'border-sky-200',
      active: 'bg-sky-700 text-white border-sky-700',
      bar: 'bg-sky-600',
    },
  },
  {
    id: 'delivery',
    eyebrow: '05 / DELIVERY',
    title: '多端执行结果',
    relation: '必要关怀送到合适设备',
    lead: '手表只放短提醒，手机承接完整信息，系统保留解释链。',
    icon: Smartphone,
    tone: {
      icon: 'bg-amber-50 text-amber-700',
      text: 'text-amber-700',
      soft: 'bg-amber-50',
      border: 'border-amber-200',
      active: 'bg-amber-600 text-white border-amber-600',
      bar: 'bg-amber-500',
    },
  },
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
  { name: '感知 Agent', icon: 'eye', role: '读懂信号', color: '#0891b2' },
  { name: '记忆 Agent', icon: 'brain', role: '补足背景', color: '#4f46e5' },
  { name: '决策 Agent', icon: 'target', role: '选择动作', color: '#0f766e' },
  { name: '安全 Agent', icon: 'shield', role: '守住边界', color: '#d97706' },
  { name: '执行 Agent', icon: 'smartphone', role: '低打扰触达', color: '#0284c7' },
]

const DEMO_STAGES = [
  { slideId: 'state', mood: 0.68, social: 0.60, agent: '模拟器', message: '载入初始状态与约束条件' },
  { slideId: 'decision', mood: 0.52, social: 0.48, agent: '决策 Agent', message: '状态变化触发 L1 九宫格重新判断' },
  { slideId: 'memory', mood: 0.40, social: 0.38, agent: '记忆 Agent', message: '召回近期趋势与长期偏好，触发 L2 深度规划' },
  { slideId: 'agents', mood: 0.36, social: 0.34, agent: 'Agent 联邦', message: '五个 Agent 开始协作' },
  { slideId: 'delivery', mood: 0.34, social: 0.38, agent: '执行 Agent', message: '生成关怀卡片并同步到多端' },
]

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 64 : -64, opacity: 0, rotateY: direction > 0 ? 7 : -7, scale: 0.98 }),
  center: { x: 0, opacity: 1, rotateY: 0, scale: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -64 : 64, opacity: 0, rotateY: direction > 0 ? -7 : 7, scale: 0.98 }),
}

const tierLabels: Record<'low' | 'medium' | 'high', string> = {
  low: '偏低',
  medium: '中间',
  high: '良好',
}

const riskLabels: Record<DashboardState['riskLevel'], string> = {
  green: '安全',
  yellow: '关注',
  orange: '警戒',
  red: '危机',
}

export default function SystemOverviewPage() {
  const appRef = useRef<HTMLDivElement>(null)
  const prevQuadrant = useRef<number | null>(null)
  const autoPlayRef = useRef(false)
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

  const moodTier = classifyTier(mood, MOOD_LOW, MOOD_HIGH) as MoodTier
  const socialTier = classifyTier(social, SOCIAL_LOW, SOCIAL_HIGH) as SocialWillingnessTier
  const cell = GRID_MATRIX[moodTier][socialTier]

  let riskLevel: DashboardState['riskLevel'] = 'green'
  if (mood < 0.3) riskLevel = 'red'
  else if (mood < 0.45) riskLevel = 'orange'
  else if (mood < 0.6) riskLevel = 'yellow'

  const addEvent = (type: string, desc: string) => {
    const now = new Date().toLocaleTimeString()
    setEvents((prev) => [{ time: now, type, description: desc }, ...prev].slice(0, 24))
  }

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { duration: 0.5, ease: 'power2.out' } })
    tl.fromTo('.entrance-top', { y: -24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.38 })
      .fromTo('.overview-shell', { y: 18, opacity: 0 }, { y: 0, opacity: 1 }, '-=0.1')
  }, [appRef])

  useGSAP(() => {
    if (prevQuadrant.current !== null && prevQuadrant.current !== cell.quadrantNumber) {
      gsap.fromTo('.quadrant-transition', { scale: 0.92, opacity: 0.5 }, { scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.5)' })
    }
    prevQuadrant.current = cell.quadrantNumber
  }, [cell.quadrantNumber])

  useEffect(() => {
    initSnapshots().then(setSnapshots)
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

  const applyScenario = (id: string) => {
    const scenario = DEMO_SCENARIOS.find((item) => item.id === id)
    if (!scenario) return
    setMood(scenario.presets.moodScore)
    setSocial(scenario.presets.socialWillingnessScore)
    setOverrideLabel(cleanLabel(scenario.name))
    addEvent('场景', `切换到 ${cleanLabel(scenario.name)}`)
  }

  const triggerCrisis = () => {
    setCrisisActive(true)
    setMood(0.22)
    setSocial(0.12)
    addEvent('安全', '危机关键词触发，安全 Agent 接管')
    gsap.fromTo('.crisis-overlay', { opacity: 0 }, { opacity: 1, duration: 0.15, yoyo: true, repeat: 3 })
    window.setTimeout(() => setCrisisActive(false), 5000)
  }

  const memoryItems = [
    { id: 'm1', content: '偏好 1v1、低压陪伴', source: '长期记忆', relevance: 0.82 },
    { id: 'm2', content: '21:00 后不主动推送', source: '硬性约束', relevance: 0.90 },
    { id: 'm3', content: '最近 3 天情绪下降', source: '短期趋势', relevance: 0.68 },
  ]

  const dashboard: DashboardState = {
    moodScore: Math.round(mood * 100) / 100,
    socialScore: Math.round(social * 100) / 100,
    solitudeMode: solitude,
    nightMode,
    riskLevel,
    currentQuadrant: cell.quadrant,
    quadrantNumber: cell.quadrantNumber,
    quadrantDescription: cleanLabel(nightMode ? '夜间仅危机推送' : solitude ? '独处模式，社交降级' : cell.description),
    primaryAction: cell.primaryIntervention ?? '保持观察',
    moodTrend: snapshots.slice(0, Math.max(1, (demoStage + 1) * 4)).map((snapshot, index) => ({
      date: `Day${Math.floor(index / 8) + 1}`,
      score: snapshot.mood.overallScore,
      overridden: false,
    })),
    recalledMemories: memoryItems.map((memory) => ({ id: memory.id, content: memory.content, source: memory.source, relevance: memory.relevance })),
    activeConstraints: nightMode ? ['夜间勿扰', '仅危机推送'] : solitude ? ['独处模式', '社交降级'] : ['21:00 后不推送'],
    l2TaskChain: cell.quadrantNumber <= 2 ? {
      name: '3 天渐进干预计划',
      progress: 'Day 1/3',
      status: 'active',
      nodes: [
        { name: 'Day1: 共情对话', status: 'active' },
        { name: 'Day2: 运动建议', status: 'pending' },
        { name: 'Day3: 效果评估', status: 'pending' },
      ],
    } : null,
    safetyStatus: crisisActive ? '接管' : riskLevel === 'red' ? '警戒' : '运行',
    pushBudget: { used: Math.min(5, demoStage + 1), max: 5 },
    activeCooldowns: [],
    crisisProtocol: crisisActive ? '一级响应，延长陪伴' : '无活跃协议',
    simulationDay: Math.min(3, Math.floor(demoStage / 2) + 1),
    simulationProgress: Math.round((demoStage + 1) / DEMO_STAGES.length * 100),
    events,
  }

  const addThink = (agent: string, icon: string, color: string, message: string) => {
    const now = new Date().toLocaleTimeString()
    setThinkChain((prev) => [...prev, { time: now, agent, icon, color, message }].slice(-8))
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
        await new Promise((resolve) => window.setTimeout(resolve, index === 0 ? 900 : 1900))
      }
    }

    autoPlayRef.current = false
    setAutoPlay(false)
    setDemoRunning(false)
  }

  const activeSlide = SLIDES[slideIndex]
  const ActiveSlideIcon = activeSlide.icon

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

  const resetOverview = () => {
    autoPlayRef.current = false
    setAutoPlay(false)
    setDemoRunning(false)
    setMood(0.68)
    setSocial(0.60)
    setSolitude(false)
    setNightMode(false)
    setCrisisActive(false)
    setOverrideLabel('')
    setThinkChain([])
    setEvents([])
    setDemoStage(0)
    goToSlide(0)
  }

  return (
    <div ref={appRef} className={`h-full min-h-0 flex flex-col overflow-hidden ${crisisActive ? 'crisis-flash' : ''}`}>
      <div className="crisis-overlay fixed inset-0 pointer-events-none z-50 opacity-0 bg-red-500/5" />

      <div className="entrance-top">
        <TopBar
          onScenario={applyScenario}
          onStep={advanceDemoStep}
          snapIdx={demoStage}
          totalSnaps={DEMO_STAGES.length}
          overrideLabel={overrideLabel}
          autoPlay={autoPlay}
          onAutoPlay={toggleAutoDemo}
          onReset={resetOverview}
        />
      </div>

      <main className="overview-shell flex-1 min-h-0 bg-slate-50 p-4">
        <div className="flex h-full min-h-0 flex-col gap-3">
          <div
            className="no-scrollbar shrink-0 overflow-x-auto rounded-lg border border-slate-200 bg-white p-2 shadow-sm"
          >
            <div className="flex min-w-max items-center gap-1.5">
              {SLIDES.map((slide, index) => {
                const Icon = slide.icon
                const active = index === slideIndex
                return (
                  <button
                    key={slide.id}
                    type="button"
                    onClick={() => goToSlide(index)}
                    className={`flex items-center gap-2 rounded-md border px-3.5 py-2 text-sm font-semibold transition-all ${
                      active ? slide.tone.active : 'border-transparent text-slate-500 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-950'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{slide.title}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center overflow-hidden">
          <section className="relative h-[92%] max-h-[680px] w-[calc(100%-32px)] max-w-[1080px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_18px_48px_rgba(15,23,42,0.07)]">
            <button
              type="button"
              aria-label="上一页"
              title="上一页"
              onClick={() => goToSlide(slideIndex - 1)}
              className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-sm transition hover:border-cyan-200 hover:text-cyan-700"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="h-full overflow-hidden px-4 py-4 md:px-16">
              <AnimatePresence mode="wait" custom={slideDirection}>
                <motion.div
                  key={activeSlide.id}
                  custom={slideDirection}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="h-full min-h-0 overflow-y-auto pr-1 [perspective:1200px]"
                >
                  <div className="mx-auto flex min-h-full max-w-7xl flex-col">
                    <div className="mb-5 flex flex-col gap-3 border-b border-slate-100 pb-5 md:flex-row md:items-end md:justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-lg ${activeSlide.tone.icon}`}>
                          <ActiveSlideIcon className="h-6 w-6" />
                        </div>
                        <div>
                          <p className={`text-xs font-bold uppercase tracking-[0.16em] ${activeSlide.tone.text}`}>{activeSlide.eyebrow}</p>
                          <h2 className="mt-1 text-2xl font-bold leading-tight text-slate-950 md:text-3xl">{activeSlide.title}</h2>
                          <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-slate-600">{activeSlide.lead}</p>
                        </div>
                      </div>
                      <span className={`w-fit rounded-full border px-3 py-1.5 text-xs font-bold ${activeSlide.tone.soft} ${activeSlide.tone.border} ${activeSlide.tone.text}`}>
                        {activeSlide.relation}
                      </span>
                    </div>

                    {activeSlide.id === 'state' && (
                      <div className="grid flex-1 gap-4 xl:grid-cols-[minmax(0,1.05fr)_360px]">
                        <section className="rounded-lg border border-slate-200 bg-slate-50 p-5 md:p-7">
                          <p className="text-sm font-bold text-slate-500">当前只保留两个主变量</p>
                          <div className="mt-6 grid gap-4 md:grid-cols-2">
                            <BigMetric label="情绪评分" value={dashboard.moodScore.toFixed(2)} helper={tierLabels[moodTier]} tone="cyan" />
                            <BigMetric label="社交意愿" value={dashboard.socialScore.toFixed(2)} helper={tierLabels[socialTier]} tone="emerald" />
                          </div>
                          <div className="mt-7 space-y-5">
                            <RangeControl label="情绪" value={mood} onChange={(value) => { setMood(value); setOverrideLabel('手动') }} tone="#0891b2" />
                            <RangeControl label="社交" value={social} onChange={(value) => { setSocial(value); setOverrideLabel('手动') }} tone="#059669" />
                          </div>
                        </section>

                        <aside className="grid gap-3">
                          <ToggleCard
                            icon={Eye}
                            label="独处模式"
                            active={solitude}
                            onClick={() => { setSolitude(!solitude); addEvent('约束', `独处模式 ${!solitude ? '开启' : '关闭'}`) }}
                          />
                          <ToggleCard
                            icon={Moon}
                            label="夜间勿扰"
                            active={nightMode}
                            onClick={() => { setNightMode(!nightMode); addEvent('约束', `夜间勿扰 ${!nightMode ? '开启' : '关闭'}`) }}
                          />
                          <button
                            type="button"
                            onClick={triggerCrisis}
                            className="rounded-lg border border-rose-200 bg-rose-50 p-5 text-left transition hover:border-rose-300"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-lg font-bold text-rose-950">危机演示</span>
                              <Shield className="h-5 w-5 text-rose-700" />
                            </div>
                            <p className="mt-2 text-sm leading-6 text-rose-800/80">触发后安全 Agent 接管，普通社交推荐自动降级。</p>
                          </button>
                        </aside>
                      </div>
                    )}

                    {activeSlide.id === 'decision' && (
                      <div className="grid flex-1 gap-4 xl:grid-cols-[390px_minmax(0,1fr)]">
                        {/*
                          背景换成 岫烟青 → 霜纨白 的上下垂直渐变 + 极淡颗粒噪点。
                          与上一版(青蓝→沧浪)的区别:这两端都是浅色调,一种深色文字
                          即可贯穿整条渐变,不需要再靠停靠点规避过渡死区 —— 因此
                          这里是真正的平滑过渡,没有硬边界。
                          岫烟青为中等明度青,白字只有 2.44:1,故文字统一转深色;
                          slate-950 在整条渐变上最低仍有 8.26:1。
                        */}
                        <section
                          className="quadrant-transition relative overflow-hidden rounded-lg border border-white/25 p-6 text-slate-950"
                          style={GRADIENT_BG}
                        >
                          {/* 颗粒层:纯装饰,不接收指针事件 */}
                          <div
                            className="pointer-events-none absolute inset-0"
                            style={{ backgroundImage: GRAIN_NOISE }}
                            aria-hidden="true"
                          />
                          <div className="relative">
                            <p className="text-sm font-bold text-slate-700">当前象限</p>
                            <div className="mt-6 flex items-end gap-4">
                                <span className="text-7xl font-black leading-none tabular-nums">{dashboard.quadrantNumber}</span>
                              <div className="pb-2">
                                <p className="text-lg font-bold">{dashboard.quadrantDescription}</p>
                                <p className="mt-2 text-sm leading-6 text-slate-700">{dashboard.primaryAction}</p>
                              </div>
                            </div>
                            <div className="mt-8 grid grid-cols-3 gap-2">
                              {[
                                ['情绪', tierLabels[moodTier]],
                                ['社交', tierLabels[socialTier]],
                                ['风险', riskLabels[riskLevel]],
                              ].map(([label, value]) => (
                                <div key={label} className="rounded-lg bg-white/40 p-3 backdrop-blur-sm">
                                  <p className="text-xs font-semibold text-slate-700">{label}</p>
                                  <p className="mt-1 text-base font-bold text-slate-950">{value}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </section>

                        <section className="rounded-lg border border-slate-200 bg-slate-50 p-5">
                          <div className="grid h-full min-h-[360px] grid-cols-3 gap-3">
                            {(['high', 'medium', 'low'] as const).map((moodKey, rowIndex) => (
                              (['low', 'medium', 'high'] as const).map((socialKey, colIndex) => {
                                const gridCell = GRID_MATRIX[moodKey][socialKey]
                                const active = gridCell.quadrantNumber === cell.quadrantNumber
                                return (
                                  <div
                                    key={`${moodKey}-${socialKey}`}
                                    className={`flex flex-col justify-between rounded-2xl border p-4 transition ${
                                      active
                                        ? 'border-indigo-400 shadow-md ring-2 ring-indigo-100'
                                        : 'border-slate-200'
                                    }`}
                                    // 每格内部都是玫瑰粉 ↔ 月白的双色渐变;活动格不透明度更高,色更实
                                    style={{ backgroundImage: gridCellBackground(rowIndex, colIndex, active ? 0.95 : 0.8) }}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      {/* 底色变深后 slate-300 只有 1.2:1,压不住,提到 slate-500 */}
                                      <span className={`text-xl font-black tabular-nums ${active ? 'text-indigo-700' : 'text-slate-500'}`}>{gridCell.quadrantNumber}</span>
                                      {active && <Radio className="h-4 w-4 text-indigo-600" />}
                                    </div>
                                    <p className={`mt-4 text-xs font-bold leading-5 ${active ? 'text-slate-950' : 'text-slate-600'}`}>
                                      {cleanLabel(gridCell.description)}
                                    </p>
                                  </div>
                                )
                              })
                            ))}
                          </div>
                        </section>
                      </div>
                    )}

                    {activeSlide.id === 'memory' && (
                      <div className="grid flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                        <section className="rounded-lg border border-slate-200 bg-slate-50 p-5 md:p-7">
                          <p className="text-sm font-bold text-slate-500">本次只召回最有用的背景</p>
                          <div className="mt-5 grid gap-3 md:grid-cols-3">
                            {dashboard.recalledMemories.map((memory) => (
                              <div key={memory.id} className="rounded-lg border border-slate-200 bg-white p-5">
                                <p className="text-base font-bold leading-6 text-slate-950">{memory.content}</p>
                                <div className="mt-5 flex items-center justify-between gap-3">
                                  <span className="text-sm font-semibold text-emerald-700">{memory.source}</span>
                                  <span className="text-sm font-bold tabular-nums text-slate-500">{Math.round(memory.relevance * 100)}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>

                        <aside className="space-y-3">
                          <InfoBlock
                            label="L2 状态"
                            value={dashboard.l2TaskChain ? dashboard.l2TaskChain.progress : '未触发'}
                            detail={dashboard.l2TaskChain ? dashboard.l2TaskChain.name : '只有持续低状态才进入多日规划'}
                            tone="emerald"
                          />
                          <div className="rounded-lg border border-slate-200 bg-white p-5">
                            <p className="text-sm font-bold text-slate-500">当前约束</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                              {dashboard.activeConstraints.map((constraint) => (
                                <span key={constraint} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700">
                                  {constraint}
                                </span>
                              ))}
                            </div>
                          </div>
                        </aside>
                      </div>
                    )}

                    {activeSlide.id === 'agents' && (
                      <div className="grid flex-1 gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {AGENT_PIPELINE.map((agent, index) => {
                            const Icon = AGENT_ICONS[agent.icon] ?? Sparkles
                            return (
                              <div key={agent.name} className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex h-12 w-12 items-center justify-center rounded-lg" style={{ backgroundColor: `${agent.color}16`, color: agent.color }}>
                                    <Icon className="h-6 w-6" />
                                  </div>
                                  <span className="text-xs font-bold tracking-[0.14em] text-slate-400">STEP {index + 1}</span>
                                </div>
                                <h3 className="mt-4 text-lg font-bold text-slate-950">{agent.name}</h3>
                                <p className="mt-1.5 text-sm font-semibold text-slate-500">{agent.role}</p>
                              </div>
                            )
                          })}
                        </section>

                        <aside
                          className="quadrant-transition relative overflow-hidden rounded-lg border border-white/25 p-5 text-slate-950"
                          style={GRADIENT_BG_ALT}
                        >
                          <div
                            className="pointer-events-none absolute inset-0"
                            style={{ backgroundImage: GRAIN_NOISE }}
                            aria-hidden="true"
                          />
                          <div className="relative">
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-sm font-bold text-slate-700">协作记录</p>
                                <h3 className="mt-1 text-lg font-bold">最近接力</h3>
                              </div>
                              <span className="text-sm font-semibold text-slate-600">{thinkChain.length} 条</span>
                            </div>
                            <div className="mt-5 space-y-2">
                              {thinkChain.length === 0 ? (
                                <p className="rounded-lg bg-white/55 p-4 text-sm leading-6 text-slate-700">
                                  点击“自动推演”或“下一步”后，这里只显示关键 Agent 接力。
                                </p>
                              ) : (
                                thinkChain.slice(-5).map((item, index) => (
                                  <div key={`${item.time}-${index}`} className="rounded-lg bg-white/55 p-3">
                                    {/*
                                      Agent 名称不用 item.color:那些是为深色底选的中间调,
                                      在浅色底上对比度只有 1.7~3.4:1。
                                      改用色点保留身份标识,名称走深色文字。
                                    */}
                                    <p className="flex items-center gap-2 text-sm font-bold text-slate-950">
                                      <span
                                        className="inline-block h-2 w-2 flex-shrink-0 rounded-full"
                                        style={{ backgroundColor: item.color }}
                                        aria-hidden="true"
                                      />
                                      {item.agent}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-700">{item.message}</p>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        </aside>
                      </div>
                    )}

                    {activeSlide.id === 'delivery' && (
                      <div className="flex flex-1 flex-col gap-4">
                        <section className="grid gap-3 min-[520px]:grid-cols-3">
                          <DeviceResult
                            kind="watch"
                            icon={Watch}
                            title="手表"
                            value="轻触达"
                            detail={dashboard.safetyStatus === '接管' ? '优先显示求助卡片' : '轻震 + 一句话'}
                            tone="cyan"
                          />
                          <DeviceResult
                            kind="phone"
                            icon={Smartphone}
                            title="手机"
                            value="完整承接"
                            detail="展开建议、依据与下一步"
                            tone="emerald"
                          />
                          <DeviceResult
                            kind="desktop"
                            icon={Laptop}
                            title="电脑"
                            value="解释留档"
                            detail={`象限 #${dashboard.quadrantNumber} · 判断链已保留`}
                            tone="indigo"
                          />
                        </section>

                        <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-200/80 shadow-sm">
                          <div className="grid gap-px min-[520px]:grid-cols-3">
                            <ExecutionMetric
                              icon={Shield}
                              label="安全策略"
                              value={dashboard.safetyStatus}
                              detail={dashboard.safetyStatus === '接管' ? '优先兜底' : '常规守护'}
                              tone={dashboard.safetyStatus === '接管' ? 'rose' : 'emerald'}
                            />
                            <ExecutionMetric
                              icon={Radio}
                              label="触达预算"
                              value={`${dashboard.pushBudget.used} / ${dashboard.pushBudget.max}`}
                              detail={`剩余 ${Math.max(0, dashboard.pushBudget.max - dashboard.pushBudget.used)} 次`}
                              tone="cyan"
                            />
                            <ExecutionMetric
                              icon={Sparkles}
                              label="最近执行"
                              value={dashboard.events[0]?.type ?? '待触发'}
                              detail={dashboard.events[0]?.time ? `${dashboard.events[0].time} 已同步` : '等待下一步'}
                              tone="slate"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <button
              type="button"
              aria-label="下一页"
              title="下一页"
              onClick={() => goToSlide(slideIndex + 1)}
              className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/95 text-slate-600 shadow-sm transition hover:border-cyan-200 hover:text-cyan-700"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </section>
          </div>

        </div>
      </main>
    </div>
  )
}

function BigMetric({ label, value, helper, tone }: { label: string; value: string; helper: string; tone: 'cyan' | 'emerald' }) {
  const classes = tone === 'cyan' ? 'bg-cyan-50 text-cyan-700 border-cyan-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
  return (
    <div className={`rounded-lg border p-5 ${classes}`}>
      <p className="text-sm font-bold text-slate-500">{label}</p>
      <p className="mt-3 text-5xl font-black leading-none tabular-nums text-slate-950">{value}</p>
      <p className="mt-3 text-sm font-bold">{helper}</p>
    </div>
  )
}

function RangeControl({ label, value, onChange, tone }: { label: string; value: number; onChange: (value: number) => void; tone: string }) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-sm font-bold text-slate-950">{label}</span>
        <span className="text-sm font-bold tabular-nums text-slate-500">{value.toFixed(2)}</span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full"
        style={{ '--thumb-color': tone, '--track-color': '#e2e8f0' } as CSSProperties}
      />
    </label>
  )
}

function ToggleCard({ icon: Icon, label, active, onClick }: { icon: LucideIcon; label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border p-5 text-left transition ${
        active ? 'border-cyan-300 bg-cyan-50' : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-base font-bold text-slate-950">{label}</span>
        <Icon className={`h-5 w-5 ${active ? 'text-cyan-700' : 'text-slate-400'}`} />
      </div>
      <p className={`mt-3 text-xl font-black ${active ? 'text-cyan-700' : 'text-slate-300'}`}>{active ? '开启' : '关闭'}</p>
    </button>
  )
}

function InfoBlock({ label, value, detail, tone }: { label: string; value: string; detail: string; tone: 'cyan' | 'emerald' | 'rose' }) {
  const classes = {
    cyan: 'border-cyan-200 bg-cyan-50 text-cyan-800',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    rose: 'border-rose-200 bg-rose-50 text-rose-800',
  }[tone]

  return (
    <div className={`rounded-lg border p-5 ${classes}`}>
      <p className="text-sm font-bold opacity-75">{label}</p>
      <p className="mt-2 text-2xl font-black leading-tight text-slate-950">{value}</p>
      <p className="mt-3 text-sm font-semibold leading-6">{detail}</p>
    </div>
  )
}

type DeliveryTone = 'cyan' | 'emerald' | 'indigo'
type DeviceKind = 'watch' | 'phone' | 'desktop'

function DeviceResult({
  icon: Icon,
  kind,
  title,
  value,
  detail,
  tone,
}: {
  icon: LucideIcon
  kind: DeviceKind
  title: string
  value: string
  detail: string
  tone: DeliveryTone
}) {
  const classes = {
    cyan: {
      shell: 'border-cyan-100',
      wash: 'from-cyan-50/90',
      icon: 'bg-cyan-50 text-cyan-700',
      line: 'bg-cyan-500',
    },
    emerald: {
      shell: 'border-emerald-100',
      wash: 'from-emerald-50/90',
      icon: 'bg-emerald-50 text-emerald-700',
      line: 'bg-emerald-500',
    },
    indigo: {
      shell: 'border-indigo-100',
      wash: 'from-indigo-50/90',
      icon: 'bg-indigo-50 text-indigo-700',
      line: 'bg-indigo-500',
    },
  }[tone]

  return (
    <article className={`group relative flex min-h-[212px] min-w-0 flex-col overflow-hidden rounded-xl border bg-white p-4 shadow-[0_10px_30px_rgba(15,23,42,0.04)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_38px_rgba(15,23,42,0.08)] ${classes.shell}`}>
      <div className={`pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b ${classes.wash} to-transparent`} />

      <div className="relative flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${classes.icon}`}>
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="hidden text-[9px] font-black tracking-[0.18em] text-slate-400 min-[760px]:block">PORT</p>
            <h3 className="truncate text-[15px] font-bold text-slate-950 min-[760px]:text-base">{title}</h3>
          </div>
        </div>
        <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-bold text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.10)]" />
          <span className="hidden min-[760px]:inline">在线</span>
        </span>
      </div>

      <div className="relative flex flex-1 items-center justify-center py-3">
        <DeviceVisual kind={kind} tone={tone} />
      </div>

      <div className="relative border-t border-slate-100 pt-3">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-base font-black text-slate-950">{value}</p>
          <span className={`h-1.5 w-6 rounded-full ${classes.line}`} />
        </div>
        <p className="mt-1 min-h-[30px] text-[11px] font-semibold leading-[15px] text-slate-500">{detail}</p>
      </div>
    </article>
  )
}

function DeviceVisual({ kind, tone }: { kind: DeviceKind; tone: DeliveryTone }) {
  const classes = {
    cyan: {
      frame: 'border-cyan-800/80',
      ring: 'border-cyan-300/70',
      screen: 'border-cyan-300/30 bg-cyan-500/10',
      bar: 'bg-cyan-300/80',
    },
    emerald: {
      frame: 'border-emerald-800/80',
      ring: 'border-emerald-300/70',
      screen: 'border-emerald-300/30 bg-emerald-500/10',
      bar: 'bg-emerald-300/80',
    },
    indigo: {
      frame: 'border-indigo-800/80',
      ring: 'border-indigo-300/70',
      screen: 'border-indigo-300/30 bg-indigo-500/10',
      bar: 'bg-indigo-300/80',
    },
  }[tone]

  if (kind === 'watch') {
    return (
      <div className="relative h-14 w-12">
        <span className="absolute -right-1 top-4 h-3 w-1 rounded-r-full bg-slate-400" />
        <div className={`relative h-12 w-11 rounded-[13px] border-[3px] bg-slate-950 shadow-[0_10px_20px_rgba(15,23,42,0.20)] ${classes.frame}`}>
          <span className={`absolute inset-1 rounded-[8px] border ${classes.ring}`} />
          <span className="absolute left-1/2 top-1/2 h-3 w-px -translate-x-1/2 -translate-y-full rotate-45 bg-white/90" />
          <span className="absolute left-1/2 top-1/2 h-px w-2.5 -translate-y-1/2 bg-white/70" />
        </div>
      </div>
    )
  }

  if (kind === 'phone') {
    return (
      <div className={`relative h-16 w-9 rounded-[11px] border-[3px] bg-white shadow-[0_12px_24px_rgba(15,23,42,0.14)] ${classes.frame}`}>
        <span className="absolute left-1/2 top-1 h-0.5 w-3 -translate-x-1/2 rounded-full bg-slate-300" />
        <div className={`absolute inset-x-1 bottom-1 top-3 rounded-[7px] border p-1.5 ${classes.screen}`}>
          <span className={`block h-1 w-5 rounded-full ${classes.bar}`} />
          <span className="mt-1 block h-1 w-3 rounded-full bg-white/35" />
          <span className="mt-1 block h-2 w-full rounded-sm bg-white/10" />
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-[74px]">
      <div className={`h-11 rounded-md border-[3px] bg-slate-950 p-1.5 shadow-[0_12px_24px_rgba(15,23,42,0.16)] ${classes.frame}`}>
        <div className={`h-full rounded-sm border p-1 ${classes.screen}`}>
          <div className="flex gap-1">
            <span className={`h-1 w-1 rounded-full ${classes.bar}`} />
            <span className="h-1 w-1 rounded-full bg-white/25" />
            <span className="h-1 w-1 rounded-full bg-white/15" />
          </div>
          <div className={`mt-1 h-1 w-7 rounded-full ${classes.bar}`} />
          <div className="mt-1 h-2 w-full rounded-sm bg-white/10" />
        </div>
      </div>
      <div className="mx-auto h-1 w-3 bg-slate-400" />
      <div className="mx-auto h-1 w-10 rounded-full bg-slate-300" />
    </div>
  )
}

function ExecutionMetric({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: LucideIcon
  label: string
  value: string
  detail: string
  tone: 'cyan' | 'emerald' | 'rose' | 'slate'
}) {
  const classes = {
    cyan: 'bg-cyan-50 text-cyan-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    rose: 'bg-rose-50 text-rose-700',
    slate: 'bg-slate-100 text-slate-600',
  }[tone]

  return (
    <div className="min-w-0 bg-white px-4 py-3">
      <div className="flex items-center gap-2">
        <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${classes}`}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="truncate text-[11px] font-bold tracking-[0.08em] text-slate-400">{label}</span>
      </div>
      <p className="mt-2 truncate text-base font-black text-slate-950" title={value}>{value}</p>
      <p className="mt-0.5 truncate text-[11px] font-semibold text-slate-500" title={detail}>{detail}</p>
    </div>
  )
}
