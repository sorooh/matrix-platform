/**
 * Theme Toggle Button Component
 * Phase 4: Global Theme Engine
 */

import { useTheme } from '../contexts/ThemeContext'
import { Moon, Sun, Monitor } from 'lucide-react'
import { motion } from 'framer-motion'

export default function ThemeToggle() {
  const { theme, setMode } = useTheme()

  const modes: Array<{ value: 'light' | 'dark' | 'auto'; icon: typeof Moon }> = [
    { value: 'light', icon: Sun },
    { value: 'dark', icon: Moon },
    { value: 'auto', icon: Monitor },
  ]

  const currentIndex = modes.findIndex((m) => m.value === theme.mode)
  const nextMode = modes[(currentIndex + 1) % modes.length]

  const handleClick = () => {
    setMode(nextMode.value)
  }

  const Icon = nextMode.icon

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={handleClick}
      className="p-2 rounded-lg hover:bg-surface transition-colors"
      title={`Switch to ${nextMode.value} mode`}
    >
      <Icon className="w-5 h-5" />
    </motion.button>
  )
}

