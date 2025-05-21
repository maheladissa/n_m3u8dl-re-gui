import React from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/SettingsPage.css';

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div className="settings-page">
      <h1>{t('settingsPage.title')}</h1>
      
      <div className="settings-section">
        <h2>{t('settingsPage.general.title')}</h2>
        <div className="settings-group">
          <div className="setting-item">
            <label>{t('settingsPage.general.downloadLocation')}</label>
            <div className="path-input">
              <input type="text" defaultValue="C:/Downloads" readOnly />
              <button>{t('settingsPage.general.browse')}</button>
            </div>
          </div>
          
          <div className="setting-item">
            <label>{t('settingsPage.general.defaultFormat')}</label>
            <select defaultValue="mp4">
              <option value="mp4">MP4</option>
              <option value="ts">TS</option>
              <option value="mkv">MKV</option>
            </select>
          </div>
          
          <div className="setting-item checkbox">
            <input type="checkbox" id="autoStart" defaultChecked />
            <label htmlFor="autoStart">{t('settingsPage.general.autoStart')}</label>
          </div>
        </div>
      </div>
      
      <div className="settings-section">
        <h2>{t('settingsPage.advanced.title')}</h2>
        <div className="settings-group">
          <div className="setting-item">
            <label>{t('settingsPage.advanced.concurrentDownloads')}</label>
            <input type="number" min="1" max="5" defaultValue="2" />
          </div>
          
          <div className="setting-item">
            <label>{t('settingsPage.advanced.timeout')}</label>
            <input type="number" min="10" max="300" defaultValue="60" />
          </div>
          
          <div className="setting-item checkbox">
            <input type="checkbox" id="debugMode" />
            <label htmlFor="debugMode">{t('settingsPage.advanced.debugMode')}</label>
          </div>
        </div>
      </div>
      
      <div className="settings-actions">
        <button className="save-button">{t('settingsPage.actions.save')}</button>
        <button className="reset-button">{t('settingsPage.actions.reset')}</button>
      </div>
    </div>
  );
};

export default SettingsPage; 