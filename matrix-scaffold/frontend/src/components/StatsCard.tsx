import { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'

interface StatsCardProps {
  title: string
  value: number
  icon: LucideIcon
  color: string
}

export default function StatsCard({ title, value, icon: Icon, color }: StatsCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-surface rounded-lg p-6 border border-border"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-text-secondary text-sm mb-2">{title}</p>
          <p className="text-3xl font-bold text-text">{value}</p>
        </div>
        <div className={`${color} bg-opacity-10 p-3 rounded-lg`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </motion.div>
  )
}

