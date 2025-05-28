import React, { useState, useEffect } from 'react'
import './App.css'
import './styles/theme.css'
import { useTranslation } from 'react-i18next'
import TopBar from './components/TopBar'
import SideMenu from './components/SideMenu'
import HomePage from './components/HomePage'
import HistoryPage from './components/HistoryPage'
import SettingsPage from './components/SettingsPage'
import { invoke } from '@tauri-apps/api/tauri'
import { listen } from '@tauri-apps/api/event'

const App = () => {
  const [currentPage, setCurrentPage] = useState('home')
  const [isDarkMode, setIsDarkMode] = useState(() => {
    // Check localStorage first
    const savedTheme = localStorage.getItem('theme')
    if (savedTheme) {
      return savedTheme === 'dark'
    }
    // If no saved theme, check system preference
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })
  const { i18n, t } = useTranslation()

  // Apply theme on initial load and when it changes
  useEffect(() => {
    const theme = isDarkMode ? 'dark' : 'light'
    document.body.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [isDarkMode])

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e: MediaQueryListEvent) => {
      // Only update if user hasn't manually set a theme
      if (!localStorage.getItem('theme')) {
        setIsDarkMode(e.matches)
      }
    }

    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Load saved language
  useEffect(() => {
    const savedLanguage = localStorage.getItem('i18nextLng') || 'en';
    i18n.changeLanguage(savedLanguage);
  }, [i18n]);

  useEffect(() => {
    // Check for required binaries on startup
    invoke('check_required_binaries')

    // Listen for missing binaries event
    const unlisten = listen('missing-binaries', (event) => {
      const missingBinaries = event.payload as string[]
      const message = t('app.missingBinariesMessage', { binaries: missingBinaries.join('\n') })
      const downloadMessage = t('app.pleaseDownload')
      alert(`${message}\n${missingBinaries.join('\n')}\n\n${downloadMessage}`)
    })

    return () => {
      unlisten.then(fn => fn())
    }
  }, [i18n, t])

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
  }

  const handleNavigate = (page: string) => {
    setCurrentPage(page)
  }

  // Render the current page based on navigation state
  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <HomePage />
      case 'history':
        return <HistoryPage />
      case 'settings':
        return <SettingsPage />
      default:
        return <HomePage />
    }
  }

  return (
    <div className="app">
      <TopBar toggleTheme={toggleTheme} isDarkMode={isDarkMode} />
      <div className="main-container">
        <SideMenu onNavigate={handleNavigate} currentPage={currentPage} />
        <div className="content">
          {renderPage()}
        </div>
      </div>
    </div>
  )
}

export default App
