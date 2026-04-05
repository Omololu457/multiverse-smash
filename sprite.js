// =====================================================
// SPRITE MANAGER
// Loads portraits, single images, and sprite sheets
// Draws animation frames for fighters
// =====================================================

export const spriteCache = {}

// ------------------------------
// Load a single image
// ------------------------------
export function loadImage(path) {
  if (!path) return null

  if (spriteCache[path]) return spriteCache[path]

  const img = new Image()
  img.src = path

  spriteCache[path] = {
    type: "image",
    image: img,
    loaded: false,
    error: false,
    width: 0,
    height: 0
  }

  img.onload = () => {
    spriteCache[path].loaded = true
    spriteCache[path].width = img.width
    spriteCache[path].height = img.height
  }

  img.onerror = () => {
    spriteCache[path].error = true
    console.warn(`Failed to load image: ${path}`)
  }

  return spriteCache[path]
}

// ------------------------------
// Load a sprite sheet
// config:
// {
//   path,
//   frameCount,
//   columns,
//   rows,
//   frameWidth,
//   frameHeight
// }
// frameWidth / frameHeight are optional
// if missing, they are auto-calculated from columns/rows
// ------------------------------
export function loadSpriteSheet(config) {
  if (!config || !config.path) return null

  const path = config.path
  if (spriteCache[path]) return spriteCache[path]

  const img = new Image()
  img.src = path

  spriteCache[path] = {
    type: "sheet",
    image: img,
    loaded: false,
    error: false,
    width: 0,
    height: 0,
    frameCount: config.frameCount || 1,
    columns: config.columns || 1,
    rows: config.rows || 1,
    frameWidth: config.frameWidth || 0,
    frameHeight: config.frameHeight || 0
  }

  img.onload = () => {
    const sprite = spriteCache[path]
    sprite.loaded = true
    sprite.width = img.width
    sprite.height = img.height

    if (!sprite.frameWidth) {
      sprite.frameWidth = Math.floor(img.width / sprite.columns)
    }

    if (!sprite.frameHeight) {
      sprite.frameHeight = Math.floor(img.height / sprite.rows)
    }
  }

  img.onerror = () => {
    spriteCache[path].error = true
    console.warn(`Failed to load sprite sheet: ${path}`)
  }

  return spriteCache[path]
}

// ------------------------------
// Preload character art
// Expects character object with:
// portrait
// winSprite
// sprites: { idle, walk, jump, ... }
// ------------------------------
export function preloadCharacterSprites(character) {
  if (!character) return

  if (character.portrait) {
    loadImage(character.portrait)
  }

  if (character.winSprite) {
    loadImage(character.winSprite)
  }

  if (character.sprites) {
    for (const stateName in character.sprites) {
      loadSpriteSheet(character.sprites[stateName])
    }
  }
}

// ------------------------------
// Initialize fighter animation state
// Call this once when creating fighter
// ------------------------------
export function initializeFighterAnimation(fighter) {
  if (!fighter) return

  fighter.animState = "idle"
  fighter.animFrame = 0
  fighter.animTimer = 0
  fighter.animSpeed = 8
  fighter.animFinished = false
}

// ------------------------------
// Change fighter animation
// Resets frame if state changes
// ------------------------------
export function setAnimationState(fighter, state, speed = 8) {
  if (!fighter) return
  if (!state) return

  if (fighter.animState !== state) {
    fighter.animState = state
    fighter.animFrame = 0
    fighter.animTimer = 0
    fighter.animFinished = false
  }

  fighter.animSpeed = speed
}

// ------------------------------
// Get sprite definition for current fighter state
// Falls back to idle if missing
// ------------------------------
export function getSpriteDefinition(character, state) {
  if (!character || !character.sprites) return null
  return character.sprites[state] || character.sprites.idle || null
}

// ------------------------------
// Update animation frame
// loop = whether to loop animation
// ------------------------------
export function updateAnimationFrame(fighter, loop = true) {
  if (!fighter || !fighter.sprites) return

  const def = getSpriteDefinition(fighter, fighter.animState)
  if (!def) return

  const sprite = spriteCache[def.path]
  if (!sprite || !sprite.loaded) return

  const maxFrames = Math.min(def.frameCount || 1, sprite.columns * sprite.rows)

  fighter.animTimer++

  if (fighter.animTimer >= (fighter.animSpeed || 8)) {
    fighter.animTimer = 0
    fighter.animFrame++

    if (fighter.animFrame >= maxFrames) {
      if (loop) {
        fighter.animFrame = 0
      } else {
        fighter.animFrame = maxFrames - 1
        fighter.animFinished = true
      }
    }
  }
}

// ------------------------------
// Draw a portrait image
// ------------------------------
export function drawPortrait(ctx, path, x, y, w, h) {
  const sprite = spriteCache[path]
  if (!sprite || !sprite.loaded) return false

  ctx.drawImage(sprite.image, x, y, w, h)
  return true
}

// ------------------------------
// Draw a single image (like win pose)
// ------------------------------
export function drawSingleImage(ctx, path, x, y, w, h) {
  const sprite = spriteCache[path]
  if (!sprite || !sprite.loaded) return false

  ctx.drawImage(sprite.image, x, y, w, h)
  return true
}

// ------------------------------
// Draw current fighter animation frame
// drawScale lets you scale the sprite larger/smaller
// offsetX / offsetY help place sprite over hurtbox
// flipX flips character horizontally
// ------------------------------
export function drawFighterSprite(ctx, fighter, options = {}) {
  if (!fighter || !fighter.sprites) return false

  const def = getSpriteDefinition(fighter, fighter.animState)
  if (!def) return false

  const sprite = spriteCache[def.path]
  if (!sprite || !sprite.loaded || !sprite.frameWidth || !sprite.frameHeight) return false

  const maxFrames = Math.min(def.frameCount || 1, sprite.columns * sprite.rows)
  const frameIndex = Math.min(fighter.animFrame || 0, maxFrames - 1)

  const col = frameIndex % sprite.columns
  const row = Math.floor(frameIndex / sprite.columns)

  const frameWidth = sprite.frameWidth
  const frameHeight = sprite.frameHeight

  const sx = col * frameWidth
  const sy = row * frameHeight

  const scale = options.scale || 1
  const offsetX = options.offsetX || 0
  const offsetY = options.offsetY || 0
  const flipX = !!options.flipX

  const dw = frameWidth * scale
  const dh = frameHeight * scale

  const dx = fighter.x + offsetX
  const dy = fighter.y + offsetY

  ctx.save()

  if (flipX) {
    ctx.translate(dx + dw, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(
      sprite.image,
      sx,
      sy,
      frameWidth,
      frameHeight,
      0,
      dy,
      dw,
      dh
    )
  } else {
    ctx.drawImage(
      sprite.image,
      sx,
      sy,
      frameWidth,
      frameHeight,
      dx,
      dy,
      dw,
      dh
    )
  }

  ctx.restore()
  return true
}

// ------------------------------
// Pick animation state from fighter gameplay state
// You can expand this later
// ------------------------------
export function autoDetectAnimationState(fighter) {
  if (!fighter) return "idle"

  if (fighter.hitstun > 0) return "hurt"

  if (fighter.currentAttack) {
    const name = String(fighter.currentAttack.name || "").toLowerCase()

    if (name.includes("blue")) return "blue"
    if (name.includes("red")) return "red"
    if (name.includes("purple")) return "hollowPurple"
    if (name.includes("heavy")) return "heavy"
    if (name.includes("light")) return "light"
    if (name.includes("grab")) return "light"
    if (name.includes("up")) return "light"
    if (name.includes("air")) return "light"

    return "light"
  }

  if (fighter.infinityActive && fighter.sprites?.infinity) return "infinity"

  if (!fighter.onGround) return "jump"

  if (Math.abs(fighter.vx) > 0.35) return "walk"

  return "idle"
}

// ------------------------------
// Update fighter animation automatically
// If loopMap[state] is false, that animation will not loop
// ------------------------------
export function updateFighterAnimation(fighter, loopMap = {}) {
  if (!fighter) return

  const nextState = autoDetectAnimationState(fighter)
  const speedMap = {
    idle: 10,
    walk: 6,
    jump: 6,
    hurt: 7,
    light: 4,
    heavy: 5,
    blue: 5,
    red: 5,
    hollowPurple: 6,
    infinity: 8
  }

  setAnimationState(fighter, nextState, speedMap[nextState] || 8)

  const shouldLoop = loopMap[nextState] !== undefined ? loopMap[nextState] : true
  updateAnimationFrame(fighter, shouldLoop)
}