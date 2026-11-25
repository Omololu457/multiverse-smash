// dnaScan.js — DNA SCAN (2026-11-24, owner request): Ben, Albedo and Kevin can SCAN the opponent and turn into them.
//   ↓ + U   SCAN (ultimate, 100 meter) — a frozen cinematic: the Omnitrix / Ultimatrix beam scans the foe (Kevin absorbs
//           their DNA). The foe becomes a 6th alien for the REST OF THE MATCH (one stored DNA slot; a new scan replaces it).
//   ↓↓ then U  THE 6TH ALIEN (2026-11-25, owner request): the scanned foe sits on the Omnitrix dial like any other alien —
//           ↓↓ then U transforms (from human OR straight from another alien), ↓↓ then ; turns back, and while wearing the
//           copy ↓↓ then J / K / L / O / P drops it and dials that alien. (A single ↓ + U is still the SCAN.)
//   U + L   TRANSFORM into the scanned form (25 meter, 20 s, then the device times out — 4 s recharge). U + L again while
//           transformed = turn back early. The copy is the FULL kit (normals / specials / forms / ultimate), drawn in the
//           copier's own colour scheme with the copier's badge on the chest (dnaScanFx.js).
// Engine: the same field-swap Chrollo's Skill Hunter / the Transformation Jutsu use, with its own state (f._dna) so it never
// touches theirs. Input arrives from the very top of game.js updateMovementInput (dnaScanTick) on the RAW pad/keys; presses
// it takes are swallowed with the squad mask (f._squadEat) and a held-back U is re-injected (f._squadInject), the same
// contract as the Thunder Megazord's U + L. Cinematics go through cineRegistry (freeze + screen pass) → no other game.js hooks.
// Deterministic: no Math.random / wall clock in the simulation.
import { characters } from './characters.js'
import { registerFreezeCine } from './cineRegistry.js'
import { readRawControlsUnmasked, clearInputBuffer } from './input.js'
import { revertToHuman } from './fighters.js'
import { kevinForm } from './kevinState.js'
import { DNA_SCENE, DNA_PULSES, DNA_FIGHTERS, dnaPreload } from './dnaScanFx.js'

export const DNA = {
  dialTap: 16, dialArm: 18,   // ↓↓ dial: same windows as the Omnitrix menu (game.js OMX_DOUBLE_TAP_WINDOW / OMX_ARM_WINDOW)
  scanCost: 100, morphCost: 25, duration: 20 * 60, recharge: 4 * 60, chord: 4,
  scanTotal: 112, scanLock: 84, morphTotal: 76, morphSwap: 40,
}
const SCANNERS = { ben10: 'ben', albedo: 'albedo', kevin_levin: 'kevin' }
const NO_COPY = new Set(['ben10', 'albedo'])   // the Omnitrix can't sample another Omnitrix wielder
const SWAP_FIELDS = ['rosterKey', 'name', 'color', 'basic_attacks', 'animationData', 'spriteScale', 'traits', 'ultimate', 'dashTeleport', 'runWhenAdvancing',
  'introPool', 'maxEnergy', 'energyType', 'transformations', 'transformationOrder', 'specials', 'passive', 'archetypes', 'primary', 'secondary', 'hasSprites']
const EXTRA_STASH = ['_skinAnim', '_recolorTag', '_baseSkinAnim', '_benTheme', 'omnitrix', 'currentForm', 'transformIndex']

const LIVE = new Set()
const ctrX = f => f.x + (f.w || 60) / 2

// base (selected) character of a fighter that may itself be wearing someone else's kit
function baseKey(f) {
  if (!f) return ''
  if (f._dna?.active && f._dna.stash) return String(f._dna.stash.rosterKey || '').toLowerCase()
  if (f._shActive && f._shStash) return String(f._shStash.rosterKey || '').toLowerCase()
  if (f._tjActive && f._tjStash?.rosterKey) return String(f._tjStash.rosterKey).toLowerCase()
  if (f._edoActive && f._edoStash?.rosterKey) return String(f._edoStash.rosterKey).toLowerCase()
  return String(f.rosterKey || '').toLowerCase()
}
function scanTarget(f, opp) {
  if (!opp || opp === f || opp.eliminated) return null
  const key = baseKey(opp)
  if (!key || NO_COPY.has(key) || key === f._dna.base || !characters[key]) return null
  if (opp._canvasHeightFrac) return null
  return key
}
function free(f) {
  return !((f.hitstun || 0) > 0) && !((f.blockstun || 0) > 0) && !f.knockdownState && !f.eliminated && (f.health || 0) > 0 && !f._tauntPlaying
}
function spend(f, n) {
  if (f.infiniteEnergy) return true
  if ((f.energy || 0) < n) return false
  f.energy = Math.max(0, (f.energy || 0) - n)
  if (f.omnitrix && typeof f.omnitrix.power === 'number') f.omnitrix.power = Math.max(0, f.omnitrix.power - n)
  return true
}
function snapKeys(r) { return { block: !!r.block, light: !!r.light, heavy: !!r.heavy, special: !!r.special, grab: !!r.grab, charge: !!r.charge } }
function eat(f, ...keys) { f._squadEat = { ...(f._squadEat || {}) }; for (const k of keys) f._squadEat[k] = true }

// ── the swap ──────────────────────────────────────────────────────────────────────────────────────────────────────────
function clearTransient(f) {
  f.attacking = false; f.currentMove = null; f.currentAttack = null
  f._spriteCastMove = null; f._spriteCastTimer = 0; f.isCharging = false
  f._rekkaNext = null; f._cmdHitLanded = false; f._cmdPrevHeavy = false; f._cmdPrevLight = false
  const h = f.spriteHandler; if (h) { h.currentAction = null; h.frameIndex = 0; h.frameTimer = 0; h.locked = false }
}
function cleanseForms(f) {
  f._susanooStage = 0; f._susanooTimer = 0; f._susanooActive = false; f._suppressUltCooldown = false
  f._itachiSusanoo = false; f._itachiSusanooTimer = 0; f._mangekyouActive = false
  f._godspeedActive = false; f._godspeedTrail = null; f._flashTimeActive = false; f._ftTrail = null; f._oppTimeScale = null
  f.damageMultiplier = f._dna?.stash?._dmg ?? 1; f.attackSpeedMultiplier = 1
  f._canvasHeightFrac = null; f._rooted = false; f.isLaunched = false; f._flightActive = false
}
export function applyDnaForm(f, key) {
  const d = f._dna, T = characters[key]
  if (!d || !T || d.active) return false
  if (f.omnitrix && f.transformed) { try { revertToHuman(f) } catch (_) {} }   // Ben/Albedo: drop the current alien first
  const stash = {}
  for (const k of SWAP_FIELDS) stash[k] = f[k]
  for (const k of EXTRA_STASH) stash[k] = f[k]
  stash._dmg = f.damageMultiplier; stash._def = f.defenseMultiplier
  d.stash = stash
  f.rosterKey = key; f.name = T.name || key; f.color = T.color || f.color
  f.basic_attacks = T.basic_attacks || f.basic_attacks; f.animationData = T.animationData || f.animationData
  f.spriteScale = T.spriteScale ?? f.spriteScale; f.traits = T.traits || f.traits; f.ultimate = T.ultimate || null
  f.specials = T.specials || {}; f.passive = T.passive || null; f.archetypes = T.archetypes || f.archetypes
  f.primary = T.primary || f.primary; f.secondary = T.secondary || f.secondary
  f.dashTeleport = !!T.movement?.dashTeleport; f.runWhenAdvancing = !!T.movement?.runWhenAdvancing
  f.introPool = T.introPool || null; f.hasSprites = T.hasSprites !== false
  f.transformations = T.transformations || null; f.transformationOrder = T.transformationOrder || null
  f.currentForm = (T.transformationOrder && T.transformationOrder[0]) || null; f.transformIndex = T.transformationOrder ? 0 : null
  f._skinAnim = null; f._baseSkinAnim = null; f._recolorTag = null; f._benTheme = null
  f.omnitrix = null                                   // the Omnitrix machinery sleeps while wearing the sample
  f.maxEnergy = T.stats?.maxEnergy || stash.maxEnergy || 100
  f.energyType = T.traits?.energyType || f.energyType
  f.energy = Math.min(f.energy || 0, f.maxEnergy)    // the pool carries over (no free full bar)
  f.damageMultiplier = 1; f.defenseMultiplier = stash._def ?? f.defenseMultiplier
  clearTransient(f)
  f._dnaScheme = d.scheme
  d.active = true; d.timer = DNA.duration; d.total = DNA.duration; d.formKey = key
  f.ultimateCooldown = 0
  try { clearInputBuffer(f) } catch (_) {}
  f.teleportFlash = 14
  LIVE.add(f)
  return true
}
export function revertDnaForm(f, why = 'manual') {
  const d = f?._dna
  if (!d?.active || !d.stash) return false
  const s = d.stash
  cleanseForms(f)
  for (const k of SWAP_FIELDS) f[k] = s[k]
  for (const k of EXTRA_STASH) f[k] = s[k] ?? null
  f.damageMultiplier = s._dmg ?? 1; f.defenseMultiplier = s._def ?? f.defenseMultiplier
  f.energy = Math.min(f.energy || 0, f.maxEnergy || 100)
  clearTransient(f)
  f._dnaScheme = null; f._dnaSheetLive = false
  d.active = false; d.stash = null; d.timer = 0; d.cd = DNA.recharge
  if (f.omnitrix && why === 'timeout') f.omnitrix.timeoutCooldown = Math.max(f.omnitrix.timeoutCooldown || 0, 60)
  try { clearInputBuffer(f) } catch (_) {}
  f.teleportFlash = 14
  if (f.omnitrix) f._benSfx = why === 'timeout' ? 'ben_timeout' : 'ben_revert'
  DNA_PULSES.push({ f, scheme: d.scheme, k: 0, total: 30 })
  LIVE.delete(f)
  return true
}

// ── cinematics (frozen) ───────────────────────────────────────────────────────────────────────────────────────────────
const cine = { active: false }
const sfx = (ctx, id, gain = 0.8) => { try { ctx?.sound?.playJuiceSfx?.(id, { gain }) } catch (_) {} }
const ben = (ctx, id) => { try { ctx?.sound?.playBen10?.(id, 1, 7) } catch (_) {} }
function startCine(kind, f, t, key) {
  const T = characters[key] || {}
  Object.assign(cine, { active: true, kind, k: 0, f, t, key, cam: null, camSaved: null, done: false })
  Object.assign(DNA_SCENE, { active: true, kind, k: 0, total: kind === 'scan' ? DNA.scanTotal : DNA.morphTotal, caster: f, target: t,
    scheme: f._dna.scheme, name: T.name || key, portrait: T.portrait || null, lockAt: DNA.scanLock, swapAt: DNA.morphSwap })
  dnaPreload(T.portrait)
  f.attacking = false; f.currentAttack = null; f.currentMove = null; f.vx = 0
  f._spriteCastMove = f.omnitrix ? 'transform' : null; f._spriteCastTimer = f.omnitrix ? 40 : 0
}
function endCine() {
  const cam = cine.cam, sv = cine.camSaved
  if (cam && sv) { cam.maxZoom = sv.maxZoom; cam.maxZoomStep = sv.maxZoomStep }
  if (cine.f) { cine.f._spriteCastMove = null; cine.f._spriteCastTimer = 0; cine.f.attackCooldown = Math.max(cine.f.attackCooldown || 0, 10) }
  for (const k of Object.keys(cine)) delete cine[k]
  cine.active = false
  DNA_SCENE.active = false; DNA_SCENE.caster = DNA_SCENE.target = null
}
function update(ctx = {}) {
  if (!cine.active) return
  const f = cine.f, t = cine.t, k = cine.k, cam = ctx.camera
  if (!f) return endCine()
  if (cam && !cine.cam) { cine.cam = cam; cine.camSaved = { maxZoom: cam.maxZoom, maxZoomStep: cam.maxZoomStep }; cam.maxZoom = 1.7; cam.maxZoomStep = 0.05 }
  if (cine.kind === 'scan') {
    if (k === 0) { ben(ctx, 'ben_transform'); sfx(ctx, 'charge_hum_rise', 0.7); cam?.shake?.(2, 12) }
    if (k === 18) sfx(ctx, 'energy_tone_hold', 0.65)
    if (k === 30 || k === 60) sfx(ctx, 'warp_wobble_01', 0.5)
    if (k === DNA.scanLock) {
      sfx(ctx, 'impact_crack_01', 0.8); ben(ctx, 'ben_swap'); cam?.shake?.(8, 14)
      const d = f._dna; d.scanKey = cine.key; d.scanName = characters[cine.key]?.name || cine.key; d.scans = (d.scans || 0) + 1
    }
    if (cam?.focusOnFighter) { if (k < 16) cam.focusOnFighter(f, 1.3); else if (k < DNA.scanLock + 6 && t) { cam.focusOnFighter(t, 1.25 + 0.25 * Math.min(1, (k - 16) / 50)) } else cam.focusBetween ? cam.focusBetween(f, t || f, 1.0) : cam.focusOnFighter(f, 1.0) }
    if (++cine.k > DNA.scanTotal) endCine()
  } else {
    if (k === 0) { ben(ctx, 'ben_transform'); sfx(ctx, 'sting_pitch_rise_hold', 0.6) }
    if (k === 14) sfx(ctx, 'charge_swell_riser', 0.75)
    if (k === DNA.morphSwap) { applyDnaForm(f, cine.key); sfx(ctx, 'boom_medium_01', 0.85); ben(ctx, 'ben_swap'); cam?.shake?.(14, 18) }
    if (cam?.focusOnFighter) cam.focusOnFighter(f, k < DNA.morphSwap + 10 ? 1.25 + 0.35 * Math.min(1, k / DNA.morphSwap) : 1.6 - 0.6 * Math.min(1, (k - DNA.morphSwap - 10) / 24))
    if (++cine.k > DNA.morphTotal) endCine()
  }
  DNA_SCENE.k = cine.k
}
function clear() {
  if (cine.active) { if (cine.kind === 'morph' && cine.k <= DNA.morphSwap && cine.f) { /* never swapped: refund nothing, just drop */ } endCine() }
  for (const f of [...LIVE]) revertDnaForm(f, 'reset')
  for (const f of DNA_FIGHTERS) { if (f._dna) { f._dna.cd = 0; f._dna.hold = null } }
  DNA_PULSES.length = 0
}
registerFreezeCine('dna_scan', { active: () => !!cine.active, update, clear })

// ── per-frame input + timers (game.js updateMovementInput, top) ───────────────────────────────────────────────────────
export function dnaScanTick(f, opp) {
  if (!f) return
  if (!f._dna) {
    const id = SCANNERS[String(f.rosterKey || '').toLowerCase()]
    if (!id) return
    f._dna = { base: String(f.rosterKey).toLowerCase(), scheme: id, scanKey: null, scanName: '', active: false, timer: 0, total: DNA.duration, cd: 0, t: 0, pu: false, pl: false, uAt: -99, lAt: -99, lEnergy: 0, hold: null, injected: false }
    DNA_FIGHTERS.add(f)
  }
  const d = f._dna
  d.t++
  d.stamp = DNA_SCENE.tick = (DNA_SCENE.tick || 0) + 1
  if (d.injected) { f._squadInject = null; d.injected = false }
  if (cine.active) return
  if (d.cd > 0) d.cd--
  if (d.active && --d.timer <= 0) revertDnaForm(f, 'timeout')

  const raw = f._aiControlled ? cpuRaw(f, opp, d) : (readRawControlsUnmasked(f) || {})
  const U = !!raw.ultimate, L = !!raw.special
  const uE = U && !d.pu, lE = L && !d.pl
  d.pu = U; d.pl = L
  if (lE) { d.lAt = d.t; d.lEnergy = f.energy || 0 }
  if (uE) d.uAt = d.t

  // ↓↓ — the Omnitrix dial, as it reaches the 6th (DNA) slot. A fresh ↓ edge within dialTap of the last one arms it.
  const Dn = !!raw.down
  if (Dn && !d.pd) { if (d.t - (d.lastDn ?? -99) <= DNA.dialTap) d.arm = DNA.dialArm; d.lastDn = d.t }
  d.pd = Dn
  if (d.arm > 0) {
    d.arm--
    if (uE && d.scanKey) {                                   // ↓↓ then U — the scanned alien
      d.arm = 0; d.hold = null
      eat(f, 'ultimate', 'down')
      if (!d.active && d.cd <= 0 && free(f) && !(f._kevin && kevinForm(f)) && (f.infiniteEnergy || (f.energy || 0) >= DNA.morphCost)) {
        spend(f, DNA.morphCost)
        startCine('morph', f, opp, d.scanKey)
      }
      return
    }
    if (d.active) {
      const e = k => !!raw[k] && !(d.pk || {})[k]
      if (e('block')) { d.arm = 0; eat(f, 'block'); revertDnaForm(f, 'manual'); d.cd = 0; d.pk = snapKeys(raw); return }   // ↓↓ then ; — back to human
      const slot = ['light', 'heavy', 'special', 'grab', 'charge'].find(e)
      if (slot && d.stash?.omnitrix) {                       // ↓↓ then J/K/L/O/P — drop the copy and dial that alien this same frame
        d.arm = 0; revertDnaForm(f, 'manual'); d.cd = 0
        f._omx = {}; f._omxArm = DNA.dialArm                 // the Omnitrix wakes up armed; its own dial reads this press as the pick
        d.pk = snapKeys(raw); return
      }
    }
  }
  d.pk = snapKeys(raw)

  // ↓ + U — SCAN (not while wearing a sample; Kevin only in his base form)
  if (uE && raw.down && !d.active && free(f) && !f.attacking && !(f.attackCooldown > 0) && !(f._kevin && kevinForm(f))) {
    const key = scanTarget(f, opp)
    if (key && (f.infiniteEnergy || (f.energy || 0) >= DNA.scanCost)) {
      spend(f, DNA.scanCost)
      eat(f, 'ultimate', 'down')
      startCine('scan', f, opp, key)
      return
    }
  }
  if (!d.scanKey) return
  // U + L — TRANSFORM (or turn back). Either order within DNA.chord frames.
  const chord = (uE && (L || d.t - d.lAt <= DNA.chord)) || (lE && (U || (d.hold != null)))
  if (chord) {
    d.hold = null
    if (d.active) { eat(f, 'ultimate', 'special'); revertDnaForm(f, 'manual'); return }
    if (d.cd <= 0 && free(f) && !(f._kevin && kevinForm(f)) && (f.infiniteEnergy || Math.max(f.energy || 0, d.t - d.lAt <= DNA.chord ? d.lEnergy : 0) >= DNA.morphCost)) {
      // L came first and already started a special: cancel it and give its meter back
      if (d.t - d.lAt <= DNA.chord && f.attacking) { f.attacking = false; f.currentAttack = null; f.currentMove = null; f.energy = Math.max(f.energy || 0, d.lEnergy) }
      spend(f, DNA.morphCost)
      eat(f, 'ultimate', 'special')
      startCine('morph', f, opp, d.scanKey)
      return
    }
  }
  // U first (no ↓, no L yet): hold it back up to DNA.chord frames waiting for L; no L → re-inject U so the normal ultimate fires
  if (uE && !raw.down && !L && (d.active || d.cd <= 0)) d.hold = d.t
  if (d.hold != null) {
    if (d.t - d.hold < DNA.chord && U) { eat(f, 'ultimate'); return }
    d.hold = null
    if (f._squadEat) { delete f._squadEat.ultimate; if (!Object.keys(f._squadEat).length) f._squadEat = null }
    if (U || d.t - d.uAt <= DNA.chord + 1) { f._squadInject = { ultimate: true }; d.injected = true }
  }
}

// CPU: scan when the meter is full and the foe is close; transform when the device is ready; turn back near the end
function cpuRaw(f, opp, d) {
  const r = {}
  if (!opp || d.t % 20) return r
  const dist = Math.abs(ctrX(opp) - ctrX(f)), h = ((d.t / 20) * 2654435761 >>> 0) % 100
  if (!d.scanKey && (f.energy || 0) >= DNA.scanCost && dist < 600 && h < 35 && scanTarget(f, opp)) { r.down = true; r.ultimate = true; d.pu = false }
  else if (d.scanKey && !d.active && d.cd <= 0 && (f.energy || 0) >= DNA.morphCost + 20 && h < 25) { r.ultimate = true; r.special = true; d.pu = false; d.pl = false }
  return r
}

export const dnaState = f => f?._dna ? { base: f._dna.base, scanKey: f._dna.scanKey, active: f._dna.active, timer: f._dna.timer, cd: f._dna.cd, rosterKey: f.rosterKey, scheme: f._dnaScheme || null, cine: cine.active ? cine.kind : null } : null
export const dnaCineActive = () => !!cine.active
