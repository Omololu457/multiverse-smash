
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

// ═══════════════════════════════════════════════════════════════════
// GOJO SPRITE SPEC — replacement-art contract  (DO NOT delete current sheets)
// ───────────────────────────────────────────────────────────────────
// The Gojo art is being replaced with higher-quality sheets the user supplies.
// To swap them in: overwrite each file below IN PLACE with a new strip that
// matches its { frames × width × height }. Filenames and the manifest stay the
// same, so the game keeps running on the current sheets until each is replaced.
// Frame counts / dimensions are the engine's source of truth in
// characters.js → gojo.animationData (mirrored here for the artist's reference).
// If a new sheet uses a different layout, change BOTH this list and that block.
//
//   FILE                            FRAMES  CELL (WxH)   NOTES
//   gojo_idle_sheet.png              6       128×128     breathing loop
//   gojo_walk_sheet.png              8       128×128     walk cycle
//   gojo_jump_sheet.png              4       128×128     jump/rise→fall
//   gojo_hurt_sheet.png              2       128×128     flinch
//   gojo_light_sheet.png             5       128×128     jab (startup 0-1 / active 2-3 / recovery 4)
//   gojo_heavy_sheet.png             7       128×128     heavy (0-2 / 3-4 / 5-6)
//   gojo_blue_sheet.png              6       128×128     Blue special
//   gojo_red_sheet.png               6       128×128     Red special
//   gojo_hollow_purple_sheet.png    10       256×128     Purple — WIDE cells (0-4 / 5-8 / 9)
//   gojo_infinity_sheet.png          4       128×128     Infinity aura loop
//   gojo_teleport_sheet.png          4       128×128     teleport blink
//
// Strip format: frames laid left→right, every cell identical size, transparent
// background, character centered/feet-aligned consistently across all sheets.
// (gojo_win.png is a single still, not an animation strip.)
// ═══════════════════════════════════════════════════════════════════
export const SPRITE_MANIFEST = {
  // Gojo's existing ./gojo_<action>_sheet.png strips. Replacement art must keep
  // these exact filenames + the per-action layout documented in GOJO SPRITE SPEC
  // above. Sheets that haven't been replaced yet still load fine.
  gojo: {
    prefix: "gojo",
    actions: ["idle", "walk", "jump", "light", "heavy", "hurt", "blue", "red", "hollow_purple", "infinity", "teleport"]
  },

  // Sukuna. NOTE: actual per-action rendering reads the `sheet` path from
  // characters.js → animationData (via animationProfile.js), NOT this list — this
  // manifest entry exists only so getSpriteSheets()/spritesReady() can decode the
  // idle sheet and gate Sukuna onto the SpriteHandler. The movement filenames
  // below happen to match the ./sukuna_<action>_sheet.png convention.
  sukuna: {
    prefix: "sukuna",
    actions: ["idle", "walk", "jump", "dash", "hurt"]
  },

  // Megumi & Toji: idle strip is non-convention (stance / row03), so use OBJECT
  // form to point `idle` at the real file — this is only the spritesReady() gate;
  // per-action rendering reads the `sheet` path from animationData.
  megumi: {
    actions: { idle: "./megumi_stance_sheet.png" }
  },
  toji: {
    actions: { idle: "./toji_row03_sheet.png" }
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
