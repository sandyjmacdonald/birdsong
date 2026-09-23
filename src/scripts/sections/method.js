// "How it listens": a softened photograph of a circuit board.
import { IMG, cover, panel } from '../print/pages.js';

panel('method', { draw(ctx, W, H) {
  ctx.fillStyle = '#121112'; ctx.fillRect(0, 0, W, H);
  cover(ctx, IMG.circuit, 0, 0, W, H, { fx: .35, fy: .45 });
  ctx.fillStyle = 'rgba(14,11,9,.62)'; ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, W, 0); g.addColorStop(0, 'rgba(14,11,9,.35)'); g.addColorStop(.7, 'rgba(14,11,9,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
} });
