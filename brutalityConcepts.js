// brutalityConcepts.js
// ─────────────────────────────────────────────────────────────────
// BRUTALITIES — canon-themed, personality-driven finishers. One entry per WINNER (keyed by rosterKey).
// When a match ends on a KO and the FINISH-window expires WITHOUT the player inputting a fatality, the winner's
// brutality plays automatically (MK-style). The cutaway is a self-contained fullscreen beat rendered by
// brutalityCinematic.js from the victim's live HURT sprite (or idle, per `base`) + a composition of reusable FX
// primitives. This file is DATA ONLY — no imports, no logic — so it stays trivially reviewable as it fills out
// across the 15 build phases (see brutality_work/PHASES.md).
//
// CONCEPT SCHEMA
//   banner      string   — the technique name stamped on the hold ("UNLIMITED VOID")
//   bannerRgb   "r,g,b"  — banner fill colour (default light); a contrasting drop-shadow is drawn automatically
//   base        "hurt"|"idle" — which victim sprite frame to show (default "hurt"; idle where the concept wants a
//                          clean standing pose, e.g. Gojo zooming in on the victim before the overload)
//   total       int      — length in frames @60fps (~140 ≈ 2.3s)
//   beats       [ { fx, t0, t1, ...params } ]  — ordered FX primitives; ARRAY ORDER = painter's draw order.
//                          `fx` names a primitive in brutalityCinematic.js PRIM{}. t0/t1 are the frame window;
//                          the primitive receives p = normalized progress 0..1 across [t0,t1].
//   sound       [ { t, id, gain?, ultBoom?, duckSec?, delay? } ] — SFX fired once when frame ≥ t (ids resolve
//                          through the existing JUICE / Sparking loader via sound.playJuiceSfx).
//
// Keys not present here have NO brutality yet → the finisher falls back to the existing gore engine / victory.
// ─────────────────────────────────────────────────────────────────

export const BRUTALITY_CONCEPTS = Object.freeze({

  // ── PHASE 1 — "UNLIMITED VOID" ────────────────────────────────────────────────────────────────
  // GOJO SATORU (JJK) — Domain Expansion: Unlimited Void. Gojo's domain is a SURE-HIT that forces infinite
  // information into the target's mind — they are frozen, flooded with the totality of existence, unable to
  // process a single action. Canon kill: not a cut, not a crush — a MIND broken by too much input, then the
  // body simply stops. So: the world inverts to the pale Void → we push in on the still victim → binary / the
  // kanji 無量空処 ("Unlimited Void") / equations pour into their skull → the overload peaks → the head bursts.
  gojo: {
    banner: "UNLIMITED VOID",
    bannerRgb: "28,40,66",
    base: "idle",
    choreographed: true,
    total: 196,
    beats: [
      { fx: "letterbox", t0: 0, t1: 196, in: 14, h: 0.13 },
      { fx: "whiteSpike", t0: 0, t1: 12 },                                      // the domain "clap"
      { fx: "voidInvert", t0: 4, t1: 196 },                                     // reality inverts to the pale Void
      // SHOT 1 — establish on the victim, Gojo at the edge of frame
      { fx: "cam",   t0: 0,  t1: 46, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.09 },
      { fx: "actor", t0: 8,  t1: 178, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 150, who: "atk", action: "idle", x: 0.82, y: 0.52, frame: "anim:12", facing: -1 },   // Gojo, hand raised
      // SHOT 2 — push in; infinite information floods the victim
      { fx: "cam",   t0: 46, t1: 150, zoom: 1.72, cx: 0.5, cy: 0.46, ease: 0.07 },
      { fx: "dataFlood", t0: 38, t1: 150, glyphs: "void", color: "#15284f" },
      // SHOT 3 — EXTREME close-up: overload → the mind breaks, head bursts
      { fx: "cam",   t0: 150, t1: 178, zoom: 2.0, cx: 0.5, cy: 0.47, cut: true },
      { fx: "whiteSpike", t0: 150, t1: 162 },
      { fx: "headPop", t0: 152, t1: 178, headY: 0.16 },
      { fx: "bloodGush", t0: 156, t1: 196, x: 0.5, y: 0.42, amount: 26 },
      // SHOT 4 — pull back: the victim collapses, Gojo lowers his hand → banner
      { fx: "cam",   t0: 178, t1: 196, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 178, t1: 196, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 178, t1: 196, who: "atk", action: "idle", x: 0.74, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 182, t1: 196 },
    ],
    sound: [
      { t: 1,   id: "boom_anticipation_suck", gain: 0.5 },
      { t: 38,  id: "charge_hum_rise",        gain: 0.62 },
      { t: 150, id: "boom_huge_01",           gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 157, id: "rumble_tail_01",         gain: 0.55, delay: 0.06 },
    ],
  },

  // ── CINEMATIC STYLE FLAGSHIP — SHISUI (Body Flicker) ───────────────────────────────────────────
  // The upgraded CHOREOGRAPHED style (choreographed:true → two-actor renderer + internal camera). Instead of
  // painting FX over one frozen victim frame, we STAGE both fighters' real animations across camera "shots":
  //   SHOT 1  zoom in on the victim (idle, nervous)
  //   SHOT 2  Shisui FLICKERS in (Body Flicker after-images) and strikes → the victim's HURT animation fires
  //   SHOT 3  Shisui blitzes around them — back and forth, multiple directions — each pass a slash (flickerRush)
  //   SHOT 4  a single big SWORD slash arc, tight zoom
  //   SHOT 5  blood pours, the victim collapses, Shisui stands over them → banner
  // Keyed to shisui_fallen (Body Flicker specialist). coords in beats are fractions of W/H → world px.
  shisui_fallen: {
    banner: "FLICKER MASSACRE",
    bannerRgb: "208,26,32",
    base: "hurt",
    choreographed: true,
    total: 204,
    beats: [
      { fx: "letterbox", t0: 0, t1: 204, in: 14, h: 0.13 },           // cinematic bars + vignette (MK framing)
      { fx: "darken", t0: 0, t1: 204, rgb: "10,3,6", max: 0.97, ramp: 8 },
      // SHOT 1 — slow establishing zoom on the victim
      { fx: "cam",   t0: 0,  t1: 48, zoom: 1.45, cx: 0.54, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 54, who: "vic", action: "idle", x: 0.54, y: 0.52, frame: "anim:10", facing: -1 },
      // SHOT 2 — Shisui flickers in, HARD CUT to the strike (tight) → victim HURT
      { fx: "flickerIn", t0: 34, t1: 54, action: "run", fromX: 0.92, toX: 0.62, y: 0.52, facing: -1, color: "rgba(208,26,32,0.55)" },
      { fx: "cam",   t0: 50, t1: 66, zoom: 2.0, cx: 0.54, cy: 0.46, cut: true },
      { fx: "actor", t0: 50, t1: 72, who: "atk", action: "heavy", x: 0.62, y: 0.5, frame: "once:3", facing: -1 },
      { fx: "whiteSpike", t0: 52, t1: 62 },
      { fx: "actor", t0: 52, t1: 168, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "bloodGush", t0: 56, t1: 168, x: 0.5, y: 0.46, amount: 12 },
      // SHOT 3 — pull back for the blitz: Shisui blitzes around, multiple directions
      { fx: "cam",   t0: 66, t1: 124, zoom: 1.28, cx: 0.52, cy: 0.47, ease: 0.1 },
      { fx: "flickerRush", t0: 68, t1: 124, action: "run", around: 0.52, aroundY: 0.48, count: 9, radX: 0.25, radY: 0.13, color: "#d0202a" },
      { fx: "speedLines", t0: 68, t1: 124, color: "rgba(230,120,120,0.45)" },
      { fx: "bloodGush", t0: 74, t1: 168, x: 0.52, y: 0.52, amount: 7 },
      // SHOT 4 — HARD CUT to the sword windup (tight)
      { fx: "cam",   t0: 124, t1: 150, zoom: 1.75, cx: 0.52, cy: 0.46, cut: true },
      { fx: "actor", t0: 124, t1: 150, who: "atk", action: "heavy", x: 0.42, y: 0.49, frame: "once:3", facing: 1 },
      { fx: "swordSlash", t0: 128, t1: 150, x: 0.55, y: 0.46, len: 0.28, angle: -2.4, sweep: 2.8, color: "#ffffff" },
      { fx: "whiteSpike", t0: 134, t1: 146 },
      // SHOT 5 — EXTREME CLOSE-UP on the cut, blood ERUPTS
      { fx: "cam",   t0: 150, t1: 178, zoom: 2.7, cx: 0.53, cy: 0.43, cut: true },
      { fx: "whiteSpike", t0: 150, t1: 158 },
      { fx: "actor", t0: 150, t1: 178, who: "vic", action: "hurt", x: 0.52, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "bloodGush", t0: 150, t1: 204, x: 0.54, y: 0.44, amount: 48 },
      // SHOT 6 — pull back: the victim collapses, Shisui stands over → banner
      { fx: "cam",   t0: 178, t1: 204, zoom: 1.35, cx: 0.52, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 178, t1: 204, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.49, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 180, t1: 204, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 184, t1: 204 },
    ],
    sound: [
      { t: 1,   id: "boom_anticipation_suck", gain: 0.45 },
      { t: 50,  id: "crack_sizzle_bright",    gain: 0.5 },
      { t: 68,  id: "warp_wobble_01",         gain: 0.5 },
      { t: 128, id: "swish_fast_01",          gain: 0.6 },
      { t: 150, id: "boom_huge_01",           gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 156, id: "rumble_tail_01",         gain: 0.55, delay: 0.05 },
    ],
  },

  // ── PHASE 2 — CURSED ENERGY (JJK) ──────────────────────────────────────────────────────────────
  // Batch 2A "The Curses": sukuna · alt_sukuna · yuta · yuji

  // SUKUNA (King of Curses) — Domain Expansion: Malevolent Shrine. An open-barrier domain, a skeletal Buddhist
  // shrine whose guaranteed Dismantle/Cleave slashes flay everything in range. Cruel, bored, absolute. The victim
  // is caught in the cutting space → a lattice of invisible slashes dices them → the pieces simply fall apart.
  sukuna: {
    banner: "MALEVOLENT SHRINE",
    bannerRgb: "235,32,38",
    base: "hurt",
    choreographed: true,
    total: 188,
    beats: [
      { fx: "letterbox", t0: 0, t1: 188, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 188, rgb: "20,2,6", max: 0.97, ramp: 10 },
      { fx: "shrineBg",  t0: 6, t1: 188 },
      // SHOT 1 — establish; Sukuna looms, contemptuous
      { fx: "cam",   t0: 0,  t1: 46, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.09 },
      { fx: "actor", t0: 6,  t1: 120, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 16, t1: 120, who: "atk", action: "idle", x: 0.82, y: 0.52, frame: "anim:12", facing: -1 },
      // SHOT 2 — the shrine's slashes flay the victim
      { fx: "cam",   t0: 46, t1: 118, zoom: 1.55, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "slashCross", t0: 50, t1: 118, count: 20, color: "#ff2b36" },
      { fx: "bloodGush", t0: 60, t1: 188, x: 0.5, y: 0.46, amount: 10 },
      // SHOT 3 — HARD CUT, EXTREME close-up → DICED apart
      { fx: "cam",   t0: 118, t1: 160, zoom: 1.95, cx: 0.5, cy: 0.47, cut: true },
      { fx: "whiteSpike", t0: 118, t1: 130 },
      { fx: "shatter", t0: 122, t1: 170, cols: 5, rows: 7, spread: 1.0 },
      // SHOT 4 — pull back: Sukuna stands over the remains → banner
      { fx: "cam",   t0: 160, t1: 188, zoom: 1.4, cx: 0.5, cy: 0.5, ease: 0.1 },
      { fx: "actor", t0: 162, t1: 188, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 166, t1: 188 },
    ],
    sound: [
      { t: 1,   id: "boom_anticipation_suck", gain: 0.5 },
      { t: 50,  id: "crack_sizzle_bright",    gain: 0.5 },
      { t: 118, id: "boom_huge_01",           gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 124, id: "rumble_tail_01",         gain: 0.5 },
    ],
  },

  // ALT SUKUNA (Heian-era, the Disgraced One) — in his true four-armed power he answers with FIRE: the flame
  // technique Fūga, a concentrated arrow of black-red flame that reduces the target to cinders. Distinct from
  // modern Sukuna's shrine-dicing — here the body simply burns away to ash.
  alt_sukuna: {
    banner: "FLAME ARROW",
    bannerRgb: "255,140,40",
    base: "hurt",
    choreographed: true,
    total: 184,
    beats: [
      { fx: "letterbox", t0: 0, t1: 184, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 184, rgb: "24,6,2", max: 0.97, ramp: 10 },
      // SHOT 1 — establish; the Disgraced One raises a hand
      { fx: "cam",   t0: 0,  t1: 46, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.09 },
      { fx: "actor", t0: 6,  t1: 184, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 16, t1: 122, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      // SHOT 2 — the flame arrow lances in
      { fx: "cam",   t0: 46, t1: 118, zoom: 1.62, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "flameBeam", t0: 60, t1: 122, color: "#ff7a1e" },
      // SHOT 3 — HARD CUT, EXTREME close-up → incinerated to ash
      { fx: "cam",   t0: 120, t1: 162, zoom: 2.2, cx: 0.5, cy: 0.47, cut: true },
      { fx: "whiteSpike", t0: 118, t1: 130 },
      { fx: "incinerate", t0: 122, t1: 176, color: "#ff7a1e" },
      // SHOT 4 — pull back → banner
      { fx: "cam",   t0: 162, t1: 184, zoom: 1.4, cx: 0.5, cy: 0.5, ease: 0.1 },
      { fx: "actor", t0: 164, t1: 184, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 166, t1: 184 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise",        gain: 0.55 },
      { t: 60,  id: "boom_anticipation_suck", gain: 0.4 },
      { t: 118, id: "boom_huge_02_roar",      gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 124, id: "rumble_tail_01",         gain: 0.5 },
    ],
  },

  // YUTA OKKOTSU (Special Grade) — Rika, his bound "queen of curses," manifests as a towering monster. The maw
  // descends and snaps shut over the victim — devoured by a love that never let go. "PURE LOVE."
  yuta: {
    banner: "RIKA",
    bannerRgb: "186,46,228",
    base: "hurt",
    choreographed: true,
    total: 188,
    beats: [
      { fx: "letterbox", t0: 0, t1: 188, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 188, rgb: "10,2,16", max: 0.97, ramp: 10 },
      // SHOT 1 — establish; Yuta steps up
      { fx: "cam",   t0: 0,  t1: 46, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.09 },
      { fx: "actor", t0: 6,  t1: 176, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 16, t1: 120, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      // SHOT 2 — Rika's maw descends & snaps shut over the victim
      { fx: "cam",   t0: 46, t1: 150, zoom: 1.58, cx: 0.5, cy: 0.46, ease: 0.07 },
      { fx: "maw",   t0: 50, t1: 150, color: "#b42edc" },
      // SHOT 3 — HARD CUT, EXTREME close-up → devoured
      { fx: "cam",   t0: 150, t1: 176, zoom: 2.0, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 150, t1: 162 },
      { fx: "headPop", t0: 152, t1: 176, headY: 0.26 },
      { fx: "bloodGush", t0: 156, t1: 188, x: 0.5, y: 0.46, amount: 30 },
      // SHOT 4 — pull back: collapse, Yuta stands → banner
      { fx: "cam",   t0: 176, t1: 188, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 176, t1: 188, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 176, t1: 188, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 180, t1: 188 },
    ],
    sound: [
      { t: 1,   id: "boom_anticipation_suck", gain: 0.5 },
      { t: 50,  id: "warp_wobble_01",         gain: 0.5 },
      { t: 150, id: "boom_huge_02_roar",      gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 156, id: "rumble_tail_01",         gain: 0.6 },
    ],
  },

  // YUJI ITADORI (Sukuna's vessel) — BLACK FLASH: cursed energy applied within 0.000001s of impact distorts
  // space for 2.5× force (a black star wreathed in red lightning), chained into a Divergent Fist second impact.
  // The kind kid hits like a freight train — the torso simply caves.
  yuji: {
    banner: "BLACK FLASH",
    bannerRgb: "232,32,62",
    base: "hurt",
    total: 132,
    beats: [
      { fx: "darken",     t0: 0,  t1: 132, rgb: "2,2,6", max: 0.97, ramp: 8 },
      { fx: "sprite",     t0: 6,  t1: 132, from: 1.0, to: 1.0, anchor: 0.56, tremble: 2 },
      { fx: "blackFlash", t0: 40, t1: 74, headY: 0.45 },
      { fx: "whiteSpike", t0: 48, t1: 58 },
      { fx: "blackFlash", t0: 66, t1: 96, headY: 0.45 },
      { fx: "headPop",    t0: 70, t1: 120, headY: 0.45 },
      { fx: "banner",     t0: 96, t1: 132 },
    ],
    sound: [
      { t: 1,  id: "charge_hum_rise", gain: 0.45 },
      { t: 40, id: "boom_huge_01",    gain: 0.9, ultBoom: true, duckSec: 0.4 },
      { t: 66, id: "boom_huge_01",    gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 72, id: "rumble_tail_01",  gain: 0.5 },
    ],
  },

  // Batch 2B "The Sorcerer-Killers": toji · maki · naoya · aoi_todo

  // TOJI FUSHIGURO (the Sorcerer Killer) — Heavenly Restriction: ZERO cursed energy, a monstrously honed body +
  // cursed tools. Cold, efficient, mercenary. The Inverted Spear of Heaven punches clean through — no flash, no
  // aura, just steel and blood. The most physical kill in the cast.
  toji: {
    banner: "INVERTED SPEAR",
    bannerRgb: "205,214,228",
    base: "hurt",
    total: 126,
    beats: [
      { fx: "darken",     t0: 0,  t1: 126, rgb: "6,8,12", max: 0.96, ramp: 8 },
      { fx: "sprite",     t0: 8,  t1: 126, from: 1.0, to: 1.0, anchor: 0.56 },
      { fx: "impale",     t0: 34, t1: 96, color: "#cfd8e6", headY: 0.42 },
      { fx: "whiteSpike", t0: 40, t1: 50 },
      { fx: "headPop",    t0: 62, t1: 108, headY: 0.42 },
      { fx: "banner",     t0: 90, t1: 126 },
    ],
    sound: [
      { t: 1,  id: "swish_fast_01",  gain: 0.5 },
      { t: 34, id: "impact_hit_01",  gain: 0.7 },
      { t: 40, id: "boom_medium_02", gain: 0.9, ultBoom: true, duckSec: 0.4 },
      { t: 64, id: "rumble_tail_01", gain: 0.45 },
    ],
  },

  // MAKI ZENIN — after awakening her own Heavenly Restriction she wields cursed tools at superhuman level. The
  // Split Soul Katana cuts the SOUL as well as the body: a single clean stroke bisects the victim as a white
  // soul-flash tears free. Fierce, disciplined, vengeful (she razed the Zenin clan).
  maki: {
    banner: "SPLIT SOUL",
    bannerRgb: "222,228,238",
    base: "hurt",
    total: 126,
    beats: [
      { fx: "darken",     t0: 0,  t1: 126, rgb: "8,8,10", max: 0.96, ramp: 8 },
      { fx: "sprite",     t0: 8,  t1: 60, from: 1.0, to: 1.0, anchor: 0.56 },
      { fx: "slashCross", t0: 34, t1: 58, count: 4, color: "#dfe6f2" },
      { fx: "whiteSpike", t0: 54, t1: 66 },
      { fx: "soulSplit",  t0: 58, t1: 118 },
      { fx: "banner",     t0: 90, t1: 126 },
    ],
    sound: [
      { t: 1,  id: "boom_anticipation_suck", gain: 0.4 },
      { t: 34, id: "swish_fast_01",          gain: 0.55 },
      { t: 54, id: "boom_medium_02",         gain: 0.9, ultBoom: true, duckSec: 0.45 },
      { t: 60, id: "rumble_tail_01",         gain: 0.45 },
    ],
  },

  // NAOYA ZENIN — Projection Sorcery: divides a second into 24 animation frames; touch his drawn frames out of
  // sequence and you're frozen for one full second. Arrogant, cruel, obsessed with speed. The victim locks up as
  // reality stutters into frames and 24 hits land in the blink of an instant.
  naoya: {
    banner: "PROJECTION SORCERY",
    bannerRgb: "255,190,60",
    base: "hurt",
    total: 132,
    beats: [
      { fx: "darken",       t0: 0,  t1: 132, rgb: "10,8,2", max: 0.96, ramp: 8 },
      { fx: "sprite",       t0: 8,  t1: 132, from: 1.0, to: 1.0, anchor: 0.56 },
      { fx: "frameFlicker", t0: 30, t1: 100, color: "#ffbe3c" },
      { fx: "whiteSpike",   t0: 92, t1: 102 },
      { fx: "headPop",      t0: 96, t1: 126, headY: 0.45 },
      { fx: "banner",       t0: 100, t1: 132 },
    ],
    sound: [
      { t: 1,  id: "charge_hum_rise", gain: 0.4 },
      { t: 30, id: "warp_wobble_01",  gain: 0.5 },
      { t: 92, id: "boom_huge_01",    gain: 0.95, ultBoom: true, duckSec: 0.5 },
      { t: 98, id: "rumble_tail_01",  gain: 0.5 },
    ],
  },

  // AOI TODO — Boogie Woogie: a clap swaps the positions of anything with cursed energy. Loud, eccentric, utterly
  // devoted to his "best friend." He blinks the victim around in a disorienting shuffle, then lands one colossal
  // haymaker that ends it.
  aoi_todo: {
    banner: "BOOGIE WOOGIE",
    bannerRgb: "90,200,255",
    base: "hurt",
    total: 130,
    beats: [
      { fx: "darken",     t0: 0,  t1: 130, rgb: "4,10,16", max: 0.96, ramp: 8 },
      { fx: "sprite",     t0: 8,  t1: 130, from: 1.0, to: 1.0, anchor: 0.56 },
      { fx: "boogie",     t0: 28, t1: 92, color: "#5ac8ff" },
      { fx: "whiteSpike", t0: 84, t1: 96 },
      { fx: "headPop",    t0: 88, t1: 122, headY: 0.45 },
      { fx: "banner",     t0: 94, t1: 130 },
    ],
    sound: [
      { t: 1,  id: "boom_anticipation_suck", gain: 0.4 },
      { t: 28, id: "warp_wobble_01",         gain: 0.5 },
      { t: 60, id: "warp_wobble_01",         gain: 0.4 },
      { t: 84, id: "boom_huge_01",           gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 90, id: "rumble_tail_01",         gain: 0.5 },
    ],
  },

})

export default BRUTALITY_CONCEPTS
