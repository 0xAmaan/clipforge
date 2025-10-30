import { Rect, Group } from "react-konva";
import type { ClipItemProps } from "../types";
import { timeToPixels } from "../utils/pixelTimeConversion";

// Visual constants
const CLIP_HEIGHT = 60;
const CLIP_Y = 20;
const HANDLE_WIDTH = 10;

// Colors
const CLIP_COLOR = "#3b82f6";
const CLIP_COLOR_SELECTED = "#60a5fa";
const CLIP_COLOR_HOVER = "#2563eb";
const CLIP_STROKE = "#1e40af";
const CLIP_STROKE_SELECTED = "#3b82f6";
const HANDLE_COLOR = "#fbbf24";
const HANDLE_COLOR_HOVER = "#f59e0b";

export const ClipItem = ({
  clip,
  isSelected,
  pixelsPerSecond,
  xOffset = 0,
  onSelect,
  onMove,
  onTrim,
}: ClipItemProps) => {
  const clipX = timeToPixels(clip.timelineStart) + xOffset;
  const clipWidth = timeToPixels(clip.duration);

  // Calculate trim handle positions relative to source video
  const leftTrimX = clipX;
  const rightTrimX = clipX + clipWidth - HANDLE_WIDTH;

  /**
   * Handle clip body dragging (reordering on timeline)
   */
  const handleClipDragEnd = (e: any) => {
    const newX = e.target.x();
    const newTimelineStart = Math.max(0, (newX - xOffset) / pixelsPerSecond);
    onMove(newTimelineStart);

    // Reset drag position (let parent handle state update)
    e.target.x(clipX);
  };

  /**
   * Handle left trim handle dragging
   */
  const handleLeftTrimDrag = (e: any) => {
    const newX = e.target.x();
    const newSourceStart = Math.max(
      0,
      Math.min(
        clip.sourceStart + (newX - leftTrimX) / pixelsPerSecond,
        clip.sourceEnd - 0.5 // Min 0.5s clip duration
      )
    );

    onTrim(newSourceStart, clip.sourceEnd);
  };

  /**
   * Handle right trim handle dragging
   */
  const handleRightTrimDrag = (e: any) => {
    const newX = e.target.x();
    const sourceMetadata = clip.sourceMetadata;
    const maxSourceEnd = sourceMetadata?.duration || clip.sourceEnd;

    const newSourceEnd = Math.max(
      clip.sourceStart + 0.5, // Min 0.5s clip duration
      Math.min(
        clip.sourceEnd + (newX - rightTrimX) / pixelsPerSecond,
        maxSourceEnd
      )
    );

    onTrim(clip.sourceStart, newSourceEnd);
  };

  return (
    <Group>
      {/* Clip Body - Draggable for reordering */}
      <Rect
        x={clipX}
        y={CLIP_Y}
        width={clipWidth}
        height={CLIP_HEIGHT}
        fill={isSelected ? CLIP_COLOR_SELECTED : CLIP_COLOR}
        stroke={isSelected ? CLIP_STROKE_SELECTED : CLIP_STROKE}
        strokeWidth={isSelected ? 3 : 2}
        cornerRadius={4}
        draggable
        onDragEnd={handleClipDragEnd}
        onClick={onSelect}
        onTap={onSelect}
        onMouseEnter={(e) => {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = "move";
        }}
        onMouseLeave={(e) => {
          const container = e.target.getStage()?.container();
          if (container) container.style.cursor = "default";
        }}
      />

      {/* Left Trim Handle */}
      {isSelected && (
        <Rect
          x={leftTrimX}
          y={CLIP_Y}
          width={HANDLE_WIDTH}
          height={CLIP_HEIGHT}
          fill={HANDLE_COLOR}
          cornerRadius={[4, 0, 0, 4]}
          draggable
          dragBoundFunc={(pos) => {
            // Constrain dragging to clip bounds
            return {
              x: Math.max(
                clipX - timeToPixels(clip.sourceStart),
                Math.min(pos.x, clipX + clipWidth - HANDLE_WIDTH - timeToPixels(0.5))
              ),
              y: CLIP_Y,
            };
          }}
          onDragMove={handleLeftTrimDrag}
          onDragEnd={() => {
            // Snap back to correct position
            // (parent state update will re-render)
          }}
          onMouseEnter={(e) => {
            const container = e.target.getStage()?.container();
            if (container) container.style.cursor = "ew-resize";
            e.target.fill(HANDLE_COLOR_HOVER);
          }}
          onMouseLeave={(e) => {
            const container = e.target.getStage()?.container();
            if (container) container.style.cursor = "default";
            e.target.fill(HANDLE_COLOR);
          }}
        />
      )}

      {/* Right Trim Handle */}
      {isSelected && (
        <Rect
          x={rightTrimX}
          y={CLIP_Y}
          width={HANDLE_WIDTH}
          height={CLIP_HEIGHT}
          fill={HANDLE_COLOR}
          cornerRadius={[0, 4, 4, 0]}
          draggable
          dragBoundFunc={(pos) => {
            const sourceMetadata = clip.sourceMetadata;
            const maxSourceEnd = sourceMetadata?.duration || clip.sourceEnd;

            // Constrain dragging to clip bounds
            return {
              x: Math.max(
                clipX + timeToPixels(0.5),
                Math.min(
                  pos.x,
                  clipX + timeToPixels(maxSourceEnd - clip.sourceStart) - HANDLE_WIDTH
                )
              ),
              y: CLIP_Y,
            };
          }}
          onDragMove={handleRightTrimDrag}
          onDragEnd={() => {
            // Snap back to correct position
            // (parent state update will re-render)
          }}
          onMouseEnter={(e) => {
            const container = e.target.getStage()?.container();
            if (container) container.style.cursor = "ew-resize";
            e.target.fill(HANDLE_COLOR_HOVER);
          }}
          onMouseLeave={(e) => {
            const container = e.target.getStage()?.container();
            if (container) container.style.cursor = "default";
            e.target.fill(HANDLE_COLOR);
          }}
        />
      )}
    </Group>
  );
};
