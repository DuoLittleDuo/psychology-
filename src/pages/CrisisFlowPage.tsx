import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Heart, Phone, Shield, Sun, ArrowRight, AlertTriangle } from "lucide-react"

const CRISIS_LEVELS = [
  {
    level: 1,
    name: "延长陪伴",
    icon: Heart,
    color: "#f59e0b",
    colorLight: "#fef3c7",
    colorBg: "rgba(245,158,11,0.1)",
    trigger: "安全Agent命中 L3关键词，明确自伤/自杀意图",
    exitCondition: "用户情绪稳定，表达安全承诺",
    agentAction: "Agent不结束对话，持续陪伴30分钟，不推送任何其他内容，表达关心不评判",
    dialogue: "\"你愿不愿意告诉我发生了什么？我会一直在这里。\"",
  },
  {
    level: 2,
    name: "专业资源引导",
    icon: Phone,
    color: "#f97316",
    colorLight: "#ffedd5",
    colorBg: "rgba(249,115,22,0.1)",
    trigger: "一级响应已执行，情绪未见明显改善",
    exitCondition: "用户接受资源或明确拒绝",
    agentAction: "温和推送专业资源：校心理咨询中心、24h心理援助热线。绝不为用户做决定，绝不未经同意通知他人",
    dialogue: "\"有些时候，和真人聊聊会更有帮助。如果需要，这里有几个选项——不用现在决定。\"",
  },
  {
    level: 3,
    name: "征询授权",
    icon: Shield,
    color: "#ef4444",
    colorLight: "#fee2e2",
    colorBg: "rgba(239,68,68,0.1)",
    trigger: "二级响应已执行24h，数据持续恶化",
    exitCondition: "用户明确授权或明确拒绝，或48h未回应→不行动",
    agentAction: "明确询问用户意愿：\"是否联系紧急联系人？\"用户有完全权利说不。拒绝后尊重，继续监测。不行动、不通知任何人",
    dialogue: "\"我有点担心你。如果你愿意，我可以帮你联系[紧急联系人]。只是问一下——你有完全的权利说不。\"",
  },
  {
    level: 4,
    name: "长期低频关怀",
    icon: Sun,
    color: "#3b82f6",
    colorLight: "#dbeafe",
    colorBg: "rgba(59,130,246,0.1)",
    trigger: "危机降级后，风险恢复至橙或绿",
    exitCondition: "持续观察30天，确认模式稳定",
    agentAction: "不遗忘危机经历，维持轻度关注：每2-3天一条温暖卡片，记录到长期记忆。如再次恶化→从一级重启",
    dialogue: "\"这两天好一点了吗？不需要回复我——只是想说，天气好的时候去操场走走吧。\"",
  },
]

export default function CrisisFlowPage() {
  const [activeLevel, setActiveLevel] = useState<number | null>(null)
  const [running, setRunning] = useState(false)

  const startResponse = () => {
    setRunning(true)
    setActiveLevel(null)
    let i = 1
    const showNext = () => {
      if (i <= 4) {
        setActiveLevel(i)
        i++
        setTimeout(showNext, 2500)
      } else {
        setTimeout(() => {
          setActiveLevel(null)
          setRunning(false)
        }, 3000)
      }
    }
    setTimeout(showNext, 500)
  }

  return (
    <div className="mx-auto flex min-h-[720px] w-full max-w-[1280px] flex-col justify-center gap-5 p-4 md:p-6">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 px-1"
      >
        <div className="h-6 w-1 rounded-full bg-gradient-to-b from-rose-500 to-orange-400" />
        <div>
          <h1 className="text-xl font-bold text-slate-950">安全危机四级响应升级链</h1>
          <p className="text-xs font-medium text-slate-500">Safety Agent 独立常驻 · 四级渐进升级 · 全程尊重用户意愿</p>
        </div>
      </motion.div>

      <div className="flex items-start justify-center gap-3 overflow-x-auto py-2">
        {CRISIS_LEVELS.map((level, idx) => {
          const Icon = level.icon
          const isActive = activeLevel === level.level
          const isPassed = activeLevel !== null && activeLevel > level.level

          return (
            <div key={level.level} className="flex min-w-0 flex-1 items-stretch">
              <motion.div
                className="flex h-[360px] min-w-[230px] max-w-[310px] flex-1 cursor-pointer flex-col items-center gap-2.5 overflow-hidden rounded-xl p-4 text-center"
                style={{
                  background: isActive
                    ? "rgba(255,255,255,0.6)"
                    : "rgba(255,255,255,0.35)",
                  backdropFilter: "blur(12px)",
                  WebkitBackdropFilter: "blur(12px)",
                  border: isActive
                    ? "1px solid " + level.color + "80"
                    : "1px solid rgba(139,92,246,0.1)",
                  boxShadow: isActive
                    ? "0 0 24px " + level.color + "30"
                    : "0 2px 8px rgba(139,92,246,0.03)",
                }}
                animate={{
                  scale: isActive ? 1.02 : isPassed ? 0.98 : 1,
                  opacity: isPassed ? 0.6 : 1,
                }}
                whileHover={{ scale: isActive ? 1.02 : 1.01 }}
                onClick={() => !running && setActiveLevel(isActive ? null : level.level)}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: isActive ? level.colorBg : "rgba(255,255,255,0.5)" }}
                >
                  <Icon className="w-6 h-6" style={{ color: isActive ? level.color : "#4b5563" }} />
                </div>

                <span
                  className="text-[10px] font-mono font-bold"
                  style={{ color: level.color }}
                >
                  LEVEL {level.level}
                </span>

                <span
                  className="text-sm font-bold"
                  style={{ color: isActive ? level.color : "#6b7280" }}
                >
                  {level.name}
                </span>

                <div className="w-full rounded-xl border border-slate-100 bg-white/55 px-3 py-2.5 text-left">
                  <p className="text-[9px] font-bold uppercase tracking-[0.12em]" style={{ color: level.color }}>
                    触发条件
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{level.trigger}</p>
                </div>

                {isActive ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="w-full p-3 rounded-xl text-left"
                    style={{
                      backgroundColor: "rgba(255,255,255,0.5)",
                      border: "1px solid rgba(139,92,246,0.06)",
                    }}
                  >
                    <p className="text-[11px] text-gray-900 leading-relaxed">
                      <span className="font-bold" style={{ color: level.color }}>Agent行为：</span>
                      {level.agentAction}
                    </p>
                    <p className="text-[11px] text-gray-900 mt-1.5 italic leading-relaxed border-l-2 pl-2"
                      style={{ borderColor: level.color + "40" }}>
                      {level.dialogue}
                    </p>
                  </motion.div>
                ) : (
                  <div className="w-full rounded-xl border border-slate-100 bg-white/45 px-3 py-2.5 text-left">
                    <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-slate-400">退出条件</p>
                    <p className="mt-1 text-[11px] leading-relaxed text-slate-500">{level.exitCondition}</p>
                  </div>
                )}

                {isActive && (
                  <motion.span
                    className="text-[9px] px-2 py-0.5 rounded-full font-medium animate-pulse"
                    style={{
                      backgroundColor: level.color + "20",
                      color: level.color,
                      border: "1px solid " + level.color + "30",
                    }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    执行中...
                  </motion.span>
                )}
              </motion.div>

              {idx < CRISIS_LEVELS.length - 1 && (
                <motion.div
                  className="mx-0.5 flex h-[360px] shrink-0 items-center justify-center"
                  animate={{ opacity: isPassed || isActive ? 1 : 0.3 }}
                >
                  <div
                    className="w-8 h-0.5 rounded-full"
                    style={{
                      background: activeLevel && activeLevel > idx
                        ? "linear-gradient(90deg, " + level.color + ", " + CRISIS_LEVELS[idx + 1].color + ")"
                        : "rgba(139,92,246,0.15)",
                    }}
                  />
                  <ArrowRight
                    className="w-3 h-3"
                    style={{
                      color: activeLevel && activeLevel > idx
                        ? CRISIS_LEVELS[idx + 1].color
                        : "#6b7280",
                    }}
                  />
                </motion.div>
              )}
            </div>
          )
        })}
      </div>

      <div className="flex items-center justify-between">
        <motion.button
          onClick={startResponse}
          disabled={running}
          className="px-5 py-2.5 rounded-full text-sm font-bold transition-all"
          style={{
            background: running
              ? "rgba(255,255,255,0.3)"
              : "linear-gradient(135deg, #ef4444, #f97316)",
            color: running ? "#4b5563" : "#ffffff",
            border: running ? "1px solid rgba(0,0,0,0.06)" : "none",
            cursor: running ? "not-allowed" : "pointer",
          }}
          whileHover={!running ? { scale: 1.05, boxShadow: "0 0 20px rgba(239,68,68,0.3)" } : {}}
          whileTap={!running ? { scale: 0.97 } : {}}
        >
          {running ? "危机响应中..." : "启动应急响应"}
        </motion.button>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-[10px] text-gray-900">
            <Shield className="w-3 h-3 text-gray-900" />
            安全Agent独立进程
          </div>
          <span className="text-gray-900">·</span>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-900">
            <AlertTriangle className="w-3 h-3 text-gray-900" />
            所有升级需用户授权
          </div>
        </div>
      </div>
    </div>
  )
}
