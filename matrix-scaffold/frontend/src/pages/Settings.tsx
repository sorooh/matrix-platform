import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Settings as SettingsIcon } from 'lucide-react'

export default function Settings() {
  const { t } = useTranslation()

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold matrix-glow">{t('nav.settings')}</h1>
        <p className="text-gray-400 mt-2">Configure your Matrix Platform</p>
      </motion.div>

      <div className="bg-matrix-gray rounded-lg p-6 border border-gray-800">
        <div className="flex items-center gap-4 mb-6">
          <SettingsIcon className="w-8 h-8 text-matrix-green" />
          <div>
            <h2 className="text-xl font-semibold">Settings</h2>
            <p className="text-gray-400 text-sm">Platform configuration</p>
          </div>
        </div>
        <p className="text-gray-400">Settings coming soon...</p>
      </div>
    </div>
  )
}

