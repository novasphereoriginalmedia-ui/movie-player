# 🎬 CinePlay Movie Player

A cinema-grade movie player tailored for **Ramayana (2026)** and any other MKV/MP4 movies with multi-language audio tracks and subtitle management.

---

## ✨ Features

- **Multi-Language Audio Track Switching**:
  - Automatically discovers all audio tracks embedded in the movie:
    - 🇮🇳 **Hindi** (Stream 1)
    - 🇮🇳 **Tamil** (Stream 2)
    - 🇮🇳 **Telugu** (Stream 3)
    - 🇮🇳 **Malayalam** (Stream 4)
    - 🇮🇳 **Kannada** (Stream 5)
  - Switch audio language instantly on the fly without losing your current playback timestamp!
  - Shortcut: Press <kbd>A</kbd> to cycle through audio tracks anytime.

- **Subtitle Support & Customization**:
  - Enable / Disable subtitles anytime with one click or press <kbd>C</kbd>.
  - Embedded subtitle tracks automatically extracted on demand.
  - External subtitle files (`.srt` and `.vtt`) detected in the movie directory or `subtitles/` folder.
  - **Drag & Drop** any `.srt` or `.vtt` file directly onto the player window to load it instantly!
  - **Sync Delay Adjustment**: Fine-tune subtitles by ±0.5s if they are slightly ahead or behind.
  - **Font Size Options**: Small (20px), Medium (26px), Large (34px), and Extra Large (42px).

- **Performance & Quality**:
  - **Zero Quality Loss**: Video stream (1080p H.264) is passed through directly (`-c:v copy`), using 0% CPU for video.
  - **Ultra-Fast Audio**: Audio is converted on the fly to AAC stereo at 60x realtime speed, ensuring zero lag.
  - Instant scrubbing to any minute across the 3-hour movie.

- **Cinema Interface**:
  - Ambient glow effect and immersive dark UI.
  - Interactive scrub bar with hover time preview.
  - Auto-hides controls after 2.5 seconds of mouse inactivity.
  - Picture-in-Picture (PiP) and Fullscreen mode (<kbd>F</kbd>).
  - Remembers where you left off (`Resume playback`).

---

## 🚀 How to Launch

### Option 1: Double-Click in Finder (Easiest)
Double-click `Launch Player.command` in this folder. It will launch the player in a dedicated, distraction-free Cinema App window!

### Option 2: Run via Terminal
```bash
./start_player.sh
```

Or start the server directly:
```bash
python3 app.py
```
Then visit **[http://localhost:5055](http://localhost:5055)** in Chrome, Safari, or your preferred browser.

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
| :--- | :--- |
| <kbd>Space</kbd> or <kbd>K</kbd> | Play / Pause |
| <kbd>←</kbd> or <kbd>J</kbd> | Rewind 10 seconds |
| <kbd>→</kbd> or <kbd>L</kbd> | Fast Forward 10 seconds |
| <kbd>↑</kbd> / <kbd>↓</kbd> | Volume Up / Down (5%) |
| <kbd>M</kbd> | Mute / Unmute audio |
| <kbd>A</kbd> | Cycle audio language (Hindi → Tamil → Telugu → Malayalam → Kannada) |
| <kbd>C</kbd> | Toggle subtitles On / Off |
| <kbd>F</kbd> | Toggle Fullscreen |
| <kbd>0</kbd> – <kbd>9</kbd> | Jump to 0% – 90% of the movie |
| <kbd>?</kbd> | Open Keyboard Shortcuts cheatsheet |

---

## 📁 Subtitles Folder
Place any `.srt` or `.vtt` files in the `subtitles/` folder or drag-and-drop them right onto the video screen. They will be immediately recognized and available in the Subtitles menu.
