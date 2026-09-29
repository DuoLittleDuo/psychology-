import { useState, type ComponentType, type CSSProperties } from "react"
import { AnimatePresence, motion } from "framer-motion"
import {
  ArrowLeft,
  ArrowRight,
  Brain,
  Eye,
  GitBranch,
  RefreshCw,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react"

interface Agent {
  id: string
  name: string
  englishName: string
  icon: ComponentType<{ className?: string; style?: CSSProperties }>
  color: string
  colorBg: string
  colorLight: string
  position: { x: number; y: number }
  description: string
  metrics: string[]
}

const AGENTS: Agent[] = [
  {
    id: "perception",
    name: "感知 Agent",
    englishName: "Perception",
    icon: Eye,
    color: "#0891b2",
    colorBg: "rgba(8,145,178,0.10)",
    colorLight: "#ecfeff",
    position: { x: 50, y: 13 },
    description:
      "统一接入心率、睡眠、步态、交互与场景信号，先生成结构化状态快照，再交给后续 Agent 判断。",
    metrics: ["4 通道", "<500ms", "事件驱动"],
  },
  {
    id: "memory",
    name: "记忆 Agent",
    englishName: "Memory",
    icon: Brain,
    color: "#4f46e5",
    colorBg: "rgba(79,70,229,0.10)",
    colorLight: "#eef2ff",
    position: { x: 18, y: 43 },
    description:
      "使用瞬时、短期与长期三层记忆解释当前状态。记忆只补充背景，不替代用户当下的真实表达。",
    metrics: ["3 层", "向量召回", "衰减归档"],
  },
  {
    id: "safety",
    name: "安全 Agent",
    englishName: "Safety",
    icon: Shield,
    color: "#e11d48",
    colorBg: "rgba(225,29,72,0.10)",
    colorLight: "#fff1f2",
    position: { x: 82, y: 43 },
    description:
      "独立常驻的判断层。负责关键词扫描、推送预算、拒绝冷却与危机升级，始终拥有最高拦截权限。",
    metrics: ["独立常驻", "3 级扫描", "4 级响应"],
  },
  {
    id: "decision",
    name: "决策 Agent",
    englishName: "Decision",
    icon: GitBranch,
    color: "#2563eb",
    colorBg: "rgba(37,99,235,0.10)",
    colorLight: "#eff6ff",
    position: { x: 50, y: 58 },
    description:
      "先通过九宫格完成秒级决策，再把持续变化升级为渐进任务链。安全判断拥有最终否决权。",
    metrics: ["L1 情绪", "L2 规划", "安全否决"],
  },
  {
    id: "execution",
    name: "执行 Agent",
    englishName: "Execution",
    icon: Zap,
    color: "#d97706",
    colorBg: "rgba(217,119,6,0.10)",
    colorLight: "#fffbeb",
    position: { x: 50, y: 86 },
    description:
      "根据打扰成本选择手表、手机、平板或负一屏，只呈现当前最值得用户看到的轻量结果。",
    metrics: ["4 设备", "低打扰", "秒级触达"],
  },
]

const ARROWS = [
  { from: "perception", to: "memory", label: "状态快照" },
  { from: "perception", to: "safety", label: "安全监控", dashed: true },
  { from: "memory", to: "decision", label: "上下文召回" },
  { from: "safety", to: "decision", label: "风险拦截", dashed: true },
  { from: "decision", to: "execution", label: "执行指令" },
  { from: "decision", to: "memory", label: "反馈学习", dashed: true },
]

const REFLECTION_STEPS = [
  { icon: Sparkles, label: "即时反思", desc: "对话结束后自动评估结果", color: "#4f46e5" },
  { icon: RefreshCw, label: "每日复盘", desc: "复盘情绪趋势与关键事件", color: "#2563eb" },
  { icon: Shield, label: "每周审计", desc: "检查安全策略与实际效果", color: "#0891b2" },
  { icon: GitBranch, label: "策略自调优", desc: "根据长期效果调整参数", color: "#d97706" },
]

function getCurvePath(from: Agent, to: Agent) {
  const x1 = from.position.x * 8
  const y1 = from.position.y * 5.2
  const x2 = to.position.x * 8
  const y2 = to.position.y * 5.2
  const dx = x2 - x1
  const dy = y2 - y1
  const cx1 = x1 + dx * 0.38
  const cy1 = y1 + dy * 0.08
  const cx2 = x2 - dx * 0.38
  const cy2 = y2 - dy * 0.08

  return "M " + x1 + "," + y1 + " C " + cx1 + "," + cy1 + " " + cx2 + "," + cy2 + " " + x2 + "," + y2
}

function getAgent(agentId: string) {
  return AGENTS.find((agent) => agent.id === agentId)!
}

export default function AgentArchitecturePage() {
  const [selectedAgent, setSelectedAgent] = useState<string | null>("decision")
  const selected = AGENTS.find((agent) => agent.id === selectedAgent)
  const paths = ARROWS.map((arrow) => ({
    ...arrow,
    d: getCurvePath(getAgent(arrow.from), getAgent(arrow.to)),
    fromAgent: getAgent(arrow.from),
    toAgent: getAgent(arrow.to),
  }))
  const relatedLinks = selected
    ? ARROWS.filter((arrow) => arrow.from === selected.id || arrow.to === selected.id)
    : []

  return (
    <div className="mx-auto flex min-h-[760px] w-full max-w-[1280px] flex-col gap-5 p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">Agent Federation</p>
          <h1 className="mt-1 text-2xl font-black tracking-normal text-slate-950">五大 Agent 如何协同</h1>
          <p className="mt-1 text-xs font-medium text-slate-500">
            从感知到执行，安全判断始终贯穿主链路
          </p>
        </div>
        <div className="hidden items-center gap-3 text-[10px] font-bold text-slate-400 sm:flex">
          <span>5 Agents</span>
          <span className="h-3 w-px bg-slate-200" />
          <span>6 Connections</span>
          <span className="h-3 w-px bg-slate-200" />
          <span>Safety First</span>
        </div>
      </motion.div>

      <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.55fr)]">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="relative h-[460px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:h-[520px] lg:h-[560px]"
        >
          <div
            className="absolute inset-0 opacity-[0.055]"
            style={{
              backgroundImage: "radial-gradient(circle, #2563eb 1px, transparent 1px)",
              backgroundSize: "26px 26px",
            }}
          />
          <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-blue-50/70 to-transparent" />

          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 800 520"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              {paths.map((path) => (
                <linearGradient
                  key={"gradient-" + path.from + "-" + path.to}
                  id={"gradient-" + path.from + "-" + path.to}
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="100%"
                >
                  <stop offset="0%" stopColor={path.fromAgent.color} stopOpacity="0.72" />
                  <stop offset="100%" stopColor={path.toAgent.color} stopOpacity="0.72" />
                </linearGradient>
              ))}
            </defs>

            {paths.map((path, index) => {
              const isActive = selectedAgent === path.from || selectedAgent === path.to
              const gradientId = "gradient-" + path.from + "-" + path.to
              return (
                <g key={path.from + "-" + path.to}>
                  <motion.path
                    d={path.d}
                    fill="none"
                    stroke={isActive ? "url(#" + gradientId + ")" : "rgba(148,163,184,0.24)"}
                    strokeWidth={isActive ? 2.4 : 1.25}
                    strokeDasharray={path.dashed ? "8 7" : "none"}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ delay: 0.2 + index * 0.08, duration: 0.85, ease: "easeOut" }}
                  />
                  <circle
                    r={isActive ? 6 : 4.2}
                    fill={path.toAgent.color}
                    opacity={isActive ? 0.9 : 0.28}
                  >
                    <animateMotion
                      dur={path.dashed ? "3.8s" : "3s"}
                      begin={index * 0.32 + "s"}
                      repeatCount="indefinite"
                      path={path.d}
                    />
                  </circle>
                </g>
              )
            })}
          </svg>

          {AGENTS.map((agent, index) => {
            const Icon = agent.icon
            const isSelected = selectedAgent === agent.id
            const isDimmed = selectedAgent !== null && !isSelected

            return (
              <motion.button
                key={agent.id}
                type="button"
                aria-pressed={isSelected}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{
                  opacity: isDimmed ? 0.55 : 1,
                  scale: isSelected ? 1.045 : 1,
                }}
                transition={{ delay: 0.12 + index * 0.06, type: "spring", stiffness: 220, damping: 22 }}
                whileHover={{ scale: isSelected ? 1.045 : 1.035 }}
                onClick={() => setSelectedAgent(isSelected ? null : agent.id)}
                className="absolute z-20 flex w-[22%] min-w-[88px] max-w-[144px] -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-xl border bg-white/95 px-2.5 py-2 text-left shadow-[0_10px_28px_rgba(15,23,42,0.06)] backdrop-blur-sm"
                style={{
                  left: agent.position.x + "%",
                  top: agent.position.y + "%",
                  borderColor: isSelected ? agent.color : "#e2e8f0",
                  boxShadow: isSelected ? "0 12px 34px " + agent.color + "22" : undefined,
                }}
              >
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: agent.colorBg }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: agent.color }} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[10px] font-black text-slate-900 sm:text-[11px]">
                    {agent.name.replace(" Agent", "")}
                  </span>
                  <span className="mt-0.5 hidden truncate text-[7px] font-bold uppercase tracking-[0.1em] text-slate-400 sm:block sm:text-[8px]">
                    {agent.englishName}
                  </span>
                </span>
              </motion.button>
            )
          })}

          <div className="absolute bottom-3 left-3 flex items-center gap-3 rounded-full border border-slate-200 bg-white/90 px-3 py-1.5 text-[9px] font-bold text-slate-500 shadow-sm backdrop-blur-sm">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-4 rounded-full bg-blue-400" />
              主链路
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-px w-4 border-t border-dashed border-rose-300" />
              安全链路
            </span>
          </div>

          <p className="absolute bottom-3 right-3 text-[9px] font-semibold text-slate-400">
            点击节点查看Agent详情
          </p>
        </motion.section>

        <motion.aside
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          className="flex min-h-[320px] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:min-h-[560px]"
        >
          <AnimatePresence mode="wait">
            {selected ? (
              <motion.div
                key={selected.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex h-full flex-col"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: selected.colorLight }}
                    >
                      <selected.icon className="h-5 w-5" style={{ color: selected.color }} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-[0.16em]" style={{ color: selected.color }}>
                        Agent {AGENTS.findIndex((agent) => agent.id === selected.id) + 1} / 05
                      </p>
                      <h2 className="mt-0.5 text-lg font-black text-slate-950">{selected.name}</h2>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                        {selected.englishName}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedAgent(null)}
                    className="rounded-lg px-2 py-1 text-[10px] font-bold text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                  >
                    收起
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  {selected.metrics.map((metric) => (
                    <div
                      key={metric}
                      className="rounded-xl border px-2 py-2.5 text-center"
                      style={{ borderColor: selected.color + "20", backgroundColor: selected.colorLight }}
                    >
                      <span className="block text-[10px] font-black" style={{ color: selected.color }}>
                        {metric}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">职责描述</p>
                  <p className="mt-2 text-[13px] font-medium leading-6 text-slate-600">{selected.description}</p>
                </div>

                <div className="mt-5 border-t border-slate-100 pt-4 lg:mt-auto">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">连接关系</p>
                  <div className="mt-2 space-y-2">
                    {relatedLinks.map((link) => {
                      const isOutgoing = link.from === selected.id
                      const other = getAgent(isOutgoing ? link.to : link.from)
                      const OtherIcon = other.icon
                      return (
                        <button
                          key={link.from + "-" + link.to}
                          type="button"
                          onClick={() => setSelectedAgent(other.id)}
                          className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 text-left transition-colors hover:border-blue-200 hover:bg-white"
                        >
                          <span
                            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                            style={{ backgroundColor: other.colorBg }}
                          >
                            <OtherIcon className="h-3.5 w-3.5" style={{ color: other.color }} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[11px] font-bold text-slate-800">{other.name}</span>
                            <span className="mt-0.5 block truncate text-[9px] font-semibold text-slate-400">
                              {link.label}
                            </span>
                          </span>
                          {isOutgoing ? (
                            <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          ) : (
                            <ArrowLeft className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex h-full min-h-[280px] flex-col justify-center"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Sparkles className="h-5 w-5" />
                </span>
                <h2 className="mt-4 text-lg font-black text-slate-950">五节点联邦协同</h2>
                <p className="mt-2 text-[13px] font-medium leading-6 text-slate-500">
                  点击架构图中的任一 Agent，查看它的职责、指标与连接关系。
                </p>
                <div className="mt-5 grid grid-cols-5 gap-2">
                  {AGENTS.map((agent) => {
                    const Icon = agent.icon
                    return (
                      <button
                        key={agent.id}
                        type="button"
                        onClick={() => setSelectedAgent(agent.id)}
                        className="flex aspect-square items-center justify-center rounded-xl border transition-transform hover:-translate-y-0.5"
                        style={{ borderColor: agent.color + "25", backgroundColor: agent.colorBg }}
                        aria-label={agent.name}
                      >
                        <Icon className="h-4 w-4" style={{ color: agent.color }} />
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.aside>
      </div>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.24 }}
        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-blue-600">Continuous Learning</p>
            <h3 className="mt-1 text-base font-black text-slate-950">反思 Agent：持续自优化闭环</h3>
          </div>
          <span className="text-[10px] font-semibold text-slate-400">每轮任务结束后自动触发</span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {REFLECTION_STEPS.map((step, index) => {
            const Icon = step.icon
            return (
              <motion.div
                key={step.label}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.28 + index * 0.05 }}
                className="flex min-h-[72px] items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-3"
              >
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: step.color + "14" }}
                >
                  <Icon className="h-4 w-4" style={{ color: step.color }} />
                </span>
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-300">
                    Step 0{index + 1}
                  </p>
                  <p className="mt-0.5 text-xs font-black text-slate-800">{step.label}</p>
                  <p className="mt-0.5 truncate text-[10px] font-medium text-slate-500">{step.desc}</p>
                </div>
              </motion.div>
            )
          })}
        </div>
      </motion.section>
    </div>
  )
}
