# Search dropdown regression

Issue: https://github.com/y2kbeatzz-dot/Solstice/issues/1

The theme must preserve native popup positioning, keep the search navigation
above route content, and avoid filtered ancestors that change fixed positioning.
Artwork uses a negative layer inside the isolated Root, rather than assigning
relative positioning and the same layer to every native Root child.

## Chromium fixture

Install Node.js, then from the repository root:

```sh
npm install --no-save --package-lock=false playwright
npx playwright install chromium
node --test tests/search-layering.cjs
```

This synthetic fixture covers 640, 1039, and 1920 pixel viewport widths,
viewport-anchored suggestions, hit testing over a playlist card, clickable
results, native fixed portal positioning, and artwork layering. It does not
reproduce Spotify's private DOM or validate its keyboard handling.

## Required Spotify verification

1. Use Spotify 1.3.6.1921 / Spicetify 2.46.3 with the patched user.css.
   Verify the installed CSS actually contains the new Root/globalNav rules;
   Marketplace may otherwise retain its cached stylesheet.
2. Run `spicetify apply` and restart. Open Home and then a playlist; focus
   empty search and type a query. No blank strip should obscure results.
3. Confirm suggestions paint above headings/cards, start at the native search
   anchor, and remain clickable. Check arrow keys, Enter, Escape, outside-click
   dismissal, and reopening after route changes.
4. Repeat in narrow/maximized windows and at 80%, 100%, and 125% zoom.
5. Check artwork remains visible behind all main panels, player controls work,
   context menus remain on top, and Studio/Immersive still open correctly.
6. Check minimum/maximum glass and blur preferences. Navigation/search wrappers
   intentionally retain tint without backdrop blur; other glass panels retain blur.

Do not treat fixture success as confirmation that the reported Spotify build
is fixed; record the real-client result before release.
