# FFmpeg Path Fix

## Problem
Error: `spawn /Users/amaan/Desktop/Gauntlet/clipforge/.vite/build/ffmpeg ENOENT`

This happened because Vite was trying to bundle the ffmpeg-static binary, which doesn't work with native binaries.

## Solution Applied

### 1. Updated `src/main.ts`
- Changed import to properly resolve the ffmpeg-static path
- Added `.replace("app.asar", "app.asar.unpacked")` for packaged apps
- Added error logging if binary not found

### 2. Updated `vite.main.config.ts`
- Added `external: ['ffmpeg-static']` to rollup options
- This prevents Vite from trying to bundle the native binary

### 3. Updated `forge.config.ts`
- Changed `asar: true` to `asar: { unpack: '**/node_modules/ffmpeg-static/**/*' }`
- This ensures the ffmpeg binary is unpacked when the app is packaged
- Required for the binary to be executable in production

## Testing

**In Development:**
1. Stop the current dev server (Ctrl+C)
2. Restart: `bun start`
3. Import a video
4. Trim it
5. Click "Export Trimmed Video"
6. Should work now!

**After Packaging:**
When you run `bun run make`, the ffmpeg binary will be properly unpacked and the app will work in production mode too.

## What Changed

Before:
```typescript
import ffmpegPath from "ffmpeg-static";
ffmpeg.setFfmpegPath(ffmpegPath);
```

After:
```typescript
import ffmpegStatic from "ffmpeg-static";
const ffmpegPath = ffmpegStatic?.replace("app.asar", "app.asar.unpacked");
ffmpeg.setFfmpegPath(ffmpegPath);
```

This handles both development (direct path) and production (unpacked from asar) scenarios.
