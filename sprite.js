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
  nerveStrike: "special_1",
  manipulativeBlast: "special_1",
  primePortalBlast: "special_1",

  ultimate: "ultimate",
  transform: "transform",
  domain: "domain"
};

// ─────────────────────────────────────────────────────────────────
// ACTION RESOLVER
// Combines your simple priority flow with extra states from the
// larger self-contained version.
// ─────────────────────────────────────────────────────────────────
function _resolveAction(fighter, currentAction = "idle") {
  if (!fighter) return "idle";

  // Task 3: Gojo's Unlimited Void FREEZES the trapped enemy on the exact frame
  // they were in. Hold whatever action was last resolved (mid-jump → "jump",
  // mid-walk → "walk") and never switch to a hurt pose, even though they're
  // locked. Frame advancement is also halted in updateFrames() below.
  if (fighter.domainFrozen) return fighter._lastSpriteAction || currentAction || "idle";

  // Freeze visible animation during hitstop
  if ((fighter.hitstop || 0) > 0) return currentAction || fighter._lastSpriteAction || "idle";

  // BUG_9: match-intro pose — play the intro strip while the intro flag is set. If a specific
  // intro variant was assigned this match (Sasuke's random introPool via pickIntroVariant, or
  // Toji's fixed introSequence via initIntroVariant/advanceIntroSequence), render THAT action;
  // otherwise fall back to the shared "transform" intro slot. Character-agnostic generic infra:
  // with no variant set (every base/shared fighter) this is identical to `return "transform"`.
  if (fighter._introPlaying) return fighter._introVariant || "transform";

  // Knockdown handling
  if (fighter.knockdownState) {
    // Prefer a dedicated knockdown pose when the fighter defines one (skin anim or
    // base animationData); otherwise keep the existing hurt fallback — unchanged
    // for every character WITHOUT a `knockdown` strip (Gojo/Sukuna/…).
    const kd = (fighter._skinAnim?.knockdown || fighter.animationData?.knockdown) ? "knockdown" : "hurt";
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

  // Hurt state takes priority once hitstun begins
  if ((fighter.hitstun || 0) > 0) return "hurt";
  if ((fighter.stun || 0) > 0) return "hurt";

  // Blocking — show a dedicated guard pose when the fighter defines one (skin anim
  // or base animationData); otherwise hold idle. Unchanged for every character
  // WITHOUT a `guard` strip (Gojo/Sukuna/… still show idle while blocking).
  if (fighter.isBlocking) {
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

  // Ultimate / transform states
  if (fighter.isUltimateActive) return "idle";
  if ((fighter.teleportFlash || 0) > 10) return "transform";

  // Air state
  const grounded = fighter.grounded ?? fighter.onGround ?? false;
  if (!grounded) {
    if (fighter.airDashing) return "dash";
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

    const sheet = profileAction.sheet ? _loadSheet(profileAction.sheet) : legacySheet;

    const frameData = {
      frames: profileAction.frames ?? legacyFrameData?.frames ?? 1,
      width: profileAction.width ?? legacyFrameData?.width ?? 128,
      height: profileAction.height ?? legacyFrameData?.height ?? 128,
      speed: profileAction.speed ?? legacyFrameData?.speed ?? 5,
      loop: profileAction.loop ?? (!fighter.attacking),
      lockLastFrame: profileAction.lockLastFrame ?? !!fighter.attacking,
      anchorX: profileAction.anchorX ?? 0,
      anchorY: profileAction.anchorY ?? 0,
      // Atlas support: top-left source origin of this action's frames inside the
      // sheet. Default 0/0 → frames start at (0,0) = every existing strip is unchanged.
      sourceX: profileAction.sourceX ?? legacyFrameData?.sourceX ?? 0,
      sourceY: profileAction.sourceY ?? legacyFrameData?.sourceY ?? 0,
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
    if (fighter._canvasHeightFrac && fighter._canvasHeightRefH && ctx.canvas?.height) {
      scale = (ctx.canvas.height * fighter._canvasHeightFrac) / fighter._canvasHeightRefH;
    }

    const dstW = drawWidth * scale;
    const dstH = drawHeight * scale;

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
    if ((fighter.hitstop || 0) <= 0 && !fighter._animFrozen && !fighter.domainFrozen) {
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
          // Loop movement and idle animations
          this.frameIndex = 0;
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
