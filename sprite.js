// sprite.js
// Combined sprite handler:
// - Self-contained sprite renderer
// - Optional animationProfile.js support
// - Hitstop freeze, hurt priority, attack-name action routing
// - Anchoring, directional flipping, frame syncing to attack duration
// - Fallback box renderer
// - Spawn events for projectiles/summons/effects
//
// Exports: SpriteHandler, preloadCharacterSprites, preloadSheets, processPendingSpawns

// ─────────────────────────────────────────────────────────────────
// SKILL HUNTER (Chrollo) TRANSFORM TINT — a runtime canvas filter applied to the COPIED character's
// sprite for the whole stolen-form window (fighter._shActive). ONE shared treatment for ANY copied
// character (no per-opponent bespoke art — that scope grows with every future roster addition), and
// DELIBERATELY DISTINCT from the Edo Tensei near-black reanimation wash: this is a LIGHTER, clearly
// PURPLE "possession" tint keyed to Chrollo's own coat colour (#4A2E5C) so players never confuse
// "Chrollo wearing a stolen power" with an actual reanimated Edo Tensei summon. Applied inside the
// draw()'s ctx.save()/restore() pair, so it auto-clears the moment the window ends and the copied
// character (if later fought for real) renders normally everywhere else.
const SKILL_HUNTER_TINT = "grayscale(0.4) sepia(1) hue-rotate(235deg) saturate(1.7) brightness(0.85)";
// Toji Reincarnated Form (Stage 6) — a menacing crimson wash (no distinct form art exists), driven by
// fighter._reincarnated (set on the 2nd comeback save OR a manual Super/X cast).
const TOJI_REINCARNATED_TINT = "sepia(0.7) saturate(2.4) hue-rotate(-28deg) brightness(0.9)";
// EDO TENSEI reanimation wash. Instead of pre-baked near-black __reanim sheets, wash the vessel's OWN base art
// in a sickly, pale green-gray "reanimated corpse" tint — desaturate the living colour out, push the residue
// toward a decayed greenish pallor, lift it pale. Paired with drawEdoReanimOverlay (procedural seam/mottle).
// Works on ANY vessel's base sprites → no per-char art. Gated on fighter._edoActive.
const EDO_REANIM_TINT = "grayscale(0.82) sepia(0.45) hue-rotate(55deg) saturate(0.72) brightness(1.07) contrast(0.92)";

// ─────────────────────────────────────────────────────────────────
// OPTIONAL DEPENDENCY — animationProfile.js
// If missing, the module still works using fallback rendering.
// ─────────────────────────────────────────────────────────────────
let _getProfile = () => null;
let _getAction = () => null;
let _FALLBACK = {
  frames: 4,
  width: 128,
  height: 128,
  speed: 8,
  loop: true,
  lockLastFrame: false,
  anchorX: 0,
  anchorY: 0,
  sheet: null
};

try {
  const mod = await import("./animationProfile.js");
  _getProfile = mod.getProfile || _getProfile;
  _getAction = mod.getAction || _getAction;
  _FALLBACK = mod.FALLBACK_ACTION || _FALLBACK;
} catch (_) {
  // animationProfile.js not present — fallback rendering will be used
}


// ─────────────────────────────────────────────────────────────────
// SPRITE SHEET CACHE
// ─────────────────────────────────────────────────────────────────
const _cache = new Map();

// Number of distinct sheet images loaded/loading this session (profiling overlay, Stage 22D).
// After atlasing, an atlased character contributes 1 entry instead of 20-40.
export function loadedSheetCount() { return _cache.size; }

function _loadSheet(path) {
  if (!path) return null;
  if (_cache.has(path)) return _cache.get(path);

  const img = new Image();
  img.src = path;
  _cache.set(path, img);
  return img;
}

function _sheetReady(img) {
  return img && img.complete && img.naturalWidth > 0;
}

// ─────────────────────────────────────────────────────────────────
// PRELOAD
// ─────────────────────────────────────────────────────────────────
export function preloadCharacterSprites(characterKey) {
  try {
    const profile = _getProfile(characterKey);
    if (!profile) return;

    for (const action of Object.values(profile.actions || {})) {
      if (action.sheet) _loadSheet(action.sheet);
    }
  } catch (_) {}
}

// Resolve when an Image is fully decoded and drawable. decode() is the authoritative signal
// (returns only once the bitmap is ready to paint with no jank); we fall back to load/error
// events where decode() is unavailable. NEVER rejects — a broken sheet resolves to { ok:false }
// so one 404 can't sink the whole preload Promise.
function _decodeSheet(img, path) {
  if (!img) return Promise.resolve({ path, ok: false, error: "no-image" });
  if (typeof img.decode === "function") {
    return img.decode()
      .then(() => ({ path, ok: true }))
      // decode() can reject spuriously (e.g. already-complete cached images in some engines);
      // trust the pixel-level readiness check as the tiebreaker before declaring failure.
      .catch(() => (_sheetReady(img) ? { path, ok: true } : { path, ok: false, error: "decode-failed" }));
  }
  if (_sheetReady(img)) return Promise.resolve({ path, ok: true });
  return new Promise(res => {
    img.addEventListener("load",  () => res({ path, ok: true }), { once: true });
    img.addEventListener("error", () => res({ path, ok: false, error: "load-error" }), { once: true });
  });
}

// Core preloader: load + decode an arbitrary list of sheet paths into the module _cache. Resolves —
// never rejects — with { total, failures:[{path,error}] } once every sheet has decoded or errored.
// onEach (optional) fires once per sheet with its { path, ok } result so callers can drive a progress bar.
//
// CONCURRENCY IS BOUNDED (maxConcurrent, default 6). A heavy fighter fans out to 100+ sheets; firing
// every new Image() + decode() at once bursts the browser's per-host connection pool and floods the
// main thread with decode-completion callbacks in one spike right at match start. A small worker pool
// spreads that load, keeps match start smooth, and still finishes well within the intro window.
// _loadSheet() only fires each Image's request when a worker reaches it, so this throttles the network
// too. game.js's preloadMatch routes both body-sheet and FX-sheet lists through here.
export function preloadSheets(paths, onEach, maxConcurrent = 6) {
  const list = [...new Set((paths || []).filter(Boolean))];
  const failures = [];
  let idx = 0;
  const worker = async () => {
    while (idx < list.length) {
      const p = list[idx++];
      const r = await _decodeSheet(_loadSheet(p), p);
      try { onEach?.(r); } catch (_) {}
      if (!r.ok) failures.push({ path: r.path, error: r.error || "unknown" });
    }
  };
  const n = Math.max(1, Math.min(maxConcurrent, list.length));
  return Promise.all(Array.from({ length: n }, worker)).then(() => ({ total: list.length, failures }));
}

// ─────────────────────────────────────────────────────────────────
// MOVE → ACTION MAP
// Lets combat move names map to animationProfile action names.
// If no mapping exists, currentMove itself is used.
// ─────────────────────────────────────────────────────────────────
const MOVE_TO_ACTION = {
  light: "light",
  heavy: "heavy",
  up: "up",
  air: "air",
  down_air: "down_air",
  air_heavy: "air_heavy",   // Madara (Stage 2): AERIAL HARD Susanoo-hand grab (air+Heavy). Identity map.
  madaraFireballCast: "madaraFireballCast",   // Madara (Stage 3): Katon Great Fireball cast pose. Identity map.
  madaraGunbaiSummon: "madaraGunbaiSummon",   // Madara (Stage 3): Gunbai Summon reflect-stance pose. Identity map.
  madaraGunbaiSwing:  "madaraGunbaiSwing",    // Madara (Stage 3): Gunbai Fan-Swing overhead melee pose. Identity map.
  madaraWoodSpikeCast:"madaraWoodSpikeCast",  // Madara (Stage 3): Mokuton Wood Spike cast pose. Identity map.
  madaraWoodDragonCast:"madaraWoodDragonCast",// Madara (Stage 3): Mokuton Wood Dragon cast pose. Identity map.
  madaraTengaiCast:   "madaraTengaiCast",     // Madara (Stage 5): Perfect Susanoo / Tengai Shinsei cast pose. Identity map.
  madaraSusanooPunch: "madaraSusanooPunch",   // Madara (Stage 3): Susanoo Base Punch (Fwd+Heavy command-normal). Identity map.
  // Pain (Stage 2): Fwd+Light command normal (painJab) + Fwd+Heavy 3-stage rekka (painCombo1→2→3).
  // Identity maps (currentMove === action key) — explicit so a recovery tail never resolves to the fallback box.
  painJab: "painJab", painCombo1: "painCombo1", painCombo2: "painCombo2", painCombo3: "painCombo3",
  // Pain (Stage 3): gravity-special cast poses (_spriteCastMove). Identity maps so the cast tail never falls back.
  painAlmightyPushCast: "painAlmightyPushCast", painAlmightyPullCast: "painAlmightyPullCast", painSuperPushCast: "painSuperPushCast",
  // Pain (Stage 4): Dedera Double Attack cast + rise poses (_spriteCastMove, sequenced). Identity maps.
  painDederaCast: "painDederaCast", painDederaRise: "painDederaRise",
  // Pain (Stage 7): Chibaku Tensei ultimate cast pose (arms raised, _spriteCastMove). Identity map.
  painChibakuCast: "painChibakuCast",
  // Red Ranger MMPR (Stage 2): Fwd+Heavy command chain (rrRekka1→2→3) + airborne-Heavy dive-kick poke.
  // Identity maps (currentAttack.name === action key) so a recovery tail never resolves to the fallback box.
  rrRekka1: "rrRekka1", rrRekka2: "rrRekka2", rrRekka3: "rrRekka3", rrDiveKick: "rrDiveKick",
  // Isshiki (Stage 2): Light auto-combo strings — ground (isshikiGround1→2→3) + air (isshikiAir1→2→3).
  // Identity maps so a rekka-stage recovery tail never resolves to the fallback box.
  isshikiGround1: "isshikiGround1", isshikiGround2: "isshikiGround2", isshikiGround3: "isshikiGround3",
  isshikiAir1: "isshikiAir1", isshikiAir2: "isshikiAir2", isshikiAir3: "isshikiAir3",
  // Saitama (Stage 2): "Spin-Punch" Fwd+Heavy command-normal rekka stages. Identity maps so a rekka-stage
  // recovery tail never resolves to the 128² fallback box.
  saitamaTurn1: "saitamaTurn1", saitamaTurn2: "saitamaTurn2", saitamaTurn3: "saitamaTurn3",
  // Alternate Sukuna (Stage 3): Dismantle/Cleave command-string stages. Identity maps (currentMove === action
  // key) so a recovery/cast tail never resolves to the 128² fallback box.
  altSukunaCleave1: "altSukunaCleave1", altSukunaCleave2: "altSukunaCleave2",
  altSukunaBeam: "altSukunaBeam", altSukunaSpinkick: "altSukunaSpinkick", altSukunaUltCharge: "altSukunaUltCharge",
  // Saitama (Stage 3): tiered tap/hold punch-combo flurry poses. Identity maps so the multi-hit flurry
  // recovery tail never resolves to the fallback box.
  saitamaCombo10: "saitamaCombo10", saitamaCombo20: "saitamaCombo20",
  // Saitama (Stage 4): the 6 specials (+ Side Hop). Identity maps so a special recovery tail never falls
  // back to the 128² box.
  saitamaSerious: "saitamaSerious", saitamaTwohand: "saitamaTwohand", saitamaBargain: "saitamaBargain",
  saitamaTableflip: "saitamaTableflip", saitamaHeadbutt: "saitamaHeadbutt", saitamaUpdown: "saitamaUpdown", saitamaSidehop: "saitamaSidehop",
  // Saitama (Stage 5): Death Punch ultimate poses (live fighter holds charge → impact through the cinematic).
  saitamaDeathCharge: "saitamaDeathCharge", saitamaDeathImpact: "saitamaDeathImpact",
  // Hiruzen (Stage 2): SPIN evasive-dodge cast pose (_spriteCastMove). Identity map so the spin strip
  // renders during the i-frame window (never falls back). Stage 3 borrowed-jutsu casts join here.
  hiruzenSpin: "hiruzenSpin",
  // Hiruzen (Stage 3): borrowed-jutsu cast poses (_spriteCastMove) — Fire / Earth / Enma / staff-bind.
  hiruzenFireCast: "hiruzenFireCast", hiruzenEarthCast: "hiruzenEarthCast", hiruzenEnmaCast: "hiruzenEnmaCast", hiruzenBind: "hiruzenBind",
  // Hiruzen (Stage 4): Reaper Death Seal sealing-sign held pose (_spriteCastMove, through the cinematic).
  hiruzenReaperCast: "hiruzenReaperCast",
  // Orochimaru (Stage 2): Forward Strong (Fwd+Heavy command normal) + throw-weapon grab cast pose.
  // Identity maps so the command-normal / grab cast tail never resolves to the fallback box.
  orochimaruFwdStrong: "orochimaruFwdStrong", orochimaruThrow: "orochimaruThrow",
  // Orochimaru (Stage 3): command-normal CHAIN stages 2-3 + the 8 specials' cast poses. Identity maps.
  orochimaruChain2: "orochimaruChain2", orochimaruChain3: "orochimaruChain3",
  orochimaruSwordLunge: "orochimaruSwordLunge", orochimaruSwordThrow: "orochimaruSwordThrow",
  orochimaruSnakeSpit: "orochimaruSnakeSpit", orochimaruSnakeLunge: "orochimaruSnakeLunge",
  orochimaruSnakeBarrage: "orochimaruSnakeBarrage", orochimaruTailSweep: "orochimaruTailSweep",
  orochimaruSlam: "orochimaruSlam", orochimaruCoil: "orochimaruCoil",
  // Orochimaru (Stage 4): shared shed-skin transition pose (form transforms). Identity map.
  orochimaruShed: "orochimaruShed",
  // Orochimaru (Stage 5): Summon Ultimate caster pose (held through the freeze cinematic). Identity map.
  orochimaruSummonCast: "orochimaruSummonCast",
  // Isshiki (Stage 3): special CAST poses (_spriteCastMove) — Sukunahikona/cubes / rods / Gokashin fire.
  isshikiSukuCast: "isshikiSukuCast", isshikiRodCast: "isshikiRodCast", isshikiFireCast: "isshikiFireCast",
  // Isshiki (Stage 4): 2 finisher poses + Ultimate windup cast.
  isshikiFin1Cast: "isshikiFin1Cast", isshikiFin2: "isshikiFin2", isshikiUltCast: "isshikiUltCast",
  // Red Ranger MMPR (Stage 3): grab/throw special cast poses (_spriteCastMove) — rrGrab (trhow_1 windup/
  // lift) → rrThrow (trhow_2 release). Identity maps so the cast tail never resolves to the fallback box.
  rrGrab: "rrGrab", rrThrow: "rrThrow",
  obitoRod1: "obitoRod1",   // Obito (Stage 2): "Kamui Rod Combo" Fwd+Heavy rekka stages. Identity maps
  obitoRod2: "obitoRod2",   // (currentMove === action key) — explicit so a recovery/cast tail can never
  obitoRod3: "obitoRod3",   // resolve to the 128² fallback box.
  obitoShurCast: "obitoShurCast",       // Obito (Stage 3): ranged-special cast poses (_spriteCastMove).
  obitoShurCastAir: "obitoShurCastAir", // Identity maps so the cast tail never resolves to the fallback box.
  obitoRodCast: "obitoRodCast",
  obitoTeleport: "obitoTeleport",       // Obito (Stage 5): Kamui blink pose (self-portal / teleport-grab).
  obitoKamuiActivate: "obitoKamuiActivate",   // Obito: Kamui intangibility initiation pose (plays once at toggle-on).
  grab: "grab",

  // Byakuya (Stage 4): special cast + strike poses (_spriteCastMove / currentMove). Identity maps so a cast/
  // teleport/strike recovery tail never resolves to the 128² fallback box.
  byakuyaThrust: "byakuyaThrust", byakuyaPetalCast: "byakuyaPetalCast",
  byakuyaShunpoOut: "byakuyaShunpoOut", byakuyaShunpoIn: "byakuyaShunpoIn",
  byakuyaReformVanish: "byakuyaReformVanish", byakuyaReformOverhead: "byakuyaReformOverhead", byakuyaReformThrust: "byakuyaReformThrust",
  byakuyaJumpSlash: "byakuyaJumpSlash", byakuyaAirVault: "byakuyaAirVault",
  byakuyaBankaiCharge: "byakuyaBankaiCharge", byakuyaBankaiTransform: "byakuyaBankaiTransform", byakuyaBankaiThrust: "byakuyaBankaiThrust",   // Stage 5: Bankai cinematic poses (charge→transform→thrust)

  // Brainiac (Stage 4): special cast/strike poses (_spriteCastMove / currentMove). Identity maps so a
  // cast/strike recovery tail never resolves to the 128² fallback box. (Stage 5 Pillar ULT pose added later.)
  brainiacBeam: "brainiacBeam", brainiacBlade: "brainiacBlade", brainiacSweep: "brainiacSweep",
  brainiacShield: "brainiacShield", brainiacLevitate: "brainiacLevitate",

  // Aoi Todo (Stage 3 command chain + Stage 4 specials): cast/strike poses (_spriteCastMove / currentMove).
  // Identity maps so a cast/strike recovery tail never resolves to the 128² fallback box.
  todoCombo1: "todoCombo1", todoCombo2: "todoCombo2", todoCombo3: "todoCombo3",
  todoGun: "todoGun", todoFireKick: "todoFireKick", todoWhip: "todoWhip",
  todoSpin: "todoSpin", todoArmor: "todoArmor", todoDive: "todoDive", todoClap: "todoClap",
  // Yuta (Stage 3): sword-combo rekka stages (currentMove === action key). Identity maps so a strike
  // recovery tail can never resolve to the 128² fallback box. (Stage 4 special poses appended later.)
  yutaCombo1: "yutaCombo1", yutaCombo2: "yutaCombo2", yutaCombo3: "yutaCombo3",
  // Yuta (Stage 4): special cast/strike poses (_spriteCastMove / currentMove === action key). Identity maps
  // so a cast/strike recovery tail can never resolve to the 128² fallback box.
  yutaStrong: "yutaStrong", yutaKick4: "yutaKick4", yutaCem: "yutaCem", yutaSpeech: "yutaSpeech", yutaRct: "yutaRct",
  yutaUltCast: "yutaUltCast",   // Yuta (Stage 5): Rika's Invocation cast pose (_spriteCastMove) — identity map

  // Netero (Stage 3): command-chain stages + Barrage special. Identity maps (currentMove === action
  // key) — explicit here so a recovery/cast tail can never resolve to the 128² box (Sasuke dashStrike
  // gotcha noted below).
  down_attck_1: "down_attck_1",
  down_attck_2: "down_attck_2",
  barragePunches: "barragePunches",
  guanyinCast: "guanyinCast",   // Stage 4: base-form Guanyin transformation charge pose
  // Stage 5: giant avatar attack poses (resolved against fighter._skinAnim = GUANYIN_ANIM).
  guanyinLeg: "guanyinLeg",
  guanyinArm: "guanyinArm",
  guanyinCombo: "guanyinCombo",
  guanyinBurst: "guanyinBurst",

  // Omni-Man (Stage 2): "Viltrumite Beatdown" command chain + Fwd+Light push poke. Identity maps
  // (currentMove === action key) — explicit so a recovery/cast tail can never resolve to the 128² box.
  omCombo1: "omCombo1",
  omCombo2: "omCombo2",
  omComboFin: "omComboFin",
  omPush: "omPush",

  // Chrollo (Stage 2): "Blade Rush" Toji-Rekka command chain. Identity maps (currentMove === action
  // key) — explicit so a recovery/cast tail can never resolve to the 128² box.
  chCombo1: "chCombo1",
  chComboFin: "chComboFin",
  // Chrollo (Stage 3) specials: Nen Bolt cast pose + Blade Lunge thrust. Identity maps.
  chNenCast: "chNenCast",
  chBladeLunge: "chBladeLunge",
  // Chrollo (Stage 5) Skill Hunter transformation cast pose. Identity map.
  chSkillHunterCast: "chSkillHunterCast",
  // Omni-Man (Stage 4) specials: Skewering Rush (flying tackle) + Meteor Drop (diving slam). Neutral
  // "Viltrumite Smash" (omSmash) reuses the heavy haymaker pose. Identity maps → no 128² box on the tail.
  omSkewer: "omSkewer",
  omMeteor: "omMeteor",
  omSmash: "heavy",

  // Ben 10 (Stage 2): per-form Fwd+Heavy command-normal chain stages (Ben jab / XLR8 combo / Diamondhead
  // crystal swing). Identity maps (currentMove === action key) — explicit so a recovery/cast tail can
  // never resolve to the 128² box. Resolved against the active form set (base or _skinAnim).
  benJab1: "benJab1", benJab2: "benJab2",
  xlCombo1: "xlCombo1", xlCombo2: "xlCombo2", xlCombo3: "xlCombo3",
  dhSwing1: "dhSwing1", dhSwing2: "dhSwing2",
  // Stage 3 specials (per-form): Ben Hoverboard, XLR8 Dash Strike / Sonic Rush, Diamondhead
  // Shard Barrage cast / Rising Diamonds cast. Identity maps (currentMove / _spriteCastMove === key).
  benHover: "benHover", xlDash: "xlDash", xlRush: "xlRush", dhShoot: "dhShoot", dhRising: "dhRising",
  // Stage 4 ultimates: Ben Omnitrix-transform cast pose, XLR8 Sonic Blitz, Diamondhead Crystal Storm.
  transform: "transform", xlUlt: "xlUlt", dhUlt: "dhUlt",

  // Hisoka (Stage 2): Down+Heavy command-normal chain stages. Identity maps (currentMove === action
  // key) — explicit so a recovery/cast tail can never resolve to the 128² box.
  hisokaRekka1: "hisokaRekka1",
  hisokaRekka2: "hisokaRekka2",
  bungeeGum: "bungeeGum",   // Stage 3: extended-reach Bungee Gum whip special
  cardThrowSingle: "cardThrowSingle",   // Stage 4: Texture Surprise — single precise throw
  cardThrowRapid: "cardThrowRapid",     // Stage 4: Texture Surprise — rapid multi-card spread

  // Ichigo (Stage 2): "Zangetsu" command system — Fwd+Heavy 3-hit rekka + Down/Back+Heavy, Fwd+Light,
  // Dash+Heavy command normals + the post-finisher return-to-stance settle. Identity maps (currentMove /
  // _spriteCastMove === action key) — explicit so a recovery/cast tail can never resolve to the 128² box.
  ichigoRekka1: "ichigoRekka1",
  ichigoRekka2: "ichigoRekka2",
  ichigoRekka3: "ichigoRekka3",
  ichigoDownHeavy: "ichigoDownHeavy",
  ichigoBackHeavy: "ichigoBackHeavy",
  ichigoFwdLight: "ichigoFwdLight",
  ichigoDashAtk: "ichigoDashAtk",
  ichigoReturn: "ichigoReturn",
  // Ichigo (Stage 3): specials — Getsuga cast pose + 4 melee-special poses (dark-form Hollow supers included).
  ichigoGetsugaCast: "ichigoGetsugaCast",
  ichigoChargedSlash: "ichigoChargedSlash",
  ichigoAirGetsuga: "ichigoAirGetsuga",
  ichigoHollowGetsuga: "ichigoHollowGetsuga",
  ichigoHollowRising: "ichigoHollowRising",
  // Ichigo (Stage 4): Getsuga Tenshō ultimate — dash-slash (part_1) → rising uppercut (part_2), played
  // through the freeze-cinematic via _spriteCastMove (the cinematic switches ichigoUlt1 → ichigoUlt2).
  ichigoUlt1: "ichigoUlt1",
  ichigoUlt2: "ichigoUlt2",

  // Zaraki Kenpachi (Stage 2): Fwd+Light/Fwd+Heavy command slashes, the Up+B aerial route (up-swing →
  // repeat → down slam), and both base specials (Charged Dash strike + Hollow Mask Strike). Identity maps
  // (currentMove === action key) — explicit so a recovery tail can never resolve to the 128² box.
  zarakiFwdSlash1: "zarakiFwdSlash1",
  zarakiFwdSlash2: "zarakiFwdSlash2",
  zarakiAirUp: "zarakiAirUp",
  zarakiAirDown: "zarakiAirDown",
  zarakiChargedDash: "zarakiChargedDash",
  zarakiHollowStrike: "zarakiHollowStrike",
  // Zaraki (Stage 3): Shikai form — transform-in pose + 4-stage combo rekka + up/aerial/special.
  // Resolved against fighter._skinAnim = ZARAKI_SHIKAI_ANIM while the timed mode is active.
  shikaiRelease: "shikaiRelease",
  zarakiShikaiC1: "zarakiShikaiC1",
  zarakiShikaiC2: "zarakiShikaiC2",
  zarakiShikaiC3: "zarakiShikaiC3",
  zarakiShikaiC4: "zarakiShikaiC4",
  zarakiShikaiUp: "zarakiShikaiUp",
  zarakiShikaiDownAir: "zarakiShikaiDownAir",
  zarakiShikaiSpecial: "zarakiShikaiSpecial",
  // Zaraki (Stage 4): Bankai — single-use burst ultimate (renders in Base OR Shikai, same art).
  zarakiBankai: "zarakiBankai",
  // Zaraki (Stage 5): Yachiru Assist — Zaraki's throw pose (_spriteCastMove).
  zarakiYachiruThrow: "zarakiYachiruThrow",

  // Samurai Red Ranger (Stage 2): merged tap/hold up-attack + Toji-Rekka command chain. Identity
  // maps (currentMove === action key) — explicit so a recovery/cast tail can never resolve to the 128² box.
  samUpTap: "samUpTap",
  samUpHold: "samUpHold",
  samRekka1: "samRekka1",
  samRekka2: "samRekka2",
  samRekkaFin: "samRekkaFin",
  flameSlash: "flameSlash",   // Stage 4: Mega-only Flame Slash cast pose

  // Tobirama (Stage 3): taijutsu command chain + 2 free pokes. Identity maps (currentMove === action
  // key) — explicit so a recovery/cast tail can never resolve to the 128² box.
  tobiCombo1: "tobiCombo1",
  tobiCombo2: "tobiCombo2",
  tobiComboFin: "tobiComboFin",
  tobiStrongFwd: "tobiStrongFwd",
  tobiRisingKnee: "tobiRisingKnee",
  // Tobirama (Stage 4): water/space-time special cast + melee poses.
  tobiWaterDragon: "tobiWaterDragon",
  tobiWaterSlash: "tobiWaterSlash",
  tobiRisingWater: "tobiRisingWater",
  tobiWaterWall: "tobiWaterWall",
  tobiDarkness: "tobiDarkness",
  tobiWaterFlicker: "tobiWaterFlicker",
  tobiEdoCast: "tobiEdoCast",   // Edo Tensei summoning-ritual pose (activation windup)

  // Yuji Itadori (Stage 3): Cursed-Energy (Y) cast poses. Identity maps (_spriteCastMove / currentMove ===
  // action key) — explicit so a projectile-cast tail or melee recovery can never resolve to the 128² box.
  yujiBall: "yujiBall",
  yujiBeam: "yujiBeam",
  yujiPillar: "yujiPillar",
  yujiCrescent: "yujiCrescent",
  yujiAirCombo: "yujiAirCombo",
  yujiKoma1: "yujiKoma1",   // Stage 4: Koma REPEAT flurry (looped)
  yujiKoma2: "yujiKoma2",   // Stage 4: Koma finisher combo
  ultimateAction: "ultimateAction",   // Stage 5: "Black Flash" ult Phase-1 buildup pose (plays through the freeze-cinematic)
  yujiSukunaSign: "yujiSukunaSign",   // Stage 6: "Sukuna Slash" flavor — cursed hand-sign cast pose

  // Saiki Kusuo: rekka cast poses + burst/lightning/bomb cast poses. Identity maps (currentMove /
  // _spriteCastMove === action key) — explicit so a recovery/cast tail can never resolve to the 128² box.
  saikiChain1: "saikiChain1",
  saikiChain2: "saikiChain2",
  saikiChain3: "saikiChain3",
  saikiChainFin: "saikiChainFin",
  saikiBurst: "saikiBurst",
  saikiLightning: "saikiLightning",
  saikiBomb: "saikiBomb",

  // L "Ryuuzaki" (Stage 3): merged capoeira COMMAND-NORMAL CHAIN — Fwd+Heavy 3-stage cancel-on-hit
  // rekka (low sweep → rising crescent → aerial dive). Identity maps (currentMove === action key) —
  // explicit so a recovery tail never resolves to the 128² fallback box.
  lRyuuzakiCmd1: "lRyuuzakiCmd1",
  lRyuuzakiCmd2: "lRyuuzakiCmd2",
  lRyuuzakiCmd3: "lRyuuzakiCmd3",
  // L "Ryuuzaki" (Stage 4): special CAST/HOLD poses (_spriteCastMove) + the EX flurry (currentMove).
  // Identity maps so a cast/attack tail never falls to the 128² box.
  lRyuuzakiNovaCast:    "lRyuuzakiNovaCast",
  lRyuuzakiBazookaCast: "lRyuuzakiBazookaCast",
  lRyuuzakiRisingCast:  "lRyuuzakiRisingCast",
  lRyuuzakiAnalysis:    "lRyuuzakiAnalysis",
  lRyuuzakiKickTrail:   "lRyuuzakiKickTrail",
  lRyuuzakiRyukCast:    "lRyuuzakiRyukCast",

  blue: "blue_cast",
  red: "red_cast",
  hollowPurple: "hollow_purple_cast",

  dragonFist: "special_1",
  kamehameha: "special_2",

  rasengan: "special_1",
  shadowCloneBlast: "special_2",

  chidoriKoiten: "chidoriKoiten",

  // Sasuke dash-strike (base special): the `dash` sprite plays via _spriteCastMove, but that timer
  // expires a few frames BEFORE the attack's recovery ends — so map the raw move name here too, or
  // the tail of the move resolves to the raw "dashStrike" (no animationData) → 128² fallback BOX flash.
  dashStrike: "dash",

  cleave: "cleave",
  dismantle: "dismantle",

  analysisStrike: "special_1",

  inventorySmash: "special_1",
  rapidStrike: "special_2",

  waterSurfaceSlasher: "special_1",
  danceOfTheFireflies: "special_2",
  bloodDemonArt: "special_1",
  thunderClapStrike: "special_1",
  dualSwordFrenzy: "special_1",
  flameBreathingFirstForm: "special_1",
  destructiveStrike: "special_1",

  portalBlast: "special_1",
  meeseeksSummon: "special_2",
  // Rick (sprite build): cast-move names → their own animationData actions. Identity mapping
  // so a _spriteCastMove (or currentMove) with these names never falls to the 128² box.
  meeseeksThrow: "meeseeksThrow",
  rocket: "rocket",
  portalTravel: "portalTravel",
  selfDestruct: "selfDestruct",
  gunShot: "gunShot",
  nerveStrike: "special_1",
  manipulativeBlast: "special_1",
  primePortalBlast: "special_1",

  // Spider-Man (Stage 2): Fwd+Heavy "Jump Attack Combo" command normal (spiderCombo), Ground Crawl evasive
  // cast pose (spiderCrawl, _spriteCastMove), + the crawl kick-up exit attack (spiderKickup). Identity maps
  // (currentMove/_spriteCastMove === action key) — explicit so a command/cast/attack recovery tail never
  // resolves to the 128² fallback box. (Stage 3 web-special cast poses join here.)
  spiderCombo: "spiderCombo", spiderCrawl: "spiderCrawl", spiderKickup: "spiderKickup",
  // Spider-Man (Stage 3): web-special cast poses (_spriteCastMove) + melee-special poses (currentMove).
  // spiderWebBridge = the combo-cancel web-net bridge into Web Throw. Identity maps → no 128² box on the tail.
  spiderWebImpact: "spiderWebImpact", spiderWebThrow: "spiderWebThrow", spiderWebBridge: "spiderWebBridge",
  spiderDashAttack: "spiderDashAttack", spiderHandstand: "spiderHandstand",

  // Naoya (Stage 3): Fwd+Heavy "low combo string" command normal (naoyaCombo, row_08). Identity map —
  // the command recovery tail resolves the real sheet, never the 128² fallback box.
  naoyaCombo: "naoyaCombo",
  // Naoya (Stage 4): special cast poses (_spriteCastMove). Energy Dart / Pitch Throw / Frame-Skip blink /
  // Frame-Trap telegraph + its 3 scripted steps. Identity maps → real sheets on the cast tail (no 128² box).
  naoyaEnergyDart: "naoyaEnergyDart", naoyaPitch: "naoyaPitch", naoyaFrameSkip: "naoyaFrameSkip",
  naoyaFrameTrap: "naoyaFrameTrap", naoyaFtStep1: "naoyaFtStep1", naoyaFtStep2: "naoyaFtStep2", naoyaFtFinish: "naoyaFtFinish",

  ultimate: "ultimate",
  transform: "transform",
  domain: "domain"
};

// Last-N frames of a knockdown during which a fighter WITH a `getup` strip plays its RISE
// pose (get_up.png = 6f × speed 4 ≈ 24). Only affects fighters that define `getup` (Goku Black).
const GETUP_WINDOW = 24;

// ─────────────────────────────────────────────────────────────────
// ACTION RESOLVER
// Combines your simple priority flow with extra states from the
// larger self-contained version.
// ─────────────────────────────────────────────────────────────────
function _resolveAction(fighter, currentAction = "idle") {
  if (!fighter) return "idle";

  // HARNESS-ONLY pose override: set exclusively by __harness.benPose (and only under
  // ?harness) so a screenshot tool can render a SPECIFIC action deterministically without
  // driving physics. Inert in normal play (the field is never set). Highest priority.
  if (fighter._forceAction) return fighter._forceAction;

  // Task 3: Gojo's Unlimited Void FREEZES the trapped enemy on the exact frame
  // they were in. Hold whatever action was last resolved (mid-jump → "jump",
  // mid-walk → "walk") and never switch to a hurt pose, even though they're
  // locked. Frame advancement is also halted in updateFrames() below.
  if (fighter.domainFrozen) return fighter._lastSpriteAction || currentAction || "idle";

  // Freeze visible animation during hitstop
  if ((fighter.hitstop || 0) > 0) return currentAction || fighter._lastSpriteAction || "idle";

  // TAUNT (committed phase): a fighter mid-taunt is fully locked and plays its taunt
  // strip. The taunt state machine (game.js updateTauntState) clears _tauntPlaying the
  // frame it's interrupted or completes, so by the time we resolve here it's only true
  // during the genuine locked animation. No-op for anyone without the state (Rick's channel).
  if (fighter._tauntPlaying) {
    // Airborne-taunt variant when the char defines one (Superman → taunt_air), mirroring the hurt/hurt_air
    // idiom; otherwise the grounded "taunt". No-op for every char WITHOUT a taunt_air strip.
    const airborneT = !(fighter.onGround ?? fighter.grounded);
    if (airborneT && (fighter._skinAnim?.taunt_air || fighter.animationData?.taunt_air)) return "taunt_air";
    // ALT-TAUNT variant: a fighter shipping a `tauntAlt` strip may randomly play it instead of the
    // primary `taunt` (Zaraki: two distinct provocations). game.js picks _tauntVariant at commit;
    // no-op for every char without a tauntAlt strip (always resolves to "taunt").
    if (fighter._tauntVariant === "tauntAlt" && (fighter._skinAnim?.tauntAlt || fighter.animationData?.tauntAlt)) return "tauntAlt";
    return "taunt";
  }

  // BUG_9: match-intro pose — play the intro strip while the intro flag is set. If a specific
  // intro variant was assigned this match (Sasuke's random introPool via pickIntroVariant, or
  // Toji's fixed introSequence via initIntroVariant/advanceIntroSequence), render THAT action;
  // otherwise fall back to the shared "transform" intro slot. Character-agnostic generic infra:
  // with no variant set (every base/shared fighter) this is identical to `return "transform"`.
  if (fighter._introPlaying) return fighter._introVariant || "transform";

  // OMNI-MAN FORCED DESCENT (Smart Atoms depleted mid-flight): a locked, full-body "crashed out of
  // power" state — the tumble from the sky, then the crash-landing recovery pose. High priority (a
  // committed, uninterruptible sequence). No-op for anyone without the flags.
  if (fighter._forcedDescent) return "forcedDescent";
  if ((fighter._descentLandTimer || 0) > 0) return "descentLand";

  // Knockdown handling
  if (fighter.knockdownState) {
    // Prefer a dedicated knockdown pose when the fighter defines one (skin anim or
    // base animationData); otherwise keep the existing hurt fallback — unchanged
    // for every character WITHOUT a `knockdown` strip (Gojo/Sukuna/…).
    const kd = (fighter._skinAnim?.knockdown || fighter.animationData?.knockdown) ? "knockdown" : "hurt";
    // GET-UP CHAIN: a fighter that ALSO defines a `getup` strip (Goku Black) plays the knockdown
    // FALL pose for the down portion, then the getup RISE pose as it recovers, then idle. Fighters
    // WITHOUT a `getup` (Naruto/…) keep the legacy 12-frame knockdown→idle behaviour, unchanged.
    const hasGetup = !!(fighter._skinAnim?.getup || fighter.animationData?.getup);
    if (hasGetup) {
      if ((fighter._techDash || 0) > 0) return "dash";
      if ((fighter.knockdownTimer || 0) > GETUP_WINDOW) return kd;   // still down → FALL/sprawled pose
      if ((fighter.knockdownTimer || 0) > 0) return "getup";         // recovering → RISE pose
      return "idle";
    }
    if ((fighter.knockdownTimer || 0) > 12) return kd;
    if ((fighter._techDash || 0) > 0) return "dash";
    return "idle";
  }

  // ESCALATED combo-finisher recoil: when a real combo string against this fighter was capped
  // by a heavy/launcher (combat.applyNarutoComboFinisherReaction set the timer), play the
  // dedicated knockdown burst (Naruto → knocked_out_a) for the recoil instead of the standard
  // flinch. Gated on the fighter actually HAVING a knockdown strip, so it's a no-op for every
  // character without one (Gojo/Sukuna/… keep their normal "hurt"). Checked before the plain
  // hitstun→hurt fallback so it overrides it during the window.
  if ((fighter._comboFinisherReactTimer || 0) > 0 &&
      (fighter._skinAnim?.knockdown || fighter.animationData?.knockdown)) return "knockdown";

  // Hurt state takes priority once hitstun begins. Airborne hurt uses a dedicated
  // strip when the fighter defines one (Toji → hurt_air); otherwise the grounded
  // "hurt" — a no-op for every character WITHOUT a hurt_air strip.
  if ((fighter.hitstun || 0) > 0) {
    const airborne = !(fighter.grounded ?? fighter.onGround ?? false);
    if (airborne && (fighter._skinAnim?.hurt_air || fighter.animationData?.hurt_air)) return "hurt_air";
    // DEBBIE deceptive react (visual only): the DISPLAYED pose is mismatched from the real hit — a small
    // hit shows the big sprawl (knockdown pose), a big hit shows the tiny flinch. Gameplay is unchanged;
    // this only swaps which pose renders. No-op for every other fighter (flag unset).
    if (fighter._fakeReactVisual && !fighter.knockdownState) {
      if (fighter._fakeReactVisual === "heavy" && (fighter._skinAnim?.knockdown || fighter.animationData?.knockdown)) return "knockdown";
      return "hurt";
    }
    return "hurt";
  }
  if ((fighter.stun || 0) > 0) return "hurt";

  // Blocking — show a dedicated guard pose when the fighter defines one (skin anim
  // or base animationData); otherwise hold idle. Unchanged for every character
  // WITHOUT a `guard` strip (Gojo/Sukuna/… still show idle while blocking).
  // Gated on !attacking: a down-air (S+J in the air) holds Down, which sets isBlocking,
  // so without this the dive normal would render the guard pose instead of the attack.
  // An actively-attacking fighter always shows the attack over a simultaneous block-hold.
  // ALSO gated on no active sprite-cast: a Down+Special cast pose (Killua's Electric Ball) holds
  // Down → isBlocking, so without this the cast strip would be shadowed by the guard pose.
  if (fighter.isBlocking && !fighter.attacking && !((fighter._spriteCastTimer || 0) > 0 && fighter._spriteCastMove)) {
    return (fighter._skinAnim?.guard || fighter.animationData?.guard) ? "guard" : "idle";
  }

  // BUG_7/8: brief "sprite cast" window — projectile specials & domain opens set
  // a move + timer so their cast strip (blue_cast / hollow_purple_cast / domain
  // hand-sign) plays even though they don't go through the normal attacking path.
  if ((fighter._spriteCastTimer || 0) > 0 && fighter._spriteCastMove) {
    return MOVE_TO_ACTION[fighter._spriteCastMove] || fighter._spriteCastMove;
  }

  // Attack animation links directly to move name
  // Example: "light", "heavy", "special_purple"
  if (fighter.attacking) {
    const move = fighter.currentMove || fighter.currentAttack?.name;
    if (move) {
      // CROUCH-CONTEXT normal swap (Jason): a light/heavy started while crouching renders its dedicated
      // crouch strip (combat.js stamps _crouchAttackVariant on the crouch-start). Gated on the strip
      // existing → a pure no-op for every char without crouchLight/crouchHeavy (they use the standing normal).
      const cv = fighter._crouchAttackVariant;
      if (cv && (move === "light" || move === "heavy") &&
          (fighter._skinAnim?.[cv] || fighter.animationData?.[cv])) return cv;
      return MOVE_TO_ACTION[move] || move;
    }
  }

  // HOLD-TO-CHARGE pose — a fighter holding the charge button (isCharging) plays its dedicated
  // charge strip when it defines one (Goku Black's power-up aura, form-aware via _skinAnim). Gated
  // on the strip existing, so it's a no-op for every character WITHOUT one (they keep the procedural
  // aura + idle). Below hurt/block/cast/attack so getting hit still interrupts the pose.
  if (fighter.isCharging && (fighter._skinAnim?.charge || fighter.animationData?.charge)) return "charge";

  // Ultimate / transform states
  if (fighter.isUltimateActive) return "idle";
  // teleportFlash requests the "transform" morph strip — but ONLY if the fighter's ACTIVE anim set
  // (skin if one is applied, else base) actually HAS a transform strip. Otherwise it resolves to a
  // missing action → the fallback draws the idle sheet UNSLICED as one oversized cell (the "4 copies"
  // glitch). This bites right at the SSJ Rose cinematic→gameplay handoff: onResolve swaps _skinAnim to
  // SSJ_ROSE_ANIM (which has no transform) but leaves teleportFlash>10, so control returns on a bogus
  // "transform". Gating here mirrors every other branch (guard/knockdown/hurt_air) that checks the strip exists.
  const activeAnim = fighter._skinAnim || fighter.animationData;
  if ((fighter.teleportFlash || 0) > 10 && activeAnim?.transform) return "transform";

  // OMNI-MAN FLIGHT (Stage 3): the toggleable hover MODE — a movement state (below attack/cast/hurt so
  // a mid-flight punch or hit still shows the right pose). flyMove = streaking with horizontal speed;
  // fly = neutral hover. Resolved before the generic air state (he's airborne while flying).
  if (fighter._flightActive) {
    return (Math.abs(fighter.vx || 0) > 1 && (fighter._skinAnim?.flyMove || fighter.animationData?.flyMove)) ? "flyMove" : "fly";
  }

  // Air state
  const grounded = fighter.grounded ?? fighter.onGround ?? false;
  if (!grounded) {
    if (fighter.airDashing) {
      // ICHIGO 8-way aerial dash: use the directional-dash strip when the fighter ships one and
      // physics stamped a direction index. Everyone else (and Ichigo with no dashDir art) → plain dash.
      if (fighter._dashDirIdx != null && (fighter._skinAnim?.dashDir || fighter.animationData?.dashDir)) return "dashDir";
      return "dash";
    }
    // JUMP-COUNT-AWARE double-jump strip: on the 2nd (or later) jump, prefer a
    // dedicated `doubleJump` action when the fighter defines one. jumpCount is
    // maintained by physics.js (incremented per jump, reset on landing). Generic —
    // any character that ships double-jump art gets it; only Rick currently does.
    // Shown on the ASCENT (vy <= fall threshold); descent still uses "fall".
    if ((fighter.jumpCount || 0) >= 2 &&
        (fighter._skinAnim?.doubleJump || fighter.animationData?.doubleJump) &&
        (fighter.vy || 0) <= 6) return "doubleJump";
    if ((fighter.vy || 0) > 6) return "fall";
    return "jump";
  }

  // CROUCH: hold Down while grounded + stationary → dedicated crouch strip. Opt-in via fighter.crouchIdle
  // (charDef movement.crouchIdle) AND the char shipping an animationData.crouch (physics.js stamps
  // _crouching). Double-gated so chars that ship a crouch strip ONLY for crouch-ATTACK variants
  // (Obito/Nezuko/Miwa/Ghostface) keep their standing idle while crouching, unchanged. Mirrors the
  // runWhenAdvancing/idleLow opt-in pattern. Below attack/hurt/knockdown so a crouch-normal still animates.
  if (fighter._crouching && fighter.crouchIdle && (fighter._skinAnim?.crouch || fighter.animationData?.crouch)) return "crouch";

  // Ground movement. Backpedalling (moving OPPOSITE to facing = away from the
  // opponent) plays WALK, never run — only forward momentum or an actual dash uses
  // the run/dash strip. The sprite still faces the enemy either way, so a backward
  // walk reads as a proper retreat instead of a sprint. (Applies to all fighters.)
  if ((fighter.dashTimer || 0) > 0) return "dash";
  const gvx = fighter.vx || 0;
  const movingForward = Math.sign(gvx) === (fighter.facing ?? 1);
  if (Math.abs(gvx) > 10 && movingForward) return "run";
  // Opt-in run-cycle chars (Tobirama): forward movement plays RUN at any speed, since
  // normal walking never crosses the >10 threshold above. Backpedal still falls to walk.
  if (fighter.runWhenAdvancing && movingForward && Math.abs(gvx) > 0.1) return "run";
  if (Math.abs(gvx) > 0.1) return "walk";

  // LOW-HEALTH COSMETIC IDLE: a fighter flagged _lowHealthIdle that ships an `idleLow` strip shows a
  // wounded idle at the neutral pose (Zaraki). game.js sets/clears the flag on a HP threshold; this is
  // purely visual (no stat/hitbox change) and only swaps the standing idle — every other state (walk/
  // hurt/guard/attack) is untouched. No-op for every char without both the flag and an idleLow strip.
  if (fighter._lowHealthIdle && (fighter._skinAnim?.idleLow || fighter.animationData?.idleLow)) return "idleLow";

  // Default fallback
  return "idle";
}

// ─────────────────────────────────────────────────────────────────
// SPRITE HANDLER
// ─────────────────────────────────────────────────────────────────
export class SpriteHandler {
  constructor() {
    this.animations = {};
    this.currentAction = "idle";
    this.frameIndex = 0;
    this.frameTimer = 0;

    this._actionDef = null;
    this.locked = false;
    this._spawnFired = false;
  }

  determineAction(fighter) {
    return _resolveAction(fighter, this.currentAction);
  }

  draw(ctx, fighter, spritesheets = null, _camera = null) {
    if (!ctx || !fighter) return;

    const action = this.determineAction(fighter);
    fighter._lastSpriteAction = action;

    // Reset animation index and timer when switching actions
    if (this.currentAction !== action) {
      this.currentAction = action;
      this.frameIndex = 0;
      this.frameTimer = 0;
      this.locked = false;
      this._spawnFired = false;
    }

    const charKey = (fighter.rosterKey || fighter.id || "").toLowerCase();

    // Prefer animationProfile action definition if available (skin-aware).
    const profileAction = this._getActionDef(charKey, action, fighter._skinAnim);
    this._actionDef = profileAction;

    // Reset frame state when the underlying SHEET changes even if the action NAME
    // is unchanged. Needed for _skinAnim body-swaps that keep the same action key
    // (e.g. Sasuke Susanoo Lvl1→Lvl2: both are "idle" but lvl_1.png has 5 frames /
    // lvl_2.png has 4 — a stale frameIndex would slice out-of-bounds garbage and the
    // handler could keep animating the old sheet's frame). Keying on the sheet path
    // forces a clean restart on the swap.
    if (this._lastSheetKey !== profileAction.sheet) {
      this._lastSheetKey = profileAction.sheet;
      this.frameIndex = 0;
      this.frameTimer = 0;
      this._spawnFired = false;
    }

    // Support legacy passed-in spritesheets/actionData too
    const legacySheet =
      spritesheets?.[action] ||
      spritesheets?.idle ||
      null;

    const legacyFrameData =
      fighter.animationData?.[action] ||
      fighter.animationData?.idle ||
      null;

    // MISSING-ACTION SAFE FALLBACK (fixes the "four sprites" / unsliced-atlas glitch class). When an
    // action isn't in this fighter's anim set, _getActionDef returns the bare 128²×4 _FALLBACK
    // (sheet:null). The ONLY safe things to draw then are (i) the fighter's OWN idle sheet AT IDLE'S
    // dims — one clean idle pose — or (ii) the procedural box. The old code drew the legacy idle sheet
    // but sliced it at the fallback's 128×128×4 pitch, which grids a small idle strip (e.g. Itachi's
    // 168px idle) into several mini-copies that then ride the hit's upward knockback → "four sprites
    // going up". `fellBack` detects the bare fallback; `dim` then sources the SLICING dims from the
    // idle def (legacyFrameData) so the sheet slices cleanly, and we load idle's own sheet to match.
    const fellBack = !profileAction.sheet;
    const dim = (fellBack && legacyFrameData?.sheet) ? legacyFrameData : profileAction;

    let sheet = profileAction.sheet ? _loadSheet(profileAction.sheet)
              : (fellBack && legacyFrameData?.sheet ? _loadSheet(legacyFrameData.sheet) : legacySheet);

    // UNWIRED-PLACEHOLDER GUARD: a truly unwired action (no profile sheet AND no idle fallback sheet —
    // a procedural fighter with no animationData) still falls back to the box, matching the old intent.
    if (!profileAction.sheet && !legacyFrameData?.sheet) sheet = null;

    const frameData = {
      // SLICING dims come from `dim` — the fighter's idle def when we fell back (so a small idle strip
      // slices into ONE clean pose, not a 128-pitch grid), else the action's own profile def (unchanged).
      frames: dim.frames ?? legacyFrameData?.frames ?? 1,
      width: dim.width ?? legacyFrameData?.width ?? 128,
      height: dim.height ?? legacyFrameData?.height ?? 128,
      speed: dim.speed ?? legacyFrameData?.speed ?? 5,
      loop: profileAction.loop ?? (!fighter.attacking),
      lockLastFrame: profileAction.lockLastFrame ?? !!fighter.attacking,
      // TWO-PART loop support: frames [0, loopStart) are a one-shot BUILDUP; on reaching the end a
      // looping strip resets to `loopStart` (not 0), so only the tail [loopStart, frames) repeats.
      // Default 0 → identical whole-strip loop as before (every existing action unchanged).
      loopStart: dim.loopStart ?? legacyFrameData?.loopStart ?? 0,
      anchorX: profileAction.anchorX ?? 0,
      anchorY: dim.anchorY ?? profileAction.anchorY ?? 0,
      // Atlas support: top-left source origin of this action's frames inside the
      // sheet. Default 0/0 → frames start at (0,0) = every existing strip is unchanged.
      sourceX: dim.sourceX ?? legacyFrameData?.sourceX ?? 0,
      sourceY: dim.sourceY ?? legacyFrameData?.sourceY ?? 0,
      spawn: profileAction.spawn,
      behavior: profileAction.behavior
    };

    // Safety check
    if (!frameData) return;

    const drawWidth = frameData.width;
    const drawHeight = frameData.height;

    const fighterW = fighter.w ?? fighter.width ?? 60;
    const fighterH = fighter.h ?? fighter.height ?? 110;

    // Per-character DISPLAY scale. Source frames are small pixel art; scale the
    // DESTINATION draw size up to roughly fill the hitbox. Source slicing stays
    // at native drawWidth/drawHeight (the SOURCE rect below); only the drawn size
    // scales. Defaults to 1 → identical to before for every other character.
    let scale = fighter.spriteScale ?? this._actionDef?.spriteScale ?? 1;

    // CANVAS-RELATIVE GIANT SIZING: a fighter can request a display height as a
    // FRACTION of the live canvas height (mirrors kurama.js sizing its fox at
    // bodyH = ch * 0.74) so giant forms read as massive on any resolution instead
    // of a small fixed multiple of their sprite cells. `_canvasHeightRefH` is the
    // REFERENCE native cell height (the body cell) so every action — body, grab,
    // arrow — scales by the SAME factor and stays proportional to the body.
    // An action carrying its own `actionScale` (e.g. Gon's Adult-Form transform/finalblow cells,
    // already sized for the adult body) is EXEMPT — it uses its actionScale path below instead, so
    // a giant-frac character's actionScale cells don't get double-scaled. Every existing giant
    // (Susanoo/Guanyin) has no actionScale action, so this guard is a no-op for them.
    if (fighter._canvasHeightFrac && fighter._canvasHeightRefH && ctx.canvas?.height && !this._actionDef?.actionScale) {
      scale = (ctx.canvas.height * fighter._canvasHeightFrac) / fighter._canvasHeightRefH;
    }

    // Per-ACTION scale correction: an action may carry `actionScale` to render at a
    // different proportion than the character's global spriteScale. Used for Toji's
    // remaining OLD row-sheet actions (block/transform/grab/air/specials), whose art was
    // never tuned for the 2.3 spriteScale of the new transparent-bg sheets — without this
    // they render ~1.3x oversized. Guarded on the field → zero effect elsewhere.
    // (Sasuke giant sizing above and Toji actionScale are mutually exclusive per-character.)
    if (this._actionDef?.actionScale) scale *= this._actionDef.actionScale;

    // TRAP SHRINK (Isshiki Daikokuten cube) — the MIRROR-IMAGE of the giant `_canvasHeightFrac` technique
    // (same render-scale approach, scaling DOWN instead of up): a dedicated multiplier that shrinks the
    // sprite in place, feet planted (exactly as the giants stay planted while growing up), while a fighter
    // is trapped inside the cube. A plain scalar (NOT canvas-relative) so it carries NONE of the giant
    // baggage — no giant-bob, no giant-hurtbox path, no transient-giant copy-guards. Guarded on the field
    // → EXACTLY zero effect on every other fighter/frame.
    if (fighter._trapShrinkFrac != null && fighter._trapShrinkFrac < 1) scale *= fighter._trapShrinkFrac;

    const dstW = drawWidth * scale;
    const dstH = drawHeight * scale;
    fighter._lastDstH = dstH;   // rendered cell height (scale-correctness checks / harness)

    // Center horizontally over the hitbox (using SCALED width)
    const offsetX = (dstW - fighterW) / 2 + (frameData.anchorX || 0);

    // Anchor to the bottom of the hitbox (using SCALED height) so feet stay planted
    const offsetY = (dstH - fighterH) + (frameData.anchorY || 0);

    // GIANT idle bob (Kurama-style continuous motion): giant forms (canvas-relative sizing) add a
    // slow, continuous sine RISE so the towering body reads as smoothly alive between the slow
    // pose-holds, instead of snapping frame-to-frame. Rectified sine (0..1) → the sprite only ever
    // rises above its planted rest, never sinks below the floor, so feet stay planted. Guarded on
    // _canvasHeightFrac → exactly zero effect on every normal-scale fighter.
    let bobUp = 0;
    if (fighter._canvasHeightFrac) {
      this._giantBobClock = (this._giantBobClock || 0) + 1;
      bobUp = (Math.sin(this._giantBobClock * 0.045) * 0.5 + 0.5) * dstH * 0.018;
    }
    const drawY = fighter.y - offsetY - bobUp;

    // Record the giant's actual drawn Y + bob offset so an automated harness can
    // observe temporal smoothness (the sine bob can't be seen in a single frame).
    // Also record the rendered box (top Y + scaled W/H) so combat.getHurtbox can size
    // the giant's hurtbox to the VISIBLE body instead of the tiny physics box — these
    // are the result of the canvas-relative sizing math (dstH/dstW = cell × scale).
    // Giant-only → no per-frame writes on normal fighters.
    if (fighter._canvasHeightFrac) {
      fighter._lastDrawY = drawY;
      fighter._lastBobUp = bobUp;
      fighter._lastDrawH = dstH;
      fighter._lastDrawW = dstW;
    }

    // Record the WORLD-space drawn rect for EVERY fighter (cheap) so on-top overlays — e.g. Rick's
    // Void Form cosmic starfield — can track the sprite's exact drawn position/scale across all poses.
    // World left edge is fighter.x - offsetX for both facings (the flip mirrors content in place).
    // combat.getHurtbox only consumes _lastDraw* under the _canvasHeightFrac (giant) guard, so normal
    // fighters are unaffected there.
    fighter._lastDrawX = fighter.x - offsetX;
    fighter._lastDrawY = drawY;
    fighter._lastDrawW = dstW;
    fighter._lastDrawH = dstH;

    // ICHIGO directional air-dash: pin the displayed frame to the held dash direction (physics stamps
    // _dashDirIdx). Fighter-gated → zero effect on anyone else. Clamp so a stale index never slices OOB.
    if (fighter._dashDirIdx != null && this.currentAction === "dashDir") {
      this.frameIndex = Math.min(fighter._dashDirIdx, (frameData.frames || 1) - 1);
    }

    const sx = (frameData.sourceX || 0) + this.frameIndex * drawWidth;
    const sy = (frameData.sourceY || 0);

    ctx.save();
    ctx.imageSmoothingEnabled = false;   // crisp upscaled pixel art

    if (_sheetReady(sheet)) {
      // Skill Hunter: wash the copied body in Chrollo's purple possession tint (see SKILL_HUNTER_TINT).
      if (fighter._shActive) ctx.filter = SKILL_HUNTER_TINT;
      else if (fighter._reincarnated) ctx.filter = TOJI_REINCARNATED_TINT;   // Toji Reincarnated Form — crimson wash
      // Edo Tensei reanimation: sickly pale green-gray "undead corpse" wash over the vessel's BASE art.
      else if (fighter._edoActive) ctx.filter = EDO_REANIM_TINT;

      if ((fighter.facing ?? 1) === -1) {
        ctx.scale(-1, 1);

        ctx.drawImage(
          sheet,
          sx,
          sy,
          drawWidth,         // source rect = native frame size
          drawHeight,
          -fighter.x + offsetX - dstW,   // flip math uses SCALED width
          drawY,
          dstW,              // destination size = scaled
          dstH
        );
      } else {
        ctx.drawImage(
          sheet,
          sx,
          sy,
          drawWidth,         // source rect = native frame size
          drawHeight,
          fighter.x - offsetX,
          drawY,
          dstW,              // destination size = scaled
          dstH
        );
      }
    } else {
      // Fallback procedural box
      this._drawBox(ctx, fighter.x, fighter.y, fighterW, fighterH, fighter);
    }

    ctx.restore();

    // (A rotating spin/blur "_speedBlur" ghost-copy overlay was drawn here for speed-tier teleport-
    // dashes; it obscured the dash sprite into an unreadable swirl and was REMOVED. Speed-tier chars
    // now show their real dash sprite on the blink via the dash-pose default in game.js.)

    // Pause animation during hitstop OR while the game is paused. The pause
    // render path still calls draw(), which would otherwise keep advancing
    // frames; game.js sets fighter._animFrozen while in the PAUSED state.
    // domainFrozen (Task 3) holds the current frame as well as the action, so the
    // enemy is locked on a single still pose for the whole of Gojo's domain.
    // _timeSlowFlag: Killua's Godspeed time-slow skips the opponent's update on a fraction of frames;
    // holding its animation on those same frames makes the slowed frame-rate read on the sprite too.
    if ((fighter.hitstop || 0) <= 0 && !fighter._animFrozen && !fighter.domainFrozen && !fighter._timeSlowFlag) {
      this.updateFrames(frameData, fighter);
    }

    // Spawn event support
    this._checkSpawn(frameData, fighter);
  }

  updateFrames(frameData, fighter) {
    if (this.locked) return;

    this.frameTimer++;

    let speed = frameData.speed || 5;

    // Dynamically adjust animation speed if tied to a specific attack duration
    if (fighter.attacking && fighter.currentAttack) {
      const totalFrames = frameData.frames || 1;
      const totalDuration = fighter.currentAttack.total || speed * totalFrames;

      // Spread the animation evenly across the attack's total physical frames
      speed = Math.max(1, Math.floor(totalDuration / totalFrames));
    }
    // LOCOMOTION FEEL: scale the walk/run/dash leg-cycle to the fighter's ACTUAL horizontal velocity, so a
    // faster mover plays a proportionally faster cycle (feet stay planted → reads as fast). WITHOUT this the
    // cycle rate is a fixed per-strip constant, so a 9.5px/f sprinter and a 6.75px/f walker share ONE rate:
    // the fast fighter's feet "skate" and high Speed stats never visually land ("stat says fast, looks normal").
    // Proportional to |vx| around a roster-AVERAGE reference velocity, so average-speed characters are
    // UNCHANGED; faster characters (Toji/Flash/Minato) speed up, slower ones slow down. Clamped so it never
    // gets silly (a very fast dash / buff-form velocity can't blur into strobing, and a crawl can't freeze).
    else if (!fighter.attacking && !(typeof globalThis !== "undefined" && globalThis.__locoScaleOff) &&
             (this.currentAction === "walk" || this.currentAction === "run" || this.currentAction === "dash")) {
      const vx = Math.abs(fighter.vx || 0);
      if (vx > 0.2) {
        const LOCO_REF_VX = 6.75;   // ≈ average-speed (Speed ~87) walk velocity → those characters unchanged
        const mult = Math.min(1.7, Math.max(0.5, LOCO_REF_VX / vx));
        speed = Math.max(1, Math.round(speed * mult));
      }
    }

    if (this.frameTimer >= speed) {
      this.frameIndex++;
      this.frameTimer = 0;

      const total = frameData.frames || 1;

      if (this.frameIndex >= total) {
        if (frameData.loop) {
          // Loop movement and idle animations. `loopStart` (default 0) restarts the loop past a
          // one-shot buildup section so only the tail repeats (e.g. Goku Black's charge aura).
          this.frameIndex = Math.min(frameData.loopStart || 0, total - 1);
        } else if (frameData.lockLastFrame || fighter.attacking) {
          // Lock onto the final recovery frame until the combat phase ends
          this.frameIndex = total - 1;
          this.locked = true;
        } else {
          this.frameIndex = total - 1;
        }
      }
    }
  }

  _getActionDef(charKey, actionKey, skinAnim = null) {
    try {
      const def = _getAction(charKey, actionKey, skinAnim);
      if (def) return def;
    } catch (_) {}

    return { ..._FALLBACK, sheet: null };
  }

  _checkSpawn(actionDef, fighter) {
    if (!actionDef?.spawn || this._spawnFired) return;
    if (this.frameIndex < (actionDef.spawn.spawnFrame ?? 0)) return;

    this._spawnFired = true;
    fighter._pendingSpawn = {
      type: actionDef.spawn.type,
      projectileKey: actionDef.spawn.projectileKey || null,
      summonKey: actionDef.spawn.summonKey || null,
      effectKey: actionDef.spawn.effectKey || null,
      behavior: actionDef.behavior,
      origin: {
        x: fighter.x,
        y: fighter.y,
        facing: fighter.facing
      }
    };
  }

  _drawBox(ctx, x, y, w, h, fighter) {
    const flash = (fighter.colorFlash || 0) > 0;

    // MK-feel Stage 5 (Landmine 2): Toji's three stances are functionally DIFFERENT movesets that were
    // only ever telegraphed by his sprites. Now that he can render as a procedural box, tint the box per
    // stance so the three are visually distinguishable (paired with the HUD stance label in game.js).
    const STANCE_TINT = { blade: "#4aa3df", chain: "#e0a145", gun: "#8a8f98" };
    const stanceTint = fighter.weaponStance ? STANCE_TINT[fighter.weaponStance] : null;

    ctx.fillStyle = flash
      ? "#ffffff"
      : (stanceTint || fighter.color || (fighter.side === "p1" ? "#3b82f6" : "#ef4444"));

    _rrect(ctx, x, y, w, h, 12);
    ctx.fill();

    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 2;
    _rrect(ctx, x, y, w, h, 12);
    ctx.stroke();

    // Head
    ctx.fillStyle = "#fde68a";
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h * 0.12, h * 0.11, 0, Math.PI * 2);
    ctx.fill();

    // Facing dot
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    const dotX = (fighter.facing ?? 1) >= 0 ? x + w - 14 : x + 6;
    ctx.beginPath();
    ctx.arc(dotX, y + h * 0.2, 5, 0, Math.PI * 2);
    ctx.fill();

    // Name
    if (fighter.name) {
      ctx.font = "bold 11px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.fillStyle = "#ffffff";
      ctx.fillText(fighter.name, x + w / 2, y - 4);
    }
  }

  isFinished() {
    if (!this._actionDef) return true;
    if (this._actionDef.loop) return false;
    return this.frameIndex >= (this._actionDef.frames || 1) - 1;
  }

  isPlaying(key) {
    return this.currentAction === key;
  }

  getCurrentFrame() {
    return this.frameIndex;
  }

  getCurrentAction() {
    return this.currentAction;
  }
}

// ─────────────────────────────────────────────────────────────────
// PENDING SPAWN PROCESSOR
// Call from game.js each frame after fighter updates.
// ─────────────────────────────────────────────────────────────────
export function processPendingSpawns(fighter, context = {}) {
  if (!fighter?._pendingSpawn) return;

  const pending = fighter._pendingSpawn;
  fighter._pendingSpawn = null;

  const { spawnProjectile, spawnSummon, spawnEffect, getOpponent } = context;

  try {
    switch (pending.type) {
      case "projectile":
        if (typeof spawnProjectile === "function" && pending.projectileKey) {
          spawnProjectile(fighter, pending.projectileKey, {}, context);
        }
        break;

      case "summon":
        if (typeof spawnSummon === "function" && pending.summonKey) {
          const target =
            typeof getOpponent === "function" ? getOpponent(fighter) : null;
          spawnSummon(fighter, { summonId: pending.summonKey }, target);
        }
        break;

      case "effect":
        if (typeof spawnEffect === "function" && pending.effectKey) {
          spawnEffect(fighter, pending.effectKey, pending.origin, context);
        }
        break;
    }
  } catch (_) {}
}

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
function _rrect(ctx, x, y, w, h, r = 10) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
