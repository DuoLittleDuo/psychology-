import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { GRID_MATRIX, MoodTier, SocialWillingnessTier } from '../engine/GodModeBridge'
import type { DashboardState } from '../engine/GodModeBridge'

interface Props {
  dashboard: DashboardState
  moodTier: MoodTier
  socialTier: SocialWillingnessTier
  crisisActive: boolean
}

const quadrantLabels: Record<string, string> = {
  high_low: '不打扰',
  high_medium: '活动推荐',
  high_high: '深度匹配',
  medium_low: '轻关怀',
  medium_medium: '正常运营',
  medium_high: '深度社交',
  low_low: '危机关怀',
  low_medium: '情绪对话',
  low_high: '谨慎社交',
}

export default function DecisionPanel({ dashboard, moodTier, socialTier, crisisActive }: Props) {
  const gridRef = useRef<HTMLDivElement>(null)
  const memoryRef = useRef<HTMLDivElement>(null)
  const l2Ref = useRef<HTMLDivElement>(null)

  const rows = [MoodTier.HIGH, MoodTier.MEDIUM, MoodTier.LOW]
  const columns = [SocialWillingnessTier.LOW, SocialWillingnessTier.MEDIUM, SocialWillingnessTier.HIGH]
  const rowLabels: Record<string, string> = { high: '情绪高', medium: '情绪中', low: '情绪低' }
  const columnLabels: Record<string, string> = { low: '社交低', medium: '社交中', high: '社交高' }
  const quadrantNumber = dashboard.quadrantNumber
  const activeTone = quadrantNumber <= 3
    ? 'border-red-200 bg-red-50'
    : quadrantNumber <= 6
      ? 'border-amber-200 bg-amber-50'
      : 'border-emerald-200 bg-emerald-50'

  useGSAP(() => {
    const cells = gridRef.current?.querySelectorAll('.grid-cell')
    if (cells) {
      gsap.fromTo(cells, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.32, stagger: 0.025, ease: 'power2.out' })
    }
  }, [gridRef])

  useGSAP(() => {
    const cards = memoryRef.current?.querySelectorAll('.memory-card')
    if (cards) {
      gsap.fromTo(cards, { opacity: 0, y: 5 }, { opacity: 1, y: 0, duration: 0.28, stagger: 0.04, ease: 'power2.out' })
    }
  }, [dashboard.recalledMemories, memoryRef])

  useEffect(() => {
    const activeNode = l2Ref.current?.querySelector('.l2-active')
    if (activeNode) {
      gsap.fromTo(activeNode, { opacity: 0.5 }, { opacity: 1, duration: 0.35 })
    }
  }, [dashboard.l2TaskChain?.progress])

  return (
    <div className="space-y-3">
      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-2 border-b border-gray-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-[0.16em] text-gray-400">L1 DECISION GRID</p>
            <h3 className="mt-1 text-sm font-bold text-gray-950">九宫格决策矩阵</h3>
          </div>
          <div className="flex gap-4 text-xs tabular-nums">
            <span className="text-gray-500">情绪 <strong className="text-gray-950">{dashboard.moodScore.toFixed(2)}</strong></span>
            <span className="text-gray-500">社交 <strong className="text-gray-950">{dashboard.socialScore.toFixed(2)}</strong></span>
          </div>
        </div>

        <div ref={gridRef} className="mt-4 grid grid-cols-4 gap-2">
          <div />
          {columns.map((column) => (
            <div key={column} className="pb-1 text-center text-[10px] font-semibold text-gray-400">{columnLabels[column]}</div>
          ))}

          {rows.map((row) => (
            <div key={row} className="contents">
              <div className="flex items-center justify-end pr-2 text-[10px] font-semibold text-gray-400">{rowLabels[row]}</div>
              {columns.map((column) => {
                const cell = GRID_MATRIX[row][column]
                const active = row === moodTier && column === socialTier

                return (
                  <div
                    key={cell.quadrant}
                    className={`grid-cell flex min-h-[64px] flex-col items-center justify-center rounded-lg border px-2 text-center transition-all ${
                      active
                        ? `${activeTone} border-2 shadow-sm`
                        : 'border-gray-100 bg-gray-50/70'
                    } ${crisisActive && active ? 'ring-2 ring-red-200' : ''}`}
                  >
                    <span className={`text-xs font-bold ${active ? 'text-gray-950' : 'text-gray-500'}`}>
                      {cell.quadrantNumber}
                    </span>
                    <span className={`mt-1 text-[10px] font-semibold ${active ? 'text-gray-800' : 'text-gray-400'}`}>
                      {quadrantLabels[cell.quadrant] ?? cell.quadrant}
                    </span>
                  </div>
                )
              })}
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-gray-100 bg-gray-50/70 p-3">
            <p className="text-[10px] font-bold tracking-wider text-gray-400">当前象限</p>
            <p className="mt-1 text-sm font-bold text-gray-950">#{dashboard.quadrantNumber} {dashboard.quadrantDescription}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50/70 p-3">
            <p className="text-[10px] font-bold tracking-wider text-gray-400">主要动作</p>
            <p className="mt-1 text-sm font-bold text-gray-950">{dashboard.primaryAction}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <section ref={memoryRef} className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="border-b border-gray-100 pb-3">
            <p className="text-[10px] font-bold tracking-[0.16em] text-gray-400">MEMORY RECALL</p>
            <h3 className="mt-1 text-sm font-bold text-gray-950">记忆召回</h3>
          </div>
          <div className="mt-3 space-y-2">
            {dashboard.recalledMemories.map((memory) => (
              <div key={memory.id} className="memory-card rounded-lg border border-gray-100 bg-gray-50/70 p-3">
                <p className="text-xs leading-relaxed text-gray-700">{memory.content}</p>
                <div className="mt-2 flex items-center justify-between text-[10px]">
                  <span className="font-semibold text-gray-500">{memory.source}</span>
                  <span className="tabular-nums text-gray-400">{(memory.relevance * 100).toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section ref={l2Ref} className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="border-b border-gray-100 pb-3">
            <p className="text-[10px] font-bold tracking-[0.16em] text-gray-400">L2 PLANNING</p>
            <h3 className="mt-1 text-sm font-bold text-gray-950">深度规划</h3>
          </div>
          {dashboard.l2TaskChain ? (
            <div className="mt-3">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-gray-800">{dashboard.l2TaskChain.name}</span>
                <span className="rounded-full bg-sky-50 px-2 py-1 font-bold text-sky-700">{dashboard.l2TaskChain.progress}</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-sky-500"
                  style={{
                    width: `${dashboard.l2TaskChain.nodes.filter((node) => node.status !== 'pending').length / dashboard.l2TaskChain.nodes.length * 100}%`,
                  }}
                />
              </div>
              <div className="mt-3 space-y-2">
                {dashboard.l2TaskChain.nodes.map((node) => (
                  <div
                    key={node.name}
                    className={`l2-node flex items-center justify-between rounded-lg border px-3 py-2 text-xs ${
                      node.status === 'active'
                        ? 'l2-active border-sky-200 bg-sky-50 text-sky-800'
                        : node.status === 'done'
                          ? 'border-emerald-100 bg-emerald-50 text-emerald-700'
                          : 'border-gray-100 bg-gray-50 text-gray-400'
                    }`}
                  >
                    <span className="font-semibold">{node.name}</span>
                    <span className="text-[10px] font-bold">{node.status === 'done' ? '完成' : node.status === 'active' ? '进行中' : '等待'}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-gray-200 py-10 text-center text-xs text-gray-400">
              当前状态未触发 L2
            </div>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <p className="text-[10px] font-bold tracking-[0.16em] text-gray-400">EVENT LOG</p>
            <h3 className="mt-1 text-sm font-bold text-gray-950">事件日志</h3>
          </div>
          <span className="text-xs tabular-nums text-gray-400">{dashboard.events.length} 条</span>
        </div>
        <div className="mt-3 space-y-1.5">
          {dashboard.events.slice(0, 12).map((event, index) => (
            <div key={`${event.time}-${index}`} className="grid grid-cols-[58px_72px_1fr] gap-2 rounded-lg bg-gray-50/70 px-3 py-2 text-[10px]">
              <span className="tabular-nums text-gray-400">{event.time}</span>
              <span className="font-semibold text-gray-500">[{event.type}]</span>
              <span className="break-words text-gray-700">{event.description}</span>
            </div>
          ))}
          {dashboard.events.length === 0 && <p className="py-6 text-center text-xs text-gray-400">暂无事件</p>}
        </div>
      </section>
    </div>
  )
}
