import React from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/HomePage.css';

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div className="home-page">
      <h1>{t('homePage.welcome')}</h1>
      <div className="home-content">
        <div className="quick-start-section">
          <h2>{t('homePage.quickStart')}</h2>
          <p>{t('homePage.enterUrl')}</p>
          <div className="url-input-container">
            <input 
              type="text" 
              placeholder={t('homePage.urlPlaceholder')} 
              className="url-input" 
            />
            <button className="download-button">{t('homePage.download')}</button>
          </div>
        </div>
        
        <div className="features-section">
          <h2>{t('homePage.features')}</h2>
          <ul>
            <li>{t('homePage.featuresList.item1')}</li>
            <li>{t('homePage.featuresList.item2')}</li>
            <li>{t('homePage.featuresList.item3')}</li>
            <li>{t('homePage.featuresList.item4')}</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default HomePage; 