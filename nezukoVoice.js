// nezukoVoice.js — Nezuko Kamado voice/grunt pools (audio-only; ZERO gameplay effect).
//
// Nezuko canonically does NOT speak — she communicates in muffled grunts/mumbles through her bamboo muzzle.
// So there is NO transcribable dialogue: the 58 nezuko_grunt_*.mp3 clips carry no language content to pool by
// meaning. They are instead sorted by AUDIBLE CHARACTERISTICS (measured acoustic features: clip length,
// spectral brightness ≈ tone/pitch, crest ≈ sharpness, RMS ≈ intensity, envelope shape) as the reasonable
// substitute for content-based pooling. NOTE: this sort is FEATURE-DERIVED (the clips are peak-normalized and
// acoustically similar) — a principled approximation of "what the ear would sort by", not a per-clip auditory
// judgement. Filenames preserved exactly.
//
// pickNezukoVoice(pool) → ONE clip at random (Math.random), same shape as pickInosukeVoice/pickShinobuVoice.
//
// ── TRIGGER MAP (where each pool fires; same hooks as every other character) ──
//   intro       → battle-start reveal beat (game.js intro-voice dispatch)
//   combatBark  → ATTACKER lands a heavy / long string  (combat.applyNezukoOffenseVoice) — the taunt/connect bark
//   hitReact    → DEFENDER took a STRONG hit  (combat.applyNezukoHitVoice, strong branch) — sharp/bright grunts
//   hitGrunt    → DEFENDER took a LIGHT hit   (combat.applyNezukoHitVoice, light branch) — short exertion grunts
//   lowHealth   → once, crossing the low-HP threshold  (combat.applyNezukoLowHealthVoice) — softest/strained
//   win         → victory  (game.js win dispatch) — the longer vocalizations

export const NEZUKO_VOICE = {
  // INTRO — battle-start (medium, calmer-toned grunts)
  intro: [
    "nezuko_grunt_004.mp3",   // dur 0.83s · brightness 2507Hz
    "nezuko_grunt_008.mp3",   // dur 1.06s · brightness 2596Hz
    "nezuko_grunt_010.mp3",   // dur 0.80s · brightness 2589Hz
    "nezuko_grunt_011.mp3",   // dur 1.09s · brightness 2544Hz
    "nezuko_grunt_012.mp3",   // dur 1.00s · brightness 2538Hz
    "nezuko_grunt_015.mp3",   // dur 1.02s · brightness 2597Hz
  ],

  // OFFENSE / combat + taunt bark — attacker connect (medium effort grunts — workhorse pool)
  combatBark: [
    "nezuko_grunt_001.mp3",   // dur 1.18s · brightness 2383Hz
    "nezuko_grunt_002.mp3",   // dur 0.63s · brightness 2583Hz
    "nezuko_grunt_009.mp3",   // dur 0.69s · brightness 2804Hz
    "nezuko_grunt_013.mp3",   // dur 0.73s · brightness 2710Hz
    "nezuko_grunt_014.mp3",   // dur 0.68s · brightness 2648Hz
    "nezuko_grunt_022.mp3",   // dur 1.18s · brightness 3006Hz
    "nezuko_grunt_023.mp3",   // dur 0.80s · brightness 2317Hz
    "nezuko_grunt_024.mp3",   // dur 0.74s · brightness 2419Hz
    "nezuko_grunt_025.mp3",   // dur 1.14s · brightness 2423Hz
    "nezuko_grunt_028.mp3",   // dur 1.22s · brightness 2482Hz
    "nezuko_grunt_029.mp3",   // dur 0.69s · brightness 2854Hz
    "nezuko_grunt_030.mp3",   // dur 0.78s · brightness 2492Hz
    "nezuko_grunt_033.mp3",   // dur 0.68s · brightness 2375Hz
    "nezuko_grunt_037.mp3",   // dur 0.82s · brightness 3079Hz
    "nezuko_grunt_038.mp3",   // dur 0.87s · brightness 2682Hz
    "nezuko_grunt_043.mp3",   // dur 0.81s · brightness 3282Hz
    "nezuko_grunt_046.mp3",   // dur 0.84s · brightness 2225Hz
    "nezuko_grunt_047.mp3",   // dur 0.97s · brightness 2703Hz
    "nezuko_grunt_048.mp3",   // dur 0.93s · brightness 2606Hz
    "nezuko_grunt_050.mp3",   // dur 1.00s · brightness 2362Hz
    "nezuko_grunt_053.mp3",   // dur 1.12s · brightness 2791Hz
    "nezuko_grunt_054.mp3",   // dur 1.22s · brightness 2639Hz
  ],

  // HIT-REACTION (strong hit) — short + BRIGHT/sharp grunts (yelp)
  hitReact: [
    "nezuko_grunt_005.mp3",   // dur 0.46s · brightness 2855Hz
    "nezuko_grunt_006.mp3",   // dur 0.41s · brightness 2747Hz
    "nezuko_grunt_016.mp3",   // dur 0.59s · brightness 2903Hz
    "nezuko_grunt_017.mp3",   // dur 0.60s · brightness 2712Hz
    "nezuko_grunt_020.mp3",   // dur 0.30s · brightness 2936Hz
    "nezuko_grunt_032.mp3",   // dur 0.56s · brightness 2690Hz
    "nezuko_grunt_049.mp3",   // dur 0.59s · brightness 2698Hz
    "nezuko_grunt_055.mp3",   // dur 0.38s · brightness 2899Hz
    "nezuko_grunt_056.mp3",   // dur 0.47s · brightness 2880Hz
    "nezuko_grunt_057.mp3",   // dur 0.62s · brightness 3188Hz
  ],

  // LIGHT hit-reaction / minor exertion — short grunts
  hitGrunt: [
    "nezuko_grunt_003.mp3",   // dur 0.50s · brightness 2076Hz
    "nezuko_grunt_007.mp3",   // dur 0.52s · brightness 2448Hz
    "nezuko_grunt_018.mp3",   // dur 0.34s · brightness 2159Hz
    "nezuko_grunt_019.mp3",   // dur 0.48s · brightness 2154Hz
    "nezuko_grunt_031.mp3",   // dur 0.45s · brightness 2629Hz
    "nezuko_grunt_034.mp3",   // dur 0.59s · brightness 2309Hz
    "nezuko_grunt_035.mp3",   // dur 0.57s · brightness 2438Hz
    "nezuko_grunt_036.mp3",   // dur 0.60s · brightness 2570Hz
    "nezuko_grunt_051.mp3",   // dur 0.34s · brightness 2567Hz
  ],

  // LOW-HEALTH (once) — softest / strained grunts
  lowHealth: [
    "nezuko_grunt_041.mp3",   // dur 0.66s · brightness 3452Hz
    "nezuko_grunt_042.mp3",   // dur 0.61s · brightness 1986Hz
  ],

  // WIN / victory — the longer vocalizations (roar-length)
  win: [
    "nezuko_grunt_021.mp3",   // dur 2.22s · brightness 2702Hz
    "nezuko_grunt_026.mp3",   // dur 1.30s · brightness 2629Hz
    "nezuko_grunt_027.mp3",   // dur 1.31s · brightness 2683Hz
    "nezuko_grunt_039.mp3",   // dur 2.16s · brightness 2222Hz
    "nezuko_grunt_040.mp3",   // dur 1.41s · brightness 2437Hz
    "nezuko_grunt_044.mp3",   // dur 1.56s · brightness 3222Hz
    "nezuko_grunt_045.mp3",   // dur 1.79s · brightness 2558Hz
    "nezuko_grunt_052.mp3",   // dur 1.67s · brightness 2242Hz
    "nezuko_grunt_058.mp3",   // dur 1.29s · brightness 2518Hz
  ],
}

export function pickNezukoVoice(pool) {
  const arr = NEZUKO_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
