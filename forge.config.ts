import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { MakerDeb } from "@electron-forge/maker-deb";
import { MakerRpm } from "@electron-forge/maker-rpm";
import { VitePlugin } from "@electron-forge/plugin-vite";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";
import path from "node:path";
import fs from "node:fs";

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    // macOS Info.plist configuration for permissions
    extendInfo: {
      // Screen recording permission description
      NSScreenCaptureDescription:
        "ClipForge needs screen recording permission to capture your screen and create video recordings.",
      // Microphone permission (for audio capture during screen recording)
      NSMicrophoneUsageDescription:
        "ClipForge needs microphone access to record audio during screen recordings.",
      // Camera permission (for webcam recording - Phase 2 feature)
      NSCameraUsageDescription:
        "ClipForge needs camera access to record from your webcam.",
    },
    // Code signing configuration for production
    osxSign: {
      identity: "-", // Ad-hoc signing
      hardenedRuntime: true,
      entitlements: "entitlements.plist",
      "entitlements-inherit": "entitlements.plist",
    },
    // Hook to copy binaries after packaging (outside of asar)
    afterComplete: [
      async (buildPath, electronVersion, platform, arch) => {
        // Get the binary paths from the packages
        const ffmpegBinary = require("ffmpeg-static");
        const ffprobeBinary = require("ffprobe-static").path;

        // Determine the Resources path based on platform
        let resourcesPath: string;
        if (platform === "darwin") {
          resourcesPath = path.join(
            buildPath,
            "clipforge.app",
            "Contents",
            "Resources",
          );
        } else if (platform === "win32") {
          resourcesPath = path.join(buildPath, "resources");
        } else {
          resourcesPath = path.join(buildPath, "resources");
        }

        // Create bin directory in Resources (outside of asar)
        const binDir = path.join(resourcesPath, "bin");
        if (!fs.existsSync(binDir)) {
          fs.mkdirSync(binDir, { recursive: true });
        }

        // Copy ffmpeg
        const ffmpegDest = path.join(binDir, "ffmpeg");
        fs.copyFileSync(ffmpegBinary, ffmpegDest);
        fs.chmodSync(ffmpegDest, 0o755);

        // Copy ffprobe
        const ffprobeDest = path.join(binDir, "ffprobe");
        fs.copyFileSync(ffprobeBinary, ffprobeDest);
        fs.chmodSync(ffprobeDest, 0o755);

        console.log("[Forge] Copied ffmpeg to:", ffmpegDest);
        console.log("[Forge] Copied ffprobe to:", ffprobeDest);

        // Ad-hoc sign the binaries and app with entitlements so they can access microphone
        // This is required for the binaries to inherit the parent app's permissions on macOS
        if (platform === "darwin") {
          const { execSync } = require("child_process");
          try {
            console.log("[Forge] Code-signing ffmpeg binary...");
            execSync(`codesign --force --sign - "${ffmpegDest}"`, {
              stdio: "inherit",
            });
            console.log("[Forge] Code-signing ffprobe binary...");
            execSync(`codesign --force --sign - "${ffprobeDest}"`, {
              stdio: "inherit",
            });
            console.log("[Forge] Successfully code-signed binaries");

            // Sign the main app with entitlements for microphone access
            const appPath = path.join(buildPath, "clipforge.app");
            const entitlementsPath = path.join(
              process.cwd(),
              "entitlements.plist",
            );

            console.log("[Forge] Signing app with entitlements...");
            console.log("[Forge] App path:", appPath);
            console.log("[Forge] Entitlements path:", entitlementsPath);

            // Sign with hardened runtime and entitlements
            execSync(
              `codesign --force --deep --sign - --entitlements "${entitlementsPath}" --options runtime "${appPath}"`,
              { stdio: "inherit" },
            );

            console.log("[Forge] Successfully signed app with entitlements");
          } catch (error) {
            console.error("[Forge] Warning: Failed to code-sign:", error);
            console.error(
              "[Forge] Audio recording may not work in production due to missing code signature",
            );
          }
        }
      },
    ],
  },
  rebuildConfig: {},
  makers: [
    new MakerSquirrel({}),
    new MakerZIP({}, ["darwin"]),
    new MakerRpm({}),
    new MakerDeb({}),
  ],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: "src/main.ts",
          config: "vite.main.config.ts",
          target: "main",
        },
        {
          entry: "src/preload.ts",
          config: "vite.preload.config.ts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.ts",
        },
      ],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
