// xlr8.js — XLR8 (Kineceleran speedster), a READY Omnitrix alien. One registry entry + one sheet + one ledger.
// Leaf module: imports only its generated art table (no engine imports, no cycles). The engine reaches it through the
// generic, ben10-gated ready-form hooks (docs/ben10/ADD_ALIEN.md) and hands it an `api` + the ability context.
//
// ALL simulation state lives in GAME_STATE: fighter.omnitrix.formState (Flash Time, echo queue, casts, cyclone, ult),
// cleared by clearBenFormState on swap / revert / KO / rematch. No randomness: the only "random" spots (Time Sprint
// circling) are hash(match seed, frame, player index). Render-only bits (afterimages, grey world, whirlwind, shock
// ring, echo ghosts) READ that state and never write it.
import { XLR8_ANIM, XLR8_FX } from "./xlr8Assets.js"
export { XLR8_ANIM, XLR8_FX }

const ANIM = { ...XLR8_ANIM, hbFire: XLR8_ANIM.xlSonicSlash }

// ── tuning (pre-mod numbers from the brief) ─────────────────────────────────────────────────────────────────
export const XL_FLASH = { COST: 25, DURATION: 210, COOLDOWN: 600, FRAMES: 0.7, SPEED: 2.5, PROJ: 0.5, OPP: 0.25, SWALLOW: 10 }   // P + L (Charge + Special); SPEED 1.4 → 1.8 (owner: "as fast as the Flash")   // SWALLOW = the shared input-buffer window
export const XL_ECHO = { DELAY: 12, FRAC: 0.30, MAX: 3 }
export const XL_COST = { slash: 10, blur: 12, whip: 12, cyclone: 16, dive: 12, ultimate: 50 }
export const XL_SLASH = { STARTUP: 8, LUNGE_FRAMES: 19, LUNGE_SPEED: 20, HITS: [[4, 14], [10, 14], [16, 22]], TOTAL: 40, ON_BLOCK: -12 }
export const XL_BLUR = { STARTUP: 6, BEHIND: 60, RECOVERY: 14, COOLDOWN: 90 }
export const XL_WHIP = { STARTUP: 10, HITS: [[10, 20], [18, 28]], RANGE: 200, TOTAL: 34 }
export const XL_CYCLONE = { STARTUP: 14, AHEAD: 300, TRAVEL: 220, FRAMES: 44, HIT_EVERY: 11, HITS: 4, DMG: 10, PULL: 6, PULL_FRAMES: 8, PULL_RADIUS: 140, TOTAL: 36 }
export const XL_DIVE = { DMG: 45, VX: 13, VY: 11, MAX: 30, BOUNCE: -9 }
export const XL_ULT = { OPENER: 40, SLASH: 12, SLASH_AT: [12, 18, 24, 30, 36, 42, 48, 54], FINAL: 104, LAUNCH_AT: 60, FINAL_AT: 86, END: 100,
  STARTUP: 10, WHIFF_RECOVERY: 60, LOCKOUT: 100, LIFT: 160 }

const normal = (damage, startup, active, recovery, advantage, extra = {}) => ({
  damage, startup, active, recovery, blockstun: active + recovery + advantage,
  hitstun: 16, knockbackX: 3, knockbackY: -2, frameExact: true, ...extra
})

export const XLR8 = {
  id: "xlr8", poolKey: "xlr8", displayName: "XLR8", slot: 5,
  status: "ready", sheetPath: "./ben10_xlr8_idle_uniform.png",
  ledgerPath: "docs/ben10/aliens/xlr8/SPRITE_LEDGER.md",
  mods: { speed: 3.0, damage: 0.90, defense: 0.85, weight: 0.70 },   // speed 1.35 → 1.6 → 3.0 (owner 2026-11-17: "a lot a lot faster") — walk 27 vs Killua 8.75; Flash Time ×2.5 on top
  movement: "grounded", maxJumps: 2,   // the shared double jump
  moves: { jab: "Jab", heavy: "Claw Slash", low: "Tail Sweep", launcher: "Rising Slash", air: "Air Claw",
    special1: "Sonic Slash", special2: "Blur Step", special3: "Tail Whip", special4: "Mach Cyclone", special5: "Sonic Dive",
    defense: "Flash Time", ultimate: "Time Sprint" },
  basic_attacks: {
    light: normal(16, 4, 3, 10, 1),                                                     // attack f1-3
    heavy: normal(46, 12, 4, 22, -5, { knockbackX: 8, rangeX: 150 }),                   // attack f4-6 claw slash, 150 px
    down:  normal(24, 6, 3, 14, -3, { hitLevel: "low" }),                               // crouch -> attack v tail sweep, hits low
    up:    normal(42, 10, 4, 26, -8, { launcher: true, launchVy: -15, selfVy: 0 }),     // attack ^ rising slash
    air:   normal(26, 6, 4, 10, 2)                                                      // fall frame + claw
  },
  anim: ANIM, fx: XLR8_FX,
  onApply, tick, fireSpecial, fireUltimate, blockSpecial, chargeSpecial, onContact, moveFrames,
  // FLASH TIME slows the OPPONENT: game.js runs them at 25% (the Killua Godspeed / Flash frame-skip — movement, attacks, animation)
  oppTimeScale: f => flashActive(xlState(f)) ? XL_FLASH.OPP : 0,
  drawHud: drawXlr8Hud, drawFx: drawXlr8Fx, drawUnder: drawXlr8Under, drawBehind: drawXlr8Behind, trailCount: f => xlTrailCount(f)
}

// ── state ─────────────────────────────────────────────────────────────────────────────────────────────────
export function freshXlr8State() {
  return { kind: "xlr8", t: 0, castId: 0, baseSpeed: null, baseDash: null,
    speedTier: true, mobility: "very_high",   // Killua kit: double-tap-toward = blink behind the foe; two air-dashes (cleared with formState on swap / revert / KO)
    flashT: 0, flashCd: 0, flashes: 0, swallow: 0,
    echoes: [], echoCount: 0, echoesFired: 0,
    blur: null, blurCd: 0, cancelWin: 0, cancelUsed: false, cancels: 0,
    slash: null, whip: null, cyclone: null, dive: null, diveUsed: false,
    ult: null, lastUltRaw: 0 }
}
export const xlState = f => (f?.omnitrix?.formState?.kind === "xlr8" && f.transformed && f.activeAlien === "xlr8") ? f.omnitrix.formState : null
export const flashActive = s => !!s && s.flashT > 0
const fs = (s, n) => flashActive(s) ? Math.max(1, Math.round(n * XL_FLASH.FRAMES)) : n   // Flash Time frame compression

function onApply(f) {
  if (!f.omnitrix) return
  const s = f.omnitrix.formState = freshXlr8State()
  s.baseSpeed = f._benWalkSpeed; s.baseDash = f.dashSpeed
}
const pIndex = f => ({ p1: 0, p2: 1, p3: 2, p4: 3 }[f.side] ?? 0)
export function xlHash(seed, frame, player, k = 0) {
  let h = ((seed >>> 0) ^ Math.imul(frame | 0, 374761393) ^ Math.imul(player + 1, 668265263) ^ Math.imul(k + 7, 2246822519)) >>> 0
  h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

// ── FLASH TIME (P + L = Charge + Special via the chargeSpecial hook; Block + Special also works; either press order): 25 Power, 210f, then 600f cooldown; the OPPONENT runs at 25%. ───────────────────────
function blockSpecial(f, ctx, api) {
  const s = xlState(f); if (!s) return false
  if (s.flashT > 0 || s.flashCd > 0 || (f.hitstun || 0) > 0 || s.ult) return false   // no refresh / no re-activate
  if (!(api || _api).spendEnergy(f, XL_FLASH.COST)) return false
  s.flashT = XL_FLASH.DURATION; s.flashes++
  s.swallow = XL_FLASH.SWALLOW                                                    // the Special press that started it must not ALSO cast (buffered)
  f.colorFlash = Math.max(f.colorFlash || 0, 8); if (!f._benSfx) f._benSfx = "xl_flash"
  return true
}
// startMove hook: his own normals' startup / recovery ×0.7 (rounded, min 1f) while Flash Time runs. Damage unchanged.
function moveFrames(f, key, md) {
  const s = xlState(f); if (!s || !md) return md
  if (s.blur) return false                                                        // Blur Step: normals refused (only the one special cancel)
  if (!flashActive(s)) return md
  return { ...md, startup: Math.max(1, Math.round((md.startup ?? 5) * XL_FLASH.FRAMES)), recovery: Math.max(1, Math.round((md.recovery ?? 10) * XL_FLASH.FRAMES)) }
}

let _api = null   // the shared primitives object (stateless); blockSpecial can be called without one

// ── per-frame tick ────────────────────────────────────────────────────────────────────────────────────────
function tick(f, input, ctx, api) {
  const s = xlState(f); if (!s) return
  _api = api; s.t++
  if (s.swallow > 0) s.swallow = input && input.special ? XL_FLASH.SWALLOW : s.swallow - 1   // held → keep swallowing; released → buffer window runs out
  const opp = api.getOpponent(f)
  const grounded = !!(f.onGround || f.grounded)
  if (s.blurCd > 0) s.blurCd--
  if (s.cancelWin > 0) s.cancelWin--
  if (s.flashT > 0 && --s.flashT === 0) s.flashCd = XL_FLASH.COOLDOWN
  else if (s.flashCd > 0) s.flashCd--
  // movement ×1.8 while Flash Time runs (his side only)
  const fl = flashActive(s)
  if (s.baseSpeed != null) { f._benWalkSpeed = s.baseSpeed * (fl ? XL_FLASH.SPEED : 1); f.dashSpeed = s.baseDash * (fl ? XL_FLASH.SPEED : 1) }
  // opponent-owned projectiles ×0.5: a 2-frame lease the projectile step reads (expires by itself if he swaps out)
  if (fl) for (const p of api.activeProjectiles()) if (p.owner && p.owner !== f && !p.visualOnly) { p.timeScale = XL_FLASH.PROJ; p.timeScaleT = 2 }
  if (grounded) s.diveUsed = false
  tickEchoes(f, s, opp, api)
  tickBlur(f, s, opp, ctx)
  tickPose(f, s, "slash", "xlSonicSlash", XL_SLASH.TOTAL)
  tickPose(f, s, "whip", "xlTailWhip", XL_WHIP.TOTAL)
  tickCyclone(f, s, opp, api, ctx)
  tickDive(f, s, opp, api, grounded)
  tickUlt(f, s, opp, api, ctx)
}

// ECHO HITS: 12f after a hit he lands during Flash Time, 30% of that hit's raw damage — only if the opponent is
// still in hitstun then; max 3 per combo; echoes never schedule echoes; normal combo scaling applies.
function tickEchoes(f, s, opp, api) {
  if (opp && (opp.hitstun || 0) <= 0 && !s.echoes.length) s.echoCount = 0          // combo over → fresh echo budget
  if (!s.echoes.length) return
  const due = s.echoes.filter(e => e.at <= s.t)
  s.echoes = s.echoes.filter(e => e.at > s.t)
  for (const e of due) {
    if (!opp || opp.eliminated || (opp.hitstun || 0) <= 0) continue               // dropped: no echo outside hitstun
    api.applyScaledDamage(opp, e.raw * api.getComboScale(f), { attacker: f, move: "echo", source: "ability" })
    s.echoesFired++; opp.colorFlash = Math.max(opp.colorFlash || 0, 4)
  }
}
function scheduleEcho(f, s, target, raw) {
  if (!flashActive(s) || !(raw > 0) || s.echoCount >= XL_ECHO.MAX) return
  s.echoCount++
  s.echoes.push({ at: s.t + XL_ECHO.DELAY, raw: raw * XL_ECHO.FRAC, x: target.x + target.w / 2, y: target.y + target.h / 2 })
}

function tickPose(f, s, key, pose, total) {
  const c = s[key]; if (!c) return
  if ((f.hitstun || 0) > 0 || ++c.t > c.total) { s[key] = null; return }
  f._spriteCastMove = pose; f._spriteCastTimer = 2
}

// BLUR STEP: vanish after 6f, reappear 60 px behind the opponent's position AT CAST (no tracking), clamped to the
// stage; corner → in front of them. Turns toward them on arrival. 14f recovery, cancellable once.
function tickBlur(f, s, opp, ctx) {
  const b = s.blur; if (!b) return
  if ((f.hitstun || 0) > 0) { s.blur = null; return }                              // no invulnerability: a hit cancels it
  b.t++
  if (b.phase === "out") {
    f._spriteCastMove = "xlBlurOut"; f._spriteCastTimer = 2
    if (b.t < b.at) return
    const L = ctx?.stageLeft ?? 0, R = (ctx?.stageWidth ?? 3200) - f.w
    let x = b.behind - f.w / 2
    if (x < L || x > R) { x = b.front - f.w / 2; b.fallback = true }               // corner: unreachable → land in front
    f.x = Math.max(L, Math.min(R, x)); f.vx = 0
    f.facing = b.faceX >= f.x + f.w / 2 ? 1 : -1                                    // face the opponent's cast-time spot
    b.phase = "in"; b.t = 0; b.landX = f.x
    s.cancelWin = b.recovery; s.cancelUsed = false
    // 14f recovery: frozen in place (power commit), normals refused (moveFrames), the special gate left open so
    // the ONE Tail Whip / Sonic Slash cancel can come out; every other special is refused by beginCast (s.blur)
    f.attackCooldown = 0; f._benPowerCommit = b.recovery
    return
  }
  f._spriteCastMove = "xlBlurIn"; f._spriteCastTimer = 2
  if (b.t >= b.recovery) s.blur = null
}

// MACH CYCLONE: whirlwind spawned 300 px ahead, travels 220 px, 4 hits of 10, a bounded pull (6 px/f for 8f total,
// never past its centre, once per cyclone: no chain-lock). One on screen. Position lives here (GAME_STATE).
function tickCyclone(f, s, opp, api, ctx) {
  const c = s.cyclone; if (!c) return
  if (c.wait > 0) { c.wait--; if ((f.hitstun || 0) <= 0) { f._spriteCastMove = "xlCyclone"; f._spriteCastTimer = 2 } return }
  c.t++
  c.x += c.dir * (XL_CYCLONE.TRAVEL / XL_CYCLONE.FRAMES)
  if (opp && !opp.eliminated && c.pullLeft > 0) {
    const oc = opp.x + opp.w / 2, d = c.x - oc
    if (Math.abs(d) <= XL_CYCLONE.PULL_RADIUS) {
      const step = Math.sign(d) * Math.min(XL_CYCLONE.PULL, Math.abs(d))
      const L = ctx?.stageLeft ?? 0, R = (ctx?.stageWidth ?? 3200) - opp.w
      opp.x = Math.max(L, Math.min(R, opp.x + step)); c.pullLeft--; c.pulled += Math.abs(step)
    }
  }
  if ((c.t - 1) % XL_CYCLONE.HIT_EVERY === 0 && c.hits < XL_CYCLONE.HITS) {
    c.hits++
    api.spawnProjectile(f, "xl_cyclone_" + c.hits, { damage: XL_CYCLONE.DMG, speed: 0, vx: 0, vy: 0, spawnX: c.x, spawnY: c.floor - 60,
      w: 110, h: 120, radius: 60, lifetime: 2, isSpecial: true, noHitstop: c.hits < XL_CYCLONE.HITS, hitstun: 14, blockstun: 10,
      knockbackX: 0, knockbackY: c.hits === XL_CYCLONE.HITS ? -9 : -1, alien: { xl: true, kind: "cyclone", cast: c.cast, hidden: true } }, {})
  }
  if (c.t >= XL_CYCLONE.FRAMES) s.cyclone = null
}

// SONIC DIVE (air): forward-diagonal dive via the generic _benGlide, once per airtime, no jump refill, 45 dmg,
// bounces him back up a little on hit.
function tickDive(f, s, opp, api, grounded) {
  const d = s.dive; if (!d) return
  if ((f.hitstun || 0) > 0 || d.t++ > XL_DIVE.MAX || (grounded && d.t > 2) || d.hit) {
    delete f._benGlide; if (d.hit) { f.vy = XL_DIVE.BOUNCE; f.vx = -d.face * 3 }
    s.dive = null; return
  }
  const k = flashActive(s) ? XL_FLASH.SPEED : 1                                  // Flash Time movement ×1.8
  f._benGlide = { vx: d.face * XL_DIVE.VX * k, vy: XL_DIVE.VY * k }
  f._spriteCastMove = "xlDive"; f._spriteCastTimer = 2
  // lifetime 2: combat.updateProjectiles culls lifetime ≤ 0 BEFORE hits resolve (a lifetime-1 box never connected in-game);
  // the per-frame box replaces its previous copy so only one is ever live (no double hit)
  const live = api.activeProjectiles?.(); if (live) for (let i = live.length - 1; i >= 0; i--) if (live[i].owner === f && live[i].name === "xl_dive") live.splice(i, 1)
  api.spawnProjectile(f, "xl_dive", { damage: XL_DIVE.DMG, speed: 0, vx: 0, vy: 0, spawnX: f.x + f.w / 2 + d.face * 30, spawnY: f.y + f.h * 0.6,
    w: 90, h: 60, radius: 45, lifetime: 2, isSpecial: true, hitstun: 22, blockstun: 12, knockbackX: 5, knockbackY: -5,
    alien: { xl: true, kind: "dive", cast: d.cast, hidden: true } }, {})
}

// ── casts ────────────────────────────────────────────────────────────────────────────────────────────────
function beginCast(f, s, api, pose, cost, total, { kind = null, commit = true } = {}) {
  const cancel = s.cancelWin > 0 && !s.cancelUsed && (kind === "whip" || kind === "slash")   // Blur Step → one cancel
  if (!f.transformed || f.activeAlien !== "xlr8" || (!cancel && (f.attacking || (f.attackCooldown || 0) > 0 || s.blur)) ||
      (f.hitstun || 0) > 0 || (f.blockstun || 0) > 0 || s.ult) return false
  if (!api.spendEnergy(f, cost)) return false
  if (cancel) { s.cancelUsed = true; s.cancelWin = 0; s.cancels++; s.blur = null }
  f.isCharging = false; f.attacking = false
  f._benActionEpoch = (f._benActionEpoch || 0) + 1
  f._spriteCastMove = pose; f._spriteCastTimer = total
  f.attackCooldown = total; if (commit) { f._benPowerCommit = total; f.vx = 0 }
  s.castId++; s.lastCast = { at: s.t, id: s.castId, cost }
  return true
}
// P + L in EITHER ORDER: when L lands a few frames before P, the special it just started is UNDONE (cost refunded, its
// scheduled hits killed via the action epoch, its state + any hitbox removed) and Flash Time starts instead.
const UNDO_WIN = 6
function undoFreshSpecial(f, s, api) {
  const L = s.lastCast; s.lastCast = null
  if (!L || L.id !== s.castId || s.t - L.at > UNDO_WIN) return
  for (const k of ["slash", "blur", "whip", "cyclone", "dive"]) if (s[k] && s[k].cast === L.id) s[k] = null
  f._benActionEpoch = (f._benActionEpoch || 0) + 1
  if (L.cost && !f.infiniteEnergy) f.energy = Math.min(f.maxEnergy || 100, (f.energy || 0) + L.cost)
  f._benPowerCommit = 0; f.attackCooldown = 0; f.attacking = false; f._spriteCastMove = null; f._spriteCastTimer = 0; f._benLunge = null
  const list = api && api.activeProjectiles ? api.activeProjectiles() : null
  if (list) for (let i = list.length - 1; i >= 0; i--) if (list[i].owner === f && list[i].alien && list[i].alien.cast === L.id) list.splice(i, 1)
}
function chargeSpecial(f, ctx, api, o) {
  const s = xlState(f); if (!s) return false
  if (o && o.late) { if (!!(s.flashT > 0 || s.flashCd > 0) || (f.hitstun || 0) > 0 || s.ult) return false; undoFreshSpecial(f, s, api || _api) }
  return blockSpecial(f, ctx, api)
}

function hitbox(f, api, name, md) {   // alien.hidden: no generic coloured shape (ui.js) — the slash frames + hit sparks show the hit
  return api.spawnProjectile(f, name, { speed: 0, vx: 0, vy: 0, lifetime: 2, isSpecial: true, ...md, alien: { ...(md.alien || {}), hidden: true } }, {})
}

function fireSpecial(f, ctx, api) {
  const s = xlState(f); if (!s) return false
  if (s.swallow > 0) return false                                                 // the Flash Time press (still buffered)
  const dir = f._specialHeldDir || null, face = f.facing || 1
  if (!(f.onGround || f.grounded)) return (dir === null || dir === "F") ? castDive(f, s, api, face) : false   // air ↓↘→
  if (dir === "F") return castBlur(f, s, api, face, ctx)                          // →→ + P
  if (dir === "B") return castWhip(f, s, api, face)                               // ←↙↓ + P
  if (dir === "D") return castCyclone(f, s, api, face)                            // ↓↙← + P
  return castSlash(f, s, api, face)                                               // ↓↘→ + P
}

function castSlash(f, s, api, face) {
  const total = fs(s, XL_SLASH.TOTAL), st = fs(s, XL_SLASH.STARTUP)
  if (!beginCast(f, s, api, "xlSonicSlash", XL_COST.slash, total, { kind: "slash" })) return false
  const cast = s.castId
  s.slash = { t: 0, total, cast }
  f._benSfx = "xl_slash"
  // 380 px REAL travel (19 × 20 px, stage-clamped by physics), no tracking: the hitboxes ride his body
  api.scheduleBenSpawn(f, st, () => { f._benLunge = { frames: XL_SLASH.LUNGE_FRAMES, speed: face * XL_SLASH.LUNGE_SPEED } })
  XL_SLASH.HITS.forEach(([t, dmg], i) => {
    const at = st + fs(s, t), last = i === XL_SLASH.HITS.length - 1
    api.scheduleBenSpawn(f, at, () => hitbox(f, api, "xl_slash_" + i, { damage: dmg, spawnX: f.x + f.w / 2 + face * 40, spawnY: f.y + f.h * 0.55,
      w: 100, h: 70, radius: 50, noHitstop: !last, hitstun: last ? 22 : 14,
      blockstun: last ? Math.max(2, total - at + XL_SLASH.ON_BLOCK) : 12,                       // −12 on block
      knockbackX: last ? 7 : 1, knockbackY: last ? -4 : 0, alien: { xl: true, kind: "slash", cast } }))
  })
  return true
}

function castBlur(f, s, api, face, ctx) {
  if (s.blurCd > 0) return false
  const opp = api.getOpponent(f); if (!opp || opp.eliminated) return false
  const rec = fs(s, XL_BLUR.RECOVERY), st = fs(s, XL_BLUR.STARTUP)
  if (!beginCast(f, s, api, "xlBlurOut", XL_COST.blur, st + rec + 2, { kind: "blur" })) return false
  s.blurCd = XL_BLUR.COOLDOWN
  const oc = opp.x + opp.w / 2, mc = f.x + f.w / 2, dir = oc === mc ? face : Math.sign(oc - mc)
  // the opponent's position AT CAST TIME — never re-read afterwards (no tracking)
  s.blur = { t: 0, at: st, recovery: rec, phase: "out", cast: s.castId, behind: oc + dir * XL_BLUR.BEHIND, front: oc - dir * XL_BLUR.BEHIND,
    faceX: oc, fromX: f.x, fallback: false, landX: null }
  f._benSfx = "xl_blur"
  return true
}

function castWhip(f, s, api, face) {
  const total = fs(s, XL_WHIP.TOTAL)
  if (!beginCast(f, s, api, "xlTailWhip", XL_COST.whip, total, { kind: "whip" })) return false
  const cast = s.castId
  s.whip = { t: 0, total, cast }
  f._benSfx = "xl_whip"
  XL_WHIP.HITS.forEach(([t, dmg], i) => api.scheduleBenSpawn(f, fs(s, t), () => hitbox(f, api, "xl_whip_" + i, {
    damage: dmg, spawnX: f.x + f.w / 2 + face * XL_WHIP.RANGE / 2, spawnY: f.y + f.h - 22, w: XL_WHIP.RANGE, h: 44, radius: XL_WHIP.RANGE / 2,
    hitLevel: "low", noHitstop: i === 0, hitstun: i === 0 ? 16 : 30, blockstun: 12, knockbackX: i === 0 ? 1 : 6, knockbackY: i === 0 ? 0 : -6,
    alien: { xl: true, kind: i === 0 ? "whip" : "whipKD", cast } })))
  return true
}

function castCyclone(f, s, api, face) {
  if (s.cyclone) return false                                                     // one on screen
  const total = fs(s, XL_CYCLONE.TOTAL)
  if (!beginCast(f, s, api, "xlCyclone", XL_COST.cyclone, total, { kind: "cyclone" })) return false
  const c0 = f.x + f.w / 2
  s.cyclone = { cast: s.castId, wait: fs(s, XL_CYCLONE.STARTUP), t: 0, x: c0 + face * XL_CYCLONE.AHEAD, x0: c0 + face * XL_CYCLONE.AHEAD, dir: face,
    floor: f.y + f.h, hits: 0, pullLeft: XL_CYCLONE.PULL_FRAMES, pulled: 0 }
  f._benSfx = "xl_cyclone"
  return true
}

function castDive(f, s, api, face) {
  if (s.diveUsed || s.dive) return false                                          // once per airtime
  const jc = f.jumpCount
  if (!beginCast(f, s, api, "xlDive", XL_COST.dive, 24, { kind: "dive", commit: false })) return false
  f.jumpCount = jc                                                                // no jump refill
  s.diveUsed = true
  s.dive = { t: 0, face, cast: s.castId, hit: false }
  f._benSfx = "xl_dive"
  return true
}

// Combat calls this after a contact this fighter OWNS lands (melee or projectile, blocked or clean).
function onContact(f, target, { proj = null, move = null, blocked = false } = {}) {
  const s = xlState(f); if (!s || !target) return
  if (proj && proj.visualOnly) return
  const a = proj ? proj.alien : null
  if (!blocked) {
    const kind = a && a.xl ? a.kind : null
    if (kind !== "ultOpener") scheduleEcho(f, s, target, proj ? (proj.damage || 0) : (move?.damage || 0))
    if (kind === "whipKD") { target.knockdownState = true; target.knockdownTimer = Math.max(target.knockdownTimer || 0, 40) }   // 2nd Tail Whip hit knocks down
    if (kind === "dive" && s.dive && s.dive.cast === a.cast) s.dive.hit = true
    if (kind === "ultOpener" && s.ult && s.ult.phase === "opener" && !target.eliminated) startUltCinematic(f, s, target)
  } else if (a && a.kind === "dive" && s.dive && s.dive.cast === a.cast) s.dive.hit = true
}

// ── ultimate: TIME SPRINT (same input as Omnitrix Overload, alien form only) ───────────────────────────────
function fireUltimate(f, ctx, api) {
  const s = xlState(f); if (!s) return false
  if (!beginCast(f, s, api, "xlSonicSlash", XL_COST.ultimate, XL_ULT.STARTUP + XL_ULT.WHIFF_RECOVERY)) return false
  const face = f.facing || 1
  s.ult = { phase: "opener", t: 0, face, raw: 0, cast: s.castId }
  f._benSfx = "xl_ult"
  api.focusCamera?.(f, api.getOpponent(f), 0.92, 20)
  api.scheduleBenSpawn(f, XL_ULT.STARTUP, () => hitbox(f, api, "xl_ult_opener", { damage: XL_ULT.OPENER, spawnX: f.x + f.w / 2 + face * 70,
    spawnY: f.y + f.h * 0.5, w: 140, h: 90, radius: 70, lifetime: 3, isUltimate: true, hitstun: 40, blockstun: 16, knockbackX: 0, knockbackY: 0,
    alien: { xl: true, kind: "ultOpener", cast: s.castId } }))
  return true                                                                     // whiff / block: 60f recovery, no cinematic
}
function startUltCinematic(f, s, target) {
  const u = s.ult
  u.phase = "circle"; u.t = 0; u.raw = XL_ULT.OPENER
  u.home = { x: f.x, y: f.y }; u.thome = { x: target.x, y: target.y }
  f.attackCooldown = XL_ULT.END + XL_ULT.LOCKOUT; f._benPowerCommit = XL_ULT.END; f._spriteCastTimer = XL_ULT.END
  f.invulnTimer = Math.max(f.invulnTimer || 0, XL_ULT.END + 2)
}
function tickUlt(f, s, opp, api, ctx) {
  const u = s.ult; if (!u) return
  if (u.phase === "opener") { if (++u.t > 24) s.ult = null; return }
  if (!opp || opp.eliminated) { endUlt(f, s, null); return }
  u.t++
  // the target is held in dilated time where the opener caught it
  opp.hitstun = Math.max(opp.hitstun || 0, 8); opp.vx = 0; opp.vy = 0; opp.x = u.thome.x
  opp.attacking = false; opp.currentAttack = null
  f.vx = 0; f.vy = 0
  if (u.t < XL_ULT.LAUNCH_AT) {                                                   // 2. circling: 8 slashes × 12
    opp.y = u.thome.y
    if (u.t % 6 === 0) {                                                          // a new hash-positioned spot around the target
      const r = xlHash(ctx?.seed ?? 1, ctx?.frame ?? u.t, pIndex(f), u.t)
      f.x = u.thome.x + opp.w / 2 - f.w / 2 + Math.cos(r * Math.PI * 2) * 110; f.y = u.home.y
      f.facing = f.x + f.w / 2 < u.thome.x + opp.w / 2 ? 1 : -1
    }
    f._spriteCastMove = "xlUltCircle"; f._spriteCastTimer = 2
    if (XL_ULT.SLASH_AT.includes(u.t)) { api.applyScaledDamage(opp, XL_ULT.SLASH, { attacker: f, move: "timeSprint", source: "ability" }); u.raw += XL_ULT.SLASH; opp.colorFlash = 4 }
  } else if (u.t < XL_ULT.FINAL_AT) {                                             // 3a. launch + cyclone lift
    if (u.t === XL_ULT.LAUNCH_AT) { f.x = u.home.x; f.facing = u.face }
    opp.y = u.thome.y - Math.min(XL_ULT.LIFT, (u.t - XL_ULT.LAUNCH_AT) * 8)
    f._spriteCastMove = "xlUltLaunch"; f._spriteCastTimer = 2
  } else {                                                                        // 3b. sonic-boom drop: 100 (+4 rounding)
    opp.y = u.thome.y
    f._spriteCastMove = "xlUltDrop"; f._spriteCastTimer = 2
    if (u.t === XL_ULT.FINAL_AT) {
      api.applyScaledDamage(opp, XL_ULT.FINAL, { attacker: f, move: "timeSprint", source: "ability" }); u.raw += XL_ULT.FINAL
      u.ringAt = u.t; api.shake?.(12, 14)
    }
  }
  if (u.t >= XL_ULT.END) endUlt(f, s, opp)
}
function endUlt(f, s, opp) {
  const u = s.ult
  if (u?.home) { f.x = u.home.x; f.y = u.home.y; f.vx = 0; f.vy = 0; f.facing = u.face }   // positions restore
  if (opp && u?.thome) { opp.x = u.thome.x; opp.y = u.thome.y; opp.hitstun = Math.max(opp.hitstun || 0, 30); opp.vx = u.face * 10; opp.vy = -8 }
  s.lastUltRaw = u?.raw || 0
  s.ult = null                                                                    // colour restores
  f.attackCooldown = XL_ULT.LOCKOUT; f._benPowerCommit = XL_ULT.LOCKOUT; f._spriteCastMove = null; f._spriteCastTimer = 0
}

// ── RENDER-ONLY (reads GAME_STATE, never writes it; no sim effect) ────────────────────────────────────────────
export function drawXlr8Hud(ctx, f, { x, enY, enH = 8, pbw, flip }) {
  const s = xlState(f); if (!ctx || !s) return
  const y = enY + enH + 3, h = 5
  ctx.save()
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(x + 8, y, pbw, h)
  const frac = s.flashT > 0 ? s.flashT / XL_FLASH.DURATION : 1 - s.flashCd / XL_FLASH.COOLDOWN
  const col = s.flashT > 0 ? "#7dd3fc" : s.flashCd > 0 ? "#64748b" : "#38bdf8"
  const w = pbw * Math.max(0, Math.min(1, frac))
  ctx.fillStyle = col; ctx.fillRect(flip ? x + 8 + pbw - w : x + 8, y, w, h)
  const label = s.flashT > 0 ? `FLASH TIME ${Math.ceil(s.flashT / 60 * 10) / 10}s · ECHO ${s.echoCount}/${XL_ECHO.MAX}` : s.flashCd > 0 ? `FLASH TIME ${Math.ceil(s.flashCd / 60)}s` : "FLASH TIME READY (P + L)"
  ctx.font = "bold 8px Arial"; ctx.textBaseline = "top"; ctx.textAlign = flip ? "right" : "left"
  ctx.fillStyle = col; ctx.fillText(label, flip ? x + 8 + pbw : x + 8, y + h + 1)
  ctx.restore()
}
const _imgs = {}
function sheetImg(src) {
  if (typeof Image === "undefined") return null
  if (!_imgs[src]) { const im = new Image(); im.src = src; _imgs[src] = im }
  return _imgs[src].complete && _imgs[src].naturalWidth ? _imgs[src] : null
}
const _trail = new WeakMap()   // render-only afterimage memory (outside GAME_STATE)
// The tint is applied on a small OFFSCREEN canvas (source-atop there only touches his pixels), then drawn onto the stage —
// source-atop on the stage canvas itself painted a solid tinted rectangle over the background behind every afterimage.
let _tintCv = null
function tintedFrame(img, sx, fw, fh, tint) {
  if (typeof document === "undefined") return null
  if (!_tintCv) _tintCv = document.createElement("canvas")
  if (_tintCv.width !== fw || _tintCv.height !== fh) { _tintCv.width = fw; _tintCv.height = fh }
  const t = _tintCv.getContext("2d"); t.clearRect(0, 0, fw, fh); t.globalCompositeOperation = "source-over"
  t.drawImage(img, sx, 0, fw, fh, 0, 0, fw, fh)
  t.globalCompositeOperation = "source-atop"; t.fillStyle = tint; t.fillRect(0, 0, fw, fh); t.globalCompositeOperation = "source-over"
  return _tintCv
}
function ghost(c, a, fi, cx, feetY, face, alpha, tint = null) {
  const img = sheetImg(a.sheet); if (!img) return
  const sc = a.actionScale * 2, fw = a.width, fh = a.height, sx = (fi % a.frames) * fw
  const src = tint ? tintedFrame(img, sx, fw, fh, tint) : null
  c.save(); c.globalAlpha = alpha; c.translate(Math.round(cx), Math.round(feetY)); if (face < 0) c.scale(-1, 1)
  if (src) c.drawImage(src, 0, 0, fw, fh, -fw * sc / 2, -a.originY * sc, fw * sc, fh * sc)
  else c.drawImage(img, sx, 0, fw, fh, -fw * sc / 2, -a.originY * sc, fw * sc, fh * sc)
  c.restore()
}
export function drawXlr8Fx(c, f, frame = 0, opp = null) {
  const s = xlState(f); if (!c || !s) return
  c.save(); c.imageSmoothingEnabled = false
  const cx = f.x + f.w / 2, feet = f.y + f.h
  // Flash Time / Sonic Slash / Mach Cyclone afterimages: his recent positions, translucent blue
  let tr = _trail.get(f); if (!tr) { tr = []; _trail.set(f, tr) }
  tr.push({ cx, feet, face: f.facing || 1 }); if (tr.length > 10) tr.shift()
  if (flashActive(s) || s.slash || s.cyclone || s.dive) {
    for (let i = 0; i < tr.length - 1; i += 3) ghost(c, ANIM.run, frame >> 1, tr[i].cx, tr[i].feet, tr[i].face, 0.12 + 0.05 * i / 3, "rgba(56,189,248,0.6)")
  }
  // echo ghosts: a translucent XLR8 at each pending echo, fading in toward the strike
  for (const e of s.echoes) {
    const k = 1 - Math.max(0, e.at - s.t) / XL_ECHO.DELAY
    ghost(c, ANIM.heavy, Math.min(2, Math.floor(k * 3)), e.x - (f.facing || 1) * 40, e.y + f.h / 2, f.facing || 1, 0.25 + 0.4 * k, "rgba(125,211,252,0.7)")
  }
  // Blur Step streak bars
  if (s.blur) {
    const fx = XLR8_FX.streakBar, img = sheetImg(fx.sheet)
    if (img) { c.globalAlpha = s.blur.phase === "out" ? 0.85 : Math.max(0, 0.85 - s.blur.t / 10); c.drawImage(img, cx - fx.w * 1.5, feet - fx.h * 3, fx.w * 3, fx.h * 3) }
  }
  // Mach Cyclone whirlwind (procedural pixel rings)
  if (s.cyclone && s.cyclone.wait <= 0) {
    const x = s.cyclone.x, y = s.cyclone.floor
    c.fillStyle = "rgba(186,230,253,0.85)"
    for (let r = 0; r < 6; r++) for (let k = 0; k < 10; k++) {
      const ang = k / 10 * Math.PI * 2 + frame * 0.35 + r
      const rad = 18 + r * 9
      c.fillRect(Math.round(x + Math.cos(ang) * rad) - 2, Math.round(y - 10 - r * 20 + Math.sin(ang) * 6) - 2, 4, 4)
    }
  }
  // Time Sprint: afterimages at the hash spots around the target + the sonic-boom shock ring
  if (s.ult && s.ult.phase !== "opener" && s.ult.thome) {
    const u = s.ult, tcx = u.thome.x + (opp?.w || 60) / 2
    if (u.t < XL_ULT.LAUNCH_AT) for (let i = 0; i < 6; i++) {
      const a = ((u.t >> 1) + i * 1.05) % (Math.PI * 2)
      ghost(c, ANIM.run, i, tcx + Math.cos(a) * 110, feet, Math.sin(a) > 0 ? 1 : -1, 0.35, "rgba(56,189,248,0.5)")
    }
    if (u.ringAt != null && u.t - u.ringAt < 14) {
      const k = (u.t - u.ringAt) / 14, rad = 30 + k * 160
      c.globalAlpha = 1 - k; c.fillStyle = "#e0f2fe"
      for (let i = 0; i < 40; i++) { const a = i / 40 * Math.PI * 2; c.fillRect(Math.round(tcx + Math.cos(a) * rad) - 3, Math.round(u.thome.y + (opp?.h || 110) + Math.sin(a) * rad * 0.25) - 3, 6, 6) }
    }
  }
  c.restore()
}
// Grey world: a saturation wash drawn UNDER both fighters (both stay in colour). Time Sprint = full, Flash Time = light.
export function drawXlr8Under(c, f) {
  const s = xlState(f); if (!c || !s) return
  const ult = s.ult && s.ult.phase !== "opener"
  if (!ult && !flashActive(s)) return
  c.save()
  c.globalCompositeOperation = "saturation"; c.globalAlpha = ult ? 1 : 0.55; c.fillStyle = "#808080"
  c.fillRect(-4000, -4000, 16000, 12000)
  c.restore()
}

// SPEED TRAIL (render-only, outside GAME_STATE): afterimages of his FULL current sprite frame (replayed from the
// sprite handler's last draw, so every pose — run, slash, dive, blink — leaves its own ghost) + blue speed lines
// streaking from the oldest ghost to his body. Shows whenever he is moving fast; a Killua-style blink leaves the
// whole line stretched across the gap he crossed. Drawn BEHIND the body.
const _after = new WeakMap(), _prevPos = new WeakMap()
export const xlTrailCount = f => (_after.get(f) || []).length   // harness: live afterimage count
export function drawXlr8Behind(c, f, frame = 0) {
  const s = xlState(f); if (!c) return
  if (!s) { _after.delete(f); _prevPos.delete(f); return }
  let buf = _after.get(f); if (!buf) { buf = []; _after.set(f, buf) }
  // the sprite handler's _lastRender is the PREVIOUS frame's draw → pair it with the previous frame's position
  const prev = _prevPos.get(f) || { cx: f.x + f.w / 2 }; _prevPos.set(f, { cx: f.x + f.w / 2 })
  const lr = f.spriteHandler && f.spriteHandler._lastRender
  const spd = Math.abs(f.vx || 0) + Math.abs(f._benLunge ? f._benLunge.speed || 0 : 0) + Math.abs(f._benGlide ? f._benGlide.vx || 0 : 0)
  const fast = spd > 7 || (f.dashTimer || 0) > 0 || !!f.airDashing || (f.teleportFlash || 0) > 0 || flashActive(s) ||
    !!(s.slash || s.cyclone || s.dive || s.blur || (s.ult && s.ult.phase !== "opener"))
  if (fast && lr && lr.sheet && lr.sheet.complete && lr.sheet.naturalWidth > 0 && !f._animFrozen && (frame & 1) === 0) {
    buf.push({ sheet: lr.sheet, sx: lr.sx, sy: lr.sy, dw: lr.dw, dh: lr.dh, fx: lr.fx, offsetX: lr.offsetX, drawY: lr.drawY,
      dstW: lr.dstW, dstH: lr.dstH, facing: lr.facing, cx: prev.cx, life: 16 })
    while (buf.length > 8) buf.shift()
  }
  if (!buf.length) return
  c.save(); c.imageSmoothingEnabled = false
  // speed lines: oldest ghost → his back, at staggered heights (pattern advances with the frame; render-only)
  const old = buf[0], cx = f.x + f.w / 2, face = cx >= old.cx ? 1 : -1
  const span = Math.abs(cx - old.cx)
  if (span > 20) {
    const a0 = Math.min(1, old.life / 16), bx = cx - face * f.w * 0.25, tail = old.cx - face * 40
    // his own blur-bar art (blue / black / blue, from the sheet) stretched along the path, fading toward the tail
    const bar = sheetImg(XLR8_FX.streakBar.sheet)
    if (bar) {
      const N = 10, len = Math.abs(bx - tail), by = f.y + f.h * 0.42, bh = f.h * 0.3
      for (let i = 0; i < N; i++) {
        const t0 = i / N, x = face > 0 ? tail + len * t0 : tail - len * (t0 + 1 / N)
        c.globalAlpha = 0.7 * a0 * (0.15 + 0.85 * t0)
        c.drawImage(bar, 0, 0, bar.width, bar.height, x, by - bh / 2, len / N + 1, bh)
      }
    }
    // speed lines: white cores + blue edges at staggered heights (pattern advances with the frame; render-only)
    c.globalAlpha = 1
    for (let i = 0; i < 9; i++) {
      const k = ((i * 37 + (frame >> 1) * 13) % 100) / 100
      const y = f.y + f.h * (0.08 + 0.84 * k)
      const x0 = tail - face * (20 + 60 * ((i * 53) % 7) / 7)
      const g = c.createLinearGradient(x0, y, bx, y)
      g.addColorStop(0, "rgba(56,189,248,0)"); g.addColorStop(0.5, `rgba(56,189,248,${0.75 * a0})`); g.addColorStop(1, `rgba(255,255,255,${0.95 * a0})`)
      c.strokeStyle = g; c.lineWidth = i % 3 === 0 ? 5 : 2.5
      c.beginPath(); c.moveTo(x0, y); c.lineTo(bx, y); c.stroke()
    }
  }
  // afterimages: the full sprite frame at each past position, blue-shifted, older = fainter
  for (let i = 0; i < buf.length; i++) {
    const g = buf[i], a = 0.7 * (g.life / 16) * ((i + 1) / buf.length)
    if (a > 0.015 && g.sheet.complete) {
      c.globalAlpha = a
      c.filter = "sepia(1) saturate(6) hue-rotate(165deg) brightness(1.1) drop-shadow(0 0 6px rgba(56,189,248,0.95))"
      if (g.facing === -1) { c.save(); c.scale(-1, 1); c.drawImage(g.sheet, g.sx, g.sy, g.dw, g.dh, -g.fx + g.offsetX - g.dstW, g.drawY, g.dstW, g.dstH); c.restore() }
      else c.drawImage(g.sheet, g.sx, g.sy, g.dw, g.dh, g.fx - g.offsetX, g.drawY, g.dstW, g.dstH)
      c.filter = "none"
    }
    if (!f._animFrozen) g.life--
  }
  c.restore()
  _after.set(f, buf.filter(g => g.life > 0))
}
