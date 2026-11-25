// sukunaDomainCine.js — SIM half of the rebuilt MALEVOLENT SHRINE domain for `sukuna` and `sukuna_shinjuku` (2026-11-24,
// owner: "yes rebuild sukuna's domain too"). Both keys open the SAME shared domain (domains.js rosterKey / domainKey
// 'sukuna'); domains.js calls the four hooks below and nothing about the domain's gameplay changes:
//   startSukunaDomainCine(domain, owner)   activateDomain → a short FROZEN opening (cineRegistry.registerFreezeCine) — the
//                                          hand-sign close-up 「領域展開」, blood floods the floor, the shrine looms out of the
//                                          dark, 伏魔御廚子 title, a first rake of cuts. The domain's own clock (timer, slash
//                                          cadence, damage, untouchable foe, clash rules) is simply paused while it plays.
//   noteSukunaSlash(domain, foe, cleave)   each sure-hit Dismantle / Cleave (render bookkeeping only — screen-raking lines,
//                                          an occasional Cleave X close-up)
//   noteSukunaDomainEnd(domain)            collapse (expiry, clash loss, round reset) → the end beat / shatter
//   drawShrineBackdrop / overlay           sukunaDomainFx.js (render only)
// Deterministic: a plain frame counter; voice picks are fixed per language (no Math.random / wall clock).
import { registerFreezeCine, registerCineScreen } from './cineRegistry.js'
import { SUKUNA_VOICE, getSukunaVoiceLang } from './sukunaVoice.js'
import { drawShrineOverlay } from './sukunaDomainFx.js'

export const OPEN = { len: 150, sign: 44, flood: 40, loom: 56, lit: 84, title: 70, rake: 112, out: 136 }

// shared render state (sim writes plain numbers / references; the FX module only reads it)
export const SD = { active: false, k: 0, owner: null, domain: null, foe: null, slashes: [], ended: null, last: null, tick: 0 }

const sfx = (ctx, id, gain = 0.8) => { try { ctx?.sound?.playJuiceSfx?.(id, { gain }) } catch (_) {} }
function voice(ctx, file) { try { if (file) ctx?.sound?.playSfxFile?.(file, null, { owner: SD.owner }) } catch (_) {} }
function domainClips() {
  const lang = getSukunaVoiceLang?.() === 'en' ? 'en' : 'ja'
  const pool = SUKUNA_VOICE?.[lang]?.castDomain || []
  // JA = the canonical two-beat incantation (領域展開 → 伏魔御廚子); EN = only "Malevolent Shrine" takes → title beat only
  return lang === 'ja' ? { sign: pool[0] || null, title: pool[1] || null } : { sign: null, title: pool[0] || null }
}

export function startSukunaDomainCine(domain, owner) {
  if (!domain || !owner) return false
  if (SD.active) clear()
  Object.assign(SD, { active: true, k: 0, owner, domain, foe: null, slashes: [], ended: null, last: domain, clips: domainClips() })
  return true
}
export function noteSukunaSlash(domain, foe, cleave, n) {
  if (!domain || domain !== SD.domain) return
  SD.foe = foe || SD.foe
  SD.slashes.push({ at: (domain.timerMax || 0) - (domain.timer || 0), cleave: !!cleave, n: n | 0, tick: SD.tick })
  if (SD.slashes.length > 6) SD.slashes.shift()
}
export function noteSukunaDomainEnd(domain) {
  if (!domain || domain !== SD.domain) return
  SD.ended = { early: (domain.timer || 0) > 2, tick: SD.tick }
  SD.domain = null
  if (SD.active) clear()
}
// the 領域展開 beat goes out with the theme through domains.js playDomainAudio (same channel as before, on the cast frame)
export const sukunaDomainSignClip = () => (SD.active ? SD.clips?.sign || null : null)
export const isSukunaDomainCineActive = () => !!SD.active
export const getSukunaDomainCineStatus = () => ({ active: !!SD.active, k: SD.k | 0, slashes: SD.slashes.length, ended: SD.ended ? (SD.ended.early ? 'early' : 'expired') : null })

function update(ctx = {}) {
  if (!SD.active) return
  const f = SD.owner, k = SD.k, cam = ctx.camera
  if (!f || !SD.domain) return clear()
  f.vx = 0
  if (k === 0) { sfx(ctx, 'boom_anticipation_suck', 0.9); sfx(ctx, 'energy_hum_low', 0.6) }
  if (k === 24) sfx(ctx, 'sting_pitch_rise_hold', 0.6)
  if (k === OPEN.flood) { sfx(ctx, 'boom_huge_02_roar', 0.9); cam?.shake?.(14, 18) }
  if (k === OPEN.loom) sfx(ctx, 'rumble_tail_01', 0.9)
  if (k === OPEN.title) { voice(ctx, SD.clips?.title); sfx(ctx, 'impact_frame_boom_long', 0.85); cam?.shake?.(10, 24) }
  for (const r of [0, 5, 9, 14, 18, 22]) if (k === OPEN.rake + r) sfx(ctx, r % 2 ? 'swish_fast_02' : 'swish_fast_01', 0.7)
  if (k === OPEN.rake + 24) { sfx(ctx, 'crack_sizzle_bright', 0.8); cam?.shake?.(8, 12) }
  if (k === OPEN.out) sfx(ctx, 'boom_medium_02', 0.8)
  // camera: tight on the hand sign, then pull wide so the shrine towers over the whole field
  if (cam?.focusOnFighter) cam.focusOnFighter(f, k < OPEN.sign ? 1.15 : k < OPEN.out ? 0.62 : 0.85)
  if (++SD.k >= OPEN.len) SD.active = false
}
function clear() { SD.active = false; SD.k = 0 }

registerFreezeCine('sukunaDomainOpen', { active: () => !!SD.active, update, clear })
registerCineScreen('sukunaDomain', (ctx, canvas) => drawShrineOverlay(ctx, canvas, SD, OPEN))
