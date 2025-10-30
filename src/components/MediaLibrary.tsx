import { useState } from 'react';
import { MediaLibraryProps } from '../types';
import { MediaThumbnail } from './MediaThumbnail';

/**
 * MediaLibrary component
 * Left sidebar displaying imported media with drag-and-drop support
 */
export const MediaLibrary = ({
  items,
  onAddToTimeline,
  onRemove,
}: MediaLibraryProps) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // Get dropped files
    const files = Array.from(e.dataTransfer.files);

    // Filter for video files
    const videoFiles = files.filter(file =>
      file.type.startsWith('video/') ||
      file.name.match(/\.(mp4|mov|avi|webm|mkv)$/i)
    );

    if (videoFiles.length === 0) {
      console.warn('No video files detected in drop');
      return;
    }

    // Pass file paths to parent component for processing
    // We need to get the file path from the File object
    for (const file of videoFiles) {
      // In Electron, we can access the path property
      const filePath = (file as any).path;
      if (filePath) {
        // Call the onDrop handler passed from parent
        if (onDrop) {
          onDrop(filePath);
        }
      }
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerTitle}>Media Library</div>
        <div style={styles.headerCount}>{items.length} items</div>
      </div>

      {/* Drag-drop zone */}
      <div
        className={isDragOver ? 'media-library-drag-over' : ''}
        style={{
          ...styles.dropZone,
          ...(isDragOver ? styles.dropZoneActive : {}),
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div style={styles.dropZoneIcon}>📁</div>
        <div style={styles.dropZoneText}>
          {isDragOver ? 'Drop files here' : 'Drag & drop videos here'}
        </div>
        <div style={styles.dropZoneSubtext}>
          or use the Import button above
        </div>
      </div>

      {/* Media items list */}
      <div style={styles.itemsContainer}>
        {items.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyStateIcon}>🎬</div>
            <div style={styles.emptyStateText}>No media imported yet</div>
            <div style={styles.emptyStateSubtext}>
              Import videos to get started
            </div>
          </div>
        ) : (
          <div style={styles.itemsGrid}>
            {items.map((item) => (
              <MediaThumbnail
                key={item.id}
                item={item}
                onClick={() => onAddToTimeline(item)}
                onRemove={() => onRemove(item.id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Styles
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    width: '300px',
    height: '100%',
    backgroundColor: '#0a0a0a',
    borderRight: '1px solid #333',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    borderBottom: '1px solid #333',
    backgroundColor: '#1a1a1a',
  },
  headerTitle: {
    fontSize: '16px',
    fontWeight: '700',
    color: '#fff',
    letterSpacing: '0.5px',
  },
  headerCount: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#888',
    backgroundColor: '#2a2a2a',
    padding: '4px 8px',
    borderRadius: '4px',
    fontFamily: 'monospace',
  },
  dropZone: {
    margin: '16px',
    padding: '24px',
    border: '2px dashed #333',
    borderRadius: '8px',
    backgroundColor: '#1a1a1a',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s',
  },
  dropZoneActive: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  dropZoneIcon: {
    fontSize: '32px',
    opacity: 0.7,
  },
  dropZoneText: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  dropZoneSubtext: {
    fontSize: '11px',
    color: '#888',
    textAlign: 'center',
  },
  itemsContainer: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    padding: '16px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '48px 24px',
    textAlign: 'center',
  },
  emptyStateIcon: {
    fontSize: '48px',
    opacity: 0.3,
  },
  emptyStateText: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#888',
  },
  emptyStateSubtext: {
    fontSize: '12px',
    color: '#666',
  },
  itemsGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
};
