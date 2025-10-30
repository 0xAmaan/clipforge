  ⎿  Screen Recording MP4 Implementation Plan

     Based on research into native AVFoundation (36-92 hours - NOT feasible), I recommend implementing Option B: FFmpeg AVFoundation Direct Recording.

     Option A: Quick Fix (2-3 hours) - MediaRecorder + Post-Conversion

     Keep browser MediaRecorder but add automatic conversion:

     Changes:

     1. App.tsx - After recording stops, convert WebM → MP4 with FFmpeg
     2. main.ts - Add convert-webm-to-mp4 IPC handler
     3. Show "Converting..." progress indicator
     4. Delete intermediate WebM file

     Pros:

     - Minimal risk, fast implementation
     - Uses existing FFmpeg setup
     - Works immediately

     Cons:

     - 5-20 second wait after recording (for short clips: ~5-10s)
     - Not "true" native recording

     ---
     Option B: FFmpeg AVFoundation Direct Recording (8-12 hours) ⭐ RECOMMENDED

     Use FFmpeg's built-in AVFoundation support for native MP4 recording:

     Changes:

     1. main.ts - Replace MediaRecorder flow with FFmpeg process spawning
     2. App.tsx - Update recording UI to work with FFmpeg process
     3. Add display selection - Let user pick which screen/window to record
     4. Add IPC handlers for start/stop FFmpeg recording

     How it works:

     # FFmpeg command that will be spawned:
     ffmpeg -f avfoundation -framerate 30 -i "1:0" \
            -c:v libx264 -preset ultrafast -crf 23 output.mp4

     Implementation Steps:

     1. Get available displays (2 hours)
       - Query AVFoundation displays via FFmpeg
       - Show picker UI for user to select screen/window
     2. Spawn FFmpeg recording process (3-4 hours)
       - Create IPC handler to start FFmpeg with AVFoundation input
       - Store process reference for stopping
       - Handle FFmpeg stderr for progress updates
     3. Stop recording gracefully (1-2 hours)
       - Send 'q' command to FFmpeg stdin
       - Wait for process to complete
       - Return MP4 file path
     4. Duration tracking (1 hour)
       - Track elapsed time with your existing timer
       - FFmpeg creates proper MP4 metadata automatically
     5. Testing & polish (2-3 hours)
       - Test on different displays
       - Error handling
       - Permission handling

     Pros:

     - ✅ Direct MP4/H.264 output
     - ✅ Uses AVFoundation natively (via FFmpeg)
     - ✅ No post-processing wait
     - ✅ Accurate duration metadata from start
     - ✅ No native code complexity
     - ✅ Already have FFmpeg integrated

     Cons:

     - More work than Option A (8-12 hours vs 2-3 hours)
     - Need to replace MediaRecorder flow entirely
     - FFmpeg process management adds complexity

     ---
     Recommendation

     For 72-hour deadline with short clips (30s-2min):

     I recommend Option B (FFmpeg AVFoundation) because:
     1. Only 8-12 hours (well within your timeline)
     2. Gets you true native MP4 recording
     3. Solves the duration issue permanently
     4. Better UX (no conversion wait)
     5. This is the "proper" solution that professional apps use

     Fallback: If you hit issues, Option A is quick to implement as backup.

     ---
     Next Steps

     If you approve Option B, I'll implement:
     1. ✅ FFmpeg AVFoundation recording handlers in main.ts
     2. ✅ Display selection UI
     3. ✅ Update App.tsx to use FFmpeg instead of MediaRecorder
     4. ✅ Keep duration tracking with your timer refs
     5. ✅ Error handling and testing

     This gives you native macOS screen recording to MP4 without the complexity of custom native code.


Implementation Summary

  ✅ main.ts - Added FFmpeg Recording Handlers

  - get-avfoundation-displays: Lists available displays/screens using FFmpeg
  - start-ffmpeg-recording: Spawns FFmpeg with AVFoundation input to record directly to MP4
  - stop-ffmpeg-recording: Gracefully stops FFmpeg recording

  ✅ Types & Preload

  - Added AVFoundationDisplay interface
  - Exposed new APIs in preload.ts

  ✅ App.tsx - Replaced MediaRecorder with FFmpeg

  - Removed: MediaRecorder, MediaStream, Blob chunks
  - Added: Direct FFmpeg process recording
  - Simplified: No WebM → MP4 conversion needed
  - Kept: Timer-based duration tracking as fallback

  How It Works Now

  1. User clicks "Start Recording"
     ↓
  2. Get displays via FFmpeg (-list_devices)
     ↓
  3. Start FFmpeg with AVFoundation input
     Command: ffmpeg -f avfoundation -i "1:0" output.mp4
     ↓
  4. FFmpeg records directly to MP4/H.264
     ↓
  5. User clicks "Stop Recording"
     ↓
  6. Send 'q' to FFmpeg to stop gracefully
     ↓
  7. Import MP4 file (already has proper metadata!)
     ↓
  8. Add to timeline

  Key Benefits

  - ✅ Direct MP4 output - No conversion needed
  - ✅ Proper duration metadata - FFmpeg creates valid MP4 containers
  - ✅ Native AVFoundation - Using macOS screen capture under the hood
  - ✅ H.264 encoding - Industry standard, plays everywhere
  - ✅ Simpler code - No blob handling or MediaRecorder complexity

⏺ Ready to Test! 🎉

  The FFmpeg AVFoundation recording is now fully implemented. Try it out:

  1. Start your dev server (if not already running)
  2. Click "Start Recording" - It will use FFmpeg with AVFoundation
  3. Record for a few seconds
  4. Click "Stop Recording"
  5. Check the console - You should see:
    - [FFmpeg Recording] logs showing the process
    - Proper MP4 file path
    - Video metadata with accurate duration
    - No more "Infinity" duration!

  What to Expect

  - Recording saves directly to ~/Movies/recording_TIMESTAMP.mp4
  - MP4 file with H.264 video codec
  - Proper duration metadata from the start
  - Video plays correctly in the player
  - Duration shows correctly on timeline

  If You Need Permissions

  macOS might prompt for screen recording permission the first time. If it fails:
  1. Go to System Settings > Privacy & Security > Screen Recording
  2. Enable permission for your Electron app
  3. Completely quit and restart the app

  Let me know if you see any errors or if the recording works perfectly!