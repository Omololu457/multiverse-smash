// ghostfaceKiller.js — Ghostface's KILLER DIAL (Ben 10-style form switching) + his borrowed SMOKE (render-only).
//
// DIAL (sim, deterministic — own frame counter, no Math.random): the same gesture as the Ninja Storm Trio / Ben's
// Omnitrix, with Ben's live windows (16-frame ↓↓ double tap, 18-frame arm):
//   hold P (Charge) · ↓ ↓ · then J  → CHROLLO (Assassin)      hold P · ↓ ↓ · then K  → ZARAKI (Enforcer)
// As Ghostface it is a Backstage Pass swap (he dashes out and the killer comes back in). While already a killer it
// works like Ben swapping aliens: the OTHER button jumps straight to the other killer, the SAME button turns back
// into Ghostface. The picking J / K never swings, and the held P never becomes a Charge. The old shoulder + Special
// swap still works. A press that can't fire yet (mid-move, not enough Dread) is buffered for the arm window.
//
// SMOKE (presentation only — reads state, writes nothing the sim reads): every vanish / re-entry / swap goes up in
// smoke borrowed from the rest of the game — Kakashi's summoning poof (kakashi_war_smoke_uniform.png), Robin's
// smoke-pellet strip (assets/robin/fx/smoke_strip.png) and a low Batman-style smoke field that hangs where he left;
// a killer form trails Robin's smoke from its feet while it moves. All darkened to Ghostface black.
import { triggerGhostfaceBackstagePass, triggerGhostfaceSwap, revertGhostfaceSwap, GHOSTFACE_KILLER_FORMS } from './abilities.js'

export const GF_DIAL = { dbl: 16, arm: 18 }
// J → Chrollo (Assassin), K → Zaraki (Enforcer) — indices into GHOSTFACE_KILLER_FORMS (["zaraki", "chrollo"])
export const GF_DIAL_SLOT = { light: GHOSTFACE_KILLER_FORMS.indexOf('chrollo'), heavy: GHOSTFACE_KILLER_FORMS.indexOf('zaraki') }

export const isGhostfaceKiller = f => !!f && ((f.rosterKey || '').toLowerCase() === 'ghostface' || (!!f._gfSwapActive && !!f._killerForm))

// per input frame, from game.js updateMovementInput (beside Pain / Mayuri's selectors). Mutates inputState to swallow
// the gesture's presses. Returns the action taken this frame (test hook) or null.
export function updateGhostfaceKillerDial(f, inputState, ctx) {
  if (!isGhostfaceKiller(f) || !inputState) return null
  const d = f._gfDial || (f._gfDial = { t: 0, downAt: null, arm: 0, want: -1, wantT: 0, prevDown: false, prevL: false, prevH: false, last: null })
  d.t++
  f._omxConsume = null                                            // only this selector writes it for Ghostface — reset each frame
  if (f._aiControlled || (f._gfCpu || 0) > 0) { if (f._gfCpu > 0) f._gfCpu--; cpuDial(f, d, inputState, ctx) }   // the CPU plays the SAME gesture through this dial
  const down = !!inputState.down, light = !!inputState.light, heavy = !!inputState.heavy, charge = !!inputState.charge
  if (down && !d.prevDown) {
    if (!charge) d.downAt = null
    else if (d.downAt != null && d.t - d.downAt <= GF_DIAL.dbl) { d.arm = GF_DIAL.arm; d.downAt = null }
    else d.downAt = d.t
  }
  d.prevDown = down
  const eL = light && !d.prevL, eH = heavy && !d.prevH; d.prevL = light; d.prevH = heavy
  let act = null
  if (d.arm > 0) {
    if (!charge) d.arm = 0
    else {
      f._suppressChargeUntilRelease = true                       // the held P of the gesture never becomes a Charge
      if (eL || eH) { d.want = eL ? GF_DIAL_SLOT.light : GF_DIAL_SLOT.heavy; d.wantT = GF_DIAL.arm; d.arm = 0; swallow(f, inputState); if (d.cpu) d.cpu.wait = 60 }
      else d.arm--
    }
  }
  if (d.want >= 0) {
    if (d.wantT === GF_DIAL.arm) swallow(f, inputState)           // the picking press itself
    act = fire(f, d.want, ctx)
    if (act) { d.want = -1; d.last = act }
    else if (d.cpu?.wait > 0) d.cpu.wait--                          // CPU: keep trying until the current move ends
    else if (--d.wantT <= 0) d.want = -1
  }
  return act
}
// ── CPU: when to swap, and the gesture itself (P held · ↓ · · ↓ · · J|K), 2 frames a step inside Ben's windows ──
// Deterministic: decided from the fighter's own dial clock + spacing + a hash roll (no Math.random). Zaraki (Enforcer,
// the brute) when the foe is close, Chrollo (Assassin, the technical zoner) at range; as a killer it switches across
// when the spacing flips (or after ~8 s in one killer), and late in a form (or low on life) it turns back into Ghostface to bank Dread.
// game.js's CPU router marks a CPU-driven Ghostface every frame (like markOmvCpu); not in training (the dummy never swaps)
export function markGfCpu(f) { if (isGhostfaceKiller(f)) f._gfCpu = 2 }
export const GF_CPU = { think: 30, gap: 200, near: 230, minHold: 300, stale: 480, chance: 0.45, cost: 15 }
const CPU_QUIET = ['charge', 'down', 'light', 'heavy', 'special', 'grab', 'upAttack', 'ultimate', 'block', 'jump', 'up']
const GESTURE = [['charge'], ['charge'], ['charge', 'down'], ['charge', 'down'], ['charge'], ['charge'], ['charge', 'down'], ['charge', 'down'], ['charge'], ['charge', 'BTN'], ['charge', 'BTN'], ['charge']]
const roll = (a, b) => { let v = Math.imul(a + 1, 2654435761) ^ Math.imul(b + 17, 40503); v = Math.imul(v ^ (v >>> 15), 2246822519); return ((v ^ (v >>> 13)) >>> 0) / 4294967296 }
function cpuDial(f, d, inputState, ctx) {
  const c = d.cpu || (d.cpu = { seq: -1, btn: 'light', last: -1e9, swaps: 0, picks: [] })
  if (c.seq < 0 && d.want < 0 && d.t >= (c.next || 0) && d.t - c.last >= GF_CPU.gap && !busy(f) && !f.attacking && !((f.attackCooldown || 0) > 0)) {
    c.next = d.t + GF_CPU.think                                    // think at the first free frame of each 0.5 s
    const o = ctx?.getOpponent?.(f)
    if (o && o.health > 0) {
      const dist = Math.abs(((o.x || 0) + (o.w || 60) / 2) - ((f.x || 0) + (f.w || 60) / 2))
      let want = dist < GF_CPU.near ? 'zaraki' : 'chrollo'
      const other = k => k === 'zaraki' ? 'chrollo' : 'zaraki'
      let pick = null
      if (!f._gfSwapActive) {
        if (c.picks[c.picks.length - 1] === want && roll(d.t, 4) < 0.5) want = other(want)               // mix the killers up
        if ((f.energy || 0) >= GF_CPU.cost + 5 && roll(d.t, 1) < GF_CPU.chance) pick = want
      } else if (d.t - c.last >= GF_CPU.minHold) {
        const lowLife = f.health < (f.maxHealth || 1) * 0.3, late = (f._gfSwapTimer || 0) < 150
        if (d.t - c.last >= GF_CPU.stale && want === f._gfSwapTarget) want = other(want)                   // been this killer a while → the other one
        if (want !== f._gfSwapTarget && roll(d.t, 2) < GF_CPU.chance) pick = want                       // switch across
        else if ((late || lowLife) && roll(d.t, 3) < 0.5) pick = f._gfSwapTarget                         // same button = back to Ghostface
      }
      if (pick) { c.btn = pick === 'chrollo' ? 'light' : 'heavy'; c.seq = 0; c.last = d.t; c.picks.push(pick) }
    }
  }
  if (c.seq >= 0 || d.want >= 0) {                               // gesture + buffered pick: no other move may start
    for (const k of CPU_QUIET) inputState[k] = false
    if (c.seq < 0) return                                         // the buffered pick fires (or expires after the CPU wait)
  }
  if (c.seq >= 0) {
    for (const k of GESTURE[c.seq]) inputState[k === 'BTN' ? c.btn : k] = true
    if (++c.seq >= GESTURE.length) { c.seq = -1; c.swaps++ }
  }
}
function swallow(f, inputState) {
  f._omxConsume = { ...(f._omxConsume || {}), light: true, heavy: true }
  inputState.light = false; inputState.heavy = false
}
function busy(f) {
  return !(f.health > 0) || (f.hitstun || 0) > 0 || (f.blockstun || 0) > 0 || f.knockdownState || f.isGrabbed || f._bpActive
    || (f.attacking && f.currentAttack?.isUltimate)
}
function fire(f, slot, ctx) {
  if (busy(f)) return null
  if (f._gfSwapActive) {                                          // already a killer: Ben-style alien swap / revert
    if (f.attacking || f.currentMove) return null
    const want = GHOSTFACE_KILLER_FORMS[slot]
    if (f._gfSwapTarget === want) return revertGhostfaceSwap(f) ? 'revert' : null
    if (!revertGhostfaceSwap(f)) return null
    return triggerGhostfaceSwap(f, slot, ctx) ? 'switch:' + want : 'revert'
  }
  return triggerGhostfaceBackstagePass(f, 'swap', slot, ctx) ? 'pass:' + GHOSTFACE_KILLER_FORMS[slot] : null
}

// ── SMOKE (render) ───────────────────────────────────────────────────────────────────────────────────────────────
const IMG = {}
const img = src => { if (typeof Image === 'undefined') return null; if (!IMG[src]) { const i = new Image(); i.src = src; IMG[src] = i } return IMG[src] }
const ok = i => i && i.complete && i.naturalWidth > 0
const POOF = { src: './kakashi_war_smoke_uniform.png', frames: 5, life: 20 }      // Kakashi's summoning poof
const PELLET = { src: './assets/robin/fx/smoke_strip.png', frames: 5, life: 24 }   // Robin's smoke pellet
const SM = new WeakMap()
const hh = (a, b) => { let v = Math.imul(a + 11, 2654435761) ^ Math.imul(b + 3, 40503); v = Math.imul(v ^ (v >>> 15), 2246822519); return ((v ^ (v >>> 13)) >>> 0) / 4294967296 }
export const ghostfaceSmokeState = f => SM.get(f) || null   // test hook

function burst(s, x, y, big) {
  s.fx.push({ k: 'poof', x, y, t: 0, life: POOF.life, sc: big ? 1.6 : 1.15 })
  for (let i = 0; i < (big ? 6 : 4); i++) s.fx.push({ k: 'pellet', x: x + (hh(i, s.n) - 0.5) * 90, y: y + 20 + (hh(i + 5, s.n) - 0.5) * 40, t: -i * 2, life: PELLET.life, sc: 1.3 + hh(i + 9, s.n) })
  s.fx.push({ k: 'field', x, y: y + 40, t: 0, life: big ? 90 : 60, r: big ? 90 : 70 })   // Batman-style lingering smoke
  s.n++
}
// world space, from game.js's per-fighter overlay pass
export function drawGhostfaceSmoke(c, f) {
  if (!f || !(isGhostfaceKiller(f) || SM.has(f))) return
  let s = SM.get(f); if (!s) { s = { fx: [], n: 0, bp: false, em: false, sw: false, tgt: null, tr: 0 }; SM.set(f, s) }
  const cx = (f.x || 0) + (f.w || 60) / 2, cy = (f.y || 0) + (f.h || 100) * 0.5, feet = (f.y || 0) + (f.h || 100)
  if (f._bpActive && !s.bp) burst(s, cx, cy, false)                                   // Backstage Pass: vanish
  if (f._bpActive && f._bpEmerged && !s.em) burst(s, cx, cy, false)                  // … and re-entry
  if (!!f._gfSwapActive !== s.sw || (f._gfSwapActive && f._gfSwapTarget !== s.tgt)) burst(s, cx, cy, true)   // killer swap / switch / revert
  s.bp = !!f._bpActive; s.em = !!(f._bpActive && f._bpEmerged); s.sw = !!f._gfSwapActive; s.tgt = f._gfSwapTarget || null
  if (f._gfSwapActive && Math.abs(f.vx || 0) > 2 && ++s.tr % 7 === 0)                 // killer form: smoke trail from the feet
    s.fx.push({ k: 'pellet', x: cx - (f.facing || 1) * 14, y: feet - 14, t: 0, life: PELLET.life, sc: 0.9 })
  if (!s.fx.length) return
  c.save()
  const poof = img(POOF.src), pel = img(PELLET.src)
  try { c.filter = 'brightness(0.32) contrast(1.15)' } catch (_) {}
  for (const z of s.fx) {
    z.t++; if (z.t <= 0) continue
    const u = z.t / z.life, a = Math.min(1, (1 - u) * 1.6)
    if (z.k === 'field') {                                                         // Batman's low smoke field
      c.globalAlpha = 0.5 * a; c.fillStyle = '#16181f'
      for (let i = 0; i < 9; i++) { const px = z.x + (hh(i, z.x | 0) - 0.5) * z.r * 1.6 + Math.sin((z.t + i * 13) / 30) * 6, py = z.y - 10 - hh(i + 31, z.y | 0) * z.r * 0.4
        c.beginPath(); c.arc(px, py, z.r * (0.28 + 0.2 * hh(i + 7, z.x | 0)), 0, Math.PI * 2); c.fill() }
    } else {
      const S = z.k === 'poof' ? POOF : PELLET, im = z.k === 'poof' ? poof : pel
      if (!ok(im)) continue
      const fw = im.naturalWidth / S.frames, fh = im.naturalHeight, fi = Math.min(S.frames - 1, Math.floor(u * S.frames))
      const w = fw * z.sc, h = fh * z.sc
      c.globalAlpha = 0.9 * a; c.imageSmoothingEnabled = false
      c.drawImage(im, fi * fw, 0, fw, fh, z.x - w / 2, z.y - h * (z.k === 'poof' ? 0.6 : 0.5), w, h)
    }
  }
  c.restore()
  s.fx = s.fx.filter(z => z.t < z.life)
}
