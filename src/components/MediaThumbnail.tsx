import { MediaThumbnailProps } from '../types';
import { formatTime } from '../utils/timeFormat';

/**
 * MediaThumbnail component
 * Displays a single media item in the library with thumbnail and metadata
 */
export const MediaThumbnail = ({
  item,
  onClick,
  onRemove,
}: MediaThumbnailProps) => {
  // Format file size to human-readable format
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };

  const handleRemoveClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering onClick
    onRemove();
  };

  return (
    <div
      className="media-thumbnail"
      style={styles.container}
      onClick={onClick}
      draggable="true"
    >
      {/* Thumbnail Image */}
      <div style={styles.thumbnailContainer}>
        <img
          src={window.electronAPI.getFileUrl(item.thumbnail)}
          alt={item.fileName}
          style={styles.thumbnail}
        />
        <div style={styles.durationBadge}>{formatTime(item.duration)}</div>
        <button
          className="media-thumbnail-remove"
          style={styles.removeButton}
          onClick={handleRemoveClick}
          title="Remove from library"
        >
          ×
        </button>
      </div>

      {/* Metadata */}
      <div style={styles.metadata}>
        <div style={styles.fileName} title={item.fileName}>
          {item.fileName}
        </div>
        <div style={styles.metadataRow}>
          <span style={styles.metadataText}>{item.resolution}</span>
          <span style={styles.metadataDivider}>•</span>
          <span style={styles.metadataText}>{formatFileSize(item.fileSize)}</span>
        </div>
      </div>
    </div>
  );
};

// Styles
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    backgroundColor: '#1a1a1a',
    borderRadius: '6px',
    border: '1px solid #333',
    cursor: 'pointer',
    transition: 'all 0.2s',
    overflow: 'hidden',
  },
  thumbnailContainer: {
    position: 'relative',
    width: '100%',
    aspectRatio: '16/9',
    backgroundColor: '#0a0a0a',
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  durationBadge: {
    position: 'absolute',
    bottom: '6px',
    right: '6px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: '#fff',
    padding: '2px 6px',
    borderRadius: '3px',
    fontSize: '11px',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  removeButton: {
    position: 'absolute',
    top: '6px',
    right: '6px',
    width: '24px',
    height: '24px',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: '#fff',
    border: 'none',
    borderRadius: '50%',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: 'bold',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0,
    transition: 'all 0.2s',
    lineHeight: '1',
    padding: '0',
  },
  metadata: {
    padding: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  fileName: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#fff',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  metadataRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: '#888',
  },
  metadataText: {
    fontFamily: 'monospace',
  },
  metadataDivider: {
    color: '#555',
  },
};

// Add hover styles via CSS-in-JS workaround
// Note: In a real application, you might use a CSS-in-JS library or CSS modules
// For now, we'll handle hover states with inline styles
