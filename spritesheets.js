
// spritesheets.js
// ─────────────────────────────────────────────────────────────────
// PER-CHARACTER SPRITE REGISTRY
// ─────────────────────────────────────────────────────────────────
// The engine draws horizontal sprite STRIPS: one PNG per action, frames laid
// left → right, every frame the same size. SpriteHandler (sprite.js) picks the
// action from fighter state and draws frame N at (N × frameWidth).
//
// ── HOW TO GIVE A FIGHTER SPRITES ────────────────────────────────
// 1. Make one strip PNG per action (idle/walk/jump/light/heavy/hurt/…).
//      e.g. sukuna_idle_sheet.png = [f0][f1][f2][f3]
// 2. Add an entry below under the character's `rosterKey`.
//      • Array form (convention):  files are ./<prefix>_<action>_sheet.png
//      • Object form (explicit):   give each action its own path
// 3. In characters.js set `hasSprites: true` and an `animationData` block that
//    declares { frames, width, height, speed } for each action.
// Missing sheets safely fall back to the procedural drawing — partial sets work.
//
// Action names must match what SpriteHandler._resolveAction() produces. The
// always-available ones: idle, walk, run, jump, fall, hurt, dash, light, heavy,
// up, air, down_air. (Specials show idle frames unless you also map them.)
// ─────────────────────────────────────────────────────────────────

export const SPRITE_MANIFEST = {
  // Reference entry — Gojo's existing ./gojo_<action>_sheet.png files.
  gojo: {
    prefix: "gojo",
    actions: ["idle", "walk", "jump", "light", "heavy", "hurt", "blue", "red", "hollow_purple", "infinity", "teleport"]
  }

  // ── TEMPLATE: copy, rename, drop your PNGs in, set hasSprites in characters.js
  // sukuna: {
  //   prefix: "sukuna",
  //   actions: ["idle", "walk", "jump", "light", "heavy", "hurt"]
  // },
  //
  // ── Object form when your filenames don't follow the convention:
  // megumi: {
  //   actions: {
  //     idle:  "./art/megumi/idle.png",
  //     walk:  "./art/megumi/walk.png",
  //     light: "./art/megumi/jab.png"
  //   }
  // }
}

// rosterKey → { action: HTMLImageElement } (cached; built once per character)
const _maps = new Map()

export function loadSpriteSheets(rosterKey) {
  if (!rosterKey) return null
  if (_maps.has(rosterKey)) return _maps.get(rosterKey)

  const entry = SPRITE_MANIFEST[rosterKey]
  if (!entry) { _maps.set(rosterKey, null); return null }

  const map = {}
  const actions = entry.actions

  if (Array.isArray(actions)) {
    const prefix = entry.prefix || rosterKey
    for (const action of actions) {
      const img = new Image()
      img.src = `./${prefix}_${action}_sheet.png`
      map[action] = img
    }
  } else if (actions && typeof actions === "object") {
    for (const [action, path] of Object.entries(actions)) {
      const img = new Image()
      img.src = path
      map[action] = img
    }
  }

  _maps.set(rosterKey, map)
  return map
}

// The sheet map for a fighter (lazy-loads on first request). null if no sprites.
export function getSpriteSheets(rosterKey) {
  return _maps.has(rosterKey) ? _maps.get(rosterKey) : loadSpriteSheets(rosterKey)
}

// True once the character's idle sheet has actually decoded — the gate that
// switches a fighter from procedural drawing to sprites.
export function spritesReady(rosterKey) {
  const map = getSpriteSheets(rosterKey)
  if (!map) return false
  const idle = map.idle
  return !!(idle && idle.complete && idle.naturalWidth > 0)
}

// Does this character have sprites registered at all?
export function hasSpriteManifest(rosterKey) {
  return !!SPRITE_MANIFEST[rosterKey]
}
