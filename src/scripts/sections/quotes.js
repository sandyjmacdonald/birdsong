// The two pull-quote pages: a sunrise photograph and a pale windswept gradient.
import { d3, S, DAYS, ND, rows, WEATHER, dayIndex, dateOf, fmtLong, fmtShort, short, clamp01, jit, rng, HUE, hueOf, mutedOf } from '../lib/data.js';
import { $, RM, COARSE, nf, secProgress, showTip, hideTip } from '../lib/ui.js';
import { IMG, cover, panel, panels, renderPanel, state } from '../print/pages.js';

panel('pq1', { shadowA: .25, shadowB: 12, draw(ctx, W, H) {
  ctx.fillStyle = '#C9A9A2'; ctx.fillRect(0, 0, W, H);
  const narrow = W < 760, zoom = narrow ? 1.3 : 1;
  const im = IMG.pq1, s = Math.max(W / im.width, H / im.height) * zoom, dh = im.height * s;
  const fy = dh > H ? Math.max(0, Math.min(1, -(H * (narrow ? .2 : .86) - .383 * dh) / (dh - H))) : .5;
  cover(ctx, im, 0, 0, W, H, { fy, zoom });
} });
panel('pq2', { draw(ctx, W, H) {
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#B7C8D8'); g.addColorStop(.55, '#D6E0E7'); g.addColorStop(1, '#E9EEF0');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const r = rng(41);
  for (let i = 0; i < 16; i++) {
    const y = r() * H, x = r() * W, w = W * (.4 + r() * .7), h = 6 + r() * 26;
    const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, 1); sg.addColorStop(0, `rgba(255,255,255,${(.12 + r() * .16).toFixed(2)})`); sg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.save(); ctx.translate(x, y); ctx.rotate((r() - .5) * .05); ctx.scale(w / 2, h / 2); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(0, 0, 1, 0, 6.283); ctx.fill(); ctx.restore();
  }
} });
