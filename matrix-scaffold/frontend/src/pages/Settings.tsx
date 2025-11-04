import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Settings as SettingsIcon } from 'lucide-react'
import ThemeSelector from '../components/ThemeSelector'
import ColorPicker from '../components/ColorPicker'

export default function Settings() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold matrix-glow">{t('nav.settings')}</h1>
        <p className="text-text-secondary mt-2">{t('settings.description')}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-matrix-gray rounded-lg p-6 border border-gray-800"
      >
        <div className="flex items-center gap-4 mb-6">
          <SettingsIcon className="w-8 h-8 text-primary-500" />
          <div>
            <h2 className="text-xl font-semibold">{t('settings.title')}</h2>
            <p className="text-text-secondary text-sm">{t('settings.subtitle')}</p>
          </div>
        </div>

        <ThemeSelector />
        <div className="mt-6 pt-6 border-t border-border">
          <ColorPicker />
        </div>
      </motion.div>
    </div>
  )
}

