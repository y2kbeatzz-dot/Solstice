# ☀️ Solstice

### Your music. In full color.

**Solstice 3.1.23** is an immersive Spicetify theme featuring artwork-driven colors, glass interfaces, synchronized lyrics, and a customizable player. Made by Crystal.

**🌐 [Official website](https://y2kbeatzz-dot.github.io/Solstice/)** · **[Preview](preview-v3.1.23.svg)** · **[Report an issue](https://github.com/y2kbeatzz-dot/Solstice/issues)**

**⭐ [Please star this repository to help support Solstice!](https://github.com/y2kbeatzz-dot/Solstice)**

![Solstice preview](preview-v3.1.23.svg)

**3.1.23 Marketplace reliability fix:** Vinyl/needle layout styles are now embedded in `theme.js`, so an old installed `user.css` cannot stretch the album cover across the record or hide the SVG tonearm. New installs reference the moving `@main` script URL rather than a permanently pinned commit. The 34% cover, reduced-seek dragging, Studio preferences and saved lyrics are preserved. Existing installations pinned to old versions still need to update their saved Marketplace record once.

**3.1.20:** The turntable now has visible black vinyl grooves, a smaller circular album-art center label, a properly mounted tonearm, and record rotation that follows your mouse as you drag it. Clockwise/anticlockwise seeking and ±10-second buttons remain.

**3.1.22:** Center album artwork increased from 25% to **34% of the record** for a more balanced look. Vinyl dragging uses fewer layout calculations, visual style updates, and Spotify seek calls (about three per second rather than six). The record still follows the pointer, and the final cue position is committed on release.

**3.1.21:** A detailed metallic SVG tonearm with a weighted pivot, cartridge, animated cueing/needle drop, and a smaller center album label (25% of the record width). The turntable is more compact and the record still scrubs backward and forward. Reduced-motion preferences remain supported.

## Features

- **Artwork-powered colors** — accents and lighting respond to the album cover.
- **Synchronized lyrics** — sidebar, floating lyrics, and immersive lyric views with a built-in editor.
- **Immersive Mode** — a fullscreen player with visualizer, artwork, karaoke, and a playable vinyl turntable with forward/reverse scrubbing and a tonearm.
- **Solstice Studio** — appearance, blur, glass, motion, and accessibility controls.
- **Solstice Updater** — an in-theme Studio tab that checks the latest public release, opens Marketplace, and backs up/restores Studio settings and edited lyrics.
- **Lightweight playback updates** — shared lyric timing and cached rendering.

## Version 3.1.23

Adds an **interactive vinyl deck** to Immersive Mode: drag the record clockwise to advance or counterclockwise to rewind, lift/drop the tonearm to pause/play, and use ±10-second buttons. Supports keyboard seeking and preserves Studio preferences, saved lyrics, and all previous visual features. The Studio Updater, saved settings and lyrics, immersive effects, and all previous features remain.

Built for the Spicetify community. Not affiliated with Spotify or Spicetify.
