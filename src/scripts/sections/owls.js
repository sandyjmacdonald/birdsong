// "After dark": one thread per night an owl was heard, from sunset to sunrise, with the moon phase.
import { d3, S, DAYS, ND, rows, WEATHER, dayIndex, dateOf, fmtLong, fmtShort, short, clamp01, jit, rng, HUE, hueOf, mutedOf } from '../lib/data.js';
import { $, RM, COARSE, nf, secProgress, showTip, hideTip } from '../lib/ui.js';
import { IMG, cover, panel, panels, renderPanel, state } from '../print/pages.js';

panel('owls', { shadowA: .3, shadowB: 12, draw(ctx, W, H) {
  ctx.fillStyle = '#071116'; ctx.fillRect(0, 0, W, H);
  cover(ctx, IMG.owls, 0, 0, W, H, { fy: .25 });
  ctx.fillStyle = 'rgba(4,10,14,.3)'; ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(4,10,14,.45)'); g.addColorStop(.4, 'rgba(4,10,14,.1)'); g.addColorStop(1, 'rgba(4,10,14,.35)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
} });

function moonAge(n) { const t = Date.parse(DAYS[n].date + 'T23:00:00Z'), ref = Date.UTC(2000, 0, 6, 18, 14); return (((t - ref) / 864e5) % 29.530588853 + 29.530588853) % 29.530588853; }
function moonIcon(svg, cx, cy, r, n) {
  const age = moonAge(n), f = age / 29.530588853, ill = (1 - Math.cos(2 * Math.PI * f)) / 2, wax = f < .5, rx = r * Math.abs(1 - 2 * ill);
  const pct = Math.round(ill * 100);
  const name = pct < 3 ? 'New moon' : pct > 97 ? 'Full moon' : (Math.abs(pct - 50) < 6 ? (wax ? 'First quarter' : 'Last quarter') : `${wax ? 'Waxing' : 'Waning'} ${pct < 50 ? 'crescent' : 'gibbous'}`);
  const g = svg.append('g').style('cursor', 'default');
  g.append('circle').attr('cx', cx).attr('cy', cy).attr('r', r).attr('fill', 'rgba(241,233,219,.1)').attr('stroke', 'rgba(241,233,219,.35)').attr('stroke-width', .6);
  if (pct >= 1) {
    const top = `${cx},${cy - r}`, bot = `${cx},${cy + r}`;
    const outer = wax ? `A${r},${r} 0 0 1 ${bot}` : `A${r},${r} 0 0 0 ${bot}`;
    const cres = ill < .5, term = wax ? (cres ? 0 : 1) : (cres ? 1 : 0);
    g.append('path').attr('d', `M${top} ${outer} A${rx},${r} 0 0 ${term} ${top} Z`).attr('fill', '#EFE9DE');
  }
  g.on('pointermove', ev => showTip(`<b>${name}</b><br>${pct}% lit`, ev.clientX, ev.clientY)).on('pointerleave', hideTip);
}
export function buildNights() {
  const el = $('night'); el.innerHTML = '';
  const OWL = { 'Tawny Owl': '#F2B06A', 'Barn Owl': '#EFE9DE' };
  const calls = rows.filter(r => OWL[S[r.s].name]).map(r => {
    const night = r.m < 720 ? r.d - 1 : r.d; // calls after midnight belong to the previous evening
    return { r, night, t: r.m < 720 ? r.m + 1440 : r.m, sp: S[r.s].name };
  });
  const nights = [...new Set(calls.map(c => c.night))].sort((a, b) => a - b);
  const narrow = el.clientWidth < 760;
  const VW = narrow ? el.clientWidth : 1000, L = narrow ? 4 : 190, GR = narrow ? VW - 4 : 965, rh = narrow ? 66 : 66, top = narrow ? 30 : 44, VH = top + nights.length * rh + 10;
  const X = t => L + (t - 1140) / 720 * (GR - L);
  const svg = d3.select(el).append('svg').attr('class', 'ink').attr('viewBox', `0 0 ${VW} ${VH}`).attr('role', 'img').attr('aria-label', 'Nights when owls were heard, with each call placed at its time between sunset and sunrise');
  svg.append('defs').html('<filter id="oglow" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="3.2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>');
  [[1200, '8 pm'], [1320, '10 pm'], [1440, narrow ? '12 am' : 'midnight'], [1560, '2 am'], [1680, '4 am'], [1800, '6 am']].forEach(([t, l]) => {
    svg.append('text').attr('x', X(t)).attr('y', 14).attr('text-anchor', 'middle').style('font', `italic 300 ${narrow ? 11 : 13}px Fraunces, Georgia, serif`).attr('fill', 'rgba(241,233,219,.62)').text(l);
    svg.append('line').attr('x1', X(t)).attr('x2', X(t)).attr('y1', 24).attr('y2', VH - 6).attr('stroke', 'rgba(241,233,219,.1)');
  });
  nights.forEach((n, j) => {
    const y = top + j * rh + (narrow ? 40 : rh / 2), yl = y - 20, set = DAYS[n].set, rise = (DAYS[n + 1] || DAYS[n]).rise + 1440;
    const d1 = dateOf(n), d2 = dateOf(Math.min(ND - 1, n + 1));
    const lab = d1.getMonth() === d2.getMonth() ? `${d1.getDate()}–${d2.getDate()} ${d2.toLocaleDateString('en-GB', { month: 'short' })}` : `${fmtShort(n)} – ${fmtShort(n + 1)}`;
    if (narrow) moonIcon(svg, L + 6, yl - 4, 5.5, n); else moonIcon(svg, L - 20, y, 7, n);
    svg.append('text').attr('x', narrow ? L + 18 : L - 40).attr('y', narrow ? yl : y).attr('dy', narrow ? 0 : '.35em').attr('text-anchor', narrow ? 'start' : 'end').style('font', `400 ${narrow ? 13 : 14}px Fraunces, Georgia, serif`).attr('fill', 'rgba(241,233,219,.85)').text(lab);
    svg.append('line').attr('x1', X(1140)).attr('x2', X(set)).attr('y1', y).attr('y2', y).attr('stroke', 'rgba(241,233,219,.18)').attr('stroke-dasharray', '1 4');
    svg.append('line').attr('x1', X(set)).attr('x2', X(rise)).attr('y1', y).attr('y2', y).attr('stroke', 'rgba(241,233,219,.42)');
    svg.append('line').attr('x1', X(rise)).attr('x2', X(1860)).attr('y1', y).attr('y2', y).attr('stroke', 'rgba(241,233,219,.18)').attr('stroke-dasharray', '1 4');
    [[set, 'sunset'], [rise, 'sunrise']].forEach(([t, l]) => { svg.append('line').attr('x1', X(t)).attr('x2', X(t)).attr('y1', y - 5).attr('y2', y + 5).attr('stroke', 'rgba(241,233,219,.5)'); if (j === 0) svg.append('text').attr('x', X(t)).attr('y', y + (narrow ? 16 : 20)).attr('text-anchor', 'middle').style('font', 'italic 300 11px Fraunces, Georgia, serif').attr('fill', 'rgba(241,233,219,.55)').text(l); });
    const cs = calls.filter(c => c.night === n);
    cs.forEach((c, k) => {
      const off = c.sp === 'Barn Owl' ? 0 : 0;
      svg.append('circle').attr('cx', X(c.t)).attr('cy', y + off).attr('r', narrow ? 2 + c.r.c / 80 : 2.6 + c.r.c / 60).attr('fill', OWL[c.sp]).attr('opacity', .45 + c.r.c / 200).style('filter', 'url(#oglow)')
        .on('pointermove', ev => showTip(`<b>${c.sp}</b><br>${fmtShort(c.r.d)} at ${String(Math.floor(c.r.m / 60)).padStart(2, '0')}:${String(Math.floor(c.r.m % 60)).padStart(2, '0')}<br>${c.r.c}% sure`, ev.clientX, ev.clientY)).on('pointerleave', hideTip);
    });
    if (cs.length >= 4) {
      const sp = cs[0].sp, x0 = X(d3.min(cs, c => c.t)), x1 = X(d3.max(cs, c => c.t)), span = Math.round(d3.max(cs, c => c.t) - d3.min(cs, c => c.t));
      const clock = m => { m = m % 1440; const h = Math.floor(m / 60), mm = String(Math.floor(m % 60)).padStart(2, '0'); return `${h % 12 || 12}:${mm} ${h < 12 ? 'am' : 'pm'}`; };
      const word = ['', 'one', 'two', 'three', 'four', 'five', 'six'][cs.length] || cs.length;
      const txt = span <= 60 ? `${word} calls in ${span} minutes` : `${word} calls between ${clock(d3.min(cs, c => c.t))} and ${clock(d3.max(cs, c => c.t))}`;
      if (narrow) svg.append('text').attr('x', GR).attr('y', yl).attr('text-anchor', 'end').style('font', 'italic 300 11px Fraunces, Georgia, serif').attr('fill', 'rgba(241,233,219,.75)').text(span <= 60 ? `${word} calls in ${span} min` : `${word} calls, ${clock(d3.min(cs, c => c.t))} to ${clock(d3.max(cs, c => c.t))}`);
      else svg.append('text').attr('x', (x0 + x1) / 2).attr('y', y - 14).attr('text-anchor', 'middle').style('font', 'italic 300 11.5px Fraunces, Georgia, serif').attr('fill', 'rgba(241,233,219,.75)').text(txt);
    }
  });
}
