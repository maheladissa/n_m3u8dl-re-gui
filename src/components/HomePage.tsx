import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import '../styles/HomePage.css';
import { MediaOptions } from '../types/tauri';

interface Header {
  key: string;
  value: string;
}

interface StreamInfo {
  video_streams: Array<{
    resolution: string;
    bitrate: string;
    fps: string;
    codec: string;
  }>;
  audio_streams: Array<{
    id: string;
    name: string;
    language: string;
    channels: string;
  }>;
  subtitle_streams: Array<{
    id: string;
    name: string;
    language: string;
  }>;
}

interface ProgressInfo {
  current: number;
  total: number;
  percentage: number;
  downloaded: string;
  total_size: string;
  speed: string;
  eta: string;
}

interface DownloadProgress {
  video_progress: ProgressInfo;
  audio_progress: ProgressInfo;
  subtitle_progress: ProgressInfo;
}

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const [showHeadersDialog, setShowHeadersDialog] = useState(false);
  const [headers, setHeaders] = useState<Header[]>([
    { key: 'User-Agent', value: '' },
    { key: 'Referer', value: '' }
  ]);
  
  const [url, setUrl] = useState('');
  const [urlError, setUrlError] = useState<string>('');
  const [saveName, setSaveName] = useState('');
  const [videoQuality, setVideoQuality] = useState('');
  const [audioStream, setAudioStream] = useState('');
  const [subtitles, setSubtitles] = useState('');
  const [autoMerge, setAutoMerge] = useState(true);
  const [fastStart, setFastStart] = useState(false);
  const [audioOnly, setAudioOnly] = useState(false);

  const [videoOptions, setVideoOptions] = useState<MediaOptions[]>([]);
  const [audioOptions, setAudioOptions] = useState<MediaOptions[]>([]);
  const [subtitleOptions, setSubtitleOptions] = useState<MediaOptions[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [downloadError, setDownloadError] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<'idle' | 'downloading' | 'error' | 'complete'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [notificationDismissed, setNotificationDismissed] = useState(false);

  const handleAddHeader = () => {
    setHeaders([...headers, { key: '', value: '' }]);
  };

  const handleHeaderInputChange = (index: number, field: 'key' | 'value', value: string) => {
    const newHeaders = [...headers];
    newHeaders[index][field] = value;
    setHeaders(newHeaders);
  };

  const handleRemoveHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const validateM3u8Url = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();
      const searchParams = urlObj.searchParams.toString().toLowerCase();
      
      // Check if URL ends with .m3u8 or contains m3u8 in the path/query
      const isM3u8 = pathname.endsWith('.m3u8') || 
                    pathname.includes('m3u8') || 
                    searchParams.includes('m3u8');
      
      if (!isM3u8) {
        setUrlError(t('homePage.invalidM3u8Url'));
        return false;
      }
      
      setUrlError('');
      return true;
    } catch (error) {
      setUrlError(t('homePage.invalidUrl'));
      return false;
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);
    if (newUrl.trim()) {
      validateM3u8Url(newUrl);
    } else {
      setUrlError('');
    }
  };

  const handleLoadOptions = async () => {
    if (!url) {
      setUrlError(t('homePage.urlRequired'));
      return;
    }

    if (!validateM3u8Url(url)) {
      return;
    }

    // Reset previous options
    setVideoOptions([]);
    setAudioOptions([]);
    setSubtitleOptions([]);
    setVideoQuality('');
    setAudioStream('');
    setSubtitles('');
    setIsLoading(true);

    try {
      // Set up event listener for m3u8 options
      const unlisten = await listen<StreamInfo>('m3u8-options', (event) => {
        const streamInfo = event.payload;
        console.log('Received stream info:', streamInfo);
        
        // Convert video streams to MediaOptions
        const videoOptions = streamInfo.video_streams.map(stream => ({
          id: `${stream.resolution} | ${stream.bitrate} | ${stream.fps} | ${stream.codec}`,
          description: `${stream.resolution} | ${stream.bitrate} | ${stream.fps} | ${stream.codec}`
        }));
        
        // Convert audio streams to MediaOptions
        const audioOptions = streamInfo.audio_streams.map(stream => ({
          id: `${stream.id} | ${stream.name} | ${stream.language} | ${stream.channels}`,
          description: `${stream.id} | ${stream.name} | ${stream.language} | ${stream.channels}`
        }));
        
        // Convert subtitle streams to MediaOptions
        const subtitleOptions = streamInfo.subtitle_streams.map(stream => ({
          id: `${stream.id} | ${stream.name} | ${stream.language}`,
          description: `${stream.id} | ${stream.name} | ${stream.language}`
        }));
        
        setVideoOptions(videoOptions);
        setAudioOptions(audioOptions);
        setSubtitleOptions(subtitleOptions);
        setIsLoading(false);
      });

      // Call IPC to load options
      await invoke('load_m3u8_options', {
        url,
        headers: headers.filter(header => header.key && header.value)
      });

    } catch (error) {
      console.error('Error loading options:', error);
      setIsLoading(false);
      // TODO: Show an error message to the user
    }
  };

  // Cleanup function for event listeners
  const cleanupListeners = useCallback((listeners: (() => void)[]) => {
    listeners.forEach(unlisten => unlisten());
  }, []);

  // Handle download progress updates
  const handleProgressUpdate = useCallback((event: any) => {
    console.log('Received progress update:', event.payload);
    setDownloadProgress(event.payload);
  }, []);

  // Handle download completion
  const handleDownloadComplete = useCallback((event: any) => {
    console.log('Download completed:', event.payload);
    setIsDownloading(false);
    setDownloadStatus(event.payload === 0 ? 'complete' : 'error');
    setNotificationDismissed(false);
    if (event.payload === 0) {
      setDownloadProgress(null);
    } else {
      setErrorMessage(t('homePage.downloadFailed'));
    }
  }, [t]);

  // Handle download errors
  const handleDownloadError = useCallback((event: any) => {
    console.log('Download error:', event.payload);
    setIsDownloading(false);
    setDownloadStatus('error');
    setErrorMessage(event.payload as string);
  }, []);

  // Set up event listeners
  useEffect(() => {
    if (isDownloading) {
      const listeners: (() => void)[] = [];
      
      // Set up progress listener
      listen<DownloadProgress>('download-progress', handleProgressUpdate)
        .then(unlisten => listeners.push(unlisten))
        .catch(console.error);

      // Set up completion listener
      listen('download-complete', handleDownloadComplete)
        .then(unlisten => listeners.push(unlisten))
        .catch(console.error);

      // Set up error listener
      listen('download-error', handleDownloadError)
        .then(unlisten => listeners.push(unlisten))
        .catch(console.error);

      // Cleanup function
      return () => cleanupListeners(listeners);
    }
  }, [isDownloading, handleProgressUpdate, handleDownloadComplete, handleDownloadError, cleanupListeners]);

  // Improved progress calculation with null checks
  const calculateOverallProgress = useCallback((progress: DownloadProgress | null): number => {
    if (!progress) return 0;
    
    const videoProgress = progress.video_progress?.total > 0 
      ? (progress.video_progress.current / progress.video_progress.total) * 100 
      : progress.video_progress?.percentage || 0;
    
    const audioProgress = progress.audio_progress?.total > 0
      ? (progress.audio_progress.current / progress.audio_progress.total) * 100
      : progress.audio_progress?.percentage || 0;
    
    const subtitleProgress = progress.subtitle_progress?.total > 0
      ? (progress.subtitle_progress.current / progress.subtitle_progress.total) * 100
      : progress.subtitle_progress?.percentage || 0;
    
    if (audioOnly) {
      return audioProgress;
    }
    
    // Use weighted average for multi-stream downloads
    const weights = {
      video: 0.7,
      audio: 0.2,
      subtitle: 0.1
    };
    
    return (videoProgress * weights.video) + 
           (audioProgress * weights.audio) + 
           (subtitleProgress * weights.subtitle);
  }, [audioOnly]);

  // Improved progress info retrieval with null checks
  const getProgressInfo = useCallback((progress: DownloadProgress | null): ProgressInfo | null => {
    if (!progress) return null;
    
    if (audioOnly) {
      return progress.audio_progress || null;
    }
    
    if (progress.video_progress?.current > 0 || progress.video_progress?.percentage > 0) {
      return progress.video_progress;
    }
    
    return progress.audio_progress || null;
  }, [audioOnly]);

  // Add a function to format progress info
  const formatProgressInfo = (info: ProgressInfo | null): { downloaded: string; speed: string; eta: string } => {
    if (!info) {
      console.log('No progress info available');
      return { downloaded: '0.00%', speed: '0 MB/s', eta: '--:--' };
    }
    
    // Calculate percentage if we have current/total
    const percentage = info.total > 0 
      ? ((info.current / info.total) * 100).toFixed(1) + '%'
      : info.downloaded || '0.00%';
    
    const formatted = {
      downloaded: percentage,
      speed: info.speed || '0 MB/s',
      eta: info.eta || '--:--'
    };
    
    console.log('Formatted progress info:', {
      raw: info,
      formatted
    });
    
    return formatted;
  };

  const isDownloadEnabled = () => {
    // Check if save name is provided
    if (!saveName.trim()) return false;

    // If audioOnly is true, only check audio stream
    if (audioOnly) {
      return audioStream !== '';
    }

    // Otherwise, require video quality
    return videoQuality !== '';
  };

  const handleDownload = async () => {
    if (!isDownloadEnabled()) return;

    console.log('Starting download...');
    setIsDownloading(true);
    setDownloadError('');
    setDownloadProgress(null);

    try {
      // Find the selected stream objects
      const selectedVideo = videoOptions.find(opt => opt.id === videoQuality);
      const selectedAudio = audioOptions.find(opt => opt.id === audioStream);
      const selectedSubtitle = subtitleOptions.find(opt => opt.id === subtitles);

      console.log('Selected streams:', {
        video: selectedVideo,
        audio: selectedAudio,
        subtitle: selectedSubtitle
      });

      // Gather all options
      const downloadOptions = {
        url: url,
        save_name: saveName,
        headers: headers.filter(header => header.key && header.value),
        video_quality: selectedVideo,
        audio_stream: selectedAudio,
        subtitles: selectedSubtitle,
        auto_merge: autoMerge,
        audio_only: audioOnly,
      };

      console.log('Download options:', downloadOptions);

      // Start download using Tauri invoke AFTER setting up listeners
      console.log('Starting download with Tauri invoke...');
      await invoke('start_download', { options: downloadOptions });

    } catch (error) {
      console.error('Download error:', error);
      setIsDownloading(false);
      setDownloadError(error instanceof Error ? error.message : String(error));
    }
  };

  // Add effect to log state changes
  useEffect(() => {
    console.log('State updated:', {
      isDownloading,
      downloadProgress,
      downloadError
    });
  }, [isDownloading, downloadProgress, downloadError]);

  // Add debug render log
  console.log('Rendering with state:', {
    isDownloading,
    hasProgress: !!downloadProgress,
    progressData: downloadProgress,
    error: downloadError
  });

  return (
    <div className="home-page">
      <h1>{t('homePage.welcome')}</h1>
      <div className="home-content">
        <div className="download-section">
          <div className="url-input-container">
            <div className="url-input-wrapper">
              <input 
                type="text" 
                placeholder={t('homePage.urlPlaceholder')} 
                className={`url-input ${urlError ? 'error' : ''}`}
                value={url}
                onChange={handleUrlChange}
              />
              {urlError && <div className="url-error">{urlError}</div>}
            </div>
            <button 
              className="load-options-button" 
              onClick={handleLoadOptions}
              disabled={!!urlError}
            >
              {t('homePage.loadOptions')}
            </button>
          </div>

          <div className="download-options">
            <div className="option-group">
              <h3>{t('homePage.basicOptions')}</h3>
              <div className="option-item">
                <label>{t('homePage.saveName')}</label>
                <input 
                  type="text" 
                  className="option-input"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                />
              </div>
              <div className="option-item">
                <label>{t('homePage.requestHeaders')}</label>
                <button 
                  className="headers-button"
                  onClick={() => setShowHeadersDialog(true)}
                >
                  {t('homePage.editHeaders')}
                </button>
              </div>
            </div>

            <div className="option-group">
              <h3>{t('homePage.mediaOptions')}</h3>
              <div className="option-item">
                <label>{t('homePage.videoQuality')}</label>
                <select 
                  className={`option-select ${videoOptions.length === 0 ? 'disabled' : ''}`}
                  value={videoQuality}
                  onChange={(e) => setVideoQuality(e.target.value)}
                  disabled={videoOptions.length === 0}
                >
                  {isLoading ? (
                    <option value="">{t('homePage.loadingQualities')}</option>
                  ) : videoOptions.length === 0 ? (
                    <option value="">{t('homePage.videoUnavailable')}</option>
                  ) : (
                    <>
                      <option value="">{t('homePage.selectQuality')}</option>
                      {videoOptions.map(option => (
                        <option key={option.id} value={option.id}>{option.description}</option>
                      ))}
                    </>
                  )}
                </select>
              </div>
              <div className="option-item">
                <label>{t('homePage.audioStream')}</label>
                <select 
                  className={`option-select ${audioOptions.length === 0 ? 'disabled' : ''}`}
                  value={audioStream}
                  onChange={(e) => setAudioStream(e.target.value)}
                  disabled={audioOptions.length === 0}
                >
                  {isLoading ? (
                    <option value="">{t('homePage.loadingAudio')}</option>
                  ) : audioOptions.length === 0 ? (
                    <option value="">{t('homePage.audioUnavailable')}</option>
                  ) : (
                    <>
                      <option value="">{t('homePage.selectAudio')}</option>
                      {audioOptions.map(option => (
                        <option key={option.id} value={option.id}>{option.description}</option>
                      ))}
                    </>
                  )}
                </select>
              </div>
              <div className="option-item">
                <label>{t('homePage.subtitles')}</label>
                <select 
                  className={`option-select ${subtitleOptions.length === 0 ? 'disabled' : ''}`}
                  value={subtitles}
                  onChange={(e) => setSubtitles(e.target.value)}
                  disabled={subtitleOptions.length === 0}
                >
                  {isLoading ? (
                    <option value="">{t('homePage.loadingSubtitles')}</option>
                  ) : subtitleOptions.length === 0 ? (
                    <option value="">{t('homePage.subtitlesUnavailable')}</option>
                  ) : (
                    <>
                      <option value="">{t('homePage.selectSubtitles')}</option>
                      {subtitleOptions.map(option => (
                        <option key={option.id} value={option.id}>{option.description}</option>
                      ))}
                    </>
                  )}
                </select>
              </div>
            </div>

            <div className="option-group">
              <h3>{t('homePage.advancedOptions')}</h3>
              <div className="option-item checkbox">
                <input 
                  type="checkbox"
                  checked={autoMerge}
                  onChange={(e) => setAutoMerge(e.target.checked)}
                />
                <label>{t('homePage.autoMerge')}</label>
              </div>
              <div className="option-item checkbox">
                <input 
                  type="checkbox"
                  checked={fastStart}
                  onChange={(e) => setFastStart(e.target.checked)}
                />
                <label>{t('homePage.fastStart')}</label>
              </div>
              <div className="option-item checkbox">
                <input 
                  type="checkbox"
                  checked={audioOnly}
                  onChange={(e) => setAudioOnly(e.target.checked)}
                />
                <label>{t('homePage.audioOnly')}</label>
              </div>
            </div>
          </div>

          <button 
            className="download-button"
            onClick={handleDownload}
            disabled={!isDownloadEnabled()}
            style={{ display: (isDownloading || (downloadStatus === 'complete' && !notificationDismissed)) ? 'none' : 'block' }}
          >
            {t('homePage.download')}
          </button>

          <div className="download-status">
            {isDownloading && downloadProgress && (
              <div className="download-progress">
                <div className="progress-section">
                  <div className="progress-header">
                    <span>{audioOnly ? t('homePage.audio') : t('homePage.download')}</span>
                    <span>{calculateOverallProgress(downloadProgress).toFixed(1)}%</span>
                  </div>
                  <div className="progress-bar">
                    <div 
                      className={`progress-fill ${downloadStatus === 'error' ? 'error' : ''}`}
                      style={{ width: `${calculateOverallProgress(downloadProgress)}%` }}
                    />
                  </div>
                  <div className="progress-details">
                    {(() => {
                      const info = getProgressInfo(downloadProgress);
                      const formatted = formatProgressInfo(info);
                      return (
                        <>
                          <span>{formatted.downloaded}</span>
                          <span>{formatted.speed}</span>
                          <span>ETA: {formatted.eta}</span>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
            {downloadStatus === 'error' && !notificationDismissed && (
              <div 
                className="download-error-notification"
                onClick={() => setNotificationDismissed(true)}
                style={{ cursor: 'pointer' }}
              >
                <div className="notification-content">
                  <span className="notification-icon">⚠️</span>
                  <span className="notification-text">{errorMessage || t('homePage.downloadFailed')}</span>
                </div>
              </div>
            )}
            {downloadStatus === 'complete' && !notificationDismissed && (
              <div 
                className="download-complete-notification"
                onClick={() => setNotificationDismissed(true)}
                style={{ cursor: 'pointer' }}
              >
                <div className="notification-content">
                  <span className="notification-icon">✓</span>
                  <span className="notification-text">{t('homePage.downloadComplete')}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showHeadersDialog && (
        <div className="dialog-overlay">
          <div className="headers-dialog">
            <div className="dialog-header">
              <h3>{t('homePage.headers.title')}</h3>
              <button 
                className="close-button"
                onClick={() => setShowHeadersDialog(false)}
              >
                ×
              </button>
            </div>
            <div className="dialog-content">
              {headers.map((header, index) => (
                <div key={index} className="header-input-group">
                  <input
                    type="text"
                    className="header-input"
                    placeholder={t('homePage.headers.key')}
                    value={header.key}
                    onChange={(e) => handleHeaderInputChange(index, 'key', e.target.value)}
                  />
                  <input
                    type="text"
                    className="header-input"
                    placeholder={t('homePage.headers.value')}
                    value={header.value}
                    onChange={(e) => handleHeaderInputChange(index, 'value', e.target.value)}
                  />
                  <button
                    className="remove-header-button"
                    onClick={() => handleRemoveHeader(index)}
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                className="add-header-button"
                onClick={handleAddHeader}
              >
                {t('homePage.headers.add')}
              </button>
            </div>
            <div className="dialog-footer">
              <button
                className="save-headers-button"
                onClick={() => setShowHeadersDialog(false)}
              >
                {t('homePage.headers.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;