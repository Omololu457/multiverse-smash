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
    choreographed: true,
    total: 172,
    beats: [
      { fx: "letterbox", t0: 0, t1: 172, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 172, rgb: "2,2,6", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 42, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 50, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      // SHOT 2 — Yuji flickers in, HARD CUT to the Black Flash strike
      { fx: "flickerIn", t0: 28, t1: 48, action: "run", fromX: 0.9, toX: 0.6, y: 0.52, facing: -1, color: "rgba(40,40,60,0.55)" },
      { fx: "cam",   t0: 46, t1: 112, zoom: 1.9, cx: 0.52, cy: 0.47, cut: true },
      { fx: "actor", t0: 46, t1: 70, who: "atk", action: "heavy", x: 0.62, y: 0.5, frame: "once:3", facing: -1 },
      { fx: "actor", t0: 48, t1: 150, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "blackFlash", t0: 48, t1: 82, headY: 0.45 },
      { fx: "whiteSpike", t0: 48, t1: 58 },
      { fx: "bloodGush", t0: 52, t1: 150, x: 0.5, y: 0.48, amount: 10 },
      // SHOT 3 — Divergent Fist, the second impact
      { fx: "actor", t0: 82, t1: 106, who: "atk", action: "heavy", x: 0.62, y: 0.5, frame: "once:3", facing: -1 },
      { fx: "blackFlash", t0: 84, t1: 114, headY: 0.45 },
      { fx: "whiteSpike", t0: 86, t1: 96 },
      // SHOT 4 — EXTREME close-up: the torso caves
      { fx: "cam",   t0: 116, t1: 150, zoom: 2.15, cx: 0.5, cy: 0.47, cut: true },
      { fx: "whiteSpike", t0: 116, t1: 126 },
      { fx: "headPop", t0: 118, t1: 150, headY: 0.45 },
      { fx: "bloodGush", t0: 118, t1: 172, x: 0.5, y: 0.47, amount: 34 },
      // SHOT 5 — pull back: collapse, Yuji stands → banner
      { fx: "cam",   t0: 150, t1: 172, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 150, t1: 172, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 152, t1: 172, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 156, t1: 172 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise", gain: 0.45 },
      { t: 48,  id: "boom_huge_01",    gain: 0.9, ultBoom: true, duckSec: 0.4 },
      { t: 84,  id: "boom_huge_01",    gain: 0.95, ultBoom: true, duckSec: 0.45 },
      { t: 116, id: "boom_huge_01",    gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 122, id: "rumble_tail_01",  gain: 0.5 },
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
    choreographed: true,
    total: 172,
    beats: [
      { fx: "letterbox", t0: 0, t1: 172, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 172, rgb: "6,8,12", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 52, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      // SHOT 2 — Toji dashes in (no aura, pure speed) and runs the Inverted Spear through
      { fx: "flickerIn", t0: 26, t1: 46, action: "run", fromX: 0.9, toX: 0.6, y: 0.52, facing: -1, color: "rgba(180,190,205,0.4)" },
      { fx: "cam",   t0: 44, t1: 116, zoom: 1.85, cx: 0.52, cy: 0.46, cut: true },
      { fx: "actor", t0: 44, t1: 148, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "actor", t0: 44, t1: 70, who: "atk", action: "heavy", x: 0.64, y: 0.5, frame: "once:3", facing: -1 },
      { fx: "impale", t0: 50, t1: 116, color: "#cfd8e6", headY: 0.42 },
      { fx: "whiteSpike", t0: 52, t1: 62 },
      { fx: "bloodGush", t0: 60, t1: 172, x: 0.5, y: 0.46, amount: 12 },
      // SHOT 3 — EXTREME close-up on the impaled wound
      { fx: "cam",   t0: 116, t1: 148, zoom: 2.2, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 116, t1: 126 },
      { fx: "headPop", t0: 118, t1: 148, headY: 0.42 },
      { fx: "bloodGush", t0: 118, t1: 172, x: 0.5, y: 0.46, amount: 30 },
      // SHOT 4 — pull back: collapse, Toji turns away → banner
      { fx: "cam",   t0: 148, t1: 172, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 148, t1: 172, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 150, t1: 172, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 154, t1: 172 },
    ],
    sound: [
      { t: 1,   id: "swish_fast_01",  gain: 0.5 },
      { t: 50,  id: "impact_hit_01",  gain: 0.7 },
      { t: 52,  id: "boom_medium_02", gain: 0.9, ultBoom: true, duckSec: 0.4 },
      { t: 116, id: "boom_huge_01",   gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 122, id: "rumble_tail_01", gain: 0.45 },
    ],
  },

  // MAKI ZENIN — after awakening her own Heavenly Restriction she wields cursed tools at superhuman level. The
  // Split Soul Katana cuts the SOUL as well as the body: a single clean stroke bisects the victim as a white
  // soul-flash tears free. Fierce, disciplined, vengeful (she razed the Zenin clan).
  maki: {
    banner: "SPLIT SOUL",
    bannerRgb: "222,228,238",
    base: "hurt",
    choreographed: true,
    total: 166,
    beats: [
      { fx: "letterbox", t0: 0, t1: 166, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 166, rgb: "8,8,10", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 100, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      // SHOT 2 — Maki dashes in; a few precise cursed-tool cuts
      { fx: "flickerIn", t0: 26, t1: 46, action: "run", fromX: 0.9, toX: 0.6, y: 0.52, facing: -1, color: "rgba(200,210,225,0.4)" },
      { fx: "cam",   t0: 44, t1: 100, zoom: 1.8, cx: 0.52, cy: 0.46, cut: true },
      { fx: "actor", t0: 44, t1: 70, who: "atk", action: "heavy", x: 0.64, y: 0.5, frame: "once:3", facing: -1 },
      { fx: "slashCross", t0: 50, t1: 96, count: 5, color: "#dfe6f2" },
      { fx: "whiteSpike", t0: 92, t1: 104 },
      // SHOT 3 — EXTREME close-up: the Split Soul stroke bisects body AND soul
      { fx: "cam",   t0: 100, t1: 144, zoom: 2.0, cx: 0.5, cy: 0.47, cut: true },
      { fx: "soulSplit", t0: 100, t1: 158 },
      { fx: "bloodGush", t0: 104, t1: 166, x: 0.5, y: 0.5, amount: 16 },
      // SHOT 4 — pull back: Maki lowers the blade → banner
      { fx: "cam",   t0: 144, t1: 166, zoom: 1.4, cx: 0.5, cy: 0.52, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 166, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 150, t1: 166 },
    ],
    sound: [
      { t: 1,   id: "boom_anticipation_suck", gain: 0.4 },
      { t: 50,  id: "swish_fast_01",          gain: 0.55 },
      { t: 100, id: "boom_medium_02",         gain: 1.0, ultBoom: true, duckSec: 0.45 },
      { t: 106, id: "rumble_tail_01",         gain: 0.45 },
    ],
  },

  // NAOYA ZENIN — Projection Sorcery: divides a second into 24 animation frames; touch his drawn frames out of
  // sequence and you're frozen for one full second. Arrogant, cruel, obsessed with speed. The victim locks up as
  // reality stutters into frames and 24 hits land in the blink of an instant.
  naoya: {
    banner: "PROJECTION SORCERY",
    bannerRgb: "255,190,60",
    base: "hurt",
    choreographed: true,
    total: 180,
    beats: [
      { fx: "letterbox", t0: 0, t1: 180, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 180, rgb: "10,8,2", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 56, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      // SHOT 2 — Naoya blitzes at 24fps: after-images + the frame-trap lattice
      { fx: "cam",   t0: 46, t1: 120, zoom: 1.5, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "flickerRush", t0: 50, t1: 120, action: "run", around: 0.5, aroundY: 0.48, count: 9, radX: 0.26, radY: 0.13, color: "#ffbe3c" },
      { fx: "frameFlicker", t0: 52, t1: 120, color: "#ffbe3c" },
      { fx: "bloodGush", t0: 70, t1: 180, x: 0.5, y: 0.5, amount: 8 },
      // SHOT 3 — EXTREME close-up: 24 hits land in an instant
      { fx: "cam",   t0: 120, t1: 150, zoom: 2.1, cx: 0.5, cy: 0.47, cut: true },
      { fx: "whiteSpike", t0: 120, t1: 130 },
      { fx: "headPop", t0: 122, t1: 150, headY: 0.3 },
      { fx: "bloodGush", t0: 122, t1: 180, x: 0.5, y: 0.47, amount: 30 },
      // SHOT 4 — pull back: collapse → banner
      { fx: "cam",   t0: 150, t1: 180, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 150, t1: 180, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 150, t1: 180, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 154, t1: 180 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise", gain: 0.4 },
      { t: 50,  id: "warp_wobble_01",  gain: 0.5 },
      { t: 120, id: "boom_huge_01",    gain: 0.95, ultBoom: true, duckSec: 0.5 },
      { t: 126, id: "rumble_tail_01",  gain: 0.5 },
    ],
  },

  // AOI TODO — Boogie Woogie: a clap swaps the positions of anything with cursed energy. Loud, eccentric, utterly
  // devoted to his "best friend." He blinks the victim around in a disorienting shuffle, then lands one colossal
  // haymaker that ends it.
  aoi_todo: {
    banner: "BOOGIE WOOGIE",
    bannerRgb: "90,200,255",
    base: "hurt",
    choreographed: true,
    total: 176,
    beats: [
      { fx: "letterbox", t0: 0, t1: 176, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 176, rgb: "4,10,16", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 58, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      // SHOT 2 — CLAP: Boogie Woogie blinks the victim around in a disorienting shuffle
      { fx: "cam",   t0: 46, t1: 116, zoom: 1.55, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "boogie", t0: 50, t1: 116, color: "#5ac8ff" },
      // SHOT 3 — EXTREME close-up: one colossal haymaker
      { fx: "cam",   t0: 116, t1: 148, zoom: 2.0, cx: 0.5, cy: 0.47, cut: true },
      { fx: "actor", t0: 116, t1: 142, who: "atk", action: "heavy", x: 0.66, y: 0.5, frame: "once:3", facing: -1 },
      { fx: "whiteSpike", t0: 122, t1: 132 },
      { fx: "headPop", t0: 124, t1: 150, headY: 0.4 },
      { fx: "bloodGush", t0: 126, t1: 176, x: 0.5, y: 0.47, amount: 30 },
      // SHOT 4 — pull back: collapse → banner
      { fx: "cam",   t0: 150, t1: 176, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 150, t1: 176, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 152, t1: 176, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 156, t1: 176 },
    ],
    sound: [
      { t: 1,   id: "boom_anticipation_suck", gain: 0.4 },
      { t: 50,  id: "warp_wobble_01",         gain: 0.5 },
      { t: 90,  id: "warp_wobble_01",         gain: 0.4 },
      { t: 116, id: "boom_huge_01",           gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 122, id: "rumble_tail_01",         gain: 0.5 },
    ],
  },


  // ── PHASE 3 — THE SHARINGAN (Uchiha) ───────────────────────────────────────────────────────────
  // Batch 3A "Sons of Indra": sasuke · sasuke_adult · sasuke_sensei · itachi

  // SASUKE — Chidori: a thrust of concentrated lightning punched clean through the chest. His oldest, coldest
  // technique. Dashes in, pierces, the lightning tears the wound open.
  sasuke: {
    banner: "CHIDORI", bannerRgb: "120,180,255", base: "hurt", choreographed: true, total: 168,
    beats: [
      { fx: "letterbox", t0: 0, t1: 168, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 168, rgb: "4,8,16", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 52, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "flickerIn", t0: 26, t1: 46, action: "run", fromX: 0.9, toX: 0.6, y: 0.52, facing: -1, color: "rgba(120,180,255,0.5)" },
      { fx: "cam",   t0: 44, t1: 112, zoom: 1.9, cx: 0.52, cy: 0.46, cut: true },
      { fx: "actor", t0: 44, t1: 144, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "actor", t0: 44, t1: 72, who: "atk", action: "heavy", x: 0.64, y: 0.5, frame: "once:3", facing: -1 },
      { fx: "impale", t0: 50, t1: 112, color: "#bfe0ff", headY: 0.45 },
      { fx: "lightning", t0: 50, t1: 144, headY: 0.45, color: "#7ec8ff" },
      { fx: "whiteSpike", t0: 52, t1: 62 },
      { fx: "bloodGush", t0: 58, t1: 168, x: 0.5, y: 0.46, amount: 10 },
      { fx: "cam",   t0: 112, t1: 144, zoom: 2.2, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 112, t1: 122 },
      { fx: "headPop", t0: 114, t1: 144, headY: 0.45 },
      { fx: "bloodGush", t0: 114, t1: 168, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam",   t0: 144, t1: 168, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 144, t1: 168, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 146, t1: 168, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 150, t1: 168 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise",     gain: 0.5 },
      { t: 50,  id: "crack_sizzle_bright", gain: 0.6 },
      { t: 112, id: "boom_huge_01",        gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 118, id: "rumble_tail_01",      gain: 0.5 },
    ],
  },

  // SASUKE (ADULT) — Amaterasu: the inextinguishable BLACK FLAMES of the left Mangekyo. Wherever his gaze lands,
  // the target simply burns — black fire that consumes to nothing.
  sasuke_adult: {
    banner: "AMATERASU", bannerRgb: "170,60,210", base: "hurt", choreographed: true, total: 176,
    beats: [
      { fx: "letterbox", t0: 0, t1: 176, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 176, rgb: "2,0,4", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 176, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 120, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam",   t0: 46, t1: 118, zoom: 1.62, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "whiteSpike", t0: 54, t1: 62 },
      { fx: "incinerate", t0: 58, t1: 172, color: "#e636b4", black: true },
      { fx: "cam",   t0: 120, t1: 162, zoom: 2.1, cx: 0.5, cy: 0.47, cut: true },
      { fx: "banner", t0: 150, t1: 176 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise",        gain: 0.5 },
      { t: 54,  id: "boom_anticipation_suck", gain: 0.4 },
      { t: 120, id: "boom_huge_02_roar",      gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 126, id: "rumble_tail_01",         gain: 0.5 },
    ],
  },

  // SASUKE (SENSEI) — Susanoo: the ethereal avatar's giant blade descends in one overwhelming cleave.
  sasuke_sensei: {
    banner: "SUSANOO", bannerRgb: "130,90,230", base: "hurt", choreographed: true, total: 172,
    beats: [
      { fx: "letterbox", t0: 0, t1: 172, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 172, rgb: "6,2,16", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 110, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam",   t0: 46, t1: 114, zoom: 1.6, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "swordSlash", t0: 70, t1: 110, x: 0.52, y: 0.46, len: 0.42, angle: -2.5, sweep: 3.0, color: "rgba(150,110,240,0.95)" },
      { fx: "whiteSpike", t0: 100, t1: 112 },
      { fx: "cam",   t0: 114, t1: 150, zoom: 2.1, cx: 0.5, cy: 0.47, cut: true },
      { fx: "headPop", t0: 116, t1: 150, headY: 0.45 },
      { fx: "bloodGush", t0: 118, t1: 172, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam",   t0: 150, t1: 172, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 150, t1: 172, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 152, t1: 172, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 156, t1: 172 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise", gain: 0.5 },
      { t: 70,  id: "swish_fast_01",   gain: 0.6 },
      { t: 114, id: "boom_huge_01",    gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 120, id: "rumble_tail_01",  gain: 0.5 },
    ],
  },

  // ITACHI — Tsukuyomi: dragged into the inverted red world, slashed a thousand times in a single instant until
  // the mind simply breaks. A genjutsu kill — no body is cut, but the victim never comes back.
  itachi: {
    banner: "TSUKUYOMI", bannerRgb: "210,30,30", base: "hurt", choreographed: true, total: 184,
    beats: [
      { fx: "letterbox",   t0: 0, t1: 184, in: 14, h: 0.13 },
      { fx: "tsukuyomiBg", t0: 0, t1: 184 },
      { fx: "cam",   t0: 0,  t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 6,  t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 16, t1: 120, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam",   t0: 46, t1: 120, zoom: 1.55, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "slashCross", t0: 50, t1: 120, count: 26, color: "#e02020" },
      { fx: "bloodGush", t0: 60, t1: 184, x: 0.5, y: 0.5, amount: 8 },
      { fx: "cam",   t0: 120, t1: 152, zoom: 2.1, cx: 0.5, cy: 0.47, cut: true },
      { fx: "whiteSpike", t0: 120, t1: 130 },
      { fx: "headPop", t0: 122, t1: 152, headY: 0.3 },
      { fx: "bloodGush", t0: 122, t1: 184, x: 0.5, y: 0.47, amount: 28 },
      { fx: "cam",   t0: 152, t1: 184, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 152, t1: 184, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 152, t1: 184, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 156, t1: 184 },
    ],
    sound: [
      { t: 1,   id: "boom_anticipation_suck", gain: 0.5 },
      { t: 50,  id: "crack_sizzle_bright",    gain: 0.4 },
      { t: 120, id: "boom_huge_01",           gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 126, id: "rumble_tail_01",         gain: 0.5 },
    ],
  },


  // Batch 3B "The Ghosts": madara · obito · tobi

  // MADARA — Tengai Shinsei: he reaches to the heavens and drags a meteor down onto the target. Annihilation
  // from the sky — the body is simply crushed into the earth.
  madara: {
    banner: "TENGAI SHINSEI", bannerRgb: "150,90,230", base: "hurt", choreographed: true, total: 186,
    beats: [
      { fx: "letterbox", t0: 0, t1: 186, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 186, rgb: "6,2,14", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 120, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam",   t0: 46, t1: 120, zoom: 1.4, cx: 0.5, cy: 0.42, ease: 0.07 },
      { fx: "meteor", t0: 60, t1: 122 },
      { fx: "bloodGush", t0: 110, t1: 186, x: 0.5, y: 0.46, amount: 8 },
      { fx: "cam",   t0: 122, t1: 154, zoom: 2.0, cx: 0.5, cy: 0.47, cut: true },
      { fx: "whiteSpike", t0: 122, t1: 134 },
      { fx: "headPop", t0: 124, t1: 154, headY: 0.35 },
      { fx: "bloodGush", t0: 124, t1: 186, x: 0.5, y: 0.47, amount: 34 },
      { fx: "cam",   t0: 154, t1: 186, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 154, t1: 186, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 154, t1: 186, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 158, t1: 186 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise",   gain: 0.5 },
      { t: 60,  id: "boom_anticipation_suck", gain: 0.45 },
      { t: 122, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 128, id: "rumble_tail_01",    gain: 0.6, delay: 0.05 },
    ],
  },

  // OBITO — Kamui: the spiral opens and warps the target clean out of reality. No body, no blood — just gone.
  obito: {
    banner: "KAMUI", bannerRgb: "120,70,210", base: "hurt", choreographed: true, total: 178,
    beats: [
      { fx: "letterbox", t0: 0, t1: 178, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 178, rgb: "8,4,16", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 120, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam",   t0: 46, t1: 118, zoom: 1.7, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "kamuiSpiral", t0: 54, t1: 150 },
      { fx: "cam",   t0: 118, t1: 150, zoom: 2.1, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 142, t1: 152 },
      { fx: "cam",   t0: 152, t1: 178, zoom: 1.4, cx: 0.5, cy: 0.5, ease: 0.1 },
      { fx: "actor", t0: 152, t1: 178, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 156, t1: 178 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise", gain: 0.45 },
      { t: 54,  id: "warp_wobble_01",  gain: 0.6 },
      { t: 118, id: "warp_wobble_01",  gain: 0.5 },
      { t: 142, id: "boom_huge_01",    gain: 1.0, ultBoom: true, duckSec: 0.5 },
    ],
  },

  // TOBI — the masked man's Truth-Seeking Ball: a black orb expands over the target and disintegrates it to
  // nothing. Six-Paths matter-annihilation; whatever it touches ceases to exist.
  tobi: {
    banner: "TRUTH-SEEKER", bannerRgb: "160,40,190", base: "hurt", choreographed: true, total: 176,
    beats: [
      { fx: "letterbox", t0: 0, t1: 176, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 176, rgb: "6,2,12", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 110, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam",   t0: 46, t1: 118, zoom: 1.65, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "whiteSpike", t0: 54, t1: 62 },
      { fx: "voidOrb", t0: 58, t1: 150 },
      { fx: "cam",   t0: 118, t1: 150, zoom: 2.0, cx: 0.5, cy: 0.46, cut: true },
      { fx: "cam",   t0: 152, t1: 176, zoom: 1.4, cx: 0.5, cy: 0.5, ease: 0.1 },
      { fx: "actor", t0: 152, t1: 176, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 156, t1: 176 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise",        gain: 0.45 },
      { t: 54,  id: "boom_anticipation_suck", gain: 0.5 },
      { t: 118, id: "boom_huge_02_roar",      gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 124, id: "rumble_tail_01",         gain: 0.5 },
    ],
  },


  // Batch 3C "The Crows" (Shisui variants): shisui_blade · shisui_puppeteer · shisui_trinity · shisui_itachi_kids

  // SHISUI (BLADE) — Iaido: a single flash-step draw-cut. Sheathed one instant, the victim falls in two the next.
  shisui_blade: {
    banner: "IAIDO", bannerRgb: "200,220,255", base: "hurt", choreographed: true, total: 164,
    beats: [
      { fx: "letterbox", t0: 0, t1: 164, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 164, rgb: "6,8,14", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 96, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "flickerIn", t0: 26, t1: 44, action: "run", fromX: 0.92, toX: 0.58, y: 0.52, facing: -1, color: "rgba(200,220,255,0.5)" },
      { fx: "cam",   t0: 42, t1: 98, zoom: 1.8, cx: 0.52, cy: 0.46, cut: true },
      { fx: "actor", t0: 42, t1: 70, who: "atk", action: "heavy", x: 0.6, y: 0.5, frame: "once:3", facing: -1 },
      { fx: "swordSlash", t0: 48, t1: 72, x: 0.52, y: 0.47, len: 0.3, angle: -2.2, sweep: 2.8, color: "#ffffff" },
      { fx: "whiteSpike", t0: 90, t1: 102 },
      { fx: "cam",   t0: 98, t1: 142, zoom: 2.0, cx: 0.5, cy: 0.47, cut: true },
      { fx: "soulSplit", t0: 98, t1: 156 },
      { fx: "bloodGush", t0: 102, t1: 164, x: 0.5, y: 0.5, amount: 16 },
      { fx: "cam",   t0: 142, t1: 164, zoom: 1.4, cx: 0.5, cy: 0.52, ease: 0.1 },
      { fx: "actor", t0: 144, t1: 164, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 148, t1: 164 },
    ],
    sound: [
      { t: 1,  id: "boom_anticipation_suck", gain: 0.4 },
      { t: 48, id: "swish_fast_01",          gain: 0.6 },
      { t: 98, id: "boom_medium_02",         gain: 1.0, ultBoom: true, duckSec: 0.45 },
      { t: 104, id: "rumble_tail_01",        gain: 0.45 },
    ],
  },

  // SHISUI (PUPPETEER) — Kotoamatsukami: the ultimate mind-control genjutsu. Strings take the body, the eye takes
  // the will, and the mind is forced to break itself.
  shisui_puppeteer: {
    banner: "KOTOAMATSUKAMI", bannerRgb: "90,160,255", base: "hurt", choreographed: true, total: 180,
    beats: [
      { fx: "letterbox", t0: 0, t1: 180, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 180, rgb: "4,8,18", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 120, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam",   t0: 46, t1: 118, zoom: 1.6, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "whiteSpike", t0: 50, t1: 60 },
      { fx: "strings", t0: 56, t1: 150, color: "rgba(120,200,255,0.75)" },
      { fx: "cam",   t0: 120, t1: 152, zoom: 2.0, cx: 0.5, cy: 0.3, cut: true },
      { fx: "whiteSpike", t0: 120, t1: 130 },
      { fx: "headPop", t0: 122, t1: 152, headY: 0.16 },
      { fx: "bloodGush", t0: 122, t1: 180, x: 0.5, y: 0.18, amount: 26 },
      { fx: "cam",   t0: 152, t1: 180, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 152, t1: 180, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 152, t1: 180, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 156, t1: 180 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise",  gain: 0.45 },
      { t: 50,  id: "warp_wobble_01",   gain: 0.55 },
      { t: 120, id: "boom_huge_01",     gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 126, id: "rumble_tail_01",   gain: 0.5 },
    ],
  },

  // SHISUI (TRINITY) — three after-images close from every direction at once; a storm of simultaneous cuts dices
  // the victim before they can register a single one.
  shisui_trinity: {
    banner: "TRINITY", bannerRgb: "208,26,32", base: "hurt", choreographed: true, total: 176,
    beats: [
      { fx: "letterbox", t0: 0, t1: 176, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 176, rgb: "10,3,6", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 50, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "cam",   t0: 44, t1: 116, zoom: 1.35, cx: 0.5, cy: 0.47, ease: 0.08 },
      { fx: "flickerRush", t0: 48, t1: 116, action: "run", around: 0.5, aroundY: 0.48, count: 6, radX: 0.28, radY: 0.12, color: "#d0202a" },
      { fx: "actor", t0: 50, t1: 116, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "slashCross", t0: 52, t1: 116, count: 14, color: "#ff4040" },
      { fx: "bloodGush", t0: 60, t1: 176, x: 0.5, y: 0.5, amount: 8 },
      { fx: "cam",   t0: 116, t1: 158, zoom: 1.95, cx: 0.5, cy: 0.47, cut: true },
      { fx: "whiteSpike", t0: 116, t1: 128 },
      { fx: "shatter", t0: 120, t1: 168, cols: 5, rows: 7, spread: 1.0 },
      { fx: "cam",   t0: 158, t1: 176, zoom: 1.4, cx: 0.5, cy: 0.5, ease: 0.1 },
      { fx: "actor", t0: 160, t1: 176, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 162, t1: 176 },
    ],
    sound: [
      { t: 1,   id: "boom_anticipation_suck", gain: 0.45 },
      { t: 48,  id: "warp_wobble_01",         gain: 0.5 },
      { t: 116, id: "boom_huge_01",           gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 122, id: "rumble_tail_01",         gain: 0.5 },
    ],
  },

  // SHISUI & ITACHI (KIDS) — Twin Flicker: the two prodigies blitz as one, a flurry of after-image strikes capped
  // by Itachi's kunai rain. Young, but already lethal in perfect sync.
  shisui_itachi_kids: {
    banner: "TWIN FLICKER", bannerRgb: "120,160,230", base: "hurt", choreographed: true, total: 172,
    beats: [
      { fx: "letterbox", t0: 0, t1: 172, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 172, rgb: "6,8,16", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 50, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "cam",   t0: 44, t1: 116, zoom: 1.35, cx: 0.5, cy: 0.47, ease: 0.08 },
      { fx: "flickerRush", t0: 48, t1: 116, action: "run", around: 0.5, aroundY: 0.48, count: 6, radX: 0.26, radY: 0.13, color: "#6aa0e0" },
      { fx: "actor", t0: 50, t1: 150, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "slashCross", t0: 54, t1: 116, count: 16, color: "#aac8f0" },
      { fx: "bloodGush", t0: 60, t1: 172, x: 0.5, y: 0.5, amount: 8 },
      { fx: "cam",   t0: 116, t1: 148, zoom: 2.0, cx: 0.5, cy: 0.3, cut: true },
      { fx: "whiteSpike", t0: 116, t1: 126 },
      { fx: "headPop", t0: 118, t1: 148, headY: 0.16 },
      { fx: "bloodGush", t0: 118, t1: 172, x: 0.5, y: 0.18, amount: 26 },
      { fx: "cam",   t0: 148, t1: 172, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 148, t1: 172, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 150, t1: 172, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 152, t1: 172 },
    ],
    sound: [
      { t: 1,   id: "boom_anticipation_suck", gain: 0.4 },
      { t: 48,  id: "warp_wobble_01",         gain: 0.5 },
      { t: 116, id: "boom_huge_01",           gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 122, id: "rumble_tail_01",         gain: 0.5 },
    ],
  },


  // ── PHASE 4 — WILL OF FIRE (Hokage / Sannin) ────────────────────────────────────────────────────
  // Batch 4A "The Nine-Tails": naruto · naruto_hokage · naruto_seventh · minato

  // NARUTO — Rasengan: dashes in and grinds a spiralling sphere of chakra straight through the body.
  naruto: {
    banner: "RASENGAN", bannerRgb: "80,170,255", base: "hurt", choreographed: true, total: 166,
    beats: [
      { fx: "letterbox", t0: 0, t1: 166, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 166, rgb: "4,10,20", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 52, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "flickerIn", t0: 26, t1: 46, action: "run", fromX: 0.92, toX: 0.6, y: 0.52, facing: -1, color: "rgba(80,170,255,0.5)" },
      { fx: "cam",   t0: 44, t1: 112, zoom: 1.85, cx: 0.52, cy: 0.46, cut: true },
      { fx: "actor", t0: 44, t1: 144, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "actor", t0: 44, t1: 80, who: "atk", action: "heavy", x: 0.64, y: 0.5, frame: "once:3", facing: -1 },
      { fx: "rasengan", t0: 52, t1: 118, headY: 0.45, size: 0.45, color: "#50a8ff" },
      { fx: "whiteSpike", t0: 52, t1: 62 },
      { fx: "bloodGush", t0: 60, t1: 166, x: 0.5, y: 0.46, amount: 10 },
      { fx: "cam",   t0: 112, t1: 144, zoom: 2.15, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 112, t1: 122 },
      { fx: "rasengan", t0: 112, t1: 140, headY: 0.45, size: 0.6, color: "#70b8ff" },
      { fx: "headPop", t0: 116, t1: 144, headY: 0.45 },
      { fx: "bloodGush", t0: 116, t1: 166, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam",   t0: 144, t1: 166, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 144, t1: 166, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 146, t1: 166, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 150, t1: 166 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise",     gain: 0.5 },
      { t: 52,  id: "warp_wobble_01",      gain: 0.5 },
      { t: 112, id: "boom_huge_01",        gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 118, id: "rumble_tail_01",      gain: 0.5 },
    ],
  },

  // NARUTO (HOKAGE) — Rasenshuriken: the wind-blade sphere expands into a dome of microscopic blades that shred
  // the target at the cellular level.
  naruto_hokage: {
    banner: "RASENSHURIKEN", bannerRgb: "120,200,255", base: "hurt", choreographed: true, total: 176,
    beats: [
      { fx: "letterbox", t0: 0, t1: 176, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 176, rgb: "4,12,22", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 96, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 90, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam",   t0: 46, t1: 98, zoom: 1.7, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "rasengan", t0: 54, t1: 98, headY: 0.45, size: 0.5, color: "#78c8ff" },
      { fx: "whiteSpike", t0: 90, t1: 102 },
      { fx: "cam",   t0: 98, t1: 150, zoom: 1.95, cx: 0.5, cy: 0.47, cut: true },
      { fx: "speedLines", t0: 98, t1: 150, color: "rgba(150,210,255,0.5)" },
      { fx: "shatter", t0: 102, t1: 160, cols: 6, rows: 8, spread: 1.2 },
      { fx: "bloodGush", t0: 104, t1: 176, x: 0.5, y: 0.5, amount: 14 },
      { fx: "cam",   t0: 150, t1: 176, zoom: 1.4, cx: 0.5, cy: 0.5, ease: 0.1 },
      { fx: "actor", t0: 152, t1: 176, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 156, t1: 176 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise", gain: 0.5 },
      { t: 54,  id: "warp_wobble_01",  gain: 0.5 },
      { t: 98,  id: "boom_huge_01",    gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 104, id: "rumble_tail_01",  gain: 0.5 },
    ],
  },

  // NARUTO (SEVENTH) — Bijuudama: Kurama's tailed-beast bomb fires and annihilates everything in its path.
  naruto_seventh: {
    banner: "BIJUUDAMA", bannerRgb: "255,140,40", base: "hurt", choreographed: true, total: 178,
    beats: [
      { fx: "letterbox", t0: 0, t1: 178, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 178, rgb: "10,4,2", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 120, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam",   t0: 46, t1: 118, zoom: 1.6, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "flameBeam", t0: 70, t1: 122, color: "#ff8a1e" },
      { fx: "whiteSpike", t0: 116, t1: 128 },
      { fx: "cam",   t0: 122, t1: 154, zoom: 2.0, cx: 0.5, cy: 0.46, cut: true },
      { fx: "headPop", t0: 124, t1: 154, headY: 0.4 },
      { fx: "bloodGush", t0: 124, t1: 178, x: 0.5, y: 0.46, amount: 34 },
      { fx: "cam",   t0: 154, t1: 178, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 154, t1: 178, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 154, t1: 178, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 158, t1: 178 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise",   gain: 0.5 },
      { t: 70,  id: "boom_anticipation_suck", gain: 0.45 },
      { t: 116, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 122, id: "rumble_tail_01",    gain: 0.6, delay: 0.05 },
    ],
  },

  // MINATO — Flying Raijin: the Yellow Flash teleports across the field in an instant, striking from every angle,
  // then finishes with a Rasengan at point-blank.
  minato: {
    banner: "FLYING RAIJIN", bannerRgb: "255,210,80", base: "hurt", choreographed: true, total: 172,
    beats: [
      { fx: "letterbox", t0: 0, t1: 172, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 172, rgb: "12,10,2", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 50, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "cam",   t0: 44, t1: 112, zoom: 1.4, cx: 0.5, cy: 0.47, ease: 0.08 },
      { fx: "flickerRush", t0: 48, t1: 112, action: "run", around: 0.5, aroundY: 0.48, count: 9, radX: 0.3, radY: 0.14, color: "#ffd24a" },
      { fx: "actor", t0: 50, t1: 112, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "bloodGush", t0: 60, t1: 172, x: 0.5, y: 0.5, amount: 8 },
      { fx: "cam",   t0: 112, t1: 146, zoom: 2.1, cx: 0.5, cy: 0.46, cut: true },
      { fx: "rasengan", t0: 112, t1: 142, headY: 0.45, size: 0.5, color: "#ffd24a" },
      { fx: "whiteSpike", t0: 114, t1: 124 },
      { fx: "headPop", t0: 118, t1: 146, headY: 0.45 },
      { fx: "bloodGush", t0: 118, t1: 172, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam",   t0: 146, t1: 172, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 172, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 148, t1: 172, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 152, t1: 172 },
    ],
    sound: [
      { t: 1,   id: "boom_anticipation_suck", gain: 0.45 },
      { t: 48,  id: "warp_wobble_01",         gain: 0.55 },
      { t: 112, id: "boom_huge_01",           gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 118, id: "rumble_tail_01",         gain: 0.5 },
    ],
  },


  // Batch 4B "The First Hokages": hashirama · tobirama · hiruzen · jiraiya

  // HASHIRAMA — Wood Style: the God of Shinobi raises a forest in an instant; thorned tendrils bind the target
  // and a great wooden spike runs them through.
  hashirama: {
    banner: "WOOD STYLE", bannerRgb: "120,180,80", base: "hurt", choreographed: true, total: 180,
    beats: [
      { fx: "letterbox", t0: 0, t1: 180, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 180, rgb: "6,14,6", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 120, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam",   t0: 46, t1: 118, zoom: 1.6, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "woodBind", t0: 52, t1: 150, count: 7, color: "#6b4a2a" },
      { fx: "bloodGush", t0: 90, t1: 180, x: 0.5, y: 0.5, amount: 6 },
      { fx: "cam",   t0: 120, t1: 152, zoom: 2.0, cx: 0.5, cy: 0.46, cut: true },
      { fx: "impale", t0: 120, t1: 152, color: "#5a3a1a", headY: 0.4 },
      { fx: "whiteSpike", t0: 122, t1: 132 },
      { fx: "headPop", t0: 124, t1: 152, headY: 0.4 },
      { fx: "bloodGush", t0: 124, t1: 180, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam",   t0: 152, t1: 180, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 152, t1: 180, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 152, t1: 180, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 156, t1: 180 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise",        gain: 0.5 },
      { t: 52,  id: "boom_anticipation_suck", gain: 0.45 },
      { t: 120, id: "boom_huge_02_roar",      gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 126, id: "rumble_tail_01",         gain: 0.5 },
    ],
  },

  // TOBIRAMA — Flying Raijin + Water: teleport-strikes close in from every angle, finished by a clean water-blade
  // cut that splits the target in two.
  tobirama: {
    banner: "WATER FANG", bannerRgb: "90,180,230", base: "hurt", choreographed: true, total: 168,
    beats: [
      { fx: "letterbox", t0: 0, t1: 168, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 168, rgb: "4,12,20", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 50, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "cam",   t0: 44, t1: 100, zoom: 1.4, cx: 0.5, cy: 0.47, ease: 0.08 },
      { fx: "flickerRush", t0: 48, t1: 100, action: "run", around: 0.5, aroundY: 0.48, count: 8, radX: 0.28, radY: 0.13, color: "#5ab4e6" },
      { fx: "actor", t0: 50, t1: 100, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "swordSlash", t0: 76, t1: 100, x: 0.52, y: 0.47, len: 0.32, angle: -2.3, sweep: 2.8, color: "rgba(140,210,245,0.95)" },
      { fx: "whiteSpike", t0: 94, t1: 104 },
      { fx: "bloodGush", t0: 60, t1: 168, x: 0.5, y: 0.5, amount: 6 },
      { fx: "cam",   t0: 100, t1: 144, zoom: 2.0, cx: 0.5, cy: 0.47, cut: true },
      { fx: "soulSplit", t0: 100, t1: 158 },
      { fx: "bloodGush", t0: 104, t1: 168, x: 0.5, y: 0.5, amount: 16 },
      { fx: "cam",   t0: 144, t1: 168, zoom: 1.4, cx: 0.5, cy: 0.52, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 168, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 150, t1: 168 },
    ],
    sound: [
      { t: 1,   id: "boom_anticipation_suck", gain: 0.45 },
      { t: 48,  id: "warp_wobble_01",         gain: 0.55 },
      { t: 100, id: "boom_medium_02",         gain: 1.0, ultBoom: true, duckSec: 0.45 },
      { t: 106, id: "rumble_tail_01",         gain: 0.45 },
    ],
  },

  // HIRUZEN — Enma, the Adamantine Staff: the monkey-king transforms into an unbreakable staff that extends and
  // runs the target through, then crushes.
  hiruzen: {
    banner: "ADAMANTINE STAFF", bannerRgb: "200,160,90", base: "hurt", choreographed: true, total: 168,
    beats: [
      { fx: "letterbox", t0: 0, t1: 168, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 168, rgb: "10,8,4", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 144, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 116, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam",   t0: 46, t1: 112, zoom: 1.7, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "actor", t0: 44, t1: 72, who: "atk", action: "heavy", x: 0.66, y: 0.5, frame: "once:3", facing: -1 },
      { fx: "impale", t0: 54, t1: 112, color: "#c8a05a", headY: 0.42 },
      { fx: "whiteSpike", t0: 56, t1: 66 },
      { fx: "bloodGush", t0: 62, t1: 168, x: 0.5, y: 0.46, amount: 10 },
      { fx: "cam",   t0: 112, t1: 144, zoom: 2.1, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 112, t1: 122 },
      { fx: "headPop", t0: 114, t1: 144, headY: 0.42 },
      { fx: "bloodGush", t0: 114, t1: 168, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam",   t0: 144, t1: 168, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 144, t1: 168, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 146, t1: 168, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 150, t1: 168 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise", gain: 0.45 },
      { t: 54,  id: "impact_hit_01",   gain: 0.7 },
      { t: 112, id: "boom_huge_01",    gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 118, id: "rumble_tail_01",  gain: 0.5 },
    ],
  },

  // JIRAIYA — Needle Jizo: the Toad Sage's mane hardens into a storm of steel needles that riddle the target from
  // every direction.
  jiraiya: {
    banner: "NEEDLE JIZO", bannerRgb: "200,210,220", base: "hurt", choreographed: true, total: 170,
    beats: [
      { fx: "letterbox", t0: 0, t1: 170, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 170, rgb: "8,8,10", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 116, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam",   t0: 46, t1: 114, zoom: 1.6, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "slashCross", t0: 52, t1: 114, count: 28, color: "#c8d0dc" },
      { fx: "bloodGush", t0: 60, t1: 170, x: 0.5, y: 0.5, amount: 8 },
      { fx: "cam",   t0: 114, t1: 146, zoom: 2.0, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 114, t1: 124 },
      { fx: "slashCross", t0: 114, t1: 146, count: 16, color: "#e0e8f0" },
      { fx: "headPop", t0: 118, t1: 146, headY: 0.4 },
      { fx: "bloodGush", t0: 118, t1: 170, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam",   t0: 146, t1: 170, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 170, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 148, t1: 170, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 152, t1: 170 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise",     gain: 0.45 },
      { t: 52,  id: "swish_fast_01",       gain: 0.55 },
      { t: 114, id: "boom_huge_01",        gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 120, id: "rumble_tail_01",      gain: 0.5 },
    ],
  },


  // Batch 4C "Snakes & Copy Ninja": orochimaru · kakashi · kakashi_anbu · kakashi_war

  // OROCHIMARU — Kusanagi & the Hidden Shadow Snakes: serpents erupt from his sleeves, then the Grass-Cutter
  // sword runs the target through with a venomous sheen.
  orochimaru: {
    banner: "KUSANAGI", bannerRgb: "120,200,80", base: "hurt", choreographed: true, total: 172,
    beats: [
      { fx: "letterbox", t0: 0, t1: 172, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 172, rgb: "6,12,4", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 116, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam",   t0: 46, t1: 114, zoom: 1.6, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "slashCross", t0: 52, t1: 114, count: 14, color: "#7ad040" },
      { fx: "bloodGush", t0: 60, t1: 172, x: 0.5, y: 0.5, amount: 6 },
      { fx: "cam",   t0: 114, t1: 146, zoom: 2.0, cx: 0.5, cy: 0.46, cut: true },
      { fx: "impale", t0: 114, t1: 146, color: "#aef050", headY: 0.42 },
      { fx: "whiteSpike", t0: 114, t1: 124 },
      { fx: "headPop", t0: 118, t1: 146, headY: 0.42 },
      { fx: "bloodGush", t0: 118, t1: 172, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam",   t0: 146, t1: 172, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 172, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 148, t1: 172, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 152, t1: 172 },
    ],
    sound: [
      { t: 1,   id: "boom_anticipation_suck", gain: 0.45 },
      { t: 52,  id: "swish_fast_01",          gain: 0.5 },
      { t: 114, id: "boom_huge_01",           gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 120, id: "rumble_tail_01",         gain: 0.5 },
    ],
  },

  // KAKASHI — Raikiri: the Lightning Blade he refined from the Chidori; a fist of concentrated lightning punched
  // clean through the chest.
  kakashi: {
    banner: "RAIKIRI", bannerRgb: "120,180,255", base: "hurt", choreographed: true, total: 166,
    beats: [
      { fx: "letterbox", t0: 0, t1: 166, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 166, rgb: "4,8,16", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 52, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "flickerIn", t0: 26, t1: 46, action: "run", fromX: 0.92, toX: 0.6, y: 0.52, facing: -1, color: "rgba(120,180,255,0.5)" },
      { fx: "cam",   t0: 44, t1: 112, zoom: 1.85, cx: 0.52, cy: 0.46, cut: true },
      { fx: "actor", t0: 44, t1: 144, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "actor", t0: 44, t1: 72, who: "atk", action: "heavy", x: 0.64, y: 0.5, frame: "once:3", facing: -1 },
      { fx: "impale", t0: 50, t1: 112, color: "#bfe0ff", headY: 0.45 },
      { fx: "lightning", t0: 50, t1: 144, headY: 0.45, color: "#90c8ff" },
      { fx: "whiteSpike", t0: 52, t1: 62 },
      { fx: "bloodGush", t0: 58, t1: 166, x: 0.5, y: 0.46, amount: 10 },
      { fx: "cam",   t0: 112, t1: 144, zoom: 2.15, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 112, t1: 122 },
      { fx: "lightning", t0: 112, t1: 140, headY: 0.45, color: "#aed8ff" },
      { fx: "headPop", t0: 116, t1: 144, headY: 0.45 },
      { fx: "bloodGush", t0: 116, t1: 166, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam",   t0: 144, t1: 166, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 144, t1: 166, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 146, t1: 166, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 150, t1: 166 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise",     gain: 0.5 },
      { t: 50,  id: "crack_sizzle_bright", gain: 0.6 },
      { t: 112, id: "boom_huge_01",        gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 118, id: "rumble_tail_01",      gain: 0.5 },
    ],
  },

  // KAKASHI (ANBU) — a silent assassination: one flash-step, one tanto stroke, and the target falls in two before
  // they know he was there.
  kakashi_anbu: {
    banner: "ANBU", bannerRgb: "200,210,225", base: "hurt", choreographed: true, total: 164,
    beats: [
      { fx: "letterbox", t0: 0, t1: 164, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 164, rgb: "4,6,10", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 96, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "flickerIn", t0: 26, t1: 44, action: "run", fromX: 0.92, toX: 0.58, y: 0.52, facing: -1, color: "rgba(200,210,225,0.45)" },
      { fx: "cam",   t0: 42, t1: 98, zoom: 1.8, cx: 0.52, cy: 0.46, cut: true },
      { fx: "actor", t0: 42, t1: 70, who: "atk", action: "heavy", x: 0.6, y: 0.5, frame: "once:3", facing: -1 },
      { fx: "swordSlash", t0: 48, t1: 72, x: 0.52, y: 0.47, len: 0.3, angle: -2.2, sweep: 2.8, color: "#dfe8f5" },
      { fx: "whiteSpike", t0: 90, t1: 102 },
      { fx: "cam",   t0: 98, t1: 142, zoom: 2.0, cx: 0.5, cy: 0.47, cut: true },
      { fx: "soulSplit", t0: 98, t1: 156 },
      { fx: "bloodGush", t0: 102, t1: 164, x: 0.5, y: 0.5, amount: 16 },
      { fx: "cam",   t0: 142, t1: 164, zoom: 1.4, cx: 0.5, cy: 0.52, ease: 0.1 },
      { fx: "actor", t0: 144, t1: 164, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 148, t1: 164 },
    ],
    sound: [
      { t: 1,  id: "boom_anticipation_suck", gain: 0.4 },
      { t: 48, id: "swish_fast_01",          gain: 0.6 },
      { t: 98, id: "boom_medium_02",         gain: 1.0, ultBoom: true, duckSec: 0.45 },
      { t: 104, id: "rumble_tail_01",        gain: 0.45 },
    ],
  },

  // KAKASHI (WAR) — Kamui Raikiri: he drives a lightning blade through, then Kamui warps the wound — and the rest
  // of them — clean out of this dimension.
  kakashi_war: {
    banner: "KAMUI RAIKIRI", bannerRgb: "150,110,230", base: "hurt", choreographed: true, total: 176,
    beats: [
      { fx: "letterbox", t0: 0, t1: 176, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 176, rgb: "6,6,16", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 112, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "flickerIn", t0: 26, t1: 46, action: "run", fromX: 0.92, toX: 0.6, y: 0.52, facing: -1, color: "rgba(150,110,230,0.5)" },
      { fx: "cam",   t0: 44, t1: 112, zoom: 1.85, cx: 0.52, cy: 0.46, cut: true },
      { fx: "actor", t0: 44, t1: 72, who: "atk", action: "heavy", x: 0.64, y: 0.5, frame: "once:3", facing: -1 },
      { fx: "lightning", t0: 50, t1: 110, headY: 0.45, color: "#b090f0" },
      { fx: "whiteSpike", t0: 52, t1: 62 },
      { fx: "bloodGush", t0: 58, t1: 176, x: 0.5, y: 0.46, amount: 8 },
      { fx: "cam",   t0: 112, t1: 150, zoom: 1.9, cx: 0.5, cy: 0.46, cut: true },
      { fx: "kamuiSpiral", t0: 112, t1: 156 },
      { fx: "whiteSpike", t0: 146, t1: 156 },
      { fx: "cam",   t0: 156, t1: 176, zoom: 1.4, cx: 0.5, cy: 0.5, ease: 0.1 },
      { fx: "actor", t0: 156, t1: 176, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 160, t1: 176 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise",     gain: 0.5 },
      { t: 50,  id: "crack_sizzle_bright", gain: 0.6 },
      { t: 112, id: "warp_wobble_01",      gain: 0.6 },
      { t: 146, id: "boom_huge_01",        gain: 1.0, ultBoom: true, duckSec: 0.5 },
    ],
  },


  // ── PHASE 5 — THE HIDDEN LEAF ───────────────────────────────────────────────────────────────────
  // Batch 5A "Earth & Gravity": gaara · onoki · pain · six_paths_pain

  // GAARA — Sand Coffin: his sand swallows the target whole, then closes its fist. Sabaku Sōsō.
  gaara: {
    banner: "SAND COFFIN", bannerRgb: "216,184,112", base: "hurt", choreographed: true, total: 178,
    beats: [
      { fx: "letterbox", t0: 0, t1: 178, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 178, rgb: "14,10,4", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 120, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam",   t0: 46, t1: 118, zoom: 1.6, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "sandCrush", t0: 52, t1: 150, color: "#d8b870" },
      { fx: "cam",   t0: 120, t1: 152, zoom: 2.0, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 120, t1: 130 },
      { fx: "headPop", t0: 124, t1: 152, headY: 0.4 },
      { fx: "bloodGush", t0: 124, t1: 178, x: 0.5, y: 0.46, amount: 28 },
      { fx: "cam",   t0: 152, t1: 178, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 152, t1: 178, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 152, t1: 178, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 156, t1: 178 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise",   gain: 0.5 },
      { t: 52,  id: "warp_wobble_01",    gain: 0.5 },
      { t: 120, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 126, id: "rumble_tail_01",    gain: 0.55 },
    ],
  },

  // ONOKI — Dust Release: a Particle-Style cube forms around the target and atomises it to drifting dust.
  onoki: {
    banner: "DUST RELEASE", bannerRgb: "230,215,170", base: "hurt", choreographed: true, total: 176,
    beats: [
      { fx: "letterbox", t0: 0, t1: 176, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 176, rgb: "6,6,10", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 176, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 120, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam",   t0: 46, t1: 118, zoom: 1.62, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "whiteSpike", t0: 54, t1: 62 },
      { fx: "dustRelease", t0: 58, t1: 172, color: "#e6d7aa" },
      { fx: "cam",   t0: 120, t1: 162, zoom: 2.1, cx: 0.5, cy: 0.46, cut: true },
      { fx: "banner", t0: 150, t1: 176 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise",   gain: 0.5 },
      { t: 54,  id: "boom_anticipation_suck", gain: 0.4 },
      { t: 120, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 126, id: "rumble_tail_01",    gain: 0.5 },
    ],
  },

  // PAIN — Shinra Tensei: a pulse of pure gravity repulsion crushes and blasts the target apart.
  pain: {
    banner: "SHINRA TENSEI", bannerRgb: "180,190,210", base: "hurt", choreographed: true, total: 172,
    beats: [
      { fx: "letterbox", t0: 0, t1: 172, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 172, rgb: "8,8,12", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 110, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam",   t0: 46, t1: 112, zoom: 1.6, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "actor", t0: 44, t1: 72, who: "atk", action: "heavy", x: 0.7, y: 0.5, frame: "once:3", facing: -1 },
      { fx: "whiteSpike", t0: 90, t1: 100 },
      { fx: "shockRing", t0: 88, t1: 150, count: 5, color: "rgba(200,210,235,0.8)" },
      { fx: "bloodGush", t0: 96, t1: 172, x: 0.5, y: 0.5, amount: 8 },
      { fx: "cam",   t0: 112, t1: 146, zoom: 2.1, cx: 0.5, cy: 0.46, cut: true },
      { fx: "headPop", t0: 116, t1: 146, headY: 0.4 },
      { fx: "bloodGush", t0: 116, t1: 172, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam",   t0: 146, t1: 172, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 172, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 148, t1: 172, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 152, t1: 172 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise", gain: 0.5 },
      { t: 88,  id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 116, id: "boom_huge_01",    gain: 0.9, ultBoom: true, duckSec: 0.4 },
      { t: 122, id: "rumble_tail_01",  gain: 0.5 },
    ],
  },

  // SIX PATHS OF PAIN — Chibaku Tensei: a black gravity core rises and entombs the target in a forming planetoid.
  six_paths_pain: {
    banner: "CHIBAKU TENSEI", bannerRgb: "140,120,200", base: "hurt", choreographed: true, total: 182,
    beats: [
      { fx: "letterbox", t0: 0, t1: 182, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 182, rgb: "6,4,14", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 120, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam",   t0: 46, t1: 118, zoom: 1.6, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "shockRing", t0: 54, t1: 120, count: 4, color: "rgba(150,120,220,0.6)" },
      { fx: "voidOrb", t0: 60, t1: 172 },
      { fx: "cam",   t0: 120, t1: 158, zoom: 2.0, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 120, t1: 130 },
      { fx: "banner", t0: 156, t1: 182 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise",        gain: 0.5 },
      { t: 60,  id: "warp_wobble_01",         gain: 0.6 },
      { t: 120, id: "boom_huge_02_roar",      gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 126, id: "rumble_tail_01",         gain: 0.5 },
    ],
  },


  // Batch 5B "The Next Generation": isshiki · boruto · kiba · hinata · sakura

  // ISSHIKI — Black Rods: Otsutsuki chakra-rods rain down and pin the target through a dozen points.
  isshiki: {
    banner: "BLACK RODS", bannerRgb: "120,120,140", base: "hurt", choreographed: true, total: 172,
    beats: [
      { fx: "letterbox", t0: 0, t1: 172, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 172, rgb: "6,6,10", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 116, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam",   t0: 46, t1: 114, zoom: 1.6, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "slashCross", t0: 52, t1: 114, count: 20, color: "#8a8aa0" },
      { fx: "impale", t0: 70, t1: 114, color: "#6a6a80", headY: 0.42 },
      { fx: "bloodGush", t0: 60, t1: 172, x: 0.5, y: 0.5, amount: 8 },
      { fx: "cam",   t0: 114, t1: 146, zoom: 2.0, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 114, t1: 124 },
      { fx: "impale", t0: 114, t1: 146, color: "#8a8aa0", headY: 0.42 },
      { fx: "headPop", t0: 118, t1: 146, headY: 0.42 },
      { fx: "bloodGush", t0: 118, t1: 172, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam",   t0: 146, t1: 172, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 172, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 148, t1: 172, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 152, t1: 172 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise", gain: 0.45 },
      { t: 52,  id: "swish_fast_01",   gain: 0.55 },
      { t: 114, id: "boom_huge_01",    gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 120, id: "rumble_tail_01",  gain: 0.5 },
    ],
  },

  // BORUTO — Vanishing Rasengan: the sphere fades from sight mid-throw, then reappears grinding straight through.
  boruto: {
    banner: "VANISHING RASENGAN", bannerRgb: "80,210,200", base: "hurt", choreographed: true, total: 166,
    beats: [
      { fx: "letterbox", t0: 0, t1: 166, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 166, rgb: "4,14,16", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 52, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "flickerIn", t0: 26, t1: 46, action: "run", fromX: 0.92, toX: 0.6, y: 0.52, facing: -1, color: "rgba(80,210,200,0.5)" },
      { fx: "cam",   t0: 44, t1: 112, zoom: 1.85, cx: 0.52, cy: 0.46, cut: true },
      { fx: "actor", t0: 44, t1: 144, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "actor", t0: 44, t1: 80, who: "atk", action: "heavy", x: 0.64, y: 0.5, frame: "once:3", facing: -1 },
      { fx: "rasengan", t0: 52, t1: 118, headY: 0.45, size: 0.45, color: "#40d0c0" },
      { fx: "whiteSpike", t0: 52, t1: 62 },
      { fx: "bloodGush", t0: 60, t1: 166, x: 0.5, y: 0.46, amount: 10 },
      { fx: "cam",   t0: 112, t1: 144, zoom: 2.15, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 112, t1: 122 },
      { fx: "rasengan", t0: 112, t1: 140, headY: 0.45, size: 0.6, color: "#50e0d0" },
      { fx: "headPop", t0: 116, t1: 144, headY: 0.45 },
      { fx: "bloodGush", t0: 116, t1: 166, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam",   t0: 144, t1: 166, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 144, t1: 166, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 146, t1: 166, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 150, t1: 166 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise", gain: 0.5 },
      { t: 52,  id: "warp_wobble_01",  gain: 0.5 },
      { t: 112, id: "boom_huge_01",    gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 118, id: "rumble_tail_01",  gain: 0.5 },
    ],
  },

  // KIBA — Fang Over Fang: he and Akamaru become twin drilling tornadoes that tear the target to ribbons.
  kiba: {
    banner: "FANG OVER FANG", bannerRgb: "200,180,120", base: "hurt", choreographed: true, total: 170,
    beats: [
      { fx: "letterbox", t0: 0, t1: 170, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 170, rgb: "10,8,4", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 50, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "cam",   t0: 44, t1: 112, zoom: 1.35, cx: 0.5, cy: 0.47, ease: 0.08 },
      { fx: "flickerRush", t0: 48, t1: 112, action: "run", around: 0.5, aroundY: 0.48, count: 7, radX: 0.3, radY: 0.14, color: "#c8a858" },
      { fx: "actor", t0: 50, t1: 112, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "slashCross", t0: 52, t1: 112, count: 16, color: "#d8c080" },
      { fx: "bloodGush", t0: 60, t1: 170, x: 0.5, y: 0.5, amount: 8 },
      { fx: "cam",   t0: 112, t1: 154, zoom: 1.95, cx: 0.5, cy: 0.47, cut: true },
      { fx: "whiteSpike", t0: 112, t1: 124 },
      { fx: "shatter", t0: 116, t1: 164, cols: 6, rows: 8, spread: 1.2 },
      { fx: "bloodGush", t0: 118, t1: 170, x: 0.5, y: 0.5, amount: 14 },
      { fx: "cam",   t0: 154, t1: 170, zoom: 1.4, cx: 0.5, cy: 0.5, ease: 0.1 },
      { fx: "actor", t0: 156, t1: 170, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 158, t1: 170 },
    ],
    sound: [
      { t: 1,   id: "boom_anticipation_suck", gain: 0.45 },
      { t: 48,  id: "warp_wobble_01",         gain: 0.5 },
      { t: 112, id: "boom_huge_01",           gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 118, id: "rumble_tail_01",         gain: 0.5 },
    ],
  },

  // HINATA — Eight Trigrams Sixty-Four Palms: a blur of Gentle Fist strikes seals every chakra point, then the
  // target's whole network collapses at once.
  hinata: {
    banner: "SIXTY-FOUR PALMS", bannerRgb: "200,210,235", base: "hurt", choreographed: true, total: 170,
    beats: [
      { fx: "letterbox", t0: 0, t1: 170, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 170, rgb: "8,10,16", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 50, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "cam",   t0: 44, t1: 114, zoom: 1.5, cx: 0.5, cy: 0.47, ease: 0.08 },
      { fx: "flickerRush", t0: 48, t1: 114, action: "run", around: 0.5, aroundY: 0.48, count: 12, radX: 0.22, radY: 0.12, color: "#b8c8f0" },
      { fx: "actor", t0: 50, t1: 150, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "slashCross", t0: 52, t1: 114, count: 24, color: "#cfe0ff" },
      { fx: "bloodGush", t0: 60, t1: 170, x: 0.5, y: 0.5, amount: 6 },
      { fx: "cam",   t0: 114, t1: 146, zoom: 2.0, cx: 0.5, cy: 0.4, cut: true },
      { fx: "whiteSpike", t0: 114, t1: 124 },
      { fx: "headPop", t0: 118, t1: 146, headY: 0.3 },
      { fx: "bloodGush", t0: 118, t1: 170, x: 0.5, y: 0.34, amount: 26 },
      { fx: "cam",   t0: 146, t1: 170, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 170, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 148, t1: 170, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 152, t1: 170 },
    ],
    sound: [
      { t: 1,   id: "boom_anticipation_suck", gain: 0.4 },
      { t: 48,  id: "swish_fast_01",          gain: 0.5 },
      { t: 114, id: "boom_huge_01",           gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 120, id: "rumble_tail_01",         gain: 0.5 },
    ],
  },

  // SAKURA — Cherry Blossom Impact: one chakra-charged fist lands with the force of a meteor and pulps the target.
  sakura: {
    banner: "SHANNARO!", bannerRgb: "240,120,170", base: "hurt", choreographed: true, total: 162,
    beats: [
      { fx: "letterbox", t0: 0, t1: 162, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 162, rgb: "14,6,10", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 50, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "flickerIn", t0: 26, t1: 44, action: "run", fromX: 0.92, toX: 0.6, y: 0.52, facing: -1, color: "rgba(240,120,170,0.5)" },
      { fx: "cam",   t0: 42, t1: 96, zoom: 1.85, cx: 0.52, cy: 0.46, cut: true },
      { fx: "actor", t0: 42, t1: 72, who: "atk", action: "heavy", x: 0.64, y: 0.5, frame: "once:3", facing: -1 },
      { fx: "actor", t0: 44, t1: 140, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "whiteSpike", t0: 70, t1: 82 },
      { fx: "bloodGush", t0: 72, t1: 162, x: 0.5, y: 0.46, amount: 10 },
      { fx: "cam",   t0: 96, t1: 138, zoom: 2.1, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 96, t1: 106 },
      { fx: "headPop", t0: 98, t1: 138, headY: 0.4 },
      { fx: "shockRing", t0: 98, t1: 138, count: 3, color: "rgba(240,150,190,0.7)" },
      { fx: "bloodGush", t0: 98, t1: 162, x: 0.5, y: 0.46, amount: 34 },
      { fx: "cam",   t0: 138, t1: 162, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 138, t1: 162, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 140, t1: 162, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 144, t1: 162 },
    ],
    sound: [
      { t: 1,  id: "charge_hum_rise", gain: 0.5 },
      { t: 42, id: "boom_anticipation_suck", gain: 0.45 },
      { t: 96, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 102, id: "rumble_tail_01",  gain: 0.55 },
    ],
  },


  // ── PHASE 6 — SAIYAN BLOOD (Dragon Ball) ─────────────────────────────────────────────────────────
  // Batch 6A "Ki Beams": goku · vegeta · gohan · gogeta

  // GOKU — Kamehameha: the turtle-school wave fires and vaporises everything it touches.
  goku: {
    banner: "KAMEHAMEHA", bannerRgb: "90,180,255", base: "hurt", choreographed: true, total: 180,
    beats: [
      { fx: "letterbox", t0: 0, t1: 180, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 180, rgb: "4,8,16", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 120, who: "atk", action: "heavy", x: 0.84, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "cam",   t0: 46, t1: 118, zoom: 1.55, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "kiBeam", t0: 54, t1: 150, headY: 0.45, color: "#5ab4ff", wide: 1 },
      { fx: "whiteSpike", t0: 92, t1: 104 },
      { fx: "bloodGush", t0: 96, t1: 180, x: 0.5, y: 0.46, amount: 8 },
      { fx: "cam",   t0: 120, t1: 158, zoom: 2.0, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 120, t1: 134 },
      { fx: "headPop", t0: 124, t1: 158, headY: 0.45 },
      { fx: "bloodGush", t0: 124, t1: 180, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam",   t0: 158, t1: 180, zoom: 1.4, cx: 0.5, cy: 0.52, ease: 0.1 },
      { fx: "actor", t0: 160, t1: 180, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 162, t1: 180 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise",   gain: 0.55 },
      { t: 78,  id: "boom_anticipation_suck", gain: 0.4 },
      { t: 120, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 126, id: "rumble_tail_01",  gain: 0.55 },
    ],
  },

  // VEGETA — Final Flash: both palms level and unleash a pillar of golden ki.
  vegeta: {
    banner: "FINAL FLASH", bannerRgb: "255,230,90", base: "hurt", choreographed: true, total: 180,
    beats: [
      { fx: "letterbox", t0: 0, t1: 180, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 180, rgb: "14,12,2", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 120, who: "atk", action: "heavy", x: 0.84, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "cam",   t0: 46, t1: 118, zoom: 1.55, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "kiBeam", t0: 54, t1: 150, headY: 0.45, color: "#ffe85a", wide: 1 },
      { fx: "whiteSpike", t0: 92, t1: 104 },
      { fx: "bloodGush", t0: 96, t1: 180, x: 0.5, y: 0.46, amount: 8 },
      { fx: "cam",   t0: 120, t1: 158, zoom: 2.0, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 120, t1: 134 },
      { fx: "headPop", t0: 124, t1: 158, headY: 0.45 },
      { fx: "bloodGush", t0: 124, t1: 180, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam",   t0: 158, t1: 180, zoom: 1.4, cx: 0.5, cy: 0.52, ease: 0.1 },
      { fx: "actor", t0: 160, t1: 180, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 162, t1: 180 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise",   gain: 0.55 },
      { t: 78,  id: "boom_anticipation_suck", gain: 0.4 },
      { t: 120, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 126, id: "rumble_tail_01",  gain: 0.55 },
    ],
  },

  // GOHAN — Masenko: the two-hand forehead beam, burning amber.
  gohan: {
    banner: "MASENKO", bannerRgb: "255,190,90", base: "hurt", choreographed: true, total: 180,
    beats: [
      { fx: "letterbox", t0: 0, t1: 180, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 180, rgb: "16,10,2", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 120, who: "atk", action: "heavy", x: 0.84, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "cam",   t0: 46, t1: 118, zoom: 1.55, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "kiBeam", t0: 54, t1: 150, headY: 0.45, color: "#ffc040", wide: 1 },
      { fx: "whiteSpike", t0: 92, t1: 104 },
      { fx: "bloodGush", t0: 96, t1: 180, x: 0.5, y: 0.46, amount: 8 },
      { fx: "cam",   t0: 120, t1: 158, zoom: 2.0, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 120, t1: 134 },
      { fx: "headPop", t0: 124, t1: 158, headY: 0.45 },
      { fx: "bloodGush", t0: 124, t1: 180, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam",   t0: 158, t1: 180, zoom: 1.4, cx: 0.5, cy: 0.52, ease: 0.1 },
      { fx: "actor", t0: 160, t1: 180, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 162, t1: 180 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise",   gain: 0.55 },
      { t: 78,  id: "boom_anticipation_suck", gain: 0.4 },
      { t: 120, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 126, id: "rumble_tail_01",  gain: 0.55 },
    ],
  },

  // GOGETA — Stardust Breaker: a torrent of fused ki that erases the target.
  gogeta: {
    banner: "STARDUST BREAKER", bannerRgb: "150,220,255", base: "hurt", choreographed: true, total: 184,
    beats: [
      { fx: "letterbox", t0: 0, t1: 184, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 184, rgb: "6,10,18", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 120, who: "atk", action: "heavy", x: 0.84, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "cam",   t0: 46, t1: 118, zoom: 1.55, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "kiBeam", t0: 54, t1: 150, headY: 0.45, color: "#9adcff", wide: 1.3 },
      { fx: "whiteSpike", t0: 92, t1: 104 },
      { fx: "bloodGush", t0: 96, t1: 184, x: 0.5, y: 0.46, amount: 8 },
      { fx: "cam",   t0: 124, t1: 162, zoom: 2.0, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 124, t1: 138 },
      { fx: "headPop", t0: 128, t1: 162, headY: 0.45 },
      { fx: "bloodGush", t0: 128, t1: 184, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam",   t0: 162, t1: 184, zoom: 1.4, cx: 0.5, cy: 0.52, ease: 0.1 },
      { fx: "actor", t0: 164, t1: 184, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 166, t1: 184 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise",   gain: 0.55 },
      { t: 78,  id: "boom_anticipation_suck", gain: 0.4 },
      { t: 124, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 130, id: "rumble_tail_01",  gain: 0.55 },
    ],
  },


  // Batch 6B "Spheres & Blades": vegeta_dark · bardock · vegito · gotenks

  // VEGETA (DARK) — Big Bang Attack: a single sphere of condensed ki detonates with planet-cracking force.
  vegeta_dark: {
    banner: "BIG BANG ATTACK", bannerRgb: "200,120,255", base: "hurt", choreographed: true, total: 172,
    beats: [
      { fx: "letterbox", t0: 0, t1: 172, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 172, rgb: "8,2,14", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 116, who: "atk", action: "heavy", x: 0.84, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "cam",   t0: 46, t1: 114, zoom: 1.6, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "rasengan", t0: 70, t1: 116, headY: 0.45, size: 0.5, color: "#c060f0" },
      { fx: "whiteSpike", t0: 108, t1: 118 },
      { fx: "bloodGush", t0: 80, t1: 172, x: 0.5, y: 0.46, amount: 6 },
      { fx: "cam",   t0: 114, t1: 148, zoom: 2.1, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 114, t1: 128 },
      { fx: "shockRing", t0: 114, t1: 148, count: 4, color: "rgba(200,120,255,0.7)" },
      { fx: "headPop", t0: 118, t1: 148, headY: 0.42 },
      { fx: "bloodGush", t0: 118, t1: 172, x: 0.5, y: 0.46, amount: 34 },
      { fx: "cam",   t0: 148, t1: 172, zoom: 1.4, cx: 0.5, cy: 0.5, ease: 0.1 },
      { fx: "actor", t0: 150, t1: 172, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 154, t1: 172 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise",   gain: 0.5 },
      { t: 70,  id: "boom_anticipation_suck", gain: 0.4 },
      { t: 114, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 120, id: "rumble_tail_01",    gain: 0.55 },
    ],
  },

  // BARDOCK — Riot Javelin: a desperate, defiant sphere of raw ki hurled with everything he has left.
  bardock: {
    banner: "RIOT JAVELIN", bannerRgb: "120,230,180", base: "hurt", choreographed: true, total: 170,
    beats: [
      { fx: "letterbox", t0: 0, t1: 170, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 170, rgb: "2,12,8", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 114, who: "atk", action: "heavy", x: 0.84, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "cam",   t0: 46, t1: 112, zoom: 1.6, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "rasengan", t0: 68, t1: 114, headY: 0.45, size: 0.5, color: "#50e090" },
      { fx: "whiteSpike", t0: 106, t1: 116 },
      { fx: "bloodGush", t0: 78, t1: 170, x: 0.5, y: 0.46, amount: 6 },
      { fx: "cam",   t0: 112, t1: 146, zoom: 2.1, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 112, t1: 126 },
      { fx: "shockRing", t0: 112, t1: 146, count: 4, color: "rgba(120,230,180,0.7)" },
      { fx: "headPop", t0: 116, t1: 146, headY: 0.42 },
      { fx: "bloodGush", t0: 116, t1: 170, x: 0.5, y: 0.46, amount: 34 },
      { fx: "cam",   t0: 146, t1: 170, zoom: 1.4, cx: 0.5, cy: 0.5, ease: 0.1 },
      { fx: "actor", t0: 148, t1: 170, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 152, t1: 170 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise",   gain: 0.5 },
      { t: 68,  id: "boom_anticipation_suck", gain: 0.4 },
      { t: 112, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 118, id: "rumble_tail_01",    gain: 0.55 },
    ],
  },

  // VEGITO — Spirit Sword: a blade of pure ki lances out and cuts the target clean in two.
  vegito: {
    banner: "SPIRIT SWORD", bannerRgb: "120,200,255", base: "hurt", choreographed: true, total: 166,
    beats: [
      { fx: "letterbox", t0: 0, t1: 166, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 166, rgb: "4,8,18", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 100, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 96, who: "atk", action: "heavy", x: 0.84, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "cam",   t0: 46, t1: 100, zoom: 1.7, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "swordSlash", t0: 66, t1: 100, x: 0.52, y: 0.46, len: 0.42, angle: -2.4, sweep: 3.0, color: "rgba(140,210,255,0.95)" },
      { fx: "whiteSpike", t0: 92, t1: 104 },
      { fx: "cam",   t0: 100, t1: 144, zoom: 2.0, cx: 0.5, cy: 0.47, cut: true },
      { fx: "soulSplit", t0: 100, t1: 158 },
      { fx: "bloodGush", t0: 104, t1: 166, x: 0.5, y: 0.5, amount: 16 },
      { fx: "cam",   t0: 144, t1: 166, zoom: 1.4, cx: 0.5, cy: 0.52, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 166, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 150, t1: 166 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise", gain: 0.5 },
      { t: 66,  id: "swish_fast_01",   gain: 0.6 },
      { t: 100, id: "boom_medium_02",  gain: 1.0, ultBoom: true, duckSec: 0.45 },
      { t: 106, id: "rumble_tail_01",  gain: 0.45 },
    ],
  },

  // GOTENKS — Super Ghost Kamikaze Attack: a squadron of exploding ghosts swarms the target and detonates as one.
  gotenks: {
    banner: "GHOST KAMIKAZE", bannerRgb: "180,160,240", base: "hurt", choreographed: true, total: 176,
    beats: [
      { fx: "letterbox", t0: 0, t1: 176, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 176, rgb: "6,6,14", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 50, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "cam",   t0: 44, t1: 116, zoom: 1.4, cx: 0.5, cy: 0.47, ease: 0.08 },
      { fx: "flickerRush", t0: 48, t1: 116, action: "run", around: 0.5, aroundY: 0.48, count: 8, radX: 0.3, radY: 0.14, color: "#c0a8f0" },
      { fx: "actor", t0: 50, t1: 116, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "shockRing", t0: 60, t1: 116, count: 3, color: "rgba(200,180,255,0.6)" },
      { fx: "bloodGush", t0: 66, t1: 176, x: 0.5, y: 0.5, amount: 8 },
      { fx: "cam",   t0: 116, t1: 150, zoom: 2.05, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 116, t1: 132 },
      { fx: "shockRing", t0: 116, t1: 150, count: 5, color: "rgba(210,190,255,0.7)" },
      { fx: "headPop", t0: 120, t1: 150, headY: 0.42 },
      { fx: "bloodGush", t0: 120, t1: 176, x: 0.5, y: 0.46, amount: 34 },
      { fx: "cam",   t0: 150, t1: 176, zoom: 1.4, cx: 0.5, cy: 0.5, ease: 0.1 },
      { fx: "actor", t0: 152, t1: 176, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 156, t1: 176 },
    ],
    sound: [
      { t: 1,   id: "boom_anticipation_suck", gain: 0.45 },
      { t: 48,  id: "warp_wobble_01",         gain: 0.5 },
      { t: 116, id: "boom_huge_02_roar",      gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 122, id: "rumble_tail_01",         gain: 0.55 },
    ],
  },


  // ── PHASE 7 — GODS & MONSTERS (Dragon Ball) ──────────────────────────────────────────────────────
  // frieza · cell · piccolo · beerus · goku_black · goku_rose

  // FRIEZA — Death Beam: a thin, casual finger-beam punched straight through the skull.
  frieza: {
    banner: "DEATH BEAM", bannerRgb: "190,90,230", base: "hurt", choreographed: true, total: 166,
    beats: [
      { fx: "letterbox", t0: 0, t1: 166, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 166, rgb: "8,2,14", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 44, zoom: 1.5, cx: 0.52, cy: 0.42, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 144, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 116, who: "atk", action: "heavy", x: 0.84, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "cam",   t0: 46, t1: 112, zoom: 1.6, cx: 0.5, cy: 0.4, ease: 0.08 },
      { fx: "kiBeam", t0: 60, t1: 112, headY: 0.18, color: "#c060ff", wide: 0.16 },
      { fx: "whiteSpike", t0: 92, t1: 102 },
      { fx: "bloodGush", t0: 94, t1: 166, x: 0.5, y: 0.2, amount: 8 },
      { fx: "cam",   t0: 112, t1: 144, zoom: 2.1, cx: 0.5, cy: 0.3, cut: true },
      { fx: "whiteSpike", t0: 112, t1: 122 },
      { fx: "headPop", t0: 114, t1: 144, headY: 0.16 },
      { fx: "bloodGush", t0: 114, t1: 166, x: 0.5, y: 0.18, amount: 30 },
      { fx: "cam",   t0: 144, t1: 166, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 144, t1: 166, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 146, t1: 166, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 150, t1: 166 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise", gain: 0.45 },
      { t: 60,  id: "crack_sizzle_bright", gain: 0.55 },
      { t: 112, id: "boom_huge_01",    gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 118, id: "rumble_tail_01",  gain: 0.5 },
    ],
  },

  // CELL — Absorption: his tail opens over the target and drinks them down to a husk.
  cell: {
    banner: "ABSORPTION", bannerRgb: "120,220,120", base: "hurt", choreographed: true, total: 180,
    beats: [
      { fx: "letterbox", t0: 0, t1: 180, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 180, rgb: "4,12,6", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 120, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam",   t0: 46, t1: 146, zoom: 1.58, cx: 0.5, cy: 0.46, ease: 0.07 },
      { fx: "maw",   t0: 50, t1: 144, color: "#58c858" },
      { fx: "cam",   t0: 144, t1: 168, zoom: 2.3, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 144, t1: 156 },
      { fx: "headPop", t0: 146, t1: 168, headY: 0.3 },
      { fx: "bloodGush", t0: 148, t1: 180, x: 0.5, y: 0.46, amount: 28 },
      { fx: "cam",   t0: 168, t1: 180, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 168, t1: 180, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 168, t1: 180, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 170, t1: 180 },
    ],
    sound: [
      { t: 1,   id: "boom_anticipation_suck", gain: 0.5 },
      { t: 50,  id: "warp_wobble_01",         gain: 0.5 },
      { t: 144, id: "boom_huge_02_roar",      gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 150, id: "rumble_tail_01",         gain: 0.55 },
    ],
  },

  // PICCOLO — Makankosappo: the Special Beam Cannon, a spiralling drill of ki that bores clean through.
  piccolo: {
    banner: "MAKANKOSAPPO", bannerRgb: "210,80,200", base: "hurt", choreographed: true, total: 168,
    beats: [
      { fx: "letterbox", t0: 0, t1: 168, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 168, rgb: "10,2,12", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 144, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 116, who: "atk", action: "heavy", x: 0.84, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "cam",   t0: 46, t1: 112, zoom: 1.6, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "kiBeam", t0: 60, t1: 112, headY: 0.45, color: "#d850c8", wide: 0.2 },
      { fx: "whiteSpike", t0: 92, t1: 102 },
      { fx: "bloodGush", t0: 94, t1: 168, x: 0.5, y: 0.46, amount: 8 },
      { fx: "cam",   t0: 112, t1: 144, zoom: 2.1, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 112, t1: 122 },
      { fx: "rasengan", t0: 112, t1: 140, headY: 0.45, size: 0.4, color: "#e060d0" },
      { fx: "headPop", t0: 116, t1: 144, headY: 0.45 },
      { fx: "bloodGush", t0: 116, t1: 168, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam",   t0: 144, t1: 168, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 144, t1: 168, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 146, t1: 168, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 150, t1: 168 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise", gain: 0.5 },
      { t: 60,  id: "crack_sizzle_bright", gain: 0.55 },
      { t: 112, id: "boom_huge_01",    gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 118, id: "rumble_tail_01",  gain: 0.5 },
    ],
  },

  // BEERUS — Hakai: the God of Destruction speaks the word, and the target is simply erased from existence.
  beerus: {
    banner: "HAKAI", bannerRgb: "200,80,240", base: "hurt", choreographed: true, total: 168,
    beats: [
      { fx: "letterbox", t0: 0, t1: 168, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 168, rgb: "8,2,12", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 168, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 116, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam",   t0: 46, t1: 116, zoom: 1.6, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "whiteSpike", t0: 52, t1: 60 },
      { fx: "incinerate", t0: 56, t1: 164, color: "#c040f0", black: true },
      { fx: "cam",   t0: 118, t1: 160, zoom: 2.05, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 118, t1: 128 },
      { fx: "banner", t0: 148, t1: 168 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise",   gain: 0.5 },
      { t: 52,  id: "boom_anticipation_suck", gain: 0.45 },
      { t: 118, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 124, id: "rumble_tail_01",    gain: 0.5 },
    ],
  },

  // GOKU BLACK — a Kamehameha wreathed in dark God-ki; the same wave, drained of all mercy.
  goku_black: {
    banner: "KAMEHAMEHA", bannerRgb: "210,60,90", base: "hurt", choreographed: true, total: 180,
    beats: [
      { fx: "letterbox", t0: 0, t1: 180, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 180, rgb: "14,2,6", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 120, who: "atk", action: "heavy", x: 0.84, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "cam",   t0: 46, t1: 118, zoom: 1.55, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "kiBeam", t0: 54, t1: 150, headY: 0.45, color: "#e03a5a" },
      { fx: "whiteSpike", t0: 92, t1: 104 },
      { fx: "bloodGush", t0: 96, t1: 180, x: 0.5, y: 0.46, amount: 8 },
      { fx: "cam",   t0: 120, t1: 158, zoom: 2.0, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 120, t1: 134 },
      { fx: "headPop", t0: 124, t1: 158, headY: 0.45 },
      { fx: "bloodGush", t0: 124, t1: 180, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam",   t0: 158, t1: 180, zoom: 1.4, cx: 0.5, cy: 0.52, ease: 0.1 },
      { fx: "actor", t0: 160, t1: 180, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 162, t1: 180 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise",   gain: 0.55 },
      { t: 78,  id: "boom_anticipation_suck", gain: 0.4 },
      { t: 120, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 126, id: "rumble_tail_01",    gain: 0.55 },
    ],
  },

  // GOKU BLACK (ROSÉ) — the God Split Cut: a blade of rose-coloured God-ki forms and cleaves the target in two.
  goku_rose: {
    banner: "GOD SPLIT CUT", bannerRgb: "255,130,190", base: "hurt", choreographed: true, total: 166,
    beats: [
      { fx: "letterbox", t0: 0, t1: 166, in: 14, h: 0.13 },
      { fx: "darken",    t0: 0, t1: 166, rgb: "16,4,12", max: 0.97, ramp: 8 },
      { fx: "cam",   t0: 0,  t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0,  t1: 100, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 96, who: "atk", action: "heavy", x: 0.84, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "cam",   t0: 46, t1: 100, zoom: 1.7, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "swordSlash", t0: 66, t1: 100, x: 0.52, y: 0.46, len: 0.42, angle: -2.4, sweep: 3.0, color: "rgba(255,150,200,0.95)" },
      { fx: "whiteSpike", t0: 92, t1: 104 },
      { fx: "cam",   t0: 100, t1: 144, zoom: 2.0, cx: 0.5, cy: 0.47, cut: true },
      { fx: "soulSplit", t0: 100, t1: 158 },
      { fx: "bloodGush", t0: 104, t1: 166, x: 0.5, y: 0.5, amount: 16 },
      { fx: "cam",   t0: 144, t1: 166, zoom: 1.4, cx: 0.5, cy: 0.52, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 166, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 150, t1: 166 },
    ],
    sound: [
      { t: 1,   id: "charge_hum_rise", gain: 0.5 },
      { t: 66,  id: "swish_fast_01",   gain: 0.6 },
      { t: 100, id: "boom_medium_02",  gain: 1.0, ultBoom: true, duckSec: 0.45 },
      { t: 106, id: "rumble_tail_01",  gain: 0.45 },
    ],
  },


  // ── PHASE 8 — NEN (Hunter x Hunter) ──────────────────────────────────────────────────────────────
  // Batch 8A "Zoldycks & Powerhouses": killua · zoldyck · gon · meruem · netero

  // KILLUA — Godspeed: electrified to light-speed, he blitzes from every angle in a storm of lightning.
  killua: {
    banner: "GODSPEED", bannerRgb: "126,216,255", base: "hurt", choreographed: true, total: 172,
    beats: [
      { fx: "letterbox", t0: 0, t1: 172, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 172, rgb: "2,10,16", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 50, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "cam", t0: 44, t1: 116, zoom: 1.4, cx: 0.5, cy: 0.47, ease: 0.08 },
      { fx: "flickerRush", t0: 48, t1: 116, action: "run", around: 0.5, aroundY: 0.48, count: 10, radX: 0.3, radY: 0.14, color: "#7ed8ff" },
      { fx: "actor", t0: 50, t1: 116, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "lightning", t0: 54, t1: 116, headY: 0.45, color: "#8ae0ff" },
      { fx: "bloodGush", t0: 60, t1: 172, x: 0.5, y: 0.5, amount: 8 },
      { fx: "cam", t0: 116, t1: 150, zoom: 2.1, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 116, t1: 126 },
      { fx: "lightning", t0: 116, t1: 148, headY: 0.45, color: "#aef0ff" },
      { fx: "headPop", t0: 120, t1: 148, headY: 0.45 },
      { fx: "bloodGush", t0: 120, t1: 172, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam", t0: 150, t1: 172, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 150, t1: 172, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 150, t1: 172, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 154, t1: 172 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.5 },
      { t: 48, id: "warp_wobble_01", gain: 0.5 },
      { t: 116, id: "boom_huge_01", gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 122, id: "rumble_tail_01", gain: 0.5 },
    ],
  },

  // ZOLDYCK (Killua) — Narukami: a single colossal thunderbolt spears the target through.
  zoldyck: {
    banner: "THUNDERBOLT", bannerRgb: "140,200,255", base: "hurt", choreographed: true, total: 166,
    beats: [
      { fx: "letterbox", t0: 0, t1: 166, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 166, rgb: "6,8,16", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 144, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "flickerIn", t0: 26, t1: 46, action: "run", fromX: 0.92, toX: 0.6, y: 0.52, facing: -1, color: "rgba(140,200,255,0.5)" },
      { fx: "cam", t0: 44, t1: 112, zoom: 1.85, cx: 0.52, cy: 0.46, cut: true },
      { fx: "actor", t0: 44, t1: 72, who: "atk", action: "heavy", x: 0.64, y: 0.5, frame: "once:3", facing: -1 },
      { fx: "actor", t0: 48, t1: 144, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "impale", t0: 50, t1: 112, color: "#cfe8ff", headY: 0.45 },
      { fx: "lightning", t0: 50, t1: 144, headY: 0.45, color: "#8ac8ff" },
      { fx: "whiteSpike", t0: 52, t1: 62 },
      { fx: "bloodGush", t0: 58, t1: 166, x: 0.5, y: 0.46, amount: 10 },
      { fx: "cam", t0: 112, t1: 144, zoom: 2.15, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 112, t1: 122 },
      { fx: "lightning", t0: 112, t1: 140, headY: 0.45, color: "#aed8ff" },
      { fx: "headPop", t0: 116, t1: 144, headY: 0.45 },
      { fx: "bloodGush", t0: 116, t1: 166, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam", t0: 144, t1: 166, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 144, t1: 166, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 146, t1: 166, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 150, t1: 166 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.5 },
      { t: 50, id: "crack_sizzle_bright", gain: 0.6 },
      { t: 112, id: "boom_huge_01", gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 118, id: "rumble_tail_01", gain: 0.5 },
    ],
  },

  // GON — Jajanken: "First comes rock!" A fist charged with his entire aura lands like a wrecking ball.
  gon: {
    banner: "JAJANKEN", bannerRgb: "90,220,140", base: "hurt", choreographed: true, total: 164,
    beats: [
      { fx: "letterbox", t0: 0, t1: 164, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 164, rgb: "6,14,8", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 50, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "flickerIn", t0: 26, t1: 44, action: "run", fromX: 0.92, toX: 0.6, y: 0.52, facing: -1, color: "rgba(90,220,140,0.5)" },
      { fx: "cam", t0: 42, t1: 96, zoom: 1.85, cx: 0.52, cy: 0.46, cut: true },
      { fx: "actor", t0: 42, t1: 72, who: "atk", action: "heavy", x: 0.64, y: 0.5, frame: "once:3", facing: -1 },
      { fx: "actor", t0: 44, t1: 140, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "whiteSpike", t0: 70, t1: 82 },
      { fx: "bloodGush", t0: 72, t1: 164, x: 0.5, y: 0.46, amount: 10 },
      { fx: "cam", t0: 96, t1: 138, zoom: 2.1, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 96, t1: 106 },
      { fx: "headPop", t0: 98, t1: 138, headY: 0.4 },
      { fx: "shockRing", t0: 98, t1: 138, count: 3, color: "rgba(120,230,160,0.7)" },
      { fx: "bloodGush", t0: 98, t1: 164, x: 0.5, y: 0.46, amount: 34 },
      { fx: "cam", t0: 138, t1: 164, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 138, t1: 164, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 140, t1: 164, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 144, t1: 164 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.55 },
      { t: 42, id: "boom_anticipation_suck", gain: 0.45 },
      { t: 96, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 102, id: "rumble_tail_01", gain: 0.55 },
    ],
  },

  // MERUEM — the Chimera Ant King: one disdainful blow carries more force than an army; the body simply folds.
  meruem: {
    banner: "THE KING", bannerRgb: "150,220,160", base: "hurt", choreographed: true, total: 166,
    beats: [
      { fx: "letterbox", t0: 0, t1: 166, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 166, rgb: "8,12,6", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 50, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "flickerIn", t0: 26, t1: 44, action: "run", fromX: 0.92, toX: 0.6, y: 0.52, facing: -1, color: "rgba(150,220,160,0.5)" },
      { fx: "cam", t0: 42, t1: 96, zoom: 1.85, cx: 0.52, cy: 0.46, cut: true },
      { fx: "actor", t0: 42, t1: 72, who: "atk", action: "heavy", x: 0.64, y: 0.5, frame: "once:3", facing: -1 },
      { fx: "actor", t0: 44, t1: 140, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "shockRing", t0: 70, t1: 110, count: 3, color: "rgba(160,230,170,0.6)" },
      { fx: "whiteSpike", t0: 70, t1: 82 },
      { fx: "bloodGush", t0: 72, t1: 166, x: 0.5, y: 0.46, amount: 10 },
      { fx: "cam", t0: 96, t1: 138, zoom: 2.1, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 96, t1: 106 },
      { fx: "headPop", t0: 98, t1: 138, headY: 0.4 },
      { fx: "shockRing", t0: 98, t1: 138, count: 4, color: "rgba(170,235,180,0.7)" },
      { fx: "bloodGush", t0: 98, t1: 166, x: 0.5, y: 0.46, amount: 34 },
      { fx: "cam", t0: 138, t1: 166, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 138, t1: 166, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 140, t1: 166, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 144, t1: 166 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.55 },
      { t: 42, id: "boom_anticipation_suck", gain: 0.45 },
      { t: 96, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 102, id: "rumble_tail_01", gain: 0.55 },
    ],
  },

  // NETERO — 100-Type Guanyin Bodhisattva: prayer-fast strikes rain down by the hundred, then one final palm.
  netero: {
    banner: "100-TYPE GUANYIN", bannerRgb: "230,200,120", base: "hurt", choreographed: true, total: 174,
    beats: [
      { fx: "letterbox", t0: 0, t1: 174, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 174, rgb: "12,10,4", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 50, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "cam", t0: 44, t1: 116, zoom: 1.45, cx: 0.5, cy: 0.47, ease: 0.08 },
      { fx: "flickerRush", t0: 48, t1: 116, action: "run", around: 0.5, aroundY: 0.48, count: 11, radX: 0.3, radY: 0.14, color: "#e0c070" },
      { fx: "actor", t0: 50, t1: 116, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "shockRing", t0: 56, t1: 116, count: 4, color: "rgba(230,200,120,0.55)" },
      { fx: "bloodGush", t0: 62, t1: 174, x: 0.5, y: 0.5, amount: 8 },
      { fx: "cam", t0: 116, t1: 150, zoom: 2.05, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 116, t1: 130 },
      { fx: "shockRing", t0: 116, t1: 150, count: 5, color: "rgba(240,210,130,0.7)" },
      { fx: "headPop", t0: 120, t1: 150, headY: 0.42 },
      { fx: "bloodGush", t0: 120, t1: 174, x: 0.5, y: 0.46, amount: 32 },
      { fx: "cam", t0: 150, t1: 174, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 150, t1: 174, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 152, t1: 174, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 156, t1: 174 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.5 },
      { t: 48, id: "warp_wobble_01", gain: 0.5 },
      { t: 116, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 122, id: "rumble_tail_01", gain: 0.55 },
    ],
  },


  // Batch 8B "Troupe & Hunters": hisoka · chrollo · kurapika · shizuku

  // HISOKA — Bungee Gum: his elastic Nen wraps the target, then snaps taut and tears them apart. "Bungee Gum
  // possesses the properties of both rubber and gum."
  hisoka: {
    banner: "BUNGEE GUM", bannerRgb: "230,60,150", base: "hurt", choreographed: true, total: 174,
    beats: [
      { fx: "letterbox", t0: 0, t1: 174, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 174, rgb: "14,2,10", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 116, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 116, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam", t0: 46, t1: 116, zoom: 1.6, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "strings", t0: 52, t1: 116, color: "rgba(240,80,170,0.8)" },
      { fx: "bloodGush", t0: 70, t1: 174, x: 0.5, y: 0.5, amount: 6 },
      { fx: "cam", t0: 116, t1: 158, zoom: 1.95, cx: 0.5, cy: 0.47, cut: true },
      { fx: "whiteSpike", t0: 116, t1: 128 },
      { fx: "shatter", t0: 120, t1: 168, cols: 5, rows: 7, spread: 1.3 },
      { fx: "bloodGush", t0: 122, t1: 174, x: 0.5, y: 0.5, amount: 16 },
      { fx: "cam", t0: 158, t1: 174, zoom: 1.4, cx: 0.5, cy: 0.5, ease: 0.1 },
      { fx: "actor", t0: 160, t1: 174, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 162, t1: 174 },
    ],
    sound: [
      { t: 1, id: "boom_anticipation_suck", gain: 0.45 },
      { t: 52, id: "warp_wobble_01", gain: 0.5 },
      { t: 116, id: "boom_huge_01", gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 122, id: "rumble_tail_01", gain: 0.5 },
    ],
  },

  // CHROLLO — Sun and Moon: the Black Voice tattoos a sun and a moon; when they touch, the target detonates.
  chrollo: {
    banner: "SUN AND MOON", bannerRgb: "200,120,255", base: "hurt", choreographed: true, total: 170,
    beats: [
      { fx: "letterbox", t0: 0, t1: 170, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 170, rgb: "8,4,14", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 116, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam", t0: 46, t1: 114, zoom: 1.62, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "shockRing", t0: 56, t1: 114, count: 3, color: "rgba(200,120,255,0.5)" },
      { fx: "bloodGush", t0: 70, t1: 170, x: 0.5, y: 0.5, amount: 6 },
      { fx: "cam", t0: 114, t1: 146, zoom: 2.05, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 114, t1: 128 },
      { fx: "shockRing", t0: 114, t1: 146, count: 5, color: "rgba(210,130,255,0.7)" },
      { fx: "headPop", t0: 118, t1: 146, headY: 0.42 },
      { fx: "bloodGush", t0: 118, t1: 170, x: 0.5, y: 0.46, amount: 32 },
      { fx: "cam", t0: 146, t1: 170, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 170, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 148, t1: 170, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 152, t1: 170 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.45 },
      { t: 56, id: "warp_wobble_01", gain: 0.5 },
      { t: 114, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 120, id: "rumble_tail_01", gain: 0.55 },
    ],
  },

  // KURAPIKA — Chain Jail & Judgment: golden chains bind the target, then the heart-stopping stake drives home.
  kurapika: {
    banner: "CHAIN JAIL", bannerRgb: "230,60,60", base: "hurt", choreographed: true, total: 172,
    beats: [
      { fx: "letterbox", t0: 0, t1: 172, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 172, rgb: "14,8,2", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 116, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam", t0: 46, t1: 114, zoom: 1.6, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "strings", t0: 52, t1: 114, color: "rgba(240,200,80,0.85)" },
      { fx: "impale", t0: 72, t1: 114, color: "#e0c050", headY: 0.45 },
      { fx: "bloodGush", t0: 66, t1: 172, x: 0.5, y: 0.46, amount: 8 },
      { fx: "cam", t0: 114, t1: 146, zoom: 2.05, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 114, t1: 124 },
      { fx: "headPop", t0: 118, t1: 146, headY: 0.45 },
      { fx: "bloodGush", t0: 118, t1: 172, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam", t0: 146, t1: 172, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 172, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 148, t1: 172, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 152, t1: 172 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.45 },
      { t: 52, id: "warp_wobble_01", gain: 0.5 },
      { t: 114, id: "boom_huge_01", gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 120, id: "rumble_tail_01", gain: 0.5 },
    ],
  },

  // SHIZUKU — Blinky: her vacuum Nen beast opens wide and sucks the target down to nothing.
  shizuku: {
    banner: "BLINKY", bannerRgb: "120,200,220", base: "hurt", choreographed: true, total: 176,
    beats: [
      { fx: "letterbox", t0: 0, t1: 176, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 176, rgb: "4,10,14", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 146, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 120, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam", t0: 46, t1: 144, zoom: 1.58, cx: 0.5, cy: 0.46, ease: 0.07 },
      { fx: "maw", t0: 50, t1: 144, color: "#50b8c8" },
      { fx: "cam", t0: 144, t1: 168, zoom: 2.25, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 144, t1: 156 },
      { fx: "headPop", t0: 146, t1: 168, headY: 0.3 },
      { fx: "bloodGush", t0: 148, t1: 176, x: 0.5, y: 0.46, amount: 28 },
      { fx: "cam", t0: 168, t1: 176, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 168, t1: 176, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 168, t1: 176, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 170, t1: 176 },
    ],
    sound: [
      { t: 1, id: "boom_anticipation_suck", gain: 0.5 },
      { t: 50, id: "warp_wobble_01", gain: 0.5 },
      { t: 144, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 150, id: "rumble_tail_01", gain: 0.55 },
    ],
  },


  // ── PHASE 9 — SOUL REAPERS (Bleach) ──────────────────────────────────────────────────────────────
  // ichigo · byakuya · zaraki · zaraki_shikai · mayuri · yamamoto

  // ICHIGO — Getsuga Tensho: a crescent wave of black-red spirit energy cleaves the target in two.
  ichigo: {
    banner: "GETSUGA TENSHO", bannerRgb: "230,40,60", base: "hurt", choreographed: true, total: 166,
    beats: [
      { fx: "letterbox", t0: 0, t1: 166, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 166, rgb: "4,2,6", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 100, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 96, who: "atk", action: "heavy", x: 0.84, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "cam", t0: 46, t1: 100, zoom: 1.7, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "swordSlash", t0: 66, t1: 100, x: 0.52, y: 0.46, len: 0.44, angle: -2.5, sweep: 3.0, color: "rgba(220,50,70,0.95)" },
      { fx: "whiteSpike", t0: 92, t1: 104 },
      { fx: "cam", t0: 100, t1: 144, zoom: 2.0, cx: 0.5, cy: 0.47, cut: true },
      { fx: "soulSplit", t0: 100, t1: 158 },
      { fx: "bloodGush", t0: 104, t1: 166, x: 0.5, y: 0.5, amount: 16 },
      { fx: "cam", t0: 144, t1: 166, zoom: 1.4, cx: 0.5, cy: 0.52, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 166, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 150, t1: 166 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.5 },
      { t: 66, id: "swish_fast_01", gain: 0.6 },
      { t: 100, id: "boom_huge_01", gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 106, id: "rumble_tail_01", gain: 0.5 },
    ],
  },

  // BYAKUYA — Senbonzakura: a thousand petal-blades swarm and shred the target to confetti.
  byakuya: {
    banner: "SENBONZAKURA", bannerRgb: "240,120,170", base: "hurt", choreographed: true, total: 172,
    beats: [
      { fx: "letterbox", t0: 0, t1: 172, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 172, rgb: "12,4,10", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 116, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 116, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam", t0: 46, t1: 116, zoom: 1.55, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "slashCross", t0: 52, t1: 116, count: 26, color: "#f078aa" },
      { fx: "bloodGush", t0: 66, t1: 172, x: 0.5, y: 0.5, amount: 6 },
      { fx: "cam", t0: 116, t1: 158, zoom: 1.95, cx: 0.5, cy: 0.47, cut: true },
      { fx: "whiteSpike", t0: 116, t1: 128 },
      { fx: "shatter", t0: 120, t1: 168, cols: 6, rows: 8, spread: 1.3 },
      { fx: "bloodGush", t0: 122, t1: 172, x: 0.5, y: 0.5, amount: 16 },
      { fx: "cam", t0: 158, t1: 172, zoom: 1.4, cx: 0.5, cy: 0.5, ease: 0.1 },
      { fx: "actor", t0: 160, t1: 172, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 162, t1: 172 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.45 },
      { t: 52, id: "swish_fast_01", gain: 0.55 },
      { t: 116, id: "boom_huge_01", gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 122, id: "rumble_tail_01", gain: 0.5 },
    ],
  },

  // ZARAKI — Kendo: a single reckless, overwhelming cleave splits the target top to bottom.
  zaraki: {
    banner: "KENDO", bannerRgb: "220,110,60", base: "hurt", choreographed: true, total: 164,
    beats: [
      { fx: "letterbox", t0: 0, t1: 164, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 164, rgb: "10,6,2", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 100, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 96, who: "atk", action: "heavy", x: 0.84, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "cam", t0: 46, t1: 100, zoom: 1.7, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "swordSlash", t0: 66, t1: 100, x: 0.52, y: 0.42, len: 0.5, angle: -1.9, sweep: 3.2, color: "rgba(230,120,70,0.95)" },
      { fx: "whiteSpike", t0: 92, t1: 104 },
      { fx: "cam", t0: 100, t1: 142, zoom: 2.0, cx: 0.5, cy: 0.47, cut: true },
      { fx: "soulSplit", t0: 100, t1: 156 },
      { fx: "bloodGush", t0: 104, t1: 164, x: 0.5, y: 0.5, amount: 18 },
      { fx: "cam", t0: 142, t1: 164, zoom: 1.4, cx: 0.5, cy: 0.52, ease: 0.1 },
      { fx: "actor", t0: 144, t1: 164, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 148, t1: 164 },
    ],
    sound: [
      { t: 1, id: "boom_anticipation_suck", gain: 0.5 },
      { t: 66, id: "swish_fast_01", gain: 0.6 },
      { t: 100, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 106, id: "rumble_tail_01", gain: 0.55 },
    ],
  },

  // ZARAKI (SHIKAI) — Nozarashi: the colossal cleaver comes down and dices whatever is beneath it.
  zaraki_shikai: {
    banner: "NOZARASHI", bannerRgb: "210,120,90", base: "hurt", choreographed: true, total: 168,
    beats: [
      { fx: "letterbox", t0: 0, t1: 168, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 168, rgb: "12,6,4", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 110, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 104, who: "atk", action: "heavy", x: 0.84, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "cam", t0: 46, t1: 110, zoom: 1.6, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "swordSlash", t0: 70, t1: 110, x: 0.52, y: 0.4, len: 0.55, angle: -1.8, sweep: 2.6, color: "rgba(230,140,100,0.95)" },
      { fx: "whiteSpike", t0: 100, t1: 112 },
      { fx: "cam", t0: 110, t1: 152, zoom: 1.95, cx: 0.5, cy: 0.47, cut: true },
      { fx: "shatter", t0: 114, t1: 162, cols: 5, rows: 7, spread: 1.2 },
      { fx: "bloodGush", t0: 116, t1: 168, x: 0.5, y: 0.5, amount: 16 },
      { fx: "cam", t0: 152, t1: 168, zoom: 1.4, cx: 0.5, cy: 0.5, ease: 0.1 },
      { fx: "actor", t0: 154, t1: 168, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 156, t1: 168 },
    ],
    sound: [
      { t: 1, id: "boom_anticipation_suck", gain: 0.5 },
      { t: 70, id: "swish_fast_01", gain: 0.6 },
      { t: 110, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 116, id: "rumble_tail_01", gain: 0.55 },
    ],
  },

  // MAYURI — Ashisogi Jizo: a vivisection carried out mid-fight; toxic blades open the target piece by piece.
  mayuri: {
    banner: "ASHISOGI JIZO", bannerRgb: "120,210,90", base: "hurt", choreographed: true, total: 170,
    beats: [
      { fx: "letterbox", t0: 0, t1: 170, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 170, rgb: "6,12,4", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 116, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam", t0: 46, t1: 114, zoom: 1.6, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "slashCross", t0: 52, t1: 114, count: 18, color: "#7ad040" },
      { fx: "impale", t0: 74, t1: 114, color: "#aef050", headY: 0.45 },
      { fx: "bloodGush", t0: 60, t1: 170, x: 0.5, y: 0.5, amount: 8 },
      { fx: "cam", t0: 114, t1: 146, zoom: 2.05, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 114, t1: 124 },
      { fx: "slashCross", t0: 114, t1: 146, count: 12, color: "#a0e860" },
      { fx: "headPop", t0: 118, t1: 146, headY: 0.42 },
      { fx: "bloodGush", t0: 118, t1: 170, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam", t0: 146, t1: 170, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 170, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 148, t1: 170, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 152, t1: 170 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.45 },
      { t: 52, id: "swish_fast_01", gain: 0.55 },
      { t: 114, id: "boom_huge_01", gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 120, id: "rumble_tail_01", gain: 0.5 },
    ],
  },

  // YAMAMOTO — Ryujin Jakka: the oldest and fiercest flame zanpakuto; its fire consumes all it touches.
  yamamoto: {
    banner: "RYUJIN JAKKA", bannerRgb: "255,140,40", base: "hurt", choreographed: true, total: 178,
    beats: [
      { fx: "letterbox", t0: 0, t1: 178, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 178, rgb: "16,8,2", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 178, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 120, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam", t0: 46, t1: 118, zoom: 1.62, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "flameBeam", t0: 60, t1: 120, color: "#ff8a1e" },
      { fx: "whiteSpike", t0: 56, t1: 64 },
      { fx: "incinerate", t0: 60, t1: 174, color: "#ff7a1e" },
      { fx: "cam", t0: 120, t1: 162, zoom: 2.1, cx: 0.5, cy: 0.46, cut: true },
      { fx: "banner", t0: 150, t1: 178 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.5 },
      { t: 56, id: "boom_anticipation_suck", gain: 0.4 },
      { t: 120, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 126, id: "rumble_tail_01", gain: 0.5 },
    ],
  },


  // ── PHASE 10 — TOTAL CONCENTRATION (Demon Slayer) ────────────────────────────────────────────────
  // nezuko · inosuke · rengoku · shinobu · zenitsu

  // NEZUKO — Blood Demon Art: her crimson blood ignites into pink demon-flames that burn only her enemy.
  nezuko: {
    banner: "BLOOD DEMON ART", bannerRgb: "240,80,140", base: "hurt", choreographed: true, total: 176,
    beats: [
      { fx: "letterbox", t0: 0, t1: 176, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 176, rgb: "14,2,8", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 176, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 120, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam", t0: 46, t1: 118, zoom: 1.62, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "whiteSpike", t0: 56, t1: 64 },
      { fx: "flameBeam", t0: 60, t1: 120, color: "#ff5aa0" },
      { fx: "incinerate", t0: 60, t1: 172, color: "#ff5aa0", black: true },
      { fx: "cam", t0: 120, t1: 162, zoom: 2.1, cx: 0.5, cy: 0.46, cut: true },
      { fx: "banner", t0: 148, t1: 176 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.5 },
      { t: 56, id: "boom_anticipation_suck", gain: 0.4 },
      { t: 120, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 126, id: "rumble_tail_01", gain: 0.5 },
    ],
  },

  // INOSUKE — Beast Breathing: a feral storm of dual serrated blades hacks the target apart.
  inosuke: {
    banner: "BEAST BREATHING", bannerRgb: "120,160,220", base: "hurt", choreographed: true, total: 168,
    beats: [
      { fx: "letterbox", t0: 0, t1: 168, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 168, rgb: "6,8,12", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 50, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "cam", t0: 44, t1: 112, zoom: 1.4, cx: 0.5, cy: 0.47, ease: 0.08 },
      { fx: "flickerRush", t0: 48, t1: 112, action: "run", around: 0.5, aroundY: 0.48, count: 9, radX: 0.3, radY: 0.14, color: "#90b0e0" },
      { fx: "actor", t0: 50, t1: 112, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "slashCross", t0: 52, t1: 112, count: 20, color: "#b8d0f0" },
      { fx: "bloodGush", t0: 60, t1: 168, x: 0.5, y: 0.5, amount: 8 },
      { fx: "cam", t0: 112, t1: 154, zoom: 1.95, cx: 0.5, cy: 0.47, cut: true },
      { fx: "whiteSpike", t0: 112, t1: 124 },
      { fx: "shatter", t0: 116, t1: 162, cols: 6, rows: 8, spread: 1.3 },
      { fx: "bloodGush", t0: 118, t1: 168, x: 0.5, y: 0.5, amount: 16 },
      { fx: "cam", t0: 154, t1: 168, zoom: 1.4, cx: 0.5, cy: 0.5, ease: 0.1 },
      { fx: "actor", t0: 156, t1: 168, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 158, t1: 168 },
    ],
    sound: [
      { t: 1, id: "boom_anticipation_suck", gain: 0.45 },
      { t: 48, id: "warp_wobble_01", gain: 0.5 },
      { t: 112, id: "boom_huge_01", gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 118, id: "rumble_tail_01", gain: 0.5 },
    ],
  },

  // RENGOKU — Flame Breathing: the blazing Flame Tiger rips through in a wave of fire.
  rengoku: {
    banner: "FLAME BREATHING", bannerRgb: "255,150,40", base: "hurt", choreographed: true, total: 168,
    beats: [
      { fx: "letterbox", t0: 0, t1: 168, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 168, rgb: "16,8,2", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 144, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 116, who: "atk", action: "heavy", x: 0.84, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "cam", t0: 46, t1: 112, zoom: 1.7, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "swordSlash", t0: 66, t1: 112, x: 0.52, y: 0.44, len: 0.5, angle: -2.2, sweep: 3.0, color: "rgba(255,150,40,0.95)" },
      { fx: "whiteSpike", t0: 100, t1: 112 },
      { fx: "bloodGush", t0: 72, t1: 168, x: 0.5, y: 0.46, amount: 8 },
      { fx: "cam", t0: 112, t1: 144, zoom: 2.05, cx: 0.5, cy: 0.46, cut: true },
      { fx: "incinerate", t0: 112, t1: 158, color: "#ff7a1e" },
      { fx: "headPop", t0: 116, t1: 144, headY: 0.42 },
      { fx: "bloodGush", t0: 116, t1: 168, x: 0.5, y: 0.46, amount: 28 },
      { fx: "cam", t0: 144, t1: 168, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 144, t1: 168, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 146, t1: 168, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 150, t1: 168 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.55 },
      { t: 66, id: "swish_fast_01", gain: 0.6 },
      { t: 112, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 118, id: "rumble_tail_01", gain: 0.55 },
    ],
  },

  // SHINOBU — Insect Breathing: a blur of poison-tipped thrusts; the wisteria toxin does the rest.
  shinobu: {
    banner: "INSECT BREATHING", bannerRgb: "180,120,230", base: "hurt", choreographed: true, total: 172,
    beats: [
      { fx: "letterbox", t0: 0, t1: 172, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 172, rgb: "8,4,14", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "cam", t0: 44, t1: 114, zoom: 1.45, cx: 0.5, cy: 0.47, ease: 0.08 },
      { fx: "flickerRush", t0: 48, t1: 114, action: "run", around: 0.5, aroundY: 0.48, count: 11, radX: 0.28, radY: 0.13, color: "#b080e0" },
      { fx: "actor", t0: 50, t1: 150, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "slashCross", t0: 52, t1: 114, count: 18, color: "#c89aec" },
      { fx: "impale", t0: 74, t1: 114, color: "#b080e0", headY: 0.45 },
      { fx: "bloodGush", t0: 60, t1: 172, x: 0.5, y: 0.5, amount: 6 },
      { fx: "cam", t0: 114, t1: 146, zoom: 2.0, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 114, t1: 124 },
      { fx: "headPop", t0: 118, t1: 146, headY: 0.45 },
      { fx: "bloodGush", t0: 118, t1: 172, x: 0.5, y: 0.46, amount: 28 },
      { fx: "cam", t0: 146, t1: 172, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 172, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 148, t1: 172, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 152, t1: 172 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.45 },
      { t: 48, id: "swish_fast_01", gain: 0.55 },
      { t: 114, id: "boom_huge_01", gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 120, id: "rumble_tail_01", gain: 0.5 },
    ],
  },

  // ZENITSU — Thunderclap and Flash: one blinding, instantaneous step-slash splits the target before it registers.
  zenitsu: {
    banner: "THUNDERCLAP", bannerRgb: "255,225,90", base: "hurt", choreographed: true, total: 162,
    beats: [
      { fx: "letterbox", t0: 0, t1: 162, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 162, rgb: "12,10,2", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 36, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 96, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "flickerIn", t0: 24, t1: 42, action: "run", fromX: 0.92, toX: 0.58, y: 0.52, facing: -1, color: "rgba(255,225,90,0.6)" },
      { fx: "cam", t0: 40, t1: 96, zoom: 1.8, cx: 0.52, cy: 0.46, cut: true },
      { fx: "actor", t0: 40, t1: 68, who: "atk", action: "heavy", x: 0.6, y: 0.5, frame: "once:3", facing: -1 },
      { fx: "swordSlash", t0: 46, t1: 72, x: 0.52, y: 0.47, len: 0.32, angle: -2.2, sweep: 2.8, color: "rgba(255,235,120,0.98)" },
      { fx: "lightning", t0: 46, t1: 96, headY: 0.47, color: "#ffe85a" },
      { fx: "whiteSpike", t0: 62, t1: 74 },
      { fx: "cam", t0: 96, t1: 140, zoom: 2.0, cx: 0.5, cy: 0.47, cut: true },
      { fx: "lightning", t0: 96, t1: 130, headY: 0.47, color: "#fff080" },
      { fx: "soulSplit", t0: 96, t1: 154 },
      { fx: "bloodGush", t0: 100, t1: 162, x: 0.5, y: 0.5, amount: 16 },
      { fx: "cam", t0: 140, t1: 162, zoom: 1.4, cx: 0.5, cy: 0.52, ease: 0.1 },
      { fx: "actor", t0: 142, t1: 162, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 146, t1: 162 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.5 },
      { t: 46, id: "crack_sizzle_bright", gain: 0.65 },
      { t: 96, id: "boom_huge_01", gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 102, id: "rumble_tail_01", gain: 0.5 },
    ],
  },


  // ── PHASE 11 — TRUTH & JUSTICE (DC) ──────────────────────────────────────────────────────────────
  // Batch 11A "The Last Sons": the five Supermen (heat vision / Kryptonian might)

  // SUPERMAN — Heat Vision: twin beams of solar fury bore through.
  superman: {
    banner: "HEAT VISION", bannerRgb: "255,90,60", base: "hurt", choreographed: true, total: 170,
    beats: [
      { fx: "letterbox", t0: 0, t1: 170, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 170, rgb: "4,6,14", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 44, zoom: 1.5, cx: 0.52, cy: 0.44, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 146, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 118, who: "atk", action: "heavy", x: 0.84, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "cam", t0: 46, t1: 116, zoom: 1.58, cx: 0.5, cy: 0.42, ease: 0.08 },
      { fx: "kiBeam", t0: 54, t1: 150, headY: 0.3, color: "#ff4030", wide: 0.45 },
      { fx: "whiteSpike", t0: 92, t1: 104 },
      { fx: "bloodGush", t0: 96, t1: 170, x: 0.5, y: 0.34, amount: 8 },
      { fx: "cam", t0: 116, t1: 150, zoom: 2.1, cx: 0.5, cy: 0.36, cut: true },
      { fx: "whiteSpike", t0: 116, t1: 130 },
      { fx: "headPop", t0: 120, t1: 150, headY: 0.28 },
      { fx: "bloodGush", t0: 120, t1: 170, x: 0.5, y: 0.32, amount: 30 },
      { fx: "cam", t0: 150, t1: 170, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 150, t1: 170, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 152, t1: 170, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 154, t1: 170 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.5 },
      { t: 54, id: "crack_sizzle_bright", gain: 0.55 },
      { t: 116, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 122, id: "rumble_tail_01", gain: 0.55 },
    ],
  },

  // SUPERMAN (CLASSIC) — Kryptonian Might: a single super-strength blow with the force of a falling star.
  superman_classic: {
    banner: "KRYPTONIAN MIGHT", bannerRgb: "90,140,255", base: "hurt", choreographed: true, total: 162,
    beats: [
      { fx: "letterbox", t0: 0, t1: 162, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 162, rgb: "2,6,16", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 50, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "flickerIn", t0: 26, t1: 44, action: "run", fromX: 0.92, toX: 0.6, y: 0.52, facing: -1, color: "rgba(90,150,255,0.5)" },
      { fx: "cam", t0: 42, t1: 96, zoom: 1.85, cx: 0.52, cy: 0.46, cut: true },
      { fx: "actor", t0: 42, t1: 72, who: "atk", action: "heavy", x: 0.64, y: 0.5, frame: "once:3", facing: -1 },
      { fx: "actor", t0: 44, t1: 140, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "whiteSpike", t0: 70, t1: 82 },
      { fx: "bloodGush", t0: 72, t1: 162, x: 0.5, y: 0.46, amount: 10 },
      { fx: "cam", t0: 96, t1: 138, zoom: 2.1, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 96, t1: 106 },
      { fx: "headPop", t0: 98, t1: 138, headY: 0.4 },
      { fx: "shockRing", t0: 98, t1: 138, count: 4, color: "rgba(90,150,255,0.7)" },
      { fx: "bloodGush", t0: 98, t1: 162, x: 0.5, y: 0.46, amount: 34 },
      { fx: "cam", t0: 138, t1: 162, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 138, t1: 162, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 140, t1: 162, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 144, t1: 162 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.55 },
      { t: 42, id: "boom_anticipation_suck", gain: 0.45 },
      { t: 96, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 102, id: "rumble_tail_01", gain: 0.55 },
    ],
  },

  // SUPERMAN (DCUC) — Heat Vision.
  superman_dcuc: {
    banner: "HEAT VISION", bannerRgb: "255,110,70", base: "hurt", choreographed: true, total: 170,
    beats: [
      { fx: "letterbox", t0: 0, t1: 170, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 170, rgb: "6,6,12", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 44, zoom: 1.5, cx: 0.52, cy: 0.44, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 146, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 118, who: "atk", action: "heavy", x: 0.84, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "cam", t0: 46, t1: 116, zoom: 1.58, cx: 0.5, cy: 0.42, ease: 0.08 },
      { fx: "kiBeam", t0: 54, t1: 150, headY: 0.3, color: "#ff5838", wide: 0.45 },
      { fx: "whiteSpike", t0: 92, t1: 104 },
      { fx: "bloodGush", t0: 96, t1: 170, x: 0.5, y: 0.34, amount: 8 },
      { fx: "cam", t0: 116, t1: 150, zoom: 2.1, cx: 0.5, cy: 0.36, cut: true },
      { fx: "whiteSpike", t0: 116, t1: 130 },
      { fx: "headPop", t0: 120, t1: 150, headY: 0.28 },
      { fx: "bloodGush", t0: 120, t1: 170, x: 0.5, y: 0.32, amount: 30 },
      { fx: "cam", t0: 150, t1: 170, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 150, t1: 170, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 152, t1: 170, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 154, t1: 170 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.5 },
      { t: 54, id: "crack_sizzle_bright", gain: 0.55 },
      { t: 116, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 122, id: "rumble_tail_01", gain: 0.55 },
    ],
  },

  // SUPERMAN (FIGHTER) — Kryptonian Might.
  superman_fighter: {
    banner: "KRYPTONIAN MIGHT", bannerRgb: "110,160,255", base: "hurt", choreographed: true, total: 162,
    beats: [
      { fx: "letterbox", t0: 0, t1: 162, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 162, rgb: "2,8,16", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 50, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "flickerIn", t0: 26, t1: 44, action: "run", fromX: 0.92, toX: 0.6, y: 0.52, facing: -1, color: "rgba(110,170,255,0.5)" },
      { fx: "cam", t0: 42, t1: 96, zoom: 1.85, cx: 0.52, cy: 0.46, cut: true },
      { fx: "actor", t0: 42, t1: 72, who: "atk", action: "heavy", x: 0.64, y: 0.5, frame: "once:3", facing: -1 },
      { fx: "actor", t0: 44, t1: 140, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "whiteSpike", t0: 70, t1: 82 },
      { fx: "bloodGush", t0: 72, t1: 162, x: 0.5, y: 0.46, amount: 10 },
      { fx: "cam", t0: 96, t1: 138, zoom: 2.1, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 96, t1: 106 },
      { fx: "headPop", t0: 98, t1: 138, headY: 0.4 },
      { fx: "shockRing", t0: 98, t1: 138, count: 4, color: "rgba(110,170,255,0.7)" },
      { fx: "bloodGush", t0: 98, t1: 162, x: 0.5, y: 0.46, amount: 34 },
      { fx: "cam", t0: 138, t1: 162, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 138, t1: 162, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 140, t1: 162, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 144, t1: 162 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.55 },
      { t: 42, id: "boom_anticipation_suck", gain: 0.45 },
      { t: 96, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 102, id: "rumble_tail_01", gain: 0.55 },
    ],
  },

  // SUPERMAN (NEW 52) — Heat Vision.
  superman_new52: {
    banner: "HEAT VISION", bannerRgb: "255,100,80", base: "hurt", choreographed: true, total: 170,
    beats: [
      { fx: "letterbox", t0: 0, t1: 170, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 170, rgb: "6,4,12", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 44, zoom: 1.5, cx: 0.52, cy: 0.44, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 146, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 118, who: "atk", action: "heavy", x: 0.84, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "cam", t0: 46, t1: 116, zoom: 1.58, cx: 0.5, cy: 0.42, ease: 0.08 },
      { fx: "kiBeam", t0: 54, t1: 150, headY: 0.3, color: "#ff4a40", wide: 0.45 },
      { fx: "whiteSpike", t0: 92, t1: 104 },
      { fx: "bloodGush", t0: 96, t1: 170, x: 0.5, y: 0.34, amount: 8 },
      { fx: "cam", t0: 116, t1: 150, zoom: 2.1, cx: 0.5, cy: 0.36, cut: true },
      { fx: "whiteSpike", t0: 116, t1: 130 },
      { fx: "headPop", t0: 120, t1: 150, headY: 0.28 },
      { fx: "bloodGush", t0: 120, t1: 170, x: 0.5, y: 0.32, amount: 30 },
      { fx: "cam", t0: 150, t1: 170, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 150, t1: 170, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 152, t1: 170, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 154, t1: 170 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.5 },
      { t: 54, id: "crack_sizzle_bright", gain: 0.55 },
      { t: 116, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 122, id: "rumble_tail_01", gain: 0.55 },
    ],
  },


  // Batch 11B "Knights & Villains": batman · dark_knight · flash · green_lantern · deathstroke · brainiac

  // BATMAN — the Dark Knight: out of the shadows, a batarang storm and a bone-breaking takedown.
  batman: {
    banner: "DARK KNIGHT", bannerRgb: "90,120,180", base: "hurt", choreographed: true, total: 168,
    beats: [
      { fx: "letterbox", t0: 0, t1: 168, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 168, rgb: "4,6,12", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 50, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "cam", t0: 44, t1: 114, zoom: 1.42, cx: 0.5, cy: 0.47, ease: 0.08 },
      { fx: "flickerRush", t0: 48, t1: 114, action: "run", around: 0.5, aroundY: 0.48, count: 8, radX: 0.3, radY: 0.14, color: "#5a78b4" },
      { fx: "actor", t0: 50, t1: 150, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "slashCross", t0: 52, t1: 114, count: 14, color: "#9ab0d0" },
      { fx: "bloodGush", t0: 60, t1: 168, x: 0.5, y: 0.5, amount: 8 },
      { fx: "cam", t0: 114, t1: 146, zoom: 2.0, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 114, t1: 124 },
      { fx: "headPop", t0: 118, t1: 146, headY: 0.42 },
      { fx: "bloodGush", t0: 118, t1: 168, x: 0.5, y: 0.46, amount: 28 },
      { fx: "cam", t0: 146, t1: 168, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 168, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 148, t1: 168, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 152, t1: 168 },
    ],
    sound: [
      { t: 1, id: "boom_anticipation_suck", gain: 0.4 },
      { t: 48, id: "warp_wobble_01", gain: 0.5 },
      { t: 114, id: "boom_huge_01", gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 120, id: "rumble_tail_01", gain: 0.5 },
    ],
  },

  // DARK KNIGHT — no gadgets, no mercy: a silent flurry ending in one final, crushing blow.
  dark_knight: {
    banner: "THE DARK KNIGHT", bannerRgb: "70,90,140", base: "hurt", choreographed: true, total: 164,
    beats: [
      { fx: "letterbox", t0: 0, t1: 164, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 164, rgb: "3,5,10", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 50, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "flickerIn", t0: 26, t1: 44, action: "run", fromX: 0.92, toX: 0.6, y: 0.52, facing: -1, color: "rgba(70,90,140,0.5)" },
      { fx: "cam", t0: 42, t1: 96, zoom: 1.85, cx: 0.52, cy: 0.46, cut: true },
      { fx: "actor", t0: 42, t1: 72, who: "atk", action: "heavy", x: 0.64, y: 0.5, frame: "once:3", facing: -1 },
      { fx: "actor", t0: 44, t1: 140, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "whiteSpike", t0: 70, t1: 82 },
      { fx: "bloodGush", t0: 72, t1: 164, x: 0.5, y: 0.46, amount: 10 },
      { fx: "cam", t0: 96, t1: 138, zoom: 2.1, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 96, t1: 106 },
      { fx: "headPop", t0: 98, t1: 138, headY: 0.4 },
      { fx: "shockRing", t0: 98, t1: 138, count: 3, color: "rgba(100,130,190,0.6)" },
      { fx: "bloodGush", t0: 98, t1: 164, x: 0.5, y: 0.46, amount: 34 },
      { fx: "cam", t0: 138, t1: 164, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 138, t1: 164, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 140, t1: 164, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 144, t1: 164 },
    ],
    sound: [
      { t: 1, id: "boom_anticipation_suck", gain: 0.45 },
      { t: 42, id: "boom_anticipation_suck", gain: 0.4 },
      { t: 96, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 102, id: "rumble_tail_01", gain: 0.55 },
    ],
  },

  // FLASH — Speed Force: a blur circles the target, then lands an infinite-mass punch.
  flash: {
    banner: "SPEED FORCE", bannerRgb: "255,120,60", base: "hurt", choreographed: true, total: 166,
    beats: [
      { fx: "letterbox", t0: 0, t1: 166, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 166, rgb: "14,6,2", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 50, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "cam", t0: 44, t1: 112, zoom: 1.4, cx: 0.5, cy: 0.47, ease: 0.08 },
      { fx: "flickerRush", t0: 48, t1: 112, action: "run", around: 0.5, aroundY: 0.48, count: 12, radX: 0.32, radY: 0.15, color: "#ffcc40" },
      { fx: "speedLines", t0: 48, t1: 112, color: "rgba(255,180,80,0.5)" },
      { fx: "actor", t0: 50, t1: 112, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "bloodGush", t0: 60, t1: 166, x: 0.5, y: 0.5, amount: 8 },
      { fx: "cam", t0: 112, t1: 146, zoom: 2.1, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 112, t1: 124 },
      { fx: "headPop", t0: 116, t1: 146, headY: 0.42 },
      { fx: "shockRing", t0: 116, t1: 146, count: 5, color: "rgba(255,200,90,0.7)" },
      { fx: "bloodGush", t0: 116, t1: 166, x: 0.5, y: 0.46, amount: 34 },
      { fx: "cam", t0: 146, t1: 166, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 166, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 148, t1: 166, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 150, t1: 166 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.45 },
      { t: 48, id: "warp_wobble_01", gain: 0.5 },
      { t: 112, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 118, id: "rumble_tail_01", gain: 0.55 },
    ],
  },

  // GREEN LANTERN — Willpower: a construct the size of a truck forms and hammers down.
  green_lantern: {
    banner: "WILLPOWER", bannerRgb: "80,240,120", base: "hurt", choreographed: true, total: 170,
    beats: [
      { fx: "letterbox", t0: 0, t1: 170, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 170, rgb: "2,14,6", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 116, who: "atk", action: "heavy", x: 0.84, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "cam", t0: 46, t1: 114, zoom: 1.6, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "rasengan", t0: 66, t1: 114, headY: 0.45, size: 0.6, color: "#50e878" },
      { fx: "whiteSpike", t0: 104, t1: 116 },
      { fx: "bloodGush", t0: 80, t1: 170, x: 0.5, y: 0.46, amount: 6 },
      { fx: "cam", t0: 114, t1: 148, zoom: 2.05, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 114, t1: 126 },
      { fx: "shockRing", t0: 114, t1: 148, count: 4, color: "rgba(80,240,120,0.7)" },
      { fx: "headPop", t0: 118, t1: 148, headY: 0.42 },
      { fx: "bloodGush", t0: 118, t1: 170, x: 0.5, y: 0.46, amount: 32 },
      { fx: "cam", t0: 148, t1: 170, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 148, t1: 170, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 150, t1: 170, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 154, t1: 170 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.5 },
      { t: 66, id: "boom_anticipation_suck", gain: 0.45 },
      { t: 114, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 120, id: "rumble_tail_01", gain: 0.55 },
    ],
  },

  // DEATHSTROKE — Promethium Cleave: Slade flashes in and splits the target with his sword.
  deathstroke: {
    banner: "DEATHSTROKE", bannerRgb: "220,160,90", base: "hurt", choreographed: true, total: 166,
    beats: [
      { fx: "letterbox", t0: 0, t1: 166, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 166, rgb: "10,8,4", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 100, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "flickerIn", t0: 26, t1: 44, action: "run", fromX: 0.92, toX: 0.58, y: 0.52, facing: -1, color: "rgba(220,160,90,0.5)" },
      { fx: "cam", t0: 42, t1: 100, zoom: 1.8, cx: 0.52, cy: 0.46, cut: true },
      { fx: "actor", t0: 42, t1: 70, who: "atk", action: "heavy", x: 0.6, y: 0.5, frame: "once:3", facing: -1 },
      { fx: "swordSlash", t0: 48, t1: 72, x: 0.52, y: 0.47, len: 0.34, angle: -2.3, sweep: 2.8, color: "#dfe8f5" },
      { fx: "whiteSpike", t0: 90, t1: 102 },
      { fx: "cam", t0: 100, t1: 144, zoom: 2.0, cx: 0.5, cy: 0.47, cut: true },
      { fx: "soulSplit", t0: 100, t1: 158 },
      { fx: "bloodGush", t0: 104, t1: 166, x: 0.5, y: 0.5, amount: 16 },
      { fx: "cam", t0: 144, t1: 166, zoom: 1.4, cx: 0.5, cy: 0.52, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 166, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 150, t1: 166 },
    ],
    sound: [
      { t: 1, id: "boom_anticipation_suck", gain: 0.4 },
      { t: 48, id: "swish_fast_01", gain: 0.6 },
      { t: 100, id: "boom_medium_02", gain: 1.0, ultBoom: true, duckSec: 0.45 },
      { t: 106, id: "rumble_tail_01", gain: 0.45 },
    ],
  },

  // BRAINIAC — Assimilation: tech-tendrils impale and digitise the target into his Collection.
  brainiac: {
    banner: "ASSIMILATION", bannerRgb: "90,220,160", base: "hurt", choreographed: true, total: 172,
    beats: [
      { fx: "letterbox", t0: 0, t1: 172, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 172, rgb: "2,10,8", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 116, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam", t0: 46, t1: 114, zoom: 1.6, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "impale", t0: 56, t1: 114, color: "#40e0b0", headY: 0.45 },
      { fx: "dataFlood", t0: 60, t1: 150, glyphs: "mix", color: "#20c080" },
      { fx: "bloodGush", t0: 66, t1: 172, x: 0.5, y: 0.5, amount: 8 },
      { fx: "cam", t0: 114, t1: 146, zoom: 2.0, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 114, t1: 124 },
      { fx: "headPop", t0: 118, t1: 146, headY: 0.45 },
      { fx: "bloodGush", t0: 118, t1: 172, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam", t0: 146, t1: 172, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 172, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 148, t1: 172, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 152, t1: 172 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.45 },
      { t: 56, id: "warp_wobble_01", gain: 0.5 },
      { t: 114, id: "boom_huge_01", gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 120, id: "rumble_tail_01", gain: 0.5 },
    ],
  },


  // ── PHASE 12 — WITH GREAT POWER (Marvel / Invincible) ────────────────────────────────────────────
  // Batch 12A "The Spider-Verse": spiderman x4 + miles + gwen

  // SPIDER-MAN — Web-Slinger: pinned in webbing, then a blur of swing-kicks and a final yank.
  spiderman: {
    banner: "WEB-SLINGER", bannerRgb: "230,40,50", base: "hurt", choreographed: true, total: 170,
    beats: [
      { fx: "letterbox", t0: 0, t1: 170, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 170, rgb: "10,2,4", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 50, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "cam", t0: 44, t1: 114, zoom: 1.42, cx: 0.5, cy: 0.47, ease: 0.08 },
      { fx: "flickerRush", t0: 48, t1: 114, action: "run", around: 0.5, aroundY: 0.48, count: 9, radX: 0.3, radY: 0.14, color: "#e85060" },
      { fx: "actor", t0: 50, t1: 150, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "strings", t0: 52, t1: 114, color: "rgba(240,240,250,0.8)" },
      { fx: "slashCross", t0: 56, t1: 114, count: 12, color: "#e85060" },
      { fx: "bloodGush", t0: 60, t1: 170, x: 0.5, y: 0.5, amount: 8 },
      { fx: "cam", t0: 114, t1: 146, zoom: 2.0, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 114, t1: 124 },
      { fx: "headPop", t0: 118, t1: 146, headY: 0.42 },
      { fx: "bloodGush", t0: 118, t1: 170, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam", t0: 146, t1: 170, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 170, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 148, t1: 170, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 152, t1: 170 },
    ],
    sound: [
      { t: 1, id: "boom_anticipation_suck", gain: 0.4 },
      { t: 48, id: "warp_wobble_01", gain: 0.5 },
      { t: 114, id: "boom_huge_01", gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 120, id: "rumble_tail_01", gain: 0.5 },
    ],
  },

  // SPIDER-MAN (MCU-ish) — Web-Slinger.
  spiderman_mci: {
    banner: "WEB-SLINGER", bannerRgb: "220,50,60", base: "hurt", choreographed: true, total: 170,
    beats: [
      { fx: "letterbox", t0: 0, t1: 170, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 170, rgb: "8,2,6", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 50, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "cam", t0: 44, t1: 114, zoom: 1.42, cx: 0.5, cy: 0.47, ease: 0.08 },
      { fx: "flickerRush", t0: 48, t1: 114, action: "run", around: 0.5, aroundY: 0.48, count: 9, radX: 0.3, radY: 0.14, color: "#e05868" },
      { fx: "actor", t0: 50, t1: 150, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "strings", t0: 52, t1: 114, color: "rgba(240,240,250,0.8)" },
      { fx: "slashCross", t0: 56, t1: 114, count: 12, color: "#e05868" },
      { fx: "bloodGush", t0: 60, t1: 170, x: 0.5, y: 0.5, amount: 8 },
      { fx: "cam", t0: 114, t1: 146, zoom: 2.0, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 114, t1: 124 },
      { fx: "headPop", t0: 118, t1: 146, headY: 0.42 },
      { fx: "bloodGush", t0: 118, t1: 170, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam", t0: 146, t1: 170, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 170, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 148, t1: 170, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 152, t1: 170 },
    ],
    sound: [
      { t: 1, id: "boom_anticipation_suck", gain: 0.4 },
      { t: 48, id: "warp_wobble_01", gain: 0.5 },
      { t: 114, id: "boom_huge_01", gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 120, id: "rumble_tail_01", gain: 0.5 },
    ],
  },

  // SPIDER-MAN (RAIMI) — Web-Slinger.
  spiderman_raimi: {
    banner: "WEB-SLINGER", bannerRgb: "210,40,50", base: "hurt", choreographed: true, total: 170,
    beats: [
      { fx: "letterbox", t0: 0, t1: 170, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 170, rgb: "10,2,4", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 50, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "cam", t0: 44, t1: 114, zoom: 1.42, cx: 0.5, cy: 0.47, ease: 0.08 },
      { fx: "flickerRush", t0: 48, t1: 114, action: "run", around: 0.5, aroundY: 0.48, count: 9, radX: 0.3, radY: 0.14, color: "#d85060" },
      { fx: "actor", t0: 50, t1: 150, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "strings", t0: 52, t1: 114, color: "rgba(235,235,245,0.8)" },
      { fx: "slashCross", t0: 56, t1: 114, count: 12, color: "#d85060" },
      { fx: "bloodGush", t0: 60, t1: 170, x: 0.5, y: 0.5, amount: 8 },
      { fx: "cam", t0: 114, t1: 146, zoom: 2.0, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 114, t1: 124 },
      { fx: "headPop", t0: 118, t1: 146, headY: 0.42 },
      { fx: "bloodGush", t0: 118, t1: 170, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam", t0: 146, t1: 170, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 170, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 148, t1: 170, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 152, t1: 170 },
    ],
    sound: [
      { t: 1, id: "boom_anticipation_suck", gain: 0.4 },
      { t: 48, id: "warp_wobble_01", gain: 0.5 },
      { t: 114, id: "boom_huge_01", gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 120, id: "rumble_tail_01", gain: 0.5 },
    ],
  },

  // SPIDER-MAN (SSF2) — Web-Slinger.
  spiderman_ssf2: {
    banner: "WEB-SLINGER", bannerRgb: "235,45,55", base: "hurt", choreographed: true, total: 170,
    beats: [
      { fx: "letterbox", t0: 0, t1: 170, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 170, rgb: "10,3,6", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 50, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "cam", t0: 44, t1: 114, zoom: 1.42, cx: 0.5, cy: 0.47, ease: 0.08 },
      { fx: "flickerRush", t0: 48, t1: 114, action: "run", around: 0.5, aroundY: 0.48, count: 9, radX: 0.3, radY: 0.14, color: "#e85868" },
      { fx: "actor", t0: 50, t1: 150, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "strings", t0: 52, t1: 114, color: "rgba(240,240,250,0.8)" },
      { fx: "slashCross", t0: 56, t1: 114, count: 12, color: "#e85868" },
      { fx: "bloodGush", t0: 60, t1: 170, x: 0.5, y: 0.5, amount: 8 },
      { fx: "cam", t0: 114, t1: 146, zoom: 2.0, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 114, t1: 124 },
      { fx: "headPop", t0: 118, t1: 146, headY: 0.42 },
      { fx: "bloodGush", t0: 118, t1: 170, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam", t0: 146, t1: 170, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 170, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 148, t1: 170, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 152, t1: 170 },
    ],
    sound: [
      { t: 1, id: "boom_anticipation_suck", gain: 0.4 },
      { t: 48, id: "warp_wobble_01", gain: 0.5 },
      { t: 114, id: "boom_huge_01", gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 120, id: "rumble_tail_01", gain: 0.5 },
    ],
  },

  // MILES — Venom Strike: his bio-electric venom overloads the target in a storm of sparks.
  miles: {
    banner: "VENOM STRIKE", bannerRgb: "90,210,230", base: "hurt", choreographed: true, total: 168,
    beats: [
      { fx: "letterbox", t0: 0, t1: 168, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 168, rgb: "2,8,12", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 50, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "cam", t0: 44, t1: 112, zoom: 1.42, cx: 0.5, cy: 0.47, ease: 0.08 },
      { fx: "flickerRush", t0: 48, t1: 112, action: "run", around: 0.5, aroundY: 0.48, count: 10, radX: 0.3, radY: 0.14, color: "#60d8ee" },
      { fx: "actor", t0: 50, t1: 150, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "lightning", t0: 54, t1: 112, headY: 0.45, color: "#60d8ee" },
      { fx: "bloodGush", t0: 60, t1: 168, x: 0.5, y: 0.5, amount: 8 },
      { fx: "cam", t0: 112, t1: 146, zoom: 2.0, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 112, t1: 124 },
      { fx: "lightning", t0: 112, t1: 142, headY: 0.45, color: "#60d8ee" },
      { fx: "headPop", t0: 116, t1: 146, headY: 0.45 },
      { fx: "bloodGush", t0: 116, t1: 168, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam", t0: 146, t1: 168, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 168, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 148, t1: 168, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 152, t1: 168 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.45 },
      { t: 48, id: "crack_sizzle_bright", gain: 0.55 },
      { t: 112, id: "boom_huge_01", gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 118, id: "rumble_tail_01", gain: 0.5 },
    ],
  },

  // SPIDER-GWEN — a ballet of web-shots and spins that leaves the target bound and broken.
  gwen: {
    banner: "SPIDER-GWEN", bannerRgb: "240,120,200", base: "hurt", choreographed: true, total: 170,
    beats: [
      { fx: "letterbox", t0: 0, t1: 170, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 170, rgb: "10,4,12", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 50, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "cam", t0: 44, t1: 114, zoom: 1.42, cx: 0.5, cy: 0.47, ease: 0.08 },
      { fx: "flickerRush", t0: 48, t1: 114, action: "run", around: 0.5, aroundY: 0.48, count: 9, radX: 0.3, radY: 0.14, color: "#ff78c8" },
      { fx: "actor", t0: 50, t1: 150, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "strings", t0: 52, t1: 114, color: "rgba(255,255,255,0.85)" },
      { fx: "slashCross", t0: 56, t1: 114, count: 12, color: "#ff78c8" },
      { fx: "bloodGush", t0: 60, t1: 170, x: 0.5, y: 0.5, amount: 8 },
      { fx: "cam", t0: 114, t1: 146, zoom: 2.0, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 114, t1: 124 },
      { fx: "headPop", t0: 118, t1: 146, headY: 0.42 },
      { fx: "bloodGush", t0: 118, t1: 170, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam", t0: 146, t1: 170, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 170, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 148, t1: 170, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 152, t1: 170 },
    ],
    sound: [
      { t: 1, id: "boom_anticipation_suck", gain: 0.4 },
      { t: 48, id: "warp_wobble_01", gain: 0.5 },
      { t: 114, id: "boom_huge_01", gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 120, id: "rumble_tail_01", gain: 0.5 },
    ],
  },


  // Batch 12B "Iron & Viltrum": iron_man x3 + omniman

  // IRON MAN — Unibeam: the arc-reactor chest beam fires and burns clean through.
  iron_man: {
    banner: "UNIBEAM", bannerRgb: "120,220,255", base: "hurt", choreographed: true, total: 170,
    beats: [
      { fx: "letterbox", t0: 0, t1: 170, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 170, rgb: "4,8,16", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 146, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 118, who: "atk", action: "heavy", x: 0.84, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "cam", t0: 46, t1: 116, zoom: 1.58, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "kiBeam", t0: 54, t1: 150, headY: 0.45, color: "#60d0ff", wide: 0.5 },
      { fx: "whiteSpike", t0: 92, t1: 104 },
      { fx: "bloodGush", t0: 96, t1: 170, x: 0.5, y: 0.46, amount: 8 },
      { fx: "cam", t0: 116, t1: 150, zoom: 2.1, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 116, t1: 130 },
      { fx: "headPop", t0: 120, t1: 150, headY: 0.45 },
      { fx: "bloodGush", t0: 120, t1: 170, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam", t0: 150, t1: 170, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 150, t1: 170, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 152, t1: 170, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 154, t1: 170 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.5 },
      { t: 54, id: "crack_sizzle_bright", gain: 0.5 },
      { t: 116, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 122, id: "rumble_tail_01", gain: 0.55 },
    ],
  },

  // IRON MAN (MARK II) — Repulsor Barrage: a volley of palm-blasts, capped by a point-blank unibeam.
  iron_man_2: {
    banner: "REPULSOR", bannerRgb: "120,220,255", base: "hurt", choreographed: true, total: 170,
    beats: [
      { fx: "letterbox", t0: 0, t1: 170, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 170, rgb: "4,8,16", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 146, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 118, who: "atk", action: "heavy", x: 0.84, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "cam", t0: 46, t1: 116, zoom: 1.58, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "slashCross", t0: 50, t1: 92, count: 14, color: "#80d8ff" },
      { fx: "kiBeam", t0: 74, t1: 150, headY: 0.45, color: "#60d0ff", wide: 0.5 },
      { fx: "whiteSpike", t0: 98, t1: 108 },
      { fx: "bloodGush", t0: 60, t1: 170, x: 0.5, y: 0.46, amount: 8 },
      { fx: "cam", t0: 116, t1: 150, zoom: 2.1, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 116, t1: 130 },
      { fx: "headPop", t0: 120, t1: 150, headY: 0.45 },
      { fx: "bloodGush", t0: 120, t1: 170, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam", t0: 150, t1: 170, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 150, t1: 170, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 152, t1: 170, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 154, t1: 170 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.5 },
      { t: 50, id: "crack_sizzle_bright", gain: 0.5 },
      { t: 116, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 122, id: "rumble_tail_01", gain: 0.55 },
    ],
  },

  // IRON MAN (MARK III) — Unibeam (gold-core variant).
  iron_man_3: {
    banner: "UNIBEAM", bannerRgb: "255,200,90", base: "hurt", choreographed: true, total: 170,
    beats: [
      { fx: "letterbox", t0: 0, t1: 170, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 170, rgb: "12,8,2", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 146, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 118, who: "atk", action: "heavy", x: 0.84, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "cam", t0: 46, t1: 116, zoom: 1.58, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "kiBeam", t0: 54, t1: 150, headY: 0.45, color: "#ffcc50", wide: 0.5 },
      { fx: "whiteSpike", t0: 92, t1: 104 },
      { fx: "bloodGush", t0: 96, t1: 170, x: 0.5, y: 0.46, amount: 8 },
      { fx: "cam", t0: 116, t1: 150, zoom: 2.1, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 116, t1: 130 },
      { fx: "headPop", t0: 120, t1: 150, headY: 0.45 },
      { fx: "bloodGush", t0: 120, t1: 170, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam", t0: 150, t1: 170, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 150, t1: 170, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 152, t1: 170, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 154, t1: 170 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.5 },
      { t: 54, id: "crack_sizzle_bright", gain: 0.5 },
      { t: 116, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 122, id: "rumble_tail_01", gain: 0.55 },
    ],
  },

  // OMNI-MAN — Viltrumite: he drives a fist straight through the body. "Think, Mark. THINK."
  omniman: {
    banner: "VILTRUMITE", bannerRgb: "230,40,50", base: "hurt", choreographed: true, total: 168,
    beats: [
      { fx: "letterbox", t0: 0, t1: 168, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 168, rgb: "10,2,4", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 144, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "flickerIn", t0: 26, t1: 44, action: "run", fromX: 0.92, toX: 0.6, y: 0.52, facing: -1, color: "rgba(120,160,230,0.5)" },
      { fx: "cam", t0: 44, t1: 112, zoom: 1.85, cx: 0.52, cy: 0.46, cut: true },
      { fx: "actor", t0: 44, t1: 72, who: "atk", action: "heavy", x: 0.64, y: 0.5, frame: "once:3", facing: -1 },
      { fx: "actor", t0: 46, t1: 144, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "impale", t0: 52, t1: 112, color: "#d02030", headY: 0.45 },
      { fx: "whiteSpike", t0: 52, t1: 62 },
      { fx: "bloodGush", t0: 58, t1: 168, x: 0.5, y: 0.46, amount: 14 },
      { fx: "cam", t0: 112, t1: 146, zoom: 2.15, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 112, t1: 122 },
      { fx: "headPop", t0: 116, t1: 146, headY: 0.45 },
      { fx: "shockRing", t0: 116, t1: 146, count: 3, color: "rgba(200,40,50,0.6)" },
      { fx: "bloodGush", t0: 116, t1: 168, x: 0.5, y: 0.46, amount: 40 },
      { fx: "cam", t0: 146, t1: 168, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 168, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 148, t1: 168, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 152, t1: 168 },
    ],
    sound: [
      { t: 1, id: "boom_anticipation_suck", gain: 0.5 },
      { t: 52, id: "impact_hit_01", gain: 0.8 },
      { t: 112, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 118, id: "rumble_tail_01", gain: 0.6 },
    ],
  },


  // ── PHASE 13 — ONE PUNCH (OPM / Ben 10 / Baki) ───────────────────────────────────────────────────
  // saitama · genos · ben10 · vilgax · baki · ippo

  // SAITAMA — Serious Punch: one punch. The air itself parts, and nothing is left standing.
  saitama: {
    banner: "SERIOUS PUNCH", bannerRgb: "255,230,120", base: "hurt", choreographed: true, total: 164,
    beats: [
      { fx: "letterbox", t0: 0, t1: 164, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 164, rgb: "10,10,6", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 50, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "flickerIn", t0: 26, t1: 44, action: "run", fromX: 0.92, toX: 0.62, y: 0.52, facing: -1, color: "rgba(255,230,120,0.5)" },
      { fx: "cam", t0: 42, t1: 96, zoom: 1.8, cx: 0.52, cy: 0.46, cut: true },
      { fx: "actor", t0: 42, t1: 74, who: "atk", action: "heavy", x: 0.64, y: 0.5, frame: "once:4", facing: -1 },
      { fx: "actor", t0: 44, t1: 140, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "whiteSpike", t0: 74, t1: 86 },
      { fx: "bloodGush", t0: 76, t1: 164, x: 0.5, y: 0.46, amount: 10 },
      { fx: "cam", t0: 96, t1: 138, zoom: 2.1, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 96, t1: 110 },
      { fx: "headPop", t0: 98, t1: 138, headY: 0.4 },
      { fx: "shockRing", t0: 96, t1: 140, count: 7, color: "rgba(255,235,130,0.75)" },
      { fx: "bloodGush", t0: 98, t1: 164, x: 0.5, y: 0.46, amount: 40 },
      { fx: "cam", t0: 138, t1: 164, zoom: 1.4, cx: 0.5, cy: 0.5, ease: 0.1 },
      { fx: "actor", t0: 140, t1: 164, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 144, t1: 164 },
    ],
    sound: [
      { t: 1, id: "boom_anticipation_suck", gain: 0.5 },
      { t: 74, id: "boom_anticipation_suck", gain: 0.45 },
      { t: 96, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 102, id: "rumble_tail_01", gain: 0.6, delay: 0.05 },
    ],
  },

  // GENOS — Incineration Cannon: his arm-cannons unleash a torrent of fire that reduces the target to slag.
  genos: {
    banner: "INCINERATION", bannerRgb: "255,140,40", base: "hurt", choreographed: true, total: 172,
    beats: [
      { fx: "letterbox", t0: 0, t1: 172, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 172, rgb: "14,6,2", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 172, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 120, who: "atk", action: "heavy", x: 0.84, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "cam", t0: 46, t1: 118, zoom: 1.58, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "kiBeam", t0: 54, t1: 120, headY: 0.45, color: "#ff9030", wide: 0.55 },
      { fx: "whiteSpike", t0: 92, t1: 104 },
      { fx: "incinerate", t0: 94, t1: 168, color: "#ff7a1e" },
      { fx: "cam", t0: 120, t1: 162, zoom: 2.1, cx: 0.5, cy: 0.46, cut: true },
      { fx: "banner", t0: 148, t1: 172 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.5 },
      { t: 54, id: "crack_sizzle_bright", gain: 0.5 },
      { t: 120, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 126, id: "rumble_tail_01", gain: 0.5 },
    ],
  },

  // BEN 10 — Omnitrix: a flash of green, an alien's fist, and the target folds.
  ben10: {
    banner: "OMNITRIX", bannerRgb: "90,230,120", base: "hurt", choreographed: true, total: 164,
    beats: [
      { fx: "letterbox", t0: 0, t1: 164, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 164, rgb: "4,14,8", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 50, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "flickerIn", t0: 26, t1: 44, action: "run", fromX: 0.92, toX: 0.6, y: 0.52, facing: -1, color: "rgba(90,230,120,0.5)" },
      { fx: "cam", t0: 42, t1: 96, zoom: 1.85, cx: 0.52, cy: 0.46, cut: true },
      { fx: "actor", t0: 42, t1: 72, who: "atk", action: "heavy", x: 0.64, y: 0.5, frame: "once:3", facing: -1 },
      { fx: "actor", t0: 44, t1: 140, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "whiteSpike", t0: 70, t1: 82 },
      { fx: "bloodGush", t0: 72, t1: 164, x: 0.5, y: 0.46, amount: 10 },
      { fx: "cam", t0: 96, t1: 138, zoom: 2.1, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 96, t1: 106 },
      { fx: "headPop", t0: 98, t1: 138, headY: 0.4 },
      { fx: "shockRing", t0: 98, t1: 138, count: 4, color: "rgba(90,230,120,0.7)" },
      { fx: "bloodGush", t0: 98, t1: 164, x: 0.5, y: 0.46, amount: 34 },
      { fx: "cam", t0: 138, t1: 164, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 138, t1: 164, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 140, t1: 164, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 144, t1: 164 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.5 },
      { t: 42, id: "warp_wobble_01", gain: 0.5 },
      { t: 96, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 102, id: "rumble_tail_01", gain: 0.55 },
    ],
  },

  // VILGAX — THREE bespoke brutalities, selected by the killing-blow move in brutalityCinematic.js:
  //   eye-laser ult kill → CHIMERIAN ONSLAUGHT (A, this `vilgax` entry) · big-energy kill (Dagon/Meteor/
  //   Seismic/drone) → TEN WORLDS FALL (C, `vilgax_fall`) · everything else (sword normals/specials, default)
  //   → CONQUEROR'S EDGE (B, `vilgax_edge`). All three share the Conqueror's letterboxed, dark-red framing.
  // ── A — CHIMERIAN ONSLAUGHT (eye lasers): eyes blaze → twin converging beams bore in → body incinerates. ──
  vilgax: {
    banner: "CHIMERIAN ONSLAUGHT", bannerRgb: "255,60,40", base: "hurt", choreographed: true, total: 172,
    beats: [
      { fx: "letterbox", t0: 0, t1: 172, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 172, rgb: "12,2,2", max: 0.96, ramp: 8 },
      { fx: "cam", t0: 0, t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 118, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam", t0: 46, t1: 116, zoom: 1.62, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "whiteSpike", t0: 58, t1: 70 },
      { fx: "kiBeam", t0: 60, t1: 150, headY: 0.44, color: "#ff2418", wide: 1 },
      { fx: "flameBeam", t0: 62, t1: 150, color: "#ff3b20" },
      { fx: "flameBeam", t0: 68, t1: 150, color: "#ff6a2a" },
      { fx: "bloodGush", t0: 70, t1: 172, x: 0.5, y: 0.44, amount: 10 },
      { fx: "cam", t0: 116, t1: 150, zoom: 2.05, cx: 0.5, cy: 0.45, cut: true },
      { fx: "whiteSpike", t0: 116, t1: 126 },
      { fx: "incinerate", t0: 116, t1: 172, color: "#ff5a2a" },
      { fx: "headPop", t0: 120, t1: 150, headY: 0.44 },
      { fx: "bloodGush", t0: 120, t1: 172, x: 0.5, y: 0.44, amount: 30 },
      { fx: "cam", t0: 150, t1: 172, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 150, t1: 172, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 152, t1: 172, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 154, t1: 172 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.5 },
      { t: 58, id: "impact_hit_01", gain: 0.6 },
      { t: 116, id: "boom_huge_01", gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 122, id: "rumble_tail_01", gain: 0.5 },
    ],
  },
  // ── B — CONQUEROR'S EDGE (energy-sword bisection): overhead vertical cleave splits the victim. ──
  vilgax_edge: {
    banner: "CONQUEROR'S EDGE", bannerRgb: "230,80,80", base: "hurt", choreographed: true, total: 168,
    beats: [
      { fx: "letterbox", t0: 0, t1: 168, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 168, rgb: "10,3,3", max: 0.96, ramp: 8 },
      { fx: "cam", t0: 0, t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 146, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 112, who: "atk", action: "idle", x: 0.82, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam", t0: 46, t1: 112, zoom: 1.6, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "swordSlash", t0: 70, t1: 96, x: 0.5, y: 0.42, len: 0.52, angle: -1.57, sweep: 0.5, color: "#eaf6ff" },
      { fx: "whiteSpike", t0: 84, t1: 96 },
      { fx: "slashCross", t0: 86, t1: 118, count: 5, color: "#eaf6ff" },
      { fx: "cam", t0: 112, t1: 144, zoom: 2.0, cx: 0.5, cy: 0.5, cut: true },
      { fx: "soulSplit", t0: 112, t1: 168 },
      { fx: "bloodGush", t0: 116, t1: 168, x: 0.5, y: 0.46, amount: 32 },
      { fx: "cam", t0: 144, t1: 168, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 168, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 150, t1: 168 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.4 },
      { t: 70, id: "impact_hit_01", gain: 0.7 },
      { t: 112, id: "boom_huge_01", gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 118, id: "rumble_tail_01", gain: 0.5 },
    ],
  },
  // ── C — TEN WORLDS FALL (orbital strike): a massive energy meteor / ship bombardment gibs the victim. ──
  vilgax_fall: {
    banner: "TEN WORLDS FALL", bannerRgb: "255,120,40", base: "hurt", choreographed: true, total: 172,
    beats: [
      { fx: "letterbox", t0: 0, t1: 172, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 172, rgb: "8,4,2", max: 0.94, ramp: 8 },
      { fx: "cam", t0: 0, t1: 44, zoom: 1.4, cx: 0.5, cy: 0.46, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.56, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 112, who: "atk", action: "idle", x: 0.82, y: 0.56, frame: "anim:12", facing: -1 },
      { fx: "cam", t0: 46, t1: 112, zoom: 1.3, cx: 0.5, cy: 0.42, ease: 0.07 },
      { fx: "meteor", t0: 56, t1: 118 },
      { fx: "cam", t0: 112, t1: 150, zoom: 1.9, cx: 0.5, cy: 0.5, cut: true },
      { fx: "whiteSpike", t0: 112, t1: 126 },
      { fx: "shockRing", t0: 114, t1: 164, count: 5, color: "rgba(255,130,50,0.75)" },
      { fx: "shatter", t0: 118, t1: 164, cols: 6, rows: 8, spread: 1.2 },
      { fx: "bloodGush", t0: 118, t1: 172, x: 0.5, y: 0.5, amount: 30 },
      { fx: "cam", t0: 150, t1: 172, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 152, t1: 172, who: "atk", action: "idle", x: 0.72, y: 0.56, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 156, t1: 172 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.5 },
      { t: 56, id: "rumble_tail_01", gain: 0.6 },
      { t: 112, id: "boom_huge_01", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 120, id: "rumble_tail_01", gain: 0.6 },
    ],
  },

  // BAKI — Demon Rush: a storm of bare-knuckle blows pulps the target where it stands.
  baki: {
    banner: "DEMON RUSH", bannerRgb: "220,80,80", base: "hurt", choreographed: true, total: 166,
    beats: [
      { fx: "letterbox", t0: 0, t1: 166, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 166, rgb: "12,4,4", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 50, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "cam", t0: 44, t1: 112, zoom: 1.4, cx: 0.5, cy: 0.47, ease: 0.08 },
      { fx: "flickerRush", t0: 48, t1: 112, action: "run", around: 0.5, aroundY: 0.48, count: 10, radX: 0.3, radY: 0.14, color: "#e05858" },
      { fx: "actor", t0: 50, t1: 112, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "slashCross", t0: 52, t1: 112, count: 14, color: "#f08080" },
      { fx: "bloodGush", t0: 60, t1: 166, x: 0.5, y: 0.5, amount: 8 },
      { fx: "cam", t0: 112, t1: 146, zoom: 2.1, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 112, t1: 122 },
      { fx: "headPop", t0: 116, t1: 146, headY: 0.4 },
      { fx: "shockRing", t0: 116, t1: 146, count: 4, color: "rgba(224,88,88,0.7)" },
      { fx: "bloodGush", t0: 116, t1: 166, x: 0.5, y: 0.46, amount: 34 },
      { fx: "cam", t0: 146, t1: 166, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 166, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 148, t1: 166, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 152, t1: 166 },
    ],
    sound: [
      { t: 1, id: "boom_anticipation_suck", gain: 0.45 },
      { t: 48, id: "warp_wobble_01", gain: 0.5 },
      { t: 112, id: "boom_huge_01", gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 118, id: "rumble_tail_01", gain: 0.5 },
    ],
  },

  // IPPO — Dempsey Roll: a weaving flurry of hooks that ends on one rising, final blow.
  ippo: {
    banner: "DEMPSEY ROLL", bannerRgb: "120,180,255", base: "hurt", choreographed: true, total: 164,
    beats: [
      { fx: "letterbox", t0: 0, t1: 164, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 164, rgb: "4,8,16", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 50, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "cam", t0: 44, t1: 108, zoom: 1.45, cx: 0.5, cy: 0.47, ease: 0.08 },
      { fx: "flickerRush", t0: 48, t1: 108, action: "run", around: 0.5, aroundY: 0.5, count: 10, radX: 0.26, radY: 0.16, color: "#78b0ff" },
      { fx: "actor", t0: 50, t1: 140, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "bloodGush", t0: 60, t1: 164, x: 0.5, y: 0.5, amount: 8 },
      { fx: "cam", t0: 108, t1: 140, zoom: 2.1, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 108, t1: 118 },
      { fx: "headPop", t0: 112, t1: 140, headY: 0.4 },
      { fx: "shockRing", t0: 108, t1: 140, count: 3, color: "rgba(120,180,255,0.7)" },
      { fx: "bloodGush", t0: 112, t1: 164, x: 0.5, y: 0.46, amount: 32 },
      { fx: "cam", t0: 140, t1: 164, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 140, t1: 164, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 142, t1: 164, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 146, t1: 164 },
    ],
    sound: [
      { t: 1, id: "boom_anticipation_suck", gain: 0.45 },
      { t: 48, id: "warp_wobble_01", gain: 0.5 },
      { t: 108, id: "boom_huge_01", gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 114, id: "rumble_tail_01", gain: 0.5 },
    ],
  },


  // ── PHASE 14 — INFINITE TIMELINES (Rick & Morty / Power Rangers / Death Note) ─────────────────────
  // Batch 14A "The Ricks & Death Note": rick · rickPrime · morty · evilMorty · light · l_ryuuzaki

  // RICK — a plasma bolt from some gun he built in a drunken afternoon. Vaporised, no ceremony.
  rick: {
    banner: "PLASMA", bannerRgb: "120,240,120", base: "hurt", choreographed: true, total: 170,
    beats: [
      { fx: "letterbox", t0: 0, t1: 170, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 170, rgb: "4,14,8", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 146, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 118, who: "atk", action: "heavy", x: 0.84, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "cam", t0: 46, t1: 116, zoom: 1.58, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "kiBeam", t0: 54, t1: 150, headY: 0.45, color: "#60e060", wide: 0.5 },
      { fx: "whiteSpike", t0: 92, t1: 104 },
      { fx: "bloodGush", t0: 96, t1: 170, x: 0.5, y: 0.46, amount: 8 },
      { fx: "cam", t0: 116, t1: 150, zoom: 2.1, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 116, t1: 130 },
      { fx: "headPop", t0: 120, t1: 150, headY: 0.45 },
      { fx: "bloodGush", t0: 120, t1: 170, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam", t0: 150, t1: 170, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 150, t1: 170, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 152, t1: 170, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 154, t1: 170 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.5 },
      { t: 54, id: "crack_sizzle_bright", gain: 0.5 },
      { t: 116, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 122, id: "rumble_tail_01", gain: 0.5 },
    ],
  },

  // RICK PRIME — a portal opens, and the target is simply removed from the timeline. Cold, surgical, final.
  rickprime: {
    banner: "RICK PRIME", bannerRgb: "150,90,210", base: "hurt", choreographed: true, total: 176,
    beats: [
      { fx: "letterbox", t0: 0, t1: 176, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 176, rgb: "6,10,8", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 120, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam", t0: 46, t1: 118, zoom: 1.7, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "kamuiSpiral", t0: 54, t1: 150 },
      { fx: "cam", t0: 118, t1: 150, zoom: 2.1, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 142, t1: 152 },
      { fx: "cam", t0: 152, t1: 176, zoom: 1.4, cx: 0.5, cy: 0.5, ease: 0.1 },
      { fx: "actor", t0: 152, t1: 176, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 156, t1: 176 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.45 },
      { t: 54, id: "warp_wobble_01", gain: 0.6 },
      { t: 118, id: "warp_wobble_01", gain: 0.5 },
      { t: 142, id: "boom_huge_01", gain: 1.0, ultBoom: true, duckSec: 0.5 },
    ],
  },

  // MORTY — (not currently playable; future-proof) a panicked portal that still gets the job done.
  morty: {
    banner: "AW GEEZ", bannerRgb: "230,200,90", base: "hurt", choreographed: true, total: 170,
    beats: [
      { fx: "letterbox", t0: 0, t1: 170, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 170, rgb: "8,10,6", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 120, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam", t0: 46, t1: 118, zoom: 1.7, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "kamuiSpiral", t0: 54, t1: 150 },
      { fx: "cam", t0: 118, t1: 150, zoom: 2.1, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 142, t1: 152 },
      { fx: "cam", t0: 152, t1: 170, zoom: 1.4, cx: 0.5, cy: 0.5, ease: 0.1 },
      { fx: "actor", t0: 152, t1: 170, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 156, t1: 170 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.45 },
      { t: 54, id: "warp_wobble_01", gain: 0.55 },
      { t: 142, id: "boom_huge_01", gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 148, id: "rumble_tail_01", gain: 0.5 },
    ],
  },

  // EVIL MORTY — (not currently playable; future-proof) no wasted motion. One shot, straight through.
  evilMorty: {
    banner: "EVIL MORTY", bannerRgb: "230,180,60", base: "hurt", choreographed: true, total: 166,
    beats: [
      { fx: "letterbox", t0: 0, t1: 166, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 166, rgb: "10,8,2", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 144, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 116, who: "atk", action: "heavy", x: 0.84, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "cam", t0: 46, t1: 112, zoom: 1.6, cx: 0.5, cy: 0.42, ease: 0.08 },
      { fx: "kiBeam", t0: 60, t1: 112, headY: 0.2, color: "#ffd24a", wide: 0.16 },
      { fx: "whiteSpike", t0: 92, t1: 102 },
      { fx: "bloodGush", t0: 94, t1: 166, x: 0.5, y: 0.2, amount: 8 },
      { fx: "cam", t0: 112, t1: 144, zoom: 2.1, cx: 0.5, cy: 0.3, cut: true },
      { fx: "whiteSpike", t0: 112, t1: 122 },
      { fx: "headPop", t0: 114, t1: 144, headY: 0.16 },
      { fx: "bloodGush", t0: 114, t1: 166, x: 0.5, y: 0.18, amount: 30 },
      { fx: "cam", t0: 144, t1: 166, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 144, t1: 166, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 146, t1: 166, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 150, t1: 166 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.45 },
      { t: 60, id: "crack_sizzle_bright", gain: 0.55 },
      { t: 112, id: "boom_huge_01", gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 118, id: "rumble_tail_01", gain: 0.5 },
    ],
  },

  // LIGHT (KIRA) — Death Note: the name is written, the pages blur past, and the heart simply stops.
  light: {
    banner: "DEATH NOTE", bannerRgb: "200,40,60", base: "hurt", choreographed: true, total: 172,
    beats: [
      { fx: "letterbox", t0: 0, t1: 172, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 172, rgb: "10,2,4", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 116, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam", t0: 46, t1: 114, zoom: 1.6, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "dataFlood", t0: 54, t1: 150, glyphs: "mix", color: "#c82030" },
      { fx: "bloodGush", t0: 90, t1: 172, x: 0.5, y: 0.46, amount: 4 },
      { fx: "cam", t0: 114, t1: 146, zoom: 2.0, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 114, t1: 124 },
      { fx: "headPop", t0: 118, t1: 146, headY: 0.45 },
      { fx: "bloodGush", t0: 118, t1: 172, x: 0.5, y: 0.46, amount: 22 },
      { fx: "cam", t0: 146, t1: 172, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 172, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 148, t1: 172, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 152, t1: 172 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.4 },
      { t: 54, id: "warp_wobble_01", gain: 0.45 },
      { t: 114, id: "boom_huge_01", gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 120, id: "rumble_tail_01", gain: 0.5 },
    ],
  },

  // L — a sudden flurry of capoeira kicks from the world's greatest detective; justice, delivered heel-first.
  l_ryuuzaki: {
    banner: "JUSTICE", bannerRgb: "200,210,225", base: "hurt", choreographed: true, total: 166,
    beats: [
      { fx: "letterbox", t0: 0, t1: 166, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 166, rgb: "6,6,8", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 50, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "cam", t0: 44, t1: 112, zoom: 1.42, cx: 0.5, cy: 0.47, ease: 0.08 },
      { fx: "flickerRush", t0: 48, t1: 112, action: "run", around: 0.5, aroundY: 0.48, count: 8, radX: 0.3, radY: 0.15, color: "#aab4c4" },
      { fx: "actor", t0: 50, t1: 112, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "bloodGush", t0: 60, t1: 166, x: 0.5, y: 0.5, amount: 8 },
      { fx: "cam", t0: 112, t1: 146, zoom: 2.05, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 112, t1: 122 },
      { fx: "headPop", t0: 116, t1: 146, headY: 0.4 },
      { fx: "shockRing", t0: 116, t1: 146, count: 3, color: "rgba(170,180,200,0.6)" },
      { fx: "bloodGush", t0: 116, t1: 166, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam", t0: 146, t1: 166, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 166, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 148, t1: 166, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 152, t1: 166 },
    ],
    sound: [
      { t: 1, id: "boom_anticipation_suck", gain: 0.4 },
      { t: 48, id: "warp_wobble_01", gain: 0.5 },
      { t: 112, id: "boom_huge_01", gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 118, id: "rumble_tail_01", gain: 0.5 },
    ],
  },


  // Batch 14B "Power Rangers": red_ranger_mmpr · samurai_red_ranger · gold_samurai_ranger · green_samurai_ranger · omega_ranger

  // RED RANGER (MMPR) — Power Sword: one clean morphed-steel cut.
  red_ranger_mmpr: {
    banner: "POWER SWORD", bannerRgb: "230,40,50", base: "hurt", choreographed: true, total: 166,
    beats: [
      { fx: "letterbox", t0: 0, t1: 166, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 166, rgb: "10,2,4", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 100, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "flickerIn", t0: 26, t1: 44, action: "run", fromX: 0.92, toX: 0.58, y: 0.52, facing: -1, color: "rgba(230,50,60,0.5)" },
      { fx: "cam", t0: 42, t1: 100, zoom: 1.8, cx: 0.52, cy: 0.46, cut: true },
      { fx: "actor", t0: 42, t1: 70, who: "atk", action: "heavy", x: 0.6, y: 0.5, frame: "once:3", facing: -1 },
      { fx: "swordSlash", t0: 48, t1: 72, x: 0.52, y: 0.46, len: 0.4, angle: -2.4, sweep: 2.9, color: "#ff5060" },
      { fx: "whiteSpike", t0: 90, t1: 102 },
      { fx: "cam", t0: 100, t1: 144, zoom: 2.0, cx: 0.5, cy: 0.47, cut: true },
      { fx: "soulSplit", t0: 100, t1: 158 },
      { fx: "bloodGush", t0: 104, t1: 166, x: 0.5, y: 0.5, amount: 16 },
      { fx: "cam", t0: 144, t1: 166, zoom: 1.4, cx: 0.5, cy: 0.52, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 166, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 150, t1: 166 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.5 },
      { t: 48, id: "swish_fast_01", gain: 0.6 },
      { t: 100, id: "boom_medium_02", gain: 1.0, ultBoom: true, duckSec: 0.45 },
      { t: 106, id: "rumble_tail_01", gain: 0.45 },
    ],
  },

  // GOLD SAMURAI RANGER — Barracuda Blade: a flashing gold stroke splits the target.
  gold_samurai_ranger: {
    banner: "BARRACUDA BLADE", bannerRgb: "240,200,80", base: "hurt", choreographed: true, total: 166,
    beats: [
      { fx: "letterbox", t0: 0, t1: 166, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 166, rgb: "12,10,2", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 100, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "flickerIn", t0: 26, t1: 44, action: "run", fromX: 0.92, toX: 0.58, y: 0.52, facing: -1, color: "rgba(240,200,80,0.5)" },
      { fx: "cam", t0: 42, t1: 100, zoom: 1.8, cx: 0.52, cy: 0.46, cut: true },
      { fx: "actor", t0: 42, t1: 70, who: "atk", action: "heavy", x: 0.6, y: 0.5, frame: "once:3", facing: -1 },
      { fx: "swordSlash", t0: 48, t1: 72, x: 0.52, y: 0.46, len: 0.4, angle: -2.4, sweep: 2.9, color: "#ffd850" },
      { fx: "whiteSpike", t0: 90, t1: 102 },
      { fx: "cam", t0: 100, t1: 144, zoom: 2.0, cx: 0.5, cy: 0.47, cut: true },
      { fx: "soulSplit", t0: 100, t1: 158 },
      { fx: "bloodGush", t0: 104, t1: 166, x: 0.5, y: 0.5, amount: 16 },
      { fx: "cam", t0: 144, t1: 166, zoom: 1.4, cx: 0.5, cy: 0.52, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 166, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 150, t1: 166 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.5 },
      { t: 48, id: "swish_fast_01", gain: 0.6 },
      { t: 100, id: "boom_medium_02", gain: 1.0, ultBoom: true, duckSec: 0.45 },
      { t: 106, id: "rumble_tail_01", gain: 0.45 },
    ],
  },

  // SAMURAI RED RANGER — Fire Smasher: the great flaming blade cleaves and burns in one stroke.
  samurai_red_ranger: {
    banner: "FIRE SMASHER", bannerRgb: "255,120,40", base: "hurt", choreographed: true, total: 168,
    beats: [
      { fx: "letterbox", t0: 0, t1: 168, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 168, rgb: "16,6,2", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 144, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 116, who: "atk", action: "heavy", x: 0.84, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "cam", t0: 46, t1: 112, zoom: 1.7, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "swordSlash", t0: 66, t1: 112, x: 0.52, y: 0.44, len: 0.5, angle: -2.2, sweep: 3.0, color: "rgba(255,130,40,0.95)" },
      { fx: "whiteSpike", t0: 100, t1: 112 },
      { fx: "bloodGush", t0: 72, t1: 168, x: 0.5, y: 0.46, amount: 8 },
      { fx: "cam", t0: 112, t1: 144, zoom: 2.05, cx: 0.5, cy: 0.46, cut: true },
      { fx: "incinerate", t0: 112, t1: 158, color: "#ff7a1e" },
      { fx: "headPop", t0: 116, t1: 144, headY: 0.42 },
      { fx: "bloodGush", t0: 116, t1: 168, x: 0.5, y: 0.46, amount: 28 },
      { fx: "cam", t0: 144, t1: 168, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 144, t1: 168, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 146, t1: 168, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 150, t1: 168 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.55 },
      { t: 66, id: "swish_fast_01", gain: 0.6 },
      { t: 112, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 118, id: "rumble_tail_01", gain: 0.55 },
    ],
  },

  // GREEN SAMURAI RANGER — Forest Spear: a lancing thrust runs the target clean through.
  green_samurai_ranger: {
    banner: "FOREST SPEAR", bannerRgb: "90,220,110", base: "hurt", choreographed: true, total: 166,
    beats: [
      { fx: "letterbox", t0: 0, t1: 166, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 166, rgb: "4,14,6", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 144, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "flickerIn", t0: 26, t1: 44, action: "run", fromX: 0.92, toX: 0.6, y: 0.52, facing: -1, color: "rgba(90,220,110,0.5)" },
      { fx: "cam", t0: 42, t1: 110, zoom: 1.8, cx: 0.52, cy: 0.46, cut: true },
      { fx: "actor", t0: 42, t1: 70, who: "atk", action: "heavy", x: 0.64, y: 0.5, frame: "once:3", facing: -1 },
      { fx: "actor", t0: 44, t1: 144, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "impale", t0: 50, t1: 110, color: "#7ae060", headY: 0.45 },
      { fx: "whiteSpike", t0: 52, t1: 62 },
      { fx: "bloodGush", t0: 58, t1: 166, x: 0.5, y: 0.46, amount: 10 },
      { fx: "cam", t0: 110, t1: 142, zoom: 2.1, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 110, t1: 120 },
      { fx: "headPop", t0: 114, t1: 142, headY: 0.45 },
      { fx: "bloodGush", t0: 114, t1: 166, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam", t0: 142, t1: 166, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 142, t1: 166, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 144, t1: 166, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 148, t1: 166 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.5 },
      { t: 50, id: "impact_hit_01", gain: 0.7 },
      { t: 110, id: "boom_huge_01", gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 116, id: "rumble_tail_01", gain: 0.5 },
    ],
  },

  // OMEGA RANGER — Omega Blast: a lance of pure morphing-grid energy vaporises the target.
  omega_ranger: {
    banner: "OMEGA BLAST", bannerRgb: "120,230,255", base: "hurt", choreographed: true, total: 170,
    beats: [
      { fx: "letterbox", t0: 0, t1: 170, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 170, rgb: "4,10,16", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 146, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 118, who: "atk", action: "heavy", x: 0.84, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "cam", t0: 46, t1: 116, zoom: 1.58, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "kiBeam", t0: 54, t1: 150, headY: 0.45, color: "#70d8ff", wide: 0.5 },
      { fx: "whiteSpike", t0: 92, t1: 104 },
      { fx: "bloodGush", t0: 96, t1: 170, x: 0.5, y: 0.46, amount: 8 },
      { fx: "cam", t0: 116, t1: 150, zoom: 2.1, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 116, t1: 130 },
      { fx: "headPop", t0: 120, t1: 150, headY: 0.45 },
      { fx: "bloodGush", t0: 120, t1: 170, x: 0.5, y: 0.46, amount: 30 },
      { fx: "cam", t0: 150, t1: 170, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 150, t1: 170, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 152, t1: 170, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 154, t1: 170 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.5 },
      { t: 54, id: "crack_sizzle_bright", gain: 0.5 },
      { t: 116, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 122, id: "rumble_tail_01", gain: 0.55 },
    ],
  },


  // ── PHASE 15 — WILDCARDS (horror / originals) — FINAL ────────────────────────────────────────────
  // jason · ghostface · ghostface_billy · ghostface_exe · omololu · jesus · saiki · handler · albedo · miwa

  // JASON — the machete comes down; the head comes off.
  jason: {
    banner: "MACHETE", bannerRgb: "200,210,220", base: "hurt", choreographed: true, total: 164,
    beats: [
      { fx: "letterbox", t0: 0, t1: 164, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 164, rgb: "4,6,8", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.44, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 144, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "flickerIn", t0: 26, t1: 44, action: "run", fromX: 0.92, toX: 0.6, y: 0.52, facing: -1, color: "rgba(180,190,200,0.4)" },
      { fx: "cam", t0: 42, t1: 100, zoom: 1.8, cx: 0.52, cy: 0.42, cut: true },
      { fx: "actor", t0: 42, t1: 72, who: "atk", action: "heavy", x: 0.62, y: 0.5, frame: "once:3", facing: -1 },
      { fx: "actor", t0: 44, t1: 144, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "swordSlash", t0: 48, t1: 72, x: 0.52, y: 0.3, len: 0.3, angle: -2.6, sweep: 2.4, color: "#cfd8e6" },
      { fx: "whiteSpike", t0: 62, t1: 74 },
      { fx: "bloodGush", t0: 64, t1: 164, x: 0.5, y: 0.22, amount: 12 },
      { fx: "cam", t0: 100, t1: 140, zoom: 2.1, cx: 0.5, cy: 0.3, cut: true },
      { fx: "whiteSpike", t0: 100, t1: 110 },
      { fx: "headPop", t0: 102, t1: 140, headY: 0.16 },
      { fx: "bloodGush", t0: 102, t1: 164, x: 0.5, y: 0.18, amount: 32 },
      { fx: "cam", t0: 140, t1: 164, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 140, t1: 164, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 142, t1: 164, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 146, t1: 164 },
    ],
    sound: [
      { t: 1, id: "boom_anticipation_suck", gain: 0.5 },
      { t: 48, id: "swish_fast_01", gain: 0.6 },
      { t: 100, id: "boom_huge_01", gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 106, id: "rumble_tail_01", gain: 0.5 },
    ],
  },

  // GHOSTFACE — a frenzy of knife-work; nobody hears the phone ring twice.
  ghostface: {
    banner: "GHOSTFACE", bannerRgb: "#ff3040", base: "hurt", choreographed: true, total: 166,
    beats: [
      { fx: "letterbox", t0: 0, t1: 166, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 166, rgb: "e05058", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 50, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "cam", t0: 44, t1: 112, zoom: 1.42, cx: 0.5, cy: 0.47, ease: 0.08 },
      { fx: "flickerRush", t0: 48, t1: 112, action: "run", around: 0.5, aroundY: 0.48, count: 10, radX: 0.3, radY: 0.14, color: "8,2,4" },
      { fx: "actor", t0: 50, t1: 112, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "slashCross", t0: 52, t1: 112, count: 16, color: "8,2,4" },
      { fx: "bloodGush", t0: 60, t1: 166, x: 0.5, y: 0.5, amount: 8 },
      { fx: "cam", t0: 112, t1: 146, zoom: 2.1, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 112, t1: 122 },
      { fx: "headPop", t0: 116, t1: 146, headY: 0.42 },
      { fx: "shockRing", t0: 116, t1: 146, count: 4, color: "rgba(200,200,220,0.6)" },
      { fx: "bloodGush", t0: 116, t1: 166, x: 0.5, y: 0.46, amount: 32 },
      { fx: "cam", t0: 146, t1: 166, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 166, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 148, t1: 166, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 152, t1: 166 },
    ],
    sound: [
      { t: 1, id: "boom_anticipation_suck", gain: 0.45 },
      { t: 48, id: "warp_wobble_01", gain: 0.5 },
      { t: 112, id: "boom_huge_01", gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 118, id: "rumble_tail_01", gain: 0.5 },
    ],
  },

  // BILLY GHOSTFACE — the original: a flash-in and a gutting lunge that opens the target up.
  ghostface_billy: {
    banner: "THE ORIGINAL", bannerRgb: "220,40,50", base: "hurt", choreographed: true, total: 166,
    beats: [
      { fx: "letterbox", t0: 0, t1: 166, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 166, rgb: "8,2,4", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 144, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "flickerIn", t0: 26, t1: 44, action: "run", fromX: 0.92, toX: 0.6, y: 0.52, facing: -1, color: "rgba(220,40,50,0.5)" },
      { fx: "cam", t0: 42, t1: 112, zoom: 1.8, cx: 0.52, cy: 0.48, cut: true },
      { fx: "actor", t0: 42, t1: 70, who: "atk", action: "heavy", x: 0.64, y: 0.5, frame: "once:3", facing: -1 },
      { fx: "actor", t0: 44, t1: 144, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "impale", t0: 50, t1: 110, color: "#e0e8f5", headY: 0.5 },
      { fx: "whiteSpike", t0: 52, t1: 62 },
      { fx: "bloodGush", t0: 58, t1: 166, x: 0.5, y: 0.5, amount: 14 },
      { fx: "cam", t0: 110, t1: 142, zoom: 2.1, cx: 0.5, cy: 0.5, cut: true },
      { fx: "whiteSpike", t0: 110, t1: 120 },
      { fx: "headPop", t0: 114, t1: 142, headY: 0.52 },
      { fx: "bloodGush", t0: 114, t1: 166, x: 0.5, y: 0.52, amount: 32 },
      { fx: "cam", t0: 142, t1: 166, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 142, t1: 166, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 144, t1: 166, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 148, t1: 166 },
    ],
    sound: [
      { t: 1, id: "boom_anticipation_suck", gain: 0.45 },
      { t: 50, id: "impact_hit_01", gain: 0.7 },
      { t: 110, id: "boom_huge_01", gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 116, id: "rumble_tail_01", gain: 0.5 },
    ],
  },

  // GHOSTFACE.EXE — reality glitches red, the frame corrupts, and the target is deleted.
  ghostface_exe: {
    banner: "GHOSTFACE.EXE", bannerRgb: "230,30,40", base: "hurt", choreographed: true, total: 170,
    beats: [
      { fx: "letterbox", t0: 0, t1: 170, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 170, rgb: "8,0,2", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 116, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam", t0: 46, t1: 114, zoom: 1.6, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "dataFlood", t0: 52, t1: 150, glyphs: "binary", color: "#e01820" },
      { fx: "slashCross", t0: 70, t1: 114, count: 12, color: "#ff3040" },
      { fx: "bloodGush", t0: 66, t1: 170, x: 0.5, y: 0.5, amount: 8 },
      { fx: "cam", t0: 114, t1: 146, zoom: 2.0, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 114, t1: 124 },
      { fx: "headPop", t0: 118, t1: 146, headY: 0.42 },
      { fx: "bloodGush", t0: 118, t1: 170, x: 0.5, y: 0.46, amount: 28 },
      { fx: "cam", t0: 146, t1: 170, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 170, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 148, t1: 170, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 152, t1: 170 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.45 },
      { t: 52, id: "warp_wobble_01", gain: 0.5 },
      { t: 114, id: "boom_huge_01", gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 120, id: "rumble_tail_01", gain: 0.5 },
    ],
  },

  // OMOLOLU — a flicker of shuriken and portals; the creator's signature flurry, then gone.
  omololu: {
    banner: "OMOLOLU", bannerRgb: "90,220,255", base: "hurt", choreographed: true, total: 176,
    beats: [
      { fx: "letterbox", t0: 0, t1: 176, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 176, rgb: "4,10,16", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 50, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "cam", t0: 44, t1: 112, zoom: 1.4, cx: 0.5, cy: 0.47, ease: 0.08 },
      { fx: "flickerRush", t0: 48, t1: 112, action: "run", around: 0.5, aroundY: 0.48, count: 10, radX: 0.3, radY: 0.14, color: "#60d8ff" },
      { fx: "actor", t0: 50, t1: 150, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "slashCross", t0: 52, t1: 112, count: 16, color: "#90e0ff" },
      { fx: "bloodGush", t0: 60, t1: 176, x: 0.5, y: 0.5, amount: 8 },
      { fx: "cam", t0: 112, t1: 150, zoom: 1.9, cx: 0.5, cy: 0.46, cut: true },
      { fx: "kamuiSpiral", t0: 112, t1: 154 },
      { fx: "whiteSpike", t0: 112, t1: 124 },
      { fx: "headPop", t0: 118, t1: 150, headY: 0.42 },
      { fx: "bloodGush", t0: 118, t1: 176, x: 0.5, y: 0.46, amount: 28 },
      { fx: "cam", t0: 154, t1: 176, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 154, t1: 176, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 156, t1: 176, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 160, t1: 176 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.5 },
      { t: 48, id: "warp_wobble_01", gain: 0.5 },
      { t: 112, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 118, id: "rumble_tail_01", gain: 0.55 },
    ],
  },

  // JESUS — Divine Judgment: a pillar of holy light descends and smites the unworthy.
  jesus: {
    banner: "DIVINE JUDGMENT", bannerRgb: "255,230,150", base: "hurt", choreographed: true, total: 174,
    beats: [
      { fx: "letterbox", t0: 0, t1: 174, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 174, rgb: "12,10,4", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 174, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 120, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam", t0: 46, t1: 118, zoom: 1.58, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "kiBeam", t0: 54, t1: 120, headY: 0.45, color: "#fff0b0", wide: 0.55 },
      { fx: "whiteSpike", t0: 92, t1: 108 },
      { fx: "incinerate", t0: 96, t1: 170, color: "#ffd060" },
      { fx: "cam", t0: 120, t1: 162, zoom: 2.1, cx: 0.5, cy: 0.46, cut: true },
      { fx: "banner", t0: 150, t1: 174 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.55 },
      { t: 54, id: "crack_sizzle_bright", gain: 0.5 },
      { t: 120, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 126, id: "rumble_tail_01", gain: 0.55 },
    ],
  },

  // SAIKI — Psychokinesis: an invisible grip seizes the target and crushes them in mid-air.
  saiki: {
    banner: "PSYCHOKINESIS", bannerRgb: "240,120,200", base: "hurt", choreographed: true, total: 170,
    beats: [
      { fx: "letterbox", t0: 0, t1: 170, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 170, rgb: "10,4,12", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 150, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 116, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam", t0: 46, t1: 114, zoom: 1.6, cx: 0.5, cy: 0.46, ease: 0.08 },
      { fx: "shockRing", t0: 56, t1: 114, count: 4, color: "rgba(240,120,200,0.55)" },
      { fx: "bloodGush", t0: 70, t1: 170, x: 0.5, y: 0.5, amount: 6 },
      { fx: "cam", t0: 114, t1: 146, zoom: 2.05, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 114, t1: 126 },
      { fx: "shockRing", t0: 114, t1: 146, count: 5, color: "rgba(250,130,210,0.7)" },
      { fx: "headPop", t0: 118, t1: 146, headY: 0.42 },
      { fx: "bloodGush", t0: 118, t1: 170, x: 0.5, y: 0.46, amount: 32 },
      { fx: "cam", t0: 146, t1: 170, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 170, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 148, t1: 170, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 152, t1: 170 },
    ],
    sound: [
      { t: 1, id: "charge_hum_rise", gain: 0.5 },
      { t: 56, id: "warp_wobble_01", gain: 0.5 },
      { t: 114, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 120, id: "rumble_tail_01", gain: 0.55 },
    ],
  },

  // HANDLER (Megumi) — Ten Shadows: a shadow beast rises from beneath and devours the target.
  handler: {
    banner: "TEN SHADOWS", bannerRgb: "60,60,90", base: "hurt", choreographed: true, total: 176,
    beats: [
      { fx: "letterbox", t0: 0, t1: 176, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 176, rgb: "4,4,8", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 44, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 146, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "actor", t0: 14, t1: 120, who: "atk", action: "idle", x: 0.84, y: 0.52, frame: "anim:12", facing: -1 },
      { fx: "cam", t0: 46, t1: 144, zoom: 1.58, cx: 0.5, cy: 0.46, ease: 0.07 },
      { fx: "maw", t0: 50, t1: 144, color: "#4050a0" },
      { fx: "cam", t0: 144, t1: 168, zoom: 2.25, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 144, t1: 156 },
      { fx: "headPop", t0: 146, t1: 168, headY: 0.3 },
      { fx: "bloodGush", t0: 148, t1: 176, x: 0.5, y: 0.46, amount: 28 },
      { fx: "cam", t0: 168, t1: 176, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 168, t1: 176, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 168, t1: 176, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 170, t1: 176 },
    ],
    sound: [
      { t: 1, id: "boom_anticipation_suck", gain: 0.5 },
      { t: 50, id: "warp_wobble_01", gain: 0.5 },
      { t: 144, id: "boom_huge_02_roar", gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 150, id: "rumble_tail_01", gain: 0.55 },
    ],
  },

  // ALBEDO — Ultimatrix: a Negative alien's fist finishes it in a flash of red.
  albedo: {
    banner: "ULTIMATRIX", bannerRgb: "#ff5040", base: "hurt", choreographed: true, total: 166,
    beats: [
      { fx: "letterbox", t0: 0, t1: 166, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 166, rgb: "f05850", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 50, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "cam", t0: 44, t1: 112, zoom: 1.42, cx: 0.5, cy: 0.47, ease: 0.08 },
      { fx: "flickerRush", t0: 48, t1: 112, action: "run", around: 0.5, aroundY: 0.48, count: 10, radX: 0.3, radY: 0.14, color: "12,2,2" },
      { fx: "actor", t0: 50, t1: 112, who: "vic", action: "hurt", x: 0.5, y: 0.52, frame: "hold:0", facing: -1 },
      { fx: "slashCross", t0: 52, t1: 112, count: 16, color: "12,2,2" },
      { fx: "bloodGush", t0: 60, t1: 166, x: 0.5, y: 0.5, amount: 8 },
      { fx: "cam", t0: 112, t1: 146, zoom: 2.1, cx: 0.5, cy: 0.46, cut: true },
      { fx: "whiteSpike", t0: 112, t1: 122 },
      { fx: "headPop", t0: 116, t1: 146, headY: 0.42 },
      { fx: "shockRing", t0: 116, t1: 146, count: 4, color: "rgba(200,200,220,0.6)" },
      { fx: "bloodGush", t0: 116, t1: 166, x: 0.5, y: 0.46, amount: 32 },
      { fx: "cam", t0: 146, t1: 166, zoom: 1.4, cx: 0.5, cy: 0.54, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 166, who: "vic", action: ["knockdown", "lose", "hurt"], x: 0.48, y: 0.62, frame: "once:7", facing: -1, rot: 1.35, hFrac: 0.4 },
      { fx: "actor", t0: 148, t1: 166, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 152, t1: 166 },
    ],
    sound: [
      { t: 1, id: "boom_anticipation_suck", gain: 0.45 },
      { t: 48, id: "warp_wobble_01", gain: 0.5 },
      { t: 112, id: "boom_huge_01", gain: 1.0, ultBoom: true, duckSec: 0.5 },
      { t: 118, id: "rumble_tail_01", gain: 0.5 },
    ],
  },

  // MIWA (Kasumi) — New Shadow Style: a single Simple Domain draw-cut splits the target clean.
  miwa: {
    banner: "NEW SHADOW STYLE", bannerRgb: "200,210,225", base: "hurt", choreographed: true, total: 166,
    beats: [
      { fx: "letterbox", t0: 0, t1: 166, in: 14, h: 0.13 },
      { fx: "darken", t0: 0, t1: 166, rgb: "6,6,10", max: 0.97, ramp: 8 },
      { fx: "cam", t0: 0, t1: 40, zoom: 1.5, cx: 0.52, cy: 0.45, ease: 0.1 },
      { fx: "actor", t0: 0, t1: 100, who: "vic", action: "idle", x: 0.5, y: 0.52, frame: "anim:10", facing: -1 },
      { fx: "flickerIn", t0: 26, t1: 44, action: "run", fromX: 0.92, toX: 0.58, y: 0.52, facing: -1, color: "rgba(200,210,225,0.45)" },
      { fx: "cam", t0: 42, t1: 100, zoom: 1.8, cx: 0.52, cy: 0.46, cut: true },
      { fx: "actor", t0: 42, t1: 70, who: "atk", action: "heavy", x: 0.6, y: 0.5, frame: "once:3", facing: -1 },
      { fx: "swordSlash", t0: 48, t1: 72, x: 0.52, y: 0.47, len: 0.34, angle: -2.3, sweep: 2.8, color: "#eaf0fa" },
      { fx: "whiteSpike", t0: 90, t1: 102 },
      { fx: "cam", t0: 100, t1: 144, zoom: 2.0, cx: 0.5, cy: 0.47, cut: true },
      { fx: "soulSplit", t0: 100, t1: 158 },
      { fx: "bloodGush", t0: 104, t1: 166, x: 0.5, y: 0.5, amount: 16 },
      { fx: "cam", t0: 144, t1: 166, zoom: 1.4, cx: 0.5, cy: 0.52, ease: 0.1 },
      { fx: "actor", t0: 146, t1: 166, who: "atk", action: "idle", x: 0.72, y: 0.52, frame: "anim:12", facing: 1 },
      { fx: "banner", t0: 150, t1: 166 },
    ],
    sound: [
      { t: 1, id: "boom_anticipation_suck", gain: 0.4 },
      { t: 48, id: "swish_fast_01", gain: 0.6 },
      { t: 100, id: "boom_medium_02", gain: 1.0, ultBoom: true, duckSec: 0.45 },
      { t: 106, id: "rumble_tail_01", gain: 0.45 },
    ],
  },

})

export default BRUTALITY_CONCEPTS
