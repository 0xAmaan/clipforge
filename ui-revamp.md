 ClipForge UI Redesign Plan - Final Cut Pro Style

 Overview

 Transform the current UI into a professional 3-panel layout with full-width timeline, removing clutter and maximizing workspace.

 Phase 1: Setup Dependencies & Tooling

 1. Install Tailwind CSS + configuration for Electron/React
 2. Install shadcn/ui (button, dropdown, icons, etc.)
 3. Install lucide-react for professional icons
 4. Update TypeScript config if needed for new dependencies

 Phase 2: Create New Layout Structure

 New Layout (Full Viewport):
 ┌─────────────────────────────────────────────────────┐
 │  Nav Bar (40-50px) - [Record Icon] [Export Icon]   │
 ├─────────────┬──────────────────┬────────────────────┤
 │             │                  │                    │
 │   Media     │   Video Player   │   Video Info       │
 │  Library    │   (Playback)     │   Panel            │
 │ (1/3 width) │   (1/3 width)    │   (1/3 width)      │
 │             │                  │                    │
 │ [50% height]                                        │
 ├─────────────────────────────────────────────────────┤
 │                                                     │
 │         Timeline (Full Width, Zoomable)             │
 │              [50% height]                           │
 │                                                     │
 └─────────────────────────────────────────────────────┘

 Changes to App.tsx:
 - Remove header ("ClipForge" branding)
 - Remove footer (status bar)
 - Create new thin top nav with Record/Export icon buttons
 - Implement 3-column grid (equal thirds) for top 50%
 - Timeline takes bottom 50%

 Phase 3: Refactor Components with Tailwind

 Top Navigation Bar

 - Create new TopNav.tsx component
 - Thin bar (40-50px height) with:
   - Record button (lucide-react Video icon)
   - Export dropdown (lucide-react Download icon + shadcn DropdownMenu)
 - Export dropdown options: Fast Copy, Re-encode (720p, 1080p, Source)

 Left Panel - Media Library

 - Refactor MediaLibrary.tsx to fit 1/3 width
 - Move import button INTO this panel (remove from Controls)
 - Use lucide-react Upload icon for import
 - Responsive thumbnail grid
 - Keep drag-and-drop functionality

 Center Panel - Video Player

 - Refactor VideoPlayer.tsx for 1/3 width
 - Optimize for vertical space (50% viewport)
 - Keep playback controls compact below video
 - Ensure responsive video sizing

 Right Panel - Video Info

 - Create new VideoInfoPanel.tsx component
 - Display: selected clip metadata, duration, resolution, trim settings
 - Clean, organized list layout
 - Scrollable if content overflows

 Bottom - Timeline

 - Refactor Timeline.tsx to use full viewport width
 - Implement scroll wheel zoom functionality
 - Scale timeline rendering based on zoom level
 - Keep existing trim, drag, reorder features
 - Ensure timeline always fills available width (not just video duration width)

 Phase 4: Icon Updates

 Replace all emoji icons with lucide-react:
 - 📁 → Upload (import)
 - 🎬 → Video (record)
 - ⬇️ → Download (export)
 - ▶️ → Play
 - ⏸️ → Pause
 - ✂️ → Scissors (trim)
 - 🗑️ → Trash2 (delete

 Phase 5: Styling Migration

 - Convert inline CSSProperties objects to Tailwind classes
 - Maintain dark theme (#0a0a0a background, #1a1a1a panels)
 - Use Tailwind's dark mode utilities
 - Keep existing color scheme for consistency

 Phase 6: Testing & Polish

 - Test responsive behavior at different window sizes
 - Verify timeline zoom with scroll wheel
 - Ensure all drag-and-drop still works
 - Test export dropdown functionality
 - Verify video playback in new layout

 Files to Modify

 - src/App.tsx - Main layout restructure
 - src/components/MediaLibrary.tsx - Fit to 1/3 width panel
 - src/components/VideoPlayer.tsx - Optimize for 1/3 width
 - src/components/Timeline.tsx - Full width + zoom functionality
 - src/components/ExportButton.tsx - Convert to dropdown in nav
 - src/components/RecordingControls.tsx - Convert to icon button in nav
 - src/components/Controls.tsx - Remove or merge into panels

 New Files to Create

 - src/components/TopNav.tsx - Thin navigation bar
 - src/components/VideoInfoPanel.tsx - Right panel for metadata
 - tailwind.config.js - Tailwind configuration
 - components.json - shadcn/ui configuration

 Success Criteria

 ✅ Clean, professional UI matching Final Cut Pro paradigm
 ✅ Maximum screen space utilization (no header/footer)
 ✅ Timeline fills entire width and supports zoom
 ✅ Three equal panels for media/player/info
 ✅ Icon-based navigation (no clutter)
 ✅ Export dropdown instead of expanded options
 ✅ All existing functionality preserved