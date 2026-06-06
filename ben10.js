// ben10.js
// OMNITRIX SYSTEM — Ben 10 as a "pick 5 aliens, each with its own moveset" fighter.
//
// Every alien in BEN10_ALIEN_POOL is a finished, character-shaped object:
//   { name, color, health, maxHealth, speed, jump, maxEnergy, energyType,
//     weight, stats, basic_attacks, specials, ultimate }
// Field names match what combat.js / Player already read (basic_attacks.light /
// heavy / up / air / down_air, specials, ultimate, stats.maxJumps, etc.), so you
// can paste them into characters.js OR just import this module — both work.
//
// Switching an alien swaps the fighter's movesets + stats + size + colour live.
//
// ── DROP INTO characters.js (optional) ───────────────────────────
//   import { ben10Characters } from "./ben10.js"
//   Object.assign(characters, ben10Characters())   // adds every alien as a character
// ── OR keep it modular (recommended) ─────────────────────────────
//   import { setupBen10 } from "./ben10.js"; setupBen10(ben, ["fourarms","xlr8",...])
// See the WIRING block at the very bottom for the 4 hooks.

// ─────────────────────────────────────────────────────────────────
// ALIEN FACTORY
// role drives frame data; dmg is a damage scalar; flags add behaviour.
// ─────────────────────────────────────────────────────────────────
const FRAME_PROFILES = {
  speed:   { l: [3, 2, 7],  h: [6, 3, 13], u: [5, 3, 12], a: [4, 2, 8],  d: [6, 3, 11] },
  rush:    { l: [4, 3, 8],  h: [8, 4, 16], u: [7, 4, 15], a: [5, 3, 9],  d: [8, 4, 13] },
  brawler: { l: [5, 3, 10], h: [9, 4, 18], u: [8, 4, 16], a: [5, 3, 10], d: [9, 4, 14] },
  zoner:   { l: [5, 3, 11], h: [9, 4, 19], u: [8, 4, 17], a: [5, 3, 10], d: [9, 4, 15] },
  heavy:   { l: [6, 3, 12], h: [11, 5, 20], u: [9, 4, 18], a: [6, 3, 11], d: [10, 4, 16] },
  titan:   { l: [8, 4, 16], h: [14, 6, 26], u: [12, 5, 24], a: [8, 4, 15], d: [13, 5, 22] }
}

const BASE_DMG = { l: 42, h: 85, u: 68, a: 56, d: 78 }

function keyify(s) {
  return String(s).replace(/[^a-z0-9]/gi, "").replace(/^./, c => c.toLowerCase())
}

function mkAlien(cfg) {
  const {
    name, color, role = "brawler",
    hp = 1000, spd = 7, jumps = 2, jump = 22, weight = "medium",
    dmg = 1.0, sizeW, sizeH,
    special = {}, special2 = null,
    ult = {}, flags = {}
  } = cfg

  const fp = FRAME_PROFILES[role] || FRAME_PROFILES.brawler
  const D = (k) => Math.round(BASE_DMG[k] * dmg)
  const armor = !!flags.armor
  const spikeKy = flags.bigSpike ? 13 : 11

  const basic_attacks = {
    light:    { damage: D("l"), startup: fp.l[0], active: fp.l[1], recovery: fp.l[2], hitstun: 12, knockbackX: 3, knockbackY: 0 },
    heavy:    { damage: D("h"), startup: fp.h[0], active: fp.h[1], recovery: fp.h[2], hitstun: 18, knockbackX: 6, knockbackY: 1, superArmor: armor },
    up:       { damage: D("u"), startup: fp.u[0], active: fp.u[1], recovery: fp.u[2], hitstun: 20, knockbackX: 2, knockbackY: -8 },
    air:      { damage: D("a"), startup: fp.a[0], active: fp.a[1], recovery: fp.a[2], hitstun: 13, knockbackX: 3, knockbackY: -2 },
    down_air: { damage: D("d"), startup: fp.d[0], active: fp.d[1], recovery: fp.d[2], hitstun: 18, knockbackX: 1, knockbackY: spikeKy }
  }

  const mkSpecial = (sp) => ({
    name: sp.name || "Special",
    damage: sp.damage || 100,
    isSpecial: true,
    category: "special",
    cost: sp.cost ?? 20,
    startup: sp.startup ?? 11,
    active: sp.active ?? 5,
    recovery: sp.recovery ?? 20,
    hitstun: sp.hitstun ?? 20,
    knockbackX: sp.knockbackX ?? 8,
    knockbackY: sp.knockbackY ?? -1,
    rangeX: sp.ranged ? 180 : 80,
    rangeY: 50,
    superArmor: !!sp.armor,
    projectileId: sp.projectileId || null,
    effect: sp.effect || ""
  })

  const specials = {}
  if (special && special.name) specials[keyify(special.name)] = mkSpecial(special)
  if (special2 && special2.name) specials[keyify(special2.name)] = mkSpecial(special2)

  const ultimate = {
    name: ult.name || "Ultimate",
    damage: ult.damage || 200,
    isUltimate: true,
    category: "ultimate",
    cost: ult.cost ?? 100,
    startup: ult.startup ?? 18,
    active: ult.active ?? 8,
    recovery: ult.recovery ?? 28,
    effect: ult.effect || ""
  }

  return {
    name, color,
    health: hp, maxHealth: hp,
    speed: spd, jump,
    maxEnergy: 100, energyType: "omnitrix", weight,
    stats: { maxHealth: hp, speed: spd, maxJumps: jumps, jumpPower: Math.round(jump), weight, sizeW: sizeW || null, sizeH: sizeH || null },
    basic_attacks, specials, ultimate
  }
}

// ─────────────────────────────────────────────────────────────────
// THE POOL — originals + your full list
// ─────────────────────────────────────────────────────────────────
export const BEN10_ALIEN_POOL = {
  heatblast:  mkAlien({ name: "Heatblast", color: "#f97316", role: "zoner", hp: 1000, spd: 7, dmg: 1.0,
                        special: { name: "Fireball", ranged: true, damage: 110, cost: 25, projectileId: "heatblast_fire" }, ult: { name: "Supernova", damage: 220 } }),
  fourarms:   mkAlien({ name: "Four Arms", color: "#dc2626", role: "heavy", hp: 1250, spd: 5, jumps: 1, jump: 19, dmg: 1.25, flags: { armor: true }, weight: "heavy", sizeW: 70, sizeH: 120,
                        special: { name: "Quad Slam", damage: 130, cost: 25, armor: true }, ult: { name: "Ground Pound", damage: 240 } }),
  xlr8:       mkAlien({ name: "XLR8", color: "#0ea5e9", role: "speed", hp: 900, spd: 10, jumps: 3, jump: 23, dmg: 0.75, weight: "light",
                        special: { name: "Dash Strike", damage: 80, cost: 15 }, ult: { name: "Sonic Blitz", damage: 180, active: 10 } }),
  diamondhead:mkAlien({ name: "Diamondhead", color: "#22d3ee", role: "zoner", hp: 1100, spd: 6, dmg: 1.0, weight: "heavy",
                        special: { name: "Shard Barrage", ranged: true, damage: 100, cost: 20, projectileId: "diamond_shard" }, ult: { name: "Crystal Storm", damage: 210 } }),
  wildmutt:   mkAlien({ name: "Wildmutt", color: "#ea580c", role: "rush", hp: 1000, spd: 9, dmg: 0.9,
                        special: { name: "Pounce", damage: 95, cost: 15, knockbackY: -3 }, ult: { name: "Feral Frenzy", damage: 190, active: 10 } }),

  greymatter: mkAlien({ name: "Grey Matter", color: "#94a3b8", role: "speed", hp: 820, spd: 9, jumps: 3, jump: 24, dmg: 0.62, weight: "light", sizeW: 44, sizeH: 90,
                        special: { name: "Sabotage", damage: 72, cost: 15 }, ult: { name: "Mastermind", damage: 170, active: 8 } }),
  feedback:   mkAlien({ name: "Feedback", color: "#0891b2", role: "zoner", hp: 980, spd: 8, dmg: 0.95,
                        special: { name: "Energy Discharge", ranged: true, damage: 110, cost: 22, effect: "absorbs + fires energy" }, ult: { name: "Overload", damage: 210 } }),
  upgrade:    mkAlien({ name: "Upgrade", color: "#16a34a", role: "zoner", hp: 1050, spd: 7, dmg: 1.0,
                        special: { name: "Plasma Beam", ranged: true, damage: 105, cost: 22, projectileId: "upgrade_beam" }, ult: { name: "Tech Overload", damage: 205 } }),
  alienx:     mkAlien({ name: "Alien X", color: "#1e293b", role: "brawler", hp: 1400, spd: 7, dmg: 1.4, flags: { armor: true }, weight: "heavy",
                        special: { name: "Reality Warp", damage: 150, cost: 30, armor: true, knockbackY: -6 }, ult: { name: "Erasure", damage: 300, startup: 22, recovery: 32, effect: "omnipotent — balanced by long startup" } }),
  clockwork:  mkAlien({ name: "Clockwork", color: "#65a30d", role: "zoner", hp: 1050, spd: 5, dmg: 0.95, weight: "heavy",
                        special: { name: "Time Ray", ranged: true, damage: 100, cost: 25, effect: "slows target" }, ult: { name: "Time Stop", damage: 200, effect: "freezes opponent briefly" } }),
  brainstorm: mkAlien({ name: "Brainstorm", color: "#7c3aed", role: "zoner", hp: 960, spd: 6, dmg: 0.95,
                        special: { name: "Lightning Storm", ranged: true, damage: 115, cost: 25, projectileId: "brainstorm_bolt" }, ult: { name: "Mind Surge", damage: 205 } }),
  ampfibian:  mkAlien({ name: "Ampfibian", color: "#3b82f6", role: "speed", hp: 930, spd: 9, jumps: 3, jump: 23, dmg: 0.8, weight: "light",
                        special: { name: "Shock Pulse", ranged: true, damage: 95, cost: 18 }, ult: { name: "Electro Cyclone", damage: 185, active: 10 } }),
  gravattack: mkAlien({ name: "Gravattack", color: "#9333ea", role: "heavy", hp: 1250, spd: 5, jumps: 1, jump: 18, dmg: 1.2, flags: { armor: true }, weight: "heavy", sizeW: 70, sizeH: 120,
                        special: { name: "Gravity Crush", damage: 130, cost: 28, armor: true, knockbackY: -7 }, ult: { name: "Black Hole", damage: 240, effect: "pulls + crushes" } }),
  lodestar:   mkAlien({ name: "Lodestar", color: "#f59e0b", role: "brawler", hp: 1100, spd: 6, dmg: 1.0, flags: { armor: true },
                        special: { name: "Magnetic Pull", ranged: true, damage: 100, cost: 22, effect: "drags opponent in" }, ult: { name: "Polarity Storm", damage: 210 } }),
  gutrot:     mkAlien({ name: "Gutrot", color: "#84cc16", role: "zoner", hp: 1000, spd: 6, dmg: 0.9,
                        special: { name: "Gas Bomb", ranged: true, damage: 100, cost: 22, effect: "lingering chemical damage" }, ult: { name: "Toxic Cloud", damage: 200 } }),
  atomix:     mkAlien({ name: "Atomix", color: "#22c55e", role: "heavy", hp: 1300, spd: 5, jumps: 1, jump: 18, dmg: 1.35, flags: { armor: true }, weight: "heavy", sizeW: 72, sizeH: 124,
                        special: { name: "Atomic Slam", damage: 140, cost: 28, armor: true }, ult: { name: "Nucleo Fusion Cannon", damage: 260, startup: 20 } }),
  bloxx:      mkAlien({ name: "Bloxx", color: "#f97316", role: "brawler", hp: 1200, spd: 6, dmg: 1.0, flags: { armor: true }, weight: "heavy",
                        special: { name: "Block Cannon", ranged: true, damage: 100, cost: 20 }, ult: { name: "Fortress Smash", damage: 220, armor: true } }),
  jetray:     mkAlien({ name: "Jetray", color: "#ef4444", role: "speed", hp: 920, spd: 10, jumps: 3, jump: 24, dmg: 0.8, weight: "light",
                        special: { name: "Neuroshock", ranged: true, damage: 100, cost: 20, projectileId: "jetray_blast" }, ult: { name: "Solar Dive", damage: 190 } }),
  chromastone:mkAlien({ name: "Chromastone", color: "#a855f7", role: "zoner", hp: 1050, spd: 6, dmg: 1.0,
                        special: { name: "Ultraviolet Beam", ranged: true, damage: 110, cost: 24, effect: "absorbs energy attacks" }, ult: { name: "Prism Burst", damage: 210 } }),
  waybig:     mkAlien({ name: "Way Big", color: "#dc2626", role: "titan", hp: 1500, spd: 4, jumps: 1, jump: 16, dmg: 1.6, flags: { armor: true, bigSpike: true }, weight: "heavy", sizeW: 92, sizeH: 150,
                        special: { name: "Cosmic Slam", damage: 160, cost: 30, armor: true }, ult: { name: "Cosmic Ray", damage: 320, ranged: true, startup: 22, recovery: 32 } }),
  juryrigg:   mkAlien({ name: "Jury Rigg", color: "#b91c1c", role: "speed", hp: 860, spd: 10, jumps: 3, jump: 24, dmg: 0.6, weight: "light", sizeW: 46, sizeH: 92,
                        special: { name: "Sabotage Frenzy", damage: 75, cost: 15, effect: "breaks projectiles" }, ult: { name: "Demolition", damage: 175, active: 10 } }),
  nanomech:   mkAlien({ name: "Nanomech", color: "#10b981", role: "speed", hp: 840, spd: 9, jumps: 3, jump: 24, dmg: 0.7, weight: "light", sizeW: 44, sizeH: 88,
                        special: { name: "Energy Pellets", ranged: true, damage: 90, cost: 16 }, ult: { name: "Nano Barrage", damage: 175, active: 10 } }),
  eyeguy:     mkAlien({ name: "Eye Guy", color: "#16a34a", role: "zoner", hp: 1000, spd: 6, dmg: 0.95,
                        special: { name: "Eye Beams", ranged: true, damage: 105, cost: 22 }, ult: { name: "Mega Eye Blast", damage: 210 } }),
  fasttrack:  mkAlien({ name: "Fasttrack", color: "#2563eb", role: "speed", hp: 950, spd: 10, jumps: 2, dmg: 0.85,
                        special: { name: "Speed Strike", damage: 85, cost: 15 }, ult: { name: "Hyper Rush", damage: 185, active: 10 } }),
  rath:       mkAlien({ name: "Rath", color: "#ea580c", role: "rush", hp: 1150, spd: 8, dmg: 1.1, flags: { armor: true },
                        special: { name: "Lariat Grab", damage: 120, cost: 22, armor: true }, ult: { name: "Tiger Rampage", damage: 220, active: 10 } }),
  armodrillo: mkAlien({ name: "Armodrillo", color: "#ca8a04", role: "heavy", hp: 1250, spd: 5, jumps: 1, jump: 18, dmg: 1.2, flags: { armor: true }, weight: "heavy", sizeW: 70, sizeH: 120,
                        special: { name: "Drill Quake", damage: 130, cost: 26, armor: true }, ult: { name: "Seismic Pound", damage: 240 } }),
  nrg:        mkAlien({ name: "NRG", color: "#f43f5e", role: "heavy", hp: 1300, spd: 5, dmg: 1.0, flags: { armor: true }, weight: "heavy",
                        special: { name: "Radiation Beam", ranged: true, damage: 105, cost: 22 }, ult: { name: "Meltdown", damage: 220 } }),
  toepick:    mkAlien({ name: "Toepick", color: "#475569", role: "brawler", hp: 1000, spd: 6, dmg: 0.9,
                        special: { name: "Terror Reveal", damage: 90, cost: 25, effect: "stuns with fear" }, ult: { name: "Nightmare", damage: 200, effect: "fear lockdown" } }),
  kickinhawk: mkAlien({ name: "Kickin Hawk", color: "#d97706", role: "rush", hp: 1050, spd: 9, dmg: 1.0,
                        special: { name: "Talon Combo", damage: 100, cost: 18 }, ult: { name: "Sky High Kick", damage: 205 } }),
  whampire:   mkAlien({ name: "Whampire", color: "#7e22ce", role: "brawler", hp: 1050, spd: 8, dmg: 0.95,
                        special: { name: "Corrupting Bite", damage: 95, cost: 20, effect: "lifesteal — needs a hook in combat.js" }, ult: { name: "Bat Swarm", damage: 200 } }),
  snareoh:    mkAlien({ name: "Snare-oh", color: "#eab308", role: "zoner", hp: 1050, spd: 6, dmg: 0.9,
                        special: { name: "Bandage Snare", ranged: true, damage: 100, cost: 22, effect: "restrains opponent" }, ult: { name: "Sarcophagus Trap", damage: 200 } }),
  buzzshock:  mkAlien({ name: "Buzzshock", color: "#06b6d4", role: "speed", hp: 880, spd: 10, jumps: 3, jump: 24, dmg: 0.7, weight: "light", sizeW: 46, sizeH: 92,
                        special: { name: "Electro Split", ranged: true, damage: 90, cost: 16 }, ult: { name: "Overcharge", damage: 180, active: 10 } }),
  cannonbolt: mkAlien({ name: "Cannonbolt", color: "#facc15", role: "heavy", hp: 1300, spd: 6, dmg: 1.05, flags: { armor: true, bigSpike: true }, weight: "heavy",
                        special: { name: "Roll Smash", damage: 120, cost: 20, armor: true, active: 8 }, ult: { name: "Wrecking Ball", damage: 230, active: 10 } }),
  ditto:      mkAlien({ name: "Ditto", color: "#0ea5e9", role: "speed", hp: 900, spd: 9, dmg: 0.8,
                        special: { name: "Clone Strike", damage: 90, cost: 18, effect: "duplicate assists the hit" }, ult: { name: "Swarm Tactics", damage: 185, active: 10 } }),
  astrodactyl:mkAlien({ name: "Astrodactyl", color: "#0d9488", role: "speed", hp: 960, spd: 10, jumps: 3, jump: 24, dmg: 0.85, weight: "light",
                        special: { name: "Energy Whip", ranged: true, damage: 100, cost: 20 }, ult: { name: "Star Dive", damage: 190 } })
}

// Default loadout if the player hasn't picked one.
export const DEFAULT_OMNITRIX = ["fourarms", "xlr8", "heatblast", "diamondhead", "cannonbolt"]

const SWITCH_COOLDOWN = 45 // frames between transforms (Omnitrix recharge)

// Returns every alien as a character object (for characters.js). Prefixed keys
// avoid collisions with non-Ben fighters.
export function ben10Characters(prefix = "ben_") {
  const out = {}
  for (const [k, v] of Object.entries(BEN10_ALIEN_POOL)) out[prefix + k] = { ...v }
  return out
}

// ─────────────────────────────────────────────────────────────────
// OMNITRIX STATE + SWITCHING
// ─────────────────────────────────────────────────────────────────
export function createOmnitrixState(selected = DEFAULT_OMNITRIX) {
  const aliens = selected.filter(k => BEN10_ALIEN_POOL[k]).slice(0, 5)
  let fill = 0
  while (aliens.length < 5) {
    const candidate = DEFAULT_OMNITRIX[fill++ % DEFAULT_OMNITRIX.length]
    if (!aliens.includes(candidate)) aliens.push(candidate)
    if (fill > 20) break
  }
  return { aliens, index: 0, switchCooldown: 0 }
}

export function applyAlien(fighter, alienKey) {
  const alien = BEN10_ALIEN_POOL[alienKey]
  if (!fighter || !alien) return false

  fighter.activeAlien = alienKey
  fighter.activeAlienName = alien.name
  fighter.name = `Ben 10 (${alien.name})`
  fighter.color = alien.color

  fighter.basic_attacks = alien.basic_attacks
  fighter.specials = alien.specials || {}
  fighter.ultimate = alien.ultimate || null

  const s = alien.stats || {}
  fighter.maxJumps  = s.maxJumps ?? 2
  fighter.jumpForce = -(s.jumpPower ?? 22)
  fighter.baseSpeed = s.speed ?? 7
  fighter.speed     = s.speed ?? 7
  if (s.maxHealth) fighter.maxHealth = s.maxHealth
  fighter.stats = { ...(fighter.stats || {}), ...s }

  // Size change (Way Big / Atomix etc.), bottom-anchored so feet stay put.
  const oldH = fighter.h ?? fighter.height ?? 110
  const sw = s.sizeW || 60
  const sh = s.sizeH || 110
  fighter.w = sw; fighter.width = sw
  fighter.y = (fighter.y ?? 0) + (oldH - sh)
  fighter.h = sh; fighter.height = sh

  fighter.colorFlash = 6
  return true
}

export function switchAlien(fighter, dir = 1) {
  const omx = fighter?.omnitrix
  if (!omx || omx.switchCooldown > 0) return false
  omx.index = (omx.index + dir + omx.aliens.length) % omx.aliens.length
  applyAlien(fighter, omx.aliens[omx.index])
  omx.switchCooldown = SWITCH_COOLDOWN
  fighter.teleportFlash = 10
  return true
}

export function selectAlienSlot(fighter, slot) {
  const omx = fighter?.omnitrix
  if (!omx || slot < 0 || slot >= omx.aliens.length || omx.switchCooldown > 0) return false
  omx.index = slot
  applyAlien(fighter, omx.aliens[slot])
  omx.switchCooldown = SWITCH_COOLDOWN
  fighter.teleportFlash = 10
  return true
}

export function updateOmnitrix(fighter) {
  const omx = fighter?.omnitrix
  if (omx && omx.switchCooldown > 0) omx.switchCooldown--
}

export function setupBen10(fighter, selected = DEFAULT_OMNITRIX) {
  if (!fighter) return
  fighter.rosterKey = "ben10"
  fighter.omnitrix = createOmnitrixState(selected)
  applyAlien(fighter, fighter.omnitrix.aliens[0])
}

// ─────────────────────────────────────────────────────────────────
// DRAW — procedural, matches fighters.js. Respects per-alien size.
// ─────────────────────────────────────────────────────────────────
function rr(ctx, x, y, w, h, r = 10) {
  r = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
}

function shade(hex, amt) {
  try {
    const n = hex.replace("#", "")
    let r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16)
    r = Math.max(0, Math.min(255, Math.round(r + r * amt)))
    g = Math.max(0, Math.min(255, Math.round(g + g * amt)))
    b = Math.max(0, Math.min(255, Math.round(b + b * amt)))
    return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`
  } catch (_) { return hex }
}

export function drawBen10(ctx, fighter) {
  if (!ctx || !fighter) return
  const x = fighter.x ?? 0, y = fighter.y ?? 0
  const w = fighter.w ?? fighter.width ?? 60
  const h = fighter.h ?? fighter.height ?? 110
  const facing = fighter.facing ?? 1
  const alien = BEN10_ALIEN_POOL[fighter.activeAlien] || BEN10_ALIEN_POOL.heatblast
  const col = alien.color

  ctx.save()

  const g = ctx.createLinearGradient(x, y, x, y + h)
  g.addColorStop(0, col); g.addColorStop(1, shade(col, -0.35))
  ctx.fillStyle = g
  rr(ctx, x, y + h * 0.18, w, h * 0.82, 10); ctx.fill()

  const bx = x + w / 2, by = y + h * 0.42
  ctx.fillStyle = "#052e16"; ctx.beginPath(); ctx.arc(bx, by, 9, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = "#22c55e"; ctx.beginPath(); ctx.arc(bx, by, 6, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = "#052e16"; ctx.lineWidth = 2
  ctx.beginPath(); ctx.moveTo(bx - 5, by); ctx.lineTo(bx + 5, by); ctx.stroke()

  const hx = x + w / 2, hy = y + h * 0.12
  ctx.fillStyle = shade(col, 0.15)
  ctx.beginPath(); ctx.arc(hx, hy, h * 0.11, 0, Math.PI * 2); ctx.fill()

  ctx.fillStyle = "#0f172a"
  const eyeOff = facing >= 0 ? 4 : -4
  ctx.beginPath(); ctx.arc(hx + eyeOff, hy - 1, 2.6, 0, Math.PI * 2); ctx.fill()

  ctx.fillStyle = shade(col, -0.5)
  ctx.fillRect(x + 4, y + h * 0.86, w * 0.35, h * 0.14)
  ctx.fillRect(x + w - 4 - w * 0.35, y + h * 0.86, w * 0.35, h * 0.14)

  if ((fighter.colorFlash || 0) > 0) {
    ctx.globalAlpha = Math.min(1, fighter.colorFlash / 6) * 0.85
    ctx.fillStyle = "#fff"; rr(ctx, x, y, w, h, 12); ctx.fill(); ctx.globalAlpha = 1
  }

  ctx.font = "bold 11px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "bottom"
  ctx.fillStyle = "rgba(0,0,0,0.55)"; ctx.fillRect(hx - 40, y - 18, 80, 16)
  ctx.fillStyle = col; ctx.fillText(alien.name, hx, y - 4)

  ctx.globalAlpha = 0.25; ctx.fillStyle = "#000"
  ctx.beginPath(); ctx.ellipse(hx, y + h + 6, w * 0.45, 10, 0, 0, Math.PI * 2); ctx.fill()

  ctx.restore()
}

/*
─────────────────────────────────────────────────────────────────
WIRING (the 4 hooks — game.js / fighters.js were binary, so add by hand)
─────────────────────────────────────────────────────────────────
1) After creating the Ben fighter:
     import { setupBen10 } from "./ben10.js"
     setupBen10(ben, ["alienx", "waybig", "xlr8", "feedback", "rath"]) // the player's 5
2) Each frame, for the Ben fighter:
     import { updateOmnitrix } from "./ben10.js"; updateOmnitrix(ben)
3) On the transform key (number keys 1-5, or Q to cycle):
     import { switchAlien, selectAlienSlot } from "./ben10.js"
     switchAlien(ben, +1)       // cycle
     selectAlienSlot(ben, 2)    // jump to slot 3
4) In fighters.js drawCharacter():
     import { drawBen10 } from "./ben10.js"
     case "ben10": drawBen10(ctx, fighter); break

Notes:
 - "ranged" specials use a long active hitbox so they work NOW without the
   projectile system. To make them real projectiles, add the projectileId to
   projectiles.js (the field is already on the move for you).
 - effect strings (lifesteal/restrain/stun/slow) are flavour the engine ignores
   safely — wire them into combat.js only when you want those behaviours.
─────────────────────────────────────────────────────────────────
*/
