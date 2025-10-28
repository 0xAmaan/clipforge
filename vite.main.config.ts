import { defineConfig } from "vite";

// https://vitejs.dev/config
export default defineConfig({
  build: {
    rollupOptions: {
      // Keep ffmpeg-static external but available at runtime
      external: ["ffmpeg-static"],
      output: {
        // Preserve dynamic requires
        format: "cjs",
      },
    },
  },
});
