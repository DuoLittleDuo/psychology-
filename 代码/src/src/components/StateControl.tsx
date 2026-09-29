import { useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'

interface Props {
  mood: number
  social: number
  solitude: boolean
  nightMode: boolean
  crisisActive: boolean
  onMoodChange: (value: number) => void
  onSocialChange: (value: number) => void
  onSolitudeToggle: () => void
  onNightToggle: () => void
  onCrisis: () => void
}

function Slider({
  label,
  value,
  tone,
  onChange,
}: {
  label: string
  value: number
  tone: string
  onChange: (value: number) => void
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const valueRef = useRef<HTMLSpanElement>(null)
  const percentage = Math.round(value * 100)

  useGSAP(() => {
    if (trackRef.current) {
      gsap.to(trackRef.current, { width: `${percentage}%`, duration: 0.28, ease: 'power2.out' })
    }
    if (valueRef.current) {
      gsap.fromTo(valueRef.current, { scale: 1.12 }, { scale: 1, duration: 0.22, ease: 'power2.out' })
    }
  }, [value])

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <span className="text-xs font-semibold text-gray-600">{label}</span>
        <span ref={valueRef} className="text-sm font-bold tabular-nums text-gray-950">{value.toFixed(2)}</span>
      </div>
      <div
        className="mt-2 h-2 rounded-full bg-gray-100 cursor-pointer"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect()
          const next = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
          onChange(Math.round(next * 100) / 100)
        }}
      >
        <div ref={trackRef} className={`h-full rounded-full ${tone}`} style={{ width: `${percentage}%` }} />
      </div>
    </div>
  )
}

function Toggle({
  label,
  description,
  active,
  onChange,
}: {
  label: string
  description: string
  active: boolean
  onChange: () => void
}) {
  const knobRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    if (knobRef.current) {
      gsap.to(knobRef.current, { x: active ? 16 : 0, duration: 0.24, ease: 'power2.out' })
    }
  }, [active])

  return (
    <button
      type="button"
      onClick={onChange}
      className={`flex min-h-20 items-center justify-between gap-4 rounded-xl border p-3 text-left transition-colors ${
        active ? 'border-gray-900 bg-gray-50' : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <span>
        <span className="block text-xs font-bold text-gray-900">{label}</span>
        <span className="mt-1 block text-[10px] leading-relaxed text-gray-500">{description}</span>
      </span>
      <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${active ? 'bg-gray-900' : 'bg-gray-300'}`}>
        <div ref={knobRef} className="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-white shadow-sm" />
      </span>
    </button>
  )
}

export default function StateControl({
  mood,
  social,
  solitude,
  nightMode,
  crisisActive,
  onMoodChange,
  onSocialChange,
  onSolitudeToggle,
  onNightToggle,
  onCrisis,
}: Props) {
  const crisisRef = useRef<HTMLButtonElement>(null)

  useGSAP(() => {
    if (!crisisRef.current) return
    if (crisisActive) {
      gsap.to(crisisRef.current, { scale: 1.02, duration: 0.25, yoyo: true, repeat: -1 })
    } else {
      gsap.killTweensOf(crisisRef.current)
      gsap.to(crisisRef.current, { scale: 1, duration: 0.2 })
    }
  }, [crisisActive])

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div>
          <h2 className="text-sm font-bold text-gray-950">状态操控</h2>
          <p className="mt-1 text-[10px] text-gray-400">STATE INPUT</p>
        </div>
        <span className="h-2.5 w-2.5 rounded-full bg-gray-900" />
      </div>

      <div className="mt-4 space-y-5">
        <Slider label="情绪评分" value={mood} tone="bg-emerald-500" onChange={onMoodChange} />
        <Slider label="社交意愿" value={social} tone="bg-sky-500" onChange={onSocialChange} />
      </div>

      <div className="my-4 border-t border-gray-100" />

      <div className="grid gap-3 sm:grid-cols-2">
        <Toggle
          label="独处模式"
          description="降低主动社交推荐"
          active={solitude}
          onChange={onSolitudeToggle}
        />
        <Toggle
          label="夜间免打扰"
          description="仅保留必要的安全提醒"
          active={nightMode}
          onChange={onNightToggle}
        />
      </div>

      <div className="my-4 border-t border-gray-100" />

      <div className="grid gap-3 sm:grid-cols-[1fr_1.3fr]">
        <button
          ref={crisisRef}
          type="button"
          onClick={onCrisis}
          disabled={crisisActive}
          className={`min-h-14 rounded-xl border px-3 text-xs font-bold transition-colors ${
            crisisActive
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-red-200 bg-white text-red-700 hover:bg-red-50'
          }`}
        >
          {crisisActive ? '安全接管中' : '模拟危机事件'}
        </button>

        <div className="grid grid-cols-4 gap-2">
          {[0.82, 0.52, 0.35, 0.15].map((score) => (
            <button
              key={score}
              type="button"
              onClick={() => {
                onMoodChange(score)
                onSocialChange(Math.max(0.1, score - 0.04))
              }}
              className="rounded-lg border border-gray-200 bg-white py-2 text-xs font-semibold tabular-nums text-gray-600 hover:border-gray-400 hover:text-gray-950"
            >
              {score.toFixed(2)}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
