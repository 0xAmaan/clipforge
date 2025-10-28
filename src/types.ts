// Shared type definitions for ClipForge

export interface VideoMetadata {
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec?: string;
}

export interface VideoState {
  filePath: string | null;
  duration: number;
  currentTime: number;
  trimStart: number;
  trimEnd: number;
  isPlaying: boolean;
}

export interface VideoPlayerProps {
  videoPath: string | null;
  currentTime: number;
  trimStart: number;
  trimEnd: number;
  onTimeUpdate: (time: number) => void;
  onPlayPause: (isPlaying: boolean) => void;
}

export interface TimelineProps {
  duration: number;
  currentTime: number;
  trimStart: number;
  trimEnd: number;
  onSeek: (time: number) => void;
  onTrimChange: (start: number, end: number) => void;
}

export interface ExportProps {
  videoPath: string;
  trimStart: number;
  trimEnd: number;
  onExportComplete: (outputPath: string) => void;
}
