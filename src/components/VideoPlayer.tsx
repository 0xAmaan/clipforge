import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { VideoPlayerProps } from '../types';
import { formatTime } from '../utils/timeFormat';

/**
 * VideoPlayer component handle - methods that can be called from parent
 */
export interface VideoPlayerHandle {
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  getCurrentTime: () => number;
}

/**
 * VideoPlayer component
 * Displays HTML5 video player with play/pause controls and time display
 */
export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  (
    {
      videoPath,
      currentTime,
      trimStart,
      trimEnd,
      onTimeUpdate,
      onPlayPause,
    },
    ref
  ) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    // Expose methods to parent component via ref
    useImperativeHandle(ref, () => ({
      play: () => {
        if (videoRef.current) {
          videoRef.current.play();
        }
      },
      pause: () => {
        if (videoRef.current) {
          videoRef.current.pause();
        }
      },
      seek: (time: number) => {
        if (videoRef.current) {
          videoRef.current.currentTime = time;
        }
      },
      getCurrentTime: () => {
        return videoRef.current?.currentTime || 0;
      },
    }));

    // Handle video time updates
    const handleTimeUpdate = () => {
      if (videoRef.current) {
        const currentTime = videoRef.current.currentTime;

        // Clamp playback to trim boundaries
        if (currentTime < trimStart) {
          videoRef.current.currentTime = trimStart;
        } else if (currentTime > trimEnd) {
          videoRef.current.currentTime = trimEnd;
          videoRef.current.pause();
        }

        onTimeUpdate(videoRef.current.currentTime);
      }
    };

    // Handle play/pause button click
    const handlePlayPause = async () => {
      if (videoRef.current) {
        if (videoRef.current.paused) {
          console.log('Attempting to play video...');
          try {
            await videoRef.current.play();
            console.log('Video playing successfully');
            onPlayPause(true);
          } catch (err) {
            console.error('Play failed:', err);
          }
        } else {
          console.log('Pausing video...');
          videoRef.current.pause();
          onPlayPause(false);
        }
      }
    };

    // Update video source when videoPath changes
    useEffect(() => {
      if (videoRef.current && videoPath) {
        // Convert file path to file:// URL
        const videoUrl = videoPath.startsWith('file://')
          ? videoPath
          : `file://${videoPath}`;

        console.log('Loading video from:', videoUrl);
        videoRef.current.src = videoUrl;

        // Add error handler
        videoRef.current.onerror = (e) => {
          console.error('Video load error:', e);
          console.error('Video error code:', videoRef.current?.error?.code);
          console.error('Video error message:', videoRef.current?.error?.message);
        };

        // Add loaded handler
        videoRef.current.onloadedmetadata = () => {
          console.log('Video loaded successfully');
          console.log('Video duration:', videoRef.current?.duration);
        };
      }
    }, [videoPath]);

    // Seek to currentTime when it's updated externally (e.g., from timeline)
    useEffect(() => {
      if (videoRef.current && Math.abs(videoRef.current.currentTime - currentTime) > 0.5) {
        videoRef.current.currentTime = currentTime;
      }
    }, [currentTime]);

    if (!videoPath) {
      return (
        <div style={styles.emptyState}>
          <p style={styles.emptyStateText}>No video loaded</p>
          <p style={styles.emptyStateSubtext}>
            Click "Import Video" to get started
          </p>
        </div>
      );
    }

    return (
      <div style={styles.container}>
        <video
          ref={videoRef}
          style={styles.video}
          onTimeUpdate={handleTimeUpdate}
          onPlay={() => onPlayPause(true)}
          onPause={() => onPlayPause(false)}
        />

        <div style={styles.controls}>
          <button onClick={handlePlayPause} style={styles.playPauseButton}>
            {videoRef.current?.paused !== false ? '▶ Play' : '⏸ Pause'}
          </button>

          <div style={styles.timeDisplay}>
            <span style={styles.currentTime}>{formatTime(currentTime)}</span>
            <span style={styles.timeSeparator}>/</span>
            <span style={styles.duration}>{formatTime(trimEnd - trimStart)}</span>
          </div>
        </div>
      </div>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';

// Styles
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    backgroundColor: '#000',
    borderRadius: '8px',
    padding: '16px',
  },
  video: {
    width: '100%',
    height: 'auto',
    maxHeight: '400px',
    backgroundColor: '#000',
    borderRadius: '4px',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '8px',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '4px',
  },
  playPauseButton: {
    padding: '8px 16px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'background-color 0.2s',
  },
  timeDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '14px',
    color: 'white',
    fontFamily: 'monospace',
  },
  currentTime: {
    fontWeight: 'bold',
  },
  timeSeparator: {
    opacity: 0.6,
  },
  duration: {
    opacity: 0.8,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '400px',
    backgroundColor: '#1a1a1a',
    borderRadius: '8px',
    padding: '32px',
  },
  emptyStateText: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: '8px',
  },
  emptyStateSubtext: {
    fontSize: '14px',
    color: '#888',
  },
};
