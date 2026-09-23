// "Who sings first": each species placed at its typical first call relative to sunrise; names light up as a sweep passes.
import { d3, S, DAYS, ND, rows, WEATHER, dayIndex, dateOf, fmtLong, fmtShort, short, clamp01, jit, rng, HUE, hueOf, mutedOf } from '../lib/data.js';
import { $, RM, COARSE, nf, secProgress, showTip, hideTip } from '../lib/ui.js';
import { IMG, cover, panel, panels, renderPanel, state } from '../print/pages.js';

const WAKE = (() => {
  const first = new Map(); rows.forEach(r => { const k = r.s + '|' + r.d; if (!first.has(k)) first.set(k, r); });
  const out = []; d3.group([...first.values()], r => r.s).forEach((a, s) => { if (a.length >= 10) out.push({ s, med: d3.median(a, r => r.rel), n: a.length }); });
  return out.sort((a, b) => a.med - b.med);
})();
$('robin-min').textContent = Math.round(-WAKE[0].med) + ' minutes';
export const wakeSec = $('wake-sec'), wakeStage = $('wakeStage'), wakeSvg = d3.select('#wakeSvg');
let wakeP = 0, wakeGeo = null;
function wakeLayout() {
  const W = wakeStage.clientWidth, H = wakeStage.clientHeight, narrow = W < 760;
  const horizon = H * (narrow ? .8 : .845), lo = -95, hi = 200;
  const L = narrow ? 30 : Math.max(96, W * .11), R = narrow ? 30 : Math.max(96, W * .1);
  const X = v => L + (Math.max(lo, Math.min(hi, v)) - lo) / (hi - lo) * (W - L - R);
  const headB = wakeStage.querySelector('.head').getBoundingClientRect().bottom - wakeStage.getBoundingClientRect().top;
  const top = narrow ? Math.max(H * .36, headB + 50) : headB + 34;
  return { W, H, narrow, horizon, lo, hi, X, top, rh: (horizon - top - 26) / WAKE.length };
}
panel('wake', { dynamic: true, mix: .42, fold: false, draw(ctx, W, H) {
  const G = wakeGeo; const p = wakeP, sunP = clamp01((G.lo + p * (G.hi - G.lo) + 60) / 180);
  ctx.fillStyle = '#081013'; ctx.fillRect(0, 0, W, H);
  const im = IMG.wake, s = Math.max(W / im.width, H / im.height) * 1.18;
  const sunX = .452 * im.width * s, sunY = .545 * im.height * s;
  let ox = G.X(0) - sunX; ox = Math.min(0, Math.max(W - im.width * s, ox));
  let oy = (G.horizon + 30 - sunP * 95) - sunY; oy = Math.min(0, Math.max(H - im.height * s, oy));
  ctx.drawImage(im, ox, oy, im.width * s, im.height * s);
  ctx.fillStyle = `rgba(3,6,10,${(.62 * (1 - sunP) + .12).toFixed(3)})`; ctx.fillRect(0, 0, W, H);
  const g = ctx.createRadialGradient(ox + sunX, oy + sunY, 0, ox + sunX, oy + sunY, W * .45);
  g.addColorStop(0, `rgba(255,170,100,${(.35 * sunP).toFixed(3)})`); g.addColorStop(1, 'rgba(255,170,100,0)');
  ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over';
  const tg = ctx.createLinearGradient(0, 0, 0, H * .4); tg.addColorStop(0, 'rgba(4,6,10,.5)'); tg.addColorStop(1, 'rgba(4,6,10,0)'); ctx.fillStyle = tg; ctx.fillRect(0, 0, W, H);
} });
export function buildWake() {
  const G = wakeGeo = wakeLayout(), { W, H, X, top, rh, horizon, narrow } = G;
  wakeSvg.attr('viewBox', `0 0 ${W} ${H}`).selectAll('*').remove();
  wakeSvg.append('line').attr('x1', 0).attr('x2', W).attr('y1', horizon).attr('y2', horizon).attr('stroke', 'rgba(241,233,219,.35)');
  [[-60, 'an hour before'], [0, 'sunrise'], [60, 'an hour after'], [120, 'two hours after'], [180, 'three hours after']].forEach(([t, l]) => {
    if (narrow && t === 120) return;
    wakeSvg.append('text').attr('x', X(t)).attr('y', horizon + 22).attr('text-anchor', 'middle').style('font', `italic 300 ${narrow ? 11 : 13}px Fraunces, Georgia, serif`).attr('fill', t === 0 ? '#FFC593' : 'rgba(241,233,219,.6)').text(l);
  });
  G.sweep = wakeSvg.append('line').attr('y1', top - 30).attr('y2', horizon).attr('stroke', 'rgba(255,220,180,.6)');
  G.items = WAKE.map((w, i) => {
    const x = X(w.med), y = top + i * rh + rh * .5, right = x > W * .62, mm = Math.round(w.med);
    const g = wakeSvg.append('g').attr('opacity', .16).style('transition', 'opacity .6s ease');
    g.append('line').attr('x1', x).attr('x2', x).attr('y1', y + 6).attr('y2', horizon).attr('stroke', hueOf(w.s)).attr('stroke-opacity', .6);
    g.append('circle').attr('cx', x).attr('cy', horizon).attr('r', 2.6).attr('fill', hueOf(w.s));
    g.append('circle').attr('cx', x).attr('cy', y).attr('r', 2.2).attr('fill', hueOf(w.s));
    g.append('text').attr('x', right ? x - 9 : x + 9).attr('y', y).attr('dy', '.35em').attr('text-anchor', right ? 'end' : 'start')
      .style('font', `${i === 0 ? 500 : 400} ${i === 0 ? (narrow ? 17 : 22) : (narrow ? 12 : 15)}px Fraunces, Georgia, serif`).attr('fill', '#F3EBDD')
      .text(narrow ? short(S[w.s].name) : S[w.s].name);
    g.on('pointermove', ev => showTip(`<b>${S[w.s].name}</b><br>Usually first heard ${Math.abs(mm)} min ${mm < 0 ? 'before' : 'after'} sunrise, across ${w.n} mornings`, ev.clientX, ev.clientY)).on('pointerleave', hideTip);
    return { g, w };
  });
}
function spoken(m) {
  if (Math.abs(m) < 4) return 'Sunrise';
  const a = Math.abs(Math.round(m / 5) * 5), h = Math.floor(a / 60), mi = a % 60;
  const hw = ['', 'An hour', 'Two hours', 'Three hours'][h] || '';
  return `${h ? hw + (mi ? ` ${mi} minutes` : '') : `${mi} minutes`} ${m < 0 ? 'before' : 'after'} sunrise`;
}
export function updateWake(force) {
  const p = RM ? 1 : clamp01(secProgress(wakeSec) * 1.08);
  if (!force && Math.abs(p - wakeP) < .002) return;
  wakeP = p; renderPanel('wake');
  const G = wakeGeo, t = G.lo + p * (G.hi - G.lo);
  G.sweep.attr('x1', G.X(t)).attr('x2', G.X(t)).attr('opacity', p >= 1 ? 0 : 1);
  G.items.forEach(({ g, w }) => g.attr('opacity', t >= w.med ? 1 : .16));
  $('clock').textContent = spoken(t);
}
