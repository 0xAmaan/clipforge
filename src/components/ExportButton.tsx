import { useState, useEffect } from 'react';
import { ExportProps } from '../types';
import { validateTrimTimes, generateOutputFilename, formatTime } from '../utils/trimValidation';

/**
 * ExportButton Component
 * Handles video export with progress tracking and error handling
 */
const ExportButton = ({ videoPath, trimStart, trimEnd, onExportComplete }: ExportProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Set up progress listener on mount
  useEffect(() => {
    window.electronAPI.onExportProgress((progress: number) => {
      setExportProgress(Math.round(progress));
    });
  }, []);

  const handleExport = async () => {
    try {
      // Reset state
      setError(null);
      setSuccessMessage(null);
      setExportProgress(0);

      // Get video duration from metadata (we'll need this from App.tsx)
      // For now, we'll validate using trimEnd as the max duration
      const duration = trimEnd; // This assumes trimEnd is the video duration initially

      // Validate trim times
      const validation = validateTrimTimes(trimStart, trimEnd, duration);
      if (!validation.isValid) {
        setError(validation.error || 'Invalid trim times');
        return;
      }

      // Generate suggested output filename
      const suggestedFilename = generateOutputFilename(videoPath);

      // Show save dialog
      const outputPath = await window.electronAPI.saveFile(suggestedFilename);

      if (!outputPath) {
        // User cancelled the save dialog
        return;
      }

      // Start export
      setIsExporting(true);

      // Trim video using FFmpeg
      const result = await window.electronAPI.trimVideo(
        videoPath,
        outputPath,
        trimStart,
        trimEnd
      );

      // Success!
      setIsExporting(false);
      setSuccessMessage(`Video exported successfully to: ${result}`);

      // Call the completion callback
      onExportComplete(result);

    } catch (err) {
      setIsExporting(false);
      setError(err instanceof Error ? err.message : 'Export failed');
      console.error('Export error:', err);
    }
  };

  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Export Info */}
      <div style={{
        fontSize: '14px',
        color: '#6b7280',
        display: 'flex',
        gap: '16px'
      }}>
        <span>
          <strong>Trim Start:</strong> {formatTime(trimStart)}
        </span>
        <span>
          <strong>Trim End:</strong> {formatTime(trimEnd)}
        </span>
        <span>
          <strong>Duration:</strong> {formatTime(trimEnd - trimStart)}
        </span>
      </div>

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={isExporting || !videoPath}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          fontWeight: '600',
          backgroundColor: isExporting ? '#9ca3af' : '#10b981',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: isExporting || !videoPath ? 'not-allowed' : 'pointer',
          transition: 'background-color 0.2s',
          opacity: isExporting || !videoPath ? 0.6 : 1,
        }}
        onMouseEnter={(e) => {
          if (!isExporting && videoPath) {
            e.currentTarget.style.backgroundColor = '#059669';
          }
        }}
        onMouseLeave={(e) => {
          if (!isExporting && videoPath) {
            e.currentTarget.style.backgroundColor = '#10b981';
          }
        }}
      >
        {isExporting ? `Exporting... ${exportProgress}%` : 'Export Trimmed Video'}
      </button>

      {/* Progress Bar */}
      {isExporting && (
        <div style={{
          width: '100%',
          height: '8px',
          backgroundColor: '#e5e7eb',
          borderRadius: '4px',
          overflow: 'hidden',
        }}>
          <div
            style={{
              width: `${exportProgress}%`,
              height: '100%',
              backgroundColor: '#10b981',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div style={{
          padding: '12px',
          backgroundColor: '#d1fae5',
          color: '#065f46',
          borderRadius: '6px',
          fontSize: '14px',
          wordBreak: 'break-word',
        }}>
          ✓ {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={{
          padding: '12px',
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          borderRadius: '6px',
          fontSize: '14px',
        }}>
          ✗ {error}
        </div>
      )}
    </div>
  );
};

export default ExportButton;
