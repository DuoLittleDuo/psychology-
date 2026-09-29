import { useState } from 'react'
import { motion } from 'framer-motion'

interface MemoryItem {
  id: string
  content: string
  layer: 'instant' | 'short_term' | 'long_term'
  relevance: number
  lastUsed: string
}

interface Props {
  memories: MemoryItem[]
  activeQuadrant?: number
}

const layerConfig = {
  instant: {
    label: '瞬时记忆',
    subtitle: '当前对话 / 4h',
    marker: 'bg-emerald-500',
    panel: 'border-emerald-100 bg-emerald-50/70',
  },
  short_term: {
    label: '短期记忆',
    subtitle: '近 7 天摘要',
    marker: 'bg-sky-500',
    panel: 'border-sky-100 bg-sky-50/70',
  },
  long_term: {
    label: '长期记忆',
    subtitle: '人格与稳定偏好',
    marker: 'bg-violet-500',
    panel: 'border-violet-100 bg-violet-50/70',
  },
}

export default function MemoryLayerVisualization({ memories, activeQuadrant }: Props) {
  const [activeLayer, setActiveLayer] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const layers = [
    { key: 'long_term' as const, items: memories.filter((memory) => memory.layer === 'long_term') },
    { key: 'short_term' as const, items: memories.filter((memory) => memory.layer === 'short_term') },
    { key: 'instant' as const, items: memories.filter((memory) => memory.layer === 'instant') },
  ]

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.16em] text-gray-400">MEMORY LAYERS</p>
          <h3 className="mt-1 text-sm font-bold text-gray-950">三层记忆</h3>
        </div>
        <span className="text-[10px] font-semibold text-gray-400">晋级 / 衰减</span>
      </div>

      <div className="mt-3 space-y-3">
        {layers.map(({ key, items }) => {
          const config = layerConfig[key]
          const active = activeLayer === key

          return (
            <div
              key={key}
              className={`cursor-pointer overflow-hidden rounded-xl border transition-colors ${config.panel}`}
              onClick={() => setActiveLayer(active ? null : key)}
            >
              <div className="flex items-center justify-between gap-3 px-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${config.marker}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-900">{config.label}</p>
                    <p className="mt-0.5 text-[10px] text-gray-500">{config.subtitle}</p>
                  </div>
                </div>
                <span className="text-xs font-bold tabular-nums text-gray-500">{items.length} 条</span>
              </div>

              {active && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="border-t border-white/80 px-3 pb-3 pt-2"
                >
                  <div className="space-y-2">
                    {items.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          setExpandedId(expandedId === item.id ? null : item.id)
                        }}
                        className="w-full rounded-lg border border-white bg-white/80 p-3 text-left"
                      >
                        <p className="text-xs leading-relaxed text-gray-700">{item.content}</p>
                        <div className="mt-2 flex items-center justify-between text-[10px] text-gray-400">
                          <span>{(item.relevance * 100).toFixed(0)}% 相关</span>
                          <span>{item.lastUsed}</span>
                        </div>
                        {expandedId === item.id && (
                          <p className="mt-2 border-t border-gray-100 pt-2 text-[10px] leading-relaxed text-gray-500">
                            用于当前决策：
                            {activeQuadrant && activeQuadrant <= 3
                              ? '情绪干预策略选择'
                              : activeQuadrant && activeQuadrant >= 7
                                ? '静默观察确认'
                                : '社交匹配参数调整'}
                          </p>
                        )}
                      </button>
                    ))}
                    {items.length === 0 && <p className="py-2 text-center text-[10px] text-gray-400">暂无此层记忆</p>}
                  </div>
                </motion.div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-gray-100 pt-3 text-[10px] text-gray-400">
        <span>晋级：重复出现 3 次以上</span>
        <span className="text-right">衰减：长期未使用后归档</span>
      </div>
    </section>
  )
}
