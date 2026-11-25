// invincibleUlt.js — the frozen CINEMATIC PAYOFF of Invincible's TERMINAL VELOCITY (2026-11-24, owner: "give every
// character their own special ultimate"). The ultimate itself is unchanged and stays player-steered (invincibleState.js:
// takeoff → aim the marker → fall → impact, 380 direct / 120 shockwave through W.damage). On a DIRECT hit, tvTick hands the
// impact to startInvTvPayoff(), and the moment of impact is frozen and replayed as a cinematic (no damage here — the hit has
// already landed; positions / velocities are untouched, so the knockback resumes exactly as before):
//   IMPACT      k0-5     white frame → inverted frame; the letterbox slams in; hit-stop jitter; punch-in on the crater
//   THE CRATER  k0-60    the ground splits in radial cracks, a dome of dust and blue-yellow shock rings expand in slow
//                        motion, rubble hangs in the air; the column of air he tore through the sky still burns
//   THE TITLE   k8-80    TERMINAL VELOCITY slams in; the damage is stamped
//   STAY DOWN   k56-100  pull out; "STAY DOWN!" — the letterbox opens, combat resumes
// registerFreezeCine('inv_terminal_velocity'): game.js freezes combat / physics / input and calls update(ctx) each frame.
import { registerFreezeCine, registerCineScreen } from './cineRegistry.js'
import { sound } from './sound.js'
import { INV_VOICE } from './invincibleVoice.js'
import { drawInvTvScreen } from './invincibleUltFx.js'

export const INV_TV = { total: 100, pullAt: 56, voAt: 58 }
const c = { active: false }
export const isInvTvPayoffActive = () => !!c.active
export const invTvPayoffScene = () => (c.active ? c : null)
const sfx = (ctx, id, gain = 0.8) => { try { ctx?.sound?.playJuiceSfx?.(id, { gain }) } catch (_) {} }

// called by invincibleState.tvTick on the frame of a DIRECT Terminal Velocity hit
export function startInvTvPayoff(f, t, x, floorY, dmg) {
  if (c.active || !f || !t) return false
  Object.assign(c, { active: true, k: 0, caster: f, target: t, x, floorY, dmg: Math.max(0, Math.round(dmg || 0)), ko: !(t.health > 0), cam: null, camSaved: null })
  return true
}
function update(ctx = {}) {
  if (!c.active) return
  const cam = ctx.camera, k = c.k
  if (cam && !c.cam) { c.cam = cam; c.camSaved = { maxZoom: cam.maxZoom, maxZoomStep: cam.maxZoomStep, maxPanStep: cam.maxPanStep }; cam.maxZoom = 1.8; cam.maxZoomStep = 0.06; cam.maxPanStep = 80 }
  if (k === 0) { sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_01', 1); sfx(ctx, 'boom_huge_02_roar', 0.9); cam?.shake?.(26, 40) }
  if (k === 6) sfx(ctx, 'pitch_drop_slowmo', 0.8)
  if (k === 10) sfx(ctx, 'rumble_tail_01', 1)
  if (k === 14) { sfx(ctx, 'swish_fast_02', 0.7); sfx(ctx, 'sting_pitch_rise_hold', 0.5) }
  if (k === 40) sfx(ctx, 'rumble_tail_01', 0.6)
  if (k === INV_TV.voAt) { const e = INV_VOICE.nhbLast?.[1] || INV_VOICE.ipunch?.[0]; if (e) try { sound.playSfxFile?.(e[0], null, { owner: c.caster, fadeMs: 30 }) } catch (_) {} }
  if (cam?.focusOnFighter) {
    const box = { x: c.x - 24, y: c.floorY - 94, w: 48, h: 94 }
    const z = k < INV_TV.pullAt ? 1.6 - 0.1 * Math.min(1, k / INV_TV.pullAt) : 1.5 - 0.5 * Math.min(1, (k - INV_TV.pullAt) / 30)
    cam.focusOnFighter(box, z)
  }
  if (++c.k >= INV_TV.total) clear()
}
export function clear() {
  if (!c.active) return
  const cam = c.cam, sv = c.camSaved
  if (cam && sv) { cam.maxZoom = sv.maxZoom; cam.maxZoomStep = sv.maxZoomStep; cam.maxPanStep = sv.maxPanStep }
  for (const key of Object.keys(c)) delete c[key]; c.active = false
}
registerFreezeCine('inv_terminal_velocity', { active: isInvTvPayoffActive, update, clear })
registerCineScreen('inv_terminal_velocity', (ctx, canvas) => { if (!c.active) return false; drawInvTvScreen(ctx, canvas, c); return true })
