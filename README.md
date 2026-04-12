# ShinyEditor

> **Browser-based palette remapper for pixel art & sprites — powered by WebAssembly.**

![ShinyEditor UI](https://img.shields.io/badge/status-active-brightgreen) ![License](https://img.shields.io/badge/license-MIT-blue) ![WebAssembly](https://img.shields.io/badge/powered%20by-WebAssembly-654ff0)

ShinyEditor lets you remap the colors of your sprites and pixel art directly in the browser, with real-time preview, no server, no install. Define **remap rules** (color A → color B), pick colors with an eyedropper, and export the result as a PNG or a before/after WebM video.

---

## ✨ Features

- **Real-time palette remapping** — color substitution is handled by a C++ module compiled to WebAssembly for near-native performance
- **Side-by-side preview** — original and result canvases stay synchronized; zoom and pan on one, the other follows
- **Remap rules editor** — add, edit or delete color-mapping rules; warnings highlight identity rules (no change) and conflicts (duplicate source colors)
- **Eyedropper / pipette** — click any pixel on the original to instantly add its color as a new rule (uses the native `EyeDropper` API when available)
- **Reference image panel** — load a separate image as a visual target while you tweak your palette
- **Batch processing** — load an entire folder of images and navigate through them with arrow keys or buttons; all rules apply to the current image
- **PNG export** — download the remapped image with one click
- **Before/After video export** — generates a side-by-side `.webm` video using the WebCodecs API and `webm-muxer` (no FFmpeg, no server)
- **Zoom & Pan** — scroll wheel to zoom, middle-click or Space+drag to pan, pinch-to-zoom on mobile

---

## 🚀 Getting Started

ShinyEditor is a pure static web app. No build step, no dependencies to install.

```bash
git clone https://github.com/your-username/shiny-editor.git
cd shiny-editor

# Serve with any static server, for example:
npx serve .
# or
python -m http.server 8080
```

Then open `http://localhost:8080` in your browser.

> ⚠️ The app requires a local server (not `file://`) because it loads a WebAssembly module (`gd_core.js`) via `fetch`.

### Browser compatibility

| Feature | Chrome | Firefox | Safari | Edge |
|---|---|---|---|---|
| Core remapping | ✅ | ✅ | ✅ | ✅ |
| Native EyeDropper API | ✅ | ❌ | ❌ | ✅ |
| Video export (WebCodecs) | ✅ | ❌ | ❌ | ✅ |

---

## 🗂 Project Structure

```
shiny-editor/
├── index.html       # App shell and layout
├── style.css        # Tailwind + custom styles
├── app.js           # UI logic, event handling, rule management
├── gd_core.js       # WebAssembly loader (compiled from C++)
└── dna.ico          # Favicon
```

The pixel processing pipeline lives entirely in the C++ layer exposed through `gd_core.js`. `app.js` prepares the image data and remap rules, calls into the Wasm module, then blits the result back onto the canvas.

---

## 🎮 Keyboard Shortcuts

| Key | Action |
|---|---|
| `←` / `→` | Navigate between images in a batch |
| `Space` + drag | Pan the canvas |
| Scroll wheel | Zoom in / out |
| Middle click + drag | Pan the canvas |

---

## 📦 Third-party libraries

- [Tailwind CSS](https://tailwindcss.com/) (via CDN)
- [Font Awesome 6](https://fontawesome.com/) (via CDN)
- [webm-muxer](https://github.com/Vanilagy/webm-muxer) — in-browser WebM container muxing

---

## 📄 License

MIT — do whatever you want, just don't blame me if your sprites turn pink.
