import { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Line, Text } from 'react-konva';
import { MultiClipTimelineProps } from '../types';
import { formatTime } from '../utils/timeFormat';
import { ClipItem } from './ClipItem';

/**
 * Timeline component - Canvas-based timeline using Konva
 * Shows multiple video clips, playhead, trim handles, and time markers
 * Supports drag-to-reorder, per-clip trimming, and scroll wheel zoom
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
}: MultiClipTimelineProps) => {
  // Zoom state (pixels per second)
  const [basePixelsPerSecond, setBasePixelsPerSecond] = useState(20);
  const [containerWidth, setContainerWidth] = useState(800);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scrubber state (for hover preview)
  const [isHovering, setIsHovering] = useState(false);
  const [scrubberTime, setScrubberTime] = useState(0);
  const scrubAnimationFrameRef = useRef<number | null>(null);
  const lastScrubTimeRef = useRef<number>(0);

  // Constants
  const CLIP_HEIGHT = 120; // Doubled from 60px
  const MIN_ZOOM = 5; // Minimum pixels per second
  const MAX_ZOOM = 100; // Maximum pixels per second
  const PLAYHEAD_COLOR = '#9CA3AF'; // Gray for actual playhead
  const SCRUBBER_COLOR = '#EF4444'; // Red for hover scrubber
  const MARKER_COLOR = 'white';
  const DEFAULT_TIMELINE_DURATION = 300; // 5 minutes in seconds

  // Fixed timeline track height
  const TIMELINE_HEIGHT = 140; // Height for the canvas
  const CLIP_Y = 10; // Small padding from top of canvas

  // Calculate effective timeline duration (minimum 5 minutes)
  const effectiveDuration = Math.max(DEFAULT_TIMELINE_DURATION, totalDuration);

  // Padding for timestamp text (to prevent cutoff at edges)
  const TEXT_PADDING = 60; // 30px on each side for timestamp text visibility

  // Calculate pixels per second based on whether we need to fit or scroll
  const pixelsPerSecond = effectiveDuration <= DEFAULT_TIMELINE_DURATION
    ? Math.max((containerWidth - TEXT_PADDING) / DEFAULT_TIMELINE_DURATION, 1)
    : basePixelsPerSecond;

  // Calculate timeline width (add padding back for the canvas)
  const TIMELINE_WIDTH = (effectiveDuration * pixelsPerSecond) + TEXT_PADDING;

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

  // Helper functions for pixel conversion with current zoom
  const timeToPixelsZoomed = (time: number): number => {
    return time * pixelsPerSecond;
  };

  const pixelsToTimeZoomed = (pixels: number): number => {
    return pixels / pixelsPerSecond;
  };

  /**
   * Handle scroll wheel zoom
   */
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    // Only zoom when Ctrl/Cmd is pressed (standard zoom gesture)
    if (!e.ctrlKey && !e.metaKey) {
      return;
    }

    e.preventDefault();

    const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1; // Zoom out or in
    const newZoom = basePixelsPerSecond * zoomDelta;

    // Clamp zoom level
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    setBasePixelsPerSecond(clampedZoom);
  };

  /**
   * Handle mouse move over timeline (for scrubber preview)
   * Throttled with requestAnimationFrame for performance
   */
  const handleTimelineMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const pointerPosition = stage.getPointerPosition();
    if (pointerPosition) {
      const hoveredTime = pixelsToTimeZoomed(pointerPosition.x);
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
      const clickedTime = pixelsToTimeZoomed(pointerPosition.x);
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
        className="relative h-6 overflow-x-hidden overflow-y-hidden flex-shrink-0 bg-[#2a2a2a] flex items-center"
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
            const interval = pixelsPerSecond > 40 ? 5 : pixelsPerSecond > 20 ? 10 : 20;
            const markerCount = Math.ceil(effectiveDuration / interval) + 1;

            for (let i = 0; i <= markerCount; i++) {
              const time = i * interval;
              if (time > effectiveDuration) break;

              const x = timeToPixelsZoomed(time) + (TEXT_PADDING / 2); // Add offset for visibility
              markers.push(
                <div
                  key={`marker-${i}`}
                  className="absolute text-xs text-gray-400 font-mono"
                  style={{
                    left: `${x}px`,
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {formatTime(time)}
                </div>
              );
            }
            return markers;
          })()}
        </div>
      </div>

      {/* Timeline canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-x-auto overflow-y-hidden relative"
        onWheel={handleWheel}
        onScroll={handleCanvasScroll}
        style={{ cursor: 'default', display: 'flex', alignItems: 'center' }}
      >
        {/* Invisible overlay for capturing mouse events across full container */}
        <div
          className="absolute inset-0 z-30"
          style={{ cursor: 'default' }}
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left + containerRef.current!.scrollLeft;
            const hoveredTime = pixelsToTimeZoomed(x - (TEXT_PADDING / 2));
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
            const clickedTime = pixelsToTimeZoomed(x - (TEXT_PADDING / 2));
            const clampedTime = Math.max(0, Math.min(effectiveDuration, clickedTime));
            onSeek(clampedTime);
          }}
        />

        {/* Scrubber line (red - shows on hover) - z-index: 10 */}
        {isHovering && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${timeToPixelsZoomed(scrubberTime) + (TEXT_PADDING / 2)}px`,
              top: '-24px', // Extend up into timestamp area (24px = 6px timestamp height)
              width: '2px',
              height: 'calc(100% + 24px)',
              backgroundColor: SCRUBBER_COLOR,
              zIndex: 10,
            }}
          />
        )}

        {/* Playhead line (white - shows actual playback position) - z-index: 20 */}
        <div
          className="absolute pointer-events-none"
          style={{
            left: `${timeToPixelsZoomed(currentTime) + (TEXT_PADDING / 2)}px`,
            top: '-24px', // Extend up into timestamp area
            width: '2px',
            height: 'calc(100% + 24px)',
            backgroundColor: 'white',
            zIndex: 20,
          }}
        />

      <Stage
        width={TIMELINE_WIDTH}
        height={TIMELINE_HEIGHT}
      >
        <Layer>
          {/* Background */}
          <Rect
            x={0}
            y={0}
            width={TIMELINE_WIDTH}
            height={TIMELINE_HEIGHT}
            fill="#1a1a1a"
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
              pixelsPerSecond={pixelsPerSecond}
              xOffset={TEXT_PADDING / 2}
              onSelect={() => onClipSelect(clip.id)}
              onMove={(newTimelineStart) => onClipMove(clip.id, newTimelineStart)}
              onTrim={(newSourceStart, newSourceEnd) =>
                onClipTrim(clip.id, newSourceStart, newSourceEnd)
              }
            />
          ))}

        </Layer>
      </Stage>

        {/* Zoom indicator */}
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/50 rounded text-xs text-white font-mono">
          Zoom: {Math.round((pixelsPerSecond / 20) * 100)}% (Ctrl+Scroll)
        </div>
      </div>
    </div>
  );
};
