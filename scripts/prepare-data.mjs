#!/usr/bin/env node
// Rebuilds src/data/detections.json (and optionally src/data/weather.json) from raw exports.
//
//   npm run data -- --detections path/to/grafana-export.csv [--weather path/to/open-meteo.csv]
//
// Options (defaults in brackets):
//   --model BirdNET          which model's detections to keep ("Model" column)
//   --lat 53.96 --lon -1.08  where the recorder is, for sunrise/sunset
//   --tz Europe/London       time zone the export's times are in
//
// The Grafana CSV needs these columns: Time, Confidence, Species, Model, Scientific name.
// Times may be "22/09/2026 18:27:12" (Grafana's default) or ISO format.
import fs from 'node:fs';
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith('--') ? a.concat([[v.slice(2), all[i + 1]]]) : a), []));
if (!args.detections) { console.error('Usage: npm run data -- --detections export.csv [--weather open-meteo.csv]'); process.exit(1); }
const MODEL = args.model || 'BirdNET';
const LAT = +(args.lat ?? 53.96), LON = +(args.lon ?? -1.08), TZ = args.tz || 'Europe/London';

// Species to count together, and the scientific name to use for the merged species.
const MERGE = { 'Hooded Crow': { name: 'Carrion Crow', sci: 'Corvus corone' } };

// ---------- CSV ----------
function parseCSV(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.some(c => c !== '')) rows.push(row); row = []; }
    else cell += ch;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
function parseTime(s) {
  let m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})[ T](\d{2}):(\d{2}):(\d{2})/);
  if (m) return { date: `${m[3]}-${m[2]}-${m[1]}`, min: +m[4] * 60 + +m[5] + +m[6] / 60 };
  m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (m) return { date: `${m[1]}-${m[2]}-${m[3]}`, min: +m[4] * 60 + +m[5] + +(m[6] || 0) / 60 };
  throw new Error('Unrecognised time: ' + s);
}
const parseConf = s => { const v = parseFloat(String(s).replace('%', '')); return Math.round(v <= 1 && !String(s).includes('%') ? v * 100 : v); };

// ---------- sun (NOAA approximation) ----------
function tzOffsetMinutes(iso) { // minutes ahead of UTC on that date, e.g. 60 during British Summer Time
  const d = new Date(iso + 'T12:00:00Z');
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(d).map(p => [p.type, p.value]));
  const local = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute);
  return Math.round((local - d.getTime()) / 60000);
}
function sunTime(iso, rise, zenith = 90.833) {
  const d = new Date(iso + 'T00:00:00Z');
  const n = Math.round((d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 864e5) + 1;
  const g = 2 * Math.PI / 365 * (n - 1);
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  const rad = x => x * Math.PI / 180, deg = x => x * 180 / Math.PI;
  const ha = deg(Math.acos(Math.cos(rad(zenith)) / (Math.cos(rad(LAT)) * Math.cos(decl)) - Math.tan(rad(LAT)) * Math.tan(decl)));
  const utc = 720 - 4 * (LON + (rise ? ha : -ha)) - eq;
  return Math.round((utc + tzOffsetMinutes(iso)) * 10) / 10;
}

// ---------- detections ----------
const table = parseCSV(fs.readFileSync(args.detections, 'utf8'));
const head = table[0].map(h => h.trim().toLowerCase());
const col = name => { const i = head.indexOf(name.toLowerCase()); if (i < 0) throw new Error(`Missing column "${name}"`); return i; };
const iT = col('Time'), iC = col('Confidence'), iS = col('Species'), iM = col('Model'), iSci = col('Scientific name');
const all = table.slice(1);
let dets = all.filter(r => r[iM] === MODEL).map(r => ({ ...parseTime(r[iT]), c: parseConf(r[iC]), name: r[iS].trim(), sci: r[iSci].trim() }));

// Fix rows where the species column holds a scientific name instead of a common name.
const sciToName = {};
dets.forEach(d => { if (d.name !== d.sci) sciToName[d.sci] = d.name; });
let fixed = 0;
dets.forEach(d => {
  if (MERGE[d.name]) Object.assign(d, MERGE[d.name]);
  if (sciToName[d.name]) { d.name = MERGE[sciToName[d.name]]?.name || sciToName[d.name]; fixed++; }
});
dets.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.min - b.min));

const first = dets[0].date, last = dets[dets.length - 1].date;
const days = [];
for (let t = Date.parse(first + 'T12:00:00Z'); t <= Date.parse(last + 'T12:00:00Z'); t += 864e5) {
  const iso = new Date(t).toISOString().slice(0, 10);
  days.push({ date: iso, rise: sunTime(iso, true), set: sunTime(iso, false), dawn: sunTime(iso, true, 96), dusk: sunTime(iso, false, 96) });
}
const dayIdx = Object.fromEntries(days.map((d, i) => [d.date, i]));
const counts = {};
dets.forEach(d => { counts[d.name] = counts[d.name] || { name: d.name, sci: d.sci, n: 0 }; counts[d.name].n++; });
const species = Object.values(counts).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
const spIdx = Object.fromEntries(species.map((s, i) => [s.name, i]));
const det = [];
dets.forEach(d => det.push(dayIdx[d.date], Math.round(d.min * 100) / 100, spIdx[d.name], d.c));

const out = { species, days, det, totalRows: all.length, birdnet: dets.length };
fs.writeFileSync(path.resolve('src/data/detections.json'), JSON.stringify(out));
console.log(`detections.json: ${dets.length} ${MODEL} detections of ${species.length} species, ${first} to ${last} (${days.length} days).`);
console.log(`  ${all.length - dets.length} rows from other models left out; ${fixed} rows relabelled from scientific names.`);

// ---------- weather (optional) ----------
if (args.weather) {
  const lines = fs.readFileSync(args.weather, 'utf8').split(/\r?\n/);
  const hi = lines.findIndex(l => l.startsWith('time,'));
  const wt = parseCSV(lines.slice(hi).join('\n'));
  const h = wt[0], iw = h.findIndex(c => c.startsWith('wind_speed')), ir = h.findIndex(c => c.startsWith('precipitation'));
  const rowsW = wt.slice(1).filter(r => r[0]);
  if (!rowsW[0][0].startsWith(first)) console.warn(`  Warning: weather starts ${rowsW[0][0]}, but detections start ${first}. Download weather from ${first} 00:00.`);
  const weather = { start: rowsW[0][0], wind: rowsW.map(r => Math.round(+r[iw] * 10) / 10), rain: rowsW.map(r => Math.round(+r[ir] * 100) / 100) };
  fs.writeFileSync(path.resolve('src/data/weather.json'), JSON.stringify(weather));
  console.log(`weather.json: ${rowsW.length} hours from ${weather.start}.`);
}
