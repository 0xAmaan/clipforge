import { Stage, Layer, Rect, Line, Text } from 'react-konva';
import { TimelineProps } from '../types';
import { timeToPixels, pixelsToTime, PIXELS_PER_SECOND } from '../utils/pixelTimeConversion';
import { formatTime } from '../utils/timeFormat';

/**
 * Timeline component - Canvas-based timeline using Konva
 * Shows video clip, playhead, trim handles, and time markers
 */
export const Timeline = ({
  duration,
  currentTime,
  trimStart,
  trimEnd,
  onSeek,
  onTrimChange,
}: TimelineProps) => {
  // Constants
  const TIMELINE_HEIGHT = 100;
  const TIMELINE_WIDTH = Math.max(800, timeToPixels(duration));
  const CLIP_Y = 20;
  const CLIP_HEIGHT = 60;
  const HANDLE_WIDTH = 10;

  // Colors
  const CLIP_COLOR = 'rgba(59, 130, 246, 0.5)'; // Blue
  const CLIP_STROKE = 'rgb(59, 130, 246)';
  const HANDLE_COLOR = 'white';
  const HANDLE_STROKE = 'black';
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
      // Clamp to trimmed region
      const clampedTime = Math.max(trimStart, Math.min(trimEnd, clickedTime));
      onSeek(clampedTime);
    }
  };

  /**
   * Handle dragging the left trim handle
   */
  const handleLeftTrimDrag = (e: any) => {
    const newX = e.target.x();
    const newStart = pixelsToTime(newX + HANDLE_WIDTH / 2);

    // Constrain: can't go before 0 or past trimEnd
    const constrainedStart = Math.max(0, Math.min(newStart, trimEnd - 0.5));
    onTrimChange(constrainedStart, trimEnd);
  };

  /**
   * Handle dragging the right trim handle
   */
  const handleRightTrimDrag = (e: any) => {
    const newX = e.target.x();
    const newEnd = pixelsToTime(newX + HANDLE_WIDTH / 2);

    // Constrain: can't go past duration or before trimStart
    const constrainedEnd = Math.max(trimStart + 0.5, Math.min(newEnd, duration));
    onTrimChange(trimStart, constrainedEnd);
  };

  /**
   * Constrain left trim handle position during drag
   */
  const constrainLeftHandle = (pos: any) => {
    const minX = 0 - HANDLE_WIDTH / 2;
    const maxX = timeToPixels(trimEnd) - HANDLE_WIDTH / 2 - 5; // Leave 5px gap
    return {
      x: Math.max(minX, Math.min(pos.x, maxX)),
      y: CLIP_Y,
    };
  };

  /**
   * Constrain right trim handle position during drag
   */
  const constrainRightHandle = (pos: any) => {
    const minX = timeToPixels(trimStart) - HANDLE_WIDTH / 2 + 5; // Leave 5px gap
    const maxX = timeToPixels(duration) - HANDLE_WIDTH / 2;
    return {
      x: Math.max(minX, Math.min(pos.x, maxX)),
      y: CLIP_Y,
    };
  };

  /**
   * Generate time markers (every 10 seconds)
   */
  const generateTimeMarkers = () => {
    const markers = [];
    const interval = 10; // seconds
    const markerCount = Math.ceil(duration / interval) + 1;

    for (let i = 0; i <= markerCount; i++) {
      const time = i * interval;
      if (time > duration) break;

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

          {/* Clip rectangle (showing trimmed portion) */}
          <Rect
            x={timeToPixels(trimStart)}
            y={CLIP_Y}
            width={timeToPixels(trimEnd - trimStart)}
            height={CLIP_HEIGHT}
            fill={CLIP_COLOR}
            stroke={CLIP_STROKE}
            strokeWidth={2}
          />

          {/* Left trim handle */}
          <Rect
            x={timeToPixels(trimStart) - HANDLE_WIDTH / 2}
            y={CLIP_Y}
            width={HANDLE_WIDTH}
            height={CLIP_HEIGHT}
            fill={HANDLE_COLOR}
            stroke={HANDLE_STROKE}
            strokeWidth={2}
            draggable={true}
            dragBoundFunc={constrainLeftHandle}
            onDragEnd={handleLeftTrimDrag}
            cursor="ew-resize"
          />

          {/* Right trim handle */}
          <Rect
            x={timeToPixels(trimEnd) - HANDLE_WIDTH / 2}
            y={CLIP_Y}
            width={HANDLE_WIDTH}
            height={CLIP_HEIGHT}
            fill={HANDLE_COLOR}
            stroke={HANDLE_STROKE}
            strokeWidth={2}
            draggable={true}
            dragBoundFunc={constrainRightHandle}
            onDragEnd={handleRightTrimDrag}
            cursor="ew-resize"
          />

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
