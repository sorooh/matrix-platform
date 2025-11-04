import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useQuery } from 'react-query'
import { api } from '../lib/api'
import StatsCard from '../components/StatsCard'
import { Activity, FolderKanban, Bot, Shield } from 'lucide-react'

export default function Dashboard() {
  const { t } = useTranslation()

  const { data: dashboard, isLoading } = useQuery(
    'dashboard',
    () => api.get('/analytics/dashboard').then((res) => res.data.dashboard),
    {
      refetchInterval: 30000, // Refresh every 30 seconds
    }
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-matrix-green">{t('common.loading')}</div>
      </div>
    )
  }

  const stats = [
    {
      title: t('dashboard.projects'),
      value: dashboard?.overview?.projects || 0,
      icon: FolderKanban,
      color: 'text-blue-400',
    },
    {
      title: t('dashboard.jobs'),
      value: dashboard?.overview?.jobs?.total || 0,
      icon: Activity,
      color: 'text-green-400',
    },
    {
      title: t('dashboard.agents'),
      value: dashboard?.overview?.agents?.total || 0,
      icon: Bot,
      color: 'text-purple-400',
    },
    {
      title: t('dashboard.security'),
      value: dashboard?.security?.threats || 0,
      icon: Shield,
      color: 'text-red-400',
    },
  ]

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold matrix-glow">{t('dashboard.title')}</h1>
        <p className="text-gray-400 mt-2">{t('dashboard.overview')}</p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <StatsCard {...stat} />
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <div className="bg-matrix-gray rounded-lg p-6 border border-gray-800">
          <h2 className="text-xl font-semibold mb-4">{t('dashboard.performance')}</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Cache Hit Rate</span>
                <span className="text-matrix-green">
                  {(dashboard?.performance?.cache?.hitRate * 100 || 0).toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-800 rounded-full h-2">
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

        <div className="bg-matrix-gray rounded-lg p-6 border border-gray-800">
          <h2 className="text-xl font-semibold mb-4">{t('dashboard.system')}</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Uptime</span>
              <span className="text-white">
                {dashboard?.overview?.system?.uptime
                  ? `${Math.floor(dashboard.overview.system.uptime / 3600)}h`
                  : '0h'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Version</span>
              <span className="text-white">{dashboard?.overview?.system?.version || '0.1.0'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Instances</span>
              <span className="text-white">
                {dashboard?.scalability?.instances || 1}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

