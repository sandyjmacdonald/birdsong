// Site-wide settings and the running order of sections.
// Section titles here drive both the contents list on the cover and the numbered headings.

export const SITE = {
  place: 'York',
  software: { name: 'BirdNET-Go', url: 'https://github.com/tphakala/birdnet-go' },
};

export const SECTIONS = [
  { id: 'chorus-sec', title: 'The chorus follows the sunrise' },
  { id: 'wake-sec', title: 'Who sings first?' },
  { id: 'listen-sec', title: 'Three songs' },
  { id: 'land-sec', title: 'The daily landscape' },
  { id: 'threads-sec', title: 'Comings and goings' },
  { id: 'wind-sec', title: 'Quiet in the wind' },
  { id: 'owls-sec', title: 'Night owls' },
  { id: 'index-sec', title: 'Fleeting calls' },
];

export const sectionNumber = id => SECTIONS.findIndex(s => s.id === id) + 1;
export const sectionTitle = id => SECTIONS.find(s => s.id === id)?.title ?? '';
