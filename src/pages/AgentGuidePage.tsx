import { Link } from "react-router-dom"
import { motion } from "framer-motion"
import {
  ArrowRight,
  Brain,
  Eye,
  GitBranch,
  HeartPulse,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Watch,
} from "lucide-react"

const AGENT_STEPS = [
  {
    name: "感知",
    role: "Perception",
    icon: Eye,
    color: "#0f766e",
    description: "读取手表心率、步数、体动、睡眠与压力信号，并与对话和场景上下文合并。",
  },
  {
    name: "记忆",
    role: "Memory",
    icon: Brain,
    color: "#7c3aed",
    description: "保留即时状态、近期趋势与长期偏好，避免每次都从零理解用户。",
  },
  {
    name: "决策",
    role: "Decision",
    icon: GitBranch,
    color: "#0369a1",
    description: "先做秒级状态判断，再在连续异常时生成渐进式陪伴或干预计划。",
  },
  {
    name: "安全",
    role: "Safety",
    icon: ShieldCheck,
    color: "#b45309",
    description: "独立审查异常信号与危机表达；高风险健康背景下优先排除紧急情况。",
  },
  {
    name: "执行",
    role: "Execution",
    icon: Smartphone,
    color: "#be123c",
    description: "将结果分流到手表、手机负一屏或系统卡片，保持轻触达与低打扰。",
  },
]

export default function AgentGuidePage() {
  return (
    <div className="min-h-full bg-[linear-gradient(180deg,#f7fbff_0%,#f8f7ff_52%,#fff8f4_100%)]">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 p-4 md:p-6">
        <section className="overflow-hidden rounded-2xl border border-white/80 bg-slate-950 text-white shadow-[0_20px_60px_rgba(15,23,42,0.16)]">
          <div className="grid gap-8 p-6 md:p-8 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1 text-xs font-semibold text-cyan-200">
                <Sparkles className="h-3.5 w-3.5" />
                Agent 名称：同频
              </div>
              <h1 className="mt-4 max-w-3xl text-3xl font-bold leading-tight md:text-4xl">
                不是等你打开聊天窗口，而是先感知、再判断、最后由安全规则决定是否出现
              </h1>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">
                同频由五个子 Agent 组成联邦。手表负责轻量采集与提醒，系统端负责记忆、规划和安全审查；
                所有能力围绕一个目标：在用户需要时提供低打扰、可解释、不过度推断的帮助。
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/app/system-overview?section=overview"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-500 px-5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  返回运行总览
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/app/system-overview?section=architecture"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  查看完整架构图
                </Link>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/15 text-cyan-300">
                  <Watch className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-slate-400">当前业务闭环</p>
                  <p className="mt-1 text-sm font-bold text-white">手表采集 → 跨端判断 → 安全审查 → 结果回传</p>
                </div>
              </div>
              <div className="mt-5 space-y-3">
                <GuideFact label="工作位置" value="手表轻量端 + 手机系统端" />
                <GuideFact label="数据原则" value="端侧处理优先，不上传敏感原始数据" />
                <GuideFact label="安全边界" value="非医疗诊断，不替代医生或急救" />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-sm backdrop-blur md:p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-700">Agent Federation</p>
              <h2 className="mt-2 text-xl font-bold text-slate-950">五个子 Agent 如何接力</h2>
            </div>
            <p className="max-w-xl text-xs leading-5 text-slate-500">
              感知、记忆、决策、安全、执行各自独立，又通过统一状态快照协同。
            </p>
          </div>

          <div className="mt-5 grid gap-3 xl:grid-cols-5">
            {AGENT_STEPS.map((agent, index) => {
              const Icon = agent.icon
              return (
                <motion.div
                  key={agent.name}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.06 }}
                  className="relative rounded-xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: agent.color + "16", color: agent.color }}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">{agent.role}</span>
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-slate-950">{agent.name}</h3>
                  <p className="mt-2 text-xs leading-5 text-slate-500">{agent.description}</p>
                  {index < AGENT_STEPS.length - 1 && (
                    <ArrowRight className="absolute -right-4 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 text-slate-300 xl:block" />
                  )}
                </motion.div>
              )
            })}
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <section className="rounded-2xl border border-white/80 bg-white/85 p-5 shadow-sm backdrop-blur md:p-6">
            <div className="flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-rose-600" />
              <h2 className="text-lg font-bold text-slate-950">一次异常心率如何流转</h2>
            </div>
            <div className="mt-5 space-y-4">
              {[
                {
                  number: "01",
                  title: "手表先识别“发生了什么”",
                  text: "同时读取心率、步频、体动与 HRV，不把单一心率值直接解释成运动或情绪。",
                },
                {
                  number: "02",
                  title: "感知 Agent 生成状态快照",
                  text: "将当前信号与最近趋势对齐，标记“低体动 + 持续高心率”等异常组合。",
                },
                {
                  number: "03",
                  title: "安全 Agent 优先检查健康边界",
                  text: "如果用户已填写高风险健康背景，系统暂停普通归因与社交推荐，优先建议复测和就医。",
                },
                {
                  number: "04",
                  title: "执行 Agent 选择最低打扰触达",
                  text: "手表显示短提醒或紧急求助卡片，手机保留完整信息，不在高风险状态下继续推送社交内容。",
                },
              ].map((item) => (
                <div key={item.number} className="grid grid-cols-[44px_1fr] gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-950 text-xs font-bold text-white">{item.number}</span>
                  <div className="border-b border-slate-100 pb-4 last:border-b-0 last:pb-0">
                    <h3 className="text-sm font-bold text-slate-950">{item.title}</h3>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{item.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-5">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5">
              <div className="flex items-center gap-2">
                <LockKeyhole className="h-5 w-5 text-emerald-700" />
                <h2 className="text-sm font-bold text-emerald-950">端侧隐私优先</h2>
              </div>
              <p className="mt-3 text-xs leading-5 text-emerald-900/80">
                健康背景、心率趋势和对话内容优先在本地处理。系统只把完成当前任务所需的摘要交给后续 Agent，
                不把敏感原始数据直接上传云端。
              </p>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
                <div>
                  <h2 className="text-sm font-bold text-amber-950">安全规则优先于自动判断</h2>
                  <p className="mt-2 text-xs leading-5 text-amber-900/80">
                    心跳加快可能来自运动，也可能来自突发身体问题。对于高风险健康背景，系统采用更保守的解释策略：
                    先排除紧急情况，再考虑情绪或压力。
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-sm font-bold text-slate-950">继续查看</h2>
              <div className="mt-4 grid gap-2">
                <GuideLink to="/app?stage=monitor" label="设备监测与流转" />
                <GuideLink to="/app/system-overview?section=architecture" label="五大 Agent 架构图" />
                <GuideLink to="/app/system-overview?section=crisis" label="四级安全响应" />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}

function GuideFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-3 last:border-b-0 last:pb-0">
      <span className="text-xs text-slate-400">{label}</span>
      <span className="max-w-[64%] text-right text-xs font-semibold leading-5 text-white">{value}</span>
    </div>
  )
}

function GuideLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="group flex min-h-11 items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-700 transition hover:border-cyan-300 hover:bg-cyan-50 hover:text-cyan-800"
    >
      {label}
      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}
