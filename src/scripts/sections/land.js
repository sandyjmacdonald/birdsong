// "The daily landscape": each species' daily pattern as a misty mountain ridge in front of the photograph.
import { d3, S, DAYS, ND, rows, WEATHER, dayIndex, dateOf, fmtLong, fmtShort, short, clamp01, jit, rng, HUE, hueOf, mutedOf } from '../lib/data.js';
import { $, RM, COARSE, nf, secProgress, showTip, hideTip } from '../lib/ui.js';
import { IMG, cover, panel, panels, renderPanel, state } from '../print/pages.js';

const LAND_SP = S.map((s, i) => i).filter(i => HUE[S[i].name]);
function kde(vals, lo, hi, bw, step) { return d3.range(lo, hi + step, step).map(xv => { let s = 0; for (const v of vals) { const u = (xv - v) / bw; s += Math.exp(-.5 * u * u); } return [xv, s]; }); }
const LAND_D = LAND_SP.map(s => { const d = kde(rows.filter(r => r.s === s).map(r => r.m), 150, 1350, 26, 6); const mx = d3.max(d, p => p[1]); return d.map(p => [p[0], p[1] / mx]); });
let landGeo = null;
function landLayout() {
  const sec = $('land-sec'), m = $('mountains'), sr = sec.getBoundingClientRect(), mr = m.getBoundingClientRect();
  const W = mr.width, H = mr.height, n = LAND_SP.length, narrow = W < 700;
  const amp = H * (narrow ? .2 : .24), top0 = amp + 40, bottom = H - 70, step = (bottom - top0) / (n - .2);
  const X = mm => (mm - 150) / 1200 * W;
  const layers = LAND_SP.map((s, i) => {
    const base = top0 + i * step;
    return { s, i, base, pts: LAND_D[i].map(([mm, v]) => [X(mm), base - v * amp]) };
  });
  return { offY: mr.top - sr.top, W, H, layers, X };
}
panel('land', { shadowA: .22, shadowB: 10, fold: false, draw(ctx, W, H) {
  const G = landGeo, n = G.layers.length;
  ctx.fillStyle = '#D9E4EA'; ctx.fillRect(0, 0, W, H);
  cover(ctx, IMG.land, 0, 0, W, G.offY + G.H * .7, { fy: .15 });
  const far = d3.color('#B7CBD7'), near = d3.color('#1C3244');
  ctx.save(); ctx.translate(0, G.offY);
  G.layers.forEach((L, i) => {
    const t = Math.pow(i / (n - 1), .9), col = d3.interpolateLab(far, near)(t);
    ctx.beginPath(); ctx.moveTo(-10, G.H + 400); ctx.lineTo(-10, L.pts[0][1]);
    const r = rng(i * 31 + 7);
    L.pts.forEach(p => ctx.lineTo(p[0], p[1] + (r() - .5) * 1.4));
    ctx.lineTo(W + 10, L.pts[L.pts.length - 1][1]); ctx.lineTo(W + 10, G.H + 400); ctx.closePath();
    const g = ctx.createLinearGradient(0, L.base - G.H * .25, 0, L.base + 40);
    g.addColorStop(0, d3.color(col).brighter(.12) + ''); g.addColorStop(1, d3.color(col).darker(.1) + '');
    ctx.fillStyle = g; ctx.fill();
    const mg = ctx.createLinearGradient(0, L.base - 30, 0, L.base + 40);
    mg.addColorStop(0, 'rgba(226,234,238,0)'); mg.addColorStop(.6, `rgba(226,234,238,${(.3 - t * .18).toFixed(2)})`); mg.addColorStop(1, 'rgba(226,234,238,0)');
    ctx.fillStyle = mg; ctx.fillRect(-10, L.base - 30, W + 20, 70);
  });
  const last = near.darker(.6); ctx.fillStyle = last + ''; ctx.fillRect(-10, G.H - 20, W + 20, H);
  ctx.restore();
} });
function buildLandLabels() {
  const el = $('mountains'); el.innerHTML = ''; const G = landGeo, narrow = G.W < 700, n = G.layers.length;
  G.layers.forEach((L, i) => {
    const pk = L.pts.reduce((a, b) => (b[1] < a[1] ? b : a));
    const d = document.createElement('div'); d.className = 'peak ink';
    d.style.left = Math.min(94, Math.max(6, pk[0] / G.W * 100)) + '%'; d.style.top = pk[1] + 'px';
    d.style.color = i < 3 ? '#1E2A33' : '#F2EEE6';
    d.textContent = narrow ? short(S[L.s].name) : S[L.s].name; el.append(d);
  });
  const hours = document.createElement('div'); hours.className = 'hours ink';
  const avgRise = d3.mean(DAYS, d => d.rise), avgSet = d3.mean(DAYS, d => d.set);
  [[avgRise, 'dawn'], [720, 'noon'], [avgSet, 'dusk']].forEach(([m, l]) => { const s = document.createElement('span'); s.style.left = (G.X(m) / G.W * 100) + '%'; s.textContent = l; hours.append(s); });
  el.append(hours);
}


export function buildLand() { landGeo = landLayout(); buildLandLabels(); }
