#!/usr/bin/env python3
"""Generate homelander_sfx_map.js from pools.json (pools as data) + a fixed deterministic dispatch.
Paths get a leading ./ so sound._resolveSrc falls back to AUDIO_BASE (same as ghostface's direct paths)."""
import json, os
HERE = os.path.dirname(__file__)
pools = json.load(open(os.path.join(HERE, "pools.json")))
ORDER = ["INTRO", "WIN", "LOSE", "ROUND_START", "KO", "HIT_REACT", "ATTACK_EFFORT", "SPECIAL_CALLOUT",
         "FLEX_TAUNT", "GRAB", "ULTIMATE", "BRUTALITY", "LASER_CHARGE", "LASER_BEAM", "SUPERSONIC", "FLIGHT_TAKEOFF"]

def arr(p):
    items = ",\n".join(f'    "./{f}"' for f in pools.get(p, []))
    return f"  {p}: [\n{items}\n  ]"

pools_js = ",\n".join(arr(p) for p in ORDER)

js = '''// homelander_sfx_map.js
// Homelander voice + SFX pools and the deterministic dispatch. AUTO-GENERATED pool lists
// (homelander_audio_work/gen_map.py from the acoustic analysis) — see docs/homelander/AUDIO_MAP.md.
//
// • Clip choice = juicePickVariant(hash(matchSeed, frame), player) — a pure hash of
//   (match seed, frame, player index); NEVER Math.random → LAN/replay deterministic.
// • Voice pools route through sound.playSfxFile with { owner: fighter } → the engine's single-voice
//   enforcer (a new line CUTS the old one, with a 40 ms fade) + automatic music ducking.
// • SFX pools layer freely (no owner). Pitch: +-3% on voice, +-5% on SFX (juicePitch).
// • Per-pool cooldowns rate-limit chatter; specials/ultimate/intro/win/etc. always play (cd 0).
// • LASER_BEAM is a held loop (startHomelanderLaser/stopHomelanderLaser) with a fade-out on release.
import { sound, juicePickVariant, juicePitch } from "./sound.js"

export const HOMELANDER_SFX = {
%POOLS%
}

// SFX pools (effects) vs voice pools (speech). SFX layer; voice is single-channel + ducks.
export const HL_SFX_POOLS = new Set(["LASER_CHARGE", "LASER_BEAM", "SUPERSONIC", "FLIGHT_TAKEOFF"])

// Per-pool cooldown in frames so he doesn't talk constantly. 0 = always plays (specials/ult/intro/etc.).
// cooldown in frames when the caller passes a REAL sim frame (ctx.frame). HIT_REACT/ATTACK_EFFORT are
// gated at the combat.js call site via per-fighter timers (they pass no real frame), so 0 here.
const HL_COOLDOWN = {
  HIT_REACT: 0, ATTACK_EFFORT: 0, SPECIAL_CALLOUT: 24, FLEX_TAUNT: 40,
  FLIGHT_TAKEOFF: 20, SUPERSONIC: 0, LASER_CHARGE: 0, LASER_BEAM: 0,
  INTRO: 0, WIN: 0, LOSE: 0, ROUND_START: 0, KO: 0, ULTIMATE: 0, BRUTALITY: 0, GRAB: 0,
}

// Deterministic index: fold the match seed into the frame axis, then the existing juice hash.
function hlSeedFrame(seed, frame) { return (((seed >>> 0) ^ Math.imul((frame | 0), 0x9e3779b1)) >>> 0) }
function hlPlayer(f) { return (f && (f.side === "p2" || f.playerIndex === 1)) ? 1 : 0 }

export function pickHomelanderSfx(category, seed, frame, player) {
  const pool = HOMELANDER_SFX[category]
  return (pool && pool.length) ? juicePickVariant(pool, hlSeedFrame(seed, frame), player) : null
}

// Main dispatch. ctx = { seed, frame } (match seed + sim frame; callers pass matchConfig.seed /
// globalFrameCount). Returns true if a clip started.
export function playHomelanderSfx(category, fighter, ctx = {}) {
  if (!sound || !sound.playSfxFile || !fighter) return false
  const seed = ((ctx.seed != null ? ctx.seed : 1) >>> 0)
  // real sim frame when the caller passes it (hash of seed+frame+player); else a per-fighter event
  // counter — both are deterministic / LAN-safe (no Math.random).
  const frame = (ctx.frame != null) ? (ctx.frame | 0) : (fighter._hlN = ((fighter._hlN | 0) + 1))
  const player = hlPlayer(fighter)
  const cd = HL_COOLDOWN[category] ?? 0
  if (cd > 0) {
    const m = (fighter._hlCd || (fighter._hlCd = {}))
    if ((frame - (m[category] ?? -1e9)) < cd) return false
    m[category] = frame
  }
  const clip = pickHomelanderSfx(category, seed, frame, player)
  if (!clip) return false
  const isSfx = HL_SFX_POOLS.has(category)
  const rate = juicePitch(hlSeedFrame(seed, frame), player, isSfx ? 0.05 : 0.03)
  try {
    if (isSfx) sound.playSfxFile(clip, null, { rate })                              // SFX: layerable, SFX bus
    else       sound.playSfxFile(clip, null, { rate, owner: fighter, fadeMs: 40 })  // voice: single-channel + 40ms fade + duck
  } catch (_) { return false }
  return true
}

// ── LASER BEAM held loop ─────────────────────────────────────────────────────
// playSfxFile is one-shot; the sustained beam needs a loop + fade-out on release. We manage a
// dedicated looping HTMLAudioElement per fighter at the SFX volume (render-layer only; no sim state).
export function startHomelanderLaser(fighter, ctx = {}) {
  if (!fighter || fighter._hlLaserEl || typeof Audio === "undefined") return
  const clip = pickHomelanderSfx("LASER_BEAM", ctx.seed | 0, ctx.frame | 0, hlPlayer(fighter))
  if (!clip) return
  try {
    const src = (sound && sound._resolveSrc) ? sound._resolveSrc(clip) : clip
    const a = new Audio(src)
    a.loop = true
    a.playbackRate = juicePitch(hlSeedFrame(ctx.seed | 0, ctx.frame | 0), hlPlayer(fighter), 0.03)
    a.volume = (sound && sound._sfxMuted ? 0 : (sound && sound._sfxVol != null ? sound._sfxVol : 0.8)) * 0.85
    a.play().catch(() => {})
    fighter._hlLaserEl = a
  } catch (_) {}
}
export function stopHomelanderLaser(fighter, fadeMs = 120) {
  const a = fighter && fighter._hlLaserEl
  if (!a) return
  fighter._hlLaserEl = null
  const v0 = a.volume, steps = 6
  let i = 0
  const t = setInterval(() => {
    i++; try { a.volume = Math.max(0, v0 * (1 - i / steps)) } catch (_) {}
    if (i >= steps) { clearInterval(t); try { a.pause(); a.currentTime = 0 } catch (_) {} }
  }, Math.max(4, fadeMs / steps))
}

// Pool names in a stable order — for the Training-Mode sound test.
export const HL_POOL_ORDER = Object.keys(HOMELANDER_SFX)
'''.replace("%POOLS%", pools_js)

out = os.path.join(HERE, "..", "homelander_sfx_map.js")
open(out, "w").write(js)
print("wrote homelander_sfx_map.js —", sum(len(v) for v in pools.values()), "clips across", len(ORDER), "pools")
