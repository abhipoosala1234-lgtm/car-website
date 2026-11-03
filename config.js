/**
 * NOCTIS — Configuration & Scrollytelling Settings
 * Fictional Electric Car Brand
 * All section heights, chapter ranges, frame counts, frame paths, and callout coordinates.
 */

window.NOCTIS_CONFIG = {
  // Brand tokens & colors
  theme: {
    asphalt: '#07080A',
    graphite: '#121418',
    fog: '#8A8F98',
    bone: '#EDEAE4',
    xenon: '#CFE3FF',
    taillight: '#E1251B',
    hairline: 'rgba(237, 234, 228, 0.12)',
    easing: 'cubic-bezier(0.16, 1, 0.3, 1)'
  },

  // Section 1: Hero scrollytelling
  hero: {
    height: '600vh',
    frameCount: 574,
    desktopPath: 'assets/frames/hero/frame_',
    mobilePath: 'assets/frames/hero-mobile/frame_',
    extension: '.webp',
    padDigits: 4,
    initialPreloadCount: 40,
    speedRange: [0, 118], // km/h
    distanceRange: [0.0, 4.2], // km
    fadeToBlackRange: [0.95, 1.0],
    chapters: [
      {
        id: 'chapter-1',
        index: '01/04',
        start: 0.0,
        end: 0.12,
        title: 'NOCTIS',
        subtitle: 'The city is asleep.',
        hint: 'SCROLL TO WAKE IT'
      },
      {
        id: 'chapter-2',
        index: '02/04',
        start: 0.22,
        end: 0.40,
        statement: "It doesn't need the city's light."
      },
      {
        id: 'chapter-3',
        index: '03/04',
        start: 0.50,
        end: 0.68,
        statement: 'It brings its own.'
      },
      {
        id: 'chapter-4',
        index: '04/04',
        start: 0.80,
        end: 1.0,
        title: 'GT-E',
        specs: '0–100 KM/H 3.1S · 640 KM RANGE · DUAL MOTOR',
        cta: 'Discover the GT-E',
        ctaLink: '#lineup'
      }
    ]
  },

  // Section 2: Statement
  statement: {
    label: '02 — ENGINEERING',
    text: 'Every part was designed to disappear into one line of light.'
  },

  // Section 3: Dismantle scrollytelling
  dismantle: {
    height: '350vh',
    frameCount: 192,
    desktopPath: 'assets/frames/dismantle/frame_',
    mobilePath: 'assets/frames/dismantle-mobile/frame_',
    extension: '.webp',
    padDigits: 4,
    title: 'Look closer.',
    calloutsStart: 0.70,
    // Callouts positioned on the exploded car view (percentage of canvas width/height)
    callouts: [
      {
        id: 'body',
        code: 'BODY',
        title: 'Carbon composite monocoque',
        start: 0.72,
        end: 1.0,
        x: 48, // % from left of canvas
        y: 28, // % from top of canvas
        align: 'left'
      },
      {
        id: 'battery',
        code: 'BATTERY',
        title: '110 kWh structural pack',
        start: 0.78,
        end: 1.0,
        x: 52,
        y: 68,
        align: 'right'
      },
      {
        id: 'drive',
        code: 'DRIVE',
        title: 'Dual axial-flux motors, 680 kW',
        start: 0.84,
        end: 1.0,
        x: 24,
        y: 64,
        align: 'left'
      },
      {
        id: 'light',
        code: 'LIGHT',
        title: 'Single-line LED signature',
        start: 0.90,
        end: 1.0,
        x: 15,
        y: 47,
        align: 'left'
      }
    ]
  },

  // Section 4: Lineup accordion
  lineup: {
    label: '03 — THE LINEUP',
    heading: 'Five ways to drive the night.',
    cars: [
      {
        id: 'gt-e',
        num: '01',
        name: 'GT-E',
        tagline: 'The grand tourer.',
        specs: {
          range: '640 km',
          accel: '3.1 s',
          power: '680 kW'
        },
        image: 'assets/cars/gt-e.webp',
        alt: 'NOCTIS GT-E matte graphite electric grand tourer coupe side profile',
        swatches: ['#121418', '#EDEAE4', '#07080A', '#1E2530'],
        activeSwatch: 0
      },
      {
        id: 's',
        num: '02',
        name: 'S',
        tagline: 'Four doors, no compromise.',
        specs: {
          range: '600 km',
          accel: '3.6 s',
          power: '520 kW'
        },
        image: 'assets/cars/s.webp',
        alt: 'NOCTIS Model S satin bone white luxury electric sport sedan side profile',
        swatches: ['#EDEAE4', '#121418', '#1E2530', '#8A8F98'],
        activeSwatch: 0
      },
      {
        id: 'x',
        num: '03',
        name: 'X',
        tagline: 'Higher, never heavier.',
        specs: {
          range: '560 km',
          accel: '4.2 s',
          power: '480 kW'
        },
        image: 'assets/cars/x.webp',
        alt: 'NOCTIS Model X midnight blue aerodynamic coupe-SUV side profile',
        swatches: ['#0B1B2B', '#121418', '#EDEAE4', '#333D48'],
        activeSwatch: 0
      },
      {
        id: 'r',
        num: '04',
        name: 'R',
        tagline: 'Built for the track.',
        specs: {
          range: '420 km',
          accel: '2.4 s',
          power: '900 kW'
        },
        image: 'assets/cars/r.webp',
        alt: 'NOCTIS Model R satin black track coupe with fixed rear wing side profile',
        swatches: ['#07080A', '#121418', '#E1251B', '#EDEAE4'],
        activeSwatch: 0
      },
      {
        id: 'one',
        num: '05',
        name: 'ONE',
        tagline: 'The future, early.',
        specs: {
          range: 'Concept',
          accel: 'Concept',
          power: 'Concept'
        },
        image: 'assets/cars/one.webp',
        alt: 'NOCTIS Model ONE liquid silver concept hypercar side profile',
        swatches: ['#D0D5DD', '#121418', '#07080A', '#CFE3FF'],
        activeSwatch: 0
      }
    ]
  },

  // Section 5: Reserve
  reserve: {
    headline: 'Drive the night.',
    body: 'Limited initial allocation. Deliveries commence late 2026.',
    buttonText: 'RESERVE YOUR NOCTIS'
  }
};
