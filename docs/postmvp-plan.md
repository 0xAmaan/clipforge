# ClipForge: Post-MVP Development Plan

## Overview
This document outlines the phased approach to add core features to ClipForge beyond the MVP. The MVP (basic video import, single-clip timeline, trim, and export) is complete. Now we focus on recording features, multiple clips, and enhanced editing capabilities.

---

## Phase 1: Screen Recording (Sequential)
**Estimated Time: 3-4 hours**

### Implementation Details:
- Use Electron's `desktopCapturer.getSources()` to list available screens/windows
- Set up `session.setDisplayMediaRequestHandler()` in main process
- Use `navigator.mediaDevices.getDisplayMedia()` in renderer to get stream
- Use `MediaRecorder` API to record the stream
- Add recording controls component (start/stop buttons, status indicator)
- Save recordings as WebM initially (native to MediaRecorder)
- Auto-add completed recordings to timeline

### Key Components:
- **New IPC handlers:** `get-screen-sources`, `save-recording`
- **New components:** `RecordingControls.tsx`, `SourcePicker.tsx`
- **State management:** Add recording state to App.tsx (isRecording, recordingType, mediaStream)

### Technical References (from Electron docs):
```javascript
// Main process setup
const { session, desktopCapturer } = require('electron')

session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
  desktopCapturer.getSources({ types: ['screen', 'window'] }).then((sources) => {
    // Grant access to the first screen found.
    callback({ video: sources[0], audio: 'loopback' })
  })
}, { useSystemPicker: true })
```

```javascript
// Renderer process
navigator.mediaDevices.getDisplayMedia({
  audio: true,
  video: {
    width: 1920,
    height: 1080,
    frameRate: 30
  }
}).then(stream => {
  const mediaRecorder = new MediaRecorder(stream)
  // Handle recording...
})
```

---

## Phase 2: Webcam Recording
**Estimated Time: 2 hours**

### Implementation Details:
- Use standard `navigator.mediaDevices.getUserMedia({ video: true, audio: true })`
- Request camera/microphone permissions via `systemPreferences.askForMediaAccess()` (macOS)
- Reuse MediaRecorder infrastructure from Phase 1
- Add webcam preview window during recording
- Same save-to-timeline workflow

### Key Components:
- **Extend:** RecordingControls to include webcam mode toggle
- **New component:** `WebcamPreview.tsx` (shows live camera feed)
- **Permissions handling:** macOS permission check before recording

### Technical References:
```javascript
// Request permissions (macOS)
const { systemPreferences } = require('electron')

systemPreferences.askForMediaAccess('camera').then(granted => {
  console.log('Camera access granted:', granted)
})

systemPreferences.askForMediaAccess('microphone').then(granted => {
  console.log('Microphone access granted:', granted)
})
```

```javascript
// Renderer process
navigator.mediaDevices.getUserMedia({
  video: true,
  audio: true
}).then(stream => {
  // Show preview
  videoElement.srcObject = stream
  // Record
  const mediaRecorder = new MediaRecorder(stream)
})
```

---

## Phase 3: Simultaneous Screen + Webcam (Picture-in-Picture)
**Estimated Time: 3-4 hours**

### Implementation Details:
- Capture both screen and webcam streams separately
- Use Canvas API to composite streams (screen as background, webcam as overlay)
- Use `canvas.captureStream()` to get combined stream for MediaRecorder
- Add controls for webcam position/size (corner placement, resize)
- Save composite recording to timeline

### Key Components:
- **New utility:** `streamCompositor.ts` (handles canvas-based merging)
- **New component:** `PiPControls.tsx` (webcam overlay positioning)
- **Canvas setup:** Dedicated canvas for compositing before recording

### Technical Approach:
```javascript
// Get both streams
const screenStream = await navigator.mediaDevices.getDisplayMedia({...})
const webcamStream = await navigator.mediaDevices.getUserMedia({...})

// Create canvas for compositing
const canvas = document.createElement('canvas')
canvas.width = 1920
canvas.height = 1080
const ctx = canvas.getContext('2d')

// Create video elements for both streams
const screenVideo = document.createElement('video')
screenVideo.srcObject = screenStream
const webcamVideo = document.createElement('video')
webcamVideo.srcObject = webcamStream

// Draw loop
function drawFrame() {
  // Draw screen as background
  ctx.drawImage(screenVideo, 0, 0, 1920, 1080)

  // Draw webcam as overlay (e.g., bottom-right corner)
  ctx.drawImage(webcamVideo, 1920 - 320 - 20, 1080 - 240 - 20, 320, 240)

  requestAnimationFrame(drawFrame)
}

// Get combined stream from canvas
const compositeStream = canvas.captureStream(30) // 30 fps

// Record the composite
const mediaRecorder = new MediaRecorder(compositeStream)
```

---

## Phase 4: Multiple Clips on Timeline (Full Drag-and-Drop)
**Estimated Time: 4-5 hours**

### Implementation Details:
- Refactor Timeline.tsx to support array of clips (currently single clip)
- Add drag-to-reorder functionality (Konva draggable rectangles)
- Implement clip snapping (clips snap to each other or grid)
- Support gaps between clips (empty space on timeline)
- Add clip deletion (right-click or delete key)
- Update VideoPlayer to handle multi-clip playback with transitions
- Modify state management: `clips: VideoClip[]` instead of single video state

### Key Components:
- **Refactor:** Timeline.tsx (array-based rendering)
- **New component:** `ClipItem.tsx` (individual draggable clip on timeline)
- **New utilities:** `clipArrangement.ts` (calculate clip positions, detect overlaps)
- **Enhanced VideoPlayer:** Queue-based playback for sequential clips

### Data Structure:
```typescript
interface VideoClip {
  id: string
  filePath: string
  startTime: number        // Clip's start time on timeline
  duration: number         // Duration of the clip
  trimStart: number        // Trim start within the source file
  trimEnd: number          // Trim end within the source file
  trackIndex: number       // Which track (0 = main, 1 = overlay, etc.)
}

interface TimelineState {
  clips: VideoClip[]
  currentTime: number
  totalDuration: number
}
```

### Konva Implementation:
```tsx
// Timeline.tsx - Multi-clip rendering
{clips.map((clip, index) => (
  <ClipItem
    key={clip.id}
    clip={clip}
    pixelsPerSecond={PIXELS_PER_SECOND}
    onDragEnd={(newStartTime) => handleClipMove(clip.id, newStartTime)}
    onTrimChange={(newTrimStart, newTrimEnd) => handleClipTrim(clip.id, newTrimStart, newTrimEnd)}
    onDelete={() => handleClipDelete(clip.id)}
  />
))}
```

---

## Phase 5: Enhanced Export for Multiple Clips
**Estimated Time: 2-3 hours**

### Implementation Details:
- Use FFmpeg `concat` demuxer to stitch multiple clips
- Generate concat file list for FFmpeg
- Handle gaps (insert black frames or skip)
- Progress tracking across multiple clips
- Resolution options (720p, 1080p, source)

### Key Components:
- **Enhanced IPC handler:** `export-timeline` (multi-clip export)
- **New utility:** `generateConcatFile.ts` (creates FFmpeg concat file)
- **Updated ExportButton:** Resolution picker dropdown

### FFmpeg Concat Approach:
```typescript
// generateConcatFile.ts
export const generateConcatFile = (clips: VideoClip[], tempDir: string): string => {
  const concatFilePath = path.join(tempDir, 'concat.txt')

  const lines = clips.map(clip => {
    // For each clip, trim it first if needed
    const trimmedPath = path.join(tempDir, `${clip.id}_trimmed.mp4`)
    // Return concat file line
    return `file '${trimmedPath}'`
  })

  fs.writeFileSync(concatFilePath, lines.join('\n'))
  return concatFilePath
}

// Main process - export handler
ipcMain.handle('export-timeline', async (event, clips, outputPath, resolution) => {
  // 1. Trim each clip individually
  for (const clip of clips) {
    await trimClip(clip)
  }

  // 2. Generate concat file
  const concatFile = generateConcatFile(clips, tempDir)

  // 3. Concatenate all clips
  return new Promise((resolve, reject) => {
    ffmpeg()
      .input(concatFile)
      .inputOptions(['-f concat', '-safe 0'])
      .outputOptions(['-c copy'])  // Or re-encode with resolution
      .output(outputPath)
      .on('end', () => resolve(outputPath))
      .on('error', reject)
      .run()
  })
})
```

---

## Phase 6: Media Library & Import Management
**Estimated Time: 2-3 hours**

### Implementation Details:
- Add drag-and-drop zone for video imports
- Create media library panel (sidebar) with thumbnails
- Generate thumbnails using FFmpeg (extract frame at 1 second)
- Store imported media metadata (duration, resolution, file path)
- Drag from library to timeline to add clips

### Key Components:
- **New component:** `MediaLibrary.tsx` (sidebar with imported files)
- **New component:** `MediaThumbnail.tsx` (thumbnail with metadata)
- **New IPC handler:** `generate-thumbnail` (FFmpeg frame extraction)
- **Drag-and-drop:** HTML5 drag events integration

### Thumbnail Generation:
```typescript
// Main process - generate thumbnail
ipcMain.handle('generate-thumbnail', async (event, videoPath) => {
  const thumbnailPath = path.join(app.getPath('temp'), `thumb_${Date.now()}.png`)

  return new Promise((resolve, reject) => {
    ffmpeg(videoPath)
      .seekInput(1)  // Seek to 1 second
      .frames(1)     // Extract 1 frame
      .output(thumbnailPath)
      .on('end', () => resolve(thumbnailPath))
      .on('error', reject)
      .run()
  })
})
```

### Drag-and-Drop:
```tsx
// App.tsx or MediaLibrary.tsx
const handleDrop = (e: React.DragEvent) => {
  e.preventDefault()
  const files = Array.from(e.dataTransfer.files)

  files.forEach(async (file) => {
    if (file.type.startsWith('video/')) {
      const metadata = await window.electronAPI.getVideoMetadata(file.path)
      const thumbnail = await window.electronAPI.generateThumbnail(file.path)

      addToMediaLibrary({
        id: uuidv4(),
        path: file.path,
        name: file.name,
        thumbnail,
        ...metadata
      })
    }
  })
}
```

---

## Phase 7: UI Polish
**Estimated Time: 2-3 hours**

### Implementation Details:
- Improve color scheme and spacing
- Add icons (use lucide-react or similar)
- Better button styling (hover states, disabled states)
- Loading spinners during operations
- Toast notifications for success/error states
- Keyboard shortcuts (Space = play/pause, Del = delete clip)

### Key Components:
- **New utility:** `keyboard.ts` (global keyboard handler)
- **Styling improvements:** Across all existing components
- **Icons library:** Install and integrate icon system

### Keyboard Shortcuts:
```typescript
// keyboard.ts
export const useKeyboardShortcuts = (handlers: {
  onPlayPause?: () => void
  onDelete?: () => void
  onUndo?: () => void
  onRedo?: () => void
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Play/Pause
      if (e.code === 'Space' && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        e.preventDefault()
        handlers.onPlayPause?.()
      }

      // Delete
      if ((e.code === 'Delete' || e.code === 'Backspace') && !e.shiftKey) {
        e.preventDefault()
        handlers.onDelete?.()
      }

      // Undo (Cmd/Ctrl + Z)
      if (e.code === 'KeyZ' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault()
        handlers.onUndo?.()
      }

      // Redo (Cmd/Ctrl + Shift + Z)
      if (e.code === 'KeyZ' && (e.metaKey || e.ctrlKey) && e.shiftKey) {
        e.preventDefault()
        handlers.onRedo?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handlers])
}
```

---

## Agent Assignment Strategy

### **Agent 1: Recording Features (Sequential)**
- Phase 1 → Phase 2 → Phase 3
- Single agent works through screen, webcam, then simultaneous
- **Estimated total:** 8-10 hours

### **Agent 2: Timeline & Multi-Clip Editing**
- Phase 4 + Phase 5 (timeline editing + export)
- Can start in parallel with Agent 1 (after Agent 1 completes Phase 1)
- **Estimated total:** 6-8 hours

### **Agent 3: Import & Media Management**
- Phase 6 (media library, thumbnails, drag-drop)
- Can start in parallel with both above
- **Estimated total:** 2-3 hours

### **Final Polish (You or dedicated agent)**
- Phase 7 (UI improvements)
- Done after all features are complete
- **Estimated total:** 2-3 hours

---

## Total Timeline

**Sequential (worst case):** 22-28 hours
**With parallelization:** 12-16 hours (recording + timeline happen in parallel)

---

## Success Criteria

**Full Submission Requirements Met:**
- ✅ Screen recording (full screen/window selection)
- ✅ Webcam recording
- ✅ Simultaneous screen + webcam (PiP)
- ✅ Audio capture from microphone
- ✅ Multiple clips on timeline with drag-to-reorder
- ✅ Drag & drop import
- ✅ Media library with thumbnails
- ✅ Export timeline with multiple clips
- ✅ Resolution options for export

**Not implementing (per user preference):**
- ❌ Text overlays
- ❌ Transitions
- ❌ Filters/effects
- ❌ Audio volume controls
- ❌ Undo/redo
- ❌ Auto-save

---

## Risk Mitigation

**Recording complexity:** Screen + webcam compositing is the most technically challenging part. If it proves too difficult, we can fall back to recording separately and letting users manually arrange on timeline.

**Multi-clip export:** FFmpeg concat can be finicky. Test early with 2-3 clips to validate approach.

**Performance:** Timeline with many clips might lag. Konva should handle it, but we can add virtualization if needed.

---

## Important Notes

### Current MVP State
- ✅ Single clip import, trim, and export working
- ✅ Konva-based timeline with draggable trim handles
- ✅ FFmpeg integration for trimming and metadata extraction
- ✅ IPC architecture established (main ↔ renderer communication)
- ✅ TypeScript interfaces defined for video state

### Established Patterns to Follow
1. **IPC Pattern:** Always add handlers in main.ts, expose in preload.ts, type in global.d.ts
2. **Component Communication:** Parent (App.tsx) holds state, children receive props and call callbacks
3. **Time Handling:** Internal = seconds, Display = MM:SS format, Timeline = pixel conversions
4. **Styling:** Inline styles, dark theme (#0a0a0a background, #1a1a1a cards, #3b82f6 accent)

### Dependencies Already Available
- `fluent-ffmpeg` + `ffmpeg-static` (video processing)
- `konva` + `react-konva` (canvas-based UI)
- `react` + `react-dom` (frontend)
- `electron` + `@electron-forge/*` (desktop framework)

### Dependencies to Add
- `uuid` or similar for generating unique clip IDs
- (Optional) `lucide-react` or icon library for UI polish
- (Optional) Toast notification library for Phase 7

---

## Next Steps

1. Review this plan and confirm approach
2. Assign agents to specific phases
3. Start with Phase 1 (Screen Recording)
4. Test each phase thoroughly before moving to next
5. Keep communication open between agents for integration points
6. Save final demo video and prepare submission

Good luck! 🚀
