# N_m3u8DL-RE GUI

A graphical user interface for N_m3u8DL-RE built with Electron and React.

## Prerequisites

- Node.js (v18 or higher recommended)
- npm (v8 or higher recommended)

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