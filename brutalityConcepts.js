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
    base: "idle",                       // user's call: zoom in on the victim's clean idle, THEN overload them
    total: 142,
    beats: [
      { fx: "whiteSpike", t0: 0,   t1: 13 },                                   // the domain "clap" flash
      { fx: "voidInvert", t0: 5,   t1: 142 },                                  // reality inverts to the pale Void
      { fx: "sprite",     t0: 13,  t1: 142, from: 0.72, to: 1.12, anchor: 0.56, tremble: 3 },  // push in on victim, trembling
      { fx: "dataFlood",  t0: 34,  t1: 104, glyphs: "void", color: "#bfefff" },// infinite information pours in
      { fx: "whiteSpike", t0: 98,  t1: 111 },                                  // overload peak
      { fx: "headPop",    t0: 104, t1: 134, headY: 0.17 },                     // the mind breaks → head bursts
      { fx: "banner",     t0: 112, t1: 142 },
    ],
    sound: [
      { t: 1,   id: "boom_anticipation_suck", gain: 0.5 },
      { t: 34,  id: "charge_hum_rise",        gain: 0.62 },
      { t: 98,  id: "boom_huge_01",           gain: 1.0, ultBoom: true, duckSec: 0.6 },
      { t: 105, id: "rumble_tail_01",         gain: 0.55, delay: 0.06 },
    ],
  },

})

export default BRUTALITY_CONCEPTS
