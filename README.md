# 7,266 bird songs

A season of garden birdsong in York, recorded and identified with [BirdNET-Go](https://github.com/tphakala/birdnet-go), presented as a printed magazine: halftone photographs, cut-paper pages and scroll-driven charts.

Built with [Astro](https://astro.build). The page is static HTML; the charts and the print effect run in the browser.

## Getting started

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install        # once
npm run dev        # live preview at http://localhost:4321, reloads as you edit
npm run build      # builds the finished site into dist/
npm run preview    # serves dist/ locally to check the build
```

## Deploying to Netlify

Either way, first set your site's address in `astro.config.mjs` (`site: 'https://your-name.netlify.app'`). It's only used to give the link-preview image a full URL.

**Connected to Git (recommended).** Put this folder in a GitHub repository, then in Netlify choose *Add new site → Import an existing project* and pick the repo. `netlify.toml` already tells Netlify how to build it. Every push then redeploys automatically.

**Drag and drop.** Run `npm run build`, then drag the `dist/` folder onto app.netlify.com/drop (or onto your site's *Deploys* page to update it).

## Where things live

```
src/
  pages/index.astro          The page, top to bottom. Reorder or remove sections here.
  site.config.js             Section titles (used in the contents list and headings), place name, BirdNET-Go link.
  components/sections/       One file per section: all the words on the page are here, as plain HTML.
  components/                Small shared pieces: photo credit, play icon, section number.
  layouts/Base.astro         <head>, fonts, link-preview tags, the ink filters used on text.
  styles/global.css          All styling.
  lib/stats.js               Numbers worked out from the data when the site is built (totals, the rare-species list).
  data/detections.json       The season's detections (generated, see below).
  data/weather.json          Hourly wind and rain (generated, see below).
  scripts/
    main.js                  Loads photos, builds every section, runs the scroll loop.
    story.js                 Data-specific annotations: chorus notes, thread notes, wind call-outs.
    lib/                     Shared data helpers, colours and tooltip.
    print/halftone.js        The print simulation (CMYK halftone, paper grain, fold) in WebGL.
    print/pages.js           Draws each section's background, cut-paper edge and shadow, then prints it.
    sections/                One file per chart or background, matching the components.
public/
  img/                       Photographs (credited on the page).
  audio/                     The three recordings and the dawn-chorus mix.
  spectrograms/              Printed spectrograms for "Three songs".
  preview.png                Link-preview image (1200 × 630).
scripts/
  prepare-data.mjs           Rebuilds the data files from your exports.
  clean-audio.sh             Filters traffic rumble out of a BirdNET-Go clip.
  make-spectrogram.py        Draws a spectrogram in the page's ink style.
```

## Common edits

**Change some words.** Open the section's file in `src/components/sections/` and edit the text. Section titles are in `src/site.config.js`.

**Swap a photograph.** Replace the file in `public/img/` with one of the same name (roughly 2000 px on the long side, JPEG). Update the photographer's name in the section's `<PhotoCredit name="…" />`. To use a different file name, change it in `PHOTO_FILES` in `src/scripts/print/pages.js`.

**Adjust the print effect.** Each section's strength is its `mix` value where it's set up in `src/scripts/sections/` (0 is a plain photo, 1 is full halftone). Dot size is the `pitch` in `renderPanel` in `src/scripts/print/pages.js`.

**Change colours.** Species colours are `HUE` (bright, for dark charts) and `MUTED` (for "Comings and goings") in `src/scripts/lib/data.js`.

## Updating with new data

1. **Export detections from Grafana.** From the detections table panel: *Inspect → Data → Download CSV*. Make sure Max data points is high enough to include everything. The CSV needs the columns Time, Confidence, Species, Model and Scientific name.

2. **Download matching weather (optional).** Open this in a browser, with your own dates. The start date must be the first day of your recordings:

   ```
   https://historical-forecast-api.open-meteo.com/v1/forecast?latitude=53.98&longitude=-1.11&start_date=2026-07-17&end_date=2026-09-22&hourly=temperature_2m,precipitation,wind_speed_10m,cloud_cover&timezone=Europe%2FLondon&format=csv
   ```

3. **Rebuild the data files:**

   ```bash
   npm run data -- --detections path/to/export.csv --weather path/to/open-meteo.csv
   ```

   Options: `--model BirdNET` (which model's detections to keep), `--lat 53.96 --lon -1.08` (for sunrise times), `--tz Europe/London`. Hooded Crow is merged into Carrion Crow; add more merges in `MERGE` at the top of the script. Rows where the species column holds a scientific name are relabelled automatically.

4. **Review the story.** Totals, the contents list, the rare-species list and most chart numbers update themselves. Written observations don't, so check these still match the new data:
   - `src/scripts/story.js`: the notes that appear under the chorus chart, the margin notes on "Comings and goings", and the two mornings called out on the wind chart.
   - Prose in `src/components/sections/`: especially "The shape of a day" (which species peak when), "After dark" (the owl counts and moon observation), the two pull quotes in `src/pages/index.astro`, and the small print in `Finale.astro`.

## New recordings for "Three songs"

```bash
./scripts/clean-audio.sh ~/Downloads/Blue_Tit_clip.mp3 public/audio/blue.mp3
python3 scripts/make-spectrogram.py public/audio/blue.mp3 public/spectrograms/blue.png
```

Then update the species, date and time in `src/components/sections/ThreeSongs.astro`. The dawn-chorus mix (`public/audio/chorus.mp3`) is a separate file; the playheads it drives are offset by the start times in `OFFS` in `src/scripts/sections/songs.js`.

## Credits

Photographs from Unsplash by Nastia Petruk, Ian C, Kabita Darlami, Jakub Kříž, Alessio Soggetti, Davide Sibilio, Flyd, Branimir Balogović, Jevgeni Fil, Albert Stoynov and Julian Rosner. Weather data from [Open-Meteo](https://open-meteo.com) (CC BY 4.0). Fonts: Fraunces and Hanken Grotesk, via Google Fonts.
