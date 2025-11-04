import { Routes, Route } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import Agents from './pages/Agents'
import Analytics from './pages/Analytics'
import Chat from './pages/Chat'
import Settings from './pages/Settings'

function App() {
  const { i18n } = useTranslation()

  // Set RTL direction for Arabic
  document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr'
  document.documentElement.lang = i18n.language

  return (
    <ThemeProvider>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </ThemeProvider>
  )
}

export default App
