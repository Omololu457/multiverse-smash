// fatalityStyles.js
// ─────────────────────────────────────────────────────────────────
// FATALITY ARCHETYPE MAP — which finishing STYLE each winner uses, and which pre-built derived victim sprite
// (fatality/<victimKey>_<sprite>.png) + themed FX/sound that style drives. Data only. Pure (no imports).
// Styles: slice (chop into pieces) · smoosh (crush/pancake) · riddle (projectiles stuck in) · ash (disintegrate).
// A winner's style is chosen from their kit archetype; the victim can be ANY character (all have all 4 sprites).
// Unlisted → default "slice" (the most universal; every char has a _chopped sprite). Tune freely.
// ─────────────────────────────────────────────────────────────────

export const STYLE_SPRITE = Object.freeze({ slice: "chopped", smoosh: "smoosh", riddle: "riddled", ash: "ashen" })

// Per-style flavour for the cutaway (colours / banner / lead sound). Keeps each archetype's finish distinct.
export const STYLE_FX = Object.freeze({
  slice:  { banner: "CUT TO PIECES",   tint: "#be1218", lead: "crack_sizzle_bright", boom: "boom_huge_01" },
  smoosh: { banner: "CRUSHED",         tint: "#8a0f14", lead: "boom_medium_02",      boom: "boom_huge_02_roar" },
  riddle: { banner: "RIDDLED",         tint: "#9a1016", lead: "swish_fast_01",       boom: "impact_hit_01" },
  ash:    { banner: "ERASED",          tint: "#e07a1e", lead: "charge_hum_rise",     boom: "boom_huge_02_roar" },
})

// Winner archetype → style. Explicit groups below; everything else defaults to "slice".
const ASH = ["goku", "goku_rose", "goku_black", "vegeta", "vegito", "gogeta", "gohan", "bardock", "broly",
  "frieza", "cell", "beerus", "gotenks", "piccolo", "brainiac", "rick", "rickPrime", "evilMorty", "morty",
  "gojo", "yuta", "genos", "beerusKiBall", "ben10", "ben10_alienx", "ben10_brainstorm", "ben10_cannonbolt",
  "vilgax", "light", "miwa", "albedo"]
const SMOOSH = ["pain", "omniman", "superman", "saitama", "baki", "netero", "meruem", "zaraki", "zaraki_shikai",
  "green_lantern", "flash", "hashirama", "onoki", "gaara"]
const RIDDLE = ["naruto", "naruto_seventh", "naruto_hokage", "minato", "kakashi", "kakashi_anbu", "kakashi_war",
  "boruto", "deathstroke", "spiderman", "spiderman_raimi", "spiderman_ssf2", "spiderman_mci", "miles", "gwen",
  "shinobu", "shisui_puppeteer"]
// everything else → slice (blades/claws/default): sasuke*, shisui*, itachi, obito, tobi, isshiki, ichigo,
// byakuya, nezuko, inosuke, tanjiro, toji, maki, jason, ghostface_exe, hisoka, chrollo, kurapika, etc.

const _map = {}
for (const k of ASH) _map[k] = "ash"
for (const k of SMOOSH) _map[k] = "smoosh"
for (const k of RIDDLE) _map[k] = "riddle"
export const FATALITY_STYLE = Object.freeze(_map)

export function fatalityStyleFor(winnerKey) {
  return FATALITY_STYLE[(winnerKey || "").toLowerCase()] || "slice"
}
// Pre-built victim sprite path for a (winner-style, victim) pair.
export function fatalitySpritePath(winnerKey, victimKey) {
  const style = fatalityStyleFor(winnerKey)
  return `./fatality/${(victimKey || "").toLowerCase()}_${STYLE_SPRITE[style]}.png`
}

export default { STYLE_SPRITE, STYLE_FX, FATALITY_STYLE, fatalityStyleFor, fatalitySpritePath }
