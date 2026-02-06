# Still - Product Requirements Document

## Vision
An app that helps you find the best still image from a video. You take a video to increase the odds of capturing the perfect moment — Still makes it effortless to find and extract that moment as a photo.

## Problem
Today on iPhone, extracting a still from a video is painful:
1. Pause the video at exactly the right moment (hard to be precise)
2. Take a screenshot (includes video player chrome)
3. Crop to the right size (manual, tedious)
4. Repeat if you didn't nail the timing

## Solution
A dedicated app with a Live Photo-style scrubber UI. Load a video, scrub through a filmstrip of frames at the bottom to find the perfect still, and save it as a full-resolution photo in one tap. Apply filters before saving.

---

## Decisions

### Platform & Tech
- **Framework:** React Native with Expo managed workflow
- **Target:** iOS (primary)
- **Privacy:** Fully offline, no analytics, no network calls. Everything on-device.
- **Design:** Minimal dark theme. Content-focused, no distractions.

### Video Source
- Camera roll only (no file import, no in-app capture)
- Home screen: grid of video thumbnails, most recent first, with duration overlay
- No album browsing or search in Phase 1

### Scrubber UX
- **Interaction:** Drag finger across filmstrip (like Live Photos). Finger position = selected frame.
- **Filmstrip height:** Thin strip (~60px) to maximize preview space
- **Frame density:** Adaptive sampling — extract ~100-150 thumbnail frames regardless of video length. Short videos get more temporal detail, long videos get broader coverage.
- **Preview update:** Video player seek for the large preview (native, fast). Filmstrip is pre-extracted thumbnails. Feels instant like Live Photos.

### Export
- One still at a time. Scrub → save → can scrub again for another.
- Save full-resolution still to camera roll
- **Metadata:** Preserve EXIF from source video (date, location, camera info) so the saved photo organizes correctly in camera roll by date/location. This is the right default — keeps things tidy without extra effort.
- After saving: brief success toast, stay on editor so user can save more or apply filters

### Filters (Phase 1)
- **Scope:** Preset filters + manual adjustment sliders
- **Presets:** Vivid, Mono, Warm, Cool, Fade, Noir (~6 presets)
- **Adjustments:** Brightness, Contrast, Saturation sliders
- **Filter preview:** Live thumbnails showing current frame with each filter applied (like Instagram). Worth the extra effort — this is the moment the user is making a decision and visual comparison is critical. We'll render them asynchronously so they don't block the main scrubbing interaction.
- Filters apply to the main preview in real-time as user selects them
- Final export applies the filter at full resolution

### Performance
- Performance is a top priority. Scrubbing must feel buttery smooth.
- Thumbnail extraction happens asynchronously when video loads
- Preview uses native video seeking (hardware-accelerated)
- Filter thumbnails render in background, don't block scrubbing

---

## Phase 2 (Future)
- Auto-suggest best stills (sharpness detection, face detection, composition scoring)
- Pinch-to-zoom on filmstrip for precision on long videos
- Two-level frame loading (sparse → dense on region tap)
- Albums/search for video browsing
- Share sheet integration

---

## Core UX Flow

### Screen 1: Video Gallery
- Grid layout of video thumbnails from camera roll
- Each cell: video thumbnail + duration badge (bottom-right)
- Most recent videos first
- Pull to refresh
- Permission prompt on first launch for photo library access

### Screen 2: Editor
```
┌─────────────────────────┐
│                         │
│                         │
│    [Frame Preview]      │
│    (large, dominant)    │
│                         │
│                         │
├─────────────────────────┤
│ [Filter Presets Row]    │  ← horizontal scroll of filter thumbnails
├─────────────────────────┤
│ [Adjustment Sliders]    │  ← brightness / contrast / saturation
├─────────────────────────┤
│ ░░░░░█░░░░░░░░░░░░░░░░ │  ← filmstrip scrubber (~60px)
├─────────────────────────┤
│  [Back]     [Save 💾]   │  ← bottom action bar
└─────────────────────────┘
```

- Tapping a filter preset applies it to the preview + highlights the selected preset
- Sliders update preview in real-time
- Scrubbing the filmstrip updates the preview AND the filter thumbnails (debounced)
- Save button exports at full resolution with current filter/adjustments applied

---

## Technical Architecture

### Key Dependencies
- `expo` — managed workflow
- `expo-media-library` — access camera roll videos, save exported photos
- `expo-video-thumbnails` — extract filmstrip thumbnail frames
- `expo-av` or `expo-video` — video player for preview seeking
- `expo-image-manipulator` — apply filters/adjustments to full-res frame for export
- `react-native-reanimated` — smooth gesture animations for scrubber
- `react-native-gesture-handler` — pan gesture for filmstrip scrubbing
- `gl-react` / `gl-react-expo` — GPU-accelerated filter rendering (for live filter previews and real-time preview filtering)

### Frame Extraction Strategy
1. On video load: determine duration, calculate ~100-150 evenly spaced timestamps
2. Extract thumbnails at those timestamps using `expo-video-thumbnails` (small size, ~200px wide)
3. Cache thumbnails in memory for filmstrip display
4. For preview: seek the video player to the exact timestamp (native seeking, no extraction needed)
5. For export: extract full-resolution frame at selected timestamp, apply filter, save

### Project Structure
```
still/
├── app/                    # Expo Router screens
│   ├── _layout.tsx         # Root layout (dark theme)
│   ├── index.tsx           # Video gallery screen
│   └── editor.tsx          # Editor screen
├── components/
│   ├── VideoGrid.tsx       # Grid of video thumbnails
│   ├── VideoCell.tsx       # Single video thumbnail cell
│   ├── FramePreview.tsx    # Large preview image/video
│   ├── FilmStrip.tsx       # Filmstrip scrubber component
│   ├── FilterBar.tsx       # Horizontal filter preset row
│   ├── AdjustmentPanel.tsx # Brightness/contrast/saturation sliders
│   └── SaveButton.tsx      # Save action with loading state
├── hooks/
│   ├── useVideoLibrary.ts  # Fetch videos from camera roll
│   ├── useFrameExtractor.ts# Extract thumbnails from video
│   └── useFilterEngine.ts  # Apply filters to frames
├── utils/
│   ├── filters.ts          # Filter preset definitions
│   ├── permissions.ts      # Media library permissions
│   └── export.ts           # Full-res frame extraction + save
├── constants/
│   └── theme.ts            # Dark theme colors, spacing
├── app.json
├── package.json
└── prd.md
```

---

## Implementation Order
1. Project scaffolding (Expo init, dependencies, theme)
2. Permissions + video library access
3. Video gallery screen (grid of thumbnails)
4. Editor screen with frame preview (video player seeking)
5. Filmstrip scrubber (thumbnail extraction + gesture)
6. Full-res frame export + save to camera roll
7. Filter presets + adjustment sliders
8. Polish (loading states, error handling, toast feedback)

---

## Verification
- Test on physical iPhone (camera roll access doesn't work in simulator well)
- Verify: can browse all videos from camera roll
- Verify: scrubbing filmstrip updates preview smoothly
- Verify: saved image is full resolution matching source video
- Verify: filters apply correctly to both preview and exported image
- Verify: EXIF metadata preserved on exported photo
- Verify: app works with short clips (<5s) and long videos (>2min)
