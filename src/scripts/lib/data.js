// The season's detections, unpacked into easy-to-use rows, plus shared helpers and colours.
import * as d3 from 'd3';
import DATA from '../../data/detections.json';
import WEATHER_JSON from '../../data/weather.json';

export { d3 };
export const WEATHER = WEATHER_JSON;
export const S = DATA.species;           // [{ name, sci, n }], most-heard first
export const DAYS = DATA.days;           // [{ date, rise, set, dawn, dusk }] in local minutes after midnight
export const ND = DAYS.length;
export const TOTAL_ROWS = DATA.totalRows;
export const BIRDNET_ROWS = DATA.birdnet;

// rows: one per detection. d = day index, m = minute of day, s = species index, c = confidence (%)
export const rows = [];
for (let i = 0; i < DATA.det.length; i += 4) rows.push({ d: DATA.det[i], m: DATA.det[i + 1], s: DATA.det[i + 2], c: DATA.det[i + 3], k: i / 4 });
rows.sort((a, b) => a.d - b.d || a.m - b.m);
rows.forEach(r => { r.rel = r.m - DAYS[r.d].rise; r.t = r.d + r.m / 1440; });

export const dayIndex = iso => DAYS.findIndex(d => d.date === iso);
export const dateOf = i => new Date(DAYS[i].date + 'T12:00:00');
export const fmtLong = i => dateOf(i).toLocaleDateString('en-GB', { day: 'numeric', month: 'long' });
export const fmtShort = i => dateOf(i).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
export const short = n => n.replace(/^(Common|Eurasian|European|Western) /, '');
export const clamp01 = v => Math.max(0, Math.min(1, v));
export const jit = k => { const x = Math.sin(k * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
export function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

// Bright colours for the light-on-dark charts, muted ones for "Comings and goings".
export const HUE = {
  'Carrion Crow': '#DCE2EC', 'Common Woodpigeon': '#BBA8E6', 'Common Magpie': '#6FD6CB', 'European Robin': '#FF8B4A',
  'Eurasian Blue Tit': '#7FB3FF', 'Eurasian Jackdaw': '#A0B6D2', 'Dunnock': '#E0AD7E', 'Herring Gull': '#F79BBB',
  'Coal Tit': '#AAD68B', 'Great Tit': '#FFD66B',
};
export const MUTED = {
  'Carrion Crow': '#D2D4D8', 'Common Woodpigeon': '#A99DBE', 'Common Magpie': '#86B3AC', 'European Robin': '#D9916A',
  'Eurasian Blue Tit': '#94A9CE', 'Eurasian Jackdaw': '#A2AEBC', 'Dunnock': '#C2A488', 'Herring Gull': '#CFA3AE',
  'Coal Tit': '#A9BA92', 'Great Tit': '#D9C284',
};
export const hueOf = i => HUE[S[i].name] || '#958FA6';
export const mutedOf = i => MUTED[S[i].name] || '#98939F';
