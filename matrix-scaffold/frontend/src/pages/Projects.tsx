import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useQuery } from 'react-query'
import { api } from '../lib/api'
import { Plus } from 'lucide-react'

export default function Projects() {
  const { t } = useTranslation()

  const { data: projects, isLoading } = useQuery('projects', () =>
    api.get('/projects').then((res) => res.data.projects || [])
  )

  if (isLoading) {
    return <div className="text-matrix-green">{t('common.loading')}</div>
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold matrix-glow">{t('projects.title')}</h1>
          <p className="text-gray-400 mt-2">Manage your projects</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
          <Plus className="w-5 h-5" />
          {t('projects.create')}
        </button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects?.map((project: any, index: number) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-matrix-gray rounded-lg p-6 border border-gray-800 hover:border-primary-500 transition-colors"
          >
            <h3 className="text-xl font-semibold mb-2">{project.name}</h3>
            <p className="text-gray-400 text-sm mb-4">{project.description}</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-400">{t('projects.status')}:</span>
              <span className="text-matrix-green">Active</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

