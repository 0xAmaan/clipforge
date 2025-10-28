// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld("electronAPI", {
  // File operations
  openFile: () => ipcRenderer.invoke("open-file"),

  // Video operations
  getVideoMetadata: (filePath: string) =>
    ipcRenderer.invoke("get-video-metadata", filePath),

  trimVideo: (input: string, output: string, start: number, end: number) =>
    ipcRenderer.invoke("trim-video", input, output, start, end),

  // Progress updates
  onExportProgress: (callback: (progress: number) => void) => {
    ipcRenderer.on("export-progress", (_, progress) => callback(progress));
  },
});
