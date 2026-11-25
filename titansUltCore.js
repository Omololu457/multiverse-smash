// titansUltCore.js — the shared DIRECTOR for the Teen Titans' cinematic ultimates (2026-11-24, owner: "give every character
// their own special ultimate"). Each Titan's ultimate already runs as a frozen cinematic in its own <x>State.js (opener →
// activate<X>Ult → update<X>Ult per frame → finish / clear<X>Ult); game.js wires that contract directly. This module wraps
// such a legacy scene in a cineRegistry freeze cine of the same `active()` so the scene gets the camera / sound context:
//   • the legacy update keeps owning poses, positions, contacts and damage (W.damage, combo scale, unchanged numbers);
//   • the director decides WHEN it advances: hit-stop holds on every contact, slow-motion stretches and authored pauses
//     (a legacy frame held for N director frames while the signature beat plays);
//   • it drives camera push-ins / pull-outs, the layered sfx script and voice lines, and records everything the screen
//     pass needs (contact log, real frames) — the character's own <x>UltFx.js draws the picture.
// cineRegistry checks freeze cines BEFORE game.js's own Titan branches, so the legacy branch simply stops being reached
// while this wrapper is registered; when the legacy scene ends (finish / clear) `active()` turns false on its own.
// Deterministic: everything is a function of frame counters (no Math.random / wall clock).
import { registerFreezeCine, registerCineScreen } from './cineRegistry.js'
import { sound } from './sound.js'
import { titanPool } from './titansVoice.js'

// a specific voice line from the Titan's pools (titansVoiceData.js) on the fighter's own voice channel (audio-only)
export function titanLine(f, pool, i = 0) {
  const L = titanPool(f, pool), e = L?.[i % (L?.length || 1)]
  if (!e) return
  try { sound.playSfxFile?.(e[0], null, { owner: f, fadeMs: 40 }) } catch (_) {}
}

const sfx = (ctx, id, gain = 0.8) => { try { ctx?.sound?.playJuiceSfx?.(id, { gain }) } catch (_) {} }

// plan = {
//   id, scene() → legacy cine object | null (active), update() legacy step, clear() legacy clear,
//   pauses: { [legacyFrame]: directorFrames }, slow(L) → advance-every-N (1 = normal), stop(contactIndex, kind) → hit-stop frames,
//   beat(api, L, D) once per director frame (sfx / voice / shake triggers — use api.once(key) to fire once),
//   contact(api, i, D) on each legacy contact, camera(cam, D, L), draw(ctx, canvas, D, scene) → screen pass, zoom (max camera zoom)
// }
export function titanCine(plan) {
  const D = { on: false }
  try { (globalThis.__titanCine ||= {})[plan.id] = D } catch (_) {}   // debug read (harness / screenshots)
  const reset = () => { for (const k of Object.keys(D)) delete D[k]; D.on = false }
  const restoreCam = () => { const cam = D.cam, sv = D.camSaved; if (cam && sv) { cam.maxZoom = sv.maxZoom; cam.maxZoomStep = sv.maxZoomStep; cam.maxPanStep = sv.maxPanStep } }
  const restoreAlpha = () => { if (D.invHidden && D.caster) delete D.caster._invAlpha; for (const [o, a] of D.alpha || []) { if (a == null) delete o._fxAlpha; else o._fxAlpha = a } }
  const end = () => { restoreAlpha(); restoreCam(); reset() }
  const active = () => !!plan.scene()
  function start(S, ctx) {
    reset()
    Object.assign(D, { on: true, s: 0, real: 0, hold: 0, pause: 0, paused: {}, fired: {}, hits: [], dmg: 0, caster: S.caster, target: S.target,
      dir: S.dir || S.caster?.facing || 1, L: 0, flashReal: -99, lastHit: null, alpha: [[S.caster, S.caster?._fxAlpha], [S.target, S.target?._fxAlpha]], stage: S.W?.worldWidth || S.W?.stageWidth || 0 })
    const cam = ctx?.camera
    if (cam) { D.cam = cam; D.camSaved = { maxZoom: cam.maxZoom, maxZoomStep: cam.maxZoomStep, maxPanStep: cam.maxPanStep }; cam.maxZoom = plan.zoom || 1.8; cam.maxZoomStep = 0.05; cam.maxPanStep = 70 }
  }
  const api = ctx => ({
    sfx: (id, g) => sfx(ctx, id, g),
    shake: (s, n) => { try { ctx?.camera?.shake?.(s, n) } catch (_) {} },
    once: key => (D.fired[key] ? false : (D.fired[key] = true)),
    ctx
  })
  function update(ctx = {}) {
    const S = plan.scene()
    if (!S) { end(); return }
    if (!D.on || D.caster !== S.caster || (S.frame === 0 && D.L > 0)) start(S, ctx)
    const A = api(ctx)
    D.real++; D.L = S.frame
    if (D.hold > 0) { D.hold--; plan.camera?.(ctx.camera, D, D.L); return }
    const L = S.frame
    if (plan.pauses?.[L] && !D.paused[L]) { D.paused[L] = true; D.pause = plan.pauses[L]; D.pauseAt = L; D.pauseReal = D.real }
    D.s++
    if (D.pause > 0) {
      D.pause--; D.pk = plan.pauses[D.pauseAt] - D.pause   // 1..N through the pause
      plan.beat?.(A, L, D)
      plan.camera?.(ctx.camera, D, L)
      return
    }
    D.pk = 0
    const every = plan.slow?.(L) || 1
    if (every > 1 && D.real % every) { plan.beat?.(A, L, D); plan.camera?.(ctx.camera, D, L); return }
    const t = S.target, hp0 = t?.health ?? 0, done0 = S.done | 0
    plan.beat?.(A, L, D)
    plan.update()
    if (!plan.scene()) { end(); return }   // the legacy scene finished this frame
    const done1 = S.done | 0
    for (let i = done0; i < done1; i++) {
      const dmg = Math.max(0, Math.round(hp0 - (t?.health ?? 0)))
      D.dmg += dmg; D.lastHit = { i, L, real: D.real, dmg, ko: !(t?.health > 0) }; D.hits.push(D.lastHit)
      D.hold = plan.stop?.(i, D) || 0
      plan.contact?.(A, i, D)
    }
    D.L = S.frame
    plan.camera?.(ctx.camera, D, D.L)
  }
  function clear() { try { plan.clear() } finally { end() } }
  registerFreezeCine(plan.id, { active, update, clear })
  registerCineScreen(plan.id, (ctx, canvas) => {
    const S = plan.scene()
    if (!S) { if (D.on) end(); return false }   // the legacy scene was cleared directly (game.js reset paths)
    if (!D.on) return false
    plan.draw(ctx, canvas, D, S)
    return true
  })
  return { D, setAlpha: (o, a) => { if (o) o._fxAlpha = a } }
}
