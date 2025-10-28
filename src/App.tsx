import { useState, useRef } from 'react';
import { VideoPlayer, VideoPlayerHandle } from './components/VideoPlayer';
import { Controls } from './components/Controls';
import { Timeline } from './components/Timeline';
import ExportButton from './components/ExportButton';
import { VideoState, VideoMetadata } from './types';
import './index.css';

const App = () => {
  // State management
  const [videoState, setVideoState] = useState<VideoState>({
    filePath: null,
    duration: 0,
    currentTime: 0,
    trimStart: 0,
    trimEnd: 0,
    isPlaying: false,
  });

  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const videoPlayerRef = useRef<VideoPlayerHandle>(null);

  /**
   * Handle video import
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

      // Fetch video metadata
      const videoMetadata = await window.electronAPI.getVideoMetadata(filePath);

      // Update state with video info
      setMetadata(videoMetadata);
      setVideoState({
        filePath,
        duration: videoMetadata.duration,
        currentTime: 0,
        trimStart: 0,
        trimEnd: videoMetadata.duration,
        isPlaying: false,
      });

      console.log('Video imported successfully:', {
        filePath,
        metadata: videoMetadata,
      });
    } catch (err) {
      console.error('Failed to import video:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to import video'
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle video time updates (from video playback)
   */
  const handleTimeUpdate = (time: number) => {
    setVideoState((prev) => ({
      ...prev,
      currentTime: time,
    }));
  };

  /**
   * Handle play/pause state changes
   */
  const handlePlayPause = (isPlaying: boolean) => {
    setVideoState((prev) => ({
      ...prev,
      isPlaying,
    }));
  };

  /**
   * Handle seeking from timeline
   */
  const handleSeek = (time: number) => {
    setVideoState((prev) => ({
      ...prev,
      currentTime: time,
    }));

    // Seek the video player if it exists
    if (videoPlayerRef.current) {
      videoPlayerRef.current.seek(time);
    }
  };

  /**
   * Handle trim changes from timeline
   */
  const handleTrimChange = (start: number, end: number) => {
    setVideoState((prev) => ({
      ...prev,
      trimStart: start,
      trimEnd: end,
    }));
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.title}>🎬 ClipForge</h1>
        <p style={styles.subtitle}>Video Editor</p>
      </header>

      {/* Main Content */}
      <main style={styles.main}>
        {/* Controls Section */}
        <Controls
          onImport={handleImport}
          videoPath={videoState.filePath}
          metadata={metadata}
          isLoading={isLoading}
        />

        {/* Error Display */}
        {error && (
          <div style={styles.errorBox}>
            <span style={styles.errorIcon}>⚠️</span>
            <span style={styles.errorText}>{error}</span>
          </div>
        )}

        {/* Video Player Section */}
        <VideoPlayer
          ref={videoPlayerRef}
          videoPath={videoState.filePath}
          currentTime={videoState.currentTime}
          trimStart={videoState.trimStart}
          trimEnd={videoState.trimEnd}
          onTimeUpdate={handleTimeUpdate}
          onPlayPause={handlePlayPause}
        />

        {/* Timeline Section (Agent 2) */}
        {videoState.filePath && videoState.duration > 0 && (
          <div style={styles.timelineSection}>
            <h3 style={styles.sectionTitle}>Timeline</h3>
            <Timeline
              duration={videoState.duration}
              currentTime={videoState.currentTime}
              trimStart={videoState.trimStart}
              trimEnd={videoState.trimEnd}
              onSeek={handleSeek}
              onTrimChange={handleTrimChange}
            />
          </div>
        )}

        {/* Trim Info */}
        {videoState.filePath && (
          <div style={styles.trimInfo}>
            <div style={styles.trimInfoLabel}>Trim Range:</div>
            <div style={styles.trimInfoValue}>
              {videoState.trimStart.toFixed(1)}s → {videoState.trimEnd.toFixed(1)}s
            </div>
          </div>
        )}

        {/* Export Button (Agent 3) */}
        {videoState.filePath && (
          <ExportButton
            videoPath={videoState.filePath}
            trimStart={videoState.trimStart}
            trimEnd={videoState.trimEnd}
            onExportComplete={(outputPath) => {
              console.log('Export completed:', outputPath);
              alert(`Video exported successfully!\n\n${outputPath}`);
            }}
          />
        )}
      </main>

      {/* Footer */}
      <footer style={styles.footer}>
        <p style={styles.footerText}>
          Agent 1: Video Player & Import ✅ | Agent 2: Timeline UI ✅ | Agent 3: Trim/Export ✅
        </p>
      </footer>
    </div>
  );
};

export default App;

// Styles
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    backgroundColor: '#0a0a0a',
    color: '#fff',
    overflow: 'hidden',
  },
  header: {
    padding: '24px',
    backgroundColor: '#1a1a1a',
    borderBottom: '2px solid #3b82f6',
    textAlign: 'center',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#3b82f6',
    margin: 0,
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#888',
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '2px',
  },
  main: {
    flex: 1,
    padding: '24px',
    maxWidth: '1200px',
    width: '100%',
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    overflowY: 'auto',
    overflowX: 'hidden',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#2a1515',
    border: '1px solid #ff4444',
    borderRadius: '8px',
  },
  errorIcon: {
    fontSize: '24px',
  },
  errorText: {
    fontSize: '14px',
    color: '#ff6666',
  },
  timelineSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#1a1a1a',
    borderRadius: '8px',
    border: '1px solid #333',
  },
  sectionTitle: {
    fontSize: '16px',
    color: '#fff',
    margin: 0,
    fontWeight: '600',
  },
  trimInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#1a1a1a',
    borderRadius: '6px',
    border: '1px solid #333',
  },
  trimInfoLabel: {
    fontSize: '14px',
    color: '#888',
    fontWeight: '600',
  },
  trimInfoValue: {
    fontSize: '14px',
    color: '#3b82f6',
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  footer: {
    padding: '16px',
    backgroundColor: '#1a1a1a',
    borderTop: '1px solid #333',
    textAlign: 'center',
  },
  footerText: {
    fontSize: '12px',
    color: '#666',
    margin: 0,
  },
};
