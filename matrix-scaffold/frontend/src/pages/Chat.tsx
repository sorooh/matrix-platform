import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import ChatStream from '../components/ChatStream'

import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import ChatStream from '../components/ChatStream'

const agents = [
  { id: 'morpheus', name: 'Morpheus', description: 'Analysis & Strategy' },
  { id: 'architect', name: 'Architect', description: 'Architecture & Design' },
  { id: 'sida', name: 'SIDA', description: 'Code Generation' },
  { id: 'audit', name: 'Audit', description: 'Testing & Quality' },
  { id: 'vision', name: 'Vision', description: 'Visualization' },
]

export default function Chat() {
  const { t } = useTranslation()
  const [selectedAgent, setSelectedAgent] = useState('morpheus')

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-bold matrix-glow">{t('chat.title')}</h1>
        <p className="text-gray-400 mt-2">{t('chat.agents')}</p>
      </motion.div>

      <div className="mb-4 flex gap-2 overflow-x-auto">
        {agents.map((agent) => (
          <button
            key={agent.id}
            onClick={() => setSelectedAgent(agent.id)}
            className={`
              px-4 py-2 rounded-lg transition-colors whitespace-nowrap
              ${
                selectedAgent === agent.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-matrix-gray text-gray-300 hover:bg-gray-800'
              }
            `}
          >
            {agent.name}
          </button>
        ))}
      </div>

      <ChatStream agent={selectedAgent} />
    </div>
  )
}

