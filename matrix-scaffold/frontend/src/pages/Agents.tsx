import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useQuery } from 'react-query'
import { api } from '../lib/api'
import { Bot } from 'lucide-react'

export default function Agents() {
  const { t } = useTranslation()

  const { data: stats } = useQuery('orchestration-stats', () =>
    api.get('/orchestration/stats').then((res) => res.data.stats)
  )

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold matrix-glow">{t('agents.title')}</h1>
        <p className="text-text-secondary mt-2">{t('agents.orchestration')}</p>
      </motion.div>

      <div className="bg-surface rounded-lg p-6 border border-border">
        <div className="flex items-center gap-4 mb-6">
          <Bot className="w-8 h-8 text-matrix-green" />
          <div>
            <h2 className="text-xl font-semibold">Agent Statistics</h2>
            <p className="text-text-secondary text-sm">Real-time agent performance</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-text-secondary text-sm">Total Tasks</p>
            <p className="text-2xl font-bold">{stats?.total || 0}</p>
          </div>
          <div>
            <p className="text-text-secondary text-sm">Running</p>
            <p className="text-2xl font-bold">{stats?.running || 0}</p>
          </div>
          <div>
            <p className="text-text-secondary text-sm">Completed</p>
            <p className="text-2xl font-bold">{stats?.completed || 0}</p>
          </div>
          <div>
            <p className="text-text-secondary text-sm">Avg Quality</p>
            <p className="text-2xl font-bold">
              {((stats?.avgQuality || 0) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

