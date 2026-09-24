#!/usr/bin/env node
// Exports sections of the site as images sized for Instagram.
//
//   npm run build            (once, or after any change)
//   npm run shots            (all shots listed below)
//   npm run shots -- chorus  (only shots whose name contains "chorus")
//   npm run shots -- --format square     (override the format for every shot)
//   npm run shots -- --url http://localhost:4321   (capture a running dev server instead of dist/)
//
// Images are saved to shots/. Needs Playwright: see the instructions that came with this script.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

// ---------------------------------------------------------------------------------------------
// What to capture. Edit this list.
//
//   name       file name (saved as shots/<name>.png)
//   section    id of a section to frame from its top edge, e.g. 'land-sec'
//   selector   or: any CSS selector, framed by `align`
//   align      'top' (default), 'center' or 'bottom': where the element sits in the frame
//   offset     extra pixels to scroll down (+) or up (-) after aligning
//   progress   for the scroll-animated sections (chorus-sec, wake-sec): 0 = start, 1 = finished.
//              These are centred in the frame unless you set `align`.
//   date       for chorus-sec only: play the season up to this day, e.g. '14 August'
//   format     'portrait' (1080×1350, 4:5), 'grid' (1080×1440, 3:4), 'square' (1080×1080), 'story' (1080×1920)
//   hide       CSS selectors to hide for this shot, e.g. ['.photo-credit']
//   fill       true: size the page so this section exactly fills the frame (for sections whose
//              height follows the screen: the cover, the pull quotes and the closing page)
//   height     fixed height in px for this section. Sections that normally fill the screen (the cover,
//              chorus-sec, wake-sec, the closing page) are all SECTION_HEIGHT tall in shots, unless this
//              one has `fill` set, so neighbouring sections show above or below them. Scroll-animated
//              sections appear finished (progress 1) unless this shot sets their `progress` or `date`.
// ---------------------------------------------------------------------------------------------
const SHOTS = [
  { name: '01-cover', section: 'top', align: 'top' },
  { name: '02-chorus-full-season', section: 'chorus-sec', progress: 1, align: 'center' },
  { name: '03-who-sings-first', section: 'wake-sec', progress: 1, align: 'center' },
  { name: '04-three-songs', section: 'listen-sec', align: 'center' },
  { name: '05-pull-quote-sunrise', section: 'pq1', align: 'center'},
  { name: '06-shape-of-a-day', section: 'land-sec', align: 'center' },
  { name: '07-comings-and-goings', section: 'threads-sec', align: 'center' },
  { name: '08-pull-quote-wind', section: 'pq2', align: 'center'},
  { name: '09-quiet-in-the-wind', section: 'wind-sec', align: 'center' },
  { name: '10-after-dark', section: 'owls-sec', align: 'center' },
  { name: '11-how-it-listens', selector: '#method', align: 'center' },
  { name: '12-closing', section: 'finale', align: 'top' },
];

const FORMATS = { portrait: [1080, 1350], grid: [1080, 1440], square: [1080, 1080], story: [1080, 1920] };
const DEFAULT_FORMAT = 'portrait';
// Halftone dots are enlarged by this much, so they survive Instagram's compression as texture
// rather than turning into moiré. 1 = same as the website.
const DOT_SCALE = 1.25;
// How long to let the print effect finish after the page loads and after each scroll (ms).
// Increase these if shots come out soft or half-drawn.
const WAIT_LOAD = 4000, WAIT_SCROLL = 1500;
// Height (px) given to screen-sized sections in shots, instead of the full screen. Capped at the frame height.
const SECTION_HEIGHT = 1350;
// Sections whose height follows the screen, and which of those are scroll-animated.
const SCREEN_SIZED = ['top', 'chorus-sec', 'wake-sec', 'finale'];
const ANIMATED = ['chorus-sec', 'wake-sec'];

// ---------------------------------------------------------------------------------------------
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : undefined; };
const filters = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const formatOverride = opt('format');
const OUT = path.resolve('shots');

// A tiny static file server for dist/, so the page loads exactly as it will on Netlify.
function serveDist() {
  const root = path.resolve('dist');
  if (!fs.existsSync(path.join(root, 'index.html'))) { console.error('No dist/ build found. Run "npm run build" first.'); process.exit(1); }
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(root, p);
    if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, () => resolve({ server, url: `http://localhost:${server.address().port}/` })));
}

const settle = (page, ms) => page.evaluate(ms => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, ms)))), ms);

async function scrollForShot(page, shot, H) {
  // Scroll-animated sections: set their progress (0–1) or, for the chorus, a date, then frame them like any other section.
  if (shot.section && (shot.progress !== undefined || shot.date)) {
    const setProgress = p => page.evaluate(([id, p]) => {
      if (!document.getElementById(id)) throw new Error('No section #' + id);
      window.__progress = { ...window.__progress, [id]: p };
    }, [shot.section, p]);
    if (shot.date) {
      // Work out which day of the season that is from the cover's date line ("17 JULY TO 22 SEPTEMBER 2026"),
      // then scroll to the end of that day. Mirrors the progress-to-day formula in src/scripts/sections/chorus.js.
      const kicker = (await page.textContent('.kicker')) || '';
      const m = kicker.match(/^\s*(\d+ \w+)\s+TO\s+(\d+ \w+)(?:\s+(\d{4}))?/i);
      if (!m) throw new Error('Could not read the season dates from the cover, so "date" shots are not possible. Use "progress" instead.');
      const year = m[3] || '2000';
      const first = Date.parse(`${m[1]} ${year}`), last = Date.parse(`${m[2]} ${year}`), target = Date.parse(`${shot.date} ${year}`);
      if ([first, last, target].some(Number.isNaN)) throw new Error(`Can't read date "${shot.date}". Use e.g. "14 August".`);
      const ND = Math.round((last - first) / 864e5) + 1, d = Math.round((target - first) / 864e5);
      if (d < 0 || d >= ND) throw new Error(`"${shot.date}" is outside the season.`);
      const p = Math.max(0, Math.min(1, (d + .95 - .3) / ((ND - .3) * 1.04)));
      await setProgress(p);
    } else {
      await setProgress(Math.max(0, Math.min(1, shot.progress)));
    }
    shot = { align: 'center', ...shot };
  }
  // Everything else: align a section's top edge, or any element, in the frame.
  const sel = shot.selector || `#${shot.section}`;
  const y = await page.evaluate(([sel, align, H]) => {
    const el = document.querySelector(sel); if (!el) throw new Error('Nothing matches ' + sel);
    const r = el.getBoundingClientRect(), top = r.top + scrollY;
    return align === 'center' ? top + r.height / 2 - H / 2 : align === 'bottom' ? top + r.height - H : top;
  }, [sel, shot.align || 'top', H]);
  // Sections (other than the cover) start a few pixels lower, so the cut-paper edge above isn't in the frame.
  const nudge = shot.section && shot.section !== 'top' && !shot.align ? 6 : 0;
  await page.evaluate(y => window.scrollTo(0, Math.max(0, y)), y + nudge + (shot.offset || 0));
}

async function main() {
  const list = SHOTS.filter(s => !filters.length || filters.some(f => s.name.includes(f)));
  if (!list.length) { console.error('No shots match', filters.join(', ')); process.exit(1); }
  fs.mkdirSync(OUT, { recursive: true });

  const srv = opt('url') ? { url: opt('url') } : await serveDist();
  const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl'] });
  try {
    for (const shot of list) {
      const fmt = formatOverride || shot.format || DEFAULT_FORMAT;
      if (!FORMATS[fmt]) throw new Error(`Unknown format "${fmt}". Use: ${Object.keys(FORMATS).join(', ')}`);
      const [W, H] = FORMATS[fmt];
      let VH = H;
      if (shot.fill && shot.section) { // sections sized by screen height: find the window height that makes them exactly H tall
        const probe = await browser.newPage({ viewport: { width: W, height: H } });
        await probe.goto(srv.url, { waitUntil: 'domcontentloaded' });
        const h = await probe.evaluate(id => document.getElementById(id).offsetHeight, shot.section);
        await probe.close();
        VH = Math.round(H * H / h);
      }
      const ctx = await browser.newContext({ viewport: { width: W, height: VH }, deviceScaleFactor: 1 });
      // Enlarge the halftone dots by scaling the print shader's dot-pitch value as it's set.
      await ctx.addInitScript(scale => {
        const patch = proto => {
          const getLoc = proto.getUniformLocation, set1f = proto.uniform1f;
          proto.getUniformLocation = function (prog, name) { const loc = getLoc.call(this, prog, name); if (loc && name === 'uPitch') loc.__pitch = true; return loc; };
          proto.uniform1f = function (loc, v) { return set1f.call(this, loc, loc && loc.__pitch ? v * scale : v); };
        };
        patch(WebGLRenderingContext.prototype);
        if (window.WebGL2RenderingContext) patch(WebGL2RenderingContext.prototype);
      }, DOT_SCALE);
      // Screen-sized sections get a fixed height instead, and scroll-animated ones are shown finished rather than
      // scrolled through (the shot's own section is set to its `progress`/`date` in scrollForShot).
      const heights = {};
      for (const id of SCREEN_SIZED) if (!(shot.fill && id === shot.section)) heights[id] = Math.min(SECTION_HEIGHT, H);
      if (shot.section && shot.height) heights[shot.section] = shot.height;
      await ctx.addInitScript(([heights, animated]) => {
        window.__progress = Object.fromEntries(animated.map(id => [id, 1]));
        document.addEventListener('DOMContentLoaded', () => {
          const st = document.createElement('style');
          st.textContent = Object.entries(heights).map(([id, h]) =>
            `#${id} { height: ${h}px !important; min-height: 0 !important; } #${id} .stage { position: relative; height: 100%; }`).join('\n');
          document.head.append(st);
        });
      }, [heights, ANIMATED]);
      const page = await ctx.newPage();
      page.on('pageerror', e => console.warn('  page error:', e.message));
      await page.goto(srv.url, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts && document.fonts.ready);
      await page.waitForTimeout(WAIT_LOAD);

      await scrollForShot(page, shot, VH);
      await settle(page, WAIT_SCROLL);
      // Show every bead and note on "Comings and goings" (normally they appear as you scroll past).
      await page.evaluate(() => document.querySelectorAll('#loom circle, #loom g').forEach(el => el.setAttribute('opacity', 1)));
      if (shot.hide?.length) await page.addStyleTag({ content: `${shot.hide.join(',')} { visibility: hidden !important; }` });
      await settle(page, 700);

      const file = path.join(OUT, `${shot.name}.png`);
      if (VH !== H) { // clip to the section itself
        const top = await page.evaluate(id => Math.max(0, Math.round(document.getElementById(id).getBoundingClientRect().top)), shot.section);
        await page.screenshot({ path: file, clip: { x: 0, y: Math.min(top, VH - H), width: W, height: H } });
      } else await page.screenshot({ path: file });
      console.log(`✓ ${path.relative(process.cwd(), file)}  (${W}×${H}, ${fmt})`);
      await ctx.close();
    }
  } finally {
    await browser.close();
    srv.server?.close();
  }
}
main().catch(e => { console.error(e.message || e); process.exit(1); });
