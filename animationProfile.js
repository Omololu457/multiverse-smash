// animationProfile.js
// ─────────────────────────────────────────────────────────────────────────
// Optional per-action sprite definitions consumed by sprite.js. sprite.js does
//   _getAction = mod.getAction   (dynamic import; absent → 128x128 _FALLBACK)
//
// WHY THIS FILE IS REQUIRED (not just nice-to-have):
// In SpriteHandler.draw(), frame dims are resolved as
//   frameData.width = profileAction.width ?? legacyFrameData?.width ?? 128
// When this file is ABSENT, profileAction is the _FALLBACK, whose width/height
// are the concrete value 128 — so the `??` never falls through and a character's
// own animationData (the small native cell sizes) is SHADOWED and ignored. That
// is why Gojo sliced every frame at 128px regardless of his animationData.
//
// This adapter simply forwards each sprite character's OWN animationData (the
// single source of truth in characters.js) — plus its spriteScale — into that
// slot, so the real native cell sizes reach the handler. It returns null for
// anything it doesn't define, leaving every non-sprite character on the existing
// _FALLBACK / procedural path completely unchanged.
//
// No `sheet` is returned → sprite.js keeps using its legacy spritesheets.js
// loader. No `loop`/`lockLastFrame` → draw() keeps defaulting them from
// fighter.attacking (idle/walk loop, attacks play-once-and-hold).
// ─────────────────────────────────────────────────────────────────────────
import { characters } from "./characters.js";

export function getAction(charKey, actionKey, skinAnim = null) {
  const c = characters[String(charKey || "").toLowerCase()];
  // SKIN OVERRIDE: a per-fighter skin animationData (complete: own + borrowed
  // defaults) takes precedence so mirror matches with different skins both work.
  const data = skinAnim || ((c && c.hasSprites) ? c.animationData : null);
  if (!data) return null;

  const a = data[actionKey];
  if (!a || a.width == null || a.height == null) return null;

  return {
    frames:  a.frames ?? 1,
    width:   a.width,        // native SOURCE cell width (slicing)
    height:  a.height,       // native SOURCE cell height
    speed:   a.speed ?? 5,
    // Per-action sheet path → sprite.js does `_loadSheet(profileAction.sheet)`,
    // loading the exact file (handles non-convention names like gojo_ajab_sheet).
    // Omit it (null) → sprite.js falls back to the legacy spritesheets loader.
    sheet:   a.sheet || null,
    // Forward loop / lockLastFrame ONLY when the entry sets them, so one-shot
    // actions (e.g. Gojo's intro `transform`: loop:false + lockLastFrame:true)
    // play once and hold. Entries that omit them stay undefined → sprite.js
    // keeps defaulting both from fighter.attacking (unchanged for everyone else).
    loop:         a.loop,
    lockLastFrame:a.lockLastFrame,
    anchorX: a.anchorX || 0,
    anchorY: a.anchorY || 0,
    // Atlas source origin into a shared sheet (default 0/0 = legacy top-left).
    sourceX: a.sourceX || 0,
    sourceY: a.sourceY || 0,
    spriteScale: c.spriteScale,   // also surfaced via fighter.spriteScale in draw()
    // Per-action scale correction (Toji old-row-sheet actions) — draw() multiplies it into
    // the display scale so art not tuned for the character's global spriteScale renders right.
    actionScale: a.actionScale,
  };
}
