// "The chorus follows the sunrise": every detection as a point of light, played forward by scrolling.
// Finished days are drawn once into a cached layer; each frame only adds the current day.
import { d3, S, DAYS, ND, rows, WEATHER, dayIndex, dateOf, fmtLong, fmtShort, short, clamp01, jit, rng, HUE, hueOf, mutedOf } from '../lib/data.js';
import { $, RM, COARSE, nf, secProgress, showTip, hideTip } from '../lib/ui.js';
import { IMG, cover, panel, panels, renderPanel, state } from '../print/pages.js';
import { CHORUS_NOTES } from '../story.js';

export const chorusSec = $('chorus-sec'), chorusStage = $('chorusStage');
const sprites = {};
function sprite(col) {
  if (sprites[col]) return sprites[col];
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  const g = x.createRadialGradient(32, 32, 0, 32, 32, 32), cc = d3.color(col);
  g.addColorStop(0, 'rgba(255,248,236,.95)'); cc.opacity = .95; g.addColorStop(.14, cc + ''); cc.opacity = .2; g.addColorStop(.3, cc + ''); cc.opacity = 0; g.addColorStop(1, cc + '');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64); return (sprites[col] = c);
}
const NOTES = CHORUS_NOTES.map(n => ({ ...n, d: Math.max(0, dayIndex(n.date)) }));
const notesEl = $('notes');
NOTES.forEach(n => { const d = document.createElement('div'); d.className = 'note'; d.innerHTML = `<div class="when">${n.h}</div><p>${n.t}</p>`; notesEl.append(d); });
const noteEls = [...notesEl.children];
let chorusCur = 0, chorusGeo = null;
function chorusLayout(W, H) {
  const narrow = W < 760;
  const headB = chorusStage.querySelector('.head').getBoundingClientRect().bottom - chorusStage.getBoundingClientRect().top;
  const L = narrow ? 50 : Math.max(96, W * .1), R = narrow ? 30 : L, T = Math.max(H * .28, headB + 40), B = H * (narrow ? .34 : .21);
  const ys = d3.scaleLinear([180, 300, 600, 1320], [T, T + (H - T - B) * .1, T + (H - T - B) * .66, H - B]);
  return { L, R, T, B, ys, pw: W - L - R, narrow };
}
let chorusCache = null;
const rowT = rows.map(r => r.t);
const countUpTo = cur => { let lo = 0, hi = rowT.length; while (lo < hi) { const m = (lo + hi) >> 1; if (rowT[m] <= cur) lo = m + 1; else hi = m; } return lo; };
function chorusLayers(W, H, dpr, G) {
  const key = [W, H, dpr, G.L, G.T].join('|');
  if (chorusCache && chorusCache.key === key) return chorusCache;
  const mk = () => { const c = document.createElement('canvas'); c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); const x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0); return [c, x]; };
  const [bg, b] = mk();
  b.fillStyle = '#05060C'; b.fillRect(0, 0, W, H);
  const s = Math.max(W / IMG.chorus.width, H / IMG.chorus.height), dh = IMG.chorus.height * s;
  cover(b, IMG.chorus, 0, 0, W, H, { free: true, fy: 0, dy: H * .93 - .62 * dh });
  b.fillStyle = 'rgba(4,5,10,.42)'; b.fillRect(0, 0, W, H);
  const nb = b.createRadialGradient(W * .18, H, 0, W * .18, H, W * .45); nb.addColorStop(0, 'rgba(4,5,10,.7)'); nb.addColorStop(1, 'rgba(4,5,10,0)'); b.fillStyle = nb; b.fillRect(0, 0, W, H);
  const nr = b.createRadialGradient(W * .85, H, 0, W * .85, H, W * .35); nr.addColorStop(0, 'rgba(4,5,10,.6)'); nr.addColorStop(1, 'rgba(4,5,10,0)'); b.fillStyle = nr; b.fillRect(0, 0, W, H);
  const [pts, p] = mk();
  const { L, ys, pw, narrow } = G, x = d => L + (d / ND) * pw, size = narrow ? 6 : 10;
  p.globalCompositeOperation = 'lighter'; p.globalAlpha = .56;
  for (const r of rows) {
    if (r.m < 180 || r.m > 1320) continue;
    const px = x(r.d) + (.08 + jit(r.k) * .84) * (pw / ND), py = ys(r.m), sz = size * (.6 + r.c / 230);
    p.drawImage(sprite(hueOf(r.s)), px - sz / 2, py - sz / 2, sz, sz);
  }
  return (chorusCache = { key, bg, pts, dpr });
}
panel('chorus', { dynamic: true, draw(ctx, W, H, dpr) {
  const G = chorusGeo = chorusLayout(W, H), { L, ys, pw, narrow } = G;
  const C = chorusLayers(W, H, panels.chorus.fullDpr || dpr, G);
  ctx.drawImage(C.bg, 0, 0, W, H);
  const cur = chorusCur, x = d => L + (d / ND) * pw;
  const upto = Math.min(ND - 1, Math.floor(cur)), xe = x(Math.min(cur, ND));
  // dawn band
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const SH = 20000;
  ctx.save(); ctx.translate(-SH, 0); ctx.beginPath();
  for (let i = 0; i <= upto; i++) ctx.lineTo(x(i + .5), ys(DAYS[i].dawn) + 4);
  ctx.lineTo(xe, ys(DAYS[upto].dawn) + 4); ctx.lineTo(xe, ys(DAYS[upto].rise) + 16);
  for (let i = upto; i >= 0; i--) ctx.lineTo(x(i + .5), ys(DAYS[i].rise) + 16);
  ctx.closePath(); ctx.shadowColor = 'rgba(210,105,50,.32)'; ctx.shadowBlur = 16 * dpr; ctx.shadowOffsetX = SH * dpr; ctx.fillStyle = '#000'; ctx.fill(); ctx.restore();
  ctx.beginPath(); for (let i = 0; i <= upto; i++) ctx.lineTo(x(i + .5), ys(DAYS[i].rise));
  ctx.strokeStyle = 'rgba(255,176,110,.95)'; ctx.lineWidth = 1.6; ctx.shadowColor = 'rgba(255,140,70,.95)'; ctx.shadowBlur = 12 * dpr; ctx.stroke(); ctx.shadowBlur = 0;
  // every finished day comes from the cached layer; only today's calls are drawn live
  const xc = x(upto);
  if (xc > 1) ctx.drawImage(C.pts, 0, 0, Math.round(xc * C.dpr), C.pts.height, 0, 0, xc, H);
  const size = narrow ? 6 : 10, n = countUpTo(cur);
  for (let i = countUpTo(upto); i < n; i++) {
    const r = rows[i]; if (r.m < 180 || r.m > 1320) continue;
    const px = x(r.d) + (.08 + jit(r.k) * .84) * (pw / ND), py = ys(r.m), sz = size * 1.7;
    ctx.globalAlpha = .95; ctx.drawImage(sprite(hueOf(r.s)), px - sz / 2, py - sz / 2, sz, sz);
  }
  ctx.restore();
  G.n = n;
} });
export function updateChorus(force) {
  const p = RM ? 1 : secProgress(chorusSec);
  const cur = Math.min(ND, .3 + clamp01(p * 1.04) * (ND - .3));
  if (!force && Math.abs(cur - chorusCur) < .003) return;
  chorusCur = cur; renderPanel('chorus');
  $('day').textContent = fmtLong(Math.min(ND - 1, Math.floor(cur))); $('tally').textContent = nf.format(chorusGeo.n);
  let on = 0; NOTES.forEach((nt, i) => { if (cur >= nt.d) on = i; });
  noteEls.forEach((el, i) => el.classList.toggle('on', i === on));
  if (force) {
    const hrs = $('hours'); hrs.innerHTML = '';
    [[240, '4 am'], [360, '6 am'], [480, '8 am'], [720, 'noon'], [1080, '6 pm']].forEach(([m, l]) => { const s = document.createElement('span'); s.className = 'hour ink'; s.style.left = chorusGeo.L + 'px'; s.style.top = chorusGeo.ys(m) + 'px'; s.textContent = l; hrs.append(s); });
  }
}


export function resetChorus() { chorusCache = null; }
