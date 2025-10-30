import { Stage, Layer, Rect, Line, Text } from 'react-konva';
import { MultiClipTimelineProps } from '../types';
import { timeToPixels, pixelsToTime, PIXELS_PER_SECOND } from '../utils/pixelTimeConversion';
import { formatTime } from '../utils/timeFormat';
import { ClipItem } from './ClipItem';

/**
 * Timeline component - Canvas-based timeline using Konva
 * Shows multiple video clips, playhead, trim handles, and time markers
 * Supports drag-to-reorder and per-clip trimming
 */
export const Timeline = ({
  clips,
  selectedClipId,
  currentTime,
  totalDuration,
  onClipSelect,
  onClipMove,
  onClipTrim,
  onSeek,
}: MultiClipTimelineProps) => {
  // Constants
  const TIMELINE_HEIGHT = 100;
  const TIMELINE_WIDTH = Math.max(800, timeToPixels(totalDuration));
  const PLAYHEAD_COLOR = 'red';
  const MARKER_COLOR = 'white';

  /**
   * Handle clicking on the timeline to seek
   */
  const handleTimelineClick = (e: any) => {
    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    if (pointerPosition) {
      const clickedTime = pixelsToTime(pointerPosition.x);
      // Clamp to total timeline duration
      const clampedTime = Math.max(0, Math.min(totalDuration, clickedTime));
      onSeek(clampedTime);
    }
  };

  /**
   * Generate time markers (every 10 seconds)
   */
  const generateTimeMarkers = () => {
    const markers = [];
    const interval = 10; // seconds
    const markerCount = Math.ceil(totalDuration / interval) + 1;

    for (let i = 0; i <= markerCount; i++) {
      const time = i * interval;
      if (time > totalDuration) break;

      const x = timeToPixels(time);
      markers.push(
        <Text
          key={`marker-${i}`}
          x={x}
          y={85}
          text={formatTime(time)}
          fontSize={12}
          fill={MARKER_COLOR}
          align="center"
          offsetX={20} // Center the text
        />
      );
    }

    return markers;
  };

  return (
    <div style={{ overflowX: 'auto', maxWidth: '100%' }}>
      <Stage width={TIMELINE_WIDTH} height={TIMELINE_HEIGHT} onClick={handleTimelineClick}>
        <Layer>
          {/* Background */}
          <Rect
            x={0}
            y={0}
            width={TIMELINE_WIDTH}
            height={TIMELINE_HEIGHT}
            fill="#1a1a1a"
          />

          {/* Render all clips */}
          {clips.map((clip) => (
            <ClipItem
              key={clip.id}
              clip={clip}
              isSelected={clip.id === selectedClipId}
              pixelsPerSecond={PIXELS_PER_SECOND}
              onSelect={() => onClipSelect(clip.id)}
              onMove={(newTimelineStart) => onClipMove(clip.id, newTimelineStart)}
              onTrim={(newSourceStart, newSourceEnd) =>
                onClipTrim(clip.id, newSourceStart, newSourceEnd)
              }
            />
          ))}

          {/* Playhead (red vertical line) */}
          <Line
            points={[
              timeToPixels(currentTime),
              0,
              timeToPixels(currentTime),
              TIMELINE_HEIGHT,
            ]}
            stroke={PLAYHEAD_COLOR}
            strokeWidth={2}
            listening={false} // Don't block clicks
          />

          {/* Time markers */}
          {generateTimeMarkers()}
        </Layer>
      </Stage>
    </div>
  );
};
