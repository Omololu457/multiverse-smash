// omololuDomain.js — "Domain Expansion: The Genesis Threshold" (Omololu, the self-insert fighter).
// ─────────────────────────────────────────────────────────────────
// A domain-tier finisher built on TWO existing systems, reused verbatim:
//   1. NAOYA'S "Planned Route" per-beat timing-window JUDGING (abilities.js NAOYA_ROUTE):
//      a tight input window per beat — CORRECT input in-window = no penalty, WRONG input or a
//      MISSED window = real damage. Naoya's exact window sizes are reused (openWindow 12 for the
//      first beat, stepWindow 10 after) and the hit/miss detection mirrors his window-countdown +
//      fresh-edge logic — the judging is ADAPTED FROM NAOYA_ROUTE, not a new engine.
//   2. The DOMAIN background-swap (domains.js activateDomain / drawDomainBackground). rosterKey
//      "omololu" → _drawGenesisThreshold: the IMG_3608 reference photo drawn cover-fit + stylized,
//      the same image-backed domain-swap technique as Gojo's Unlimited Void video/still.
//
// The twist vs Naoya: the JUDGED performer is the TRAPPED OPPONENT, not the caster. Omololu
// expands the domain onto the foe and forces them to dance a RANDOM WASD cadence; every beat they
// fumble lands real chip damage. Reads/writes only fields namespaced on the fighters — combat.js,
// abilities.js's NAOYA_ROUTE, and obito's files are all untouched.
//
// Determinism: the beat sequence is a SEEDED LCG keyed off a per-caster cast counter (deterministic
// sim state), so replays / lockstep netcode reproduce the exact same cadence on both peers. No
// Math.random() in the sim path.

import { activateDomain } from "./domains.js"       // domains.js imports nothing of ours → no cycle
import { applyScaledDamage } from "./combat.js"     // the single damage choke-point (same as Naoya's route)
import { sound } from "./sound.js"                  // domain mid-sequence voice line (audio-only)
import { pickOmololuVoice } from "./omololuVoice.js"

// ── Tuning ───────────────────────────────────────────────────────
export const OMO_DOMAIN = {
  durationS:   20,   // ~20s cadence (also the domain-background duration)
  telegraph:   26,   // frames a prompt is SHOWN before its input window opens (fair reaction to a RANDOM prompt)
  openWindow:  12,   // FIRST beat's input window — Naoya NAOYA_ROUTE.openWindow, reused verbatim
  stepWindow:  10,   // every subsequent beat's window — Naoya NAOYA_ROUTE.stepWindow, reused verbatim
  gap:         12,   // brief rest between beats
  missDamage:  60,   // per-miss penalty (RAW → applyScaledDamage ×0.60 = 36 EFF/miss). Buffed 12→36→60 for a HARD-HITTING domain: ~24 beats → ~1440 raw ≈ 864 EFF ceiling (near-full KO on total fumble; a clean-read victim still takes 0). Tune here.
  cost:        100,  // domain/ultimate-tier meter cost (matches the roster ultimate band: Batman/VG/Isshiki/Saitama = 100)
}

const DIRS  = ["up", "left", "down", "right"]        // W A S D
export const OMO_GLYPH = { up: "W", left: "A", down: "S", right: "D" }

// ── Seeded LCG (deterministic per cast) ──────────────────────────
function _seedFor(caster) {
  caster._omoCastCount = (caster._omoCastCount || 0) + 1
  return (0x9e3779b9 ^ ((caster._omoCastCount * 2654435761) >>> 0)) >>> 0
}
function _next(st) { st.rng = (st.rng * 1664525 + 1013904223) >>> 0; return st.rng / 4294967296 }
function _pickDir(st) { return DIRS[Math.min(3, Math.floor(_next(st) * 4))] }

// ── Beat lifecycle ───────────────────────────────────────────────
function _startBeat(st, first) {
  st.dir      = _pickDir(st)
  st.phase    = "telegraph"
  st.t        = OMO_DOMAIN.telegraph
  st.winMax   = first ? OMO_DOMAIN.openWindow : OMO_DOMAIN.stepWindow
  st.beatNo   = (st.beatNo || 0) + 1
  st.lastEvent = null            // "hit" | "miss" (for the HUD flash)
  st.flash     = 0
}

function _resolveBeat(st, victim, caster, hit) {
  st.lastEvent = hit ? "hit" : "miss"
  st.flash     = 14
  if (hit) { st.hits = (st.hits || 0) + 1 }
  else {
    st.misses = (st.misses || 0) + 1
    if (victim && !victim.eliminated) {
      applyScaledDamage(victim, OMO_DOMAIN.missDamage, { source: "omololu-domain", attacker: caster, move: "genesisThreshold" })
      victim.colorFlash = Math.max(victim.colorFlash || 0, 6)
    }
  }
  st.phase = "gap"
  st.t     = OMO_DOMAIN.gap
}

// ── Public API ───────────────────────────────────────────────────
export function isOmololuDomainActive(fighter) {
  return !!(fighter && fighter._omoDomain && fighter._omoDomain.active)
}

// Started from executeOmoluUltimate (abilities.js). Spends meter, swaps in the domain
// background, and arms the cadence state on the caster + a back-ref on the victim.
export function startOmololuDomain(caster, victim, context = {}) {
  if (!caster || !victim || victim.eliminated) return false
  if ((caster.energy || 0) < OMO_DOMAIN.cost) return false
  caster.energy = Math.max(0, (caster.energy || 0) - OMO_DOMAIN.cost)

  // Full-screen domain background swap (generic procedural renderer for rosterKey "omololu").
  // cost:0 → activateDomain doesn't double-charge; we already spent the meter above.
  activateDomain(caster, { name: "The Genesis Threshold", cost: 0, duration: OMO_DOMAIN.durationS, range: 1e5, damageBoost: 1.0, speedPenalty: 1.0 }, context)

  const st = {
    active: true,
    victim,
    framesLeft: OMO_DOMAIN.durationS * 60,
    rng: _seedFor(caster),
    hits: 0, misses: 0, beatNo: 0,
    prev: { up: false, left: false, down: false, right: false },
  }
  _startBeat(st, true)
  caster._omoDomain     = st
  victim._omoDomainOwner = caster
  victim._omoTrapped     = true
  return true
}

function _endDomain(caster) {
  const st = caster && caster._omoDomain
  if (st) {
    if (st.victim) { st.victim._omoDomainOwner = null; st.victim._omoTrapped = false }
    st.active = false
  }
  if (caster) caster._omoDomain = null
}

// Ticked ONCE PER FRAME from the VICTIM's per-fighter update (game.js), with the victim's own
// live inputState — the Naoya-snare integration pattern. Advances the cadence, judges this
// frame's input, applies miss damage, and returns TRUE while the victim is still trapped (so the
// caller consumes the input and the victim can take no normal action). Returns false once spent.
export function tickOmololuDomain(caster, victim, inputState, context = {}) {
  const st = caster && caster._omoDomain
  if (!st || !st.active) return false
  // Bail cleanly if either fighter is gone.
  if (!victim || victim.eliminated || !caster || caster.eliminated) { _endDomain(caster); return false }

  victim.vx = 0                                   // held in the domain — no drift
  if (caster) caster.vx = 0                       // caster is locked into the cadence too

  // Overall domain clock. When it runs out we stop after the current beat resolves.
  st.framesLeft--
  if (st.flash > 0) st.flash--
  // Mid-sequence voice ("Keep up!") — once, at the cadence midpoint. Owned by the CASTER (not the trapped
  // victim, whose update is driving this tick) so it isn't cross-tagged/cut.
  if (!st.midVoiceDone && st.framesLeft <= (OMO_DOMAIN.durationS * 60) / 2) {
    st.midVoiceDone = true
    try { sound.playSfxFile?.(pickOmololuVoice("domainMid"), null, { owner: caster }) } catch (_) {}
  }

  // Fresh directional EDGES this frame (press, not hold) — mirrors Naoya's _cmdPrev edge-detect.
  const now = { up: !!inputState.up, left: !!inputState.left, down: !!inputState.down, right: !!inputState.right }
  const edge = {
    up:    now.up    && !st.prev.up,
    left:  now.left  && !st.prev.left,
    down:  now.down  && !st.prev.down,
    right: now.right && !st.prev.right,
  }
  st.prev = now

  if (st.phase === "telegraph") {
    st.t--
    if (st.t <= 0) { st.phase = "window"; st.t = st.winMax }
    // input during the telegraph is ignored (the window hasn't opened) — fair for a random prompt
  } else if (st.phase === "window") {
    st.t--
    const pressedWanted = edge[st.dir]
    const pressedOther  = (edge.up || edge.left || edge.down || edge.right) && !pressedWanted
    if (pressedWanted)      _resolveBeat(st, victim, caster, true)   // correct in-window → no damage
    else if (pressedOther)  _resolveBeat(st, victim, caster, false)  // wrong button → damage
    else if (st.t <= 0)     _resolveBeat(st, victim, caster, false)  // window elapsed → damage
  } else if (st.phase === "gap") {
    st.t--
    if (st.t <= 0) {
      if (st.framesLeft <= 0) { _endDomain(caster); return false }   // domain over → release cleanly
      _startBeat(st, false)
    }
  }

  return true
}

// HUD read-model (drawn by game.js). Null when no domain is up.
export function getOmololuDomainView(caster) {
  const st = caster && caster._omoDomain
  if (!st || !st.active) return null
  return {
    dir: st.dir, glyph: OMO_GLYPH[st.dir],
    phase: st.phase, t: st.t, winMax: st.winMax,
    beatNo: st.beatNo, hits: st.hits, misses: st.misses,
    lastEvent: st.lastEvent, flash: st.flash,
    framesLeft: st.framesLeft, durationS: OMO_DOMAIN.durationS,
    windowOpen: st.phase === "window",
  }
}
