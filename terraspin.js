// terraspin.js — TERRASPIN (Galapagus), a READY Omnitrix alien. One registry entry + one sheet + one ledger.
// Leaf module: imports only its generated art table (no engine imports, no cycles). The engine reaches it only through the
// generic, ben10-gated ready-form hooks (ben10State.benReadyForm / abilities.tickBenAlienForm / fireSpecial / fireUltimate —
// see docs/ben10/ADD_ALIEN.md), which hand it an `api` with the shared primitives.
// All simulation state lives in fighter.omnitrix.formState (plain data, GAME_STATE); render-only effects (wind streaks,
// debris, blades, the ult cyclone, shake) never write it. Simulation randomness: hash(match seed, frame, player index) only.
import { TERRASPIN_ANIM, TERRASPIN_GEOM } from "./terraspinAssets.js"
export { TERRASPIN_ANIM, TERRASPIN_GEOM }

const ANIM = { ...TERRASPIN_ANIM }

// Pre-mod frame data (startup / damage / on-block advantage); blockstun derives the advantage.
const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 18, knockbackX: 3, knockbackY: -2, frameExact: true, ...extra })

export const TERRASPIN = {
  id: "terraspin", poolKey: "terraspin", displayName: "Terraspin", slot: 10,
  status: "ready", sheetPath: "./ben10_terraspin_ready_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/terraspin/SPRITE_LEDGER.md",
  mods: { speed: 0.90, damage: 1.05, defense: 1.20, weight: 1.25 },
  movement: "grounded", maxJumps: 2,            // the shared double jump
  moves: { jab: "Jab", heavy: "Heavy", low: "Low", launcher: "Launcher", air: "Air",
    special1: "Inhale", special2: "Exhale", special3: "Wind Chop", special4: "Shell Spin", special5: "Cyclone Drop",
    ultimate: "Eye of the Storm" },
  basic_attacks: {
    light:  normal(18, 5, 3, 10, 0, { rangeX: 110 }),                                         // short chop, 110 px
    heavy:  normal(56, 14, 4, 22, -6, { knockbackX: 7, rangeX: 180 }),                        // wide wind blade, 180 px
    down:   normal(26, 7, 3, 15, -4, { hitLevel: "low" }),                                    // low arms sweep, hits low
    up:     normal(46, 11, 4, 25, -9, { launcher: true, launchVy: -15, selfVy: 0 }),          // upward gale
    air:    normal(30, 7, 4, 11, 2)                                                           // spin
  },
  anim: ANIM,
  onApply, tick, moveFrames, fireSpecial, fireUltimate, onContact, struck, absorb, damageTaken, blockHeavy, bodyOffset, targetOffset,
  drawHud: drawTerraspinHud, drawFx: drawTerraspinFx, drawUnder: drawTerraspinUnder
}


// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshTerraspinState() {
  return { kind: "terraspin", t: 0, castId: 0, noAttack: false,
    pressure: 0, idle: 0, landCast: -1,
    inhale: null, post: 0, pullLock: 0, exhale: null, push: null,
    shear: { pips: 0, pipT: 0, lastPipCast: -1, dragT: 0, immune: 0, drags: 0 },
    spin: null, chop: null, drop: null, dropUsed: false, heavyCut: false,
    guard: { t: 0, cd: 0, hit: null, counter: null },
    fwdPrev: false, fwdTapT: -999, dashTapT: -999,
    ult: null, lastUltRaw: 0, lastUltAngles: [], lastUltPressure: 0,
    stats: { inhales: 0, pulledF: 0, caught: 0, exhales: 0, lastExhale: null, chops: 0, cuts: 0, spins: 0, chips: 0, deflects: 0,
      drops: 0, guards: 0, counters: 0, ults: 0 } }
}
export const tsState = f => (f?.omnitrix?.formState?.kind === "terraspin" && f.transformed && f.activeAlien === "terraspin") ? f.omnitrix.formState : null

function onApply(f) {
  if (!f.omnitrix) return
  f.omnitrix.formState = freshTerraspinState()
}

const cx = o => o.x + (o.w || 60) / 2
export const pIndex = f => ({ p1: 0, p2: 1, p3: 2, p4: 3 }[f && f.side] ?? 0)
// SIMULATION hash: (match seed, frame, player index, k) → [0, 1)
export function tsHash(seed, frame, player, k = 0) {
  let h = ((seed >>> 0) ^ Math.imul(frame | 0, 374761393) ^ Math.imul(player + 1, 668265263) ^ Math.imul(k + 7, 2246822519)) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; h = (h ^ (h >>> 16)) >>> 0
  return h / 4294967296
}
export const isBeam = p => !!p && !!(p.beam || p.isBeam || p.laser || /beam|laser|kameha|ray\b|_ray|heat_?vision|getsuga|blast_wave/i.test(String(p.name || "")))
const enemyShot = (f, p) => !!p && p.owner !== f && !p.visualOnly && !isBeam(p)
const overlaps = (p, box) => { const pw = p.w || (p.radius || 10) * 2, ph = p.h || (p.radius || 10) * 2
  return p.x - pw / 2 < box.x + box.w && p.x + pw / 2 > box.x && p.y - ph / 2 < box.y + box.h && p.y + ph / 2 > box.y }
let api0 = null   // the last api handed to the tick (absorb / struck get none): projectile list access only

// ── per-frame tick (GAME_STATE only; called once per fighter per frame by abilities.tickBenAlienForm) ─────
function tick(f, input, ctx, api) {
  const s = tsState(f); if (!s) return
  api0 = api
  s.t++
  const opp = api && api.getOpponent ? api.getOpponent(f) : null
  const stage = { L: ctx?.stageLeft ?? -Infinity, R: ctx?.stageWidth ?? Infinity }
  if (f.onGround || f.grounded) s.dropUsed = false                       // Cyclone Drop: once per airtime
  if (s.pullLock > 0) s.pullLock--
  tickDashTap(f, s, input || {})
  tickPressure(s)
  tickShear(f, s, opp)
  tickGuard(f, s, api, opp)
  if (s.post > 0 && --s.post <= 0) s.post = 0
  tickInhale(f, s, api, input || {}, opp, stage)
  tickExhale(f, s, opp, stage)
  tickSpin(f, s, api, opp, stage)
  tickChop(f, s, api, opp, stage)
  tickDrop(f, s, api)
  tickHeavyCut(f, s, api)
  tickUlt(f, s, opp, api, ctx)
  s.noAttack = busy(s)
}
const busy = s => !!(s.inhale || s.post > 0 || s.exhale || s.spin || s.chop || s.drop || s.ult || s.guard.t > 0)
// moveFrames hook (combat.startMove): no normals while a special / the shell / Inhale owns him
function moveFrames(f, key, md) { const s = tsState(f); if (!s) return md; return busy(s) ? false : md }

// ── PRESSURE (his unique system, GAME_STATE) ───────────────────────────────────────────────────────────────
// 0–100, shown under Omnitrix Power. Suction in, blast out: Inhale pulls (+0.5/f per target pulled) and catches projectiles
// (+12 each); any wind special that lands (clean) +5. Exhale / Eye of the Storm spend ALL of it. Decays −1/f after 120f with
// no gain. Swap / revert / KO / rematch clear it (fresh formState). Deterministic — no randomness.
export const TS_PRES = { MAX: 100, PULL: 0.5, CATCH: 12, LAND: 5, IDLE: 120, DECAY: 1 }
export function gainPressure(s, n) { if (!(n > 0)) return; s.pressure = Math.min(TS_PRES.MAX, s.pressure + n); s.idle = 0 }
function tickPressure(s) { if (++s.idle > TS_PRES.IDLE && s.pressure > 0) s.pressure = Math.max(0, s.pressure - TS_PRES.DECAY) }

// ── SHEAR → GALE DRAG (status on the OPPONENT, owned by this form's GAME_STATE) ──────────────────────────────
// Clean hits from Wind Chop (finisher), Exhale and Cyclone Drop add ONE Shear pip per cast, max 3; none from blocks, FX or
// Inhale pulls. Pips expire 240f after the last. 3 pips → GALE DRAG 180f (pips consumed): the opponent's movement AWAY from
// Terraspin is ×0.7 (walk / run / dash / backward-jump momentum) and their air control away from him is halved — through the
// generic `_benDrag` movement status that physics.moveFighter honours (ADD_ALIEN.md). Input polling and the simulation clock
// are untouched. No refresh while active; 360f immunity after. Wind streaks = render only.
export const TS_SHEAR = { MAX: 3, EXPIRE: 240, DRAG: 180, IMMUNE: 360, AWAY: 0.7, AIR: 0.5 }
export function addShear(s, cast) {
  const v = s.shear
  if (cast == null || cast === v.lastPipCast || v.dragT > 0 || v.immune > 0) return false
  v.lastPipCast = cast
  v.pips = Math.min(TS_SHEAR.MAX, v.pips + 1); v.pipT = TS_SHEAR.EXPIRE
  if (v.pips >= TS_SHEAR.MAX) { v.pips = 0; v.pipT = 0; v.dragT = TS_SHEAR.DRAG; v.drags++ }
  return true
}
function tickShear(f, s, opp) {
  const v = s.shear
  if (v.pips > 0 && --v.pipT <= 0) { v.pips = 0; v.pipT = 0 }
  if (v.dragT > 0) {
    if (opp) { const d = opp._benDrag; opp._benDrag = { x: cx(f), ground: TS_SHEAR.AWAY, air: TS_SHEAR.AIR, ttl: 2, pvx: d && d.ttl > 0 ? d.pvx : (opp.vx || 0) } }
    if (--v.dragT <= 0) { v.dragT = 0; v.immune = TS_SHEAR.IMMUNE }
  } else if (v.immune > 0) v.immune--
}
export const galeDrag = s => !!s && s.shear.dragT > 0

// ── SPECIALS (dispatch) ──────────────────────────────────────────────────────────────────────────────────
//   ↓↘→ + P  Inhale (hold; air: Cyclone Drop)   ↓↙← + P  Exhale   →→ + P  Wind Chop   ←↙↓ + P  Shell Spin
// (the direction held the frame Special is pressed — the shared alien motion inputs — plus a frame-counted →→ tap).
// Exhale also fires on releasing Inhale with ←/↙ held, or on pressing P again within 14f of the Inhale release.
export const TS_DASH_WINDOW = 14
export const TS_COST = { inhale: 10, chop: 12, spin: 12, drop: 12, ultimate: 55 }
function pickSpecial(f, s) {
  const dir = (f._specialHeldDir === "N" ? null : f._specialHeldDir) || null
  if (!(f.onGround || f.grounded)) return (dir === null || dir === "F" || dir === "D") ? "drop" : null
  if (dir === "B") return "exhale"
  if (dir === "D") return "spin"
  if (dir === "F" && s.t - (s.dashTapT ?? -999) <= TS_DASH_WINDOW) return "chop"
  return "inhale"
}
function fireSpecial(f, ctx, api) {
  const s = tsState(f); if (!s) return false
  api0 = api
  if (s.post > 0) return castExhale(f, s, api, true)                     // P again after an Inhale release
  const kind = pickSpecial(f, s); if (!kind) return false
  if (kind === "inhale") return castInhale(f, s, api)
  if (kind === "exhale") return castExhale(f, s, api, false)
  if (kind === "chop") return castChop(f, s, api)
  if (kind === "spin") return castSpin(f, s, api)
  if (kind === "drop") return castDrop(f, s, api)
  return false
}
function tickDashTap(f, s, input) {    // →→ : two FORWARD press edges within 14f, neither with Down held
  const face = f.facing || 1, fwd = face > 0 ? !!input.right : !!input.left
  if (fwd && !s.fwdPrev && !input.down) { if (s.t - s.fwdTapT <= TS_DASH_WINDOW) s.dashTapT = s.t; s.fwdTapT = s.t }
  s.fwdPrev = fwd
}
function canAct(f, s) {
  return f.transformed && f.activeAlien === "terraspin" && !f.attacking && !((f.attackCooldown || 0) > 0) && !((f.hitstun || 0) > 0) &&
    !((f.blockstun || 0) > 0) && !(f._benPowerCommit > 0) && !busy(s)
}
// commit a cast: Power spent, pose, lock
function beginCast(f, s, api, pose, cost, total, { commit = true } = {}) {
  if (!canAct(f, s)) return null
  if (cost && !api.spendEnergy(f, cost)) return null
  f.isCharging = false
  f._benActionEpoch = (f._benActionEpoch || 0) + 1
  f._spriteCastMove = pose; f._spriteCastTimer = total
  f.attackCooldown = total; if (commit) { f._benPowerCommit = total; f.vx = 0 }
  s.castId++
  return { cast: s.castId, total }
}
// a hitbox riding the shared projectile pipeline; vx carries the facing (knockback direction)
const hitbox = (f, api, name, face, md) => api.spawnProjectile(f, name, { speed: 0, vx: face * 0.01, vy: 0, rectHitbox: true, isSpecial: true, ...md }, {})
const blockstunFor = (remaining, onBlock) => Math.max(1, remaining + 1 + onBlock)

// 1. INHALE (hold Special) — Col 2 R5 arms up + the Col 3 cyclone cone. 6f startup, then up to 60f of suction: cost 10 +
//    4 Power/s drain while held; he cannot move (committed) but Block cancels it. The opponent within 320 px in front is pulled
//    toward him at 5 px/f — never past his hurtbox, never through a wall, never pulled again until free for as long as they
//    were pulled (no chain-lock beyond 60f) — and takes no damage. Non-beam projectiles inside the cone are caught (deleted,
//    ownership-aware): +12 Pressure each. +0.5 Pressure per frame per target pulled. Release → 14f recovery (P again within it
//    = Exhale), or release with ←/↙ held = Exhale at once.
export const TS_INH = { STARTUP: 6, HOLD: 60, DRAIN: 4, RANGE: 320, SPEED: 5, H: 220, RECOVERY: 14 }
function castInhale(f, s, api) {
  if (!canAct(f, s) || !api.spendEnergy(f, TS_COST.inhale)) return false
  s.castId++; f.isCharging = false; f._benActionEpoch = (f._benActionEpoch || 0) + 1
  s.inhale = { t: 0, held: 0, pulled: 0, caught: 0, cast: s.castId }; s.stats.inhales++
  f._benPowerCommit = 2; f.vx = 0; f._spriteCastMove = "tsInhale"; f._spriteCastTimer = 2
  return true
}
export const inhaleCone = f => { const face = f.facing || 1, x0 = cx(f) + face * (f.w || 60) / 2
  return { x: face > 0 ? x0 : x0 - TS_INH.RANGE, y: f.y + (f.h || 110) / 2 - TS_INH.H / 2, w: TS_INH.RANGE, h: TS_INH.H } }
function tickInhale(f, s, api, input, opp, stage) {
  const i = s.inhale; if (!i) return
  i.t++
  if ((f.hitstun || 0) > 0) { endInhale(f, s, api, false, true); return }              // knocked out of it: no recovery
  if (input.block) { s.pullLock = Math.max(s.pullLock, i.pulled); s.inhale = null; f._benPowerCommit = 0; f._spriteCastMove = null; f._spriteCastTimer = 0; return }   // block-cancel
  f._benPowerCommit = 2; f.vx = 0; f._spriteCastMove = "tsInhale"; f._spriteCastTimer = 2
  if (i.t <= TS_INH.STARTUP) return
  i.held++
  const d = Math.min(f.energy || 0, TS_INH.DRAIN / 60); f.energy = (f.energy || 0) - d
  const face = f.facing || 1
  if (opp && !opp.eliminated && s.pullLock <= 0) {
    const dx = (cx(opp) - cx(f)) * face, gap = ((f.w || 60) + (opp.w || 60)) / 2 + 2
    const dy = Math.abs((opp.y + (opp.h || 110) / 2) - (f.y + (f.h || 110) / 2))
    if (dx > 0 && dx <= TS_INH.RANGE + (f.w || 60) / 2 && dy <= TS_INH.H / 2 + 40) {
      const step = Math.max(0, Math.min(TS_INH.SPEED, dx - gap))                         // never past his hurtbox
      opp.x = Math.max(stage.L, Math.min(stage.R - (opp.w || 60), opp.x - face * step))   // never through a wall
      i.pulled++; s.stats.pulledF++; gainPressure(s, TS_PRES.PULL)
    }
  }
  if (api) { const L = api.activeProjectiles(), cone = inhaleCone(f)
    for (let k = L.length - 1; k >= 0; k--) if (enemyShot(f, L[k]) && overlaps(L[k], cone)) { L.splice(k, 1); i.caught++; s.stats.caught++; gainPressure(s, TS_PRES.CATCH) } }
  const back = face > 0 ? !!input.left : !!input.right
  if (!input.special) endInhale(f, s, api, back)
  else if (i.held >= TS_INH.HOLD || !(f.energy > 0)) endInhale(f, s, api, false)
}
function endInhale(f, s, api, exhaleNow, cancelled = false) {
  const i = s.inhale; s.inhale = null
  s.pullLock = Math.max(s.pullLock, i ? i.pulled : 0)
  f._benPowerCommit = 0; f._spriteCastMove = null; f._spriteCastTimer = 0
  if (cancelled) return
  if (exhaleNow && s.pressure >= TS_EXH.MIN && castExhale(f, s, api, true)) return
  s.post = TS_INH.RECOVERY; f._benPowerCommit = TS_INH.RECOVERY; f._spriteCastMove = "tsInhale"; f._spriteCastTimer = TS_INH.RECOVERY
}

// 2. EXHALE — Col 2 R6 arms pushing. No extra cost; needs ≥ 15 Pressure and spends ALL of it. 16f startup; everything within
//    280 px in front is pushed away 10 px/f for 10f; damage 20 + 0.6 × Pressure spent (max 80); knockdown at ≥ 60 Pressure;
//    −14 on block; clean hit +1 Shear. Pressure → 0.
export const TS_EXH = { MIN: 15, STARTUP: 16, ACTIVE: 3, RECOVERY: 24, RANGE: 280, PUSH: 10, PUSH_F: 10, BASE: 20, PER: 0.6, MAX: 80, KD: 60, KD_T: 40, ON_BLOCK: -14 }
export const exhaleDamage = p => Math.min(TS_EXH.MAX, TS_EXH.BASE + TS_EXH.PER * p)
function castExhale(f, s, api, fromInhale) {
  if (s.pressure < TS_EXH.MIN) return false
  const total = TS_EXH.STARTUP + TS_EXH.ACTIVE + TS_EXH.RECOVERY
  if (fromInhale) { s.post = 0; f._benPowerCommit = 0; f.attackCooldown = 0 }
  const c = beginCast(f, s, api, "tsExhale", 0, total); if (!c) return false
  const P = s.pressure, dmg = exhaleDamage(P), kd = P >= TS_EXH.KD, face = f.facing || 1
  s.pressure = 0
  s.exhale = { t: 0, cast: c.cast, spent: P, dmg, kd, face }; s.stats.exhales++; s.stats.lastExhale = { spent: P, dmg, kd }
  const rem = TS_EXH.ACTIVE + TS_EXH.RECOVERY
  api.scheduleBenSpawn(f, TS_EXH.STARTUP, () => hitbox(f, api, "ts_exhale", face, { damage: dmg,
    spawnX: cx(f) + face * ((f.w || 60) / 2 + TS_EXH.RANGE / 2), spawnY: f.y + (f.h || 110) * 0.5, w: TS_EXH.RANGE, h: 180, lifetime: TS_EXH.ACTIVE,
    hitstun: kd ? 30 : 22, blockstun: blockstunFor(rem, TS_EXH.ON_BLOCK), knockbackX: 0.01, knockbackY: 0,
    alien: { ts: "exhale", pip: true, wind: false, cast: c.cast, kd } }))
  return true
}
function tickExhale(f, s, opp, stage) {
  if (s.exhale && ++s.exhale.t > TS_EXH.STARTUP + TS_EXH.ACTIVE + 6) s.exhale = null
  const p = s.push
  if (p && opp) { opp.x = Math.max(stage.L, Math.min(stage.R - (opp.w || 60), opp.x + p.dir * TS_EXH.PUSH)); opp.vx = 0
    if (--p.t <= 0) s.push = null }
  else if (p) s.push = null
}

// 3. WIND CHOP (→→ + P) — Col 3 R4 chop pose. 12f startup, a slicing dash of 300 px over 15f (real travel, no tracking),
//    3 hits 14 / 14 / 24 = 52, −13 on block, finisher +1 Shear (clean). Cuts through ONE projectile it passes (deleted, not
//    caught).
export const TS_CHOP = { STARTUP: 12, DIST: 300, FRAMES: 15, HITS_AT: [0, 5, 10], DMG: [14, 14, 24], RECOVERY: 18, ON_BLOCK: -13 }
function castChop(f, s, api) {
  const c = beginCast(f, s, api, "tsChop", TS_COST.chop, TS_CHOP.STARTUP + TS_CHOP.FRAMES + TS_CHOP.RECOVERY); if (!c) return false
  s.chop = { t: 0, cast: c.cast, face: f.facing || 1, cut: false, done: false, carry: false }; s.stats.chops++
  return true
}
// After the first contact (hit or block) the opponent rides the slice (carried with the travel, wall-clamped) so the string
// connects; before contact nothing homes in (no tracking).
const carry = (d, opp, v, stage) => { if (d.carry && opp && !opp.eliminated) { opp.x = Math.max(stage.L, Math.min(stage.R - (opp.w || 60), opp.x + d.face * v)); opp.vx = 0 } }
function tickChop(f, s, api, opp, stage) {
  const d = s.chop; if (!d) return
  d.t++
  if ((f.hitstun || 0) > 0) { delete f._benGlide; s.chop = null; return }
  const live = d.t - TS_CHOP.STARTUP, v = TS_CHOP.DIST / TS_CHOP.FRAMES
  if (d.done) { if (!(f.attackCooldown > 0)) s.chop = null; return }
  if (live < 0) { f.vx = 0; return }
  if (live >= TS_CHOP.FRAMES) { d.done = true; delete f._benGlide; f.vx = 0; return }
  const k = TS_CHOP.HITS_AT.indexOf(live)
  if (k >= 0) { const last = k === TS_CHOP.HITS_AT.length - 1, rem = (TS_CHOP.FRAMES - live) + TS_CHOP.RECOVERY
    hitbox(f, api, "ts_chop", d.face, { damage: TS_CHOP.DMG[k], vx: d.face * v, spawnX: cx(f) + d.face * ((f.w || 60) / 2 + 20), spawnY: f.y + (f.h || 110) * 0.5,
      w: 90, h: 110, lifetime: 4, hitstun: last ? rem + 8 : 16, blockstun: last ? blockstunFor(rem, TS_CHOP.ON_BLOCK) : 12, noHitstop: !last,
      knockbackX: last ? 6 : 0.4, knockbackY: last ? -3 : 0, alien: { ts: "chop", pip: last, wind: true, cast: d.cast } }) }
  if (!d.cut && api) { const L = api.activeProjectiles(), box = { x: f.x - 20, y: f.y, w: (f.w || 60) + 40, h: f.h || 110 }
    for (let q = L.length - 1; q >= 0; q--) if (enemyShot(f, L[q]) && overlaps(L[q], box)) { L.splice(q, 1); d.cut = true; s.stats.cuts++; break } }
  carry(d, opp, v, stage)
  f._benGlide = { vx: d.face * v, vy: 0 }
  f._spriteCastMove = "tsChop"; f._spriteCastTimer = Math.max(f._spriteCastTimer || 0, 2)
}

// 4. SHELL SPIN (←↙↓ + P) / THORN SHELL — Col 2 R7–8 / Col 3 spin loop. Rolls forward 260 px over its active frames 6–30,
//    3 hits 14 / 14 / 22 = 50, −10 on block, 16f recovery (punishable). While spinning (6–30): a physical melee attacker who
//    hits him takes 12 chip once per attacker per spin (cannot KO, no hitstun) and he takes the hit normally (no armor);
//    projectiles that touch the spin are deflected away at 70% speed, ownership unchanged (not caught). Tag-based.
export const TS_SPIN = { STARTUP: 5, END: 30, DIST: 260, HITS_AT: [6, 16, 26], DMG: [14, 14, 22], RECOVERY: 16, ON_BLOCK: -10, CHIP: 12, DEFLECT: 0.7 }
const spinActive = s => !!(s.spin && s.spin.t >= TS_SPIN.STARTUP + 1 && s.spin.t <= TS_SPIN.END)
function castSpin(f, s, api) {
  const c = beginCast(f, s, api, "tsSpin", TS_COST.spin, TS_SPIN.END + TS_SPIN.RECOVERY); if (!c) return false
  s.spin = { t: 0, cast: c.cast, face: f.facing || 1, chipped: [], done: false, carry: false }; s.stats.spins++
  return true
}
function tickSpin(f, s, api, opp, stage) {
  const d = s.spin; if (!d) return
  d.t++
  if ((f.hitstun || 0) > 0) { delete f._benGlide; s.spin = null; return }
  if (d.done) { if (!(f.attackCooldown > 0)) s.spin = null; return }
  if (d.t > TS_SPIN.END) { d.done = true; delete f._benGlide; f.vx = 0; f._spriteCastMove = "tsSpin"; f._spriteCastTimer = TS_SPIN.RECOVERY; return }
  if (d.t <= TS_SPIN.STARTUP) { f.vx = 0; return }
  const v = TS_SPIN.DIST / (TS_SPIN.END - TS_SPIN.STARTUP)
  const k = TS_SPIN.HITS_AT.indexOf(d.t)
  if (k >= 0) { const last = k === TS_SPIN.HITS_AT.length - 1, rem = (TS_SPIN.END - d.t) + TS_SPIN.RECOVERY
    hitbox(f, api, "ts_spin", d.face, { damage: TS_SPIN.DMG[k], vx: d.face * v, spawnX: cx(f) + d.face * 10, spawnY: f.y + (f.h || 110) * 0.5,
      w: (f.w || 60) + 40, h: f.h || 110, lifetime: 4, hitstun: last ? rem + 6 : 18, blockstun: last ? blockstunFor(rem, TS_SPIN.ON_BLOCK) : 12,
      noHitstop: !last, knockbackX: last ? 6 : 0.4, knockbackY: last ? -3 : 0, alien: { ts: "spin", pip: false, wind: true, cast: d.cast } }) }
  carry(d, opp, v, stage)
  f._benGlide = { vx: d.face * v, vy: 0 }
  f._spriteCastMove = d.t % 6 < 3 ? "tsCyclone" : "tsSpin"; f._spriteCastTimer = 2
}

// 5. CYCLONE DROP (air ↓↘→ + P) — Col 3 spin frames. 6f hang, then a downward spinning dive (48, +1 Shear clean) until he
//    lands; a bounded landing wind burst (radius 90 px, cosmetic). Once per airtime, no jump refill.
export const TS_DROP = { STARTUP: 6, VY: 14, VX: 3, DMG: 48, R: 90, RECOVERY: 14, MAXF: 60 }
function castDrop(f, s, api) {
  if (s.dropUsed || f.onGround || f.grounded) return false
  const c = beginCast(f, s, api, "tsCyclone", TS_COST.drop, TS_DROP.STARTUP + TS_DROP.MAXF + TS_DROP.RECOVERY, { commit: false }); if (!c) return false
  s.dropUsed = true; s.stats.drops++
  s.drop = { t: 0, cast: c.cast, face: f.facing || 1, lastY: null, landT: 0, landX: 0, landY: 0, live: false }
  return true
}
function dropBox(f, s, api) { return api ? api.activeProjectiles().find(p => p.owner === f && p.name === "ts_drop") : null }
function tickDrop(f, s, api) {
  const d = s.drop; if (!d) return
  d.t++
  if (d.landT > 0) { if (--d.landT <= 0 && !(f.attackCooldown > 0)) s.drop = null; else if (d.landT <= 0) s.drop = null; return }
  if ((f.hitstun || 0) > 0) { delete f._benGlide; const p = dropBox(f, s, api); if (p) p.lifetime = 0; s.drop = null; return }
  f._spriteCastMove = "tsCyclone"; f._spriteCastTimer = 2
  if (d.t <= TS_DROP.STARTUP) { f._benGlide = { vx: 0, vy: 0 }; return }
  if (d.t === TS_DROP.STARTUP + 1) { d.live = true
    hitbox(f, api, "ts_drop", d.face, { damage: TS_DROP.DMG, spawnX: cx(f), spawnY: f.y + (f.h || 110) * 0.75, w: (f.w || 60) + 30, h: (f.h || 110) * 0.7,
      lifetime: TS_DROP.MAXF + 2, hitstun: 24, blockstun: 12, knockbackX: 3, knockbackY: 4, alien: { ts: "drop", pip: true, wind: true, cast: d.cast } }) }
  const landed = (d.lastY != null && f.y === d.lastY) || d.t > TS_DROP.STARTUP + TS_DROP.MAXF
  if (landed) {
    delete f._benGlide; f.onGround = true; f.grounded = true; f.vy = 0
    const p = dropBox(f, s, api); if (p) p.lifetime = 0
    d.landT = TS_DROP.RECOVERY; d.landX = cx(f); d.landY = f.y + (f.h || 110)
    f.attackCooldown = TS_DROP.RECOVERY; f._benPowerCommit = TS_DROP.RECOVERY; f._spriteCastMove = "tsSpin"; f._spriteCastTimer = TS_DROP.RECOVERY
    return
  }
  d.lastY = f.y
  f._benGlide = { vx: d.face * TS_DROP.VX, vy: TS_DROP.VY }
  const p = dropBox(f, s, api); if (p) { p.x = cx(f); p.y = f.y + (f.h || 110) * 0.75 + TS_DROP.VY; p.vx = d.face * 0.01; p.vy = 0 }
}

// HEAVY (normal) cuts ONE projectile its wind blade touches (180 px in front, active frames)
function tickHeavyCut(f, s, api) {
  const a = f.attacking && f.currentAttack
  if (!a || a.name !== "heavy") { s.heavyCut = false; return }
  if (s.heavyCut || !api) return
  const el = (a.total || 0) - (a.timer || 0); if (el < (a.activeStart || 0) || el > (a.activeEnd ?? a.activeStart ?? 0)) return
  const face = f.facing || 1, x0 = cx(f) + face * (f.w || 60) / 2, box = { x: face > 0 ? x0 : x0 - 180, y: f.y, w: 180, h: f.h || 110 }
  const L = api.activeProjectiles()
  for (let k = L.length - 1; k >= 0; k--) if (enemyShot(f, L[k]) && overlaps(L[k], box)) { L.splice(k, 1); s.heavyCut = true; s.stats.cuts++; break }
}

// ── SHELL GUARD (Block + Heavy) ─────────────────────────────────────────────────────────────────────────────
// Cost 0, 6 s cooldown: curls into the shell (Col 1 R4) for an 8f window. A physical melee hit inside it does 40% damage and
// he answers with a 12-damage wind chop at the attacker (hits once, no pip). Beams (projectiles) and throws ignore it.
export const TS_GUARD = { WINDOW: 8, CD: 360, TAKE: 0.4, COUNTER: 12 }
function blockHeavy(f) {
  const s = tsState(f); if (!s) return false
  return raiseGuard(f, s)
}
export function raiseGuard(f, s) {
  if (s.guard.cd > 0 || busy(s) || (f.hitstun || 0) > 0 || f.attacking) return false
  s.guard.t = TS_GUARD.WINDOW; s.guard.cd = TS_GUARD.CD; s.guard.hit = null; s.stats.guards++
  f._spriteCastMove = "tsGuard"; f._spriteCastTimer = TS_GUARD.WINDOW; f._benPowerCommit = TS_GUARD.WINDOW; f.vx = 0
  return true
}
function tickGuard(f, s, api, opp) {
  const g = s.guard
  if (g.t > 0) g.t--
  if (g.cd > 0) g.cd--
  if (g.counter && api) {                                                  // the counter chop, the frame after the catch
    const c = g.counter; g.counter = null
    if (opp && !opp.eliminated) { const face = cx(opp) >= cx(f) ? 1 : -1
      hitbox(f, api, "ts_counter", face, { damage: TS_GUARD.COUNTER, spawnX: cx(opp), spawnY: opp.y + (opp.h || 110) * 0.5, w: (opp.w || 60) + 20, h: opp.h || 110,
        lifetime: 2, hitstun: 16, blockstun: 8, knockbackX: 4, knockbackY: -2, alien: { ts: "counter", pip: false, wind: false, cast: -2 } }) }
    s.stats.counters++
  }
}

// ── struck / absorb / damageTaken hooks (Thorn Shell, Shell Guard, Spin deflect) ──────────────────────────────
function struck(f, info) {
  const s = tsState(f); const a = info && info.attacker
  if (!s || !a || a === f || info.kind !== "melee" || (info.move && info.move.isGrab)) return
  if (spinActive(s) && !s.spin.chipped.includes(pIndex(a))) {            // THORN SHELL: 12 chip, once per attacker per spin
    s.spin.chipped.push(pIndex(a))
    if ((a.health || 0) > 1) { a.health = Math.max(1, a.health - TS_SPIN.CHIP); s.stats.chips++ }
  }
  if (s.guard.t > 0) {                                                     // SHELL GUARD caught a physical melee hit
    s.guard.t = 0; s.guard.hit = { at: s.t, p: pIndex(a), used: false }; s.guard.counter = { at: s.t }
  }
}
function damageTaken(f, raw, opts) {
  const s = tsState(f); const h = s && s.guard.hit
  if (!h || h.used || h.at !== s.t || !opts || !opts.attacker || pIndex(opts.attacker) !== h.p) return raw
  h.used = true
  return raw * TS_GUARD.TAKE
}
function absorb(f, info) {
  const s = tsState(f); const p = info && info.proj
  if (!s || !p || !spinActive(s) || !enemyShot(f, p) || p._tsDeflected || !api0) return false
  const away = (p.x >= cx(f)) ? 1 : -1, sp = Math.abs(p.vx || 0) || Math.abs(p.speed || 0) || 8
  const q = { ...p, vx: away * sp * TS_SPIN.DEFLECT, vy: (p.vy || 0) * TS_SPIN.DEFLECT, _tsDeflected: true,
    x: away > 0 ? Math.max(p.x, f.x + (f.w || 60) + (p.w || 20) / 2 + 2) : Math.min(p.x, f.x - (p.w || 20) / 2 - 2) }
  api0.activeProjectiles().push(q)                                         // ownership unchanged (not caught)
  s.stats.deflects++
  return true
}

// contact hook (combat → ben10State.benAlienContact): Shear pips + Pressure on CLEAN hits of tagged casts
function onContact(f, target, { proj = null, blocked = false } = {}) {
  const s = tsState(f); if (!s || !proj || proj.visualOnly) return
  const tag = proj.alien; if (!tag || !tag.ts) return
  if (!blocked && tag.pip) addShear(s, tag.cast)
  if (!blocked && tag.wind && tag.cast !== s.landCast) { s.landCast = tag.cast; gainPressure(s, TS_PRES.LAND) }
  if (tag.ts === "chop" && s.chop && s.chop.cast === tag.cast) s.chop.carry = true
  if (tag.ts === "spin" && s.spin && s.spin.cast === tag.cast) s.spin.carry = true
  if (tag.ts === "exhale") {
    s.push = { t: TS_EXH.PUSH_F, dir: cx(target) >= cx(f) ? 1 : -1 }
    if (!blocked && tag.kd) { target.knockdownState = true; target.knockdownTimer = TS_EXH.KD_T; target.invulnTimer = Math.max(target.invulnTimer || 0, TS_EXH.KD_T) }
  }
  if (tag.ts === "ultOpen" && !blocked && s.ult && s.ult.phase === "opener" && !target.eliminated) startUltCinematic(f, s, target)
}

// ── ULTIMATE: EYE OF THE STORM (same input as Omnitrix Overload, alien form only) ──────────────────────────────
// 55 Power. An Inhale-style pull opener (40); whiff / block = no cinematic, 60f recovery. On a clean opener: a procedural
// pixel cyclone forms around the HELD opponent (render only; both fighters readable) and he spins into it (Col 3 spin) →
// CHOP STORM: 6 wind-blade chops × 18 from hash(seed, frame, player)-chosen angles (Col 3 R4 chop pose) → EXHALE BLOWOUT
// (Col 2 R6): all Pressure spent for free, 60 + 0.6 × Pressure (max 120), pushes toward the edge, knockdown.
// 40 + 108 + 90 = 238 at 50 Pressure; 268 at full. Pressure → 0, positions restore (then the blowout push), no hazards,
// 100f recovery lockout. The cyclone / blades have no hitboxes and no GAME_STATE presence.
export const TS_ULT = { OPENER_AT: 14, OPENER: 40, RANGE: 230, WHIFF: 60, CYCLONE: 30, CHOPS_AT: [34, 42, 50, 58, 66, 74], CHOP: 18,
  BLOW_AT: 90, BLOW_BASE: 60, BLOW_PER: 0.6, BLOW_MAX: 120, END: 104, LOCKOUT: 100, KD: 50, PUSH: 16, LIFT: 30 }
export const blowoutDamage = p => Math.min(TS_ULT.BLOW_MAX, TS_ULT.BLOW_BASE + TS_ULT.BLOW_PER * p)
function fireUltimate(f, ctx, api) {
  const s = tsState(f); if (!s) return false
  if (!canAct(f, s)) return false
  if (!api.spendEnergy(f, TS_COST.ultimate)) return false
  api0 = api
  s.castId++
  const face = f.facing || 1, total = TS_ULT.OPENER_AT + TS_ULT.WHIFF
  f.isCharging = false; f._benActionEpoch = (f._benActionEpoch || 0) + 1
  f._spriteCastMove = "tsInhale"; f._spriteCastTimer = total; f.attackCooldown = total; f._benPowerCommit = total; f.vx = 0
  s.ult = { phase: "opener", t: 0, face, raw: 0, cast: s.castId, angles: [], hits: [] }
  s.stats.ults++
  api.focusCamera?.(f, api.getOpponent(f), 0.92, 20)
  api.scheduleBenSpawn(f, TS_ULT.OPENER_AT, () => hitbox(f, api, "ts_ult_open", face, {
    damage: TS_ULT.OPENER, spawnX: cx(f) + face * ((f.w || 60) / 2 + TS_ULT.RANGE / 2), spawnY: f.y + (f.h || 110) * 0.5, w: TS_ULT.RANGE, h: 170, lifetime: 3,
    isUltimate: true, hitstun: 40, blockstun: 16, knockbackX: 0.01, knockbackY: 0, alien: { ts: "ultOpen", cast: s.castId } }))
  return true
}
function startUltCinematic(f, s, target) {
  const u = s.ult
  u.phase = "cyclone"; u.t = 0; u.raw = TS_ULT.OPENER; u.hits.push(TS_ULT.OPENER)
  u.home = { x: f.x, y: f.y }; u.thome = { x: target.x, y: target.y }
  f.attackCooldown = TS_ULT.END + TS_ULT.LOCKOUT; f._benPowerCommit = TS_ULT.END; f._spriteCastTimer = TS_ULT.END
  f.invulnTimer = Math.max(f.invulnTimer || 0, TS_ULT.END + 2)            // cinematic only (the opponent is held)
}
function tickUlt(f, s, opp, api, ctx) {
  const u = s.ult; if (!u) return
  if (u.phase === "opener") { if (++u.t > TS_ULT.OPENER_AT + 12) s.ult = null; return }   // whiff / block
  if (!opp || opp.eliminated) { endUlt(f, s, null); return }
  u.t++
  opp.hitstun = Math.max(opp.hitstun || 0, 8); opp.vx = 0; opp.vy = 0; opp.x = u.thome.x; opp.y = u.thome.y   // held (no collision change)
  opp.attacking = false; opp.currentAttack = null
  f.vx = 0; f.vy = 0; f.x = u.home.x; f.y = u.home.y
  const hit = (dmg, shake) => { api.applyScaledDamage(opp, dmg, { attacker: f, move: "eye_of_the_storm", source: "ability" }); u.raw += dmg; u.hits.push(dmg); opp.colorFlash = 8; api.shake?.(shake, 8) }
  if (u.t < TS_ULT.CYCLONE) { u.phase = "cyclone"; f._spriteCastMove = "tsCyclone" }
  else if (u.t < TS_ULT.BLOW_AT) { u.phase = "chops"
    const k = TS_ULT.CHOPS_AT.indexOf(u.t)
    if (k >= 0) { u.angles.push(tsHash(ctx?.seed ?? 1, ctx?.frame ?? u.t, pIndex(f), k) * Math.PI * 2); hit(TS_ULT.CHOP, 3 + k) }
    const near = TS_ULT.CHOPS_AT.some(a => u.t >= a && u.t < a + 4); f._spriteCastMove = near ? "tsChop" : "tsCyclone" }
  else if (u.t < TS_ULT.END) { u.phase = "blowout"; f._spriteCastMove = "tsExhale"
    if (u.t === TS_ULT.BLOW_AT) { const P = s.pressure; u.pressure = P; s.pressure = 0; hit(blowoutDamage(P), 18) } }
  else { endUlt(f, s, opp); return }
  f._spriteCastTimer = 2
}
function endUlt(f, s, opp) {
  const u = s.ult
  if (u?.home) { f.x = u.home.x; f.y = u.home.y; f.vx = 0; f.vy = 0 }     // positions restore
  if (opp && u?.thome) {                                                   // …then the blowout carries them toward the edge, knocked down
    const dir = cx(opp) >= cx(f) ? 1 : -1
    opp.x = u.thome.x; opp.y = u.thome.y; opp.hitstun = Math.max(opp.hitstun || 0, 30); opp.vx = dir * TS_ULT.PUSH; opp.vy = -4
    opp.knockdownState = true; opp.knockdownTimer = TS_ULT.KD; opp.invulnTimer = Math.max(opp.invulnTimer || 0, TS_ULT.KD)
  }
  s.lastUltRaw = u?.raw || 0; s.lastUltAngles = u?.angles ? u.angles.slice() : []; s.lastUltPressure = u?.pressure ?? 0
  s.ult = null; s.pressure = 0
  f.attackCooldown = TS_ULT.LOCKOUT; f._benPowerCommit = TS_ULT.LOCKOUT; f._spriteCastMove = null; f._spriteCastTimer = 0
}

// ── RENDER-ONLY BODY OFFSETS (game.js body draw; never collision) ─────────────────────────────────────────────
// Normals have no unique attack art: jab / heavy / low lunge forward and the launcher lifts, as a draw offset only; in the ult
// he spins forward into the cyclone and the held opponent floats inside it.
const LUNGE = { light: 12, heavy: 20, down: 8, air: 8 }
function bodyOffset(f) {
  const s = tsState(f); if (!s) return null
  const u = s.ult
  if (u && u.thome && u.home && u.phase !== "opener") {
    const k = Math.min(1, u.t / 16) * Math.min(1, Math.max(0, TS_ULT.BLOW_AT - u.t) / 10), dist = (u.thome.x - u.home.x) * 0.55
    return { dx: Math.round(dist * k), dy: -Math.round(TS_ULT.LIFT * 0.6 * k) }
  }
  const a = f.attacking && f.currentAttack
  if (a && (LUNGE[a.name] || a.name === "up")) {
    const el = (a.total || 0) - (a.timer || 0), st = a.activeStart || 1, k = el < st ? el / st : Math.max(0, 1 - (el - st) / Math.max(1, (a.total || 1) - st))
    return a.name === "up" ? { dx: 0, dy: -Math.round(10 * k) } : { dx: Math.round((f.facing || 1) * LUNGE[a.name] * k), dy: 0 }
  }
  return null
}
function targetOffset(f, target) {
  const s = tsState(f); const u = s && s.ult; if (!u || !u.thome || u.phase === "opener") return null
  const up = Math.min(1, u.t / 12) * Math.min(1, Math.max(0, TS_ULT.END - u.t) / 10)
  return { dx: Math.round(Math.sin(u.t / 4) * 6 * up), dy: -Math.round(TS_ULT.LIFT * up) }
}

// ── RENDER-ONLY (reads GAME_STATE, never writes it; no sim effect) ────────────────────────────────────────
function rHash(a, b, c) {   // render-only deterministic hash → [0, 1) (streak / debris jitter)
  let h = Math.imul((a | 0) ^ 0x9e3779b9, 0x85ebca6b) >>> 0
  h = Math.imul(h ^ ((b | 0) + 0x27d4eb2f), 0xcc9e2d51) >>> 0
  h = Math.imul(h ^ ((c | 0) + 0x165667b1), 0x1b873593) >>> 0
  h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b) >>> 0; h ^= h >>> 13
  return (h >>> 0) / 4294967296
}
const WIND = "#f0fdf4", WIND2 = "#bbf7d0", LEAF = "#a3e635"
function px(c, x, y, k = 4) { c.fillRect(Math.round(x - k / 2), Math.round(y - k / 2), k, k) }
// pixel wind streak: a dashed line of squares from (x0, y0) to (x1, y1)
function streak(c, x0, y0, x1, y1, k = 3, gap = 2) {
  const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / (k + gap)))
  for (let i = 0; i <= n; i++) px(c, x0 + (x1 - x0) * i / n, y0 + (y1 - y0) * i / n, k)
}
// pixel wind blade: a crescent of squares (procedural chop)
function blade(c, x, y, r, ang, face, col = WIND) {
  c.fillStyle = col
  for (let i = 0; i < 9; i++) { const a = ang - 0.9 + i * 0.22, rr = r * (0.75 + 0.25 * Math.sin(i / 8 * Math.PI))
    px(c, x + face * Math.cos(a) * rr, y + Math.sin(a) * rr, i === 4 ? 5 : 4) }
}
export function drawPixelRing(c, x, y, r, col, k = 4, frame = 0) {
  if (!(r > 0)) return
  const n = Math.max(12, Math.round(r * 0.6)), spin = (frame % 60) / 60 * Math.PI * 2 / n
  c.fillStyle = col
  for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + spin; px(c, x + Math.cos(a) * r, y + Math.sin(a) * r, k) }
}
// procedural pixel cyclone (Inhale cone FX / ult vortex): rotating streak arcs
function cyclone(c, x, y, rx, ry, t, seed, n = 7) {
  c.fillStyle = WIND
  for (let i = 0; i < n; i++) {
    const a = t / 5 + i / n * Math.PI * 2, r = 0.55 + 0.45 * rHash(seed, i, 1)
    for (let j = 0; j < 5; j++) { const b = a + j * 0.12; px(c, x + Math.cos(b) * rx * r, y + Math.sin(b) * ry * r - j * 2, 3) }
  }
}
export function drawTerraspinFx(c, f, frame = 0, opp = null) {
  const s = tsState(f); if (!c || !s) return
  c.save(); c.imageSmoothingEnabled = false
  const face = f.facing || 1, fx = cx(f), fy = f.y + (f.h || 110) * 0.5
  const a = f.attacking && f.currentAttack
  if (a && a.name) {                                                       // procedural chop / blade / sweep / gale
    const el = (a.total || 0) - (a.timer || 0), on = el >= (a.activeStart || 0) && el <= (a.activeEnd ?? a.activeStart ?? 0) + 2
    if (on && a.name === "light") blade(c, fx + face * ((f.w || 60) / 2 + 22), fy - 6, 20, 0, face)
    if (on && a.name === "heavy") { blade(c, fx + face * ((f.w || 60) / 2 + 60), fy - 4, 44, 0, face); blade(c, fx + face * ((f.w || 60) / 2 + 100), fy - 4, 30, 0, face, WIND2) }
    if (on && a.name === "down") { c.fillStyle = WIND2; for (let i = 0; i < 8; i++) px(c, fx + face * ((f.w || 60) / 2 + i * 9), f.y + (f.h || 110) - 6 - (i % 2) * 4, 3) }
    if (a.name === "up") { c.fillStyle = WIND; for (let i = 0; i < 8; i++) streak(c, fx - 30 + i * 9, f.y + (f.h || 110) - ((el * 4 + i * 11) % 40), fx - 30 + i * 9, f.y + (f.h || 110) - ((el * 4 + i * 11) % 40) - 14, 3, 2) }
    if (on && a.name === "air") drawPixelRing(c, fx, fy, (f.w || 60) * 0.7, WIND, 3, frame)
  }
  const i = s.inhale
  if (i && i.t > TS_INH.STARTUP) {                                         // the cyclone cone + suction streaks rushing IN
    const cone = inhaleCone(f), far = fx + face * ((f.w || 60) / 2 + TS_INH.RANGE)
    c.fillStyle = WIND2
    for (let k = 0; k < 10; k++) { const q = ((i.t * 9 + k * 37) % 100) / 100, y = cone.y + 20 + rHash(i.cast, k, 2) * (cone.h - 40) * (1 - q * 0.6) + q * (fy - cone.y - 20) * 0.6
      const x = far - face * q * TS_INH.RANGE; streak(c, x, y, x + face * 22, y, 3, 2) }
    cyclone(c, fx + face * ((f.w || 60) / 2 + 30), fy, 30, 46, i.t, i.cast, 5)
  }
  const e = s.exhale
  if (e && e.t >= TS_EXH.STARTUP - 2) {                                    // the blast rushing OUT
    c.fillStyle = WIND
    const q = Math.min(1, (e.t - TS_EXH.STARTUP + 2) / 8)
    for (let k = 0; k < 9; k++) { const y = fy - 80 + k * 20, x = fx + face * ((f.w || 60) / 2 + q * TS_EXH.RANGE * (0.6 + 0.4 * rHash(e.cast, k, 3)))
      streak(c, x - face * 40, y, x, y, 4, 2) }
  }
  const ch = s.chop
  if (ch && ch.t >= TS_CHOP.STARTUP && !ch.done) blade(c, fx + face * ((f.w || 60) / 2 + 16), fy, 38, (ch.t % 3 - 1) * 0.4, face)
  const sp = s.spin
  if (sp && spinActive(s)) drawPixelRing(c, fx, fy, Math.max(f.w || 60, f.h || 110) * 0.62, (sp.t >> 1) % 2 ? WIND : LEAF, 4, frame)   // thorn ring
  const d = s.drop
  if (d && d.landT > 0) drawPixelRing(c, d.landX, d.landY - 8, TS_DROP.R * (1 - d.landT / TS_DROP.RECOVERY * 0.6), WIND, 4, frame)   // cosmetic landing burst (bounded r 90)
  if (s.guard.t > 0) drawPixelRing(c, fx, fy, Math.max(f.w || 60, f.h || 110) * 0.6, LEAF, 4, frame)   // Shell Guard
  const u = s.ult
  if (u && u.thome && opp) {
    const ox = u.thome.x + (opp.w || 60) / 2, oy = u.thome.y + (opp.h || 110) / 2 - TS_ULT.LIFT
    if (u.phase !== "opener") cyclone(c, ox, oy, 90, 120, u.t, u.cast, 9)
    u.angles.forEach((ang, k) => { const dd = u.t - TS_ULT.CHOPS_AT[k]; if (dd >= 0 && dd < 6)
      blade(c, ox + Math.cos(ang) * (60 - dd * 8), oy + Math.sin(ang) * (60 - dd * 8), 42, ang + Math.PI, 1, dd % 2 ? WIND : WIND2) })
    const bd = u.t - TS_ULT.BLOW_AT
    if (bd >= 0 && bd < 14) { c.fillStyle = WIND; for (let k = 0; k < 10; k++) { const y = oy - 90 + k * 20; streak(c, ox - 120 + bd * 18, y, ox - 40 + bd * 18, y, 4, 2) } }
  }
  if (opp && opp._lastDrawX != null && opp._lastDrawW != null) {
    const ox = opp._lastDrawX + opp._lastDrawW / 2, oy = opp._lastDrawY - 12, v = s.shear
    c.fillStyle = WIND2
    for (let k = 0; k < v.pips; k++) { const x = ox + (k - (v.pips - 1) / 2) * 12; px(c, x - 3, oy + 3, 3); px(c, x, oy, 3); px(c, x + 3, oy - 3, 3) }   // Shear slashes
    if (v.dragT > 0) {                                                     // GALE DRAG: streaks pulling them toward him
      const dir = cx(f) >= ox ? 1 : -1, w = opp._lastDrawW, h = opp._lastDrawH || 120
      c.fillStyle = WIND
      for (let k = 0; k < 7; k++) { const y = opp._lastDrawY + rHash(frame >> 2, k, 5) * h, x = ox - dir * w * 0.7 + ((frame * 3 + k * 13) % 40) * dir
        streak(c, x, y, x + dir * 26, y, 3, 2) }
      c.fillStyle = WIND2; c.font = "bold 9px Arial"; c.textAlign = "center"; c.fillText("GALE DRAG", ox, oy - 8)
    }
  }
  c.restore()
}
export function drawTerraspinHud(ctx, f, { x, enY, enH = 8, pbw, flip }) {
  const s = tsState(f); if (!ctx || !s) return
  const y = enY + enH + 3, w = Math.max(40, (pbw || 120) * 0.6), bx = flip ? x + 8 + (pbw || 120) - w : x + 8
  ctx.save()
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(bx, y, w, 5)                    // PRESSURE gauge under Omnitrix Power
  ctx.fillStyle = s.pressure >= TS_EXH.KD ? "#f0fdf4" : s.pressure >= TS_EXH.MIN ? "#86efac" : "#4d7c0f"
  ctx.fillRect(bx, y, Math.round(w * s.pressure / TS_PRES.MAX), 5)
  ctx.font = "bold 8px Arial"; ctx.textBaseline = "top"; ctx.textAlign = flip ? "right" : "left"
  const tx = flip ? bx + w : bx
  ctx.fillStyle = "#d9f99d"; ctx.fillText(`PRESSURE ${Math.floor(s.pressure)}`, tx, y + 7)
  const v = s.shear
  ctx.fillStyle = v.dragT > 0 ? "#f0fdf4" : "#e5e7eb"
  ctx.fillText(`SHEAR ${v.dragT > 0 ? "GALE DRAG" : v.immune > 0 ? "IMMUNE" : "●".repeat(v.pips) + "○".repeat(TS_SHEAR.MAX - v.pips)}`, tx, y + 17)
  ctx.fillStyle = s.guard.cd > 0 ? "#9ca3af" : "#a3e635"; ctx.fillText(s.guard.cd > 0 ? `SHELL ${Math.ceil(s.guard.cd / 60)}s` : "SHELL READY", tx, y + 27)
  ctx.restore()
}
// ultimate: a dimmed, wind-swept stage under the fighters (world space; fades in / out — the lights restore at the end)
export function drawTerraspinUnder(c, f) {
  const s = tsState(f); if (!c || !s || !s.ult || s.ult.phase === "opener" || !s.ult.home) return
  const t = s.ult.t, a = Math.max(0, Math.min(1, t / 8) * Math.min(1, (TS_ULT.END - t) / 8))
  c.save(); c.globalAlpha = 0.55 * a; c.fillStyle = "#0b1a0f"; c.fillRect(-4000, -4000, 16000, 12000); c.restore()
}
