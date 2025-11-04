/**
 * Color Picker Component for Custom Theme
 * Phase 4: Global Theme Engine
 */

import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useTheme, ThemeColors } from '../contexts/ThemeContext'
import { Palette } from 'lucide-react'

const colorKeys: Array<keyof ThemeColors> = [
  'primary',
  'accent',
  'background',
  'surface',
  'text',
  'textSecondary',
  'border',
  'success',
  'warning',
  'error',
  'info',
]

export default function ColorPicker() {
  const { t } = useTranslation()
  const { theme, setColors } = useTheme()

  const handleColorChange = (key: keyof ThemeColors, value: string) => {
    setColors({ [key]: value })
  }

  if (theme.preset !== 'custom') {
    return null
  }

  return (
    <div className="space-y-4">
      <h4 className="text-md font-semibold flex items-center gap-2">
        <Palette className="w-4 h-4 text-primary-500" />
        {t('settings.theme.customColors')}
      </h4>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {colorKeys.map((key) => {
          const currentColor = theme.customColors?.[key] || theme.colors[key]
          return (
            <div key={key} className="flex items-center gap-3">
              <label className="text-sm font-medium w-32 capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </label>
              <div className="flex-1 flex items-center gap-2">
                <input
                  type="color"
                  value={currentColor}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="w-12 h-10 rounded border border-border cursor-pointer"
                />
                <input
                  type="text"
                  value={currentColor}
                  onChange={(e) => handleColorChange(key, e.target.value)}
                  className="flex-1 px-3 py-2 bg-surface border border-border rounded text-sm font-mono text-text"
                  placeholder="#000000"
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

