// juice_tiers.js
// ─────────────────────────────────────────────────────────────────
// EXPLOSIVE-MOVE TIER TABLE for the presentation-only "JUICE" pass.
//
// ONE data table (no per-character code). Every EXPLOSIVE move — explosions,
// bombs, big ki/energy blasts, tailed-beast bombs, detonations, big
// ground-slam blasts, meteors — is tagged SMALL, MEDIUM, or ULTIMATE. The
// explosion juice (impact frame, fireball, debris, shake, shockwave, sound,
// ult-only slow-mo) reads its tier from here when a detonation event fires.
//
// RUNTIME KEYS (how the engine identifies a move — from the kit audit):
//   • SPECIALS   → fighter.currentMove  (the specials-object KEY in characters.js,
//                  stamped by setAttackState in abilities.js).
//   • ULTIMATES  → fighter.rosterKey    (triggerUltimate switch) + optional
//                  fighter._ultVariant  (directional ult, stamped in game.js).
//   combat.js projectiles also carry isUltimate / aoe flags as a cross-check.
//
// NOTHING here changes damage, hitboxes, frame data or balance — it only
// classifies the VISUAL/AUDIO scale of a move that already explodes. The table
// is consulted only AT a detonation event, so a listed move that never fires one
// is simply a dead (harmless) entry.
//
// CONSERVATIVE POLICY (ambiguous cases, per the task): clear energy-blast / bomb
// / meteor / tailed-beast-bomb moves are tagged; finishers that are NOT
// explosions (melee body-slams, blade storms, energy constructs, pure summons)
// are DELIBERATELY EXCLUDED so juice is never slapped onto a non-explosion. The
// EXCLUDED list + every uncertain call is documented at the bottom and in the
// Phase-1 report.
// ─────────────────────────────────────────────────────────────────

export const JUICE_TIER = Object.freeze({ SMALL: "small", MEDIUM: "medium", ULTIMATE: "ultimate" })

// ── SPECIAL / NORMAL explosive moves — keyed by fighter.currentMove ───────────
// (the specials-object key). Non-ultimate, so SMALL or MEDIUM by visual scale.
export const JUICE_SPECIAL_TIERS = Object.freeze({
  // Dragon Ball
  kamehameha:        "medium",   // Goku — charge→release ki beam
  kiBlast:           "small",    // Vegeta — ki-blast burst
  explosion:         "medium",   // Goku Black — proximity AOE nuke
  specialBeam:       "medium",   // Piccolo — Special Beam Cannon
  beam:              "medium",   // Piccolo/shared — charged ki beam
  // Naruto
  rasenshuriken:     "medium",   // Naruto (Seventh) — wind-blade burst
  minatoBigBall:     "medium",   // Minato — Big Ball Rasengan burst
  borutoPalmBlast:   "small",    // Boruto — wind-streak palm blast
  madaraGoka:        "medium",   // Madara — Gōka Mekkyaku fire-wall blast
  madaraShinraTensei:"medium",   // Madara — repulsion shockwave
  katon:             "medium",   // Sasuke (adult) — Great Fireball, explodes on impact
  amaterasu:         "medium",   // Sasuke (adult) — black-flame burst
  ssKatonCast:       "medium",   // Sasuke (sensei) — Goukakyuu rolling fireball
  gamayuBig:         "medium",   // Jiraiya — big Katon Gamayu Endan flame-wall
  gamayuEndan:       "small",    // Jiraiya — toad-oil flame bullet
  // Bleach / Demon Slayer / OPM
  hollowGetsuga:     "medium",   // Ichigo — dark energy burst slash
  yamamotoEruption:  "medium",   // Yamamoto — ground flame eruption
  yamamotoStab:      "medium",   // Yamamoto — flame crescent AOE
  seriousPunch:      "medium",   // Saitama — traveling shockwave AOE
  incinerationCannon:"medium",   // Genos — charge blast (full tier = giant)
  impactShockwave:   "medium",   // Baki — air-pressure AOE blast
  // Ben 10
  fireHeatblastFireball: "small",// Ben10/Albedo — flame projectile
  fireDhRisingDiamonds:  "medium",// Ben10/Albedo — ground crystal eruption
  vilgaxPlasmaBlast: "small",    // Vilgax — energy-sphere projectile
  // Hunter x Hunter
  zoldyckThunderbolt:"small",    // Killua (Godspeed) — bolt projectile
  zoldyckNarukami:   "medium",   // Killua (Godspeed) — 3 lightning-pillar detonations
  // Death Note / misc
  lRyuuzakiBazooka:  "medium",   // L — explosive projectile
  lRyuuzakiGoldenNova:"small",   // L — wide burst projectile
  portalBlast:       "small",    // Rick Prime — energy sphere
  selfDestructBlast: "medium",   // Rick — proximity self-destruct blast
})

// ── ULTIMATE explosive moves — keyed by rosterKey ────────────────────────────
// Value is "ultimate", OR a { <_ultVariant>: tier, _default: tier } map for
// characters whose directional ults differ. Every entry here explodes (energy
// blast / bomb / meteor / tailed-beast bomb), so all resolve to ULTIMATE.
export const JUICE_ULT_TIERS = Object.freeze({
  // Dragon Ball — big ki/energy blasts (Kamehameha / Final Flash / Death Ball / Hakai)
  goku: "ultimate", vegeta: "ultimate", vegeta_dark: "ultimate", piccolo: "ultimate",
  frieza: "ultimate", cell: "ultimate", gohan: "ultimate", gotenks: "ultimate",
  beerus: "ultimate", bardock: "ultimate", gogeta: "ultimate", vegito: "ultimate",
  goku_black: "ultimate", goku_rose: "ultimate",
  // DC / Marvel / Invincible — energy detonations
  superman: "ultimate", superman_fighter: "ultimate", brainiac: "ultimate",
  iron_man: "ultimate", iron_man_2: "ultimate", iron_man_3: "ultimate", miles: "ultimate",
  // Naruto — tailed-beast bombs, meteors, Rinnegan gravity/repulsion
  naruto:         { kurama: "ultimate", bijuudama: "ultimate", _default: "ultimate" },
  naruto_hokage:  { bijuudama: "ultimate", rikudou: "ultimate", fourTails: "ultimate", _default: "ultimate" },
  naruto_seventh: { bijuudama: "ultimate", foxSummon: "ultimate", rikudou: "ultimate", _default: "ultimate" },
  boruto: "ultimate",
  pain:            { chibakuTensei: "ultimate", shinraTensei: "ultimate", _default: "ultimate" },
  six_paths_pain:  { chibakuTensei: "ultimate", shinraTensei: "ultimate", _default: "ultimate" },
  madara: "ultimate", obito: "ultimate", tobi: "ultimate",
  sasuke_adult:   { chibakuTensei: "ultimate", shinraTensei: "ultimate", _default: "ultimate" },
  sasuke_sensei: "ultimate",
  gaara:           { sabakuTaisou: "ultimate", shukaku: "ultimate", _default: "ultimate" },
  onoki: "ultimate",
  // Jujutsu Kaisen / Bleach — cursed-energy / reiatsu bursts
  yuji: "ultimate", ichigo: "ultimate", zaraki: "ultimate", zaraki_shikai: "ultimate",
  yamamoto: "ultimate", saiki: "ultimate",
  // Demon Slayer / One Punch Man — flame/thunder/serious-punch detonations
  rengoku: "ultimate", zenitsu: "ultimate", saitama: "ultimate",
  // Ben 10 (by _form), HxH, R&M, religious, Power Rangers
  ben10:  { heatblast: "ultimate", diamondhead: "ultimate", _default: "ultimate" },
  albedo: { heatblast: "ultimate", diamondhead: "ultimate", _default: "ultimate" },
  zoldyck: { barrage: "ultimate", _default: "ultimate" },
  netero: "ultimate", rick: "ultimate", jesus: "ultimate",
  samurai_red_ranger: "ultimate",
})

// Resolve the explosion tier for a move at a detonation event. Returns a
// JUICE_TIER value, or null if the move isn't an explosive one (→ no juice).
//   opts.isUltimate — this detonation belongs to an ultimate
//   opts.ultVariant — fighter._ultVariant (directional ult), if any
//   opts.currentMove— fighter.currentMove (special key), for non-ultimate moves
//   opts.form       — fighter._form (Ben 10 / Albedo alien), optional
export function juiceTierForMove(rosterKey, opts = {}) {
  const key = String(rosterKey || "").toLowerCase()
  if (opts.isUltimate) {
    const e = JUICE_ULT_TIERS[key]
    if (!e) return null
    if (typeof e === "string") return e
    const variant = opts.ultVariant || opts.form
    return (variant && e[variant]) || e._default || null
  }
  const mv = opts.currentMove
  if (mv && JUICE_SPECIAL_TIERS[mv]) return JUICE_SPECIAL_TIERS[mv]
  return null
}

// Does a move have a charge / startup ≥ 8f? Used ONLY to gate the ANTICIPATION
// beat (source swells + reddens + pops) — a presentation cue, never a frame
// change. Phase 2 reads the real startup at the hook; this is the data default:
// ultimates and charge-named specials anticipate; quick specials don't.
export const JUICE_ANTICIPATES = Object.freeze(new Set([
  "kamehameha", "explosion", "specialBeam", "beam", "rasenshuriken", "minatoBigBall",
  "madaraGoka", "gamayuBig", "incinerationCannon", "amaterasu", "zoldyckNarukami",
]))

// ─────────────────────────────────────────────────────────────────
// DELIBERATELY EXCLUDED (reviewed → NOT an explosion; no juice). Documented so
// the exclusion is intentional, not an oversight:
//   omniman (Viltrumite Onslaught) ...... flying body-slam (melee)
//   batman / dark_knight (The Dark Knight) batarang barrage (not a blast)
//   green_lantern (Will Made Manifest) .. energy CONSTRUCT, not a detonation
//   byakuya / mayuri (Bankai) ........... blade storm / construct crush
//   orochimaru / isshiki ................ summons / rods (no clear blast)
//   killua (base) ....................... Godspeed buff (no detonation)
//   superman_dcuc (Big Rock) ............ boulder IMPACT + rubble (not a blast)
//   gon (Jajanken Rock) ................. Nen PUNCH impact (borderline; excluded)
//   meruem (Ant King's Onslaught) ....... aura burst (borderline; excluded)
//   cannonbolt form (Ben10/Albedo) ...... melee pinball roll
//
// UNCERTAIN / INFERRED (included but flagged — refine at the Phase-2 hook):
//   goku / piccolo / frieza / cell ULTS . classic energy blasts; ult rows
//                                         inferred (audit confirmed their beams).
//   madara Kurama-summon Bijuudama ...... fired on Special while summoned; its
//                                         projectile carries isUltimate → treated
//                                         ULTIMATE via the isUltimate cross-check.
//   onoki Jinton ........................ particle-vaporize (counted ULTIMATE).
// ─────────────────────────────────────────────────────────────────

export default { JUICE_TIER, JUICE_SPECIAL_TIERS, JUICE_ULT_TIERS, JUICE_ANTICIPATES, juiceTierForMove }
