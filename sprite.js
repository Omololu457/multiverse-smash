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

  // Freeze visible animation during hitstop
  if ((fighter.hitstop || 0) > 0) return currentAction || fighter._lastSpriteAction || "idle";

  // Knockdown handling
  if (fighter.knockdownState) {
    if ((fighter.knockdownTimer || 0) > 12) return "hurt";
    if ((fighter._techDash || 0) > 0) return "dash";
    return "idle";
  }

  // Hurt state takes priority once hitstun begins
  if ((fighter.hitstun || 0) > 0) return "hurt";
  if ((fighter.stun || 0) > 0) return "hurt";

  // Blocking fallback
  if (fighter.isBlocking) return "idle";

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

  // Ground movement
  if ((fighter.dashTimer || 0) > 0) return "dash";
  if (Math.abs(fighter.vx || 0) > 10) return "run";
  if (Math.abs(fighter.vx || 0) > 0.1) return "walk";

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

    // Prefer animationProfile action definition if available
    const profileAction = this._getActionDef(charKey, action);
    this._actionDef = profileAction;

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
      spawn: profileAction.spawn,
      behavior: profileAction.behavior
    };

    // Safety check
    if (!frameData) return;

    const drawWidth = frameData.width;
    const drawHeight = frameData.height;

    const fighterW = fighter.w ?? fighter.width ?? 60;
    const fighterH = fighter.h ?? fighter.height ?? 110;

    // Center horizontally over the hitbox
    const offsetX = (drawWidth - fighterW) / 2 + (frameData.anchorX || 0);

    // Anchor to the bottom of the hitbox
    const offsetY = (drawHeight - fighterH) + (frameData.anchorY || 0);

    const sx = this.frameIndex * drawWidth;
    const sy = 0;

    ctx.save();

    if (_sheetReady(sheet)) {
      if ((fighter.facing ?? 1) === -1) {
        ctx.scale(-1, 1);

        ctx.drawImage(
          sheet,
          sx,
          sy,
          drawWidth,
          drawHeight,
          -fighter.x + offsetX - drawWidth,
          fighter.y - offsetY,
          drawWidth,
          drawHeight
        );
      } else {
        ctx.drawImage(
          sheet,
          sx,
          sy,
          drawWidth,
          drawHeight,
          fighter.x - offsetX,
          fighter.y - offsetY,
          drawWidth,
          drawHeight
        );
      }
    } else {
      // Fallback procedural box
      this._drawBox(ctx, fighter.x, fighter.y, fighterW, fighterH, fighter);
    }

    ctx.restore();

    // Pause animation completely during hitstop
    if ((fighter.hitstop || 0) <= 0) {
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

  _getActionDef(charKey, actionKey) {
    try {
      const def = _getAction(charKey, actionKey);
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
