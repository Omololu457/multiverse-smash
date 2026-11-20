// battleBlood.js — MSV1-BLOOD: PROGRESSIVE DAMAGE BLOOD (render layer of the battle-damage system, battleDamage.js).
//
// The more health a fighter has lost this round, the more blood shows on their BODY, and it drips onto the floor.
// Not a brutality, not a mode: it rides normal damage. Painted in SPRITE PIXEL SPACE (same grid as the art,
// nearest-neighbour) from the offline body maps in data/bloodmaps/<characterId>.json (tools/bloodmap/build.py):
// wound anchors per frame, an eye box, and the pixel path a trickle runs DOWN the body. Runtime never scans pixels;
// it plots precomputed points and clips them to the frame's alpha with one canvas composite.
//
// DETERMINISM: every input is already in GAME_STATE — hit sparks (frame, position, damage, move, attacker, victim),
// health, position, velocity — plus hash(matchSeed, frame, player slot, wound slot). No Math.random, no Date.
// Nothing here writes to a fighter or to GAME_STATE: all state lives in module maps keyed by the player slot, so LAN
// peers, companion screens and replays draw the identical picture and the sim hash never sees it.
//
// TIERS (health lost this round, % of max): 0–15 none · 15–35 T1 lip / nose + a scrape · 35–60 T2 brow cut + torso
// stain · 60–85 T3 arm / torso wounds, steady trickles, drips start · 85+ T4 heavy drips, pooling when still.
// Between rounds wounds drop ONE tier. Healing lowers the tier with the health it restores.
// Setting "Blood: Off / Low / Full" (juiceSettings.blood): Low = tiers capped at 2, no pooling, no spray.

// ── deterministic hash → [0,1) ─────────────────────────────────────────────────────────────────────────────
let _seed = 0x51ed
function H(a, b = 0, c = 0, d = 0) {
  let x = (_seed ^ Math.imul(a | 0, 0x9e3779b1) ^ Math.imul(b | 0, 0x85ebca77) ^ Math.imul(c | 0, 0xc2b2ae3d) ^ Math.imul(d | 0, 0x27d4eb2f)) >>> 0
  x ^= x << 13; x >>>= 0; x ^= x >> 17; x ^= x << 5; x >>>= 0
  return x / 4294967296
}

// ── constants ────────────────────────────────────────────────────────────────────────────────────────────────
export const BLOOD_TIER_FRAC = [0.08, 0.25, 0.45, 0.70]          // T1..T4 thresholds (health lost / max, match total) — shows early
export const BLOOD_SPRAY_DAMAGE = 88                               // top ~25 % of roster move damage (p75, x parity)
export const BLOOD_COVERAGE_CAP = 0.15                             // (legacy flat cap; the real caps are per tier below)
export const BLOOD_LINE_CAP = [0, 0.06, 0.10, 0.14, 0.18]          // cuts / trickles / spatter: share of the frame's opaque pixels
export const BLOOD_SOAK_CAP = [0, 0.07, 0.13, 0.20, 0.27]          // soaked stains (sprite recolour) around wounds
const SOAK_A = [0, 0.50, 0.58, 0.66, 0.74]                         // soak opacity per tier (core; edges ~70 % of it)
export const BLOOD_FLOOR_CAP = 64
export const BLOOD_FLOOR_LIFE = 1200                               // 20 s at 60 fps
const DRY_FRAMES = 360                                             // ~6 s fresh → dried
const MAX_WOUNDS = [0, 2, 4, 7, 10]
const TRICKLE_MAX = [0, 4, 9, 18, 30]                              // sprite px a trickle may run per tier
const SLOTS = ['brow', 'nose', 'mouth', 'cheek', 'chest', 'abdomen', 'side', 'upper', 'fore', 'hand', 'thigh', 'shin']
const SLOT_IX = Object.fromEntries(SLOTS.map((s, i) => [s, i]))
const REGION_SLOTS = { head: ['brow', 'nose', 'mouth', 'cheek'], torso: ['chest', 'abdomen', 'side'], arm: ['upper', 'fore', 'hand'], leg: ['thigh', 'shin'] }
const REGION_OF = Object.fromEntries(Object.entries(REGION_SLOTS).flatMap(([r, ss]) => ss.map(s => [s, r])))
// Scripted wounds that every tier guarantees (if no hit has opened that region yet).
const TIER_SCRIPT = { 1: [['mouth', 'blunt'], ['fore', 'scrape']], 2: [['brow', 'slash'], ['chest', 'blunt']], 3: [['upper', 'slash'], ['side', 'pierce']], 4: [['thigh', 'slash'], ['abdomen', 'slash']] }

// ── palettes (dark, desaturated — never pure red / pink) ─────────────────────────────────────────────────────
// [fresh, freshShadow, deep, highlight, dried, driedShadow]
const PAL = {
  blood: ['#8f1a14', '#7a0f0f', '#5a0a0a', '#a3241c', '#4a0c08', '#3a0906'],
  green: ['#3f6a1c', '#2f5414', '#22400e', '#56822a', '#1e3210', '#16260b'],
  blue: ['#24477a', '#1a3762', '#132a4c', '#325c94', '#142640', '#0f1d32'],
  purple: ['#5a2466', '#481a52', '#36123e', '#6e3080', '#2c1232', '#220d28'],
  orange: ['#8a4a14', '#713a0e', '#56290a', '#a35e1e', '#40220a', '#321a08'],
  oil: ['#2e2318', '#1e1710', '#120d09', '#8a7a62', '#1a140e', '#100c08'],   // warm machine oil; [3] = sheen (reads on black cloth and metal)
}
const RANGER_TEAR = ['#1a1416', '#0f0b0d', '#8a8890']                 // tear core, tear shadow, torn-edge fabric
const CRACK = {                                                          // Edo Tensei paper / crystal / magma cracks
  edo: { line: '#2b2622', shade: '#1c1916', flake: '#d9d2c2', fleck: '#b8b0a0' },
  crystal: { line: '#20303a', shade: '#141f26', flake: '#e8f6ff', fleck: '#a6d0e6' },
  magma: { line: '#2a120a', shade: '#1a0a05', flake: '#c8501a', fleck: '#8a3412' },
}
const SAND = ['#b89a62', '#9a7c48', '#7a6036', '#d2b67e']
const SCORCH = ['#2a1d16', '#1c140f', '#3a2a20']

// ── fluid per character (canon-aware; docs/msv1/blood/LEDGER.md) ────────────────────────────────────────────
//   blood · alien:<palette> · oil · ranger · crack:edo|crystal|magma · sand · none
export const BLOOD_FLUID = {
  // machines: oil + sparks
  genos: 'oil', krybot: 'oil', cyborg: 'oil',
  // Ranger suits: no face blood, suit tears + light stains on torso / arms
  omega_ranger: 'ranger', samurai_red_ranger: 'ranger', gold_samurai_ranger: 'ranger', green_samurai_ranger: 'ranger',
  red_ranger_mmpr: 'ranger', spd_red: 'ranger', spd_blue: 'ranger', spd_green: 'ranger', spd_pink: 'ranger', spd_yellow: 'ranger',
  mmpr_pink: 'ranger', mmpr_black: 'ranger', mmpr_white: 'ranger', green_ranger: 'ranger',
  ninja_storm_cgpt: 'ranger', ns_red: 'ranger', ns_yellow: 'ranger', windrangers: 'ranger', ninja_storm_rangers: 'ranger',
  // reanimated (Edo Tensei) body: cracks and flakes like dry paper / ash
  madara: 'crack:edo',
  // sand armour: crumbles
  gaara: 'sand',
  // aliens with a known non-red blood colour
  vilgax: 'alien:green',
}
// Transformations whose body is not flesh (Ben 10 aliens by activeAlien id; others by form flag).
const FORM_FLUID = {
  upgrade: 'oil', upgrade_ov: 'oil',
  diamondhead: 'crack:crystal', diamondhead_ov: 'crack:crystal', chromastone: 'crack:crystal',
  heatblast: 'crack:magma',
  alienx: 'none', megawhatt: 'none',
  goop: 'alien:green', wildvine: 'alien:green',
}
// Young characters (the existing brutality CHILDREN rule): blood capped at Tier 2, no spray, no pooling.
export const BLOOD_YOUNG = new Set(['ben10', 'albedo', 'saiki', 'nezuko', 'dash_parr', 'violet'])
// Characters whose form art lives in another character's map (loaded alongside).
const ALSO_MAPS = { albedo: ['ben10'], ns_red: ['windrangers'], ns_yellow: ['windrangers'] }   // Wind Rangers draw as their ns_red / ns_yellow form profiles

export function bloodFluidOf(f) {
  if (!f) return 'none'
  const al = f.transformed && f.activeAlien ? String(f.activeAlien).toLowerCase() : null
  if (al && FORM_FLUID[al]) return FORM_FLUID[al]
  if (f._edoActive) return 'crack:edo'
  if (f._recolorTag === 'edo') return 'crack:edo'                                              // MSV1-EDO: the premade Edo Tensei skin cracks, it doesn't bleed                                                      // Tobirama's Edo Tensei: the body on screen is a reanimated vessel
  if (/edo_?reanim|ashen_?reanim|ashenreanim/i.test(String(f.skinId || f._skinId || ''))) return 'crack:edo'   // Edo / reanimation skins
  return BLOOD_FLUID[String(f.rosterKey || '').toLowerCase()] || 'blood'
}

// ── settings ───────────────────────────────────────────────────────────────────────────────────────────────
let _levelFn = () => 'full'
export function bloodSetLevelSource(fn) { if (typeof fn === 'function') _levelFn = fn }
const level = () => { const v = _levelFn(); return v === 'off' || v === 'low' ? v : 'full' }

// ── body maps (lazy fetch, shared) ─────────────────────────────────────────────────────────────────────────
const maps = new Map()          // characterId → { frames, index: Map, byAction: Map } | 'loading' | 'none'
export const BLOOD_MAP_DIR = './data/bloodmaps/'
const MAP_FILE = { rickprime: 'rickPrime' }   // map files keep the roster key's case (case-sensitive hosts)
function loadMap(id) {
  if (!id || maps.has(id) || typeof fetch !== 'function') return
  maps.set(id, 'loading')
  fetch(`${BLOOD_MAP_DIR}${MAP_FILE[id] || id}.json`).then(r => (r.ok ? r.json() : null)).then(j => {
    if (!j) { maps.set(id, 'none'); return }
    maps.set(id, { frames: j.frames, index: new Map(Object.entries(j.index)), byAction: new Map(Object.entries(j.byAction || {})), skip: new Set(Object.entries(j.overrides || {}).filter(([, o]) => o && o.skip && !o.frames).map(([k]) => k)) })
  }).catch(() => maps.set(id, 'none'))
}
export function bloodPreload(rosterKey) { const k = String(rosterKey || '').toLowerCase(); loadMap(k); for (const o of ALSO_MAPS[k] || []) loadMap(o) }
export function bloodMapReady(rosterKey) { const m = maps.get(String(rosterKey || '').toLowerCase()); return !!(m && typeof m === 'object') }
const TAG_RX = /__[A-Za-z0-9_]+(?=\.png$)/
const normSheet = s => String(s || '').replace(/^\.\//, '').replace(/^\//, '')
function lookupFrame(f, def, frameIndex, action) {
  const k = String(f.rosterKey || '').toLowerCase()
  const ids = [k, ...(ALSO_MAPS[k] || [])]
  const sheet = normSheet(def.sheet)
  const tail = `|${def.sourceX || 0}|${def.sourceY || 0}|${def.width}|${def.height}|${def.frames || 1}`
  const keys = [sheet + tail]
  const canon = sheet.replace(TAG_RX, '')
  if (canon !== sheet) keys.push(canon + tail)
  for (const id of ids) {
    const m = maps.get(id); if (!m || typeof m !== 'object') continue
    for (const key of keys) { const ix = m.index.get(key); if (ix) { const n = ix[frameIndex]; return n >= 0 ? m.frames[n] : null } }
  }
  // a form / skin sheet the offline pass never saw: the same action with the same layout (recolours, hair edits)
  if (action) for (const id of ids) {
    const m = maps.get(id); if (!m || typeof m !== 'object') continue
    const kk = m.byAction.get(`${action}|${def.width}|${def.height}|${def.frames || 1}`)
    const ix = kk && m.index.get(kk)
    if (ix) { const n = ix[frameIndex]; _stats.actionFallback++; return n >= 0 ? m.frames[n] : null }
  }
  // diagnostics only: a map still loading, or a strip skipped on purpose (effect art), is not a mapping gap
  if (ids.some(id => maps.get(id) === 'loading')) { _stats.loading++; return null }
  if (ids.some(id => { const m = maps.get(id); return m && typeof m === 'object' && (m.skip.has(action) || m.skip.has(sheet) || m.skip.has('*')) })) { _stats.skipped++; return null }
  _stats.unmapped++
  if (_miss.size < 4000) _miss.add(`${k} ${action} ${sheet}${tail}`)
  return null
}
const _miss = new Set()   // diagnostics: first unmapped frame keys (harness/blood_coverage.mjs)
const _stats = { painted: 0, unmapped: 0, actionFallback: 0, frames: 0, loading: 0, skipped: 0 }

// ── per-slot records ───────────────────────────────────────────────────────────────────────────────────────
const recs = new Map()    // slot → record
export function bloodSlotOf(f) { return f ? (f.side || ('p' + (((f.ffaSlot | 0)) + 1))) : 'p0' }
function rec(f) {
  const slot = bloodSlotOf(f)
  let r = recs.get(slot)
  if (!r) { r = { slot, pi: (parseInt(String(slot).replace(/\D/g, ''), 10) || (recs.size + 1)),   // from the slot, never from call order
         key: '', wounds: [], carry: 0, prevLost: 0, curLost: 0, tier: 0, hpTier: 0, lastHp: null, version: 1, still: 0, dst: null, ends: [], pool: null, fluid: 'blood', young: false, scripted: {} }; recs.set(slot, r) }
  const k = String(f.rosterKey || '').toLowerCase()
  if (r.key !== k) { r.key = k; r.young = BLOOD_YOUNG.has(k); bloodPreload(k) }
  r.fluid = bloodFluidOf(f)
  return r
}
function tierFor(frac) { let t = 0; for (let i = 0; i < 4; i++) if (frac >= BLOOD_TIER_FRAC[i]) t = i + 1; return t }
function capTier(r, t) { if (level() === 'low' || r.young) t = Math.min(t, 2); return level() === 'off' ? 0 : t }

// ── hits → wounds ─────────────────────────────────────────────────────────────────────────────────────────
// damageType: the game's own tags (damageTypes.js) passed in by the caller. "pierce" / "projectile" → puncture,
// "slash" → cut, "energy" → scorch, "grab" → nothing, anything else (haki etc.) → blunt.
function woundKind(type) {
  if (type === 'slash') return 'slash'
  if (type === 'pierce' || type === 'projectile') return 'pierce'
  if (type === 'energy') return 'scorch'
  if (type === 'grab') return null
  return 'blunt'
}
// region from where the hit actually landed on the victim's hurtbox (sim state, identical on every screen)
function regionOf(target, x, y) {
  const h = target.h || target.height || 100, w = target.w || target.width || 60
  const ry = (y - (target.y || 0)) / h, rx = (x - ((target.x || 0) + w / 2)) / w
  if (ry < 0.22) return 'head'
  if (ry < 0.58) return Math.abs(rx) > 0.34 ? 'arm' : 'torso'
  return 'leg'
}
function addWound(r, slot, kind, sev, frame, seed) {
  if (r.fluid === 'ranger' && (REGION_OF[slot] === 'head' || REGION_OF[slot] === 'leg')) slot = ['chest', 'upper', 'abdomen', 'fore'][Math.floor(H(seed, 3) * 4)]   // helmets don't bleed; suit damage on torso / arms only
  let w = r.wounds.find(x => x.slot === slot)
  if (w) { w.sev = Math.min(3, w.sev + 1); w.fresh = frame; if (kind !== 'scrape' && w.kind === 'scrape') w.kind = kind }
  else { w = { slot, kind, sev, born: frame, fresh: frame, seed: seed >>> 0 }; r.wounds.push(w) }
  r.version++
  return w
}
const _sprays = []   // hit sprays (world space)
/** A landed (unblocked) hit. Returns { wet } so the caller can add the quiet wet sound layer on heavy hits. */
export function bloodHit({ target, attacker, x, y, damage = 0, damageType = 'blunt', ultimate = false, frame = 0 }) {
  frame -= _f0   // match-relative: identical on every screen / replay whatever the absolute frame counter says
  if (!target || !(damage > 0) || level() === 'off') return null
  const r = rec(target)
  if (r.fluid === 'none') return null
  const kind = woundKind(damageType)
  if (!kind) return null
  const region = regionOf(target, x, y)
  let pool = REGION_SLOTS[region]
  if (kind === 'blunt' && region === 'head') pool = ['nose', 'mouth', 'brow', 'nose']
  const seed = Math.floor(H(frame, r.pi, damage | 0, 7) * 4294967295)
  const slot = pool[Math.floor(H(seed, 1) * pool.length)]
  addWound(r, slot, kind === 'scorch' ? 'scorch' : kind, damage >= BLOOD_SPRAY_DAMAGE ? 2 : 1, frame, seed)
  // heavy hit / super: a SHORT spray of droplets in the hit's direction (Full only, not for the young)
  const heavy = ultimate || damage >= BLOOD_SPRAY_DAMAGE
  if (heavy && level() === 'full' && !r.young && kind !== 'scorch' && r.fluid !== 'none') {
    const dir = attacker ? ((attacker.facing || 1) < 0 ? -1 : 1) : (x < (target.x || 0) + (target.w || 60) / 2 ? 1 : -1)
    const n = Math.min(12, 3 + Math.round(damage / 40)) * (r.fluid === 'ranger' ? 0.5 : 1)
    const px = r.dst ? Math.max(2, Math.round(r.dst.sc)) : 3
    for (let i = 0; i < n; i++) {
      if (_sprays.length >= 96) _sprays.shift()
      _sprays.push({ x, y, vx: dir * (1.6 + H(seed, i, 2) * 4.2), vy: -(0.8 + H(seed, i, 3) * 3.4), t: 0, life: 18 + Math.floor(H(seed, i, 4) * 14), fluid: r.fluid, px, floor: r.floorY ?? null })
    }
    return { wet: r.fluid === 'blood' || r.fluid.startsWith('alien') }
  }
  return null
}

// ── per-frame tick (called once per sim frame per fighter; reads state only) ─────────────────────────────────
const _drops = []      // falling drips (world space)
const _parts = []      // sparks / flakes / grains (world space)
let _decals = []       // floor decals (world space)
let _water = false
function pushDecal(d) { _decals.push(d); if (_decals.length > BLOOD_FLOOR_CAP) _decals.shift() }
export function bloodTick(f, frame, groundY, stage = null) {
  if (!f) return
  frame -= _f0
  const r = rec(f)
  r.floorY = groundY
  _water = !!stage && /water|ocean|sea|beach|lake|river|flood|harbor|harbour|bay|rain/i.test(String(stage.id || stage.key || stage.name || ''))
  const hp = f.health ?? 0, max = f.maxHealth || f.maxHp || 1000
  // damage ADDS UP over the whole match: health lost in earlier rounds + health lost this round (healing only
  // washes away this round's part)
  r.curLost = Math.max(0, Math.min(1, (max - hp) / max))
  const hpT = tierFor(Math.min(1, r.prevLost + r.curLost))
  r.lastHp = hp
  const t = capTier(r, Math.max(hpT, r.carry))
  if (t !== r.tier) {
    if (t > r.tier) for (let k = Math.max(1, r.tier + 1); k <= t; k++) for (const [slot, kind] of TIER_SCRIPT[k] || []) {
      if (!r.wounds.some(w => w.slot === slot) && r.wounds.filter(w => REGION_OF[w.slot] === REGION_OF[slot]).length < k) addWound(r, slot, kind, k >= 3 ? 2 : 1, frame, Math.floor(H(frame, r.pi, k, SLOT_IX[slot]) * 4294967295))
    }
    r.tier = t; r.version++
  }
  if (level() === 'off' || r.fluid === 'none' || !r.dst) return
  // drips: T3+ from the end of each grown trickle
  const grounded = !!(f.grounded ?? f.onGround)
  const still = grounded && Math.abs(f.vx || 0) < 0.3
  r.still = still ? r.still + 1 : 0
  if (r.tier >= 3 && !r.young && r.fluid !== 'ranger') {
    const rate = r.tier >= 4 ? 0.06 : 0.018
    for (let i = 0; i < r.ends.length && i < 4; i++) {
      if (H(frame, r.pi, i, 11) > rate) continue
      const e = r.ends[i], p = worldOf(r, e[0], e[1])
      if (_drops.length < 80) _drops.push({ x: p[0], y: p[1], vy: 0.4, fluid: r.fluid, px: Math.max(2, Math.round(r.dst.sc)), floor: groundY, seed: Math.floor(H(frame, i, r.pi, 5) * 1e9) })
    }
    // pooling: T4, standing still (Full only)
    if (r.tier >= 4 && level() === 'full' && r.still > 40 && (frame & 7) === 0) {
      const cx = (f.x || 0) + (f.w || 60) / 2
      if (!r.pool || r.pool.dead || Math.abs(r.pool.x - cx) > 24) { r.pool = { kind: 'pool', x: cx, y: groundY, r: 2, px: Math.max(2, Math.round(r.dst.sc)), fluid: r.fluid, born: frame, seed: r.pi * 977 + frame, smears: 0 }; pushDecal(r.pool) }
      else {
        if (r.pool.r < 9) r.pool.r += 0.5
        r.pool.born = Math.max(r.pool.born, frame - DRY_FRAMES / 3)   // a pool still being fed stays wet
        const i = _decals.indexOf(r.pool); if (i < 0) pushDecal(r.pool); else if (i < _decals.length - 1) { _decals.splice(i, 1); _decals.push(r.pool) }   // a growing pool is the newest mark: the cap never evicts it first
      }
    }
  }
  // walking through a pool leaves a few faint smeared steps
  if (grounded && Math.abs(f.vx || 0) > 0.6 && (frame % 14) === 0) {
    const fx = (f.x || 0) + (f.w || 60) / 2
    for (const d of _decals) if (d.kind === 'pool' && d.smears < 4 && Math.abs(d.x - fx) < d.r * d.px + 10) {
      d.smears++; pushDecal({ kind: 'smear', x: fx + (f.vx > 0 ? 8 : -8), y: groundY, r: 1.5, px: d.px, fluid: d.fluid, born: frame, seed: frame * 31 + d.seed, faint: true }); break
    }
  }
  // oil sparks / Edo flakes / sand grains shed from the wounds
  if (r.tier >= 2 && r.ends.length && (r.fluid === 'oil' || r.fluid.startsWith('crack') || r.fluid === 'sand') && H(frame, r.pi, 41) < (r.tier >= 3 ? 0.12 : 0.05)) {
    const e = r.ends[Math.floor(H(frame, r.pi, 42) * r.ends.length)], p = worldOf(r, e[0], e[1])
    const n = r.fluid === 'oil' ? 3 : 1
    for (let i = 0; i < n && _parts.length < 120; i++) _parts.push({ x: p[0], y: p[1], vx: (H(frame, i, 43) - 0.5) * (r.fluid === 'oil' ? 4 : 0.6), vy: r.fluid === 'oil' ? -1 - H(frame, i, 44) * 2 : 0.2, t: 0, life: r.fluid === 'oil' ? 10 : 70, fluid: r.fluid, px: Math.max(2, Math.round(r.dst.sc)), floor: groundY })
  }
}
function worldOf(r, ax, ay) {
  const d = r.dst
  const x = d.facing < 0 ? d.x + (d.w - 1 - ax + 0.5) * d.sc : d.x + (ax + 0.5) * d.sc
  return [x, d.y + (ay + 0.5) * d.sc]
}

// ── painting the body (sprite.js) ──────────────────────────────────────────────────────────────────────────
const _canvas = new Map()   // slot → { cv, key }
function soakColor(fluid, age, core) {
  if (fluid === 'oil') return PAL.oil[core ? 2 : 1]
  const pal = fluid.startsWith('alien') ? (PAL[fluid.split(':')[1]] || PAL.blood) : PAL.blood
  return age > DRY_FRAMES ? pal[core ? 5 : 4] : pal[core ? 2 : 1]
}
function colorAt(fluid, age, shadow, deep) {
  if (fluid === 'oil') return PAL.oil[deep ? 2 : shadow ? 1 : 0]
  const pal = fluid.startsWith('alien') ? (PAL[fluid.split(':')[1]] || PAL.blood) : PAL.blood
  const dry = age > DRY_FRAMES ? 2 : age > DRY_FRAMES / 2 ? 1 : 0
  if (dry === 2) return shadow || deep ? pal[5] : pal[4]
  if (deep) return dry ? pal[5] : pal[2]
  return shadow ? (dry ? pal[5] : pal[1]) : (dry ? pal[4] : pal[0])
}
/**
 * The blood overlay for the frame sprite.js is about to draw (sprite pixel space, same size as the frame), or null.
 * def = the action def ({ sheet, sourceX, sourceY, width, height, frames }); sheetImg = the frame's sheet image
 * (used only as a composite clip mask). Call AFTER sprite.js has set fighter._lastDrawX/Y/W/H.
 */
export function bloodFrame(f, def, frameIndex, action, sheetImg, sx, sy, frame) {
  frame = frame == null ? _lastFrame : frame - _f0
  if (!f || !def || level() === 'off' || typeof document === 'undefined') return null
  const r = recs.get(bloodSlotOf(f))
  if (!r || r.tier < 1 || r.fluid === 'none' || !r.wounds.length) { if (r) { r.dst = dstOf(f, def); r.ends = [] } return null }
  r.dst = dstOf(f, def)
  _stats.frames++
  const fm = lookupFrame(f, def, frameIndex, action)
  if (!fm) { r.ends = []; return null }
  const ageBucket = Math.floor(frame / 6)
  const key = `${fm.o}|${fm.a[0]}|${fm.a[1]}|${r.version}|${r.tier}|${ageBucket}|${r.fluid}|${level()}`
  let c = _canvas.get(r.slot)
  if (!c) { c = { cv: document.createElement('canvas'), key: '' }; _canvas.set(r.slot, c) }
  if (c.key === key && c.cv.width === def.width && c.cv.height === def.height) return c.cv
  c.key = key
  const cv = c.cv
  if (cv.width !== def.width) cv.width = def.width
  if (cv.height !== def.height) cv.height = def.height
  const g = cv.getContext('2d')
  g.clearRect(0, 0, cv.width, cv.height)
  g.imageSmoothingEnabled = false
  r.ends = paintWounds(g, r, fm, def.height, frame)
  // clip to this frame's own alpha: never outside the opaque body pixels (one composite, no pixel reads)
  if (sheetImg) { g.globalCompositeOperation = 'destination-in'; g.drawImage(sheetImg, sx, sy, def.width, def.height, 0, 0, def.width, def.height); g.globalCompositeOperation = 'source-over' }
  _stats.painted++
  return cv
}
function dstOf(f, def) {
  const w = f._lastDrawW || def.width, sc = w / def.width
  return { x: f._lastDrawX || 0, y: f._lastDrawY || 0, w: def.width, sc, facing: (f.facing ?? 1) < 0 ? -1 : 1 }
}
const STEP = { d: [0, 1], a: [-1, 1], b: [1, 1], l: [-1, 0], r: [1, 0] }
function paintWounds(g, r, fm, cellH, frame) {
  const u = Math.max(1, Math.round(cellH / 120))
  let budget = Math.floor(fm.o * BLOOD_LINE_CAP[r.tier])
  let soakBudget = Math.floor(fm.o * BLOOD_SOAK_CAP[r.tier])
  const e = fm.e, eye = e[0] >= 0
  const ends = []
  const fluid = r.fluid
  const amount = fluid === 'ranger' ? 0.45 : 1
  const plot = (x, y, col) => {
    if (budget <= 0) return false
    if (eye && x + u - 1 >= e[0] && x <= e[2] && y + u - 1 >= e[1] && y <= e[3]) return true   // never over the eyes (whole block tested)
    g.fillStyle = col; g.fillRect(x, y, u, u); budget -= u * u
    return true
  }
  // SOAK: the sprite itself turns bloody around a wound — an irregular, downward-running stain painted
  // semi-transparent, so the cloth / skin shading still shows through (clothes soaking up blood)
  const soak = (ax, ay, w, head, age) => {
    const R = head ? 1 + r.tier * 0.5 + w.sev * 0.4 : 2 + r.tier * 1.7 + w.sev * 1.3   // faces stay readable
    const down = 1.6, up = head ? 0.7 : 0.45   // blood runs DOWN: a stain barely creeps upward (keeps faces clear of chest wounds)
    const col = soakColor(fluid, age, false), core = soakColor(fluid, age, true), a0 = SOAK_A[r.tier]
    for (let dy = -Math.ceil(R * up); dy <= Math.ceil(R * down); dy += u) for (let dx = -Math.ceil(R); dx <= Math.ceil(R); dx += u) {
      const ny = dy < 0 ? dy / (R * up) : dy / (R * down), d = Math.hypot(dx / R, ny)
      if (d > 0.62 + 0.48 * H(w.seed, dx + 97, dy + 97, 41)) continue
      const x = ax + dx, y = ay + dy
      if (eye && x + u - 1 >= e[0] && x <= e[2] && y + u - 1 >= e[1] && y <= e[3]) continue
      if (soakBudget <= 0) { g.globalAlpha = 1; return }
      g.globalAlpha = d < 0.45 ? a0 : a0 * 0.7
      g.fillStyle = d < 0.45 ? core : col; g.fillRect(x, y, u, u); soakBudget -= u * u
    }
    g.globalAlpha = 1
  }
  const shown = r.wounds.slice(0, MAX_WOUNDS[r.tier])
  for (let wi = 0; wi < shown.length; wi++) {
    const w = shown[wi]
    let si = SLOT_IX[w.slot], ax = fm.a[si * 3], ay = fm.a[si * 3 + 1]
    if (ax < 0) {   // slot hidden in this pose → nearest slot of the same region that is visible
      const alt = REGION_SLOTS[REGION_OF[w.slot]].map(s => SLOT_IX[s]).find(j => fm.a[j * 3] >= 0)
      if (alt == null) continue
      si = alt; ax = fm.a[si * 3]; ay = fm.a[si * 3 + 1]
    }
    if (fluid === 'ranger' && REGION_OF[SLOTS[si]] === 'head') continue
    const shade = fm.a[si * 3 + 2] === 1
    const age = frame - w.born, sinceFresh = frame - w.fresh
    const s = w.seed
    // 0) the soaked stain under it (real fluids only; scorch soaks only once it bleeds at T3+)
    if ((fluid === 'blood' || fluid === 'oil' || fluid.startsWith('alien')) && (w.kind !== 'scorch' || r.tier >= 3)) soak(ax, ay, w, REGION_OF[SLOTS[si]] === 'head', age)
    // 1) the wound itself
    if (fluid.startsWith('crack')) { paintCrack(plot, CRACK[fluid.split(':')[1]] || CRACK.edo, ax, ay, w, r.tier, u); continue }
    if (fluid === 'sand') { paintSand(plot, ax, ay, w, r.tier, u); continue }
    if (fluid === 'ranger') { paintTear(plot, ax, ay, w, u) }
    else if (w.kind === 'scorch') {
      const n = 4 + w.sev * 3
      for (let i = 0; i < n; i++) plot(ax + Math.round((H(s, i, 1) - 0.5) * 6 * u), ay + Math.round((H(s, i, 2) - 0.5) * 5 * u), SCORCH[i % 3])
      if (r.tier < 3) continue              // energy: mostly scorch, very little blood
    } else if (w.kind === 'slash') {
      const len = (3 + w.sev * 2) * u, ang = (H(s, 5) - 0.5) * 1.3 + (H(s, 6) < 0.5 ? 0.35 : -0.35)
      const dx = Math.cos(ang), dy = Math.sin(ang)
      for (let i = -len / 2; i <= len / 2; i += 1) plot(Math.round(ax + dx * i), Math.round(ay + dy * i), colorAt(fluid, age, shade, true))
      if (sinceFresh < 50 && fluid === 'blood') plot(Math.round(ax + dx * (len / 4)), Math.round(ay + dy * (len / 4)) - u, PAL.blood[3])   // 1 px wet highlight
    } else if (w.kind === 'pierce') {
      plot(ax, ay, colorAt(fluid, age, shade, true)); plot(ax + u, ay, colorAt(fluid, age, true, true)); plot(ax, ay + u, colorAt(fluid, age, true, true))
    } else {      // blunt / scrape: bruised dark pixels + split skin
      const n = w.kind === 'scrape' ? 3 : 3 + w.sev * 2
      for (let i = 0; i < n; i++) plot(ax + Math.round((H(s, i, 7) - 0.5) * 4 * u), ay + Math.round((H(s, i, 8) - 0.5) * 3 * u), i === 0 ? colorAt(fluid, age, shade, true) : (fluid === 'blood' ? '#4a1e22' : colorAt(fluid, age, true, true)))
    }
    // 2) the trickle running down the body (grows in over ~1.5 s after each fresh hit)
    if (w.kind === 'scrape' && r.tier < 2) continue
    const path = fm.p[si] || ''
    const maxLen = Math.min(fluid === 'ranger' ? 5 : 99, Math.round(TRICKLE_MAX[r.tier] * (0.45 + 0.18 * w.sev + 0.3 * H(s, 71)) * amount))   // each trickle its own length; a suit only stains around the tear
    const grown = Math.min(maxLen, path.length, 2 + Math.floor((frame - w.born) / 5))
    let x = ax, y = ay
    const thick = r.tier >= 2 && fluid !== 'ranger'
    for (let i = 0; i < grown; i++) {
      const c = path[i], st = STEP[c.toLowerCase()], sh = c !== c.toLowerCase()
      x += st[0] * 1; y += st[1] * 1
      if (!plot(x, y, colorAt(fluid, age - i * 4, sh, false))) break
      if (thick && (r.tier >= 3 || (i & 1) === 0) && i < grown - 2) plot(x + (H(s, i, 72) < 0.5 ? -u : u), y, colorAt(fluid, age - i * 4, true, false))   // heavy flow widens
      if (fluid === 'oil' && i % 2 === 1) plot(x, y, PAL.oil[3])                                                                       // oil's glossy sheen
      else if (i === 2 && sinceFresh < 90 && !sh && fluid === 'blood') plot(x, y, PAL.blood[3])                                         // rare 1 px wet highlight
    }
    if (grown >= 3) ends.push([x, y])
    // 3) small spatter dots at T2+
    if (r.tier >= 2 && fluid !== 'ranger') for (let i = 0; i < r.tier - 1; i++) plot(ax + Math.round((H(s, i, 21) - 0.5) * 9 * u), ay + Math.round((H(s, i, 22) - 0.5) * 9 * u), colorAt(fluid, age, true, false))
  }
  return ends
}
function paintTear(plot, ax, ay, w, u) {
  const len = (3 + w.sev * 2) * u, ang = (H(w.seed, 5) - 0.5) * 1.6
  const dx = Math.cos(ang), dy = Math.sin(ang)
  for (let i = -len / 2; i <= len / 2; i++) { const x = Math.round(ax + dx * i), y = Math.round(ay + dy * i); plot(x, y, RANGER_TEAR[0]); plot(x, y - u, RANGER_TEAR[2]) }
  plot(ax, ay + u, RANGER_TEAR[1])
}
function paintCrack(plot, P, ax, ay, w, tier, u) {
  const arms = 2 + Math.min(3, w.sev + tier - 1)
  for (let k = 0; k < arms; k++) {
    let x = ax, y = ay, a = H(w.seed, k, 31) * 6.283
    const len = (3 + tier * 2 + w.sev) * u
    for (let i = 0; i < len; i++) {
      a += (H(w.seed, k, i) - 0.5) * 0.9
      x += Math.round(Math.cos(a)); y += Math.round(Math.sin(a))
      plot(x, y, i % 3 === 2 ? P.shade : P.line)
      if (i % 2 === 1) plot(x + u, y - (i % 4 === 1 ? 0 : u), P.flake)   // the lifted, flaking edge (pale, so it reads on dark cloth)
    }
  }
  plot(ax, ay, P.shade)
}
function paintSand(plot, ax, ay, w, tier, u) {
  const n = 6 + tier * 4 + w.sev * 2
  for (let i = 0; i < n; i++) plot(ax + Math.round((H(w.seed, i, 51) - 0.5) * (5 + tier * 2) * u), ay + Math.round(H(w.seed, i, 52) * (4 + tier * 2) * u), SAND[i % 4])
}

// ── floor + world particles (world space, behind the fighters; called where battleDamage draws its floor) ───
function floorColor(fluid, age) {
  if (fluid === 'oil') return PAL.oil[age > DRY_FRAMES ? 4 : 0]
  if (fluid === 'sand') return SAND[1]
  if (fluid.startsWith('crack')) return (CRACK[fluid.split(':')[1]] || CRACK.edo).fleck
  const pal = fluid.startsWith('alien') ? (PAL[fluid.split(':')[1]] || PAL.blood) : PAL.blood
  return age > DRY_FRAMES ? pal[4] : age > DRY_FRAMES / 2 ? pal[2] : pal[1]
}
export function bloodTickWorld(frame) {
  frame -= _f0
  // falling drips → land as splats (on water: a short dark ring that fades into the water)
  for (let i = _drops.length - 1; i >= 0; i--) {
    const d = _drops[i]; d.vy += 0.32; d.y += d.vy
    if (d.y >= d.floor) {
      _drops.splice(i, 1)
      if (_water) pushDecal({ kind: 'ripple', x: d.x, y: d.floor, r: 2, px: d.px, fluid: d.fluid, born: frame, seed: d.seed, life: 40 })
      else pushDecal({ kind: d.fluid === 'sand' ? 'grains' : 'splat', x: d.x, y: d.floor, r: 1 + (d.seed % 3), px: d.px, fluid: d.fluid, born: frame, seed: d.seed })
    }
  }
  for (let i = _sprays.length - 1; i >= 0; i--) {
    const s = _sprays[i]; s.t++; s.vy += 0.38; s.x += s.vx; s.y += s.vy; s.vx *= 0.96
    if (s.floor != null && s.y >= s.floor) { _sprays.splice(i, 1); if (!_water && s.fluid !== 'crack:edo') pushDecal({ kind: 'splat', x: s.x, y: s.floor, r: 1, px: s.px, fluid: s.fluid, born: frame, seed: (s.x * 7) | 0 }); continue }
    if (s.t >= s.life) _sprays.splice(i, 1)
  }
  for (let i = _parts.length - 1; i >= 0; i--) {
    const p = _parts[i]; p.t++
    if (p.fluid === 'oil') { p.vy += 0.3; p.x += p.vx; p.y += p.vy } else { p.y += 0.5 + (p.fluid === 'sand' ? 1.2 : 0); p.x += Math.sin((p.t + i) * 0.2) * 0.4 }
    if (p.t >= p.life || p.y >= p.floor) { if (p.y >= p.floor && p.fluid !== 'oil' && !_water) pushDecal({ kind: 'grains', x: p.x, y: p.floor, r: 1, px: p.px, fluid: p.fluid, born: frame, seed: (p.x * 13) | 0, faint: true }); _parts.splice(i, 1) }
  }
  // age out
  if ((frame & 15) === 0) _decals = _decals.filter(d => frame - d.born < (d.life || BLOOD_FLOOR_LIFE))
  _lastFrame = frame
}
let _lastFrame = 0
export function bloodDrawFloor(ctx) {
  if (!ctx || level() === 'off') return
  const frame = _lastFrame
  ctx.save()
  for (const d of _decals) {
    const age = frame - d.born, life = d.life || BLOOD_FLOOR_LIFE
    const fade = age > life - 300 ? Math.max(0, (life - age) / 300) : 1
    ctx.globalAlpha = (d.faint ? 0.45 : 0.9) * fade
    ctx.fillStyle = floorColor(d.fluid, age)
    const p = d.px
    if (d.kind === 'ripple') { const rr = (2 + age / 6) * p; ctx.globalAlpha = 0.5 * (1 - age / (d.life || 40)); ctx.fillRect(Math.round(d.x - rr), Math.round(d.y), Math.round(rr * 2), p); continue }
    if (d.kind === 'pool' || d.kind === 'smear') {
      const R = Math.max(1, d.r)
      for (let row = -Math.ceil(R * 0.35); row <= Math.ceil(R * 0.35); row++) {
        const span = Math.sqrt(Math.max(0, R * R - (row / 0.35) * (row / 0.35))) + (H(d.seed, row, 61) - 0.5) * 1.4
        if (span <= 0) continue
        ctx.fillRect(Math.round(d.x - span * p), Math.round(d.y + row * p), Math.round(span * 2 * p), p)
      }
      continue
    }
    // splat / grains: an irregular cluster of art-sized pixels, flattened on the floor
    const n = d.kind === 'grains' ? 2 : 2 + d.r * 2
    ctx.fillRect(Math.round(d.x), Math.round(d.y), p, p)
    for (let i = 0; i < n; i++) ctx.fillRect(Math.round(d.x + (H(d.seed, i, 62) - 0.5) * (d.r + 2) * 2 * p), Math.round(d.y + (H(d.seed, i, 63) - 0.5) * (d.r + 1) * 0.7 * p), p, p)
  }
  ctx.globalAlpha = 1
  for (const d of _drops) { ctx.fillStyle = floorColor(d.fluid, 0); ctx.fillRect(Math.round(d.x), Math.round(d.y), d.px, d.px + (d.vy > 2 ? d.px : 0)) }
  for (const s of _sprays) { ctx.globalAlpha = Math.max(0, 1 - s.t / s.life); ctx.fillStyle = floorColor(s.fluid, 0); ctx.fillRect(Math.round(s.x), Math.round(s.y), s.px, s.px) }
  for (const q of _parts) {
    ctx.globalAlpha = Math.max(0, 1 - q.t / q.life)
    ctx.fillStyle = q.fluid === 'oil' ? (q.t < 4 ? '#ffe9a6' : '#e0a23a') : q.fluid === 'sand' ? SAND[0] : (CRACK[q.fluid.split(':')[1]] || CRACK.edo).flake
    ctx.fillRect(Math.round(q.x), Math.round(q.y), Math.max(1, q.px - (q.fluid === 'oil' ? 1 : 0)), Math.max(1, q.px - 1))
  }
  ctx.restore()
}

// ── lifecycle ──────────────────────────────────────────────────────────────────────────────────────────────
let _f0 = 0   // the sim frame the match started on; every blood frame is counted from it
export function bloodMatchStart(seed, fighters = [], frame0 = 0) {
  _seed = (seed >>> 0) || 0x51ed
  _f0 = frame0 | 0; _lastFrame = 0
  recs.clear(); _canvas.clear(); _decals = []; _drops.length = 0; _sprays.length = 0; _parts.length = 0
  for (const f of fighters) if (f) bloodPreload(f.rosterKey)
}
/** New round: the floor is cleared, but the BODY keeps everything — every wound stays, and the health lost this
 *  round is added to the match total, so the next round starts as bloody as this one ended and gets worse. */
export function bloodRoundStart() {
  _decals = []; _drops.length = 0; _sprays.length = 0; _parts.length = 0
  for (const r of recs.values()) {
    r.prevLost = Math.min(1, r.prevLost + r.curLost); r.curLost = 0
    r.carry = r.tier
    r.lastHp = null; r.pool = null; r.still = 0
    r.version++
  }
}
export function bloodReset() { recs.clear(); _canvas.clear(); _decals = []; _drops.length = 0; _sprays.length = 0; _parts.length = 0 }

// ── harness read-out ───────────────────────────────────────────────────────────────────────────────────────
export function bloodStatus() {
  const slots = {}
  for (const [k, r] of recs) slots[k] = { key: r.key, fluid: r.fluid, tier: r.tier, carry: r.carry, young: r.young, wounds: r.wounds.map(w => `${w.slot}:${w.kind}:${w.sev}`), ends: r.ends.length, mapReady: bloodMapReady(r.key) }
  return { level: level(), slots, decals: _decals.length, drops: _drops.length, sprays: _sprays.length, parts: _parts.length, stats: { ..._stats }, miss: [..._miss], decalKinds: _decals.reduce((a, d) => (a[d.kind] = (a[d.kind] || 0) + 1, a), {}) }
}
/** A stable digest of the visible blood state (for the LAN / replay "identical on every screen" check). */
export function bloodDigest() {
  const s = []
  for (const [k, r] of [...recs].sort()) s.push(k, r.tier, r.carry, r.fluid, ...r.wounds.map(w => `${w.slot}${w.kind}${w.sev}${w.born}${w.seed}`))
  for (const d of _decals) s.push(d.kind, Math.round(d.x), Math.round(d.y), d.born, d.r)
  let h = 2166136261
  for (const c of s.join('|')) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0 }
  return h.toString(16)
}
/** Harness / debugging only: the slot's current blood overlay canvas + its last cache key (no effect on the game). */
export function bloodDebugCanvas(slot) { const c = _canvas.get(slot); return c ? { cv: c.cv, key: c.key } : null }
