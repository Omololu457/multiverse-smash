// game.js
import { characters } from "./characters.js"
import { camera } from "./camera.js"
import { SpriteHandler } from "./sprite.js"
import {
  keys,
  mouse,
  setupMouseInput,
  pointInRect,
  consumeMouseClick,
  inputSettings,
  getFighterInput,
  updateDebugInputToggles,
  getDebugInputState,
  recordInputFrame,
  recordInputSequence,
  getInputHistory,
  endInputFrame,
  defaultControls,
  defaultControlsP2
} from "./input.js"
import {
  activeSummons,
  updateSummons as updateActiveSummons,
  drawSummons as drawActiveSummons
} from "./summons.js"
import { physics } from "./physics.js"
import {
  updateCombat,
  resolveProjectileHits,
  updateProjectiles as updateCombatProjectiles
} from "./combat.js"
import {
  activeProjectiles,
  triggerSpecial,
  triggerUltimate,
  triggerTransformation,
  updateTransformationState,
  doEnergyCharge,
  applyGojoPassiveSystems,
  regenEnergy,
  updateProjectiles as updateAbilityProjectiles,
  clearAbilityState
} from "./abilities.js"
import {
  drawBattleBackground,
  drawCharacterSelectScreen,
  drawControlsInfo,
  drawCountdown,
  drawFighter,
  drawHealthAndEnergyBars,
  drawHitSparks,
  drawMatchEnd,
  drawProjectiles,
  drawRoundBreak,
  drawStartScreen,
  drawStageSelectScreen,
  drawTrainingCollisionBoxes,
  drawTrainingOverlay,
  drawUniverseSelectScreen,
  drawGameplaySelectScreen,
  drawAIDifficultyScreen,
  getStartMenuRects,
  getGameplaySelectRects,
  getAIDifficultyRects,
  getUniverseCardRects,
  getCharacterCardRects,
  getStageCardRects
} from "./ui.js"
import {
  createAIController,
  resetAIController,
  setAIDifficulty,
  getAIInput
} from "./ai.js"

// ------------------------------------------------------------------
// CANVAS SETUP
// ------------------------------------------------------------------
const canvas = document.getElementById("gameCanvas")
const ctx = canvas.getContext("2d")

canvas.width = window.innerWidth
canvas.height = window.innerHeight

setupMouseInput(canvas)

// ------------------------------------------------------------------
// SPRITE PRE-LOAD (Gojo)
// ------------------------------------------------------------------
const gojoSprites = {}
const gojoSheets = [
  "idle", "walk", "jump", "light", "heavy", "hurt",
  "blue", "red", "hollow_purple", "infinity", "teleport"
]
gojoSheets.forEach(sheet => {
  gojoSprites[sheet] = new Image()
  gojoSprites[sheet].src = `./gojo_${sheet}_sheet.png`
})

// ------------------------------------------------------------------
// CONSTANTS
// ------------------------------------------------------------------
const FLOOR_HEIGHT = 120
const WORLD_WIDTH = 3200
const WORLD_HEIGHT = 1600
const MAX_ROUNDS = 3
const ROUND_START_COUNTDOWN = 180
const DOUBLE_TAP_TIME = 240
const GOJO_INFINITY_RADIUS = 260
const COMMAND_INPUT_MAX_AGE = 700
const ROUND_BREAK_DURATION = 90
const DEFAULT_MAX_ENERGY = 100
const DEFAULT_SPEED = 9
const DEFAULT_JUMP = 9
const CENTER_SPAWN_GAP = 220
const EDGE_SPAWN_PADDING = 80

const GAME_STATES = {
  START: "start",
  SETTINGS: "settings",
  GAMEPLAY_SELECT: "gameplaySelect",
  AI_DIFFICULTY: "aiDifficulty",
  SELECT_UNIVERSE: "selectUniverse",
  SELECT_CHARACTER: "selectCharacter",
  SELECT_STAGE: "selectStage",
  BATTLE: "battle",
  ROUND_BREAK: "roundBreak",
  MATCH_END: "matchEnd"
}

// ------------------------------------------------------------------
// CONTROLS
// ------------------------------------------------------------------
const P1_CONTROLS = {
  left: "a", right: "d", up: "w", down: "s", jump: "w",
  light: "j", heavy: "k", special: "i", ultimate: "l",
  transform: "u", charge: "o", toggle: "q", dash: "shift", grab: "g"
}

const P2_CONTROLS = {
  left: "arrowleft", right: "arrowright", up: "arrowup", down: "arrowdown", jump: "arrowup",
  light: "1", heavy: "2", special: "3", ultimate: "4",
  transform: "5", charge: "6", toggle: "7", dash: "0", grab: "9"
}

// ------------------------------------------------------------------
// STAGES
// ------------------------------------------------------------------
const stages = [
  {
    name: "Jujutsu High Courtyard",
    sky: "#87bfff", mid: "#6aa86a", floor: "#556b2f", accent: "#cbd5e1",
    backgroundImage: "jujutsu_high_courtyard.png",
    groundOffset: 100, worldWidth: 3200, floorHeight: 120
  },
  {
    name: "Shibuya Incident",
    sky: "#1f2937", mid: "#374151", floor: "#4b5563", accent: "#ef4444",
    groundOffset: 100, worldWidth: 3200, floorHeight: 120
  },
  {
    name: "Planet Namek",
    sky: "#5eead4", mid: "#34d399", floor: "#65a30d", accent: "#fef08a",
    groundOffset: 100, worldWidth: 3200, floorHeight: 120
  },
  {
    name: "World Tournament Arena",
    sky: "#93c5fd", mid: "#fde68a", floor: "#b45309", accent: "#ffffff",
    groundOffset: 100, worldWidth: 3200, floorHeight: 120
  },
  {
    name: "Hidden Leaf Village",
    sky: "#bfdbfe", mid: "#86efac", floor: "#a16207", accent: "#22c55e",
    groundOffset: 100, worldWidth: 3200, floorHeight: 120
  },
  {
    name: "Shadow Garden",
    sky: "#111827", mid: "#1f2937", floor: "#0f172a", accent: "#7c3aed",
    groundOffset: 100, worldWidth: 3200, floorHeight: 120
  }
]

// ------------------------------------------------------------------
// STATE
// ------------------------------------------------------------------
let groundY = 0
let globalFrameCount = 0
let gameState = GAME_STATES.START
let roundNumber = 1
let roundWins = { p1: 0, p2: 0 }
let countdown = ROUND_START_COUNTDOWN
let winnerText = ""
let roundBreakTimer = 0
let p1 = null
let p2 = null

const projectiles = activeProjectiles
const hitSparks = []
const activeDomains = []

const allCharacterKeys = Object.keys(characters)
const universeMap = buildUniverseMap()
const universeKeys = Object.keys(universeMap)

let hoverStartIndex = 0
let hoverGameplayIndex = 0
let hoverDifficultyIndex = 0
let hoverUniverseIndex = 0
let hoverCharacterIndex = 0
let hoverStageIndex = 0

const matchConfig = {
  mode: null,
  aiDifficulty: "easy",
  selectedUniverse: null,
  selectingSide: "p1",
  selectedStage: null,
  p1Char: null,
  p2Char: null,
  p1CharKey: null,
  p2CharKey: null
}

const trainingState = { enabled: false }
const p2AI = createAIController("easy")
const settingsButtonRect = { x: window.innerWidth - 220, y: 30, w: 180, h: 50 }

// ------------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------------
function toFiniteNumber(value, fallback) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function buildUniverseMap() {
  const map = {}
  for (const key of Object.keys(characters)) {
    const char = characters[key]
    const universe = char?.universe || "other"
    if (!map[universe]) map[universe] = []
    map[universe].push(key)
  }
  return map
}

function formatUniverseName(universe) {
  return String(universe)
    .split("_")
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
}

function getUniverseCharacters() {
  if (!matchConfig.selectedUniverse || !universeMap[matchConfig.selectedUniverse]) return []
  return universeMap[matchConfig.selectedUniverse]
}

function getStageTheme() {
  return matchConfig.selectedStage || stages[0]
}

function getStageFloorHeight() {
  return getStageTheme()?.floorHeight || FLOOR_HEIGHT
}

function getStageGroundOffset() {
  const stage = getStageTheme()
  return typeof stage?.groundOffset === "number" ? stage.groundOffset : 100
}

function getStageWorldWidth() {
  return getStageTheme()?.worldWidth || WORLD_WIDTH
}

function refreshStageMetrics() {
  groundY = canvas.height - getStageFloorHeight() - getStageGroundOffset()
}

function getOpponent(fighter) {
  return fighter === p1 ? p2 : p1
}

function getAbilityContext() {
  return {
    p1, p2, getOpponent, camera, activeDomains,
    worldWidth: getStageWorldWidth(),
    createFighter,
    deltaMs: 1000 / 60
  }
}

function updateCameraBounds() {
  const visibleWorldHeight = canvas.height
  if (typeof camera.setWorldBounds === "function") {
    camera.setWorldBounds(getStageWorldWidth(), visibleWorldHeight)
  }
  if (typeof camera.setVerticalLimits === "function") {
    camera.setVerticalLimits(0, visibleWorldHeight)
  }
  camera.minZoom = 0.72
  camera.maxZoom = 1.0
  camera.moveSmooth = 0.1
  camera.zoomSmooth = 0.08
  camera.verticalMoveSmooth = 0.06
  camera.horizontalPadding = 460
  camera.verticalPadding = 220
  camera.lookAheadStrength = 90
  camera.verticalBias = -20
  camera.topSafeMargin = 80
  camera.bottomSafeMargin = 60
}

function syncPhysicsBounds() {
  refreshStageMetrics()
  if (typeof physics.setGroundY === "function") physics.setGroundY(groundY)
  if (typeof physics.setStageBounds === "function") physics.setStageBounds(0, getStageWorldWidth())
  // Always sync the physics engine's groundY directly
  physics.groundY = groundY
}

function getControlsForHistory(side) {
  return side === "p1" ? defaultControls : defaultControlsP2
}

function getGroundedYForHeight(height) {
  return groundY - toFiniteNumber(height, 100)
}

function getGroundedYForFighter(fighter) {
  return getGroundedYForHeight(fighter?.h ?? fighter?.height)
}

function getSpawnPositions() {
  const stageWorldWidth = getStageWorldWidth()
  const p1Width = toFiniteNumber(matchConfig.p1Char?.w ?? matchConfig.p1Char?.width, 60)
  const p2Width = toFiniteNumber(matchConfig.p2Char?.w ?? matchConfig.p2Char?.width, 60)
  const stageCenter = stageWorldWidth * 0.5
  const p1X = Math.max(EDGE_SPAWN_PADDING, Math.min(stageWorldWidth - p1Width - EDGE_SPAWN_PADDING, stageCenter - CENTER_SPAWN_GAP - p1Width))
  const p2X = Math.max(EDGE_SPAWN_PADDING, Math.min(stageWorldWidth - p2Width - EDGE_SPAWN_PADDING, stageCenter + CENTER_SPAWN_GAP))
  return { p1X, p2X }
}

// ------------------------------------------------------------------
// VIRTUAL KEY TRANSLATOR
// ------------------------------------------------------------------
function mapInputToVirtualKeys(inputState, controls) {
  if (!inputState) return {}
  const vKeys = {}
  if (inputState.left)    vKeys[controls.left]    = true
  if (inputState.right)   vKeys[controls.right]   = true
  if (inputState.up || inputState.jump) vKeys[controls.up] = true
  if (inputState.down)    vKeys[controls.down]    = true
  if (inputState.light)   vKeys[controls.light]   = true
  if (inputState.heavy)   vKeys[controls.heavy]   = true
  if (inputState.dash)    vKeys[controls.dash]    = true
  if (inputState.special) vKeys[controls.special] = true
  if (inputState.ultimate) vKeys[controls.ultimate] = true
  if (inputState.grab)    vKeys[controls.grab]    = true
  if (inputState.charge)  vKeys[controls.charge]  = true
  return vKeys
}

// ------------------------------------------------------------------
// FIGHTER FACTORY
// ------------------------------------------------------------------
function createFighter(charKey, char, x, facing, controls, side) {
  const movement = char?.movement || {}
  const stats = char?.stats || {}
  const baseFormKey = char?.transformationOrder?.[0] || "base"
  const baseForm = char?.transformations?.[baseFormKey] || null

  const width  = toFiniteNumber(char?.w ?? char?.width, 60)
  const height = toFiniteNumber(char?.h ?? char?.height, 100)
  const maxHealth  = Math.max(1, toFiniteNumber(stats.maxHealth ?? char?.maxHealth ?? char?.health, 1000))
  const maxEnergy  = Math.max(1, toFiniteNumber(stats.maxEnergy ?? char?.maxEnergy ?? char?.energy ?? char?.meter, DEFAULT_MAX_ENERGY))
  const startingEnergy = Math.max(0, toFiniteNumber(char?.energy, maxEnergy))
  const speed  = Math.max(DEFAULT_SPEED, toFiniteNumber(stats.speed ?? char?.speed ?? movement?.speed, 7))
  const jump   = Math.max(DEFAULT_JUMP,  toFiniteNumber(char?.jump ?? movement?.jump, 7))
  const groundedY = getGroundedYForHeight(height)

  const attackMultiplier  = toFiniteNumber(char?.attackMultiplier,  1)
  const damageMultiplier  = toFiniteNumber(char?.damageMultiplier,  1)
  const speedMultiplier   = toFiniteNumber(char?.speedMultiplier,   1)
  const defenseMultiplier = toFiniteNumber(char?.defenseMultiplier, 1)

  return {
    ...char,
    rosterKey: charKey,
    playerNumber: side === "p1" ? 1 : 2,
    side,
    controls,
    x,
    y: groundedY,
    groundY: groundedY + height, // per-fighter ground reference for physics
    anchor: "topleft",
    vx: 0,
    vy: 0,
    w: width,
    h: height,
    facing,
    health: maxHealth,
    maxHealth,
    energy: startingEnergy,
    maxEnergy,
    baseSpeed: speed,
    baseJump: jump,
    speed,
    jump,
    jumpForce: -(stats.jumpPower || 32),
    maxJumps: stats.maxJumps || movement.jumpCount || 1,
    jumpsUsed: 0,
    jumpCount: 0,
    jumpHeld: false,
    dashSpeed: stats.dashSpeed || 20,
    dashDuration: stats.dashDuration || 8,
    dashCooldownMax: stats.dashCooldownMax || 30,
    dashTimer: 0,
    dashCooldown: 0,
    attackMultiplier,
    damageMultiplier,
    speedMultiplier,
    defenseMultiplier,
    moveMultiplier: movement.moveMultiplier || 1,
    attackSpeedMultiplier: movement.attackSpeedMultiplier || 1,
    wallJump: !!movement.wallJump,
    dashTeleport: !!movement.dashTeleport,
    hitstun: 0,
    blockstun: 0,
    hitstop: 0,
    attackCooldown: 0,
    currentAttack: null,
    attacking: false,
    currentMove: null,
    currentMoveData: null,
    moveTimer: 0,
    movePhase: "idle",
    hasHitThisMove: false,
    isBlocking: false,
    grounded: true,
    onGround: true,
    isLaunched: false,
    airHits: 0,
    maxAirHits: 3,
    comboCounter: 0,
    comboTimer: 0,
    directionHistory: [],
    teleportFlash: 0,
    invulnTimer: 0,
    colorFlash: 0,
    leftTapTime: 0,
    rightTapTime: 0,
    infinityActive: false,
    currentForm: baseFormKey,
    currentFormData: baseForm,
    transformIndex: 0,
    summonCooldown: 0,
    domainBuff: false,
    activeDomainTimer: 0,
    disabledSpecials: [],
    permanentForm: false,
    oneWayTransformation: false,
    deathRitual: false,
    ritualActive: false,
    pendingCharacterSwap: null,
    attackBox: { x, y: groundedY + 30, w: 60, h: 40 },
    baseForm: {
      damageMultiplier, attackMultiplier, speedMultiplier, defenseMultiplier,
      isSpecial: false, kiDrainPerSecond: 0
    },
    spriteHandler: char?.hasSprites ? new SpriteHandler() : null
  }
}

// ------------------------------------------------------------------
// MATCH / ROUND MANAGEMENT
// ------------------------------------------------------------------
function getFallbackCharacterKey() {
  return allCharacterKeys[0] || null
}

function ensureTrainingOpponent() {
  if (matchConfig.mode !== "training") return
  if (matchConfig.p2CharKey && matchConfig.p2Char) return
  const fallbackKey = matchConfig.p1CharKey || getFallbackCharacterKey()
  if (!fallbackKey) return
  matchConfig.p2CharKey = fallbackKey
  matchConfig.p2Char = characters[fallbackKey]
}

function resetRound() {
  syncPhysicsBounds()
  ensureTrainingOpponent()
  const { p1X, p2X } = getSpawnPositions()

  p1 = createFighter(matchConfig.p1CharKey, matchConfig.p1Char, p1X,  1, P1_CONTROLS, "p1")
  p2 = createFighter(matchConfig.p2CharKey, matchConfig.p2Char, p2X, -1, P2_CONTROLS, "p2")

  countdown = ROUND_START_COUNTDOWN
  clearAbilityState()
  hitSparks.length = 0
  activeDomains.length = 0
  roundBreakTimer = 0

  resetAIController(p2AI)
  setAIDifficulty(p2AI, matchConfig.mode === "training" ? "dummy" : matchConfig.aiDifficulty)
  clearAIControlKeys(p2)

  if (typeof camera.reset === "function") camera.reset()
  updateCameraBounds()
  if (p1 && p2 && typeof camera.update === "function") camera.update(p1, p2, canvas)
}

function startMatch() {
  roundNumber = 1
  roundWins = { p1: 0, p2: 0 }
  winnerText = ""
  resetRound()
  gameState = GAME_STATES.BATTLE
}

function resetSelections() {
  matchConfig.selectedUniverse = null
  matchConfig.selectedStage = null
  matchConfig.selectingSide = "p1"
  matchConfig.p1Char = null
  matchConfig.p2Char = null
  matchConfig.p1CharKey = null
  matchConfig.p2CharKey = null
  hoverUniverseIndex = 0
  hoverCharacterIndex = 0
  hoverStageIndex = 0
}

function resetToStart() {
  gameState = GAME_STATES.START
  matchConfig.mode = null
  matchConfig.aiDifficulty = "easy"
  resetSelections()
  p1 = null
  p2 = null
  winnerText = ""
  countdown = ROUND_START_COUNTDOWN
  roundBreakTimer = 0
  if (typeof camera.reset === "function") camera.reset()
}

function beginUniverseSelect() {
  matchConfig.selectedUniverse = null
  hoverUniverseIndex = 0
  hoverCharacterIndex = 0
  gameState = GAME_STATES.SELECT_UNIVERSE
}

function chooseMode(mode) {
  matchConfig.mode = mode
  resetSelections()
  if (mode === "training") {
    matchConfig.aiDifficulty = "dummy"
    beginUniverseSelect()
    return
  }
  gameState = GAME_STATES.AI_DIFFICULTY
}

function chooseDifficulty(difficulty) {
  matchConfig.aiDifficulty = difficulty
  beginUniverseSelect()
}

// ------------------------------------------------------------------
// INPUT / AI ROUTING
// ------------------------------------------------------------------
function clearAIControlKeys(fighter) {
  if (!fighter) return
  const c = fighter.controls
  const aiKeys = [c.left, c.right, c.up, c.down, c.light, c.heavy, c.special, c.ultimate, c.charge]
  aiKeys.forEach(key => { if (key) keys[key] = false })
}

function applyAIInputToKeys(fighter, aiInput) {
  if (!fighter || !aiInput) return
  const c = fighter.controls
  clearAIControlKeys(fighter)
  if (aiInput.left)       keys[c.left]    = true
  if (aiInput.right)      keys[c.right]   = true
  if (aiInput.jump)       keys[c.up]      = true
  if (aiInput.lightAttack) keys[c.light]  = true
  if (aiInput.heavyAttack) keys[c.heavy]  = true
  if (aiInput.upAttack)   { keys[c.up] = true; keys[c.light] = true }
  if (aiInput.downAir)    keys[c.heavy]   = true
  if (aiInput.special1 || aiInput.special2) keys[c.special] = true
  if (aiInput.ultimate)   keys[c.ultimate] = true
}

function updateCPUInput() {
  if (!p2) return
  if (gameState !== GAME_STATES.BATTLE) { clearAIControlKeys(p2); return }
  const cpuEnabled = matchConfig.mode === "vs" || matchConfig.mode === "training"
  if (!cpuEnabled) { clearAIControlKeys(p2); return }
  const aiInput = getAIInput(p2AI, p2, p1, { stage: getStageTheme(), roundNumber, mode: matchConfig.mode })
  applyAIInputToKeys(p2, aiInput)
}

// ------------------------------------------------------------------
// FIGHTER UPDATE LOGIC
// ------------------------------------------------------------------
function updateFacing() {
  if (!p1 || !p2) return
  if (p1.x < p2.x) { p1.facing = 1;  p2.facing = -1 }
  else              { p1.facing = -1; p2.facing =  1  }
}

function handleToggleInputs(fighter, key) {
  if (!fighter) return
  const c = fighter.controls
  if (key === c.toggle && fighter.name === "Satoru Gojo") fighter.infinityActive = !fighter.infinityActive
  if (key === c.transform) triggerTransformation(fighter, getAbilityContext())
}

function recordDirectionInput(fighter, key) {
  if (!fighter) return
  const c = fighter.controls
  let dir = null
  if (key === c.left)  dir = "L"
  if (key === c.right) dir = "R"
  if (key === c.up)    dir = "U"
  if (key === c.down)  dir = "D"
  if (!dir) return
  fighter.directionHistory.push({ dir, time: performance.now() })
  if (fighter.directionHistory.length > 16) fighter.directionHistory.shift()
}

function getRelativeDirectionsFromHistory(fighter, maxAge = COMMAND_INPUT_MAX_AGE) {
  if (!fighter) return []
  const now = performance.now()
  const recent = (fighter.directionHistory || []).filter(d => now - d.time <= maxAge)
  return recent.map(d => {
    if (d.dir === "U" || d.dir === "D") return d.dir
    if (fighter.facing === 1) return d.dir === "R" ? "F" : "B"
    return d.dir === "L" ? "F" : "B"
  })
}

function teleportBehindTarget(fighter) {
  const target = getOpponent(fighter)
  if (!target) return
  const stageWorldWidth = getStageWorldWidth()
  if (fighter.x < target.x) fighter.x = target.x - fighter.w - 8
  else                       fighter.x = target.x + target.w + 8
  fighter.x  = Math.max(0, Math.min(stageWorldWidth - fighter.w, fighter.x))
  fighter.y  = target.y
  fighter.vx = 0; fighter.vy = 0
  fighter.teleportFlash = 12
  fighter.attackCooldown = Math.max(fighter.attackCooldown || 0, 10)
  if (typeof camera.focusBetween === "function") camera.focusBetween(fighter, target, 1.0, 10)
}

function detectDoubleTapDashTeleport(fighter, key) {
  if (!fighter || !fighter.dashTeleport) return
  if (fighter.hitstun > 0 || fighter.blockstun > 0) return
  const now = performance.now()
  const c = fighter.controls
  if (key === c.left) {
    if (now - fighter.leftTapTime < DOUBLE_TAP_TIME) { teleportBehindTarget(fighter); fighter.leftTapTime = 0 }
    else fighter.leftTapTime = now
  }
  if (key === c.right) {
    if (now - fighter.rightTapTime < DOUBLE_TAP_TIME) { teleportBehindTarget(fighter); fighter.rightTapTime = 0 }
    else fighter.rightTapTime = now
  }
}

function updateMiscTimers(fighter) {
  if (!fighter) return
  if (fighter.teleportFlash > 0)  fighter.teleportFlash--
  if (fighter.summonCooldown > 0) fighter.summonCooldown--
  if (fighter.activeDomainTimer > 0) fighter.activeDomainTimer--
  if (fighter.restrainTimer > 0)  { fighter.restrainTimer--;  if (fighter.restrainTimer  <= 0) fighter.restrained = false }
  if (fighter.obscuredTimer > 0)  { fighter.obscuredTimer--;  if (fighter.obscuredTimer  <= 0) fighter.obscured   = false }
}

function updateMovementInput(fighter) {
  if (!fighter) return
  const inputState = getFighterInput(fighter)
  const vKeys = mapInputToVirtualKeys(inputState, fighter.controls)
  fighter.isBlocking = false
  if (fighter.hitstun > 0 || fighter.blockstun > 0) return
  if (inputState.down)   fighter.isBlocking = true
  if (inputState.charge) doEnergyCharge(fighter)
  physics.moveFighter(fighter, vKeys, fighter.controls)
}

function buildNormalControlState(fighter, vKeys) {
  const c = fighter.controls
  const onGround = !!fighter.onGround
  return {
    upAttack: onGround && vKeys[c.up] && (vKeys[c.light] || vKeys[c.heavy]),
    grab:     onGround && vKeys[c.down] && vKeys[c.light],
    air:      !onGround && vKeys[c.light],
    downAir:  !onGround && vKeys[c.heavy],
    light:    onGround && vKeys[c.light] && !vKeys[c.down] && !vKeys[c.up],
    heavy:    onGround && vKeys[c.heavy] && !vKeys[c.up]
  }
}

function updatePlayerCombat(fighter) {
  if (!fighter || fighter.hitstun > 0 || fighter.blockstun > 0) return
  const inputState = getFighterInput(fighter)
  const vKeys = mapInputToVirtualKeys(inputState, fighter.controls)
  const canStartAbility = !fighter.attacking && !fighter.currentMove
  if (canStartAbility && inputState.special) { triggerSpecial(fighter, getAbilityContext()); return }
  if (canStartAbility && inputState.ultimate) { triggerUltimate(fighter, getAbilityContext()); return }
  const controls = buildNormalControlState(fighter, vKeys)
  updateCombat(fighter, getOpponent(fighter), controls, { hitEffects: hitSparks })
}

function updateFighterState(fighter) {
  if (!fighter) return fighter
  const updated = updateTransformationState(fighter, getAbilityContext()) || fighter
  applyGojoPassiveSystems(updated)
  updateMiscTimers(updated)
  physics.applyGravity(updated)
  physics.updateAttackBox(updated)
  regenEnergy(updated)
  return updated
}

// ------------------------------------------------------------------
// GOJO SPECIAL SYSTEMS
// ------------------------------------------------------------------
function applyGojoInfinityField(gojo, target) {
  if (!gojo || !target) return
  if (gojo.name !== "Satoru Gojo" || !gojo.infinityActive) return
  const gx = gojo.x + gojo.w / 2;   const gy = gojo.y + gojo.h / 2
  const tx = target.x + target.w / 2; const ty = target.y + target.h / 2
  const dx = tx - gx; const dy = ty - gy
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist > GOJO_INFINITY_RADIUS) return
  const ratio = Math.max(0.015, dist / GOJO_INFINITY_RADIUS)
  const slow = ratio * ratio
  target.vx *= slow; target.vy *= Math.max(0.22, slow)
  if (Math.abs(target.vx) < 0.05) target.vx = 0
  if (Math.abs(target.vy) < 0.05) target.vy = 0
}

function applyGojoInfinityBarrier(gojo, target) {
  if (!gojo || !target) return
  if (gojo.name !== "Satoru Gojo" || !gojo.infinityActive) return
  if (target.health <= 0) return
  const gx = gojo.x + gojo.w / 2; const tx = target.x + target.w / 2
  const dx = tx - gx; const dist = Math.abs(dx)
  if (dist <= 52) target.x += dx > 0 ? 3 : -3
}

// ------------------------------------------------------------------
// DOMAIN / EFFECT UPDATES
// ------------------------------------------------------------------
function updateDomains() {
  for (let i = activeDomains.length - 1; i >= 0; i--) {
    const domain = activeDomains[i]
    if (!domain) { activeDomains.splice(i, 1); continue }
    if (typeof domain.timer === "number") {
      domain.timer--
      if (domain.timer <= 0) activeDomains.splice(i, 1)
    }
  }
}

function updateEffects() {
  for (let i = hitSparks.length - 1; i >= 0; i--) {
    hitSparks[i].timer--
    if (hitSparks[i].timer <= 0) hitSparks.splice(i, 1)
  }
}

function updateTrainingMode() {
  const debug = getDebugInputState()
  trainingState.enabled = matchConfig.mode === "training" || !!debug.trainingMode
  if (!trainingState.enabled || !p1 || !p2) return
  recordInputFrame("P1", getControlsForHistory("p1"), p1, globalFrameCount)
  recordInputFrame("P2", getControlsForHistory("p2"), p2, globalFrameCount)
  recordInputSequence(getControlsForHistory("p1"))
  recordInputSequence(getControlsForHistory("p2"))
}

// ------------------------------------------------------------------
// ROUND END CHECK
// ------------------------------------------------------------------
function checkRoundEnd() {
  if (!p1 || !p2) return
  if (matchConfig.mode === "training") return
  if (p1.health > 0 && p2.health > 0) return

  if (p1.health <= 0 && p2.health <= 0) {
    winnerText = "Double KO"
  } else if (p1.health > 0) {
    roundWins.p1++
    winnerText = "Player 1 Wins Round"
  } else {
    roundWins.p2++
    winnerText = "CPU Wins Round"
  }

  if (roundWins.p1 >= 2 || roundWins.p2 >= 2 || roundNumber >= MAX_ROUNDS) {
    gameState = GAME_STATES.MATCH_END
    if (roundWins.p1 === roundWins.p2) winnerText = "Draw Match"
    else winnerText = roundWins.p1 > roundWins.p2 ? "Player 1 Wins Match" : "CPU Wins Match"
    return
  }

  roundNumber++
  roundBreakTimer = ROUND_BREAK_DURATION
  gameState = GAME_STATES.BATTLE
}

// ------------------------------------------------------------------
// BATTLE UPDATE
// ------------------------------------------------------------------
function updateBattle() {
  updateDebugInputToggles()
  updateTrainingMode()
  updateCPUInput()
  updateFacing()

  updateMovementInput(p1)
  updateMovementInput(p2)

  applyGojoInfinityField(p1, p2)
  applyGojoInfinityField(p2, p1)

  p1 = updateFighterState(p1)
  p2 = updateFighterState(p2)

  applyGojoInfinityBarrier(p1, p2)
  applyGojoInfinityBarrier(p2, p1)

  if (typeof physics.resolvePlayerCollision === "function") physics.resolvePlayerCollision(p1, p2)

  updateFacing()
  updateDomains()

  updatePlayerCombat(p1)
  updatePlayerCombat(p2)

  updateCombatProjectiles(projectiles, getStageWorldWidth(), [p1, p2])
  updateAbilityProjectiles(getStageWorldWidth(), WORLD_HEIGHT)
  resolveProjectileHits(projectiles, p1, p2, hitSparks)

  updateActiveSummons()
  updateEffects()

  if (typeof camera.update === "function") camera.update(p1, p2, canvas)

  checkRoundEnd()
}

// ------------------------------------------------------------------
// RENDERING
// ------------------------------------------------------------------
function renderHybridFighter(fighter) {
  if (!fighter) return
  if (fighter.hasSprites && fighter.spriteHandler) {
    if (gojoSprites["idle"]?.complete && gojoSprites["idle"]?.naturalWidth > 0) {
      fighter.spriteHandler.draw(ctx, fighter, gojoSprites)
    } else {
      drawFighter(ctx, fighter, camera)
    }
  } else {
    drawFighter(ctx, fighter, camera)
  }
}

function drawBattleScene() {
  const stage = getStageTheme()
  ctx.save()
  if (typeof camera.applyTransform === "function") camera.applyTransform(ctx, canvas)
  drawBattleBackground(ctx, canvas, stage, groundY, getStageFloorHeight())
  drawProjectiles(ctx, projectiles, camera)
  drawActiveSummons(ctx)
  renderHybridFighter(p1)
  renderHybridFighter(p2)
  drawHitSparks(ctx, hitSparks, camera)
  if (trainingState.enabled) drawTrainingCollisionBoxes(ctx, [p1, p2], camera)
  ctx.restore()
}

function drawBattleHud() {
  drawHealthAndEnergyBars(ctx, p1, p2, canvas)
  drawControlsInfo(ctx, canvas)
  if (!trainingState.enabled) return
  drawTrainingOverlay(ctx, canvas, {
    combo: Math.max(p1?.comboCounter || 0, p2?.comboCounter || 0),
    damage: 0,
    state: matchConfig.mode === "training" ? "training" : "debug",
    meterGain: 0,
    frame: globalFrameCount,
    p1Inputs: getRelativeDirectionsFromHistory(p1),
    p2Inputs: getRelativeDirectionsFromHistory(p2),
    history: getInputHistory()
  })
}

function drawBattle() {
  drawBattleScene()
  drawBattleHud()
  if (countdown > 0) drawCountdown(ctx, canvas, countdown)
}

// ------------------------------------------------------------------
// MENU RENDERING
// ------------------------------------------------------------------
const p1SettingRect  = { x: window.innerWidth / 2 - 200, y: 300, w: 400, h: 60 }
const p2SettingRect  = { x: window.innerWidth / 2 - 200, y: 400, w: 400, h: 60 }
const backSettingRect = { x: window.innerWidth / 2 - 100, y: 550, w: 200, h: 50 }

function drawSettingsScreen() {
  ctx.fillStyle = "#111"; ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = "#FFF"; ctx.font = "40px Arial"; ctx.textAlign = "center"
  ctx.fillText("CONTROLLER SETTINGS", canvas.width / 2, 150)
  ctx.fillStyle = "#333"
  ctx.fillRect(p1SettingRect.x,   p1SettingRect.y,   p1SettingRect.w,   p1SettingRect.h)
  ctx.fillRect(p2SettingRect.x,   p2SettingRect.y,   p2SettingRect.w,   p2SettingRect.h)
  ctx.fillStyle = "#A00"
  ctx.fillRect(backSettingRect.x, backSettingRect.y, backSettingRect.w, backSettingRect.h)
  ctx.fillStyle = "#FFF"; ctx.font = "24px Arial"
  ctx.fillText(`P1 Input: ${inputSettings.p1Type.toUpperCase()}`, canvas.width / 2, p1SettingRect.y + 40)
  ctx.fillText(`P2 Input: ${inputSettings.p2Type.toUpperCase()}`, canvas.width / 2, p2SettingRect.y + 40)
  ctx.fillText("BACK", canvas.width / 2, backSettingRect.y + 35)
}

function renderCurrentState() {
  switch (gameState) {
    case GAME_STATES.START:
      drawStartScreen(ctx, canvas)
      ctx.fillStyle = "#444"
      ctx.fillRect(settingsButtonRect.x, settingsButtonRect.y, settingsButtonRect.w, settingsButtonRect.h)
      ctx.fillStyle = "#FFF"; ctx.font = "20px Arial"; ctx.textAlign = "center"
      ctx.fillText("SETTINGS", settingsButtonRect.x + settingsButtonRect.w / 2, settingsButtonRect.y + 32)
      break
    case GAME_STATES.SETTINGS:
      drawSettingsScreen()
      break
    case GAME_STATES.GAMEPLAY_SELECT:
      drawGameplaySelectScreen(ctx, canvas, hoverGameplayIndex)
      break
    case GAME_STATES.AI_DIFFICULTY:
      drawAIDifficultyScreen(ctx, canvas, hoverDifficultyIndex)
      break
    case GAME_STATES.SELECT_UNIVERSE:
      drawUniverseSelectScreen(ctx, canvas, getUniverseList(), hoverUniverseIndex)
      break
    case GAME_STATES.SELECT_CHARACTER:
      drawCharacterSelectScreen(ctx, canvas, {
        roster: getCharacterRosterForSelectedUniverse(),
        selectedIndex: hoverCharacterIndex,
        p1Selected: matchConfig.p1CharKey,
        p2Selected: matchConfig.p2CharKey,
        currentPlayer: matchConfig.selectingSide === "p1" ? 1 : 2,
        title: matchConfig.mode === "training" ? "TRAINING CHARACTER SELECT" : "CHARACTER SELECT"
      })
      break
    case GAME_STATES.SELECT_STAGE:
      drawStageSelectScreen(ctx, canvas, stages, hoverStageIndex)
      break
    case GAME_STATES.BATTLE:
      drawBattle()
      break
    case GAME_STATES.ROUND_BREAK:
      drawBattleScene()
      drawBattleHud()
      drawRoundBreak(ctx, canvas, winnerText || "ROUND BREAK")
      break
    case GAME_STATES.MATCH_END:
      drawBattleScene()
      drawBattleHud()
      drawMatchEnd(ctx, canvas, winnerText || "MATCH OVER")
      break
  }
}

// ------------------------------------------------------------------
// MENU CLICK HANDLERS
// ------------------------------------------------------------------
function getUniverseList() {
  return universeKeys.map(key => ({ name: formatUniverseName(key), id: key }))
}

function getCharacterRosterForSelectedUniverse() {
  return getUniverseCharacters().map(key => {
    const char = characters[key]
    return { id: key, name: char?.name || key, universe: char?.universe ? formatUniverseName(char.universe) : "" }
  })
}

function updateHoverIndices() {
  if (gameState === GAME_STATES.START) {
    const rects = getStartMenuRects(canvas)
    const found = rects.findIndex(rect => pointInRect(mouse.x, mouse.y, rect))
    hoverStartIndex = Math.max(0, found)
    return
  }
  if (gameState === GAME_STATES.GAMEPLAY_SELECT) {
    const rects = getGameplaySelectRects(canvas)
    const found = rects.findIndex(rect => pointInRect(mouse.x, mouse.y, rect))
    if (found >= 0) hoverGameplayIndex = found
    return
  }
  if (gameState === GAME_STATES.AI_DIFFICULTY) {
    const rects = getAIDifficultyRects(canvas)
    const found = rects.findIndex(rect => pointInRect(mouse.x, mouse.y, rect))
    if (found >= 0) hoverDifficultyIndex = found
    return
  }
  if (gameState === GAME_STATES.SELECT_UNIVERSE) {
    const rects = getUniverseCardRects(canvas, getUniverseList())
    const found = rects.findIndex(rect => pointInRect(mouse.x, mouse.y, rect))
    if (found >= 0) hoverUniverseIndex = found
    return
  }
  if (gameState === GAME_STATES.SELECT_CHARACTER) {
    const rects = getCharacterCardRects(canvas, getCharacterRosterForSelectedUniverse())
    const found = rects.findIndex(rect => pointInRect(mouse.x, mouse.y, rect))
    if (found >= 0) hoverCharacterIndex = found
    return
  }
  if (gameState === GAME_STATES.SELECT_STAGE) {
    const rects = getStageCardRects(canvas, stages)
    const found = rects.findIndex(rect => pointInRect(mouse.x, mouse.y, rect))
    if (found >= 0) hoverStageIndex = found
  }
}

function handleStartMenuClick() {
  if (pointInRect(mouse.x, mouse.y, settingsButtonRect)) { gameState = GAME_STATES.SETTINGS; return }
  const rects = getStartMenuRects(canvas)
  const clicked = rects.find(rect => pointInRect(mouse.x, mouse.y, rect))
  if (!clicked) return
  if (clicked.id === "play") gameState = GAME_STATES.GAMEPLAY_SELECT
}

function handleSettingsClick() {
  if (pointInRect(mouse.x, mouse.y, p1SettingRect))
    inputSettings.p1Type = inputSettings.p1Type === "keyboard" ? "controller" : "keyboard"
  if (pointInRect(mouse.x, mouse.y, p2SettingRect))
    inputSettings.p2Type = inputSettings.p2Type === "keyboard" ? "controller" : "keyboard"
  if (pointInRect(mouse.x, mouse.y, backSettingRect))
    gameState = GAME_STATES.START
}

function handleGameplaySelectClick() {
  const rects = getGameplaySelectRects(canvas)
  const clicked = rects.find(rect => pointInRect(mouse.x, mouse.y, rect))
  if (!clicked) return
  if (clicked.id === "training") { chooseMode("training"); return }
  if (clicked.id === "vs")       { chooseMode("vs"); return }
  if (clicked.id === "back")     gameState = GAME_STATES.START
}

function handleDifficultyClick() {
  const rects = getAIDifficultyRects(canvas)
  const clicked = rects.find(rect => pointInRect(mouse.x, mouse.y, rect))
  if (!clicked) return
  if (clicked.id === "back") { gameState = GAME_STATES.GAMEPLAY_SELECT; return }
  chooseDifficulty(clicked.id)
}

function handleUniverseClick() {
  const universes = getUniverseList()
  const rects = getUniverseCardRects(canvas, universes)
  const idx = rects.findIndex(rect => pointInRect(mouse.x, mouse.y, rect))
  if (idx < 0 || !universes[idx]) return
  matchConfig.selectedUniverse = universes[idx].id
  gameState = GAME_STATES.SELECT_CHARACTER
}

function handleCharacterClick() {
  const roster = getCharacterRosterForSelectedUniverse()
  const rects = getCharacterCardRects(canvas, roster)
  const idx = rects.findIndex(rect => pointInRect(mouse.x, mouse.y, rect))
  if (idx < 0 || !roster[idx]) return
  const chosenKey = roster[idx].id
  const chosen = characters[chosenKey]

  if (matchConfig.selectingSide === "p1") {
    matchConfig.p1Char = chosen
    matchConfig.p1CharKey = chosenKey
    if (matchConfig.mode === "training") {
      matchConfig.p2Char = chosen
      matchConfig.p2CharKey = chosenKey
      gameState = GAME_STATES.SELECT_STAGE
      return
    }
    matchConfig.selectingSide = "p2"
    matchConfig.selectedUniverse = null
    gameState = GAME_STATES.SELECT_UNIVERSE
    return
  }
  matchConfig.p2Char = chosen
  matchConfig.p2CharKey = chosenKey
  gameState = GAME_STATES.SELECT_STAGE
}

function handleStageClick() {
  const rects = getStageCardRects(canvas, stages)
  const idx = rects.findIndex(rect => pointInRect(mouse.x, mouse.y, rect))
  if (idx < 0 || !stages[idx]) return
  matchConfig.selectedStage = stages[idx]
  startMatch()
}

function handleMatchEndClick() {
  resetToStart()
}

function handleMenuClicks() {
  if (!mouse.clicked) return
  switch (gameState) {
    case GAME_STATES.START:           handleStartMenuClick();     break
    case GAME_STATES.SETTINGS:        handleSettingsClick();      break
    case GAME_STATES.GAMEPLAY_SELECT: handleGameplaySelectClick(); break
    case GAME_STATES.AI_DIFFICULTY:   handleDifficultyClick();    break
    case GAME_STATES.SELECT_UNIVERSE: handleUniverseClick();      break
    case GAME_STATES.SELECT_CHARACTER: handleCharacterClick();    break
    case GAME_STATES.SELECT_STAGE:    handleStageClick();         break
    case GAME_STATES.MATCH_END:       handleMatchEndClick();      break
  }
  consumeMouseClick()
}

// ------------------------------------------------------------------
// MAIN LOOP
// ------------------------------------------------------------------
function updateCurrentState() {
  updateHoverIndices()
  handleMenuClicks()

  switch (gameState) {
    case GAME_STATES.BATTLE:
      if (countdown > 0) {
        updateDebugInputToggles()
        updateTrainingMode()
        updateCPUInput()
        countdown = Math.max(0, countdown - 1)
        if (typeof camera.update === "function" && p1 && p2) camera.update(p1, p2, canvas)
      } else {
        updateBattle()
      }
      break
    case GAME_STATES.ROUND_BREAK:
      updateDebugInputToggles()
      updateTrainingMode()
      roundBreakTimer--
      if (typeof camera.update === "function" && p1 && p2) camera.update(p1, p2, canvas)
      if (roundBreakTimer <= 0) {
        resetRound()
        gameState = GAME_STATES.BATTLE
      }
      break
  }
}

function gameLoop() {
  globalFrameCount++
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  updateCurrentState()
  renderCurrentState()
  endInputFrame()
  requestAnimationFrame(gameLoop)
}

// ------------------------------------------------------------------
// KEYBOARD EVENTS
// ------------------------------------------------------------------
window.addEventListener("keydown", e => {
  const key = String(e.key || "").toLowerCase()
  if (p1) { recordDirectionInput(p1, key); detectDoubleTapDashTeleport(p1, key); handleToggleInputs(p1, key) }
  if (p2) {
    recordDirectionInput(p2, key)
    if (matchConfig.mode !== "vs" && matchConfig.mode !== "training") {
      detectDoubleTapDashTeleport(p2, key)
      handleToggleInputs(p2, key)
    }
  }
  if (gameState === GAME_STATES.MATCH_END && key === "enter") resetToStart()
})

// ------------------------------------------------------------------
// RESIZE
// ------------------------------------------------------------------
window.addEventListener("resize", () => {
  canvas.width  = window.innerWidth
  canvas.height = window.innerHeight
  syncPhysicsBounds()
  updateCameraBounds()
  if (p1) p1.y = Math.min(p1.y, getGroundedYForFighter(p1))
  if (p2) p2.y = Math.min(p2.y, getGroundedYForFighter(p2))
  if (p1 && p2) {
    if (typeof camera.reset  === "function") camera.reset()
    if (typeof camera.update === "function") camera.update(p1, p2, canvas)
  }
})

// ------------------------------------------------------------------
// BOOT
// ------------------------------------------------------------------
syncPhysicsBounds()
updateCameraBounds()
gameLoop()
