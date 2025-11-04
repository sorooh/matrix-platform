import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Globe, Bell, User } from 'lucide-react'
import { useState } from 'react'

const languages = [
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'العربية' },
  { code: 'fr', name: 'Français' },
  { code: 'es', name: 'Español' },
]

export default function Header() {
  const { i18n, t } = useTranslation()
  const [showLanguageMenu, setShowLanguageMenu] = useState(false)

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang)
    setShowLanguageMenu(false)
  }

  return (
    <header className="h-16 bg-matrix-gray border-b border-gray-800 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold">{t('nav.dashboard')}</h2>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Globe className="w-5 h-5" />
            <span className="text-sm">
              {languages.find((l) => l.code === i18n.language)?.name || 'English'}
            </span>
          </button>

          {showLanguageMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute right-0 mt-2 w-48 bg-matrix-gray border border-gray-700 rounded-lg shadow-lg z-50"
            >
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code)}
                  className={`
                    w-full text-left px-4 py-2 hover:bg-gray-800 transition-colors
                    ${i18n.language === lang.code ? 'bg-primary-600' : ''}
                  `}
                >
                  {lang.name}
                </button>
              ))}
            </motion.div>
          )}
        </div>

        <button className="p-2 rounded-lg hover:bg-gray-800 transition-colors">
          <Bell className="w-5 h-5" />
        </button>

        <button className="p-2 rounded-lg hover:bg-gray-800 transition-colors">
          <User className="w-5 h-5" />
        </button>
      </div>
    </header>
  )
}

