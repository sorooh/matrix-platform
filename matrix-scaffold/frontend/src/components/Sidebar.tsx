import { NavLink } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  FolderKanban,
  Bot,
  BarChart3,
  MessageSquare,
  Settings,
  Zap,
} from 'lucide-react'
import { clsx } from 'clsx'

const navItems = [
  { path: '/', icon: LayoutDashboard, key: 'dashboard' },
  { path: '/projects', icon: FolderKanban, key: 'projects' },
  { path: '/agents', icon: Bot, key: 'agents' },
  { path: '/analytics', icon: BarChart3, key: 'analytics' },
  { path: '/chat', icon: MessageSquare, key: 'chat' },
  { path: '/settings', icon: Settings, key: 'settings' },
]

export default function Sidebar() {
  const { t } = useTranslation()

  return (
    <motion.aside
      initial={{ x: -250 }}
      animate={{ x: 0 }}
      className="w-64 bg-matrix-gray border-r border-gray-800 flex flex-col"
    >
      <div className="p-6 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-matrix-green" />
          <h1 className="text-xl font-bold matrix-glow">Matrix</h1>
        </div>
        <p className="text-xs text-gray-400 mt-1">AI Infrastructure</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                )
              }
            >
              <Icon className="w-5 h-5" />
              <span>{t(`nav.${item.key}`)}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="p-4 border-t border-gray-800">
        <div className="text-xs text-gray-400">
          <p>Version 0.1.0</p>
          <p className="mt-1">© 2025 Surooh</p>
        </div>
      </div>
    </motion.aside>
  )
}

