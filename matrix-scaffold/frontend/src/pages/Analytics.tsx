import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useQuery } from 'react-query'
import { api } from '../lib/api'
import { BarChart3 } from 'lucide-react'

export default function Analytics() {
  const { t } = useTranslation()

  const { data: dashboard } = useQuery(
    'analytics-dashboard',
    () => api.get('/analytics/dashboard').then((res) => res.data.dashboard),
    {
      refetchInterval: 30000,
    }
  )

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold matrix-glow">{t('analytics.title')}</h1>
        <p className="text-text-secondary mt-2">{t('analytics.realTime')}</p>
      </motion.div>

      <div className="bg-surface rounded-lg p-6 border border-border">
        <div className="flex items-center gap-4 mb-6">
          <BarChart3 className="w-8 h-8 text-matrix-green" />
          <div>
            <h2 className="text-xl font-semibold">{t('analytics.performance')}</h2>
            <p className="text-text-secondary text-sm">Real-time metrics</p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-text-secondary">Cache Hit Rate</span>
              <span className="text-matrix-green">
                {(dashboard?.performance?.cache?.hitRate * 100 || 0).toFixed(1)}%
              </span>
            </div>
            <div className="w-full bg-surface rounded-full h-2">
              <div
                className="bg-matrix-green h-2 rounded-full transition-all"
                style={{
                  width: `${(dashboard?.performance?.cache?.hitRate * 100 || 0)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

