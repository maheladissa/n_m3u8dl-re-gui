# N_m3u8DL-RE GUI

A graphical user interface for N_m3u8DL-RE built with Electron and React.

## Prerequisites

- Node.js (v18 or higher recommended)
- npm (v8 or higher recommended)

## Required Binaries

This application requires the following binaries to be present in the `bin` directory:

- `N_m3u8DL-RE` - The core downloader engine
- `ffmpeg` - For media processing and merging

You need to download these binaries yourself and place them in the `bin` directory:
1. Download N_m3u8DL-RE from its [official releases](https://github.com/nilaoda/N_m3u8DL-RE/releases)
2. Download ffmpeg from [ffmpeg.org](https://ffmpeg.org/download.html) or use a package manager

## Credits

This project uses the following open-source software:
- [N_m3u8DL-RE](https://github.com/nilaoda/N_m3u8DL-RE) - The core downloader engine
- [FFmpeg](https://ffmpeg.org/) - For media processing and merging

## Installation

```bash
# Install dependencies
npm install
```

## Development

```bash
# Run the app in development mode
npm run dev
```

This will start both the webpack dev server for React and the Electron app.

## Building for Production

```bash
# Build the app for production
npm run build

# Start the production build
npm start
```

## Project Structure

- `main.js` - Main Electron process
- `preload.js` - Preload script for secure renderer process
- `src/` - React application source code
- `public/` - Static assets 