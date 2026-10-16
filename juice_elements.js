// juice_elements.js
// ─────────────────────────────────────────────────────────────────
// ELEMENT TABLE for the HIT FEEL "elements" pass (Phase D) — presentation-only.
// Tags each projectile / special with ONE element. The element ONLY controls
// colours, trail style and aftermath (fire burn / ash KO, lightning bolts, etc.).
// NO per-character code edits — everything reads this ONE table at central hooks
// (the projectile renderer + the hit hook). Nothing here changes damage,
// hitboxes, frame data or balance.
//
// Keys: SPECIALS by their specials-object key (== fighter.currentMove / a
// projectile's `name`); ULTIMATES by rosterKey (+ optional _ultVariant). Anything
// not listed falls back to KI (generic energy). "Unsure" calls are flagged at the
// bottom + in the Phase-D report.
// ─────────────────────────────────────────────────────────────────

export const ELEMENT = Object.freeze({
  FIRE: "fire", LIGHTNING: "lightning", ICE: "ice", WIND: "wind",
  WATER: "water", DARK: "dark", LIGHT: "light", KI: "ki",
})

// Per-element presentation: [r,g,b] core tint + a burst "style" hint (used by the hit-spark/aftermath code).
export const ELEMENT_STYLE = Object.freeze({
  fire:      { color: [255, 120, 40],  burst: "ember",   trail: "flame"   },
  lightning: { color: [180, 220, 255], burst: "spark",   trail: "bolt"    },
  ice:       { color: [200, 240, 255], burst: "shard",   trail: "crystal" },
  wind:      { color: [190, 240, 185], burst: "streak",  trail: "arc"     },
  water:     { color: [70, 160, 255],  burst: "droplet", trail: "ribbon"  },
  dark:      { color: [165, 100, 210], burst: "smoke",   trail: "smoke"   },
  light:     { color: [255, 248, 200], burst: "ray",     trail: "ray"     },
  ki:        { color: [255, 225, 150], burst: "ember",   trail: "energy"  },
})

export function elementColor(el) { return (ELEMENT_STYLE[el] || ELEMENT_STYLE.ki).color }
export function elementStyle(el) { return ELEMENT_STYLE[el] || ELEMENT_STYLE.ki }

// ── SPECIALS / projectiles — keyed by move name (specials key / projectile .name) ──
export const SPECIAL_ELEMENTS = Object.freeze({
  // FIRE
  katon: "fire", amaterasu: "dark", ssKatonCast: "fire", madaraGoka: "fire",
  gamayuEndan: "fire", gamayuBig: "fire", gokakyu: "fire", hosenka: "fire", fireball: "fire",
  yamamotoEruption: "fire", yamamotoStab: "fire", incinerationCannon: "fire",
  fireHeatblastFireball: "fire", fireDhRisingDiamonds: "light",
  // LIGHTNING
  raikiri: "lightning", chidori: "lightning", zoldyckThunderbolt: "lightning",
  zoldyckNarukami: "lightning", borutoShiden: "lightning", kirin: "lightning",
  // WIND
  rasenshuriken: "wind", borutoPalmBlast: "wind", impactShockwave: "wind", futon: "wind",
  // WATER
  suiton: "water", waterwall: "water",
  // DARK
  portalBlast: "dark", selfDestructBlast: "dark",
  // ENERGY / KI (classic ki & tech energy)
  kamehameha: "ki", kiBlast: "ki", explosion: "ki", specialBeam: "ki", beam: "ki",
  minatoBigBall: "wind", hollowGetsuga: "dark", vilgaxPlasmaBlast: "ki",
  lRyuuzakiBazooka: "ki", lRyuuzakiGoldenNova: "light",
  // Naruto chakra orbs read as blue "ki"/wind energy
  rasengan: "wind",
})

// ── ULTIMATES — keyed by rosterKey (value = element, or { <_ultVariant>: el, _default: el }) ──
export const ULT_ELEMENTS = Object.freeze({
  // Dragon Ball — ki energy (goku_black/rose/dark lean DARK)
  goku: "ki", vegeta: "ki", vegito: "ki", gogeta: "ki", gohan: "ki", gotenks: "ki",
  piccolo: "ki", frieza: "ki", cell: "ki", beerus: "dark", bardock: "ki",
  vegeta_dark: "dark", goku_black: "dark", goku_rose: "dark",
  // Naruto — tailed-beast bombs / meteors / gravity read KI/DARK; flame ults FIRE
  naruto: "ki", naruto_hokage: "ki", naruto_seventh: "ki", boruto: "ki",
  pain: "dark", six_paths_pain: "dark", madara: "fire", obito: "dark", tobi: "dark",
  sasuke_adult: "lightning", sasuke_sensei: "fire", gaara: "wind", onoki: "light",
  // Bleach / JJK
  ichigo: "dark", zaraki: "dark", zaraki_shikai: "dark", yamamoto: "fire", yuji: "dark",
  saiki: "ki",
  // Demon Slayer / OPM
  rengoku: "fire", zenitsu: "lightning", saitama: "ki",
  // DC / Marvel / misc
  superman: "light", superman_fighter: "light", brainiac: "ki",
  iron_man: "ki", iron_man_2: "ki", iron_man_3: "ki", miles: "dark",
  jesus: "light", netero: "light", rick: "ki",
  ben10: { heatblast: "fire", diamondhead: "light", _default: "ki" },
  albedo: { heatblast: "fire", diamondhead: "light", _default: "ki" },
  zoldyck: "lightning", samurai_red_ranger: "fire",
})

// Resolve the element for a move. Returns an ELEMENT value (default "ki").
//   opts.currentMove — special key / projectile name
//   opts.isUltimate  — look up the ULT table
//   opts.ultVariant  — fighter._ultVariant / _form
export function elementFor(rosterKey, opts = {}) {
  const key = String(rosterKey || "").toLowerCase()
  if (opts.isUltimate) {
    const e = ULT_ELEMENTS[key]
    if (!e) return ELEMENT.KI
    if (typeof e === "string") return e
    const v = opts.ultVariant || opts.form
    return (v && e[v]) || e._default || ELEMENT.KI
  }
  const mv = opts.currentMove
  if (mv && SPECIAL_ELEMENTS[mv]) return SPECIAL_ELEMENTS[mv]
  return ELEMENT.KI
}

// ─────────────────────────────────────────────────────────────────
// UNSURE / inferred (flagged — refine freely; it's a lookup table, no balance impact):
//   • amaterasu / hollowGetsuga → DARK (black flame / hollow reiatsu) rather than FIRE/KI.
//   • rasengan / minatoBigBall → WIND (chakra sphere) vs KI — judgement call.
//   • madara ULT → FIRE (Katon/meteor family) though his kit spans gravity too.
//   • sasuke_adult ULT → LIGHTNING (Kirin/Chidori signature) though he also has Katon/Rinnegan.
//   • onoki / fireDhRisingDiamonds / superman → LIGHT (particle / crystal / solar).
//   • beerus / miles / obito ULT → DARK (Hakai / venom / Kamui-void) vs KI.
//   • Everything unlisted (hisoka, chrollo, kurapika, shizuku, batman, spiderman variants,
//     ghostface, jason, light, handler, etc.) → KI/GENERIC by default — many have no
//     elemental projectile; tag individually later if desired.
// ─────────────────────────────────────────────────────────────────

export default { ELEMENT, ELEMENT_STYLE, SPECIAL_ELEMENTS, ULT_ELEMENTS, elementFor, elementColor, elementStyle }
