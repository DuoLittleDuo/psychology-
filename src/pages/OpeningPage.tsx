import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowRight,
  Brain,
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  Shield,
  Smartphone,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react"
import { LetterSwapPingPong } from "../components/LetterSwap"

const AGENTS = [
  { name: "感知", en: "Perception", icon: Eye, color: "#0891b2", desc: "读取手表、使用习惯与当下对话语气" },
  { name: "记忆", en: "Memory", icon: Brain, color: "#4f46e5", desc: "保留偏好、勿扰时间和近期情绪趋势" },
  { name: "决策", en: "Decision", icon: Target, color: "#0f766e", desc: "先判断是否该出现，再选择介入强度" },
  { name: "安全", en: "Safety", icon: Shield, color: "#d97706", desc: "危机表达和健康边界永远优先" },
  { name: "执行", en: "Execution", icon: Smartphone, color: "#0284c7", desc: "让手表、手机和系统台分工触达" },
]

const SHOWCASE = [
  {
    title: "安全守护",
    subtitle: "需要时出现，平时不打扰",
    desc: "当情绪跌入低谷或出现危机表达，安全 Agent 会先接管，再决定提醒、陪伴或升级求助。",
    image: "/slide-safety.jpg",
    icon: Shield,
    color: "#d97706",
    panel: "from-amber-50 to-orange-50",
  },
  {
    title: "深度理解",
    subtitle: "越陪伴，越懂你的节奏",
    desc: "瞬时记忆读懂此刻，短期记忆观察趋势，长期记忆沉淀偏好，让每次出现都更克制、更贴近。",
    image: "/slide-understand.jpg",
    icon: Brain,
    color: "#4f46e5",
    panel: "from-indigo-50 to-sky-50",
  },
  {
    title: "主动关怀",
    subtitle: "不等你开口，也不贸然打扰",
    desc: "系统会综合压力、睡眠、体动和对话信号，只在真正需要低成本支持时给出入口。",
    image: "/slide-care.jpg",
    icon: Eye,
    color: "#0f766e",
    panel: "from-emerald-50 to-cyan-50",
  },
  {
    title: "隐私优先",
    subtitle: "敏感数据优先留在设备侧",
    desc: "健康背景、状态趋势和对话内容优先本地处理；系统只传递完成当前判断所需的摘要。",
    image: "/slide-privacy.jpg",
    icon: Heart,
    color: "#be123c",
    panel: "from-rose-50 to-pink-50",
  },
  {
    title: "跨端无缝",
    subtitle: "手表一句话，手机接住细节",
    desc: "短提醒留在手腕，完整解释交给手机和系统台。不同设备承担不同密度的信息。",
    image: "/slide-seamless.jpg",
    icon: Smartphone,
    color: "#0284c7",
    panel: "from-cyan-50 to-blue-50",
  },
]

export default function OpeningPage() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), 260)
    return () => window.clearTimeout(timer)
  }, [])

  const enterApp = () => navigate("/app/system-overview")

  return (
    <div className="h-screen overflow-y-auto bg-[linear-gradient(170deg,#f8fbff_0%,#f4f7fb_38%,#eef8f6_70%,#fff7ed_100%)] text-slate-950">
      <Hero ready={ready} onEnter={enterApp} />
      <AgentSection ready={ready} />
      <ShowcaseSection />
      <DeviceSection />
      <FinalSection onEnter={enterApp} />
    </div>
  )
}

function Hero({ ready, onEnter }: { ready: boolean; onEnter: () => void }) {
  return (
    <section className="relative z-10 mx-auto flex min-h-[92vh] w-full max-w-6xl flex-col items-center px-6 pb-10 pt-14 text-center md:pt-20">
      <motion.div
        className="mb-6 h-44 w-44 md:h-52 md:w-52"
        initial={{ opacity: 0, scale: 0.82 }}
        animate={ready ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <img src="/hero-illustration.svg" alt="同频心理陪伴" className="h-full w-full object-contain drop-shadow-[0_28px_45px_rgba(15,23,42,0.16)]" />
      </motion.div>

      <motion.h1
        className="font-black italic leading-none tracking-normal"
        style={{
          fontSize: "clamp(5rem, 18vw, 12rem)",
          background: "linear-gradient(135deg,#0f172a 0%,#0891b2 42%,#0f766e 74%,#d97706 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
        initial={{ opacity: 0, y: 38 }}
        animate={ready ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.72, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
      >
        同频
      </motion.h1>

      <motion.p
        className="mt-4 text-xs font-bold uppercase tracking-[0.34em] text-cyan-700/70 md:text-sm"
        initial={{ opacity: 0 }}
        animate={ready ? { opacity: 1 } : {}}
        transition={{ duration: 0.5, delay: 0.55 }}
      >
        Same Wavelength
      </motion.p>

      <motion.p
        className="mt-4 max-w-xl text-base font-medium leading-8 text-slate-600 md:text-xl"
        initial={{ opacity: 0, y: 12 }}
        animate={ready ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: 0.72 }}
      >
        先读懂你的心情，再帮你找到同频的人。
      </motion.p>

      <motion.button
        type="button"
        onClick={onEnter}
        className="journey-button group relative mt-8 rounded-full text-base font-bold text-white outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/35 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
        initial={{ opacity: 0, y: 20 }}
        animate={ready ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: 0.92 }}
        whileHover={{ scale: 1.025, y: -2 }}
        whileTap={{ scale: 0.97 }}
      >
        <span className="journey-button__aura absolute -inset-4 rounded-full" aria-hidden="true" />
        <span className="journey-button__skin relative z-10 flex items-center gap-2 overflow-hidden rounded-full border border-white/10 px-10 py-4 shadow-[0_14px_36px_rgba(8,145,178,0.18),inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-16px_28px_rgba(8,145,178,0.07)] backdrop-blur-xl transition-[border-color,box-shadow,background-color] duration-300 group-hover:border-cyan-100/20 group-hover:shadow-[0_18px_46px_rgba(8,145,178,0.24),inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-18px_32px_rgba(20,184,166,0.10)]">
          <LetterSwapPingPong label="开启同频之旅" staggerDuration={0.04} transition={{ type: "spring", duration: 0.5 }} />
          <motion.span animate={{ x: [0, 4, 0] }} transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}>
            <ArrowRight className="h-4 w-4" />
          </motion.span>
        </span>
      </motion.button>

      <motion.div
        className="mt-auto h-1 w-20 rounded-full bg-[linear-gradient(90deg,transparent,rgba(8,145,178,0.45),transparent)]"
        animate={{ opacity: [0.3, 0.8, 0.3], scaleX: [0.8, 1.18, 0.8] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
    </section>
  )
}

function AgentSection({ ready }: { ready: boolean }) {
  return (
    <section className="relative z-10 mx-auto w-full max-w-5xl px-6 pb-16">
      <motion.div
        className="mb-10 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={ready ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: 1.15 }}
      >
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-cyan-50 px-4 py-1.5 text-xs font-bold text-cyan-700 ring-1 ring-cyan-100">
          <Sparkles className="h-3.5 w-3.5" />
          五大 AI Agent 联邦协同
        </div>
        <h2 className="text-2xl font-bold text-slate-950 md:text-3xl">你的专属心理陪伴系统</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
          每个 Agent 各司其职，让陪伴更清楚、更克制，也更可信。
        </p>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {AGENTS.map((agent, index) => (
          <AgentCard key={agent.name} agent={agent} index={index} ready={ready} />
        ))}
      </div>
    </section>
  )
}

function AgentCard({ agent, index, ready }: { agent: { name: string; en: string; icon: LucideIcon; color: string; desc: string }; index: number; ready: boolean }) {
  const Icon = agent.icon
  return (
    <motion.div
      className="group flex min-h-40 flex-col items-center gap-3 rounded-lg border border-slate-200 bg-white/82 p-5 text-center shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-cyan-200 hover:shadow-md"
      initial={{ opacity: 0, y: 20 }}
      animate={ready ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: 1.35 + index * 0.08 }}
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-lg" style={{ backgroundColor: `${agent.color}16`, color: agent.color }}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-950">{agent.name}</p>
        <p className="mt-0.5 text-[10px] font-semibold text-slate-400">{agent.en}</p>
      </div>
      <p className="text-[11px] font-medium leading-5 text-slate-500 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        {agent.desc}
      </p>
    </motion.div>
  )
}

function ShowcaseSection() {
  const [active, setActive] = useState(0)
  const [direction, setDirection] = useState(1)
  const slide = SHOWCASE[active]
  const Icon = slide.icon

  const goNext = () => {
    setDirection(1)
    setActive((current) => (current + 1) % SHOWCASE.length)
  }
  const goPrev = () => {
    setDirection(-1)
    setActive((current) => (current - 1 + SHOWCASE.length) % SHOWCASE.length)
  }

  return (
    <section className="relative z-10 w-full bg-white/64 py-16 backdrop-blur-sm">
      <div className="mx-auto max-w-5xl px-6">
        <motion.div
          className="mb-10 text-center"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-100">
            <Sparkles className="h-3.5 w-3.5" />
            为什么选择同频
          </div>
          <h2 className="text-2xl font-bold text-slate-950 md:text-3xl">AI 心理陪伴，不是冰冷工具</h2>
        </motion.div>

        <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.12)]">
          <div className="grid lg:grid-cols-2">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={active}
                custom={direction}
                initial={{ opacity: 0, x: direction * 60 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -60 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="relative aspect-[4/3] overflow-hidden lg:aspect-auto"
              >
                <img src={slide.image} alt={slide.title} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent" />
              </motion.div>
            </AnimatePresence>

            <div className={`flex flex-col justify-center bg-gradient-to-br ${slide.panel} p-8 md:p-12 lg:p-14`}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${active}-text`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg" style={{ backgroundColor: `${slide.color}16`, color: slide.color }}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <p className="mb-2 text-xs font-black uppercase tracking-[0.16em]" style={{ color: slide.color }}>{slide.title}</p>
                  <h3 className="mb-3 text-2xl font-bold leading-tight text-slate-950 md:text-3xl">{slide.subtitle}</h3>
                  <p className="max-w-md text-sm font-medium leading-7 text-slate-600">{slide.desc}</p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <button
            type="button"
            onClick={goPrev}
            aria-label="上一个功能"
            className="absolute left-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-md backdrop-blur transition hover:bg-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={goNext}
            aria-label="下一个功能"
            className="absolute right-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-slate-200 bg-white/90 text-slate-700 shadow-md backdrop-blur transition hover:bg-white"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          {SHOWCASE.map((item, index) => (
            <button
              key={item.title}
              type="button"
              onClick={() => {
                setDirection(index > active ? 1 : -1)
                setActive(index)
              }}
              aria-label={`查看${item.title}`}
              className={`h-2.5 rounded-full transition-all duration-300 ${index === active ? "w-7 bg-cyan-700" : "w-2.5 bg-slate-300 hover:bg-slate-400"}`}
            />
          ))}
        </div>
        <p className="mt-3 text-center text-xs font-semibold text-slate-400">
          {String(active + 1).padStart(2, "0")} / {String(SHOWCASE.length).padStart(2, "0")}
        </p>
      </div>
    </section>
  )
}

function DeviceSection() {
  return (
    <section className="relative z-10 mx-auto w-full max-w-5xl px-6 py-16">
      <motion.div
        className="mb-10 text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="mb-3 text-2xl font-bold text-slate-950 md:text-3xl">多端陪伴，无处不在</h2>
        <p className="mx-auto max-w-lg text-sm leading-6 text-slate-500">从手表到手机，同频始终在你身边，但不会挤占你的生活。</p>
      </motion.div>

      <motion.div
        className="mx-auto w-full max-w-3xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.12)]"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <img src="/device-showcase.jpg" alt="同频多端协同展示" className="h-auto w-full object-cover" />
      </motion.div>
    </section>
  )
}

function FinalSection({ onEnter }: { onEnter: () => void }) {
  return (
    <section className="relative z-10 w-full pb-20">
      <motion.div
        className="mx-auto max-w-2xl px-6 text-center"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
      >
        <img src="/star-sparkle.svg" alt="" className="mx-auto mb-4 h-10 w-10" />
        <h2 className="mb-4 text-2xl font-bold text-slate-950 md:text-3xl">每个人都值得被温柔理解</h2>
        <p className="mb-8 text-sm leading-6 text-slate-500">
          端侧隐私优先 · 五大 AI Agent 协同 · 读懂你的心情 · 守护你的光亮
        </p>
        <motion.button
          type="button"
          onClick={onEnter}
          className="inline-flex items-center gap-2 rounded-full bg-[linear-gradient(135deg,#0f172a,#0891b2,#0f766e)] px-8 py-3.5 text-sm font-bold text-white shadow-[0_14px_36px_rgba(8,145,178,0.22)]"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
        >
          开始体验
          <ArrowRight className="h-4 w-4" />
        </motion.button>
      </motion.div>
    </section>
  )
}
