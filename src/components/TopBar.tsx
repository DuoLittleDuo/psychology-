interface Props {
  onScenario?: (id: string) => void
  onStep?: () => void
  snapIdx?: number
  totalSnaps?: number
  overrideLabel?: string
  autoPlay?: boolean
  onAutoPlay?: () => void
  onReset?: () => void
}

export default function TopBar({
  onStep,
  snapIdx,
  totalSnaps,
  autoPlay,
  onAutoPlay,
  onReset,
}: Props) {
  return (
    <header className="shrink-0 border-b border-slate-200 bg-white">
      <div className="flex min-h-16 items-center gap-3 px-4 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-xs font-black text-white">SW</span>
          <div className="min-w-0">
            <h1 className="truncate text-sm font-bold leading-tight text-slate-950">同频</h1>
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] leading-tight text-slate-400">System Overview</p>
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          {onAutoPlay && (
            <button
              type="button"
              onClick={onAutoPlay}
              className={`rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                autoPlay
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-cyan-200 hover:text-cyan-700'
              }`}
            >
              {autoPlay ? '停止推演' : '自动推演'}
            </button>
          )}

          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:border-slate-300 hover:text-slate-950"
            >
              复位
            </button>
          )}

          {onStep && typeof snapIdx === 'number' && typeof totalSnaps === 'number' && (
            <button
              type="button"
              onClick={onStep}
              className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-bold text-sky-700 hover:bg-sky-100"
            >
              下一步 ({snapIdx + 1}/{totalSnaps})
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
