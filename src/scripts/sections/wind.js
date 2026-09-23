// "Quiet in the wind": morning calls against hourly wind speed from Open-Meteo.
import { d3, S, DAYS, ND, rows, WEATHER, dayIndex, dateOf, fmtLong, fmtShort, short, clamp01, jit, rng, HUE, hueOf, mutedOf } from '../lib/data.js';
import { $, RM, COARSE, nf, secProgress, showTip, hideTip } from '../lib/ui.js';
import { IMG, cover, panel, panels, renderPanel, state } from '../print/pages.js';
import { WIND_NOTES } from '../story.js';

panel('wind', { shadowA: .25, shadowB: 12, mix: .5, fold: false, draw(ctx, W, H) {
  ctx.fillStyle = '#E9DCD2'; ctx.fillRect(0, 0, W, H);
  cover(ctx, IMG.wind, 0, 0, W, H, { fy: .5 });
  ctx.fillStyle = 'rgba(246,240,233,.28)'; ctx.fillRect(0, 0, W, H);
} });
function windStats() {
  const WX = WEATHER, cnt = {};
  rows.forEach(r => { const k = r.d * 24 + Math.floor(r.m / 60); cnt[k] = (cnt[k] || 0) + 1; });
  const hours = [], perDay = [];
  for (let d = 1; d < ND; d++) {
    let n = 0, ws = 0, k = 0, rain = 0;
    for (let h = 0; h < 24; h++) {
      const rel = h * 60 + 30 - DAYS[d].rise; if (rel < -30 || rel > 210) continue;
      const i = d * 24 + h, c = cnt[i] || 0;
      hours.push({ wind: WX.wind[i], rain: WX.rain[i], n: c }); n += c; ws += WX.wind[i]; k++; rain += WX.rain[i];
    }
    perDay.push({ d, n, wind: ws / k, rain });
  }
  const bands = [[0, 5, 'under 5 km/h'], [5, 10, '5 to 10'], [10, 15, '10 to 15'], [15, 20, '15 to 20'], [20, 99, '20 and over']].map(([a, b, l]) => {
    const hs = hours.filter(h => h.wind >= a && h.wind < b); return { l, hrs: hs.length, mean: d3.mean(hs, h => h.n) };
  });
  const wet = hours.filter(h => h.rain > .2).length;
  return { bands, perDay, wet };
}
export function buildWind() {
  const st = windStats();
  const words = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
  $('w-calm').textContent = Math.round(st.bands[0].mean);
  $('w-windy').textContent = st.bands[4].mean < 5 ? 'under 5' : Math.round(st.bands[4].mean);
  $('w-wet').textContent = words[st.wet] || st.wet;
  // bars
  const el = $('windBars'); el.innerHTML = '';
  const nw = el.clientWidth < 600;
  const VW = nw ? el.clientWidth : 740, rh = nw ? 36 : 44, LBL = nw ? 88 : 150, VH = st.bands.length * rh + 26, mx = d3.max(st.bands, b => b.mean);
  const X = v => LBL + v / mx * (VW - LBL - (nw ? 52 : 150));
  const svg = d3.select(el).append('svg').attr('class', 'ink').attr('viewBox', `0 0 ${VW} ${VH}`).attr('role', 'img').attr('aria-label', 'Average calls per morning* hour by wind speed, falling from about 26 in still air to under 5 in strong wind');
  svg.append('text').attr('x', nw ? 0 : LBL).attr('y', 10).style('font', `italic 400 ${nw ? 12 : 13}px Fraunces, Georgia, serif`).attr('fill', 'rgba(30,27,24,.7)').text('Average calls per morning* hour, by wind speed');
  st.bands.forEach((b, i) => {
    const y = 26 + i * rh + rh / 2;
    svg.append('text').attr('x', LBL - 16).attr('y', y).attr('dy', '.35em').attr('text-anchor', 'end').style('font', `400 ${nw ? 12.5 : 15}px Fraunces, Georgia, serif`).attr('fill', 'rgba(30,27,24,.8)').text(b.l);
    svg.append('rect').attr('x', LBL).attr('y', y - 10).attr('height', 20).attr('width', Math.max(2, X(b.mean) - LBL)).attr('fill', 'rgba(32, 38, 46, 0.64)');
    const tx = svg.append('text').attr('x', X(b.mean) + (nw ? 8 : 12)).attr('y', y).attr('dy', '.35em');
    tx.append('tspan').style('font', `400 ${nw ? 15 : 19}px Fraunces, Georgia, serif`).attr('fill', 'rgba(25, 24, 30, 0.82)').text(b.mean.toFixed(1));
    if (!nw) tx.append('tspan').attr('dx', 8).style('font', 'italic 300 12px Fraunces, Georgia, serif').attr('fill', 'rgba(30,27,24,.62)').text(`across ${b.hrs} hours`);
  });
  // daily strip
  const el2 = $('windStrip'); el2.innerHTML = '';
  const sn = el2.clientWidth < 760;
  const SW = sn ? el2.clientWidth : 1000, L = sn ? 2 : 20, R = sn ? 2 : 50, mid = sn ? 164 : 206, up = sn ? 120 : 150, dn = sn ? 70 : 90, SH = mid + dn + (sn ? 76 : 86), cw = (SW - L - R) / ND;
  const mxN = d3.max(st.perDay, p => p.n), mxW = d3.max(st.perDay, p => p.wind);
  const s2 = d3.select(el2).append('svg').attr('class', 'ink').attr('viewBox', `0 0 ${SW} ${SH}`).attr('role', 'img').attr('aria-label', 'For each day, morning calls drawn upwards and morning wind drawn downwards');
  s2.append('text').attr('x', L).attr('y', 16).style('font', 'italic 400 13px Fraunces, Georgia, serif').attr('fill', 'rgba(30,27,24,.7)').text('Calls each morning*');
  s2.append('text').attr('x', L).attr('y', SH - 4).style('font', 'italic 400 13px Fraunces, Georgia, serif').attr('fill', 'rgba(30,27,24,.7)').text('Average morning wind, deeper is windier');
  const area = d3.area().x(p => L + (p.d + .5) * cw).y0(mid + 4).y1(p => mid + 4 + p.wind / mxW * dn).curve(d3.curveMonotoneX);
  s2.append('path').attr('d', area(st.perDay)).attr('fill', 'rgba(62,70,108,.3)');
  s2.append('path').attr('d', d3.line().x(p => L + (p.d + .5) * cw).y(p => mid + 4 + p.wind / mxW * dn).curve(d3.curveMonotoneX)(st.perDay)).attr('fill', 'none').attr('stroke', 'rgba(50,58,96,.66)').attr('stroke-width', 1.1);
  st.perDay.forEach(p => {
    const x = L + p.d * cw + cw * .15, h = p.n / mxN * up;
    s2.append('rect').attr('x', x).attr('y', mid - h).attr('width', cw * .62).attr('height', h).attr('fill', 'rgba(32, 38, 46, 0.64)')
      .on('pointermove', ev => showTip(`<b>${fmtLong(p.d)}</b><br>${p.n} calls in the morning<br>wind ${p.wind.toFixed(0)} km/h${p.rain > .05 ? `, ${p.rain.toFixed(1)} mm rain` : ''}`, ev.clientX, ev.clientY)).on('pointerleave', hideTip);
  });
  s2.append('line').attr('x1', L).attr('x2', SW - R).attr('y1', mid + 2).attr('y2', mid + 2).attr('stroke', 'rgba(30,27,24,.42)');
  (sn ? [0, 31, 61] : [0, 15, 31, 46, 61]).forEach((i, k, arr) => s2.append('text').attr('x', L + (i + .5) * cw).attr('y', mid + 2 + dn + (sn ? 36 : 42)).attr('text-anchor', sn && k === 0 ? 'start' : sn && k === arr.length - 1 ? 'end' : 'middle').style('font', `italic 300 ${sn ? 11 : 12}px Fraunces, Georgia, serif`).attr('fill', 'rgba(30,27,24,.58)').text(fmtShort(i)));
  const note = (d, txt, anchor, below) => { const p = st.perDay.find(q => q.d === d); if (!p) return; const x = L + (d + .5) * cw;
    const y = below ? mid + 4 + p.wind / mxW * dn : mid - p.n / mxN * up, ty = below ? mid + 4 + dn + (sn ? 16 : 20) : mid - up - 14;
    s2.append('line').attr('x1', x).attr('x2', x).attr('y1', below ? y + 3 : y - 4).attr('y2', below ? ty - 11 : ty + 5).attr('stroke', 'rgba(30,27,24,.55)').attr('stroke-dasharray', '2 2');
    s2.append('text').attr('x', sn ? Math.min(x, SW - 60) : x).attr('y', ty).attr('text-anchor', 'middle').style('font', `italic 400 ${sn ? 11.5 : 13}px Fraunces, Georgia, serif`).attr('fill', 'rgba(30,27,24,.7)').text(txt); };
  const byDate = s => DAYS.findIndex(d => d.date === s);
  WIND_NOTES.forEach(n => note(byDate(n.date), sn ? n.short : n.text, 'end', n.below));
}
