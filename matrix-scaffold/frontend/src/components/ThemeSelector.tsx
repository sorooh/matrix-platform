/**
 * Theme Selector Component
 * Phase 4: Global Theme Engine
 */

import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useTheme, ThemeMode, ThemePreset } from '../contexts/ThemeContext'
import { Palette, Moon, Sun, Monitor, RefreshCw } from 'lucide-react'

export default function ThemeSelector() {
  const { t } = useTranslation()
  const { theme, setMode, setPreset, resetTheme } = useTheme()

  const modes: Array<{ value: ThemeMode; label: string; icon: typeof Moon }> = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'auto', label: 'Auto', icon: Monitor },
  ]

  const presets: Array<{ value: ThemePreset; label: string; preview: string }> = [
    { value: 'default', label: 'Default', preview: 'bg-gradient-to-br from-blue-500 to-cyan-500' },
    { value: 'matrix', label: 'Matrix', preview: 'bg-gradient-to-br from-green-500 to-emerald-500' },
    { value: 'ocean', label: 'Ocean', preview: 'bg-gradient-to-br from-cyan-500 to-blue-500' },
    { value: 'forest', label: 'Forest', preview: 'bg-gradient-to-br from-green-500 to-teal-500' },
    { value: 'sunset', label: 'Sunset', preview: 'bg-gradient-to-br from-orange-500 to-red-500' },
    { value: 'custom', label: 'Custom', preview: 'bg-gradient-to-br from-purple-500 to-pink-500' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Palette className="w-5 h-5 text-primary-500" />
          {t('settings.theme.title')}
        </h3>

        {/* Theme Mode */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">{t('settings.theme.mode')}</label>
          <div className="flex gap-3">
            {modes.map((mode) => {
              const Icon = mode.icon
              return (
                <button
                  key={mode.value}
                  onClick={() => setMode(mode.value)}
                  className={`
                    flex-1 flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all
                    ${
                      theme.mode === mode.value
                        ? 'border-primary-500 bg-primary-500/10'
                        : 'border-border hover:border-primary-500/50'
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm">{mode.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Theme Presets */}
        <div className="mb-6">
          <label className="block text-sm font-medium mb-3">{t('settings.theme.preset')}</label>
          <div className="grid grid-cols-3 gap-3">
            {presets.map((preset) => (
              <motion.button
                key={preset.value}
                onClick={() => setPreset(preset.value)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`
                  relative p-4 rounded-lg border-2 transition-all overflow-hidden
                  ${
                    theme.preset === preset.value
                      ? 'border-primary-500 ring-2 ring-primary-500/50'
                      : 'border-border hover:border-primary-500/50'
                  }
                `}
              >
                <div className={`absolute inset-0 ${preset.preview} opacity-20`} />
                <div className="relative z-10">
                  <div className={`w-12 h-12 rounded-lg mx-auto mb-2 ${preset.preview}`} />
                  <span className="text-sm font-medium">{preset.label}</span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Reset Button */}
        <button
          onClick={resetTheme}
          className="flex items-center gap-2 px-4 py-2 text-sm text-text-secondary hover:text-text transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          {t('settings.theme.reset')}
        </button>
      </div>
    </div>
  )
}

