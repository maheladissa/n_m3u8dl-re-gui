#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::Command;
use std::path::PathBuf;
use std::fs;
use tauri::{
    api::path,
    Manager,
    Window,
    State,
};
use serde::{Deserialize, Serialize};
use regex::Regex;
use std::sync::{OnceLock, Mutex};

#[derive(Debug, Serialize, Deserialize, Clone)]
struct DownloadOptions {
    url: String,
    save_name: String,
    headers: Vec<Header>,
    video_quality: Option<StreamOption>,
    audio_stream: Option<StreamOption>,
    subtitles: Option<StreamOption>,
    auto_merge: bool,
    audio_only: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct Header {
    key: String,
    value: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct StreamOption {
    description: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, Default)]
struct Settings {
    download_location: Option<String>,
    default_format: Option<String>,
    auto_start: Option<bool>,
    concurrent_downloads: Option<String>,
    timeout: Option<String>,
    debug_mode: Option<bool>,
    tmp_dir: Option<String>,
    thread_count: Option<String>,
    download_retry_count: Option<String>,
    check_segments_count: Option<bool>,
    binary_merge: Option<bool>,
    use_ffmpeg_concat_demuxer: Option<bool>,
    del_after_done: Option<bool>,
    no_date_info: Option<bool>,
    no_log: Option<bool>,
    write_meta_json: Option<bool>,
    append_url_params: Option<bool>,
    concurrent_download: Option<bool>,
    sub_only: Option<bool>,
    sub_format: Option<String>,
    auto_subtitle_fix: Option<bool>,
    log_level: Option<String>,
    use_system_proxy: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct StreamInfo {
    video_streams: Vec<VideoStream>,
    audio_streams: Vec<AudioStream>,
    subtitle_streams: Vec<SubtitleStream>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct VideoStream {
    resolution: String,
    bitrate: String,
    fps: String,
    codec: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct AudioStream {
    id: String,
    name: String,
    language: String,
    channels: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct SubtitleStream {
    id: String,
    name: String,
    language: String,
}

#[derive(Debug, Serialize, Clone, Default)]
struct DownloadProgress {
    video_progress: ProgressInfo,
    audio_progress: ProgressInfo,
    subtitle_progress: ProgressInfo,
}

#[derive(Debug, Serialize, Clone, Default)]
struct ProgressInfo {
    current: i32,
    total: i32,
    percentage: f32,
    downloaded: String,
    total_size: String,
    speed: String,
    eta: String,
}

enum StreamType {
    Video,
    Audio,
    Subtitle,
}

// Add regex patterns as static variables
static PROGRESS_PATTERN: OnceLock<Regex> = OnceLock::new();

fn get_progress_pattern() -> &'static Regex {
    PROGRESS_PATTERN.get_or_init(|| {
        // Match format like: "Vid 960x540 | 2168 Kbps | 60 ------------------------------ 36/101 35.64% 56.60MB/163.34MB 5.12MBps 00:00:27"
        Regex::new(
            r"(?i)(?:Vid|Aud|Sub).*?[-]+\s+(\d+)/(\d+)\s+(\d+\.?\d*)%\s+((?:[\d\.]+(?:KB|MB)(?:/[\d\.]+MB)?)|[-\s]+)\s+((?:[\d\.]+(?:KB|MB)ps)|[-\s]+)\s+(\d+:\d+:\d+|--:--:--)"
        ).unwrap()
    })
}

fn get_bin_dir() -> PathBuf {
    // Get the project root directory by going up from current directory
    let current_dir = std::env::current_dir().unwrap();
    let project_root = if current_dir.ends_with("src-tauri") {
        current_dir.parent().unwrap()
    } else {
        &current_dir
    };

    println!("Project root directory: {:?}", project_root);

    // Try multiple possible locations
    let possible_paths = [
        project_root.join("bin"),
        project_root.parent().unwrap().join("bin"),
    ];

    for path in &possible_paths {
        println!("Checking possible bin directory: {:?}", path);
        if path.exists() {
            println!("Found bin directory at: {:?}", path);
            return path.clone();
        }
    }

    // If no existing bin directory found, create one in the project root
    let bin_dir = project_root.join("bin");
    println!("Creating new bin directory at: {:?}", bin_dir);
    fs::create_dir_all(&bin_dir).unwrap();
    bin_dir
}

fn get_settings_path() -> PathBuf {
    let app_dir = path::app_data_dir(&tauri::Config::default()).unwrap();
    println!("Settings directory: {:?}", app_dir);
    let settings_path = app_dir.join("settings.json");
    println!("Settings file path: {:?}", settings_path);
    settings_path
}

fn load_settings() -> Settings {
    let settings_path = get_settings_path();
    println!("Loading settings from: {:?}", settings_path);
    if settings_path.exists() {
        if let Ok(contents) = fs::read_to_string(&settings_path) {
            println!("Settings file contents: {}", contents);
            if let Ok(settings) = serde_json::from_str(&contents) {
                println!("Successfully loaded settings: {:?}", settings);
                return settings;
            }
        }
    }
    println!("No settings found, using defaults");
    Settings::default()
}

fn save_settings(settings: &Settings) -> Result<(), String> {
    let settings_path = get_settings_path();
    println!("Saving settings to: {:?}", settings_path);
    if let Some(parent) = settings_path.parent() {
        fs::create_dir_all(parent).map_err(|e| {
            println!("Failed to create settings directory: {:?}", e);
            e.to_string()
        })?;
    }
    let contents = serde_json::to_string_pretty(settings).map_err(|e| {
        println!("Failed to serialize settings: {:?}", e);
        e.to_string()
    })?;
    println!("Settings to save: {}", contents);
    fs::write(&settings_path, contents).map_err(|e| {
        println!("Failed to write settings file: {:?}", e);
        e.to_string()
    })
}

fn get_platform_binary_name(name: &str) -> String {
    if cfg!(target_os = "windows") {
        if name.ends_with(".exe") {
            name.to_string()
        } else {
            format!("{}.exe", name)
        }
    } else {
        name.to_string()
    }
}

#[tauri::command]
async fn check_required_binaries(window: Window) -> Result<(), String> {
    let bin_dir = get_bin_dir();
    println!("Looking for binaries in: {:?}", bin_dir);
    
    let required_binaries = ["N_m3u8DL-RE", "ffmpeg"];
    let mut missing_binaries = Vec::new();

    for binary in required_binaries.iter() {
        let binary_path = bin_dir.join(get_platform_binary_name(binary));
        println!("Checking for binary: {:?}", binary_path);
        println!("Binary exists: {}", binary_path.exists());
        if !binary_path.exists() {
            missing_binaries.push(binary.to_string());
        }
    }

    if !missing_binaries.is_empty() {
        println!("Missing binaries: {:?}", missing_binaries);
        window.emit("missing-binaries", missing_binaries).map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
async fn start_download(window: Window, options: DownloadOptions, state: State<'_, Mutex<Settings>>) -> Result<(), String> {
    println!("Starting download with options: {:?}", options);
    
    let bin_dir = get_bin_dir();
    let binary_path = bin_dir.join(get_platform_binary_name("N_m3u8DL-RE"));
    println!("Binary path: {:?}", binary_path);
    
    let mut args = vec![
        options.url,
        "--save-name".to_string(),
        options.save_name,
    ];
    println!("Initial args: {:?}", args);

    // Add headers
    for header in options.headers {
        args.push("--header".to_string());
        args.push(format!("{}: {}", header.key, header.value));
    }
    println!("Args after adding headers: {:?}", args);

    // Add stream selection options
    if let Some(video_quality) = options.video_quality {
        println!("Processing video quality: {:?}", video_quality);
        let parts: Vec<&str> = video_quality.description.split(" | ").collect();
        if parts.len() >= 4 {
            let resolution = parts[0];
            let bitrate = parts[1];
            let fps = parts[2];
            let codec = parts[3];
            let bw = bitrate.parse::<i32>().unwrap_or(0);
            args.push("-sv".to_string());
            args.push(format!("res={}:bwMin={}:bwMax={}:frame={}:codecs={}", 
                resolution, bw-1, bw+1, fps, codec));
            println!("Added video quality args: {:?}", &args[args.len()-2..]);
        } else {
            println!("Warning: Invalid video quality format: {:?}", parts);
        }
    }

    if let Some(audio_stream) = options.audio_stream {
        println!("Processing audio stream: {:?}", audio_stream);
        let parts: Vec<&str> = audio_stream.description.split(" | ").collect();
        if parts.len() >= 4 {
            args.push("-sa".to_string());
            args.push(format!("id={}:name={}:lang={}:ch={}", 
                parts[0], parts[1], parts[2], parts[3]));
            println!("Added audio stream args: {:?}", &args[args.len()-2..]);
        } else {
            println!("Warning: Invalid audio stream format: {:?}", parts);
        }
    }

    if let Some(subtitles) = options.subtitles {
        println!("Processing subtitles: {:?}", subtitles);
        let parts: Vec<&str> = subtitles.description.split(" | ").collect();
        if parts.len() >= 3 {
            args.push("-ss".to_string());
            args.push(format!("id={}:name={}:lang={}", 
                parts[0], parts[1], parts[2]));
            println!("Added subtitle args: {:?}", &args[args.len()-2..]);
        } else {
            println!("Warning: Invalid subtitle format: {:?}", parts);
        }
    }

    // Add muxing options
    if options.auto_merge {
        println!("Adding muxing options (auto_merge: true, audio_only: {})", options.audio_only);
        args.push("-M".to_string());
        args.push(format!("format=mkv:muxer=ffmpeg:bin_path=auto:skip_sub={}:keep=true", 
            options.audio_only));
        println!("Added muxing args: {:?}", &args[args.len()-2..]);
    }

    // Add other options from settings
    println!("Adding settings from state: {:?}", state);
    args.extend_from_slice(&[
        "--save-dir".to_string(),
        state.lock().unwrap().download_location.clone().unwrap_or_else(|| {
            path::download_dir().unwrap().join("m3u8").to_string_lossy().into_owned()
        }),
        "--tmp-dir".to_string(),
        state.lock().unwrap().tmp_dir.clone().unwrap_or_else(|| {
            path::download_dir().unwrap().join("m3u8/Temp").to_string_lossy().into_owned()
        }),
        "--thread-count".to_string(),
        state.lock().unwrap().thread_count.clone().unwrap_or_else(|| "16".to_string()),
        "--download-retry-count".to_string(),
        state.lock().unwrap().download_retry_count.clone().unwrap_or_else(|| "3".to_string()),
        "--sub-format".to_string(),
        state.lock().unwrap().sub_format.clone().unwrap_or_else(|| "SRT".to_string()),
        "--log-level".to_string(),
        state.lock().unwrap().log_level.clone().unwrap_or_else(|| "INFO".to_string()),
        "--force-ansi-console".to_string(),
    ]);
    println!("Final args: {:?}", args);

    println!("Executing command: {} {}", binary_path.display(), args.join(" "));
    
    // Use spawn to capture output in real-time
    let mut child = Command::new(binary_path)
        .args(&args)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| {
            println!("Command execution error: {:?}", e);
            e.to_string()
        })?;

    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();

    let stdout_reader = std::io::BufReader::new(stdout);
    let stderr_reader = std::io::BufReader::new(stderr);

    let mut current_progress = DownloadProgress::default();

    let window_clone = window.clone();

    std::thread::spawn(move || {
        for line in std::io::BufRead::lines(stdout_reader) {
            if let Ok(line) = line {
                println!("STDOUT: {}", line);

                if line.to_lowercase().contains("vid") ||
                line.to_lowercase().contains("aud") ||
                line.to_lowercase().contains("sub") {

                    match parse_progress_line(&line) {
                        Ok((stream_type, progress_info)) => {
                            match stream_type {
                                StreamType::Video => current_progress.video_progress = progress_info,
                                StreamType::Audio => current_progress.audio_progress = progress_info,
                                StreamType::Subtitle => current_progress.subtitle_progress = progress_info,
                            }

                            if let Err(e) = window_clone.emit("download-progress", current_progress.clone()) {
                                eprintln!("Failed to emit progress: {:?}", e);
                            }
                        },
                        Err(e) => eprintln!("Failed to parse progress line: {}", e),
                    }
                }
            }
        }
    });

    

    let window_clone = window.clone();
    std::thread::spawn(move || {
        for line in std::io::BufRead::lines(stderr_reader) {
            if let Ok(line) = line {
                println!("STDERR: {}", line);
                // Forward stderr to the frontend for error display
                if let Err(e) = window_clone.emit("download-error", line) {
                    eprintln!("Failed to emit error: {:?}", e);
                }
            }
        }
    });

    // Wait for the process to complete
    let status = child.wait().map_err(|e| e.to_string())?;

    if status.success() {
        println!("Download completed successfully");
        window.emit("download-complete", status.code()).map_err(|e| {
            println!("Error emitting download-complete event: {:?}", e);
            e.to_string()
        })?;
    } else {
        let error = format!("Process exited with status: {:?}", status);
        println!("Download failed with error: {}", error);
        window.emit("download-error", error).map_err(|e| {
            println!("Error emitting download-error event: {:?}", e);
            e.to_string()
        })?;
    }

    Ok(())
}

fn parse_progress_line(line: &str) -> Result<(StreamType, ProgressInfo), String> {
    let pattern = get_progress_pattern();

    if let Some(caps) = pattern.captures(line) {
        let current = caps[1].parse::<i32>().map_err(|e| format!("Failed to parse current: {}", e))?;
        let total = caps[2].parse::<i32>().map_err(|e| format!("Failed to parse total: {}", e))?;
        let percentage = caps[3].parse::<f32>().map_err(|e| format!("Failed to parse percentage: {}", e))?;
        let downloaded = caps[4].trim().to_string();
        let speed = caps[5].trim().to_string();
        let eta = caps[6].trim().to_string();

        let progress_info = ProgressInfo {
            current,
            total,
            percentage,
            downloaded,
            total_size: String::new(), // Still not used
            speed,
            eta,
        };

        // Identify the stream type
        let stream_type = if line.to_lowercase().contains("vid") {
            StreamType::Video
        } else if line.to_lowercase().contains("aud") {
            StreamType::Audio
        } else if line.to_lowercase().contains("sub") {
            StreamType::Subtitle
        } else {
            return Err(format!("Unknown stream type in line: {}", line));
        };

        Ok((stream_type, progress_info))
    } else {
        Err(format!("Failed to match progress pattern in line: {}", line))
    }
}

#[tauri::command]
async fn load_m3u8_options(window: Window, url: String, headers: Vec<Header>) -> Result<(), String> {
    let bin_dir = get_bin_dir();
    let binary_path = bin_dir.join(get_platform_binary_name("N_m3u8DL-RE"));
    
    let mut args = vec![url];
    
    for header in headers {
        args.push("-H".to_string());
        args.push(format!("{}: {}", header.key, header.value));
    }

    args.push("--write-meta-json".to_string());
    args.push("false".to_string());
    args.push("--del-after-done".to_string());
    

    // Log the command being executed
    println!("Executing command: {} {}", binary_path.display(), args.join(" "));

    let output = Command::new(binary_path)
        .args(&args)
        .output()
        .map_err(|e| e.to_string())?;

    // Log the command output
    println!("Command stdout: {}", String::from_utf8_lossy(&output.stdout));
    println!("Command stderr: {}", String::from_utf8_lossy(&output.stderr));

    let output_str = String::from_utf8_lossy(&output.stdout);
    
    // Parse the output into structured data
    let mut stream_info = StreamInfo {
        video_streams: Vec::new(),
        audio_streams: Vec::new(),
        subtitle_streams: Vec::new(),
    };

    for line in output_str.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }

        // Parse video streams
        if line.contains("INFO : Vid") {
            // Format: [timestamp] INFO : Vid 1920x1080 | 7968 Kbps | 60 | avc1.64002a
            let parts: Vec<&str> = line.split("INFO : Vid").collect();
            if parts.len() == 2 {
                let stream_parts: Vec<&str> = parts[1].split('|').map(|s| s.trim()).collect();
                if stream_parts.len() >= 4 {
                    // Extract numeric part from bitrate by removing 'Kbps'
                    let bitrate = stream_parts[1].replace("Kbps", "").trim().to_string();                
                    stream_info.video_streams.push(VideoStream {
                        resolution: stream_parts[0].to_string(),
                        bitrate,
                        fps: stream_parts[2].to_string(),
                        codec: stream_parts[3].to_string(),
                    });
                }
            }
        }
        // Parse audio streams
        else if line.contains("INFO : Aud") {
            // Format: [timestamp] INFO : Aud aud2 | English | en | 6CH
            let parts: Vec<&str> = line.split("INFO : Aud").collect();
            if parts.len() == 2 {
                let stream_parts: Vec<&str> = parts[1].split('|').map(|s| s.trim()).collect();
                if stream_parts.len() >= 4 {
                    stream_info.audio_streams.push(AudioStream {
                        id: stream_parts[0].to_string(),
                        name: stream_parts[1].to_string(),
                        language: stream_parts[2].to_string(),
                        channels: stream_parts[3].to_string(),
                    });
                }
            }
        }
        // Parse subtitle streams
        else if line.contains("INFO : Sub") {
            // Format: [timestamp] INFO : Sub sub1 | en | English
            let parts: Vec<&str> = line.split("INFO : Sub").collect();
            if parts.len() == 2 {
                let stream_parts: Vec<&str> = parts[1].split('|').map(|s| s.trim()).collect();
                if stream_parts.len() >= 3 {
                    stream_info.subtitle_streams.push(SubtitleStream {
                        id: stream_parts[0].to_string(),
                        language: stream_parts[1].to_string(),
                        name: stream_parts[2].to_string(),
                    });
                }
            }
        }
    }

    // Send the structured data to the frontend
    window.emit("m3u8-options", stream_info).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn get_settings(state: State<'_, Mutex<Settings>>) -> Result<Settings, String> {
    let settings = state.lock().unwrap().clone();
    println!("Getting current settings: {:?}", settings);
    Ok(settings)
}

#[tauri::command]
async fn set_settings(settings: Settings, state: State<'_, Mutex<Settings>>) -> Result<(), String> {
    println!("Setting new settings: {:?}", settings);
    save_settings(&settings)?;
    let mut state = state.lock().unwrap();
    *state = settings;
    println!("Settings updated in state");
    Ok(())
}

fn main() {
    let settings = Mutex::new(load_settings());
    
    tauri::Builder::default()
        .manage(settings)
        .invoke_handler(tauri::generate_handler![
            check_required_binaries,
            start_download,
            load_m3u8_options,
            get_settings,
            set_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
} 