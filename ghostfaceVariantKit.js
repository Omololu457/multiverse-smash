// ─────────────────────────────────────────────────────────────────────────────
// GHOSTFACE VARIANT KIT — shared base-kit TEMPLATE for the 12 "[Killer] Ghostface"
// roster slots (Billy, Stu, Mrs./Nancy, Mickey, Roman, Jill, Charlie, Amber,
// Richie, Ethan, Quinn, Wayne). See the consolidated roster doc.
//
// WHAT THIS IS: a self-contained, FAMILY-KEYED factory + mechanics layer that the
// eventual 12 registrations will consume. Each of the 12 is its OWN standalone
// roster slot (NOT a swap-identity like the original `ghostface`, which is left
// completely untouched). They share ONLY the base kit the doc locks as identical:
//   • knife slash strings (a 3-hit cancel-on-hit rekka + the 5 standing normals)
//   • phone-taunt mixup   (a feint taunt with a cancel-into-attack window)
//   • cloak-dash movement (an evasive i-frame reposition dash)
//   • grab/throw          (the shared generic grab — nothing bespoke)
//
// WHAT THIS IS NOT (deliberately un-built — blocked/undesigned per the doc):
//   • Per-variant SPECIAL   → stored as a NEEDS_DESIGN stub (name + effect only).
//   • Per-variant ULTIMATE  → stored as a NEEDS_DESIGN stub (+ any doc proposal).
//   • Companions            → stored as a BLOCKED stub (open item #3: the
//                             Backstage-Pass companion-selection input scheme is
//                             undefined, which gates ALL 12 companion systems).
//   • Real per-variant art  → NONE exists. Every variant renders on the shared
//                             `ghostface_*_uniform.png` PLACEHOLDER sheets until
//                             real base art lands (project base-sprite health-check
//                             rule → no skin/recolor batches before real art).
//
// WHY FAMILY-KEYED: the original Ghostface's swap engine is hardcoded to
// `rosterKey === "ghostface"` throughout abilities.js. These variants must NOT
// fork that. The mechanics below gate on `isGhostfaceVariant(fighter)` (the 12-key
// family, EXCLUDING "ghostface") so wiring them never disturbs the original.
//
// LIVE WIRING (later, once art/specials/companions unblock): the three mechanics
// functions take an injected `deps` bag matching the real combat.js/abilities.js
// helpers (createAttackFromMove / setAttackState / spendEnergy / shakeCamera), so
// integration is a one-time bind — no logic changes. Kept dependency-injected so
// the template is verifiable in pure Node without the browser/DOM.
// ─────────────────────────────────────────────────────────────────────────────

// ── FAMILY ────────────────────────────────────────────────────────────────────
// The 12 variant rosterKeys. NOTE: "ghostface" (the original swap char) is NOT here.
export const GHOSTFACE_VARIANT_KEYS = [
  "ghostface_billy", "ghostface_stu", "ghostface_mrs", "ghostface_mickey",
  "ghostface_roman", "ghostface_jill", "ghostface_charlie", "ghostface_amber",
  "ghostface_richie", "ghostface_ethan", "ghostface_quinn", "ghostface_wayne",
]
const _VARIANT_SET = new Set(GHOSTFACE_VARIANT_KEYS)
// TRUE only for the 12 template variants — explicitly false for the original "ghostface".
export function isGhostfaceVariant(fighter) {
  const key = (typeof fighter === "string" ? fighter : fighter?.rosterKey || "").toLowerCase()
  return _VARIANT_SET.has(key)
}

// ── SHARED PLACEHOLDER ART ──────────────────────────────────────────────────────
// All 12 render on the original Ghostface's uniform sheets until real base art
// exists. Recolor/skin work is deferred (base-sprite health check). Sheets are
// referenced by relative path exactly as the live `ghostface` char does.
const SHEET = {
  idle:   "./ghostface_idle_uniform.png",
  walk:   "./ghostface_walk_uniform.png",
  jump:   "./ghostface_jump_uniform.png",
  guard:  "./ghostface_guard_uniform.png",
  hit:    "./ghostface_hit_uniform.png",
  crouch: "./ghostface_crouch_uniform.png",
  taunt:  "./ghostface_taunt_uniform.png",
  slash:  "./ghostface_slash_uniform.png",
  charge: "./ghostface_charge_uniform.png",
  up:     "./ghostface_up_uniform.png",
  downair:"./ghostface_downair_uniform.png",
  lowslash:"./ghostface_lowslash_uniform.png",
}

// Shared chassis stats — inherited from the original Ghostface baseline (a masked
// human: fragile-fast rushdown). Tunable per-variant later; identical for now so
// the template stays "the base kit is identical across all 12" per the doc.
export const BASE_STATS = { maxHealth: 1040, maxEnergy: 100, attack: 85, defense: 80, speed: 95, maxJumps: 2, jumpPower: 32, dashSpeed: 20, dashDuration: 9, dashCooldownMax: 30 }

// ── SHARED NORMALS (knife slashes) ──────────────────────────────────────────────
// Mirrors the original Ghostface basic_attacks (data keys → sprite keys:
// upAttack→up, airAttack→air, downAir→down_air). combat.js _getMD reads THIS.
export const BASE_NORMALS = {
  light:    { damage: 34, startup: 3, active: 2, recovery: 8,  hitstun: 12, knockbackX: 2, knockbackY: 0 },
  heavy:    { damage: 66, startup: 7, active: 3, recovery: 17, hitstun: 18, knockbackX: 7, knockbackY: 1, rangeX: 104, rangeY: 48 },
  upAttack: { type: "launcher", damage: 54, startup: 4, active: 3, recovery: 6, hitstun: 20, knockbackX: 2, knockbackY: -9, launch: 12, launchVy: -30, selfVy: -8, airOK: false },
  airAttack:{ damage: 46, startup: 4, active: 2, recovery: 10, hitstun: 12, knockbackX: 3, knockbackY: -2 },
  downAir:  { damage: 58, startup: 6, active: 3, recovery: 12, hitstun: 16, knockbackX: 1, knockbackY: 10 },
}

// ── SHARED KNIFE STRING (cancel-on-hit rekka) ───────────────────────────────────
// Opener = Forward+Heavy from neutral. Each stage cancels into the next ONLY on a
// clean (non-blocked) hit. Stage 3 launches. Move keys drive the stage sprites.
export const BASE_KNIFE_STRING = {
  gfvSlash1: { damage: 22, startup: 4, active: 3, recovery: 11, hitstun: 12, knockbackX: 1, knockbackY: 0,  rangeX: 90, rangeY: 50, rekkaNext: "gfvSlash2" },
  gfvSlash2: { damage: 28, startup: 4, active: 3, recovery: 12, hitstun: 13, knockbackX: 1, knockbackY: 0,  rangeX: 92, rangeY: 52, rekkaNext: "gfvSlash3" },
  gfvSlash3: { damage: 42, startup: 5, active: 3, recovery: 16, hitstun: 17, knockbackX: 8, knockbackY: -3, rangeX: 98, rangeY: 54, launcher: true },
}
const BASE_STEP_IN_VX = 4   // deterministic step-in glide on the opener (matches live COMBO_STEP_IN_VX on wiring)

// ── SHARED CLOAK-DASH (evasive i-frame reposition) ──────────────────────────────
export const CLOAK_DASH = { cost: 15, iframes: 16, backVx: 17, fwdVx: 17, recovery: 18 }

// ── SHARED PHONE-TAUNT MIXUP (feint taunt, cancel-into-attack window) ────────────
// A mocking "phone to ear" taunt whose recovery is cancelable into a normal for a
// frames long window — the base-kit whiff-bait mixup. NO damage from the taunt.
// Decoupled from the (blocked) companion system entirely.
export const PHONE_TAUNT = { total: 34, cancelStart: 10, cancelEnd: 28 }

// ── COMPANION-SELECTION MOTIONS (roster doc open item #3 — RESOLVED) ─────────────
// Four distinct motion inputs, IDENTICAL across all 12 variants (learn once →
// transfers across the whole set). Relative-direction tokens (F/B/U/D) matched with
// a STRICT tail match (endsWithExact), longest-motion-first so a shorter motion can
// never shadow a longer one. Mirrors the original Ghostface's ghostfaceSwapSlotFromMotion
// convention (abilities.js) but is a SEPARATE table on the variant FAMILY — the
// original's D→F / D→B / DBF / DFB swap slots stay untouched.
//   slot 0 · Companion 1 · D,B  + S  (↓←)
//   slot 1 · Companion 2 · D,B,F + S (↓←→)
//   slot 2 · Companion 3 · D    + S  (↓)
//   slot 3 · Companion 4 · D,F  + S  (↓→)  — RESERVED (open item #1: whether a 4th
//            companion exists is unresolved; motion is defined + ready, and simply
//            stays unused if the final answer is 3 — no renumbering needed later).
export const COMPANION_MOTIONS = [
  { slot: 0, companion: 1, motion: ["D", "B"],      label: "↓← + Special" },
  { slot: 1, companion: 2, motion: ["D", "B", "F"], label: "↓←→ + Special" },
  { slot: 2, companion: 3, motion: ["D"],           label: "↓ + Special" },
  { slot: 3, companion: 4, motion: ["D", "F"],      label: "↓→ + Special", reserved: true },
]
// STRICT tail match — the last N tokens must EXACTLY equal pattern (mirrors abilities.js:291,
// re-implemented locally so this module stays dependency-free / pure-Node testable).
function endsWithExact(list, pattern) {
  if (!Array.isArray(list) || !Array.isArray(pattern) || list.length < pattern.length) return false
  const tail = list.slice(-pattern.length)
  return tail.every((t, i) => t === pattern[i])
}
// Resolve a relative-direction buffer → companion slot (0-3), or null. Longest-motion-
// first so DBF (slot 1) isn't shadowed by the 2-token motions, and the bare D (slot 2)
// only lands when nothing longer matches. LIVE WIRING:
//   companionSlotFromMotion(getRelativeDirections(fighter))
// includeReserved:false drops slot 3 (the reserved 4th) if open item #1 lands on "3 companions".
export function companionSlotFromMotion(dirs, { includeReserved = true } = {}) {
  const table = includeReserved ? COMPANION_MOTIONS : COMPANION_MOTIONS.filter(m => !m.reserved)
  const order = table.map((_, i) => i).sort((a, b) => table[b].motion.length - table[a].motion.length)
  for (const i of order) if (endsWithExact(dirs, table[i].motion)) return table[i].slot
  return null
}
// Pair a variant's companion NAME list (index = slot) with the shared motions →
// a ready-to-render binding. list[slot] may be "TBD"/absent (slot 3) until resolved.
export function bindCompanionMotions(companions) {
  const list = (companions && companions.list) || []
  const motions = COMPANION_MOTIONS.map(m => ({
    slot: m.slot, companion: m.companion, name: list[m.slot] ?? null,
    motion: m.motion.slice(), label: m.label, reserved: !!m.reserved,
  }))
  const hasAmbiguous = list.some(e => typeof e === "string" && e.endsWith("?"))   // defensive; no data uses it now (item#2 locked)
  return {
    list: list.slice(),
    motions,
    inputScheme: "resolved",         // open item #3 — this scheme
    triggerTypes: ["reposition_swap", "attack_swap"],   // follow-up RESOLVED: recognition wired to BOTH
    // Owner-locked: item#2 = sukuna (full/original) for Jill/Amber; item#1 = 3 companions FINAL
    // (slot 4 stays reserved BY DESIGN — motion defined, intentionally unused, not a gap).
    slot4Policy: "reserved_3_final",
    status: "COMPANIONS_READY",       // all 3 named slots per variant resolve to built characters
    blockers: hasAmbiguous ? ["item#2 residue (unexpected '?' entry)"] : [],
  }
}

// ── SHARED ANIMATION DATA (placeholder sheets) ──────────────────────────────────
// Deep-cloned per variant by the factory so no two variants alias one object.
function baseAnimationData() {
  return {
    idle:  { frames: 3, width: 75,  height: 116, speed: 8, anchorY: 0, sheet: SHEET.idle },
    walk:  { frames: 4, width: 80,  height: 115, speed: 6, anchorY: 0, sheet: SHEET.walk },
    run:   { frames: 4, width: 80,  height: 115, speed: 4, anchorY: 0, sheet: SHEET.walk },
    dash:  { frames: 4, width: 80,  height: 115, speed: 3, anchorY: 0, loop: false, lockLastFrame: true, sheet: SHEET.walk },
    jump:  { frames: 2, width: 105, height: 118, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: SHEET.jump },
    fall:  { frames: 1, width: 105, height: 118, speed: 6, anchorY: 0, sourceX: 105, loop: false, lockLastFrame: true, sheet: SHEET.jump },
    guard: { frames: 1, width: 82,  height: 108, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: SHEET.guard },
    hurt:  { frames: 1, width: 122, height: 114, speed: 6, anchorY: 0, sourceX: 0,   loop: false, lockLastFrame: true, sheet: SHEET.hit },
    knockdown: { frames: 3, width: 122, height: 114, speed: 6, anchorY: 0, sourceX: 122, loop: false, lockLastFrame: true, sheet: SHEET.hit },
    crouch: { frames: 2, width: 79, height: 102, speed: 8, anchorY: 0, loop: true, sheet: SHEET.crouch },
    charge: { frames: 2, width: 100, height: 114, speed: 6, anchorY: 0, loop: true, sheet: SHEET.taunt },
    taunt:  { frames: 2, width: 100, height: 114, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: SHEET.taunt },
    // NORMALS
    light:    { frames: 3, width: 103, height: 110, speed: 2, anchorY: 0, loop: false, lockLastFrame: true, sheet: SHEET.slash },
    heavy:    { frames: 1, width: 125, height: 115, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: SHEET.charge },
    up:       { frames: 1, width: 97,  height: 124, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: SHEET.up },
    air:      { frames: 1, width: 97,  height: 124, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: SHEET.up },
    down_air: { frames: 3, width: 107, height: 128, speed: 4, anchorY: 0, loop: false, lockLastFrame: true, sheet: SHEET.downair },
    // KNIFE STRING (3 cancelable stages carved from the low-slash sheet)
    gfvSlash1: { frames: 1, width: 97, height: 88, speed: 3, anchorY: 0, sourceX: 0,   loop: false, lockLastFrame: true, sheet: SHEET.lowslash },
    gfvSlash2: { frames: 1, width: 97, height: 88, speed: 3, anchorY: 0, sourceX: 97,  loop: false, lockLastFrame: true, sheet: SHEET.lowslash },
    gfvSlash3: { frames: 1, width: 97, height: 88, speed: 3, anchorY: 0, sourceX: 194, loop: false, lockLastFrame: true, sheet: SHEET.lowslash },
    // PHONE-TAUNT feint pose (reuses taunt) + CLOAK-DASH is FX-only (poof + i-frames, no cast pose)
    gfvPhoneTaunt: { frames: 2, width: 100, height: 114, speed: 6, anchorY: 0, loop: false, lockLastFrame: true, sheet: SHEET.taunt },
  }
}

// ── PER-IDENTITY ART (the original Ghostface's real killer-identity slices) ──────
// The original ships BOTH a neutral base (ghostface_*_uniform.png) AND pre-baked
// killer-identity recolors (ghostface_*_uniform__<slice>.png) for the 5 canon killers.
// Only these 5 have slices; the other 7 variants stay on the neutral base until art exists.
export const IDENTITY_SLICES = { billy: "billy", mrs: "debbie", roman: "roman", jill: "jill", amber: "amber" }

// ── KILLER AFFILIATION TINTS (all 12) — the "paired with [killer]" recolor target ─
// The companion "joined the killer" recolor retints a companion's accent region to
// THIS color (see the crew-recolor tech). The 5 canon killers reuse the original
// Ghostface identity colors EXACTLY (abilities.js GF_IDENTITY_COLOR). The 7 new killers
// get fresh tints (owner-adjustable) chosen to fit each one's read + stay mutually
// distinct from the canon 5 and each other. Keyed by variant rosterKey.
export const KILLER_TINT = {
  ghostface_billy:   "#6E1520",   // canon — Founder's Mask: crimson / blood-red
  ghostface_mrs:     "#3E2A66",   // canon (debbie) — Mother's Grief: indigo-violet
  ghostface_roman:   "#5A4622",   // canon — Director's Cut: bronze / sepia
  ghostface_jill:    "#701E50",   // canon — Spotlight: magenta
  ghostface_amber:   "#1C5A30",   // canon — Parasocial: toxic green
  ghostface_stu:     "#B5561E",   // NEW — burnt-orange: erratic, loud, "kid playing dress-up"
  ghostface_mickey:  "#2A4E6E",   // NEW — steel-blue: collegiate, unbothered, cool
  ghostface_charlie: "#1E5E55",   // NEW — muted teal: timid amateur
  ghostface_richie:  "#4A4E56",   // NEW — gunmetal grey: rehearsed, minimal, precise
  ghostface_ethan:   "#5C5A2E",   // NEW — drab olive/khaki: deliberately ill-fitting
  ghostface_quinn:   "#8A6E1C",   // NEW — champagne gold: glamorous, "designed to be photographed"
  ghostface_wayne:   "#1E2A44",   // NEW — midnight navy: authority in disguise
}
export function killerTint(rosterKey) { return KILLER_TINT[(rosterKey || "").toLowerCase()] || null }
// Rewrite the neutral base sheets → the identity slice (…_uniform.png → …_uniform__<slice>.png).
function identityAnimationData(slice) {
  const ad = baseAnimationData()
  for (const k of Object.keys(ad)) {
    if (ad[k].sheet) ad[k].sheet = ad[k].sheet.replace(/_uniform\.png$/, `_uniform__${slice}.png`)
  }
  return ad
}

// ── ROSTER: the 12 variant configs (verbatim from the consolidated doc) ─────────
// person = the real killer behind the mask; displayName follows the doc's
// "[Killer name] Ghostface" convention. special/ultimate/companions are STUBS.
const ND = "NEEDS_DESIGN"   // ultimate / special not yet designed
export const GHOSTFACE_VARIANT_ROSTER = [
  { rosterKey: "ghostface_billy",   person: "Billy Loomis",   killer: "Billy",
    identitySlice: "billy",   // renders on the REAL Billy-identity art (ghostface_*_uniform__billy.png), not the neutral placeholder
    // WORKED EXAMPLE — implemented below (isBillyGhostface + fire/update fns). Billy = the
    // calculated mastermind: both moves are patient COUNTERS (read-and-punish), true to spec.
    special:   { name: "Delayed Counter-Stab", effect: "composed read-stance → negate a struck read → delayed bleeding riposte", status: "IMPLEMENTED", data: "BILLY_COUNTER", impl: "fireBillyCounter/updateBillyCounter" },
    ultimate:  { name: "The Last Reveal", proposed: "extended counter window opening a full combo route on success", effect: "extended read window → on a read, negate + guaranteed 198-EFF combo route; whiff on no read", status: "IMPLEMENTED", cost: 100, data: "BILLY_ULT", impl: "fireBillyUltimate/updateBillyUltimate" },
    companions:{ list: ["light", "toji", "naoya", "TBD"], status: "BLOCKED" },
    costume: "well-tailored black cloak, letterman-jacket collar underneath, yellowed mask" },
  { rosterKey: "ghostface_stu",     person: "Stu Macher",     killer: "Stu",
    special:   { name: "Erratic Flurry", effect: "erratic multi-hit flurry", status: ND },
    ultimate:  { status: ND },
    companions:{ list: ["hisoka", "zaraki", "rick", "TBD"], status: "BLOCKED" },   // zaraki HELD: monochrome (white haori == white sword, no isolable accent) → no crew art, falls back to normal art on summon (like kiba/hiruzen). Restored to the original psych-matched roster; the nezuko substitution was reverted.
    costume: "looser/baggier cloak, sneakers, uneven mask stitching, cordless phone on belt" },
  { rosterKey: "ghostface_mrs",     person: "Nancy Loomis",   killer: "Mrs.",
    identitySlice: "debbie",   // Mrs./Nancy = the canon "debbie" (Mother's Grief) identity slice
    special:   { name: "Ranged Gun Mixup", effect: "ranged gun mixup / temporary zoner", status: ND },
    ultimate:  { status: ND },
    companions:{ list: ["orochimaru", "mayuri", "isshiki", "TBD"], status: "BLOCKED" },
    costume: "matronly cut, muted blazer, wedding ring on a chain, tapered sleeves" },
  { rosterKey: "ghostface_mickey",  person: "Mickey Altieri", killer: "Mickey",
    special:   { name: "Rules Repeat-Punish", effect: "'rules' repeat-punish tool", status: ND },
    ultimate:  { status: ND },
    companions:{ list: ["deathstroke", "chrollo", "beerus", "TBD"], status: "BLOCKED" },
    costume: "cloak worn open over jeans, horror-movie patches in the lining" },
  { rosterKey: "ghostface_roman",   person: "Roman Bridger",  killer: "Roman",
    identitySlice: "roman",
    special:   { name: "Trap/Stage Special", effect: "trap/stage special", status: ND },
    ultimate:  { status: ND, proposed: "detonate multiple traps at once" },
    companions:{ list: ["obito", "madara", "sasuke", "TBD"], status: "BLOCKED" },
    costume: "filmmaker's tailored coat, camera-strap crossbody, fingerless gloves, cracked mask (identity feature)" },
  { rosterKey: "ghostface_jill",    person: "Jill Roberts",   killer: "Jill",
    identitySlice: "jill",
    special:   { name: "Feint", effect: "fake hit-reaction/knockdown, no real damage taken", status: ND },
    ultimate:  { status: ND },
    companions:{ list: ["goku_black", "sukuna", "six_paths_pain", "TBD"], status: "BLOCKED" },   // item#2 LOCKED: sukuna (full/original)
    costume: "cinched waist, fashion-forward silhouette, polished nails at glove cuffs" },
  { rosterKey: "ghostface_charlie", person: "Charlie Walker", killer: "Charlie",
    special:   { name: "Fumbling Grab", effect: "fumbling grab w/ delayed second hit", status: ND },
    ultimate:  { status: ND },
    companions:{ list: ["yuta", "miwa", "kurapika", "TBD"], status: "BLOCKED" },   // yuta HELD: monochrome (dark uniform + shared white across collar/Rika/katana, no isolable accent) → no crew art, falls back to normal art on summon (like kiba/hiruzen). Restored to the original psych-matched roster; the zenitsu substitution was reverted.
    costume: "hoodie underneath, backpack straps, crooked mask (keep across variants)" },
  { rosterKey: "ghostface_amber",   person: "Amber Freeman",  killer: "Amber",
    identitySlice: "amber",
    special:   { name: "Stacking Commitment Buff", effect: "stacking commitment buff", status: ND },
    ultimate:  { status: ND, proposed: "consume full stack for one maximized hit" },
    companions:{ list: ["maki", "inosuke", "sukuna", "TBD"], status: "BLOCKED" },   // item#2 LOCKED: sukuna (full/original)
    costume: "cloak w/ stitched-in memorabilia (ticket stub, VHS charm), combat boots, tactical gloves" },
  { rosterKey: "ghostface_richie",  person: "Richie Kirsch",  killer: "Richie",
    special:   { name: "Disguise Feint", effect: "harmless-idle-to-attack toggle", status: ND },
    ultimate:  { status: ND },
    companions:{ list: ["byakuya", "itachi", "tobirama", "TBD"], status: "BLOCKED" },
    costume: "same silhouette as Amber's, but pressed and precise (rehearsed read)" },
  { rosterKey: "ghostface_ethan",   person: "Ethan Landry",   killer: "Ethan",
    special:   { name: "Blend-Into-Background Ambush", effect: "blend-into-background ambush", status: ND },
    ultimate:  { status: ND },
    companions:{ list: ["killua", "kiba", "boruto", "TBD"], status: "BLOCKED" },
    costume: "deliberately most ill-fitting: oversized cloak, untied sneakers, store creases (keep 'wrong size')" },
  { rosterKey: "ghostface_quinn",   person: "Quinn Bailey",   killer: "Quinn",
    special:   { name: "Charm/Distraction Debuff", effect: "charm/distraction debuff", status: ND },
    ultimate:  { status: ND },
    companions:{ list: ["shinobu", "aoi_todo", "gojo", "TBD"], status: "BLOCKED" },   // frieza→gojo: frieza has NO sprites (would render as a box); gojo = sprite-complete + fits Quinn's charm/showman read
    costume: "fashion-forward tailoring, stylish clothing showing underneath, hint of jewelry" },
  { rosterKey: "ghostface_wayne",   person: "Wayne Bailey",   killer: "Wayne",
    special:   { name: "Investigative Reveal", effect: "investigative reveal tool", status: ND },
    ultimate:  { status: ND },
    companions:{ list: ["pain", "onoki", "hiruzen", "TBD"], status: "BLOCKED" },
    costume: "cloak over a detective's coat, badge chain at collar, polished boots, leather gloves (authority read)" },
]

// ── FACTORY ─────────────────────────────────────────────────────────────────────
function clone(o) { return JSON.parse(JSON.stringify(o)) }
// Build ONE variant's full character-definition object from a roster config.
// The base kit (stats/normals/animationData/knife-string) is identical across all
// 12; only identity metadata + the NEEDS_DESIGN special/ultimate/companion stubs differ.
export function makeGhostfaceVariantCharacter(cfg) {
  if (!cfg || !cfg.rosterKey) throw new Error("makeGhostfaceVariantCharacter: cfg.rosterKey required")
  // If this killer has a real identity slice (5 of 12), render on it — else the neutral base.
  const slice = cfg.identitySlice || null
  return {
    rosterKey: cfg.rosterKey,
    name: `${cfg.killer} Ghostface`,
    person: cfg.person,
    universe: "horror",
    color: "#1c2030",
    family: "ghostface_variant",   // shared family tag — NOT the original "ghostface"
    portrait: slice ? `./ghostface_portrait__${slice}.png` : SHEET.idle,   // real identity bust where it exists
    archetypes: ["rushdown", "technical"],
    primary: "rushdown", secondary: ["technical"],
    traits: { hasEnergy: true, energyType: "dread", mobility: "high", scaling: "combo", animeMovement: false },
    stats: clone(BASE_STATS),
    basic_attacks: clone(BASE_NORMALS),
    // Base-kit systems the variant shares (data only; logic lives in the mechanics fns below).
    baseKit: { knifeString: clone(BASE_KNIFE_STRING), cloakDash: clone(CLOAK_DASH), phoneTaunt: clone(PHONE_TAUNT) },
    // UNIQUE per-variant content — explicit stubs, NOT implemented (blocked/undesigned).
    special: clone(cfg.special),
    ultimate: clone(cfg.ultimate),
    companions: bindCompanionMotions(cfg.companions),   // input scheme resolved (item #3); summon/swap still un-wired
    costumeNote: cfg.costume,
    hasSprites: true,
    spriteScale: 0.982,
    identitySlice: slice,          // which killer-identity art this renders on (null = 7 slice-less variants)
    identityTint: killerTint(cfg.rosterKey),   // affiliation recolor target for this killer's companions
    placeholderArt: !slice,        // TRUE only for variants still on the neutral base (no identity slice yet)
    animationData: slice ? identityAnimationData(slice) : baseAnimationData(),
    introPool: ["idle"],
  }
}
// All 12, built.
export function buildAllGhostfaceVariants() {
  const out = {}
  for (const cfg of GHOSTFACE_VARIANT_ROSTER) out[cfg.rosterKey] = makeGhostfaceVariantCharacter(cfg)
  return out
}

// ═════════════════════════════════════════════════════════════════════════════
// SHARED BASE-KIT MECHANICS — family-keyed (isGhostfaceVariant), dependency-injected.
// `deps` bag (bound to the real combat.js/abilities.js helpers on live wiring):
//   deps.createAttack(fighter, moveKey, md, opts) → attack object
//   deps.setAttackState(fighter, attack, totalFrames)   // sets attacking/currentMove/timers
//   deps.spendEnergy(fighter, amount) → bool            // false if insufficient
//   deps.shakeCamera(context, mag, dur)  (optional)
//   deps.getPhase(fighter) → "startup" | "active" | "recovery" | null
// ═════════════════════════════════════════════════════════════════════════════

// ── A) KNIFE STRING ─────────────────────────────────────────────────────────────
// Fire one stage. Mirrors fireGhostfaceCommand: guards, creates the attack, sets the
// step-in glide, arms the rekka pointer, resets the clean-hit latch.
export function fireVariantKnifeStage(fighter, key, context, deps) {
  const md = BASE_KNIFE_STRING[key]
  if (!md || (fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  const attack = deps.createAttack(fighter, key, md, { minActiveStart: md.startup, minActiveEnd: md.startup + md.active })
  deps.setAttackState(fighter, attack, md.startup + md.active + md.recovery)
  fighter.vx = (fighter.facing || 1) * BASE_STEP_IN_VX
  fighter._rekkaNext = md.rekkaNext || null
  fighter._cmdHitLanded = false   // latched true only on a real (non-blocked) hit → gates the continue
  return true
}
// Per-frame driver. Opener = Forward+Heavy from neutral (grounded). Continue = fresh
// Heavy during recovery on a clean hit → rekkaNext. Gated to the variant FAMILY so it
// never touches the original "ghostface" (or any other char).
export function updateVariantKnifeString(fighter, inputState, context, deps) {
  if (!fighter || !isGhostfaceVariant(fighter) || !inputState) return false
  const grounded  = fighter.onGround ?? fighter.grounded ?? false
  const phase     = deps.getPhase?.(fighter)
  const heavyEdge = !!inputState.heavy && !fighter._cmdPrevHeavy   // fresh tap, not held
  fighter._cmdPrevHeavy = !!inputState.heavy
  // CONTINUE — fresh Heavy, in recovery, on a clean hit, with a rekkaNext armed.
  // The continue is a CANCEL: clear the current stage's recovery so the next stage
  // can fire (mirrors the live rekkaContinue, which cancels before re-firing).
  if (heavyEdge && fighter.attacking && phase === "recovery" && fighter._rekkaNext && fighter._cmdHitLanded) {
    const next = fighter._rekkaNext
    fighter.attacking = false; fighter.currentMove = null; fighter.attackCooldown = 0
    return fireVariantKnifeStage(fighter, next, context, deps)
  }
  // OPENER — Forward+Heavy from neutral (grounded, idle).
  const canStart = !fighter.attacking && !fighter.currentMove && (fighter.attackCooldown || 0) <= 0
  const forward  = fighter.facing === 1 ? !!inputState.right : !!inputState.left
  if (canStart && grounded && forward && heavyEdge) return fireVariantKnifeStage(fighter, "gfvSlash1", context, deps)
  return false
}

// ── B) PHONE-TAUNT MIXUP ────────────────────────────────────────────────────────
// Start the feint taunt (no damage). Sets a cancel-window state the driver reads.
export function fireVariantPhoneTaunt(fighter, context, deps) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  fighter._phoneTaunt = { t: 0, canceled: false }
  fighter.currentMove = "gfvPhoneTaunt"
  fighter.attacking = false   // taunt itself is not an attack
  try { deps.shakeCamera?.(context, 1, 3) } catch (_) {}
  return true
}
// Per-frame driver. Advances the taunt; inside [cancelStart, cancelEnd] a fresh
// attack press CANCELS into a normal (returns { cancel:true }) — the whiff-bait mixup.
// Returns { active, cancelable, cancel } or null when idle.
export function updateVariantPhoneTaunt(fighter, inputState, context, deps) {
  const st = fighter._phoneTaunt
  if (!st) return null
  const cancelable = st.t >= PHONE_TAUNT.cancelStart && st.t <= PHONE_TAUNT.cancelEnd
  const attackEdge = (!!inputState?.light && !fighter._ptPrevLight) || (!!inputState?.heavy && !fighter._ptPrevHeavy)
  fighter._ptPrevLight = !!inputState?.light
  fighter._ptPrevHeavy = !!inputState?.heavy
  if (cancelable && attackEdge && !st.canceled) {
    st.canceled = true
    fighter._phoneTaunt = null
    fighter.currentMove = null   // freed to act → the pressed normal comes out next
    return { active: false, cancelable: true, cancel: true }
  }
  st.t++
  if (st.t >= PHONE_TAUNT.total) { fighter._phoneTaunt = null; fighter.currentMove = null; return { active: false, cancelable: false, cancel: false } }
  return { active: true, cancelable, cancel: false }
}

// ── C) CLOAK-DASH (evasive i-frame reposition) ──────────────────────────────────
// dir: "back" (retreat, default), "forward" (advance). Grants brief i-frames, spends
// energy, sets the reposition velocity. No damage (base kit — the original's phantom
// hit was a swap-only feature, deliberately NOT inherited).
export function fireVariantCloakDash(fighter, dir, context, deps) {
  if ((fighter.attackCooldown || 0) > 0 || fighter.attacking) return false
  if (!deps.spendEnergy(fighter, CLOAK_DASH.cost)) return false
  const face = fighter.facing || 1
  const forward = dir === "forward"
  fighter.invulnTimer = Math.max(fighter.invulnTimer || 0, CLOAK_DASH.iframes)
  fighter.vx = forward ? (face * CLOAK_DASH.fwdVx) : (-face * CLOAK_DASH.backVx)
  fighter.attackCooldown = CLOAK_DASH.recovery
  fighter._cloakDash = { dir: forward ? "forward" : "back", t: 0 }
  try { deps.shakeCamera?.(context, 2, 4) } catch (_) {}
  return true
}

// ── D) GRAB/THROW ───────────────────────────────────────────────────────────────
// No bespoke logic — the 12 variants use the shared GENERIC grab (combat.js
// resolveGrab), same as the original Ghostface. Exposed here only as an explicit
// contract marker so the wiring checklist stays complete.
export const GRAB_CONTRACT = { shared: true, resolver: "resolveGrab", grabPoseReuses: "taunt" }

// ═════════════════════════════════════════════════════════════════════════════
// COMPANION INVOCATION — wires the recognition layer (companionSlotFromMotion) to
// BOTH trigger types (owner resolution: "wire to both"). The two types mirror the
// original Ghostface's two companion-entry mechanisms, generalized onto the variant
// family and BOTH driven by the SAME motion→slot recognition:
//   • reposition_swap  — the PLAIN swap: clean in-place companion entrance, no
//                        offense (mirrors triggerGhostfaceSwap).
//   • attack_swap      — the flashy BACKSTAGE-PASS entrance: dash "off-screen" +
//                        a trailing PHANTOM strike ("hit you on the way out"),
//                        companion emerges after (mirrors triggerGhostfaceBackstagePass
//                        swap branch). Deliberately NO i-frames — preserves the
//                        original's "no free swap-in" balance (a clean hit cancels it).
//
// VARIANT INPUT CONVENTION (documented, owner-adjustable — the doc left trigger-type
// access open; this is the chosen mapping): the motion picks the COMPANION for both;
// a held modifier picks the TYPE:
//   motion + Special             → attack_swap    (default, signature flashy entrance)
//   motion + Special + hold Grab → reposition_swap (the quiet/plain entrance)
//
// The actual companion kit-swap is an INJECTED HOOK (deps.summonCompanion) — currently
// un-built (companion chars missing, item #5). The trigger machinery + phantom strike +
// reposition are REAL and tested; a missing companion cleanly flags _gfvPendingCompanion
// instead of swapping, so nothing fabricates unbuilt content.
// ═════════════════════════════════════════════════════════════════════════════
export const COMPANION_TRIGGER = {
  reposition_swap: { key: "reposition_swap", label: "plain repositioning swap",     cost: 20, dashFrames: 6,  phantom: false },
  attack_swap:     { key: "attack_swap",     label: "Backstage-Pass attack-swap",   cost: 20, dashFrames: 16, phantom: true  },
}
export const COMPANION_PHANTOM = { dmg: 40, hitstun: 20, knockbackX: 7, knockbackY: -4, rangeX: 150, rangeY: 130, delay: 8 }

// Resolve a companion invocation from a relative-direction buffer + held modifiers.
// slot ← companionSlotFromMotion (SHARED recognition, both types); type ← modifier.
// Returns { slot, triggerType, motion, label, trigger } or null (no motion matched).
export function resolveCompanionInvocation(dirs, mods = {}, opts = {}) {
  const slot = companionSlotFromMotion(dirs, opts)
  if (slot == null) return null
  const triggerType = mods.grab ? "reposition_swap" : "attack_swap"
  const m = COMPANION_MOTIONS.find(x => x.slot === slot)
  return { slot, triggerType, motion: m.motion.slice(), label: m.label, trigger: COMPANION_TRIGGER[triggerType].label }
}

// Arm an invocation. Family-keyed. Both types spend `cost` and set the dash; only
// attack_swap arms the phantom. deps.spendEnergy(fighter, n)→bool required.
export function fireCompanionInvocation(fighter, invocation, context, deps) {
  if (!fighter || !isGhostfaceVariant(fighter) || !invocation) return false
  if (fighter._gfvInvoke || fighter.attacking || fighter.currentMove || (fighter.attackCooldown || 0) > 0) return false
  const spec = COMPANION_TRIGGER[invocation.triggerType]
  if (!spec) return false
  if (!deps.spendEnergy(fighter, spec.cost)) return false
  const cx = (fighter.x || 0) + (fighter.w || 60) / 2
  const cy = (fighter.y || 0) + (fighter.h || 100) / 2
  fighter._gfvInvoke = {
    type: spec.key, slot: invocation.slot, timer: spec.dashFrames, emerged: false,
    phantom: spec.phantom ? { x: cx, y: cy, done: false, ...COMPANION_PHANTOM } : null,
    phantomLanded: false, pendingCompanion: false,
  }
  fighter.vx = (fighter.facing || 1) * (spec.phantom ? 17 : 8)   // attack_swap surges further ("off-screen")
  fighter.vy = 0
  // NO i-frames on either type — swap entry stays hittable (original's no-free-swap balance).
  try { deps.shakeCamera?.(context, spec.phantom ? 4 : 3, spec.phantom ? 8 : 5) } catch (_) {}
  return true
}

// Per-frame driver. Resolves the phantom strike (attack_swap) on its delay, then at
// emerge calls deps.summonCompanion(fighter, slot, context)→bool. A missing companion
// (hook returns falsy — item #5) flags _gfvPendingCompanion rather than fabricating a swap.
// Returns the invoke state (with .done true) on the emerge frame, else null.
export function updateCompanionInvocation(fighter, context, deps) {
  const st = fighter?._gfvInvoke
  if (!st) return null
  // PHANTOM (attack_swap only) — one delayed strike at the vacated spot.
  if (st.phantom && !st.phantom.done) {
    if (st.phantom.delay > 0) { st.phantom.delay-- }
    else {
      st.phantom.done = true
      const opp = deps.getOpponent?.(fighter, context)
      if (opp && !opp.eliminated) {
        const ocx = (opp.x || 0) + (opp.w || 60) / 2
        const ocy = (opp.y || 0) + (opp.h || 100) / 2
        const inRange = Math.abs(ocx - st.phantom.x) <= st.phantom.rangeX / 2 && Math.abs(ocy - st.phantom.y) <= st.phantom.rangeY / 2
        if (inRange) {
          const blocked = !!opp.isBlocking
          deps.applyDamage?.(opp, blocked ? Math.round(st.phantom.dmg * 0.25) : st.phantom.dmg, { source: "ability", blocked })
          if (!blocked) { opp.hitstun = Math.max(opp.hitstun || 0, st.phantom.hitstun); st.phantomLanded = true }
        }
      }
    }
  }
  if (st.timer > 0) { st.timer--; return null }
  // EMERGE — hand off to the companion-summon hook (blocked/unbuilt → pending flag).
  st.emerged = true
  const summoned = !!deps.summonCompanion?.(fighter, st.slot, context)
  if (!summoned) { fighter._gfvPendingCompanion = { slot: st.slot, type: st.type }; st.pendingCompanion = true }
  fighter.vx = 0
  fighter._gfvInvoke = null
  return { ...st, done: true, summoned }
}

// ═════════════════════════════════════════════════════════════════════════════
// SUMMON HOOK — resolves (variant, slot) → a REAL companion rosterKey and performs
// the kit swap. Wired against the actual roster: all 12 variants' named companions
// (slots 0-2) exist today (34/36 live); the two exceptions are the item#2 Sukuna
// disambiguation (Jill/Amber), which DEFER (flagged) instead of guessing.
// ═════════════════════════════════════════════════════════════════════════════
const _ROSTER_BY_KEY = Object.fromEntries(GHOSTFACE_VARIANT_ROSTER.map(c => [c.rosterKey, c]))
// The companion NAME list (index = slot) for a variant rosterKey.
export function companionListFor(rosterKey) {
  return _ROSTER_BY_KEY[(rosterKey || "").toLowerCase()]?.companions?.list || []
}
// Resolve what a (variant, slot) summon SHOULD do against a real `characters` map,
// WITHOUT performing it. Pure + testable. reason ∈
//   ok            → key is a built character, ready to swap
//   reserved_slot → slot 3 / "TBD" (item#1 — no 4th companion decided)
//   ambiguous     → "sukuna?" (item#2 — candidates listed, owner must pick)
//   not_built     → a named companion that isn't registered (none today; safety net)
export function resolveCompanionSummon(rosterKey, slot, characters) {
  const entry = companionListFor(rosterKey)[slot]
  if (entry == null || entry === "TBD") return { ok: false, reason: "reserved_slot", slot }
  if (typeof entry === "string" && entry.endsWith("?")) {
    const base = entry.slice(0, -1)
    const candidates = [base, "alt_" + base].filter(k => characters && characters[k])
    return { ok: false, reason: "ambiguous", slot, candidates }
  }
  if (!characters || !characters[entry]) return { ok: false, reason: "not_built", slot, key: entry }
  return { ok: true, slot, key: entry }
}
// Build the summonCompanion HOOK for updateCompanionInvocation's deps, bound to a real
// `characters` map + a swap applier. applySwap(fighter, companionKey, context) performs
// the actual kit swap (LIVE WIRING passes applyGhostfaceSwap, or a family-aware variant
// of it). Returns TRUE only when a real companion resolved AND swapped; otherwise stamps
// fighter._gfvCompanionResult (with the reason) and returns false, so the caller flags
// _gfvPendingCompanion. With no applySwap it runs in RESOLUTION-ONLY mode (returns true on
// a resolved key without swapping) — useful for verifying coverage before the swap is bound.
export function makeSummonCompanion(characters, applySwap = null) {
  return function summonCompanion(fighter, slot, context) {
    const r = resolveCompanionSummon(fighter?.rosterKey, slot, characters)
    fighter._gfvCompanionResult = r
    if (!r.ok) return false
    return applySwap ? !!applySwap(fighter, r.key, context) : true
  }
}
// Owner-facing coverage snapshot: which of each variant's slots 0-2 are live now.
export function companionCoverageReport(characters) {
  return GHOSTFACE_VARIANT_ROSTER.map(cfg => {
    const slots = [0, 1, 2].map(s => resolveCompanionSummon(cfg.rosterKey, s, characters))
    return {
      rosterKey: cfg.rosterKey, name: `${cfg.killer} Ghostface`,
      live: slots.filter(r => r.ok).map(r => r.key),
      ambiguous: slots.filter(r => r.reason === "ambiguous").length,
      notBuilt: slots.filter(r => r.reason === "not_built").map(r => r.key),
      slot4Reserved: true,
    }
  })
}

// ═════════════════════════════════════════════════════════════════════════════
// WORKED EXAMPLE — BILLY GHOSTFACE (a real Special + Ultimate on the template).
// Proves the template holds up when a UNIQUE per-variant kit is layered on the shared
// base. Billy is the calculated mastermind — he doesn't rush; he READS you and punishes
// commitment. Both moves are patient COUNTERS (high-execution, low-startup-reward), true
// to his psychology AND the doc spec (Special = delayed counter-stab; Ultimate = extended
// counter window → full combo route on success). Gated to rosterKey "ghostface_billy" so
// the other 11 variants (and the original ghostface) are untouched. Poses reuse existing
// base anim keys (charge/heavy/light) — no new art, reinforcing the placeholder contract.
// ═════════════════════════════════════════════════════════════════════════════
export function isBillyGhostface(fighter) {
  return (typeof fighter === "string" ? fighter : fighter?.rosterKey || "").toLowerCase() === "ghostface_billy"
}
const BILLY_BLEED = { ticks: 6, interval: 20, dmg: 6 }   // the knife's attrition (mirrors GHOSTFACE_BLEED)

// SPECIAL — "Delayed Counter-Stab": composed read-stance → active read window → on a struck
// read, NEGATE the incoming hit and riposte a beat later with a bleeding stab. Whiff if the
// read never comes (recovery, no damage). deps: spendEnergy / applyDamage / getOpponent / shakeCamera.
export const BILLY_COUNTER = {
  cost: 20, startup: 5, window: 18, recovery: 16, riposteDelay: 4,
  riposte: { damage: 62, hitstun: 24, knockbackX: 6, knockbackY: -6, rangeX: 96, rangeY: 54 },
}
export function fireBillyCounter(fighter, context, deps) {
  if (!isBillyGhostface(fighter) || fighter.attacking || fighter._billyCounter || (fighter.attackCooldown || 0) > 0) return false
  if (!deps.spendEnergy(fighter, BILLY_COUNTER.cost)) return false
  fighter._billyCounter = { t: 0, consumed: false, done: false }
  fighter.currentMove = "charge"   // composed knife-beckon read stance (placeholder pose)
  fighter.vx = 0
  try { deps.shakeCamera?.(context, 1, 3) } catch (_) {}
  return true
}
// Per-frame. context.incoming = { willHit:bool } signals an opponent strike THIS frame.
// Returns { phase, countered, riposted, done } or null when idle. On a read it sets
// fighter._counterNegate (the caller nullifies the incoming hit) + brief i-frames through the riposte.
export function updateBillyCounter(fighter, context, deps) {
  const st = fighter._billyCounter
  if (!st) return null
  const C = BILLY_COUNTER
  const opp = deps.getOpponent?.(fighter, context)
  // RIPOSTE — resolves a beat after a successful read ("delayed").
  if (st.consumed) {
    if (fighter._billyRiposteDelay > 0) { fighter._billyRiposteDelay--; return { phase: "riposte", countered: true, riposted: false } }
    st.done = true
    fighter.currentMove = "heavy"   // committed power-stab
    if (opp && !opp.eliminated) {
      const blocked = !!opp.isBlocking
      deps.applyDamage?.(opp, blocked ? Math.round(C.riposte.damage * 0.25) : C.riposte.damage, { source: "ability", blocked })
      if (!blocked) { opp.hitstun = Math.max(opp.hitstun || 0, C.riposte.hitstun); opp._dot = { ticks: BILLY_BLEED.ticks, interval: BILLY_BLEED.interval, dmg: BILLY_BLEED.dmg, delay: BILLY_BLEED.interval } }
    }
    fighter.attackCooldown = C.recovery
    fighter._billyCounter = null
    return { phase: "riposte", countered: true, riposted: true, done: true }
  }
  st.t++
  const active = st.t > C.startup && st.t <= C.startup + C.window
  if (active && context?.incoming?.willHit) {
    st.consumed = true
    fighter._billyRiposteDelay = C.riposteDelay
    fighter._counterNegate = true                                   // caller nullifies the incoming hit
    fighter.invulnTimer = Math.max(fighter.invulnTimer || 0, C.riposteDelay + 2)
    return { phase: "active", countered: true, riposted: false }
  }
  if (st.t > C.startup + C.window) {                                // whiffed the read
    fighter.attackCooldown = C.recovery
    fighter.currentMove = null
    fighter._billyCounter = null
    return { phase: "recovery", countered: false, riposted: false, done: true }
  }
  return { phase: active ? "active" : "startup", countered: false, riposted: false }
}

// ULTIMATE — "The Last Reveal": an EXTENDED read window; a successful read negates the hit
// and opens a GUARANTEED full combo route (330 raw → 198 EFF at ×0.60). Whiff on no read
// (spent, nothing) — all-or-nothing, true to Billy's final-act reveal.
export const BILLY_ULT = {
  cost: 100, startup: 6, window: 40, recovery: 22, freeze: 90,
  combo: [40, 40, 50, 60, 60, 80],   // raw per-hit; ×0.60 → 24+24+30+36+36+48 = 198 EFF
}
export function billyUltEff() { return BILLY_ULT.combo.reduce((s, r) => s + Math.round(r * 0.60), 0) }
export function fireBillyUltimate(fighter, context, deps) {
  if (!isBillyGhostface(fighter) || fighter.attacking || fighter._billyUlt) return false
  if (!deps.spendEnergy(fighter, BILLY_ULT.cost)) return false
  fighter._billyUlt = { t: 0, consumed: false, done: false }
  fighter.currentMove = "charge"
  fighter.vx = 0
  try { deps.shakeCamera?.(context, 3, 8) } catch (_) {}
  return true
}
export function updateBillyUltimate(fighter, context, deps) {
  const st = fighter._billyUlt
  if (!st) return null
  const U = BILLY_ULT
  const opp = deps.getOpponent?.(fighter, context)
  st.t++
  const active = st.t > U.startup && st.t <= U.startup + U.window
  if (active && context?.incoming?.willHit) {                       // the read lands → guaranteed route
    st.consumed = true; st.done = true
    fighter._counterNegate = true
    let eff = 0
    if (opp && !opp.eliminated) {
      opp.frozen = true; opp.freezeTimer = Math.max(opp.freezeTimer || 0, U.freeze)
      for (const raw of U.combo) { const e = Math.round(raw * 0.60); eff += e; deps.applyDamage?.(opp, e, { source: "ultimate" }) }
      opp.hitstun = Math.max(opp.hitstun || 0, 30)
    }
    fighter.currentMove = "light"
    fighter.attackCooldown = U.recovery
    fighter._billyUlt = null
    return { landed: true, eff, done: true }
  }
  if (st.t > U.startup + U.window) {                               // no read → whiff (ult consumed)
    fighter.attackCooldown = U.recovery
    fighter.currentMove = null
    fighter._billyUlt = null
    return { landed: false, whiffed: true, done: true }
  }
  return { phase: active ? "active" : "startup", landed: false }
}
