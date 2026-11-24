// spdSquad.js — "S.P.D. Rangers" (spd_rangers): the whole S.P.D. B-Squad as ONE fighter (2026-11-23, owner: "combine them all
// into one Ranger … name it the SPD Rangers … switch between each Ranger the same way you switch between each alien on Ben 10").
//
// THE FIVE FORMS are the five S.P.D. fighters, unchanged (Red's pace for everyone via spdParity.js). Like the Wind Rangers
// (nsDuo.js), the fighter's live rosterKey is the ACTIVE Ranger's id, so every Ranger-specific path — kit, sprites, sounds,
// FX, HUD portrait, CPU perception — runs as-is. Health and meter are SHARED (one life bar, one Delta bar).
//
// SWITCH = Ben 10's Omnitrix dial, the same windows (game.js OMX_DOUBLE_TAP_WINDOW 16 / OMX_ARM_WINDOW 18):
//   ↓ ↓ then  J = RED   K = BLUE   L = GREEN   O = YELLOW   P = PINK   U = OMEGA   (Light / Heavy / Special / Grab /
//   Charge / Ultimate — Omega takes Ben's reserved 6th slot, owner 2026-11-23: "add the Omega Ranger since he is S.P.D. too")
// The pick press is SWALLOWED (input.js squad mask) until it's released, so ↓+button never also fires the kit's move.
// Allowed in neutral, in the air, and in the RECOVERY of a normal (so a string can carry on as the next Ranger — Ben's
// mid-combo swap); never in hitstun / blockstun / a special / a super / a teleport. 40 f cooldown, no meter cost.
// Tag-in: the incoming Ranger arrives in a S.P.D. teleport flash with 6 invulnerable frames (render: spdSquadFx).
// State on f._squad (plain JSON — the replay / LAN snapshot carries it). No Math.random.
import { spdRed } from './spdRedData.js'
import { spd_blue } from './spdBlueData.js'
import { spd_green } from './spdGreenData.js'
import { spd_pink } from './spdPinkData.js'
import { spd_yellow } from './spdYellowData.js'

export const SQUAD_ID = 'spd_rangers'
export const SQUAD_FORMS = ['spd_red', 'spd_blue', 'spd_green', 'spd_yellow', 'spd_pink', 'omega_ranger']   // dial slots J K L O P U
export const SQUAD_BUTTONS = ['light', 'heavy', 'special', 'grab', 'charge', 'ultimate']
const FORM_CHAR = { spd_red: spdRed, spd_blue, spd_green, spd_pink, spd_yellow }
// Omega lives in characters.js (which imports this module) → he registers himself here instead of being imported (no cycle)
export function registerSquadForm(key, char) { FORM_CHAR[key] = char; char.hidden = true }
export const squadFormChar = form => FORM_CHAR[form] || null
export const SQUAD_COLORS = { spd_red: '#e0201c', spd_blue: '#2a6cf0', spd_green: '#2fbf3a', spd_yellow: '#f2d81c', spd_pink: '#ff6fb4', omega_ranger: '#e8ecf4' }
export const SQUAD_SHORT = { spd_red: 'RED', spd_blue: 'BLUE', spd_green: 'GREEN', spd_yellow: 'YELLOW', spd_pink: 'PINK', omega_ranger: 'OMEGA' }
export const SQUAD = { health: 1320, cooldown: 40, invuln: 6, flash: 14, dbl: 16, arm: 18 }
export const isSquad = f => !!f?._squad
export const squadStartForm = skinId => { const m = /^spd_rangers_start_(red|blue|green|yellow|pink|omega)$/.exec(skinId || ''); return !m ? 'spd_red' : m[1] === 'omega' ? 'omega_ranger' : 'spd_' + m[1] }

// the five Rangers leave the select grid — they live on as this character's forms (still valid ids for replays / tests / ?p1=)
for (const c of Object.values(FORM_CHAR)) c.hidden = true

// ── roster entry ─────────────────────────────────────────────────────────────────────────────────────────────────
export const spd_rangers = {
  ...spdRed,
  rosterKey: SQUAD_ID, hidden: false,
  name: 'S.P.D. Rangers', displayName: 'S.P.D. Rangers', hudName: 'S.P.D. Rangers', subtitle: 'B-Squad', color: '#e0201c',
  universe: 'power_rangers', series: 'Power Rangers S.P.D.',
  portrait: './assets/spd_rangers/portrait.png', hudIcon: './assets/spd_rangers/portrait.png',
  difficulty: 5, archetype: 'Squad / Form Swapper', tagline: 'S.P.D. Emergency — all five, one fight!',
  bio: 'Jack, Sky, Bridge, Z and Syd — S.P.D. B-Squad — plus Sam, the Omega Ranger, all in one fight. Red blinks in and passes judgment, Blue drives the pressure, Green reads auras and flips around you, Yellow fills the screen with shots and a clone, Pink hits like iron and Omega cuts in with the Omega Saber. ↓↓ then J / K / L / O / P / U calls Red / Blue / Green / Yellow / Pink / Omega, mid-combo if you like.',
  primary: 'rushdown', secondary: ['zoner', 'setplay'], archetypes: ['rushdown', 'zoner'],
  stats: { ...spdRed.stats, maxHealth: SQUAD.health },
  isSquad: true, squadForms: SQUAD_FORMS,
}

// ── form application: the Ranger's presentation + movement; health / meter / position stay ───────────────────────────
const FORM_FIELDS = ['name', 'displayName', 'hudName', 'color', 'portrait', 'hudIcon', 'spriteSheet', 'spriteScale', 'animationData', 'basic_attacks',
  'specials', 'ultimate', 'traits', 'energyConfig', 'grabCastPose', 'primary', 'secondary', 'archetypes', 'movement', 'civilianIdentity']
let SKIN_HOOK = null   // spdSquadSkins.js: (f, form) → applies the squad skin to that Ranger's sheets
export function setSquadSkinHook(fn) { SKIN_HOOK = fn }
function applyForm(f, form) {
  const c = FORM_CHAR[form]; if (!c) return
  f.rosterKey = form
  for (const k of FORM_FIELDS) if (c[k] !== undefined) f[k] = c[k]
  if (!c.hudName) f.hudName = c.name
  const st = c.stats
  f.stats = { ...st, maxHealth: f.maxHealth }
  f.baseSpeed = f.speed = st.speed; f.dashSpeed = st.dashSpeed; f.dashDuration = st.dashDuration
  f.maxJumps = st.maxJumps; f.jumpForce = -(st.jumpPower || 31); f.weight = st.weight
  f._skinAnim = null; f._baseSkinAnim = null; f._recolorTag = null
  if (SKIN_HOOK) SKIN_HOOK(f, form)
  if (f.spriteHandler) { f.spriteHandler.currentAction = null; f.spriteHandler.frameIndex = 0; f.spriteHandler.frameTimer = 0; f.spriteHandler.locked = false }
}

// round start (game.js, right before spdRedRoundReset / spdParityRoundReset so the active Ranger's own reset follows)
export function spdSquadRoundReset(f) {
  if (!f || (f.rosterKey !== SQUAD_ID && !f._squad)) return
  const start = squadStartForm(f.skinId)
  f._squad = { form: start, start, t: 0, cd: 0, swaps: 0, flash: 0, from: null, prevDown: false, downAt: null, armT: 0, prev: {}, cpu: null }
  applyForm(f, start)
}
const ensure = f => { if (f && f.rosterKey === SQUAD_ID && !f._squad) spdSquadRoundReset(f) }

// may the swap happen right now? (a reason string when refused — tests read it)
export function squadRefuse(f, form) {
  const q = f?._squad
  if (!q) return 'not-squad'
  if (!SQUAD_FORMS.includes(form)) return 'bad-form'
  if (form === q.form) return 'same'
  if (!(f.health > 0)) return 'ko'
  if ((f.hitstun || 0) > 0) return 'hitstun'
  if ((f.blockstun || 0) > 0) return 'blockstun'
  if (f.knockdownState || f.isGrabbed) return 'down'
  if (q.cd > 0) return 'cooldown'
  if (f._ranger?.blink || f._groundTeleport?.action) return 'teleporting'
  const a = f.attacking ? f.currentAttack : null
  if (a) {
    if (a.isUltimate || a.category === 'ultimate' || a.isSpecial || a.category === 'special') return 'attacking'
    const elapsed = (a.total ?? 0) - (a.timer ?? 0), activeEnd = a.activeEnd ?? ((a.startup || 0) + (a.active || 0))
    if (!(elapsed > activeEnd)) return 'attacking'   // normals: recovery frames only (Ben's mid-combo swap)
  }
  return null
}
// SWAP (player gesture, CPU, harness). W.clear(f, form) clears the outgoing Ranger's own kit state (game.js owns the worlds).
export function squadSwap(f, form, W) {
  ensure(f)
  if (squadRefuse(f, form)) return false
  const q = f._squad, from = q.form
  try { W?.clear?.(f, from) } catch (_) {}
  f.attacking = false; f.currentAttack = null; f.currentMove = null; f.attackCooldown = 0; f._rekkaNext = null
  applyForm(f, form)
  q.form = form; q.from = from; q.cd = SQUAD.cooldown; q.flash = SQUAD.flash; q.swaps++; f._squadTotal = (f._squadTotal || 0) + 1   // whole-match count (survives round resets)
  f.invulnTimer = Math.max(f.invulnTimer || 0, SQUAD.invuln)
  try { W?.cue?.(f, form) } catch (_) {}
  return true
}

// ── per-frame tick (before the five kits): timers + the ↓↓ + J/K/L/O/P gesture on the RAW (unmasked) controls ────────
export function tickSpdSquad(f, raw, W) {
  ensure(f); const q = f?._squad; if (!q) return
  q.t++; if (q.cd > 0) q.cd--; if (q.flash > 0) q.flash--
  const B = W?.benSwap?.() || SQUAD
  const down = !!raw.down
  if (down && !q.prevDown) {
    if (q.downAt != null && q.t - q.downAt <= (B.dbl ?? SQUAD.dbl)) { q.armT = B.arm ?? SQUAD.arm; q.downAt = null } else q.downAt = q.t
  }
  q.prevDown = down
  const edge = {}
  for (const b of SQUAD_BUTTONS) { const v = !!raw[b]; edge[b] = v && !q.prev[b]; q.prev[b] = v }
  if (q.armT > 0) {
    q.armT--
    const i = SQUAD_BUTTONS.findIndex(b => edge[b])
    if (i >= 0) {
      q.armT = 0
      const form = SQUAD_FORMS[i]
      if (form !== q.form && squadSwap(f, form, W)) f._squadEat = { ...(f._squadEat || {}), [SQUAD_BUTTONS[i]]: true }
      else if (form === q.form) f._squadEat = { ...(f._squadEat || {}), [SQUAD_BUTTONS[i]]: true }   // re-calling the active Ranger: still eat the press
    }
  }
}
// ── CPU: pick the Ranger for the range, swap mid-combo into a different one, swap out of the wrong one, and rotate ──
// Roles: Yellow / Green = range (shots, clone, aura read), Pink / Blue = close (iron, drive pressure), Red = both.
const ROLE = { spd_red: 'any', spd_blue: 'close', spd_green: 'mid', spd_yellow: 'far', spd_pink: 'close', omega_ranger: 'any' }
const PACE = { easy: 140, adaptive: 70, normal: 70, hard: 45, impossible: 30, master: 26 }
const ctr = o => (o.x || 0) + (o.w || 60) / 2
export function spdSquadCpu(f, opp, difficulty, W) {
  const q = f?._squad; if (!q || !opp || !(f.health > 0)) return
  const c = q.cpu || (q.cpu = { next: 0, mismatch: 0, last: -999 })
  const pace = PACE[difficulty] ?? 70, t = q.t
  if (t < c.next) return
  const dist = Math.abs(ctr(opp) - ctr(f))
  const want = dist > 380 ? 'far' : dist > 200 ? 'mid' : 'close'
  const rot = (h => SQUAD_FORMS[(h >>> 0) % SQUAD_FORMS.length])(Math.imul((t >> 5) + 7, 2654435761))   // deterministic variety
  // MID-COMBO: the foe is reeling from our string → continue it as another Ranger
  if ((opp.hitstun || 0) > 6 && (f.comboCounter || 0) >= 2 && t - c.last > 60 + pace) {
    const pool = SQUAD_FORMS.filter(k => k !== q.form && (ROLE[k] === 'close' || ROLE[k] === 'any'))
    const pick = pool.includes(rot) ? rot : pool[(t >> 3) % pool.length]
    if (squadSwap(f, pick, W)) { c.last = t; c.next = t + 12; return }
  }
  // WRONG TOOL for the range for a while → the Ranger that fits
  const fits = ROLE[q.form] === 'any' || ROLE[q.form] === want || (want === 'mid' && ROLE[q.form] !== 'close')
  c.mismatch = fits ? 0 : c.mismatch + 8
  if (c.mismatch > 90 && t - c.last > 120 + pace) {
    const pool = SQUAD_FORMS.filter(k => k !== q.form && (ROLE[k] === want || (want === 'mid' && ROLE[k] === 'far')))
    const pick = pool.length ? (pool.includes(rot) ? rot : pool[0]) : 'spd_red'
    if (squadSwap(f, pick, W)) { c.last = t; c.mismatch = 0 }
  }
  // ROTATION: after a few seconds as one Ranger, bring in another — the CPU shows off the whole squad
  if (t - c.last > 200 + pace * 2 && (f.energy || 0) >= 0) {
    const pool = SQUAD_FORMS.filter(k => k !== q.form && k !== q.from)
    const pick = pool.includes(rot) ? rot : pool[(t >> 4) % pool.length]
    if (squadSwap(f, pick, W)) { c.last = t; c.next = t + 12; return }
  }
  c.next = t + 8
}

export const squadPreloadKeys = cfg => [cfg?.p1CharKey, cfg?.p2CharKey].includes(SQUAD_ID) ? [...SQUAD_FORMS] : []
export const squadState = f => f?._squad ? { form: f._squad.form, cd: f._squad.cd, swaps: f._squad.swaps, total: f._squadTotal || 0, start: f._squad.start, armT: f._squad.armT, flash: f._squad.flash, from: f._squad.from, key: f.rosterKey, eat: f._squadEat || null } : null
