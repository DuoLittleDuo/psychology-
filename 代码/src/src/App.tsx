import { useState, useEffect, useCallback, useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import TopBar from './components/TopBar'
import StateControl from './components/StateControl'
import DecisionPanel from './components/DecisionPanel'
import DeviceMocks from './components/DeviceMocks'
import { GRID_MATRIX, MoodTier, SocialWillingnessTier, DEMO_SCENARIOS, initSnapshots, getSnapshot, getSnapshotCount, type DashboardState } from './engine/GodModeBridge'
import type { Snapshot } from './engine/GodModeBridge'

const MOOD_LOW = 0.4; const MOOD_HIGH = 0.65
const SOCIAL_LOW = 0.4; const SOCIAL_HIGH = 0.65

function classifyTier(score: number, low: number, high: number): 'low' | 'medium' | 'high' {
  if (score < low) return 'low'; if (score > high) return 'high'; return 'medium'
}

export default function App() {
  const appRef = useRef<HTMLDivElement>(null)
  const [mood, setMood] = useState(0.68)
  const [social, setSocial] = useState(0.60)
  const [solitude, setSolitude] = useState(false)
  const [nightMode, setNightMode] = useState(false)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [snapIdx, setSnapIdx] = useState(0)
  const [events, setEvents] = useState<{ time: string; type: string; description: string }[]>([])
  const [crisisActive, setCrisisActive] = useState(false)
  const [overrideLabel, setOverrideLabel] = useState('')
  const prevQuadrant = useRef<number | null>(null)

  const addEvent = (type: string, desc: string) => {
    const now = new Date().toLocaleTimeString()
    setEvents(prev => [{ time: now, type, description: desc }, ...prev].slice(0, 80))
  }

  // === 入场时间线 ===
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
      if (snaps.length > 0) {
        setMood(snaps[0].mood.overallScore)
        setSocial(snaps[0].socialWillingness.overallScore)
      }
    })
  }, [])

  // 推进快照
  const stepForward = useCallback(() => {
    if (snapIdx + 1 < getSnapshotCount()) {
      const next = snapIdx + 1
      setSnapIdx(next)
      const s = getSnapshot(next)
      if (s) {
        setMood(s.mood.overallScore)
        setSocial(s.socialWillingness.overallScore)
        addEvent('snapshot', `Day${Math.floor(next/8)+1} h${(next%8)*3}:00 快照`)
      }
    }
  }, [snapIdx])

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
    setOverrideLabel(s.name)
    addEvent('override', `切换: ${s.name}`)
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

  const dashboard: DashboardState = {
    moodScore: Math.round(mood * 100) / 100,
    socialScore: Math.round(social * 100) / 100,
    solitudeMode: solitude, nightMode,
    riskLevel,
    currentQuadrant: cell.quadrant,
    quadrantNumber: cell.quadrantNumber,
    quadrantDescription: nightMode ? '🌙 夜间—仅危机推送' : solitude ? '🧘 独处—社交降级' : cell.description,
    primaryAction: cell.primaryIntervention ?? '无',
    moodTrend: snapshots.slice(0, snapIdx + 1).map((s, i) => ({
      date: `Day${Math.floor(i/8)+1}`, score: s.mood.overallScore, overridden: false,
    })),
    recalledMemories: [
      { id:'m1', content:'用户人格: 偏内向(0.65), 偏好1v1', source:'长期记忆', relevance:0.82 },
      { id:'m2', content:'有效干预: 运动建议(响应率80%)', source:'长期记忆', relevance:0.75 },
      { id:'m3', content:'硬性约束: 21:00后不推送', source:'长期记忆', relevance:0.90 },
      { id:'m4', content:'最近趋势: 情绪下降(3天)', source:'短期记忆', relevance:0.68 },
    ],
    activeConstraints: nightMode ? ['🌙 夜间勿扰','21:00后不推送'] : solitude ? ['🧘 独处模式','社交降级'] : ['21:00后不推送'],
    l2TaskChain: cell.quadrantNumber <= 2 ? {
      name: '3天渐进干预计划', progress: 'Day 1/3', status: 'active',
      nodes: [{ name:'Day1: 共情对话', status:'active' }, { name:'Day2: 运动建议', status:'pending' }, { name:'Day3: 效果评估', status:'pending' }],
    } : null,
    safetyStatus: crisisActive ? '🔴 接管' : riskLevel==='red' ? '🟠 警戒' : '🟢 运行',
    pushBudget: { used: Math.min(5, Math.floor(snapIdx/5)), max: 5 },
    activeCooldowns: [],
    crisisProtocol: crisisActive ? '一级响应—延长陪伴' : '无活跃协议',
    simulationDay: Math.min(3, Math.floor(snapIdx/8)+1),
    simulationProgress: snapshots.length > 0 ? Math.round((snapIdx+1)/getSnapshotCount()*100) : 0,
    events,
  }

  return (
    <div ref={appRef} className={`min-h-screen flex flex-col ${crisisActive ? 'crisis-flash' : ''}`}>
      <div className="crisis-overlay fixed inset-0 pointer-events-none z-50 opacity-0 bg-red-500/5" />

      <div className="entrance-top">
        <TopBar onScenario={applyScenario} onStep={stepForward}
          snapIdx={snapIdx} totalSnaps={getSnapshotCount()} overrideLabel={overrideLabel} />
      </div>

      <main className="flex-1 grid grid-cols-12 gap-3 p-3 overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
        <div className="col-span-2 overflow-y-auto space-y-3 entrance-left">
          <StateControl mood={mood} social={social} solitude={solitude} nightMode={nightMode}
            crisisActive={crisisActive}
            onMoodChange={v => { setMood(v); setOverrideLabel('手动') }}
            onSocialChange={v => { setSocial(v); setOverrideLabel('手动') }}
            onSolitudeToggle={() => { setSolitude(!solitude); addEvent('override', `独处: ${!solitude?'开':'关'}`) }}
            onNightToggle={() => { setNightMode(!nightMode); addEvent('override', `夜间: ${!nightMode?'开':'关'}`) }}
            onCrisis={triggerCrisis} />
        </div>
        <div className="col-span-7 overflow-y-auto space-y-3 entrance-center">
          <DecisionPanel dashboard={dashboard} moodTier={moodTier} socialTier={socialTier} crisisActive={crisisActive} />
        </div>
        <div className="col-span-3 overflow-y-auto space-y-3 entrance-right">
          <DeviceMocks cardData={cardData} crisisActive={crisisActive} mood={mood} social={social} />
        </div>
      </main>
    </div>
  )
}
