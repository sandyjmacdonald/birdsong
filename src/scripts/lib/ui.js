// Small browser helpers shared by every section.
import { clamp01 } from './data.js';

export const $ = id => document.getElementById(id);
export const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;   // reduced motion
export const COARSE = matchMedia('(pointer: coarse)').matches;              // phones and tablets
export const nf = new Intl.NumberFormat('en-GB');

// How far through a tall (sticky) section we've scrolled, 0 to 1.
export const secProgress = el => { const r = el.getBoundingClientRect(); return clamp01(-r.top / Math.max(1, r.height - innerHeight)); };

let tip;
export function showTip(html, x, y) {
  tip = tip || $('tip');
  tip.innerHTML = html; tip.style.opacity = 1;
  const r = tip.getBoundingClientRect();
  let l = x + 16, t = y + 16;
  if (l + r.width > innerWidth - 8) l = x - r.width - 16;
  if (t + r.height > innerHeight - 8) t = y - r.height - 16;
  tip.style.left = Math.max(8, l) + 'px'; tip.style.top = Math.max(8, t) + 'px';
}
export const hideTip = () => { (tip || $('tip')).style.opacity = 0; };
