// mrIncredibleUlt.js — Mr. Incredible (mr_incredible) ULTIMATE "BACK IN MY PRIME" given a real activation cinematic (2026-11-24,
// owner: "give every character an ultimate that actually looks like I put in time and effort into it — if it's a transformation,
// don't change it"). The ultimate stays EXACTLY the timed MODE mrIncredibleState.mrActivate applies (100 meter, 15 s young form,
// ×1.30 damage / ×1.15 ground / ×1.10 air / ~10 % shorter recovery, the 24-frame entry, the reserve) — this module only plays a
// frozen cinematic the moment the mode starts (mrIncredibleState.setMrPrimeHook → once per activation). While it is frozen the
// kit does not tick, so the mode's 900-frame timer and the entry start exactly where they would have without it.
// BEATS (frozen, 156 f):
//   CLAIMS ADJUSTER   0-38    letterbox, a sepia, film-grained close-up of the veteran Bob — "Fifteen years of paperwork…"
//   GLORY DAYS       38-88    the newspaper montage: three front pages spin in (MR. INCREDIBLE SAVES THE DAY! …)
//   SUIT UP          88-112   the colour floods back, the "i" emblem blooms behind him, light rays; the veteran crossfades
//                             into his prime → white frame at 108
//   PRIME           112-156   the young Mr. Incredible strikes his pose: BACK IN MY PRIME slams in, the stat chips, shake
// Deterministic: frame counters only (render noise = integer hash). No damage (the legacy activation deals none).
import { registerFreezeCine, registerCineScreen } from './cineRegistry.js'
import { setMrPrimeHook } from './mrIncredibleState.js'
import { drawMrIncredibleUltScreen } from './mrIncredibleUltFx.js'

export const MRU = { total: 156, paperAt: 38, suitAt: 88, flashAt: 108, primeAt: 112 }
const C = { on: false }
const sfx = (ctx, id, gain = 0.8) => { try { ctx?.sound?.playJuiceSfx?.(id, { gain }) } catch (_) {} }
const restore = () => { const f = C.f; if (f) { if (C.alpha0 == null) delete f._fxAlpha; else f._fxAlpha = C.alpha0 } const c = C.cam, s = C.camSaved; if (c && s) { c.maxZoom = s.maxZoom; c.maxZoomStep = s.maxZoomStep; c.maxPanStep = s.maxPanStep } }
const reset = () => { for (const k of Object.keys(C)) delete C[k]; C.on = false }

setMrPrimeHook(f => {
  if (C.on || !f) return
  Object.assign(C, { on: true, f, k: 0, real: 0, hold: 0, alpha0: f._fxAlpha, dir: f.facing || 1, cam: null, camSaved: null })
  f.vx = 0; f._fxAlpha = 0
})
registerFreezeCine('mr_incredible_prime_activation', {
  active: () => !!C.on,
  update(ctx = {}) {
    if (!C.on) return
    const f = C.f, cam = ctx.camera, k = C.k
    if (!f || !(f.health > 0) || !(f._mrIncredible?.remaining > 0)) { restore(); reset(); return }   // KO / the mode was cleared (round reset) → end clean
    if (cam && !C.cam) { C.cam = cam; C.camSaved = { maxZoom: cam.maxZoom, maxZoomStep: cam.maxZoomStep, maxPanStep: cam.maxPanStep }; cam.maxZoom = 1.8; cam.maxZoomStep = 0.05; cam.maxPanStep = 80 }
    C.real++
    if (C.hold > 0) { C.hold--; return }
    f.vx = 0; f.vy = 0; f._fxAlpha = 0
    if (k === 0) { sfx(ctx, 'energy_hum_low', 0.6); sfx(ctx, 'pitch_drop_slowmo', 0.5) }
    if (k === MRU.paperAt || k === MRU.paperAt + 16 || k === MRU.paperAt + 32) { sfx(ctx, 'whoosh_medium_0' + (1 + ((k / 16) | 0) % 2), 0.7); sfx(ctx, 'impact_crack_01', 0.35) }
    if (k === MRU.suitAt) { sfx(ctx, 'charge_swell_riser', 0.9); sfx(ctx, 'charge_hum_rise', 0.6) }
    if (k === MRU.flashAt - 6) sfx(ctx, 'boom_anticipation_suck', 0.9)
    if (k === MRU.flashAt) { sfx(ctx, 'impact_frame_boom_long', 1); sfx(ctx, 'boom_huge_01', 0.8); cam?.shake?.(16, 22); C.hold = 8; C.flashReal = C.real }
    if (k === MRU.primeAt + 4) { sfx(ctx, 'hit_heavy_boom_01', 0.8); sfx(ctx, 'rumble_tail_01', 0.7) }
    if (cam?.focusOnFighter) cam.focusOnFighter(f, k < MRU.paperAt ? 1.5 + 0.15 * (k / MRU.paperAt) : k < MRU.suitAt ? 1.35 : k < MRU.primeAt ? 1.55 : 1.4)
    if (++C.k > MRU.total) { restore(); reset() }
  },
  clear() { if (!C.on) return; restore(); reset() },
})
registerCineScreen('mr_incredible_prime_activation', (ctx, canvas) => (C.on ? drawMrIncredibleUltScreen(ctx, canvas, C, MRU) : false))
export const isMrIncredibleUltActive = () => !!C.on
export const getMrIncredibleUltStatus = () => ({ active: !!C.on, frame: C.k | 0 })
