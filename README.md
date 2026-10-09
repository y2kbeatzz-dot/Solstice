# ☀️ Solstice

### Your music. In full color.

**Solstice 3.1.38** is an immersive Spicetify theme featuring artwork-driven colors, glass interfaces, synchronized lyrics, and a customizable player. Made by Crystal.

**🌐 [Official website](https://y2kbeatzz-dot.github.io/Solstice/)** · **[Preview](preview-v3.1.32.svg)** · **[Report an issue](https://github.com/y2kbeatzz-dot/Solstice/issues)**

**⭐ [Please star this repository to help support Solstice!](https://github.com/y2kbeatzz-dot/Solstice)**

![Solstice preview](preview-v3.1.32.svg)

**3.1.38 karaoke performance:** Update only the currently sung word on fast ticks, finalize finished words once, and render only the foremost visible lyrics pane. Other panes update during standard refreshes. This avoids repeatedly walking every word across all lyric windows.

**3.1.37 updater fix:** The in-Studio version checker now tries GitHub API first and falls back to raw/CDN manifest URLs. It reports network errors instead of falsely claiming a successful check. Marketplace still installs the update separately.

**3.1.36 word-sync fix:** Word-timed highlighting updates at roughly 75 ms while playing, and NetEase word offsets now include their line start timestamp. Slower playback and metadata refreshes stay separate to limit unnecessary work.

**3.1.35 lyric effects:** Flow now slides and slightly enlarges the active line, Glow highlights it with a bright accent panel, and Calm uses steady, subtle highlighting. The Studio preview responds to these choices; reduced-motion preferences still stop animation.

**3.1.34 Studio reliability fix:** Fixed a JavaScript selector error that stopped settings switch initialization. Font options and other Studio controls can now bind correctly. Imported lyrics now save immediately and draft edits persist on close and track changes.

**Earlier font and performance update:** Font selection now synchronizes directly with all mounted lyric panes, including Studio's preview. Hidden panes no longer trigger unnecessary karaoke rendering, and the word-sync loop runs less frequently.  Selected lyric fonts now apply consistently across Studio, immersive, sidebar and floating lyric panes. Word-timed karaoke refreshes less frequently to reduce rendering load; artwork compositing is lighter. Windows font availability still determines whether the requested typeface or its fallback renders.

**3.1.38 true word-by-word lyrics:** Solstice Studio → **Lyrics** now has eight selectable font stacks, an Immersive lyric-size control, and Flow / Glow / Calm lyric motion. The editor recognizes **Enhanced LRC** (`[00:12.000]<00:12.000>Hello <00:12.500>world`) and highlights real individual timestamps, not guesses. An **optional NetEase word-timing lookup** reads YRC/klyric for confidently title- and duration-matched songs (enable in Studio → Lyrics). NetEase uses an unofficial third-party endpoint that can fail due to region, provider changes or networking restrictions. Without confirmed word timestamps, Solstice keeps normal LRCLIB line-synced lyrics, with an optional progressive line fill. NetEase lookup sends current song title and artist to that service only if enabled; it is disabled by default. Original lyric edits and settings remain saved, and Reduce Motion disables text animations.

**3.1.27 public Marketplace update:** New installations now use the exact same working technique as the verified 3.1.26 repair: the Marketplace manifest specifies **immutable, matching-version URLs for both `theme.js` and `user.css`**. Just search Solstice in Marketplace and install (or use the Marketplace update flow); **no Console script or database edits for new installations**. The responsive needle, record, controls, Studio preferences and saved lyrics stay intact. Existing Marketplace installations can retain cached installation records and may require a normal Marketplace refresh/reinstall before the new pinned references are used.

**3.1.26 responsive redesign:** Immersive Mode now fits desktop and compact Spotify windows without overflowing. The needle moves onto the right outer groove when music plays and tracks inward toward the center throughout the song; it parks off the record when paused. Tightened deck, header, transport and lyrics layout; small screens use a dedicated scrollable center panel. The black LP, centered artwork, 33⅓ RPM spin, drag seeking, saved lyrics and Solstice Studio are preserved. A versioned inline stylesheet accompanies the script so Marketplace CSS caching cannot restore the broken layout.

**3.1.25 preview-match fix:** Immersive Mode now places the **animated silver straight tonearm to the right of a black grooved LP**, with your current cover as a **40% circular center label**, matching the website concept. The theme script enforces essential dimensions directly even if Marketplace has older CSS. The 33⅓ RPM motor, scrub controls, synced lyrics and preferences remain intact.

**3.1.24 vinyl motor fix:** Ships the turntable's spinning keyframes together with the self-contained fallback CSS. The record rotates at **33⅓ RPM** (one revolution every 1.8 seconds) during playback, pauses when playback stops, and resumes from the current angle after manual dragging. User and system reduced-motion preferences remain respected. No lyrics or Studio data are reset.

**3.1.23 Marketplace reliability fix:** Vinyl/needle layout styles are now embedded in `theme.js`, so an old installed `user.css` cannot stretch the album cover across the record or hide the SVG tonearm. New installs reference the moving `@main` script URL rather than a permanently pinned commit. The 34% cover, reduced-seek dragging, Studio preferences and saved lyrics are preserved. Existing installations pinned to old versions still need to update their saved Marketplace record once.

**3.1.20:** The turntable now has visible black vinyl grooves, a smaller circular album-art center label, a properly mounted tonearm, and record rotation that follows your mouse as you drag it. Clockwise/anticlockwise seeking and ±10-second buttons remain.

**3.1.22:** Center album artwork increased from 25% to **34% of the record** for a more balanced look. Vinyl dragging uses fewer layout calculations, visual style updates, and Spotify seek calls (about three per second rather than six). The record still follows the pointer, and the final cue position is committed on release.

**3.1.21:** A detailed metallic SVG tonearm with a weighted pivot, cartridge, animated cueing/needle drop, and a smaller center album label (25% of the record width). The turntable is more compact and the record still scrubs backward and forward. Reduced-motion preferences remain supported.

**Install:** In Spotify, open **Marketplace → Themes → Solstice → Install**. Existing installations: **Marketplace → Installed → Solstice → Update** if offered; otherwise refresh Marketplace or reinstall Solstice. Solstice's separately stored Studio settings and lyric edits are not cleared by a normal theme update.

## Features

- **Artwork-powered colors** — accents and lighting respond to the album cover.
- **Synchronized lyrics** — sidebar, floating lyrics, and immersive lyric views with a built-in editor.
- **Immersive Mode** — a fullscreen player with visualizer, artwork, karaoke, and a playable vinyl turntable with forward/reverse scrubbing and a tonearm.
- **Solstice Studio** — appearance, blur, glass, motion, and accessibility controls.
- **Solstice Updater** — an in-theme Studio tab that checks the latest public release, opens Marketplace, and backs up/restores Studio settings and edited lyrics.
- **Lightweight playback updates** — shared lyric timing and cached rendering.

## Version 3.1.38

Includes font consistency and rendering performance fixes plus the **interactive vinyl deck** to Immersive Mode: drag the record clockwise to advance or counterclockwise to rewind, lift/drop the tonearm to pause/play, and use ±10-second buttons. Supports keyboard seeking and preserves Studio preferences, saved lyrics, and all previous visual features. The Studio Updater, saved settings and lyrics, immersive effects, and all previous features remain.

Built for the Spicetify community. Not affiliated with Spotify or Spicetify.
