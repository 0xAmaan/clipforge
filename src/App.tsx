import { useEffect, useRef, useState } from "react";
import { Controls } from "./components/Controls";
import ExportButton from "./components/ExportButton";
import { MediaLibrary } from "./components/MediaLibrary";
import RecordingControls from "./components/RecordingControls";
import { Timeline } from "./components/Timeline";
import { VideoPlayer, VideoPlayerHandle } from "./components/VideoPlayer";
import "./index.css";
import {
  MediaItem,
  ProjectState,
  RecordingState,
  VideoMetadata,
} from "./types";
import {
  addClip,
  calculateTotalDuration,
  createClip,
  getClipAtTime,
  moveClip,
  removeClip,
  updateClipTrim,
} from "./utils/clipManagement";

const App = () => {
  // Multi-clip project state
  const [projectState, setProjectState] = useState<ProjectState>({
    clips: [],
    selectedClipId: null,
    currentTime: 0,
    totalDuration: 0,
    isPlaying: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Media library state
  const [mediaLibrary, setMediaLibrary] = useState<MediaItem[]>([]);

  // Recording state
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPicking: false,
    selectedSource: null,
    startTime: null,
    elapsedTime: 0,
  });

  const [recordingError, setRecordingError] = useState<string | null>(null);

  const videoPlayerRef = useRef<VideoPlayerHandle>(null);
  const timerIntervalRef = useRef<number | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const elapsedTimeRef = useRef<number>(0);
  const recordingOutputPathRef = useRef<string | null>(null);

  // Load persisted media library on mount
  useEffect(() => {
    const loadLibrary = async () => {
      try {
        const items = await window.electronAPI.loadMediaLibrary();
        setMediaLibrary(items);
        console.log("Loaded media library:", items.length, "items");
      } catch (err) {
        console.error("Failed to load media library:", err);
      }
    };
    loadLibrary();
  }, []);

  // Save media library whenever it changes
  useEffect(() => {
    if (mediaLibrary.length > 0) {
      const saveLibrary = async () => {
        try {
          await window.electronAPI.saveMediaLibrary(mediaLibrary);
          console.log("Media library saved");
        } catch (err) {
          console.error("Failed to save media library:", err);
        }
      };
      saveLibrary();
    }
  }, [mediaLibrary]);

  // Update elapsed time during recording
  useEffect(() => {
    if (recordingState.isRecording && recordingState.startTime) {
      const startTime = recordingState.startTime;
      recordingStartTimeRef.current = startTime;

      timerIntervalRef.current = window.setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        elapsedTimeRef.current = elapsed; // Store in ref for immediate access
        setRecordingState((prev) => ({
          ...prev,
          elapsedTime: elapsed,
        }));
      }, 100);

      return () => {
        if (timerIntervalRef.current) {
          clearInterval(timerIntervalRef.current);
        }
      };
    }
  }, [recordingState.isRecording, recordingState.startTime]);

  /**
   * Shared video import logic - used by both file picker and drag-drop
   */
  const importVideoFile = async (filePath: string) => {
    // Check if already in library
    const existingItem = mediaLibrary.find(
      (item) => item.filePath === filePath,
    );
    if (existingItem) {
      // Already in library, just add to timeline
      handleAddToTimeline(existingItem);
      return;
    }

    // Fetch video metadata
    const videoMetadata = await window.electronAPI.getVideoMetadata(filePath);

    // Generate thumbnail
    const thumbnail = await window.electronAPI.generateThumbnail(filePath);

    // Get file size
    const fileSize = await window.electronAPI.getFileSize(filePath);

    // Create media item
    const fileName = filePath.split("/").pop() || "Unknown";
    const resolution = `${videoMetadata.width}x${videoMetadata.height}`;
    const newMediaItem: MediaItem = {
      id: crypto.randomUUID(),
      filePath,
      fileName,
      thumbnail,
      duration: videoMetadata.duration,
      resolution,
      fileSize,
      addedAt: Date.now(),
    };

    // Add to media library
    setMediaLibrary((prev) => [...prev, newMediaItem]);

    // Create new clip at end of timeline
    const newClip = createClip(
      filePath,
      videoMetadata,
      projectState.totalDuration,
    );
    const updatedClips = addClip(projectState.clips, newClip);
    const newTotalDuration = calculateTotalDuration(updatedClips);

    // Update project state
    setProjectState({
      ...projectState,
      clips: updatedClips,
      totalDuration: newTotalDuration,
      selectedClipId: newClip.id, // Auto-select newly imported clip
    });

    console.log("Video imported successfully:", {
      filePath,
      metadata: videoMetadata,
      clipId: newClip.id,
    });
  };

  /**
   * Handle file drop - processes dropped video files
   */
  const handleFileDrop = async (filePath: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await importVideoFile(filePath);
    } catch (err) {
      console.error("Failed to import dropped video:", err);
      setError(err instanceof Error ? err.message : "Failed to import video");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle video import - creates a new clip on timeline AND adds to media library
   * Opens file picker and loads video metadata
   */
  const handleImport = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Open file picker via IPC
      const filePath = await window.electronAPI.openFile();

      if (!filePath) {
        setIsLoading(false);
        return; // User cancelled
      }

      await importVideoFile(filePath);
    } catch (err) {
      console.error("Failed to import video:", err);
      setError(err instanceof Error ? err.message : "Failed to import video");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle video time updates (from video playback)
   */
  const handleTimeUpdate = (time: number) => {
    setProjectState((prev) => ({
      ...prev,
      currentTime: time,
    }));
  };

  /**
   * Handle play/pause state changes
   */
  const handlePlayPause = (isPlaying: boolean) => {
    setProjectState((prev) => ({
      ...prev,
      isPlaying,
    }));
  };

  /**
   * Handle seeking from timeline
   */
  const handleSeek = (time: number) => {
    setProjectState((prev) => ({
      ...prev,
      currentTime: time,
    }));

    // Seek the video player if it exists
    if (videoPlayerRef.current) {
      videoPlayerRef.current.seek(time);
    }
  };

  /**
   * Handle clip selection
   */
  const handleClipSelect = (clipId: string) => {
    setProjectState((prev) => ({
      ...prev,
      selectedClipId: clipId,
    }));
  };

  /**
   * Handle clip movement/reordering on timeline
   */
  const handleClipMove = (clipId: string, newTimelineStart: number) => {
    const updatedClips = moveClip(projectState.clips, clipId, newTimelineStart);
    const newTotalDuration = calculateTotalDuration(updatedClips);

    setProjectState((prev) => ({
      ...prev,
      clips: updatedClips,
      totalDuration: newTotalDuration,
    }));
  };

  /**
   * Handle trim changes for a specific clip
   */
  const handleClipTrim = (
    clipId: string,
    newSourceStart: number,
    newSourceEnd: number,
  ) => {
    const updatedClips = updateClipTrim(
      projectState.clips,
      clipId,
      newSourceStart,
      newSourceEnd,
    );
    const newTotalDuration = calculateTotalDuration(updatedClips);

    setProjectState((prev) => ({
      ...prev,
      clips: updatedClips,
      totalDuration: newTotalDuration,
    }));
  };

  /**
   * Handle clip deletion
   */
  const handleClipDelete = (clipId: string) => {
    const updatedClips = removeClip(projectState.clips, clipId);
    const newTotalDuration = calculateTotalDuration(updatedClips);

    setProjectState((prev) => ({
      ...prev,
      clips: updatedClips,
      totalDuration: newTotalDuration,
      selectedClipId:
        prev.selectedClipId === clipId ? null : prev.selectedClipId,
    }));
  };

  /**
   * Handle adding a media item from library to timeline
   */
  const handleAddToTimeline = async (item: MediaItem) => {
    try {
      // Get video metadata (might be cached in item, but we need the full metadata for clip)
      const videoMetadata = await window.electronAPI.getVideoMetadata(
        item.filePath,
      );

      // Create new clip at end of timeline
      const newClip = createClip(
        item.filePath,
        videoMetadata,
        projectState.totalDuration,
      );
      const updatedClips = addClip(projectState.clips, newClip);
      const newTotalDuration = calculateTotalDuration(updatedClips);

      // Update project state
      setProjectState({
        ...projectState,
        clips: updatedClips,
        totalDuration: newTotalDuration,
        selectedClipId: newClip.id,
      });

      console.log("Added from library to timeline:", item.fileName);
    } catch (err) {
      console.error("Failed to add to timeline:", err);
      setError(
        err instanceof Error ? err.message : "Failed to add to timeline",
      );
    }
  };

  /**
   * Handle removing an item from the media library
   * Deletes the actual file from disk and removes from library
   */
  const handleRemoveFromLibrary = async (id: string) => {
    const item = mediaLibrary.find((item) => item.id === id);
    if (!item) {
      console.error("Item not found in library:", id);
      return;
    }

    // Confirm deletion with user
    const confirmed = confirm(
      `Are you sure you want to delete "${item.fileName}"?\n\nThis will permanently delete the file from your computer.`,
    );

    if (!confirmed) {
      return;
    }

    try {
      // Delete the actual file from disk
      const deleted = await window.electronAPI.deleteFile(item.filePath);

      if (deleted) {
        // Remove from library
        setMediaLibrary((prev) => prev.filter((item) => item.id !== id));

        // Also remove any clips using this file from the timeline
        const updatedClips = projectState.clips.filter(
          (clip) => clip.sourceFilePath !== item.filePath,
        );
        const newTotalDuration = calculateTotalDuration(updatedClips);

        setProjectState((prev) => ({
          ...prev,
          clips: updatedClips,
          totalDuration: newTotalDuration,
          selectedClipId:
            prev.selectedClipId &&
            updatedClips.some((c) => c.id === prev.selectedClipId)
              ? prev.selectedClipId
              : null,
        }));

        console.log("File deleted successfully:", item.fileName);
      } else {
        setError("Failed to delete file from disk");
      }
    } catch (err) {
      console.error("Failed to delete file:", err);
      setError(err instanceof Error ? err.message : "Failed to delete file");
    }
  };

  /**
   * Handle opening system settings for screen recording permissions
   */
  const handleOpenSettings = async () => {
    try {
      await window.electronAPI.openSystemSettings();
    } catch (err) {
      console.error("Failed to open system settings:", err);
    }
  };

  /**
   * Handle start recording - use FFmpeg with AVFoundation
   */
  const handleStartPicking = async () => {
    setRecordingState((prev) => ({
      ...prev,
      isPicking: true,
      isRecording: false,
    }));
    setRecordingError(null);

    try {
      console.log("[screencapture] Getting available displays...");

      // Get available displays
      const displays = await window.electronAPI.getAVFoundationDisplays();

      if (displays.length === 0) {
        throw new Error("No displays available for recording");
      }

      // Use the first display (main screen) - TODO: let user select
      const displayId = displays[0].id;
      console.log(
        `[screencapture] Using display: ${displays[0].name} (ID: ${displayId})`,
      );

      // Generate output filename with timestamp
      const timestamp = new Date()
        .toISOString()
        .replace(/:/g, "-")
        .replace(/\..+/, "");
      const filename = `recording_${timestamp}.mov`;

      console.log("[screencapture] Starting screencapture recording...");

      // Start screencapture recording - returns .mov path
      const outputPath = await window.electronAPI.startFFmpegRecording(
        displayId,
        filename,
      );
      recordingOutputPathRef.current = outputPath;

      console.log("[screencapture] Recording started successfully");

      setRecordingState((prev) => ({
        ...prev,
        isRecording: true,
        isPicking: false,
        startTime: Date.now(),
        elapsedTime: 0,
      }));
    } catch (err) {
      console.error("[screencapture] Failed to start recording:", err);

      let errorMessage = "Unable to start screen recording.";

      if (err instanceof Error) {
        if (
          err.message.includes("permission") ||
          err.message.includes("denied")
        ) {
          errorMessage = `Screen recording permission required.

Please ensure:
1. System Settings > Privacy & Security > Screen Recording
2. Enable permission for this app
3. Completely quit and restart this app

You can click "Open Settings" below to go directly to the settings page.`;
        } else {
          errorMessage = `Error: ${err.message}`;
        }
      }

      setRecordingError(errorMessage);
      setRecordingState((prev) => ({
        ...prev,
        isPicking: false,
        isRecording: false,
      }));
    }
  };

  /**
   * Handle stop recording
   */
  const handleStopRecording = async () => {
    try {
      console.log("[screencapture] Stopping recording...");

      // Set to "saving" state
      setRecordingState((prev) => ({
        ...prev,
        isRecording: false,
        isSaving: true,
      }));

      // Stop screencapture recording
      await window.electronAPI.stopFFmpegRecording();

      console.log("[screencapture] Recording stopped, importing...");

      // Import the recorded MP4 file
      await handleRecordingStopped();
    } catch (err) {
      console.error("[screencapture] Failed to stop recording:", err);
      setRecordingError(
        err instanceof Error ? err.message : "Failed to stop recording",
      );
      setRecordingState((prev) => ({
        ...prev,
        isSaving: false,
      }));
    }
  };

  /**
   * Handle recording stopped - import MOV file
   */
  const handleRecordingStopped = async () => {
    try {
      // Get the output path from ref (this will be a .mov file from screencapture)
      const filePath = recordingOutputPathRef.current;

      if (!filePath) {
        throw new Error("Recording output path not set");
      }

      // Calculate final elapsed time from ref (for fallback if needed)
      const finalElapsedTime = recordingStartTimeRef.current
        ? (Date.now() - recordingStartTimeRef.current) / 1000
        : elapsedTimeRef.current;

      console.log("[screencapture] Final elapsed time:", finalElapsedTime);
      console.log("[screencapture] MOV file path:", filePath);

      // Wait for screencapture to fully finalize the file
      // screencapture writes the file when it stops, but needs time to flush/finalize
      console.log("[screencapture] Waiting for file to be ready...");
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Verify the MOV file is accessible and has content
      try {
        const fileSize = await window.electronAPI.getFileSize(filePath);
        if (fileSize === 0) {
          throw new Error("Video file is empty");
        }
        console.log(`[screencapture] MOV file verified: ${fileSize} bytes`);
      } catch (err) {
        console.error("[screencapture] File verification failed:", err);
        throw new Error("Video file not ready or is empty");
      }

      // Import the recorded MOV video directly (no conversion needed)
      // Fetch video metadata
      const videoMetadata = await window.electronAPI.getVideoMetadata(filePath);

      console.log("[screencapture] Video metadata:", videoMetadata);

      // Use metadata duration or fallback to elapsed time
      const actualDuration =
        videoMetadata.duration > 0 ? videoMetadata.duration : finalElapsedTime;

      console.log("[screencapture] Using duration:", actualDuration);

      // Update metadata with correct duration (if needed)
      const correctedMetadata: VideoMetadata = {
        ...videoMetadata,
        duration: actualDuration,
      };

      // Generate thumbnail
      const thumbnail = await window.electronAPI.generateThumbnail(filePath);

      // Get file size
      const fileSize = await window.electronAPI.getFileSize(filePath);

      // Create media item
      const fileName = filePath.split("/").pop() || "Unknown";
      const resolution = `${videoMetadata.width}x${videoMetadata.height}`;
      const newMediaItem: MediaItem = {
        id: crypto.randomUUID(),
        filePath: filePath,
        fileName,
        thumbnail,
        duration: correctedMetadata.duration,
        resolution,
        fileSize,
        addedAt: Date.now(),
      };

      // Add to media library
      setMediaLibrary((prev) => [...prev, newMediaItem]);

      // Create new clip at end of timeline
      const newClip = createClip(
        filePath,
        correctedMetadata,
        projectState.totalDuration,
      );
      const updatedClips = addClip(projectState.clips, newClip);
      const newTotalDuration = calculateTotalDuration(updatedClips);

      console.log("[FFmpeg Recording] New clip:", newClip);
      console.log("[FFmpeg Recording] Updated clips:", updatedClips);
      console.log("[FFmpeg Recording] New total duration:", newTotalDuration);

      // Update project state - ensure totalDuration is always a number
      setProjectState({
        ...projectState,
        clips: updatedClips,
        totalDuration:
          typeof newTotalDuration === "number" ? newTotalDuration : 0,
        selectedClipId: newClip.id,
      });

      // Reset recording state
      setRecordingState({
        isRecording: false,
        isPicking: false,
        isSaving: false,
        selectedSource: null,
        startTime: null,
        elapsedTime: 0,
      });

      // Clear refs
      recordingStartTimeRef.current = null;
      elapsedTimeRef.current = 0;
      recordingOutputPathRef.current = null;

      console.log("[FFmpeg Recording] Import completed successfully");
    } catch (err) {
      console.error("Failed to save recording:", err);
      setRecordingError(
        err instanceof Error ? err.message : "Failed to save recording",
      );
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.title}>🎬 ClipForge</h1>
        <p style={styles.subtitle}>Video Editor</p>
      </header>

      {/* Main Layout: Sidebar + Content */}
      <div style={styles.mainLayout}>
        {/* Left Sidebar - Media Library */}
        <MediaLibrary
          items={mediaLibrary}
          onAddToTimeline={handleAddToTimeline}
          onRemove={handleRemoveFromLibrary}
          onDrop={handleFileDrop}
        />

        {/* Main Content */}
        <main style={styles.main}>
          {/* Controls Section */}
          <Controls
            onImport={handleImport}
            videoPath={
              projectState.clips.length > 0
                ? projectState.clips[0].sourceFilePath
                : null
            }
            metadata={
              projectState.clips.length > 0
                ? projectState.clips[0].sourceMetadata
                : null
            }
            isLoading={isLoading}
          />

          {/* Recording Controls */}
          <RecordingControls
            isRecording={recordingState.isRecording}
            isPicking={recordingState.isPicking}
            isSaving={recordingState.isSaving}
            elapsedTime={recordingState.elapsedTime}
            onStartPicking={handleStartPicking}
            onStopRecording={handleStopRecording}
            error={recordingError}
            onOpenSettings={handleOpenSettings}
          />

          {/* Clip Info Display */}
          {projectState.clips.length > 0 && (
            <div style={styles.clipInfo}>
              <div style={styles.clipInfoLabel}>
                Clips on Timeline:{" "}
                <span style={styles.clipInfoValue}>
                  {projectState.clips.length}
                </span>
              </div>
              {projectState.selectedClipId && (
                <div style={styles.clipInfoLabel}>
                  Selected Clip:{" "}
                  <span style={styles.clipInfoValue}>
                    {projectState.clips
                      .find((c) => c.id === projectState.selectedClipId)
                      ?.sourceFilePath.split("/")
                      .pop() || "Unknown"}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div style={styles.errorBox}>
              <span style={styles.errorIcon}>⚠️</span>
              <span style={styles.errorText}>{error}</span>
            </div>
          )}

          {/* Video Player Section - plays current clip at playhead */}
          {projectState.clips.length > 0 && (
            <VideoPlayer
              ref={videoPlayerRef}
              videoPath={
                getClipAtTime(projectState.clips, projectState.currentTime)
                  ?.sourceFilePath || projectState.clips[0].sourceFilePath
              }
              currentTime={projectState.currentTime}
              trimStart={0}
              trimEnd={projectState.totalDuration}
              onTimeUpdate={handleTimeUpdate}
              onPlayPause={handlePlayPause}
            />
          )}

          {/* Timeline Section - Multi-Clip Support */}
          {projectState.clips.length > 0 && (
            <div style={styles.timelineSection}>
              <div style={styles.timelineHeader}>
                <h3 style={styles.sectionTitle}>Timeline</h3>
                {projectState.selectedClipId && (
                  <button
                    onClick={() =>
                      handleClipDelete(projectState.selectedClipId)
                    }
                    style={styles.deleteButton}
                  >
                    Delete Selected Clip
                  </button>
                )}
              </div>
              <Timeline
                clips={projectState.clips}
                selectedClipId={projectState.selectedClipId}
                currentTime={projectState.currentTime}
                totalDuration={projectState.totalDuration}
                onClipSelect={handleClipSelect}
                onClipMove={handleClipMove}
                onClipTrim={handleClipTrim}
                onSeek={handleSeek}
              />
            </div>
          )}

          {/* Timeline Info */}
          {projectState.clips.length > 0 && (
            <div style={styles.trimInfo}>
              <div style={styles.trimInfoLabel}>Total Duration:</div>
              <div style={styles.trimInfoValue}>
                {typeof projectState.totalDuration === "number"
                  ? projectState.totalDuration.toFixed(1)
                  : "0.0"}
                s
              </div>
              <div style={{ ...styles.trimInfoLabel, marginLeft: "24px" }}>
                Playhead:
              </div>
              <div style={styles.trimInfoValue}>
                {typeof projectState.currentTime === "number"
                  ? projectState.currentTime.toFixed(1)
                  : "0.0"}
                s
              </div>
            </div>
          )}

          {/* Export Button - Multi-Clip Support */}
          {projectState.clips.length > 0 && (
            <ExportButton
              clips={projectState.clips}
              onExportComplete={(outputPath) => {
                console.log("Export completed:", outputPath);
                alert(`Video exported successfully!\n\n${outputPath}`);
              }}
            />
          )}
        </main>
      </div>

      {/* Footer */}
      <footer style={styles.footer}>
        <p style={styles.footerText}>
          Agent 1: Screen Recording (Phase 1) ✅ | Agent 3: Media Library ✅ |
          Multi-clip Timeline ✅
        </p>
      </footer>
    </div>
  );
};

export default App;

// Styles
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    backgroundColor: "#0a0a0a",
    color: "#fff",
    overflow: "hidden",
  },
  header: {
    padding: "24px",
    backgroundColor: "#1a1a1a",
    borderBottom: "2px solid #3b82f6",
    textAlign: "center",
  },
  title: {
    fontSize: "32px",
    fontWeight: "bold",
    color: "#3b82f6",
    margin: 0,
    marginBottom: "4px",
  },
  subtitle: {
    fontSize: "14px",
    color: "#888",
    margin: 0,
    textTransform: "uppercase",
    letterSpacing: "2px",
  },
  mainLayout: {
    flex: 1,
    display: "flex",
    overflow: "hidden",
  },
  main: {
    flex: 1,
    padding: "24px",
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    overflowY: "auto",
    overflowX: "hidden",
  },
  errorBox: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "16px",
    backgroundColor: "#2a1515",
    border: "1px solid #ff4444",
    borderRadius: "8px",
  },
  errorIcon: {
    fontSize: "24px",
  },
  errorText: {
    fontSize: "14px",
    color: "#ff6666",
  },
  timelineSection: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: "16px",
    backgroundColor: "#1a1a1a",
    borderRadius: "8px",
    border: "1px solid #333",
  },
  timelineHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: "16px",
    color: "#fff",
    margin: 0,
    fontWeight: "600",
  },
  deleteButton: {
    padding: "8px 16px",
    backgroundColor: "#ff4444",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "background-color 0.2s",
  },
  clipInfo: {
    display: "flex",
    alignItems: "center",
    gap: "24px",
    padding: "12px 16px",
    backgroundColor: "#1a1a1a",
    borderRadius: "6px",
    border: "1px solid #333",
  },
  clipInfoLabel: {
    fontSize: "14px",
    color: "#888",
    fontWeight: "600",
  },
  clipInfoValue: {
    color: "#3b82f6",
    fontWeight: "bold",
  },
  trimInfo: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    backgroundColor: "#1a1a1a",
    borderRadius: "6px",
    border: "1px solid #333",
  },
  trimInfoLabel: {
    fontSize: "14px",
    color: "#888",
    fontWeight: "600",
  },
  trimInfoValue: {
    fontSize: "14px",
    color: "#3b82f6",
    fontFamily: "monospace",
    fontWeight: "bold",
  },
  footer: {
    padding: "16px",
    backgroundColor: "#1a1a1a",
    borderTop: "1px solid #333",
    textAlign: "center",
  },
  footerText: {
    fontSize: "12px",
    color: "#666",
    margin: 0,
  },
};
