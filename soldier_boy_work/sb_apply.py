#!/usr/bin/env python3
"""Private-index committer for the Soldier Boy build.

The feat/superman checkout is shared with a LIVE concurrent Superman session that commits to the same
engine files (abilities.js / combat.js / game.js / sound.js). This tool commits ONLY my hunks + my new
files, built on the CURRENT committed HEAD tree — it never stages the superman session's files, never
touches the shared index or working tree.

ENGINE EDITS are applied IDEMPOTENTLY against HEAD's blob:
  - if `new` already present  -> skip (already applied, or a clobber already healed)
  - elif `old` present        -> replace the FIRST occurrence with `new`
  - else                      -> ABORT (anchor shape changed upstream; needs manual review)
Because the FULL cumulative set is re-asserted every run, a superman commit that clobbers my tip is
healed on my next commit. update-ref is guarded on the old HEAD and retried if HEAD moved mid-build.

Usage:  python3 soldier_boy_work/sb_apply.py <msg_file> [newfile1 newfile2 ...]
"""
import subprocess, sys, os, tempfile
from collections import OrderedDict

BRANCH = "refs/heads/feat/superman"


def git(*args, env=None, inp=None):
    return subprocess.run(["git", *args], capture_output=True, text=True, env=env, input=inp)


def blob_at(head, path):
    r = git("show", f"{head}:{path}")
    if r.returncode != 0:
        raise SystemExit(f"[sb_apply] cannot read {path}@{head}: {r.stderr.strip()}")
    return r.stdout


# ── Big inserted blocks (kept as module vars so the EDITS tuples stay readable) ──────────────────
SB_ABILITIES_P3 = '''// ═══════════════════════════════════════════════════════════════════════════════════════════════
// SOLDIER BOY — kit helpers + ARMED MODE (Phase 3). Grounded Bruiser/Gunner (The Boys, Marvel group).
// All randomness is deterministic hash(seed, frame, playerIndex) — no Math.random / gameRng. The Phase 4
// motion specials + Nuclear Burst ultimate build on these shared SMG/rifle/shield spawns.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
function isSoldierBoy(f) { return !!f && (f.rosterKey || "").toLowerCase() === "soldier_boy" }
function sbIdx(f) { return (f && (f.side === "p2" || f.playerIndex === 1)) ? 1 : 0 }
// local deterministic 0..1 hash (mirrors flight.js hashRandom; kept local so abilities.js needs no new import)
function sbHash(seed, frame, idx) {
  let h = ((seed | 0) ^ 0x9e3779b9) >>> 0
  h = Math.imul(h ^ ((frame | 0) + 0x85ebca6b), 0xcc9e2d51) >>> 0
  h = Math.imul(h ^ ((idx | 0) + 0x27d4eb2f), 0x1b873593) >>> 0
  h ^= h >>> 15; h = Math.imul(h, 0x85ebca6b) >>> 0; h ^= h >>> 13
  return (h >>> 0) / 4294967296
}

// Tunables (frames @60fps; Charge = the Nuclear Charge meter).
const SB_SMG    = { bullets: 6, perBullet: 12, overFrames: 30, speed: 19, cost: 20 }
const SB_RIFLE  = { damage: 90, speed: 22, startup: 20, cost: 25 }
const SB_SHIELD = { out: 40, back: 22, range: 420, speed: 15, cost: 15 }
const SB_ARMED  = { dur: 720, drainPerFrame: 0.025, cdFrames: 480, smgBullets: 4, smgDmg: 12, rifleDmg: 60 }

// SFX hook — fleshed out in Phase 7 (WebAudio placeholder synth, +/-3% pitch from sbHash). No-op until then.
function sbSound(fighter, id, context) { /* Phase 7 */ }

// ── Shared projectile spawns (used by the Armed-Mode normals AND the Phase-4 specials) ──
function sbSpawnSMG(fighter, context, bullets, perDmg) {
  const seed = ((context && context.seed) >>> 0) || 1, idx = sbIdx(fighter)
  const baseFrame = (context && context.frame) || 0
  for (let i = 0; i < bullets; i++) {
    const at = Math.round(i * (SB_SMG.overFrames / Math.max(1, bullets)))
    const fAt = baseFrame + i
    schedulePendingSpawn(at, () => {
      const spread = (sbHash(seed, fAt, idx) - 0.5) * 12            // +/-6px vertical, deterministic (no Math.random)
      spawnProjectile(fighter, "sbSmgBullet", {
        damage: perDmg, speed: SB_SMG.speed, lifetime: 54, hitstun: 8,
        knockbackX: 2, knockbackY: 0, w: 12, h: 6, radius: 5, isSpecial: true,
        color: "#ffcc33", spawnY: fighter.y + (fighter.h || 100) * 0.42 + spread
      }, context)
    })
  }
}
function sbSpawnRifle(fighter, context, dmg) {
  spawnProjectile(fighter, "sbRifleBullet", {
    damage: dmg, speed: SB_RIFLE.speed, lifetime: 72, hitstun: 20,
    knockbackX: 11, knockbackY: -3, w: 22, h: 6, radius: 8, isSpecial: true,
    piercesMulti: true, color: "#e0a040", spawnY: fighter.y + (fighter.h || 100) * 0.42
  }, context)
}

// ── ARMED MODE (loadout swap; Ghostface killer-swap pattern) ──
function endSoldierBoyArmed(fighter) {
  fighter._sbArmed = false
  fighter._sbArmedTimer = 0
  fighter._sbArmedCd = SB_ARMED.cdFrames          // 8s cooldown after it ends OR is cancelled
  fighter._spriteCastMove = "sbArmedDraw"; fighter._spriteCastTimer = 18   // holster pose
}
export function toggleSoldierBoyArmed(fighter, context) {
  if (!isSoldierBoy(fighter) || fighter.isUltimateActive) return false
  if (fighter._sbArmed) { endSoldierBoyArmed(fighter); return true }       // re-press = cancel (-> cooldown)
  if ((fighter._sbArmedCd || 0) > 0) return false                         // on cooldown
  fighter._sbArmed = true
  fighter._sbArmedTimer = SB_ARMED.dur             // 12s
  fighter._spriteCastMove = "sbArmedDraw"; fighter._spriteCastTimer = 18   // draw pose
  sbSound(fighter, "sb_armedToggle", context)
  return true
}
// Ticked every frame from game.js updateMiscTimers. Drains Charge, counts the 12s window + 8s cooldown,
// and auto-holsters when the timer or the meter runs out, or when the Ultimate starts.
export function updateSoldierBoyArmed(fighter) {
  if (!isSoldierBoy(fighter)) return
  if ((fighter._sbArmedCd || 0) > 0) fighter._sbArmedCd--
  if (!fighter._sbArmed) return
  if (fighter.isUltimateActive) { endSoldierBoyArmed(fighter); return }   // unavailable during the Ultimate
  fighter.energy = Math.max(0, (fighter.energy || 0) - SB_ARMED.drainPerFrame)   // 1.5 Charge/s
  if ((fighter.energy || 0) <= 0) { endSoldierBoyArmed(fighter); return }
  if ((fighter._sbArmedTimer || 0) > 0 && --fighter._sbArmedTimer <= 0) endSoldierBoyArmed(fighter)
}
function fireSoldierBoyArmedSMG(fighter, context) {
  fighter._spriteCastMove = "sbArmedJab"; fighter._spriteCastTimer = 14
  sbSpawnSMG(fighter, context, SB_ARMED.smgBullets, SB_ARMED.smgDmg)       // armed Jab = a 4-round SMG check (FREE normal)
  sbSound(fighter, "sb_smg", context)
  fighter.attackCooldown = getAttackDuration(14, fighter)
}
function fireSoldierBoyArmedRifle(fighter, context) {
  fighter._spriteCastMove = "sbArmedHeavy"; fighter._spriteCastTimer = 20
  sbSpawnRifle(fighter, context, SB_ARMED.rifleDmg)                        // armed Heavy = a 60-dmg rifle shot (FREE normal)
  sbSound(fighter, "sb_rifle", context)
  fighter.attackCooldown = getAttackDuration(20, fighter)
}
// Command-combat driver (mirrors updateSpidermanCommandCombat). Handles the Down+Heavy ARMED toggle and,
// while armed, swaps Jab->SMG / Heavy->rifle (the Up-Launcher stays melee). Returns true when it consumes
// the input (-> the caller skips the normal path this frame).
export function updateSoldierBoyCommandCombat(fighter, inputState, context) {
  if (!isSoldierBoy(fighter) || !inputState) return false
  const lightEdge = !!inputState.light && !fighter._sbPrevLight
  const heavyEdge = !!inputState.heavy && !fighter._sbPrevHeavy
  fighter._sbPrevLight = !!inputState.light
  fighter._sbPrevHeavy = !!inputState.heavy
  const canAct = !fighter.attacking && !fighter.currentMove && (fighter.attackCooldown || 0) <= 0
  // TOGGLE: Down + Heavy (fresh), grounded. Works whether or not already armed (re-press cancels).
  if (canAct && heavyEdge && inputState.down && (fighter.grounded ?? fighter.onGround ?? true)) {
    if (toggleSoldierBoyArmed(fighter, context)) { inputState.heavy = false; return true }
  }
  // While ARMED: Jab->SMG, Heavy->rifle. Up-Launcher (Up held) stays melee -> not intercepted.
  if (fighter._sbArmed && canAct && !inputState.up) {
    if (lightEdge) { fireSoldierBoyArmedSMG(fighter, context);  inputState.light = false; return true }
    if (heavyEdge) { fireSoldierBoyArmedRifle(fighter, context); inputState.heavy = false; return true }
  }
  return false
}

'''

SB_ABILITIES_P4 = '''// ═══════════════════════════════════════════════════════════════════════════════════════════════
// SOLDIER BOY — SPECIALS + NUCLEAR BURST ULTIMATE (Phase 4). Normals (Jab/Heavy/Low/Launcher/Air) come
// from characters.js basic_attacks. Input mapping uses the engine's held-direction special system (same
// convention as Goku/Homelander; motionInput.js is Naruto-only): N=Gold Rush, F=Shield Toss, B=Rifle Shot,
// U=Cape Cyclone, Down(ground)=SMG Barrage, Down(air)=Diving Kick; Ultimate button = Nuclear Burst.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
const SOLDIER_BOY_SPECIALS = {
  // melee specials (createAttackFromMove). Damage values are UNSCALED (global 0.60 applied in applyScaledDamage).
  sbGoldRush: { damage: 85, startup: 6, active: 8,  recovery: 28, hitstun: 24, knockbackX: 10, knockbackY: -3, rangeX: 120, rangeY: 62,  cost: 20, advance: 18 },
  sbCyclone:  { damage: 30, startup: 4, active: 14, recovery: 16, hitstun: 14, knockbackX: 4,  knockbackY: -5, rangeX: 96,  rangeY: 150, cost: 25 },   // 3-hit spin (re-armed hitbox)
  sbDive:     { damage: 60, startup: 8, active: 12, recovery: 12, hitstun: 20, knockbackX: 5,  knockbackY: 8,  rangeX: 92,  rangeY: 80,  cost: 15 },
}

// ── GOLD RUSH (neutral+Special) — armored forward lunge; one hit absorbed in startup f1-6 ──
function fireSbGoldRush(fighter, context) {
  const md = SOLDIER_BOY_SPECIALS.sbGoldRush
  if (!spendEnergy(fighter, md.cost)) return false
  const attack = createAttackFromMove(fighter, "sbGoldRush", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.isSpecial = true
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)
  fighter._castArmor = Math.max(fighter._castArmor || 0, md.startup)      // absorb one hit during startup f1-6 (combat.js castArmored; ticks in game.js)
  fighter.vx = (fighter.facing || 1) * (md.advance || 18)                // armored lunge travels forward
  sbSound(fighter, "sb_goldRush", context)
  return true
}
// ── CAPE CYCLONE (Up+Special) — anti-air spin: 3 hits of 30, upper-body invuln on active f3-8 ──
function fireSbCapeCyclone(fighter, context) {
  const md = SOLDIER_BOY_SPECIALS.sbCyclone
  if (!spendEnergy(fighter, md.cost)) return false
  const attack = createAttackFromMove(fighter, "sbCyclone", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.isSpecial = true
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)
  // re-arm the hitbox twice inside the active window → up to 3 hits of 30 (the spin).
  schedulePendingSpawn(md.startup + 4, () => { if (fighter.currentMove === "sbCyclone" && fighter.currentAttack) fighter.currentAttack.hasHit = false })
  schedulePendingSpawn(md.startup + 8, () => { if (fighter.currentMove === "sbCyclone" && fighter.currentAttack) fighter.currentAttack.hasHit = false })
  fighter.invulnTimer = Math.max(fighter.invulnTimer || 0, 8)            // upper-body invuln (active f3-8)
  sbSound(fighter, "sb_cyclone", context)
  return true
}
// ── DIVING KICK (air Down+Special) — angled overhead dive ──
function fireSbDivingKick(fighter, context) {
  const md = SOLDIER_BOY_SPECIALS.sbDive
  if (!spendEnergy(fighter, md.cost)) return false
  const attack = createAttackFromMove(fighter, "sbDive", md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  attack.isSpecial = true; attack.spike = true
  setAttackState(fighter, attack, md.startup + md.active + md.recovery)
  fighter.vx = (fighter.facing || 1) * 10; fighter.vy = 12               // dive down-forward
  sbSound(fighter, "sb_dive", context)
  return true
}
// ── SHIELD TOSS (Fwd+Special) — gold boomerang, 420px round-trip, ONE on screen (= its cooldown) ──
function fireSbShieldToss(fighter, context) {
  if (activeProjectiles.some(p => p && p.name === "sbShield" && p.owner === fighter)) return false   // one on screen at a time
  if (!spendEnergy(fighter, SB_SHIELD.cost)) return false
  fighter._spriteCastMove = "sbShieldThrow"; fighter._spriteCastTimer = 18
  spawnProjectile(fighter, "sbShield", {
    damage: SB_SHIELD.out, speed: SB_SHIELD.speed, hitstun: 16, knockbackX: 6, knockbackY: -2,
    w: 46, h: 46, radius: 24, isSpecial: true, boomerang: true,
    maxRange: SB_SHIELD.range, retractSpeed: SB_SHIELD.speed, color: "#c9a227",
    sheet: "./soldier_boy_shieldproj_uniform.png", spriteFrames: 6, spriteW: 149, spriteH: 63, spriteSpeed: 2, spriteScale: 1.1,
    spawnY: fighter.y + (fighter.h || 100) * 0.42
  }, context)
  fighter.attackCooldown = getAttackDuration(16, fighter)
  sbSound(fighter, "sb_shield", context)
  return true
}
// ── SMG BARRAGE (Down+Special, ground) — 6 bullets over 30f, 12 each, hashed +/-6px spread ──
function fireSbSMGBarrage(fighter, context) {
  if (!spendEnergy(fighter, SB_SMG.cost)) return false
  fighter._spriteCastMove = "sbSMG"; fighter._spriteCastTimer = 30
  sbSpawnSMG(fighter, context, SB_SMG.bullets, SB_SMG.perBullet)
  fighter.attackCooldown = getAttackDuration(30, fighter)
  sbSound(fighter, "sb_smg", context)
  return true
}
// ── RIFLE SHOT (Back+Special) — 20f startup, fast piercing round, 90 dmg, strong knockback ──
function fireSbRifleShot(fighter, context) {
  if (!spendEnergy(fighter, SB_RIFLE.cost)) return false
  fighter._spriteCastMove = "sbRifle"; fighter._spriteCastTimer = SB_RIFLE.startup + 10
  schedulePendingSpawn(SB_RIFLE.startup, () => sbSpawnRifle(fighter, context, SB_RIFLE.damage))   // 20f startup
  fighter.attackCooldown = getAttackDuration(SB_RIFLE.startup + 14, fighter)
  sbSound(fighter, "sb_rifle", context)
  return true
}

// ── SPECIAL ROUTER (held-direction). Called from triggerSpecial. ──
function executeSoldierBoySpecial(fighter, context = {}) {
  if (!isSoldierBoy(fighter)) return false
  if (fighter.attacking || (fighter.attackCooldown || 0) > 0) return false
  const air = !(fighter.onGround ?? fighter.grounded ?? true)
  const dir = fighter._specialHeldDir || null
  if (air) return (dir === "D") ? fireSbDivingKick(fighter, context) : false   // AIR Down = Diving Kick
  if (dir === "F") return fireSbShieldToss(fighter, context)     // toward  (canonical qcf)
  if (dir === "B") return fireSbRifleShot(fighter, context)      // away    (canonical qcb)
  if (dir === "U") return fireSbCapeCyclone(fighter, context)    // up      (anti-air dp)
  if (dir === "D") return fireSbSMGBarrage(fighter, context)     // down    (down-down)
  return fireSbGoldRush(fighter, context)                        // neutral = armored lunge (dash)
}

// ── NUCLEAR BURST (Ultimate button) — needs the FULL meter. 3-phase radial blast (r=360),
// 80+80+120 = 280 unscaled, 90f recovery lockout. White/orange flash, radial particles and shake are
// RENDER-ONLY (drawn in game.js from _sbNuke* render flags; not in GAME_STATE). Does NOT set
// isUltimateActive (that forces the idle pose) — the 90f attackCooldown is the lockout. ──
function executeSoldierBoyUltimate(fighter, context = {}) {
  if (!isSoldierBoy(fighter)) return false
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (context && context.cinematicSafe === false) return false            // refuse during KO/Brutality/domains/rewind
  if (!spendEnergy(fighter, 100)) return false                            // full meter only
  fighter._sbArmed = false; fighter._sbArmedTimer = 0                     // the nuke ends Armed Mode
  fighter.vx = 0
  fighter._spriteCastMove = "sbUltPose"; fighter._spriteCastTimer = 54
  fighter._sbNukeFlash = 60                                               // render-only white/orange wash flag
  const resolve = getTargetResolver(context)
  const PULSES = [{ at: 8, dmg: 80 }, { at: 26, dmg: 80 }, { at: 44, dmg: 120 }]
  for (const p of PULSES) {
    schedulePendingSpawn(p.at, () => {
      const o = resolve ? resolve(fighter) : null
      if (!o) return
      const dx = (o.x || 0) - (fighter.x || 0), dy = (o.y || 0) - (fighter.y || 0)
      if (Math.hypot(dx, dy) <= 360 && (o.invulnTimer || 0) <= 0) {
        applyScaledDamage(o, p.dmg, { attacker: fighter, move: "ultimate", source: "ability", tier: "big" })
        o.hitstun = Math.max(o.hitstun || 0, 22); o.colorFlash = 10
        o.vx = (dx >= 0 ? 1 : -1) * 8; o.vy = -6
      }
    })
  }
  schedulePendingSpawn(50, () => { fighter._spriteCastMove = "sbUltRecover"; fighter._spriteCastTimer = 40 })
  fighter.attackCooldown = getAttackDuration(90, fighter)                 // 90f recovery lockout (also blocks re-arm)
  try { shakeCamera(context, 9, 60) } catch (_) {}                        // render-only
  fighter.colorFlash = 18
  sbSound(fighter, "sb_nuke", context)
  return true
}

'''

SB_ABILITIES_P6 = '''// ═══════════════════════════════════════════════════════════════════════════════════════════════
// SOLDIER BOY — DEFENSIVE TOOLS (Phase 6). Gold Brace (Block+Heavy), Back Roll (Block+Light), Second
// Wind (passive). Brace absorb + Second Wind damage-reduction are applied in combat.applyScaledDamage.
// ═══════════════════════════════════════════════════════════════════════════════════════════════
const SB_BRACE = { window: 40, cd: 360 }                                   // Gold Brace: 40f absorb window, 6s cooldown
const SB_ROLL  = { iframes: 14, cd: 300, hop: 8, lock: 16 }                // Back Roll: i-frames through ~f14, 5s cooldown
const SB_SECONDWIND = { dur: 180, charge: 20, hpFrac: 0.20 }               // Second Wind: 3s window, +20 Charge, below 20% HP, once/round (25% DR lives in combat.js)

// GOLD BRACE (Block + Heavy) — the gold shield braces; the next damaging hit is absorbed. 6s cooldown.
function fireSoldierBoyGoldBrace(fighter, context) {
  if ((fighter._sbBraceCd || 0) > 0 || (fighter._sbBraceActive || 0) > 0) return false
  fighter._sbBraceActive = SB_BRACE.window
  fighter._sbBraceCd = SB_BRACE.cd
  fighter._spriteCastMove = "guard"; fighter._spriteCastTimer = SB_BRACE.window
  sbSound(fighter, "sb_armedToggle", context)
  return true
}
// BACK ROLL (Block + Light) — a quick evasive roll: i-frames through ~frame 14, backward hop, 5s cooldown.
// (The brief's left-left+Special, mapped to the engine's block-cancel defensive slot: Back+Special is the
// Rifle Shot and the held-direction system has no distinct double-tap-back + Special input.)
function fireSoldierBoyBackRoll(fighter, context) {
  if ((fighter._sbRollCd || 0) > 0) return false
  fighter.invulnTimer = Math.max(fighter.invulnTimer || 0, SB_ROLL.iframes)   // i-frames (through ~f14)
  fighter._sbRollCd = SB_ROLL.cd
  fighter.vx = -(fighter.facing || 1) * SB_ROLL.hop                           // roll backward
  fighter.attackCooldown = getAttackDuration(SB_ROLL.lock, fighter)
  fighter._spriteCastMove = "dash"; fighter._spriteCastTimer = SB_ROLL.lock    // roll pose (row 8 slide)
  sbSound(fighter, "sb_dive", context)
  return true
}
// Per-frame defensive tick: Gold Brace window/cooldown, Back Roll cooldown, Second Wind window + the PASSIVE
// (once per round, below 20% HP -> 3s of 25% damage reduction + 20 Charge). Fresh fighter objects each round
// naturally reset _sbSecondWindUsed.
export function updateSoldierBoyDefense(fighter) {
  if (!isSoldierBoy(fighter)) return
  if ((fighter._sbBraceActive || 0) > 0) fighter._sbBraceActive--
  if ((fighter._sbBraceCd || 0) > 0) fighter._sbBraceCd--
  if ((fighter._sbRollCd || 0) > 0) fighter._sbRollCd--
  if ((fighter._sbSecondWind || 0) > 0) fighter._sbSecondWind--
  if (!fighter._sbSecondWindUsed && (fighter.health || 0) > 0 &&
      (fighter.health || 0) <= (fighter.maxHealth || 1080) * SB_SECONDWIND.hpFrac) {
    fighter._sbSecondWindUsed = true
    fighter._sbSecondWind = SB_SECONDWIND.dur
    fighter.energy = Math.min(fighter.maxEnergy || 100, (fighter.energy || 0) + SB_SECONDWIND.charge)
    fighter.colorFlash = 14
    sbSound(fighter, "sb_chargeFull", { seed: 1, frame: 0 })
  }
}
// Defensive input (block-cancel). Checked BEFORE the Armed/normal path so a blocking Heavy/Light becomes the
// defensive option. Returns true when it consumes the input.
export function updateSoldierBoyDefensiveInput(fighter, inputState, context) {
  if (!isSoldierBoy(fighter) || !inputState) return false
  const heavyEdge = !!inputState.heavy && !fighter._sbPrevDefHeavy
  const lightEdge = !!inputState.light && !fighter._sbPrevDefLight
  fighter._sbPrevDefHeavy = !!inputState.heavy
  fighter._sbPrevDefLight = !!inputState.light
  if (!inputState.block) return false
  if (fighter.attacking || (fighter.attackCooldown || 0) > 0) return false
  if (heavyEdge && fireSoldierBoyGoldBrace(fighter, context)) { inputState.heavy = false; return true }
  if (lightEdge && fireSoldierBoyBackRoll(fighter, context)) { inputState.light = false; return true }
  return false
}

'''

SB_SEEDED_NOISE = '''// SOLDIER BOY (Phase 7) — DETERMINISTIC filtered noise: the sample buffer is filled from a seeded LCG
// (NOT Math.random), so the SFX is identical for a given hash seed. Mirrors noise() otherwise.
function sbSeededNoise(ctx, gain, duration, gainVal, filterFreq, seed) {
  const bufSize = Math.max(1, Math.floor(ctx.sampleRate * duration))
  const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate)
  const data = buf.getChannelData(0)
  let s = (seed >>> 0) || 1
  for (let i = 0; i < bufSize; i++) {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0          // LCG — deterministic, no Math.random
    data[i] = (s / 4294967296) * 2 - 1
  }
  const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), g = ctx.createGain()
  src.buffer = buf; filter.type = "bandpass"; filter.frequency.value = filterFreq; filter.Q.value = 1.2
  g.gain.setValueAtTime(gainVal, ctx.currentTime)
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)
  src.connect(filter); filter.connect(g); g.connect(gain)
  src.start(ctx.currentTime); src.stop(ctx.currentTime + duration)
}

'''

SB_PLAY_METHODS = '''  // ── SOLDIER BOY SFX (Phase 7, placeholder WebAudio synth) ─────
  // id + a hash-derived pitch (+/-3%) + noise seed are supplied by abilities.sbSound (deterministic — no
  // Math.random). Each move maps to the brief's waveform recipe; noise comes from the seeded sbSeededNoise.
  playSoldierBoy(id, pitch = 1, seed = 1) {
    if (this._sfxMuted || !this._ctx || !this._ready) return
    if (this._ctx.state === "suspended") { this._ctx.resume().then(() => this._sbSynth(id, pitch, seed)); return }
    this._sbSynth(id, pitch, seed)
  }
  _sbSynth(id, pitch, seed) {
    const ctx = this._ctx, out = this._master, p = pitch || 1
    try {
      switch (id) {
        case "sb_shield":      osc(ctx, out, "triangle", 880 * p, 0.25, 0.22, 440 * p); break                 // 880->440, 0.25s
        case "sb_smg":         for (let i = 0; i < 4; i++) oscAt(ctx, out, "square", 140 * p, i * 0.05, 0.04, 0.18); sbSeededNoise(ctx, out, 0.18, 0.08, 1800 * p, seed); break
        case "sb_rifle":       osc(ctx, out, "sawtooth", 90 * p, 0.12, 0.3); sbSeededNoise(ctx, out, 0.2, 0.18, 2200 * p, seed); break
        case "sb_goldRush":    osc(ctx, out, "sawtooth", 200 * p, 0.3, 0.2, 900 * p); break                    // 200->900 sweep
        case "sb_cyclone":     this._sbWhoosh(0.5, p); break                                                    // sine + 6Hz LFO
        case "sb_dive":        osc(ctx, out, "triangle", 600 * p, 0.3, 0.22, 150 * p); break                   // 600->150
        case "sb_armedToggle": osc(ctx, out, "square", 330 * p, 0.08, 0.16, 660 * p); break                    // 330->660 click
        case "sb_chargeFull":  osc(ctx, out, "sine", 1320 * p, 0.08, 0.2); break                                // 1320 ping
        case "sb_nuke":        this._sbNuke(p, seed); break
      }
    } catch (_) {}
  }
  _sbWhoosh(dur, p) {
    const ctx = this._ctx, out = this._master
    const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain()
    o.type = "sine"; o.frequency.value = 220 * p
    lfo.type = "sine"; lfo.frequency.value = 6; lg.gain.value = 40 * p    // 6 Hz LFO whoosh
    lfo.connect(lg); lg.connect(o.frequency)
    g.gain.setValueAtTime(0.0001, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.05)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
    o.connect(g); g.connect(out)
    o.start(); lfo.start(); o.stop(ctx.currentTime + dur); lfo.stop(ctx.currentTime + dur)
  }
  _sbNuke(p, seed) {
    const ctx = this._ctx, out = this._master, t0 = ctx.currentTime, build = 1.2, total = 2.0   // 1.2s build + 0.8s decay
    const filt = ctx.createBiquadFilter(); filt.type = "lowpass"
    filt.frequency.setValueAtTime(200, t0); filt.frequency.linearRampToValueAtTime(4000, t0 + build); filt.frequency.linearRampToValueAtTime(300, t0 + total)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.3, t0 + build); g.gain.exponentialRampToValueAtTime(0.0001, t0 + total)
    const saw = ctx.createOscillator(); saw.type = "sawtooth"; saw.frequency.value = 55 * p   // sawtooth 55
    const sq  = ctx.createOscillator(); sq.type = "square"; sq.frequency.value = 110 * p       // square 110
    saw.connect(filt); sq.connect(filt); filt.connect(g); g.connect(out)
    saw.start(t0); sq.start(t0); saw.stop(t0 + total); sq.stop(t0 + total)
    sbSeededNoise(ctx, out, total, 0.12, 1200 * p, seed)
  }

'''

# ── CUMULATIVE engine edits (path, old_anchor, new_text). GROWN each phase. ──────────────────────
EDITS = [

    # ══ PHASE 2 — Nuclear Charge economy ══
    # Passive regen = 3/s (0.05/frame), a touch below the 0.06 base so the meter leans on in-combat gains.
    ("abilities.js",
     '  if (key === "omololu") regen += 0.015\n',
     '  if (key === "omololu") regen += 0.015\n'
     '  // Soldier Boy — Nuclear Charge passive regen is exactly 3/s (0.05/frame @60fps), a touch below the\n'
     '  // 0.06 base so the meter economy leans on IN-COMBAT gains (+6 landed / +4 taken, combat.applyScaledDamage):\n'
     '  // "every special is a choice against the nuke." Overrides the base rate (set, not add).\n'
     '  if (key === "soldier_boy") regen = 0.05\n'),

    # +6 on a landed damaging hit, +4 on one taken (universal damage sink → covers melee + projectiles).
    ("combat.js",
     '      || (dealt / Math.max(1, target.maxHealth || 100) >= 0.055 ? "big" : "light")\n'
     '  }\n'
     '  if (typeof globalThis !== "undefined" && globalThis.__DMG_LOG) {\n',
     '      || (dealt / Math.max(1, target.maxHealth || 100) >= 0.055 ? "big" : "light")\n'
     '  }\n'
     '  // SOLDIER BOY — Nuclear Charge builds IN COMBAT: +6 when he lands a damaging hit, +4 when he takes one\n'
     '  // (spec Phase 2). Gated on rosterKey → a strict no-op for every other character (their damage + meter\n'
     '  // stay byte-identical). Meter lives in fighter.energy (GAME_STATE), capped at maxEnergy; self-hits can\'t feed.\n'
     '  if (dealt > 0) {\n'
     '    const _sbAtk = opts.attacker\n'
     '    if (_sbAtk && _sbAtk !== target && (_sbAtk.rosterKey || "").toLowerCase() === "soldier_boy")\n'
     '      _sbAtk.energy = Math.min(_sbAtk.maxEnergy || 100, (_sbAtk.energy || 0) + 6)\n'
     '    if ((target.rosterKey || "").toLowerCase() === "soldier_boy")\n'
     '      target.energy = Math.min(target.maxEnergy || 100, (target.energy || 0) + 4)\n'
     '  }\n'
     '  if (typeof globalThis !== "undefined" && globalThis.__DMG_LOG) {\n'),

    # package.json — register the energy-economy harness (my P1 line is the anchor; superman never touches it).
    ("package.json",
     '    "test:soldier-boy-p1": "node harness/soldier_boy_p1_render.mjs",\n',
     '    "test:soldier-boy-p1": "node harness/soldier_boy_p1_render.mjs",\n'
     '    "test:soldier-boy-energy": "node harness/soldier_boy_energy.test.mjs",\n'),

    ("package.json",
     '    "test:soldier-boy-energy": "node harness/soldier_boy_energy.test.mjs",\n',
     '    "test:soldier-boy-energy": "node harness/soldier_boy_energy.test.mjs",\n'
     '    "test:soldier-boy-armed": "node harness/soldier_boy_armed.test.mjs",\n'),

    ("package.json",
     '    "test:soldier-boy-armed": "node harness/soldier_boy_armed.test.mjs",\n',
     '    "test:soldier-boy-armed": "node harness/soldier_boy_armed.test.mjs",\n'
     '    "test:soldier-boy-kit": "node harness/soldier_boy_kit.test.mjs",\n'
     '    "test:soldier-boy-kit-live": "node harness/soldier_boy_kit_live.mjs",\n'),

    ("package.json",
     '    "test:soldier-boy-kit-live": "node harness/soldier_boy_kit_live.mjs",\n',
     '    "test:soldier-boy-kit-live": "node harness/soldier_boy_kit_live.mjs",\n'
     '    "test:soldier-boy-combo": "node harness/soldier_boy_combo.test.mjs",\n'),

    ("package.json",
     '    "test:soldier-boy-combo": "node harness/soldier_boy_combo.test.mjs",\n',
     '    "test:soldier-boy-combo": "node harness/soldier_boy_combo.test.mjs",\n'
     '    "test:soldier-boy-defense": "node harness/soldier_boy_defense.test.mjs",\n'),

    ("package.json",
     '    "test:soldier-boy-defense": "node harness/soldier_boy_defense.test.mjs",\n',
     '    "test:soldier-boy-defense": "node harness/soldier_boy_defense.test.mjs",\n'
     '    "test:soldier-boy-sound": "node harness/soldier_boy_sound.test.mjs",\n'),

    # ══ PHASE 3 — ARMED MODE (loadout swap) ══
    # abilities.js — kit helpers + shared SMG/rifle spawns + Armed Mode state machine + command-combat driver.
    ("abilities.js", "@@BLOCK@@", SB_ABILITIES_P3, "export function triggerSpecial(fighter, context = {}) {\n", "function isSoldierBoy(f) {"),

    # game.js — import the Soldier Boy command-combat + armed-tick exports.
    ("game.js",
     "  updateSpidermanCommandCombat,  // Spider-Man Fwd+Heavy single command-normal (spiderCombo 9f multi-hit Jump Attack Combo) + Ground Crawl kick-up exit gate\n",
     "  updateSpidermanCommandCombat,  // Spider-Man Fwd+Heavy single command-normal (spiderCombo 9f multi-hit Jump Attack Combo) + Ground Crawl kick-up exit gate\n"
     "  updateSoldierBoyCommandCombat, updateSoldierBoyArmed, toggleSoldierBoyArmed,  // Soldier Boy — Armed Mode toggle (Down+Heavy) + armed Jab/Heavy gun swaps + per-frame drain/cooldown tick\n"),

    # game.js — command-combat intercept (after Spider-Man's), before the normal path.
    ("game.js",
     "  if ((fighter.rosterKey || \"\").toLowerCase() === \"spiderman\" && !charging &&\n"
     "      updateSpidermanCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return\n",
     "  if ((fighter.rosterKey || \"\").toLowerCase() === \"spiderman\" && !charging &&\n"
     "      updateSpidermanCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return\n"
     "\n"
     "  // SOLDIER BOY — Down+Heavy toggles ARMED MODE (loadout swap); while armed, Jab→SMG burst / Heavy→rifle\n"
     "  // shot (the Up-Launcher stays melee). Consumes the input only when it fires.\n"
     "  if ((fighter.rosterKey || \"\").toLowerCase() === \"soldier_boy\" && !charging &&\n"
     "      updateSoldierBoyCommandCombat(fighter, inputState, getAbilityContext())) return\n"),

    # game.js — per-frame Armed Mode tick (drain / 12s window / 8s cooldown), beside the _castArmor tick.
    ("game.js",
     "  if (fighter._castArmor     > 0) fighter._castArmor--                     // Hashirama one-shot strike super-armor window (combat.js)\n",
     "  if (fighter._castArmor     > 0) fighter._castArmor--                     // Hashirama one-shot strike super-armor window (combat.js)\n"
     "  if ((fighter.rosterKey || \"\").toLowerCase() === \"soldier_boy\") updateSoldierBoyArmed(fighter)   // Soldier Boy — Armed Mode drain / 12s window / 8s cooldown\n"),

    # physics.js — Armed Mode slows ground movement by 10%.
    ("physics.js",
     "        const walkSpeed = fighter._gfSkinMod?.fwdSpeedScale ? speed * fighter._gfSkinMod.fwdSpeedScale : speed\n",
     "        // SOLDIER BOY — Armed Mode slows ground movement by 10% (loadout weight). No-op for everyone else.\n"
     "        const _sbArmedMul = fighter._sbArmed ? 0.9 : 1\n"
     "        const walkSpeed = (fighter._gfSkinMod?.fwdSpeedScale ? speed * fighter._gfSkinMod.fwdSpeedScale : speed) * _sbArmedMul\n"),

    # ══ PHASE 4 — FULL MOVESET (6 specials + Nuclear Burst ultimate) ══
    # abilities.js — insert the specials + ult block just before the P3 block's triggerSpecial anchor
    # (ends up right after the P3 block; both precede `export function triggerSpecial`).
    ("abilities.js", "@@BLOCK@@", SB_ABILITIES_P4, "export function triggerSpecial(fighter, context = {}) {\n", "const SOLDIER_BOY_SPECIALS = {"),

    # abilities.js — SPECIAL router case (inserted before Spider-Man's; its trailing comment is untouched).
    ("abilities.js",
     '    case "spiderman": return executeSpidermanSpecial(fighter, context)',
     '    case "soldier_boy": return executeSoldierBoySpecial(fighter, context)\n'
     '    case "spiderman": return executeSpidermanSpecial(fighter, context)'),

    # abilities.js — ULTIMATE router case (inserted before Spider-Man's; its trailing comment is untouched).
    ("abilities.js",
     '      case "spiderman": cast = executeSpidermanUltimate(fighter, context); break',
     '      case "soldier_boy": cast = executeSoldierBoyUltimate(fighter, context); break\n'
     '      case "spiderman": cast = executeSpidermanUltimate(fighter, context); break'),

    # ══ PHASE 6 — DEFENSIVE TOOLS (Gold Brace / Back Roll / Second Wind) ══
    # abilities.js — defensive functions block (inserted before triggerSpecial, after the P4 block).
    ("abilities.js", "@@BLOCK@@", SB_ABILITIES_P6, "export function triggerSpecial(fighter, context = {}) {\n", "function fireSoldierBoyGoldBrace("),

    # combat.js — Gold Brace absorb + Second Wind 25% damage reduction, right after Homelander's Supe Durability.
    ("combat.js",
     '  if (target.isBlocking && (target.rosterKey || "").toLowerCase() === "homelander") rawDamage = (rawDamage || 0) * 0.6\n',
     '  if (target.isBlocking && (target.rosterKey || "").toLowerCase() === "homelander") rawDamage = (rawDamage || 0) * 0.6\n'
     '  // SOLDIER BOY — GOLD BRACE absorbs the next damaging hit outright (one hit, 6s cooldown): zero damage,\n'
     '  // consume the brace. Checked before any scaling. Gated on rosterKey -> byte-identical for everyone else.\n'
     '  if ((target._sbBraceActive || 0) > 0 && (rawDamage || 0) > 0 && (target.rosterKey || "").toLowerCase() === "soldier_boy") {\n'
     '    target._sbBraceActive = 0\n'
     '    return 0\n'
     '  }\n'
     '  // SOLDIER BOY — SECOND WIND: while the 3s comeback window holds, incoming damage is reduced 25%.\n'
     '  if ((target._sbSecondWind || 0) > 0 && (target.rosterKey || "").toLowerCase() === "soldier_boy") rawDamage = (rawDamage || 0) * 0.75\n'),

    # game.js — import the Phase-6 defensive exports.
    ("game.js",
     "  updateSoldierBoyCommandCombat, updateSoldierBoyArmed, toggleSoldierBoyArmed,  // Soldier Boy — Armed Mode toggle (Down+Heavy) + armed Jab/Heavy gun swaps + per-frame drain/cooldown tick\n",
     "  updateSoldierBoyCommandCombat, updateSoldierBoyArmed, toggleSoldierBoyArmed,  // Soldier Boy — Armed Mode toggle (Down+Heavy) + armed Jab/Heavy gun swaps + per-frame drain/cooldown tick\n"
     "  updateSoldierBoyDefense, updateSoldierBoyDefensiveInput,  // Soldier Boy — Phase 6 defensives: Gold Brace / Back Roll / Second Wind tick + block-cancel input\n"),

    # game.js — per-frame defensive tick (beside the Armed Mode tick).
    ("game.js",
     '  if ((fighter.rosterKey || "").toLowerCase() === "soldier_boy") updateSoldierBoyArmed(fighter)   // Soldier Boy — Armed Mode drain / 12s window / 8s cooldown\n',
     '  if ((fighter.rosterKey || "").toLowerCase() === "soldier_boy") updateSoldierBoyArmed(fighter)   // Soldier Boy — Armed Mode drain / 12s window / 8s cooldown\n'
     '  if ((fighter.rosterKey || "").toLowerCase() === "soldier_boy") updateSoldierBoyDefense(fighter)   // Soldier Boy — Gold Brace / Back Roll / Second Wind timers + passive\n'),

    # game.js — defensive block-cancel input, checked BEFORE the Armed/normal command-combat path.
    ("game.js",
     "  // SOLDIER BOY — Down+Heavy toggles ARMED MODE (loadout swap); while armed, Jab→SMG burst / Heavy→rifle\n"
     "  // shot (the Up-Launcher stays melee). Consumes the input only when it fires.\n"
     "  if ((fighter.rosterKey || \"\").toLowerCase() === \"soldier_boy\" && !charging &&\n"
     "      updateSoldierBoyCommandCombat(fighter, inputState, getAbilityContext())) return\n",
     "  // SOLDIER BOY — DEFENSIVE block-cancels (Gold Brace = Block+Heavy, Back Roll = Block+Light). Checked\n"
     "  // before the Armed/normal path so a blocking Heavy/Light becomes the defensive option.\n"
     "  if ((fighter.rosterKey || \"\").toLowerCase() === \"soldier_boy\" && !charging &&\n"
     "      updateSoldierBoyDefensiveInput(fighter, inputState, getAbilityContext())) return\n"
     "\n"
     "  // SOLDIER BOY — Down+Heavy toggles ARMED MODE (loadout swap); while armed, Jab→SMG burst / Heavy→rifle\n"
     "  // shot (the Up-Launcher stays melee). Consumes the input only when it fires.\n"
     "  if ((fighter.rosterKey || \"\").toLowerCase() === \"soldier_boy\" && !charging &&\n"
     "      updateSoldierBoyCommandCombat(fighter, inputState, getAbilityContext())) return\n"),


    # ══ PHASE 7 — SOUND (WebAudio placeholder synth, deterministic) ══
    # sound.js — seeded (deterministic) noise helper, inserted just before the SOUNDS table.
    ("sound.js",
     "const SOUNDS = {\n",
     SB_SEEDED_NOISE + "const SOUNDS = {\n"),

    # sound.js — Soldier Boy synth methods on the SoundManager, inserted right after _trigger().
    ("sound.js",
     "    try { fn(this._ctx, this._master) } catch(_) {}\n  }\n",
     "    try { fn(this._ctx, this._master) } catch(_) {}\n  }\n\n" + SB_PLAY_METHODS),

    ("abilities.js",
     "function sbSound(fighter, id, context) { /* Phase 7 */ }",
     "function sbSound(fighter, id, context) {\n"
     "  // Phase 7 \u2014 deterministic placeholder synth: +/-3% pitch + a noise seed from hash(seed, frame, idx).\n"
     "  const seed = ((context && context.seed) >>> 0) || 1\n"
     "  const frame = (context && context.frame) || 0\n"
     "  const h = sbHash(seed, frame, sbIdx(fighter))\n"
     "  const pitch = 1 + (h - 0.5) * 0.06                 // +/-3% pitch variance\n"
     "  const noiseSeed = (((seed ^ Math.imul(frame + 1, 2654435761)) >>> 0) || 1)\n"
     "  try { sound.playSoldierBoy?.(id, pitch, noiseSeed) } catch (_) {}\n"
     "}"),

]


def _group():
    files = OrderedDict()
    for e in EDITS:
        files.setdefault(e[0], []).append(e[1:])
    return files


def _apply_edits(content, elist, path, label):
    """Apply one file's edits in order. Two edit shapes:
         (old, new)                       — contiguous replace; skip if `new` already present.
         ("@@BLOCK@@", block, anchor)      — ensure `block` appears EXACTLY once: insert before `anchor`
                                             if absent, or dedup extra copies (self-heals a chained-insert
                                             duplication). Immune to non-contiguity with other same-anchor blocks.
       Returns the (possibly) modified content."""
    for e in elist:
        if e[0] == "@@BLOCK@@":
            # ("@@BLOCK@@", block, anchor, sentinel). `sentinel` is a STABLE unique substring of the block
            # used for the present-check, so a later sub-line edit to the block (e.g. filling the Phase-7
            # sbSound body) does NOT make the whole-block match fail and re-insert. Dedup still removes any
            # EXACT whole-block duplicates (the chained-insert bug) while leaving a sub-edited copy alone.
            _, block, anchor, sentinel = e
            if content.count(sentinel) == 0:
                if anchor in content:
                    content = content.replace(anchor, block + anchor, 1)
                else:
                    raise SystemExit(f"[sb_apply {label}] BLOCK ANCHOR MISSING in {path}:\n{anchor[:160]}")
            else:
                while content.count(block) > 1:
                    content = content.replace(block, "", 1)   # drop exact-duplicate copies, keep one
        else:
            old, new = e
            if new in content:
                continue
            if old in content:
                content = content.replace(old, new, 1)
            else:
                raise SystemExit(f"[sb_apply {label}] ANCHOR MISSING in {path}:\n--- expected ---\n{old[:200]}\n----------------")
    return content


# Import errors that mean the generated file is STRUCTURALLY broken (must abort) vs merely needs a browser.
_FATAL_IMPORT = ("SyntaxError", "already been declared", "Unexpected", "Cannot find module", "redeclaration")


def _validate_js(path, content):
    """Import-load a .js file's generated content to catch SyntaxErrors / redeclarations (node --check's
    exit code is unreliable here, and it misses function-redeclaration link errors that only surface on
    import). Writes a temp .mjs in the repo root so relative imports resolve, imports it, then removes it.
    A browser-global ReferenceError (Image/window/document not defined) is EXPECTED for view modules
    (game.js/ui.js/sprite.js) and is treated as PASS — only structural errors abort."""
    if not path.endswith(".js"):
        return
    tmp = f"._sbvalidate_{os.path.basename(path)}.mjs"
    try:
        with open(tmp, "w") as fh:
            fh.write(content)
        chk = subprocess.run(["node", "-e", f"import('./{tmp}').then(()=>process.exit(0)).catch(e=>{{console.error(String(e).split('\\n')[0]);process.exit(3)}})"],
                             capture_output=True, text=True)
        if chk.returncode != 0:
            msg = (chk.stderr.strip() or chk.stdout.strip())
            if any(k in msg for k in _FATAL_IMPORT):
                raise SystemExit(f"[sb_apply] GENERATED {path} IS STRUCTURALLY BROKEN:\n{msg}")
            # otherwise: a browser-global ReferenceError etc. — syntactically fine, just not node-loadable.
            print(f"[sb_apply] note: {path} not node-loadable (ok — browser module): {msg}")
    finally:
        try:
            os.remove(tmp)
        except OSError:
            pass


def build_changed(head, validate=True):
    changed = {}
    for path, elist in _group().items():
        content = _apply_edits(blob_at(head, path), elist, path, "commit")
        if validate:
            _validate_js(path, content)
        changed[path] = content
    return changed


def apply_to_worktree():
    """Apply the cumulative EDITS to the actual working-tree files (idempotent) so the changes can be tested
    live. Reads the CURRENT working-tree file (which may carry the Superman session's uncommitted edits) and
    only touches MY anchors/blocks — their changes are preserved."""
    for path, elist in _group().items():
        with open(path, "r") as fh:
            before = fh.read()
        after = _apply_edits(before, elist, path, "--worktree")
        if after != before:
            with open(path, "w") as fh:
                fh.write(after)
            print(f"[sb_apply --worktree] applied edits to {path}")
        else:
            print(f"[sb_apply --worktree] {path} already up to date")


def main():
    if len(sys.argv) >= 2 and sys.argv[1] == "--worktree":
        apply_to_worktree()
        return
    if len(sys.argv) < 2:
        raise SystemExit("usage: sb_apply.py <msg_file> [newfiles...]   |   sb_apply.py --worktree")
    msg_file = sys.argv[1]
    newfiles = sys.argv[2:]
    for attempt in range(8):
        head = git("rev-parse", "HEAD").stdout.strip()
        idx = tempfile.mktemp(prefix="sb_idx_")
        env = dict(os.environ, GIT_INDEX_FILE=idx)
        git("read-tree", head, env=env)
        changed = build_changed(head)
        for path, content in changed.items():
            h = git("hash-object", "-w", "--stdin", inp=content).stdout.strip()
            r = git("update-index", "--cacheinfo", f"100644,{h},{path}", env=env)
            if r.returncode != 0:
                raise SystemExit(f"[sb_apply] update-index {path}: {r.stderr}")
        for f in newfiles:
            r = git("update-index", "--add", f, env=env)
            if r.returncode != 0:
                raise SystemExit(f"[sb_apply] update-index --add {f}: {r.stderr}")
        tree = git("write-tree", env=env).stdout.strip()
        new = git("commit-tree", tree, "-p", head, "-F", msg_file, env=env).stdout.strip()
        res = git("update-ref", BRANCH, new, head)
        try:
            os.remove(idx)
        except OSError:
            pass
        if res.returncode == 0:
            print(f"[sb_apply] OK  {new[:10]}  (parent {head[:10]}, attempt {attempt+1})")
            print(f"[sb_apply] engine files touched: {', '.join(changed.keys())}")
            return
        print(f"[sb_apply] HEAD moved ({head[:10]} → racing), retrying... {res.stderr.strip()}")
    raise SystemExit("[sb_apply] could not update-ref after 8 attempts (HEAD racing hard)")


if __name__ == "__main__":
    main()
