// cineRegistry.js — a shared slot for FROZEN CINEMATICS and their SCREEN-SPACE overlays, so a character module can own a
// full cinematic ultimate without adding its own game.js hooks (2026-11-23; first users: the Incredibles' ultimates).
//
//   registerFreezeCine(id, { active(), update(ctx), clear() })
//     While any registered cinematic is active, game.js freezes combat / physics / input (the same contract as Pink's,
//     Black's, Syndrome's … ultimates) and calls update(ctx) once per frame, ctx = { camera, sound, hitEffects, damageNumbers }.
//     camera: focusOnFighter(f, zoom) / focusBetween(a, b, zoom) / shake(strength, frames) (camera.js). sound: playJuiceSfx(id,
//     { gain }) (sound.js JUICE_SFX ids). clear() runs on every reset path (round reset, rematch, KO teardown, menu).
//   registerCineScreen(id, draw(ctx, canvas) → bool)
//     Called every frame AFTER the world is drawn and BEFORE the HUD, with an identity transform (device pixels). Return true
//     while the overlay wants the battle HUD hidden (letterbox cinematic). Draw nothing / return false when idle.
// Sim code must stay deterministic (no Math.random / wall clock): the update is part of the lockstep simulation.
const FREEZE = new Map(), SCREEN = new Map()
export const registerFreezeCine = (id, api) => { FREEZE.set(id, api) }
export const registerCineScreen = (id, draw) => { SCREEN.set(id, draw) }
export function anyFreezeCineActive() { for (const a of FREEZE.values()) { try { if (a.active()) return true } catch (_) {} } return false }
export function updateFreezeCines(ctx) { for (const a of FREEZE.values()) { try { if (a.active()) a.update(ctx) } catch (e) { try { a.clear() } catch (_) {} } } }
export function clearFreezeCines() { for (const a of FREEZE.values()) { try { a.clear() } catch (_) {} } }
export function drawCineScreens(ctx, canvas) {
  let hide = false
  for (const d of SCREEN.values()) { try { ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); if (d(ctx, canvas)) hide = true } catch (_) {} finally { ctx.restore() } }
  return hide
}
