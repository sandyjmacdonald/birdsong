// Numbers computed from the data at build time, so the page text always matches the data.
import DATA from '../data/detections.json';

const days = DATA.days;
const fmt = (iso, opts) => new Date(iso + 'T12:00:00').toLocaleDateString('en-GB', opts);
const nf = new Intl.NumberFormat('en-GB');

export const totalDetections = DATA.det.length / 4;
export const speciesCount = DATA.species.length;
export const dayCount = days.length;
export const excludedRows = DATA.totalRows - DATA.birdnet;
export const firstDay = fmt(days[0].date, { day: 'numeric', month: 'long' });
export const lastDay = fmt(days[days.length - 1].date, { day: 'numeric', month: 'long', year: 'numeric' });
export const n = v => nf.format(v);

// "Passing strangers": species heard three times or fewer, in order of first appearance.
export function rareSpecies(maxCalls = 3) {
  const obs = DATA.species.map(() => []);
  for (let i = 0; i < DATA.det.length; i += 4) obs[DATA.det[i + 2]].push({ d: DATA.det[i], m: DATA.det[i + 1], c: DATA.det[i + 3] });
  return DATA.species
    .map((s, i) => ({ ...s, obs: obs[i].sort((a, b) => a.d - b.d || a.m - b.m) }))
    .filter(s => s.n <= maxCalls)
    .sort((a, b) => (a.obs[0].d - b.obs[0].d) || (a.obs[0].m - b.obs[0].m))
    .map(s => {
      const best = Math.max(...s.obs.map(o => o.c));
      const f = Math.pow(Math.max(0, Math.min(1, (best - 60) / 40)), 1.4); // less sure = fainter name
      return {
        name: s.name, sci: s.sci,
        when: s.obs.map(o => fmt(days[o.d].date, { day: 'numeric', month: 'short' })).join(', '),
        sure: s.obs.map(o => o.c + '%').join(', '),
        fade: (0.34 + 0.66 * f).toFixed(2),
      };
    });
}
