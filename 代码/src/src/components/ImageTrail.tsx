import {
  Children,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type RefObject,
} from 'react'
import { motion, useAnimate, useAnimationFrame } from 'framer-motion'
import { useMouseVector } from '../hooks/useMouseVector'

// ============================================================
// 鼠标拖尾效果 — 粒子跟随光标，营造 Agent 数据流动感
// 适配深色主题，默认使用彩色光点作为拖尾粒子
// ============================================================

interface TrailItemData {
  id: string
  x: number
  y: number
  rotation: number
  child: ReactNode
  animationSequence: Array<
    [Record<string, number>, { duration: number; ease: string }]
  >
}

interface Props {
  children: ReactNode
  newOnTop?: boolean
  rotationRange?: number
  containerRef?: RefObject<HTMLElement | null>
  animationSequence?: Array<
    [Record<string, number>, { duration: number; ease: string }]
  >
  interval?: number
}

export default function ImageTrail({
  children,
  newOnTop = true,
  rotationRange = 15,
  containerRef,
  animationSequence = [
    [{ scale: 1.3 }, { duration: 0.15, ease: 'circOut' }],
    [{ scale: 0, opacity: 0 }, { duration: 0.6, ease: 'circIn' }],
  ],
  interval = 80,
}: Props) {
  const trailRef = useRef<TrailItemData[]>([])
  const lastAddedTimeRef = useRef(0)
  const { position: mousePosition } = useMouseVector(containerRef)
  const lastMousePosRef = useRef(mousePosition)
  const currentIndexRef = useRef(0)
  const idCounterRef = useRef(0)

  const childrenArray = useMemo(() => Children.toArray(children), [children])

  const addToTrail = useCallback(
    (mousePos: { x: number; y: number }) => {
      const newItem: TrailItemData = {
        id: `trail-${idCounterRef.current++}`,
        x: mousePos.x,
        y: mousePos.y,
        rotation: (Math.random() - 0.5) * rotationRange * 2,
        child: childrenArray[currentIndexRef.current],
        animationSequence,
      }

      currentIndexRef.current =
        (currentIndexRef.current + 1) % childrenArray.length

      if (newOnTop) {
        trailRef.current.push(newItem)
      } else {
        trailRef.current.unshift(newItem)
      }
    },
    [childrenArray, rotationRange, newOnTop],
  )

  const removeFromTrail = useCallback((itemId: string) => {
    const index = trailRef.current.findIndex((item) => item.id === itemId)
    if (index !== -1) {
      trailRef.current.splice(index, 1)
    }
  }, [])

  useAnimationFrame((time) => {
    if (
      lastMousePosRef.current.x === mousePosition.x &&
      lastMousePosRef.current.y === mousePosition.y
    ) {
      return
    }
    lastMousePosRef.current = mousePosition

    if (time - lastAddedTimeRef.current < interval) {
      return
    }

    lastAddedTimeRef.current = time
    addToTrail(mousePosition)
  })

  return (
    <div className="relative w-full h-full pointer-events-none">
      {trailRef.current.map((item) => (
        <TrailItem key={item.id} item={item} onComplete={removeFromTrail} />
      ))}
    </div>
  )
}

// ---- 单个拖尾粒子 ----

function TrailItem({
  item,
  onComplete,
}: {
  item: TrailItemData
  onComplete: (id: string) => void
}) {
  const [scope, animate] = useAnimate()

  useEffect(() => {
    const sequence = item.animationSequence
      ? item.animationSequence.map(
          (segment: [Record<string, number>, { duration: number; ease: string }]) => [
            scope.current,
            ...segment,
          ],
        )
      : [
          [scope.current, { scale: 1.3 }, { duration: 0.15, ease: 'circOut' }],
          [
            scope.current,
            { scale: 0, opacity: 0 },
            { duration: 0.6, ease: 'circIn' },
          ],
        ]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    animate(sequence as any).then(() => {
      onComplete(item.id)
    })
    // We only want this to run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <motion.div
      ref={scope}
      className="absolute"
      style={{
        left: item.x,
        top: item.y,
        rotate: item.rotation,
      }}
    >
      {item.child}
    </motion.div>
  )
}

// ============================================================
// 预置的 Agent 主题拖尾粒子 — 彩色光点
// 用法：直接传入 ImageTrail 作为 children
// ============================================================

export function AgentTrailParticles() {
  const particles = [
    { color: '#4da6ff', size: 8, blur: 4 },   // accent-blue
    { color: '#b44dff', size: 6, blur: 3 },   // accent-purple
    { color: '#4dff88', size: 7, blur: 4 },   // accent-green
    { color: '#ffcc4d', size: 5, blur: 3 },   // accent-yellow
    { color: '#4da6ff', size: 4, blur: 2 },   // accent-blue (small)
    { color: '#ff8c42', size: 6, blur: 3 },   // accent-orange
  ]

  return particles.map((p, i) => (
    <div
      key={i}
      className="rounded-full"
      style={{
        width: p.size,
        height: p.size,
        backgroundColor: p.color,
        boxShadow: `0 0 ${p.blur * 2}px ${p.color}80, 0 0 ${p.blur * 4}px ${p.color}30`,
        opacity: 0.7,
      }}
    />
  ))
}
