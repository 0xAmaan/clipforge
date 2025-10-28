# ClipForge - Implementation Plan

**Project:** Desktop Video Editor (Electron + React + Konva + FFmpeg)
**MVP Deadline:** Tuesday, October 28th at 10:59 PM CT
**Final Submission:** Wednesday, October 29th at 10:59 PM CT
**Strategy:** MVP-first approach with parallelizable feature development

---

## Table of Contents
1. [Tech Stack & Architecture](#tech-stack--architecture)
2. [MVP Requirements](#mvp-requirements)
3. [Implementation Phases](#implementation-phases)
4. [Parallelization Strategy](#parallelization-strategy)
5. [File Structure](#file-structure)
6. [Key Concepts & How Things Work](#key-concepts--how-things-work)
7. [User Flow](#user-flow)
8. [Testing Checklist](#testing-checklist)

---

## Tech Stack & Architecture

### Core Technologies

#### 1. **Desktop Framework: Electron**
- **Version:** 39.0.0 (latest)
- **Build Tool:** Electron Forge with Vite
- **Language:** TypeScript
- **Status:** ✅ Already configured and working

**What it does:**
- Wraps our web app (React) in a native desktop window
- Provides access to Node.js APIs (file system, native dialogs, etc.)
- Handles main process (Node.js) and renderer process (browser/React) communication

---

#### 2. **Frontend Framework: React 18**
- **UI Library:** React with TypeScript
- **Build Tool:** Vite (already configured)
- **Bundler:** Vite Plugin React

**Packages to install:**
```bash
bun add react react-dom
bun add -d @vitejs/plugin-react @types/react @types/react-dom
```

**Why React:**
- Component-based architecture for timeline, player, controls
- Great ecosystem and TypeScript support
- Vite has first-class React support

---

#### 3. **Video Processing: FFmpeg**
- **Package:** `fluent-ffmpeg` (Node.js wrapper)
- **Binary:** `ffmpeg-static` (bundled FFmpeg binary)
- **Location:** Main process only (Node.js environment)

**Packages to install:**
```bash
bun add fluent-ffmpeg ffmpeg-static
bun add -d @types/fluent-ffmpeg
```

**What FFmpeg does:**
- Extract video metadata (duration, resolution, codec, fps)
- Trim videos (set start/end timestamps)
- Concatenate multiple clips
- Re-encode videos to different formats/resolutions
- Generate thumbnails from video frames

**Why Option A (fluent-ffmpeg + ffmpeg-static):**
- ✅ Runs in main process (fast, native performance)
- ✅ Bundles FFmpeg binary automatically (no user installation needed)
- ✅ Reliable and production-ready
- ⚠️ Increases app size by ~50MB (acceptable tradeoff)

**Alternative (NOT using):**
- `@ffmpeg/ffmpeg` (WebAssembly): Slower, memory-intensive, experimental

---

#### 4. **Timeline UI: Konva.js (Canvas-based)**
- **Package:** `konva` (core library)
- **React Integration:** `react-konva` (official React bindings)

**Packages to install:**
```bash
bun add konva react-konva
bun add -d @types/konva
```

**What is Canvas-based vs DOM-based?**

**DOM-based (HTML/CSS):**
```tsx
<div className="timeline">
  <div className="clip" style={{ left: 0, width: 200 }}>Clip 1</div>
  <div className="clip" style={{ left: 200, width: 150 }}>Clip 2</div>
</div>
```
- Each clip = separate HTML element
- Browser renders each individually
- **Problem:** Laggy with 10+ clips (DOM reflow/repaint overhead)

**Canvas-based (Konva.js):**
```tsx
<Stage width={800} height={100}>
  <Layer>
    <Rect x={0} y={0} width={200} height={80} fill="blue" draggable />
    <Rect x={200} y={0} width={150} height={80} fill="green" draggable />
  </Layer>
</Stage>
```
- Everything drawn on a single `<canvas>` element
- Konva handles all rendering optimizations
- **Benefit:** Smooth with 100+ clips, efficient drag/resize

**Why Konva.js over Fabric.js:**
- ✅ Official React bindings (`react-konva`)
- ✅ Easier learning curve
- ✅ Perfect for timeline/interactive apps
- ✅ Better documentation for React integration

---

#### 5. **Video Player: HTML5 `<video>` Element**
- **For MVP:** Native HTML5 video element
- **Post-MVP Upgrade:** Consider `react-player` for advanced features

**Why native HTML5:**
- ✅ No dependencies needed
- ✅ Simple API: play(), pause(), currentTime, duration
- ✅ Built-in scrubbing support
- ✅ Works with file:// URLs (local video files)

**Example:**
```tsx
<video
  ref={videoRef}
  src={`file://${videoPath}`}
  onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
  width={640}
  height={360}
/>
```

---

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                       ELECTRON APP                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │         MAIN PROCESS (Node.js)                            │  │
│  │  - Window management (BrowserWindow)                      │  │
│  │  - FFmpeg video processing (trim, export, metadata)       │  │
│  │  - File system access (import, save)                      │  │
│  │  - IPC handlers (exposes APIs to renderer)                │  │
│  │                                                            │  │
│  │  Key APIs:                                                 │  │
│  │  • openFile() → Shows file picker, returns path           │  │
│  │  • getVideoMetadata(path) → Returns duration, resolution  │  │
│  │  • trimVideo(input, output, start, end) → Exports clip    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ▲                                   │
│                              │ IPC (contextBridge)               │
│                              ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │         PRELOAD SCRIPT (Security Bridge)                  │  │
│  │  - Exposes safe APIs from main → renderer                 │  │
│  │  - Prevents direct access to Node.js (security)           │  │
│  │                                                            │  │
│  │  window.electronAPI = {                                   │  │
│  │    openFile: () => ipcRenderer.invoke('open-file'),       │  │
│  │    trimVideo: (...) => ipcRenderer.invoke('trim-video'),  │  │
│  │  }                                                         │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              ▲                                   │
│                              │                                   │
│                              ▼                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │    RENDERER PROCESS (React + TypeScript)                  │  │
│  │                                                            │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  App.tsx (Main Component)                           │  │  │
│  │  │  - Application state (video file, trim points)      │  │  │
│  │  │  - Coordinates all components                       │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  VideoPlayer.tsx                                     │  │  │
│  │  │  - HTML5 <video> element                            │  │  │
│  │  │  - Play/pause controls                              │  │  │
│  │  │  - Current time display                             │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  Timeline.tsx (Konva Canvas)                        │  │  │
│  │  │  - Stage (container)                                │  │  │
│  │  │  - Layer (drawing surface)                          │  │  │
│  │  │  - Clip rectangle (draggable, resizable)            │  │  │
│  │  │  - Playhead (red line showing current time)         │  │  │
│  │  │  - Trim handles (adjust start/end)                  │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  Controls.tsx                                        │  │  │
│  │  │  - Import button (triggers IPC openFile)            │  │  │
│  │  │  - Trim start/end inputs (set via timeline)         │  │  │
│  │  │  - Export button (triggers IPC trimVideo)           │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │                                                            │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

### IPC (Inter-Process Communication) Flow

**Problem:** React (renderer) runs in a sandboxed browser environment. It **cannot** directly access:
- File system (to read/write videos)
- Node.js modules (like FFmpeg)
- Native OS dialogs (file picker)

**Solution:** Use IPC to communicate between renderer (React) and main (Node.js)

#### Step 1: Preload Script (Bridge)
**File:** `src/preload.ts`

```typescript
import { contextBridge, ipcRenderer } from 'electron';

// Expose safe APIs to renderer
contextBridge.exposeInMainWorld('electronAPI', {
  // File operations
  openFile: () => ipcRenderer.invoke('open-file'),

  // Video operations
  getVideoMetadata: (filePath: string) =>
    ipcRenderer.invoke('get-video-metadata', filePath),

  trimVideo: (input: string, output: string, start: number, end: number) =>
    ipcRenderer.invoke('trim-video', input, output, start, end),

  // Progress updates (for export)
  onExportProgress: (callback: (progress: number) => void) =>
    ipcRenderer.on('export-progress', (_, progress) => callback(progress)),
});
```

**What this does:**
- Creates `window.electronAPI` object in renderer
- Each method sends a message to main process via IPC
- Main process handles the actual file/FFmpeg operations

---

#### Step 2: Main Process Handlers
**File:** `src/main.ts`

```typescript
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import path from 'path';

ffmpeg.setFfmpegPath(ffmpegPath);

// Handler: Open file picker
ipcMain.handle('open-file', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: [
      { name: 'Videos', extensions: ['mp4', 'mov', 'webm', 'avi'] }
    ]
  });

  if (result.canceled) return null;
  return result.filePaths[0];
});

// Handler: Get video metadata
ipcMain.handle('get-video-metadata', async (event, filePath) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) reject(err);

      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      resolve({
        duration: metadata.format.duration,
        width: videoStream.width,
        height: videoStream.height,
        fps: eval(videoStream.r_frame_rate), // "30/1" -> 30
      });
    });
  });
});

// Handler: Trim video
ipcMain.handle('trim-video', async (event, input, output, start, end) => {
  const mainWindow = BrowserWindow.getAllWindows()[0];

  return new Promise((resolve, reject) => {
    ffmpeg(input)
      .setStartTime(start)
      .setDuration(end - start)
      .output(output)
      .on('progress', (progress) => {
        // Send progress updates to renderer
        mainWindow.webContents.send('export-progress', progress.percent);
      })
      .on('end', () => resolve(output))
      .on('error', (err) => reject(err))
      .run();
  });
});
```

---

#### Step 3: React Component Usage
**File:** `src/App.tsx`

```tsx
import { useState } from 'react';

function App() {
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [metadata, setMetadata] = useState(null);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  const handleImport = async () => {
    const filePath = await window.electronAPI.openFile();
    if (!filePath) return;

    setVideoPath(filePath);

    const meta = await window.electronAPI.getVideoMetadata(filePath);
    setMetadata(meta);
    setTrimEnd(meta.duration); // Default to full video
  };

  const handleExport = async () => {
    const outputPath = videoPath.replace('.mp4', '_trimmed.mp4');
    await window.electronAPI.trimVideo(videoPath, outputPath, trimStart, trimEnd);
    alert('Export complete!');
  };

  return (
    <div>
      <button onClick={handleImport}>Import Video</button>
      {videoPath && (
        <>
          <VideoPlayer src={videoPath} />
          <Timeline
            duration={metadata.duration}
            trimStart={trimStart}
            trimEnd={trimEnd}
            onTrimChange={(start, end) => {
              setTrimStart(start);
              setTrimEnd(end);
            }}
          />
          <button onClick={handleExport}>Export</button>
        </>
      )}
    </div>
  );
}
```

**TypeScript declarations for window.electronAPI:**
Create `src/global.d.ts`:
```typescript
export {};

declare global {
  interface Window {
    electronAPI: {
      openFile: () => Promise<string | null>;
      getVideoMetadata: (filePath: string) => Promise<{
        duration: number;
        width: number;
        height: number;
        fps: number;
      }>;
      trimVideo: (input: string, output: string, start: number, end: number) => Promise<string>;
      onExportProgress: (callback: (progress: number) => void) => void;
    };
  }
}
```

---

## MVP Requirements

**Hard Deadline:** Tuesday, October 28th at 10:59 PM CT

### Must-Have Features

✅ **Desktop app that launches**
- Already working (Electron Forge setup complete)

✅ **Basic video import**
- File picker button (not drag & drop for MVP)
- Support MP4, MOV formats
- Display file name and duration

✅ **Simple timeline view**
- Konva canvas showing imported clip as rectangle
- Time markers (0s, 10s, 20s, etc.)
- Visual representation of clip duration

✅ **Video preview player**
- HTML5 video element
- Play/pause button
- Current time display

✅ **Basic trim functionality**
- Drag timeline handles to set in/out points
- Display trim start/end times
- Preview updates to show trimmed section

✅ **Export to MP4**
- Export button triggers FFmpeg
- Saves trimmed video to disk
- Shows completion message

✅ **Built and packaged**
- Run `bun run make` successfully
- Test packaged app (not just dev mode)
- Works on macOS (primary platform)

---

### Explicitly OUT of Scope for MVP

❌ Drag & drop import (use file picker instead)
❌ Multiple clips on timeline
❌ Screen recording
❌ Webcam recording
❌ Media library panel
❌ Multiple tracks
❌ Text overlays
❌ Transitions
❌ Filters/effects
❌ Audio controls
❌ Undo/redo
❌ Auto-save

**Philosophy:** Ship a working single-clip trimmer. Add features after MVP passes.

---

## Implementation Phases

### Phase 1: Setup React + FFmpeg (2-3 hours)

**Goal:** Get dependencies installed and configured

**Tasks:**
1. Install React dependencies
   ```bash
   bun add react react-dom
   bun add -d @vitejs/plugin-react @types/react @types/react-dom
   ```

2. Install Konva dependencies
   ```bash
   bun add konva react-konva
   bun add -d @types/konva
   ```

3. Install FFmpeg dependencies
   ```bash
   bun add fluent-ffmpeg ffmpeg-static
   bun add -d @types/fluent-ffmpeg
   ```

4. Configure Vite for React
   - Update `vite.renderer.config.ts` to include React plugin

5. Set up basic React app structure
   - Convert `renderer.ts` → `renderer.tsx`
   - Create `App.tsx` with basic layout
   - Create `global.d.ts` for TypeScript types

6. Test FFmpeg in main process
   - Add simple metadata extraction handler
   - Test with a sample video file

**Deliverable:** App launches with React "Hello World" and FFmpeg works in background

---

### Phase 2: File Import + Video Player (2-3 hours)

**Goal:** Load a video file and play it

**Tasks:**
1. Create IPC handler for file picker (`open-file`)
   - Add to `src/main.ts`
   - Filter for video formats (mp4, mov, webm)

2. Create IPC handler for video metadata (`get-video-metadata`)
   - Use FFmpeg ffprobe to extract duration, resolution
   - Return metadata to renderer

3. Update preload script
   - Expose `openFile()` and `getVideoMetadata()` APIs

4. Create `VideoPlayer.tsx` component
   - HTML5 video element
   - Play/pause button
   - Current time display (MM:SS format)
   - Scrubbing support (click on timeline)

5. Create `Controls.tsx` component
   - Import button (triggers file picker)
   - Display video filename and duration

6. Update `App.tsx`
   - State management for video file and metadata
   - Wire up import button to IPC

**Deliverable:** Click "Import" → Select video → Video loads and plays

---

### Phase 3: Timeline with Trim (3-4 hours)

**Goal:** Visual timeline with draggable trim handles

**Tasks:**
1. Create `Timeline.tsx` component (Konva)
   - Stage and Layer setup
   - Time scale calculation (seconds → pixels)
   - Time markers every 10 seconds

2. Add clip rectangle
   - Blue rectangle representing video duration
   - Width = duration × pixels per second

3. Add playhead (red vertical line)
   - Syncs with video player current time
   - Updates on video playback
   - Draggable to scrub

4. Add trim handles
   - Left handle: Adjust trim start
   - Right handle: Adjust trim end
   - Visual feedback when dragging

5. Sync timeline with player
   - Timeline drag → Update video currentTime
   - Video playback → Update playhead position
   - Trim handles → Clamp video playback to trimmed section

6. Add trim time displays
   - Show "Trim Start: 00:05" and "Trim End: 00:25"
   - Update in real-time as handles move

**Deliverable:** Timeline shows clip, drag handles to trim, video plays trimmed section

---

### Phase 4: Export (1-2 hours)

**Goal:** Save trimmed video to disk

**Tasks:**
1. Create IPC handler for export (`trim-video`)
   - Use fluent-ffmpeg to trim video
   - Input: original file, output path, start time, end time
   - Output: Trimmed MP4 file

2. Add export progress tracking
   - FFmpeg emits progress events
   - Send progress to renderer via IPC
   - Display progress bar (0-100%)

3. Create `ExportButton.tsx` component
   - Trigger export on click
   - Show "Exporting..." with progress
   - Show "Export complete!" with file path

4. Add output file naming
   - Default: `{original_name}_trimmed.mp4`
   - Save to same directory as source file
   - (Optional: Let user choose output location)

5. Error handling
   - Show error message if export fails
   - Validate trim times (start < end, within duration)

**Deliverable:** Click "Export" → FFmpeg trims video → File saved to disk

---

### Phase 5: Package & Test (1-2 hours)

**Goal:** Create distributable app and test it

**Tasks:**
1. Build the app
   ```bash
   bun run make
   ```
   - Creates distributable in `out/` directory
   - macOS: `.app` file
   - Windows: `.exe` installer

2. Test packaged app (NOT dev mode)
   - Launch the built `.app` file
   - Test full workflow: Import → Trim → Export
   - Verify FFmpeg binary is bundled correctly

3. Fix packaging issues
   - Ensure FFmpeg binary path is correct in production
   - Check file:// URL handling for videos
   - Test on different video formats

4. Create README.md
   - Installation instructions
   - How to run in dev mode
   - How to build distributable
   - System requirements

5. Record demo video
   - 3-5 minute walkthrough
   - Show import, timeline editing, export
   - Include before/after video comparison

**Deliverable:** Packaged app that works outside dev environment

---

## Parallelization Strategy

**Key Insight:** After Phase 1 (setup) is complete, we can parallelize independent feature development using multiple agents.

### Prerequisites (Must be done first)
- ✅ Phase 1: Setup React + FFmpeg (foundation for all features)
- ✅ Basic project structure established
- ✅ IPC architecture in place

### Parallel Development Groups

Once setup is complete, we can split into **3 concurrent work streams**:

#### 🟦 Agent 1: Video Player & Import
**Scope:** Everything related to loading and playing videos

**Tasks:**
- File picker IPC handler
- Video metadata extraction
- VideoPlayer component (HTML5 video)
- Play/pause controls
- Current time display
- File validation

**Dependencies:** None (can start immediately after Phase 1)

**Estimated Time:** 2-3 hours

**Output Files:**
- `src/components/VideoPlayer.tsx`
- `src/components/Controls.tsx`
- `src/main.ts` (IPC handlers for file operations)

---

#### 🟩 Agent 2: Timeline UI (Konva)
**Scope:** Canvas-based timeline with visual representation

**Tasks:**
- Konva Stage/Layer setup
- Clip rectangle rendering
- Time scale and markers
- Playhead rendering
- Timeline state management
- Time formatting utilities

**Dependencies:** None (can work with mock data initially)

**Estimated Time:** 2-3 hours

**Output Files:**
- `src/components/Timeline.tsx`
- `src/utils/timeFormat.ts`
- `src/hooks/useTimeline.ts` (state management)

---

#### 🟨 Agent 3: Trim Logic & Export
**Scope:** Trim handles, FFmpeg export, progress tracking

**Tasks:**
- Trim handle components (drag left/right)
- Trim state synchronization
- FFmpeg trim IPC handler
- Export progress tracking
- Export button UI
- Error handling

**Dependencies:** Needs basic timeline structure from Agent 2

**Estimated Time:** 2-3 hours

**Output Files:**
- `src/components/TrimHandles.tsx`
- `src/components/ExportButton.tsx`
- `src/main.ts` (FFmpeg export handler)

---

### Integration Phase

After parallel work completes, we integrate all three:

**Tasks:**
1. Wire up VideoPlayer currentTime ↔ Timeline playhead
2. Connect Timeline trim handles ↔ Video player bounds
3. Connect Export button ↔ Trim state
4. End-to-end testing

**Estimated Time:** 1 hour

---

### Parallelization Workflow

```
START
  ↓
[Phase 1: Setup] ← Do this first (sequential, ~2-3 hours)
  ↓
  ├─────────────┬─────────────┬─────────────┐
  ↓             ↓             ↓             ↓
[Agent 1]   [Agent 2]     [Agent 3]    [Main]
Video       Timeline      Trim &       Monitor
Player      Canvas        Export       Progress
  ↓             ↓             ↓             ↓
  └─────────────┴─────────────┴─────────────┘
                ↓
        [Integration Phase] ← Bring it all together (~1 hour)
                ↓
        [Phase 5: Package & Test]
                ↓
              DONE
```

**Total Time with Parallelization:**
- Phase 1: 2-3 hours (sequential)
- Parallel work: 2-3 hours (instead of 6-9 hours)
- Integration: 1 hour
- Packaging: 1-2 hours
- **Total: 6-9 hours** (vs 9-14 hours sequential)

---

### Communication Between Agents

**Shared Contracts (TypeScript Interfaces):**

Create `src/types.ts` after Phase 1:

```typescript
// Shared state structure
export interface VideoState {
  filePath: string | null;
  duration: number;
  currentTime: number;
  trimStart: number;
  trimEnd: number;
  isPlaying: boolean;
}

// Video metadata
export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
}

// Component props
export interface VideoPlayerProps {
  videoPath: string | null;
  currentTime: number;
  trimStart: number;
  trimEnd: number;
  onTimeUpdate: (time: number) => void;
  onPlayPause: (isPlaying: boolean) => void;
}

export interface TimelineProps {
  duration: number;
  currentTime: number;
  trimStart: number;
  trimEnd: number;
  onSeek: (time: number) => void;
  onTrimChange: (start: number, end: number) => void;
}

export interface ExportProps {
  videoPath: string;
  trimStart: number;
  trimEnd: number;
  onExportComplete: (outputPath: string) => void;
}
```

**Why this works:**
- Each agent implements components matching these interfaces
- Main `App.tsx` coordinates state between components
- No circular dependencies between parallel work streams

---

## File Structure

**After complete implementation:**

```
clipforge/
├── src/
│   ├── main.ts                    # Electron main process
│   │                              # - Window management
│   │                              # - IPC handlers
│   │                              # - FFmpeg operations
│   │
│   ├── preload.ts                 # IPC bridge (contextBridge)
│   │
│   ├── renderer.tsx               # React entry point
│   ├── App.tsx                    # Main React component
│   │                              # - State management
│   │                              # - Coordinates all components
│   │
│   ├── global.d.ts                # TypeScript declarations
│   │                              # - window.electronAPI types
│   │
│   ├── types.ts                   # Shared interfaces
│   │                              # - VideoState, Metadata, Props
│   │
│   ├── components/
│   │   ├── VideoPlayer.tsx        # HTML5 video + controls
│   │   ├── Timeline.tsx           # Konva canvas timeline
│   │   ├── TrimHandles.tsx        # Draggable trim controls
│   │   ├── Controls.tsx           # Import/export buttons
│   │   └── ExportButton.tsx       # Export with progress
│   │
│   ├── hooks/
│   │   ├── useVideoMetadata.ts    # Fetch video metadata
│   │   └── useTimeline.ts         # Timeline state logic
│   │
│   ├── utils/
│   │   ├── timeFormat.ts          # Format seconds to MM:SS
│   │   └── pixelTimeConversion.ts # Pixels ↔ seconds for timeline
│   │
│   ├── styles/
│   │   └── app.css                # Global styles
│   │
│   └── index.css                  # Vite injected styles
│
├── index.html                     # Main HTML entry
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript config
├── forge.config.ts                # Electron Forge config
├── vite.main.config.ts            # Vite config (main process)
├── vite.preload.config.ts         # Vite config (preload)
├── vite.renderer.config.ts        # Vite config (renderer)
├── .gitignore
├── README.md                      # Setup instructions
├── plan.md                        # This file
└── ClipForge.md                   # Project requirements
```

---

## Key Concepts & How Things Work

### 1. Canvas-Based Timeline (Konva.js)

**Visual Breakdown:**

```
Konva Stage (800x100px)
┌────────────────────────────────────────────────────────┐
│  Timeline Layer                                         │
│  ┌──────────────────────────────┐                      │
│  │ [Clip Rectangle]              │ ← Draggable Rect    │
│  │ Duration: 30s                 │                      │
│  └──────────────────────────────┘                      │
│  ▲                              ▲                       │
│  │                              │                       │
│ [Left Handle]              [Right Handle] ← Trim points│
│  │                                                      │
│  │──────────|────────|────────|────────|───────        │
│  0s       10s       20s      30s      40s   ← Markers  │
│                                                         │
│                      ▼ Playhead (current time)          │
│                      │                                  │
│                   [Red Line]                            │
└────────────────────────────────────────────────────────┘
```

**Key Konva Concepts:**

1. **Stage:** The container (like a `<div>`)
2. **Layer:** A drawing surface (like Photoshop layers)
3. **Shapes:** Rectangles, circles, lines, text
4. **Events:** onClick, onDragMove, onDragEnd

**Example Code:**

```tsx
import { Stage, Layer, Rect, Line, Text } from 'react-konva';

function Timeline({ duration, currentTime, trimStart, trimEnd, onTrimChange }) {
  const PIXELS_PER_SECOND = 10;
  const timeToPixels = (time) => time * PIXELS_PER_SECOND;
  const pixelsToTime = (pixels) => pixels / PIXELS_PER_SECOND;

  return (
    <Stage width={800} height={100}>
      <Layer>
        {/* Clip rectangle */}
        <Rect
          x={timeToPixels(trimStart)}
          y={20}
          width={timeToPixels(trimEnd - trimStart)}
          height={60}
          fill="rgba(59, 130, 246, 0.5)" // Blue
          stroke="rgb(59, 130, 246)"
          strokeWidth={2}
        />

        {/* Left trim handle */}
        <Rect
          x={timeToPixels(trimStart) - 5}
          y={20}
          width={10}
          height={60}
          fill="white"
          stroke="black"
          strokeWidth={1}
          draggable={true}
          dragBoundFunc={(pos) => {
            // Constrain to timeline bounds
            const newX = Math.max(0, Math.min(pos.x, timeToPixels(trimEnd) - 10));
            return { x: newX, y: 20 };
          }}
          onDragEnd={(e) => {
            const newStart = pixelsToTime(e.target.x() + 5);
            onTrimChange(newStart, trimEnd);
          }}
        />

        {/* Right trim handle */}
        <Rect
          x={timeToPixels(trimEnd) - 5}
          y={20}
          width={10}
          height={60}
          fill="white"
          stroke="black"
          strokeWidth={1}
          draggable={true}
          dragBoundFunc={(pos) => {
            const newX = Math.max(timeToPixels(trimStart) + 10, Math.min(pos.x, timeToPixels(duration)));
            return { x: newX, y: 20 };
          }}
          onDragEnd={(e) => {
            const newEnd = pixelsToTime(e.target.x() + 5);
            onTrimChange(trimStart, newEnd);
          }}
        />

        {/* Playhead */}
        <Line
          points={[timeToPixels(currentTime), 0, timeToPixels(currentTime), 100]}
          stroke="red"
          strokeWidth={2}
        />

        {/* Time markers */}
        {Array.from({ length: Math.ceil(duration / 10) }).map((_, i) => (
          <Text
            key={i}
            x={timeToPixels(i * 10)}
            y={85}
            text={`${i * 10}s`}
            fontSize={12}
            fill="black"
          />
        ))}
      </Layer>
    </Stage>
  );
}
```

**How it works:**
1. **Clip rectangle** shows the active portion of the video
2. **Trim handles** (left/right) adjust the start/end points
3. **Playhead** follows the video's current time
4. **Time markers** help you see the timeline scale
5. Everything is drawn on a single `<canvas>` element

---

### 2. FFmpeg Video Trimming

**What happens when you export?**

1. User clicks "Export" button
2. React calls `window.electronAPI.trimVideo(input, output, start, end)`
3. IPC sends message to main process
4. Main process runs FFmpeg command:

```bash
ffmpeg -i input.mp4 -ss 00:00:05 -t 00:00:20 -c copy output.mp4
```

**Breaking down the command:**
- `-i input.mp4`: Input file
- `-ss 00:00:05`: Start time (5 seconds)
- `-t 00:00:20`: Duration (20 seconds)
- `-c copy`: Copy codec (no re-encoding, fast!)
- `output.mp4`: Output file

**In fluent-ffmpeg:**

```typescript
ffmpeg(inputPath)
  .setStartTime(5)          // Start at 5 seconds
  .setDuration(20)          // 20 seconds long
  .outputOptions('-c copy') // Copy codec (fast trim)
  .output(outputPath)
  .on('start', (cmd) => console.log('FFmpeg command:', cmd))
  .on('progress', (progress) => {
    console.log(`Progress: ${progress.percent}%`);
    // Send to renderer for progress bar
    mainWindow.webContents.send('export-progress', progress.percent);
  })
  .on('end', () => {
    console.log('Export complete!');
  })
  .on('error', (err) => {
    console.error('Export failed:', err);
  })
  .run();
```

**Why `-c copy` is important:**
- **With re-encoding:** FFmpeg decodes → processes → re-encodes (SLOW, 30s for 1min video)
- **With `-c copy`:** FFmpeg just copies the video stream (FAST, 2s for 1min video)
- **Limitation:** Can only cut at keyframes (might be slightly off, ±1 second)

**For MVP:** Use `-c copy` for speed. For final version, allow re-encoding for precision.

---

### 3. Time Synchronization (Player ↔ Timeline)

**The Challenge:** Keep video player and timeline in sync

**Solution:** Bidirectional state updates

```tsx
function App() {
  const [currentTime, setCurrentTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Timeline → Video Player
  const handleSeek = (time: number) => {
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  // Video Player → Timeline
  const handleVideoTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  return (
    <>
      <VideoPlayer
        ref={videoRef}
        onTimeUpdate={handleVideoTimeUpdate}
      />
      <Timeline
        currentTime={currentTime}
        onSeek={handleSeek}
      />
    </>
  );
}
```

**Flow:**
1. User drags playhead on timeline → `onSeek(newTime)` → Update `currentTime` state → Video player jumps to that time
2. Video plays → `onTimeUpdate` event → Update `currentTime` state → Timeline playhead moves

---

### 4. File Path Handling in Electron

**Problem:** React runs in a sandboxed renderer. File paths work differently.

**Solution:**

```tsx
// ✅ CORRECT: Use file:// protocol for local videos
<video src={`file://${videoPath}`} />

// ❌ WRONG: Raw path won't work in renderer
<video src="/Users/amaan/video.mp4" />
```

**Why?** Electron's renderer uses Chromium, which requires `file://` protocol for local files.

**For exports:**
```typescript
// Main process can use raw paths
ffmpeg('/Users/amaan/video.mp4')
  .output('/Users/amaan/trimmed.mp4')
  .run();
```

---

## User Flow

**Complete MVP workflow:**

```
1. User opens app
   └─> Electron window launches (800x600)
       └─> Shows "Import Video" button

2. User clicks "Import Video"
   └─> File picker opens (filters: mp4, mov, webm)
       └─> User selects video.mp4
           └─> IPC sends file path to renderer
               └─> Renderer requests metadata via IPC
                   └─> Main process uses FFmpeg ffprobe
                       └─> Returns: duration=60s, resolution=1920x1080

3. UI updates
   └─> Video player shows first frame
   └─> Timeline displays clip (0s to 60s)
   └─> Trim handles at start (0s) and end (60s)

4. User trims video
   └─> Drags left handle to 5s
       └─> Timeline updates (clip now 5s to 60s)
           └─> Video player clamped to 5s-60s range
   └─> Drags right handle to 25s
       └─> Timeline updates (clip now 5s to 25s)
           └─> Video player clamped to 5s-25s range

5. User previews
   └─> Clicks play button
       └─> Video plays from 5s to 25s
           └─> Playhead moves on timeline
               └─> Stops at 25s (trim end)

6. User clicks "Export"
   └─> Export button disabled, shows "Exporting..."
       └─> IPC sends trim request to main process
           └─> Main process runs FFmpeg:
               ffmpeg -i video.mp4 -ss 5 -t 20 -c copy video_trimmed.mp4
               └─> Progress updates sent to renderer (0% → 100%)
                   └─> FFmpeg finishes
                       └─> IPC sends "complete" message

7. Export complete
   └─> UI shows "Export complete!" with file path
       └─> User can find video_trimmed.mp4 in same folder
```

---

## Testing Checklist

**Before submitting MVP:**

### Basic Functionality
- [ ] App launches successfully
- [ ] "Import Video" button opens file picker
- [ ] Can import MP4 file
- [ ] Can import MOV file
- [ ] Video displays in player
- [ ] Play button starts video
- [ ] Pause button stops video
- [ ] Current time displays correctly (MM:SS)

### Timeline
- [ ] Timeline shows clip rectangle
- [ ] Timeline shows time markers
- [ ] Playhead moves during video playback
- [ ] Playhead position matches video time
- [ ] Can drag left trim handle
- [ ] Can drag right trim handle
- [ ] Trim times display correctly

### Trimming
- [ ] Video playback respects trim start
- [ ] Video playback respects trim end
- [ ] Cannot drag trim start past trim end
- [ ] Cannot drag trim end before trim start

### Export
- [ ] Export button triggers FFmpeg
- [ ] Progress indicator shows during export
- [ ] Export completes without errors
- [ ] Exported file exists on disk
- [ ] Exported file plays correctly
- [ ] Exported file duration matches trim length

### Edge Cases
- [ ] Importing video while one is already loaded
- [ ] Very short trim (< 1 second)
- [ ] Trim entire video (0s to end)
- [ ] Large video files (> 1GB)
- [ ] Different video resolutions (720p, 1080p, 4K)

### Packaged App
- [ ] `bun run make` completes successfully
- [ ] Packaged app launches
- [ ] All features work in packaged app
- [ ] FFmpeg binary is bundled correctly
- [ ] Can import videos in packaged app
- [ ] Can export videos in packaged app

---

## Post-MVP Features

**After MVP deadline passes, prioritize these for final submission:**

### High Priority (Wednesday additions)
- [ ] Drag & drop video import
- [ ] Multiple clips on timeline
- [ ] Screen recording (desktopCapturer)
- [ ] Webcam recording (getUserMedia)
- [ ] Picture-in-picture (screen + webcam)
- [ ] Multiple tracks (main + overlay)

### Medium Priority
- [ ] Audio controls (volume, mute)
- [ ] Keyboard shortcuts (Space = play/pause, Arrow keys = frame step)
- [ ] Export resolution options (720p, 1080p)
- [ ] Export progress percentage display
- [ ] Auto-save project state

### Low Priority (Stretch goals)
- [ ] Text overlays
- [ ] Transitions (fade, slide)
- [ ] Filters (brightness, contrast)
- [ ] Undo/redo
- [ ] Upload to cloud storage

---

## Success Criteria

**MVP passes if:**
- ✅ Can import a video
- ✅ Can see it on a timeline
- ✅ Can trim it (set start/end)
- ✅ Can export trimmed clip
- ✅ Packaged app works (not just dev mode)

**Final submission passes if:**
- ✅ All MVP features work
- ✅ Can record screen
- ✅ Can record webcam
- ✅ Multiple clips on timeline
- ✅ Demo video shows all features
- ✅ README with clear instructions

---

## Timeline Estimates

**MVP Path (sequential):**
- Phase 1 (Setup): 2-3 hours
- Phase 2 (Import/Player): 2-3 hours
- Phase 3 (Timeline): 3-4 hours
- Phase 4 (Export): 1-2 hours
- Phase 5 (Package): 1-2 hours
- **Total: 9-14 hours**

**MVP Path (parallelized):**
- Phase 1 (Setup): 2-3 hours
- Parallel work (3 agents): 2-3 hours
- Integration: 1 hour
- Phase 5 (Package): 1-2 hours
- **Total: 6-9 hours**

**Post-MVP to Final:**
- Screen recording: 2-3 hours
- Webcam recording: 1-2 hours
- Multiple clips: 3-4 hours
- Polish + demo video: 2 hours
- **Total: 8-11 hours**

**Grand total: 14-20 hours** (very achievable before Wednesday deadline!)

---

## Quick Reference

### Key Commands

```bash
# Development
bun install              # Install dependencies
bun start                # Start dev server (Electron + Vite)

# Building
bun run make             # Create distributable (in out/ directory)
bun run package          # Package app without creating installer

# Linting
bun run lint             # Run ESLint
```

### Important File Paths

```
Main process:     src/main.ts
Preload script:   src/preload.ts
React entry:      src/renderer.tsx
Main component:   src/App.tsx
Type definitions: src/global.d.ts
```

### IPC Pattern

```typescript
// 1. Preload (exposes API)
contextBridge.exposeInMainWorld('electronAPI', {
  doSomething: (arg) => ipcRenderer.invoke('do-something', arg)
});

// 2. Main (handles request)
ipcMain.handle('do-something', async (event, arg) => {
  // Do work
  return result;
});

// 3. Renderer (calls API)
const result = await window.electronAPI.doSomething(arg);
```

---

## Next Steps

1. **Review this plan** - Make sure you understand the architecture
2. **Ask questions** - Clarify anything unclear before starting
3. **Start Phase 1** - Set up dependencies and React
4. **Parallelize if ready** - After Phase 1, split work across agents
5. **Test continuously** - Don't wait until the end to test features
6. **Package early** - Test the build process before the deadline
7. **Ship MVP** - Get something working by Tuesday 10:59 PM CT

---

**Remember:** A simple, working video trimmer beats a feature-rich app that doesn't package. Focus on the core loop: **Import → Trim → Export**.

Good luck! 🚀
