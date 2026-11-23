// nsDuo.js — MSV1-MERGE: "Shane & Dustin" (windrangers), ONE character with two swappable forms (ns_red / ns_yellow).
// The forms ARE the two MSV1 ninja profiles, unchanged. The fighter's live rosterKey is the ACTIVE form's id, so every
// form-specific path (ninja profile, Ranger profile, sprites, HUD portrait, sounds, quotes, CPU perception) runs as-is.
// Duo GAME_STATE lives on f._duo (in the replay / LAN snapshot via ninjaSnapshot). No Math.random: hash(seed, frame, slot).
//
// SWAP = the Ben 10 Omnitrix gesture (game.js handleOmnitrixSwitch): ↓↓ (2nd ↓ edge within OMX_DOUBLE_TAP_WINDOW) then ONE
// button within OMX_ARM_WINDOW — the owner's input is CHARGE held + ↓↓ + J (Light, Ben's slot-1 key). Windows / cost / lockout are read from
// game.js + fighters.js TRANSFORM_ENERGY through the world (W.benSwap), so the duo follows Ben's numbers.
// See docs/msv1/MERGE_DESIGN.md + MERGE_BEN10_SWAP_REFERENCE.md.
import { ns_red, ns_yellow } from './nsData.js'
import { wrApplyForm } from './windrangersSkins.js'   // the 10-skin pack follows every form swap (cosmetic only)
import { registerDuo, getNinjaProfile, ninjaState, nsStartMove, endMove, endMirror, burst, cue, spendNP, nsStrike, hasMotion, fresh, use, ctrX, overlaps,
  ninjaComboScale, NINJA_API } from './ninja.js'

export const DUO_ID = 'windrangers'
export const DUO_FORMS = ['ns_red', 'ns_yellow']
const FORM_CHAR = { ns_red, ns_yellow }
const other = form => form === 'ns_red' ? 'ns_yellow' : 'ns_red'
// other multi-form characters (nsTrio.js) add their forms here so the shared render helpers below (smoke, partner
// silhouette, HUD, preload) draw them too: forms → their character, partner(form) → the form shown behind / on the HUD
const EXT_FORMS = {}, EXT_PARTNER = {}, EXT_PRELOAD = {}
export function registerDuoForms(id, chars, partner) { Object.assign(EXT_FORMS, chars); for (const k of Object.keys(chars)) EXT_PARTNER[k] = partner; EXT_PRELOAD[id] = Object.keys(chars) }
// Old ids → the duo, for SAVED SETTINGS (session restore). Replays / tests / ?p1= URLs keep the old id = the hidden form
// character itself (bit-identical); see MERGE_DESIGN.md "Aliases".
export const DUO_ALIASES = { ns_red: { key: DUO_ID, skin: 'default' }, ns_yellow: { key: DUO_ID, skin: 'default' } }   // owner (2026-11-19): always start as Red unless "Start as: Yellow" is picked
export function duoResolveSaved(key, skin) { const a = DUO_ALIASES[key]; return a ? { key: a.key, skin: a.skin } : { key, skin } }
export const duoStartForm = skinId => skinId === 'start_yellow' ? 'ns_yellow' : 'ns_red'

// ── tuning (Ben's numbers come from the world; these are the brief's own) ─────────────────────────────────────────
export const DUO = {
  health: 1248,                       // S.P.D. Red 1200 × 1.04
  ben: { dbl: 16, arm: 18, cost: 15, lockout: 30 },   // fallback only — live values = W.benSwap() (game.js / fighters.js)
  swapFrames: 14, outEnd: 4, flipAt: 7, inStart: 10, invulnAt: 4, invulnFrames: 6,
  strike: { at: 10, dmg: 30, hitstun: 14, kb: 2, w: 84 },
  tag: { mul: 1.10, frames: 180 },
  cpu: { dwell: 150, near: 170, far: 0.42 },
}
// STORM AND STONE: the meter maxes at 100 = 2 bars, so the brief's 3 bars → the FULL meter (see MERGE_DESIGN.md).
export const STORM_AND_STONE = { bars: 2, reach: 0.6, streakAt: [16, 22, 28, 34, 40], streakDmg: 42, eruptAt: [20, 30, 40], eruptDmg: 50, meetAt: 56, meetDmg: 60, total: 96 }
const BAR = 50

// ── roster entry ─────────────────────────────────────────────────────────────────────────────────────────────────
export const windrangers = {
  ...ns_red,
  rosterKey: DUO_ID, hidden: false,
  // name: the owner's (2026-11-19); the brief's working title was "Shane & Dustin"
  name: 'Ninja Storm MS_V1 Ranger Version', displayName: 'Ninja Storm MS_V1 Ranger Version', subtitle: 'Wind Rangers', hudName: 'Wind Rangers', color: '#e0201c', accent2: '#f2c40c',
  universe: 'power_rangers', subUniverse: 'Ninja Storm',
  portrait: './assets/windrangers/portrait_large.png', hudIcon: './assets/windrangers/portrait_small.png',
  difficulty: 5, archetype: 'Ninja Duo / Form Swapper', tagline: 'Two elements. One storm.',
  bio: 'Shane Clarke and Dustin Brooks, the Red and Yellow Wind Rangers of the Wind Ninja Academy. A skateboarder who rules the air and a motocross rider who fights from the ground up, they tag in and out of one fight: wind above, earth below.',
  primary: 'rushdown', secondary: ['setplay', 'aerial'], archetypes: ['rushdown', 'setplay'],
  stats: { ...ns_red.stats, maxHealth: DUO.health },
  ultimate: { name: 'Storm and Stone', cost: 100 },
  isDuo: true, duoForms: DUO_FORMS,
}

// ── form application (presentation + movement fields of the active form; health / meter / NP / position stay) ──────
const FORM_FIELDS = ['name', 'hudName', 'color', 'portrait', 'hudIcon', 'spriteSheet', 'spriteScale', 'animationData', 'basic_attacks', 'traits', 'grabCastPose', 'primary', 'secondary', 'archetypes', 'movement']
function applyForm(f, form) {
  const c = FORM_CHAR[form]
  f.rosterKey = form
  for (const k of FORM_FIELDS) if (c[k] !== undefined) f[k] = c[k]
  wrApplyForm(f, form)   // windrangers skin pack: this form's skin strips / FX folder (no-op for default / start_yellow)
  const st = c.stats
  f.stats = { ...st, maxHealth: f.maxHealth }
  f.baseSpeed = f.speed = st.speed; f.dashSpeed = st.dashSpeed; f.dashDuration = st.dashDuration; f.dashCooldownMax = st.dashCooldownMax
  f.maxJumps = st.maxJumps; f.jumpForce = -(st.jumpPower || 32); f.weight = st.weight
}
// round start (ninjaRoundReset → here first). Every round restarts in the START form (the skin: default / start_yellow).
function roundReset(f) {
  if (!f || (f.rosterKey !== DUO_ID && !f._duo)) return
  const start = duoStartForm(f.skinId)
  f._duo = { id: DUO_ID, form: start, start, cd: 0, swaps: 0, t: 0, prevDown: false, prevLight: false, downAt: null, armT: 0, want: 0, tag: null, strikes: 0, tagHits: 0, ults: 0, cpu: null }
  f._duoFromKey = DUO_ID
  applyForm(f, start)
}
// FFA / any path that never ran the round reset: initialise on the first tick
function ensure(f) { if (f && f.rosterKey === DUO_ID && !f._duo) { roundReset(f); return true } return false }

const W = () => NINJA_API.world()
const ben = () => { const b = W()?.benSwap?.(); return b ? { ...DUO.ben, ...b } : DUO.ben }
const grounded = f => !!(f.onGround || f.grounded)
const elapsed = a => a.total - a.timer

// ── INPUT (every sim frame, before the hitstop return — Ben's detector runs on sim frames too) ─────────────────────
function input(f, raw) {
  const d = f._duo; if (!d) return
  const B = ben(); d.t++
  // owner (2026-11-19): the swap is CHARGE + ↓↓ + J — hold Charge, double-tap ↓ (Ben's window), then Light (Ben's pick window)
  const down = !!raw.down, light = !!raw.light, charge = !!raw.charge
  if (down && !d.prevDown) {
    if (!charge) d.downAt = null
    else if (d.downAt != null && d.t - d.downAt <= B.dbl) { d.armT = B.arm; d.downAt = null } else d.downAt = d.t
  }
  d.prevDown = down
  const lightEdge = light && !d.prevLight; d.prevLight = light
  d.ate = false
  if (d.armT > 0) {
    if (!charge) d.armT = 0
    else if (lightEdge) { d.want = B.arm; d.armT = 0; d.ate = true } else d.armT--
  }
}

// may the swap start right now? (reason string when refused — tests read it)
function refuse(f, s, d) {
  if (!(f.health > 0)) return 'ko'
  if ((f.hitstun || 0) > 0) return 'hitstun'
  if ((f.blockstun || 0) > 0) return 'blockstun'
  if (f.knockdownState || f.isGrabbed) return 'down'
  if (s.sup) return 'super'
  const a = f.attacking ? f.currentAttack : null
  if (a?.isUltimate) return 'super'
  if (d.swap) return 'swapping'
  if (d.cd > 0) return 'cooldown'
  if (s.vanish || s.streak || s.mirror?.swap || s.cloneJob?.phase === 'strike') return 'busy'
  if (a && a.name !== 'nsStreakRec' && a.name !== 'nsBurrow') {
    const md = getNinjaProfile(f)?.moves[a.name] || {}
    if (md.isSpecial || !(elapsed(a) > (a.activeEnd ?? 0))) return 'attacking'   // normals: recovery frames only
  }
  if ((s.np || 0) < ben().cost) return 'np'
  return null
}

// ── TICK (after the framework steps, before the move scripts) ──────────────────────────────────────────────────────
function tick(f, opp, s) {
  const d = f._duo; if (!d) return
  if (d.cd > 0 && !d.swap) d.cd--
  if (d.tag) { for (const k of Object.keys(d.tag)) if (--d.tag[k] <= 0) delete d.tag[k]; if (!Object.keys(d.tag).length) d.tag = null }   // per-form tag timers
  if (d.want > 0) {
    const why = refuse(f, s, d)
    if (!why) { d.want = 0; startSwap(f, opp, s, d) }
    else if (why === 'busy' && s.streak) { /* buffered: fires at the end of the streak */ }
    else { d.want--; d.lastRefuse = why }
  }
}

function startSwap(f, opp, s, d) {
  const from = d.form, to = other(from), vx = f.vx || 0, vy = f.vy || 0
  spendNP(f, ben().cost)
  // what a swap ends (MERGE_DESIGN.md): Mirror (both bodies pop), clones, REV pips, burrow (surfaces, no eruption), Wind Float
  if (s.mirror) endMirror(f, s, 'swap')
  if (s.clones.length || s.cloneJob) { for (const c of s.clones) if (!c.dead) burst(s, 'smokeFade', c.x, c.feet, 16, { form: from }); s.clones = []; s.cloneJob = null }
  s.rev.pips = 0; s.rev.t = 0
  if (s.burrow) { s.burrow = null; f._rooted = false; burst(s, 'dust', ctrX(f), (f.y || 0) + (f.h || 94), 12) }
  s.float.on = false
  if (s.barrier) s.barrier = null
  if (f.attacking) endMove(f)
  if (!nsStartMove(f, 'nsSwap')) return
  f.vx = vx; f.vy = vy   // momentum carries (air swaps keep it)
  f.currentAttack.nj.from = from; f.currentAttack.nj.to = to; f.currentAttack.nj.vx = vx
  d.swap = { t: 0, from, to }
  d.swaps++
  NINJA_API.setPose(f, 'nsVanish')
  burst(s, 'smoke', ctrX(f), (f.y || 0) + (f.h || 94), 16, { big: true, form: from })
  cue(f, 'smokePop')
}

// the swap move itself (kind 'duoSwap'), driven on the sim clock of the engine move
function runSwap(f, opp, s, a, t) {
  const d = f._duo; if (!d?.swap) return
  d.swap.t = t
  if (!grounded(f)) f.vx = a.nj.vx   // air momentum holds through the smoke
  if (t < DUO.outEnd) NINJA_API.setPose(f, 'nsVanish')
  if (t === DUO.invulnAt) { f.invulnTimer = Math.max(f.invulnTimer || 0, DUO.invulnFrames); burst(s, 'smokeFade', ctrX(f), (f.y || 0) + (f.h || 94), 22, { form: a.nj.from }) }
  if (t >= DUO.outEnd && t < DUO.inStart) NINJA_API.setPose(f, 'nsVanishGone')
  if (t === DUO.flipAt && d.form !== a.nj.to) {
    applyForm(f, a.nj.to); d.form = a.nj.to
    burst(s, 'smoke', ctrX(f), (f.y || 0) + (f.h || 94), 18, { big: true, form: a.nj.to })
    cue(f, 'smokePop')
  }
  if (t >= DUO.inStart) NINJA_API.setPose(f, 'nsStreakStrike')
  if (t === DUO.strike.at && opp && !a._strike) {
    a._strike = true
    const S = DUO.strike, fw = f.w || 48, dir = f.facing || 1, feet = (f.y || 0) + (f.h || 94)
    const box = { x: dir > 0 ? f.x + fw - 10 : f.x - S.w + 10, y: feet - (f.h || 94), w: S.w, h: f.h || 94 }
    s.lastBox = box
    if (overlaps(box, { x: opp.x, y: opp.y, w: opp.w || 48, h: opp.h || 94 })) {
      const r = nsStrike(f, opp, S.dmg, { damageType: 'blunt', move: 'nsSwapIn', hitstun: S.hitstun, kb: S.kb, cue: 'impact' })
      if (r === true) { d.strikes++; d.tag = { ...(d.tag || {}), [a.nj.from]: DUO.tag.frames } }   // the OTHER (outgoing) form's next special: +10% within 3 s
      a._contact = !!r
    }
  }
  if (t >= DUO.swapFrames - 1) { d.swap = null; d.cd = ben().lockout }
}

// TAG BONUS: the tagged form's next ninja-scripted special (its damage goes through revMul)
function onStart(f, a, md) {
  const d = f._duo; if (!d?.tag?.[d.form] || !md?.isSpecial) return
  a.nj.tag = DUO.tag.mul; delete d.tag[d.form]; if (!Object.keys(d.tag).length) d.tag = null; d.tagHits++
}

// ── COMMAND LAYER (ninjaCommand.js, after the stun gates) ───────────────────────────────────────────────────────────
function command(f, s, opp, raw) {
  const d = f._duo; if (!d) return false
  if (d.swap) return 'consumed'
  if ((d.armT > 0 || d.want > 0 || d.ate) && fresh(s, 'charge', 30)) use(s, 'charge')   // the held Charge of a swap gesture never becomes a Charge move (the Mirror's ↓↓ check)
  if (d.ate || d.want > 0 && fresh(s, 'light')) { use(s, 'light'); return 'consumed' }   // the picking J never jabs
  // STORM AND STONE: ↓↘→↓↘→ + Special + Heavy (the full meter, outside the Mirror)
  if (!s.mirror && (f.energy || 0) >= STORM_AND_STONE.bars * BAR && hasMotion(s, '236236', 44)) {
    const sp = fresh(s, 'special'), hv = fresh(s, 'heavy')
    if (sp && hv && Math.abs(s.edgeAt.special - s.edgeAt.heavy) <= 4) {
      const a = f.attacking ? f.currentAttack : null
      if (!a || !a.isUltimate) {
        use(s, 'special', 'heavy')
        if (nsStartMove(f, 'sTag')) { f.energy = Math.max(0, (f.energy || 0) - STORM_AND_STONE.bars * BAR); cue(f, 'ultStart'); d.ults++ }
        return 'consumed'
      }
    }
    if ((sp || hv) && s.tick - Math.max(sp ? s.edgeAt.special : -1e9, hv ? s.edgeAt.heavy : -1e9) < 3) return f.attacking ? 'consumed' : 'grab'   // chord window
  }
  return false
}

// ── STORM AND STONE (kind 'super'): Shane streaks through from the air while Dustin erupts underneath; the tornado and the
//    shockwave meet. Art = only R11 tornado (superTornado), R8 dust ring ('ring' / 'shock'), R24 smoke ('smokeFade'). ──
function stormAndStone(f, opp, s, a, t, X) {
  const U = STORM_AND_STONE
  if (!a._supInit) {
    a._supInit = true
    s.sup = { res: null, hits: 0, dmg: 0, scale: X.comboScale(f), kind: 'sTag', x0: f.x, tx: null, ty: null }
    if (opp) opp.hitstop = Math.max(opp.hitstop || 0, 10)
    X.burst(s, 'smokeFade', X.ctrX(f), X.feetY(f), 24, { form: 'ns_red' }); X.burst(s, 'smokeFade', X.ctrX(f), X.feetY(f), 24, { form: 'ns_yellow' })
    X.cue(f, 'superStart')
  }
  const u = s.sup; if (!opp) return
  const ox = X.ctrX(opp), feet = X.feetY(opp)
  const strike = (dmg, type, o = {}) => {
    if (u.res === 'whiff' || (u.res === 'blocked' && !o.first)) return
    const r = X.nsStrike(f, opp, dmg, { fixedScale: u.scale, locked: u.res === 'hit', hitstun: o.hitstun ?? 60, kb: o.kb ?? 0, launch: o.launch, move: 'sTag', damageType: type, blockstun: 22, cue: o.cue, sparkX: ox })
    if (o.first) u.res = r === true ? 'hit' : r === 'blocked' ? 'blocked' : 'whiff'
    if (r === true) { u.hits++; u.dmg += dmg }
  }
  if (t === 8) { if (Math.abs(ox - X.ctrX(f)) > 1280 * U.reach + (f.w || 48)) u.res = 'whiff' }
  // Shane: the R11 tornado streaking down through the foe from the air (drawn by nsFx from sup.tx / sup.ty)
  if (t >= 12 && t <= 44) { const k = (t - 12) / 32; u.tx = ox + (k < 0.5 ? -1 : 1) * (1 - Math.abs(k - 0.5) * 2) * 30 - 60 + k * 120; u.ty = feet - 260 + k * 230 }
  U.streakAt.forEach((at, i) => { if (t === at) strike(U.streakDmg, 'energy', { first: i === 0, cue: 'tornadoHit', hitstun: 60 }) })
  // Dustin: the ground erupts underneath (R8 rings)
  U.eruptAt.forEach(at => { if (t === at) { X.burst(s, 'shock', ox, feet, 20); strike(U.eruptDmg, 'blunt', { cue: 'eruption', hitstun: 60 }) } })
  if (u.res === 'hit' && t < U.meetAt) { opp.hitstun = Math.max(opp.hitstun || 0, 40); opp.vx = 0; if (opp.vy < 0) opp.vy *= 0.6 }
  if (t === U.meetAt) { u.tx = ox; u.ty = feet - 40; X.burst(s, 'shock', ox, feet, 26); X.burst(s, 'ring', ox, feet, 26); strike(U.meetDmg, 'blunt', { launch: -16, kb: 6, hitstun: 50, cue: 'eruption' }); X.cue(f, 'shake') }
  if (t > U.meetAt + 10) u.tx = null
  if (t === U.total - 14) X.burst(s, 'smokeFade', X.ctrX(f), X.feetY(f), 20, { form: f.rosterKey })
}

// duo-only moves (looked up after the form profile; the profiles stay byte-identical)
const fw = (recovery, kind, extra = {}) => ({ damage: 0, startup: 0, active: 1, recovery, hitstun: 0, blockstun: 0, knockbackX: 0, knockbackY: 0, rangeX: 1, rangeY: 1, frameExact: true, damageType: 'blunt', nj: { kind, noHit: true }, ...extra })
export const DUO_MOVES = {
  nsSwap: fw(DUO.swapFrames - 1, 'duoSwap'),
  sTag: fw(STORM_AND_STONE.total - 1, 'super', { category: 'ultimate', isUltimate: true, bars: STORM_AND_STONE.bars, invuln: STORM_AND_STONE.total + 2 }),
}

// body alpha (render): gone inside the swap smoke and during Storm and Stone (the forms are the tornado + the eruption)
function alpha(f) {
  const d = f._duo; if (!d) return null
  if (d.swap) { const t = d.swap.t; return t >= DUO.outEnd && t < DUO.inStart ? 0 : null }
  const s = f._ninja; if (s?.sup?.kind === 'sTag') { const a = f.currentAttack; const t = a ? elapsed(a) : 0; return t >= 6 && t < STORM_AND_STONE.total - 12 ? 0 : null }
  return null
}

// ── CPU SWAP (ai.js hook): the CPU presses the real Charge + ↓, -, ↓, J so the swap rides the same input path as a player
//    (replay / LAN identical). Prefers Shane vs an airborne / zoning foe, Dustin up close. Visible state only. ──
const CPU_SEQ = 8
export function duoAiInput(controller, f, opp, input) {
  const d = f?._duo; if (!d || d.id !== DUO_ID || !input || controller?.difficulty === 'dummy') return input
  const c = d.cpu || (d.cpu = { seq: 0, last: -1e9 })
  if (c.seq > 0) {
    const step = CPU_SEQ - c.seq; c.seq--   // Charge held throughout: ↓ ↓ · · ↓ ↓ J J, every step held 2 frames (inside Ben's 16 / 18-frame windows)
    for (const k of Object.keys(input)) input[k] = false
    input.toggle = true   // the AI's Charge key (game.js applyAIInput: toggle → controls.charge; it has no 'charge' / 'light' keys)
    if (step < 2 || step === 4 || step === 5) input.down = true
    if (step >= 6) input.lightAttack = true
    return input
  }
  if (!opp || d.swap || d.cd > 0 || !grounded(f) || f.attacking || (f.hitstun || 0) > 0 || d.t - c.last < DUO.cpu.dwell) return input
  if ((f._ninja?.np || 0) < ben().cost + 10) return input
  const dist = Math.abs(ctrX(opp) - ctrX(f)), oppAir = !grounded(opp)
  const zoning = dist > 1280 * DUO.cpu.far || !!(opp.attacking && opp.currentAttack?.isProjectile)
  const want = (oppAir || zoning) ? 'ns_red' : dist < DUO.cpu.near ? 'ns_yellow' : null
  if (want && want !== d.form) { c.seq = CPU_SEQ; c.last = d.t; d.cpuSwaps = (d.cpuSwaps || 0) + 1; for (const k of Object.keys(input)) input[k] = false; if (f._ninja) use(f._ninja, 'light', 'heavy', 'special', 'ultimate', 'upAttack') }   // the swap frame starts nothing else, and the buffered presses are spent (a special would lock the swap out)
  return input
}

// render helpers (nsFx): a form's own strip for smoke that outlives the flip
export const duoFormAnim = (form, key) => (FORM_CHAR[form] || EXT_FORMS[form])?.animationData?.[key] || null
export const duoFormProfile = form => getNinjaProfile(form)
export const duoOther = form => EXT_PARTNER[form] ? EXT_PARTNER[form](form) : other(form)
export function duoPreloadKeys(cfg) { const out = []; for (const k of [cfg?.p1CharKey, cfg?.p2CharKey]) { if (k === DUO_ID) out.push(...DUO_FORMS); else if (EXT_PRELOAD[k]) out.push(...EXT_PRELOAD[k]) } return out }
export const duoFormsOf = f => (f?._duo?.forms || DUO_FORMS)

registerDuo({
  id: DUO_ID, roundReset, ensure, input, tick, command, onStart, alpha,
  moves: DUO_MOVES, supers: { sTag: stormAndStone },
  run: (f, opp, s, a, t) => { if (a.nj.kind === 'duoSwap') runSwap(f, opp, s, a, t) },
  traps: f => (f?._duo ? getNinjaProfile('ns_yellow')?.traps : null),   // Dustin's traps keep ticking after a swap (cross-form bait)
})
