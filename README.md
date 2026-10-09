# ☀️ Solstice — Spicetify theme

A dynamic glass theme that matches album artwork, with synced lyrics, an Immersive player, Studio controls, vinyl and light effects. Created by Crystal.

**Version: 3.1.8 (performance update).** This is a community project, not affiliated with Spotify or Spicetify.

🌐 **[Solstice official website](https://y2kbeatzz-dot.github.io/Solstice/)** · [Source code](https://github.com/y2kbeatzz-dot/Solstice) · [Report an issue](https://github.com/y2kbeatzz-dot/Solstice/issues)

*Website setup:* If the website link is not live yet, the repository owner needs to enable **Settings → Pages → Deploy from a branch → main → /docs → Save**. The site's source is in [`docs/index.html`](docs/index.html).

## Install using Spicetify Marketplace

Once this repository is indexed by Marketplace, open Spotify → **Marketplace** → **Themes** → search **Solstice** → **Install**. The included JavaScript enables lyrics, artwork color changes, Studio and Immersive Mode.

**Marketplace listing note:** A GitHub repository and manifest do **not** by themselves guarantee a listing or immediate refresh. Marketplace controls what happens when the listing card is clicked; the website link above is the public project site. The repository must have the GitHub topic `spicetify-themes` and be picked up by Marketplace's index.

## Install manually (works independently of Marketplace discovery)

1. Install [Spicetify](https://spicetify.app/docs/getting-started/) first.
2. Download this repository as a ZIP. Unzip the contents into the `%APPDATA%\spicetify\Themes\Solstice` folder, so the folder contains `user.css`, `color.ini`, and `theme.js` directly (not inside another folder).
3. Close Spotify, then open **PowerShell** and run:

```powershell
spicetify config current_theme Solstice color_scheme Dark inject_css 1 inject_theme_js 1 replace_colors 1
spicetify apply
```

4. Reopen Spotify. Use the **SOLSTICE** button or **Ctrl+Alt+S** for Studio, **Ctrl+Alt+I** for Immersive, and **Ctrl+Alt+L** for lyrics.

This is a Spicetify theme; do not use `INSTALL.cmd` when installing from this repository.

## Features

- Artwork-driven color extraction (Spicetify with album-art fallback)
- Lyrics in the Now Playing sidebar, full lyrics view, synced highlighting, LRCLIB lookup and local `.lrc` edits
- Immersive view (Fullscreen and Close; no Studio button inside immersive)
- Glass panels, sliders, vinyl and ambient animations
- Studio appearance and accessibility settings (including reduced motion)

## Performance changes in 3.1.8

- Reuse cached parsed `.lrc` text instead of reprocessing each lyric frame
- Skip visible lyric panel updates when the panel is closed
- Reduce periodic UI checks and repeated DOM writes
- Pause decorative animations while playback is paused
- Skip visual refreshes while Spotify's window is hidden
- Share playback position, lyric text, and parsed lyric lines across visible lyric panels
- Use binary search for the active synchronized lyric instead of scanning the whole song

These are **source-level optimizations**. Performance has not yet been measured on a live Spotify client; please open an issue with your Spotify and Spicetify versions if you still see lag.

## Known limitations

- Spotify UI updates can break CSS selectors and the right sidebar layout.
- Lyrics may be unavailable for some tracks, and album-art colors may be blocked by image CORS policies.
- Marketplace JavaScript is served via jsDelivr; its availability and CSP compatibility depend on the client.
- The full background/blur aesthetic can still be GPU-intensive on older machines. Turn off motion in Studio if necessary.

## Updates and help

Report problems at [Issues](https://github.com/y2kbeatzz-dot/Solstice/issues). Keep screenshots and steps to reproduce with reports. Existing saved lyrics are stored locally in Spotify storage and are not intentionally cleared by this update.