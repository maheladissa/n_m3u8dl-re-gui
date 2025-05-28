# N_m3u8DL-RE GUI

A modern GUI for N_m3u8DL-RE built with Tauri, React, and TypeScript.

## Features

- Modern, responsive user interface
- Multi-language support (English and Chinese)
- Video quality selection
- Audio stream selection
- Subtitle selection
- Custom headers support
- Auto-merge options
- Settings management
- Download progress tracking

## Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later)
- [Rust](https://www.rust-lang.org/tools/install)
- [N_m3u8DL-RE](https://github.com/nilaoda/N_m3u8DL-RE) binary
- [FFmpeg](https://ffmpeg.org/download.html) binary

## Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Place the required binaries in the `bin` directory:
   - `N_m3u8DL-RE.exe` (Windows) or `N_m3u8DL-RE` (Linux/macOS)
   - `ffmpeg.exe` (Windows) or `ffmpeg` (Linux/macOS)
4. Start the development server:
   ```bash
   npm run tauri dev
   ```

## Building

To build the application:

```bash
npm run tauri build
```

The built application will be available in the `src-tauri/target/release` directory.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 