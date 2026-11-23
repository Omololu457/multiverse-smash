// dinothunder.js — MSV1-DINO: "Dino Thunder Rangers" (dinothunder), ONE character with FOUR swappable forms, built the way
// the MS_V1 Ranger Version (windrangers, nsDuo.js) and the Ninja Storm Trio (nsTrio.js) are built: ninja.js form profiles
// (dinoData.js) behind one visible roster entry; the live rosterKey is the ACTIVE form, so every form path runs as-is.
//   dt_red Conner (Tyranno) · dt_blue Ethan (Tricera) · dt_yellow Kira (Ptera) · dt_white Trent (Drago)
// SWAP (the brief's input; Ben 10's real swap is ↓↓ then ONE button — docs/msv1/dino/AUDIT.md): HOLD P (Charge) then
//   J / K / L / O (Light / Heavy / Special / Grab) = Red / Blue / Yellow / White directly; DOUBLE-TAP P = the next Ranger
//   (Red → Blue → Yellow → White → Red). While P is held J / K / L / O never attack. P2 = hold 7 + 1 / 2 / 4 / 6, double-tap 7;
//   pad = hold L2 + □ / △ / R1 / L1, double-tap L2. It reads the raw input frame (InputFrame / replay / LAN carry it).
// GAME_STATE: f._duo (rides in ninjaSnapshot → replay / LAN checkpoint). No Math.random. Render-only state lives in dinoFx.js.
// docs/msv1/dino/DINO_FRAMEWORK.md documents every field so a Black Dino Ranger is one more profile + one FORMS entry.
import { DINO_FORMS, DINO_FORM_CHAR, DINO_GEM, DINO_SPEED_MUL, dt_red } from './dinoData.js'
import { registerDuo, getNinjaProfile, nsStartMove, endMove, endMirror, burst, cue, spendNP, gainNP, nsStrike, fresh, use, ctrX, overlaps, NINJA_API } from './ninja.js'
import { registerDuoForms } from './nsDuo.js'
import { DINO_ID } from './dinoState.js'
import { DINO_SUPERS, ZREX, zrexBlaster } from './dinoSupers.js'

export { DINO_ID }
export { dt_red, dt_blue, dt_yellow, dt_white } from './dinoData.js'
export const DINO_KEYS = { light: 'dt_red', heavy: 'dt_blue', special: 'dt_yellow', grab: 'dt_white' }   // J / K / L / O
const next = form => DINO_FORMS[(DINO_FORMS.indexOf(form) + 1) % DINO_FORMS.length]
export const dinoStartForm = skinId => { const m = /^start_(red|blue|yellow|white)$/.exec(skinId || ''); return m ? 'dt_' + m[1] : (typeof skinId === 'string' && skinId.startsWith('dtk_') ? dinoSkinStart(skinId) : 'dt_red') }
const dinoSkinStart = () => 'dt_red'

// ── tuning ───────────────────────────────────────────────────────────────────────────────────────────────────────
export const DINO = {
  health: 1248,                                    // S.P.D. Red 1200 × 1.04
  swap: { cost: 15, cooldown: 90, dbl: 16, arm: 18, frames: 14, outEnd: 4, flipAt: 7, inStart: 10, invulnAt: 4, invulnFrames: 6 },   // dbl / arm = Ben's 16 / 18 windows
  strike: { at: 10, dmg: 30, hitstun: 14, kb: 2, w: 84 },
  tag: { mul: 1.10, frames: 180 },                 // a connected swap-in strike: the next special within 3 s +10 %
  sdm: { frames: 480, cost: 50, regen: 6 },        // SUPER DINO MODE: 8 s, +20 % dmg (dinoState), heavy armor, gem regen ×2
  speed: { frames: 180, mul: 1.6, recovery: 0.25 },// SUPER SPEED (Red)
  skin: { frames: 120 },                           // TRICERA SKIN (Blue)
  camo: { frames: 150, alpha: 0.07 },              // CAMOUFLAGE (Trent)
  corruption: { perPower: 20, perDamage: 10, decay: 5, evilFrames: 360, evilSpeed: 1.10, drainPct: 0.02 },
  encore: { window: 180 },
  cpu: { dwell: 160, near: 160, far: 0.40 },
}
const BAR = 50

// ── roster entry ─────────────────────────────────────────────────────────────────────────────────────────────────
export const dinothunder = {
  ...dt_red,
  rosterKey: DINO_ID, hidden: false,
  name: 'Dino Thunder Rangers', displayName: 'Dino Thunder Rangers', subtitle: 'Conner · Ethan · Kira · Trent', hudName: 'Dino Thunder', color: '#e0201c', accent2: '#1e5bff',
  universe: 'power_rangers', subUniverse: 'Dino Thunder',
  portrait: './assets/dinothunder/portrait_large.png', hudIcon: './assets/dinothunder/portrait_small.png', selectIcon: './assets/dinothunder/emblem.png',
  difficulty: 5, archetype: 'Team / Form Swapper', tagline: 'Dino Thunder, Power Up!',
  bio: 'Conner (Red, Tyranno Gem), Ethan (Blue, Tricera Gem), Kira (Yellow, Ptera Gem) and Trent (White, Drago Gem) fight as one: hold P and press J / K / L / O to call a Ranger in, or double-tap P for the next one.',
  primary: 'rushdown', secondary: ['zoner', 'setplay'], archetypes: ['rushdown', 'setplay'],
  stats: { ...dt_red.stats, maxHealth: DINO.health },
  ultimate: { name: 'Z-Rex Blaster', cost: 100 },
  isDuo: true, duoForms: DINO_FORMS,
}

// ── form application (presentation + movement of the active form; health / meter / gem / position / velocity stay) ─
const FORM_FIELDS = ['name', 'hudName', 'color', 'portrait', 'hudIcon', 'spriteSheet', 'spriteScale', 'animationData', 'basic_attacks', 'traits', 'grabCastPose', 'primary', 'secondary', 'archetypes', 'movement']
let _skinHook = null
export function registerDinoSkinHook(fn) { _skinHook = fn }   // dinoSkins.js (cosmetic only: the team theme's strips)
function applyForm(f, form) {
  const c = DINO_FORM_CHAR[form]
  f.rosterKey = form
  for (const k of FORM_FIELDS) if (c[k] !== undefined) f[k] = c[k]
  _skinHook?.(f, form)
  const st = c.stats
  f.stats = { ...st, maxHealth: f.maxHealth }
  f.baseSpeed = f.speed = st.speed; f.dashSpeed = st.dashSpeed; f.dashDuration = st.dashDuration; f.dashCooldownMax = st.dashCooldownMax
  f.maxJumps = st.maxJumps; f.jumpForce = -(st.jumpPower || 32); f.weight = st.weight; f._nsBaseSpeed = null
}
function roundReset(f) {
  if (!f || (f.rosterKey !== DINO_ID && f._duo?.id !== DINO_ID)) return
  const start = dinoStartForm(f.skinId)
  f._duo = { id: DINO_ID, forms: DINO_FORMS, form: start, start, cd: 0, swaps: 0, t: 0, held: false, prev: {}, pAt: null, pClean: false, want: 0, wantTo: null, ate: false,
    swap: null, tagAny: 0, strikes: 0, tagHits: 0, ults: 0, cpu: null, hudLabel: 'HOLD P + J K L O',
    sdm: 0, sdms: 0, speed: 0, speeds: 0, skin: 0, skins: 0, camo: 0, camos: 0, clones: 0, mirrorN: 0,
    corr: 0, corrAcc: 0, evil: 0, evils: 0, evilDrain: 0, hs: 0, encore: { at: -1e9, used: false, hits: 0 }, lastHp: f.health, lastRefuse: null, sdmEndedBy: null }
  f._duoFromKey = DINO_ID
  applyForm(f, start)
}
function ensure(f) { if (f && f.rosterKey === DINO_ID && !f._duo) { roundReset(f); return true } return false }

const W = () => NINJA_API.world()
const grounded = f => !!(f.onGround || f.grounded)
const elapsed = a => a.total - a.timer

// ── INPUT (every sim frame, before the hitstop return): hold P + J/K/L/O picks; double-tap P cycles ─────────────────
function input(f, raw) {
  const d = f._duo; if (!d) return
  d.t++
  const S = DINO.swap, P = !!raw.charge, pr = d.prev
  const edge = k => !!raw[k] && !pr[k]
  d.ate = false
  if (P && !pr.charge) {
    if (d.pAt != null && d.t - d.pAt <= S.dbl && d.pClean) { d.want = S.arm; d.wantTo = next(d.form); d.pAt = null; d.ate = true }   // DOUBLE-TAP P: the next Ranger
    else { d.pAt = d.t; d.pClean = true }
  }
  if (P) for (const [btn, form] of Object.entries(DINO_KEYS)) if (edge(btn)) { d.want = S.arm; d.wantTo = form; d.pClean = false; d.pAt = null; d.ate = true }
  if (P && (raw.left || raw.right || raw.down || raw.up)) d.pClean = false   // ↓↓ + P (Drago Clone) / →+P are never half a double-tap
  d.held = P
  for (const k of ['charge', 'light', 'heavy', 'special', 'grab']) pr[k] = !!raw[k]
}
// may the swap start right now? (reason string when refused — tests read it)
function refuse(f, s, d) {
  if (!(f.health > 0)) return 'ko'
  if (d.wantTo === d.form) return 'same'
  if (d.evil > 0) return 'evil'                     // EVIL WHITE RANGER cannot be swapped out
  if ((f.hitstun || 0) > 0) return 'hitstun'
  if ((f.blockstun || 0) > 0) return 'blockstun'
  if (f.knockdownState || f.isGrabbed) return 'down'
  if (s.sup) return 'super'
  const a = f.attacking ? f.currentAttack : null
  if (a?.isUltimate) return 'super'
  if (d.swap) return 'swapping'
  if (d.cd > 0) return 'cooldown'
  if (s.streak || s.mirror?.swap) return 'busy'
  if (a && a.name !== 'nsStreakRec') {
    const md = getNinjaProfile(f)?.moves[a.name] || {}
    if (md.isSpecial || !(elapsed(a) > (a.activeEnd ?? 0))) return 'attacking'   // normals: recovery frames only
  }
  if ((s.np || 0) < DINO.swap.cost) return 'gem'
  return null
}

// ── TICK (after the framework steps, before the move scripts) ──────────────────────────────────────────────────────
function tick(f, opp, s) {
  const d = f._duo; if (!d) return
  const C = DINO.corruption
  if (d.cd > 0 && !d.swap) d.cd--
  if (d.tagAny > 0) d.tagAny--
  // damage taken this frame (for Corruption + Camouflage break)
  const lost = Math.max(0, (d.lastHp ?? f.health) - f.health); d.lastHp = f.health
  // SUPER DINO MODE: gem regen ×2 (the framework already regens 6/s)
  if (d.sdm > 0) { d.sdm--; d.sdmAcc = (d.sdmAcc || 0) + DINO.sdm.regen / 60; if (d.sdmAcc >= 1) { gainNP(f, 1); d.sdmAcc -= 1 } }
  // SUPER SPEED (Red) / EVIL WHITE RANGER: the walk speed multiplier (stat re-applied each frame from the form's base)
  const base = DINO_FORM_CHAR[d.form].stats.speed
  if (d.speed > 0) d.speed--
  if (d.skin > 0) { d.skin--; if ((f.hitstun || 0) > 0 && !f.isGrabbed) { f.hitstun = 0; f.vx = 0; d.skinHits = (d.skinHits || 0) + 1 } }   // TRICERA SKIN: no hitstun
  if (d.camo > 0) { d.camo--; if (lost > 0) { d.camo = 0; d.camoBroke = (d.camoBroke || 0) + 1 } }
  const walkMul = d.speed > 0 ? DINO.speed.mul : (d.evil > 0 ? C.evilSpeed : 1)
  if (!s.streak && grounded(f)) { const want = 78 + ((4.5 + (base - 78) / 20 * 5) * walkMul - 4.5) * 4; if (Math.abs(f.speed - want) > 1e-6) { f.speed = f.baseSpeed = want; f._nsBaseSpeed = null } }
  // DRAGO CLONE started (the framework's mirror on Trent's profile): +20 Corruption
  if (s.mirror && s.mirror.n !== d.mirrorN) { d.mirrorN = s.mirror.n; d.clones++; addCorr(f, d, C.perPower) }
  // CORRUPTION: +1 per 10 damage Trent takes; decays 5/s while Trent is out
  if (d.form === 'dt_white' && d.evil <= 0) { d.corrAcc += lost; while (d.corrAcc >= C.perDamage) { d.corrAcc -= C.perDamage; addCorr(f, d, 1) } }
  else if (d.form !== 'dt_white' && d.corr > 0) d.corr = Math.max(0, d.corr - C.decay / 60)
  if (d.evil > 0) {   // EVIL WHITE RANGER: 6 s, +25 % dmg (dinoState) / +10 % speed / no swap / −2 % max HP per second
    d.evil--; d.evilDrain += (f.maxHealth || DINO.health) * C.drainPct / 60
    if (d.evilDrain >= 1) { const n = Math.floor(d.evilDrain); d.evilDrain -= n; f.health = Math.max(1, f.health - n); d.lastHp = f.health }
    if (d.evil === 0) { d.corr = 0; d.corrAcc = 0; burst(s, 'dtRing', ctrX(f), (f.y || 0) + (f.h || 94), 20, { col: DINO_GEM.dt_white }); cue(f, 'swapChime') }   // he breaks free
  }
  // HIGH SCORE: consecutive hits in the current combo (the engine combo counter; it carries through tag swaps)
  d.hs = Math.max(0, (f.comboCounter || 0))
  if (!(f.comboCounter > 0)) d.encore.used = false
  // SHIELD RAM wall bounce (the framework's _nsWallBounce on the foe)
  const a = f.attacking ? f.currentAttack : null
  if (a?.name === 'sRam' && a._contact && !a._wb && opp) { a._wb = true; opp._nsWallBounce = 24 }
  if (a?.nj?.step && elapsed(a) < (a.nj.step) && elapsed(a) >= 1) { f.x = NINJA_API.clampX(f, f.x + (f.facing || 1) * 4) }   // the ram's lunge
  // the swap request
  if (d.want > 0) {
    const why = refuse(f, s, d)
    if (!why) { d.want = 0; startSwap(f, opp, s, d) }
    else if (why === 'same') { d.want = 0; d.lastRefuse = why }
    else { d.want--; d.lastRefuse = why }
  }
}
function addCorr(f, d, n) {
  if (d.evil > 0) return
  d.corr = Math.min(100, d.corr + n)
  if (d.corr >= 100 && d.form === 'dt_white') { d.evil = DINO.corruption.evilFrames; d.evils++; d.evilDrain = 0; cue(f, 'evil'); f._nsBubble = { text: 'The Drago Gem... it\'s taking over!', t: 120, max: 120 } }
}

function startSwap(f, opp, s, d) {
  const from = d.form, to = d.wantTo, vx = f.vx || 0, vy = f.vy || 0
  if (!spendNP(f, DINO.swap.cost)) return
  // what a swap ends: Super Speed, Tricera Skin, Camouflage, the Drago Clone (shatters into afterimages)
  d.speed = 0; d.skin = 0; d.camo = 0
  if (s.mirror) { burst(s, 'dtShatter', s.mirror.ix + (f.w || 48) / 2, s.mirror.ifeet, 18); endMirror(f, s, 'swap') }
  if (to === 'dt_white' && d.sdm > 0) { d.sdm = 0; d.sdmEndedBy = 'trent' }   // Trent never had Super Dino Mode
  s.float.on = false
  if (f.attacking) endMove(f)
  if (!nsStartMove(f, 'dtSwap')) return
  f.vx = vx; f.vy = vy   // momentum carries (air swaps keep it)
  Object.assign(f.currentAttack.nj, { from, to, vx })
  d.swap = { t: 0, from, to, inv: 0 }
  d.swaps++
  NINJA_API.setPose(f, 'dtOut')
  burst(s, 'dtRing', ctrX(f), (f.y || 0) + (f.h || 94), 16, { col: DINO_GEM[from], big: true })
  cue(f, 'swapChime')
}
function runSwap(f, opp, s, a, t) {
  const d = f._duo, S = DINO.swap; if (!d?.swap) return
  d.swap.t = t
  if (!grounded(f)) f.vx = a.nj.vx
  if (t < S.outEnd) NINJA_API.setPose(f, 'dtOut')
  if (t === S.invulnAt) { f.invulnTimer = Math.max(f.invulnTimer || 0, S.invulnFrames); burst(s, 'dtRing', ctrX(f), (f.y || 0) + (f.h || 94), 14, { col: DINO_GEM[a.nj.from], ring: 2 }) }
  if (t >= S.outEnd && t < S.inStart) NINJA_API.setPose(f, 'idle')
  if (t === S.flipAt && d.form !== a.nj.to) {
    applyForm(f, a.nj.to); d.form = a.nj.to
    burst(s, 'dtSparkle', ctrX(f), (f.y || 0) + (f.h || 94), 14, { col: DINO_GEM[a.nj.to] })
  }
  if (t >= S.inStart) NINJA_API.setPose(f, 'nsStreakStrike')
  if (t === DINO.strike.at && opp && !a._strike) {
    a._strike = true
    const K = DINO.strike, fw = f.w || 48, dir = f.facing || 1, feet = (f.y || 0) + (f.h || 94)
    const box = { x: dir > 0 ? f.x + fw - 10 : f.x - K.w + 10, y: feet - (f.h || 94), w: K.w, h: f.h || 94 }
    s.lastBox = box
    if (overlaps(box, { x: opp.x, y: opp.y, w: opp.w || 48, h: opp.h || 94 })) {
      const r = nsStrike(f, opp, K.dmg, { damageType: 'blunt', move: 'dtSwapIn', hitstun: K.hitstun, kb: K.kb, cue: 'impact' })
      if (r === true) { d.strikes++; d.tagAny = DINO.tag.frames }   // TAG BONUS: the next special within 3 s +10 %
      a._contact = !!r
    }
  }
  if ((f.invulnTimer || 0) > 0) d.swap.inv++
  if (t >= S.frames - 1) { d.lastSwap = { from: a.nj.from, to: a.nj.to, frames: t + 1, cost: DINO.swap.cost, inv: d.swap.inv, strike: !!a._contact }; d.swap = null; d.cd = S.cooldown }
}
// every ninja move start (normals + specials): tag bonus, Camouflage's first attack, Super Speed recoveries −25 %
function onStart(f, a, md) {
  const d = f._duo; if (!d) return
  if (md?.isSpecial && d.tagAny > 0) { a.nj.tag = (a.nj.tag || 1) * DINO.tag.mul; d.tagAny = 0; d.tagHits++ }
  if (d.camo > 0 && md && (md.damage > 0 || md.isSpecial) && a.name !== 'sCamo') { a._dtCamo = true; d.camo = 0 }
  if (d.speed > 0 && md && !md.isUltimate && a.name !== 'dtSwap' && a.name !== 'sSpeed') {
    const rec = Math.max(0, (a.total || 0) - (a.activeEnd ?? 0)), cut = Math.floor(rec * DINO.speed.recovery)
    if (cut > 0) { a.total -= cut; a.timer = Math.max(1, a.timer - cut) }
  }
}

// ── COMMAND LAYER (ninjaCommand.js, after the stun gates) ───────────────────────────────────────────────────────────
const downDown = (f, win = 16) => { const r = f._ranger; return !!(r && r.pendingAt != null && r.pending?.vdir === 1 && r.tick - r.pendingAt <= win) }
function command(f, s, opp, raw) {
  const d = f._duo; if (!d) return false
  if (d.swap) return 'consumed'
  const picks = ['light', 'heavy', 'special', 'grab']
  if (d.ate || d.held && picks.some(k => fresh(s, k))) { use(s, ...picks); return 'consumed' }   // J / K / L / O under a held P never attack
  const a = f.attacking ? f.currentAttack : null
  // Z-REX BLASTER (team ultimate): the standard Ultimate button on the FULL meter
  if (fresh(s, 'ultimate') && (f.energy || 0) >= ZREX.bars * BAR && !(a?.isUltimate) && !s.mirror) {
    use(s, 'ultimate')
    if (nsStartMove(f, 'sZrex')) { f.energy = Math.max(0, (f.energy || 0) - ZREX.bars * BAR); cue(f, 'ultStart'); d.ults++ }
    return 'consumed'
  }
  // SUPER DINO MODE ↓↓ + Special + Heavy (Red / Blue / Yellow), 1 bar
  if (d.form !== 'dt_white' && downDown(f)) {
    const sp = fresh(s, 'special'), hv = fresh(s, 'heavy')
    if (sp && hv && Math.abs(s.edgeAt.special - s.edgeAt.heavy) <= 4) {
      use(s, 'special', 'heavy')
      if (!d.sdm && (f.energy || 0) >= DINO.sdm.cost && (!a || a.name === 'nsStreakRec') && nsStartMove(f, 'dtSdm')) { f.energy -= DINO.sdm.cost; cue(f, 'superStart') }
      return 'consumed'
    }
    if ((sp || hv) && s.tick - Math.max(sp ? s.edgeAt.special : -1e9, hv ? s.edgeAt.heavy : -1e9) < 3) return a ? 'consumed' : 'grab'   // the chord's window
  }
  return false
}

// ── DUO MOVE KINDS ───────────────────────────────────────────────────────────────────────────────────────────────
function run(f, opp, s, a, t) {
  const d = f._duo, g = a.nj, md = getNinjaProfile(f)?.moves[a.name] || DINO_MOVES[a.name] || {}
  const feet = (f.y || 0) + (f.h || 94)
  switch (g.kind) {
    case 'dtSwap': return runSwap(f, opp, s, a, t)
    case 'dtSdm':
      if (t === 10 && !a._on) { a._on = true; d.sdm = DINO.sdm.frames; d.sdms++; burst(s, 'dtRing', ctrX(f), feet, 22, { col: DINO_GEM[d.form], big: true }); cue(f, 'shake') }
      return
    case 'dtSpeed':
      if (t === (md.startup ?? 10) && !a._on) { a._on = true; d.speed = DINO.speed.frames; d.speeds++; burst(s, 'dtSparkle', ctrX(f), feet, 16, { col: DINO_GEM.dt_red }); cue(f, 'swapChime') }
      return
    case 'dtSkin':
      if (t === (md.startup ?? 8) && !a._on) { a._on = true; d.skin = DINO.skin.frames; d.skins++; burst(s, 'dtRing', ctrX(f), feet, 18, { col: DINO_GEM.dt_blue }); cue(f, 'clang') }
      return
    case 'dtCamo':
      if (t === (md.startup ?? 8) && !a._on) { a._on = true; d.camo = DINO.camo.frames; d.camos++; addCorr(f, d, DINO.corruption.perPower); burst(s, 'dtShatter', ctrX(f), feet, 14); cue(f, 'camo') }
      return
    case 'dtPenalty': return runPenalty(f, opp, s, a, t, md, d)
    case 'dtScream': return runScream(f, opp, s, a, t, md, d)
  }
}
// PENALTY STRIKE: the body travels 40 % of the screen; one 70 hit on contact; in Super Speed it goes THROUGH (cross-up)
function runPenalty(f, opp, s, a, t, md, d) {
  const g = a.nj, st = md.startup ?? 8
  if (t === st) { a._spd = d.speed > 0; a._x0 = f.x }
  if (t >= st && t < st + g.frames && !a._stop) {
    const per = NINJA_API.RANGER_SCREEN * g.dist / g.frames
    f.x = NINJA_API.clampX(f, f.x + g.dir * per); f.vx = 0; if (!grounded(f)) f.vy = 0
    if (opp && !a._hit && overlaps({ x: f.x - 10, y: f.y, w: (f.w || 48) + 20, h: f.h || 94 }, { x: opp.x, y: opp.y, w: opp.w || 48, h: opp.h || 94 })) {
      a._hit = true
      const r = nsStrike(f, opp, g.dmg, { damageType: 'blunt', move: 'sPenalty', hitstun: 26, kb: a._spd ? -3 : 6, revMul: (a.nj.tag || 1), cue: 'impact' })
      a._contact = !!r
      if (!a._spd) a._stop = true
    }
    if ((t - st) % 3 === 0) burst(s, 'dtStreak', ctrX(f), (f.y || 0) + (f.h || 94), 10, { dir: g.dir, col: DINO_GEM.dt_red })
  }
  if (t === st + g.frames && a._spd && a._hit && opp) {   // cross-up: he ends on the far side
    const ow = opp.w || 48, fw = f.w || 48, x = g.dir > 0 ? opp.x + ow + 6 : opp.x - fw - 6
    if (NINJA_API.clampX(f, x) === x) { f.x = x; f.facing = -g.dir; a._crossed = true }
  }
}
// PTERA SCREAM: an expanding cone in front (air: angled down 30°); destroys non-super projectiles; one 50 hit + stun
function runScream(f, opp, s, a, t, md, d) {
  const g = a.nj, st = md.startup ?? 12, act = md.active ?? 14
  if (t < st || t >= st + act) return
  const k = (t - st + 1) / act, dir = g.dir, ang = (g.angle || 0) * Math.PI / 180
  const x0 = ctrX(f) + dir * 20, y0 = (f.y || 0) + (f.h || 94) * 0.35
  const len = g.len * Math.min(1, k * 1.6), half = (g.w0 + (g.w1 - g.w0) * k) / 2
  const cx = x0 + dir * len * Math.cos(ang) / 2, cy = y0 + len * Math.sin(ang) / 2
  const box = { x: Math.min(x0, x0 + dir * len * Math.cos(ang)), y: cy - half, w: Math.max(30, len * Math.cos(ang)), h: half * 2 + len * Math.sin(ang) }
  s.lastBox = box
  if ((t - st) % 3 === 0) burst(s, 'dtScream', x0, y0, 14, { dir, ang: g.angle || 0, len: g.len })
  // DESTROYS non-super projectiles inside the cone
  const pl = W()?.projectileList?.() || []
  for (const pr of [...pl]) {
    if (!pr || pr.owner === f || pr.visualOnly || pr.isUltimate) continue
    const r = pr.radius || (pr.w || 20) / 2
    if (overlaps({ x: pr.x - r, y: pr.y - r, w: r * 2, h: r * 2 }, box)) { W()?.removeProjectile?.(pr); d.screamKills = (d.screamKills || 0) + 1; burst(s, 'dtRing', pr.x, pr.y + 20, 10, { col: DINO_GEM.dt_yellow, small: true }) }
  }
  if (!a._hit && opp && t >= st + 2 && overlaps(box, { x: opp.x, y: opp.y, w: opp.w || 48, h: opp.h || 94 })) {
    a._hit = true
    const E = DINO.encore, encore = !d.encore.used && d.t - d.encore.at <= E.window
    const stun = encore ? g.encore : g.stun
    const r = nsStrike(f, opp, g.dmg, { damageType: 'energy', move: a.name, hitstun: stun, kb: 9, revMul: (a.nj.tag || 1), cue: 'scream' })
    if (r === true) {
      if (encore) { d.encore.used = true; d.encore.hits++; a._encore = true } else d.encore.at = d.t
      opp.vx = dir * 9
    }
    a._contact = !!r
  }
}

// evasion / armor at the overlap test (ninja.js ninjaEvades → here first for the Dino Thunder fighter)
function evades(def, ctx, p, s) {
  const d = def._duo; if (!d) return null
  const a = def.attacking ? def.currentAttack : null
  if (ctx.proj) {   // SHIELD RAM: the shield absorbs ONE projectile on frames 1–10
    const ab = a?.nj?.absorb
    if (ab && !a._absorbed) { const t = elapsed(a) + 1; if (t >= ab[0] && t <= ab[1]) { a._absorbed = true; d.absorbed = (d.absorbed || 0) + 1; W()?.removeProjectile?.(ctx.proj); burst(s, 'dtRing', ctrX(def), (def.y || 0) + (def.h || 94) * 0.6, 10, { col: DINO_GEM.dt_blue, small: true }); cue(def, 'clang'); return true } }
    return null
  }
  const atk = ctx.move, by = ctx.attacker
  if (!atk || !by) return null
  const armor = why => {   // the hit lands (damage) but causes no hitstun
    atk.hasHit = true
    W()?.damage?.(def, atk.damage || 40, { source: 'ability', attacker: by, move: atk.name || 'armored', damageType: atk.damageType || 'blunt' })
    def.hitFlash = Math.max(def.hitFlash || 0, 6); d.armored = (d.armored || 0) + 1; d.lastArmor = why
    burst(s, 'block', ctrX(def), (def.y || 0) + (def.h || 94) * 0.45); cue(def, 'clang'); return true
  }
  // BLUE DINO DASH: 1-hit armor on its frames 1–4
  if (d.form === 'dt_blue' && s.streak && !s.streak.armorUsed && s.streak.t + 1 >= 1 && s.streak.t + 1 <= 4) { s.streak.armorUsed = true; return armor('dash') }
  // SUPER DINO MODE: heavy attacks get 1-hit armor
  if (d.sdm > 0 && a && !a._armorUsed && HEAVY.has(a.name)) { a._armorUsed = true; return armor('sdm') }
  return null
}
const HEAVY = new Set(['staffThrust', 'staffArc', 'sSlam', 'straight', 'crescent', 'string3', 'sRam', 'sQuake', 'upper', 'upCrescent'])
// Red's Dino Dash chains only during Super Speed
function streakGate(f, s, n) { const d = f._duo; return !(d && d.form === 'dt_red' && n > 1 && !(d.speed > 0)) }

// duo-only moves (looked up after the form profile)
const fwm = (recovery, kind, extra = {}) => ({ damage: 0, startup: 0, active: 1, recovery, hitstun: 0, blockstun: 0, knockbackX: 0, knockbackY: 0, rangeX: 1, rangeY: 1, frameExact: true, damageType: 'blunt', nj: { kind, noHit: true }, ...extra })
export const DINO_MOVES = {
  dtSwap: fwm(DINO.swap.frames - 1, 'dtSwap'),
  dtSdm: fwm(20, 'dtSdm', { invuln: 12 }),
  sZrex: fwm(ZREX.total - 1, 'super', { category: 'ultimate', isUltimate: true, bars: ZREX.bars, invuln: ZREX.total + 2, damageType: 'energy' }),
}
// body alpha (render): gone inside the swap rings; nearly invisible in Camouflage; hidden while a super's partners act
function alpha(f) {
  const d = f._duo; if (!d) return null
  if (d.swap) { const t = d.swap.t; return t >= DINO.swap.outEnd && t < DINO.swap.inStart ? 0 : null }
  if (d.camo > 0) return DINO.camo.alpha
  const s = f._ninja, a = f.currentAttack
  if (s?.sup?.hide && a) { const t = elapsed(a); if (t >= s.sup.hide[0] && t < s.sup.hide[1]) return 0 }
  return null
}

// ── CPU SWAP (ai.js): holds the real Charge and taps J / K / L / O (or double-taps P) — the same input a player uses, so it
//    rides replay / LAN identically. Reads VISIBLE state only: Blue vs rushdown up close, Yellow vs zoners / fliers,
//    Red to chase, Trent to mix up. ──
export function dinoAiInput(controller, f, opp, input) {
  const d = f?._duo; if (!d || d.id !== DINO_ID || !input || controller?.difficulty === 'dummy') return input
  const c = d.cpu || (d.cpu = { seq: 0, last: -1e9, btn: 'lightAttack', cycle: false, mix: 0 })
  if (c.seq > 0) {
    const step = 6 - c.seq; c.seq--
    for (const k of Object.keys(input)) input[k] = false
    if (c.cycle) { input.toggle = step === 0 || step === 1 || step === 3 || step === 4 }   // P · P (double-tap)
    else { input.toggle = true; if (step >= 3) input[c.btn] = true }                    // hold P … J/K/L/O
    return input
  }
  if (!opp || d.swap || d.cd > 0 || d.evil > 0 || !grounded(f) || f.attacking || (f.hitstun || 0) > 0 || d.t - c.last < DINO.cpu.dwell) return input
  if ((f._ninja?.np || 0) < DINO.swap.cost + 10) return input
  const dist = Math.abs(ctrX(opp) - ctrX(f)), oppAir = !grounded(opp)
  const zoning = !!(opp.attacking && opp.currentAttack?.isProjectile) || dist > 1280 * DINO.cpu.far
  const rushing = dist < DINO.cpu.near && (opp.attacking || Math.sign(opp.vx || 0) === Math.sign(ctrX(f) - ctrX(opp)))
  c.mix = (c.mix + 1) % 4
  const want = oppAir || zoning ? 'dt_yellow' : rushing ? 'dt_blue' : dist > 320 ? 'dt_red' : c.mix === 0 ? 'dt_white' : null
  if (want && want !== d.form) {
    c.cycle = next(d.form) === want
    c.btn = { dt_red: 'lightAttack', dt_blue: 'heavyAttack', dt_yellow: 'special1', dt_white: 'grab' }[want]
    c.seq = 6; c.last = d.t; d.cpuSwaps = (d.cpuSwaps || 0) + 1
    for (const k of Object.keys(input)) input[k] = false
    if (f._ninja) use(f._ninja, 'light', 'heavy', 'special', 'ultimate', 'upAttack', 'grab')
  }
  return input
}

registerDuoForms(DINO_ID, DINO_FORM_CHAR, form => next(form))   // shared render helpers (smoke strips, HUD, preload)
registerDuo({
  id: DINO_ID, roundReset, ensure, input, tick, command, onStart, alpha, evades, streakGate,
  moves: DINO_MOVES, supers: { sZrex: zrexBlaster },
  run,
})
// the per-form supers live on the form profiles (dinoSupers.js registers them)
for (const [k, fn] of Object.entries(DINO_SUPERS)) getNinjaProfile(k).supers.sSuper = fn
