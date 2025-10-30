# Screen Recording Permissions Guide

## Development Environment (Electron)

When running the app in development mode (`bun run dev`), macOS requires screen recording permissions for the Electron helper process.

### Granting Permissions on macOS

1. **First Time Setup:**
   - Click "Start Recording" in the app
   - macOS will show a system dialog asking for screen recording permission
   - Click "Open System Settings"

2. **In System Settings:**
   - Navigate to: **Privacy & Security** > **Screen Recording**
   - Look for one of these entries (they may appear as the Electron process):
     - `Electron`
     - `Electron Helper`
     - `clipforge` (if packaged)

3. **Enable Permission:**
   - Toggle the switch **ON** for the Electron entry
   - **Important:** You must **restart the app** for permissions to take effect

4. **Restart the App:**
   - Quit the app completely (Cmd+Q or close the terminal)
   - Run `bun run dev` again
   - The recording feature should now work

### Troubleshooting

**Problem:** Can't find Electron in the Screen Recording list
- **Solution:** Try clicking "Start Recording" again - this should trigger macOS to add it to the list

**Problem:** Permission is enabled but still getting errors
- **Solution:** Completely quit and restart the app. Permissions don't apply to already-running processes.

**Problem:** "No handler registered" error
- **Solution:** This means the main process hasn't loaded the IPC handlers. Restart the dev server.

### Production Build

When you build the app for production:
```bash
bun run make
```

The resulting app in the Applications folder will be named "clipforge" and will appear in System Settings as such, making it easier to identify.

### User-Friendly Error Messages

The app now shows helpful error messages:
- ✅ "Permission required: Please grant screen recording permission..."
- ✅ "Recording feature not available. Please restart the application."
- ✅ "No recording device found. Please check your system settings."

These messages guide users to fix permission issues without technical jargon.
