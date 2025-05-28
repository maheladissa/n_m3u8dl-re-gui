import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/dialog';
import '../styles/SettingsPage.css';
import { Settings } from '../types/tauri';

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const [settings, setSettings] = useState<Settings>({});
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
      const savedSettings = await invoke<Settings>('get_settings');
      setSettings(savedSettings);
      showFeedback(t('settingsPage.feedback.settingsLoaded'), 'success');
    } catch (error) {
      showFeedback(t('settingsPage.feedback.loadError'), 'error');
    }
  };

  const handleInputChange = (field: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, [field]: e.target.value });
    setIsDirty(true);
  };

  const handleNumberChange = (field: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, [field]: Number(e.target.value) });
    setIsDirty(true);
  };

  const handleFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSettings({ ...settings, default_format: e.target.value });
    setIsDirty(true);
  };

  const handleSubFormatChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSettings({ ...settings, sub_format: e.target.value as "SRT" | "VTT" });
    setIsDirty(true);
  };

  const handleLogLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSettings({ ...settings, log_level: e.target.value });
    setIsDirty(true);
  };

  const handleCheckboxChange = (field: keyof Settings) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, [field]: e.target.checked });
    setIsDirty(true);
  };

  const handleDirectorySelect = async (field: keyof Settings) => {
    const selected = await open({
      directory: true,
      multiple: false,
    });

    if (selected) {
      setSettings({ ...settings, [field]: selected as string });
      setIsDirty(true);
    }
  };

  const handleSaveSettings = async () => {
    try {
      await invoke('set_settings', { settings });
      setIsDirty(false);
      showFeedback(t('settingsPage.feedback.saved'), 'success');
    } catch (error) {
      showFeedback(t('settingsPage.feedback.saveError'), 'error');
    }
  };

  const handleResetSettings = async () => {
    try {
      await invoke('set_settings', { settings: {} });
      await loadSettings();
      setIsDirty(false);
      showFeedback(t('settingsPage.feedback.reset'), 'success');
    } catch (error) {
      showFeedback(t('settingsPage.feedback.error', { message: error }), 'error');
    }
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
                  value={settings.download_location || ''}
                  onChange={handleInputChange('download_location')}
                  placeholder={t('settingsPage.generalSettings.downloadLocation.placeholder')}
                />
                <button onClick={() => handleDirectorySelect('download_location')}>
                  {t('settingsPage.generalSettings.downloadLocation.browse')}
                </button>
              </div>
            </div>

            <div className="setting-item">
              <label data-tooltip={t('settingsPage.generalSettings.defaultFormat.tooltip')}>
                {t('settingsPage.generalSettings.defaultFormat.label')}
              </label>
              <select value={settings.default_format || 'mp4'} onChange={handleFormatChange}>
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
                  value={settings.tmp_dir || ''}
                  onChange={handleInputChange('tmp_dir')}
                  placeholder={t('settingsPage.generalSettings.tmpDir.placeholder')}
                />
                <button onClick={() => handleDirectorySelect('tmp_dir')}>
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
                value={settings.download_retry_count || '3'}
                onChange={handleNumberChange('download_retry_count')}
              />
            </div>

            <div className="setting-item">
              <label data-tooltip={t('settingsPage.generalSettings.subFormat.tooltip')}>
                {t('settingsPage.generalSettings.subFormat.label')}
              </label>
              <select value={settings.sub_format || 'SRT'} onChange={handleSubFormatChange}>
                <option value="SRT">SRT</option>
                <option value="VTT">VTT</option>
              </select>
            </div>

            <div className="setting-item checkbox">
              <input
                type="checkbox"
                id="delAfterDone"
                checked={settings.del_after_done || false}
                onChange={handleCheckboxChange('del_after_done')}
              />
              <label htmlFor="delAfterDone" data-tooltip={t('settingsPage.generalSettings.delAfterDone.tooltip')}>
                {t('settingsPage.generalSettings.delAfterDone.label')}
              </label>
            </div>

            <div className="setting-item checkbox">
              <input
                type="checkbox"
                id="autoSubtitleFix"
                checked={settings.auto_subtitle_fix || false}
                onChange={handleCheckboxChange('auto_subtitle_fix')}
              />
              <label htmlFor="autoSubtitleFix" data-tooltip={t('settingsPage.generalSettings.autoSubtitleFix.tooltip')}>
                {t('settingsPage.generalSettings.autoSubtitleFix.label')}
              </label>
            </div>

            <div className="setting-item checkbox">
              <input
                type="checkbox"
                id="useSystemProxy"
                checked={settings.use_system_proxy || false}
                onChange={handleCheckboxChange('use_system_proxy')}
              />
              <label htmlFor="useSystemProxy" data-tooltip={t('settingsPage.generalSettings.useSystemProxy.tooltip')}>
                {t('settingsPage.generalSettings.useSystemProxy.label')}
              </label>
            </div>

            <div className="setting-item checkbox">
              <input
                type="checkbox"
                id="autoStart"
                checked={settings.auto_start || false}
                onChange={handleCheckboxChange('auto_start')}
              />
              <label htmlFor="autoStart" data-tooltip={t('settingsPage.generalSettings.autoStart.tooltip')}>
                {t('settingsPage.generalSettings.autoStart.label')}
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
              <select value={settings.log_level || 'INFO'} onChange={handleLogLevelChange}>
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
                max="10"
                value={settings.concurrent_downloads || '1'}
                onChange={handleNumberChange('concurrent_downloads')}
              />
            </div>

            <div className="setting-item">
              <label data-tooltip={t('settingsPage.advancedSettings.timeout.tooltip')}>
                {t('settingsPage.advancedSettings.timeout.label')}
              </label>
              <input
                type="number"
                min="1"
                max="3600"
                value={settings.timeout || '30'}
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
                value={settings.thread_count || '16'}
                onChange={handleNumberChange('thread_count')}
              />
            </div>

            <div className="setting-item checkbox">
              <input
                type="checkbox"
                id="checkSegmentsCount"
                checked={settings.check_segments_count || false}
                onChange={handleCheckboxChange('check_segments_count')}
              />
              <label htmlFor="checkSegmentsCount" data-tooltip={t('settingsPage.advancedSettings.checkSegmentsCount.tooltip')}>
                {t('settingsPage.advancedSettings.checkSegmentsCount.label')}
              </label>
            </div>

            <div className="setting-item checkbox">
              <input
                type="checkbox"
                id="writeMetaJson"
                checked={settings.write_meta_json || false}
                onChange={handleCheckboxChange('write_meta_json')}
              />
              <label htmlFor="writeMetaJson" data-tooltip={t('settingsPage.advancedSettings.writeMetaJson.tooltip')}>
                {t('settingsPage.advancedSettings.writeMetaJson.label')}
              </label>
            </div>

            <div className="setting-item checkbox">
              <input
                type="checkbox"
                id="binaryMerge"
                checked={settings.binary_merge || false}
                onChange={handleCheckboxChange('binary_merge')}
              />
              <label htmlFor="binaryMerge" data-tooltip={t('settingsPage.advancedSettings.binaryMerge.tooltip')}>
                {t('settingsPage.advancedSettings.binaryMerge.label')}
              </label>
            </div>

            <div className="setting-item checkbox">
              <input
                type="checkbox"
                id="useFfmpegConcatDemuxer"
                checked={settings.use_ffmpeg_concat_demuxer || false}
                onChange={handleCheckboxChange('use_ffmpeg_concat_demuxer')}
              />
              <label htmlFor="useFfmpegConcatDemuxer" data-tooltip={t('settingsPage.advancedSettings.useFfmpegConcatDemuxer.tooltip')}>
                {t('settingsPage.advancedSettings.useFfmpegConcatDemuxer.label')}
              </label>
            </div>

            <div className="setting-item checkbox">
              <input
                type="checkbox"
                id="noDateInfo"
                checked={settings.no_date_info || false}
                onChange={handleCheckboxChange('no_date_info')}
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
          className="save-button" 
          onClick={handleSaveSettings}
          disabled={!isDirty}
        >
          {t('settingsPage.actions.save')}
        </button>
        <button 
          className="reset-button" 
          onClick={handleResetSettings}
        >
          {t('settingsPage.actions.reset')}
        </button>
      </div>
    </div>
  );
};

export default SettingsPage; 