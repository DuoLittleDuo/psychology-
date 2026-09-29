import { useEffect, useState, type RefObject } from 'react'

interface Vector2D {
  x: number
  y: number
}

interface MouseVector {
  position: Vector2D
  vector: { dx: number; dy: number }
}

export function useMouseVector(
  containerRef?: RefObject<HTMLElement | null>,
): MouseVector {
  const [position, setPosition] = useState<Vector2D>({ x: 0, y: 0 })
  const [vector, setVector] = useState<{ dx: number; dy: number }>({
    dx: 0,
    dy: 0,
  })

  useEffect(() => {
    let lastPosition = { x: 0, y: 0 }

    const updatePosition = (x: number, y: number) => {
      let newX: number
      let newY: number

      if (containerRef?.current) {
        const rect = containerRef.current.getBoundingClientRect()
        newX = x - rect.left
        newY = y - rect.top
      } else {
        newX = x
        newY = y
      }

      const dx = newX - lastPosition.x
      const dy = newY - lastPosition.y

      setVector({ dx, dy })
      setPosition({ x: newX, y: newY })
      lastPosition = { x: newX, y: newY }
    }

    const handleMouseMove = (ev: MouseEvent) => {
      updatePosition(ev.clientX, ev.clientY)
    }

    const handleTouchMove = (ev: TouchEvent) => {
      const touch = ev.touches[0]
      updatePosition(touch.clientX, touch.clientY)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('touchmove', handleTouchMove)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('touchmove', handleTouchMove)
    }
  }, [containerRef])

  return { position, vector }
}
