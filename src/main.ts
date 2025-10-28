import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "node:path";
import started from "electron-squirrel-startup";
import ffmpeg from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";

// Set FFmpeg binary path
if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
  console.log("FFmpeg path set to:", ffmpegPath);
}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.

// ============================================================================
// IPC Handlers
// ============================================================================

// Handler: Open file picker
ipcMain.handle("open-file", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [
      { name: "Videos", extensions: ["mp4", "mov", "webm", "avi", "mkv"] },
    ],
  });

  if (result.canceled) return null;
  return result.filePaths[0];
});

// Handler: Get video metadata
ipcMain.handle("get-video-metadata", async (event, filePath: string) => {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) {
        console.error("FFprobe error:", err);
        reject(err);
        return;
      }

      const videoStream = metadata.streams.find(
        (s) => s.codec_type === "video",
      );
      if (!videoStream) {
        reject(new Error("No video stream found"));
        return;
      }

      // Parse frame rate (can be "30/1" format)
      let fps = 30; // Default
      if (videoStream.r_frame_rate) {
        const [num, den] = videoStream.r_frame_rate.split("/").map(Number);
        fps = num / den;
      }

      resolve({
        duration: metadata.format.duration || 0,
        width: videoStream.width || 0,
        height: videoStream.height || 0,
        fps,
        codec: videoStream.codec_name,
      });
    });
  });
});

// Handler: Trim video
ipcMain.handle(
  "trim-video",
  async (event, input: string, output: string, start: number, end: number) => {
    const mainWindow = BrowserWindow.getAllWindows()[0];

    return new Promise((resolve, reject) => {
      console.log(`Trimming video: ${input}`);
      console.log(`Output: ${output}`);
      console.log(`Start: ${start}s, End: ${end}s (Duration: ${end - start}s)`);

      ffmpeg(input)
        .setStartTime(start)
        .setDuration(end - start)
        .outputOptions("-c copy") // Copy codec for fast trim
        .output(output)
        .on("start", (commandLine) => {
          console.log("FFmpeg command:", commandLine);
        })
        .on("progress", (progress) => {
          const percent = progress.percent || 0;
          console.log(`Progress: ${percent.toFixed(2)}%`);
          // Send progress updates to renderer
          if (mainWindow) {
            mainWindow.webContents.send("export-progress", percent);
          }
        })
        .on("end", () => {
          console.log("Export complete!");
          resolve(output);
        })
        .on("error", (err) => {
          console.error("FFmpeg error:", err);
          reject(err);
        })
        .run();
    });
  },
);
