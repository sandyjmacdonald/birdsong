// "Comings and goings": one thread per species, one bead per day heard. Beads appear as you scroll.
import { d3, S, DAYS, ND, rows, WEATHER, dayIndex, dateOf, fmtLong, fmtShort, short, clamp01, jit, rng, HUE, hueOf, mutedOf } from '../lib/data.js';
import { $, RM, COARSE, nf, secProgress, showTip, hideTip } from '../lib/ui.js';
import { IMG, cover, panel, panels, renderPanel, state } from '../print/pages.js';
import { THREAD_NOTES } from '../story.js';

const LOOM_SP = S.map((s, i) => i).filter(i => S[i].n >= 5);
const LOOM_C = LOOM_SP.map(s => { const a = new Array(ND).fill(0); rows.forEach(r => { if (r.s === s) a[r.d]++; }); return a; });
let beads = [], loomNotes = [];
panel('threads', { draw(ctx, W, H) {
  ctx.fillStyle = '#0B0C12'; ctx.fillRect(0, 0, W, H);
  cover(ctx, IMG.threads, 0, 0, W, H, { fy: .42, zoom: 1.05 });
  ctx.fillStyle = 'rgba(7,8,14,.5)'; ctx.fillRect(0, 0, W, H);
  const g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(7,8,14,.55)'); g.addColorStop(.35, 'rgba(7,8,14,0)'); g.addColorStop(1, 'rgba(7,8,14,.45)'); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
} });
export function buildLoom() {
  const el = $('loom'); el.innerHTML = '';
  const narrow = el.clientWidth < 760;
  const idx = n => LOOM_SP.findIndex(s => S[s].name === n);
  const NOTES_L = THREAD_NOTES.map(n => ({ ...n, row: idx(n.species), col: Math.max(0, dayIndex(n.date)), s: n.short }));
  beads = [];
  if (narrow) {
    const W = el.clientWidth, L = 2, GR = W - 2, cw = (GR - L) / ND, rowH = 32, top = 28, VH = top + LOOM_SP.length * rowH + 6;
    const svg = d3.select(el).append('svg').attr('class', 'ink').attr('viewBox', `0 0 ${W} ${VH}`).attr('role', 'img').attr('aria-label', 'One thread per species with a bead for each day it was heard');
    [0, 31, 61].forEach((i, k) => { const x = L + (i + .5) * cw; svg.append('text').attr('x', x).attr('y', 12).attr('text-anchor', k === 0 ? 'start' : k === 2 ? 'end' : 'middle').style('font', 'italic 300 11px Fraunces, Georgia, serif').attr('fill', 'rgba(241,233,219,.62)').text(fmtShort(i)); svg.append('line').attr('x1', x).attr('x2', x).attr('y1', 18).attr('y2', VH).attr('stroke', 'rgba(241,233,219,.08)'); });
    LOOM_SP.forEach((s, j) => {
      const yl = top + j * rowH + 10, y = yl + 12, col = mutedOf(s), a = LOOM_C[j], mx = d3.max(a);
      svg.append('text').attr('x', L).attr('y', yl).style('font', '400 12.5px Fraunces, Georgia, serif').attr('fill', 'rgba(241,233,219,.85)').text(S[s].name);
      svg.append('line').attr('x1', L).attr('x2', GR).attr('y1', y).attr('y2', y).attr('stroke', col).attr('stroke-opacity', .25);
      a.forEach((c, i) => { if (!c) return;
        const b = svg.append('circle').attr('cx', L + (i + .5) * cw).attr('cy', y).attr('r', .9 + Math.sqrt(c / mx) * 1.9).attr('fill', col).attr('opacity', RM ? 1 : 0).style('transition', 'opacity .6s ease');
        beads.push({ node: b.node(), i }); });
    });
    loomNotes = NOTES_L.map(n => {
      const yl = top + n.row * rowH + 10;
      const g = svg.append('text').attr('x', GR).attr('y', yl).attr('text-anchor', 'end').style('font', 'italic 400 11px Fraunces, Georgia, serif').attr('fill', '#F0A77A').attr('opacity', RM ? 1 : 0).style('transition', 'opacity 1s ease').text(n.s);
      return { el: g.node(), col: n.col };
    });
    return;
  }
  const VW = 1000, LBL = 170, GR = 800, cw = (GR - LBL) / ND, rh = 19, VH = LOOM_SP.length * rh + 40;
  const svg = d3.select(el).append('svg').attr('class', 'ink').attr('viewBox', `0 0 ${VW} ${VH}`).attr('role', 'img').attr('aria-label', 'One thread per species with a bead for each day it was heard');
  [0, 15, 31, 46, 61].forEach(i => { svg.append('text').attr('x', LBL + (i + .5) * cw).attr('y', 12).attr('text-anchor', 'middle').style('font', 'italic 300 12px Fraunces, Georgia, serif').attr('fill', 'rgba(241,233,219,.6)').text(fmtShort(i)); svg.append('line').attr('x1', LBL + (i + .5) * cw).attr('x2', LBL + (i + .5) * cw).attr('y1', 20).attr('y2', VH).attr('stroke', 'rgba(241,233,219,.1)'); });
  LOOM_SP.forEach((s, j) => {
    const y = 32 + j * rh, col = mutedOf(s), a = LOOM_C[j], mx = d3.max(a);
    svg.append('text').attr('x', LBL - 14).attr('y', y).attr('dy', '.35em').attr('text-anchor', 'end').style('font', '400 12px Fraunces, Georgia, serif').attr('fill', 'rgba(241,233,219,.82)').text(S[s].name);
    svg.append('line').attr('x1', LBL).attr('x2', GR).attr('y1', y).attr('y2', y).attr('stroke', col).attr('stroke-opacity', .25);
    a.forEach((c, i) => {
      if (!c) return;
      const b = svg.append('circle').attr('cx', LBL + (i + .5) * cw).attr('cy', y).attr('r', 1.4 + Math.sqrt(c / mx) * 4.2).attr('fill', col).attr('opacity', RM ? 1 : 0).style('transition', 'opacity .6s ease')
        .on('pointermove', ev => showTip(`<b>${S[s].name}</b><br>${fmtShort(i)}: ${c} call${c > 1 ? 's' : ''}`, ev.clientX, ev.clientY)).on('pointerleave', hideTip);
      beads.push({ node: b.node(), i });
    });
  });
  loomNotes = NOTES_L.map(n => {
    const yv = 32 + n.row * rh, ny = yv + n.dy, nx = GR + 22;
    const g = svg.append('g').attr('opacity', RM ? 1 : 0).style('transition', 'opacity 1s ease');
    g.append('path').attr('d', `M${LBL + (n.col + .5) * cw},${yv} L${GR + 8},${yv} L${nx - 6},${ny}`).attr('fill', 'none').attr('stroke', 'rgba(241,233,219,.4)').attr('stroke-dasharray', '2 3');
    g.append('text').attr('x', nx).attr('y', ny - 4).style('font', '600 8.5px "Hanken Grotesk", sans-serif').style('letter-spacing', '.14em').attr('fill', '#F08A4B').text(n.h);
    n.t.forEach((line, k) => g.append('text').attr('x', nx).attr('y', ny + 9 + k * 12).style('font', 'italic 300 11px Fraunces, Georgia, serif').attr('fill', 'rgba(241,233,219,.9)').text(line));
    return { el: g.node(), col: n.col };
  });
}
export function updateLoom() {
  if (RM || !beads.length) return;
  const r = $('loom').getBoundingClientRect();
  const col = clamp01((innerHeight * .95 - r.top) / (innerHeight * .7)) * ND * 1.05;
  beads.forEach(b => { const on = b.i <= col; if (b.on !== on) { b.on = on; b.node.setAttribute('opacity', on ? 1 : 0); } });
  loomNotes.forEach(n => n.el.setAttribute('opacity', col > n.col + 4 ? 1 : 0));
}
