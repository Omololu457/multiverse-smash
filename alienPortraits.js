// alienPortraits.js
// ──────────────────────────────────────────────────────────────────────────
// Ben 10 ALIEN PROFILE PICTURES: one square head-and-shoulders portrait per READY alien,
// shown on the alien-select (PICK FIVE) cards and as Ben's in-match HUD portrait while transformed.
//
// Source: official show artwork (mostly Ben 10: Omniverse renders) as hosted on the Ben 10 fan wiki
// (ben10.fandom.com). Ben 10 and all of its characters and artwork belong to Cartoon Network /
// Warner Bros. Discovery and Man of Action; none of it is ours. Used here only in a free,
// non-commercial fan game (see credits.js LEGAL_NOTICE). Exact source file per alien: SOURCE_FILES;
// crop boxes: tools/ben10/alien_portraits/crop_boxes.json.
//
// Render-only: no gameplay data, no RNG. Missing / not-yet-loaded image → null (caller keeps its old look).
// ──────────────────────────────────────────────────────────────────────────

export const ALIEN_PORTRAIT_DIR = "./assets/portraits/ben10_aliens/"

// alien key → wiki file the portrait was cropped from
export const ALIEN_PORTRAIT_SOURCE_FILES = {
  swampfire: "Omniverse_Swampfire.png", heatblast: "Heatblast_omniverse_official.png", megawhatt: "Megawhatt.png",
  goop: "Goop_art.png", xlr8: "XLR8_OV2.png", eyeguy: "OmniverseEyeGuy.png", ghostfreak: "Ghostfreak_ov_official.png",
  alienx: "OV_AlienX.png", brainstorm: "Brainstorm_ov.png", terraspin: "OV_Terraspin_Stand.PNG",
  wildvine: "OmniverseWildvine.png", jetray: "JetrayProfilePicture.png", diamondhead_ov: "Diamondhead_OV.png",
  upgrade_ov: "OV_Upgrade.png", humongousaur: "Humungousaur_omniverse_official.png", feedback_ov: "Teen_Feedback_Stand.png",
  arcticguana: "OV_Teen_Arctiguana.png", benwolf: "Benwolf_Model.png", bigchill: "OV_BigChill.png",
  ripjaws: "Ripjaws_ov_official.png", rath: "Rath_OV_pre-mask.png", waterhazard: "Water_Hazard_official_artwork.png",
  highbreed: "Highbreed_render.png", wildmutt_ov: "Wildmutt_OV.png",
}

export const ALIEN_PORTRAIT_KEYS = Object.keys(ALIEN_PORTRAIT_SOURCE_FILES)

export function alienPortraitPath(key) {
  return ALIEN_PORTRAIT_SOURCE_FILES[key] ? ALIEN_PORTRAIT_DIR + key + ".png" : null
}

const _cache = new Map()
// Loaded <img> for an alien key, or null (unknown key / still loading / failed / no DOM).
export function getAlienPortrait(key) {
  const src = alienPortraitPath(key)
  if (!src || typeof Image === "undefined") return null
  let im = _cache.get(key)
  if (!im) { im = new Image(); im.src = src; _cache.set(key, im) }
  return im.complete && im.naturalWidth > 0 ? im : null
}
