import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Bot, User } from 'lucide-react'
import { api } from '../lib/api'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

const agents = [
  { id: 'morpheus', name: 'Morpheus', description: 'Analysis & Strategy' },
  { id: 'architect', name: 'Architect', description: 'Architecture & Design' },
  { id: 'sida', name: 'SIDA', description: 'Code Generation' },
  { id: 'audit', name: 'Audit', description: 'Testing & Quality' },
  { id: 'vision', name: 'Vision', description: 'Visualization' },
]

export default function Chat() {
  const { t } = useTranslation()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [selectedAgent, setSelectedAgent] = useState('morpheus')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSend = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await api.post('/agents/chat', {
        message: input,
        agent: selectedAgent,
      })

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.data.response || 'No response',
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

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

      <div className="flex-1 bg-matrix-gray rounded-lg border border-gray-800 p-6 overflow-y-auto mb-4">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`flex gap-4 mb-4 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center">
                  <Bot className="w-5 h-5" />
                </div>
              )}
              <div
                className={`
                  max-w-[70%] rounded-lg p-4
                  ${
                    message.role === 'user'
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-800 text-gray-100'
                  }
                `}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs opacity-70 mt-2">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </div>
              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                  <User className="w-5 h-5" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {isLoading && (
          <div className="flex gap-4">
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center">
              <Bot className="w-5 h-5" />
            </div>
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex gap-2">
                <div className="w-2 h-2 bg-matrix-green rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-matrix-green rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-matrix-green rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={t('chat.placeholder')}
          className="flex-1 bg-matrix-gray border border-gray-800 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-primary-500"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isLoading}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <Send className="w-5 h-5" />
          {t('chat.send')}
        </button>
      </div>
    </div>
  )
}

