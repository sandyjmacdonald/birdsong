// "Pages": each section's background is drawn to an offscreen canvas, given a cut-paper top edge
// and a shadow, then run through the print simulation onto the section's visible <canvas class="art">.
import { rng } from '../lib/data.js';
import { $, COARSE } from '../lib/ui.js';
import { Print } from './halftone.js';

// ---- photographs (files in /public/img and /public/spectrograms) ----
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const PHOTO_FILES = {
  hero: 'img/hero.jpg', chorus: 'img/chorus.jpg', wake: 'img/wake.jpg', pq1: 'img/pq1.jpg', land: 'img/land.jpg',
  threads: 'img/threads.jpg', wind: 'img/wind.jpg', owls: 'img/owls.jpg', feathers: 'img/feathers.jpg', circuit: 'img/circuit.jpg', finale: 'img/finale.jpg',
  spec_blue: 'spectrograms/blue.png', spec_great: 'spectrograms/great.png', spec_coal: 'spectrograms/coal.png',
};
export const IMG = {};
export function loadImages() {
  return Promise.all(Object.entries(PHOTO_FILES).map(([k, f]) => new Promise(res => {
    const im = new Image(); im.decoding = 'async';
    im.onload = () => { IMG[k] = im; res(); }; im.onerror = res; im.src = `${BASE}/${f}`;
  })));
}

// Draw an image to fill a box, like CSS object-fit: cover. fx/fy choose which part stays in view.
export function cover(ctx, img, x, y, w, h, o = {}) {
  if (!img) return;
  const zoom = o.zoom || 1, s = Math.max(w / img.width, h / img.height) * zoom, dw = img.width * s, dh = img.height * s;
  let ox = x + (w - dw) * (o.fx ?? .5) + (o.dx || 0), oy = y + (h - dh) * (o.fy ?? .5) + (o.dy || 0);
  if (!o.free) { ox = Math.min(x, Math.max(x + w - dw, ox)); oy = Math.min(y, Math.max(y + h - dh, oy)); }
  ctx.drawImage(img, ox, oy, dw, dh);
  return { ox, oy, s };
}

// ---- cut-paper edges ----
export const OVER = 44; // how far each page overlaps the one above (matches --over in CSS)
function cutPts(W, seed) {
  const r = rng(seed), tilt = (r() - .5) * .007, pts = [];
  let x = -20;
  while (x < W + 40) {
    pts.push([x, OVER + (r() - .5) * 4 + tilt * (x - W / 2)]);
    if (r() < .18) { x += 2 + r() * 3; pts.push([x, OVER + (r() - .5) * 7 + tilt * (x - W / 2)]); }
    x += 70 + r() * 230;
  }
  pts.push([W + 60, OVER + (r() - .5) * 4 + tilt * (W / 2 + 60)]);
  return pts;
}
function piece(ctx, pts, W, H) { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); pts.forEach(p => ctx.lineTo(p[0], p[1])); ctx.lineTo(W + 60, H + 40); ctx.lineTo(-40, H + 40); ctx.closePath(); }

// ---- the page registry ----
// Each page: { canvas, draw(ctx, W, H, dpr), cut, mix (print strength), fold, shadowA/shadowB, dynamic }
export const panels = {};
export const state = { fastMode: false };
const SEEDS = { hero: 5, chorus: 18, wake: 31, land: 44, threads: 57, owls: 70, pq1: 83, pq2: 96, wind: 109, listen: 122, index: 135, method: 161, finale: 148 };
export function panel(id, o) {
  panels[id] = Object.assign({ canvas: $('cv-' + id), cut: id !== 'hero', seed: SEEDS[id] ?? 7, mix: .5, fold: false }, o);
}

const SRC = document.createElement('canvas');
export function renderPanel(id) {
  const P = panels[id], cv = P.canvas, W = cv.clientWidth, H = cv.clientHeight;
  if (!W || !H) return;
  P.dirty = false;
  // resolution: device pixels, capped by GPU texture size and a per-page pixel budget (lower on phones)
  let dpr = Math.min(2, devicePixelRatio || 1);
  dpr = Math.min(dpr, ((Print.maxTex || 8192) * .98) / Math.max(W, H));
  dpr = Math.min(dpr, Math.sqrt((COARSE ? 3.2e6 : 9e6) / (W * H)));
  if (state.fastMode && P.dynamic) dpr = Math.min(dpr, COARSE ? 1.2 : 1.5);
  P.fullDpr = Math.min(2, devicePixelRatio || 1);
  SRC.width = Math.round(W * dpr); SRC.height = Math.round(H * dpr);
  const ctx = SRC.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
  const oy = P.cut ? OVER : 0;
  if (P.cut) {
    if (!P.pts || P.ptsW !== W) { P.pts = cutPts(W, P.seed); P.ptsW = W; }
    ctx.save(); ctx.shadowColor = `rgba(0,0,0,${P.shadowA ?? .62})`; ctx.shadowBlur = (P.shadowB ?? 16) * dpr; ctx.shadowOffsetY = -3 * dpr; ctx.fillStyle = '#000'; piece(ctx, P.pts, W, H); ctx.fill(); ctx.restore();
    ctx.save(); piece(ctx, P.pts, W, H); ctx.clip();
  } else ctx.save();
  ctx.translate(0, oy);
  P.draw(ctx, W, H - oy, dpr);
  ctx.restore();
  if (P.cut) { // the thin white core of the paper along the scissor cut
    ctx.save(); ctx.beginPath(); P.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
    ctx.strokeStyle = 'rgba(248,244,236,.98)'; ctx.lineWidth = 1.9; ctx.lineJoin = 'round'; ctx.stroke();
    ctx.translate(0, 1.4); ctx.strokeStyle = 'rgba(255,255,255,.28)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
  }
  // halftone dot size is tied to the screen, not the render resolution, so dots don't change size mid-scroll
  Print.render(SRC, cv, { pitch: (devicePixelRatio || 1) >= 1.5 ? 1.35 : 1.8, dpr, mix: P.mix, fold: P.fold, grain: .035, seed: P.seed });
}
