### ClipForge

A lightweight, native macOS screen recording and video editing application built with Electron. ClipForge lets you capture your screen, trim recordings, and manage your clips—all in one streamlined interface.

### Features

- **Screen Recording**: Capture your entire screen or specific windows with system audio
- **Built-in Video Editor**: Trim and cut your recordings with an intuitive timeline interface
- **Media Library**: Organize and manage all your clips in one place
- **Video Preview**: Real-time playback with frame-accurate scrubbing
- **Quick Export**: Export your edited clips in various formats
- **Keyboard Shortcuts**: Efficient workflow with customizable shortcuts

### Tech Stack

- Electron + TypeScript
- React for UI
- FFmpeg for video processing
- Tailwind CSS for styling
- Vite for building

### Installation

1. Clone the repo — `git clone https://github.com/0xAmaan/clipforge.git .`
2. Install dependencies `bun i`
3. Build the application `bun make`
4. Set Permissions (most annoying part)
   1. System Settings > Privacy & Security > Screen & System Audio Recording
   2. Click the + and add the clipforge application from step 3 (in clipforge/out/clipforge-darwin-arm64/clipforge.app)
5. Open app
6. Confirm permission settings
7. Should work smoothly!