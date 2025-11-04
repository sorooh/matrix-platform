/**
 * Global Theme Engine
 * Phase 4: User Experience & Interaction
 * Global-Ready Architecture
 */

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { motion } from 'framer-motion'

export type ThemeMode = 'light' | 'dark' | 'auto'
export type ThemePreset = 'default' | 'matrix' | 'ocean' | 'forest' | 'sunset' | 'custom'

export interface ThemeColors {
  primary: string
  accent: string
  background: string
  surface: string
  text: string
  textSecondary: string
  border: string
  success: string
  warning: string
  error: string
  info: string
}

export interface ThemeConfig {
  mode: ThemeMode
  preset: ThemePreset
  colors: ThemeColors
  customColors?: Partial<ThemeColors>
}

const defaultThemes: Record<ThemePreset, ThemeColors> = {
  default: {
    primary: '#0ea5e9',
    accent: '#00ff41',
    background: '#0a0a0a',
    surface: '#1a1a1a',
    text: '#ffffff',
    textSecondary: '#9ca3af',
    border: '#374151',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  matrix: {
    primary: '#00ff41',
    accent: '#00ff41',
    background: '#0a0a0a',
    surface: '#1a1a1a',
    text: '#00ff41',
    textSecondary: '#4ade80',
    border: '#22c55e',
    success: '#00ff41',
    warning: '#fbbf24',
    error: '#ef4444',
    info: '#00ff41',
  },
  ocean: {
    primary: '#06b6d4',
    accent: '#22d3ee',
    background: '#0c1222',
    surface: '#1a2332',
    text: '#ffffff',
    textSecondary: '#94a3b8',
    border: '#334155',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#06b6d4',
  },
  forest: {
    primary: '#10b981',
    accent: '#34d399',
    background: '#0f1419',
    surface: '#1a2329',
    text: '#ffffff',
    textSecondary: '#9ca3af',
    border: '#374151',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  sunset: {
    primary: '#f97316',
    accent: '#fb923c',
    background: '#1a0f0f',
    surface: '#2a1f1f',
    text: '#ffffff',
    textSecondary: '#d1d5db',
    border: '#4b5563',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  custom: {
    primary: '#0ea5e9',
    accent: '#00ff41',
    background: '#0a0a0a',
    surface: '#1a1a1a',
    text: '#ffffff',
    textSecondary: '#9ca3af',
    border: '#374151',
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
}

interface ThemeContextType {
  theme: ThemeConfig
  setMode: (mode: ThemeMode) => void
  setPreset: (preset: ThemePreset) => void
  setColors: (colors: Partial<ThemeColors>) => void
  resetTheme: () => void
  applyTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeConfig>(() => {
    const saved = localStorage.getItem('matrix-theme')
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        // Fallback to default
      }
    }
    return {
      mode: 'auto',
      preset: 'default',
      colors: defaultThemes.default,
    }
  })

  // Detect system theme
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'dark'
  }

  // Apply theme to document
  const applyTheme = () => {
    const effectiveMode = theme.mode === 'auto' ? getSystemTheme() : theme.mode
    const colors = theme.customColors ? { ...theme.colors, ...theme.customColors } : theme.colors

    const root = document.documentElement
    root.setAttribute('data-theme', effectiveMode)
    root.setAttribute('data-preset', theme.preset)

    // Apply CSS variables
    root.style.setProperty('--color-primary', colors.primary)
    root.style.setProperty('--color-accent', colors.accent)
    root.style.setProperty('--color-background', colors.background)
    root.style.setProperty('--color-surface', colors.surface)
    root.style.setProperty('--color-text', colors.text)
    root.style.setProperty('--color-text-secondary', colors.textSecondary)
    root.style.setProperty('--color-border', colors.border)
    root.style.setProperty('--color-success', colors.success)
    root.style.setProperty('--color-warning', colors.warning)
    root.style.setProperty('--color-error', colors.error)
    root.style.setProperty('--color-info', colors.info)
  }

  // Save theme to localStorage
  const saveTheme = (newTheme: ThemeConfig) => {
    localStorage.setItem('matrix-theme', JSON.stringify(newTheme))
    setTheme(newTheme)
    applyTheme()
  }

  // Set theme mode
  const setMode = (mode: ThemeMode) => {
    saveTheme({ ...theme, mode })
  }

  // Set theme preset
  const setPreset = (preset: ThemePreset) => {
    const colors = defaultThemes[preset]
    saveTheme({ ...theme, preset, colors, customColors: preset === 'custom' ? theme.customColors : undefined })
  }

  // Set custom colors
  const setColors = (customColors: Partial<ThemeColors>) => {
    saveTheme({
      ...theme,
      preset: 'custom',
      customColors: { ...theme.customColors, ...customColors },
    })
  }

  // Reset theme to default
  const resetTheme = () => {
    const defaultTheme: ThemeConfig = {
      mode: 'auto',
      preset: 'default',
      colors: defaultThemes.default,
    }
    saveTheme(defaultTheme)
  }

  // Apply theme on mount and when theme changes
  useEffect(() => {
    applyTheme()

    // Listen for system theme changes
    if (theme.mode === 'auto' && typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const handleChange = () => applyTheme()
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme])

  // Apply theme on initial load
  useEffect(() => {
    applyTheme()
  }, [])

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setMode,
        setPreset,
        setColors,
        resetTheme,
        applyTheme,
      }}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="theme-transition"
      >
        {children}
      </motion.div>
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

