// "Passing strangers": the feathers photograph behind the list (the list itself is built at build time).
import { d3, S, DAYS, ND, rows, WEATHER, dayIndex, dateOf, fmtLong, fmtShort, short, clamp01, jit, rng, HUE, hueOf, mutedOf } from '../lib/data.js';
import { $, RM, COARSE, nf, secProgress, showTip, hideTip } from '../lib/ui.js';
import { IMG, cover, panel, panels, renderPanel, state } from '../print/pages.js';

panel('index', { draw(ctx, W, H) {
  ctx.fillStyle = '#16130F'; ctx.fillRect(0, 0, W, H);
  cover(ctx, IMG.feathers, 0, 0, W, H, { fy: .4 });
  ctx.fillStyle = 'rgba(12,10,8,.5)'; ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(12,10,8,.35)'); g.addColorStop(.5, 'rgba(12,10,8,0)'); g.addColorStop(1, 'rgba(12,10,8,.4)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
} });
