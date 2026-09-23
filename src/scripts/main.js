// Entry point: loads the photographs, builds every section, and runs the scroll loop.
import { clamp01 } from './lib/data.js';
import { $, RM, COARSE } from './lib/ui.js';
import { loadImages, panels, renderPanel, state } from './print/pages.js';
import { hero } from './sections/hero.js';
import { chorusSec, updateChorus, resetChorus } from './sections/chorus.js';
import { wakeSec, buildWake, updateWake } from './sections/wake.js';
import './sections/songs.js';
import './sections/quotes.js';
import { buildLand } from './sections/land.js';
import { buildLoom, updateLoom } from './sections/threads.js';
import { buildWind } from './sections/wind.js';
import { buildNights } from './sections/owls.js';
import './sections/strangers.js';
import './sections/method.js';
import './sections/finale.js';

// Pages that don't change as you scroll. They're drawn lazily: nearest first, in the background.
const STATIC = ['hero', 'listen', 'pq1', 'land', 'threads', 'pq2', 'wind', 'owls', 'index', 'method', 'finale'];

function renderNearby() {
  for (const id of STATIC) {
    const P = panels[id]; if (!P.dirty) continue;
    const r = P.canvas.getBoundingClientRect();
    if (r.bottom > -innerHeight * 1.2 && r.top < innerHeight * 2.2) { renderPanel(id); return true; }
  }
  return false;
}

// Render any remaining pages in the background, nearest first, pausing while a phone is scrolling.
let drainT = 0;
function drainDirty() {
  clearTimeout(drainT);
  if (state.fastMode && COARSE) { drainT = setTimeout(drainDirty, 250); return; }
  let best = null, bd = Infinity;
  for (const id of STATIC) {
    const P = panels[id]; if (!P.dirty) continue;
    const r = P.canvas.getBoundingClientRect();
    const d = r.bottom < 0 ? -r.bottom : r.top > innerHeight ? r.top - innerHeight : 0;
    if (d < bd) { bd = d; best = id; }
  }
  if (!best) return;
  renderPanel(best); drainT = setTimeout(drainDirty, 30);
}

// While scrolling, animated pages render at reduced resolution; a moment after you stop they re-sharpen.
let ticking = false, idleT = 0;
function onScroll() {
  ticking = false;
  state.fastMode = true; clearTimeout(idleT);
  idleT = setTimeout(() => {
    state.fastMode = false;
    const cr = chorusSec.getBoundingClientRect(), wr = wakeSec.getBoundingClientRect();
    if (cr.top < innerHeight && cr.bottom > 0) updateChorus(true);
    if (wr.top < innerHeight && wr.bottom > 0) updateWake(true);
    if (renderNearby()) onScroll();
  }, 220);
  const hr = $('top').getBoundingClientRect();
  if (!COARSE && hr.bottom > 0 && !RM) { const p = clamp01(-hr.top / hr.height); if (Math.abs(p - hero.p) > .004) { hero.p = p; renderPanel('hero'); } }
  const cr = chorusSec.getBoundingClientRect(); if (cr.top < innerHeight && cr.bottom > 0) updateChorus(false);
  const wr = wakeSec.getBoundingClientRect(); if (wr.top < innerHeight && wr.bottom > 0) updateWake(false);
  updateLoom();
  if (!state.fastMode || !COARSE) renderNearby();
}

function buildAll() {
  buildWake(); buildLand(); buildLoom(); buildNights(); buildWind();
  resetChorus();
  STATIC.forEach(id => { panels[id].dirty = true; });
  renderPanel('hero'); updateChorus(true); updateWake(true);
  let guard = 0; while (renderNearby() && guard++ < 3) {}
  state.fastMode = false;
  onScroll(); clearTimeout(idleT); state.fastMode = false;
  drainT = setTimeout(drainDirty, 60);
}

loadImages().then(buildAll);
addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

// Phones resize the viewport height as the address bar hides; only a real width change needs a rebuild.
let lastW = innerWidth, lastH = innerHeight, rt;
addEventListener('resize', () => {
  clearTimeout(rt);
  rt = setTimeout(() => {
    if (innerWidth !== lastW || (!COARSE && Math.abs(innerHeight - lastH) > 120)) { lastW = innerWidth; lastH = innerHeight; buildAll(); }
  }, 200);
});
if (document.fonts && document.fonts.status !== 'loaded') document.fonts.ready.then(buildAll);
