import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { Watch, Smartphone, Monitor, ArrowRight, Heart, Zap, Wifi, Activity, Shield, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'

interface CardData {
  type: 'mood_card' | 'buddy_card' | 'crisis_card'
  title: string; subtitle: string; body: string; actionLabel: string
}

interface Props {
  cardData: CardData; crisisActive: boolean; mood: number; social: number
}

const cardStyles: Record<string, string> = {
  mood_card: 'from-amber-200/60 to-amber-100/40 border-amber-300/40',
  buddy_card: 'from-blue-200/60 to-blue-100/40 border-blue-300/40',
  crisis_card: 'from-red-200/60 to-red-100/40 border-red-300/40',
}

function cleanTitle(t: string): string {
  return t.replace(/[^\w\s\u4e00-\u9fff]/g, '').trim()
}

export default function DeviceMocks({ cardData, crisisActive, mood, social }: Props) {
  const watchRef = useRef<HTMLDivElement>(null)
  const phoneRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (watchRef.current) {
      const heart = watchRef.current.querySelector('.heart-icon')
      if (heart) {
        const scale = crisisActive ? 1.3 : mood < 0.4 ? 1.15 : 1.08
        const speed = crisisActive ? 0.6 : mood < 0.4 ? 0.9 : 1.5
        gsap.killTweensOf(heart)
        gsap.to(heart, { scale, duration: speed, yoyo: true, repeat: -1, ease: 'sine.inOut' })
      }
    }
  }, [crisisActive, mood])

  useGSAP(() => {
    if (cardRef.current) {
      gsap.fromTo(cardRef.current, { y: 16, opacity: 0, scale: 0.95 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'back.out(1.2)' })
    }
    if (crisisActive && phoneRef.current) {
      gsap.to(phoneRef.current, { x: -3, duration: 0.08, repeat: 5, yoyo: true, ease: 'none' })
    }
  }, [cardData, crisisActive])

  return (
    <div className="space-y-3">
      {/* Watch */}
      <div ref={watchRef} className="p-3 rounded-xl bg-white/55 backdrop-blur-md border border-purple-100/30">
        <h2 className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-3 flex items-center gap-1.5">
          <Watch className="w-3.5 h-3.5 text-violet-500" /> 手表
        </h2>
        <div className="flex justify-center">
          <div className="w-36 h-40 rounded-[2rem] bg-gray-200 border-[3px] border-gray-300 p-2 flex flex-col items-center justify-center relative shadow-sm">
            <div className="absolute -top-2 w-6 h-3 rounded-t-full bg-gray-300" />
            <div className="absolute -bottom-2 w-6 h-3 rounded-b-full bg-gray-300" />
            <div className={`w-full h-full rounded-2xl flex flex-col items-center justify-center gap-0.5 p-1.5 text-center transition-colors duration-300 ${
              crisisActive ? 'bg-red-100/70 border border-red-300/50' : 'bg-white/70'
            }`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${crisisActive ? 'bg-red-500/20' : 'bg-violet-100'}`}>
                <Heart className={`heart-icon w-3 h-3 ${crisisActive ? 'text-red-400' : 'text-violet-500'}`} />
              </div>
              <p className={`text-[7px] font-bold leading-tight ${crisisActive ? 'text-red-600' : 'text-gray-900'}`}>
                {crisisActive ? '我在这里' : cleanTitle(cardData.title)}
              </p>
              <p className="text-[6px] text-gray-900 leading-tight">{crisisActive ? '不用说话' : cardData.subtitle}</p>
              {crisisActive && <span className="text-[6px] text-red-700 mt-0.5 animate-pulse">震动提醒</span>}
              <div className="flex items-center gap-1 mt-0.5">
                <Activity className={`heart-icon w-2.5 h-2.5 ${crisisActive ? 'text-red-600' : 'text-violet-400'}`} />
                <span className={`text-[6px] font-mono ${mood < 0.4 ? 'text-red-700' : 'text-emerald-600'}`}>
                  {mood < 0.4 ? '心率' + String.fromCharCode(0x2191) : mood > 0.6 ? '心率' + String.fromCharCode(0x2193) : '心率'} {Math.round(60 + (1 - mood) * 25)}bpm
                </span>
              </div>
            </div>
          </div>
        </div>
        <p className="text-center text-[8px] text-purple-600/50 mt-1.5">触觉反馈 · 抬腕查看</p>
      </div>

      {/* Flow arrow */}
      <div className="flex justify-center">
        <motion.div className="flex items-center gap-1 text-purple-300"
          animate={{ y: [0, 3, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}>
          <Wifi className="w-3 h-3" />
          <ArrowRight className="w-3 h-3" />
        </motion.div>
      </div>

      {/* Phone */}
      <div ref={phoneRef} className="p-3 rounded-xl bg-white/55 backdrop-blur-md border border-purple-100/30">
        <h2 className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-3 flex items-center gap-1.5">
          <Smartphone className="w-3.5 h-3.5 text-violet-500" /> 手机 · 原子化服务卡片
        </h2>
        <div className="flex justify-center">
          <div className="w-full max-w-[240px]">
            <div className="bg-white/70 rounded-2xl border-2 border-gray-600 p-2.5 space-y-2 shadow-sm">
              <div className="flex justify-between text-[7px] text-gray-900 px-1 items-center">
                <span>9:41</span>
                <div className="flex items-center gap-1">
                  <Wifi className="w-2.5 h-2.5 text-gray-600" />
                  <span>85%</span>
                </div>
              </div>
              <div className="text-[8px] text-gray-900 px-1">负一屏 · 右滑查看</div>
              <div ref={cardRef} className={`rounded-xl p-2.5 border bg-gradient-to-br ${cardStyles[cardData.type] || cardStyles.mood_card} ${crisisActive ? 'animate-pulse' : ''}`}>
                <div className="flex items-start justify-between mb-1">
                  <Heart className="w-4 h-4 text-red-400" />
                  <span className="text-[7px] px-1.5 py-0.5 rounded-full bg-white/40 text-purple-700 font-medium">
                    {crisisActive ? '紧急' : '服务'}
                  </span>
                </div>
                <h3 className="text-[11px] font-bold text-gray-900 mb-0.5">{cleanTitle(cardData.title)}</h3>
                <p className="text-[8px] text-gray-900 mb-1.5">{cardData.subtitle}</p>
                <div className="text-[7px] text-gray-900 whitespace-pre-line leading-relaxed mb-2 bg-white/50 rounded-lg p-1.5">
                  {cardData.body}
                </div>
                <button className={`w-full py-1.5 rounded-lg text-[8px] font-bold transition-colors ${
                  crisisActive ? 'bg-red-600/30 border border-red-500 text-red-600' : 'bg-white/20 border border-white/30 text-purple-700 hover:bg-white/30'
                }`}>{cardData.actionLabel}</button>
              </div>
              <div className="flex justify-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
              </div>
            </div>
            <div className="mt-1 text-center text-[8px] text-purple-600/50">免下载 · 1 秒触达 · 端侧智能</div>
          </div>
        </div>
      </div>

      {/* Flow arrow */}
      <div className="flex justify-center">
        <motion.div className="flex items-center gap-1 text-purple-300"
          animate={{ y: [0, 3, 0] }} transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}>
          <Wifi className="w-3 h-3" />
          <ArrowRight className="w-3 h-3" />
        </motion.div>
      </div>

      {/* Desktop */}
      <div className="p-3 rounded-xl bg-white/55 backdrop-blur-md border border-purple-100/30">
        <h2 className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-3 flex items-center gap-1.5">
          <Monitor className="w-3.5 h-3.5 text-violet-500" /> 桌面端 · 情绪周报
        </h2>
        <div className="flex justify-center">
          <div className="w-full max-w-[240px]">
            <div className="bg-gray-200 rounded-t-xl p-2 flex items-center justify-center shadow-sm">
              <div className="w-full h-20 rounded-lg bg-white/70 flex items-center justify-center p-3">
                <div className="flex items-center gap-3 w-full">
                  <div className="w-10 h-10 rounded-lg bg-violet-100 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-5 h-5 text-violet-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold text-gray-900 truncate">情绪周报</p>
                    <p className="text-[7px] text-gray-900">情绪趋势 · 3 次干预</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-300 rounded-b-lg h-3 flex items-center justify-center">
              <div className="w-16 h-1 rounded-full bg-gray-400" />
            </div>
            <div className="bg-gray-300 h-1.5 mx-auto w-12 rounded-b-sm" />
            <p className="mt-1.5 text-center text-[8px] text-purple-600/50">大屏 · 数据可视化</p>
          </div>
        </div>
      </div>

      {/* Live Stats */}
      <div className="p-3 rounded-xl bg-white/55 backdrop-blur-md border border-purple-100/30">
        <h2 className="text-xs font-bold uppercase tracking-wider text-purple-700 mb-2 flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-amber-500" /> 实时数据
        </h2>
        <div className="space-y-1 text-[10px] font-mono">
          {[
            { l:'情绪', v:mood.toFixed(2), c:mood<0.4?'text-red-700':mood>0.6?'text-emerald-600':'text-amber-600' },
            { l:'社交', v:social.toFixed(2), c:social<0.4?'text-red-700':social>0.6?'text-blue-600':'text-amber-600' },
            { l:'安全', v:crisisActive?'接管':'在线', c:crisisActive?'text-red-700':'text-emerald-600' },
            { l:'推送', v:`${Math.floor(Math.random()*4)}/5`, c:'text-gray-900' },
            { l:'存储', v:'2.3MB / 50MB', c:'text-gray-900' },
          ].map((r, i) => (
            <div key={i} className="flex justify-between py-0.5 border-b border-purple-100/30 last:border-0">
              <span className="text-gray-700">{r.l}</span>
              <span className={r.c}>{r.v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer tag */}
      <div className="flex items-center justify-center gap-2 py-1.5 px-3 rounded-lg bg-violet-50/60 border border-purple-100/30">
        <Shield className="w-3 h-3 text-violet-400" />
        <span className="text-[9px] font-medium text-purple-600/70">HarmonyOS 分布式 · 意图流转</span>
      </div>
    </div>
  )
}
