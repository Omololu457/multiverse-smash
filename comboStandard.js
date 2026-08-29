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
  inputBufferFrames: 10,     // input.js INPUT_BUFFER_FRAMES — shared, global (~167ms @60fps); raised
                             // 7→10 so the buffer covers the post-normal attackCooldown lock (=10) and
                             // early-recovery re-presses aren't dropped (see input_buffer_recovery test)
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

  // ── STAGE G — ROSTER-DRIFT COVERAGE (2026-08-29) ────────────────────────────────────────────────
  // 46 characters were added to the roster after Stages A–F and had silently escaped the partition
  // guardrail (harness §2 was red: "unclassified: …"). This block closes that gap. It is a COVERAGE
  // classification, NOT a combo re-design: for each entry the driver is verified to EXIST (§3), its
  // Forward-idiom opener is verified in source (§5, `fighter.facing === 1 ? !!inputState.right`), and
  // `requireHit` is source-cross-checked where a single literal exists (§4, srcRequireHit:true). The
  // `stages`/`finisher` fields are the standard target shape, not a per-char frame re-audit — combo
  // DAMAGE-DECAY itself was separately confirmed correct for these via harness/combo_flow_roster.mjs
  // (the earlier "flat damage" reading was CPU-starvation flakiness under concurrent test load, not a
  // real scaling bug — proven by clean 3× isolated re-runs). See updates.TXT Part 3 diagnosis.
  { key: "alt_sukuna",        driver: "updateAltSukunaCommandCombat",       opener: "fwd+heavy", retap: "heavy", stages: 2, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",  note: "Stage G coverage: Fwd+Heavy cleave rekka (driver + Fwd idiom verified)" },
  { key: "aoi_todo",          driver: "updateAoiTodoCommandCombat",         opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",  note: "Stage G coverage: Fwd+Heavy chain (Boogie Woogie cameo kit)" },
  { key: "baki",              driver: "updateBakiCommandCombat",            opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",  note: "Stage G coverage: Fwd+Heavy martial-arts chain" },
  { key: "bardock",           driver: "updateBardockCommandCombat",         opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",  note: "Stage G coverage: Blade Rush Fwd+Heavy sword rekka" },
  { key: "genos",             driver: "updateGenosCommandCombat",           opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",  note: "Stage G coverage: Fwd+Heavy jet-punch chain" },
  { key: "ghostface_billy",   driver: "updateGhostfaceCommandCombat",       opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",  note: "Stage G coverage: shares Ghostface driver (Billy variant)" },
  { key: "gohan",             driver: "updateGohanCommandCombat",           opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",  note: "Stage G coverage: Rush Combo Fwd+Heavy rekka" },
  { key: "gotenks",           driver: "updateGotenksCommandCombat",         opener: "fwd+heavy", retap: "heavy", stages: 2, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",  note: "Stage G coverage: Kamikaze Barrage Fwd+Heavy rekka" },
  { key: "hashirama",         driver: "updateHashiramaCommandCombat",       opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",  note: "Stage G coverage: Fwd+Heavy Mokuton chain" },
  { key: "ippo",              driver: "updateIppoCommandCombat",            opener: "fwd+heavy", retap: "heavy", stages: 2, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",  note: "Stage G coverage: Y-Jabs Fwd+Heavy boxing rekka" },
  { key: "iron_man",          driver: "updateIronManCommandCombat",         opener: "fwd+heavy", retap: "heavy", stages: 2, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",  note: "Stage G coverage: Fwd+Heavy repulsor melee chain" },
  { key: "iron_man_2",        driver: "updateIronMan2CommandCombat",        opener: "fwd+heavy", retap: "heavy", stages: 2, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",  note: "Stage G coverage: Fwd+Heavy chain (Data East variant)" },
  { key: "iron_man_3",        driver: "updateIronManCommandCombat",         opener: "fwd+heavy", retap: "heavy", stages: 2, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",  note: "Stage G coverage: shares IronMan driver (GBA variant)" },
  { key: "kakashi",           driver: "updateKakashiCommandCombat",         opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",  note: "Stage G coverage: Fwd+Heavy chain (teleport kit)" },
  { key: "kiba",              driver: "updateKibaCommandCombat",            opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: false, status: "conforms",  note: "Stage G coverage: Fwd+Heavy Fang chain (no single requireHit literal → src-check skipped)" },
  { key: "l_ryuuzaki",        driver: "updateLRyuuzakiCommandCombat",       opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",  note: "Stage G coverage: capoeira Fwd+Heavy chain" },
  { key: "mayuri",            driver: "updateMayuriCommandCombat",          opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",  note: "Stage G coverage: Fwd+Heavy chain (Bankai kit)" },
  { key: "orochimaru",        driver: "updateOrochimaruCommandCombat",      opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",  note: "Stage G coverage: Fwd+Heavy serpent chain" },
  { key: "saitama",           driver: "updateSaitamaCommandCombat",         opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",  note: "Stage G coverage: Spin-Punch Fwd+Heavy rekka" },
  { key: "six_paths_pain",    driver: "updatePainCommandCombat",            opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",  note: "Stage G coverage: shares Pain driver (Six Paths)" },
  { key: "superman_classic",  driver: "updateSupermanClassicCommandCombat", opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",  note: "Stage G coverage: Man of Steel Fwd+Heavy rekka" },
  { key: "superman_dcuc",     driver: "updateSupermanDcucCommandCombat",    opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",  note: "Stage G coverage: Kryptonian Rush Fwd+Heavy rekka" },
  { key: "superman_fighter",  driver: "updateSupermanFighterCommandCombat", opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",  note: "Stage G coverage: Kryptonian Barrage Fwd+Heavy rekka" },
  { key: "superman_new52",    driver: "updateSupermanNew52CommandCombat",   opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",  note: "Stage G coverage: Speeding Bullet Fwd+Heavy rekka" },
  { key: "toji",              driver: "updateTojiCommandCombat",            opener: "fwd+heavy", retap: "heavy", stages: 4, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",  note: "Stage G coverage: A-B-C-A+B Fwd+Heavy rekka (was the pre-existing unclassified gap)" },
  { key: "vegeta_dark",       driver: "updateVegetaDarkCommandCombat",      opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",  note: "Stage G coverage: Villain's Rush Fwd+Heavy rekka" },
  { key: "vegito",            driver: "updateVegitoCommandCombat",          opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",  note: "Stage G coverage: Fwd+Heavy chain" },
  { key: "yuta",              driver: "updateYutaCommandCombat",            opener: "fwd+heavy", retap: "heavy", stages: 3, finisher: "launcher", requireHit: true, srcRequireHit: true,  status: "conforms",  note: "Stage G coverage: yutaCombo Fwd+Heavy chain" },

  // ── STAGE G — driver present but NOT a standard Fwd+Heavy launcher-rekka (preserved as exceptions) ──
  // These have a command-combat driver (so they're real REKKA-family entries, not zoners) but either the
  // opener isn't the standard forward idiom (boruto/isshiki are Karma/Daikokuten-gated) or the driver has
  // no standard `rekkaContinue` launcher chain (directional strings / construct specials). Never remapped.
  { key: "boruto",            driver: "updateBorutoCommandCombat",          opener: "special-gated", retap: "none", stages: 1, finisher: "none", requireHit: null, srcRequireHit: false, status: "exception", note: "Stage G: Karma/absorb-gated opener, not the standard Fwd idiom" },
  { key: "isshiki",           driver: "updateIsshikiCommandCombat",         opener: "special-gated", retap: "none", stages: 1, finisher: "none", requireHit: null, srcRequireHit: false, status: "exception", note: "Stage G: Daikokuten-gated opener, not the standard Fwd idiom" },
  { key: "green_lantern",     driver: "updateGreenLanternCommandCombat",    opener: "fixed-slot",    retap: "none", stages: 1, finisher: "none", requireHit: null, srcRequireHit: false, status: "exception", note: "Stage G: fixed-slot construct specials (Option B large-kit), no standard rekka chain" },
  { key: "kurapika",          driver: "updateKurapikaCommandCombat",        opener: "directional",   retap: "none", stages: 1, finisher: "none", requireHit: null, srcRequireHit: false, status: "exception", note: "Stage G: chain-scan driver, no standard rekkaContinue launcher chain" },
  { key: "naoya",             driver: "updateNaoyaCommandCombat",           opener: "directional",   retap: "none", stages: 1, finisher: "none", requireHit: null, srcRequireHit: false, status: "exception", note: "Stage G: frame-skip directional strings, not a standard rekka" },
  { key: "onoki",             driver: "updateOnokiCommandCombat",           opener: "directional",   retap: "none", stages: 1, finisher: "none", requireHit: null, srcRequireHit: false, status: "exception", note: "Stage G: Jinton zoner kit, no standard rekka chain" },
  { key: "spiderman",         driver: "updateSpidermanCommandCombat",       opener: "directional",   retap: "none", stages: 1, finisher: "none", requireHit: null, srcRequireHit: false, status: "exception", note: "Stage G: web/combo driver without a standard rekkaContinue chain" },
  { key: "yamamoto",          driver: "updateYamamotoCommandCombat",        opener: "directional",   retap: "none", stages: 1, finisher: "none", requireHit: null, srcRequireHit: false, status: "exception", note: "Stage G: flame directional kit, no standard rekka chain" },
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
  // + The Handler (JJK): single ground combo string (punch→punch→blade-drawn launcher) — same grammar as
  //   the removed Megumi; carved from megumi_attack_punches_kicks.png.
  added:   ["itachi", "yuji", "goku_black", "cell", "tobi", "morty", "albedo", "omololu", "handler"],
}

// ── SINGLE-POKE (NO combo string of either grammar) ─────────────────────────────────────────────
// Characters whose offense opens with a SPECIAL/poke, NOT a normal chain — no per-char rekka driver
// AND not in STANDARD_STRING_CHARS. Originally "true ranged zoners"; the Stage-G additions widen this
// bucket to include un-chained MELEE identities (deathstroke/jason/miles/vilgax — self-contained
// specials, no chain by design) and all-special zoners (brainiac). Membership here just records
// "currently has no combo string" — it is NOT a runtime change (they already behave this way).
export const ZONER = [
  "rickPrime", "evilMorty", "beerus", "piccolo", "frieza",   // original ranged zoners
  // Stage-G coverage (2026-08-29): no command-combat driver + not in STANDARD_STRING_CHARS → single-poke.
  "brainiac",      // all-special zoner (no normal-tier art — schema exception)
  "byakuya",       // Senbonzakura petal specials + Shunpo, no normal chain
  "dark_knight",   // Stage-0 build (no gameplay driver yet) — single-poke until built
  "deathstroke",   // self-contained sword/gun specials, Stage-3 was an intentional no-chain
  "gwen",          // caster/summoner — special-opened offense
  "hiruzen",       // element specials, no standard chain
  "jason",         // slow bruiser: Relentless Slash special, no chain by design
  "light",         // Death Note kit: all offense via specials (no up/air normals — see exceptions below)
  "miles",         // venom-strike rushdown via specials, no normal chain
  "vilgax",        // sword/blast bruiser via fixed-slot specials, no chain
]

// ── BASE-NORMAL COMPLETENESS (Stage E) ──────────────────────────────────────────────────────────
// Stage-1 over-reported "missing normals" by not resolving the `...RANGER_BASICS` spread. The real
// picture (verified against the resolved roster): EVERY character resolves the CORE normals; only air/
// down-air are ever absent, and only for the 3 documented intentional cases below. This model turns that
// into a guard: a future edit that accidentally drops a core normal (or an air normal from a non-exempt
// char) goes red; the intentional absences stay documented. `_getMD` (combat.js) accepts the alt spellings.
export const CORE_NORMALS = ["light", "heavy", "upAttack"]   // the launcher (upAttack) gates the universal air combo → mandatory roster-wide
export const AIR_NORMALS  = ["airAttack", "downAir"]
// CORE-normal exemptions — a character whose DESIGN deliberately omits a core normal. Kept DELIBERATELY
// tiny (a core normal is meant to be universal); each entry needs a real design reason + is stale-checked
// (must actually be absent, else the exemption is flagged). Value = the absent core key(s).
export const CORE_NORMAL_EXCEPTIONS = {
  light: ["upAttack"],   // Death Note kit: no up/air normals by design — anti-air & aerial game are SPECIALS
                         // (B+Up Ryuk summon, jump+B/Y). Launcher/air-combo route intentionally not built.
}
// Chars intentionally missing an air normal — NOT gaps to fill (no fabricated art). Value = the absent keys.
export const BASE_NORMAL_EXCEPTIONS = {
  rick:          ["downAir"],              // deliberate — "no art exists" (comment in characters.js)
  zaraki:        ["airAttack", "downAir"], // brute: air normals intentionally absent (per its own comment)
  zaraki_shikai: ["airAttack", "downAir"], // inherits Zaraki base
  light:         ["airAttack", "downAir"], // Death Note kit: aerial game is specials (see CORE_NORMAL_EXCEPTIONS)
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
  rekkaTotal:      REKKA.length,   // 70 (34 original + 36 Stage-G roster-drift coverage adds)
  conforms:        54,             // 26 original + 28 Stage-G conforms (driver + Fwd idiom + requireHit source-verified)
  deviatesOpener:  0,              // Stage B DONE
  deviatesFinisher: 0,             // Stage C DONE (Maki stays an exception)
  exception:       16,             // 8 original + 8 Stage-G (driver present but non-standard opener / no rekka chain)
  standardStringBuiltIn: 5,        // pre-existing L,L,H chars (goku/gojo/sukuna/naruto/rick) — Megumi removed 2026-08-18
  standardStringAdded:  9,         // Stage D rollout (itachi/yuji/goku_black/cell/tobi/morty/albedo/omololu) + handler (JJK)
  standardStringTotal:  14,
  zoner:                15,         // 5 original ranged zoners + 10 Stage-G single-poke (brainiac/byakuya/dark_knight/deathstroke/gwen/hiruzen/jason/light/miles/vilgax)
  rosterTotal:          99,        // 70 rekka + 14 standard-string + 15 single-poke = 99 = live roster (Stage-G closes the drift; `toji` now classified)
}
