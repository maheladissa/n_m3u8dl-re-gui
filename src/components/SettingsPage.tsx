import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import '../styles/SettingsPage.css';

interface Settings {
  // General Settings
  downloadLocation: string;
  defaultFormat: string;
  autoStart: boolean;
  tmpDir: string;
  downloadRetryCount: number;
  delAfterDone: boolean;
  subFormat: 'SRT' | 'VTT';
  autoSubtitleFix: boolean;
  useSystemProxy: boolean;
  
  // Advanced Settings
  concurrentDownloads: number;
  timeout: number;
  threadCount: number;
  checkSegmentsCount: boolean;
  writeMetaJson: boolean;
  binaryMerge: boolean;
  useFfmpegConcatDemuxer: boolean;
  noDateInfo: boolean;
  logLevel: 'DEBUG' | 'ERROR' | 'INFO' | 'OFF' | 'WARN';
}

declare global {
  interface Window {
    electron: {
      settings: {
        get: () => Promise<Settings>;
        set: (settings: Settings) => Promise<boolean>;
        selectDirectory: () => Promise<string | null>;
      };
    };
  }
}

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<Settings>({
    // General Settings
    downloadLocation: '',
    defaultFormat: 'mp4',
    autoStart: false,
    tmpDir: '',
    downloadRetryCount: 3,
    delAfterDone: true,
    subFormat: 'SRT',
    autoSubtitleFix: true,
    useSystemProxy: true,
    
    // Advanced Settings
    concurrentDownloads: 2,
    timeout: 60,
    threadCount: 16,
    checkSegmentsCount: true,
    writeMetaJson: true,
    binaryMerge: false,
    useFfmpegConcatDemuxer: false,
    noDateInfo: false,
    logLevel: 'INFO'
  });
  const [isDirty, setIsDirty] = useState(false);
  const [feedback, setFeedback] = useState<{
    message: string;
    type: 'success' | 'error' | null;
  }>({ message: '', type: null });

  useEffect(() => {
    loadSettings();
  }, []);

  const showFeedback = (message: string, type: 'success' | 'error') => {
    setFeedback({ message, type });
    setTimeout(() => {
      setFeedback({ message: '', type: null });
    }, 3000);
  };

  const loadSettings = async () => {
    try {
      const savedSettings = await window.electron.settings.get();
      setSettings(savedSettings);
      showFeedback(t('settingsPage.feedback.settingsLoaded'), 'success');
    } catch (error) {
      showFeedback(t('settingsPage.feedback.loadError'), 'error');
    }
  };

  const handleSave = async () => {
    try {
      await window.electron.settings.set(settings);
      setIsDirty(false);
      showFeedback(t('settingsPage.feedback.saved'), 'success');
    } catch (error) {
      showFeedback(t('settingsPage.feedback.saveError'), 'error');
    }
  };

  const handleReset = () => {
    loadSettings();
    setIsDirty(false);
    showFeedback(t('settingsPage.feedback.reset'), 'success');
  };

  const handleDirectorySelect = async (key: 'downloadLocation' | 'tmpDir') => {
    const selectedPath = await window.electron.settings.selectDirectory();
    if (selectedPath) {
      setSettings(prev => ({ ...prev, [key]: selectedPath }));
      setIsDirty(true);
    }
  };

  const handleFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSettings(prev => ({ ...prev, defaultFormat: e.target.value as 'mp4' | 'ts' }));
    setIsDirty(true);
  };

  const handleSubFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSettings(prev => ({ ...prev, subFormat: e.target.value as 'SRT' | 'VTT' }));
    setIsDirty(true);
  };

  const handleLogLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSettings(prev => ({ ...prev, logLevel: e.target.value as 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'OFF' }));
    setIsDirty(true);
  };

  const handleInputChange = (key: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings(prev => ({ ...prev, [key]: e.target.value }));
    setIsDirty(true);
  };

  const handleNumberChange = (key: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value)) {
      setSettings(prev => ({ ...prev, [key]: value }));
      setIsDirty(true);
    }
  };

  const handleCheckboxChange = (key: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings(prev => ({ ...prev, [key]: e.target.checked }));
    setIsDirty(true);
  };

  return (
    <div className="settings-page">
      <h1>{t('settingsPage.title')}</h1>
      
      {feedback.message && (
        <div className={`feedback-message ${feedback.type}`}>
          {feedback.message}
        </div>
      )}
      
      <div className="settings-grid">
        {/* General Settings */}
        <div className="settings-section">
          <h2>{t('settingsPage.generalSettings.title')}</h2>
          <div className="settings-group">
            <div className="setting-item">
              <label data-tooltip={t('settingsPage.generalSettings.downloadLocation.tooltip')}>
                {t('settingsPage.generalSettings.downloadLocation.label')}
              </label>
              <div className="path-input">
                <input
                  type="text"
                  value={settings.downloadLocation}
                  onChange={handleInputChange('downloadLocation')}
                  placeholder={t('settingsPage.generalSettings.downloadLocation.placeholder')}
                />
                <button onClick={() => handleDirectorySelect('downloadLocation')}>
                  {t('settingsPage.generalSettings.downloadLocation.browse')}
                </button>
              </div>
            </div>

            <div className="setting-item">
              <label data-tooltip={t('settingsPage.generalSettings.defaultFormat.tooltip')}>
                {t('settingsPage.generalSettings.defaultFormat.label')}
              </label>
              <select value={settings.defaultFormat} onChange={handleFormatChange}>
                <option value="mp4">MP4</option>
                <option value="ts">TS</option>
                <option value="mkv">MKV</option>
              </select>
            </div>

            <div className="setting-item">
              <label data-tooltip={t('settingsPage.generalSettings.tmpDir.tooltip')}>
                {t('settingsPage.generalSettings.tmpDir.label')}
              </label>
              <div className="path-input">
                <input
                  type="text"
                  value={settings.tmpDir}
                  onChange={handleInputChange('tmpDir')}
                  placeholder={t('settingsPage.generalSettings.tmpDir.placeholder')}
                />
                <button onClick={() => handleDirectorySelect('tmpDir')}>
                  {t('settingsPage.generalSettings.tmpDir.browse')}
                </button>
              </div>
            </div>

            <div className="setting-item">
              <label data-tooltip={t('settingsPage.generalSettings.downloadRetryCount.tooltip')}>
                {t('settingsPage.generalSettings.downloadRetryCount.label')}
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings.downloadRetryCount}
                onChange={handleNumberChange('downloadRetryCount')}
              />
            </div>

            <div className="setting-item">
              <label data-tooltip={t('settingsPage.generalSettings.subFormat.tooltip')}>
                {t('settingsPage.generalSettings.subFormat.label')}
              </label>
              <select value={settings.subFormat} onChange={handleSubFormatChange}>
                <option value="SRT">SRT</option>
                <option value="VTT">VTT</option>
              </select>
            </div>

            <div className="setting-item checkbox">
              <input
                type="checkbox"
                id="autoStart"
                checked={settings.autoStart}
                onChange={handleCheckboxChange('autoStart')}
              />
              <label htmlFor="autoStart" data-tooltip={t('settingsPage.generalSettings.autoStart.tooltip')}>
                {t('settingsPage.generalSettings.autoStart.label')}
              </label>
            </div>

            <div className="setting-item checkbox">
              <input
                type="checkbox"
                id="delAfterDone"
                checked={settings.delAfterDone}
                onChange={handleCheckboxChange('delAfterDone')}
              />
              <label htmlFor="delAfterDone" data-tooltip={t('settingsPage.generalSettings.delAfterDone.tooltip')}>
                {t('settingsPage.generalSettings.delAfterDone.label')}
              </label>
            </div>

            <div className="setting-item checkbox">
              <input
                type="checkbox"
                id="autoSubtitleFix"
                checked={settings.autoSubtitleFix}
                onChange={handleCheckboxChange('autoSubtitleFix')}
              />
              <label htmlFor="autoSubtitleFix" data-tooltip={t('settingsPage.generalSettings.autoSubtitleFix.tooltip')}>
                {t('settingsPage.generalSettings.autoSubtitleFix.label')}
              </label>
            </div>

            <div className="setting-item checkbox">
              <input
                type="checkbox"
                id="useSystemProxy"
                checked={settings.useSystemProxy}
                onChange={handleCheckboxChange('useSystemProxy')}
              />
              <label htmlFor="useSystemProxy" data-tooltip={t('settingsPage.generalSettings.useSystemProxy.tooltip')}>
                {t('settingsPage.generalSettings.useSystemProxy.label')}
              </label>
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className="settings-section">
          <h2>{t('settingsPage.advancedSettings.title')}</h2>
          <div className="settings-group">
            <div className="setting-item">
              <label data-tooltip={t('settingsPage.advancedSettings.logLevel.tooltip')}>
                {t('settingsPage.advancedSettings.logLevel.label')}
              </label>
              <select value={settings.logLevel} onChange={handleLogLevelChange}>
                <option value="DEBUG">DEBUG</option>
                <option value="INFO">INFO</option>
                <option value="WARN">WARN</option>
                <option value="ERROR">ERROR</option>
                <option value="OFF">OFF</option>
              </select>
            </div>

            <div className="setting-item">
              <label data-tooltip={t('settingsPage.advancedSettings.concurrentDownloads.tooltip')}>
                {t('settingsPage.advancedSettings.concurrentDownloads.label')}
              </label>
              <input
                type="number"
                min="1"
                max="5"
                value={settings.concurrentDownloads}
                onChange={handleNumberChange('concurrentDownloads')}
              />
            </div>

            <div className="setting-item">
              <label data-tooltip={t('settingsPage.advancedSettings.timeout.tooltip')}>
                {t('settingsPage.advancedSettings.timeout.label')}
              </label>
              <input
                type="number"
                min="10"
                max="300"
                value={settings.timeout}
                onChange={handleNumberChange('timeout')}
              />
            </div>

            <div className="setting-item">
              <label data-tooltip={t('settingsPage.advancedSettings.threadCount.tooltip')}>
                {t('settingsPage.advancedSettings.threadCount.label')}
              </label>
              <input
                type="number"
                min="1"
                max="32"
                value={settings.threadCount}
                onChange={handleNumberChange('threadCount')}
              />
            </div>

            <div className="setting-item checkbox">
              <input
                type="checkbox"
                id="checkSegmentsCount"
                checked={settings.checkSegmentsCount}
                onChange={handleCheckboxChange('checkSegmentsCount')}
              />
              <label htmlFor="checkSegmentsCount" data-tooltip={t('settingsPage.advancedSettings.checkSegmentsCount.tooltip')}>
                {t('settingsPage.advancedSettings.checkSegmentsCount.label')}
              </label>
            </div>

            <div className="setting-item checkbox">
              <input
                type="checkbox"
                id="writeMetaJson"
                checked={settings.writeMetaJson}
                onChange={handleCheckboxChange('writeMetaJson')}
              />
              <label htmlFor="writeMetaJson" data-tooltip={t('settingsPage.advancedSettings.writeMetaJson.tooltip')}>
                {t('settingsPage.advancedSettings.writeMetaJson.label')}
              </label>
            </div>

            <div className="setting-item checkbox">
              <input
                type="checkbox"
                id="binaryMerge"
                checked={settings.binaryMerge}
                onChange={handleCheckboxChange('binaryMerge')}
              />
              <label htmlFor="binaryMerge" data-tooltip={t('settingsPage.advancedSettings.binaryMerge.tooltip')}>
                {t('settingsPage.advancedSettings.binaryMerge.label')}
              </label>
            </div>

            <div className="setting-item checkbox">
              <input
                type="checkbox"
                id="useFfmpegConcatDemuxer"
                checked={settings.useFfmpegConcatDemuxer}
                onChange={handleCheckboxChange('useFfmpegConcatDemuxer')}
              />
              <label htmlFor="useFfmpegConcatDemuxer" data-tooltip={t('settingsPage.advancedSettings.useFfmpegConcatDemuxer.tooltip')}>
                {t('settingsPage.advancedSettings.useFfmpegConcatDemuxer.label')}
              </label>
            </div>

            <div className="setting-item checkbox">
              <input
                type="checkbox"
                id="noDateInfo"
                checked={settings.noDateInfo}
                onChange={handleCheckboxChange('noDateInfo')}
              />
              <label htmlFor="noDateInfo" data-tooltip={t('settingsPage.advancedSettings.noDateInfo.tooltip')}>
                {t('settingsPage.advancedSettings.noDateInfo.label')}
              </label>
            </div>
          </div>
        </div>
      </div>
      
      <div className="settings-actions">
        <button 
          className={`save-button ${isDirty ? 'dirty' : ''}`}
          onClick={handleSave}
          disabled={!isDirty}
        >
          {t('settingsPage.actions.save')}
        </button>
        <button 
          className={`reset-button ${isDirty ? 'dirty' : ''}`}
          onClick={handleReset}
          disabled={!isDirty}
        >
          {t('settingsPage.actions.reset')}
        </button>
      </div>
    </div>
  );
};

export default SettingsPage; 