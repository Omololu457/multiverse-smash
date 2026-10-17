// portrait_overrides.js
// ─────────────────────────────────────────────────────────────────
// MANUAL PORTRAIT OVERRIDES for the themed in-match HUD.
//
// The HUD resolves each character's portrait in priority order (see ui.js
// _resolveHudPortrait): 1) this override table, 2) existing select/cut-in
// portrait art, 3) an auto head-crop of the idle sprite, 4) an initial-letter
// fallback. This table lets you REPLACE the source file or the crop box for
// any character by key, and optionally per FORM.
//
// Shape:
//   rosterKey: {
//     src?:  "./existing_file.png",     // point at an EXISTING asset only
//     crop?: { x, y, w, h },            // source-pixel rect to use as the portrait
//     forms?: {                         // per-form overrides (form tag = sheet basename
//       "<formTag>": { src?, crop? },   //   or skin id; keep base portrait if absent)
//     },
//   }
//
// RULES:
//   • NEVER invent or generate art. `src` must be a file that already exists.
//   • `crop` is in SOURCE-IMAGE pixels. If `src` is omitted, the crop applies
//     to the character's live idle-sprite frame instead.
//   • Omit a character entirely to use the automatic resolution.
// ─────────────────────────────────────────────────────────────────
export const PORTRAIT_OVERRIDES = {
  // Examples (commented — enable/edit as needed while cutting characters):
  // batman:    { crop: { x: 10, y: 2, w: 52, h: 52 } },
  // goku:      { forms: { goku_ssj_idle_uniform: { crop: { x: 0, y: 0, w: 113, h: 70 } } } },
}

// Look up an override for a rosterKey + optional live form tag.
// Returns the most specific match: a form override merged over the base, or null.
export function getPortraitOverride(rosterKey, formTag) {
  const base = PORTRAIT_OVERRIDES[String(rosterKey || "").toLowerCase()]
  if (!base) return null
  if (formTag && base.forms && base.forms[formTag]) {
    return { ...base, ...base.forms[formTag] }
  }
  return base
}
