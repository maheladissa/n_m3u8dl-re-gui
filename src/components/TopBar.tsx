import React from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/TopBar.css';

interface TopBarProps {
  toggleTheme: () => void;
  isDarkMode: boolean;
}

const TopBar: React.FC<TopBarProps> = ({ toggleTheme, isDarkMode }) => {
  const { t, i18n } = useTranslation();
  const version = '1.0.0';

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value;
    i18n.changeLanguage(newLanguage);
    localStorage.setItem('language', newLanguage);
  };

  return (
    <div className="top-bar">
      <div className="app-title">{t('app.name')}</div>
      <div className="top-bar-right">
        <div className="version">{t('app.version', { version })}</div>
        <div className="theme-toggle">
          <button 
            onClick={toggleTheme} 
            className="theme-button"
            title={isDarkMode ? t('topBar.theme.light') : t('topBar.theme.dark')}
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
        <div className="language-selector">
          <select value={i18n.language} onChange={handleLanguageChange}>
            <option value="en">{t('topBar.language.en')}</option>
            <option value="zh">{t('topBar.language.zh')}</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default TopBar; 