/**
 * Real-Time Stats Component with WebSocket Updates
 * Phase 4: Real-time Updates
 */

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { wsClient } from '../lib/websocket'
import StatsCard from './StatsCard'
import { Activity, FolderKanban, Bot, Shield } from 'lucide-react'
import { useTranslation } from 'react-i18next'

interface Stats {
  projects: number
  jobs: { total: number; running: number; completed: number; failed: number }
  agents: { total: number; active: number; avgQuality: number }
  security: { threats: number }
}

export default function RealTimeStats() {
  const { t } = useTranslation()
  const [stats, setStats] = useState<Stats>({
    projects: 0,
    jobs: { total: 0, running: 0, completed: 0, failed: 0 },
    agents: { total: 0, active: 0, avgQuality: 0 },
    security: { threats: 0 },
  })

  useEffect(() => {
    wsClient.connect()

    wsClient.on('dashboard.update', (data: Stats) => {
      setStats(data)
    })

    wsClient.on('kpis.update', (data: any) => {
      setStats((prev) => ({
        ...prev,
        projects: data.projects || prev.projects,
        jobs: data.jobs || prev.jobs,
      }))
    })

    return () => {
      wsClient.disconnect()
    }
  }, [])

  const statsCards = [
    {
      title: t('dashboard.projects'),
      value: stats.projects,
      icon: FolderKanban,
      color: 'text-blue-400',
    },
    {
      title: t('dashboard.jobs'),
      value: stats.jobs.total,
      icon: Activity,
      color: 'text-green-400',
    },
    {
      title: t('dashboard.agents'),
      value: stats.agents.total,
      icon: Bot,
      color: 'text-purple-400',
    },
    {
      title: t('dashboard.security'),
      value: stats.security.threats,
      icon: Shield,
      color: 'text-red-400',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statsCards.map((stat, index) => (
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
  )
}

