// Annotations that depend on this season's data.
// If you rebuild the site with new data, review these so they still match what happened.

// Notes that appear under the chorus chart as the season plays through.
export const CHORUS_NOTES = [
  { date: '2026-07-17', h: '17 JULY', t: 'Dawn breaks before 5am. Crows and woodpigeons are already calling.' },
  { date: '2026-07-23', h: '23 JULY', t: 'The busiest day of the season: 271 calls from 19 different species.' },
  { date: '2026-08-02', h: 'EARLY AUGUST', t: 'Most swifts fall silent as they depart southwards for warmer climes.' },
  { date: '2026-08-14', h: 'MID-AUGUST', t: 'Robins, silent while moulting, start to sing again. Look for the orange points.' },
  { date: '2026-09-06', h: '6 SEPTEMBER', t: 'The last woodpigeon of the summer.' },
  { date: '2026-09-19', h: '22 SEPTEMBER', t: 'Sunrise has slipped to near 7am, and the dawn chorus has followed it.' },
];

// Margin notes on the "Comings and goings" threads. `date` is where the leader line starts.
export const THREAD_NOTES = [
  { species: 'Common Woodpigeon', date: '2026-09-05', dy: -6, h: 'WOODPIGEONS', t: ['fall silent after', '6 September'], short: 'silent after 6 September' },
  { species: 'European Robin', date: '2026-08-14', dy: 22, h: 'ROBINS', t: ['quiet while moulting,', 'singing again from mid-August'], short: 'singing again from mid-August' },
  { species: 'Western House Martin', date: '2026-09-13', dy: -4, h: 'HOUSE MARTINS', t: ['linger until 13 September'], short: 'linger until 13 September' },
  { species: 'Common Swift', date: '2026-08-03', dy: 8, h: 'SWIFTS', t: ['flown south in early August'], short: 'flown south in early August' },
];

// The two mornings called out on the wind chart.
export const WIND_NOTES = [
  { date: '2026-09-13', text: '13 Sept: still, and loud', short: '13 Sept: still', below: false },
  { date: '2026-09-19', text: '19 Sept: windy, and quiet', short: '19 Sept: windy', below: true },
];
