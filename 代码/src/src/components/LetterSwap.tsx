import { useState, useRef, useCallback } from 'react'
import { motion, stagger, useAnimate } from 'framer-motion'

// ============================================================
// 文字翻转动画组件
// 移植自 portfolio 模板，改为 TypeScript + 自实现 debounce
// ============================================================

// ---- 简易 debounce（避免引入 lodash） ----

function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number,
  options: { leading?: boolean; trailing?: boolean } = {},
): T {
  let timer: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null

  const { leading = true, trailing = true } = options

  const invoke = (args: Parameters<T>) => {
    fn(...args)
    lastArgs = null
  }

  const result = ((...args: Parameters<T>) => {
    if (leading && !timer) {
      invoke(args)
    } else {
      lastArgs = args
    }

    if (timer) clearTimeout(timer)

    timer = setTimeout(() => {
      timer = null
      if (trailing && lastArgs) {
        invoke(lastArgs)
      }
    }, delay)
  }) as T

  return result
}

// ============================================================
// LetterSwapForward — hover 时字母逐个向下翻转
// ============================================================

interface LetterSwapProps {
  label: string
  reverse?: boolean
  transition?: Record<string, unknown>
  staggerDuration?: number
  staggerFrom?: 'first' | 'last' | 'center'
  className?: string
  onClick?: () => void
  style?: React.CSSProperties
}

export function LetterSwapForward({
  label,
  reverse = true,
  transition = { type: 'spring', duration: 0.7 },
  staggerDuration = 0.03,
  staggerFrom = 'first',
  className,
  onClick,
}: LetterSwapProps) {
  const [scope, animate] = useAnimate()
  const [blocked, setBlocked] = useState(false)
  const blockedRef = useRef(false)

  const hoverStart = useCallback(() => {
    if (blockedRef.current) return
    blockedRef.current = true
    setBlocked(true)

    const mergeTransition = (baseTransition: Record<string, unknown>) => ({
      ...baseTransition,
      delay: stagger(staggerDuration, { from: staggerFrom }),
    })

    animate(
      '.letter',
      { y: reverse ? '100%' : '-100%' },
      mergeTransition(transition),
    ).then(() => {
      animate('.letter', { y: 0 }, { duration: 0 }).then(() => {
        blockedRef.current = false
        setBlocked(false)
      })
    })

    animate(
      '.letter-secondary',
      { top: '0%' },
      mergeTransition(transition),
    ).then(() => {
      animate('.letter-secondary', {
        top: reverse ? '-100%' : '100%',
      }, { duration: 0 })
    })
  }, [animate, reverse, staggerDuration, staggerFrom, transition])

  return (
    <span
      className={`flex justify-center items-center relative overflow-hidden ${className ?? ''}`}
      onMouseEnter={hoverStart}
      onClick={onClick}
      ref={scope}
    >
      <span className="sr-only">{label}</span>
      {label.split('').map((letter, i) => (
        <span className="whitespace-pre relative flex" key={i}>
          <motion.span className="relative letter" style={{ top: 0 }}>
            {letter}
          </motion.span>
          <motion.span
            className="absolute letter-secondary"
            aria-hidden
            style={{ top: reverse ? '-100%' : '100%' }}
          >
            {letter}
          </motion.span>
        </span>
      ))}
    </span>
  )
}

// ============================================================
// LetterSwapPingPong — hover 时翻转，移开后自动翻回
// ============================================================

export function LetterSwapPingPong({
  label,
  reverse = true,
  transition = { type: 'spring', duration: 0.7 },
  staggerDuration = 0.03,
  staggerFrom = 'first',
  className,
  onClick,
}: LetterSwapProps) {
  const [scope, animate] = useAnimate()
  const isHoveredRef = useRef(false)

  const mergeTransition = (baseTransition: Record<string, unknown>) => ({
    ...baseTransition,
    delay: stagger(staggerDuration, { from: staggerFrom }),
  })

  const hoverStart = useCallback(
    debounce(
      () => {
        if (isHoveredRef.current) return
        isHoveredRef.current = true

        animate(
          '.letter',
          { y: reverse ? '100%' : '-100%' },
          mergeTransition(transition),
        )
        animate(
          '.letter-secondary',
          { top: '0%' },
          mergeTransition(transition),
        )
      },
      100,
      { leading: true, trailing: true },
    ),
    [animate, reverse, staggerDuration, staggerFrom, transition],
  )

  const hoverEnd = useCallback(
    debounce(
      () => {
        isHoveredRef.current = false
        animate('.letter', { y: 0 }, mergeTransition(transition))
        animate(
          '.letter-secondary',
          { top: reverse ? '-100%' : '100%' },
          mergeTransition(transition),
        )
      },
      100,
      { leading: true, trailing: true },
    ),
    [animate, reverse, staggerDuration, staggerFrom, transition],
  )

  return (
    <motion.span
      className={`flex justify-center items-center relative overflow-hidden w-full h-full ${className ?? ''}`}
      onHoverStart={hoverStart}
      onHoverEnd={hoverEnd}
      onClick={onClick}
      ref={scope}
    >
      <span className="sr-only">{label}</span>
      {label.split('').map((letter, i) => (
        <span className="whitespace-pre relative flex" key={i}>
          <motion.span className="relative letter" style={{ top: 0 }}>
            {letter}
          </motion.span>
          <motion.span
            className="absolute letter-secondary"
            aria-hidden
            style={{ top: reverse ? '-100%' : '100%' }}
          >
            {letter}
          </motion.span>
        </span>
      ))}
    </motion.span>
  )
}
