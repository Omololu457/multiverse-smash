// animeSignatures.js — anime juice Phase 2: SIGNATURE MOVES get their own breakdown (PRESENTATION ONLY, plus one
// small sim-side feel hook, sigFeel, logged in docs/anime_juice/CHANGES.md). animeJuice.js owns the hooks and calls in
// here; game.js drains the impact-frame queue (sigTakeImpacts) into its existing _fireJuiceImpactFrame.
// The table (SIGNATURE_MOVES, docs/anime_juice/SIGNATURES.md) maps REAL roster move keys / names → one family:
//   spiritbomb · beam · orb · gatling · stretch · waterdragon · firebreath · rockline · iai · energyslash · ice
// Each family has START (the gather / wind-up), LIVE (while the move runs), HIT (impact) and AFTERMATH (floor) layers.
// Deterministic (integer hash, no Math.random); Hit Effects off → nothing; Reduce Flashing → no white flashes / colour
// flips (a soft dim instead); Particles Low → fewer particles; the Anime FX level (juiceSettings.animeFx) can turn the
// signature layer down ('low' = start + hit only, no aftermath / live layers) or off. ben10 / albedo are never matched.
import { juiceSettings } from './juiceSettings.js'
import { camera } from './camera.js'
import { sound } from './sound.js'

const R = Math.round, TAU = Math.PI * 2
function H(a, b, c) {
  let h = (Math.imul((a | 0) ^ 0x9e3779b9, 2654435761) ^ Math.imul((b | 0) + 7, 40503) ^ Math.imul((c | 0) + 13, 2246822519)) >>> 0
  h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; return (h >>> 0) / 4294967296
}
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${Math.max(0, Math.min(1, a)).toFixed(3)})`
const noFlash = () => !!juiceSettings.reduceFlashing
const pN = n => Math.max(1, Math.round(n * (juiceSettings.particleScale?.() ?? 1)))
export const sigLevel = () => { const v = juiceSettings.animeFx; return v === 'off' || v === 'low' ? v : 'full' }
const full = () => sigLevel() === 'full'
const play = id => { try { sound.play(id) } catch (_) {} }
const shake = (m, d) => { try { camera.shake(m, d) } catch (_) {} }
const ctrX = f => (f?.x || 0) + (f?.w || 60) / 2
const floorOf = f => (f?.groundY ?? ((f?.y || 0) + (f?.h || 100)))
const hand = f => ({ x: ctrX(f) + (f.facing || 1) * (f.w || 60) * 0.45, y: (f.y || 0) + (f.h || 100) * 0.42 })
const isBen = k => k === 'ben10' || k === 'albedo'

// ═══ THE TABLE — filled from the roster inventory (docs/anime_juice/SIGNATURES.md). rosterKey → { moveKey | exact name → family } ═══
export const SIGNATURE_MOVES = {
  goku: { "gokuSpiritBomb": "spiritbomb", "ultimate": "spiritbomb", "gokuKamehameha": "beam", "gokuKameUlt": "beam" },
  goku_black: { "gbSpiritBomb": "spiritbomb", "gbKamehameha": "beam", "gbSuperKiSlash": "energyslash", "gbElectricSlash": "energyslash" },
  beerus: { "ultimate": "spiritbomb" },
  naruto_seventh: { "n7Bijuudama": "spiritbomb", "n7BijuuGather": "spiritbomb", "ultimate": "spiritbomb", "n7Rasengan": "orb", "n7Rasenshuriken": "orb", "n7RasenkyuganBall": "orb", "n7Wakusei": "orb", "n7DotonWall": "rockline" },
  madara: { "madaraBijuudama": "spiritbomb", "madaraBijuCharge": "spiritbomb", "ultimate": "spiritbomb", "madaraFireball": "firebreath", "madaraGokaMekkyaku": "firebreath", "madaraGoryuka": "firebreath", "madaraWoodSpike": "rockline", "madaraWoodDragon": "rockline", "madaraWoodDragonBurst": "rockline", "madaraJukai": "rockline", "madaraKajukai": "rockline" },
  gaara: { "gaara_tbb": "spiritbomb" },
  vegeta: { "galickGun": "beam", "superGalick": "beam", "diagGalick": "beam", "finalFlash": "beam", "bigBang": "beam" },
  genos: { "genosIncineration": "beam", "genosMachinegun": "gatling" },
  superman: { "superman_heatvision": "beam", "superman_solarbeam": "beam", "freezeBreath": "ice" },
  homelander: { "heatCharge": "beam", "hlBarrage": "gatling" },
  yuji: { "yujiBeam": "beam", "yujiCrescent": "energyslash" },
  yuta: { "yutaCem": "beam" },
  alt_sukuna: { "altSukunaBeam": "beam" },
  gwen: { "gwenOval": "beam", "gwenCrescent": "energyslash" },
  starfire: { "sfLaser": "beam", "sfAirLaser": "beam", "sfUltOpen": "beam", "ultimate": "beam" },
  naruto: { "rasengan": "orb", "rasenganOrb": "orb", "bigBallRasengan": "orb", "bigBallRasenganOrb": "orb", "rasenshuriken": "orb", "darkRasengan": "orb", "darkRasenganRings": "orb" },
  minato: { "minatoRasengan": "orb", "minatoRasenganOrb": "orb", "minatoBigBall": "orb" },
  jiraiya: { "jiraiyaRasengan": "orb", "jiraiyaChouOdama": "orb", "jiraiyaFire": "firebreath", "jiraiyaBigFire": "firebreath" },
  sasuke_adult: { "chidori": "orb", "chidoriFx": "orb", "itachiFireball": "firebreath" },
  sasuke: { "chidoriKoiten": "orb", "chidoriKoitenFx": "orb" },
  sasuke_sensei: { "ssChidori": "orb", "ssChidoriEisou": "orb", "ssChidoriAir": "orb", "ssFireball": "firebreath" },
  kakashi: { "kakashiRaikiriDash": "orb", "ultimate": "orb" },
  kakashi_anbu: { "raikiri": "orb" },
  kakashi_war: { "raikiri": "orb" },
  luffy: { "lfGatling": "gatling", "lfPiston": "stretch", "lfBazooka": "stretch", "lfReel": "stretch", "lfFinale": "stretch", "ultimate": "stretch", "lfStamp": "stretch" },
  netero: { "barragePunches": "gatling", "guanyinCombo": "gatling", "ultimate": "gatling" },
  baki: { "bakiBarrage": "gatling" },
  saitama: { "consecutivePunches": "gatling" },
  hinata: { "hhHasangeki": "gatling" },
  ippo: { "ippoDempseyFlurry": "gatling", "ultimate": "gatling" },
  dash_parr: { "flurry": "gatling" },
  sanji: { "sHachis": "gatling", "sPTKC": "gatling", "ultimate": "gatling" },
  elastigirl: { "eLongArm": "stretch", "eLongPull": "stretch", "eLongWhiff": "stretch", "eWhip": "stretch", "light": "stretch" },
  tobirama: { "tobiWaterDragon": "waterdragon", "tobiWaterSlash": "waterdragon", "tobiRisingWater": "waterdragon", "tobiWaterWall": "waterdragon" },
  arlong: { "aShot": "waterdragon", "aTidal": "waterdragon", "aKTidal": "waterdragon", "aSuper": "waterdragon", "ultimate": "waterdragon" },
  itachi: { "itachiFireball": "firebreath" },
  tobi: { "tobiFireGiant": "firebreath", "tobiFireBurst": "firebreath", "tobiFireSub": "firebreath" },
  rengoku: { "ultimate": "firebreath" },
  hashirama: { "hashiCloneTree": "rockline", "hashiTree": "rockline" },
  mr_incredible: { "miSlam": "rockline" },
  sakura: { "cherryImpact": "rockline", "ultimate": "rockline" },
  zoro: { "zOni": "iai", "zShishi": "iai", "zShishiStrike": "iai", "zAshura": "iai", "ultimate": "iai", "zTaka": "energyslash", "zoroTakaNami": "energyslash" },
  zenitsu: { "zenThunderclap": "iai", "godspeed": "iai", "zenUltimate": "iai", "ultimate": "iai" },
  miwa: { "iaiDash": "iai", "ultimate": "iai" },
  ichigo: { "ichigo_getsuga": "energyslash", "ichigoAirGetsuga": "energyslash", "ichigoHollowGetsuga": "energyslash", "ultimate": "energyslash" },
  gold_samurai_ranger: { "lightSlash": "energyslash", "gold_light_slashwave": "energyslash" },
  samurai_red_ranger: { "flameSlash": "energyslash", "samurai_flameburst": "energyslash" },
  green_samurai_ranger: { "forestSpear": "energyslash", "forest_spear_wave": "energyslash" },
  mayuri: { "mayuriSlash": "energyslash" },
  sukuna: { "dismantle": "energyslash" },
  vilgax: { "rubyCrescents": "energyslash" },
  frozone: { "fLance": "ice", "frozone_lance": "ice", "fRush": "ice", "fRise": "ice", "fBlackIce": "ice", "frozone_blackIce": "ice", "fBreaker": "ice", "fWall": "ice", "frozone_wall": "ice", "ultOpen": "ice", "ultimate": "ice" },
  green_arrow: { "iceArrow": "ice" },
}
export const SIG_COLORS = {
  spiritbomb: [150, 210, 255], beam: [255, 210, 90], orb: [120, 200, 255], gatling: [255, 170, 90], stretch: [255, 120, 90],
  waterdragon: [60, 190, 255], firebreath: [255, 130, 40], rockline: [170, 140, 110], iai: [210, 230, 255], energyslash: [120, 200, 255], ice: [190, 235, 255]
}
const _norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '')
const _idx = new Map()   // rosterKey → Map(normalised key/name → family)
function index() { if (_idx.size) return; for (const [k, m] of Object.entries(SIGNATURE_MOVES)) { const mm = new Map(); for (const [n, fam] of Object.entries(m)) mm.set(_norm(n), fam); _idx.set(k.toLowerCase(), mm) } }
export function sigFamily(f, moveKey, moveName, isUlt) {
  const k = String(f?.rosterKey || '').toLowerCase(); if (!k || isBen(k)) return null
  index(); const m = _idx.get(k); if (!m) return null
  const byName = moveName && m.get(_norm(moveName)); if (byName) return byName   // the spark's own id (move key / projectile type) wins
  const byKey = moveKey && m.get(_norm(moveKey)); if (byKey) return byKey
  if (isUlt) return m.get('ultimate') || (f.ultimate?.name && m.get(_norm(f.ultimate.name))) || null
  return null
}

// ═══ STATE ═══
const S = { fx: [], decals: [], hud: [], impacts: [], live: [null, null], lastHit: [{}, {}], frame: 0 }
export function sigReset() { sigFeelReset(); S.fx.length = 0; S.decals.length = 0; S.hud.length = 0; S.impacts.length = 0; S.live = [null, null]; S.lastHit = [{}, {}] }
export function sigStatus() { return { fx: S.fx.map(e => e.kind), decals: S.decals.map(d => d.kind), hud: S.hud.map(h => h.kind), live: S.live.map(l => l?.fam || null), impacts: S.impacts.length } }
export function sigTakeImpacts() { const q = S.impacts.slice(); S.impacts.length = 0; return q }
const push = (arr, e, cap) => { arr.push(e); if (arr.length > cap) arr.shift() }

// ═══ START: the move begins (animeJuice tick sees currentMove change / the ultimate start) ═══
export function sigOnStart(f, side, fam, isUlt, frame, foe) {
  if (!fam) return
  S.live[side] = { fam, move: f.currentMove || null, ult: !!isUlt, t: 0 }
  const big = isUlt ? 1.5 : 1, col = SIG_COLORS[fam], seed = frame * 7 + side
  const e = { side, t: 0, col, big, seed, ult: !!isUlt }
  if (fam === 'spiritbomb') push(S.fx, { ...e, kind: 'sb_gather', life: 64 }, 60)
  else if (fam === 'beam') { push(S.fx, { ...e, kind: 'beam_charge', life: isUlt ? 44 : 30 }, 60) }
  else if (fam === 'orb') push(S.fx, { ...e, kind: 'orb_form', life: 26 }, 60)
  else if (fam === 'stretch') push(S.fx, { ...e, kind: 'stretch_wind', life: 14 }, 60)
  else if (fam === 'waterdragon') { push(S.fx, { ...e, kind: 'water_rise', life: 42, x: ctrX(f), y: floorOf(f) }, 60) }
  else if (fam === 'firebreath') push(S.fx, { ...e, kind: 'fire_inhale', life: 18 }, 60)
  else if (fam === 'rockline' && foe) push(S.fx, { ...e, kind: 'rock_line', life: 70, x0: ctrX(f), x1: ctrX(foe), y: floorOf(f), dir: Math.sign(ctrX(foe) - ctrX(f)) || (f.facing || 1) }, 60)
  else if (fam === 'iai') push(S.fx, { ...e, kind: 'iai_draw', life: 12, x: ctrX(f), y: f.y || 0, h: f.h || 100, dir: f.facing || 1 }, 60)
  else if (fam === 'energyslash') push(S.fx, { ...e, kind: 'slash_charge', life: 16 }, 60)
  else if (fam === 'ice') push(S.fx, { ...e, kind: 'ice_charge', life: 16 }, 60)
}

// ═══ HIT: a fresh spark of a signature move. Returns true when the family owns the aftermath (animeJuice skips its generic decal) ═══
export function sigOnHit(spark, att, def, fam, frame, ai, opts = {}) {
  if (!fam || !att || !def) return false
  const fr = frame | 0, col = SIG_COLORS[fam], isUlt = spark.category === 'ultimate' || !!att.isUltimateActive
  const x = ctrX(def), y = (def.y || 0) + (def.h || 100) * 0.5, fy = floorOf(def), seed = fr * 5 + ai
  const last = S.lastHit[ai][fam] ?? -999, fresh = fr - last > 24   // one big impact per move instance (multi-hits re-use it)
  S.lastHit[ai][fam] = fr
  const tier = isUlt ? 'ultimate' : 'medium'
  const lvl = sigLevel()
  if (fam === 'gatling') {   // every hit: a smear streak + shake on the target (ramps); the string's end is animeJuice's final ring
    push(S.fx, { kind: 'gat_hit', x: spark.x, y: spark.y, t: 0, life: 8, col, dir: att.facing || 1, seed }, 60)
    return false
  }
  if (!fresh) {   // the multi-hit tail of a beam / water / fire: keep feeding the impact
    if (fam === 'beam' || fam === 'firebreath' || fam === 'waterdragon') { const e = S.fx.find(z => z.ai === ai && (z.kind === 'dome' || z.kind === 'fire_swallow' || z.kind === 'crown')); if (e) e.t = Math.min(e.t, 10) }
    return fam !== 'stretch'
  }
  S.impacts.push({ tier, x: spark.x, y: spark.y, ai })
  const flip = fam === 'iai' || fam === 'energyslash'
  if (flip) push(S.hud, { kind: noFlash() ? 'dim' : 'flip', t: 0, life: 14 }, 6)   // ~¼ s colour flip (Reduce Flashing → a soft dim)
  const big = isUlt ? 1.5 : 1, e = { t: 0, x, y, fy, col, big, seed, ai, dir: att.facing || 1 }
  if (fam === 'spiritbomb' || fam === 'beam' || fam === 'orb') {
    push(S.fx, { ...e, kind: 'dome', life: fam === 'spiritbomb' ? 54 : 40, r: (fam === 'spiritbomb' ? 120 : fam === 'beam' ? 90 : 70) * big }, 60)
    if (fam === 'orb') push(S.fx, { ...e, kind: 'orb_grind', life: 14, x: spark.x, y: spark.y }, 60)
    play('aj_whoomp'); shake(fam === 'spiritbomb' ? 12 : 8, 14)
    if (lvl === 'full') push(S.decals, { ...e, kind: fam === 'orb' ? 'spiral_scar' : 'big_crater', y: fy, w: (fam === 'spiritbomb' ? 230 : 160) * big, life: 360 }, 8)
  } else if (fam === 'waterdragon') {
    push(S.fx, { ...e, kind: 'crown', life: 60 }, 60); play('aj_splash'); shake(5, 8)
    if (lvl === 'full') for (let j = 0; j < 3; j++) push(S.decals, { ...e, kind: 'puddle', x: x + (H(seed, j, 1) - 0.5) * 120, y: fy, w: 50 + H(seed, j, 2) * 50, life: 300 + j * 40 }, 8)
  } else if (fam === 'firebreath') {
    push(S.fx, { ...e, kind: 'fire_swallow', life: 46, r: 60 * big }, 60); play('aj_whoomp'); shake(6, 10)
    if (lvl === 'full') push(S.decals, { ...e, kind: 'burn_smoke', y: fy, w: 150 * big, life: 320 }, 8)
  } else if (fam === 'rockline') {
    push(S.fx, { ...e, kind: 'rock_final', life: 40, y: fy }, 60); shake(9, 12)
    if (lvl === 'full') push(S.decals, { ...e, kind: 'rock_scar', y: fy, w: 180, life: 340 }, 8)
  } else if (fam === 'iai' || fam === 'energyslash') {
    const ang = fam === 'iai' ? -0.12 : -0.55, split = !!(opts.splitOk && (def.health || 0) <= 0)
    push(S.fx, { ...e, kind: 'iai_cut', life: 46, ang, len: (def.h || 100) * 1.7, delay: fam === 'iai' ? 16 : 4, split, bx: def.x || 0, by: def.y || 0, bw: def.w || 60, bh: def.h || 100 }, 60)
    if (fam === 'energyslash') push(S.fx, { ...e, kind: 'crescent', life: 22, x: spark.x, y: spark.y }, 60)
    if (lvl === 'full') push(S.decals, { ...e, kind: 'scar', y: fy, w: 170 * big, life: 300 }, 8)
  } else if (fam === 'stretch') {
    push(S.fx, { ...e, kind: 'stretch_hit', life: 22, x: spark.x, y: spark.y, ox: hand(att).x, oy: hand(att).y }, 60); shake(6, 8)
    return false
  } else if (fam === 'ice') {
    push(S.fx, { ...e, kind: 'ice_cluster', life: 50, y: fy }, 60); shake(7, 10)
    if (lvl === 'full') push(S.decals, { ...e, kind: 'frost', y: fy, w: 160, life: 300 }, 8)
  }
  return true
}

// ═══ SIM-SIDE FEEL (deterministic; game.js spark loop; logged in CHANGES.md): beam recoil + gatling ramp push ═══
export const SIG_FEEL = { beamRecoil: 1.5, gatlingPush: 1.2, gatlingFrom: 3 }
// SETTING-INDEPENDENT on purpose (runs for every peer / replay identically): its own chain counter, reset with the round.
const FEEL = { chain: [null, null] }
export function sigFeel(spark, p1, p2, frame, stageWidth = 3200) {
  if (!spark || spark.blocked || spark.category === 'parry' || spark.category === 'clash') return
  const ai = spark.attackerSide === 'p2' ? 1 : spark.attackerSide === 'p1' ? 0 : -1; if (ai < 0) return
  const att = ai ? p2 : p1, def = ai ? p1 : p2; if (!att || !def) return
  const isUlt = spark.category === 'ultimate' || !!att.isUltimateActive, name = String(spark.moveName || '')
  const fam = sigFamily(att, isUlt ? 'ultimate' : att.currentMove, name, isUlt); if (!fam) { FEEL.chain[ai] = null; return }
  const c = FEEL.chain[ai], fr = frame | 0
  if (c && c.move === name && fr - c.last <= 14) { c.n++; c.last = fr } else FEEL.chain[ai] = { move: name, n: 1, last: fr }
  const n = FEEL.chain[ai].n, clampX = f => { f.x = Math.max(0, Math.min(stageWidth - (f.w || 60), f.x)) }
  if (fam === 'beam' && (att.onGround ?? att.grounded)) { att.x -= (att.facing || 1) * SIG_FEEL.beamRecoil; clampX(att) }   // recoil: the caster digs in and slides back
  if (fam === 'gatling' && n >= SIG_FEEL.gatlingFrom) { def.x += (att.facing || 1) * SIG_FEEL.gatlingPush * Math.min(3, n - SIG_FEEL.gatlingFrom + 1) / 2; clampX(def) }   // the ramp pushes them back
}
export function sigFeelReset() { FEEL.chain = [null, null] }

// ═══ TICK ═══
export function sigTick(fs, frame) {
  S.frame = frame | 0
  for (let i = 0; i < 2; i++) {   // LIVE: the move is still running?
    const l = S.live[i], f = fs[i]; if (!l) continue
    l.t++
    const still = f && (l.ult ? !!f.isUltimateActive || l.t < 20 : (f.currentMove === l.move && !!f.attacking) || l.t < 6)
    if (!still || l.t > 240) S.live[i] = null
  }
  for (const arr of [S.fx, S.decals, S.hud]) for (let k = arr.length - 1; k >= 0; k--) if (++arr[k].t > arr[k].life) arr.splice(k, 1)
}

// ═══ DRAW helpers ═══
function spiralIn(c, cx, cy, p, n, rad, col, seed, w = 2) {
  for (let j = 0; j < n; j++) {
    const a0 = H(seed, j, 31) * TAU, an = a0 + p * 3, r = rad * (1 - p) * (0.55 + 0.45 * H(seed, j, 32)) + 4
    c.globalAlpha = 0.3 + 0.7 * p; c.strokeStyle = j % 3 ? rgba(col, 1) : '#ffffff'; c.lineWidth = w
    c.beginPath(); c.moveTo(R(cx + Math.cos(an) * r), R(cy + Math.sin(an) * r * 0.8)); c.lineTo(R(cx + Math.cos(an - 0.4) * (r + 16)), R(cy + Math.sin(an - 0.4) * (r + 16) * 0.8)); c.stroke()
  }
}
function core(c, x, y, r, col, a = 1) {   // three tones: dark edge, colour body, white-hot core
  c.globalAlpha = 0.35 * a; c.fillStyle = rgba(col, 1); c.beginPath(); c.arc(R(x), R(y), R(r * 1.7), 0, TAU); c.fill()
  c.globalAlpha = 0.9 * a; c.fillStyle = rgba(col.map(v => v * 0.55), 1); c.beginPath(); c.arc(R(x), R(y), R(r), 0, TAU); c.fill()
  c.fillStyle = rgba(col, 1); c.beginPath(); c.arc(R(x), R(y), R(r * 0.78), 0, TAU); c.fill()
  c.fillStyle = '#ffffff'; c.beginPath(); c.arc(R(x), R(y), R(r * 0.45), 0, TAU); c.fill()
}
function brokenRings(c, x, y, r, t, col, seed) {   // thin broken rings orbiting, each tilted a different way
  for (let j = 0; j < 3; j++) {
    const tilt = (H(seed, j, 61) - 0.5) * 2.4, sp = 0.25 + j * 0.08
    c.save(); c.translate(R(x), R(y)); c.rotate(tilt); c.globalAlpha = 0.85; c.strokeStyle = j ? rgba(col, 1) : '#ffffff'; c.lineWidth = 1.5
    for (let s = 0; s < 3; s++) { const a0 = t * sp + s * TAU / 3; c.beginPath(); c.ellipse(0, 0, R(r * (1.35 + j * 0.18)), R(r * 0.45), 0, a0, a0 + 1.3); c.stroke() }
    c.restore()
  }
}
function rock(c, x, base, h, w, lean, light, dark) {   // a sharp rock spike: flat faces, light on top, dark underneath
  c.fillStyle = dark; c.beginPath(); c.moveTo(R(x - w), R(base)); c.lineTo(R(x + lean), R(base - h)); c.lineTo(R(x + w), R(base)); c.fill()
  c.fillStyle = light; c.beginPath(); c.moveTo(R(x - w), R(base)); c.lineTo(R(x + lean), R(base - h)); c.lineTo(R(x + lean * 0.4 - w * 0.15), R(base - h * 0.35)); c.fill()
}
function flame(c, x, y, r, t, seed) {   // white-hot core, orange body, blood-red edge; the shape redraws ~12×/s
  const fr = Math.floor(t / 5)
  const blob = (rr, colr) => {
    c.fillStyle = colr; c.beginPath()
    for (let j = 0; j <= 14; j++) { const a = j / 14 * TAU, wob = 0.75 + 0.45 * H(seed + fr, j, 71) + (Math.sin(a) < -0.3 ? 0.35 : 0); const px = x + Math.cos(a) * rr * wob, py = y + Math.sin(a) * rr * wob * 0.9 - (Math.sin(a) < 0 ? rr * 0.25 : 0); j ? c.lineTo(R(px), R(py)) : c.moveTo(R(px), R(py)) }
    c.closePath(); c.fill()
  }
  blob(r, 'rgb(170,20,10)'); blob(r * 0.78, 'rgb(255,120,30)'); blob(r * 0.5, 'rgb(255,210,90)'); blob(r * 0.26, '#fffbe8')
}

// ═══ DRAW: WORLD (over fighters) ═══
export function drawSigWorld(c, fs) {
  if (sigLevel() === 'off') return
  c.save()
  // LIVE layers (full only): gatling ghost fists + smear, orb rush trail, beam recoil dust, iai afterimages
  if (full()) for (let i = 0; i < 2; i++) {
    const l = S.live[i], f = fs[i]; if (!l || !f) continue
    const d = f.facing || 1, hx = hand(f).x, hy = hand(f).y, col = SIG_COLORS[l.fam]
    if (l.fam === 'gatling' && l.t > 2) {   // a WALL of ghost fists hanging in the air + both arms smeared into streaks; red hot as it ramps
      const heat = Math.min(1, l.t / 60), n = pN(14)
      for (let j = 0; j < n; j++) {
        const ph = (l.t * 0.9 + j * 2.3) % 6, fx = hx + d * (14 + H(l.t >> 1, j, 81) * 46), fy = hy - 26 + H(l.t >> 1, j, 82) * 52
        c.globalAlpha = 0.18 + 0.25 * (1 - ph / 6); c.fillStyle = heat > 0.6 ? 'rgb(255,140,90)' : 'rgb(255,230,200)'
        c.beginPath(); c.arc(R(fx), R(fy), R(7 + heat * 3), 0, TAU); c.fill()
        c.globalAlpha = 0.25; c.strokeStyle = rgba(col, 1); c.lineWidth = 3; c.beginPath(); c.moveTo(R(fx - d * 22), R(fy)); c.lineTo(R(fx - d * 4), R(fy)); c.stroke()
      }
      if (l.t > 40) for (let j = 0; j < pN(4); j++) { const tt = (l.t + j * 11) % 30; c.globalAlpha = 0.25 * (1 - tt / 30); c.fillStyle = 'rgb(230,230,235)'; c.beginPath(); c.arc(R(hx + (H(j, 3, 83) - 0.5) * 30), R(hy - 10 - tt * 1.4), R(5 + tt * 0.4), 0, TAU); c.fill() }   // steam
    } else if (l.fam === 'orb' && Math.abs(f.vx || 0) > 3) {   // rush: speed lines + the orb's trail
      for (let j = 0; j < pN(8); j++) { const yy = (f.y || 0) + H(l.t >> 1, j, 84) * (f.h || 100), L = 30 + H(l.t, j, 85) * 50; c.globalAlpha = 0.45; c.strokeStyle = '#ffffff'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(R(ctrX(f) - d * 20), R(yy)); c.lineTo(R(ctrX(f) - d * (20 + L)), R(yy)); c.stroke() }
      c.globalAlpha = 0.5; c.strokeStyle = rgba(col, 1); c.lineWidth = 10; c.beginPath(); c.moveTo(R(hx), R(hy)); c.lineTo(R(hx - d * 70), R(hy + 4)); c.stroke()
      core(c, hx, hy, 10, col); brokenRings(c, hx, hy, 10, l.t, col, i)
    } else if (l.fam === 'beam' && l.t > 6 && (f.onGround ?? f.grounded)) {   // recoil: feet dig in, dust kicks back
      const fy = floorOf(f)
      for (let j = 0; j < pN(5); j++) { const tt = (l.t + j * 6) % 24; c.globalAlpha = 0.3 * (1 - tt / 24); c.fillStyle = 'rgb(170,150,120)'; c.beginPath(); c.arc(R(ctrX(f) - d * (20 + tt * 2)), R(fy - 4 - tt * 0.4), R(4 + tt * 0.35), 0, TAU); c.fill() }
    } else if (l.fam === 'iai' && Math.abs(f.vx || 0) > 3) {   // the teleport: afterimages trail behind
      for (let j = 1; j <= 3; j++) { c.globalAlpha = 0.22 / j; c.fillStyle = rgba(col, 1); c.fillRect(R(f.x - d * j * 26), R(f.y || 0), R(f.w || 60), R(f.h || 100)) }
    }
  }
  for (const e of S.fx) {
    const k = e.t / e.life, f = e.side != null ? fs[e.side] : null
    if (e.kind === 'sb_gather' && f) {   // both hands up; energy pours in from everywhere; the ball grows in STAGES; rocks float up
      const ox = ctrX(f), oy = (f.y || 0) - 30, stage = Math.min(4, Math.floor(e.t / 12)), r = (10 + stage * 11) * e.big
      spiralIn(c, ox, oy - r, Math.min(1, (e.t % 12) / 12), pN(22), 520, e.col, e.seed + stage, 2)
      core(c, ox, oy - r, r, e.col)
      if (e.t % 12 === 0 && e.t > 0 && e.t <= 48) { shake(3 + stage * 1.5, 6); push(S.fx, { kind: 'ring_s', x: ox, y: oy - r, t: 0, life: 10, r0: r, col: e.col }, 60) }
      const fy = floorOf(f)
      for (let j = 0; j < pN(8); j++) { const rx = ox + (H(e.seed, j, 91) - 0.5) * 220, ry = fy - e.t * (0.4 + H(e.seed, j, 92) * 0.6), s = 4 + H(e.seed, j, 93) * 6; c.globalAlpha = 0.85; c.fillStyle = 'rgb(120,105,90)'; c.fillRect(R(rx), R(ry), R(s), R(s * 0.8)) }
    } else if (e.kind === 'beam_charge' && f) {   // energy in on a spiral, rocks lift around him
      const h = hand(f), p = Math.min(1, e.t / (e.life * 0.8))
      spiralIn(c, h.x, h.y, p, pN(e.ult ? 18 : 12), 140 * e.big, e.col, e.seed)
      core(c, h.x, h.y, (4 + 9 * p) * e.big, e.col)
      const fy = floorOf(f)
      for (let j = 0; j < pN(6); j++) { const rx = ctrX(f) + (H(e.seed, j, 94) - 0.5) * 160, ry = fy - 4 - Math.min(e.t, 24) * (0.8 + H(e.seed, j, 95)) + Math.sin(e.t * 0.3 + j) * 2, s = 4 + H(e.seed, j, 96) * 7; c.globalAlpha = 0.9; c.fillStyle = 'rgb(110,96,84)'; c.fillRect(R(rx), R(ry), R(s), R(s * 0.75)) }
      if (e.t % 4 === 0) shake(2, 3)
    } else if (e.kind === 'orb_form' && f) {   // gather into the palm on a spiral until it forms an orb with tilted broken rings
      const h = hand(f), p = Math.min(1, e.t / 16)
      spiralIn(c, h.x, h.y, p, pN(12), 70, e.col, e.seed)
      if (p >= 0.6) { core(c, h.x, h.y, 9 * e.big, e.col); brokenRings(c, h.x, h.y, 9 * e.big, e.t, e.col, e.seed) }
    } else if (e.kind === 'stretch_wind' && f) {   // the arm twisted like a spring, pulled way back
      const d = f.facing || 1, sx = ctrX(f), sy = (f.y || 0) + (f.h || 100) * 0.38
      c.globalAlpha = 0.85 * (1 - k); c.strokeStyle = rgba(e.col, 1); c.lineWidth = 2; c.beginPath()
      for (let j = 0; j <= 10; j++) { const px = sx - d * j * 4, py = sy + (j % 2 ? -7 : 7) * (1 - k); j ? c.lineTo(R(px), R(py)) : c.moveTo(R(px), R(py)) }
      c.stroke()
    } else if (e.kind === 'water_rise') {   // water spirals out of the floor around him: white crest, cyan body, deep-blue edge; drops peel off
      const p = Math.min(1, e.t / 30)
      for (let s = 0; s < 3; s++) {
        const cols = ['rgb(20,70,170)', 'rgb(60,200,255)', '#ffffff'], ww = [9, 6, 2]
        c.globalAlpha = 0.85 * (1 - Math.max(0, k - 0.75) * 4); c.strokeStyle = cols[s]; c.lineWidth = ww[s]; c.beginPath()
        for (let j = 0; j <= 24; j++) { const u = j / 24 * p, a = u * TAU * 2 + e.t * 0.12, rx = e.x + Math.cos(a) * 46, ry = e.y - u * 150 + Math.sin(a) * 8; j ? c.lineTo(R(rx), R(ry)) : c.moveTo(R(rx), R(ry)) }
        c.stroke()
      }
      for (let j = 0; j < pN(8); j++) { const tt = (e.t + j * 5) % 26, px = e.x + (H(e.seed, j, 97) - 0.5) * 100, py = e.y - 40 - H(e.seed, j, 98) * 100 + tt * tt * 0.12; c.globalAlpha = 0.8 * (1 - tt / 26); c.fillStyle = 'rgb(150,225,255)'; c.beginPath(); c.arc(R(px), R(py), 2.5, 0, TAU); c.fill() }
    } else if (e.kind === 'fire_inhale' && f) {   // breathe in: lean back, swell, air rushes into the mouth
      const d = f.facing || 1, mx = ctrX(f) + d * (f.w || 60) * 0.3, my = (f.y || 0) + (f.h || 100) * 0.18
      for (let j = 0; j < pN(10); j++) { const an = (H(e.seed, j, 99) - 0.5) * 1.6 + (d > 0 ? 0 : Math.PI), r = 90 * (1 - k) + 6; c.globalAlpha = 0.6 * k + 0.2; c.strokeStyle = '#ffffff'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(R(mx + Math.cos(an) * r), R(my + Math.sin(an) * r)); c.lineTo(R(mx + Math.cos(an) * (r + 18)), R(my + Math.sin(an) * (r + 18))); c.stroke() }
      c.globalAlpha = 0.5 * k; c.strokeStyle = 'rgb(255,170,80)'; c.lineWidth = 2; c.beginPath(); c.arc(R(ctrX(f)), R((f.y || 0) + (f.h || 100) * 0.35), R((f.w || 60) * (0.5 + 0.15 * k)), 0, TAU); c.stroke()
    } else if (e.kind === 'rock_line') {   // a glowing crack races at the target; sharp rocks pop up (fast up, slow down), each bigger; every rock kicks the camera
      const n = 7, span = (e.x1 - e.x0), run = Math.min(1, e.t / 28)
      c.globalAlpha = 0.9; c.strokeStyle = 'rgb(255,190,90)'; c.lineWidth = 2; c.beginPath(); c.moveTo(R(e.x0), R(e.y)); for (let s = 1; s <= 12; s++) { const u = s / 12 * run; c.lineTo(R(e.x0 + span * u), R(e.y + (H(e.seed, s, 101) - 0.5) * 4)) } c.stroke()
      for (let j = 0; j < n; j++) {
        const born = 4 + j * 4, tt = e.t - born; if (tt < 0) continue
        if (tt === 0) shake(2 + j * 0.6, 4)
        const u = (j + 1) / n, rx = e.x0 + span * u, size = 18 + j * 9, up = tt < 3 ? tt / 3 : tt < 34 ? 1 : Math.max(0, 1 - (tt - 34) / 14)
        c.globalAlpha = 1; rock(c, rx, e.y, size * up * 1.6, size * 0.45, e.dir * size * 0.15, 'rgb(205,185,160)', 'rgb(90,74,62)')
        if (tt > 34) for (let m = 0; m < 3; m++) { const fall = (tt - 34) * (tt - 34) * 0.12; c.fillStyle = 'rgb(120,100,84)'; c.fillRect(R(rx + (m - 1) * 8), R(e.y - size * 0.8 + fall), 5, 4) }   // chunks fall straight down
      }
    } else if (e.kind === 'iai_draw') {   // vanish: speed streak + afterimages from where he stood
      c.globalAlpha = 0.7 * (1 - k); c.strokeStyle = rgba(e.col, 1); c.lineWidth = 3
      for (let j = 0; j < 5; j++) { const yy = e.y + e.h * (0.2 + j * 0.15); c.beginPath(); c.moveTo(R(e.x), R(yy)); c.lineTo(R(e.x + e.dir * 160 * Math.min(1, e.t / 4)), R(yy)); c.stroke() }
    } else if (e.kind === 'slash_charge' && f) {   // light crawls up the blade
      const h = hand(f), p = Math.min(1, e.t / 12)
      c.globalAlpha = 0.9; c.strokeStyle = rgba(e.col, 1); c.lineWidth = 4; c.beginPath(); c.moveTo(R(h.x), R(h.y)); c.lineTo(R(h.x + (f.facing || 1) * 14), R(h.y - 60 * p)); c.stroke()
      c.strokeStyle = '#ffffff'; c.lineWidth = 1.5; c.stroke()
    } else if (e.kind === 'ice_charge' && f) {
      const h = hand(f), p = Math.min(1, e.t / 12)
      spiralIn(c, h.x, h.y, p, pN(10), 60, e.col, e.seed); if (e.t >= 12) core(c, h.x, h.y, 8 * (1 + (e.t - 12) / 2), e.col, 1 - k)
    } else if (e.kind === 'ring_s') {
      c.globalAlpha = 1 - k; c.strokeStyle = rgba(e.col, 1); c.lineWidth = 3; c.beginPath(); c.arc(R(e.x), R(e.y), R(e.r0 + e.t * 5), 0, TAU); c.stroke()
    } else if (e.kind === 'dome') {   // white flash, then a dome of energy swallows the target; most of it is the fade
      if (e.t < 3 && !noFlash()) { c.globalAlpha = 0.9; c.fillStyle = '#ffffff'; c.beginPath(); c.arc(R(e.x), R(e.y), R(e.r * 0.7), 0, TAU); c.fill() }
      const grow = Math.min(1, e.t / 8), a = e.t < 20 ? 0.8 : 0.8 * (1 - (e.t - 20) / (e.life - 20)), rr = e.r * grow
      const g = c.createRadialGradient(R(e.x), R(e.fy), 0, R(e.x), R(e.fy), R(Math.max(1, rr)))
      g.addColorStop(0, `rgba(255,255,255,${(a).toFixed(3)})`); g.addColorStop(0.55, rgba(e.col, a * 0.8)); g.addColorStop(1, rgba(e.col, 0))
      c.globalAlpha = 1; c.fillStyle = g; c.beginPath(); c.ellipse(R(e.x), R(e.fy), R(rr), R(rr * 0.95), 0, Math.PI, TAU); c.fill()
      c.globalAlpha = a; c.strokeStyle = '#ffffff'; c.lineWidth = 2; c.beginPath(); c.ellipse(R(e.x), R(e.fy), R(rr), R(rr * 0.95), 0, Math.PI, TAU); c.stroke()
    } else if (e.kind === 'orb_grind') {   // hold it against them and spin it faster, then blast
      core(c, e.x, e.y, 14 + e.t * 0.6, e.col, 1 - Math.max(0, k - 0.7) * 3); brokenRings(c, e.x, e.y, 14 + e.t * 0.6, e.t * 4, e.col, e.seed)
    } else if (e.kind === 'crown') {   // a crown of water explodes around the target; teardrops rain down and splash
      if (e.t < 18) for (let j = 0; j < pN(16); j++) {
        const an = Math.PI + (j + 0.5) / 16 * Math.PI, sp = 5 + H(e.seed, j, 111) * 4, tt = e.t, px = e.x + Math.cos(an) * sp * tt * 1.3, py = e.fy + Math.sin(an) * sp * tt + 0.35 * tt * tt
        c.globalAlpha = 1 - tt / 18; c.fillStyle = j % 3 ? 'rgb(70,200,255)' : '#ffffff'; c.beginPath(); c.ellipse(R(px), R(py), 3, 6, an + Math.PI / 2, 0, TAU); c.fill()
      }
      if (e.t < 10) { c.globalAlpha = 0.8 * (1 - e.t / 10); c.strokeStyle = 'rgb(20,90,190)'; c.lineWidth = 6; c.beginPath(); c.ellipse(R(e.x), R(e.fy), R(30 + e.t * 9), R(8 + e.t * 1.5), 0, Math.PI, TAU); c.stroke() }
      for (let j = 0; j < pN(10); j++) {   // teardrops falling later, a splash where each lands
        const start = 14 + H(e.seed, j, 112) * 30, tt = e.t - start; if (tt < 0) continue
        const px = e.x + (H(e.seed, j, 113) - 0.5) * 200, py = e.fy - 260 + tt * tt * 0.5
        if (py < e.fy) { c.globalAlpha = 0.85; c.fillStyle = 'rgb(120,215,255)'; c.beginPath(); c.moveTo(R(px), R(py - 7)); c.quadraticCurveTo(R(px + 4), R(py + 2), R(px), R(py + 3)); c.quadraticCurveTo(R(px - 4), R(py + 2), R(px), R(py - 7)); c.fill() }
        else { const st = py - e.fy; c.globalAlpha = Math.max(0, 0.7 - st / 60); c.strokeStyle = 'rgb(160,225,255)'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(R(px), R(e.fy - 1), R(3 + st * 0.15), 2, 0, Math.PI, TAU); c.stroke() }
      }
    } else if (e.kind === 'fire_swallow') {   // fire swallows the target, then cartoon smoke
      const grow = Math.min(1, e.t / 6), a = e.t < 26 ? 1 : 1 - (e.t - 26) / (e.life - 26)
      c.globalAlpha = Math.max(0, a); flame(c, e.x, e.y, e.r * grow, e.t, e.seed)
      if (e.t > 20) for (let j = 0; j < pN(6); j++) { const tt = e.t - 20, px = e.x + (j - 2.5) * 16 + Math.sin(tt * 0.1 + j) * 4, py = e.y - 20 - tt * 1.2 - j * 5; c.globalAlpha = Math.max(0, 0.55 - tt / 50); c.fillStyle = 'rgb(80,72,70)'; c.beginPath(); c.arc(R(px), R(py), R(10 + tt * 0.35), 0, TAU); c.fill() }
    } else if (e.kind === 'rock_final') {   // the last spike hits under the target — huge
      const up = e.t < 3 ? e.t / 3 : e.t < 24 ? 1 : Math.max(0, 1 - (e.t - 24) / 16)
      c.globalAlpha = 1; rock(c, e.x, e.y, 150 * up, 34, e.dir * 18, 'rgb(215,195,170)', 'rgb(80,66,56)')
      rock(c, e.x - e.dir * 40, e.y, 70 * up, 18, -e.dir * 14, 'rgb(205,185,160)', 'rgb(90,74,62)')
      if (e.t < 16) for (let j = 0; j < pN(8); j++) { const tt = e.t, px = e.x + (H(e.seed, j, 121) - 0.5) * 160, py = e.y - 6 - tt * (0.6 + H(e.seed, j, 122)); c.globalAlpha = 0.4 * (1 - tt / 16); c.fillStyle = 'rgb(170,150,120)'; c.beginPath(); c.arc(R(px), R(py), R(5 + tt * 0.6), 0, TAU); c.fill() }
    } else if (e.kind === 'iai_cut') {   // silence ... then the cut appears (+ the sheath click); split only where gore is allowed
      if (e.t === e.delay) play('aj_click')
      if (e.t >= e.delay) {
        const tt = e.t - e.delay, kk = tt / (e.life - e.delay), L = e.len * Math.min(1, tt / 2), dx = Math.cos(e.ang) * L / 2, dy = Math.sin(e.ang) * L / 2
        if (e.split && c.canvas && tt < 26) {   // the target splits along the cut: the two halves slide apart, the cut face filled with colour
          const sep = Math.min(10, tt * 0.8), bx = e.bx - 10, by = e.by - 10, bw = e.bw + 20, bh = e.bh + 20
          try {
            const m = c.getTransform(), cv = c.canvas, sx = R(m.a * bx + m.e), sy = R(m.d * by + m.f), sw = R(m.a * bw), sh = R(m.d * bh)
            for (const half of [-1, 1]) {
              c.save(); c.beginPath(); const nx = -Math.sin(e.ang) * half, ny = Math.cos(e.ang) * half
              c.moveTo(e.x - dx * 3, e.y - dy * 3); c.lineTo(e.x + dx * 3, e.y + dy * 3); c.lineTo(e.x + dx * 3 + nx * 400, e.y + dy * 3 + ny * 400); c.lineTo(e.x - dx * 3 + nx * 400, e.y - dy * 3 + ny * 400); c.closePath(); c.clip()
              c.globalAlpha = 1; c.drawImage(cv, sx, sy, sw, sh, R(bx + nx * sep), R(by + ny * sep), R(bw), R(bh)); c.restore()
            }
          } catch (_) {}
          c.globalAlpha = 1; c.strokeStyle = 'rgb(200,20,30)'; c.lineWidth = Math.min(8, tt * 0.6); c.beginPath(); c.moveTo(R(e.x - dx), R(e.y - dy)); c.lineTo(R(e.x + dx), R(e.y + dy)); c.stroke()
        }
        c.globalAlpha = Math.max(0, 1 - kk) * 0.7; c.strokeStyle = rgba(e.col, 1); c.lineWidth = 12 * (1 - kk) + 1; c.beginPath(); c.moveTo(R(e.x - dx), R(e.y - dy)); c.lineTo(R(e.x + dx), R(e.y + dy)); c.stroke()
        c.globalAlpha = Math.max(0, 1 - kk); c.strokeStyle = '#ffffff'; c.lineWidth = 4 * (1 - kk) + 0.5; c.stroke()
      }
    } else if (e.kind === 'crescent') {   // the moon slash: thin, three tones, needle-sharp tips (no fat banana)
      const a = 1 - k, r = 60 + e.t * 3, sweep = 1.2
      for (const [w, colr] of [[9, rgba(e.col.map(v => v * 0.5), a)], [5, rgba(e.col, a)], [1.6, `rgba(255,255,255,${a.toFixed(3)})`]]) {
        c.fillStyle = colr; c.beginPath()
        for (let j = 0; j <= 20; j++) { const u = j / 20, an = -sweep / 2 + u * sweep, th = w * Math.sin(u * Math.PI); c.lineTo(R(e.x - e.dir * 30 + e.dir * Math.cos(an) * (r + th)), R(e.y + Math.sin(an) * (r + th))) }
        for (let j = 20; j >= 0; j--) { const u = j / 20, an = -sweep / 2 + u * sweep; c.lineTo(R(e.x - e.dir * 30 + e.dir * Math.cos(an) * r), R(e.y + Math.sin(an) * r)) }
        c.closePath(); c.fill()
      }
    } else if (e.kind === 'stretch_hit') {   // ring around the fist, then the arm whips home and wobbles
      if (e.t < 10) { c.globalAlpha = 1 - e.t / 10; c.strokeStyle = '#ffffff'; c.lineWidth = 4; c.beginPath(); c.arc(R(e.x), R(e.y), R(18 + e.t * 6), 0, TAU); c.stroke() }
      const back = Math.min(1, e.t / 10), ex = e.x + (e.ox - e.x) * back, ey = e.y + (e.oy - e.y) * back
      c.globalAlpha = 0.7 * (1 - k); c.strokeStyle = rgba(e.col, 1); c.lineWidth = 3; c.beginPath()
      for (let j = 0; j <= 16; j++) { const u = j / 16, px = e.ox + (ex - e.ox) * u, py = e.oy + (ey - e.oy) * u + Math.sin(u * 9 + e.t * 1.6) * 8 * (1 - k); j ? c.lineTo(R(px), R(py)) : c.moveTo(R(px), R(py)) }
      c.stroke()
    } else if (e.kind === 'ice_cluster') {   // a big cluster on the target, then it melts from the top and shatters
      const up = Math.min(1, e.t / 4), melt = Math.max(0, (e.t - 26) / 24)
      for (let j = 0; j < 7; j++) { const lean = (j - 3) * 0.22, hgt = (110 - Math.abs(j - 3) * 22) * up * (1 - melt), px = e.x + (j - 3) * 14; c.globalAlpha = 0.9; c.fillStyle = j % 2 ? 'rgb(170,225,255)' : 'rgb(220,245,255)'; c.beginPath(); c.moveTo(R(px - 10), R(e.y)); c.lineTo(R(px + lean * hgt), R(e.y - hgt)); c.lineTo(R(px + 10), R(e.y)); c.fill() }
      if (melt > 0) for (let j = 0; j < pN(12); j++) { const tt = e.t - 26, an = H(e.seed, j, 131) * Math.PI + Math.PI, px = e.x + Math.cos(an) * tt * 3, py = e.y - 50 + Math.sin(an) * tt * 2 + 0.2 * tt * tt; c.globalAlpha = Math.max(0, 1 - melt); c.fillStyle = '#ffffff'; c.fillRect(R(px), R(py), 3, 3) }
    } else if (e.kind === 'gat_hit') {
      c.globalAlpha = 1 - k; c.strokeStyle = rgba(e.col, 1); c.lineWidth = 3
      for (let j = 0; j < 3; j++) { const yy = e.y + (j - 1) * 9; c.beginPath(); c.moveTo(R(e.x - e.dir * 34), R(yy)); c.lineTo(R(e.x - e.dir * 4), R(yy)); c.stroke() }
    }
  }
  c.restore()
}

// ═══ DRAW: FLOOR (aftermath, world space under the fighters) ═══
export function drawSigFloor(c) {
  if (!S.decals.length || !full()) return
  c.save()
  for (const d of S.decals) {
    const k = d.t / d.life, fade = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3, hot = Math.max(0, 1 - d.t / 160), w = d.w
    if (d.kind === 'big_crater') {   // a giant crater with glowing edges; sparks rain down slowly
      c.globalAlpha = 0.8 * fade; c.fillStyle = 'rgb(22,20,24)'; c.beginPath(); c.ellipse(R(d.x), R(d.y), R(w * 0.55), 13, 0, 0, TAU); c.fill()
      c.globalAlpha = hot * fade; c.strokeStyle = rgba(d.col, 1); c.lineWidth = 4; c.beginPath(); c.ellipse(R(d.x), R(d.y), R(w * 0.55), 13, 0, Math.PI, TAU); c.stroke()
      c.globalAlpha = 0.7 * hot * fade; c.strokeStyle = '#fff4d0'; c.lineWidth = 1.5; c.beginPath(); c.ellipse(R(d.x), R(d.y), R(w * 0.55 - 6), 9, 0, Math.PI, TAU); c.stroke()
      for (let j = 0; j < pN(14); j++) { const life = 120, tt = (d.t + R(H(d.seed, j, 141) * life)) % life, px = d.x + (H(d.seed, j, 142) - 0.5) * w + Math.sin(tt * 0.06 + j) * 6, py = d.y - 200 + tt * 1.6; if (py > d.y) continue; c.globalAlpha = (1 - tt / life) * fade; c.fillStyle = j % 2 ? '#ffffff' : rgba(d.col, 1); c.fillRect(R(px), R(py), 2, 3) }
    } else if (d.kind === 'spiral_scar') {   // a spiral carved into the ground; wind swirls the dust away
      c.globalAlpha = 0.75 * fade; c.strokeStyle = 'rgb(40,34,30)'; c.lineWidth = 3; c.beginPath()
      for (let j = 0; j <= 40; j++) { const a = j / 40 * TAU * 2.2, r = 4 + j * 1.6; const px = d.x + Math.cos(a) * r * 1.6, py = d.y + Math.sin(a) * r * 0.22; j ? c.lineTo(R(px), R(py)) : c.moveTo(R(px), R(py)) }
      c.stroke(); c.globalAlpha = hot * fade * 0.8; c.strokeStyle = rgba(d.col, 1); c.lineWidth = 1; c.stroke()
      if (d.t < 70) for (let j = 0; j < pN(10); j++) { const a = H(d.seed, j, 151) * TAU + d.t * 0.12, r = 20 + d.t * 1.4 + j * 3; c.globalAlpha = 0.3 * (1 - d.t / 70); c.fillStyle = 'rgb(170,150,120)'; c.beginPath(); c.arc(R(d.x + Math.cos(a) * r), R(d.y - 6 + Math.sin(a) * r * 0.2), 4, 0, TAU); c.fill() }
    } else if (d.kind === 'puddle') {   // water lands, then the puddles slowly dry
      const s = 1 - 0.6 * k; c.globalAlpha = 0.55 * fade; c.fillStyle = 'rgb(40,110,200)'; c.beginPath(); c.ellipse(R(d.x), R(d.y - 2), R(w * 0.6 * s), R(5 * s + 2), 0, 0, TAU); c.fill()
      c.globalAlpha = 0.5 * fade; c.fillStyle = 'rgb(170,220,255)'; c.beginPath(); c.ellipse(R(d.x - w * 0.12), R(d.y - 3), R(w * 0.18 * s), R(1.5 * s + 1), 0, 0, TAU); c.fill()
    } else if (d.kind === 'burn_smoke') {   // burned floor + embers floating up + puffs of cartoon smoke
      c.globalAlpha = 0.7 * fade; c.fillStyle = 'rgb(26,16,10)'; c.beginPath(); c.ellipse(R(d.x), R(d.y), R(w * 0.55), 8, 0, 0, TAU); c.fill()
      c.globalAlpha = 0.9 * hot * fade; c.strokeStyle = 'rgb(255,120,30)'; c.lineWidth = 2; c.beginPath(); c.ellipse(R(d.x), R(d.y), R(w * 0.55), 8, 0, Math.PI, TAU); c.stroke()
      for (let j = 0; j < pN(12); j++) { const life = 80, tt = (d.t + R(H(d.seed, j, 161) * life)) % life, px = d.x + (H(d.seed, j, 162) - 0.5) * w + Math.sin(tt * 0.1 + j) * 5, py = d.y - 4 - tt * 1.1; c.globalAlpha = (1 - tt / life) * fade; c.fillStyle = j % 2 ? 'rgb(255,200,90)' : 'rgb(255,100,30)'; c.fillRect(R(px), R(py), 2, 2) }
    } else if (d.kind === 'rock_scar') {   // the floor keeps the scar: a crack line + rubble
      c.globalAlpha = 0.8 * fade; c.strokeStyle = 'rgb(38,32,28)'; c.lineWidth = 3; c.beginPath(); c.moveTo(R(d.x - w * 0.7 * d.dir), R(d.y)); for (let s = 1; s <= 10; s++) c.lineTo(R(d.x - w * 0.7 * d.dir + d.dir * w * 0.7 * s / 10), R(d.y + (H(d.seed, s, 171) - 0.5) * 6)); c.stroke()
      c.globalAlpha = hot * fade * 0.8; c.strokeStyle = 'rgb(255,170,80)'; c.lineWidth = 1; c.stroke()
      for (let j = 0; j < 6; j++) { c.globalAlpha = 0.85 * fade; c.fillStyle = 'rgb(110,94,80)'; c.fillRect(R(d.x + (H(d.seed, j, 172) - 0.5) * w), R(d.y - 5), R(4 + H(d.seed, j, 173) * 6), 5) }
    } else if (d.kind === 'scar') {   // a glowing line torn in the floor that slowly cools
      c.globalAlpha = 0.8 * fade; c.fillStyle = 'rgb(30,26,24)'; c.fillRect(R(d.x - w * 0.7), R(d.y - 2), R(w * 1.4), 4)
      c.globalAlpha = hot * fade; c.fillStyle = rgba(d.col, 1); c.fillRect(R(d.x - w * 0.7 * hot - 4), R(d.y - 1), R(w * 1.4 * hot + 8), 2)
    } else if (d.kind === 'frost') {
      c.globalAlpha = 0.6 * fade; c.fillStyle = 'rgb(210,240,255)'; c.beginPath(); c.ellipse(R(d.x), R(d.y - 1), R(w * 0.6), 6, 0, 0, TAU); c.fill()
      for (let j = 0; j < pN(8); j++) { const tt = (d.t + j * 13) % 60; c.globalAlpha = 0.6 * (1 - tt / 60) * fade; c.fillStyle = '#ffffff'; c.fillRect(R(d.x + (H(d.seed, j, 181) - 0.5) * w), R(d.y - 6 - tt * 0.5), 2, 2) }
    }
  }
  c.restore()
}

// ═══ DRAW: HUD (screen space): the colour flip / soft dim ═══
export function drawSigHud(c, cv) {
  if (!S.hud.length || sigLevel() === 'off') return
  for (const h of S.hud) {
    c.save()
    if (h.kind === 'flip' && h.t < 10) { c.globalCompositeOperation = 'difference'; c.globalAlpha = 1; c.fillStyle = '#ffffff'; c.fillRect(0, 0, cv.width, cv.height) }
    else if (h.kind === 'dim' || h.kind === 'flip') { c.globalAlpha = 0.28 * (1 - h.t / h.life); c.fillStyle = '#000000'; c.fillRect(0, 0, cv.width, cv.height) }
    c.restore()
  }
}

export const __animeSigTest = { S }
