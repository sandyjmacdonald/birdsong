// "Three songs": printed spectrograms with playable recordings, plus the small dawn chorus mix.
import { d3, S, DAYS, ND, rows, WEATHER, dayIndex, dateOf, fmtLong, fmtShort, short, clamp01, jit, rng, HUE, hueOf, mutedOf } from '../lib/data.js';
import { $, RM, COARSE, nf, secProgress, showTip, hideTip } from '../lib/ui.js';
import { IMG, cover, panel, panels, renderPanel, state } from '../print/pages.js';

panel('listen', { mix: .4, draw(ctx, W, H) {
  ctx.fillStyle = '#E7E4DD'; ctx.fillRect(0, 0, W, H);
  const r = rng(19);
  for (let i = 0; i < 14; i++) { const x = r() * W, y = r() * H, rad = 200 + r() * 500, g = ctx.createRadialGradient(x, y, 0, x, y, rad); g.addColorStop(0, `rgba(${r() < .5 ? '255,252,246' : '200,194,182'},${(.05 + r() * .06).toFixed(2)})`); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  const sec = $('listen-sec').getBoundingClientRect();
  ['blue', 'great', 'coal'].forEach(k => {
    const s = $('spec-' + k).getBoundingClientRect(); if (!s.width || !IMG['spec_' + k]) return;
    const x = s.left - sec.left, y = s.top - sec.top;
    ctx.strokeStyle = 'rgba(30,27,24,.35)'; ctx.lineWidth = 1; ctx.strokeRect(x - .5, y - .5, s.width + 1, s.height + 1);
    ctx.drawImage(IMG['spec_' + k], x, y, s.width, s.height);
  });
} });

// ---- audio ----
const OFFS = { blue: [0, 16], great: [3.5], coal: [8] };
const players = {}; let current = null, rafA = 0;
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
const getPlayer = k => players[k] || (players[k] = Object.assign(new Audio(`${BASE}/audio/${k}.mp3`), { preload: 'none' }));
const heads = { blue: document.querySelector('#spec-blue .playhead'), great: document.querySelector('#spec-great .playhead'), coal: document.querySelector('#spec-coal .playhead') };
function setButtons() { document.querySelectorAll('[data-play]').forEach(b => { const on = b.dataset.play === current; b.setAttribute('aria-pressed', on ? 'true' : 'false'); const l = b.querySelector('.lbl'); if (l && !l.dataset.off) l.dataset.off = l.textContent; if (l) l.textContent = on ? 'Pause' : l.dataset.off; }); }
function tickHeads() {
  Object.values(heads).forEach(h => h.classList.remove('on'));
  if (current) {
    const a = getPlayer(current), t = a.currentTime;
    const show = (k, lt) => { if (lt >= 0 && lt <= 15) { heads[k].style.left = (lt / 15 * 100) + '%'; heads[k].classList.add('on'); } };
    if (current === 'chorus') Object.entries(OFFS).forEach(([k, os]) => os.forEach(o => show(k, t - o)));
    else show(current, t);
    rafA = requestAnimationFrame(tickHeads);
  }
}
function stopAll() { Object.values(players).forEach(a => { a.pause(); }); cancelAnimationFrame(rafA); current = null; setButtons(); tickHeads(); }
document.querySelectorAll('[data-play]').forEach(b => b.addEventListener('click', () => {
  const k = b.dataset.play;
  if (current === k) { stopAll(); return; }
  stopAll();
  const a = getPlayer(k); a.currentTime = 0;
  a.onended = () => { if (current === k) stopAll(); };
  a.play().then(() => { current = k; setButtons(); tickHeads(); }).catch(() => stopAll());
}));
setButtons();
