import { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Line, Text } from 'react-konva';
import { MultiClipTimelineProps } from '../types';
import { formatTime } from '../utils/timeFormat';
import { ClipItem } from './ClipItem';

/**
 * Timeline component - Canvas-based timeline using Konva
 * Shows multiple video clips, playhead, trim handles, and time markers
 * Supports drag-to-reorder, per-clip trimming, and horizontal scrolling for long timelines
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
  onScrub,
  onScrubEnd,
}: MultiClipTimelineProps) => {
  // Container width tracking
  const [containerWidth, setContainerWidth] = useState(800);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scrubber state (for hover preview)
  const [isHovering, setIsHovering] = useState(false);
  const [scrubberTime, setScrubberTime] = useState(0);
  const scrubAnimationFrameRef = useRef<number | null>(null);
  const lastScrubTimeRef = useRef<number>(0);

  // Constants
  const CLIP_HEIGHT = 120; // Doubled from 60px
  const PLAYHEAD_COLOR = '#9CA3AF'; // Gray for actual playhead
  const SCRUBBER_COLOR = '#EF4444'; // Red for hover scrubber
  const MARKER_COLOR = 'white';
  const DEFAULT_TIMELINE_DURATION = 300; // 5 minutes in seconds

  // Fixed timeline track height
  const TIMELINE_HEIGHT = 140; // Height for the canvas
  const CLIP_Y = 10; // Small padding from top of canvas

  // Calculate effective timeline duration (minimum 5 minutes)
  const effectiveDuration = Math.max(DEFAULT_TIMELINE_DURATION, totalDuration);

  // Padding for timestamp text (to prevent cutoff at edges) - ONLY for text labels, not functional positioning
  const TEXT_PADDING = 60; // 30px on each side for timestamp text visibility

  // Calculate pixels per second: fit 5 minutes in view, then become scrollable for longer durations
  const PIXELS_PER_SECOND = containerWidth / DEFAULT_TIMELINE_DURATION;

  // Calculate timeline width - add extra padding so end markers don't get cut off
  // The extra width allows the 5:00 marker text to be fully visible
  const TIMELINE_WIDTH = effectiveDuration * PIXELS_PER_SECOND + 50; // Padding for marker text (25px on each side)

  // Update container width on resize
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Helper functions for pixel conversion
  const timeToPixels = (time: number): number => {
    return time * PIXELS_PER_SECOND;
  };

  const pixelsToTime = (pixels: number): number => {
    return pixels / PIXELS_PER_SECOND;
  };

  /**
   * Handle mouse move over timeline (for scrubber preview)
   * Throttled with requestAnimationFrame for performance
   */
  const handleTimelineMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    if (pointerPosition) {
      const hoveredTime = pixelsToTime(pointerPosition.x);
      const clampedTime = Math.max(0, Math.min(effectiveDuration, hoveredTime));

      // Update scrubber position immediately for visual feedback
      setScrubberTime(clampedTime);
      setIsHovering(true);

      // Throttle video preview updates with requestAnimationFrame
      if (onScrub && scrubAnimationFrameRef.current === null) {
        scrubAnimationFrameRef.current = requestAnimationFrame(() => {
          // Only update if time has changed significantly (>0.1s)
          if (Math.abs(clampedTime - lastScrubTimeRef.current) > 0.1) {
            onScrub(clampedTime);
            lastScrubTimeRef.current = clampedTime;
          }
          scrubAnimationFrameRef.current = null;
        });
      }
    }
  };

  /**
   * Handle mouse leave timeline (hide scrubber)
   */
  const handleTimelineMouseLeave = () => {
    setIsHovering(false);
    // Cancel any pending animation frame
    if (scrubAnimationFrameRef.current !== null) {
      cancelAnimationFrame(scrubAnimationFrameRef.current);
      scrubAnimationFrameRef.current = null;
    }
    // Notify parent that scrubbing has ended
    if (onScrubEnd) {
      onScrubEnd();
    }
  };

  // Cleanup animation frame on unmount
  useEffect(() => {
    return () => {
      if (scrubAnimationFrameRef.current !== null) {
        cancelAnimationFrame(scrubAnimationFrameRef.current);
      }
    };
  }, []);

  /**
   * Handle clicking on the timeline to seek
   */
  const handleTimelineClick = (e: any) => {
    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    if (pointerPosition) {
      const clickedTime = pixelsToTime(pointerPosition.x);
      // Clamp to effective timeline duration
      const clampedTime = Math.max(0, Math.min(effectiveDuration, clickedTime));
      onSeek(clampedTime);
    }
  };


  // Ref for syncing scroll between timestamp row and canvas
  const timestampScrollRef = useRef<HTMLDivElement>(null);

  // Sync scroll position between timestamp row and canvas
  const handleCanvasScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (timestampScrollRef.current) {
      timestampScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      {/* Time markers row */}
      <div
        ref={timestampScrollRef}
        className="relative h-6 overflow-x-auto overflow-y-hidden flex-shrink-0 bg-[#2a2a2a] flex items-center"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        <div
          className="relative pointer-events-none"
          style={{
            width: TIMELINE_WIDTH,
            height: '100%',
          }}
        >
          {(() => {
            const markers = [];
            const interval = 30; // 30 second intervals

            // Add markers at regular intervals
            for (let time = 0; time < effectiveDuration; time += interval) {
              const x = timeToPixels(time);
              // Special case for 0:00 - left align with small padding to prevent cutoff
              const isStart = time === 0;
              markers.push(
                <div
                  key={`marker-${time}`}
                  className="absolute text-xs text-gray-400 font-mono"
                  style={{
                    left: isStart ? `${x + 10}px` : `${x}px`,
                    top: '50%',
                    transform: isStart ? 'translateY(-50%)' : 'translate(-50%, -50%)',
                  }}
                >
                  {formatTime(time)}
                </div>
              );
            }

            // Always add the final marker at the end - right aligned with padding to prevent cutoff
            const finalX = timeToPixels(effectiveDuration);
            markers.push(
              <div
                key={`marker-${effectiveDuration}`}
                className="absolute text-xs text-gray-400 font-mono"
                style={{
                  left: `${finalX - 10}px`,
                  top: '50%',
                  transform: 'translate(-100%, -50%)', // Right align instead of center
                }}
              >
                {formatTime(effectiveDuration)}
              </div>
            );

            return markers;
          })()}
        </div>
      </div>

      {/* Timeline canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden relative"
        onScroll={handleCanvasScroll}
        style={{ cursor: 'default', display: 'flex', alignItems: 'center' }}
      >
        {/* Invisible overlay for capturing mouse events in empty space */}
        {/* Uses pointer-events: auto but positioned behind Konva canvas (z-10) */}
        <div
          className="absolute"
          style={{
            cursor: 'default',
            width: `${TIMELINE_WIDTH}px`,
            height: '100%',
            top: 0,
            left: 0,
            zIndex: 10, // Behind Konva Stage (which is z-index auto/0 in stacking context)
            pointerEvents: 'auto',
          }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left + containerRef.current!.scrollLeft;
            const hoveredTime = pixelsToTime(x);
            const clampedTime = Math.max(0, Math.min(effectiveDuration, hoveredTime));
            setScrubberTime(clampedTime);
            setIsHovering(true);

            // Throttle video preview updates with requestAnimationFrame
            if (onScrub && scrubAnimationFrameRef.current === null) {
              scrubAnimationFrameRef.current = requestAnimationFrame(() => {
                if (Math.abs(clampedTime - lastScrubTimeRef.current) > 0.1) {
                  onScrub(clampedTime);
                  lastScrubTimeRef.current = clampedTime;
                }
                scrubAnimationFrameRef.current = null;
              });
            }
          }}
          onMouseLeave={handleTimelineMouseLeave}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left + containerRef.current!.scrollLeft;
            const clickedTime = pixelsToTime(x);
            const clampedTime = Math.max(0, Math.min(effectiveDuration, clickedTime));
            onSeek(clampedTime);
          }}
        />

        {/* Scrubber line (red - shows on hover) - z-index: 30 (above Konva) */}
        {isHovering && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${timeToPixels(scrubberTime)}px`,
              top: '-24px', // Extend up into timestamp area (24px = 6px timestamp height)
              width: '2px',
              height: 'calc(100% + 24px)',
              backgroundColor: SCRUBBER_COLOR,
              zIndex: 30,
            }}
          />
        )}

        {/* Playhead line (white - shows actual playback position) - z-index: 40 (above scrubber) */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${timeToPixels(currentTime)}px`,
            top: '-24px', // Extend up into timestamp area
            width: '2px',
            height: 'calc(100% + 24px)',
            backgroundColor: 'white',
            zIndex: 40,
          }}
        />

      <Stage
        width={TIMELINE_WIDTH}
        height={TIMELINE_HEIGHT}
        onMouseMove={handleTimelineMouseMove}
        onMouseLeave={handleTimelineMouseLeave}
        style={{ position: 'relative', zIndex: 20, cursor: 'default' }}
      >
        <Layer>
          {/* Background - capture clicks for seeking */}
          <Rect
            x={0}
            y={0}
            width={TIMELINE_WIDTH}
            height={TIMELINE_HEIGHT}
            fill="#1a1a1a"
            onClick={handleTimelineClick}
          />

          {/* Empty timeline track - visible when no clips */}
          <Rect
            x={0}
            y={CLIP_Y}
            width={TIMELINE_WIDTH}
            height={CLIP_HEIGHT}
            fill="#000000"
            cornerRadius={4}
          />

          {/* Render all clips */}
          {clips.map((clip) => (
            <ClipItem
              key={clip.id}
              clip={clip}
              isSelected={clip.id === selectedClipId}
              pixelsPerSecond={PIXELS_PER_SECOND}
              xOffset={0}
              onSelect={() => onClipSelect(clip.id)}
              onMove={(newTimelineStart) => onClipMove(clip.id, newTimelineStart)}
              onTrim={(newSourceStart, newSourceEnd) =>
                onClipTrim(clip.id, newSourceStart, newSourceEnd)
              }
            />
          ))}

        </Layer>
      </Stage>
      </div>
    </div>
  );
};
