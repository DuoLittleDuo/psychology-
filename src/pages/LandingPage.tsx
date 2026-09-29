import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  HeartPulse,
  LockKeyhole,
  Radio,
  Search,
  ShieldCheck,
  Smartphone,
  Watch,
  Wifi,
} from "lucide-react"
import {
  getSensorNames,
  getWatchFamily,
  SENSOR_DEFINITIONS,
  WATCH_FAMILIES,
} from "../data/deviceCatalog"
import { savePreparedProfile } from "../lib/preparedProfile"

type SearchState = "idle" | "scanning" | "found" | "connected"
type CapabilityState = "idle" | "reading" | "ready"

interface HealthFlag {
  id: string
  label: string
  helper: string
  highRisk: boolean
}

const STEPS = [
  { label: "连接手表", detail: "发现 HarmonyOS 设备" },
  { label: "健康背景", detail: "排除不适用判断" },
  { label: "能力校验", detail: "确认心率等传感器" },
  { label: "开始监测", detail: "进入跨端流转" },
]

const HEALTH_FLAGS: HealthFlag[] = [
  {
    id: "heart-disease",
    label: "已被医生告知存在心脏病或心律失常",
    helper: "例如冠心病、房颤、心衰等。",
    highRisk: true,
  },
  {
    id: "implanted-device",
    label: "植入心脏起搏器、ICD 或其他心脏设备",
    helper: "异常心率需要优先排除设备或突发健康问题。",
    highRisk: true,
  },
  {
    id: "recent-symptoms",
    label: "近三个月出现胸痛、晕厥或异常呼吸困难",
    helper: "这类症状不能只依靠手表数据判断。",
    highRisk: true,
  },
  {
    id: "heart-rate-medication",
    label: "正在服用可能影响心率的药物",
    helper: "例如部分降心率药、甲状腺相关药物等。",
    highRisk: true,
  },
  {
    id: "none",
    label: "以上情况均无",
    helper: "我没有已知心脏病、心律失常、植入设备或近期急性症状。",
    highRisk: false,
  },
]

const TRUST_POINTS = [
  {
    title: "边界清楚",
    detail: "仅做趋势识别和风险提醒，不给医疗诊断结论。",
  },
  {
    title: "本地优先",
    detail: "准备结果只保留设备能力和保护模式，不保存具体病史选项。",
  },
  {
    title: "低打扰",
    detail: "未触发异常时保持后台观察，不把陪伴变成持续打断。",
  },
]

export default function LandingPage({ onComplete }: { onComplete?: () => void }) {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [searchState, setSearchState] = useState<SearchState>("idle")
  const [healthFlags, setHealthFlags] = useState<string[]>([])
  const [healthConfirmed, setHealthConfirmed] = useState(false)
  const [selectedModelId, setSelectedModelId] = useState(WATCH_FAMILIES[2].id)
  const [capabilityState, setCapabilityState] = useState<CapabilityState>("idle")
  const [startConfirmed, setStartConfirmed] = useState(false)
  const [showSafetyConfirm, setShowSafetyConfirm] = useState(false)
  const [safetyConfirmed, setSafetyConfirmed] = useState(false)

  const selectedWatch = useMemo(() => getWatchFamily(selectedModelId), [selectedModelId])
  const highRiskMode = healthFlags.some((id) => HEALTH_FLAGS.find((flag) => flag.id === id)?.highRisk)
  const requiredSensorsReady = SENSOR_DEFINITIONS
    .filter((sensor) => sensor.required)
    .every((sensor) => selectedWatch.sensors.includes(sensor.key))

  useEffect(() => {
    if (searchState !== "scanning") return
    const timer = window.setTimeout(() => setSearchState("found"), 1100)
    return () => window.clearTimeout(timer)
  }, [searchState])

  useEffect(() => {
    if (capabilityState !== "reading") return
    const timer = window.setTimeout(() => setCapabilityState("ready"), 850)
    return () => window.clearTimeout(timer)
  }, [capabilityState])

  const canContinue = step === 0
    ? searchState === "connected"
    : step === 1
      ? healthConfirmed && healthFlags.length > 0
      : step === 2
        ? capabilityState === "ready" && requiredSensorsReady
        : startConfirmed

  const toggleHealthFlag = (id: string) => {
    setHealthConfirmed(false)
    setSafetyConfirmed(false)
    if (id === "none") {
      setHealthFlags(["none"])
      return
    }
    setHealthFlags((current) => {
      const withoutNone = current.filter((item) => item !== "none")
      return withoutNone.includes(id)
        ? withoutNone.filter((item) => item !== id)
        : [...withoutNone, id]
    })
  }

  const selectWatch = (id: string) => {
    setSelectedModelId(id)
    setCapabilityState("idle")
    setStartConfirmed(false)
  }

  const nextStep = () => {
    if (!canContinue) return
    setStep((current) => Math.min(STEPS.length - 1, current + 1))
  }

  const completePreparation = () => {
    savePreparedProfile({
      modelId: selectedWatch.id,
      modelName: selectedWatch.model,
      sensorKeys: selectedWatch.sensors,
      safetyMode: highRiskMode,
      preparedAt: new Date().toISOString(),
    })
    setShowSafetyConfirm(false)
    if (onComplete) {
      onComplete()
      return
    }
    navigate("/app?stage=monitor")
  }

  const startDetection = () => {
    if (!canContinue) return
    if (highRiskMode && !safetyConfirmed) {
      setShowSafetyConfirm(true)
      return
    }
    completePreparation()
  }

  useEffect(() => {
    if (!showSafetyConfirm) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowSafetyConfirm(false)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [showSafetyConfirm])

  const readinessItems = [
    { label: "设备连接", value: searchState === "connected" ? "已连接" : "待连接", ready: searchState === "connected" },
    { label: "健康背景", value: healthFlags.length > 0 ? (healthConfirmed ? "已确认" : "待确认") : "未填写", ready: healthConfirmed && healthFlags.length > 0 },
    { label: "传感器能力", value: capabilityState === "ready" ? "已读取" : "待读取", ready: capabilityState === "ready" },
    { label: "启动确认", value: startConfirmed ? "已同意" : "待确认", ready: startConfirmed },
  ]

  return (
    <div className="min-h-full bg-slate-50 text-slate-950">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 md:px-7 md:py-7">
        <header className="grid gap-5 border-b border-slate-200 pb-5 xl:grid-cols-[minmax(0,1fr)_minmax(440px,0.78fr)] xl:items-end">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-xs font-semibold text-cyan-800">
              <Activity className="h-3.5 w-3.5" />
              同频校准台
            </div>
            <h1 className="max-w-3xl text-3xl font-semibold leading-tight tracking-normal text-slate-950 md:text-4xl">
              先校准设备、健康边界与传感器能力，再进入跨端监测。
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              这一步保留真正有用的准备动作：连接手表、确认健康风险、读取传感器能力。完成后，系统才会开始展示从采集到回传的完整 Agent 闭环。
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">Preparation</p>
                <p className="mt-1 text-sm font-bold text-slate-950">校准进度</p>
              </div>
              <span className="rounded-md bg-slate-950 px-2.5 py-1 text-xs font-semibold text-white">
                {step + 1} / {STEPS.length}
              </span>
            </div>
            <div className="grid w-full grid-cols-4 gap-2">
            {STEPS.map((item, index) => {
              const active = index === step
              const complete = index < step
              return (
                <div key={item.label} className="min-w-0">
                  <div className={`h-1 rounded-full ${complete ? "bg-emerald-500" : active ? "bg-cyan-600" : "bg-slate-200"}`} />
                  <p className={`mt-2 truncate text-[11px] font-bold ${active ? "text-slate-950" : "text-slate-500"}`}>
                    {index + 1}. {item.label}
                  </p>
                  <p className="mt-0.5 hidden truncate text-[10px] text-slate-400 sm:block">{item.detail}</p>
                </div>
              )
            })}
            </div>
          </div>
        </header>

        <div className="grid flex-1 gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
          <section className="min-h-[560px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.22 }}
                className="flex min-h-[560px] flex-col p-5 md:p-7"
              >
                {step === 0 && (
                  <ConnectionStep searchState={searchState} setSearchState={setSearchState} />
                )}

                {step === 1 && (
                  <HealthStep
                    flags={healthFlags}
                    confirmed={healthConfirmed}
                    highRiskMode={highRiskMode}
                    onToggle={toggleHealthFlag}
                    onConfirm={setHealthConfirmed}
                  />
                )}

                {step === 2 && (
                  <CapabilityStep
                    selectedModelId={selectedModelId}
                    capabilityState={capabilityState}
                    selectedWatch={selectedWatch}
                    onSelect={selectWatch}
                    onRead={() => setCapabilityState("reading")}
                  />
                )}

                {step === 3 && (
                  <ReadyStep
                    watchName={selectedWatch.model}
                    sensors={getSensorNames(selectedWatch.sensors)}
                    highRiskMode={highRiskMode}
                    confirmed={startConfirmed}
                    onConfirm={setStartConfirmed}
                  />
                )}

                <div className="mt-auto flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <button
                    type="button"
                    onClick={() => setStep((current) => Math.max(0, current - 1))}
                    disabled={step === 0}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    上一步
                  </button>

                  {step < STEPS.length - 1 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      disabled={!canContinue}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      继续
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startDetection}
                      disabled={!canContinue}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-cyan-700 px-5 text-sm font-semibold text-white transition hover:bg-cyan-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      开始跨端检测
                      <Radio className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </section>

          <aside className="space-y-4">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-cyan-700" />
                <h2 className="text-sm font-bold text-slate-950">准备状态</h2>
              </div>
              <div className="mt-4 space-y-3">
                {readinessItems.map((item) => (
                  <div key={item.label} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full ${item.ready ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                        {item.ready ? <Check className="h-3 w-3" /> : <span className="h-1.5 w-1.5 rounded-full bg-current" />}
                      </span>
                      <span className="text-xs text-slate-600">{item.label}</span>
                    </div>
                    <span className={`text-xs font-semibold ${item.ready ? "text-emerald-700" : "text-slate-400"}`}>{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-950 p-5 text-white shadow-sm">
              <div className="flex items-center gap-2">
                <LockKeyhole className="h-5 w-5 text-cyan-300" />
                <h2 className="text-sm font-bold">产品边界</h2>
              </div>
              <div className="mt-4 space-y-3">
                {TRUST_POINTS.map((item) => (
                  <div key={item.title} className="border-b border-white/10 pb-3 last:border-b-0 last:pb-0">
                    <p className="text-xs font-bold text-white">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-300">{item.detail}</p>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-md border border-amber-300/30 bg-amber-400/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-200" />
                  <p className="text-xs leading-5 text-amber-50">
                    若出现胸痛、胸闷、呼吸困难、晕厥或大汗，应直接联系急救或前往医院。
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <AnimatePresence>
        {showSafetyConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="safety-confirm-title"
          >
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.22 }}
              className="w-full max-w-lg rounded-lg border border-amber-200 bg-white p-5 shadow-2xl md:p-6"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-700">高风险健康背景</p>
                  <h2 id="safety-confirm-title" className="mt-1 text-xl font-bold text-slate-950">
                    继续前请再次确认
                  </h2>
                </div>
              </div>

              <div className="mt-5 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold leading-6 text-amber-950">
                  你已选择存在心脏病、心律失常、植入设备或近期急性症状等健康背景。
                </p>
                <p className="mt-2 text-xs leading-5 text-amber-900/80">
                  本系统只用于识别异常趋势和提供提醒，不是医疗器械，也不能诊断突发心脏问题。
                  若出现胸痛、胸闷、呼吸困难、晕厥或大汗，请立即联系急救，不要等待系统判断。
                </p>
              </div>

              <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowSafetyConfirm(false)}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                >
                  返回调整
                </button>
                <button
                  type="button"
                  autoFocus
                  onClick={() => {
                    setSafetyConfirmed(true)
                    completePreparation()
                  }}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-amber-600 px-5 text-sm font-semibold text-white hover:bg-amber-700"
                >
                  我已理解，继续监测
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function SectionHeading({
  icon: Icon,
  eyebrow,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-cyan-700">
        <Icon className="h-4 w-4" />
        {eyebrow}
      </div>
      <h2 className="text-xl font-bold text-slate-950 md:text-2xl">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>
    </div>
  )
}

function ConnectionStep({
  searchState,
  setSearchState,
}: {
  searchState: SearchState
  setSearchState: (state: SearchState) => void
}) {
  return (
    <div>
      <SectionHeading
        icon={Watch}
        eyebrow="Step 01"
        title="先连接你的手表"
        description="系统会搜索附近的 HarmonyOS 穿戴设备，并建立用于接收心率、运动与状态信号的连接。"
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-5">
          <div className="relative mx-auto flex h-[260px] max-w-[430px] items-center justify-center">
            <motion.div
              className="absolute h-56 w-56 rounded-full border border-cyan-200"
              animate={searchState === "scanning" ? { scale: [0.72, 1.15], opacity: [0.8, 0] } : { scale: 1, opacity: 0.25 }}
              transition={searchState === "scanning" ? { duration: 1.4, repeat: Infinity, ease: "easeOut" } : { duration: 0.2 }}
            />
            <motion.div
              className="absolute h-40 w-40 rounded-full border border-cyan-300"
              animate={searchState === "scanning" ? { scale: [0.82, 1.1], opacity: [0.8, 0] } : { scale: 1, opacity: 0.3 }}
              transition={searchState === "scanning" ? { duration: 1.4, delay: 0.35, repeat: Infinity, ease: "easeOut" } : { duration: 0.2 }}
            />
            <div className="relative z-10 flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center rounded-lg bg-slate-950 text-white shadow-lg">
                <Watch className="h-9 w-9" />
              </div>
              <div className="flex flex-col items-center gap-1 px-3 text-cyan-700">
                <Wifi className="h-5 w-5" />
                <span className="text-[10px] font-bold tracking-[0.18em]">PAIR</span>
              </div>
              <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm">
                <Smartphone className="h-9 w-9" />
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center gap-3">
            {searchState === "idle" && (
              <button
                type="button"
                onClick={() => setSearchState("scanning")}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-cyan-700 px-5 text-sm font-semibold text-white hover:bg-cyan-800"
              >
                <Search className="h-4 w-4" />
                搜索附近设备
              </button>
            )}

            {searchState === "scanning" && (
              <span className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-cyan-700">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-cyan-200 border-t-cyan-700" />
                正在搜索 HarmonyOS 穿戴设备
              </span>
            )}

            {searchState === "found" && (
              <div className="w-full max-w-md rounded-lg border border-cyan-200 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-50 text-cyan-700">
                      <Watch className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-950">HarmonyOS 穿戴设备</p>
                      <p className="text-xs text-slate-500">信号良好 · 等待用户确认</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSearchState("connected")}
                    className="rounded-md bg-slate-950 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    连接
                  </button>
                </div>
              </div>
            )}

            {searchState === "connected" && (
              <div className="w-full max-w-md rounded-lg border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                  <div>
                    <p className="text-sm font-bold text-emerald-950">设备连接成功</p>
                    <p className="text-xs text-emerald-800/80">下一步将读取你的健康背景，调整风险判断边界。</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h3 className="text-sm font-bold text-slate-950">连接后可以读取</h3>
          <div className="mt-4 space-y-3">
            {["连续心率与静息心率", "步数、体动与运动状态", "睡眠、压力与恢复趋势"].map((item) => (
              <div key={item} className="flex items-start gap-2 text-xs leading-5 text-slate-600">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function HealthStep({
  flags,
  confirmed,
  highRiskMode,
  onToggle,
  onConfirm,
}: {
  flags: string[]
  confirmed: boolean
  highRiskMode: boolean
  onToggle: (id: string) => void
  onConfirm: (confirmed: boolean) => void
}) {
  return (
    <div>
      <SectionHeading
        icon={HeartPulse}
        eyebrow="Step 02"
        title="补充会影响判断的健康背景"
        description="同样的心率升高，在不同健康背景下含义并不相同。问卷只用于选择更保守的解释规则，不用于诊断或计算患病概率。"
      />

      <div className="grid gap-3 md:grid-cols-2">
        {HEALTH_FLAGS.map((flag) => {
          const selected = flags.includes(flag.id)
          return (
            <button
              key={flag.id}
              type="button"
              role="checkbox"
              aria-checked={selected}
              onClick={() => onToggle(flag.id)}
              className={`min-h-[92px] rounded-lg border p-4 text-left transition ${
                selected
                  ? flag.highRisk
                    ? "border-amber-300 bg-amber-50"
                    : "border-emerald-300 bg-emerald-50"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                  selected ? "border-current bg-white" : "border-slate-300 bg-white"
                } ${flag.highRisk ? "text-amber-700" : "text-emerald-700"}`}>
                  {selected && <Check className="h-3.5 w-3.5" />}
                </span>
                <span>
                  <span className="block text-sm font-semibold leading-5 text-slate-950">{flag.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-slate-500">{flag.helper}</span>
                </span>
              </div>
            </button>
          )
        })}
      </div>

      <AnimatePresence>
        {highRiskMode && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-4"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <div>
                <p className="text-sm font-bold text-amber-950">将启用高风险健康背景保护</p>
                <p className="mt-1 text-xs leading-5 text-amber-900/80">
                  静息状态下心率升高时，Agent 不会只归因于运动、压力或情绪，而会优先提示排除突发健康问题。若伴随胸痛、呼吸困难或晕厥，应立即联系急救。
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => onConfirm(event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-cyan-700"
        />
        <span className="text-xs leading-5 text-slate-600">
          我理解这些回答只用于调整监测解释和提醒方式，不能替代医生判断；出现急性不适应优先就医。
        </span>
      </label>
    </div>
  )
}

function CapabilityStep({
  selectedModelId,
  capabilityState,
  selectedWatch,
  onSelect,
  onRead,
}: {
  selectedModelId: string
  capabilityState: CapabilityState
  selectedWatch: ReturnType<typeof getWatchFamily>
  onSelect: (id: string) => void
  onRead: () => void
}) {
  return (
    <div>
      <SectionHeading
        icon={Watch}
        eyebrow="Step 03"
        title="选择手表系列并检查设备能力"
        description="先确认设备是否支持心率监测，系统再决定哪些信号可以参与判断。正式接入时应以 Health Kit 返回的传感器能力为准。"
      />

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {WATCH_FAMILIES.map((device) => {
          const selected = device.id === selectedModelId
          return (
            <button
              key={device.id}
              type="button"
              onClick={() => onSelect(device.id)}
              className={`min-h-[150px] rounded-lg border p-4 text-left transition ${
                selected ? "border-cyan-400 bg-cyan-50 ring-2 ring-cyan-100" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold" style={{ color: device.accent }}>{device.series}</span>
                {selected && <CheckCircle2 className="h-4 w-4 text-cyan-700" />}
              </span>
              <span className="mt-2 block text-sm font-bold text-slate-950">{device.model}</span>
              <span className="mt-2 block text-xs leading-5 text-slate-500">{device.summary}</span>
            </button>
          )
        })}
      </div>

      <div className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-slate-950">{selectedWatch.model}</p>
            <p className="mt-1 text-xs text-slate-500">读取心率、ECG 与 HRV 的可用状态。</p>
          </div>
          <button
            type="button"
            onClick={onRead}
            disabled={capabilityState === "reading"}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-wait disabled:bg-slate-400"
          >
            {capabilityState === "reading" ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                正在读取
              </>
            ) : (
              <>
                <Radio className="h-4 w-4" />
                读取设备能力
              </>
            )}
          </button>
        </div>

        <div className="mt-4 grid gap-2 md:grid-cols-3">
          {SENSOR_DEFINITIONS.map((sensor) => {
            const supported = selectedWatch.sensors.includes(sensor.key)
            const visible = capabilityState === "ready"
            return (
              <div key={sensor.key} className={`rounded-md border p-3 ${
                visible
                  ? supported
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-rose-200 bg-rose-50"
                  : "border-slate-200 bg-white"
              }`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900">{sensor.name}</span>
                  {visible ? (
                    supported
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                      : <AlertTriangle className="h-4 w-4 text-rose-700" />
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400">待检测</span>
                  )}
                </div>
                <p className="mt-1 text-[11px] leading-4 text-slate-500">{sensor.description}</p>
                {sensor.required && <p className="mt-2 text-[10px] font-bold text-cyan-700">启动必需</p>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function ReadyStep({
  watchName,
  sensors,
  highRiskMode,
  confirmed,
  onConfirm,
}: {
  watchName: string
  sensors: string[]
  highRiskMode: boolean
  confirmed: boolean
  onConfirm: (confirmed: boolean) => void
}) {
  return (
    <div>
      <SectionHeading
        icon={ShieldCheck}
        eyebrow="Step 04"
        title="准备工作完成"
        description="开始检测后，系统会持续观察手表数据如何被感知、判断、安全审查并回传。"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">本次监测</p>
          <div className="mt-4 space-y-4">
            <SummaryRow label="已连接设备" value={watchName} />
            <SummaryRow label="可用传感器" value={sensors.join("、")} />
            <SummaryRow label="风险解释模式" value={highRiskMode ? "高风险健康背景保护" : "常规解释"} tone={highRiskMode ? "amber" : "emerald"} />
          </div>
        </div>

        <div className={`rounded-lg border p-5 ${highRiskMode ? "border-amber-300 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}>
          <div className="flex items-start gap-3">
            {highRiskMode ? (
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            ) : (
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            )}
            <div>
              <p className={`text-sm font-bold ${highRiskMode ? "text-amber-950" : "text-emerald-950"}`}>
                {highRiskMode ? "优先排除紧急情况" : "按常规状态解释"}
              </p>
              <p className={`mt-2 text-xs leading-5 ${highRiskMode ? "text-amber-900/80" : "text-emerald-900/80"}`}>
                {highRiskMode
                  ? "低体动但心率明显升高时，系统会暂停普通情绪归因和社交推送，先给出停止活动、复测与就医提示。"
                  : "系统会结合体动、步频、HRV、压力与心率趋势解释状态，但仍不会进行医疗诊断。"}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-950">
          <LockKeyhole className="h-4 w-4 text-cyan-700" />
          开始检测后
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          {[
            ["01", "手表采集", "心率、步频、体动"],
            ["02", "跨端传输", "设备与会话保持同步"],
            ["03", "Agent 判断", "感知、记忆、决策、安全"],
            ["04", "结果回传", "手表显示提醒与建议"],
          ].map(([number, title, detail]) => (
            <div key={number} className="rounded-md bg-slate-50 p-3">
              <span className="text-[10px] font-bold text-cyan-700">{number}</span>
              <p className="mt-1 text-xs font-bold text-slate-950">{title}</p>
              <p className="mt-1 text-[11px] leading-4 text-slate-500">{detail}</p>
            </div>
          ))}
        </div>
      </div>

      <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(event) => onConfirm(event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-cyan-700"
        />
        <span className="text-xs leading-5 text-slate-600">
          我理解该服务不是医疗器械或医疗诊断结果，紧急情况应直接联系急救。
        </span>
      </label>
    </div>
  )
}

function SummaryRow({ label, value, tone = "slate" }: { label: string; value: string; tone?: "slate" | "amber" | "emerald" }) {
  const toneClass = tone === "amber" ? "text-amber-700" : tone === "emerald" ? "text-emerald-700" : "text-slate-950"
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-3 last:border-b-0 last:pb-0">
      <span className="text-xs text-slate-500">{label}</span>
      <span className={`max-w-[62%] text-right text-xs font-bold leading-5 ${toneClass}`}>{value}</span>
    </div>
  )
}
