// comboStandard.js
// ─────────────────────────────────────────────────────────────────────────────
// CODIFIED normal-attack COMBO-STRING STANDARD (combo-string standardization — Stage A).
//
// This is the SINGLE, inspectable source of truth for:
//   1. COMBO_STANDARD — the canonical combo grammar the roster is measured against.
//   2. REKKA         — the per-character classification of every command-normal chain
//                      as it exists RIGHT NOW (conforms / deviates / exception).
//   3. NO_REKKA      — the ~19 characters with no chain, split by the locked decision
//                      (blessed zoners / un-built melee to build / review-in-stage).
//
// It CHANGES NO INPUT MAPPING. It only names, in data, what the audit found and what the
// locked plan targets, so `harness/combo_standard_audit.mjs` can (a) hold a green/red
// conformance baseline, (b) cross-check the claims against abilities.js source, and
// (c) print the Stage B/C/D worklist. As each stage lands, update the entry's `status`
// (and the harness's expected counts) — the test then tracks progress automatically.
//
// Full audit + the locked decisions this encodes: COMBO_STANDARDIZATION_AUDIT.md.
//
// ARCHITECTURE REMINDER (why "combo strings" live here and not in characters.js):
//   combat.js updateCombat fires ONE move per press — there is NO native Light→Light /
//   Light→Heavy chaining. The ONLY universal cancel route is the Up-Attack launcher →
//   jump-cancel → air normal → down_air spike (roster-wide, unchanged). Every LINKED
//   ground string comes from a per-character updateXCommandCombat driver in abilities.js
//   that queues `_rekkaNext` and advances it through the shared combat.js `rekkaContinue`
//   / `cancelWindowOpen` gate. This registry classifies those drivers.
// ─────────────────────────────────────────────────────────────────────────────

// The canonical grammar. Every NON-EXCEPTION character should read as this shape.
export const COMBO_STANDARD = {
  opener:     "fwd+heavy",   // Forward + Heavy from neutral, grounded — opens the ground chain
  retap:      "heavy",       // a FRESH Heavy edge during recovery advances the chain (cancel-on-hit)
  stages:     3,             // opener → mid → finisher (2–4 tolerated; 3 is the target shape)
  finisher:   "launcher",    // the finisher LAUNCHES → jump-cancel into the universal air combo
  requireHit: true,          // whiff/block ENDS the string (no timing-only links by default)
  airRoute:   "upAttack → jump-cancel → air → down_air",   // the roster-wide air-combo route (universal)
  inputBufferFrames: 7,      // input.js INPUT_BUFFER_FRAMES — shared, global (~117ms @60fps)
}

// Status vocabulary:
//   "conforms"          — matches COMBO_STANDARD on the core axes (opener/retap/finisher/requireHit)
//   "deviates-opener"   — Stage B target: chain opens on Down+Heavy, convert to Forward+Heavy
//   "deviates-finisher" — Stage C target: Fwd+Heavy chain but finisher does NOT launch (heavy ender)
//   "exception"         — deliberately preserved; NEVER remapped (see `note`)
//
// `srcRequireHit: true` marks entries whose driver has a single, unambiguous
// `rekkaContinue({ ..., requireHit: X })` the harness can cross-check against `requireHit` below.
// Drivers with 0 or multiple rekkaContinue calls (single-move / grab / dual-string / super-branch)
// set it false — the harness skips the source check for them.
export const REKKA = [
  // ── CONFORMS — Forward+Heavy · Heavy re-tap · launcher finisher · requireHit:true ──────────────
  { key: "vegeta",              driver: "updateVegetaCommandCombat",       opener: "fwd+heavy", retap: "heavy", stages: 4, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",   note: "4-stage vgFkick1→…→vgUpFinish" },
  { key: "ben10",               driver: "updateBen10CommandCombat",        opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",   note: "form-gated opener (benJab/xlCombo/dhSwing)" },
  { key: "omniman",             driver: "updateOmniManCommandCombat",      opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",   note: "+ free Fwd+Light poke" },
  { key: "chrollo",             driver: "updateChrolloCommandCombat",      opener: "fwd+heavy", retap: "heavy", stages: 2, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",   note: "deliberately short 2-stage" },
  { key: "batman",              driver: "updateBatmanCommandCombat",       opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",   note: "Stage B: converted Down+Heavy → Fwd+Heavy (audit had mislabeled as Fwd)" },
  { key: "superman",            driver: "updateSupermanCommandCombat",     opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",   note: "" },
  { key: "zenitsu",             driver: "updateZenitsuCommandCombat",      opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",   note: "Stage B: converted Down+Heavy → Fwd+Heavy (audit had mislabeled as Fwd)" },
  { key: "miwa",                driver: "updateMiwaCommandCombat",         opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",   note: "katana battojutsu string" },
  { key: "ichigo",              driver: "updateIchigoCommandCombat",       opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",   note: "multiple grounded entries (dash/back/down/fwd)" },
  { key: "pain",                driver: "updatePainCommandCombat",         opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",   note: "+ Fwd+Light jab; forward-locked" },
  { key: "minato",              driver: "updateMinatoCommandCombat",       opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",   note: "" },
  { key: "obito",               driver: "updateObitoCommandCombat",        opener: "fwd+heavy", retap: "heavy", stages: 2, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",   note: "staff 2-stage; Grab = Kamui" },
  { key: "saiki",               driver: "updateSaikiCommandCombat",        opener: "fwd+heavy", retap: "heavy", stages: 4, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",   note: "projectile-gated hit (bolt must land)" },
  { key: "samurai_red_ranger",  driver: "updateSamuraiRangerCommandCombat", opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true, status: "conforms",   note: "shared samurai driver (red/gold/green)" },
  { key: "gold_samurai_ranger", driver: "updateSamuraiRangerCommandCombat", opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true, status: "conforms",   note: "shared samurai driver" },
  { key: "green_samurai_ranger", driver: "updateSamuraiRangerCommandCombat", opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true, status: "conforms",  note: "shared samurai driver" },

  // ── STAGE B CONVERTED — Down+Heavy → Forward+Heavy openers (now conform on opener) ─────────────
  { key: "killua",   driver: "updateKilluaCommandCombat",   opener: "fwd+heavy", retap: "heavy", stages: 4, finisher: "launcher", requireHit: true, srcRequireHit: true, status: "conforms", note: "Stage B: Down+Heavy → Fwd+Heavy; 4-stage barrage" },
  { key: "hisoka",   driver: "updateHisokaCommandCombat",   opener: "fwd+heavy", retap: "heavy", stages: 2, finisher: "launcher", requireHit: true, srcRequireHit: true, status: "conforms", note: "Stage B: Down+Heavy → Fwd+Heavy" },
  { key: "flash",    driver: "updateFlashCommandCombat",    opener: "fwd+heavy", retap: "heavy", stages: 2, finisher: "launcher", requireHit: true, srcRequireHit: true, status: "conforms", note: "Stage B: Down+Heavy → Fwd+Heavy" },
  { key: "gon",      driver: "updateGonCommandCombat",      opener: "fwd+heavy", retap: "heavy", stages: 2, finisher: "launcher", requireHit: true, srcRequireHit: true, status: "conforms", note: "Stage B: Down+Heavy → Fwd+Heavy" },

  // ── STAGE C CONVERTED — heavy ender → launcher finisher (now conform) ──────────────────────────
  { key: "netero",   driver: "updateNeteroCommandCombat",   opener: "fwd+heavy", retap: "heavy", stages: 2, finisher: "launcher", requireHit: true, srcRequireHit: true, status: "conforms", note: "Stage B opener + Stage C finisher (down_attck_2 now launches)" },
  { key: "ghostface", driver: "updateGhostfaceCommandCombat", opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true, status: "conforms", note: "Stage B opener + Stage C finisher (ghostfaceCombo3 now launches); bleed DoT special" },
  { key: "shinobu",  driver: "updateShinobuCommandCombat",  opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true, status: "conforms", note: "Stage C: shinobuG3 now launches; poison-dance" },
  { key: "inosuke",  driver: "updateInosukeCommandCombat",  opener: "fwd+heavy", retap: "heavy", stages: 5, finisher: "launcher", requireHit: true, srcRequireHit: true, status: "conforms", note: "Stage C: inosukeB5 now launches; 5-stage flurry" },
  { key: "tobirama", driver: "updateTobiramaCommandCombat", opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true, status: "conforms", note: "Stage C: tobiComboFin now launches (was downward-slam heavy ender)" },

  // ── EXCEPTIONS — deliberately preserved, NEVER remapped ────────────────────────────────────────
  { key: "maki",          driver: "updateMakiCommandCombat",    opener: "fwd+heavy",  retap: "heavy",       stages: 3, finisher: "heavy",    requireHit: true,  srcRequireHit: true,  status: "exception", note: "TIGHT cancel window _cancelWindowFrames=5 (Heavenly-Vow power tradeoff)" },
  { key: "madara",        driver: "updateMadaraCommandCombat",  opener: "fwd+heavy",  retap: "none",        stages: 1, finisher: "none",     requireHit: null,  srcRequireHit: false, status: "exception", note: "single Susanoo punch, NO chain; 7-special scope kit (BALANCE_AUDIT)" },
  { key: "sasuke",        driver: "updateSasukeCommandCombat",  opener: "grab",       retap: "none",        stages: 1, finisher: "none",     requireHit: null,  srcRequireHit: false, status: "exception", note: "grab-only (Skeletal Grab), no strike chain" },
  { key: "zaraki",        driver: "updateZarakiCommandCombat",  opener: "fwd+heavy",  retap: "none",        stages: 1, finisher: "none",     requireHit: null,  srcRequireHit: false, status: "exception", note: "Base = single directional pokes, no chain" },
  { key: "zaraki_shikai", driver: "updateZarakiCommandCombat",  opener: "light|heavy", retap: "light|heavy", stages: 4, finisher: "launcher", requireHit: true,  srcRequireHit: false, status: "exception", note: "Shikai 4-stage dual-button rekka" },
  { key: "nezuko",        driver: "updateNezukoCommandCombat",  opener: "fwd/down+heavy", retap: "special", stages: 2, finisher: "launcher", requireHit: true,  srcRequireHit: false, status: "exception", note: "finisher advanced by SPECIAL edge, not Heavy; directional heavy singles" },
  { key: "omega_ranger",  driver: "updateOmegaRangerCommandCombat", opener: "fwd+heavy / back+light", retap: "heavy|light", stages: 7, finisher: "launcher", requireHit: true, srcRequireHit: false, status: "exception", note: "dual string: 3-stage Heavy kick + 7-stage Light sword" },
  { key: "red_ranger_mmpr", driver: "updateRedRangerMmprCommandCombat", opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true, status: "conforms", note: "3-stage punch chain (rrRekka1→2→3 super-360 launcher) + air-Heavy dive-kick poke" },
  { key: "rengoku",       driver: "updateRengokuCommandCombat", opener: "fwd+heavy",  retap: "heavy/special", stages: 3, finisher: "heavy",  requireHit: true,  srcRequireHit: false, status: "exception", note: "dual-tier: normal Heavy chain + Special super-branch; separate air chain" },
]

// ── THE SECOND GRAMMAR — Light→Light→Heavy(→launcher) "standard string" ─────────────────────────
// The Stage-1 audit MISSED this: `abilities.js updateStandardStringCombat` is a SHARED (non-per-char)
// dial-a-combo that gives single-poke characters a Light→Light→Heavy(→launcher) magic series + a
// heavy→special cancel, reusing each fighter's OWN basic_attacks (light + upAttack) — art-free, cancel-
// on-hit, tested by harness/stage2b_strings.test.mjs. It is the codebase's "STANDARD COMBO STRING"
// (MK-feel Stage 2b/2c). These chars are NOT un-built and NOT no-combo — they use this grammar instead
// of a Fwd+Heavy rekka. (See STANDARD_STRING_CHARS in abilities.js — the live source of truth.)
export const STANDARD_STRING = {
  builtIn: ["goku", "gojo", "sukuna", "naruto", "rick"],   // the 5 original (MK-feel Stage 2b; Megumi removed 2026-08-18)
  // Stage D rollout: every remaining un-built MELEE char (each has light + upAttack). Art-free, 1 line each.
  added:   ["itachi", "yuji", "goku_black", "cell", "tobi", "morty", "albedo", "omololu"],
}

// ── TRUE ZONERS — single-poke by design, NO combo string of either grammar ──────────────────────
// Ranged/setup identities whose combos open with a SPECIAL, not a normal. Deliberately NOT given a
// combo string (excluded from STANDARD_STRING_CHARS).
export const ZONER = ["rickPrime", "evilMorty", "beerus", "piccolo", "frieza"]

// ── BASE-NORMAL COMPLETENESS (Stage E) ──────────────────────────────────────────────────────────
// Stage-1 over-reported "missing normals" by not resolving the `...RANGER_BASICS` spread. The real
// picture (verified against the resolved roster): EVERY character resolves the CORE normals; only air/
// down-air are ever absent, and only for the 3 documented intentional cases below. This model turns that
// into a guard: a future edit that accidentally drops a core normal (or an air normal from a non-exempt
// char) goes red; the intentional absences stay documented. `_getMD` (combat.js) accepts the alt spellings.
export const CORE_NORMALS = ["light", "heavy", "upAttack"]   // the launcher (upAttack) gates the universal air combo → mandatory roster-wide
export const AIR_NORMALS  = ["airAttack", "downAir"]
// Chars intentionally missing an air normal — NOT gaps to fill (no fabricated art). Value = the absent keys.
export const BASE_NORMAL_EXCEPTIONS = {
  rick:          ["downAir"],              // deliberate — "no art exists" (comment in characters.js)
  zaraki:        ["airAttack", "downAir"], // brute: air normals intentionally absent (per its own comment)
  zaraki_shikai: ["airAttack", "downAir"], // inherits Zaraki base
  // NOTE: madara/pain replace downAir with `air_heavy` (present) → they are NOT flagged.
}
// Resolve a normal against a character's basic_attacks the same way combat.js _getMD does (alt spellings).
export function hasNormal(basic_attacks, slot) {
  const b = basic_attacks || {}
  switch (slot) {
    case "light":     return !!(b.light || b.light_attack)
    case "heavy":     return !!(b.heavy || b.heavy_attack)
    case "upAttack":  return !!(b.upAttack || b.up || b.up_attack)
    case "airAttack": return !!(b.airAttack || b.air || b.air_attack)
    case "downAir":   return !!(b.downAir || b.down_air || b.airHeavy || b.air_heavy)   // air_heavy counts as the down/air-special slot
    default:          return false
  }
}

// ── Derived helpers ────────────────────────────────────────────────────────────────────────────
export const REKKA_BY_KEY = Object.fromEntries(REKKA.map(e => [e.key, e]))
export function rekkaKeys()          { return REKKA.map(e => e.key) }
export function standardStringKeys() { return [...STANDARD_STRING.builtIn, ...STANDARD_STRING.added] }
export function zonerKeys()          { return [...ZONER] }
// Every classified key across BOTH grammars + zoners — must exactly partition the roster.
export function allClassifiedKeys()  { return [...rekkaKeys(), ...standardStringKeys(), ...zonerKeys()] }
export function classify(key) {
  const e = REKKA_BY_KEY[key]
  if (e) return { grammar: "rekka", chain: true, ...e }
  if (standardStringKeys().includes(key)) return { grammar: "standard-string", chain: true, key }
  if (ZONER.includes(key)) return { grammar: "zoner", chain: false, key }
  return null
}

// Expected classification counts — the baseline the harness asserts.
export const EXPECTED_COUNTS = {
  rekkaTotal:      REKKA.length,   // 34 (Fwd+Heavy rekka grammar) — +red_ranger_mmpr (Stage 2)
  conforms:        26,             // Stage C: +netero/ghostface/shinobu/inosuke/tobirama; +red_ranger_mmpr (3-stage punch chain, super-360 launcher)
  deviatesOpener:  0,              // Stage B DONE
  deviatesFinisher: 0,             // Stage C DONE (Maki stays an exception)
  exception:       8,
  standardStringBuiltIn: 5,        // pre-existing L,L,H chars (goku/gojo/sukuna/naruto/rick) — Megumi removed 2026-08-18
  standardStringAdded:  8,         // Stage D rollout (itachi/yuji/goku_black/cell/tobi/morty/albedo/omololu)
  standardStringTotal:  13,
  zoner:                5,          // true single-poke zoners (rickPrime/evilMorty/beerus/piccolo/frieza)
  rosterTotal:          52,        // 34 + 13 + 5 (rekka +red_ranger_mmpr). NOTE: live roster is 53 — `toji` is a PRE-EXISTING unclassified gap (recent rebuild, not yet added to REKKA/NO_REKKA); that partition failure is tracked separately, not part of this Stage-2 work.
}
