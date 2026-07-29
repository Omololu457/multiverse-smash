// sprite.js
// Combined sprite handler:
// - Self-contained sprite renderer
// - Optional animationProfile.js support
// - Hitstop freeze, hurt priority, attack-name action routing
// - Anchoring, directional flipping, frame syncing to attack duration
// - Fallback box renderer
// - Spawn events for projectiles/summons/effects
//
// Exports: SpriteHandler, preloadCharacterSprites, processPendingSpawns

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
  grab: "grab",

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

  // Saiki Kusuo: rekka cast poses + burst/lightning/bomb cast poses. Identity maps (currentMove /
  // _spriteCastMove === action key) — explicit so a recovery/cast tail can never resolve to the 128² box.
  saikiChain1: "saikiChain1",
  saikiChain2: "saikiChain2",
  saikiChain3: "saikiChain3",
  saikiChainFin: "saikiChainFin",
  saikiBurst: "saikiBurst",
  saikiLightning: "saikiLightning",
  saikiBomb: "saikiBomb",

  blue: "blue_cast",
  red: "red_cast",
  hollowPurple: "hollow_purple_cast",

  divineDogs: "divine_dogs",
  nue: "nue",
  toad: "toad",
  rabbitEscape: "rabbit_escape",
  maxElephant: "max_elephant",
  mahoragaRitual: "ultimate",

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
  if (fighter._tauntPlaying) return "taunt";

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
    if (move) return MOVE_TO_ACTION[move] || move;
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
    if (fighter.airDashing) return "dash";
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

    const sx = (frameData.sourceX || 0) + this.frameIndex * drawWidth;
    const sy = (frameData.sourceY || 0);

    ctx.save();
    ctx.imageSmoothingEnabled = false;   // crisp upscaled pixel art

    if (_sheetReady(sheet)) {
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

    ctx.fillStyle = flash
      ? "#ffffff"
      : (fighter.color || (fighter.side === "p1" ? "#3b82f6" : "#ef4444"));

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
