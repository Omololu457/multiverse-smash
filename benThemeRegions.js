// benThemeRegions.js: ONE regional map per sprite set for Ben's cosmetic themes (benThemes.js).
//
// A map is an ordered rule list. Each rule claims source colours by HSV window and assigns them a ROLE (P/S/A/E/H, see
// benThemes.js). The FIRST matching rule wins; a colour no rule claims is left exactly as drawn (outline black, skin, eye
// whites, teeth, mouths). `ref` is the region's reference colour (its dominant tone): a pixel brighter / darker than ref lands
// lighter / darker on the theme's ramp, which keeps the art's shading. `fb` = what an H rule does when the theme has no
// HIGHLIGHT ("keep" = natural, e.g. hair; "P" = the primary ramp, e.g. crystal facets).
// `mat` documents the per-material rule (fire / crystal / metal / fur / dark / organic); docs/ben10/skins/<set>_REGIONS.md
// records the mapping, the colours left alone and any region the art genuinely lacks.
// Colours were measured from every body strip of each set (tools/ben10/theme_palette_audit.py). Only RGB is recoloured:
// alpha (Ghostfreak's phase, fades) is copied untouched. FX sheets drawn outside the fighter sprite are not recoloured.
//
// rule: { role, h: [lo, hi] (degrees; lo > hi wraps through 0), s: [lo, hi], v: [lo, hi], ref: "#rrggbb", fb?, gain?, swapDark? }
// light: [roles]: a pale region takes the lightest of these roles in the theme (keeps a white chest light)
// swapDark: the role used instead when the theme's PRIMARY is near-black and its SECONDARY lighter (keeps black linework readable)
const R = (role, h, s, v, ref, extra = {}) => ({ role, h, s, v, ref, ...extra })
const ANY = [0, 360]

export const BEN_THEME_REGIONS = {
  // ── HUMANS ──
  classic: { label: "Ben — Classic (shirt / cargo pants / watch)", mat: "clothing", rules: [
    R("E", [100, 160], [0.5, 1], [0.2, 1], "#009300"),            // the Omnitrix watch face (#006200 / #009300 / #22b14c)
    R("H", [10, 32], [0.75, 1], [0.15, 0.6], "#844210", { fb: "keep" }), // brown hair (#4a2500 / #844210); skin (sat < 0.75) is not hair
    R("S", [60, 95], [0.5, 1], [0.15, 0.5], "#496315", { swapDark: "P" }),   // olive cargo pants (#496315 / #2b3d06)
    R("P", ANY, [0, 0.12], [0.7, 1], "#f3f3f3", { swapDark: "S" }),          // the white shirt (#fcfcfd / #f3f3f3 / #cecece); its stripe is black linework
  ] },
  jacket: { label: "Ben — Jacket / Alien Force (jacket / undershirt / jeans / watch)", mat: "clothing", rules: [
    R("P", [100, 140], [0.6, 1], [0.15, 0.7], "#009300", { swapDark: "S" }), // the green jacket (#006200 / #009300 / #003500 shading), over a BLACK undershirt
    R("S", [200, 230], [0.5, 1], [0.15, 0.6], "#09367b", { swapDark: "P" }), // the jeans (#09367b / #062553)
    R("H", [10, 32], [0.7, 1], [0.1, 0.4], "#341906", { fb: "keep" }), // brown hair (#341906 / #4c2a0e)
    R("A", [25, 45], [0.95, 1], [0.4, 0.7], "#a56300"),            // belt / shoe trim (#a56300 / #8c5200)
  ] },

  // ── READY ALIENS: added in Phase 3 (the per-alien cascade) ──
}
