// Cover: the murmuration photograph, with a soft dark wash behind the title.
import { d3, S, DAYS, ND, rows, WEATHER, dayIndex, dateOf, fmtLong, fmtShort, short, clamp01, jit, rng, HUE, hueOf, mutedOf } from '../lib/data.js';
import { $, RM, COARSE, nf, secProgress, showTip, hideTip } from '../lib/ui.js';
import { IMG, cover, panel, panels, renderPanel, state } from '../print/pages.js';

export const hero = { p: 0 }; // scroll progress through the cover, for a gentle parallax
panel('hero', { fold: true, dynamic: !COARSE, draw(ctx, W, H) {
  ctx.fillStyle = '#0B1A22'; ctx.fillRect(0, 0, W, H);
  cover(ctx, IMG.hero, 0, 0, W, H, { fy: .25 + hero.p * .35, zoom: 1.06 });
  let g = ctx.createLinearGradient(0, H * .5, 0, H); g.addColorStop(0, 'rgba(12,9,9,0)'); g.addColorStop(1, 'rgba(12,9,9,.62)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  g = ctx.createLinearGradient(0, 0, 0, H * .35); g.addColorStop(0, 'rgba(6,12,18,.35)'); g.addColorStop(1, 'rgba(6,12,18,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  const tb = document.querySelector('.hero-in > div').getBoundingClientRect(), hb = $('top').getBoundingClientRect();
  const cx = W / 2, cy = tb.top - hb.top + tb.height * .62, rw = Math.max(tb.width * .75, W * .35);
  ctx.save(); ctx.translate(cx, cy); ctx.scale(1, .42);
  const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, rw); rg.addColorStop(0, 'rgba(6,12,18,.42)'); rg.addColorStop(.6, 'rgba(6,12,18,.2)'); rg.addColorStop(1, 'rgba(6,12,18,0)');
  ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, rw, 0, 6.283); ctx.fill(); ctx.restore();
} });
