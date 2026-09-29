import { Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { LetterSwapPingPong } from './LetterSwap'

const NAV_ITEMS = [
  { path: '/', label: '首页', icon: '🏠' },
  { path: '/godmode', label: '上帝模式', icon: '🎯' },
  { path: '/architecture', label: 'Agent架构', icon: '🏗️' },
  { path: '/cross-device', label: '跨端流转', icon: '📱' },
  { path: '/crisis', label: '安全响应', icon: '🛡️' },
  { path: '/sidebar-demo', label: '侧边栏', icon: '📋' },
]

export default function Navbar() {
  const location = useLocation()
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <header className="sticky top-0 z-50 h-14 bg-surface-800/90 backdrop-blur-md border-b border-border-subtle flex items-center px-5 gap-4 shrink-0">
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5 mr-2 group">
        <motion.span
          className="text-xl"
          whileHover={{ rotate: [0, -10, 10, -10, 0], transition: { duration: 0.5 } }}
        >
          🌊
        </motion.span>
        <div className="leading-tight">
          <span className="text-sm font-bold text-white">
            <LetterSwapPingPong
              label="同频"
              staggerDuration={0.05}
              transition={{ type: 'spring', duration: 0.5 }}
            />
          </span>
          <p className="text-[9px] text-gray-900">Same Wavelength</p>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex items-center gap-1 ml-4">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path
          return (
            <Link
              key={item.path}
              to={item.path}
              onMouseEnter={() => setHovered(item.path)}
              onMouseLeave={() => setHovered(null)}
              className={`relative px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                isActive
                  ? 'bg-accent-blue/15 text-accent-blue border border-accent-blue/30'
                  : 'text-gray-900 hover:text-gray-200 hover:bg-surface-700/50'
              }`}
            >
              <span className="text-sm">{item.icon}</span>
              <span className="hidden md:inline">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="navbar-active"
                  className="absolute inset-0 rounded-lg bg-accent-blue/10 border border-accent-blue/20"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
              {hovered === item.path && !isActive && (
                <motion.div
                  layoutId="navbar-hover"
                  className="absolute inset-0 rounded-lg bg-white/5"
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
          )
        })}
      </nav>

      <div className="flex-1" />

      {/* Tagline */}
      <span className="hidden lg:block text-[10px] text-gray-900 tracking-wide">
        Agent 自主感知 · 自主规划 · 自主进化
      </span>
    </header>
  )
}
