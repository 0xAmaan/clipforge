# Agent 3: Trim & Export - Integration Guide

This document explains how to integrate Agent 3's features (trim logic and export functionality) with the rest of the application.

## ✅ What's Been Implemented

### 1. **Validation Utilities** (`src/utils/trimValidation.ts`)
Provides all validation and helper functions needed for trim operations:
- `validateTrimTimes()` - Validates trim start/end against video duration
- `validateTrimStart()` - Ensures trim start is valid
- `validateTrimEnd()` - Ensures trim end is valid
- `clamp()` - Utility for clamping values
- `formatTime()` - Converts seconds to MM:SS format
- `generateOutputFilename()` - Creates suggested output filename

### 2. **Trim Handles Hook** (`src/hooks/useTrimHandles.ts`)
Custom React hook for managing trim state:
- `trimStart` / `trimEnd` - Current trim points
- `updateTrimStart()` - Update start with validation
- `updateTrimEnd()` - Update end with validation
- `updateTrimBoth()` - Update both simultaneously
- `resetTrim()` - Reset to full duration
- `getTrimmedDuration()` - Get trimmed length

**Usage in Timeline (Agent 2):**
```tsx
import { useTrimHandles } from '../hooks/useTrimHandles';

const Timeline = ({ duration, onTrimChange }) => {
  const {
    trimStart,
    trimEnd,
    updateTrimStart,
    updateTrimEnd,
  } = useTrimHandles(duration);

  // When user drags left handle:
  const handleLeftHandleDrag = (newX: number) => {
    const newStart = pixelsToTime(newX);
    const validStart = updateTrimStart(newStart);
    onTrimChange(validStart, trimEnd);
  };

  // When user drags right handle:
  const handleRightHandleDrag = (newX: number) => {
    const newEnd = pixelsToTime(newX);
    const validEnd = updateTrimEnd(newEnd);
    onTrimChange(trimStart, validEnd);
  };

  // Render Konva trim handles here...
};
```

### 3. **Save Dialog IPC** (main.ts, preload.ts, global.d.ts)
Added IPC handler for save file dialog:
- **main.ts**: `ipcMain.handle('save-file', ...)` - Shows save dialog
- **preload.ts**: `saveFile()` exposed to renderer
- **global.d.ts**: TypeScript types for `saveFile()`

### 4. **ExportButton Component** (`src/components/ExportButton.tsx`)
Complete export UI with:
- Export button (disabled during export)
- Real-time progress bar (0-100%)
- Trim info display (start, end, duration)
- Success/error messages
- Save dialog integration
- FFmpeg export via IPC

**Props (matches `ExportProps` interface):**
```tsx
interface ExportProps {
  videoPath: string;
  trimStart: number;
  trimEnd: number;
  onExportComplete: (outputPath: string) => void;
}
```

## 🔗 Integration with App.tsx

Here's how to integrate Agent 3's features into the main App component:

```tsx
import { useState } from 'react';
import VideoPlayer from './components/VideoPlayer';
import Timeline from './components/Timeline';
import ExportButton from './components/ExportButton';

function App() {
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);

  const handleImport = async () => {
    const filePath = await window.electronAPI.openFile();
    if (!filePath) return;

    setVideoPath(filePath);

    const metadata = await window.electronAPI.getVideoMetadata(filePath);
    setDuration(metadata.duration);
    setTrimEnd(metadata.duration); // Default to full video
  };

  const handleTrimChange = (start: number, end: number) => {
    setTrimStart(start);
    setTrimEnd(end);
  };

  const handleExportComplete = (outputPath: string) => {
    console.log('Export completed:', outputPath);
    // Optional: Show notification, reset state, etc.
  };

  return (
    <div>
      <button onClick={handleImport}>Import Video</button>

      {videoPath && (
        <>
          {/* Agent 1's VideoPlayer */}
          <VideoPlayer
            videoPath={videoPath}
            currentTime={currentTime}
            trimStart={trimStart}
            trimEnd={trimEnd}
            onTimeUpdate={setCurrentTime}
            onPlayPause={(isPlaying) => console.log('Playing:', isPlaying)}
          />

          {/* Agent 2's Timeline */}
          <Timeline
            duration={duration}
            currentTime={currentTime}
            trimStart={trimStart}
            trimEnd={trimEnd}
            onSeek={setCurrentTime}
            onTrimChange={handleTrimChange}
          />

          {/* Agent 3's ExportButton */}
          <ExportButton
            videoPath={videoPath}
            trimStart={trimStart}
            trimEnd={trimEnd}
            onExportComplete={handleExportComplete}
          />
        </>
      )}
    </div>
  );
}

export default App;
```

## 🎨 For Agent 2: Adding Trim Handles to Timeline

Agent 2 should integrate trim handles using Konva. Here's a pattern to follow:

```tsx
import { Stage, Layer, Rect, Line } from 'react-konva';
import { useTrimHandles } from '../hooks/useTrimHandles';

const Timeline = ({ duration, currentTime, trimStart, trimEnd, onSeek, onTrimChange }) => {
  const PIXELS_PER_SECOND = 10;
  const timeToPixels = (time: number) => time * PIXELS_PER_SECOND;
  const pixelsToTime = (pixels: number) => pixels / PIXELS_PER_SECOND;

  const {
    updateTrimStart,
    updateTrimEnd,
  } = useTrimHandles(duration, trimStart, trimEnd);

  return (
    <Stage width={800} height={100}>
      <Layer>
        {/* Clip rectangle */}
        <Rect
          x={timeToPixels(trimStart)}
          y={20}
          width={timeToPixels(trimEnd - trimStart)}
          height={60}
          fill="rgba(59, 130, 246, 0.5)"
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
          strokeWidth={2}
          draggable={true}
          dragBoundFunc={(pos) => {
            const newX = Math.max(0, Math.min(pos.x, timeToPixels(trimEnd) - 10));
            return { x: newX, y: 20 };
          }}
          onDragEnd={(e) => {
            const newStart = pixelsToTime(e.target.x() + 5);
            const validStart = updateTrimStart(newStart);
            onTrimChange(validStart, trimEnd);
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
          strokeWidth={2}
          draggable={true}
          dragBoundFunc={(pos) => {
            const newX = Math.max(
              timeToPixels(trimStart) + 10,
              Math.min(pos.x, timeToPixels(duration))
            );
            return { x: newX, y: 20 };
          }}
          onDragEnd={(e) => {
            const newEnd = pixelsToTime(e.target.x() + 5);
            const validEnd = updateTrimEnd(newEnd);
            onTrimChange(trimStart, validEnd);
          }}
        />

        {/* Playhead */}
        <Line
          points={[timeToPixels(currentTime), 0, timeToPixels(currentTime), 100]}
          stroke="red"
          strokeWidth={2}
        />
      </Layer>
    </Stage>
  );
};

export default Timeline;
```

## 🧪 Testing Checklist

Once all agents are integrated:

- [ ] Import a video file
- [ ] Drag left trim handle - should clamp between 0 and right handle
- [ ] Drag right trim handle - should clamp between left handle and duration
- [ ] Trim info displays correct start/end/duration
- [ ] Click Export button - save dialog appears
- [ ] Choose output location - FFmpeg starts
- [ ] Progress bar updates from 0-100%
- [ ] Success message shows output path
- [ ] Exported video exists on disk
- [ ] Exported video duration matches trim length
- [ ] Try invalid trim (start > end) - should show error
- [ ] Try exporting while another export is running - button should be disabled

## 📝 Notes for Integration

1. **Shared State**: All trim state (`trimStart`, `trimEnd`) should live in `App.tsx` and flow down via props
2. **Validation**: The `useTrimHandles` hook handles validation automatically - Agent 2 just needs to call the update functions
3. **Progress Tracking**: The `onExportProgress` listener is set up automatically in `ExportButton` - no extra work needed
4. **Error Handling**: Both validation errors and FFmpeg errors are caught and displayed in the UI
5. **File Paths**: Make sure to pass the full file path to `ExportButton` (from `openFile()` result)

## 🚀 Next Steps

1. **Agent 1** completes VideoPlayer and import functionality
2. **Agent 2** completes Timeline with Konva, integrates trim handles using `useTrimHandles` hook
3. **Integration Phase**: Wire everything together in App.tsx
4. **Testing**: Full end-to-end workflow testing

---

**Agent 3 Status: ✅ Complete**

All deliverables are ready for integration!
