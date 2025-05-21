import React, { useState, useEffect } from 'react'
import './App.css'
import './styles/theme.css'
import { useTranslation } from 'react-i18next'
import TopBar from './components/TopBar'
import SideMenu from './components/SideMenu'
import HomePage from './components/HomePage'
import HistoryPage from './components/HistoryPage'
import SettingsPage from './components/SettingsPage'

const App = () => {
  const [currentPage, setCurrentPage] = useState('home')
  const [isDarkMode, setIsDarkMode] = useState(
    localStorage.getItem('theme') === 'dark' || false
  )
  const { i18n } = useTranslation()

  // Apply theme on initial load and when it changes
  useEffect(() => {
    const theme = isDarkMode ? 'dark' : 'light'
    document.body.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [isDarkMode])

  // Load saved language
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language')
    if (savedLanguage) {
      i18n.changeLanguage(savedLanguage)
    }
  }, [i18n])

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
