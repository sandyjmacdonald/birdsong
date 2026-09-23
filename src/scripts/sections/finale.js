// Closing page: the sunset photograph.
import { d3, S, DAYS, ND, rows, WEATHER, dayIndex, dateOf, fmtLong, fmtShort, short, clamp01, jit, rng, HUE, hueOf, mutedOf } from '../lib/data.js';
import { $, RM, COARSE, nf, secProgress, showTip, hideTip } from '../lib/ui.js';
import { IMG, cover, panel, panels, renderPanel, state } from '../print/pages.js';

panel('finale', { fold: true, draw(ctx, W, H) {
  ctx.fillStyle = '#0C0A0A'; ctx.fillRect(0, 0, W, H);
  cover(ctx, IMG.finale, 0, 0, W, H, { fy: .42, zoom: 1.04 });
  const gb = ctx.createLinearGradient(0, H * .6, 0, H); gb.addColorStop(0, 'rgba(8,6,6,0)'); gb.addColorStop(1, 'rgba(8,6,6,.8)'); ctx.fillStyle = gb; ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H * .5); g.addColorStop(0, 'rgba(8,7,8,.4)'); g.addColorStop(1, 'rgba(8,7,8,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
} });
