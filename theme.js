/* Solstice 3.1.23 — Confirmed explicit badge repair and Studio updater and settings backup with no feature removal. All existing Studio, immersive, animation and lyric features preserved. */
(() => {
  'use strict';
  if (window.__solstice3) return;
  window.__solstice3 = true;

  const SOLSTICE_VERSION = '3.1.23';
  window.__solsticeVersion = SOLSTICE_VERSION; // Diagnostic; does not affect preferences.
  const KEY = 'solstice-v3-prefs';
  const OLD_KEY = 'solstice-v2-prefs';
  const LYRICS = 'solstice-v2-lyrics'; // Retain all locally saved v2.x lyrics.
  const defaults = {
    accent: '#63e6ce', autoColor: true,
    blur: 18, glassOpacity: 16, artBlur: 12, glowStrength: 60, lyricSize: 13,
    artMotion: true, artMode: 'drift', vinyl: true, visualizer: true,
    karaoke: true, miniPlayer: false, autoLyrics: true, showPopups: true,
    ambientTint: 32, radius: 20, reducedMotion: false
  };
  const rgbHex = hex => [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)).join(',');
  const readJSON = (key, backup) => { try { const x = JSON.parse(localStorage.getItem(key)); return x && typeof x === 'object' ? x : backup; } catch { return backup; } };
  const old = readJSON(OLD_KEY, {});
  const prefs = Object.assign({}, defaults, {
    blur: old.blur, glassOpacity: old.glassOpacity, artBlur: old.artBlur,
    lyricSize: old.lyricSize, glowStrength: old.glowStrength, radius: old.radius,
    autoLyrics: old.autoLyrics, showPopups: old.showPopups, artMotion: old.artMotion
  }, readJSON(KEY, {}));
  // Avoid undefined settings from earlier releases overwriting new defaults.
  for (const key of Object.keys(defaults)) if (prefs[key] === undefined || prefs[key] === null) prefs[key] = defaults[key];
  // Ignore any old look selection and always follow the current cover artwork.
  delete prefs.preset;
  prefs.autoColor = true;
  const savedLyrics = readJSON(LYRICS, {});
  const lyricCache = new Map();
  const root = document.documentElement;
  const esc = v => String(v == null ? '' : v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clamp = (v, lo, hi, fallback) => Number.isFinite(+v) ? Math.max(lo, Math.min(hi, +v)) : fallback;
  const $ = (selector, context = document) => context.querySelector(selector);
  const make = (html) => { const box = document.createElement('template'); box.innerHTML = html.trim(); return box.content.firstElementChild; };
  const validHex = v => /^#[a-f\d]{6}$/i.test(String(v)) ? String(v) : null;
  const fmt = ms => { const sec = Math.max(0, Math.floor((+ms || 0) / 1000)); return Math.floor(sec/60) + ':' + String(sec%60).padStart(2,'0'); };
  let currentId = '', lastCover = '', lookupTimer, fetchAbort, studioTab = 'overview', studioClock, lastLyricKey = '', lastSideKey = '';
  let artworkGeneration = 0, lastColorStatus = 'Waiting for a song', lastLyricStatus = 'Play a track to fetch lyrics';
  let initialized = false, timer = null, eventBound = false, lastNowPlaying = '', dragState = null;
  let vinylScrub = null;

  function player() { return window.Spicetify?.Player; }
  function isPlaying() { try { return !!player()?.isPlaying?.(); } catch { return false; } }
  function progress() { try { return Math.max(0, Number(player()?.getProgress?.() ?? 0)); } catch { return 0; } }
  function duration() { try { return Math.max(0, Number(player()?.getDuration?.() ?? 0)); } catch { return 0; } }
  function track() {
    const state = player()?.data;
    const x = state?.item || state?.track || {};
    const meta = x.metadata || {};
    const a = Array.isArray(x.artists) ? x.artists : Array.isArray(x.album?.artists) ? x.album.artists : [];
    const artist = a.map(i => i.name).filter(Boolean).join(', ') || meta.artist_name || meta.artist || 'Spotify';
    const images = x.album?.images || x.images || [];
    let cover = images.find(i => i?.url || i?.uri)?.url || images[0]?.uri || x.image_url || meta.image_url || '';
    if (!cover) cover = $('[data-testid="cover-art-image"]')?.src || $('.main-nowPlayingWidget-coverArt img')?.src || '';
    if (cover.startsWith('spotify:image:')) cover = 'https://i.scdn.co/image/' + cover.slice(14);
    if (cover.startsWith('spotify:mosaic:')) cover = 'https://mosaic.scdn.co/640/' + cover.slice(15).replace(/:/g, '');
    if (!/^https?:\/\//i.test(cover)) cover = '';
    return { uri: x.uri || x.id || '', title: x.name || meta.title || 'Nothing playing', artist,
      album: x.album?.name || meta.album_title || '', cover, duration: Math.round(duration()/1000) || Math.round((x.duration?.milliseconds || x.duration || 0)/1000) };
  }
  function trackKey() { return track().uri || 'manual'; }
  function trackSignature(t = track()) { return [t.uri, t.title, t.artist].join('|'); }

  function style() {
    prefs.autoColor = true;
    const accent = validHex(prefs.accent) || '#63e6ce';
    const rgb = [1,3,5].map(i => parseInt(accent.slice(i,i+2),16));
    const surface = [12, 19, 28]; // Neutral dark glass; cover drives all colored lighting.
    const values = {
      '--sol-accent': accent, '--sol-rgb': rgb.join(','), '--sol-panel-rgb': surface.join(','),
      '--sol-second-rgb': rgb.join(','), '--sol-third-rgb': rgb.join(','),
      '--sol-blur': clamp(prefs.blur, 0, 45, 18) + 'px', '--sol-glass-alpha': (clamp(prefs.glassOpacity, 0, 80, 16)/100).toFixed(2),
      '--sol-art-blur': clamp(prefs.artBlur, 0, 55, 12) + 'px', '--sol-ambient-alpha': (clamp(prefs.ambientTint,0,85,32)/100).toFixed(2),
      '--sol-glow-strength': (clamp(prefs.glowStrength,0,100,60)/100).toFixed(2),
      '--sol-lyric-size': clamp(prefs.lyricSize,11,22,13) + 'px', '--sol-radius': clamp(prefs.radius,8,36,20) + 'px',
      '--spice-button': accent, '--spice-button-active': accent, '--spice-text-bright-accent': accent,
      '--text-bright-accent': accent, '--essential-bright-accent': accent
    };
    for (const [key,val] of Object.entries(values)) root.style.setProperty(key,val);
    root.dataset.solArtMode = ['drift','zoom','still'].includes(prefs.artMode) ? prefs.artMode : 'drift';
    root.removeAttribute('data-sol-preset');
    root.classList.toggle('sol-motion-off', !prefs.artMotion || prefs.reducedMotion);
    root.classList.toggle('sol-paused', !isPlaying());
    root.classList.remove('sol-vinyl-off');
    root.classList.toggle('sol-viz-off', !prefs.visualizer);
    root.classList.toggle('sol-karaoke-off', !prefs.karaoke);
    root.classList.toggle('sol-reduced-motion', !!prefs.reducedMotion);
    $('#sol-mini')?.classList.toggle('sol-hidden', !prefs.miniPlayer);
    $('#sol-immersive')?.classList.toggle('sol-no-viz', !prefs.visualizer);
    try { localStorage.setItem(KEY, JSON.stringify(prefs)); } catch {}
  }
  const setPref = (name, value) => { prefs[name] = value; style(); };
  function notify(message) {
    if (!prefs.showPopups) return;
    $('#sol-toast')?.remove();
    const el = make('<div id="sol-toast" role="status">♫ <span>' + esc(message) + '</span></div>');
    document.body.append(el);
    requestAnimationFrame(() => el.classList.add('sol-show'));
    setTimeout(() => { el.classList.remove('sol-show'); setTimeout(() => el.remove(), 400); }, 3400);
  }

  // Mount behind the actual Spotify .Root grid, not behind Spotify's entire opaque web app.
  function mountArtwork() {
    const host = $('.Root') || $('#main');
    if (!host) return null;
    let stage = $('#sol-art-stage');
    if (!stage) stage = make('<div id="sol-art-stage" aria-hidden="true"><div class="sol-art-gradient"></div><div class="sol-art-shade"></div></div>');
    if (stage.parentElement !== host) host.prepend(stage);
    return stage;
  }
  function redrawArtwork() {
    const stage = mountArtwork(); if (!stage) return;
    const t = track();
    if (!t.cover || t.cover === lastCover) return;
    lastCover = t.cover;
    const next = document.createElement('div');
    next.className = 'sol-art-frame';
    next.style.backgroundImage = 'url(' + JSON.stringify(t.cover) + ')';
    stage.insertBefore(next, $('.sol-art-gradient', stage));
    requestAnimationFrame(() => requestAnimationFrame(() => next.classList.add('sol-on')));
    setTimeout(() => { for (const older of stage.querySelectorAll('.sol-art-frame:not(:last-of-type)')) {
        // Frame order is: frames, gradient, shade. Keep only the most recent artwork frame.
        if (older !== next) older.remove();
      }
      for (const older of stage.querySelectorAll('.sol-art-frame')) if (older !== next) older.remove();
    }, 1300);
  }
  function sampleArtworkColor(src) {
    // The CDN may deny canvas pixels. Return null without causing a theme crash.
    return new Promise(resolve => {
      if (!src || !/^https:\/\//i.test(src)) return resolve(null);
      const img = new Image();
      img.crossOrigin = 'anonymous';
      let settled = false;
      const finish = color => { if (settled) return; settled = true; resolve(color); };
      const guard = setTimeout(() => finish(null), 3500);
      img.onload = () => {
        clearTimeout(guard);
        try {
          const canvas = document.createElement('canvas');
          canvas.width = canvas.height = 40;
          const ctx = canvas.getContext('2d', {willReadFrequently: true});
          if (!ctx) return finish(null);
          ctx.drawImage(img, 0, 0, 40, 40);
          const bytes = ctx.getImageData(0, 0, 40, 40).data;
          let best = null, bestScore = -1e6;
          for (let y=4; y<36; y+=3) for(let x=4; x<36; x+=3) {
            const k=(y*40+x)*4, r=bytes[k],g=bytes[k+1],b=bytes[k+2];
            if(bytes[k+3]<180) continue;
            const high=Math.max(r,g,b), low=Math.min(r,g,b);
            const chroma=high-low, bright=(high+low)/2;
            const score=chroma * 1.3 - Math.abs(bright-150)*.42;
            if(chroma<28 || bright<48 || bright>232 || score<bestScore)continue;
            bestScore=score; best=[r,g,b];
          }
          finish(best ? '#'+best.map(v=>v.toString(16).padStart(2,'0')).join('') : null);
        } catch { finish(null); }
      };
      img.onerror = () => { clearTimeout(guard); finish(null); };
      img.src = src;
    });
  }
  async function updatePalette(t) {
    const ticket=++artworkGeneration;
    let hex=null, via='';
    if(t.uri && typeof window.Spicetify?.colorExtractor === 'function') {
      try {
        const colors=await window.Spicetify.colorExtractor(t.uri);
        hex=[colors?.VIBRANT_NON_ALARMING,colors?.VIBRANT,colors?.LIGHT_VIBRANT,colors?.PROMINENT].map(validHex).find(Boolean)||null;
        if(hex)via='Spicetify';
      }catch{}
    }
    if(ticket!==artworkGeneration)return;
    if(!hex && t.cover){
      lastColorStatus='Sampling album art as color fallback…';
      hex=await sampleArtworkColor(t.cover);
      if(hex)via='cover pixel sampler';
    }
    if(ticket!==artworkGeneration)return;
    if(!hex){lastColorStatus='Artwork colors blocked; last matched accent retained';return;}
    const rgb=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
    const peak=Math.max(...rgb);
    const adjusted=peak<125?rgb.map(c=>Math.min(255,Math.round(c+(125-peak)*.85))):rgb;
    prefs.accent='#'+adjusted.map(c=>c.toString(16).padStart(2,'0')).join('');
    lastColorStatus='Matched to artwork ('+via+')';
    style();
  }

  function parseLRC(text) {
    const rows = [];
    for (const line of String(text || '').split(/\r?\n/)) {
      const marks = [...line.matchAll(/\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?\]/g)];
      const words = line.replace(/\[(\d{1,3}):(\d{2})(?:\.(\d{1,3}))?\]/g,'').trim();
      for (const m of marks) if (words) rows.push({ t: (+m[1]*60 + +m[2])*1000 + Number((m[3]||'0').padEnd(3,'0')), text: words });
    }
    return rows.sort((a,b) => a.t-b.t);
  }
  // Lyrics change on track changes or an edit, not every playback tick.
  // Cache parsed LRC data to avoid reparsing every 800 ms per visible pane.
  const parsedLyricsCache = new Map();
  function cachedLRC(text) {
    if (parsedLyricsCache.has(text)) return parsedLyricsCache.get(text);
    const parsed = parseLRC(text);
    if (parsedLyricsCache.size >= 16) parsedLyricsCache.delete(parsedLyricsCache.keys().next().value);
    parsedLyricsCache.set(text, parsed);
    return parsed;
  }
  function lyricText() { const t = track(); return savedLyrics[trackKey()] || lyricCache.get(trackSignature(t))?.text || ''; }
  function activeLyric(lines, p) { let left=0, right=lines.length-1, index=-1; while (left<=right) { const mid=(left+right)>>>1; if (p >= lines[mid].t) { index=mid; left=mid+1; } else right=mid-1; } return index; }
  // Scroll ONLY the lyric container; scrollIntoView would also move Spotify's page
  // and even the outer Immersive screen when the active lyric changes.
  function centerLyricInBox(box, line) {
    if (!box || !line || box.clientHeight === 0) return;
    const boxRect = box.getBoundingClientRect();
    const lineRect = line.getBoundingClientRect();
    const wanted = box.scrollTop + (lineRect.top + lineRect.height/2) - (boxRect.top + box.clientHeight/2);
    const limit = Math.max(0, box.scrollHeight - box.clientHeight);
    const target = Math.max(0, Math.min(limit, wanted));
    if (Math.abs(box.scrollTop-target) < 2) return;
    const reduced = prefs.reducedMotion || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    try { box.scrollTo({top:target,behavior:reduced?'instant':'smooth'}); }
    catch { box.scrollTop=target; }
  }
  function drawLyricBox(box, variant, snapshot) {
    if (!box) return;
    const {data, lines, fingerprint, position} = snapshot;
    if (box.dataset.signature !== fingerprint) {
      box.dataset.signature = fingerprint;
      box.dataset.active = '';
      box.innerHTML = lines.length ? lines.map((l,i) => `<p class="sol-line" data-line="${i}">${esc(l.text)}</p>`).join('') :
        data ? '<p class="sol-untimed">' + esc(data).replace(/\n/g,'<br>') + '</p>' :
          '<p class="sol-empty">No synchronized lyrics yet. Try fetching them in Studio.</p>';
    }
    if (lines.length) {
      const index = activeLyric(lines, position);
      if (box.dataset.active !== String(index)) {
        box.dataset.active = String(index);
        box.querySelector('.sol-line.sol-active')?.classList.remove('sol-active');
        const current = box.querySelector(`[data-line="${index}"]`);
        current?.classList.add('sol-active');
        if (variant === 'sidebar' || variant === 'immersive') centerLyricInBox(box,current);
      }
    }
  }
  function updateLyricUI(position = progress()) {
    // Share one LRC lookup, track fingerprint and playback position across all panes.
    const data = lyricText();
    const snapshot = {data, lines:cachedLRC(data), fingerprint:trackKey() + '|' + data, position};
    drawLyricBox($('#sol-side-lines'), 'sidebar', snapshot);
    if (!$('#sol-live-panel')?.hidden) drawLyricBox($('#sol-live-lines'), 'sidebar', snapshot);
    if (!$('#sol-overlay')?.hidden && $('#sol-studio-lyrics')) drawLyricBox($('#sol-studio-lyrics'), 'studio', snapshot);
    if (!$('#sol-immersive')?.hidden) drawLyricBox($('#sol-immersive-lines'), 'immersive', snapshot);
    const status = $('#sol-fetch-status'); if (status && status.textContent !== lastLyricStatus) status.textContent = lastLyricStatus;
  }
  async function fetchLyrics(force = false) {
    const t = track(), key = trackKey(), fingerprint = trackSignature(t);
    if (!t.uri || t.artist === 'Spotify') { lastLyricStatus='Play a track first.'; updateLyricUI(); return; }
    if (savedLyrics[key] && !force) { lastLyricStatus='Using your saved lyrics.'; updateLyricUI(); return; }
    if (lyricCache.has(fingerprint) && !force) { lastLyricStatus=lyricCache.get(fingerprint).message; updateLyricUI(); return; }
    fetchAbort?.abort();
    const controller = new AbortController(); fetchAbort=controller;
    lastLyricStatus='Looking for lyrics on LRCLIB…'; updateLyricUI();
    try {
      const params = new URLSearchParams({track_name:t.title,artist_name:t.artist});
      if (t.album) params.set('album_name',t.album);
      if (t.duration >= 1 && t.duration <= 3600) params.set('duration',String(t.duration));
      const response = await fetch('https://lrclib.net/api/get?' + params.toString(), {
        signal:controller.signal, headers:{'Lrclib-Client':'Solstice/3.0 (Spicetify local theme)'}
      });
      if (controller.signal.aborted) return;
      if (response.status === 429) throw Error('LRCLIB is rate limiting requests');
      if (response.status === 404) { lyricCache.set(fingerprint,{text:'',message:'No lyrics found; import your own .lrc file.'}); }
      else {
        if (!response.ok) throw Error('HTTP ' + response.status);
        const item = await response.json();
        const text = item.syncedLyrics || item.plainLyrics || '';
        lyricCache.set(fingerprint,{text, message:item.syncedLyrics?'Synchronized lyrics loaded.':text?'Untimed lyrics loaded.':'No lyrics available.'});
      }
      if (trackSignature()===fingerprint) { lastLyricStatus=lyricCache.get(fingerprint).message; updateLyricUI(); }
    } catch (e) { if (e.name !== 'AbortError' && trackSignature() === fingerprint) { lastLyricStatus='Lyrics lookup failed ('+e.message+'). You can import lyrics.'; updateLyricUI(); } }
  }
  function queueLyrics() { clearTimeout(lookupTimer); fetchAbort?.abort(); if (prefs.autoLyrics) lookupTimer=setTimeout(() => fetchLyrics(),500); }

  // Place lyrics AS A SIBLING of native Now Playing sections, not inside
  // Spotify's widget grid. Widget grids can lay their children on top of
  // Related music videos / About the artist instead of reserving space.
  let sidebarWatcher = null, watchedSidebar = null, sidebarRepairTimer = null;
  const NATIVE_SIDEBAR_SECTION = '.main-nowPlayingView-section, [class*="nowPlayingView-section"], [data-testid="now-playing-view-section"]';
  function sidebarScrollHost(right) {
    // Scrollable containers are ordered by their visible layout, not just by
    // descendant count (which previously selected an unrelated inner widget).
    const nodes = Array.from(right.querySelectorAll(
      '[data-overlayscrollbars-viewport], [class*="scrollNode"], [class*="scroll-node"], [class*="scrollable"], [class*="scrollContainer"], [class*="scroll-container"], [class*="scrollArea"]'
    )).filter(el => !/sectionHeader|sectionTitle|sectionHeading/i.test(String(el.className || '')) &&
        !el.closest('#sol-sidebar-lyrics') &&
      !/scrollbar|scrollBar|ScrollBar/.test(String(el.className || '')));
    const visible = nodes.filter(el => el.getBoundingClientRect().width > 0);
    if (visible.length) return visible[0];
    return right.querySelector('.main-nowPlayingView-nowPlayingView, [data-testid="now-playing-view"]') ||
      right.firstElementChild || right;
  }
  function nativeSections(right) {
    return Array.from(right.querySelectorAll(NATIVE_SIDEBAR_SECTION))
      .filter(el => !el.closest('#sol-sidebar-lyrics') &&
        !el.parentElement?.closest('#sol-sidebar-lyrics') &&
        // A wrapper around the entire Now Playing route is not a section.
        el !== right && el.parentElement);
  }
  function sidebarPlacement(right) {
    const widgets = right.querySelector('.main-nowPlayingView-nowPlayingWidgets, [class*="nowPlayingView-nowPlayingWidgets"]');
    const view = right.querySelector('.main-nowPlayingView-nowPlayingView, [data-testid="now-playing-view"]') ||
      right.querySelector('[class*="nowPlayingView-nowPlayingView"]');
    const sections = nativeSections(right);
    if (widgets?.parentElement) {
      // The entire widget grid is a React-owned layer. Even adding lyrics as
      // a sibling of an individual section INSIDE it can cover video/artist
      // cards. Insert BEFORE the widget grid, at its own parent level.
      // Now Playing's context (album/track info) remains above both.
      return { host:widgets.parentElement, before:widgets, sections, widgets, view };
    }
    if (sections.length) {
      const first = sections[0];
      return { host:first.parentElement, before:first, sections, widgets, view };
    }
    if (view) return { host:view, before:null, sections, widgets, view };
    return { host:sidebarScrollHost(right), before:null, sections, widgets, view };
  }
  function sidebarOverlap(card, native) {
    if (!card.isConnected || !native.isConnected) return false;
    const a = card.getBoundingClientRect(), b = native.getBoundingClientRect();
    return a.width > 0 && a.height > 0 && b.width > 0 && b.height > 0 &&
      a.left < b.right - 4 && b.left < a.right - 4 &&
      a.top < b.bottom - 4 && b.top < a.bottom - 4;
  }
  function mountSidebar() {
    const right = $('.Root__right-sidebar');
    if (!right) return;
    const card = $('#sol-sidebar-lyrics');
    // Do not inject on queue/device routes when Now Playing isn't visible.
    const differentRoute = right.querySelector('[data-testid="queue-view"], [data-testid="connect-device-view"], [class*="queue-queue"], [class*="queueQueue"]');
    const placement = sidebarPlacement(right);
    if ((!placement.view && !placement.widgets && differentRoute) || !right.children.length) {
      card?.remove();
      observeSidebar(right);
      return;
    }
    if (!placement.host) return;
    let lyricsCard = card;
    if (!lyricsCard) {
      lyricsCard = make('<section id="sol-sidebar-lyrics"><div class="sol-side-head"><b>Lyrics</b><button id="sol-sidebar-studio" type="button">↗ Studio</button></div><div id="sol-side-lines" class="sol-lyrics-scroll"></div><small>LRCLIB or your local saved lyrics</small></section>');
      $('#sol-sidebar-studio', lyricsCard).addEventListener('click',()=>openStudio('lyrics'));
    }
    const {host,before,sections,widgets,view} = placement;
    // Only touch the DOM when the position changed; forcing append every two
    // seconds can reset native scroll and trigger an unnecessary React repair.
    if (lyricsCard.parentElement !== host || lyricsCard.nextSibling !== before) {
      host.insertBefore(lyricsCard, before);
    }
    observeSidebar(right);
    updateLyricUI();
    // Some Spotify variants use positioned widget sections. After layout,
    // detect real overlap and move OUTSIDE the widgets rather than trying
    // to fix it with margins, top offsets, or a higher z-index.
    requestAnimationFrame(() => {
      if (!lyricsCard.isConnected || !right.contains(lyricsCard)) return;
      if (!sections.some(section => sidebarOverlap(lyricsCard, section))) return;
      const outer = widgets && !widgets.contains(lyricsCard) && widgets.parentElement
        ? widgets.parentElement : view && !view.contains(lyricsCard) ? view :
          sidebarScrollHost(right);
      if (outer && outer !== lyricsCard.parentElement && !lyricsCard.contains(outer)) {
        outer.append(lyricsCard);
      } else if (widgets?.parentElement && widgets.parentElement !== lyricsCard.parentElement) {
        widgets.insertAdjacentElement('afterend',lyricsCard);
      }
    });
  }
  function observeSidebar(right) {
    if (right === watchedSidebar) return;
    sidebarWatcher?.disconnect();
    watchedSidebar = right;
    sidebarWatcher = new MutationObserver(records => {
      // Ignore our own insertions and lyric text changes. Do respond when
      // Spotify replaces or moves a native Now Playing section.
      const nativeChange = records.some(record => {
        if (record.target.nodeType === 1 && record.target.closest('#sol-sidebar-lyrics')) return false;
        return [...record.addedNodes, ...record.removedNodes].some(node =>
          node.nodeType === 1 && node.id !== 'sol-sidebar-lyrics' &&
          !node.closest?.('#sol-sidebar-lyrics'));
      });
      if (!nativeChange || sidebarRepairTimer !== null) return;
      sidebarRepairTimer = setTimeout(() => {
        sidebarRepairTimer = null;
        mountSidebar();
      }, 120);
    });
    sidebarWatcher.observe(right, {childList:true,subtree:true});
  }
  function mountLiveLyrics() {
    if ($('#sol-live-panel')) return;
    const panel=make(`<aside id="sol-live-panel" hidden aria-label="Solstice live lyrics">
      <header><b>♫ Live lyrics</b><div><button id="sol-live-studio" type="button">Edit ↗</button>
      <button id="sol-live-close" type="button" aria-label="Close live lyrics">✕</button></div></header>
      <div id="sol-live-lines" class="sol-lyrics-scroll" aria-live="off"></div>
      <small>Synchronized to current playback when timed lyrics are available</small>
    </aside>`);
    document.body.append(panel);
    $('#sol-live-studio').onclick=()=>{panel.hidden=true;openStudio('lyrics');};
    $('#sol-live-close').onclick=()=>{panel.hidden=true;};
  }
  function toggleLiveLyrics() {
    mountLiveLyrics();
    const panel=$('#sol-live-panel');
    panel.hidden=!panel.hidden;
    if(!panel.hidden){updateLyricUI();if(!lyricText()&&prefs.autoLyrics)queueLyrics();}
  }


  // Solstice Updater checks GitHub's latest published manifest. Marketplace
  // remains responsible for installing files; we never execute remote JS.
  const UPDATE_BACKUP_KEY = 'solstice-v3-update-backup';
  let updateState = {checking:false, checkedAt:0, latest:null,
    message:'Choose Check for updates to compare with the public Solstice release.'};
  function versionCompare(a,b) {
    const left=String(a||'').split('.').slice(0,3).map(Number);
    const right=String(b||'').split('.').slice(0,3).map(Number);
    for(let i=0;i<3;i++){const x=left[i]||0,y=right[i]||0;if(x!==y)return x>y?1:-1;}
    return 0;
  }
  function solsticeBackup() {
    return {format:'solstice-studio-backup',schema:1,
      version:SOLSTICE_VERSION,createdAt:new Date().toISOString(),
      preferences:{...prefs},lyrics:{...savedLyrics}};
  }
  function keepUpdateSnapshot() {
    try {localStorage.setItem(UPDATE_BACKUP_KEY,JSON.stringify(solsticeBackup()));return true;}
    catch(e){console.warn('[Solstice] Could not save update snapshot',e);return false;}
  }
  function updateUpdaterPanel() {
    const message=$('#sol-updater-status');
    if(message)message.textContent=updateState.message;
    const check=$('#sol-updater-check');
    if(check){check.disabled=updateState.checking;check.textContent=updateState.checking?'Checking…':'Check for updates';}
    const version=$('#sol-updater-version');
    if(version)version.textContent='Installed: '+SOLSTICE_VERSION+(updateState.latest?' • Latest: '+updateState.latest:'');
  }
  async function checkSolsticeUpdates() {
    if(updateState.checking)return;
    updateState.checking=true;
    updateState.message='Checking the public Solstice release on GitHub…';
    updateUpdaterPanel();
    const controller=new AbortController();
    const watchdog=setTimeout(()=>controller.abort(),10000);
    try {
      const endpoints=[
        'https://raw.githubusercontent.com/y2kbeatzz-dot/Solstice/main/manifest.json?check='+Date.now(),
        'https://cdn.jsdelivr.net/gh/y2kbeatzz-dot/Solstice@main/manifest.json?check='+Date.now()
      ];
      let manifest=null;
      for(const endpoint of endpoints){
        try{
          const response=await fetch(endpoint,{cache:'no-store',signal:controller.signal});
          if(!response.ok)throw new Error('HTTP '+response.status);
          manifest=await response.json();
          break;
        }catch(e){if(controller.signal.aborted)throw e;}
      }
      if(!manifest)throw new Error('The release servers could not be reached.');
      const match=String(manifest.description||'').match(/Solstice\s+v?(\d+\.\d+\.\d+)/i);
      const release=typeof manifest.version==='string'&&/^\d+\.\d+\.\d+$/.test(manifest.version)?manifest.version:match?.[1];
      if(!release)throw new Error('Version unavailable in public manifest');
      updateState.latest=release;
      updateState.checkedAt=Date.now();
      const difference=versionCompare(updateState.latest,SOLSTICE_VERSION);
      updateState.message=difference>0?
        'Update available: '+updateState.latest+'. Your Studio settings and saved lyrics stay in Spotify storage. Open Marketplace → Installed → Update to apply it.':
        difference===0?'You are using the latest public Solstice version. Your settings and lyrics are preserved across theme updates.':
        'Your installed Solstice version is newer than the published manifest.';
    }catch(e){
      updateState.message='Could not check GitHub right now. You can still open Marketplace → Installed to look for updates.';
    }finally{
      clearTimeout(watchdog);
      updateState.checking=false;
      updateUpdaterPanel();
    }
  }
  function refreshSolsticeMarketplaceListing() {
    // Marketplace caches the manifest by repository in sessionStorage, while
    // preview images use a separate browser cache. Do not touch Studio prefs.
    const shouldReload=typeof window.confirm==='function'
      ?window.confirm('Refresh the Solstice listing? Spotify’s interface will reload. Your Studio settings and lyrics will remain saved.')
      :true;
    if(!shouldReload)return;
    keepUpdateSnapshot();
    try {window.sessionStorage.removeItem('y2kbeatzz-dot-Solstice');}
    catch(error){console.warn('[Solstice] Could not clear listing cache',error);}
    try {window.location.reload();}
    catch(error){
      updateState.message='Please close Spotify completely and reopen it to refresh Marketplace.';
      updateUpdaterPanel();
    }
  }
  function openSolsticeMarketplace() {
    // Keep an additional on-device safety copy before handing off to Marketplace.
    keepUpdateSnapshot();
    const history=window.Spicetify?.Platform?.History;
    if(history?.push){
      try {closeStudio();history.push('/marketplace');return;}catch(e){console.warn('[Solstice] Marketplace navigation failed',e);}
    }
    updateState.message='Open Marketplace from Spotify’s sidebar, then Installed → Solstice → Update.';
    updateUpdaterPanel();
  }
  function exportSolsticeBackup() {
    try {
      const json=JSON.stringify(solsticeBackup(),null,2);
      const blob=new Blob([json],{type:'application/json'});
      const url=URL.createObjectURL(blob);
      const anchor=document.createElement('a');
      anchor.href=url;anchor.download='Solstice-Settings-'+SOLSTICE_VERSION+'.json';
      document.body.append(anchor);anchor.click();anchor.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1500);
      updateState.message='Backup created. Keep the JSON file to restore your settings and lyrics later.';
    }catch(e){
      updateState.message='Could not export your backup. Your current settings were not changed.';
    }
    updateUpdaterPanel();
  }
  async function restoreSolsticeBackup(file) {
    if(!file)return;
    try{
      if(file.size>3_000_000)throw new Error('Backup file is too large.');
      const backup=JSON.parse(await file.text());
      if(backup?.format!=='solstice-studio-backup'||backup.schema!==1||
        !backup.preferences||typeof backup.preferences!=='object'||Array.isArray(backup.preferences)||
        !backup.lyrics||typeof backup.lyrics!=='object'||Array.isArray(backup.lyrics))
        throw new Error('Not a Solstice settings backup.');
      if(typeof window.confirm==='function'&&!window.confirm('Restore saved Solstice settings and lyrics from this backup? This replaces current Solstice preferences and lyric edits.'))return;
      // Only import known settings; old or unsafe keys cannot override theme internals.
      const restored={};
      for(const key of Object.keys(defaults)){
        if(Object.prototype.hasOwnProperty.call(backup.preferences,key)&&
           typeof backup.preferences[key]===typeof defaults[key])restored[key]=backup.preferences[key];
      }
      const lyrics={};
      for(const [key,value] of Object.entries(backup.lyrics)){
        if(typeof key==='string'&&key!=='__proto__'&&key!=='constructor'&&
           key!=='prototype'&&key.length<=512&&typeof value==='string')lyrics[key]=value;
      }
      // Write both storage keys together or restore previous values if storage
      // throws (quota/privacy mode), so no lyric edits are lost on failure.
      const previousPreferences=localStorage.getItem(KEY);
      const previousLyrics=localStorage.getItem(LYRICS);
      try{
        localStorage.setItem(KEY,JSON.stringify(restored));
        localStorage.setItem(LYRICS,JSON.stringify(lyrics));
      }catch(writeError){
        try{
          if(previousPreferences===null)localStorage.removeItem(KEY);
          else localStorage.setItem(KEY,previousPreferences);
          if(previousLyrics===null)localStorage.removeItem(LYRICS);
          else localStorage.setItem(LYRICS,previousLyrics);
        }catch(rollbackError){console.warn('[Solstice] Storage rollback failed',rollbackError);}
        throw writeError;
      }
      Object.assign(prefs,defaults,restored);
      prefs.autoColor=true;delete prefs.preset;
      for(const key of Object.keys(savedLyrics))delete savedLyrics[key];
      Object.assign(savedLyrics,lyrics);
      style();updateLyricUI();
      updateState.message='Backup restored. Your appearance and saved lyrics are ready.';
    }catch(e){updateState.message='Restore failed: '+(e?.message||'Unknown error')+'. Current settings were kept when validation failed.';}
    updateUpdaterPanel();
  }

  function mountUI() {
    if ($('#sol-launcher')) return;
    const launcher = make('<button id="sol-launcher" title="Open Solstice Studio (Ctrl+Alt+S)" type="button">☀ SOLSTICE</button>');
    launcher.addEventListener('click',()=>openStudio('overview'));
    document.body.append(launcher);
    const quick = make(`<nav id="sol-quick-actions" aria-label="Solstice quick controls">
      <button id="sol-quick-immersive" type="button" title="Open Immersive Mode (Ctrl+Alt+I)">✦ Immersive</button>
      <button id="sol-quick-lyrics" type="button" title="Show live playback lyrics (Ctrl+Alt+L)">♫ Lyrics</button>
    </nav>`);
    document.body.append(quick);
    $('#sol-quick-immersive').onclick = openImmersive;
    $('#sol-quick-lyrics').onclick = toggleLiveLyrics;
    mountLiveLyrics();
    const studio = make(`<div id="sol-overlay" hidden><div id="sol-shell" role="dialog" aria-modal="true" aria-label="Solstice Studio">
      <header class="sol-header"><button id="sol-close" type="button" aria-label="Close Studio">✕ Close</button><div><small>MADE BY CRYSTAL · SOLSTICE 3.1.23</small><h1>☀ Solstice Studio</h1></div></header>
      <nav id="sol-tabs" aria-label="Studio tabs"><button data-tab="overview">Overview</button><button data-tab="appearance">Appearance</button><button data-tab="experience">Experience</button><button data-tab="lyrics">Lyrics Studio</button><button data-tab="status">Diagnostics</button><button data-tab="updates">Updater</button></nav>
      <div id="sol-body"></div></div></div>`);
    document.body.append(studio);
    $('#sol-close').addEventListener('click',closeStudio);
    studio.addEventListener('mousedown',e=>{if (e.target === studio) closeStudio();});
    studio.querySelectorAll('#sol-tabs button').forEach(btn=>btn.addEventListener('click',()=>renderStudio(btn.dataset.tab)));
    mountImmersive(); mountMini();
    window.addEventListener('keydown',e=>{
      if (e.key === 'Escape') { if (!$('#sol-overlay')?.hidden) closeStudio(); else if (!$('#sol-immersive')?.hidden) closeImmersive(); else if (!$('#sol-live-panel')?.hidden) $('#sol-live-panel').hidden = true; return; }
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 's') { e.preventDefault(); openStudio('overview'); }
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'i') { e.preventDefault(); toggleImmersive(); }
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'l') { e.preventDefault(); toggleLiveLyrics(); }
    });
    style();
  }
  function openStudio(tab = 'overview') { $('#sol-overlay').hidden=false; renderStudio(tab); }
  function closeStudio() { $('#sol-overlay').hidden=true; clearInterval(studioClock); studioClock=null; }
  function labeledRange(label, key, min, max) { return `<label class="sol-control">${label}<input type="range" min="${min}" max="${max}" value="${clamp(prefs[key],min,max,defaults[key])}" data-range="${key}"><output>${esc(prefs[key])}</output></label>`; }
  function labeledSwitch(label, key, note='') { return `<label class="sol-switch">${label}${note?`<small>${esc(note)}</small>`:''}<input type="checkbox" data-switch="${key}" ${prefs[key]?'checked':''}></label>`; }
  function renderStudio(tab) {
    studioTab=tab;
    const body = $('#sol-body'); if (!body) return;
    $$('#sol-tabs button').forEach(btn=>btn.classList.toggle('active',btn.dataset.tab === tab));
    const t=track();
    if (tab === 'overview') {
      body.innerHTML = `<div class="sol-grid"><section class="sol-card sol-featured"><span class="sol-pill">SOLSTICE 3.1.23 · STUDIO UPDATER</span><h2>Music that fills the room.</h2><p>Animated artwork, synced lyrics, artwork-matched colors and a floating glass player.</p><div class="sol-actions"><button id="sol-open-immersive" class="sol-primary">✦ Open Immersive Mode</button></div></section><section class="sol-card"><span class="sol-pill">NOW PLAYING</span><h2>${esc(t.title)}</h2><p>${esc(t.artist)}</p><p>Animated artwork and karaoke are built into Immersive Mode.</p><div class="sol-actions"><button id="sol-open-live">Show live lyrics</button><button id="sol-open-lyrics">Edit lyrics</button><button id="sol-toggle-mini">${prefs.miniPlayer?'Hide':'Show'} mini player</button></div></section></div>`;
      $('#sol-open-immersive').onclick=()=>{closeStudio();openImmersive();};
      $('#sol-open-lyrics').onclick=()=>renderStudio('lyrics');
      $('#sol-open-live').onclick=()=>{closeStudio();toggleLiveLyrics();};
      $('#sol-toggle-mini').onclick=()=>{setPref('miniPlayer',!prefs.miniPlayer);renderStudio('overview');};

    } else if (tab === 'updates') {
      body.innerHTML='<div class="sol-grid"><section class="sol-card"><span class="sol-pill">SOLSTICE UPDATER</span><h2>Stay up to date</h2>'+
        '<p id="sol-updater-version" class="sol-note"></p><p id="sol-updater-status" class="sol-note" role="status"></p>'+
        '<p>Check for the newest Solstice on GitHub, then update through Spicetify Marketplace. Studio settings and lyric edits remain saved between versions.</p>'+
        '<div class="sol-actions"><button id="sol-updater-check" class="sol-primary" type="button">Check for updates</button>'+
        '<button id="sol-updater-open" type="button">Open Marketplace to update ↗</button>'+
        '<button id="sol-updater-refresh" type="button">Refresh Marketplace listing</button></div>'+
        '<p class="sol-note">Marketplace can cache an older theme description. Refresh Marketplace listing reloads Spotify’s interface without clearing your Studio settings.</p></section>'+
        '<section class="sol-card"><span class="sol-pill">KEEP YOUR SETTINGS</span><h2>Backup & restore</h2>'+
        '<p>Solstice automatically retains your Studio preferences and saved lyrics when you install a new version through Marketplace. Export a backup for extra protection.</p>'+
        '<div class="sol-actions"><button id="sol-updater-export" type="button">Export settings + lyrics</button>'+
        '<button id="sol-updater-import" type="button">Restore backup</button>'+
        '<input id="sol-updater-file" type="file" accept=".json,application/json" hidden></div>'+
        '<p class="sol-note">Only your Solstice settings and edited lyrics are included. No account information is exported.</p></section></div>';
      $('#sol-updater-check').onclick=checkSolsticeUpdates;
      $('#sol-updater-open').onclick=openSolsticeMarketplace;
      $('#sol-updater-refresh').onclick=refreshSolsticeMarketplaceListing;
      $('#sol-updater-export').onclick=exportSolsticeBackup;
      $('#sol-updater-import').onclick=()=>$('#sol-updater-file').click();
      $('#sol-updater-file').onchange=async event=>{
        const file=event.target.files?.[0];
        if(file)await restoreSolsticeBackup(file);
        event.target.value='';
      };
      updateUpdaterPanel();
      if(!updateState.checkedAt&&!updateState.checking)void checkSolsticeUpdates();
    } else if (tab === 'appearance') {
      body.innerHTML = `<div class="sol-grid"><section class="sol-card"><h2>Artwork-matched glass</h2><p>All colors follow the current album art automatically. Adjust the sliders while watching the live sample below.</p><div id="sol-effects-demo" aria-label="Glass effects preview"><div id="sol-effects-demo-art"></div><div id="sol-effects-demo-glass"><b>Solstice glass</b><small>Live blur · opacity · glow</small></div></div>${labeledRange('Glass opacity (%)','glassOpacity',0,80)}${labeledRange('Glass blur (px)','blur',0,45)}${labeledRange('Corner radius (px)','radius',8,36)}
       ${labeledRange('Glow strength (%)','glowStrength',0,100)}</section><section class="sol-card"><h2>Living backgrounds</h2>
       ${labeledSwitch('Moving album art','artMotion')}${labeledRange('Album art blur (px)','artBlur',0,55)}${labeledRange('Background dimming (%)','ambientTint',0,85)}
       <label class="sol-control">Artwork animation <select data-select="artMode"><option value="drift">Slow drift</option><option value="zoom">Breathing zoom</option><option value="still">Still image</option></select></label>
       ${labeledRange('Sidebar lyric size (px)','lyricSize',11,22)}${labeledSwitch('Reduced motion','reducedMotion','Stops continuous motion without losing color or glass.')}
       <div class="sol-actions"><button id="sol-refresh">Refresh artwork</button></div></section></div>`;
      $('[data-select="artMode"]',body).value=prefs.artMode;
      const preview=$('#sol-effects-demo-art');
      if(preview && t.cover)preview.style.backgroundImage='url('+JSON.stringify(t.cover)+')';
      $('#sol-refresh',body).onclick=()=>{lastCover='';redrawArtwork();updatePalette(track());notify('Artwork refreshed');};
    } else if (tab === 'experience') {
      body.innerHTML = `<div class="sol-grid"><section class="sol-card"><h2>Immersive listening</h2><p>Full-window artwork, big lyrics and a playback-reactive ambient visualizer.</p>
        ${labeledSwitch('Karaoke lyric highlighting','karaoke')}${labeledSwitch('Animated ambient bars','visualizer','Animation follows play/pause; actual audio spectrum is unavailable.')}
        <button id="sol-experience-open" class="sol-primary">Launch Immersive Mode</button></section><section class="sol-card"><h2>Your player</h2>
        ${labeledSwitch('Draggable floating mini player','miniPlayer','Mini player lives inside the Spotify window.')}${labeledSwitch('Automatic LRCLIB lyrics','autoLyrics')}${labeledSwitch('Track notifications','showPopups')}
        <p class="sol-note">Keyboard: Ctrl+Alt+I toggles Immersive, Ctrl+Alt+S opens Studio, Escape closes.</p></section></div>`;
      $('#sol-experience-open').onclick=()=>{closeStudio();openImmersive();};
    } else if (tab === 'lyrics') {
      body.innerHTML = `<div class="sol-grid"><section class="sol-card"><span class="sol-pill">LRCLIB + LOCAL LRC</span><h2>${esc(t.title)}</h2><p>${esc(t.artist)}</p><p id="sol-fetch-status" class="sol-note">${esc(lastLyricStatus)}</p><div id="sol-studio-lyrics" class="sol-lyrics-scroll"></div><div class="sol-actions"><button id="sol-fetch">Fetch lyrics</button><button id="sol-sync">Sync display</button><button id="sol-clear">Remove saved lyrics</button></div></section>
      <section class="sol-card"><h2>Lyrics editor</h2><p>Timed format: <code>[00:12.50] First line</code>. Original v2.x edits are kept.</p><textarea id="sol-editor" spellcheck="false" placeholder="[00:00.00] First line&#10;[00:04.25] Second line">${esc(savedLyrics[trackKey()]||'')}</textarea>
      <div class="sol-actions"><button id="sol-save" class="sol-primary">Save lyrics</button><button id="sol-import">Import .lrc</button><input type="file" id="sol-lyricfile" accept=".lrc,.txt" hidden></div><p class="sol-note">Saved edits override LRCLIB and stay on this PC.</p></section></div>`;
      $('#sol-fetch').onclick=()=>fetchLyrics(true);
      $('#sol-sync').onclick=updateLyricUI;
      $('#sol-save').onclick=()=>{savedLyrics[trackKey()]=$('#sol-editor').value;try{localStorage.setItem(LYRICS,JSON.stringify(savedLyrics));}catch{}updateLyricUI();notify('Local lyrics saved');};
      $('#sol-clear').onclick=()=>{delete savedLyrics[trackKey()];try{localStorage.setItem(LYRICS,JSON.stringify(savedLyrics));}catch{}$('#sol-editor').value='';updateLyricUI();};
      $('#sol-import').onclick=()=>$('#sol-lyricfile').click();
      $('#sol-lyricfile').onchange=async e=>{const f=e.target.files?.[0];if (f && f.size < 1_000_000) $('#sol-editor').value=await f.text();};
      updateLyricUI();
      if (prefs.autoLyrics && !lyricCache.has(trackSignature(t)) && !savedLyrics[trackKey()]) queueLyrics();
    } else if (tab === 'status') {
      body.innerHTML = `<div class="sol-grid"><section class="sol-card"><h2>Effect diagnostics</h2><p>Spicetify Player: <strong id="sol-status-player"></strong></p><p>Artwork: <strong id="sol-status-art"></strong></p><p>Cover colors: <strong id="sol-status-color"></strong></p><p>LRCLIB: <strong id="sol-status-lyrics"></strong></p><p>Current route: <strong id="sol-status-route"></strong></p><div class="sol-actions"><button id="sol-test-effects">Recheck & refresh effects</button></div></section><section class="sol-card"><h2>Recovery</h2><p>Reset appearance without deleting saved lyrics, or use Updater to back up your preferences.</p><button id="sol-reset-prefs">Reset appearance preferences</button><p class="sol-note">Use the Updater tab to check for new releases and save a settings backup before updating.</p></section></div>`;
      $('#sol-test-effects').onclick=()=>{lastCover='';redrawArtwork();updatePalette(track());renderDiagnostics();};
      $('#sol-reset-prefs').onclick=()=>{Object.assign(prefs,defaults);style();lastCover='';redrawArtwork();updatePalette(track());renderStudio('appearance');};
      renderDiagnostics();
    }
    $$('[data-range]',body).forEach(el=>{
      const onChange=()=>{setPref(el.dataset.range,Number(el.value));const output=el.closest('label')?.querySelector('output');if(output)output.textContent=el.value;};
      el.addEventListener('input',onChange);el.addEventListener('change',onChange);
    });
    $$('[data-switch]',body).forEach(el=>el.onchange=()=>{setPref(el.dataset.switch,el.checked);if(el.dataset.switch==='autoLyrics'&&el.checked)queueLyrics();});
    $$('[data-select]',body).forEach(el=>el.onchange=()=>setPref(el.dataset.select,el.value));
  }
  function $$(selector, ctx=document) { return [...ctx.querySelectorAll(selector)]; }
  function renderDiagnostics() {
    if (studioTab !== 'status' || $('#sol-overlay')?.hidden) return;
    const write=(id,val)=>{const el=$('#'+id);if(el)el.textContent=val;};
    write('sol-status-player',player()?'Connected':'Waiting');
    write('sol-status-art',$('#sol-art-stage .sol-art-frame')?'Layer active':track().cover?'Cover found but waiting':'No cover currently available');
    write('sol-status-color',lastColorStatus);
    write('sol-status-lyrics',lastLyricStatus);
    write('sol-status-route',location.pathname || '/');
  }


  // The vinyl scrubs Spotify's track position. It cannot reverse the PCM audio.
  function vinylPointerAngle(e,rect) {
    return Math.atan2(e.clientY-rect.top-rect.height/2,e.clientX-rect.left-rect.width/2);
  }
  function vinylAngleDelta(delta) {return Math.atan2(Math.sin(delta),Math.cos(delta));}
  function seekVinyl(position) {
    const length=duration();
    if(!length||!Number.isFinite(position))return false;
    const next=Math.round(clamp(position,0,length,0));
    try {player()?.seek?.(next);}catch(e){console.warn('[Solstice] Vinyl seek failed',e);return false;}
    const value=$('#sol-vinyl');
    if(value){value.setAttribute('aria-valuenow',String(Math.round(next*1000/length)));value.setAttribute('aria-valuetext',fmt(next));}
    return true;
  }
  function seekVinylRelative(ms) {
    seekVinyl((vinylScrub?.targetMs ?? progress())+ms);
  }
  function vinylRotation(el) {
    try {
      const matrix=new DOMMatrixReadOnly(getComputedStyle(el).transform);
      return Math.atan2(matrix.b,matrix.a)*180/Math.PI;
    }catch{return 0;}
  }
  function finishVinylScrub(e) {
    const state=vinylScrub;
    if(!state||(e?.pointerId!==undefined&&e.pointerId!==state.pointerId))return;
    vinylScrub=null;
    const disc=$('#sol-vinyl');
    if(disc) {
      if(disc.hasPointerCapture?.(state.pointerId))try{disc.releasePointerCapture(state.pointerId);}catch{}
      disc.classList.remove('sol-scratching','sol-vinyl-grabbed');
      disc.style.removeProperty('--sol-scratch-angle');
      disc.style.removeProperty('transform');
      disc.style.removeProperty('animation');
      const phase=((state.rotation%360)+360)%360;
      disc.style.animationDelay=(-phase/360*13)+'s';
    }
    if(state.moved&&state.trackUri===track().uri)seekVinyl(state.targetMs);
    const hint=$('#sol-vinyl-hint');
    if(hint)hint.textContent='↶ Drag record to rewind or fast-forward ↷';
    if(state.wasPlaying&&state.trackUri===track().uri)try{player()?.play?.();}catch{}
  }
  function setupInteractiveVinyl() {
    const disc=$('#sol-vinyl');
    if(!disc)return;
    $('#sol-rewind-10').onclick=()=>seekVinylRelative(-10000);
    $('#sol-forward-10').onclick=()=>seekVinylRelative(10000);
    $('#sol-tonearm').onclick=()=>player()?.togglePlay?.();
    disc.addEventListener('pointerdown',e=>{
      if(e.button!==0||vinylScrub||!duration())return;
      const rect=disc.getBoundingClientRect();
      if(!rect.width||!rect.height)return;
      const state={pointerId:e.pointerId,bounds:rect,previous:vinylPointerAngle(e,rect),
        rotation:vinylRotation(disc),targetMs:progress(),wasPlaying:isPlaying(),
        trackUri:track().uri,moved:false,lastSeek:0};
      vinylScrub=state;
      disc.style.setProperty('--sol-scratch-angle',state.rotation+'deg');
      // Render the record movement directly, even when another stylesheet
      // prevents the CSS custom-property-driven transform from updating.
      disc.style.setProperty('animation','none','important');
      disc.style.setProperty('transform','rotate('+state.rotation+'deg)','important');
      disc.classList.add('sol-scratching','sol-vinyl-grabbed');
      try{disc.setPointerCapture(e.pointerId);}catch{}
      if(state.wasPlaying)try{player()?.pause?.();}catch{}
      e.preventDefault();
    });
    disc.addEventListener('pointermove',e=>{
      const state=vinylScrub;
      if(!state||e.pointerId!==state.pointerId)return;
      const angle=vinylPointerAngle(e,state.bounds);
      const delta=vinylAngleDelta(angle-state.previous);
      state.previous=angle;
      if(Math.abs(delta)<.002)return;
      state.moved=true;
      state.rotation+=delta*180/Math.PI;
      // One 360° turn moves 12s: usable turntable-style scrub sensitivity.
      state.targetMs=clamp(state.targetMs+delta/(2*Math.PI)*12000,0,duration(),0);
      // Inline transform is already the source of truth, so skip changing
      // the CSS custom property on each pointer event (less style work).
      // Turn both the record grooves and album center label with the cursor.
      disc.style.setProperty('transform','rotate('+state.rotation+'deg)','important');
      const hint=$('#sol-vinyl-hint');
      const cue='CUE '+fmt(state.targetMs)+' / '+fmt(duration());
      if(hint&&hint.textContent!==cue)hint.textContent=cue;
      const now=performance.now();
      // Spotify seeks can be expensive. Keep the record moving smoothly while
      // batching player seeks to at most ~3 per second; commit on pointerup.
      if(now-state.lastSeek>320){seekVinyl(state.targetMs);state.lastSeek=now;}
      e.preventDefault();
    });
    disc.addEventListener('pointerup',finishVinylScrub);
    disc.addEventListener('pointercancel',finishVinylScrub);
    disc.addEventListener('lostpointercapture',finishVinylScrub);
    disc.addEventListener('keydown',e=>{
      const step=e.shiftKey?15000:5000;
      if(e.key==='ArrowLeft'||e.key==='ArrowDown')seekVinylRelative(-step);
      else if(e.key==='ArrowRight'||e.key==='ArrowUp')seekVinylRelative(step);
      else if(e.key==='Home')seekVinyl(0);
      else if(e.key==='End')seekVinyl(duration());
      else if(e.key==='Enter'||e.key===' ')player()?.togglePlay?.();
      else return;
      e.preventDefault();
    });
  }

  // Solstice 3.1.23: Marketplace may keep an outdated pinned user.css in its
  // installed-theme record. Ship essential vinyl/needle styling *with* this
  // JavaScript, so the album label and SVG tonearm always render together.
  // Style is injected just once, after Marketplace's CSS, not on each tick.
  const turntableCSS = "/* Solstice 3.1.20: visible record + centered album label + stable turntable.\n   The old album image filled the disc, hiding every black vinyl groove.\n   The old .sol-deck had no explicit size, so the absolutely-positioned\n   tonearm could collapse into a floating square. */\n#sol-immersive .sol-vinyl-area{\n  overflow:visible!important;\n  gap:10px!important;\n}\n#sol-immersive .sol-deck{\n  --sol-platter-size:min(39vw,49vh,470px);\n  box-sizing:border-box!important;\n  position:relative!important;\n  display:grid!important;\n  place-items:center!important;\n  width:var(--sol-platter-size)!important;\n  height:var(--sol-platter-size)!important;\n  min-width:230px!important;\n  min-height:230px!important;\n  max-width:calc(100vw - 38px)!important;\n  max-height:calc(100vw - 38px)!important;\n  aspect-ratio:1!important;\n  overflow:visible!important;\n  padding:12px!important;\n  border:1px solid rgba(172,215,215,.28)!important;\n  border-radius:26px!important;\n  background:linear-gradient(148deg,#1c2e35,#09141d 62%,#1b3039)!important;\n  box-shadow:0 22px 56px #0008,inset 0 2px 4px #ffffff12!important;\n}\n#sol-immersive .sol-deck::before{\n  content:\"\";position:absolute!important;inset:4%!important;\n  border-radius:50%!important;\n  border:2px solid #50616d!important;\n  box-shadow:0 0 0 6px #090f15,0 10px 25px #000b!important;\n  pointer-events:none!important;\n}\n#sol-immersive #sol-vinyl{\n  box-sizing:border-box!important;\n  z-index:2!important;\n  position:relative!important;\n  display:block!important;\n  width:87%!important;\n  height:87%!important;\n  min-width:0!important;\n  min-height:0!important;\n  max-width:none!important;\n  flex-shrink:0!important;\n  aspect-ratio:1!important;\n  border:5px solid #03070c!important;\n  border-radius:50%!important;\n  overflow:hidden!important;\n  background:\n    radial-gradient(circle at 50% 50%,transparent 0 22%,#081017 22.5% 25%,transparent 25.5%),\n    repeating-radial-gradient(circle at center,#090e16 0 2px,#172129 3px 4px,#050a11 5px 7px,#161f29 8px 9px)!important;\n  box-shadow:0 14px 38px #000c,0 0 30px rgba(var(--sol-rgb),.18),inset 0 0 22px #000!important;\n  touch-action:none!important;\n  cursor:grab!important;\n  will-change:auto;\n}\n#sol-immersive #sol-vinyl.sol-vinyl-grabbed{\n  cursor:grabbing!important;\n  will-change:transform!important;\n  box-shadow:0 15px 35px #000d!important;\n}\n#sol-immersive #sol-vinyl.sol-scratching{\n  animation:none!important;\n  transform:rotate(var(--sol-scratch-angle,0deg))!important;\n}\n#sol-immersive #sol-vinyl::after{\n  content:\"\"!important;position:absolute!important;z-index:2!important;\n  inset:0!important;pointer-events:none!important;border-radius:50%!important;\n  background:repeating-radial-gradient(circle at center,transparent 0 10px,#ffffff0a 11px 12px,transparent 13px 18px),\n    linear-gradient(125deg,#ffffff12,transparent 35%,transparent 66%,#ffffff1a)!important;\n}\n#sol-immersive #sol-vinyl #sol-immersive-art{\n  box-sizing:border-box!important;\n  position:absolute!important;\n  z-index:3!important;\n  display:block!important;\n  left:50%!important;\n  top:50%!important;\n  right:auto!important;\n  bottom:auto!important;\n  width:40%!important;\n  height:40%!important;\n  max-width:none!important;\n  transform:translate(-50%,-50%)!important;\n  object-fit:cover!important;\n  object-position:center!important;\n  border:4px solid #151c25!important;\n  border-radius:50%!important;\n  box-shadow:0 0 0 2px #ffffff36,0 4px 12px #000a!important;\n  pointer-events:none!important;\n}\n#sol-immersive #sol-vinyl .sol-vinyl-label{\n  box-sizing:border-box!important;\n  position:absolute!important;\n  z-index:4!important;\n  left:50%!important;\n  top:50%!important;\n  width:11px!important;\n  height:11px!important;\n  padding:0!important;\n  margin:0!important;\n  transform:translate(-50%,-50%)!important;\n  border:2px solid #a9d7d9!important;\n  border-radius:50%!important;\n  background:#0a141b!important;\n  box-shadow:0 0 0 2px #0008!important;\n  pointer-events:none!important;\n}\n/* The tonearm is a separate layer over a fixed-size deck, never the record. */\n#sol-immersive .sol-deck #sol-tonearm{\n  display:block!important;\n  box-sizing:border-box!important;\n  position:absolute!important;\n  z-index:10!important;\n  right:1%!important;\n  top:4%!important;\n  left:auto!important;\n  bottom:auto!important;\n  width:32%!important;\n  height:78%!important;\n  min-width:0!important;\n  min-height:0!important;\n  border:0!important;\n  border-radius:0!important;\n  padding:0!important;\n  margin:0!important;\n  opacity:1!important;\n  visibility:visible!important;\n  background:transparent!important;\n  box-shadow:none!important;\n  cursor:pointer!important;\n  transform-origin:78% 11%!important;\n  transform:rotate(-32deg)!important;\n  transition:transform .35s ease!important;\n}\n#sol-immersive .sol-deck #sol-tonearm.sol-needle-down{\n  transform:rotate(-7deg)!important;\n}\n#sol-immersive #sol-tonearm .sol-arm-shaft{\n  display:block!important;\n  position:absolute!important;\n  top:17%!important;\n  left:72%!important;\n  width:10px!important;\n  height:66%!important;\n  border-radius:9px!important;\n  background:linear-gradient(90deg,#263845,#f0ffff 45%,#718b9c 90%)!important;\n  box-shadow:2px 3px 7px #000b!important;\n  transform:rotate(13deg)!important;\n  transform-origin:top center!important;\n  opacity:1!important;\n}\n#sol-immersive #sol-tonearm .sol-arm-needle{\n  display:block!important;\n  position:absolute!important;\n  top:75%!important;\n  left:61%!important;\n  width:26px!important;\n  height:28px!important;\n  border:1px solid #e5f8ff9a!important;\n  border-radius:4px!important;\n  background:linear-gradient(145deg,#b5cad2,#33495a 80%)!important;\n  transform:rotate(13deg)!important;\n  opacity:1!important;\n}\n#sol-immersive #sol-vinyl-hint{\n  margin-top:6px!important;\n  color:#edfffc!important;\n}\n@media(max-width:880px){\n  #sol-immersive .sol-deck{\n    --sol-platter-size:min(48vw,260px,35vh);\n    min-width:175px!important;min-height:175px!important;\n    padding:7px!important;\n    border-radius:18px!important;\n  }\n  #sol-immersive .sol-deck #sol-tonearm{\n    width:34%!important;height:78%!important;\n  }\n  #sol-immersive #sol-tonearm .sol-arm-shaft{width:7px!important;}\n  #sol-immersive #sol-tonearm .sol-arm-needle{width:20px!important;height:20px!important;}\n}\n@media(prefers-reduced-motion:reduce){\n  #sol-immersive .sol-deck #sol-tonearm{transition:none!important;}\n}\n:root.sol-reduced-motion #sol-immersive .sol-deck #sol-tonearm{transition:none!important;}\n\n\n/* Solstice 3.1.22: real articulated needle with a fixed bearing and\n   a moving S-curve tonearm. Earlier CSS-only arm parts are superseded.\n   The record is smaller, and the album cover is a true center label. */\n#sol-immersive .sol-deck{\n  --sol-platter-size:min(34vw,43vh,390px)!important;\n}\n#sol-immersive #sol-vinyl #sol-immersive-art{\n  width:34%!important;\n  height:34%!important;\n  border:3px solid #18242e!important;\n}\n#sol-immersive #sol-vinyl .sol-vinyl-label{\n  width:9px!important;\n  height:9px!important;\n}\n#sol-immersive .sol-deck #sol-tonearm,\n#sol-immersive .sol-deck #sol-tonearm.sol-needle-down {\n  box-sizing:border-box!important;\n  position:absolute!important;\n  display:block!important;\n  top:0!important;\n  right:-2%!important;\n  bottom:auto!important;\n  left:auto!important;\n  width:40%!important;\n  height:85%!important;\n  min-width:0!important;\n  min-height:0!important;\n  z-index:12!important;\n  margin:0!important;\n  padding:0!important;\n  border:0!important;\n  border-radius:0!important;\n  background:none!important;\n  background-image:none!important;\n  color:inherit!important;\n  box-shadow:none!important;\n  overflow:visible!important;\n  transform:none!important;\n  transition:none!important;\n  filter:drop-shadow(3px 6px 4px #000b)!important;\n  cursor:pointer!important;\n  opacity:1!important;\n  visibility:visible!important;\n}\n#sol-immersive .sol-deck #sol-tonearm::before,\n#sol-immersive .sol-deck #sol-tonearm::after{\n  content:none!important;\n  display:none!important;\n}\n#sol-immersive #sol-tonearm .sol-tonearm-svg{\n  display:block!important;\n  width:100%!important;\n  height:100%!important;\n  max-width:none!important;\n  max-height:none!important;\n  overflow:visible!important;\n  opacity:1!important;\n  visibility:visible!important;\n  pointer-events:none!important;\n  transform:none!important;\n}\n#sol-immersive #sol-tonearm .sol-tonearm-head {\n  transform-box:view-box;\n  transform-origin:135px 33px;\n  transform:rotate(-29deg);\n  transition:transform 770ms cubic-bezier(.2,.9,.2,1);\n}\n#sol-immersive #sol-tonearm.sol-needle-down .sol-tonearm-head{\n  transform:rotate(-3deg);\n}\n#sol-immersive #sol-tonearm .sol-tonearm-cartridge{\n  transform:translateY(-8px);\n  transition:transform 280ms cubic-bezier(.2,.9,.35,1) 0ms;\n}\n#sol-immersive #sol-tonearm.sol-needle-down .sol-tonearm-cartridge{\n  transform:translateY(0);\n  transition-delay:570ms;\n}\n#sol-immersive #sol-tonearm .sol-stylus-glow{\n  opacity:.1;\n  transition:opacity 200ms ease;\n}\n#sol-immersive #sol-tonearm.sol-needle-down .sol-stylus-glow{\n  opacity:1;\n  filter:drop-shadow(0 0 4px #79ffeb);\n  transition-delay:760ms;\n}\n#sol-immersive #sol-tonearm:focus-visible{\n  outline:3px solid var(--sol-accent)!important;\n  outline-offset:3px!important;\n  border-radius:12px!important;\n}\n/* Ensure the entire assembly stays proportional on laptops. */\n@media(max-width:880px){\n  #sol-immersive .sol-deck{\n    --sol-platter-size:min(46vw,34vh,245px)!important;\n  }\n  #sol-immersive .sol-deck #sol-tonearm{\n    right:-3%!important;\n    width:42%!important;\n  }\n}\n@media(max-width:490px){\n  #sol-immersive .sol-deck{\n    --sol-platter-size:min(60vw,33vh,225px)!important;\n  }\n}\n@media(prefers-reduced-motion:reduce){\n  #sol-immersive #sol-tonearm .sol-tonearm-head,\n  #sol-immersive #sol-tonearm .sol-tonearm-cartridge,\n  #sol-immersive #sol-tonearm .sol-stylus-glow{\n    transition:none!important;\n  }\n}\n:root.sol-reduced-motion #sol-immersive #sol-tonearm .sol-tonearm-head,\n:root.sol-reduced-motion #sol-immersive #sol-tonearm .sol-tonearm-cartridge,\n:root.sol-reduced-motion #sol-immersive #sol-tonearm .sol-stylus-glow{\n  transition:none!important;\n}\n";
  function ensureTurntableCSS() {
    let tag = document.getElementById('solstice-turntable-styles');
    if (tag) return tag;
    tag = document.createElement('style');
    tag.id = 'solstice-turntable-styles';
    tag.dataset.version = SOLSTICE_VERSION;
    tag.textContent = turntableCSS;
    (document.head || document.body).appendChild(tag);
    return tag;
  }

  function mountImmersive() {
    ensureTurntableCSS();
    if ($('#sol-immersive')) return;
    const el = make(`<section id="sol-immersive" hidden aria-label="Solstice Immersive Mode">
      <div class="sol-immersive-bg"></div><div class="sol-immersive-shade"></div>
      <header class="sol-immersive-top"><strong>☀ SOLSTICE <span>IMMERSIVE</span></strong><div class="sol-actions"><button id="sol-immersive-fullscreen" type="button" aria-label="Toggle system fullscreen">⛶ Fullscreen</button><button id="sol-immersive-exit" type="button" aria-label="Close immersive mode">✕ Close</button></div></header><p id="sol-fullscreen-status" role="status" hidden></p>
      <div class="sol-immersive-center"><div class="sol-vinyl-area"><div class="sol-deck"><div id="sol-vinyl" role="slider" tabindex="0" aria-label="Rotate the record to rewind or fast-forward" aria-valuemin="0" aria-valuemax="1000" aria-valuenow="0" aria-valuetext="0:00"><img id="sol-immersive-art" alt="Current album artwork"><div class="sol-vinyl-label"></div></div><button id="sol-tonearm" type="button" aria-label="Lift or drop the needle to pause or play" aria-pressed="false" title="Lift or drop the stylus · play/pause">
<svg class="sol-tonearm-svg" viewBox="0 0 180 320" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">
<defs>
 <linearGradient id="sol-tonearm-metal" x1="0" x2="1"><stop offset="0" stop-color="#263c4d"/><stop offset=".25" stop-color="#9dc2cb"/><stop offset=".48" stop-color="#f2fcff"/><stop offset=".68" stop-color="#a7c2c9"/><stop offset="1" stop-color="#32485a"/></linearGradient>
 <linearGradient id="sol-tonearm-black" x1="0" y1="0" x2=".8" y2="1"><stop stop-color="#64798a"/><stop offset=".35" stop-color="#293b48"/><stop offset="1" stop-color="#09121a"/></linearGradient>
 <radialGradient id="sol-tonearm-bearing"><stop stop-color="#d5f4ee"/><stop offset=".48" stop-color="#566e7e"/><stop offset="1" stop-color="#0a131c"/></radialGradient>
</defs>
<!-- Stationary bearing and weighted pivot on the turntable plinth. -->
<ellipse cx="135" cy="35" rx="34" ry="21" fill="#02070d" opacity=".8"/>
<circle cx="135" cy="33" r="27" fill="#0b1620" stroke="#7695a1" stroke-width="3"/>
<circle cx="135" cy="33" r="22" fill="url(#sol-tonearm-bearing)" stroke="#182b39" stroke-width="4"/>
<circle cx="135" cy="33" r="11" fill="#1d3441" stroke="#d3eced" stroke-width="2"/>
<circle cx="135" cy="33" r="4.5" fill="#aeeadd"/>
<path d="M 114 53 H 156" stroke="#192935" stroke-width="10" stroke-linecap="round"/>
<path d="M 115 51 H 155" stroke="#7e9c9d" stroke-width="3" stroke-linecap="round"/>
<!-- Counterweight, S-shaped steel tonearm and cartridge. -->
<g class="sol-tonearm-head">
 <rect x="113" y="12" width="44" height="22" rx="9" fill="url(#sol-tonearm-black)" stroke="#abc8d0" stroke-width="1.5"/>
 <path d="M 120 14 V 31 M 124 13 V 32 M 129 13 V 32 M 134 13 V 32 M 139 13 V 32 M 144 14 V 31 M 149 14 V 31" stroke="#cedfe6" opacity=".22"/>
 <rect x="108" y="31" width="10" height="34" rx="4" fill="url(#sol-tonearm-metal)"/>
 <path d="M 113 54 C 116 91 143 139 121 182 C 109 209 85 222 64 239" fill="none" stroke="#03121c" stroke-width="15" stroke-linecap="round"/>
 <path d="M 113 54 C 116 91 143 139 121 182 C 109 209 85 222 64 239" fill="none" stroke="url(#sol-tonearm-metal)" stroke-width="12" stroke-linecap="round"/>
 <path d="M 109 55 C 111 94 134 139 116 178 C 103 205 82 218 61 236" fill="none" stroke="#e8fcff" stroke-width="2" stroke-linecap="round" opacity=".67"/>
 <rect x="100" y="64" width="28" height="10" rx="5" fill="#122b37" stroke="#9ce2d9" stroke-width="1"/>
 <path d="M 105 69 H 123" stroke="#94f1df" stroke-width="2" stroke-linecap="round"/>
 <g class="sol-tonearm-cartridge">
  <path d="M 49 229 L 83 232 L 83 250 L 42 247 Z" fill="url(#sol-tonearm-black)" stroke="#a9ccd5" stroke-width="2"/>
  <rect x="49" y="235" width="7" height="3" rx="1.5" fill="#def1f3"/>
  <rect x="62" y="236" width="7" height="3" rx="1.5" fill="#def1f3"/>
  <path d="M 44 247 H 79 L 73 261 H 46 Z" fill="#102630" stroke="#809eae" stroke-width="1.8"/>
  <path d="M 52 254 H 65" stroke="#9ef8df" stroke-width="2.2"/>
  <path class="sol-stylus-tip" d="M 53 259 L 51 280 L 48 284" fill="none" stroke="#d7f8fa" stroke-width="2.4" stroke-linecap="round"/>
  <circle class="sol-stylus-glow" cx="48" cy="283" r="3.4" fill="#80ffe4"/>
 </g>
</g>
</svg></button></div><div id="sol-vinyl-hint" aria-live="off">↶ Drag record to rewind or fast-forward ↷</div><div class="sol-deck-transport"><button id="sol-rewind-10" type="button" aria-label="Rewind 10 seconds">↶ 10s</button><button id="sol-forward-10" type="button" aria-label="Forward 10 seconds">10s ↷</button></div><div id="sol-ambient-bars" aria-label="Ambient playback animation"></div></div>
      <div class="sol-immersive-details"><div class="sol-pill">NOW PLAYING</div><h1 id="sol-immersive-title">Nothing playing</h1><p id="sol-immersive-artist">Start a song</p><div id="sol-immersive-lines" class="sol-lyrics-scroll"></div></div></div>
      <footer class="sol-immersive-controls"><button id="sol-immersive-back" aria-label="Previous track" type="button">⏮</button><button id="sol-immersive-play" aria-label="Play or pause" type="button">▶</button><button id="sol-immersive-next" aria-label="Next track" type="button">⏭</button><span id="sol-immersive-position">0:00</span><input id="sol-immersive-seek" aria-label="Seek position" type="range" min="0" max="1000" value="0"><span id="sol-immersive-length">0:00</span></footer></section>`);
    document.body.append(el);
    $('#sol-immersive-exit').onclick=closeImmersive;
    $('#sol-immersive-fullscreen').onclick=toggleSystemFullscreen;
    document.addEventListener('fullscreenchange',syncFullscreenState);
    $('#sol-immersive-play').onclick=()=>player()?.togglePlay?.();
    $('#sol-immersive-back').onclick=()=>player()?.back?.();
    $('#sol-immersive-next').onclick=()=>player()?.next?.();
    $('#sol-immersive-seek').addEventListener('change',e=>{if(duration()>0)player()?.seek?.(Math.round(duration()*Number(e.target.value)/1000));});
    setupInteractiveVinyl();
    $('#sol-ambient-bars').innerHTML=Array.from({length:24},(_,i)=>`<i style="--i:${i};--h:${10+((i*13+7)%28)}"></i>`).join('');
  }
  function showFullscreenStatus(message) {
    const status=$('#sol-fullscreen-status'); if(!status)return;
    status.textContent=message;status.hidden=!message;
  }
  function syncFullscreenState(){
    const active=!!document.fullscreenElement;
    const button=$('#sol-immersive-fullscreen');
    if(button){button.textContent=active?'⛶ Exit fullscreen':'⛶ Fullscreen';button.setAttribute('aria-pressed',String(active));}
    if(active)showFullscreenStatus('');
  }
  async function toggleSystemFullscreen(){
    const el=$('#sol-immersive');if(!el)return;
    try {
      if(document.fullscreenElement){
        if(typeof document.exitFullscreen!=='function')throw new Error('Fullscreen exit unavailable');
        await document.exitFullscreen();
      } else {
        if(typeof el.requestFullscreen!=='function')throw new Error('Fullscreen API unavailable');
        await el.requestFullscreen({navigationUI:'hide'});
        if(document.fullscreenElement!==el)throw new Error('Spotify did not enter fullscreen');
      }
      syncFullscreenState();
    } catch(error){
      showFullscreenStatus('Spotify blocked system fullscreen. Immersive still fills the Spotify window; maximize Spotify to enlarge it.');
      syncFullscreenState();
      console.warn('[Solstice] Fullscreen request unavailable:',error);
    }
  }
  function openImmersive() {
    const el=$('#sol-immersive');if(!el)return;
    el.hidden=false;
    showFullscreenStatus('');syncFullscreenState();
    updateTrackDisplays();updateLyricUI();tickPlayback();
  }
  function closeImmersive() {
    if(vinylScrub)finishVinylScrub();
    const el=$('#sol-immersive');if(!el)return;
    if(document.fullscreenElement===el && document.exitFullscreen) Promise.resolve(document.exitFullscreen()).catch(()=>{});
    el.hidden=true;
  }
  function toggleImmersive(){if($('#sol-immersive')?.hidden)openImmersive();else closeImmersive();}

  function mountMini() {
    if ($('#sol-mini')) return;
    const el=make(`<aside id="sol-mini" class="sol-hidden" aria-label="Solstice floating mini player"><div id="sol-mini-handle" title="Drag mini player"><span>✦ SOLSTICE</span><button id="sol-mini-close" type="button" aria-label="Hide mini player">✕</button></div><div class="sol-mini-content"><img id="sol-mini-art" alt="Album art"><div><b id="sol-mini-title">Nothing playing</b><small id="sol-mini-artist">Spotify</small></div></div><div class="sol-mini-controls"><button id="sol-mini-back" aria-label="Previous">⏮</button><button id="sol-mini-play" aria-label="Play or pause">▶</button><button id="sol-mini-next" aria-label="Next">⏭</button><button id="sol-mini-immersive" aria-label="Immersive Mode">⛶</button></div><div class="sol-mini-progress"><input id="sol-mini-seek" type="range" aria-label="Seek position" min="0" max="1000" value="0"></div></aside>`);
    document.body.append(el);
    $('#sol-mini-close').onclick=()=>setPref('miniPlayer',false);
    $('#sol-mini-back').onclick=()=>player()?.back?.();
    $('#sol-mini-play').onclick=()=>player()?.togglePlay?.();
    $('#sol-mini-next').onclick=()=>player()?.next?.();
    $('#sol-mini-immersive').onclick=openImmersive;
    $('#sol-mini-seek').onchange=e=>{if(duration()>0)player()?.seek?.(Math.round(duration()*Number(e.target.value)/1000));};
    const handle=$('#sol-mini-handle');
    handle.addEventListener('pointerdown', e=>{
      if(e.button!==0 || e.target.closest('button'))return;
      const rect=el.getBoundingClientRect();
      dragState={id:e.pointerId,x:e.clientX,y:e.clientY,left:rect.left,top:rect.top};
      try{handle.setPointerCapture(e.pointerId);}catch{}
      e.preventDefault();
    });
    handle.addEventListener('pointermove',e=>{
      if(!dragState || e.pointerId!==dragState.id)return;
      el.style.right='auto';el.style.bottom='auto';
      el.style.left=clamp(dragState.left+(e.clientX-dragState.x),0,Math.max(0,innerWidth-el.offsetWidth),0)+'px';
      el.style.top=clamp(dragState.top+(e.clientY-dragState.y),0,Math.max(0,innerHeight-el.offsetHeight),0)+'px';
    });
    const end=()=>{dragState=null;};
    handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);
    window.addEventListener('resize',()=>{
      if(el.style.left)el.style.left=clamp(parseFloat(el.style.left),0,Math.max(0,innerWidth-el.offsetWidth),0)+'px';
      if(el.style.top)el.style.top=clamp(parseFloat(el.style.top),0,Math.max(0,innerHeight-el.offsetHeight),0)+'px';
    });
  }
  function updateTrackDisplays() {
    const t = track();
    const setText=(id,value)=>{const el=$('#'+id);if(el && el.textContent !== value)el.textContent=value;};
    setText('sol-immersive-title',t.title);
    setText('sol-immersive-artist',t.artist);
    setText('sol-mini-title',t.title);
    setText('sol-mini-artist',t.artist);
    for(const id of ['sol-mini-art','sol-immersive-art']){
      const img=$('#'+id);if(img && img.dataset.cover !== t.cover){img.dataset.cover=t.cover;img.src=t.cover || '';img.style.visibility=t.cover?'visible':'hidden';}
    }
    const bg=$('.sol-immersive-bg');if(bg && bg.dataset.cover !== t.cover){bg.dataset.cover=t.cover;bg.style.backgroundImage=t.cover?'url('+JSON.stringify(t.cover)+')':'none';}
    const demo=$('#sol-effects-demo-art');if(demo && demo.dataset.cover !== t.cover){demo.dataset.cover=t.cover;demo.style.backgroundImage=t.cover?'url('+JSON.stringify(t.cover)+')':'';}
  }
  function tickPlayback() {
    // Spotify's background windows do not need a progress/lyrics DOM redraw.
    if (document.hidden) return;
    const paused=!isPlaying();
    root.classList.toggle('sol-paused',paused);
    const posMs=vinylScrub?.targetMs ?? progress(),seekMax=duration(),ratio=seekMax?clamp(posMs/seekMax,0,1,0):0;
    const needle=$('#sol-tonearm');
    if(needle){needle.classList.toggle('sol-needle-down',!paused);needle.setAttribute('aria-pressed',String(!paused));needle.setAttribute('aria-label',paused?'Drop the needle to play':'Lift the needle to pause');}
    const vinyl=$('#sol-vinyl');
    if(vinyl&&!vinylScrub){vinyl.setAttribute('aria-valuenow',String(Math.round(ratio*1000)));vinyl.setAttribute('aria-valuetext',fmt(posMs));}
    for(const selector of ['#sol-mini-seek','#sol-immersive-seek']){
      const el=$(selector);
      const next=String(Math.round(ratio*1000));
      if(el && document.activeElement!==el && el.value!==next)el.value=next;
    }
    const playIcon=paused?'▶':'❚❚';
    const playTitle=paused?'Play':'Pause';
    for(const selector of ['#sol-mini-play','#sol-immersive-play']){const el=$(selector);if(el){if(el.textContent!==playIcon)el.textContent=playIcon;if(el.title!==playTitle)el.title=playTitle;if(el.getAttribute('aria-label')!==playTitle)el.setAttribute('aria-label',playTitle);}}
    const pos=$('#sol-immersive-position');if(pos){const next=fmt(posMs);if(pos.textContent!==next)pos.textContent=next;}
    const len=$('#sol-immersive-length');if(len){const next=fmt(seekMax);if(len.textContent!==next)len.textContent=next;}
    // Live SVG tonearm/record scrubbing remains responsive without doing
    // expensive lyric layout recalculations on a dragging record.
    if(!vinylScrub)updateLyricUI(posMs);
  }
  function onTrackChanged() {
    const t=track(), signature=trackSignature(t);
    if(signature===currentId) { if(t.cover!==lastCover){redrawArtwork();updatePalette(t);}updateTrackDisplays();return;}
    if(currentId && t.uri && prefs.showPopups)notify(t.title+' — '+t.artist);
    currentId=signature;
    fetchAbort?.abort();
    lastLyricStatus='Looking for lyrics…';
    redrawArtwork();updateTrackDisplays();updatePalette(t);queueLyrics();
    if(studioTab==='lyrics' && !$('#sol-overlay')?.hidden)renderStudio('lyrics');
  }

  // Explicit badge repair copied from the exact inline DevTools fix that
  // restored the E in the user's Spotify. Prior CSS-only releases did not.
  // Keep it lightweight: observe added row nodes, never attributes or text.
  function repairExplicitBadge(badge) {
    if (!badge || !badge.matches?.('.x-explicit-label')) return;
    const set = (el, property, value) => {
      if (el.style.getPropertyValue(property) !== value ||
          el.style.getPropertyPriority(property) !== 'important')
        el.style.setProperty(property, value, 'important');
    };
    set(badge, '--background-base', '#17242c');
    const icon = badge.querySelector('.x-explicit-icon');
    if (!icon) return;
    set(icon, 'color', '#17242c');
    set(icon, '-webkit-text-fill-color', '#17242c');
    set(icon, 'font-size', '11px');
    set(icon, 'opacity', '1');
    set(icon, 'visibility', 'visible');
  }
  function repairExplicitBadges(node = document) {
    if (node.nodeType === 1) {
      if (node.matches('.x-explicit-label')) repairExplicitBadge(node);
      if (node.matches('.x-explicit-icon'))
        repairExplicitBadge(node.closest('.x-explicit-label'));
    }
    node.querySelectorAll?.('.x-explicit-label').forEach(repairExplicitBadge);
  }
  function watchExplicitBadges() {
    const host = $('.Root') || document.body;
    if (!host) return;
    repairExplicitBadges(host);
    const observer = new MutationObserver(records => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType !== 1) continue;
          repairExplicitBadges(node);
        }
      }
    });
    // New songs/virtualized rows are patched on insertion; no polling or
    // attribute watching needed. This does not touch Spicetify settings.
    observer.observe(host, {childList:true, subtree:true});
  }

  function initialize() {
    if(initialized || !document.body) return;
    if(!$('.Root') && !$('#main')) return;
    initialized=true;
    ensureTurntableCSS();
    mountArtwork();mountUI();style();onTrackChanged();mountSidebar();watchExplicitBadges();
    if(!eventBound && player()?.addEventListener){
      const p=player();
      p.addEventListener('songchange',onTrackChanged);
      p.addEventListener('onplaypause',tickPlayback);
      eventBound=true;
    }
    // Event-driven track updates, with a light fallback for Spotify route changes.
    // 800ms lyric/progress ticks and 4s sidebar checks reduce unnecessary CPU/DOM work.
    timer=setInterval(tickPlayback,800);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { onTrackChanged(); tickPlayback(); mountSidebar(); repairExplicitBadges(); } });
    setInterval(()=>{ if (document.hidden) return; mountArtwork(); mountSidebar(); onTrackChanged(); repairExplicitBadges(); if (!$('#sol-overlay')?.hidden) renderDiagnostics(); },4000);
  }
  const bootstrap=setInterval(()=>{initialize();if(initialized)clearInterval(bootstrap);},250);
  setTimeout(()=>clearInterval(bootstrap),30000);
})();