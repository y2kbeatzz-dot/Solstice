// Run: node --test tests/search-layering.cjs (requires playwright + Chromium).
// Synthetic layout regression; this is not a replacement for Spotify QA.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const css = fs.readFileSync(process.env.SOLSTICE_CSS || path.join(__dirname, '..', 'user.css'), 'utf8');

test('suggestions retain viewport anchoring and cover route content', async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage();
    for (const width of [640, 1039, 1920]) {
      await page.setViewportSize({ width, height: 774 });
      await page.setContent(`<!doctype html><style>
        body{margin:0}.Root{display:grid;grid-template-rows:64px 1fr;height:100vh}
        .Root__globalNav{z-index:2;padding:12px 24px}
        .main-globalNav-searchSection{margin-left:60px}
        .Root__main-view{position:relative;z-index:0}
        #route-card{position:absolute;z-index:10;top:20px;left:100px;width:220px;height:260px;background:orange}
        #suggestions{position:fixed;left:84px;top:64px;width:300px;height:320px;background:#18212b;z-index:10}
        #suggestions button{display:block;width:100%;height:64px}
        #portal{position:fixed;right:0;top:0;width:20px;height:20px;z-index:50}
      </style><style>${css}</style>
      <div class="Root">
        <div id="sol-art-stage"></div>
        <nav class="Root__globalNav"><div class="main-globalNav-searchSection">
          <div role="search"><input aria-label="Search"><div id="suggestions">
            <button>First result</button><button>Second result</button>
          </div></div>
        </div></nav>
        <main class="Root__main-view"><div id="route-card">Playlist content</div></main>
        <div id="portal">Portal</div>
      </div>`);
      const state = await page.evaluate(() => {
        const dropdown = document.querySelector('#suggestions');
        const rect = dropdown.getBoundingClientRect();
        return {
          top: rect.top, left: rect.left,
          dropdownOnTop: dropdown.contains(document.elementFromPoint(150, 110)),
          portalPosition: getComputedStyle(document.querySelector('#portal')).position,
          artworkLayer: getComputedStyle(document.querySelector('#sol-art-stage')).zIndex,
          navLayer: getComputedStyle(document.querySelector('.Root__globalNav')).zIndex,
          filters: [...document.querySelectorAll('.Root__globalNav,.main-globalNav-searchSection,[role="search"]')].map(el => getComputedStyle(el).backdropFilter)
        };
      });
      assert.equal(state.top, 64, `dropdown top at width ${width}`);
      assert.equal(state.left, 84, `dropdown left at width ${width}`);
      assert.equal(state.dropdownOnTop, true, `suggestions cover content at width ${width}`);
      assert.equal(state.portalPosition, 'fixed');
      assert.equal(state.artworkLayer, '-1');
      assert.equal(state.navLayer, '5');
      assert.deepEqual(state.filters, ['none', 'none', 'none']);
      await page.getByRole('button', { name: 'First result' }).click();
    }
  } finally { await browser.close(); }
});
