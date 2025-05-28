export interface Settings {
  download_location?: string;
  default_format?: string;
  auto_start?: boolean;
  concurrent_downloads?: string;
  timeout?: string;
  debug_mode?: boolean;
  tmp_dir?: string;
  thread_count?: string;
  download_retry_count?: string;
  check_segments_count?: boolean;
  binary_merge?: boolean;
  use_ffmpeg_concat_demuxer?: boolean;
  del_after_done?: boolean;
  no_date_info?: boolean;
  no_log?: boolean;
  write_meta_json?: boolean;
  append_url_params?: boolean;
  concurrent_download?: boolean;
  sub_only?: boolean;
  sub_format?: 'SRT' | 'VTT';
  auto_subtitle_fix?: boolean;
  log_level?: string;
  use_system_proxy?: boolean;
}

export interface MediaOptions {
  id: string;
  description: string;
}

export interface DownloadOptions {
  url: string;
  saveName: string;
  headers: Header[];
  videoQuality: MediaOptions | undefined;
  audioStream: MediaOptions | undefined;
  subtitles: MediaOptions | undefined;
  autoMerge: boolean;
  fastStart: boolean;
  audioOnly: boolean;
}

export interface Header {
  key: string;
  value: string;
}

export interface TauriAPI {
  settings: {
    get: () => Promise<Settings>;
    set: (settings: Settings) => Promise<boolean>;
    selectDirectory: () => Promise<string | null>;
  };
  startDownload: (options: DownloadOptions) => Promise<void>;
  onDownloadProgress: (callback: (progress: string) => void) => void;
  onDownloadComplete: (callback: (code: number) => void) => void;
  onDownloadError: (callback: (error: string) => void) => void;
  loadM3u8Options: (url: string, headers?: Header[]) => Promise<{
    video: MediaOptions[];
    audio: MediaOptions[];
    subtitles: MediaOptions[];
  }>;
}

declare global {
  interface Window {
    tauri: TauriAPI;
  }
}

export {}; 