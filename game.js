// game.js

import { bindingVows, activateBindingVow, hasBindingVow, activeVows, clearAllBindingVows, tryActivateBindingVow } from "./bindingvow.js"
import { characters, characterList } from "./characters.js"
import {
  switchAlien, BEN10_ALIEN_POOL, setupBen10,
  isTransformDevice, updateTransformDevice, tryTransform, revertToHuman
} from "./fighters.js"
import { camera } from "./camera.js"
import { SpriteHandler, processPendingSpawns, preloadCharacterSprites } from "./sprite.js"
import { loadSpriteSheets, getSpriteSheets, spritesReady } from "./spritesheets.js"
import {
  keys, mouse, setupMouseInput, pointInRect, consumeMouseClick,
  inputSettings, getFighterInput, updateDebugInputToggles, getDebugInputState,
  recordInputFrame, recordInputSequence, getInputHistory, endInputFrame,
  clearInputBuffers, PS5_MAP, STICK_DEADZONE, inputCallCount, getConnectedPadCount, getPlayerGamepad
} from "./input.js"
import {
  activeSummons,
  updateSummons as updateActiveSummons,
  drawSummons as drawActiveSummons,
  spawnSummon as spawnAssistSummon,  // ← fixed: alias included
  summonShadowClone, dispelShadowClones,   // debug hotkeys (",", ".") wire straight to these
  countShadowClones                        // #21 Clone Rendan Storm gate (Naruto light-string extension)
} from "./summons.js"
import { physics } from "./physics.js"
import {
  updateCombat, resolveProjectileHits, resolveProjectileHitsMulti, resolveAttackHit,
  updateProjectiles as updateCombatProjectiles,
  checkClash, checkParry, resolveGrab, updateGrab,
  getAttackPhase, getAttackHitbox,   // training overlay: live frame data + real attack hitbox
  getHurtbox,                         // harness: verify the Susanoo giant hurtbox
  startMove                           // harness: drive a real p2 attack (Substitution incoming-window)
} from "./combat.js"
import {
  activeProjectiles, spawnProjectile,
  triggerSpecial, triggerUltimate, triggerTransformation,
  enterSSJRose, revertSSJRose, applyGokuBlackFormSystem,   // Goku Black SSJ Rose (Stage 2)
  enterMangekyou, revertMangekyou, applyMangekyouSystem, isMangekyouActive,   // Itachi Mangekyou Sharingan (buff mode)
  enterVegetaSSJ, revertVegetaSSJ, applyVegetaFormSystem, ensureVegetaSSJWaypoint,   // Vegeta Super Saiyan (Stage 1)
  enterVegetaBlue, revertVegetaBlue, vegetaIsSuper,   // Vegeta Super Saiyan Blue (3rd form, chained off SSJ)
  updateTransformationState, doEnergyCharge, applyGojoPassiveSystems,
  regenEnergy, updatePendingSpawns, clearAbilityState, tojiTeleportStrike, executeSukunaMalevolentDash,
  applyCloneRendanStorm,   // #21 Clone Rendan Storm — flurry follow-ups on Naruto's basic light hit
  sasukeInSusanoo, SUSANOO_DURATION_FRAMES,   // Susanoo: pause round clock + purple duration readout
  spawnAbsoluteDefenseFx,   // Sasuke Absolute Defense — repurposed Susanoo-intro sheet as the barrier FX
  updateTojiStanceSwitch, updateTojiStanceCombat, getTojiStance,   // Toji 3-stance weapon system (+ Blade moveset)
  updateVegetaCommandCombat,   // Vegeta command-normal cancel chain (Y-track kick target combo)
  updateOmegaRangerCommandCombat   // Omega Ranger kick-chain (Fwd+Heavy rekka) + Fwd+Light push / air-Heavy down-air-2 pokes
} from "./abilities.js"
import { spawnProjectileFromMove } from "./projectiles.js"
import {
  drawBattleBackground, drawCharacterSelectScreen, drawControlsInfo,
  drawCountdown, drawFighter, drawHealthAndEnergyBars, drawMatchEnd,
  drawProjectiles, drawRoundBreak, drawStartScreen, drawStageSelectScreen,
  drawTrainingCollisionBoxes, drawTrainingOverlay, drawStanceIndicator, drawUniverseSelectScreen,
  drawGameplaySelectScreen, drawAIDifficultyScreen, drawPauseMenu,
  drawTowerSelectScreen, getTowerSelectRects,
  drawFFASetupScreen, getFFASetupRects, drawFFACharSelectScreen,
  drawFFATeamSelectScreen, getFFATeamSelectRects,
  drawFFASlotSelectScreen, getFFASlotSelectRects,
  PAUSE_MENU_ITEMS, getStartMenuRects, getGameplaySelectRects,
  getAIDifficultyRects, getUniverseCardRects, getCharacterCardRects,
  getStageCardRects, drawStartInfoPanel,
  drawAlienSelectScreen, getAlienSelectCardRects, getAlienSelectButtons,
  getMainMenuRects, drawMainMenuScreen,
  drawMoveListScreen, getMoveListCardRects, getMoveListButtons,
  drawTutorialScreen, getTutorialButtons, getTutorialPageCount,
  drawAccountScreen, getAccountButtons,
  resolveEnergyLabel, isHeavenlyRestriction   // HUD energy-bar resource name + Heavenly Restriction state (display-only) — exposed for the harness
} from "./ui.js"
import { createAccount, getCurrentAccount, isValidUsername, listAccounts, connectSaveFile, isFileConnected, isFileApiSupported, hasPersistedData, persistence, setSnapshotDecorator } from "./account.js"
import {
  awardMatchXp, awardXp, getLevel, xpProgress, isUnlocked, requiredLevel,
  loadProgressionFromAccount, PROGRESS_DOES_NOT_PERSIST,
  setDevUnlock, isDevUnlocked, DEV_CODE,
  applyUnlockCode, isBetaUnlocked,
  FEATURES, levelFromXp
} from "./progression.js"
import { getSkins, getSkin, getSkinAnimationData, isSkinUnlocked, buildUnlockedSkinsSnapshot } from "./skins.js"
import { getKit, CONTROL_REFERENCE } from "./kits.js"
import { createAIController, resetAIController, setAIDifficulty, getAIInput } from "./ai.js"
import {
  activeDomains,
  activateDomain, updateDomains, drawDomains, clearDomains,
  drawDomainBackground, getDomainHUDData
} from "./domains.js"
import { activeEffects, addEffect, updateEffects, updateEnergyRegen, clearEffects } from "./effects.js"
import {
  updateKuramaUltimate, isKuramaCinematicActive, drawKuramaCinematic, clearKuramaUltimate,
  getKuramaCinematicStatus
} from "./kurama.js"
import {
  updateSasukeCinematic, isSasukeCinematicActive, drawSasukeCinematic, clearSasukeCinematic,
  getSasukeCinematicStatus
} from "./sasukeCinematic.js"
import {
  updateSSJRoseCinematic, isSSJRoseCinematicActive, drawSSJRoseCinematic, clearSSJRoseCinematic,
  getSSJRoseCinematicStatus
} from "./ssjRoseCinematic.js"
import {
  updateGokuBlackSwordCinematic, isGokuBlackSwordCinematicActive, drawGokuBlackSwordCinematic,
  clearGokuBlackSwordCinematic, getGokuBlackSwordCinematicStatus
} from "./gokuBlackSwordCinematic.js"
import {
  updateVegetaFinalFlashCinematic, isVegetaFinalFlashCinematicActive, drawVegetaFinalFlashCinematic,
  clearVegetaFinalFlashCinematic, getVegetaFinalFlashCinematicStatus
} from "./vegetaFinalFlashCinematic.js"
import {
  updateBeerusKiBallCinematic, isBeerusKiBallCinematicActive, drawBeerusKiBallCinematic,
  clearBeerusKiBallCinematic, getBeerusKiBallCinematicStatus
} from "./beerusKiBallCinematic.js"
import { sound, SFX, MUSIC, MENU_PLAYLIST, menuTrackDisplayName } from "./sound.js"
import { pickRickVoice, RICK_VOICE } from "./rickVoice.js"
import {
  createMatchStats, createVictoryState, recordHit, recordRoundEnd,
  drawRoundCountdown, drawRoundBreak as drawRoundBreakFlow,
  drawVictoryScreen, drawMatchIntro, drawLowHealthWarning, drawRoundTimer, drawSusanooTimer,
  updateVictoryState, handleVictoryClick, handleVictoryKey, resetFighterForRematch
} from "./matchflow.js"

// ------------------------------------------------------------------
// CANVAS SETUP
// ------------------------------------------------------------------
const canvas = document.getElementById("gameCanvas")
const ctx    = canvas.getContext("2d")
canvas.width  = window.innerWidth
canvas.height = window.innerHeight
setupMouseInput(canvas)

// SAVE FILE picker must fire from a REAL user gesture (transient activation) — the
// File System Access pickers throw if called from the rAF-driven handleMenuClicks().
// So we hook mouseup directly: if the click lands on the MAIN MENU "SAVE FILE" button,
// invoke the picker synchronously here. mouse.x/mouse.y are the same canvas-space coords
// handleMenuClicks uses (kept current by setupMouseInput's mousemove handler).
canvas.addEventListener("mouseup", () => {
  if (gameState !== GAME_STATES.MAIN_MENU) return
  const hit = getMainMenuRects(canvas).find(r => pointInRect(mouse.x, mouse.y, r))
  if (hit?.id !== "savefile") return
  if (isFileConnected()) return   // already granted this session → auto-saving; don't re-prompt
  // Not awaited: runs synchronously up to the picker's await, preserving the gesture.
  // On a successful load, hydrate ALL systems from the save BEFORE anything else runs.
  connectSaveFile().then(res => { if (res?.ok) hydrateFromLoadedSave() })
})

// ──────────────────────────────────────────────────────────────────
// SAVE-FILE SCHEMA — full game_player_data.json read/write pipeline.
// The account object IS the per-player schema (progression / unlocks / skins /
// settings / stats); persistence.save(acct) always rewrites the WHOLE file, so any
// change persisted below writes the full current snapshot, never a partial field.
// ──────────────────────────────────────────────────────────────────

// Registered ONCE: enrich each account's DERIVED fields at serialization time so
// every save (from any module's persistence.save) emits a complete, fresh snapshot.
// Derived strictly from the account's OWN data (level/dev/beta) — no session globals —
// so it's correct even for a non-current account. account.js can't compute these
// (importing progression/skins there would cycle), hence this decorator seam.
setSnapshotDecorator(acct => {
  if (!acct || typeof acct !== "object") return acct
  const xp    = acct.progression?.xp || 0
  const level = acct.progression?.level ?? levelFromXp(xp)
  if (!acct.unlocks || typeof acct.unlocks !== "object") acct.unlocks = { devUnlock: false, betaUnlock: false, featuresUnlocked: [] }
  const dev  = !!acct.unlocks.devUnlock
  const beta = !!acct.unlocks.betaUnlock
  // featuresUnlocked: FEATURES ids reachable at this level (dev OR beta unlocks all). DERIVED.
  acct.unlocks.featuresUnlocked = Object.entries(FEATURES)
    .filter(([, f]) => dev || beta || level >= (f.unlocksAtLevel || 1))
    .map(([id]) => id)
  // skins: read-only per-character unlocked-id snapshot (skins.js persists no state). DERIVED.
  acct.skins = buildUnlockedSkinsSnapshot(level, dev, beta)
  return acct
})

// Persist the current audio SETTINGS onto the account, then write the full snapshot.
// Called after every settings mutation (mute toggles, playlist reorder) so the file
// tracks them live. progression/unlock changes persist through their own modules.
function persistCurrentSettings() {
  const acct = getCurrentAccount()
  if (!acct) return
  acct.settings = sound.getSettings?.() || acct.settings
  persistence.save(acct)   // decorator refreshes derived fields; whole file rewritten
}

// Hydrate ALL systems from a freshly-loaded save, fully overriding the fresh-start
// defaults. progression + unlock flags via progression.js; audio settings via sound.js;
// skins are DERIVED (recomputed from level/dev/beta, nothing to hydrate). Runs the moment
// a save loads (the File System Access picker requires a user gesture, so this IS boot).
function hydrateFromLoadedSave() {
  loadProgressionFromAccount()                 // xp/matches/wins + dev/beta unlock flags
  const acct = getCurrentAccount()
  if (acct?.settings) {
    sound.applySettings?.(acct.settings)       // volumes/mutes/playlist order → override defaults
    audioSettings.sfxMuted   = !!acct.settings.sfxMuted    // keep the Settings-screen mirror in sync
    audioSettings.musicMuted = !!acct.settings.musicMuted
  }
}

// ------------------------------------------------------------------
// CONSTANTS
// ------------------------------------------------------------------
const FLOOR_HEIGHT          = 120
const WORLD_WIDTH           = 3200
const WORLD_HEIGHT          = 1600
const MAX_ROUNDS            = 3
const ROUND_START_COUNTDOWN = 180
const DOUBLE_TAP_TIME       = 240
const GOJO_INFINITY_RADIUS  = 260
const COMMAND_INPUT_MAX_AGE = 700
const ROUND_BREAK_DURATION  = 90
const DEFAULT_MAX_ENERGY    = 100
const DEFAULT_SPEED         = 9
const DEFAULT_JUMP          = 9
const CENTER_SPAWN_GAP      = 220
const EDGE_SPAWN_PADDING    = 80
const ROUND_TIME            = 5400   // 90 seconds @ 60fps

const GAME_STATES = {
  START:            "start",
  MAIN_MENU:        "mainMenu",
  MOVE_LIST:        "moveList",
  TUTORIAL:         "tutorial",
  ACCOUNT:          "account",
  SETTINGS:         "settings",
  GAMEPLAY_SELECT:  "gameplaySelect",
  TOWER_SELECT:     "towerSelect",     // pick a Tower tier (3/10/25/40/∞ floors)
  FFA_SETUP:        "ffaSetup",        // free-for-all: choose player count (3/4)
  FFA_CHARSELECT:   "ffaCharSelect",   // free-for-all: pick a fighter per slot
  FFA_SLOTSELECT:   "ffaSlotSelect",   // free-for-all: assign each slot to a human device or AI (+ difficulty)
  FFA_TEAMSELECT:   "ffaTeamSelect",   // free-for-all: assign each slot to Team A/B (or none)
  FFA_BATTLE:       "ffaBattle",       // free-for-all: N-fighter last-standing / team match
  AI_DIFFICULTY:    "aiDifficulty",
  SELECT_UNIVERSE:  "selectUniverse",
  SELECT_CHARACTER: "selectCharacter",
  SELECT_SKIN:      "selectSkin",
  SELECT_ALIENS:    "selectAliens",
  SELECT_STAGE:     "selectStage",
  BATTLE:           "battle",
  ROUND_BREAK:      "roundBreak",
  MATCH_END:        "matchEnd",
  PAUSED:           "paused",
  VICTORY:          "victory",
  INTRO:            "intro",
  ONLINE_PLACEHOLDER: "onlinePlaceholder"   // dev-unlocked Online stub (no netcode)
}

// ------------------------------------------------------------------
// CONTROLS
// ------------------------------------------------------------------
// CANONICAL INPUT SCHEME — ONLY W A S D U I O P J K L are bound.
//   W=jump/up  A=left  S=crouch/down  D=right  (double-tap A/D = dash)
//   J=light  K=heavy  I=up-attack/launcher  L=special  U=ultimate/domain  O=grab
//   P=charge (HOLD) / per-character toggle (TAP — Gojo: Infinity).
// `dash` is intentionally unbound to a key ("") — dashing is double-tap A/D.
// `toggle` shares the P key; tap-vs-hold is disambiguated on keyup (handleChargeTap).
const P1_CONTROLS = {
  left: "a", right: "d", up: "w", down: "s", jump: "w",
  light: "j", heavy: "k", upAttack: "i", special: "l", ultimate: "u",
  grab: "o", charge: "p", toggle: "p", transform: "p", dash: ""
}
// P2 (local-versus only) must use physically-distinct keys, so it necessarily
// falls outside the 11-key rule; arrows + a right-hand cluster mirror P1's layout.
const P2_CONTROLS = {
  left: "arrowleft", right: "arrowright", up: "arrowup", down: "arrowdown", jump: "arrowup",
  light: "1", heavy: "2", upAttack: "3", special: "4", ultimate: "5",
  grab: "6", charge: "7", toggle: "7", transform: "7", dash: ""
}
// P3/P4 (free-for-all POC ONLY) are CONTROLLER-ONLY — a keyboard can't do a 3rd/4th scheme
// (key-rollover). A real pad drives them via pollGamepad. These maps carry DISTINCT virtual
// key-names (NOT the old empty "" — those collapsed every action onto keys[""], so a real P3/P4
// pad had left==light==grab and was unplayable). The names are synthetic labels only: they're
// never physical keydowns, so getFighterInput's keyboard fallback stays inert without a pad, but
// mapInputToVirtualKeys/moveFighter/buildNormalControlState can now tell the actions apart.
// Shape mirrors P1 (jump shares up; charge/toggle/transform share one bind; dash = double-tap only).
const P3_CONTROLS = {
  left: "p3_left", right: "p3_right", up: "p3_up", down: "p3_down", jump: "p3_up",
  light: "p3_light", heavy: "p3_heavy", upAttack: "p3_upAttack", special: "p3_special", ultimate: "p3_ultimate",
  grab: "p3_grab", charge: "p3_charge", toggle: "p3_charge", transform: "p3_charge", dash: ""
}
const P4_CONTROLS = {
  left: "p4_left", right: "p4_right", up: "p4_up", down: "p4_down", jump: "p4_up",
  light: "p4_light", heavy: "p4_heavy", upAttack: "p4_upAttack", special: "p4_special", ultimate: "p4_ultimate",
  grab: "p4_grab", charge: "p4_charge", toggle: "p4_charge", transform: "p4_charge", dash: ""
}

// ── KEYBIND UI (Task 2) — P1 keyboard rebinds, IN-MEMORY ONLY (sandbox blocks
// localStorage). Restricted to the 11 allowed keys. ────────────────────────────
const ALLOWED_KEYS = ["w", "a", "s", "d", "u", "i", "o", "p", "j", "k", "l"]
const DEFAULT_P1_CONTROLS = { ...P1_CONTROLS }
// action key in P1_CONTROLS → label. (up also drives jump — rebound together.)
const REBINDABLE = [
  ["up", "Jump / Up"], ["left", "Left"], ["down", "Crouch / Block"], ["right", "Right"],
  ["light", "Light (J)"], ["heavy", "Heavy (K)"], ["upAttack", "Up-Attack (I)"],
  ["special", "Special (L)"], ["ultimate", "Ultimate (U)"], ["grab", "Grab (O)"],
  ["charge", "Charge/Toggle (P)"]
]
let rebindAction  = null   // action currently awaiting a key, or null
let rebindWarning = ""     // dup-key / invalid-key message

// Developer unlock code entry (Task 6) — in-memory only.
let devCodeEntry   = false
let devCodeBuffer  = ""
let devCodeMessage = ""

const KEYBIND_Y0 = 350, KEYBIND_ROW_H = 38
function getKeybindRects() {
  const rects = []
  const colW = 250, x0 = canvas.width / 2 - colW - 20
  REBINDABLE.forEach(([action, label], i) => {
    const col = i % 2, row = Math.floor(i / 2)
    rects.push({ action, label, x: x0 + col * (colW + 40), y: KEYBIND_Y0 + row * KEYBIND_ROW_H, w: colW, h: KEYBIND_ROW_H - 8 })
  })
  return rects
}
const resetBindRect = () => ({ x: canvas.width / 2 - 110, y: KEYBIND_Y0 + Math.ceil(REBINDABLE.length / 2) * KEYBIND_ROW_H + 10, w: 220, h: 40 })

// Menu-music playlist reorder panel — sits in the LEFT margin (left of the centered
// keybind grid, which starts at cx-270), so it never overlaps existing controls. One
// row per MENU_PLAYLIST track with ▲/▼ buttons; clicking swaps order via sound.moveMenuTrack.
const PLAYLIST_X0 = 24, PLAYLIST_W = 330, PLAYLIST_Y0 = KEYBIND_Y0, PLAYLIST_ROW_H = 34, PLAYLIST_BTN = 26
function getPlaylistRects() {
  const rects = []
  for (let i = 0; i < MENU_PLAYLIST.length; i++) {
    const y = PLAYLIST_Y0 + i * PLAYLIST_ROW_H
    rects.push({
      index: i,
      file:  MENU_PLAYLIST[i],
      rowRect:  { x: PLAYLIST_X0, y, w: PLAYLIST_W, h: PLAYLIST_ROW_H - 6 },
      upRect:   { x: PLAYLIST_X0 + PLAYLIST_W - PLAYLIST_BTN * 2 - 6, y: y + 2, w: PLAYLIST_BTN, h: PLAYLIST_ROW_H - 10 },
      downRect: { x: PLAYLIST_X0 + PLAYLIST_W - PLAYLIST_BTN,         y: y + 2, w: PLAYLIST_BTN, h: PLAYLIST_ROW_H - 10 }
    })
  }
  return rects
}

// Apply a captured key to an action (P1 keyboard). Returns true on success.
function applyRebind(action, key) {
  if (!ALLOWED_KEYS.includes(key)) { rebindWarning = `"${key.toUpperCase()}" is not an allowed key (W A S D U I O P J K L).`; return false }
  // Warn (but allow) if another action already uses this key.
  const clash = REBINDABLE.find(([a]) => a !== action && P1_CONTROLS[a] === key)
  rebindWarning = clash ? `Warning: ${key.toUpperCase()} also used by ${clash[1]}.` : ""
  P1_CONTROLS[action] = key
  if (action === "up") P1_CONTROLS.jump = key          // up + jump share a key
  if (action === "charge") { P1_CONTROLS.toggle = key; P1_CONTROLS.transform = key }
  return true
}

// ------------------------------------------------------------------
// STAGES
// ------------------------------------------------------------------
// One track per series. Filenames are user-supplied and live alongside the
// game files. JJK + Naruto are wired now; drop a single .mp3 in for each other
// series here and every stage in that series picks it up automatically. Leave
// null to fall back to the procedural theme (sound._proceduralThemeForStage).
const SERIES_MUSIC = {
  // NOTE: these MUST match the real files on disk exactly (the server is
  // case-sensitive). The Naruto file is spelled "sprit" (not "spirit").
  jjk:         "JJK-Delirious.mp3",
  naruto:      "Naruto_fighting_sprit.mp3",
  dragonball:  null,   // TODO: e.g. "dragonball_battle.mp3"
  demonslayer: null,   // TODO: e.g. "demonslayer_theme.mp3"
  rickmorty:   null,   // TODO: e.g. "rickmorty_theme.mp3"
  ben10:       null,   // TODO: e.g. "ben10_theme.mp3"
  other:       null
}

// Pre-match name-call clips, keyed by rosterKey (same shape as SERIES_MUSIC). Any
// character NOT listed here simply gets NO announcement beat — the pre-countdown
// sequence skips that fighter cleanly (see beginNamecallSequence). Case-sensitive.
const NAMECALL_AUDIO = {
  naruto:     "naruto_namecall.mp3",
  gojo:       "gojo_namecall.mp3",
  sukuna:     "sukuna_namecall.mp3",
  rick:       "rick_intro.mp3",
  goku_black: "goku_black_intro.mp3"
}

// Data-driven stage table — add a stage here (palette + series + landmark id)
// and it shows up in stage select, renders its procedural background (ui.js
// drawStageLandmarks keys off `landmark`), and plays its series track.
// Per-stage `music` overrides the per-series fallback so each map plays its own
// universe-specific track (slot order = position within its series). Filenames
// are case-sensitive and must match the files on disk exactly; a missing file
// falls back gracefully to the procedural theme (sound.playMusicFile onerror).
const STAGE_DEFS = [
  { name: "Jujutsu High Courtyard", series: "jjk",         music: "JJK_1.mp3", landmark: "jujutsu_high", sky: "#87bfff", mid: "#6aa86a", floor: "#556b2f", accent: "#cbd5e1", backgroundImage: "jujutsu_high_courtyard.png" },
  { name: "Shibuya Incident",       series: "jjk",         music: "JJK_2.mp3", landmark: "shibuya",      sky: "#0b1022", mid: "#1f2937", floor: "#111827", accent: "#ef4444", backgroundImage: "shibuya_incident_bg.png" },
  { name: "Hidden Leaf Village",    series: "naruto",      landmark: "hidden_leaf",  sky: "#bfdbfe", mid: "#86efac", floor: "#a16207", accent: "#22c55e" },
  { name: "Valley of the End",      series: "naruto",      music: "valley_of_the_end_theme.mp3", landmark: "valley_of_end",sky: "#9fb6c9", mid: "#5b7184", floor: "#2f3b46", accent: "#e2e8f0", backgroundImage: "valley_of_the_end_bg.png" },
  { name: "Planet Namek",           series: "dragonball",  music: "DB_1.mp3",  landmark: "namek",        sky: "#5eead4", mid: "#34d399", floor: "#15803d", accent: "#fef08a" },
  { name: "World Tournament Arena", series: "dragonball",  music: "DB_2.mp3",  landmark: "tournament",   sky: "#93c5fd", mid: "#fde68a", floor: "#b45309", accent: "#ffffff" },
  { name: "Mugen Train",            series: "demonslayer", landmark: "mugen_train",  sky: "#0c1330", mid: "#241a3a", floor: "#1a1326", accent: "#f59e0b" },
  { name: "Citadel of Ricks",       series: "rickmorty",   landmark: "citadel",      sky: "#11182b", mid: "#1e293b", floor: "#0f172a", accent: "#39ff14" },
  { name: "Null Void",              series: "ben10",       landmark: "null_void",    sky: "#1a0b2e", mid: "#2e1065", floor: "#170a28", accent: "#22d3ee" },
  { name: "Shadow Garden",          series: "other",       landmark: "shadow_garden",sky: "#111827", mid: "#1f2937", floor: "#0f172a", accent: "#7c3aed" },
  // FREE-FOR-ALL arena — WIDER world (4800 vs the standard 3200) so the camera can frame
  // 3-4 spread-out combatants without zooming past readability. `worldWidth` overrides the
  // STAGE_DEF default in the map() below. Used only by the FFA mode's stage selection.
  { name: "Battle Royale Colosseum", series: "other",      landmark: "citadel",      sky: "#160b22", mid: "#3b1d55", floor: "#0e0716", accent: "#f472b6", worldWidth: 4800, ffa: true }
]

// Finalize each stage: shared world/ground metrics + resolved music filename
// (explicit per-stage `music` wins; otherwise fall back to the series track).
const stages = STAGE_DEFS.map(s => ({
  groundOffset: 100, worldWidth: 3200, floorHeight: 120,
  ...s,
  music: s.music ?? SERIES_MUSIC[s.series] ?? null
}))

// ------------------------------------------------------------------
// STATE
// ------------------------------------------------------------------
let groundY          = 0
let globalFrameCount = 0
let gameState        = GAME_STATES.START
let roundNumber      = 1
let roundWins        = { p1: 0, p2: 0 }
let countdown        = ROUND_START_COUNTDOWN
let winnerText       = ""
let roundBreakTimer  = 0
let pauseMenuIndex   = 0
let stateBeforePause = null
let p1               = null
let p2               = null
let matchStats       = createMatchStats()
let victoryState     = createVictoryState()
let matchIntroTimer  = 0
let roundTimer       = ROUND_TIME

// "BINDING VOW ACTIVATED" cue (text + white flash) shown when a directional vow
// sequence is committed. timer counts down in updateBattle; drawn in BATTLE/ROUND.
let vowCue = { timer: 0, sub: "" }
function _triggerVowCue(vow) {
  vowCue = { timer: 150, sub: (vow?.name || "BINDING VOW").toUpperCase() }
}

// ── DOMAIN EXPANSION CINEMATIC ──────────────────────────────────────
// When Gojo/Sukuna open a domain: a brief tight zoom on the caster doing the
// hand-sign (combat frozen, hitstop-style), then the camera pulls back to reveal
// the fullscreen domain. State is restored cleanly AND defensively so the screen
// can never get stuck zoomed (see endDomainCinematic / updateDomainCinematic).
const DOMAIN_ZOOM_FRAMES = 28      // hand-sign beat length (~0.47s @60fps)
const DOMAIN_ZOOM        = 1.55    // tight cinematic zoom on the caster
const domainCine = { caster: null, domain: null, timer: 0, savedMaxZoom: null, savedMaxStep: null }

// Use the imported activeProjectiles array directly — do NOT create a second one
const projectiles  = activeProjectiles
const hitSparks    = []
// activeDomains is the SINGLE domains.js module array (imported above) so the
// domains abilities.js pushes are the same ones updateDomains() ticks & draws.
const damageNumbers= []

let knockoutFlash  = 0
let slowdownTimer  = 0
let slowdownTarget = null
let hoverThrottle  = 0

const comboDisplay = {
  p1: { opacity: 0, fadeDir: "out", lastCount: 0, holdTimer: 0 },
  p2: { opacity: 0, fadeDir: "out", lastCount: 0, holdTimer: 0 }
}

const allCharacterKeys = Object.keys(characters).filter(k => !characters[k].hidden)
const universeMap      = buildUniverseMap()
const universeKeys     = Object.keys(universeMap)

let hoverStartIndex      = 0
let hoverGameplayIndex   = 0
let hoverTowerIndex      = 0
let hoverFFAIndex        = 0
let hoverFFACharIndex    = 0
let hoverFFASlotIndex    = 0
let hoverFFATeamIndex    = 0
let hoverDifficultyIndex = 0
let hoverUniverseIndex   = 0
let hoverCharacterIndex  = 0
let hoverStageIndex      = 0
let hoverMainMenuIndex   = 0
let moveListIndex        = 0
let moveListShowControls = false
let tutorialPage         = 0
let accountDraftName     = ""
let accountMessage       = ""

// Fighters listed on the MOVE LIST screen (every selectable character).
function getMoveListFighters() {
  return characterList.filter(c => !c.hidden).map(c => ({ key: c.rosterKey, name: c.name, universe: c.universe }))
}

const matchConfig = {
  mode:             null,
  aiDifficulty:     "easy",
  selectedUniverse: null,
  selectingSide:    "p1",
  selectedStage:    null,
  p1Char: null, p2Char: null,
  p1CharKey: null, p2CharKey: null,
  // Ben 10: the 5 aliens each player picked, plus the in-progress draft.
  p1Aliens: null, p2Aliens: null,
  alienDraft: [], alienSelectSide: "p1",
  // Skins (Task 4): selected skin id per side; default until the skin-select picks one.
  p1Skin: "default", p2Skin: "default"
}

// Apply a selected skin's complete animationData (own + borrowed) + display scale
// onto a fighter. null skinAnim = the character's default art. Per-fighter, so a
// mirror match can have two different skins.
function applySkin(fighter, skinId) {
  if (!fighter) return
  fighter._skinAnim = getSkinAnimationData(fighter.rosterKey, skinId)
  const skin = getSkin(fighter.rosterKey, skinId)
  if (skin?.spriteScale) fighter.spriteScale = skin.spriteScale
  // A skin may carry a colour wash (Task 4 "Pink Fit" = default art + pink tint,
  // since no bespoke pink sheets exist). applyMirrorTint() reads skinTint and sets
  // tintColor; null clears it so non-tinted skins render natively.
  fighter.skinTint = skin?.skinTint || null
  fighter.skinId = skinId
}

// ── TOWER MODE — tiered ladder of RANDOM CPU fights. ─────────────────────────
// FIVE TIERS by floor count (Tier 5 = endless). Each floor is a RANDOMLY chosen
// opponent on a RANDOMLY chosen stage. Difficulty escalates by FLOOR NUMBER using the
// SAME schedule for every tier (so Tier 5 escalates naturally, and longer fixed tiers
// get harder the deeper you go): floors 1-5 easy → 6-15 adaptive → 16+ impossible.
// Reuses the existing plumbing: applyTowerFloor seam, updateTowerOutcome, continueTower,
// health-carry (_applyCarry), and the victory→continue wiring.
const TOWER_TIERS = [
  { id: "tier1", tier: 1, label: "TIER 1", floors: 3,        endless: false, sub: "3 opponents"  },
  { id: "tier2", tier: 2, label: "TIER 2", floors: 10,       endless: false, sub: "10 opponents" },
  { id: "tier3", tier: 3, label: "TIER 3", floors: 25,       endless: false, sub: "25 opponents" },
  { id: "tier4", tier: 4, label: "TIER 4", floors: 40,       endless: false, sub: "40 opponents" },
  { id: "tier5", tier: 5, label: "TIER 5", floors: Infinity, endless: true,  sub: "INFINITE — endless escalation" }
]
// tier/floors/endless describe the CHOSEN tier; floor is the 0-indexed current floor.
const towerState = {
  active: false, tierId: null, tierLabel: "", tier: 0, floors: 0, endless: false,
  floor: 0, carryPct: 1, cleared: false, _lastWon: false, _applyCarry: false
}

function isTower() { return matchConfig.mode === "tower" }
function getTowerTier(id) { return TOWER_TIERS.find(t => t.id === id) }

// Difficulty by 1-indexed floor number — shared by ALL tiers. Only the valid ai.js keys
// (easy/adaptive/impossible) are used, so nothing silently falls back to easy.
function towerDifficultyForFloor(floorNum) {
  if (floorNum <= 5)  return "easy"
  if (floorNum <= 15) return "adaptive"
  return "impossible"
}

function startTower(tierId = "tier1") {
  const t = getTowerTier(tierId)
  if (!t) return
  towerState.active = true; towerState.tierId = t.id; towerState.tierLabel = t.label
  towerState.tier = t.tier; towerState.floors = t.floors; towerState.endless = t.endless
  towerState.floor = 0; towerState.carryPct = 1; towerState.cleared = false
  towerState._lastWon = false; towerState._applyCarry = false
  matchConfig.mode = "tower"
  resetSelections()
  beginUniverseSelect()   // player picks THEIR fighter; opponents are random per floor
}

// Random opponent (any non-hidden fighter) + random stage + escalating difficulty.
function _towerPickOpponent() {
  const pool = allCharacterKeys                                  // non-hidden roster
  return pool[Math.floor(Math.random() * pool.length)] || "gojo"
}
function _towerPickStage() {
  return stages[Math.floor(Math.random() * stages.length)] || stages[0]
}
// Force the current floor's RANDOM opponent + RANDOM stage + floor-scaled difficulty
// onto matchConfig (P1 unchanged). No player stage-select screen while a tower is active.
function applyTowerFloor() {
  if (!towerState.active) return
  const opp = _towerPickOpponent()
  matchConfig.p2CharKey    = opp
  matchConfig.p2Char       = characters[opp]
  matchConfig.aiDifficulty = towerDifficultyForFloor(towerState.floor + 1)   // floor is 0-indexed
  matchConfig.selectedStage = _towerPickStage()
}

// Called from _checkMatchOver. Win → XP + remember carry-over health (+ mark cleared on the
// final floor of a FIXED tier); lose → end.
function updateTowerOutcome(winner) {
  if (!towerState.active) return
  if (winner === "p1") {
    towerState._lastWon = true
    awardXp(60 + towerState.floor * 20)
    const pct = p1 ? Math.max(0, (p1.health || 0) / (p1.maxHealth || 1)) : 1
    towerState.carryPct = Math.min(1, pct + 0.35)   // partial heal between floors
    // Endless tier never "clears"; a fixed tier clears when its last floor is beaten.
    if (!towerState.endless && (towerState.floor + 1) >= towerState.floors) towerState.cleared = true
  } else {
    towerState._lastWon = false
    awardXp(20)
  }
  // The actual advance/teardown happens when the player continues from the victory screen.
}

// From the victory screen: advance to the next floor or finish/abort the tower.
function continueTower() {
  if (!towerState.active) { resetToStart(); return }
  if (!towerState._lastWon) { towerState.active = false; resetToStart(); return }   // lost → tower ends
  towerState.floor++
  if (!towerState.endless && towerState.floor >= towerState.floors) {
    towerState.active = false
    awardXp(150)            // tower-complete bonus
    resetToStart()
    return
  }
  applyTowerFloor()
  towerState._applyCarry = true   // resetRound applies the carry-over health to P1
  victoryState = createVictoryState()
  startMatch()
}

// ══════════════════════════════════════════════════════════════════════════════
// FREE-FOR-ALL (Phase 1 POC) — 3-4 fighter last-standing.
// ──────────────────────────────────────────────────────────────────────────────
// A PARALLEL path: fighters live in an ARRAY (ffaState.fighters), NOT the p1/p2
// globals, and run generalized camera/physics/combat. The 1v1 update/render loop is
// completely untouched (this path only runs while gameState is FFA_*). Scope is
// deliberately minimal: movement + normals + grab + projectiles + elimination/win.
// Character SPECIALS/ULTIMATES are intentionally NOT wired here (many are pairwise/
// cinematic — Gojo Infinity, domains, etc.) — that's a later phase, like team modes.
const FFA_MAX_PLAYERS = 4
// teamMode + teams[] (per-slot "A"/"B") extend the SAME ffaState; empty teams → pure FFA.
// aiSlots[] (per-slot difficulty string, or null/undefined = human) fills any slot with a CPU —
// so a session can run with fewer real humans than slots (1 human + 3 AI, an AI teammate, etc.).
const ffaState = { active: false, playerCount: 3, charKeys: [], teams: [], teamMode: false, fighters: [], over: false, winner: null, winnerTeam: null, pickSlot: 0, aiSlots: [] }
const FFA_CONTROLS = [P1_CONTROLS, P2_CONTROLS, P3_CONTROLS, P4_CONTROLS]
const FFA_SIDES    = ["p1", "p2", "p3", "p4"]
// Per-slot tint so 3-4 same-ish fighters read apart at a glance (rendered via tintColor).
const FFA_SLOT_TINT = [null, "rgba(239,68,68,0.35)", "rgba(34,197,94,0.35)", "rgba(234,179,8,0.35)"]
// TEAM MODE — 2 teams (A/B) support UNEVEN splits (1v2, 1v3, 2v2). Colours drive the HUD
// bars, the fighter sprite wash (visual team indicator) and the winner banner.
const FFA_TEAMS   = ["A", "B"]
const TEAM_COLORS = { A: "#38bdf8", B: "#fb7185" }
const TEAM_TINT   = { A: "rgba(56,189,248,0.40)", B: "rgba(251,113,133,0.44)" }
// Same-team test — only bites in team mode (pure FFA has no team property → always false).
function ffaSameTeam(a, b) { return !!(ffaState.teamMode && a && b && a.team && a.team === b.team) }

// AI-fill difficulty cycle (reuses ai.js AI_DIFFICULTIES tiers). A device-capable slot cycles
// HUMAN(null) → easy → adaptive → impossible → HUMAN; a slot with no device skips HUMAN.
const FFA_AI_DIFFS = ["easy", "adaptive", "impossible"]
function ffaCycleSlotAssignment(slot) {
  const forced  = slot >= ffaDeviceCount()               // no device → CPU only
  const current = ffaState.aiSlots[slot] || null
  const idx     = FFA_AI_DIFFS.indexOf(current)          // -1 when currently HUMAN
  if (idx < 0) { ffaState.aiSlots[slot] = FFA_AI_DIFFS[0]; return }        // HUMAN → first CPU tier
  if (idx < FFA_AI_DIFFS.length - 1) { ffaState.aiSlots[slot] = FFA_AI_DIFFS[idx + 1]; return }  // next tier
  ffaState.aiSlots[slot] = forced ? FFA_AI_DIFFS[0] : null                // wrap: forced→easy, else→HUMAN
}

// Default per-slot assignment when entering slot-select: any slot beyond the connected devices
// defaults to CPU (easy); device-backed slots default to HUMAN. This is the "any slot not
// claimed by a device defaults to AI" rule — applied at the UI layer, NOT in startFFAMatch
// (so the harness/explicit callers keep full control and existing all-human tests are unaffected).
function ffaDefaultAISlots(count) {
  const dev = ffaDeviceCount()
  return Array.from({ length: count }, (_, i) => (i < dev ? null : "easy"))
}

// Local input capacity: keyboard P1 + keyboard P2 + one controller per connected pad.
// The setup screen caps player count to this so no uncontrollable fighter can spawn.
function ffaMaxAvailablePlayers() {
  return Math.min(FFA_MAX_PLAYERS, 2 + (getConnectedPadCount?.() || 0))
}

// Connected local input DEVICES: keyboard P1 + keyboard P2 + one per pad. Slots below this
// index CAN be driven by a human; slots at/above it have no device and default to AI (a
// player may also choose AI for a device-capable slot). With AI-fill, player COUNT is no
// longer device-capped (AI fills the rest) — this only bounds how many slots can be human.
function ffaDeviceCount() { return Math.min(FFA_MAX_PLAYERS, 2 + (getConnectedPadCount?.() || 0)) }

// SYNTHETIC control map for an AI-driven FFA slot. AI fighters are driven exactly like the
// 1v1 CPU — applyAIInputToKeys writes into the `keys` global and getFighterInput reads it back
// (with buffering) — so they need REAL, unique key names. The human P3/P4 maps bind to empty
// strings ("") which collapse every action onto keys[""]; these private names never collide
// with human binds or each other. Mirrors P1's shape (jump shares up; charge/toggle/transform
// share one key; dash is double-tap only → unbound).
function makeAIControls(slot) {
  const p = `_ai${slot}_`
  return {
    left: p + "L", right: p + "R", up: p + "U", down: p + "D", jump: p + "U",
    light: p + "lt", heavy: p + "hv", upAttack: p + "ua", special: p + "sp", ultimate: p + "ult",
    grab: p + "gr", charge: p + "ch", toggle: p + "ch", transform: p + "ch", dash: ""
  }
}

function ffaAliveFighters() { return ffaState.fighters.filter(f => f && !f.eliminated) }

// Nearest OTHER living ENEMY — the "primary" target for grab/facing/updateCombat. In team
// mode teammates are skipped (friendly fire off); in pure FFA the skip is a no-op so any
// other fighter qualifies. Multi-target resolution below also skips teammates.
function ffaNearest(fighter, others) {
  let best = null, bestD = Infinity
  for (const o of others) {
    if (!o || o === fighter || o.eliminated) continue
    if (ffaSameTeam(fighter, o)) continue
    const d = Math.abs((o.x || 0) - (fighter.x || 0))
    if (d < bestD) { bestD = d; best = o }
  }
  return best
}

// Face each fighter toward its nearest living opponent (generalized updateFacing).
function updateFFAFacing(live) {
  for (const f of live) {
    const n = ffaNearest(f, live)
    if (n) f.facing = (n.x < f.x) ? -1 : 1
  }
}

// ── AI-FILLED SLOTS ───────────────────────────────────────────────────────────
// Drive every AI-assigned fighter for this frame. Each AI slot owns its OWN controller
// instance (created in setupFFAFighters), so N CPUs run independently — the single 1v1
// p2AI is NOT shared here. TARGET SELECTION runs FIRST and re-picks every frame: the
// nearest living OPPONENT (ffaNearest already skips self, the eliminated, AND — in team
// mode — teammates, so an AI never even attempts to attack an ally, and a KO'd target is
// dropped on the very next frame with no stuck state). The chosen enemy is then handed to
// the UNCHANGED per-target ai.js decision logic via getAIInput/applyAIInputToKeys — the
// exact path the 1v1 CPU uses (writes fighter.controls keys → getFighterInput buffers them).
// Choosing NEAREST (not lowest-health) keeps the AI's target aligned with the fighter it is
// already facing and whose hurtbox its multi-target swing will actually reach.
function updateFFAAIInputs(live) {
  for (const f of live) {
    if (!f?._aiControlled || !f._aiController) continue
    const target = ffaNearest(f, live)
    f._aiTargetSlot = target ? target.ffaSlot : null
    if (!target) { clearAIControlKeys(f); continue }   // no valid opponent (shouldn't happen mid-match)
    applyAIInputToKeys(f, getAIInput(f._aiController, f, target, { stage: getStageTheme(), roundNumber, mode: "ffa" }))
  }
}

// One fighter's combat step: normals/grab/timers via updateCombat (vs the nearest), THEN
// the active hitbox is tested against EVERY other fighter (not one fixed defender). hasHit
// gates it to a single connect per swing (a punch hits whoever's in range first).
function updateFFACombat(fighter, others, opts) {
  const nearest = ffaNearest(fighter, others)
  if (!nearest) return
  if (fighter.hitstun > 0 || fighter.blockstun > 0) { updateCombat(fighter, nearest, {}, opts); return }

  const inputState = getFighterInput(fighter)
  const vKeys      = mapInputToVirtualKeys(inputState, fighter.controls)
  const ctrlState  = buildNormalControlState(fighter, vKeys)
  // Harness/dev hook: force a normal this frame (controller players can't be driven from
  // Playwright, so tests trigger P3/P4 attacks through this).
  if (fighter._forceAttack) { ctrlState[fighter._forceAttack] = true; fighter._forceAttack = null }

  updateCombat(fighter, nearest, ctrlState, opts)   // input→move, timers, recovery + hit vs nearest

  // MULTI-TARGET: if the swing hasn't connected with the nearest, test it against the rest.
  // FRIENDLY FIRE OFF: teammates are NOT valid targets (full no-sell — the swing passes
  // through allies to reach an enemy behind them, rather than body-blocking a whiff).
  if (fighter.attacking && fighter.currentAttack && !fighter.currentAttack.hasHit) {
    for (const d of others) {
      if (!d || d === nearest || d.eliminated || ffaSameTeam(fighter, d)) continue
      resolveAttackHit(fighter, d, opts.hitEffects, { stageWidth: opts.stageWidth, damageNumbers: opts.damageNumbers })
      if (fighter.currentAttack?.hasHit) break
    }
  }
}

// Lightweight effects tick for FFA (the 2p updateEffectsAndDomains is p1/p2-coupled).
function updateFFAEffects(live) {
  updateEffects()
  updateEnergyRegen(live)
  for (let i = hitSparks.length - 1; i >= 0; i--) {
    const spark = hitSparks[i]
    if (spark?._fresh !== false) { spark.maxTimer = spark.maxTimer || spark.timer; spawnDamageNumber(spark); spark._fresh = false }
    spark.timer--
    if (spark.timer <= 0) hitSparks.splice(i, 1)
  }
  updateDamageNumbers()
}

// Spawn N fighters spread across the WIDE arena. In team mode fighters are ORDERED so
// teammates spawn adjacent (all Team A on the left, Team B on the right) — reads clearly
// and gives each team a side. tintColor washes the sprite by team (or by slot in pure FFA).
function setupFFAFighters(count, charKeys, teams, aiSlots = []) {
  const ww = getStageWorldWidth()
  const order = Array.from({ length: count }, (_, i) => i)
  if (ffaState.teamMode) order.sort((a, b) => (teams[a] || "").localeCompare(teams[b] || ""))
  const fighters = []
  order.forEach((slot, pos) => {
    const key  = charKeys[slot] || "gojo"
    const char = characters[key] || characters.gojo
    const frac = count <= 1 ? 0.5 : 0.16 + 0.68 * (pos / (count - 1))
    const x    = Math.round(ww * frac)
    // AI slot → give it a private synthetic control map (so applyAIInputToKeys/getFighterInput
    // round-trip) and its OWN controller. Human slot → its real device control map.
    const aiDiff   = aiSlots[slot] || null
    const controls = aiDiff ? makeAIControls(slot) : FFA_CONTROLS[slot]
    const f = createFighter(key, char, x, x < ww / 2 ? 1 : -1, controls, FFA_SIDES[slot])
    applySkin(f, "default")
    f.ffaSlot = slot
    f.eliminated = false
    if (aiDiff) {
      f._aiControlled = true
      f.aiDifficulty  = aiDiff
      f._aiController  = createAIController(aiDiff)
      f._aiTargetSlot  = null
    }
    if (ffaState.teamMode) {
      f.team = teams[slot] || "A"
      f.tintColor = TEAM_TINT[f.team] || null   // sprite wash = team colour (visual indicator)
    } else if (FFA_SLOT_TINT[slot]) {
      f.tintColor = FFA_SLOT_TINT[slot]
    }
    fighters.push(f)
  })
  // Keep fighters indexed by SLOT so harness hooks / HUD address players consistently.
  const bySlot = []
  for (const f of fighters) bySlot[f.ffaSlot] = f
  return bySlot
}

function startFFAMatch() {
  matchConfig.mode = "ffa"
  matchConfig.selectedStage = stages.find(s => s.ffa) || stages[0]
  ffaState.active = true; ffaState.over = false; ffaState.winner = null; ffaState.winnerTeam = null
  // Team mode is on when ≥2 distinct teams are assigned across the slots.
  const distinctTeams = new Set((ffaState.teams || []).slice(0, ffaState.playerCount))
  ffaState.teamMode = distinctTeams.size >= 2
  syncPhysicsBounds()
  ffaState.fighters = setupFFAFighters(ffaState.playerCount, ffaState.charKeys, ffaState.teams, ffaState.aiSlots)
  clearAbilityState(); clearEffects(); clearDomains()
  hitSparks.length = 0; damageNumbers.length = 0; activeDomains.length = 0
  if (typeof clearInputBuffers === "function") clearInputBuffers(ffaState.fighters)
  countdown = ROUND_START_COUNTDOWN
  if (typeof camera.reset === "function") camera.reset()
  updateCameraBounds()
  camera.updateMulti(ffaState.fighters, canvas, true)   // SNAP to frame the full spread
  sound.playStageTrack?.(matchConfig.selectedStage)
  gameState = GAME_STATES.FFA_BATTLE
}

function updateFFABattle() {
  const opts = { hitEffects: hitSparks, damageNumbers, stageWidth: getStageWorldWidth() }
  if (ffaState.over) return   // result overlay is showing; wait for a click (handleMenuClicks)

  if (countdown > 0) {
    if (countdown === 1) sound.play?.(SFX.UI_MATCH_START)
    countdown = Math.max(0, countdown - 1)
    camera.updateMulti(ffaAliveFighters(), canvas)
    return
  }

  const live = ffaAliveFighters()
  for (const f of live) updateGamepadEdges(f)         // controller motion/edges (P3/P4 pads)
  updateFFAFacing(live)
  updateFFAAIInputs(live)                             // AI-filled slots: pick target + write their keys BEFORE input is read
  for (const f of live) updateMovementInput(f)
  // Harness/dev movement injection (controller players can't be driven from Playwright).
  for (const f of live) if (f._forceMove) f.vx = f._forceMove * (f.baseSpeed || f.speed || 7)
  for (let i = 0; i < ffaState.fighters.length; i++) {
    const f = ffaState.fighters[i]
    if (f && !f.eliminated) ffaState.fighters[i] = updateFighterState(f)
  }

  const live2 = ffaAliveFighters()
  // PHYSICS: pairwise body collision over EVERY pair (up to 6 at 4 players).
  for (let i = 0; i < live2.length; i++)
    for (let j = i + 1; j < live2.length; j++)
      physics.resolvePlayerCollision(live2[i], live2[j])

  updateFFAFacing(live2)
  updateFFAEffects(live2)
  // COMBAT: each fighter's hitbox vs every other's hurtbox.
  for (const f of live2) if (live2.length > 1) updateFFACombat(f, live2.filter(o => o !== f), opts)

  // PROJECTILES: hit any non-owner fighter.
  updateCombatProjectiles(activeProjectiles, getStageWorldWidth(), live2)
  resolveProjectileHitsMulti(activeProjectiles, live2, hitSparks, damageNumbers)

  // CAMERA: frame ALL living fighters.
  camera.updateMulti(ffaAliveFighters(), canvas)

  checkFFAOutcome()
}

// Eliminate any fighter at 0 health. WIN: pure FFA = last individual standing; TEAM mode =
// last team with a surviving member (a KO does NOT end the round while a teammate lives).
function checkFFAOutcome() {
  for (const f of ffaState.fighters) {
    if (f && !f.eliminated && (f.health || 0) <= 0) {
      f.eliminated = true
      f.vx = 0; f.vy = 0
      knockoutFlash = Math.max(knockoutFlash, 14)
      camera.shake?.(10, 8)
    }
  }
  if (ffaState.over) return
  const alive = ffaAliveFighters()
  if (ffaState.teamMode) {
    const teamsLeft = [...new Set(alive.map(f => f.team))]
    if (teamsLeft.length <= 1) {
      ffaState.over = true
      ffaState.winnerTeam = teamsLeft[0] || null
      ffaState.winner = alive[0] || null
      sound.play?.(SFX.KO); sound.stopMusic?.()
      // RICK team-win callout — "blue team gets that one" (Team A = #38bdf8) / "the red guys got
      // that point" (Team B = #fb7185). Fires only when Rick is a participant in the team match.
      if (ffaState.fighters.some(f => f?.rosterKey === "rick")) {
        if      (ffaState.winnerTeam === "A") sound.playSfxFile?.(pickRickVoice("teamBlue"), null)
        else if (ffaState.winnerTeam === "B") sound.playSfxFile?.(pickRickVoice("teamRed"), null)
      }
    }
  } else if (alive.length <= 1) {
    ffaState.over = true
    ffaState.winner = alive[0] || null
    ffaState.winnerTeam = null
    sound.play?.(SFX.KO); sound.stopMusic?.()
  }
}

function endFFA() {
  ffaState.active = false; ffaState.over = false; ffaState.winner = null; ffaState.winnerTeam = null
  ffaState.teamMode = false; ffaState.teams = []; ffaState.fighters = []; ffaState.aiSlots = []
  matchConfig.mode = "vs"
  resetToStart()
}

// Training mode state. `enabled` is derived each frame (menu mode OR F1 debug). The
// rest are training-only toggles driven by hotkeys (F2 reset / F3 infinite / F4 dummy):
//   infiniteResources — pin BOTH fighters' health+energy to max each frame (toggle via
//     F3; default OFF so damage/combo/meter read naturally and the dummy visibly takes
//     hits — turn ON for long practice so nobody dies or runs out of meter). KO already
//     can't end a training session (checkRoundEnd skips), so this is purely convenience.
//   dummyBehavior     — "stand" | "block" | "jump": training-only override applied in
//     updateCPUInput (does NOT touch ai.js's shared "dummy" zero-baseline profile).
const trainingState = { enabled: false, infiniteResources: false, dummyBehavior: "stand" }
const DUMMY_BEHAVIORS = ["stand", "block", "jump"]
const _trainingKeyPrev = {}   // edge-detect the F2/F3/F4 training hotkeys
const p2AI             = createAIController("easy")
const settingsButtonRect = { x: window.innerWidth - 220, y: 30, w: 180, h: 50 }

// ------------------------------------------------------------------
// HELPERS
// ------------------------------------------------------------------
function toFiniteNumber(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function buildUniverseMap() {
  const map = {}
  for (const key of Object.keys(characters)) {
    if (characters[key]?.hidden) continue   // e.g. Mahoraga — a transform form, not selectable
    const u = characters[key]?.universe || "other"
    if (!map[u]) map[u] = []
    map[u].push(key)
  }
  return map
}

function formatUniverseName(u) {
  return String(u).split("_").map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(" ")
}

// Beta roster: every character that actually has sprite art, derived LIVE from
// characters.js `hasSprites` so it self-updates as more characters get sprites (no
// hardcoded list). hasSpritesKey is the per-key predicate the beta filters use.
function spriteRosterKeys() { return Object.keys(characters).filter(k => characters[k]?.hasSprites) }
function hasSpritesKey(key) { return !!characters[key]?.hasSprites }
// Universes that contain at least one sprite-having character — the only universes the
// beta code exposes on the universe-select screen.
function spriteUniverseSet() {
  const set = new Set()
  for (const k of spriteRosterKeys()) { const u = characters[k]?.universe; if (u) set.add(u) }
  return set
}

function getUniverseCharacters() {
  if (!matchConfig.selectedUniverse || !universeMap[matchConfig.selectedUniverse]) return []
  const keys = universeMap[matchConfig.selectedUniverse]
  // Beta code (GojoV1): restrict selectable fighters to those WITH sprite art, even if a
  // spriteless-universe somehow got selected (defense-in-depth alongside the universe-list
  // filter). Dev/full-unlock sees the whole roster (the !isDevUnlocked guard).
  if (isBetaUnlocked() && !isDevUnlocked()) return keys.filter(hasSpritesKey)
  return keys
}

function getStageTheme()        { return matchConfig.selectedStage || stages[0] }
function getStageFloorHeight()  { return getStageTheme()?.floorHeight || FLOOR_HEIGHT }
function getStageGroundOffset() { const s = getStageTheme(); return typeof s?.groundOffset === "number" ? s.groundOffset : 100 }
function getStageWorldWidth()   { return getStageTheme()?.worldWidth || WORLD_WIDTH }

function refreshStageMetrics() { groundY = canvas.height - getStageFloorHeight() - getStageGroundOffset() }
function getOpponent(f)        { return f === p1 ? p2 : p1 }

function getAbilityContext() {
  return {
    p1, p2, getOpponent, camera, activeDomains,
    worldWidth: getStageWorldWidth(),
    canvasHeight: canvas?.height,     // giant FX (Susanoo arm-height spawns) mirror sprite.js's canvas-relative sizing
    groundY,                          // floor line — lightning strikes plant their column on it
    createFighter,
    deltaMs: 1000 / 60,
    triggerSlowdown: (frames, target) => { slowdownTimer = frames || 50; slowdownTarget = target || null }
  }
}

// #21 CLONE RENDAN STORM detection — fire the clone flurry ONCE, the frame Naruto's basic
// light-string hit lands, while clones are alive. `currentAttack` lives for the whole swing
// and `hasHit` latches true on contact, so the `_cloneRendanDone` marker guarantees exactly
// one flurry per swing. No-op for non-Naruto, non-light, or no-clone cases.
function maybeCloneRendanStorm(fighter) {
  if (!fighter || fighter.rosterKey !== "naruto") return
  const ca = fighter.currentAttack
  if (!ca || ca.name !== "light" || !ca.hasHit || ca._cloneRendanDone) return
  if (countShadowClones(fighter) <= 0) return
  ca._cloneRendanDone = true
  applyCloneRendanStorm(fighter, getOpponent(fighter), getAbilityContext())
}

function updateCameraBounds() {
  const visH = canvas.height
  if (typeof camera.setWorldBounds === "function")  camera.setWorldBounds(getStageWorldWidth(), visH)
  if (typeof camera.setVerticalLimits === "function") camera.setVerticalLimits(0, visH)
  camera.minZoom             = 0.65
  camera.maxZoom             = 1.0
  camera.moveSmooth          = 0.1
  camera.zoomSmooth          = 0.08
  camera.verticalMoveSmooth  = 0.06
  camera.horizontalPadding   = 260
  camera.verticalPadding     = 220
  camera.lookAheadStrength   = 90
  camera.verticalBias        = -20
  camera.topSafeMargin       = 80
  camera.bottomSafeMargin    = 60
}

function syncPhysicsBounds() {
  refreshStageMetrics()
  if (typeof physics.setGroundY    === "function") physics.setGroundY(groundY)
  if (typeof physics.setStageBounds=== "function") physics.setStageBounds(0, getStageWorldWidth())
  physics.groundY = groundY
}

// Single source of truth: the live P1/P2 bind maps (rebindable at runtime).
function getControlsForHistory(side) { return side === "p1" ? P1_CONTROLS : P2_CONTROLS }
function getGroundedYForHeight(h)    { return groundY - toFiniteNumber(h, 100) }
function getGroundedYForFighter(f)   { return getGroundedYForHeight(f?.h ?? f?.height) }

function getSpawnPositions() {
  const sw = getStageWorldWidth()
  const p1W = toFiniteNumber(matchConfig.p1Char?.w ?? matchConfig.p1Char?.width, 60)
  const p2W = toFiniteNumber(matchConfig.p2Char?.w ?? matchConfig.p2Char?.width, 60)
  const cx  = sw * 0.5
  const p1X = Math.max(EDGE_SPAWN_PADDING, Math.min(sw - p1W - EDGE_SPAWN_PADDING, cx - CENTER_SPAWN_GAP - p1W))
  const p2X = Math.max(EDGE_SPAWN_PADDING, Math.min(sw - p2W - EDGE_SPAWN_PADDING, cx + CENTER_SPAWN_GAP))
  return { p1X, p2X }
}

function isPvP() { return matchConfig.mode === "pvp" }

// ------------------------------------------------------------------
// VIRTUAL KEY TRANSLATOR
// ------------------------------------------------------------------
function mapInputToVirtualKeys(inputState, controls) {
  if (!inputState) return {}
  const v = {}
  if (inputState.left)    v[controls.left]    = true
  if (inputState.right)   v[controls.right]   = true
  if (inputState.up || inputState.jump) v[controls.up] = true
  if (inputState.down)    v[controls.down]    = true
  if (inputState.light)   v[controls.light]   = true
  if (inputState.heavy)   v[controls.heavy]   = true
  if (inputState.upAttack)v[controls.upAttack]= true
  if (inputState.dash)    v[controls.dash]    = true
  if (inputState.special) v[controls.special] = true
  if (inputState.ultimate)v[controls.ultimate]= true
  if (inputState.grab)    v[controls.grab]    = true
  if (inputState.charge)  v[controls.charge]  = true
  return v
}

// ------------------------------------------------------------------
// FIGHTER FACTORY
// ------------------------------------------------------------------
function createFighter(charKey, char, x, facing, controls, side) {
  const movement  = char?.movement || {}
  const stats     = char?.stats    || {}
  const baseFormKey = char?.transformationOrder?.[0] || "base"
  const baseForm    = char?.transformations?.[baseFormKey] || null

  const width   = toFiniteNumber(char?.w ?? char?.width,   60)
  const height  = toFiniteNumber(char?.h ?? char?.height, 100)
  const maxHealth  = Math.max(1, toFiniteNumber(stats.maxHealth  ?? char?.maxHealth  ?? char?.health,  1000))
  const maxEnergy  = Math.max(1, toFiniteNumber(stats.maxEnergy  ?? char?.maxEnergy  ?? char?.energy  ?? char?.meter, DEFAULT_MAX_ENERGY))
  // Balance: EVERY fighter starts each round at 50% of max energy, so no domain
  // (which costs a FULL bar — see spendFullBarForDomain) can open at round start.
  const startingEnergy = maxEnergy * 0.5
  const speed   = Math.max(DEFAULT_SPEED, toFiniteNumber(stats.speed  ?? char?.speed  ?? movement?.speed, 7))
  const jump    = Math.max(DEFAULT_JUMP,  toFiniteNumber(char?.jump   ?? movement?.jump, 7))
  const groundedY = getGroundedYForHeight(height)
  const attackMultiplier = toFiniteNumber(char?.attackMultiplier,  1)
  const damageMultiplier = toFiniteNumber(char?.damageMultiplier,  1)
  const speedMultiplier  = toFiniteNumber(char?.speedMultiplier,   1)
  const defenseMultiplier = toFiniteNumber(char?.defenseMultiplier, 1)

  return {
    ...char,
    rosterKey: charKey,
    // p1→1, p2→2, p3→3, p4→4 (p3/p4 only exist in the FFA POC). 1v1 is unchanged.
    playerNumber: { p1: 1, p2: 2, p3: 3, p4: 4 }[side] || 2,
    // Toji 3-stance weapon system (foundation): every Toji starts in Blade.
    weaponStance: charKey === "toji" ? "blade" : undefined,
    // Ben 10's chosen 5-alien Omnitrix loadout (read by setupBen10 on frame 1).
    selectedAliens: (side === "p1" ? matchConfig.p1Aliens : matchConfig.p2Aliens) || null,
    side, controls, x,
    y: groundedY,
    groundY: groundedY + height,
    anchor: "topleft",
    vx: 0, vy: 0,
    w: width, h: height,
    facing,
    health: maxHealth, maxHealth,
    energy: startingEnergy, maxEnergy,
    baseSpeed: speed, baseJump: jump, speed, jump,
    jumpForce:    -(stats.jumpPower || 32),
    maxJumps:     stats.maxJumps || movement.jumpCount || 1,
    jumpsUsed: 0, jumpCount: 0, jumpHeld: false,
    dashSpeed:    stats.dashSpeed    || 20,
    dashDuration: stats.dashDuration || 8,
    dashCooldownMax: stats.dashCooldownMax || 30,
    dashTimer: 0, dashCooldown: 0,
    attackMultiplier, damageMultiplier, speedMultiplier, defenseMultiplier,
    moveMultiplier:        movement.moveMultiplier        || 1,
    attackSpeedMultiplier: movement.attackSpeedMultiplier || 1,
    wallJump:    !!movement.wallJump,
    dashTeleport: !!movement.dashTeleport,
    hitstun: 0, blockstun: 0, hitstop: 0, attackCooldown: 0,
    currentAttack: null, attacking: false, currentMove: null,
    currentMoveData: null, moveTimer: 0, movePhase: "idle",
    hasHitThisMove: false, isBlocking: false,
    grounded: true, onGround: true, isLaunched: false,
    airHits: 0, maxAirHits: 3,
    comboCounter: 0, comboTimer: 0,
    directionHistory: [],
    teleportFlash: 0, invulnTimer: 0, colorFlash: 0,
    parryFlash: 0, armorFlash: 0, clashFlash: 0,
    leftTapTime: 0, rightTapTime: 0,
    infinityActive: false,
    absoluteDefenseActive: false,   // Sasuke — Absolute Defense charge-toggle (combat.shouldSasukeAbsoluteDefenseNegate)
    currentForm:     baseFormKey,
    currentFormData: baseForm,
    transformIndex:  0,
    ultimateCooldown: 0,
    summonCooldown:  0,
    domainBuff:      false,
    activeDomainTimer: 0,
    disabledSpecials: [],
    permanentForm: false, oneWayTransformation: false,
    deathRitual: false, ritualActive: false,
    pendingCharacterSwap: null,
    isGrabbed: false, grabTimer: 0, grabInputBuffer: 0,
    knockdownState: false, knockdownTimer: 0, techRoll: null,
    wallBounce: false,
    airDashCount: 0, airDashing: false, airDashTimer: 0,
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
function getFallbackCharacterKey() { return allCharacterKeys[0] || null }

function ensureTrainingOpponent() {
  if (matchConfig.mode !== "training") return
  if (matchConfig.p2CharKey && matchConfig.p2Char) return
  const k = matchConfig.p1CharKey || getFallbackCharacterKey()
  if (!k) return
  matchConfig.p2CharKey = k
  matchConfig.p2Char    = characters[k]
}

function resetRound() {
  damageNumbers.length = 0
  knockoutFlash  = 0
  slowdownTimer  = 0
  slowdownTarget = null
  roundTimer     = ROUND_TIME

  matchStats.roundStartHealth = matchStats.roundStartHealth || {}
  matchStats.roundStartHealth.p1 = matchConfig.p1Char?.stats?.maxHealth || 1000
  matchStats.roundStartHealth.p2 = matchConfig.p2Char?.stats?.maxHealth || 1000

  for (const side of ["p1","p2"]) {
    comboDisplay[side].opacity   = 0
    comboDisplay[side].fadeDir   = "out"
    comboDisplay[side].lastCount = 0
    comboDisplay[side].holdTimer = 0
  }

  syncPhysicsBounds()
  ensureTrainingOpponent()

  const { p1X, p2X } = getSpawnPositions()
  p1 = createFighter(matchConfig.p1CharKey, matchConfig.p1Char, p1X,  1, P1_CONTROLS, "p1")
  p2 = createFighter(matchConfig.p2CharKey, matchConfig.p2Char, p2X, -1, P2_CONTROLS, "p2")
  applySkin(p1, matchConfig.p1Skin)   // Task 4: load the selected skin's art
  applySkin(p2, matchConfig.p2Skin)
  applyMirrorTint(p1, p2)   // same-character mirror → red wash on P2 (Task 1)
  // Tower health carry-over: at the START of a new floor (not between rounds),
  // set P1's health to the carried %. _applyCarry is one-shot (set in continueTower).
  if (towerState._applyCarry && p1) {
    p1.health = Math.max(1, Math.round((p1.maxHealth || 1000) * towerState.carryPct))
    towerState._applyCarry = false
  }

  // Sprite-scale verification (temporary — safe to delete). Confirms spriteScale
  // and animationData survive createFighter; for Gojo expect spriteScale 2, true.
  for (const f of [p1, p2]) {
    console.log("[sprite]", f.rosterKey, "spriteScale=", f.spriteScale, "hasAnimData=", !!f.animationData)
  }

  countdown = ROUND_START_COUNTDOWN
  clearAbilityState()      // activeProjectiles (shared), activeSummons, pending Naruto clones
  clearEffects()           // activeEffects — timed buffs/stuns/regen (reverts each effect first)
  clearAllBindingVows()    // activeVows — drop stale fighter refs (fighters are recreated below)
  vowCue.timer = 0
  clearDomains()
  clearKuramaUltimate()
  clearSasukeCinematic()
  clearSSJRoseCinematic()
  clearGokuBlackSwordCinematic()
  clearVegetaFinalFlashCinematic()
  clearBeerusKiBallCinematic()

  if (typeof clearInputBuffers === "function") clearInputBuffers([p1, p2].filter(Boolean))

  hitSparks.length     = 0
  activeDomains.length = 0
  roundBreakTimer      = 0

  resetAIController(p2AI)
  if (isPvP()) {
    setAIDifficulty(p2AI, "dummy")
  } else {
    setAIDifficulty(p2AI, matchConfig.mode === "training" ? "dummy" : matchConfig.aiDifficulty)
  }
  clearAIControlKeys(p2)

  endDomainCinematic()   // guarantee camera limits restore even if a domain was mid-cinematic
  if (typeof camera.reset  === "function") camera.reset()
  updateCameraBounds()
  if (p1 && p2 && typeof camera.update === "function") camera.update(p1, p2, canvas)
}

// ── PRE-MATCH INTRO SELECTION ─────────────────────────────────────────────────
// Generic "pick one of N intros at random" for the pre-round entrance. A character
// can declare `introPool: ["actionA", "actionB", ...]` in characters.js (animationData
// action names); this returns one at random each match so intros vary across rounds.
// Not gated to any count — add a 4th pool entry and it joins the rotation automatically.
// No pool → returns null, and sprite.js falls back to the shared "transform" intro slot,
// so every existing character's behaviour is unchanged.
function pickIntroVariant(fighter) {
  const pool = fighter && fighter.introPool
  if (!Array.isArray(pool) || pool.length === 0) return null
  return pool[Math.floor(Math.random() * pool.length)]
}

// FIXED-ORDER multi-part intro (e.g. Toji: walk-in → ready-up). A character declares
// `introSequence: [actionA, actionB, ...]` whose steps play back-to-back IN ORDER —
// distinct from introPool (random pick). Each step holds for its own play duration
// (frames × speed), then advanceIntroSequence() flips to the next; the last step holds.
function introStepFrames(fighter, action) {
  const d = fighter && fighter.animationData && fighter.animationData[action]
  if (!d) return 30
  return Math.max(1, (d.frames || 1) * (d.speed || 5))
}
function initIntroVariant(fighter) {
  if (!fighter) return
  fighter._introRevealFrame = 0   // reset the delayed-reveal fade counter (introReveal); see renderHybridFighter
  fighter._introVoiceDone   = false   // reset the once-per-intro voice-line guard (fires at the reveal beat)
  const seq = fighter.introSequence
  if (Array.isArray(seq) && seq.length) {
    fighter._introSeq      = seq
    fighter._introSeqIdx   = 0
    fighter._introVariant  = seq[0]
    fighter._introSeqTimer = introStepFrames(fighter, seq[0])
  } else {
    fighter._introSeq     = null
    fighter._introVariant = pickIntroVariant(fighter)
  }
}
// BEERUS intro voice — fires ONCE per intro at his REVEAL beat (when the delayed-reveal fade begins,
// i.e. the frame he actually becomes visible), not at frame 0. No-op for every other character.
// Per-character intro battle-cry voice, fired once during that fighter's own intro play.
// gateReveal chars (Beerus) hold the line until their delayed-reveal fade begins (introReveal.hide);
// other chars (Naruto) fire on the first intro-play frame. Same beat pattern for all.
const INTRO_VOICE = {
  beerus: { clip: "beerus_intro.mp3", gateReveal: true },   // "…I guess I'll destroy you now"
  naruto: { clip: "naruto_intro.mp3", gateReveal: false },  // 3 opening battle-cry lines back-to-back
  // Sasuke picks ONE of two multi-line intro bursts at random per match (same alternation family
  // as Naruto's win pool). Either clip is a packed cluster fired as a single beat.
  sasuke: { pool: ["sasuke_intro_cluster.mp3", "sasuke_intro_alt2.mp3"], gateReveal: false },
  // Rick picks ONE of six intro/catchphrase barks at random per match ("buckle up", "I'm Rick
  // Sanchez baby", …). Fires at his first intro-play frame (no reveal gate). Distinct from his
  // pre-match NAMECALL clip (rick_intro.mp3) — a character can carry both, like Naruto.
  rick:   { pool: RICK_VOICE.intro, gateReveal: false },
  // Omega Ranger holds his line until the summon smoke DISPERSES and he becomes visible — the
  // part_1→part_2 beat of his two-part introSequence. gateSeqStep waits for _introVariant to reach
  // "intro2" (same delayed-cinematic-reveal idea as Beerus's fade gate, keyed to the sequence step
  // instead of an introReveal fade). "Force, from the future! S.P.D. Omega!"
  omega_ranger: { clip: "omega_intro.mp3", gateSeqStep: "intro2" },
}
function maybeFireIntroVoice(fighter) {
  const cfg = fighter && INTRO_VOICE[fighter.rosterKey]
  if (!cfg || fighter._introVoiceDone) return
  if (cfg.gateReveal && (fighter._introRevealFrame || 0) < (fighter.introReveal?.hide || 0)) return
  if (cfg.gateSeqStep && fighter._introVariant !== cfg.gateSeqStep) return   // hold until the reveal step of a two-part intro
  fighter._introVoiceDone = true
  const clip = cfg.pool ? cfg.pool[Math.floor(Math.random() * cfg.pool.length)] : cfg.clip
  sound.playSfxFile?.(clip, null)
}

function advanceIntroSequence(fighter) {
  if (!fighter || !fighter._introSeq) return
  if (fighter._introSeqIdx >= fighter._introSeq.length - 1) return   // hold final step
  if (--fighter._introSeqTimer > 0) return
  fighter._introSeqIdx++
  fighter._introVariant  = fighter._introSeq[fighter._introSeqIdx]
  fighter._introSeqTimer = introStepFrames(fighter, fighter._introVariant)
}

// SEQUENTIAL pre-match intros (P1 fully, THEN P2). `introStage` walks "p1" → "p2" → "done"; only the
// active side's _introPlaying is on, so the two intros never overlap. Total play time per side =
// its intro length (a fixed-order introSequence sums its steps; a single-variant intro is one action),
// floored so a very short intro isn't a blink. initIntroVariant must have run first (sets _introSeq/_introVariant).
const INTRO_MIN_FRAMES = 54   // ~0.9s minimum per side so even a 1-frame intro reads
let introStage = "done"
let introStageTimer = 0
function introTotalFrames(fighter) {
  if (!fighter) return 0
  const seq = fighter._introSeq
  const total = (Array.isArray(seq) && seq.length)
    ? seq.reduce((s, a) => s + introStepFrames(fighter, a), 0)   // fixed-order sequence: sum all steps
    : introStepFrames(fighter, fighter._introVariant || "transform")
  return Math.max(total, INTRO_MIN_FRAMES)
}

// ── PRE-MATCH CHARACTER ANNOUNCEMENT ──────────────────────────────────────────
// Runs inside the existing round-1 INTRO phase (so it's first-round-only, matching
// the intro convention): zoom on P1 then P2, playing each side's name-call clip if
// mapped. Sides whose character has NO NAMECALL_AUDIO entry are omitted entirely —
// no zoom, no pause, no dead air. If neither side is mapped the sequence never
// activates and the INTRO/countdown play exactly as before (zero added delay).
const NAMECALL_HOLD = 110    // frames to hold the zoom per announced fighter (~1.8s @ 60fps)
const NAMECALL_ZOOM = 1.1    // tight zoom on the announced fighter (camera maxZoom is 1.15)
let namecallBeats  = []      // [{ side, fighter, clip }] — ONLY sides with a mapped clip
let namecallIndex  = 0
let namecallTimer  = 0
let namecallActive = false

function buildNamecallBeats() {
  namecallBeats = []
  for (const side of ["p1", "p2"]) {          // side-based order (P1 then P2), NOT roster order
    const f    = side === "p1" ? p1 : p2
    const clip = f && NAMECALL_AUDIO[f.rosterKey]
    if (f && clip) namecallBeats.push({ side, fighter: f, clip })
  }
}

function startNamecallBeat(i) {
  const beat = namecallBeats[i]
  if (!beat) return
  if (camera.focusOnFighter) camera.focusOnFighter(beat.fighter, NAMECALL_ZOOM)
  sound.playSfxFile?.(beat.clip, null)        // one-shot; honors mute/_sfxVol internally
  namecallTimer = NAMECALL_HOLD
}

// Called from startMatch (after fighters exist). No-op when no side is mapped.
function beginNamecallSequence() {
  buildNamecallBeats()
  namecallIndex  = 0
  namecallActive = namecallBeats.length > 0
  if (namecallActive) startNamecallBeat(0)
}

// The current fighter's name banner, drawn during the announcement (camera already
// zoomed on them). Lower-third so it doesn't cover the fighter.
function drawNamecallBanner() {
  const beat = namecallBeats[namecallIndex]
  if (!beat) return
  const name = (beat.side === "p1" ? matchConfig.p1Char?.name : matchConfig.p2Char?.name)
    || beat.fighter.rosterKey || (beat.side === "p1" ? "Player 1" : "Player 2")
  const cw = canvas.width, ch = canvas.height
  const accent = beat.side === "p1" ? "#38bdf8" : "#f87171"
  ctx.save()
  ctx.textAlign = "center"; ctx.textBaseline = "middle"
  ctx.font = "900 44px Arial"
  const bw = ctx.measureText(name).width + 80, bx = cw / 2 - bw / 2, by = ch * 0.72
  ctx.fillStyle = "rgba(8,12,24,0.82)"; ctx.fillRect(bx, by, bw, 64)
  ctx.strokeStyle = accent; ctx.lineWidth = 3; ctx.strokeRect(bx, by, bw, 64)
  ctx.fillStyle = "#f1f5f9"; ctx.shadowBlur = 18; ctx.shadowColor = accent
  ctx.fillText(name, cw / 2, by + 32)
  ctx.restore()
}

function startMatch() {
  // A standard 1v1/tower/training match never runs the FFA array path — make the flag honest
  // in case an FFA session was left without the result-screen exit (dispatch keys off gameState,
  // so this is bookkeeping hygiene, not a behavior gate).
  ffaState.active = false
  roundNumber  = 1
  roundWins    = { p1: 0, p2: 0 }
  winnerText   = ""
  matchStats   = createMatchStats()
  victoryState = createVictoryState()
  roundTimer   = ROUND_TIME
  // Fresh match → default training toggles (a NEW session shouldn't inherit the last
  // one's infinite/dummy state). Per-round resets (resetRound) deliberately DON'T touch
  // these, so a toggle persists across rounds within the same session.
  trainingState.infiniteResources = false
  trainingState.dummyBehavior     = "stand"

  if (matchConfig.p1CharKey) { preloadCharacterSprites?.(matchConfig.p1CharKey); loadSpriteSheets(matchConfig.p1CharKey) }
  if (matchConfig.p2CharKey) { preloadCharacterSprites?.(matchConfig.p2CharKey); loadSpriteSheets(matchConfig.p2CharKey) }

  resetRound()
  beginNamecallSequence()   // pre-countdown P1→P2 character announcement (skipped if unmapped)
  matchIntroTimer = 90
  gameState       = GAME_STATES.INTRO
  // BUG_9: play the intro/transform strip during the intro window (cleared when
  // BATTLE starts). Harmless for non-sprite fighters (they render procedurally).
  // pickIntroVariant randomly selects one entry from the fighter's `introPool` (if any) so
  // characters with multiple intros (e.g. Sasuke) get visual variety across matches; fighters
  // with no pool get null → sprite.js falls back to the shared "transform" intro (unchanged).
  // initIntroVariant handles Toji's fixed-order introSequence AND falls back to
  // pickIntroVariant (random from introPool) for everyone else — so Sasuke's 3-intro
  // random cycle is preserved unchanged while Toji's two-part sequence is set up.
  // SEQUENTIAL: start ONLY P1's intro now; P2's begins after P1's completes (see the INTRO
  // stage machine in updateCurrentState). P2 stands idle until its turn.
  if (p1) { p1._introPlaying = true; initIntroVariant(p1) }
  if (p2) { p2._introPlaying = false }
  introStage      = p1 ? "p1" : (p2 ? "p2" : "done")
  introStageTimer = p1 ? introTotalFrames(p1) : (p2 ? introTotalFrames(p2) : 0)
  if (!p1 && p2) { p2._introPlaying = true; initIntroVariant(p2) }

  sound.stopMusic?.()
  sound.playStageTrack?.(matchConfig.selectedStage)
  sound.play?.(SFX.UI_MATCH_START)
}

function resetSelections() {
  matchConfig.selectedUniverse = null
  matchConfig.selectedStage    = null
  matchConfig.selectingSide    = "p1"
  matchConfig.p1Char = null; matchConfig.p2Char = null
  matchConfig.p1CharKey = null; matchConfig.p2CharKey = null
  matchConfig.p1Aliens = null; matchConfig.p2Aliens = null
  matchConfig.alienDraft = []
  matchConfig.p1Skin = "default"; matchConfig.p2Skin = "default"
  hoverUniverseIndex  = 0
  hoverCharacterIndex = 0
  hoverStageIndex     = 0
}

// Skin-select state (Task 4).
let skinSelectSide = "p1"
let hoverSkinIndex = 0

// After a character is locked in for a side, open the SKIN-SELECT for that side's
// character. Confirming a skin there calls _proceedAfterSkin() to continue.
function proceedAfterCharacter(side) {
  skinSelectSide = side
  hoverSkinIndex = 0
  matchConfig[side + "Skin"] = "default"   // reset to default until a skin is picked
  gameState = GAME_STATES.SELECT_SKIN
}

// Advance the select flow after the skin is chosen: P1 → P2's universe pick (or
// stage in training/tower); P2 → stage select.
function _proceedAfterSkin(side) {
  if (side === "p1") {
    if (matchConfig.mode === "tower") {
      applyTowerFloor()                       // opponent + difficulty + auto-assigned stage
      startMatch()                            // SKIP SELECT_STAGE — Tower picks its own stage
    } else if (matchConfig.mode === "training") {
      matchConfig.p2Char    = matchConfig.p1Char
      matchConfig.p2CharKey = matchConfig.p1CharKey
      matchConfig.p2Aliens  = matchConfig.p1Aliens ? matchConfig.p1Aliens.slice() : null
      gameState = GAME_STATES.SELECT_STAGE
    } else {
      matchConfig.selectingSide    = "p2"
      matchConfig.selectedUniverse = null
      gameState = GAME_STATES.SELECT_UNIVERSE
    }
  } else {
    gameState = GAME_STATES.SELECT_STAGE
  }
}

// Layout for the skin cards on the SELECT_SKIN screen.
function getSkinSelectRects(canvas, count) {
  const rects = []
  const cardW = 180, cardH = 230, gap = 28
  const total = count * cardW + (count - 1) * gap
  const x0 = canvas.width / 2 - total / 2, y = canvas.height / 2 - cardH / 2
  for (let i = 0; i < count; i++) rects.push({ x: x0 + i * (cardW + gap), y, w: cardW, h: cardH, index: i })
  return rects
}

function drawSkinSelectScreen() {
  ctx.fillStyle = "#0a1322"; ctx.fillRect(0, 0, canvas.width, canvas.height)
  const charKey = matchConfig[skinSelectSide + "CharKey"]
  const skins = getSkins(charKey)
  ctx.textAlign = "center"; ctx.fillStyle = "#e2e8f0"; ctx.font = "700 32px Arial"
  ctx.fillText(`SELECT SKIN — ${charKey?.toUpperCase() || ""}  (P${skinSelectSide === "p1" ? 1 : 2})`, canvas.width / 2, 110)
  const rects = getSkinSelectRects(canvas, skins.length)
  rects.forEach((r, i) => {
    const skin = skins[i]
    const unlocked = isSkinUnlocked(charKey, skin.id)
    ctx.save()
    ctx.fillStyle = i === hoverSkinIndex ? "#1e3a5f" : "#152030"
    ctx.fillRect(r.x, r.y, r.w, r.h)
    ctx.strokeStyle = i === hoverSkinIndex ? "#7dd3fc" : "#334155"; ctx.lineWidth = 2
    ctx.strokeRect(r.x, r.y, r.w, r.h)
    const img = _skinPortrait(skin.portrait)
    if (img && img.complete && img.naturalWidth > 0) {
      ctx.save(); ctx.beginPath(); ctx.rect(r.x + 10, r.y + 10, r.w - 20, r.h - 70); ctx.clip()
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(img, r.x + 10, r.y + 10, r.w - 20, r.h - 70); ctx.restore()
    }
    ctx.fillStyle = "#e2e8f0"; ctx.font = "700 16px Arial"
    ctx.fillText(skin.name, r.x + r.w / 2, r.y + r.h - 40)
    if (!unlocked) {
      ctx.fillStyle = "rgba(8,12,24,0.66)"; ctx.fillRect(r.x, r.y, r.w, r.h)
      ctx.fillStyle = "#94a3b8"; ctx.font = "700 22px Arial"; ctx.fillText("🔒", r.x + r.w / 2, r.y + r.h / 2 - 10)
      ctx.fillStyle = "#cbd5e1"; ctx.font = "600 14px Arial"; ctx.fillText(`Unlocks at Lv. ${skin.unlockLevel}`, r.x + r.w / 2, r.y + r.h / 2 + 18)
    }
    ctx.restore()
  })
  ctx.fillStyle = "#94a3b8"; ctx.font = "14px Arial"
  ctx.fillText("Click an unlocked skin to continue · locked skins need the level (or the dev code)", canvas.width / 2, canvas.height - 60)
}

const _skinPortraitCache = new Map()
function _skinPortrait(src) {
  if (!src) return null
  if (!_skinPortraitCache.has(src)) { const i = new Image(); i.src = src; _skinPortraitCache.set(src, i) }
  return _skinPortraitCache.get(src)
}

function resetToStart() {
  gameState        = GAME_STATES.START
  matchConfig.mode = null
  matchConfig.aiDifficulty = "easy"
  resetSelections()
  p1 = null; p2 = null
  winnerText      = ""
  countdown       = ROUND_START_COUNTDOWN
  roundBreakTimer = 0
  pauseMenuIndex  = 0
  stateBeforePause = null
  victoryState    = createVictoryState()
  matchStats      = createMatchStats()
  matchIntroTimer = 0
  roundTimer      = ROUND_TIME
  clearDomains()
  clearKuramaUltimate()
  clearSasukeCinematic()
  clearSSJRoseCinematic()
  clearGokuBlackSwordCinematic()
  clearVegetaFinalFlashCinematic()
  clearBeerusKiBallCinematic()
  sound.stopMusic?.()
  sound.playMenuMusic?.()   // non-stadium screens → Passion_fruitmp3.mp3
  damageNumbers.length = 0
  knockoutFlash  = 0
  slowdownTimer  = 0
  slowdownTarget = null
  for (const side of ["p1","p2"]) {
    comboDisplay[side].opacity   = 0
    comboDisplay[side].fadeDir   = "out"
    comboDisplay[side].lastCount = 0
    comboDisplay[side].holdTimer = 0
  }
  endDomainCinematic()   // defensive: never return to menu with the cinematic zoom stuck
  if (typeof camera.reset === "function") camera.reset()
}

function beginUniverseSelect() {
  matchConfig.selectedUniverse = null
  hoverUniverseIndex  = 0
  hoverCharacterIndex = 0
  gameState = GAME_STATES.SELECT_UNIVERSE
}

function chooseMode(mode) {
  matchConfig.mode = mode
  resetSelections()
  if (mode === "training") { matchConfig.aiDifficulty = "dummy"; beginUniverseSelect(); return }
  if (mode === "pvp")      {
    // Local two-player default: P2 on a gamepad. P1 keeps whatever the SETTINGS
    // screen has it set to (defaults to keyboard via inputSettings init) so a player
    // who flipped P1 → controller can run TWO controllers — this no longer force-
    // resets p1Type. Both device types are independently settable on the SETTINGS
    // screen (P1 Device / P2 Device), enabling any combination: kb/kb, kb/pad,
    // pad/kb, pad/pad.
    inputSettings.p2Type = "controller"
    beginUniverseSelect()
    return
  }
  gameState = GAME_STATES.AI_DIFFICULTY
}

function chooseDifficulty(difficulty) {
  matchConfig.aiDifficulty = difficulty
  beginUniverseSelect()
}

// ── ACCOUNT (front-end stub, see account.js) ───────────────────────────────
function tryCreateAccount() {
  const name = accountDraftName.trim()
  if (!isValidUsername(name)) {
    accountMessage = "Username must be 2–16 characters."
    return
  }
  const acc = createAccount(name)
  accountMessage = acc ? `Account created — welcome, ${acc.username}!` : "Could not create account."
}

// Text entry for the ACCOUNT screen. Uses the raw event key so case is kept.
function handleAccountTyping(e) {
  const k = e.key
  if (k === "Enter")      { tryCreateAccount(); return }
  if (k === "Backspace")  { accountDraftName = accountDraftName.slice(0, -1); e.preventDefault(); return }
  if (k === "Escape")     { gameState = GAME_STATES.MAIN_MENU; return }
  // Accept a single printable character (letters/numbers/space/_-), cap length.
  if (k && k.length === 1 && /[A-Za-z0-9 _-]/.test(k) && accountDraftName.length < 16) {
    accountDraftName += k
  }
}

function _checkMatchOver() {
  if (roundWins.p1 >= 2 || roundWins.p2 >= 2 || roundNumber >= MAX_ROUNDS) {
    const winner = roundWins.p1 > roundWins.p2 ? "p1" : roundWins.p2 > roundWins.p1 ? "p2" : "draw"
    victoryState.active     = true
    victoryState.fadeAlpha  = 0
    victoryState.winnerSide = winner
    victoryState.winnerName =
      winner === "p1" ? (p1?.name || "Player 1")
      : winner === "p2" ? (p2?.name || (isPvP() ? "Player 2" : "CPU"))
      : "Draw"
    victoryState.stats = matchStats
    // recordRoundEnd is now called PER ROUND (checkRoundEnd) so perfectRounds reflects the
    // whole match — NOT re-called here (that would double-count the final round).
    // FLAWLESS VICTORY: the winner swept every round (opponent won none) with ZERO damage
    // taken — i.e. all their won rounds are perfect. Reuses matchflow perfectRounds detection.
    const loser = winner === "p1" ? "p2" : "p1"
    const ws = matchStats?.[winner], ls = matchStats?.[loser]
    victoryState.flawless = !!(winner !== "draw" && ws && ls &&
      ls.roundsWon === 0 && ws.roundsWon > 0 && ws.perfectRounds === ws.roundsWon)
    victoryState.subtitle = ""
    victoryState.primaryLabel = "REMATCH"
    // PROGRESSION (Task 3): award XP from the local player's (P1) perspective.
    // Skip training. Tower mode handles its own flow (advance/end) in updateTowerOutcome.
    if (matchConfig.mode !== "training") {
      const p1Won  = winner === "p1"
      victoryState.xpResult = awardMatchXp({ won: p1Won, roundsWon: roundWins.p1, perfect: p1Won && roundWins.p2 === 0 })
    }
    if (towerState.active) {
      updateTowerOutcome(winner)
      // Tower-aware result screen: floor context + a "NEXT FLOOR" / "TOWER CLEARED" prompt.
      const floorNum = towerState.floor + 1
      if (winner === "p1") {
        if (towerState.cleared) { victoryState.subtitle = `${towerState.tierLabel} CLEARED — ${towerState.floors} FLOORS`; victoryState.primaryLabel = "CONTINUE" }
        else                    { victoryState.subtitle = `${towerState.tierLabel} · FLOOR ${floorNum} CLEARED`;          victoryState.primaryLabel = "NEXT FLOOR" }
      } else {
        victoryState.subtitle = `${towerState.tierLabel} · FELL ON FLOOR ${floorNum}`
        victoryState.primaryLabel = "MAIN MENU"
      }
    }
    sound.stopMusic?.()
    sound.play?.(SFX.KO)
    // BEERUS win voice — random 50/50 between his two victory lines (coin flip, like pickIntroVariant's
    // Math.random). Fires only when the WINNER is Beerus; independent of whether the win-pose art is
    // dedicated or shared (his batch shipped no win/lose sprite → shared win state, audio wired anyway).
    {
      const winFighter = winner === "p1" ? p1 : winner === "p2" ? p2 : null
      if (winFighter?.rosterKey === "beerus") {
        sound.playSfxFile?.(Math.random() < 0.5 ? "beerus_win.mp3" : "beerus_win_alt.mp3", null)
      }
      // GOKU BLACK win voice — identical 50/50 coin-flip pattern to Beerus's, fires only when the WINNER
      // is Goku Black. His batch shipped no dedicated win-pose sprite → shared win state, audio wired anyway.
      if (winFighter?.rosterKey === "goku_black") {
        sound.playSfxFile?.(Math.random() < 0.5 ? "goku_black_win.mp3" : "goku_black_win_alt.mp3", null)
      }
      // NARUTO win voice — random pick, same coin-flip family as Beerus/Goku Black but a 3-way pool:
      // "This is my win!" / "I'm the strongest!" plus his "that's my ninja way" catchphrase. ninja_way
      // is folded in HERE (not as a taunt) because Naruto has NO taunt action — updateTauntState is
      // gated on animationData.taunt, which only Rick/Goku Black define. See report: taunt line deferred.
      if (winFighter?.rosterKey === "naruto") {
        const narutoWins = ["naruto_win.mp3", "naruto_win_alt.mp3", "naruto_ninja_way.mp3"]
        sound.playSfxFile?.(narutoWins[Math.floor(Math.random() * narutoWins.length)], null)
      }
      // SASUKE win voice — same 50/50 coin-flip pattern as Beerus/Goku Black; alternates between
      // "It's over. It's over." and "Right now, I am the strongest in this world."
      if (winFighter?.rosterKey === "sasuke") {
        sound.playSfxFile?.(Math.random() < 0.5 ? "sasuke_win_line.mp3" : "sasuke_win_alt.mp3", null)
      }
      // RICK win voice — same alternation family; random pick between "Time to get schwifty" and
      // his "Rick dance" win bark. Fires only when the WINNER is Rick.
      if (winFighter?.rosterKey === "rick") {
        sound.playSfxFile?.(pickRickVoice("win"), null)
      }
      // OMEGA RANGER win voice — normally a 50/50 alternation of his two victory lines (same coin-flip
      // family as Beerus/Sasuke). BUT a come-from-behind win (Omega closed out a 3-round decider after
      // the opponent had taken a round, roundWins 2-1) instead plays his rare team-rally clip ("You can
      // do it, Rangers! I believe in you!") as a clutch/comeback bark — the one sensible, low-frequency
      // home for that ~8s team-encouragement line (Omega has no assist/combo-breaker hook to hang it on).
      // Mutually exclusive with the win pair, so no double-fire. Fires only when the WINNER is Omega.
      if (winFighter?.rosterKey === "omega_ranger") {
        const loserWins = winner === "p1" ? roundWins.p2 : roundWins.p1
        if (loserWins >= 1) {
          sound.playSfxFile?.("omega_team_support.mp3", null)   // clutch come-from-behind rally
        } else {
          sound.playSfxFile?.(Math.random() < 0.5 ? "omega_win_line.mp3" : "omega_win_alt.mp3", null)
        }
      }
      // RICK match-loss consolation — the local player (Rick) lost the whole match. Fires the
      // loss pool ("the other guys won that one" / "not you" / "sorry"). Match-flow bark → gated
      // to the LOCAL PLAYER (p1) being Rick, mirroring the round-end HUD barks.
      if (winner === "p2" && p1?.rosterKey === "rick") {
        sound.playSfxFile?.(pickRickVoice("roundLoss"), null)
      }
    }
    sound.playMenuMusic?.()   // win screen is non-stadium → Passion_fruitmp3.mp3
    gameState = GAME_STATES.VICTORY
  } else {
    roundNumber++
    roundBreakTimer = ROUND_BREAK_DURATION
    gameState = GAME_STATES.ROUND_BREAK
  }
}

// Re-arm a Ben/Albedo transform device after a generic rematch reset: restore a
// full meter and rebuild the Omnitrix so they re-enter their first alien form
// (setupBen10 re-applies the alien's basics/specials/ultimate/size/color/name).
function reinitTransformDevice(f) {
  if (!isTransformDevice(f)) return
  const loadout = f.omnitrix?.aliens || f.selectedAliens || undefined
  f.energy         = f.maxEnergy || 100
  f.isCharging     = false
  f.deviceRecharge = 0
  setupBen10(f, loadout)
}

function _doRematch() {
  victoryState = createVictoryState()
  matchStats   = createMatchStats()
  roundNumber  = 1
  roundWins    = { p1: 0, p2: 0 }
  winnerText   = ""
  if (p1) resetFighterForRematch?.(p1)
  if (p2) resetFighterForRematch?.(p2)
  applyMirrorTint(p1, p2)   // re-assert the mirror tint on rematch (Task 1)
  // The generic reset can't restore the Omnitrix/Ultimatrix (it leaves Ben/Albedo
  // in whatever form the match ended in). Re-arm the device so they start the
  // rematch transformed into their first alien with a full drain meter, at the
  // correct size — BEFORE we recompute spawn Y from height.
  reinitTransformDevice(p1)
  reinitTransformDevice(p2)
  const { p1X, p2X } = getSpawnPositions()
  if (p1) { p1.x = p1X; p1.y = getGroundedYForFighter(p1) }
  if (p2) { p2.x = p2X; p2.y = getGroundedYForFighter(p2) }
  if (typeof clearInputBuffers === "function") clearInputBuffers([p1, p2].filter(Boolean))
  // Rematch REUSES the fighter objects (resetFighterForRematch), so transient
  // global state must be wiped here too — resetRound (which does this) is not called.
  clearAbilityState()      // was missing: projectiles/summons/pending clones could carry into the rematch
  clearEffects()
  clearAllBindingVows()
  for (const f of [p1, p2]) if (f) f._pendingSpawn = null   // reused objects → clear sprite deferred-spawn
  clearDomains()
  clearKuramaUltimate()
  clearSasukeCinematic()
  clearSSJRoseCinematic()
  clearGokuBlackSwordCinematic()
  clearVegetaFinalFlashCinematic()
  clearBeerusKiBallCinematic()
  damageNumbers.length = 0
  knockoutFlash = 0; slowdownTimer = 0
  hitSparks.length = 0
  roundTimer = ROUND_TIME
  countdown  = ROUND_START_COUNTDOWN
  gameState  = GAME_STATES.BATTLE
  // Rematch is the SAME stage: playStageTrack alone keeps the song going (the
  // _musicFileSrc guard prevents reloading the same src) or switches from the
  // victory-screen menu music. The old stopMusic() here nulled _musicFileSrc and
  // bypassed that guard, needlessly restarting the song.
  sound.playStageTrack?.(matchConfig.selectedStage)
}

// ------------------------------------------------------------------
// INPUT / AI ROUTING
// ------------------------------------------------------------------
function clearAIControlKeys(fighter) {
  if (!fighter) return
  const c = fighter.controls
  ;[c.left, c.right, c.up, c.down, c.light, c.heavy, c.upAttack, c.special, c.ultimate, c.grab, c.charge]
    .forEach(k => { if (k) keys[k] = false })
}

function applyAIInputToKeys(fighter, aiInput) {
  if (!fighter || !aiInput) return
  const c = fighter.controls
  clearAIControlKeys(fighter)
  if (aiInput.left)                         keys[c.left]    = true
  if (aiInput.right)                        keys[c.right]   = true
  if (aiInput.down)                         keys[c.down]    = true         // hold Down = block/crouch (no attack)
  if (aiInput.jump)                         keys[c.up]      = true
  if (aiInput.lightAttack)                  keys[c.light]   = true
  if (aiInput.heavyAttack)                  keys[c.heavy]   = true
  if (aiInput.upAttack)                     keys[c.upAttack] = true        // dedicated I
  if (aiInput.downAir) { keys[c.down] = true; keys[c.light] = true }       // air S+J
  if (aiInput.special1 || aiInput.special2) keys[c.special] = true
  if (aiInput.ultimate)                     keys[c.ultimate]= true
  if (aiInput.grab)                         keys[c.grab]    = true         // AI throws vs turtles
  if (aiInput.toggle)                       keys[c.charge]  = true         // AI Infinity tap (ai.js pulses 1 frame)
}

function updateCPUInput() {
  if (!p2 || gameState !== GAME_STATES.BATTLE) { clearAIControlKeys(p2); return }
  if (isPvP()) { clearAIControlKeys(p2); return }
  const cpu = matchConfig.mode === "vs" || matchConfig.mode === "training" || matchConfig.mode === "tower"
  if (!cpu)  { clearAIControlKeys(p2); return }
  // The AI doesn't manage the transform device, so auto re-engage its alien form
  // once it has recharged — otherwise a CPU Ben/Albedo would stay weak human after
  // its first forced revert.
  if (isTransformDevice(p2) && !p2.transformed) tryTransform(p2)
  applyAIInputToKeys(p2, getAIInput(p2AI, p2, p1, { stage: getStageTheme(), roundNumber, mode: matchConfig.mode }))

  // TRAINING dummy-behavior override (block/jump for punish/timing practice). Applied
  // AFTER the AI keys are written, and ONLY in training — this is training-specific state,
  // NOT a change to ai.js's shared zero-baseline "dummy" profile.
  if (trainingState.enabled && trainingState.dummyBehavior !== "stand") {
    const c = p2.controls
    if (trainingState.dummyBehavior === "block") keys[c.down] = true           // hold guard
    else if (trainingState.dummyBehavior === "jump" && p2.onGround) keys[c.up] = true  // hop when grounded
  }
}

function handlePauseInput(key) {
  if (gameState === GAME_STATES.BATTLE || gameState === GAME_STATES.ROUND_BREAK) {
    if (key === "escape") { stateBeforePause = gameState; gameState = GAME_STATES.PAUSED; pauseMenuIndex = 0; clearAIControlKeys(p2) }
    return
  }
  if (gameState !== GAME_STATES.PAUSED) return
  if (key === "escape") { gameState = stateBeforePause || GAME_STATES.BATTLE; return }
  const n = PAUSE_MENU_ITEMS.length
  if (key === "w" || key === "arrowup")   { pauseMenuIndex = (pauseMenuIndex - 1 + n) % n; return }
  if (key === "s" || key === "arrowdown") { pauseMenuIndex = (pauseMenuIndex + 1) % n;     return }
  if (key === "enter" || key === "j") {
    const sel = PAUSE_MENU_ITEMS[pauseMenuIndex]
    if (sel === "resume")       gameState = stateBeforePause || GAME_STATES.BATTLE
    else if (sel === "restartRound") { gameState = stateBeforePause || GAME_STATES.BATTLE; resetRound() }
    else if (sel === "trainingMode") {
      // Jump into a training session from a live match: flip the match to training +
      // force the dummy CPU, then reuse the SAME setup path the GAMEPLAY_SELECT flow
      // uses (resetRound → ensureTrainingOpponent + setAIDifficulty "dummy" via the
      // mode check at line ~839). No duplicated setup logic.
      matchConfig.mode         = "training"
      matchConfig.aiDifficulty = "dummy"
      gameState = stateBeforePause || GAME_STATES.BATTLE
      resetRound()
    }
    else if (sel === "quitToMenu")   resetToStart()
  }
}

// ------------------------------------------------------------------
// FIGHTER UPDATE LOGIC
// ------------------------------------------------------------------
function updateFacing() {
  if (!p1 || !p2) return
  if (p1.x < p2.x) { p1.facing =  1; p2.facing = -1 }
  else             { p1.facing = -1; p2.facing =  1 }
}

// P (charge) is HOLD-to-charge / TAP-to-toggle. On keydown we only remember when
// it went down (ignoring OS key-repeat via _chargeHeld); the tap-vs-hold decision
// happens on keyup in handleChargeRelease.
function handleToggleInputs(fighter, key) {
  if (!fighter) return
  const c = fighter.controls
  if (key === c.charge && !fighter._chargeHeld) {
    fighter._chargeHeld     = true
    fighter._chargeDownTime = performance.now()
  }
}

// P-TAP (released within 200ms) = per-character toggle: Gojo → Infinity on/off;
// transform-capable characters → cycle transformation. A longer HOLD is a charge
// (handled by inputState.charge → doEnergyCharge) and does NOT toggle.
function handleChargeRelease(fighter, key) {
  if (!fighter || key !== fighter.controls.charge) return
  const wasHeld = !!fighter._chargeHeld   // was the charge key actually pressed (ignore spurious bare key-ups)
  const wasTap = fighter._chargeHeld && (performance.now() - (fighter._chargeDownTime || 0)) < 200
  fighter._chargeHeld = false

  // GOKU BLACK — SSJ ROSE: "charge up and RELEASE to transform" (handled BEFORE the tap-only gate).
  // Real matches start at 50% energy (createFighter startingEnergy = maxEnergy*0.5), below the 90%
  // threshold, so a bare tap did nothing AND the charge-hold-then-separate-tap was non-obvious →
  // "didn't trigger". Now: hold P to build energy (doEnergyCharge), and ANY release at/near max
  // (enterSSJRose gates on energy) enters Rose. While transformed a quick TAP reverts early; a
  // HOLD-release just tops up energy and stays in form (so you can sustain it).
  if (fighter.rosterKey === "goku_black") {
    if (fighter._ssjRoseActive) { if (wasTap) revertSSJRose(fighter) }
    else enterSSJRose(fighter, getAbilityContext())
    return
  }

  // ITACHI — MANGEKYOU SHARINGAN: same "charge up and RELEASE at threshold" shape as SSJ Rose.
  // Hold P to build chakra (doEnergyCharge); ANY release at/above the threshold (enterMangekyou
  // gates on energy ≥ 150) ignites the Mangekyou (a BUFF, not a sprite-swap). While active a quick
  // TAP reverts early; a HOLD-release just tops up chakra and stays in the mode (sustain it).
  if (fighter.rosterKey === "itachi") {
    if (fighter._mangekyouActive) { if (wasTap) revertMangekyou(fighter) }
    else enterMangekyou(fighter)
    return
  }

  // VEGETA — SUPER SAIYAN: same "charge up and RELEASE to transform" pattern as Goku Black's Rose.
  // Hold P to build energy (doEnergyCharge); ANY release at/above threshold (enterVegetaSSJ gates on
  // energy) morphs into SSJ. While transformed a quick TAP reverts early; a HOLD-release just tops up
  // energy and stays in form. Intercepts BEFORE the generic transformationOrder path below (which had
  // no art) so the real _skinAnim form-swap runs instead.
  // VEGETA ladder: base → SSJ → Blue via charge-RELEASE. A quick TAP steps DOWN (Blue→base, SSJ→base).
  //   base + hold-release (energy≥120) → SSJ
  //   SSJ  + hold-release (energy≥160) → Blue  (chained off the SSJ waypoint; base→Blue is impossible here)
  if (fighter.rosterKey === "vegeta") {
    if (fighter._ssjBlueActive) { if (wasTap) revertVegetaBlue(fighter) }
    else if (fighter._ssjActive) {
      if (wasTap) revertVegetaSSJ(fighter)
      else if (wasHeld) enterVegetaBlue(fighter, getAbilityContext())   // SSJ → Blue (gated on energy≥160)
    }
    else if (wasHeld) enterVegetaSSJ(fighter, getAbilityContext())      // base → SSJ (real press-release only)
    return
  }

  if (!wasTap) return
  if (fighter.rosterKey === "gojo") {
    if (!fighter.disabledSpecials?.includes("infinity")) {   // Limitless Sacrifice vow disables Infinity
      fighter.infinityActive = !fighter.infinityActive
      fighter.teleportFlash  = Math.max(fighter.teleportFlash || 0, 10)
    }
  } else if (fighter.rosterKey === "sasuke") {
    // Sasuke — ABSOLUTE DEFENSE toggle. Same charge-TAP pattern as Gojo's Infinity, but the negate
    // is a full unconditional block priced per-hit (combat.shouldSasukeAbsoluteDefenseNegate).
    // DEFERRED (out of scope, do not fix): holding charge while feeding a motion-gated special may
    // conflict — noted, not handled this pass.
    fighter.absoluteDefenseActive = !fighter.absoluteDefenseActive
    fighter.teleportFlash = Math.max(fighter.teleportFlash || 0, 10)
    // Repurposed asset: the old Susanoo-intro sheet now manifests the Absolute Defense barrier.
    if (fighter.absoluteDefenseActive) {
      spawnAbsoluteDefenseFx(fighter, getAbilityContext())
      // VOICE: "I won't be holding back… I won't miss even the slightest opening" — fires once as
      // the barrier is toggled ON (not on each per-block negate).
      sound.playSfxFile?.("sasuke_special_warning_cluster.mp3", null)
    }
  } else if (fighter.transformationOrder?.length) {
    triggerTransformation(fighter, getAbilityContext())
  }
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

// BETA input simplification: the single relative direction currently HELD when Special is
// pressed. Priority U > F > B > D (so a still-held qcf-style down+forward reads as Forward,
// matching the qcf reduction). Returns null for neutral. Consumed ONLY by the beta branch of
// abilities.getRelativeDirections — normal play never calls this, so the motion system below
// (getRelativeDirectionsFromHistory / recordDirectionInput) is completely unaffected.
function betaHeldDirFromInput(inputState, facing) {
  if (!inputState) return null
  if (inputState.up) return "U"
  const fwdHeld  = (facing >= 0) ? inputState.right : inputState.left
  const backHeld = (facing >= 0) ? inputState.left  : inputState.right
  if (fwdHeld)  return "F"
  if (backHeld) return "B"
  if (inputState.down) return "D"
  return null
}

function getRelativeDirectionsFromHistory(fighter, maxAge = COMMAND_INPUT_MAX_AGE) {
  if (!fighter) return []
  const now    = performance.now()
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
  const sw = getStageWorldWidth()
  fighter.x = fighter.x < target.x ? target.x - fighter.w - 8 : target.x + target.w + 8
  fighter.x = Math.max(0, Math.min(sw - fighter.w, fighter.x))
  fighter.y = target.y
  fighter.vx = 0; fighter.vy = 0
  fighter.teleportFlash  = 12
  fighter.attackCooldown = Math.max(fighter.attackCooldown || 0, 10)
  if (typeof camera.focusBetween === "function") camera.focusBetween(fighter, target, 1.0, 10)
}

// Double-tap A/D = DASH (HOLD never dashes — see the e.repeat guard in keydown).
// For the FAST characters (dashTeleport: Toji, Gojo, Sukuna) a double-tap TOWARD
// the enemy is a TELEPORT-DASH: blink BEHIND the opponent, facing them, ready to
// attack. Toji & Sukuna also land their quick follow-up strike; Gojo just
// repositions. Everyone else (and away-taps) gets a normal ground dash.
function detectDoubleTapDashTeleport(fighter, key) {
  if (!fighter || fighter.hitstun > 0 || fighter.blockstun > 0) return
  const now = performance.now()
  const c   = fighter.controls
  const target    = getOpponent(fighter)
  const towardKey = target ? (target.x >= fighter.x ? c.right : c.left) : null

  const onDoubleTap = (isToward) => {
    if (fighter.dashTeleport && isToward && (fighter.dashTeleportCooldown || 0) <= 0) {
      teleportBehindTarget(fighter)                                   // blink BEHIND, facing the opponent
      if (fighter.rosterKey === "toji"   && typeof tojiTeleportStrike === "function")        tojiTeleportStrike(fighter)
      else if (fighter.rosterKey === "sukuna" && typeof executeSukunaMalevolentDash === "function") executeSukunaMalevolentDash(fighter)
      else if (fighter.rosterKey === "sasuke") { fighter._spriteCastMove = "dash"; fighter._spriteCastTimer = 14 }  // reposition-only like Gojo; sasuke_dash.png plays the blink
      else if (fighter.rosterKey === "rick")   { fighter._spriteCastMove = "portalTravel"; fighter._spriteCastTimer = 14 }  // Portal-Behind: reposition-only, rick_portal_attack_travel.png plays the blink
      // Gojo: reposition only — "ready to attack".
      fighter.dashTeleportCooldown = 48
    } else {
      fighter._dashTap = true                                         // normal ground dash
    }
  }

  if (key === c.left) {
    if (now - (fighter.leftTapTime || 0) < DOUBLE_TAP_TIME) { onDoubleTap(c.left === towardKey); fighter.leftTapTime = 0 }
    else fighter.leftTapTime = now
  } else if (key === c.right) {
    if (now - (fighter.rightTapTime || 0) < DOUBLE_TAP_TIME) { onDoubleTap(c.right === towardKey); fighter.rightTapTime = 0 }
    else fighter.rightTapTime = now
  }
}

// Bridge a CONTROLLER player's EDGE actions into the same handlers the keyboard
// uses. Held/buffered actions (move, attacks, special, ultimate, grab, charge) already
// flow via pollGamepad → getFighterInput → vKeys. This only covers what needs press
// edges: d-pad presses feed directionHistory (motion specials) + double-tap dash/
// teleport, and L2 press/release drives charge-hold vs P-tap toggle. Called per
// battle frame for any controller player. No-op for keyboard players / no pad.
function updateGamepadEdges(fighter) {
  if (!fighter) return
  // Generalized to ALL slots (1-4). Was P1/P2-only: it read p1Type/p2Type and grabbed the pad by
  // raw array position (gamepads[0]/[1]), so P3/P4 got the wrong pad (or P2's) and their d-pad
  // motions/dash/L2-toggle never registered. Now it resolves the SAME index-bound pad pollGamepad
  // uses (getPlayerGamepad), keeping the two paths consistent for any number of pads.
  const pn   = fighter.playerNumber || 1
  const type = inputSettings[{ 1: "p1Type", 2: "p2Type", 3: "p3Type", 4: "p4Type" }[pn] || "p2Type"]
  if (type !== "controller") return
  const gp = getPlayerGamepad(pn)
  if (!gp) return
  const c    = fighter.controls
  const prev = fighter._gpPrev || (fighter._gpPrev = {})
  const btn  = (i) => !!gp.buttons[i]?.pressed
  const ax   = gp.axes || []
  const dz   = STICK_DEADZONE

  const dirs = [
    ["left",  c.left,  btn(PS5_MAP.LEFT)  || (ax[0] || 0) < -dz],
    ["right", c.right, btn(PS5_MAP.RIGHT) || (ax[0] || 0) >  dz],
    ["up",    c.up,    btn(PS5_MAP.UP)    || (ax[1] || 0) < -dz],
    ["down",  c.down,  btn(PS5_MAP.DOWN)  || (ax[1] || 0) >  dz]
  ]
  for (const [name, key, held] of dirs) {
    if (held && !prev[name]) {                  // PRESS edge
      recordDirectionInput(fighter, key)        // motion-special history (Hollow Purple etc.)
      detectDoubleTapDashTeleport(fighter, key) // double-tap dash / teleport-strike
    }
    prev[name] = held
  }

  // L2 = charge (hold) / per-character toggle (tap) — reuse the keyboard handlers.
  const l2 = btn(PS5_MAP.L2)
  if (l2 && !prev.l2) handleToggleInputs(fighter, c.charge)    // press → record charge-down time
  if (!l2 && prev.l2) handleChargeRelease(fighter, c.charge)   // release → toggle if it was a quick tap
  prev.l2 = l2
}

function updateMiscTimers(fighter) {
  if (!fighter) return
  if (fighter.teleportFlash   > 0) fighter.teleportFlash--
  if (fighter._hitVoiceCd     > 0) fighter._hitVoiceCd--                  // Beerus/Goku Black/Naruto hit-reaction voice cooldown (combat.js)
  if (fighter._atkVoiceCd     > 0) fighter._atkVoiceCd--                  // Naruto offense (Hokage/combo-burst) voice cooldown (combat.js)
  // SASUKE "getting serious" voice — SEPARATE pool from the (deferred) manual taunt: fires ONCE per
  // round the first time his energy builds past 80% ("high-energy state" per spec). Rounds start at
  // 50% energy (createFighter startingEnergy) so this is a genuine upward crossing, never a match-start
  // false-fire; _seriousVoiceDone resets naturally when resetRound rebuilds fighters. Alternates the two takes.
  if (fighter.rosterKey === "sasuke" && !fighter._seriousVoiceDone &&
      (fighter.energy || 0) >= (fighter.maxEnergy || 100) * 0.80) {
    fighter._seriousVoiceDone = true
    sound.playSfxFile?.(Math.random() < 0.5 ? "sasuke_serious_taunt.mp3" : "sasuke_serious_taunt_alt.mp3", null)
  }
  if (fighter.ultimateCooldown > 0) fighter.ultimateCooldown--            // universal ultimate recast lockout
  if (fighter.summonCooldown  > 0) fighter.summonCooldown--
  if (fighter._cloneSummonWindow > 0) fighter._cloneSummonWindow--        // clone-summon audio window (summons.js)
  if (fighter.teleportCooldown      > 0) fighter.teleportCooldown--       // Gojo Up+Special blink
  if (fighter.dashTeleportCooldown  > 0) fighter.dashTeleportCooldown--   // Toji teleport-dash
  if (fighter.malevolentDashCooldown > 0) fighter.malevolentDashCooldown-- // Sukuna Malevolent Dash
  if (fighter.chainCooldown > 0) fighter.chainCooldown--                   // Toji Chain-Knife
  if (fighter.activeDomainTimer > 0) fighter.activeDomainTimer--
  if (fighter._spriteCastTimer > 0 && --fighter._spriteCastTimer <= 0) fighter._spriteCastMove = null
  if (fighter.parryFlash      > 0) fighter.parryFlash--
  if (fighter.armorFlash      > 0) fighter.armorFlash--
  if (fighter.clashFlash      > 0) fighter.clashFlash--
  if (fighter.restrainTimer   > 0) { fighter.restrainTimer--;  if (fighter.restrainTimer  <= 0) fighter.restrained = false }
  if (fighter.obscuredTimer   > 0) { fighter.obscuredTimer--;  if (fighter.obscuredTimer  <= 0) fighter.obscured   = false }
  // Generic damage-over-time (e.g. Naruto Rasenshuriken wind-chip). Applies `dmg` every
  // `interval` frames for `ticks` counts, then clears. Stamped by resolveProjectileHits.
  if (fighter._dot && fighter._dot.ticks > 0) {
    if (--fighter._dot.delay <= 0) {
      fighter.health = Math.max(0, (fighter.health || 0) - fighter._dot.dmg)
      fighter._dot.delay = fighter._dot.interval
      fighter._dot.ticks--
      fighter.colorFlash = Math.max(fighter.colorFlash || 0, 3)
    }
    if (fighter._dot.ticks <= 0 || (fighter.health || 0) <= 0) fighter._dot = null
  }
}

// ── TAUNT — timed channel → payoff (Rick) ─────────────────────────────────────
// A genuinely new mechanic: hold Down for TAUNT_CHARGE_FRAMES (10s) to COMMIT into a
// fully-locked taunt animation; survive both phases un-hit to heal 50% of CURRENT hp.
// Its own tracked state (idle → charging → committed), separate from block-hold — it
// only READS the same Down input. Any character defining a `taunt` action gets it;
// only Rick ships the art. States: _tauntCharge (frames held), _tauntPlaying (+ timer).
const TAUNT_CHARGE_FRAMES = 600   // 10s @60Hz of uninterrupted Down-hold to trigger
function tauntAnimFrames(fighter) {
  const a = fighter.animationData?.taunt
  return a ? (a.frames || 1) * (a.speed || 4) : 108
}
function updateTauntState(fighter, downHeld) {
  if (!fighter || !fighter.animationData?.taunt) return
  // "Took a hit" during EITHER phase = interrupt: hitstun OR any health drop since last frame.
  const prevH   = fighter._tauntPrevHealth
  fighter._tauntPrevHealth = fighter.health
  const tookHit = (fighter.hitstun || 0) > 0 || (prevH != null && (fighter.health || 0) < prevH)

  // COMMITTED animation phase — locked; resolve on finish or cancel on hit.
  if (fighter._tauntPlaying) {
    if (tookHit) { fighter._tauntPlaying = false; fighter._tauntCharge = 0; return }   // interrupted → no reward
    if (--fighter._tauntTimer <= 0) {
      const heal = Math.floor((fighter.health || 0) * 0.5)                              // 50% of CURRENT hp
      fighter.health      = Math.min(fighter.maxHealth || fighter.health, (fighter.health || 0) + heal)
      fighter._tauntPlaying = false
      fighter._tauntHealFlash = 45                                                      // green heal cue
    }
    return
  }

  // CHARGING phase — only accrues on an uninterrupted, grounded, idle Down-hold. Any
  // hit / block / attack / airborne breaks it (resets to 0), so a normal <10s block-hold
  // is exactly as before and never "leaks" into a taunt.
  const eligible = downHeld && !tookHit &&
    (fighter.onGround ?? fighter.grounded) && !fighter.attacking &&
    (fighter.hitstun || 0) <= 0 && (fighter.blockstun || 0) <= 0 &&
    !fighter.isGrabbed && (fighter.stun || 0) <= 0
  if (!eligible) { fighter._tauntCharge = 0; return }
  fighter._tauntCharge = (fighter._tauntCharge || 0) + 1
  if (fighter._tauntCharge >= TAUNT_CHARGE_FRAMES) {
    fighter._tauntCharge  = 0
    fighter._tauntPlaying = true
    fighter._tauntTimer   = tauntAnimFrames(fighter)
    // GOKU BLACK taunt voice — "Pathetic. That won't work on me." Hooked on the transition INTO the
    // committed taunt (fires once as the flourish begins), reusing the existing universal taunt mechanic;
    // no new taunt system built. Gated to goku_black so other taunting chars (Rick) stay silent here.
    if ((fighter.rosterKey || "").toLowerCase() === "goku_black") {
      sound.playSfxFile?.("goku_black_taunt.mp3", null)
    }
    // RICK heal-taunt callout — "Do it for grandpa Morty" / "Don't worry Morty" / "Grandpa's sorry
    // Morty" (random pool). Hooked on the same commit transition, gated to Rick (whose taunt IS the
    // heal mechanic first built for him). Fires once as the flourish begins.
    if (fighter.rosterKey === "rick") {
      sound.playSfxFile?.(pickRickVoice("tauntHeal"), null)
    }
  }
}

function updateMovementInput(fighter) {
  if (!fighter) return
  const inputState = getFighterInput(fighter)

  // Taunt state machine runs first. While the committed taunt plays, the fighter is
  // FULLY LOCKED — no movement/block/action (combat actions are gated in
  // updatePlayerCombat; physics.moveFighter also honours _tauntPlaying).
  updateTauntState(fighter, !!inputState.down)
  if (fighter._tauntPlaying) { fighter.isBlocking = false; fighter.isCharging = false; fighter.vx = 0; return }

  const vKeys      = mapInputToVirtualKeys(inputState, fighter.controls)
  fighter.isBlocking = false
  if (isTransformDevice(fighter)) handleOmnitrixSwitch(fighter, inputState)
  else fighter.isCharging = false   // reset each frame for normal characters (devices set their own)
  if (fighter.hitstun > 0 || fighter.blockstun > 0) return
  // HOLD-TO-CHARGE (Task 2): a meter character holding P (charge), not attacking,
  // builds cursed energy AND enters the charging state (drives the charge aura +
  // sprite). For Ben/Albedo the charge button is the device dial (handled above).
  // Resolved BEFORE the block gate so the universal "charging = fully vulnerable"
  // lockout (no block below, no movement in physics.moveFighter) holds on the SAME
  // frame the charge begins — for NORMAL chars too, not just the transform device.
  if (inputState.charge && !isTransformDevice(fighter) && !fighter.attacking && (fighter.maxEnergy || 0) > 0) {
    doEnergyCharge(fighter)
    fighter.isCharging = true
  }
  // UNIVERSAL CHARGE LOCKOUT — can't block while charging (deliberate vulnerability, all chars).
  if (inputState.down && !fighter.isCharging) fighter.isBlocking = true
  physics.moveFighter(fighter, vKeys, fighter.controls)
}

// ── OMNITRIX / ULTIMATRIX — in-fight transform device (Ben & Albedo) ───────
// Same input scheme for both, now gated by the energy/uptime rules (Task 2):
//   • CHARGE + tap RIGHT/LEFT → cycle to next/prev alien (only while transformed).
//   • CHARGE alone, while HUMAN (and recharged) → transform into the current alien.
//   • CHARGE alone, while TRANSFORMED → CHARGE the meter (fast refill, but you
//     can't block and a hit interrupts it — see updateMovementInput / combat.js).
// switchAlien() still enforces the per-switch recharge cooldown.
function handleOmnitrixSwitch(fighter, inputState) {
  if (!fighter?.omnitrix) return
  const held = (fighter._omx = fighter._omx || {})

  const charge = !!inputState.charge
  const left   = !!inputState.left
  const right  = !!inputState.right

  fighter.isCharging = false   // re-evaluated each frame below

  if (charge) {
    if (right && !held.right) {
      if (fighter.transformed) switchAlien(fighter,  1)
    } else if (left && !held.left) {
      if (fighter.transformed) switchAlien(fighter, -1)
    } else if (!left && !right) {
      if (!fighter.transformed) {
        if (!held.charge) tryTransform(fighter)   // tap to re-engage once recharged
      } else {
        fighter.isCharging = true                 // hold to refill the drain meter
      }
    }
  }

  held.charge = charge
  held.left   = left
  held.right  = right
}

function buildNormalControlState(fighter, vKeys) {
  const c = fighter.controls
  const g = !!fighter.onGround
  return {
    upAttack: g  && vKeys[c.upAttack],                 // dedicated I = up-attack/launcher
    grab:     g  && vKeys[c.grab],                      // dedicated O = grab
    air:      !g && vKeys[c.light] && !vKeys[c.down],   // airborne J = air attack
    downAir:  !g && vKeys[c.light] &&  vKeys[c.down],   // airborne S+J = down-air spike
    light:    g  && vKeys[c.light],                     // J
    heavy:    g  && vKeys[c.heavy]                      // K
  }
}

function updatePlayerCombat(fighter) {
  if (!fighter) return
  const opts = { hitEffects: hitSparks, damageNumbers, stageWidth: getStageWorldWidth() }

  // CRITICAL: updateCombat() is the ONLY place hitstun/hitstop/blockstun and the
  // attack-recovery timers decrement. It must run EVERY frame or a hit fighter
  // gets stuck forever (the timer that locks them never ticks down). While
  // stunned we still call it — just with EMPTY controls so no new move starts
  // and inputs aren't read — guaranteeing a clean recovery.
  if (fighter.hitstun > 0 || fighter.blockstun > 0) {
    updateCombat(fighter, getOpponent(fighter), {}, opts)
    return
  }

  // TAUNT LOCK: mid-taunt the fighter starts nothing. Still tick combat timers with
  // empty controls so any residual state resolves cleanly.
  if (fighter._tauntPlaying) { updateCombat(fighter, getOpponent(fighter), {}, opts); return }

  const inputState = getFighterInput(fighter)
  const isToji     = (fighter.rosterKey || "").toLowerCase() === "toji"

  // TOJI STANCE SWITCH (charge tap). Runs BEFORE canStart so a switch pressed during an
  // attack's RECOVERY phase cancels it (attacking→false), freeing the fighter to act again
  // this frame (gated by the STANCE_SWITCH_FRAMES cooldown the switch sets).
  if (isToji) updateTojiStanceSwitch(fighter, inputState.charge, getAttackPhase)

  const vKeys      = mapInputToVirtualKeys(inputState, fighter.controls)
  const canStart   = !fighter.attacking && !fighter.currentMove

  // UNIVERSAL CHARGE LOCKOUT: while holding a charge (isCharging), the fighter is fully
  // committed and vulnerable — physics.moveFighter blocks movement/jump/dash and
  // updateMovementInput blocks guarding. Here we also lock out every NORMAL attack and the
  // ULTIMATE. The SPECIAL button is the sole exception: it is the charge's own release/fire
  // trigger (e.g. Naruto's Big Ball Rasengan / Rasenshuriken read isCharging to pick the
  // charged variant). Releasing P clears isCharging next frame → instant, lag-free exit.
  const charging = !!fighter.isCharging

  // Specials are L (direction-modified inside executeXSpecial). Gojo's Infinity
  // toggle moved to P-TAP (handleChargeRelease), so Down+Special is free for the
  // S+L motion specials (e.g. Hollow Purple = S,A+L).
  if (canStart && inputState.special)  {
    // BETA input simplification: stamp the single relative direction currently HELD so
    // abilities.getRelativeDirections' beta branch can pick the special the equivalent
    // motion roll would have produced. Beta-gated → normal play never sets/reads this.
    if (isBetaUnlocked()) fighter._betaHeldDir = betaHeldDirFromInput(inputState, fighter.facing)
    triggerSpecial(fighter,  getAbilityContext()); return
  }
  if (canStart && !charging && inputState.ultimate) { triggerUltimate(fighter, getAbilityContext()); return }

  // TOJI stance combat: Blade stance fires its real normals + drives the rekka; Chain/Gun
  // fire the Phase-1 placeholder light. Consumes the grounded light/heavy/up press when it
  // acts (returns true → skip the normal path). Suppressed while charging (lockout).
  if (isToji && !charging && updateTojiStanceCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // VEGETA command-normal chain: Forward+Heavy opens the "Y-track" kick target combo, re-tap
  // Heavy during recovery to continue (cancel-on-hit). Consumes the input only when it fires
  // (returns true → skip normal path); neutral light/heavy stay on the normal path below.
  if ((fighter.rosterKey || "").toLowerCase() === "vegeta" && !charging &&
      updateVegetaCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // OMEGA RANGER command chain (Fwd+Heavy kick → re-tap Heavy on hit → spin_kick → low_attack)
  // + free pokes (Fwd+Light Forward Push, airborne Heavy Downward Air Attack 2). Consumes the
  // input only when it fires; neutral light/heavy/up stay on the normal path below.
  if ((fighter.rosterKey || "").toLowerCase() === "omega_ranger" && !charging &&
      updateOmegaRangerCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // Toji's grounded normals are stance-driven, so SUPPRESS the built-in light/heavy/up here
  // (else updateCombat would also start the old row-sheet normals / double-fire). Aerials
  // (air/downAir) and grab stay on the normal path. Other characters are unaffected.
  let ctrlState = buildNormalControlState(fighter, vKeys)
  if (isToji) ctrlState = { ...ctrlState, light: false, heavy: false, upAttack: false }
  // Charge lockout: suppress EVERY normal (grounded + aerial + grab) while charging. The
  // special (release/fire) already ran above; nothing else may start until P is released.
  if (charging) ctrlState = { light: false, heavy: false, upAttack: false, air: false, downAir: false, grab: false }
  updateCombat(fighter, getOpponent(fighter), ctrlState, opts)
}

// ------------------------------------------------------------------
// NARUTO — KURAMA SHROUD INTENSIFY (comeback mechanic, combo #23)
// ------------------------------------------------------------------
// Auto-triggering, health-gated 5-stage buff. NO input / chakra / clone cost — purely
// passive: the lower Naruto's health, the deeper the shroud stage. Stages 1-2 are
// COSMETIC (aura only). Stage 3+ unlocks Kurama's regeneration (heal-on-hit — see
// combat.applyKuramaShroudReaction, which reuses Vegeta's Ultra Ego rage-heal shape).
//
// fighter.shroudStage (0-5) is a PUBLIC field so follow-up shroud-gated specials can
// read it directly (e.g. `if (fighter.shroudStage >= 4) ...`). fighter.shroudArt is the
// "a".."e" frame for the KOMA-7A shroud strip (naruto_kcm_fx_7_koma_special_a_shroud_*.png,
// not yet on disk → the aura renders procedurally for now, like the clone smoke poof).
//
// THRESHOLDS: health FRACTION at/below which each successive stage activates. Retune here.
const KURAMA_SHROUD_THRESHOLDS = [0.80, 0.60, 0.40, 0.22, 0.10]  // → stages 1,2,3,4,5
const KURAMA_SHROUD_BUFF_STAGE = 3   // first stage that unlocks a real stat effect (the heal)

function applyKuramaShroudSystem(fighter) {
  if (!fighter || fighter.rosterKey !== "naruto") return
  const frac = Math.max(0, fighter.health || 0) / (fighter.maxHealth || 1)
  let stage = 0
  for (const t of KURAMA_SHROUD_THRESHOLDS) { if (frac <= t) stage++ }
  fighter.shroudStage  = stage                                   // 0-5, PUBLIC (gates future moves)
  fighter.shroudArt    = stage > 0 ? "abcde"[stage - 1] : null   // shroud_a .. shroud_e for this stage
  fighter.shroudBuffed = stage >= KURAMA_SHROUD_BUFF_STAGE       // convenience flag: buff is live
}

// Procedural shroud aura — escalating orange→deep-red glow behind Naruto, brighter and
// wider at deeper stages, with a slow pulse. Drawn in world space in renderHybridFighter
// (before the body/sprite) so it shows on BOTH the sprite and vector render paths.
const KURAMA_SHROUD_COLORS = ["#fdba74", "#fb923c", "#f97316", "#ea580c", "#dc2626"]
function drawKuramaShroudAura(c, fighter) {
  const stage = fighter?.shroudStage || 0
  if (stage <= 0 || !c) return
  const x = fighter.x ?? 0, y = fighter.y ?? 0
  const w = fighter.w ?? 60, h = fighter.h ?? 110
  const color  = KURAMA_SHROUD_COLORS[Math.min(stage, 5) - 1]
  const pulse  = 0.5 + 0.5 * Math.sin(fighter._shroudPulse = (fighter._shroudPulse || 0) + 0.15)
  const spread = 8 + stage * 4
  c.save()
  c.globalAlpha  = 0.12 + stage * 0.05 + pulse * 0.06
  c.shadowBlur   = spread * 2
  c.shadowColor  = color
  c.strokeStyle  = color
  c.lineWidth    = spread
  const rx = x - spread / 2, ry = y - spread / 2, rw = w + spread, rh = h + spread, r = 16
  c.beginPath()
  c.moveTo(rx + r, ry)
  c.arcTo(rx + rw, ry, rx + rw, ry + rh, r)
  c.arcTo(rx + rw, ry + rh, rx, ry + rh, r)
  c.arcTo(rx, ry + rh, rx, ry, r)
  c.arcTo(rx, ry, rx + rw, ry, r)
  c.closePath()
  c.stroke()
  c.restore()
}

// ITACHI — MANGEKYOU SHARINGAN overlay. A pulsing crimson glow drawn AROUND the base sprite
// while _mangekyouActive (the eyes are "an OVERLAY on top of the normal sprite", not a body-swap).
// Drawn BEFORE the sprite (behind the body), mirroring drawKuramaShroudAura. No-op for anyone else.
function drawMangekyouAura(c, fighter) {
  if (!c || !fighter?._mangekyouActive) return
  const x = fighter.x ?? 0, y = fighter.y ?? 0, w = fighter.w ?? 60, h = fighter.h ?? 110
  const pulse  = 0.5 + 0.5 * Math.sin(fighter._mangekyouPulse = (fighter._mangekyouPulse || 0) + 0.18)
  const spread = 10 + pulse * 4
  c.save()
  c.globalAlpha = 0.16 + pulse * 0.10
  c.shadowBlur  = spread * 2.2
  c.shadowColor = "#dc2626"
  c.strokeStyle = "#ef4444"
  c.lineWidth   = spread
  const rx = x - spread / 2, ry = y - spread / 2, rw = w + spread, rh = h + spread, r = 16
  c.beginPath()
  c.moveTo(rx + r, ry)
  c.arcTo(rx + rw, ry, rx + rw, ry + rh, r)
  c.arcTo(rx + rw, ry + rh, rx, ry + rh, r)
  c.arcTo(rx, ry + rh, rx, ry, r)
  c.arcTo(rx, ry, rx + rw, ry, r)
  c.closePath()
  c.stroke()
  c.restore()
}

// Mangekyou ACTIVATION flash — a bright crimson bloom over Itachi's head that fades over
// _mangekyouFlash frames (armed by enterMangekyou). Drawn ON TOP of the sprite. The "eyes ignite" beat.
function drawMangekyouActivationFlash(c, fighter) {
  const t = fighter?._mangekyouFlash || 0
  if (!c || t <= 0) return
  const cx = (fighter.x ?? 0) + (fighter.w ?? 60) / 2
  const cy = (fighter.y ?? 0) + (fighter.h ?? 110) * 0.30   // head/eye height
  const a  = Math.min(1, t / 40)            // fade out as the timer decays
  const rad = (60 - a * 30)                 // bloom shrinks inward as it settles
  c.save()
  const g = c.createRadialGradient(cx, cy, 0, cx, cy, rad)
  g.addColorStop(0,   `rgba(255,90,90,${0.75 * a})`)
  g.addColorStop(0.5, `rgba(220,30,30,${0.40 * a})`)
  g.addColorStop(1,   "rgba(220,30,30,0)")
  c.fillStyle = g
  c.beginPath(); c.arc(cx, cy, rad, 0, Math.PI * 2); c.fill()
  c.restore()
}

// Rick's Portal-Pull / Portal-Push reappear the opponent above a destination and let
// them fall (abilities.js rickPortalReposition). This applies the impact damage the
// frame they reground — mirrors the _dot marker→resolver split (abilities stamps the
// marker, the game loop resolves it). The ttl guards against a lingering marker if the
// target somehow never lands (e.g. caught by another launcher mid-fall).
function resolvePortalDropLanding(f) {
  const pd = f && f._portalDrop
  if (!pd) return
  if (pd.ttl != null && --pd.ttl <= 0) { f._portalDrop = null; return }
  if (!(f.onGround || f.grounded)) return   // still falling — wait for the landing frame
  let dmg = pd.dmg || 0
  if (f.isBlocking) {
    dmg = Math.floor(dmg * 0.25)
    f.blockstun = Math.max(f.blockstun || 0, 16)
  } else {
    f.hitstun    = Math.max(f.hitstun || 0, pd.hitstun || 24)
    f.vy         = -6            // small impact pop so the landing reads (and Pull can juggle)
    f.onGround   = false
    f.grounded   = false
    f.isLaunched = true
    f.colorFlash = Math.max(f.colorFlash || 0, 8)
  }
  f.health = Math.max(0, (f.health || 0) - dmg)
  spawnDamageNumber({ x: f.x + (f.w || 60) / 2, y: f.y, damage: dmg, category: pd.category || "special" })
  camera.shake?.(10, 8)
  f._portalDrop = null
}

function updateFighterState(fighter) {
  if (!fighter) return fighter
  const updated = updateTransformationState(fighter, getAbilityContext()) || fighter
  applyGojoPassiveSystems(updated)
  applyGokuBlackFormSystem(updated)  // SSJ Rose: continuous per-frame energy drain + instant auto-revert at 0
  applyMangekyouSystem(updated)      // Itachi Mangekyou: continuous chakra drain + instant auto-revert at 0
  applyVegetaFormSystem(updated)     // Vegeta Super Saiyan: continuous per-frame energy drain + instant auto-revert at 0
  applyKuramaShroudSystem(updated)   // health-gated 5-stage Kurama shroud (Naruto only)
  updateMiscTimers(updated)
  physics.applyGravity(updated)
  resolvePortalDropLanding(updated)   // Rick Portal-Pull/Push: impact damage the frame they reground
  physics.updateAttackBox(updated)
  // Ben/Albedo run the transform-device drain/charge/revert system instead of
  // the generic passive regen (which would fight the drain). Driven by real
  // per-frame delta ms.
  if (isTransformDevice(updated)) updateTransformDevice(updated, getAbilityContext().deltaMs)
  else regenEnergy(updated)
  return updated
}

// ------------------------------------------------------------------
// GOJO SPECIAL SYSTEMS
// ------------------------------------------------------------------
// TASK 4: Infinity as a READABLE zone. Enemy projectiles that enter the radius
// decelerate and SHRINK as they approach, then despawn at an inner boundary in
// front of Gojo — "attack slows, shrinks, stops before Gojo" instead of an instant
// invisible dodge. (Melee approach is halted by applyGojoInfinityField slowing the
// attacker to a stop near Gojo.) Energy-drain + 0-CE shutoff are unchanged.
const GOJO_INFINITY_INNER = 72   // despawn boundary (px from Gojo's center)
function applyGojoInfinityToProjectiles(gojo) {
  if (!gojo || gojo.rosterKey !== "gojo" || !gojo.infinityActive) return
  const gcx = gojo.x + gojo.w / 2, gcy = gojo.y + gojo.h / 2
  for (let i = activeProjectiles.length - 1; i >= 0; i--) {
    const p = activeProjectiles[i]
    if (!p || p.owner === gojo) continue
    const dist = Math.hypot((p.x ?? 0) - gcx, (p.y ?? 0) - gcy)
    if (dist > GOJO_INFINITY_RADIUS) continue
    p.vx = (p.vx || 0) * 0.72        // decelerate the closer it gets
    p.vy = (p.vy || 0) * 0.72
    if (p.radius != null) p.radius *= 0.9   // shrink (drawProjectiles reads radius)
    p.w = (p.w || 0) * 0.9
    p.h = (p.h || 0) * 0.9
    if (dist <= GOJO_INFINITY_INNER || (p.radius != null && p.radius < 2)) {
      activeProjectiles.splice(i, 1)        // stopped/despawned before touching Gojo
    }
  }
}

function applyGojoInfinityField(gojo, target) {
  if (!gojo || !target || gojo.rosterKey !== "gojo" || !gojo.infinityActive) return
  const dx   = (target.x + target.w / 2) - (gojo.x + gojo.w / 2)
  const dy   = (target.y + target.h / 2) - (gojo.y + gojo.h / 2)
  const dist = Math.sqrt(dx * dx + dy * dy)
  if (dist > GOJO_INFINITY_RADIUS) return
  const slow = Math.pow(Math.max(0.015, dist / GOJO_INFINITY_RADIUS), 2)
  target.vx *= slow
  target.vy *= Math.max(0.22, slow)
  if (Math.abs(target.vx) < 0.05) target.vx = 0
  if (Math.abs(target.vy) < 0.05) target.vy = 0
}

function applyGojoInfinityBarrier(gojo, target) {
  if (!gojo || !target || gojo.rosterKey !== "gojo" || !gojo.infinityActive || target.health <= 0) return
  const dx = (target.x + target.w / 2) - (gojo.x + gojo.w / 2)
  if (Math.abs(dx) <= 52) target.x += dx > 0 ? 3 : -3
}

// ------------------------------------------------------------------
// EFFECTS & DOMAINS
// ------------------------------------------------------------------
function spawnDamageNumber(spark) {
  if (!spark || spark.damage == null) return
  const colorMap = { light: "#ffffff", heavy: "#fbbf24", special: "#f97316", ultimate: "#ef4444" }
  damageNumbers.push({
    x: spark.x, y: spark.y,
    text:     String(Math.round(spark.damage || 0)),
    color:    colorMap[spark.category || "light"] || "#ffffff",
    timer:    45, maxTimer: 45, opacity: 1,
    vy:       -1.2, fontSize: 22
  })
}

function updateDamageNumbers() {
  for (let i = damageNumbers.length - 1; i >= 0; i--) {
    const d = damageNumbers[i]
    d.y    -= 1.2
    d.timer--
    d.opacity = d.timer / d.maxTimer
    if (d.timer <= 0) damageNumbers.splice(i, 1)
  }
}

function updateComboDisplay(fighter, side) {
  if (!fighter) return
  const ds    = comboDisplay[side]
  const count = fighter.comboCounter || 0
  if (count >= 2) { ds.lastCount = count; ds.holdTimer = 30; ds.fadeDir = "in" }
  else if (ds.holdTimer > 0) ds.holdTimer--
  else ds.fadeDir = "out"
  ds.opacity = ds.fadeDir === "in"
    ? Math.min(1, (ds.opacity || 0) + 1 / 6)
    : Math.max(0, (ds.opacity || 0) - 1 / 30)
}

function updateEffectsAndDomains() {
  updateDomains([p1, p2].filter(Boolean), hitSparks)
  updateEffects()
  updateEnergyRegen([p1, p2].filter(Boolean))
  for (let i = hitSparks.length - 1; i >= 0; i--) {
    const spark = hitSparks[i]
    if (spark?._fresh !== false) {
      spark.maxTimer = spark.maxTimer || spark.timer
      spawnDamageNumber(spark)
      const attSide = (p1?.comboCounter || 0) >= (p2?.comboCounter || 0) ? "p1" : "p2"
      recordHit?.(matchStats, attSide, spark.damage || 0,
        Math.max(p1?.comboCounter || 0, p2?.comboCounter || 0),
        spark.category === "special" || spark.category === "ultimate",
        spark.category === "ultimate")
      spark._fresh = false
    }
    spark.timer--
    if (spark.timer <= 0) hitSparks.splice(i, 1)
  }
  updateDamageNumbers()
  updateComboDisplay(p1, "p1")
  updateComboDisplay(p2, "p2")
}

// Edge-detect a raw key (true only on the frame it goes down). Used for the training
// hotkeys so a held key fires once, not every frame.
function _trainingKeyPressed(k) {
  const down = !!keys[k]
  const fired = down && !_trainingKeyPrev[k]
  _trainingKeyPrev[k] = down
  return fired
}

// Snap both fighters back to neutral: spawn positions/facing, full resources, and
// clear all combat state (hitstun/knockdown/combo/attack) so a move can be re-tested
// immediately without leaving the mode.
function resetTraining() {
  if (!p1 || !p2) return
  const { p1X, p2X } = getSpawnPositions()
  ;[[p1, p1X, 1], [p2, p2X, -1]].forEach(([f, x, facing]) => {
    f.x = x; f.facing = facing
    if (f.groundY != null) f.y = f.groundY - (f.h || 0)   // each fighter stores its own floor
    f.vx = 0; f.vy = 0
    f.onGround = true; f.grounded = true
    f.health = f.maxHealth || f.health
    f.energy = f.maxEnergy || 0
    f.hitstun = 0; f.blockstun = 0; f.stun = 0; f.hitstop = 0
    f.knockdownState = false; f.knockdownTimer = 0
    f.comboCounter = 0; f.currentAttack = null; f.currentMove = null
    f.attacking = false; f.isBlocking = false; f.isLaunched = false
    revertSSJRose(f)   // Goku Black: never start a round still in SSJ Rose (clears flag + art swap + stat mults)
  })
}

function updateTrainingMode() {
  const debug = getDebugInputState()
  trainingState.enabled = matchConfig.mode === "training" || !!debug.trainingMode
  if (!trainingState.enabled || !p1 || !p2) return

  // Training hotkeys (edge-detected): F2 reset · F3 infinite health/energy · F4 dummy behavior.
  if (_trainingKeyPressed("f2")) resetTraining()
  if (_trainingKeyPressed("f3")) trainingState.infiniteResources = !trainingState.infiniteResources
  if (_trainingKeyPressed("f4")) {
    const i = DUMMY_BEHAVIORS.indexOf(trainingState.dummyBehavior)
    trainingState.dummyBehavior = DUMMY_BEHAVIORS[(i + 1) % DUMMY_BEHAVIORS.length]
  }

  // Infinite health/energy: pin BOTH fighters to max each frame. Damage numbers still
  // pop (so combo/damage readouts work) but neither fighter drains or dies.
  if (trainingState.infiniteResources) {
    for (const f of [p1, p2]) {
      if (f.maxHealth) f.health = f.maxHealth
      if (f.maxEnergy) f.energy = f.maxEnergy
    }
  }

  recordInputFrame("P1", getControlsForHistory("p1"), p1, globalFrameCount)
  recordInputFrame("P2", getControlsForHistory("p2"), p2, globalFrameCount)
  recordInputSequence(getControlsForHistory("p1"))
  recordInputSequence(getControlsForHistory("p2"))
}

// ------------------------------------------------------------------
// ROUND END
// ------------------------------------------------------------------
// RICK round-end HUD bark (audio-only). Gated to the LOCAL PLAYER being Rick — his voice as your
// hype-man/announcer (see rickVoice.js match-flow note). ONE clip per round-end, never stacked:
//   • time-over  → the time-up bell ("ding ding, jerks" / "fight's over")
//   • KO, Rick won  → "hey you won"
//   • KO, Rick lost → the knockout pool ("oh shit you're down" / "that's a knockout" / "k.o.")
// SUPPRESSED on the match-deciding round: the match-level win/loss bark (_checkMatchOver) owns that
// beat instead, so the two never fire together. Match-over test mirrors _checkMatchOver exactly.
function maybeRickRoundVoice(rw, byTimeout) {
  if (p1?.rosterKey !== "rick") return
  const matchWillEnd = roundWins.p1 >= 2 || roundWins.p2 >= 2 || roundNumber >= MAX_ROUNDS
  if (matchWillEnd) return
  let pool = null
  if (byTimeout)          pool = "matchEnd"
  else if (rw === "p1")   pool = "roundWin"
  else if (rw === "p2")   pool = "ko"
  if (pool) sound.playSfxFile?.(pickRickVoice(pool), null)
}

function checkRoundEnd() {
  // Skip ALL round-end handling (timer/KO/victory) whenever training is active — via the
  // menu (matchConfig.mode) OR the F1 debug toggle. Previously only the menu path skipped,
  // so F1-training in a match could still trigger a KO/victory screen mid-session.
  if (!p1 || !p2 || trainingState.enabled) return
  if (roundTimer <= 0) {
    const p1h = p1?.health || 0, p2h = p2?.health || 0
    let rw = null
    if      (p1h > p2h) { roundWins.p1++; rw = "p1"; winnerText = isPvP() ? "Time Over — Player 1 Wins" : "Time Over — Player 1 Wins" }
    else if (p2h > p1h) { roundWins.p2++; rw = "p2"; winnerText = isPvP() ? "Time Over — Player 2 Wins" : "Time Over — CPU Wins" }
    else                { winnerText = "Time Over — Draw" }
    recordRoundEnd?.(matchStats, rw, p1h, p2h)   // per-round (drives perfectRounds → FLAWLESS)
    maybeRickRoundVoice(rw, true)   // time-over bell (suppressed if this ends the match)
    _checkMatchOver(); return
  }
  if (p1.health > 0 && p2.health > 0) return
  if ((p1.health <= 0 || p2.health <= 0) && knockoutFlash === 0) knockoutFlash = 18
  let rw = null
  if      (p1.health <= 0 && p2.health <= 0) winnerText = "Double KO"
  else if (p1.health > 0) { roundWins.p1++; rw = "p1"; winnerText = "Player 1 Wins Round" }
  else                    { roundWins.p2++; rw = "p2"; winnerText = isPvP() ? "Player 2 Wins Round" : "CPU Wins Round" }
  recordRoundEnd?.(matchStats, rw, p1?.health || 0, p2?.health || 0)   // per-round (drives perfectRounds)
  maybeRickRoundVoice(rw, false)   // KO round: "hey you won" (Rick won) / knockout pool (Rick down)
  _checkMatchOver()
}

// ------------------------------------------------------------------
// BATTLE UPDATE
// ------------------------------------------------------------------
function _runClashCheck() {
  if (!p1 || !p2) return
  checkClash?.(p1, p2, hitSparks, camera)
}

// ── DOMAIN CINEMATIC DRIVER ─────────────────────────────────────────
// Detects a freshly-opened Gojo/Sukuna domain, runs the hand-sign zoom beat, and
// restores the camera afterward. Called once per frame from updateBattle.
function updateDomainCinematic() {
  const dom    = activeDomains[0]
  const isCine = !!(dom && (dom.rosterKey === "gojo" || dom.rosterKey === "sukuna"))

  if (isCine && dom !== domainCine.domain) {
    // START — new cinematic domain: begin the hand-sign zoom beat.
    domainCine.domain = dom
    domainCine.caster = dom.owner || dom.caster || null
    domainCine.timer  = DOMAIN_ZOOM_FRAMES
    if (domainCine.savedMaxZoom == null) {        // capture limits once
      domainCine.savedMaxZoom = camera.maxZoom
      domainCine.savedMaxStep = camera.maxZoomStep
    }
    camera.maxZoom     = DOMAIN_ZOOM              // allow the tight zoom
    camera.maxZoomStep = 0.05                     // reach it within the beat (still smoothed)
  } else if (!isCine && domainCine.domain) {
    // END — domain gone (timeout / KO / interrupt): restore everything.
    endDomainCinematic()
  }

  if (domainCine.timer > 0) {
    domainCine.timer--
    if (domainCine.timer === 0) _restoreCinematicCameraLimits()  // beat done → pull back at normal rate
  }
}

// Restore only the camera rate/zoom LIMITS so framing resumes normally. Idempotent.
function _restoreCinematicCameraLimits() {
  if (domainCine.savedMaxZoom != null) camera.maxZoom     = domainCine.savedMaxZoom
  if (domainCine.savedMaxStep != null) camera.maxZoomStep = domainCine.savedMaxStep
}

// ALWAYS-RUN cleanup — guarantees camera limits + cinematic state reset even if
// the domain ends early or the match resets mid-domain, so the screen can never
// stay stuck zoomed in. Idempotent; safe to call from any reset path.
function endDomainCinematic() {
  _restoreCinematicCameraLimits()
  domainCine.savedMaxZoom = null
  domainCine.savedMaxStep = null
  domainCine.caster = null
  domainCine.domain = null
  domainCine.timer  = 0
}

function isDomainZoomBeat() { return domainCine.timer > 0 }

function updateBattle() {
  if (slowdownTimer > 0) {
    slowdownTimer--
    if (slowdownTarget) {
      camera.targetZoom = Math.max(camera.minZoom, (camera.targetZoom || camera.zoom) * 0.94)
      if (camera.focusOnFighter) camera.focusOnFighter(slowdownTarget, camera.targetZoom)
    }
    if (slowdownTimer % 3 !== 0) {
      if (typeof camera.update === "function" && p1 && p2) camera.update(p1, p2, canvas)
      return
    }
  }

  // Susanoo (either fighter) PAUSES the round clock — a 20s sustained giant form shouldn't
  // eat into the round timer. The Susanoo DURATION timer (_susanooTimer) keeps ticking
  // regardless (updateTransformationState → updateSasukeSusanoo); only the ROUND clock freezes.
  // Uses the exported sasukeInSusanoo helper so this stays correct if the flag changes.
  const sustainedFormActive = sasukeInSusanoo(p1) || sasukeInSusanoo(p2)
  const prevRoundTimer = roundTimer
  if (roundTimer > 0 && !sustainedFormActive) roundTimer--
  // RICK timer-warning barks — fire ONCE at each crossing (prev>X && now<=X so a Susanoo stall
  // that parks the clock on the threshold can't re-fire it). Gated to the LOCAL PLAYER being Rick.
  // ROUND_TIME is 90s: 60s left = 3600f, 30s = 1800f, 10s = 600f.
  if (p1?.rosterKey === "rick") {
    if      (prevRoundTimer > 3600 && roundTimer <= 3600) sound.playSfxFile?.(pickRickVoice("timerMinute"), null)
    else if (prevRoundTimer > 1800 && roundTimer <= 1800) sound.playSfxFile?.(pickRickVoice("timer30"), null)
    else if (prevRoundTimer > 600  && roundTimer <= 600)  sound.playSfxFile?.(pickRickVoice("timer10"), null)
  }

  updateDebugInputToggles()
  updateTrainingMode()
  updateCPUInput()
  updateGamepadEdges(p1)   // controller players: feed motion history + double-tap + L2 tap-toggle
  updateGamepadEdges(p2)
  updateFacing()

  // DOMAIN CINEMATIC: on a new Gojo/Sukuna domain, freeze combat (hitstop-style)
  // and drive the camera with the shared smoothing toward a tight focus on the
  // caster's hand-sign for ~28 frames, then fall through to normal play (the
  // camera pulls back to reveal the fullscreen domain).
  updateDomainCinematic()
  if (isDomainZoomBeat()) {
    if (domainCine.caster && camera.focusOnFighter) camera.focusOnFighter(domainCine.caster, DOMAIN_ZOOM)
    updateEffectsAndDomains()                 // white flash fades + domain bg renders
    if (typeof camera.advance === "function") camera.advance(canvas)
    return                                     // skip movement/combat/physics this frame
  }

  // KURAMA ULTIMATE CINEMATIC: same freeze contract as the domain zoom beat —
  // the Tailed Beast Bomb sequence drives the camera + deals its guaranteed hit
  // while combat/physics are paused, then combat resumes when it ends.
  if (isKuramaCinematicActive()) {
    updateKuramaUltimate({ camera, hitEffects: hitSparks, damageNumbers, sound })
    if (typeof camera.advance === "function") camera.advance(canvas)
    return                                     // skip movement/combat/physics this frame
  }

  // SASUKE SHARINGAN CINEMATIC (Susanoo Lv1→Lv2 escalation): SAME freeze contract —
  // combat/physics are paused while the eye sequence plays; the Lv2 escalation is applied
  // by the cinematic's onResolve at its RESOLVE beat, then combat resumes into Lv2.
  if (isSasukeCinematicActive()) {
    updateSasukeCinematic({ camera, sound })
    if (typeof camera.advance === "function") camera.advance(canvas)
    return                                     // skip movement/combat/physics this frame
  }

  // GOKU BLACK SSJ ROSE TRANSFORM CINEMATIC: SAME freeze contract — combat/physics/input are
  // paused while the morph plays (camera isolates Goku Black, opponent out of frame); the form-swap
  // (art + stats) is applied by the cinematic's onResolve at its RESOLVE beat, then combat resumes.
  if (isSSJRoseCinematicActive()) {
    updateSSJRoseCinematic({ camera, sound })
    if (typeof camera.advance === "function") camera.advance(canvas)
    return                                     // skip movement/combat/physics this frame
  }

  // GOKU BLACK SWORD SLASH CINEMATIC: SAME freeze contract — combat/physics/input are paused for the
  // whole sequence (so NEITHER fighter can act — the old vulnerable/interruptible windup is gone). The
  // camera frames BOTH fighters (Kurama TBB framing); the guaranteed damage/paralysis lands at the
  // STRIKE connect beat via the cinematic's onImpact, then combat resumes.
  if (isGokuBlackSwordCinematicActive()) {
    updateGokuBlackSwordCinematic({ camera, hitEffects: hitSparks, damageNumbers, sound })
    if (typeof camera.advance === "function") camera.advance(canvas)
    return                                     // skip movement/combat/physics this frame
  }

  // VEGETA OVERCHARGED FINAL FLASH CINEMATIC: SAME freeze contract — combat/physics/input paused for
  // the whole sequence; the guaranteed damage lands at the FIRE connect beat via onImpact, then resume.
  if (isVegetaFinalFlashCinematicActive()) {
    updateVegetaFinalFlashCinematic({ camera, hitEffects: hitSparks, damageNumbers, sound })
    if (typeof camera.advance === "function") camera.advance(canvas)
    return
  }
  if (isBeerusKiBallCinematicActive()) {
    updateBeerusKiBallCinematic({ camera, hitEffects: hitSparks, damageNumbers, sound })
    if (typeof camera.advance === "function") camera.advance(canvas)
    return
  }

  // BINDING VOWS: match each player's recent RAW directional sequence (own
  // character's vows only). AI fighters have no directionHistory → never match.
  if (vowCue.timer > 0) vowCue.timer--
  for (const f of [p1, p2]) {
    if (!f) continue
    const vow = tryActivateBindingVow(f)
    if (vow) { _triggerVowCue(vow); f.teleportFlash = 20; knockoutFlash = Math.max(knockoutFlash, 8) }
  }

  _runClashCheck()

  updateMovementInput(p1)
  updateMovementInput(p2)

  applyGojoInfinityField(p1, p2)
  applyGojoInfinityField(p2, p1)
  applyGojoInfinityToProjectiles(p1)   // TASK 4: slow/shrink/despawn enemy projectiles in the zone
  applyGojoInfinityToProjectiles(p2)

  p1 = updateFighterState(p1)
  p2 = updateFighterState(p2)

  applyGojoInfinityBarrier(p1, p2)
  applyGojoInfinityBarrier(p2, p1)

  if (typeof physics.resolvePlayerCollision === "function") physics.resolvePlayerCollision(p1, p2)

  for (const fighter of [p1, p2].filter(Boolean)) {
    if (fighter._wallBounceShake) { camera.shake?.(8, 6); fighter._wallBounceShake = false }
  }

  updateFacing()
  updateEffectsAndDomains()
  updatePlayerCombat(p1)
  updatePlayerCombat(p2)

  // #21 CLONE RENDAN STORM — when Naruto's BASIC light-string hit connects with clones alive,
  // each live clone chains a flurry follow-up onto the string. Detected here (not in shared
  // combat.js, which must not import abilities.js → no cycle): fire ONCE per swing via a
  // per-attack marker the instant its hit lands.
  maybeCloneRendanStorm(p1)
  maybeCloneRendanStorm(p2)

  // ONE projectile update path on the shared activeProjectiles array (combat.js
  // owns movement + collision). The old second updateAbilityProjectiles() call
  // moved every projectile twice per frame — removed.
  updateCombatProjectiles(activeProjectiles, getStageWorldWidth(), [p1, p2])
  updatePendingSpawns()   // frame-counted deferred spawns (e.g. Naruto 2nd clone)
  resolveProjectileHits(activeProjectiles, p1, p2, hitSparks)

  updateActiveSummons()

  for (const fighter of [p1, p2].filter(Boolean)) {
    processPendingSpawns?.(fighter, {
      // Bug-sweep #1 fix: sprite.js calls spawnProjectile(fighter, "<key>", {}, ctx)
      // — a STRING 2nd arg. The old binding (projectiles.js spawnProjectileFromMove)
      // expected a moveData OBJECT and read moveData.projectileId, so it always
      // console.warned and spawned nothing. abilities.js's spawnProjectile has the
      // matching (attacker, type, moveData, ctx) signature, so frame-driven spawns
      // now produce a real projectile. (Gojo's Blue/Purple + Sukuna's Fuga DON'T
      // use this path — they call spawnProjectile directly — so they were never
      // affected by the mismatch; this only repairs the dormant sprite-frame path.)
      spawnProjectile: spawnProjectile,
      spawnSummon:     spawnAssistSummon,
      getOpponent
    })
    if (fighter.domainSummonPending?.length) {
      const summonId = fighter.domainSummonPending.shift()
      const target   = getOpponent(fighter)
      if (target) spawnAssistSummon(fighter, { summonId, damage: 95 * 1.5 }, target)
    }
  }

  if (typeof camera.update === "function") camera.update(p1, p2, canvas)
  checkRoundEnd()
}

// ------------------------------------------------------------------
// RENDERING
// ------------------------------------------------------------------
// SKIN/TINT seam (Task 1). A fighter with `tintColor` is washed with that color
// at draw time (MK-style same-character mirror). `skinId` is reserved for future
// real skins — see applyMirrorTint(). Works for BOTH sprite + procedural fighters
// because it washes only the fighter's own drawn pixels (offscreen source-atop).
let _tintCanvas = null, _tintCtx = null
function renderHybridFighter(fighter) {
  if (!fighter) return
  // Freeze sprite frame-advance while paused (the pause state still renders this
  // frame, so draw() must not keep ticking animations). sprite.js reads this flag.
  fighter._animFrozen = (gameState === GAME_STATES.PAUSED)
  const key = fighter.rosterKey
  const drawTo = (c) => {
    drawKuramaShroudAura(c, fighter)   // Kurama shroud glow, behind the body/sprite (Naruto only)
    drawMangekyouAura(c, fighter)      // Itachi Mangekyou crimson glow, behind the body (Itachi only)
    if (fighter.hasSprites && fighter.spriteHandler && spritesReady(key)) {
      fighter.spriteHandler.draw(c, fighter, getSpriteSheets(key))
    } else {
      drawFighter(c, fighter, camera)
    }
    drawMangekyouActivationFlash(c, fighter)   // Itachi eye-ignite flash, on top of the sprite (fades)
  }

  // CINEMATIC INTRO REVEAL (opt-in via characters.js `introReveal`): while this fighter is playing its
  // intro, hold it INVISIBLE for `hide` frames (empty stage) then fade in over `fade` frames, so it
  // materialises out of the intro effects. revealAlpha<=0 → draw NOTHING (also kills the 1-frame
  // pre-sprite placeholder box). No-op for any fighter without the field / not mid-intro.
  let revealAlpha = 1
  if (fighter._introPlaying && fighter.introReveal) {
    const rf = fighter._introRevealFrame || 0
    const hide = fighter.introReveal.hide || 0, fade = Math.max(1, fighter.introReveal.fade || 1)
    revealAlpha = Math.max(0, Math.min(1, (rf - hide) / fade))
  }
  if (revealAlpha <= 0) return   // empty stage — draw nothing this frame

  if (!fighter.tintColor) {
    if (revealAlpha >= 1) { drawTo(ctx); return }
    ctx.save(); ctx.globalAlpha *= revealAlpha; drawTo(ctx); ctx.restore(); return
  }

  // Tinted: render the fighter to an offscreen layer that mirrors the live camera
  // transform, wash ONLY its pixels with tintColor (source-atop), then composite
  // the layer back in screen space. This tints the character, not the background.
  if (!_tintCanvas) { _tintCanvas = document.createElement("canvas"); _tintCtx = _tintCanvas.getContext("2d") }
  if (_tintCanvas.width !== canvas.width || _tintCanvas.height !== canvas.height) {
    _tintCanvas.width = canvas.width; _tintCanvas.height = canvas.height
  }
  const cam = ctx.getTransform()
  _tintCtx.setTransform(1, 0, 0, 1, 0, 0)
  _tintCtx.clearRect(0, 0, _tintCanvas.width, _tintCanvas.height)
  _tintCtx.setTransform(cam.a, cam.b, cam.c, cam.d, cam.e, cam.f)
  drawTo(_tintCtx)
  _tintCtx.setTransform(1, 0, 0, 1, 0, 0)
  _tintCtx.globalCompositeOperation = "source-atop"
  _tintCtx.globalAlpha = fighter.tintStrength || 0.42
  _tintCtx.fillStyle = fighter.tintColor
  _tintCtx.fillRect(0, 0, _tintCanvas.width, _tintCanvas.height)
  _tintCtx.globalCompositeOperation = "source-over"
  _tintCtx.globalAlpha = 1

  ctx.save()
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  if (revealAlpha < 1) ctx.globalAlpha *= revealAlpha   // intro delayed-reveal fade (tinted mirror path)
  ctx.drawImage(_tintCanvas, 0, 0)
  ctx.restore()
}

// Developer-code input overlay (Task 6) + the unlock confirmation, drawn on the menu.
function _drawDevCodeOverlay() {
  const cw = canvas.width, ch = canvas.height
  if (devCodeEntry) {
    ctx.save()
    ctx.fillStyle = "rgba(0,0,0,0.72)"; ctx.fillRect(0, 0, cw, ch)
    const w = 460, h = 170, x = cw / 2 - w / 2, y = ch / 2 - h / 2
    ctx.fillStyle = "#0e1626"; ctx.fillRect(x, y, w, h)
    ctx.strokeStyle = "#7dd3fc"; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h)
    ctx.textAlign = "center"; ctx.fillStyle = "#e2e8f0"; ctx.font = "700 22px Arial"
    ctx.fillText("DEVELOPER CODE", cw / 2, y + 36)
    ctx.fillStyle = "#0a0f1a"; ctx.fillRect(x + 30, y + 56, w - 60, 40)
    ctx.strokeStyle = "#334155"; ctx.strokeRect(x + 30, y + 56, w - 60, 40)
    ctx.fillStyle = "#fbbf24"; ctx.font = "600 20px monospace"
    ctx.fillText((devCodeBuffer || "") + "▍", cw / 2, y + 82)
    ctx.fillStyle = "#94a3b8"; ctx.font = "13px Arial"
    ctx.fillText("Type the code · Enter to submit · Esc to cancel", cw / 2, y + 124)
    ctx.fillStyle = "rgba(248,180,80,0.85)"; ctx.font = "12px Arial"
    ctx.fillText("Unlocks are session-only (not saved across reloads)", cw / 2, y + 146)
    ctx.restore()
  } else if (devCodeMessage) {
    ctx.save(); ctx.textAlign = "center"
    ctx.fillStyle = devCodeMessage.startsWith("✓") ? "#86efac" : "#fca5a5"
    ctx.font = "700 16px Arial"; ctx.fillText(devCodeMessage, cw / 2, 90)
    ctx.restore()
  }
}

// Dev-unlocked Online stub (Task 6) — no netcode; a clearly-labelled placeholder.
function _drawOnlinePlaceholder() {
  const cw = canvas.width, ch = canvas.height
  ctx.fillStyle = "#08111f"; ctx.fillRect(0, 0, cw, ch)
  ctx.textAlign = "center"; ctx.fillStyle = "#e2e8f0"; ctx.font = "700 40px Arial"
  ctx.fillText("ONLINE", cw / 2, ch * 0.4)
  ctx.fillStyle = "#94a3b8"; ctx.font = "18px Arial"
  ctx.fillText("Placeholder — netcode is not implemented yet.", cw / 2, ch * 0.4 + 44)
  ctx.fillText("(Dev-unlocked entry point for future matchmaking.)", cw / 2, ch * 0.4 + 72)
  ctx.fillStyle = "#A00"; ctx.fillRect(cw / 2 - 100, ch * 0.4 + 110, 200, 46)
  ctx.fillStyle = "#fff"; ctx.font = "20px Arial"; ctx.fillText("BACK", cw / 2, ch * 0.4 + 138)
}

// Progression badge (Task 3): level + XP bar + the explicit non-persistence notice.
function _drawProgressionBadge() {
  const pr = xpProgress()
  const x = 24, y = canvas.height - 72, w = 300, h = 48
  ctx.save()
  ctx.textAlign = "left"; ctx.textBaseline = "middle"
  if (PROGRESS_DOES_NOT_PERSIST) {
    ctx.fillStyle = "rgba(248,180,80,0.9)"; ctx.font = "11px Arial"
    ctx.fillText("Progress is session-only — not saved across reloads (no backend yet)", x, y - 10)
  }
  ctx.fillStyle = "rgba(8,14,30,0.82)"; ctx.fillRect(x, y, w, h)
  ctx.strokeStyle = "rgba(150,180,255,0.30)"; ctx.lineWidth = 1.5; ctx.strokeRect(x, y, w, h)
  ctx.fillStyle = "#fbbf24"; ctx.font = "700 18px Arial"; ctx.fillText("LV " + pr.level, x + 12, y + 15)
  ctx.fillStyle = "#cbd5e1"; ctx.font = "12px Arial"; ctx.fillText(`${pr.into} / ${pr.need} XP`, x + 70, y + 15)
  const bx = x + 12, by = y + 28, bw = w - 24, bh = 7
  ctx.fillStyle = "rgba(255,255,255,0.15)"; ctx.fillRect(bx, by, bw, bh)
  ctx.fillStyle = "#fbbf24"; ctx.fillRect(bx, by, bw * Math.max(0, Math.min(1, pr.pct)), bh)
  ctx.restore()
}

// Same-character mirror (Task 1): when both fighters are the same rosterKey, wash
// P2 red so the two are distinguishable. Extend later by setting tintColor/skinId
// from a chosen skin instead. Safe to call every reset.
const MIRROR_TINT = "#e2493b"
function applyMirrorTint(a, b) {
  if (!a || !b) return
  const mirror = a.rosterKey && a.rosterKey === b.rosterKey
  // P1 keeps its native look; P2 gets the red wash only in a mirror match.
  a.tintColor = a.skinTint || null
  b.tintColor = b.skinTint || (mirror ? MIRROR_TINT : null)
}

function drawHitSparksEnhanced() {
  if (!hitSparks.length) return
  // NOTE: this runs INSIDE drawBattleScene's active camera transform — do NOT
  // re-apply it here or sparks get double-transformed (drawn way off-screen as
  // giant glowing artifacts: the "screen glitches out on attack" bug).
  for (const spark of hitSparks) {
    const { x, y, category, color, timer, maxTimer, lines, radius } = spark
    const alpha = Math.min(1, timer / Math.max(1, maxTimer || timer))
    const c = color || "#fff1a8"
    const n = lines  || 6
    const r = radius || 14
    ctx.save()
    ctx.globalAlpha = alpha
    ctx.strokeStyle = c
    ctx.lineWidth   = category === "ultimate" ? 4 : category === "special" ? 3 : category === "clash" ? 3 : 2
    ctx.shadowBlur  = (category === "ultimate" || category === "special") ? 12 : 0
    ctx.shadowColor = c
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n
      const len   = r * (0.6 + (i % 3) * 0.2)
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len); ctx.stroke()
    }
    if (category === "heavy" || category === "special" || category === "ultimate" || category === "clash") {
      ctx.fillStyle = c + "44"; ctx.shadowBlur = 0
      ctx.beginPath(); ctx.arc(x, y, r * 0.35, 0, Math.PI * 2); ctx.fill()
    }
    if (category === "ultimate" || category === "clash") {
      const ringR = r * 0.5 + r * 1.5 * (1 - alpha)
      ctx.strokeStyle = c + "66"; ctx.lineWidth = 2; ctx.shadowBlur = 0
      ctx.beginPath(); ctx.arc(x, y, ringR, 0, Math.PI * 2); ctx.stroke()
    }
    if (category === "parry") {
      ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(x, y, r * (0.5 + 0.5 * (1 - alpha)), 0, Math.PI * 2); ctx.stroke()
    }
    ctx.restore()
  }
}

// Persistent visual cue that Gojo's Infinity is active (works with sprites, since
// the procedural drawGojo aura isn't used when he's sprite-rendered): a pulsing
// cyan ring around him. Drawn in world space (inside the camera transform).
// OPTIONAL Infinity-barrier/aura sprite (Task 3). Set INFINITY_SHEET to a valid
// horizontal strip to use art; null → the procedural ring below. (NOTE: the
// existing gojo_infinity_sheet.png is a 1408×768 GRID, not a single-row strip, so
// it must be re-laid-out before it can go here — see the report.)
const INFINITY_SHEET = { src: null, frames: 1, w: 0, h: 0, speed: 4, scale: 1 }
let _infinityImg = null
function _drawInfinityAura(f) {
  if (!f || !f.infinityActive) return
  const cx = f.x + f.w / 2, cy = f.y + f.h / 2

  if (INFINITY_SHEET.src) {
    if (!_infinityImg) { _infinityImg = new Image(); _infinityImg.src = INFINITY_SHEET.src }
    if (_infinityImg.complete && _infinityImg.naturalWidth > 0) {
      const frames = INFINITY_SHEET.frames || 1
      const fw = INFINITY_SHEET.w || (_infinityImg.naturalWidth / frames)
      const fh = INFINITY_SHEET.h || _infinityImg.naturalHeight
      const fi = Math.floor(globalFrameCount / (INFINITY_SHEET.speed || 4)) % frames
      const s  = INFINITY_SHEET.scale || 1
      ctx.save(); ctx.globalAlpha = 0.85
      ctx.drawImage(_infinityImg, fi * fw, 0, fw, fh, cx - fw * s / 2, cy - fh * s / 2, fw * s, fh * s)
      ctx.restore()
      return
    }
  }

  const r  = Math.max(f.w, f.h) * 0.72
  const t  = globalFrameCount * 0.12
  ctx.save()
  ctx.strokeStyle = "#67e8f9"
  ctx.shadowBlur  = 16; ctx.shadowColor = "#22d3ee"
  ctx.lineWidth   = 3
  ctx.globalAlpha = 0.30 + Math.sin(t) * 0.08
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()
  ctx.globalAlpha = 0.14
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2); ctx.stroke()
  ctx.restore()
}

// Persistent cue that Sasuke's ABSOLUTE DEFENSE toggle is up (works with his sprite).
// The intended barrier imagery is the repurposed sasuke_susanoo_intro.png ribcage/aura sheet.
// BUGFIX (playtester report 2026-07-20): that sheet used to be spawned ONLY as a one-shot 32-frame
// FX on toggle-on (spawnAbsoluteDefenseFx) — it flashed for ~0.5s then decayed, leaving nothing but
// the plain purple ring below for the ENTIRE remaining duration the toggle was up. So players saw
// "a plain purple circle instead of the ribcage/aura imagery." Fix: draw the ribcage/aura sheet
// PERSISTENTLY here (per-frame, tracking the fighter) for as long as the toggle is active — same
// sheet-aura pattern Gojo's Infinity already uses (_drawInfinityAura). The ring stays as a subtle
// underlay (and as the fallback while the sheet image is still loading).
// Per-block negates also pop his teleportFlash (combat.shouldSasukeAbsoluteDefenseNegate).
const ABSOLUTE_DEFENSE_SHEET = { src: "./sasuke_susanoo_intro.png", frames: 6, w: 113, h: 70, speed: 6, scale: 1.6 }
let _absDefImg = null
let _absDefAuraSheetFrame = 0   // last globalFrameCount the persistent ribcage/aura sheet actually drew (harness observable)
// Charge-vortex instrumentation (harness observable): a counter bumped only when the PROCEDURAL
// spiral actually renders (i.e. the skip-logic let it through) so a test can prove it draws for a
// normal fighter and is skipped for Goku Black; plus a real sampled ribbon x so a test can prove the
// spiral genuinely rotates frame-to-frame (not a static shot).
let _chargeAuraRenderCount = 0
function _drawAbsoluteDefenseAura(f) {
  if (!f || !f.absoluteDefenseActive) return
  const cx = f.x + f.w / 2, cy = f.y + f.h / 2
  const r  = Math.max(f.w, f.h) * 0.72
  const t  = globalFrameCount * 0.12

  // Subtle ring underlay — keeps a clear "barrier is up" read and doubles as the
  // fallback while the ribcage/aura sheet is still loading (first-ever activation).
  ctx.save()
  ctx.strokeStyle = "#c4b5fd"
  ctx.shadowBlur  = 16; ctx.shadowColor = "#8b5cf6"
  ctx.lineWidth   = 3
  ctx.globalAlpha = 0.30 + Math.sin(t) * 0.08
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke()
  ctx.globalAlpha = 0.14
  ctx.beginPath(); ctx.arc(cx, cy, r * 0.78, 0, Math.PI * 2); ctx.stroke()
  ctx.restore()

  // Persistent ribcage/aura sheet — the actual Absolute Defense imagery, drawn every
  // frame so it tracks Sasuke and never decays while the toggle is on.
  if (!_absDefImg) { _absDefImg = new Image(); _absDefImg.src = ABSOLUTE_DEFENSE_SHEET.src }
  if (_absDefImg.complete && _absDefImg.naturalWidth > 0) {
    const frames = ABSOLUTE_DEFENSE_SHEET.frames || 1
    const fw = ABSOLUTE_DEFENSE_SHEET.w || (_absDefImg.naturalWidth / frames)
    const fh = ABSOLUTE_DEFENSE_SHEET.h || _absDefImg.naturalHeight
    const fi = Math.floor(globalFrameCount / (ABSOLUTE_DEFENSE_SHEET.speed || 4)) % frames
    const s  = ABSOLUTE_DEFENSE_SHEET.scale || 1
    const dw = fw * s, dh = fh * s
    _absDefAuraSheetFrame = globalFrameCount
    ctx.save()
    ctx.globalAlpha = 0.62 + Math.sin(t) * 0.10   // gentle pulse so it reads as an active aura
    // Face the sheet toward Sasuke's facing so the aura sits over him consistently.
    ctx.translate(cx, cy)
    ctx.scale(f.facing || 1, 1)
    ctx.drawImage(_absDefImg, fi * fw, 0, fw, fh, -dw / 2, -dh / 2, dw, dh)
    ctx.restore()
  }
}

// HOLD-TO-CHARGE aura (Task 2): a visible energy effect while a meter character holds P to build
// energy. Universal (works for sprite AND procedural fighters). Now a swirling, coiling RIBBON of
// energy that spirals AROUND the body — ascending and rotating, vortex-like — instead of a flat
// ground ring + rising dots. Depth (front/back of the coil) is faked in 2D: a segment on the near
// half of its rotation is drawn brighter/thicker with more glow; the far half is dimmer/thinner, so
// it reads as wrapping in front of AND behind the character. The whole coil rotates every frame off
// globalFrameCount (deterministic — no Math.random in the loop). Tinted to f.energyColor and
// brighter as the meter fills (pct), same as before.
function _drawChargeAura(f) {
  if (!f || !f.isCharging) return
  // Fighters with their own charge-aura SPRITE (Goku Black's power-up/Rose strips) render that
  // instead — skip the procedural aura so the two don't stack. No-op for everyone else.
  if (f._skinAnim?.charge || f.animationData?.charge) return
  _chargeAuraRenderCount++

  const cx    = f.x + f.w / 2, baseY = f.y + f.h
  const pct   = Math.max(0, Math.min(1, (f.energy || 0) / (f.maxEnergy || 1)))
  const col   = f.energyColor || "#fcd34d"
  const bright = 0.55 + pct * 0.45                 // meter-fill brightness (unchanged behaviour)

  const H     = f.h * (1.06 + pct * 0.30)          // coil rises up the body, a touch past the head
  const Rbase = Math.max(f.w * 0.92, 46)           // horizontal reach so the coil wraps AROUND the silhouette
  const spin  = globalFrameCount * 0.13            // continuous rotation phase (vortex spins each frame)
  const TURNS = 2.7                                // number of coils from feet to crown
  const STRANDS = 2                                // twin intertwined ribbons for a fuller vortex
  const SEG   = 48                                 // samples per ribbon (drawn as depth-shaded segments)

  ctx.save()
  ctx.lineCap = "round"; ctx.lineJoin = "round"
  ctx.shadowColor = col; ctx.strokeStyle = col; ctx.fillStyle = col

  // faint base flare so the vortex is anchored at the feet (not a hard cut-off)
  ctx.globalAlpha = 0.18 * bright
  ctx.shadowBlur = 16
  ctx.beginPath(); ctx.ellipse(cx, baseY - 3, Rbase * 0.7, f.h * 0.07, 0, 0, Math.PI * 2); ctx.fill()

  let sampleX = cx
  for (let s = 0; s < STRANDS; s++) {
    const strandPhase = spin + s * Math.PI          // the two ribbons sit on opposite sides
    let prev = null
    for (let i = 0; i <= SEG; i++) {
      const u     = i / SEG                          // 0 = feet → 1 = crown
      const theta = u * TURNS * Math.PI * 2 + strandPhase
      // radius: fuller through the mid-body, funnelling in slightly toward the top (vortex taper)
      const rx    = Rbase * (0.80 + 0.34 * Math.sin(Math.PI * u)) * (1 - u * 0.22)
      const x     = cx + Math.cos(theta) * rx
      const y     = baseY - u * H
      const front = (Math.sin(theta) + 1) * 0.5      // 1 = near (front of body), 0 = far (behind)
      const fade  = 0.45 + 0.55 * Math.sin(Math.PI * u)  // soften the feet/crown ends
      if (prev) {
        // depth-shaded ribbon segment: near half brighter/thicker/more glow → reads as "in front"
        ctx.globalAlpha = Math.max(0, Math.min(1, (0.14 + front * 0.78) * bright * fade))
        ctx.lineWidth   = (1.3 + front * 3.4) * (0.7 + pct * 0.5)
        ctx.shadowBlur  = 5 + front * 13
        ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(x, y); ctx.stroke()
      }
      if (s === 0 && i === Math.round(SEG * 0.5)) sampleX = x   // real drawn mid-coil x (harness rotation probe)
      prev = { x, y }
    }
  }

  // bright energy "head" cresting at the top of the vortex + a couple of sparks riding the coil
  const headTheta = TURNS * Math.PI * 2 + spin
  const headX = cx + Math.cos(headTheta) * Rbase * 0.5
  ctx.globalAlpha = 0.85 * bright
  ctx.shadowBlur = 18
  ctx.beginPath(); ctx.arc(headX, baseY - H, 2.5 + pct * 2.2, 0, Math.PI * 2); ctx.fill()

  ctx.restore()

  // Harness probes (real drawn values): the sampled mid-coil x rotates frame-to-frame, and the frame
  // it last drew — lets a test prove the spiral genuinely animates rather than sitting static.
  f._chargeAuraSampleX = sampleX
  f._chargeAuraFrame   = globalFrameCount
}

// VEGETA two-part intro aura: the vegeta_base_intro_2_effects burst composited OVER Vegeta
// while his 2nd intro pose (power-up flare) plays. Mirrors the _drawAbsoluteDefenseAura sheet
// overlay. Additive blend so the cyan energy glows; one-shot expand that holds on the last frame
// (synced to the intro2 pose, not looped). Only Vegeta has this sheet → no-op for everyone else.
const VEGETA_INTRO_AURA = { src: "./vegeta_base_intro_2_effects_uniform.png", frames: 5, w: 149, h: 121 }
let _vegetaIntroAuraImg = null
let _vegetaIntroAuraFrame = 0            // last globalFrameCount the aura actually drew (harness observable)
let _vegetaIntroAuraRenderCount = 0
function _drawIntroAura(f) {
  if (!f || f.rosterKey !== "vegeta" || !f._introPlaying || f._introVariant !== "intro2") return
  if (!_vegetaIntroAuraImg) { _vegetaIntroAuraImg = new Image(); _vegetaIntroAuraImg.src = VEGETA_INTRO_AURA.src }
  if (!(_vegetaIntroAuraImg.complete && _vegetaIntroAuraImg.naturalWidth > 0)) return
  const frames = VEGETA_INTRO_AURA.frames, fw = VEGETA_INTRO_AURA.w, fh = VEGETA_INTRO_AURA.h
  // Cycle the 5 burst frames off the global clock so the aura visibly pulses/expands.
  const fi = Math.min(frames - 1, Math.floor((globalFrameCount % (frames * 6)) / 6))
  const cx = f.x + f.w / 2, cy = f.y + f.h * 0.48
  const dh = f.h * 1.85, dw = dh * (fw / fh)   // aura envelops the body
  _vegetaIntroAuraFrame = globalFrameCount
  _vegetaIntroAuraRenderCount++
  ctx.save()
  ctx.globalCompositeOperation = "lighter"
  ctx.globalAlpha = 0.9
  ctx.drawImage(_vegetaIntroAuraImg, fi * fw, 0, fw, fh, cx - dw / 2, cy - dh / 2, dw, dh)
  ctx.restore()
}

function drawBattleScene() {
  const stage = getStageTheme()
  const hasTransform = typeof camera.applyTransform === "function"
  ctx.save()

  // 1) Stage background — WORLD space. Skipped while a domain fully covers the
  //    screen (kept during the fade-out so the domain dissolves back to it).
  if (hasTransform) camera.applyTransform(ctx, canvas)   // applyTransform does its own ctx.save()
  if (activeDomains.length === 0) drawBattleBackground(ctx, canvas, stage, groundY, getStageFloorHeight())
  if (hasTransform && typeof camera.clearTransform === "function") camera.clearTransform(ctx)

  // 2) Domain background — SCREEN space, fullscreen. Drawn outside the camera
  //    transform so the Gojo void video / Sukuna shrine covers the ENTIRE
  //    viewport regardless of zoom/pan (was world-clipped to a small region),
  //    and on top of the stage so the fade-out reveals it. No-ops when idle.
  if (typeof drawDomainBackground === "function") drawDomainBackground(ctx, canvas, groundY, getStageFloorHeight())

  // 3) Everything else — WORLD space, on top of the domain backdrop.
  if (hasTransform) camera.applyTransform(ctx, canvas)
  drawDomains(ctx)
  drawProjectiles(ctx, activeProjectiles, camera)
  renderHybridFighter(p1)
  renderHybridFighter(p2)
  // Shikigami/summons drawn AFTER the fighters (world space) so Megumi's Divine
  // Dog / Nue / Toad etc. are never hidden behind a fighter sprite — they were
  // previously drawn underneath and could be occluded near the action.
  drawActiveSummons(ctx)
  _drawInfinityAura(p1)
  _drawInfinityAura(p2)
  _drawAbsoluteDefenseAura(p1)
  _drawAbsoluteDefenseAura(p2)
  _drawChargeAura(p1)
  _drawChargeAura(p2)
  _drawIntroAura(p1)
  _drawIntroAura(p2)
  drawHitSparksEnhanced()
  if (trainingState.enabled) drawTrainingCollisionBoxes(ctx, [p1, p2], getAttackHitbox)
  // Balance applyTransform's internal save() so the canvas state stack doesn't
  // leak one save() per frame.
  if (hasTransform && typeof camera.clearTransform === "function") camera.clearTransform(ctx)

  ctx.restore()
}

// Running floor-count badge for Tower runs (all tiers). For Tier 5 (endless) it doubles
// as the "how high can you climb" high-score readout — no total, just the running floor.
function drawTowerHud(ctx, canvas) {
  if (!towerState.active) return
  const cw = canvas.width
  const floorNum = towerState.floor + 1
  const label = towerState.endless
    ? `${towerState.tierLabel}  ·  FLOOR ${floorNum}`
    : `${towerState.tierLabel}  ·  FLOOR ${floorNum} / ${towerState.floors}`
  const diff = (matchConfig.aiDifficulty || "").toUpperCase()
  const y = 92, h = 30, r = 8
  ctx.save()
  ctx.textAlign = "center"; ctx.textBaseline = "middle"
  ctx.font = "800 20px Arial"
  const w = ctx.measureText(label).width + 46
  const x = cw / 2 - w / 2
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
  ctx.fillStyle = "rgba(10,14,30,0.72)"; ctx.fill()
  ctx.strokeStyle = towerState.endless ? "#c084fc" : "rgba(160,180,230,0.55)"; ctx.lineWidth = 1.5; ctx.stroke()
  ctx.fillStyle = "#f1f5f9"; ctx.shadowBlur = 8; ctx.shadowColor = towerState.endless ? "#a855f7" : "rgba(120,170,255,0.5)"
  ctx.fillText(label, cw / 2, y + h / 2 + 1)
  ctx.shadowBlur = 0
  ctx.font = "700 11px Arial"; ctx.fillStyle = "rgba(200,210,230,0.6)"
  ctx.fillText(diff, cw / 2, y + h + 10)
  ctx.restore()
}

function drawBattleHud() {
  drawHealthAndEnergyBars(ctx, p1, p2, canvas, roundWins, globalFrameCount)
  drawControlsInfo(ctx, canvas)
  drawRoundTimer?.(ctx, canvas, roundTimer, ROUND_TIME)
  drawTowerHud(ctx, canvas)   // Tower floor-count badge (running high-score for Tier 5)
  // Purple Susanoo duration clock, shown beside the round timer while either fighter is transformed.
  const susFighter = sasukeInSusanoo(p1) ? p1 : (sasukeInSusanoo(p2) ? p2 : null)
  if (susFighter) drawSusanooTimer?.(ctx, canvas, susFighter._susanooTimer || 0, SUSANOO_DURATION_FRAMES)
  drawLowHealthWarning?.(ctx, canvas, p1, p2, globalFrameCount)

  // Toji 3-stance indicator (foundation) — visible for any Toji fighter in the match.
  const stanceEntries = []
  if ((p1?.rosterKey || "").toLowerCase() === "toji") stanceEntries.push({ label: "P1", stance: getTojiStance(p1) })
  if ((p2?.rosterKey || "").toLowerCase() === "toji") stanceEntries.push({ label: "P2", stance: getTojiStance(p2) })
  if (stanceEntries.length) drawStanceIndicator(ctx, canvas, stanceEntries)

  if (!trainingState.enabled) return
  const lastDmg = damageNumbers.length ? (damageNumbers[damageNumbers.length - 1].value || 0) : 0
  drawTrainingOverlay(ctx, canvas, {
    combo:     Math.max(p1?.comboCounter || 0, p2?.comboCounter || 0),
    damage:    lastDmg,
    state:     matchConfig.mode === "training" ? "training" : "debug",
    meterGain: 0, frame: globalFrameCount,
    frameData: buildTrainingFrameData(),
    infinite:  trainingState.infiniteResources,
    dummy:     trainingState.dummyBehavior,
    p1Inputs:  getRelativeDirectionsFromHistory(p1),
    p2Inputs:  getRelativeDirectionsFromHistory(p2),
    history:   getInputHistory()
  })
}

// Live frame-data string for whichever fighter is mid-attack (P1 preferred). The
// startup/active/recovery numbers already exist on the attack object; derive them from
// activeStart/activeEnd/total and show the current phase + elapsed frame.
function buildTrainingFrameData() {
  const f = (p1?.currentAttack ? p1 : (p2?.currentAttack ? p2 : null))
  if (!f) return null
  const a = f.currentAttack
  const startup  = a.activeStart
  const active   = (a.activeEnd - a.activeStart) + 1
  const recovery = a.total - a.activeEnd
  const elapsed  = a.total - a.timer
  const name = a.name || f.currentMove || "move"
  return { who: f === p1 ? "P1" : "P2", name, startup, active, recovery, phase: getAttackPhase(f), elapsed, total: a.total }
}

function _worldToScreen(wx, wy) {
  return {
    x: (wx - camera.x) * camera.zoom + canvas.width  / 2,
    y: (wy - camera.y) * camera.zoom + canvas.height / 2
  }
}

function _drawDamageNumbers() {
  if (!damageNumbers.length) return
  ctx.save()
  ctx.textAlign    = "center"
  ctx.textBaseline = "middle"
  for (const d of damageNumbers) {
    const s = _worldToScreen(d.x, d.y)
    ctx.globalAlpha = Math.max(0, d.opacity)
    ctx.font        = `bold ${d.fontSize || 22}px Arial`
    ctx.fillStyle   = d.color || "#ffffff"
    ctx.shadowBlur  = 5; ctx.shadowColor = d.color || "#ffffff"
    ctx.fillText(d.text, s.x, s.y)
  }
  ctx.shadowBlur = 0; ctx.globalAlpha = 1
  ctx.restore()
}

function _drawComboCounters() {
  const cw = canvas.width, ch = canvas.height
  const baseY = ch * 0.38
  for (const side of ["p1","p2"]) {
    const ds    = comboDisplay[side]
    const count = ds.lastCount
    if (ds.opacity <= 0 || count < 2) continue
    const isP1  = side === "p1"
    const baseX = isP1 ? cw * 0.22 : cw * 0.78
    const color = count >= 15 ? "#ef4444" : count >= 9 ? "#f97316" : count >= 5 ? "#fbbf24" : "#ffffff"
    const fontSize = Math.min(72, 48 + (count - 2) * 2)
    ctx.save()
    ctx.globalAlpha  = Math.max(0, ds.opacity)
    ctx.textAlign    = "center"; ctx.textBaseline = "middle"
    ctx.font         = `900 ${fontSize}px Arial`
    ctx.fillStyle    = color; ctx.shadowBlur = 18; ctx.shadowColor = color
    ctx.fillText(String(count), baseX, baseY - 14)
    ctx.font      = `700 ${Math.floor(fontSize * 0.42)}px Arial`
    ctx.fillStyle = "rgba(255,255,255,0.85)"; ctx.shadowBlur = 0
    ctx.fillText("HIT COMBO", baseX, baseY + fontSize * 0.36)
    ctx.restore()
  }
}

function _rrectPath(ctx, x, y, w, h, r = 6) {
  r = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r)
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h)
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r)
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y)
  ctx.closePath()
}

function _rrectFill(ctx, x, y, w, h, r = 6) {
  _rrectPath(ctx, x, y, w, h, r)
  ctx.fill()
}

function _rrectStroke(ctx, x, y, w, h, r = 6) {
  _rrectPath(ctx, x, y, w, h, r)
  ctx.stroke()
}

function _drawDomainHUDBar() {
  if (typeof getDomainHUDData !== "function") return
  const data = getDomainHUDData?.()
  if (!data) return
  const cw = canvas.width, barW = 220, barH = 12
  const barX = cw / 2 - barW / 2, barY = 54
  ctx.save()
  ctx.fillStyle = "rgba(0,0,0,0.55)"
  _rrectFill(ctx, barX - 10, barY - 18, barW + 20, barH + 30, 8)
  ctx.strokeStyle = "rgba(255,255,255,0.12)"; ctx.lineWidth = 1
  _rrectStroke(ctx, barX - 10, barY - 18, barW + 20, barH + 30, 8)
  ctx.font         = "700 11px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic"
  ctx.fillStyle    = data.color || "#a78bfa"
  ctx.fillText(data.name, cw / 2, barY - 3)
  ctx.fillStyle = "rgba(255,255,255,0.08)"
  _rrectFill(ctx, barX, barY, barW, barH, 4)
  ctx.fillStyle = data.ratio < 0.2 ? `hsl(0,90%,${50 + Math.sin(Date.now() * 0.02) * 15}%)` : data.color || "#a78bfa"
  _rrectFill(ctx, barX, barY, barW * Math.max(0, data.ratio), barH, 4)
  ctx.restore()
}

function _drawKOFlash() {
  if (knockoutFlash <= 0) return
  ctx.save()
  ctx.fillStyle   = "#ffffff"
  ctx.globalAlpha = Math.min(1, knockoutFlash / 18) * 0.9
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.restore()
  knockoutFlash--
}

function drawBattle() {
  drawBattleScene()
  drawBattleHud()
  if (countdown > 0) drawRoundCountdown?.(ctx, canvas, countdown, roundNumber)
  _drawDamageNumbers()
  _drawComboCounters()
  _drawDomainHUDBar()
  _drawKOFlash()
  _drawVowCue()
  drawKuramaCinematic(ctx, canvas)   // fullscreen Tailed Beast Bomb overlay, on top of all
  drawSasukeCinematic(ctx, canvas)   // fullscreen Sharingan-awakening overlay (Susanoo Lv2)
  drawSSJRoseCinematic(ctx, canvas)  // fullscreen SSJ Rose transform overlay (pink flash/aura)
  drawGokuBlackSwordCinematic(ctx, canvas)  // fullscreen Sword Slash overlay (magenta flash + slash streak)
  drawVegetaFinalFlashCinematic(ctx, canvas)  // fullscreen Overcharged Final Flash overlay (gold beam + impact explosion)
  drawBeerusKiBallCinematic(ctx, canvas)      // fullscreen Ki Ball overlay (charging orb → impact explosion)
}

// ── FREE-FOR-ALL rendering (parallel to drawBattle; array-driven) ─────────────
const FFA_BAR_COLORS = ["#38bdf8", "#f87171", "#4ade80", "#facc15"]   // per-slot bar colour
function drawFFAScene() {
  const stage = getStageTheme()
  const hasTransform = typeof camera.applyTransform === "function"
  ctx.save()
  if (hasTransform) camera.applyTransform(ctx, canvas)
  drawBattleBackground(ctx, canvas, stage, groundY, getStageFloorHeight())
  if (hasTransform && typeof camera.clearTransform === "function") camera.clearTransform(ctx)
  if (hasTransform) camera.applyTransform(ctx, canvas)
  drawProjectiles(ctx, activeProjectiles, camera)
  for (const f of ffaState.fighters) if (f && !f.eliminated) renderHybridFighter(f)
  drawHitSparksEnhanced()
  if (hasTransform && typeof camera.clearTransform === "function") camera.clearTransform(ctx)
  ctx.restore()
}

function drawFFAHud() {
  const cw = canvas.width
  // Per-fighter health bars across the top, one column per slot.
  const n = ffaState.fighters.length
  const gap = 12, totalW = Math.min(cw - 80, n * 240), barW = (totalW - (n - 1) * gap) / n
  const x0 = cw / 2 - totalW / 2, y = 20, h = 20
  ffaState.fighters.forEach((f, i) => {
    if (!f) return
    const x = x0 + i * (barW + gap)
    const frac = Math.max(0, (f.health || 0) / (f.maxHealth || 1))
    // TEAM MODE: bar colour = team colour (visual team indicator); FFA: per-slot colour.
    const col = ffaState.teamMode ? (TEAM_COLORS[f.team] || "#94a3b8") : FFA_BAR_COLORS[i]
    ctx.save()
    ctx.fillStyle = "rgba(8,12,26,0.85)"; ctx.fillRect(x - 2, y - 2, barW + 4, h + 4)
    if (ffaState.teamMode) { ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.strokeRect(x - 2, y - 2, barW + 4, h + 4) }
    ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fillRect(x, y, barW, h)
    ctx.fillStyle = f.eliminated ? "#4b5563" : col
    ctx.fillRect(x, y, barW * frac, h)
    ctx.fillStyle = f.eliminated ? "#9ca3af" : "#f1f5f9"
    ctx.font = "700 12px Arial"; ctx.textAlign = "left"; ctx.textBaseline = "middle"
    const tag = ffaState.teamMode ? `[${f.team}] ` : ""
    ctx.fillText(`${tag}P${i + 1} ${f.name || f.rosterKey}${f.eliminated ? " ✖" : ""}`, x + 2, y + h + 10)
    ctx.restore()
  })
  // Mode badge + living count (per-team survivor tally in team mode).
  ctx.save()
  ctx.textAlign = "center"; ctx.textBaseline = "middle"
  ctx.font = "800 18px Arial"
  if (ffaState.teamMode) {
    const alive = ffaAliveFighters()
    const counts = FFA_TEAMS.map(t => `${t}:${alive.filter(f => f.team === t).length}`).join("   ")
    ctx.fillStyle = "#f472b6"
    ctx.fillText(`TEAM BATTLE   ${counts}`, cw / 2, y + 58)
  } else {
    ctx.fillStyle = "#f472b6"
    ctx.fillText(`FREE-FOR-ALL · ${ffaAliveFighters().length} LEFT`, cw / 2, y + 58)
  }
  ctx.restore()
}

function drawFFAResult() {
  if (!ffaState.over) return
  const cw = canvas.width, ch = canvas.height
  ctx.save()
  ctx.fillStyle = "rgba(6,8,20,0.82)"; ctx.fillRect(0, 0, cw, ch)
  ctx.textAlign = "center"; ctx.textBaseline = "middle"
  const w = ffaState.winner
  const slot = w ? (w.ffaSlot ?? 0) + 1 : 0
  const teamWin = ffaState.teamMode && ffaState.winnerTeam
  ctx.font = "900 56px Arial"
  ctx.shadowBlur = 28
  ctx.shadowColor = teamWin ? (TEAM_COLORS[ffaState.winnerTeam] || "#888") : (w ? FFA_BAR_COLORS[slot - 1] : "#888")
  ctx.fillStyle = "#fde047"
  ctx.fillText(teamWin ? `TEAM ${ffaState.winnerTeam} WINS` : (w ? `PLAYER ${slot} WINS` : "DRAW"), cw / 2, ch * 0.34)
  ctx.shadowBlur = 0
  if (teamWin) {
    const members = ffaState.fighters.filter(f => f && f.team === ffaState.winnerTeam).map(f => f.name || f.rosterKey).join(" + ")
    ctx.font = "700 24px Arial"; ctx.fillStyle = "#e2e8f0"; ctx.fillText(members, cw / 2, ch * 0.34 + 52)
  } else if (w) { ctx.font = "700 26px Arial"; ctx.fillStyle = "#e2e8f0"; ctx.fillText(w.name || w.rosterKey, cw / 2, ch * 0.34 + 52) }
  ctx.font = "600 16px Arial"; ctx.fillStyle = "rgba(200,210,230,0.6)"
  ctx.fillText("Click to return to the menu", cw / 2, ch * 0.6)
  ctx.restore()
}

function drawFFABattle() {
  drawFFAScene()
  drawFFAHud()
  if (countdown > 0) drawRoundCountdown?.(ctx, canvas, countdown, 1)
  _drawDamageNumbers()
  _drawKOFlash()
  drawFFAResult()
}

function ffaSelectableRoster() { return characterList.filter(c => !c.hidden) }

// "BINDING VOW ACTIVATED" overlay — a brief white flash + chained vow name.
function _drawVowCue() {
  if (vowCue.timer <= 0) return
  const t = vowCue.timer, cw = canvas.width, ch = canvas.height
  ctx.save()
  if (t > 138) { ctx.globalAlpha = ((t - 138) / 12) * 0.55; ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, cw, ch) }
  ctx.globalAlpha = Math.min(1, t / 28)
  ctx.textAlign = "center"
  ctx.shadowColor = "#a21caf"; ctx.shadowBlur = 20
  ctx.fillStyle = "#f0abfc"; ctx.font = "bold 46px sans-serif"
  ctx.fillText("⛓  BINDING VOW  ⛓", cw / 2, ch * 0.30)
  ctx.shadowBlur = 8; ctx.fillStyle = "#ffffff"; ctx.font = "bold 28px sans-serif"
  ctx.fillText(vowCue.sub, cw / 2, ch * 0.30 + 42)
  ctx.restore()
}

// ------------------------------------------------------------------
// MENU RENDERING
// ------------------------------------------------------------------
const p1SettingRect   = { x: window.innerWidth / 2 - 200, y: 150, w: 400, h: 44 }
const p2SettingRect   = { x: window.innerWidth / 2 - 200, y: 202, w: 400, h: 44 }
const backSettingRect = { x: window.innerWidth / 2 - 100, y: 686, w: 200, h: 44 }
// Two independent audio mute toggles on the Settings screen (side-by-side row).
// Session-only, like the input/keybind settings ("in-memory only" per the on-screen note).
const audioSettings   = { sfxMuted: false, musicMuted: false }
const sfxToggleRect   = { x: window.innerWidth / 2 - 200, y: 302, w: 196, h: 30 }
const musicToggleRect = { x: window.innerWidth / 2 + 4,   y: 302, w: 196, h: 30 }
// Keep the settings rects centered on the CURRENT canvas + the BACK button always
// on-screen (bottom-anchored) so nothing clips at smaller window sizes. Called by
// both the render and the click handler so they stay in sync.
function _layoutSettings() {
  const cx = canvas.width / 2
  p1SettingRect.x   = cx - 200
  p2SettingRect.x   = cx - 200
  sfxToggleRect.x   = cx - 200
  musicToggleRect.x = cx + 4
  backSettingRect.x = cx - 100
  backSettingRect.y = Math.min(686, canvas.height - 56)
}

function drawSettingsScreen() {
  _layoutSettings()
  ctx.fillStyle = "#0a1322"; ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.textAlign = "center"
  ctx.fillStyle = "#FFF"; ctx.font = "36px Arial"
  ctx.fillText("INPUT SETTINGS", canvas.width / 2, 120)

  // ── Per-player device (Task 4) + Two Keyboards placeholder (Task 3) ──
  ctx.fillStyle = "#333"
  ctx.fillRect(p1SettingRect.x, p1SettingRect.y, p1SettingRect.w, p1SettingRect.h)
  ctx.fillRect(p2SettingRect.x, p2SettingRect.y, p2SettingRect.w, p2SettingRect.h)
  ctx.fillStyle = "#FFF"; ctx.font = "22px Arial"
  ctx.fillText(`P1 Device: ${inputSettings.p1Type.toUpperCase()}  (click to change)`, canvas.width / 2, p1SettingRect.y + 38)
  ctx.fillText(`P2 Device: ${inputSettings.p2Type.toUpperCase()}  (click to change)`, canvas.width / 2, p2SettingRect.y + 38)
  // Two Keyboards — DISABLED placeholder.
  const tk = { x: canvas.width / 2 - 200, y: 254, w: 400, h: 44 }
  ctx.fillStyle = "#1c1c1c"; ctx.fillRect(tk.x, tk.y, tk.w, tk.h)
  ctx.strokeStyle = "#555"; ctx.strokeRect(tk.x, tk.y, tk.w, tk.h)
  ctx.fillStyle = "#666"; ctx.font = "18px Arial"
  ctx.fillText("Two Keyboards — coming soon", canvas.width / 2, tk.y + 20)
  ctx.font = "12px Arial"
  ctx.fillText("(browsers can't yet distinguish two keyboards)", canvas.width / 2, tk.y + 37)

  // ── Audio: two INDEPENDENT mute toggles (SFX / Music) ──
  const drawAudioToggle = (r, label, muted) => {
    ctx.fillStyle   = muted ? "#4a1717" : "#173a24"      // red = muted, green = on
    ctx.fillRect(r.x, r.y, r.w, r.h)
    ctx.strokeStyle = muted ? "#f87171" : "#4ade80"; ctx.lineWidth = 2
    ctx.strokeRect(r.x, r.y, r.w, r.h)
    ctx.fillStyle = "#FFF"; ctx.font = "15px Arial"
    ctx.fillText(`${label}: ${muted ? "MUTED" : "ON"}`, r.x + r.w / 2, r.y + 20)
  }
  drawAudioToggle(sfxToggleRect,   "Sound Effects", audioSettings.sfxMuted)
  drawAudioToggle(musicToggleRect, "Music",         audioSettings.musicMuted)

  // ── Keybind grid (Task 2) ──
  ctx.fillStyle = "#9cf"; ctx.font = "16px Arial"
  ctx.fillText("P1 KEYBOARD BINDINGS — click an action, then press a key (W A S D U I O P J K L)", canvas.width / 2, KEYBIND_Y0 - 16)
  for (const r of getKeybindRects()) {
    const awaiting = rebindAction === r.action
    ctx.fillStyle = awaiting ? "#3a5" : "#2a2a2a"
    ctx.fillRect(r.x, r.y, r.w, r.h)
    ctx.fillStyle = "#FFF"; ctx.font = "15px Arial"
    const keyLabel = awaiting ? "press a key…" : `[ ${(P1_CONTROLS[r.action] || "—").toUpperCase()} ]`
    ctx.fillText(`${r.label}: ${keyLabel}`, r.x + r.w / 2, r.y + 21)
  }
  const rb = resetBindRect()
  ctx.fillStyle = "#444"; ctx.fillRect(rb.x, rb.y, rb.w, rb.h)
  ctx.fillStyle = "#FFF"; ctx.font = "18px Arial"
  ctx.fillText("Reset to Defaults", canvas.width / 2, rb.y + 26)

  // Warning + in-memory note.
  if (rebindWarning) { ctx.fillStyle = "#fbbf24"; ctx.font = "15px Arial"; ctx.fillText(rebindWarning, canvas.width / 2, rb.y + 58) }
  ctx.fillStyle = "#888"; ctx.font = "13px Arial"
  ctx.fillText("Changes are in-memory only — not saved (sandbox blocks storage).", canvas.width / 2, rb.y + 80)

  // ── Menu music playlist (reorder) — left margin ──
  ctx.textAlign = "left"
  ctx.fillStyle = "#9cf"; ctx.font = "16px Arial"
  ctx.fillText("MENU MUSIC — playlist order (▲/▼)", PLAYLIST_X0, PLAYLIST_Y0 - 16)
  for (const r of getPlaylistRects()) {
    ctx.fillStyle = "#1e2836"
    ctx.fillRect(r.rowRect.x, r.rowRect.y, r.rowRect.w, r.rowRect.h)
    ctx.strokeStyle = "rgba(120,170,255,0.25)"; ctx.lineWidth = 1
    ctx.strokeRect(r.rowRect.x, r.rowRect.y, r.rowRect.w, r.rowRect.h)
    // track number + clean name (clipped to the label area)
    ctx.fillStyle = "#e6edf7"; ctx.font = "13px Arial"
    ctx.save()
    ctx.beginPath(); ctx.rect(r.rowRect.x + 8, r.rowRect.y, r.rowRect.w - PLAYLIST_BTN * 2 - 20, r.rowRect.h); ctx.clip()
    ctx.fillText(`${r.index + 1}. ${menuTrackDisplayName(r.file)}`, r.rowRect.x + 8, r.rowRect.y + 18)
    ctx.restore()
    // ▲ up (disabled on first row) / ▼ down (disabled on last row)
    const drawArrow = (br, glyph, enabled) => {
      ctx.fillStyle = enabled ? "#2f4460" : "#242a33"
      ctx.fillRect(br.x, br.y, br.w, br.h)
      ctx.fillStyle = enabled ? "#cfe0ff" : "#55606e"; ctx.font = "15px Arial"; ctx.textAlign = "center"
      ctx.fillText(glyph, br.x + br.w / 2, br.y + br.h / 2 + 5)
      ctx.textAlign = "left"
    }
    drawArrow(r.upRect,   "▲", r.index > 0)
    drawArrow(r.downRect, "▼", r.index < MENU_PLAYLIST.length - 1)
  }
  ctx.textAlign = "center"

  // Back.
  ctx.fillStyle = "#A00"; ctx.fillRect(backSettingRect.x, backSettingRect.y, backSettingRect.w, backSettingRect.h)
  ctx.fillStyle = "#FFF"; ctx.font = "22px Arial"
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
    case GAME_STATES.SETTINGS:        drawSettingsScreen(); break
    case GAME_STATES.MAIN_MENU:
      drawMainMenuScreen(ctx, canvas, hoverMainMenuIndex, getCurrentAccount())
      _drawProgressionBadge()
      _drawDevCodeOverlay()
      break
    case GAME_STATES.ONLINE_PLACEHOLDER: _drawOnlinePlaceholder(); break
    case GAME_STATES.TUTORIAL:
      // Source key labels from the SAME map the engine wires to fighters
      // (P1_CONTROLS) so the tutorial always matches real in-play bindings.
      drawTutorialScreen(ctx, canvas, { page: tutorialPage, controls: P1_CONTROLS, mouse }); break
    case GAME_STATES.ACCOUNT:
      drawAccountScreen(ctx, canvas, {
        account: getCurrentAccount(), draftName: accountDraftName,
        message: accountMessage, accounts: listAccounts(), mouse,
        caretOn: Math.floor(globalFrameCount / 30) % 2 === 0
      }); break
    case GAME_STATES.MOVE_LIST: {
      const fighters = getMoveListFighters()
      const sel      = fighters[moveListIndex]
      const kit      = sel ? getKit(sel.key, characters[sel.key]) : null
      drawMoveListScreen(ctx, canvas, {
        fighters, selectedIndex: moveListIndex, kit,
        showControls: moveListShowControls, controlRef: CONTROL_REFERENCE
      })
      break
    }
    case GAME_STATES.GAMEPLAY_SELECT: drawGameplaySelectScreen(ctx, canvas, hoverGameplayIndex); break
    case GAME_STATES.TOWER_SELECT:    drawTowerSelectScreen(ctx, canvas, hoverTowerIndex); break
    case GAME_STATES.FFA_SETUP:       drawFFASetupScreen(ctx, canvas, hoverFFAIndex, FFA_MAX_PLAYERS, getConnectedPadCount?.() || 0); break
    case GAME_STATES.FFA_CHARSELECT:  drawFFACharSelectScreen(ctx, canvas, ffaState.pickSlot, ffaState.playerCount, ffaSelectableRoster(), hoverFFACharIndex, ffaState.charKeys); break
    case GAME_STATES.FFA_SLOTSELECT:  drawFFASlotSelectScreen(ctx, canvas, ffaState.playerCount, ffaState.aiSlots, ffaState.charKeys, ffaDeviceCount(), hoverFFASlotIndex); break
    case GAME_STATES.FFA_TEAMSELECT:  drawFFATeamSelectScreen(ctx, canvas, ffaState.playerCount, ffaState.teams, ffaState.charKeys, hoverFFATeamIndex, TEAM_COLORS); break
    case GAME_STATES.FFA_BATTLE:      drawFFABattle(); break
    case GAME_STATES.AI_DIFFICULTY:   drawAIDifficultyScreen(ctx, canvas, hoverDifficultyIndex); break
    case GAME_STATES.SELECT_UNIVERSE:
      drawUniverseSelectScreen(ctx, canvas, getUniverseList(), hoverUniverseIndex); break
    case GAME_STATES.SELECT_CHARACTER:
      drawCharacterSelectScreen(ctx, canvas, {
        roster:        getCharacterRosterForSelectedUniverse(),
        selectedIndex: hoverCharacterIndex,
        p1Selected:    matchConfig.p1CharKey,
        p2Selected:    matchConfig.p2CharKey,
        currentPlayer: matchConfig.selectingSide === "p1" ? 1 : 2,
        title: matchConfig.mode === "training"
          ? "TRAINING CHARACTER SELECT"
          : matchConfig.mode === "pvp"
            ? `SELECT CHARACTER — PLAYER ${matchConfig.selectingSide === "p1" ? 1 : 2}`
            : "CHARACTER SELECT"
      }); break
    case GAME_STATES.SELECT_ALIENS:
      drawAlienSelectScreen(ctx, canvas, {
        aliens: getAlienPoolList(),
        draft:  matchConfig.alienDraft,
        player: matchConfig.alienSelectSide === "p1" ? 1 : 2
      }); break
    case GAME_STATES.SELECT_SKIN: drawSkinSelectScreen(); break
    case GAME_STATES.SELECT_STAGE: drawStageSelectScreen(ctx, canvas, stages, hoverStageIndex); break
    case GAME_STATES.INTRO:
      drawBattleScene()
      if (namecallActive) {
        drawNamecallBanner()   // announcing a fighter (camera zoomed on them)
      } else {
        drawMatchIntro?.(ctx, canvas, {
          p1Name: matchConfig.p1Char?.name || "Player 1",
          p2Name: matchConfig.p2Char?.name || (isPvP() ? "Player 2" : "CPU"),
          timer: matchIntroTimer, maxTimer: 90
        })
      }
      break
    case GAME_STATES.BATTLE:      drawBattle(); break
    case GAME_STATES.ROUND_BREAK:
      drawBattleScene(); drawBattleHud()
      drawRoundBreak(ctx, canvas, winnerText || "ROUND BREAK")
      _drawKOFlash(); break
    case GAME_STATES.MATCH_END:
      drawBattleScene(); drawBattleHud()
      drawMatchEnd(ctx, canvas, winnerText || "MATCH OVER")
      _drawKOFlash(); break
    case GAME_STATES.VICTORY:
      drawBattleScene()
      drawVictoryScreen?.(ctx, canvas, victoryState); break
    case GAME_STATES.PAUSED:
      drawBattleScene(); drawBattleHud()
      drawPauseMenu(ctx, canvas, pauseMenuIndex)
      _drawKOFlash(); break
  }
}

// ------------------------------------------------------------------
// MENU CLICK HANDLERS
// ------------------------------------------------------------------
function getUniverseList() {
  let keys = universeKeys
  // Beta code (GojoV1): only universes that contain a sprite-having character are
  // selectable (derived live from hasSprites). Dev code (full unlock) sees every universe.
  if (isBetaUnlocked() && !isDevUnlocked()) { const su = spriteUniverseSet(); keys = keys.filter(k => su.has(k)) }
  return keys.map(k => ({ name: formatUniverseName(k), id: k }))
}

// Flat list of every Omnitrix alien for the Ben 10 loadout screen.
let _alienPoolListCache = null
function getAlienPoolList() {
  if (!_alienPoolListCache) {
    _alienPoolListCache = Object.entries(BEN10_ALIEN_POOL).map(([key, a]) => ({
      key, name: a.name, color: a.color
    }))
  }
  return _alienPoolListCache
}

// Roster + control data for the loading-screen info panel.
let _startInfoCache = null
function getStartInfoData() {
  if (!_startInfoCache) {
    const fighters = Object.keys(characters).map(k => {
      const c = characters[k]
      const specials = c?.specials ? Object.keys(c.specials) : []
      return {
        name:     c?.name || k,
        universe: c?.universe ? formatUniverseName(c.universe) : "",
        type:     c?.traits?.archetype || c?.traits?.scaling || c?.passive?.name || "Fighter",
        hp:       Math.round(c?.stats?.maxHealth || c?.maxHealth || c?.health || 1000),
        speed:    Math.round(c?.stats?.speed || c?.speed || 7),
        hint:     c?.ultimate?.name || specials[0] || ""
      }
    })
    _startInfoCache = { fighters, p1Controls: P1_CONTROLS }
  }
  return _startInfoCache
}

function getCharacterRosterForSelectedUniverse() {
  return getUniverseCharacters().map(k => {
    const c = characters[k]
    return { id: k, name: c?.name || k, universe: c?.universe ? formatUniverseName(c.universe) : "" }
  })
}

function updateHoverIndices() {
  if (hoverThrottle > 0) { hoverThrottle--; }

  const tryHover = (rects, current, setter) => {
    const found = rects.findIndex(r => pointInRect(mouse.x, mouse.y, r))
    if (found >= 0 && found !== current) {
      setter(found)
      if (hoverThrottle <= 0) { sound.play?.(SFX.UI_HOVER); hoverThrottle = 6 }
    }
  }

  if (gameState === GAME_STATES.START)            { const r = getStartMenuRects(canvas);                    const f = r.findIndex(x => pointInRect(mouse.x,mouse.y,x)); hoverStartIndex = Math.max(0,f); return }
  if (gameState === GAME_STATES.MAIN_MENU)        { tryHover(getMainMenuRects(canvas),        hoverMainMenuIndex,   v => hoverMainMenuIndex   = v); return }
  if (gameState === GAME_STATES.GAMEPLAY_SELECT)  { tryHover(getGameplaySelectRects(canvas),  hoverGameplayIndex,   v => hoverGameplayIndex   = v); return }
  if (gameState === GAME_STATES.TOWER_SELECT)     { tryHover(getTowerSelectRects(canvas),      hoverTowerIndex,      v => hoverTowerIndex      = v); return }
  if (gameState === GAME_STATES.FFA_SETUP)        { tryHover(getFFASetupRects(canvas, FFA_MAX_PLAYERS), hoverFFAIndex, v => hoverFFAIndex = v); return }
  if (gameState === GAME_STATES.FFA_CHARSELECT)   { tryHover(getCharacterCardRects(canvas, ffaSelectableRoster()), hoverFFACharIndex, v => hoverFFACharIndex = v); return }
  if (gameState === GAME_STATES.FFA_SLOTSELECT)   { tryHover(getFFASlotSelectRects(canvas, ffaState.playerCount), hoverFFASlotIndex, v => hoverFFASlotIndex = v); return }
  if (gameState === GAME_STATES.FFA_TEAMSELECT)   { tryHover(getFFATeamSelectRects(canvas, ffaState.playerCount), hoverFFATeamIndex, v => hoverFFATeamIndex = v); return }
  if (gameState === GAME_STATES.AI_DIFFICULTY)    { tryHover(getAIDifficultyRects(canvas),    hoverDifficultyIndex, v => hoverDifficultyIndex = v); return }
  if (gameState === GAME_STATES.SELECT_UNIVERSE)  { tryHover(getUniverseCardRects(canvas, getUniverseList()), hoverUniverseIndex,  v => hoverUniverseIndex  = v); return }
  if (gameState === GAME_STATES.SELECT_CHARACTER) { tryHover(getCharacterCardRects(canvas, getCharacterRosterForSelectedUniverse()), hoverCharacterIndex, v => hoverCharacterIndex = v); return }
  if (gameState === GAME_STATES.SELECT_STAGE)     { tryHover(getStageCardRects(canvas, stages), hoverStageIndex, v => hoverStageIndex = v) }
}

function handleMenuClicks() {
  if (!mouse.clicked) return
  sound.play?.(SFX.UI_SELECT)

  switch (gameState) {
    case GAME_STATES.START: {
      if (pointInRect(mouse.x, mouse.y, settingsButtonRect)) { gameState = GAME_STATES.SETTINGS; break }
      const clicked = getStartMenuRects(canvas).find(r => pointInRect(mouse.x, mouse.y, r))
      if (clicked?.id === "play") gameState = GAME_STATES.MAIN_MENU
      break
    }
    case GAME_STATES.MAIN_MENU: {
      const c = getMainMenuRects(canvas).find(r => pointInRect(mouse.x, mouse.y, r))
      if (!c) break
      if (c.locked) break          // locked items (e.g. ONLINE pre-dev-unlock) — not selectable
      if      (c.id === "devcode")  { devCodeEntry = true; devCodeBuffer = ""; devCodeMessage = "" }
      else if (c.id === "online")   gameState = GAME_STATES.ONLINE_PLACEHOLDER   // only reachable when dev-unlocked (unlocked above)
      else if (c.id === "play")     gameState = GAME_STATES.GAMEPLAY_SELECT
      else if (c.id === "moveList") { moveListIndex = 0; moveListShowControls = false; gameState = GAME_STATES.MOVE_LIST }
      else if (c.id === "tutorial") { tutorialPage = 0; gameState = GAME_STATES.TUTORIAL }
      else if (c.id === "account")  { accountMessage = ""; accountDraftName = getCurrentAccount()?.username || ""; gameState = GAME_STATES.ACCOUNT }
      else if (c.id === "savefile") { /* handled by the dedicated mouseup listener (needs a real user gesture for the file picker) */ }
      else if (c.id === "settings") gameState = GAME_STATES.SETTINGS
      else if (c.id === "back")     gameState = GAME_STATES.START
      break
    }
    case GAME_STATES.ONLINE_PLACEHOLDER:
      gameState = GAME_STATES.MAIN_MENU   // any click (the BACK button) returns to the menu
      break
    case GAME_STATES.TUTORIAL: {
      const b = getTutorialButtons(canvas).find(r => pointInRect(mouse.x, mouse.y, r))
      if (b?.id === "menu") gameState = GAME_STATES.MAIN_MENU
      else if (b?.id === "next") tutorialPage = Math.min(getTutorialPageCount(P1_CONTROLS) - 1, tutorialPage + 1)
      else if (b?.id === "prev") tutorialPage = Math.max(0, tutorialPage - 1)
      break
    }
    case GAME_STATES.ACCOUNT: {
      const b = getAccountButtons(canvas).find(r => pointInRect(mouse.x, mouse.y, r))
      if (b?.id === "menu") gameState = GAME_STATES.MAIN_MENU
      else if (b?.id === "generate") tryCreateAccount()
      else if (b?.id === "new")      { accountDraftName = ""; accountMessage = "Type a new username, then Generate." }
      break
    }
    case GAME_STATES.MOVE_LIST: {
      const fighters = getMoveListFighters()
      const idx = getMoveListCardRects(canvas, fighters.length).findIndex(r => pointInRect(mouse.x, mouse.y, r))
      if (idx >= 0) { moveListIndex = idx; break }
      const btn = getMoveListButtons(canvas).find(r => pointInRect(mouse.x, mouse.y, r))
      if (btn?.id === "back")     gameState = GAME_STATES.MAIN_MENU
      if (btn?.id === "controls") moveListShowControls = !moveListShowControls
      break
    }
    case GAME_STATES.SETTINGS: {
      _layoutSettings()   // keep rects in sync with the render before hit-testing
      // Per-player device select (Task 4): cycle keyboard ↔ controller. "Two
      // Keyboards" is intentionally NOT reachable (disabled placeholder, Task 3).
      if (pointInRect(mouse.x, mouse.y, p1SettingRect)) inputSettings.p1Type = inputSettings.p1Type === "keyboard" ? "controller" : "keyboard"
      if (pointInRect(mouse.x, mouse.y, p2SettingRect)) inputSettings.p2Type = inputSettings.p2Type === "keyboard" ? "controller" : "keyboard"
      // Audio toggles — each independently mutes its own category (SFX / Music).
      if (pointInRect(mouse.x, mouse.y, sfxToggleRect)) {
        audioSettings.sfxMuted = !audioSettings.sfxMuted
        sound.setSfxMuted?.(audioSettings.sfxMuted)
        persistCurrentSettings()   // settings changed → rewrite full save snapshot
      }
      if (pointInRect(mouse.x, mouse.y, musicToggleRect)) {
        audioSettings.musicMuted = !audioSettings.musicMuted
        sound.setMusicMuted?.(audioSettings.musicMuted)
        persistCurrentSettings()
      }
      // Keybind rows (Task 2): click an action → await a key.
      const kb = getKeybindRects().find(r => pointInRect(mouse.x, mouse.y, r))
      if (kb) { rebindAction = kb.action; rebindWarning = "" }
      if (pointInRect(mouse.x, mouse.y, resetBindRect())) {
        Object.assign(P1_CONTROLS, DEFAULT_P1_CONTROLS); rebindAction = null; rebindWarning = "Defaults restored."
      }
      // Menu-music playlist reorder: ▲ moves a track up, ▼ moves it down. sound.moveMenuTrack
      // mutates MENU_PLAYLIST in place (live sequence) and keeps the now-playing cursor pinned.
      for (const r of getPlaylistRects()) {
        if (pointInRect(mouse.x, mouse.y, r.upRect))   { sound.moveMenuTrack?.(r.index, -1); persistCurrentSettings(); break }
        if (pointInRect(mouse.x, mouse.y, r.downRect)) { sound.moveMenuTrack?.(r.index, +1); persistCurrentSettings(); break }
      }
      if (pointInRect(mouse.x, mouse.y, backSettingRect)) { rebindAction = null; gameState = GAME_STATES.START }
      break
    }
    case GAME_STATES.GAMEPLAY_SELECT: {
      const c = getGameplaySelectRects(canvas).find(r => pointInRect(mouse.x, mouse.y, r))
      if (!c) break
      if (c.id === "training") chooseMode("training")
      else if (c.id === "vs")  chooseMode("vs")
      else if (c.id === "pvp") chooseMode("pvp")
      else if (c.id === "tower") gameState = GAME_STATES.TOWER_SELECT   // pick a tier first
      else if (c.id === "ffa")  { hoverFFAIndex = 0; gameState = GAME_STATES.FFA_SETUP }   // free-for-all
      else if (c.id === "back")gameState = GAME_STATES.MAIN_MENU
      break
    }
    case GAME_STATES.FFA_SETUP: {
      // Player count is no longer device-capped — AI fills any slot without a human device.
      const c = getFFASetupRects(canvas, FFA_MAX_PLAYERS).find(r => pointInRect(mouse.x, mouse.y, r))
      if (!c || c.locked) break
      if (c.id === "back") { gameState = GAME_STATES.GAMEPLAY_SELECT; break }
      ffaState.playerCount = c.count
      ffaState.charKeys = []
      ffaState.pickSlot = 0
      hoverFFACharIndex = 0
      gameState = GAME_STATES.FFA_CHARSELECT
      break
    }
    case GAME_STATES.FFA_CHARSELECT: {
      const roster = ffaSelectableRoster()
      const idx = getCharacterCardRects(canvas, roster).findIndex(r => pointInRect(mouse.x, mouse.y, r))
      if (idx < 0 || !roster[idx]) break
      ffaState.charKeys[ffaState.pickSlot] = roster[idx].rosterKey || roster[idx].key
      ffaState.pickSlot++
      if (ffaState.pickSlot >= ffaState.playerCount) {
        // Assign who drives each slot next: default humans to the device-backed slots and AI to
        // the rest (fewer humans than slots is fine — CPUs fill in).
        ffaState.aiSlots = ffaDefaultAISlots(ffaState.playerCount)
        hoverFFASlotIndex = 0
        gameState = GAME_STATES.FFA_SLOTSELECT
      }
      break
    }
    case GAME_STATES.FFA_SLOTSELECT: {
      const c = getFFASlotSelectRects(canvas, ffaState.playerCount).find(r => pointInRect(mouse.x, mouse.y, r))
      if (!c) break
      if (c.slot != null) { ffaCycleSlotAssignment(c.slot); break }   // cycle Human ↔ CPU tiers
      if (c.id === "back") { ffaState.pickSlot = 0; ffaState.charKeys = []; gameState = GAME_STATES.FFA_CHARSELECT; break }
      if (c.id === "continue") {
        // Default team split: alternate A/B (e.g. 3p → A,B,A = 2v1). Player retunes it next.
        ffaState.teams = Array.from({ length: ffaState.playerCount }, (_, i) => FFA_TEAMS[i % 2])
        hoverFFATeamIndex = 0
        gameState = GAME_STATES.FFA_TEAMSELECT
      }
      break
    }
    case GAME_STATES.FFA_TEAMSELECT: {
      const c = getFFATeamSelectRects(canvas, ffaState.playerCount).find(r => pointInRect(mouse.x, mouse.y, r))
      if (!c) break
      if (c.slot != null) { ffaState.teams[c.slot] = (ffaState.teams[c.slot] === "A") ? "B" : "A"; break }   // toggle
      if (c.id === "start")   { startFFAMatch(); break }                           // team mode (if ≥2 teams)
      if (c.id === "noteams") { ffaState.teams = []; startFFAMatch(); break }       // pure FFA
      if (c.id === "back")    { hoverFFASlotIndex = 0; gameState = GAME_STATES.FFA_SLOTSELECT; break }
      break
    }
    case GAME_STATES.FFA_BATTLE: {
      if (ffaState.over) endFFA()   // click the result overlay → back to menu
      break
    }
    case GAME_STATES.TOWER_SELECT: {
      const c = getTowerSelectRects(canvas).find(r => pointInRect(mouse.x, mouse.y, r))
      if (!c) break
      if (c.id === "back") gameState = GAME_STATES.GAMEPLAY_SELECT
      else startTower(c.id)                       // c.id === "tier1".."tier5"
      break
    }
    case GAME_STATES.AI_DIFFICULTY: {
      const c = getAIDifficultyRects(canvas).find(r => pointInRect(mouse.x, mouse.y, r))
      if (!c) break
      if (c.id === "back") gameState = GAME_STATES.GAMEPLAY_SELECT
      else chooseDifficulty(c.id)
      break
    }
    case GAME_STATES.SELECT_UNIVERSE: {
      const universes = getUniverseList()
      const idx = getUniverseCardRects(canvas, universes).findIndex(r => pointInRect(mouse.x, mouse.y, r))
      if (idx >= 0 && universes[idx]) { matchConfig.selectedUniverse = universes[idx].id; gameState = GAME_STATES.SELECT_CHARACTER }
      break
    }
    case GAME_STATES.SELECT_CHARACTER: {
      const roster = getCharacterRosterForSelectedUniverse()
      const idx    = getCharacterCardRects(canvas, roster).findIndex(r => pointInRect(mouse.x, mouse.y, r))
      if (idx < 0 || !roster[idx]) break
      const key = roster[idx].id, char = characters[key]
      const side = matchConfig.selectingSide
      matchConfig[side + "Char"]    = char
      matchConfig[side + "CharKey"] = key
      if (key === "ben10") {
        // Ben 10 → detour to the Omnitrix loadout screen before moving on.
        matchConfig.alienSelectSide = side
        matchConfig.alienDraft = (matchConfig[side + "Aliens"] || []).slice()
        gameState = GAME_STATES.SELECT_ALIENS
      } else {
        proceedAfterCharacter(side)
      }
      break
    }
    case GAME_STATES.SELECT_ALIENS: {
      const side  = matchConfig.alienSelectSide
      const draft = matchConfig.alienDraft
      // Card click → toggle an alien in/out of the 5-slot loadout.
      const cardIdx = getAlienSelectCardRects(canvas, getAlienPoolList())
        .findIndex(r => pointInRect(mouse.x, mouse.y, r))
      if (cardIdx >= 0) {
        const aKey = getAlienPoolList()[cardIdx].key
        const at   = draft.indexOf(aKey)
        if (at >= 0)            draft.splice(at, 1)
        else if (draft.length < 5) draft.push(aKey)
        break
      }
      const btn = getAlienSelectButtons(canvas).find(r => pointInRect(mouse.x, mouse.y, r))
      if (btn?.id === "back") { gameState = GAME_STATES.SELECT_CHARACTER }
      else if (btn?.id === "confirm" && draft.length === 5) {
        matchConfig[side + "Aliens"] = draft.slice()
        proceedAfterCharacter(side)
      }
      break
    }
    case GAME_STATES.SELECT_SKIN: {
      const charKey = matchConfig[skinSelectSide + "CharKey"]
      const skins = getSkins(charKey)
      const r = getSkinSelectRects(canvas, skins.length).find(rr => pointInRect(mouse.x, mouse.y, rr))
      if (!r) break
      const skin = skins[r.index]
      if (!isSkinUnlocked(charKey, skin.id)) break          // locked → not selectable
      matchConfig[skinSelectSide + "Skin"] = skin.id        // remember the choice
      _proceedAfterSkin(skinSelectSide)                     // continue the select flow
      break
    }
    case GAME_STATES.SELECT_STAGE: {
      const idx = getStageCardRects(canvas, stages).findIndex(r => pointInRect(mouse.x, mouse.y, r))
      if (idx >= 0 && stages[idx]) { matchConfig.selectedStage = stages[idx]; startMatch() }
      break
    }
    case GAME_STATES.MATCH_END: resetToStart(); break
    case GAME_STATES.VICTORY: {
      const action = handleVictoryClick?.(victoryState, mouse, canvas)
      if (action === "rematch") { if (towerState.active) continueTower(); else _doRematch() }   // Tower: advance floor
      if (action === "menu")    { towerState.active = false; resetToStart() }
      break
    }
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
    case GAME_STATES.INTRO:
      // SEQUENTIAL intro stage machine: P1 plays its full intro, THEN P2's begins. Only the active
      // side advances; the other holds idle. Runs every intro frame (during namecall AND after).
      if (introStage === "p1") {
        if (p1 && p1._introPlaying) { p1._introRevealFrame = (p1._introRevealFrame || 0) + 1; maybeFireIntroVoice(p1); advanceIntroSequence(p1) }
        if (--introStageTimer <= 0) {
          if (p1) p1._introPlaying = false
          if (p2) { p2._introPlaying = true; initIntroVariant(p2); introStage = "p2"; introStageTimer = introTotalFrames(p2) }
          else introStage = "done"
        }
      } else if (introStage === "p2") {
        if (p2 && p2._introPlaying) { p2._introRevealFrame = (p2._introRevealFrame || 0) + 1; maybeFireIntroVoice(p2); advanceIntroSequence(p2) }
        if (--introStageTimer <= 0) { if (p2) p2._introPlaying = false; introStage = "done" }
      }
      if (namecallActive) {
        // Announcement phase: hold each side's zoom, then advance to the next mapped
        // side; when done, ease the camera back to normal framing. The VS-banner /
        // countdown below is held until every announcement resolves.
        if (--namecallTimer <= 0) {
          namecallIndex++
          if (namecallIndex < namecallBeats.length) startNamecallBeat(namecallIndex)
          else { namecallActive = false; if (camera.focusBetween && p1 && p2) camera.focusBetween(p1, p2, 0.85) }
        }
      } else if (introStage === "done") {
        // Both intros have played out sequentially (and namecall, if any, finished) — run the small
        // settle buffer, then start the fight.
        matchIntroTimer--
        if (matchIntroTimer <= 0) {
          gameState = GAME_STATES.BATTLE; countdown = ROUND_START_COUNTDOWN
          if (p1) p1._introPlaying = false   // BUG_9: back to idle once the fight starts
          if (p2) p2._introPlaying = false
        }
      }
      // Smooth the camera every intro frame: zoom IN during announcements, ease BACK
      // to default framing afterward. No-op for the no-clip case (target == current).
      if (typeof camera.advance === "function") camera.advance(canvas)
      break
    case GAME_STATES.BATTLE:
      if (countdown > 0) {
        updateDebugInputToggles(); updateTrainingMode(); updateCPUInput()
        if (countdown === 1) {
          sound.play?.(SFX.UI_MATCH_START)
          // SASUKE battle-start voice — "Let's go." Fires at the GO frame of ROUND 1 only (post-intro,
          // first actionable beat = "start of the match"), once, for whichever side is Sasuke.
          if (roundNumber === 1) {
            for (const f of [p1, p2]) {
              if (f?.rosterKey === "sasuke" && !f._battleStartVoiceDone) {
                f._battleStartVoiceDone = true
                sound.playSfxFile?.("sasuke_battle_start.mp3", null)
              }
              // OMEGA RANGER battle-start voice — "Let's make this quick and easy." Fires at the ROUND-1
              // GO frame (post-intro, first actionable beat), once, for whichever side is Omega — a
              // SEPARATE beat from his intro-reveal line (which fires during the intro sequence, earlier).
              if (f?.rosterKey === "omega_ranger" && !f._battleStartVoiceDone) {
                f._battleStartVoiceDone = true
                sound.playSfxFile?.("omega_battle_start.mp3", null)
              }
            }
            // RICK match-start bark — "Yeah." (HUD/announcer line). Gated to the LOCAL PLAYER being
            // Rick (his voice as your hype-man; see rickVoice.js match-flow note), once at ROUND-1 GO.
            if (p1?.rosterKey === "rick" && !p1._matchStartVoiceDone) {
              p1._matchStartVoiceDone = true
              sound.playSfxFile?.(pickRickVoice("matchStart"), null)
            }
          }
        }
        countdown = Math.max(0, countdown - 1)
        if (typeof camera.update === "function" && p1 && p2) camera.update(p1, p2, canvas)
      } else {
        updateBattle()
      }
      break
    case GAME_STATES.ROUND_BREAK:
      updateDebugInputToggles(); updateTrainingMode()
      roundBreakTimer--
      if (typeof camera.update === "function" && p1 && p2) camera.update(p1, p2, canvas)
      if (roundBreakTimer <= 0) { resetRound(); gameState = GAME_STATES.BATTLE }
      break
    case GAME_STATES.VICTORY:
      updateVictoryState?.(victoryState, mouse, canvas)
      break
    case GAME_STATES.FFA_BATTLE:
      updateFFABattle()
      break
    case GAME_STATES.PAUSED:
      break
  }
}

function triggerSlowdown(frames = 45, target = null) {
  slowdownTimer  = frames
  slowdownTarget = target || null
}

// ── FIXED-TIMESTEP LOOP (60Hz) ────────────────────────────────────────────────
// requestAnimationFrame fires at the DISPLAY refresh rate. This game is frame-COUNT
// driven — physics, timers, cooldowns AND animation frame-advancement (which lives in
// sprite.draw(), i.e. the render pass) all advance exactly once per loop pass. So running
// the pass every rAF made the whole game run FASTER than 60fps on 120/144/165Hz displays
// (the Toji jitter / apparent dual-render / jump-shrink / too-fast-intro regressions — all
// one root cause). Fix: gate the ENTIRE update+render pass to a fixed 60Hz via a real-time
// accumulator, skipping rAF callbacks that arrive too soon. Because sprite advancement is
// coupled to render, gating the whole pass (not just logic) is what keeps ANIMATION speed
// fixed too — and there is at most ONE pass per rAF, so nothing that assumed
// one-frame-per-pass (hitstop/freeze/cinematic timelines, cooldowns, input) changes.
const FIXED_DT = 1000 / 60      // ms per 60Hz logic frame
let _loopAccum = 0
let _loopLast  = null

function gameLoop(now) {
  requestAnimationFrame(gameLoop)
  if (now == null) now = (typeof performance !== "undefined" ? performance.now() : Date.now())
  if (_loopLast == null) _loopLast = now
  let elapsed = now - _loopLast
  _loopLast = now
  if (elapsed < 0) elapsed = 0
  // A long stall (backgrounded tab, breakpoint) must not burst-advance many frames — clamp
  // to a single frame so the game resumes at real speed instead of fast-forwarding.
  if (elapsed > 100) elapsed = FIXED_DT
  _loopAccum += elapsed
  if (_loopAccum < FIXED_DT) return   // too soon for the next 60Hz frame → skip (no update/render)
  _loopAccum -= FIXED_DT
  // Backlog cap: on a display SLOWER than 60Hz, run at the display rate rather than
  // spiralling. No multi-tick catch-up on purpose — sprite advancement is in draw(), so one
  // update+render pass per frame keeps logic and animation in lockstep.
  if (_loopAccum > FIXED_DT) _loopAccum = FIXED_DT

  globalFrameCount++
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  updateCurrentState()
  renderCurrentState()
  endInputFrame()
}

// ------------------------------------------------------------------
// KEYBOARD EVENTS
// ------------------------------------------------------------------
window.addEventListener("keydown", e => {
  const key = String(e.key || "").toLowerCase()

  // DEV CODE entry (Task 6): typing on the main menu. Enter submits, Esc cancels.
  if (devCodeEntry) {
    e.preventDefault()
    if (key === "escape") { devCodeEntry = false; devCodeBuffer = "" }
    else if (key === "enter") {
      const mode = applyUnlockCode(devCodeBuffer)
      if (mode === "dev")       { devCodeMessage = "✓ ALL UNLOCKED (session only)"; devCodeEntry = false }
      else if (mode === "beta") { devCodeMessage = "✓ JJK BETA: Jujutsu Kaisen roster + skins only"; devCodeEntry = false }
      else { devCodeMessage = "Invalid code"; devCodeBuffer = "" }
    }
    else if (key === "backspace") devCodeBuffer = devCodeBuffer.slice(0, -1)
    else if (e.key && e.key.length === 1 && devCodeBuffer.length < 24) devCodeBuffer += e.key
    return
  }

  // KEYBIND CAPTURE: on the SETTINGS screen, if an action is awaiting a key, the
  // next keypress (re)binds it. Esc cancels. Restricted to the allowed key set.
  if (gameState === GAME_STATES.SETTINGS && rebindAction) {
    e.preventDefault()
    if (key === "escape") { rebindAction = null; rebindWarning = "" }
    else if (applyRebind(rebindAction, key)) rebindAction = null
    return
  }

  // ACCOUNT screen captures typing before any gameplay key handling.
  if (gameState === GAME_STATES.ACCOUNT) { handleAccountTyping(e); return }

  // TUTORIAL: arrow keys flip pages, Esc exits to the menu.
  if (gameState === GAME_STATES.TUTORIAL) {
    if (key === "arrowright" || key === "d") tutorialPage = Math.min(getTutorialPageCount(P1_CONTROLS) - 1, tutorialPage + 1)
    else if (key === "arrowleft" || key === "a") tutorialPage = Math.max(0, tutorialPage - 1)
    else if (key === "escape") gameState = GAME_STATES.MAIN_MENU
    return
  }

  if (gameState === GAME_STATES.VICTORY) {
    const action = handleVictoryKey?.(victoryState, key)
    if (action === "rematch") { if (towerState.active) continueTower(); else _doRematch() }   // Tower: advance floor
    if (action === "menu")    { towerState.active = false; resetToStart() }
    return
  }
  handlePauseInput(key)

  // DEBUG HOTKEYS — Naruto shadow clones: "," spawns a clone on P1, "." dispels all
  // of P1's clones. Bypasses the D→F / D→B + special motion so clones can be summoned
  // and recalled directly for testing. Battle only; owner = p1, target = the opponent.
  // (spawn/dispel own all chakra-split + lifecycle logic in summons.js — untouched.)
  // Shadow clones are exclusively a Naruto mechanic: gate the debug hotkeys on the
  // CASTER's identity exactly like triggerSpecial's dispatch does. If P1 is anyone
  // else, these keys are inert (same as pressing a special a character doesn't have).
  if (!e.repeat && gameState === GAME_STATES.BATTLE && p1 &&
      (p1.rosterKey || p1.id || "").toLowerCase() === "naruto") {
    if (key === ",") { summonShadowClone(p1, getOpponent(p1), { onFocus: () => camera.focusOnFighter?.(p1, 1.02) }); return }
    if (key === ".") { dispelShadowClones(p1); return }
  }

  // CRITICAL (Task 2): only act on a REAL key PRESS, never OS auto-repeat. While a
  // key is HELD the browser fires repeated keydown events; feeding those into
  // directionHistory / the double-tap detector is what made "hold A" dash AND
  // spuriously trigger a binding vow. Movement itself reads the held key state
  // elsewhere (keys[]/getFighterInput), so skipping repeats here costs nothing.
  if (!e.repeat) {
    if (p1) { recordDirectionInput(p1, key); detectDoubleTapDashTeleport(p1, key); handleToggleInputs(p1, key) }
    if (p2) {
      recordDirectionInput(p2, key)
      if (isPvP() || matchConfig.mode !== "vs") { detectDoubleTapDashTeleport(p2, key); handleToggleInputs(p2, key) }
    }
  }
  if (gameState === GAME_STATES.MATCH_END && key === "enter") resetToStart()
})

// P-tap toggle is resolved on RELEASE (tap vs hold-to-charge).
window.addEventListener("keyup", e => {
  const key = String(e.key || "").toLowerCase()
  if (p1) handleChargeRelease(p1, key)
  if (p2 && (isPvP() || matchConfig.mode !== "vs")) handleChargeRelease(p2, key)
  // Sasuke Susanoo Stage-2 gate: mark the ultimate button as released so a genuine SECOND
  // press (not a held one) is required to escalate Lv1→Lv2. See executeSasukeUltimate.
  if (p1 && key === (p1.controls?.ultimate || "u")) p1._ultReleasedSinceStage1 = true
  if (p2 && key === (p2.controls?.ultimate || "5")) p2._ultReleasedSinceStage1 = true
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
    endDomainCinematic()   // defensive cleanup on rematch/resume
    if (typeof camera.reset  === "function") camera.reset()
    if (typeof camera.update === "function") camera.update(p1, p2, canvas)
  }
})

// ------------------------------------------------------------------
// BOOT
// ------------------------------------------------------------------
sound.init?.()
sound.playMenuMusic?.()   // boot/loading screen → Passion_fruitmp3.mp3 (queued until first gesture)
syncPhysicsBounds()
updateCameraBounds()
// BOOT AUTO-LOAD (universal persistence): account.js hydrates its store from localStorage at
// import time, so progress restores on EVERY launch with no player action — no File System
// Access gesture needed (Safari/Firefox lack the API; the file handle doesn't survive reload
// anyway). If a current account was restored, push its progression/unlocks/settings into the
// live modules now, before the first frame. A later SAVE FILE connect still overrides this.
if (getCurrentAccount()) hydrateFromLoadedSave()
gameLoop()

// ------------------------------------------------------------------
// TEST HARNESS  (INERT unless the URL contains ?harness=… )
// ------------------------------------------------------------------
// Lets Playwright / automated tests drive a REAL match without clicking through
// the canvas-rendered menus. Everything is gated behind the `harness` query
// param, so normal play is completely unaffected (the IIFE returns immediately).
// Keyboard is still delivered the normal way (page.keyboard.* → document keydown
// in input.js) — the harness never fakes input, it only skips menus and reads
// state, so what it verifies is the same code path a real player exercises.
;(function setupTestHarness() {
  let params
  try { params = new URLSearchParams(window.location.search) } catch { return }
  if (!params.has("harness")) return

  const validKey = (v, fallback) => (v && characters[v] ? v : fallback)
  const p1Key = validKey(params.get("p1"), "sasuke")
  const p2Key = validKey(params.get("p2"), p1Key)

  function startHarnessMatch(opts = {}) {
    resetSelections()
    towerState.active = false   // a plain harness match is never a tower (clear any stale run)
    // Default: training vs a dummy. Pass { mode:"vs", difficulty:"easy" } for a real
    // CPU match (used to test the pause-menu → Training Mode transition).
    matchConfig.mode          = opts.mode || "training"
    matchConfig.aiDifficulty  = opts.difficulty || (matchConfig.mode === "training" ? "dummy" : "easy")
    matchConfig.selectedStage = stages[0]
    matchConfig.p1CharKey = p1Key; matchConfig.p1Char = characters[p1Key]
    matchConfig.p2CharKey = p2Key; matchConfig.p2Char = characters[p2Key]
    matchConfig.p1Skin = "default"; matchConfig.p2Skin = "default"
    startMatch()
  }

  // Collapse INTRO + namecall + countdown so the BATTLE update loop actually runs
  // combat/animation. (updateBattle only ticks once countdown<=0 — see BATTLE case.)
  function skipToBattle() {
    matchIntroTimer = 0
    if (p1) p1._introPlaying = false
    if (p2) p2._introPlaying = false
    gameState = GAME_STATES.BATTLE
    countdown = 0
  }

  const snap = f => f && ({
    key: f.rosterKey, x: f.x, y: f.y, w: f.w, h: f.h, facing: f.facing,
    energy: f.energy, maxEnergy: f.maxEnergy, health: f.health, maxHealth: f.maxHealth,
    vy: f.vy || 0, vx: f.vx || 0, grounded: !!(f.onGround ?? f.grounded), canJump: f.canJump !== false,
    charging:         !!f.isCharging,   // universal charge-lockout state (charging = fully vulnerable)
    susanooStage:     f._susanooStage || 0,
    susanooTimer:     f._susanooTimer || 0,
    itachiSusanoo:    !!f._itachiSusanoo,          // Itachi single-tier Susanoo giant active
    itachiSusanooTimer: f._itachiSusanooTimer || 0,
    lightningPhase:   f._lightningPhase || null,
    rooted:           !!f._rooted,
    attacking:        !!f.attacking,
    blocking:         !!f.isBlocking,
    hitstun:          f.hitstun || 0,
    stun:             f.stun || 0,
    blockstun:        f.blockstun || 0,
    currentMove:      f.currentMove || null,
    introVariant:     f._introVariant || null,
    spriteSheet:      f.spriteHandler?._actionDef?.sheet ?? null,
    spriteFrames:     f.spriteHandler?._actionDef?.frames ?? null,
    spriteScale:      f.spriteScale ?? null,
    spriteReady:      !!(f.spriteHandler?._actionDef?.sheet),
    hasSpriteHandler: !!f.spriteHandler,        // false → procedural box renderer (no hasSprites)
    currentForm:      f.currentForm || null,     // transformation state (Goku SSB etc.)
    mangekyouActive:  !!f._mangekyouActive,       // Itachi Mangekyou Sharingan buff-mode
    mangekyouFlash:   f._mangekyouFlash || 0,     // activation eye-flash overlay timer
    damageMultiplier: f.damageMultiplier ?? 1,    // buff-mode damage scale (Mangekyou/SSJ etc.)
    transformIndex:   f.transformIndex ?? null,
    hasSkinAnim:      !!f._skinAnim,
    canvasHeightFrac: f._canvasHeightFrac || null,
    action:           f._lastSpriteAction || null,
    frameIndex:       f.spriteHandler?.frameIndex ?? null,
    bobClock:         f.spriteHandler?._giantBobClock ?? null,
    lastDrawY:        f._lastDrawY ?? null,
    lastBobUp:        f._lastBobUp ?? null,
    ultCooldown:      f.ultimateCooldown || 0,
    ultReleased:      !!f._ultReleasedSinceStage1,
    arenaHalfLock:    f._arenaHalfLock || null,
    portalDrop:       !!f._portalDrop,
    jumpCount:        f.jumpCount || 0,
    attackCooldown:   f.attackCooldown || 0,
    tauntCharge:      f._tauntCharge || 0,
    tauntPlaying:     !!f._tauntPlaying,
    tauntTimer:       f._tauntTimer || 0,
    tauntHealFlash:   f._tauntHealFlash || 0
  })

  window.__harness = {
    version: 1,
    __sound:     sound,     // the live SoundManager singleton — lets a test spy on SFX file calls
    start:       startHarnessMatch,
    skipToBattle,
    // Last frame the persistent Absolute Defense ribcage/aura SHEET actually rendered — lets a
    // test prove the imagery persists past the one-shot toggle FX (playtester visual-bug fix).
    absDefAuraSheetFrame: () => _absDefAuraSheetFrame,
    // Vegeta intro-aura overlay probe: total renders + last frame drawn (proves the
    // intro_2_effects layer actually composites over the intro2 pose).
    introAura: () => ({ renders: _vegetaIntroAuraRenderCount, frame: _vegetaIntroAuraFrame }),
    // Vegeta command-normal chain probe (drive the rekka precisely from a test): current move +
    // attack phase + pending next stage + whether the current hit connected + the heavy-edge latch.
    vegCmd: () => (p1 ? { action: p1._lastSpriteAction || null, move: p1.currentMove || null, phase: getAttackPhase(p1), rekkaNext: p1._rekkaNext || null, connected: !!p1._cmdHitLanded, prevHeavy: !!p1._cmdPrevHeavy, attacking: !!p1.attacking, cooldown: p1.attackCooldown || 0 } : null),
    // Omega Ranger command-chain probe (mirrors vegCmd) — drive the kick-chain rekka precisely.
    orCmd: () => (p1 ? { action: p1._lastSpriteAction || null, move: p1.currentMove || null, phase: getAttackPhase(p1), rekkaNext: p1._rekkaNext || null, connected: !!p1._cmdHitLanded, attacking: !!p1.attacking, cooldown: p1.attackCooldown || 0 } : null),
    // Charge-vortex introspection (charge_aura.test.mjs): total procedural-spiral renders (bumped only
    // when the skip-logic lets it through → 0 for Goku Black even while he charges his own sprite), and
    // a fighter's real drawn mid-coil x + the frame it last drew (proves the spiral actually rotates).
    chargeAura: (who = "p1") => { const f = who === "p2" ? p2 : p1; return { renders: _chargeAuraRenderCount, sampleX: f?._chargeAuraSampleX ?? null, frame: f?._chargeAuraFrame ?? null, charging: !!f?.isCharging, action: f?._lastSpriteAction || null, spriteSheet: f?.spriteHandler?._actionDef?.sheet ?? null } },
    // ── SAVE/LOAD PERSISTENCE (save_load.test.mjs) ───────────────────────────────
    // Every hook below calls the REAL production functions — the test mocks ONLY the
    // native OS file picker (window.showOpen/SaveFilePicker) to hand back an OPFS-backed
    // FileSystemFileHandle, so the entire account.js pipeline (connectSaveFile →
    // _hydrateFromHandle → persistence.save → _writeSnapshot → graceful corrupt-file
    // fallback) runs unmodified. GUEST progress does NOT persist (no account), so a real
    // account must exist first — ensureAccount creates one.
    saveLoad: {
      ensureAccount: (name = "Tester") => {
        const a = getCurrentAccount() || createAccount(name)
        return a ? { accountId: a.accountId, username: a.username } : null
      },
      // Mirrors the real main-menu "SAVE FILE" mouseup handler: open/create + hydrate.
      connect: async () => { const r = await connectSaveFile(); if (r?.ok) hydrateFromLoadedSave(); return r },
      connected: () => isFileConnected(),
      apiSupported: () => isFileApiSupported(),        // false when the File System Access API is absent (Safari/Firefox sim)
      hasPersisted: () => hasPersistedData(),          // did a durable layer restore any account at boot?
      awardXp: (n) => { awardXp(n); const a = getCurrentAccount(); return a?.progression?.xp ?? null },
      applyCode: (code) => ({ result: applyUnlockCode(code), beta: isBetaUnlocked(), dev: isDevUnlocked() }),
      setSetting: (k, v) => { const s = sound.getSettings?.() || {}; s[k] = v; sound.applySettings?.(s); persistCurrentSettings(); return sound.getSettings?.() ?? null },
      // Live post-hydrate view of everything that should have persisted.
      read: () => {
        const a = getCurrentAccount()
        return {
          accountId: a?.accountId ?? null, username: a?.username ?? null,
          xp: a?.progression?.xp ?? null, level: a?.progression?.level ?? null,
          beta: isBetaUnlocked(), dev: isDevUnlocked(),
          settings: sound.getSettings?.() ?? null
        }
      }
    },
    // ── UNLOCK CODES + menu visibility (beta-redefinition test) ──────────────────
    // Apply a dev/beta code and read back the resulting unlock flags.
    applyCode: (code) => ({ result: applyUnlockCode(code), beta: isBetaUnlocked(), dev: isDevUnlocked() }),
    // Ground-truth sprite roster (hasSprites-derived) + full non-hidden roster — so tests can
    // assert the beta filter equals the live sprite set without hardcoding names.
    rosterSets: () => ({ sprite: spriteRosterKeys(), all: Object.keys(characters).filter(k => !characters[k]?.hidden), spriteUniverses: [...spriteUniverseSet()] }),
    // Is a specific (level-gated) skin currently unlocked? Proves beta grants ALL skins.
    skinUnlocked: (rosterKey, skinId) => isSkinUnlocked(rosterKey, skinId),
    // What the character-select flow WOULD show right now: the visible universes, the
    // selectable character keys per universe (post-filter), the flat selectable set, the
    // unlock flags, and whether ONLINE is locked in the main menu. Non-mutating (restores
    // the previously selected universe). Drives the beta sprite-filter assertions.
    menuRoster: () => {
      const universes = getUniverseList().map(u => u.id)
      const chars = {}
      const prev = matchConfig.selectedUniverse
      for (const u of universes) { matchConfig.selectedUniverse = u; chars[u] = getUniverseCharacters() }
      matchConfig.selectedUniverse = prev
      const online = getMainMenuRects(canvas).find(r => r.id === "online")
      return {
        universes, chars,
        selectable: [].concat(...Object.values(chars)),
        beta: isBetaUnlocked(), dev: isDevUnlocked(),
        onlineLocked: !!online?.locked,
        towerUnlocked: isUnlocked("towerMode"), extraSkinsUnlocked: isUnlocked("extraSkins")
      }
    },
    // One-shot: into a live battle with P1 energy full (ultimate affordable).
    boot: () => { startHarnessMatch(); skipToBattle(); if (p1) p1.energy = p1.maxEnergy },
    // Boot a NON-training vs-CPU match (real AI) — for the pause→Training transition test.
    bootVs: () => { startHarnessMatch({ mode: "vs", difficulty: "easy" }); skipToBattle(); if (p1) p1.energy = p1.maxEnergy },
    // Jump straight to the REAL character-select screen for a universe (drawCharacterSelectScreen
    // renders the actual roster with each character's real `portrait`). Mirrors the live universe→
    // character transition at game.js:3844. Test-only — proves portrait art shows, not a box.
    showCharSelect: (universe = "dragon_ball", mode = "training") => { matchConfig.mode = mode; resetSelections(); matchConfig.selectedUniverse = universe; hoverCharacterIndex = 0; gameState = GAME_STATES.SELECT_CHARACTER; return { gameState, universe: matchConfig.selectedUniverse, roster: getCharacterRosterForSelectedUniverse().map(c => c.id) } },
    // A character's configured `portrait` field (exact on-disk filename) — proves mugshot wiring.
    charPortrait: key => characters[key]?.portrait || null,
    // Card rects for the CURRENT select-universe roster (same order as showCharSelect().roster) → crop a card.
    charCardRects: () => getCharacterCardRects(canvas, getCharacterRosterForSelectedUniverse()),
    // Pause-menu introspection: current selection + item id (drive with real esc/↓/enter keys).
    pauseSel: () => ({ gameState, index: pauseMenuIndex, item: PAUSE_MENU_ITEMS[pauseMenuIndex] }),
    // Camera introspection (zoom regression diagnosis).
    camera: () => ({ zoom: camera.zoom, targetZoom: camera.targetZoom, x: camera.x, y: camera.y }),
    // Expire an active Susanoo so the normal update loop auto-reverts it (recovery timing).
    expireSusanoo: () => { if (p1 && (p1._susanooStage || 0) > 0) p1._susanooTimer = 1 },
    // Toji stance system introspection (foundation): stance + live attack phase/move.
    tojiState: who => {
      const f = who === "p2" ? p2 : p1
      if (!f) return null
      return {
        stance: getTojiStance(f),
        attacking: !!f.attacking,
        phase: getAttackPhase(f),
        move: f.currentMove || (f.currentAttack && f.currentAttack.name) || null,
        attackCooldown: f.attackCooldown || 0,
        rekkaNext: f._rekkaNext || null,   // Blade rekka: the next hit a fresh light would chain to
        canAct: !f.attacking && (f.attackCooldown || 0) <= 0 && (f.hitstun || 0) <= 0
      }
    },
    // Render-scale introspection: the resolved action + its rendered cell height (dstH).
    // Used to confirm old-row-sheet actions (guard/grab/…) render at correct proportion.
    renderInfo: who => { const f = who === "p2" ? p2 : p1; return f ? { action: f._lastSpriteAction || null, dstH: f._lastDstH ?? null } : null },
    // Hurtbox introspection (Susanoo giant-hurtbox fix): the box combat uses for hits.
    hurtbox: who => { const f = who === "p2" ? p2 : p1; const hb = getHurtbox(f); return f && hb ? { ...hb, fx: f.x, fy: f.y, fw: f.w, fh: f.h, drawTop: f._lastDrawY ?? null, drawH: f._lastDrawH ?? null } : null },
    state: () => ({ gameState, countdown, frame: globalFrameCount }),
    arena: () => ({ left: physics.stageLeft, width: physics.stageWidth,
                    mid: physics.stageLeft + (physics.stageWidth - physics.stageLeft) * 0.5 }),
    keys:  () => ({ ...keys }),                      // proves key delivery to input.js
    p1:    () => snap(p1),
    p2:    () => snap(p2),
    // Resolved HUD energy-bar label (universe-specific resource name) for each fighter — the SAME
    // resolveEnergyLabel() ui.js draws, read off the REAL fighter (snap omits traits/energyConfig).
    energyLabel: who => resolveEnergyLabel(who === "p2" ? p2 : p1),
    // TRUE when the HUD draws "HEAVENLY RESTRICTION" instead of an energy bar (JJK energyType "none").
    heavenlyRestriction: who => isHeavenlyRestriction(who === "p2" ? p2 : p1),
    roundTimer: () => roundTimer,
    // Wiring proof: getFighterInput() call tally per player. Both advancing every
    // frame proves each fighter's input routes through input.js.getFighterInput.
    inputWiring: () => ({ ...inputCallCount, p1Type: inputSettings.p1Type, p2Type: inputSettings.p2Type }),
    // Training-mode introspection (audit + feature tests).
    training: () => ({
      enabled: trainingState.enabled,
      infiniteResources: trainingState.infiniteResources,
      dummyBehavior: trainingState.dummyBehavior,
      mode: matchConfig.mode,
      frameData: buildTrainingFrameData(),
      combo: Math.max(p1?.comboCounter || 0, p2?.comboCounter || 0)
    }),
    damageP2: (v = 100) => { if (p2) p2.health = Math.max(0, (p2.health || 0) - v) },
    sasukeCine: () => getSasukeCinematicStatus(),
    ssjRoseCine: () => getSSJRoseCinematicStatus(),
    swordCine: () => getGokuBlackSwordCinematicStatus(),
    vegetaUltCine: () => getVegetaFinalFlashCinematicStatus(),
    beerusUltCine: () => getBeerusKiBallCinematicStatus(),
    kuramaUltCine: () => getKuramaCinematicStatus(),
    p1CloneCount: () => (p1 ? countShadowClones(p1) : 0),   // test hook: live shadow-clone count (barrage gate)
    // Vegeta Super Saiyan form control + introspection (vegeta_ssj.test.mjs). op:
    //   "enter"    → player-facing transform (morph + gates),
    //   "revert"   → drop back to base,
    //   "waypoint" → the SSJ Blue prerequisite seam (fires SSJ as a fast intermediate if not already there).
    // Returns the live form state so a test can assert the swap + the mandatory-waypoint chain.
    vegetaForm: (op) => {
      if (!p1) return null
      const ctx = getAbilityContext()
      if (op === "enter") enterVegetaSSJ(p1, ctx)
      else if (op === "revert") revertVegetaSSJ(p1)
      else if (op === "waypoint") ensureVegetaSSJWaypoint(p1, ctx)
      else if (op === "enterBlue") enterVegetaBlue(p1, ctx)                 // player path: requires SSJ first (rejects base)
      else if (op === "enterBlueFromBase") enterVegetaBlue(p1, ctx, { chain: false })   // explicit base→Blue attempt (must no-op)
      else if (op === "enterBlueChain") enterVegetaBlue(p1, ctx, { chain: true })        // programmatic full-chain (forces SSJ waypoint)
      else if (op === "revertBlue") revertVegetaBlue(p1)
      return {
        ssjActive: !!p1._ssjActive, blueActive: !!p1._ssjBlueActive, isSuper: vegetaIsSuper(p1),
        form: p1.currentForm || null, hasSkinAnim: !!p1._skinAnim,
        energy: p1.energy, dmgMult: p1.damageMultiplier, spdMult: p1.speedMultiplier, defMult: p1.defenseMultiplier,
        waypointReached: !!p1._ssjWaypointReached, waypointForced: !!p1._ssjWaypointForced,
        action: p1._lastSpriteAction || null, castMove: p1._spriteCastMove || null, castTimer: p1._spriteCastTimer || 0
      }
    },
    // Force P1 into a knockdown for RENDER verification. Vegeta's knockdown/getup art exists but
    // combat only SETS knockdownState for goku_black (combat.js:717), so this is the only way to
    // exercise the knockdown pose — it proves the SSJ knockdown sheet resolves (not the 128² box).
    p1Knockdown: () => { if (p1) { p1.knockdownState = true; p1.knockdownTimer = 40; p1.hitstun = 0; p1.attacking = false; p1.grounded = true } },
    setP1Energy: (v = 0) => { if (p1) p1.energy = v },   // exercise the SSJ drain auto-revert without waiting ~18s
    // LIVE dump of the merged _skinAnim entries actually on the fighter (BUG-hunt: which object/sheet is live).
    skinAnimDump: (keys = []) => { const s = p1?._skinAnim; return { has: !!s, entries: keys.map(k => ({ k, sheet: s?.[k]?.sheet ?? null, frames: s?.[k]?.frames ?? null, w: s?.[k]?.width ?? null })) } },
    // BOTH fighters' on-screen horizontal extent given the live camera — used to confirm the Sword
    // Slash cinematic keeps BOTH in frame (unlike SSJ Rose which isolates one). onFrame = any part visible.
    bothScreenX: () => {
      const box = f => { if (!f) return null; const cw = canvas.width; const l = (f.x - camera.x) * camera.zoom + cw / 2; const r = (f.x + (f.w || 60) - camera.x) * camera.zoom + cw / 2; return { left: l, right: r, cw, onFrame: r > 0 && l < cw } }
      return { p1: box(p1), p2: box(p2) }
    },
    // Opponent (p2) on-screen horizontal extent given the live camera — used to confirm the SSJ Rose
    // cinematic frames Goku Black ONLY (p2 fully off-frame). screenX = (worldX - cam.x)*zoom + cw/2.
    p2ScreenX: () => { if (!p2) return null; const cw = canvas.width; const cx = p2.x + (p2.w || 60) / 2; const left = (p2.x - camera.x) * camera.zoom + cw / 2; const right = (p2.x + (p2.w || 60) - camera.x) * camera.zoom + cw / 2; return { left, right, cw, offFrame: right < 0 || left > cw, center: (cx - camera.x) * camera.zoom + cw / 2 } },
    projectiles: () => activeProjectiles.map(p => ({ name: p.name, x: p.x, y: p.y, vx: p.vx, vy: p.vy, visualOnly: !!p.visualOnly, sheet: p.sheet })),
    // ── RICK diagnostics (grafted on merge; damageP1 already exists in the tower section) ──
    // Pre-match name-call introspection: built beats, active flag, current announcing beat.
    namecall: () => ({
      active: namecallActive, index: namecallIndex, timer: namecallTimer,
      beats: namecallBeats.map(b => ({ side: b.side, roster: b.fighter?.rosterKey ?? null, clip: b.clip }))
    }),
    // Sequential pre-match intro introspection: which side is currently playing its intro (only one at
    // a time), the stage machine state, and each side's chosen variant. Used by the intro-sequencing test.
    introState: () => ({ stage: introStage, gameState, p1Playing: !!p1?._introPlaying, p2Playing: !!p2?._introPlaying, p1Variant: p1?._introVariant ?? null, p2Variant: p2?._introVariant ?? null }),
    // Active summons (Meeseeks no-cap test): id/owner-side/pos/frame + whether it's past its spawn beat.
    summons: () => activeSummons.map(s => ({ id: s.id, ownerSide: s.owner?.side ?? null, x: s.x, y: s.y, vx: s.vx, frame: s.frame, hasHit: !!s.hasHit, lifetime: s.lifetime })),
    resetUlt:   () => { if (p1) { p1.ultimateCooldown = 0; p1.energy = p1.maxEnergy; p1.attackCooldown = 0 } },   // clear ult lockout for back-to-back ultimate tests
    liftP2:     (dy = 40) => { if (p2) { p2.onGround = false; p2.grounded = false; p2.y -= dy; p2.vy = 0; p2.isLaunched = true } },  // raise the dummy into an aerial path (e.g. Rick's rising rocket)
    setTauntCharge: v => { if (p1) p1._tauntCharge = v },   // fast-forward the 10s taunt charge for tests
    healP1:     () => { if (p1) { p1.health = p1.maxHealth || 1050; p1.hitstun = 0; p1.knockdownState = false } },
    setP2Invuln: (v = 600) => { if (p2) p2.invulnTimer = v },   // let a projectile pass through the dummy (free-flight range measurement)
    fillEnergy: () => { if (p1) p1.energy = p1.maxEnergy },
    setEnergy:  v => { if (p1) p1.energy = v },
    setP2X:     x => { if (p2) p2.x = x },        // reposition the dummy (e.g. close range → Lv2 sword)
    expireItachiSusanoo: () => { if (p1 && p1._itachiSusanoo) p1._itachiSusanooTimer = 1 },   // force the auto-revert next tick (skip the ~20s wait)
    // ── deterministic reset for the beta-input test (clears the motion buffer + cooldowns so
    //    successive command-special casts don't contaminate each other via stale directionHistory
    //    or a lingering summon/chain recast lock). Test-only, like the rest of __harness.
    resetFighterInput: (who = "p1") => { const f = who === "p2" ? p2 : p1; if (!f) return; f.directionHistory = []; f.attackCooldown = 0; f.summonCooldown = 0; f.chainCooldown = 0; f.teleportCooldown = 0 },
    clearProjectiles:  () => { activeProjectiles.length = 0 },
    healP2:     () => { if (p2) { p2.health = p2.maxHealth || 1000; p2.hitstun = 0; p2.knockdownState = false } },  // reset dummy between damage checks
    liftP1:     (dy = 40) => { if (p1) { p1.onGround = false; p1.grounded = false; p1.y -= dy; p1.vy = 0; p1.isLaunched = true } },  // put P1 at a low airborne altitude (test air normals on the descent)
    hurtP1:     (v = 20) => { if (p1) { p1.hitstun = v; p1.attacking = false } },  // simulate getting hit (cancel tests)
    knockdownP1: (t = 60) => { if (p1) { p1.knockdownState = true; p1.knockdownTimer = t; p1.attacking = false } },  // drive the downed/get-up (knockdown) pose for sprite verification
    // Drive a REAL p2 attack (generous startup so a defender can react) — used to open the
    // Substitution incoming-attack window and to verify the swing actually whiffs on a substitute.
    p2Attack:   () => { if (p2) { p2.attackCooldown = 0; p2.attacking = false; startMove(p2, "light", { startup: 10, active: 6, recovery: 16, damage: 60, rangeX: 120, rangeY: 90, hitstun: 18, knockbackX: 6 }) } },
    // Drive a REAL p2 attack of a chosen CATEGORY (heavy/special/ultimate) — used to reproduce the
    // Goku Black knockdown re-trigger soft-lock (rapid successive knockdown-class hits). Short startup
    // so it connects quickly; the category drives resolveAttackHit's knockdown gate.
    p2AttackCat: (cat = "heavy") => { if (p2) { p2.attackCooldown = 0; p2.attacking = false; p2.hitstop = 0; startMove(p2, cat, { startup: 3, active: 6, recovery: 8, damage: 40, rangeX: 140, rangeY: 110, hitstun: 16, knockbackX: 3, category: cat }) } },
    p2Actable:  () => (p2 ? { attacking: !!p2.attacking, hitstop: p2.hitstop || 0, hitstun: p2.hitstun || 0, attackCooldown: p2.attackCooldown || 0, canAct: !p2.attacking && (p2.hitstop || 0) <= 0 && (p2.hitstun || 0) <= 0 && (p2.attackCooldown || 0) <= 0 } : null),
    gbHitState: () => (p1 ? { knockdownState: !!p1.knockdownState, knockdownTimer: p1.knockdownTimer || 0, hitstun: p1.hitstun || 0, hitstop: p1.hitstop || 0, invulnTimer: p1.invulnTimer || 0, action: p1._lastSpriteAction || null, attacking: !!p1.attacking, health: p1.health } : null),
    topUpP1Health: () => { if (p1) p1.health = p1.maxHealth || 1200 },   // health ONLY — does NOT touch knockdown/hitstun (unlike healP1), so a barrage repro can keep GB alive without erasing the state under test
    setP1Pos: (x, y) => { if (p1) { if (x != null) p1.x = x; if (y != null) p1.y = y } },
    setVx: (who, v) => { const f = who === "p2" ? p2 : p1; if (f) f.vx = v },   // inject velocity → a running physics step would move them; a FROZEN one won't (cinematic-freeze proof)
    p2State:    () => (p2 ? { attacking: !!p2.attacking, hasHit: !!(p2.currentAttack && p2.currentAttack.hasHit), x: p2.x, w: p2.w, health: p2.health } : null),
    p1Snap:     () => (p1 ? { x: p1.x, y: p1.y, w: p1.w, facing: p1.facing, energy: p1.energy, health: p1.health, invulnTimer: p1.invulnTimer || 0, attackCooldown: p1.attackCooldown || 0, teleportFlash: p1.teleportFlash || 0, blocking: !!p1.isBlocking, hitstun: p1.hitstun || 0, action: p1._lastSpriteAction || null, absoluteDefense: !!p1.absoluteDefenseActive, susanooStage: p1._susanooStage || 0 } : null),
    // ── TOWER diagnostics (STEP 0 + build verification) ──────────────────────
    towerInfo: () => ({
      active: towerState.active, floor: towerState.floor,
      tier: towerState.tier, tierLabel: towerState.tierLabel,
      floors: towerState.endless ? "Infinity" : towerState.floors, endless: towerState.endless,
      cleared: towerState.cleared, lastWon: towerState._lastWon, carryPct: towerState.carryPct,
      mode: matchConfig.mode, gameState,
      p2: matchConfig.p2CharKey, stage: matchConfig.selectedStage ? matchConfig.selectedStage.name : null,
      difficulty: matchConfig.aiDifficulty
    }),
    // Drive the REAL tower state machine, bypassing only the manual P1 fighter-pick UI.
    towerStart: (tierId = "tier1", p1Key = "gojo") => {
      startTower(tierId)
      matchConfig.p1CharKey = p1Key; matchConfig.p1Char = characters[p1Key] || characters.gojo; matchConfig.p1Skin = "default"
      applyTowerFloor(); startMatch()
    },
    towerContinue: () => continueTower(),
    forceP1Win: () => { if (p2) p2.health = 0 },
    forceP1Lose: () => { if (p1) p1.health = 0 },
    // Sample the Rick voice-pool randomizer N times (the SAME pickRickVoice used by every wired
    // Rick trigger) → lets a test prove genuine random selection / pair-alternation deterministically.
    rickVoicePick: (pool, n = 1) => Array.from({ length: n }, () => pickRickVoice(pool)),
    damageP1: (v = 100) => { if (p1) p1.health = Math.max(1, (p1.health || 0) - v) },   // chip P1 so a round isn't perfect
    victoryInfo: () => ({ flawless: !!victoryState.flawless, subtitle: victoryState.subtitle || "", primaryLabel: victoryState.primaryLabel || "", winner: victoryState.winnerSide, perfectP1: matchStats?.p1?.perfectRounds, roundsWonP1: matchStats?.p1?.roundsWon }),
    // ── FREE-FOR-ALL diagnostics/drivers ──────────────────────────────────────
    // teams: optional per-slot "A"/"B" array → team mode; omit/[] → pure FFA.
    // aiSlots: optional per-slot difficulty ("easy"/"adaptive"/"impossible") or null=human →
    // AI-fills those slots (default omitted → all human, so existing FFA/team tests are unaffected).
    ffaStart: (count = 3, charKeys = ["gojo", "sukuna", "megumi", "toji"], teams = [], aiSlots = []) => {
      ffaState.playerCount = Math.min(FFA_MAX_PLAYERS, Math.max(2, count))
      ffaState.charKeys = charKeys.slice(0, ffaState.playerCount)
      ffaState.teams = (teams || []).slice(0, ffaState.playerCount)
      ffaState.aiSlots = (aiSlots || []).slice(0, ffaState.playerCount)
      startFFAMatch()
      countdown = 0   // skip the pre-fight countdown for tests
    },
    ffaInfo: () => ({
      active: ffaState.active, over: ffaState.over, mode: matchConfig.mode, gameState,
      stage: matchConfig.selectedStage?.name, stageWidth: getStageWorldWidth(),
      teamMode: ffaState.teamMode, winnerTeam: ffaState.winnerTeam,
      winnerSlot: ffaState.winner ? (ffaState.winner.ffaSlot ?? null) : null,
      alive: ffaAliveFighters().length,
      aliveTeams: [...new Set(ffaAliveFighters().map(f => f.team))].filter(Boolean),
      camZoom: camera.zoom,
      fighters: ffaState.fighters.map(f => f && ({
        slot: f.ffaSlot, key: f.rosterKey, playerNumber: f.playerNumber, team: f.team || null,
        x: Math.round(f.x), y: Math.round(f.y), health: Math.round(f.health), maxHealth: f.maxHealth,
        eliminated: !!f.eliminated, facing: f.facing, attacking: !!f.attacking,
        isAI: !!f._aiControlled, aiDifficulty: f.aiDifficulty || null, aiTarget: f._aiTargetSlot ?? null
      }))
    }),
    // Jump straight to the team-assignment screen (device cap blocks the menu route without pads).
    ffaTeamSelectPreview: (count = 3, charKeys = ["gojo", "sukuna", "megumi", "toji"]) => {
      ffaState.playerCount = count; ffaState.charKeys = charKeys.slice(0, count)
      ffaState.teams = Array.from({ length: count }, (_, i) => FFA_TEAMS[i % 2]); ffaState.pickSlot = count
      hoverFFATeamIndex = 0; gameState = GAME_STATES.FFA_TEAMSELECT
    },
    // Jump to the slot-assignment (human/AI + difficulty) screen and read/drive it.
    ffaSlotSelectPreview: (count = 4, charKeys = ["gojo", "sukuna", "megumi", "toji"]) => {
      ffaState.playerCount = count; ffaState.charKeys = charKeys.slice(0, count)
      ffaState.aiSlots = ffaDefaultAISlots(count); ffaState.pickSlot = count
      hoverFFASlotIndex = 0; gameState = GAME_STATES.FFA_SLOTSELECT
    },
    ffaSlotInfo: () => ({ gameState, deviceCount: ffaDeviceCount(), aiSlots: ffaState.aiSlots.slice(0, ffaState.playerCount) }),
    // Click a slot-select row by slot index (cycles Human ↔ CPU tiers) — exercises the real rect+handler.
    ffaCycleSlot: (slot) => { ffaCycleSlotAssignment(slot) },
    ffaAttack: (idx, move = "light") => { const f = ffaState.fighters[idx]; if (f && !f.eliminated) f._forceAttack = move },
    ffaMove:   (idx, dir = 0) => { const f = ffaState.fighters[idx]; if (f) f._forceMove = dir },   // dir: -1 left / +1 right / 0 stop
    ffaSetX:   (idx, x) => { const f = ffaState.fighters[idx]; if (f) f.x = x },
    ffaDamage: (idx, v = 100) => { const f = ffaState.fighters[idx]; if (f) f.health = Math.max(0, Math.min(f.maxHealth || 1, (f.health || 0) - v)) },   // clamps to maxHealth (negative v = heal)
    ffaMaxPlayers: () => ffaMaxAvailablePlayers(),
    inputTypes: () => ({ p1: inputSettings.p1Type, p2: inputSettings.p2Type, p3: inputSettings.p3Type, p4: inputSettings.p4Type, pads: getConnectedPadCount?.() || 0 }),
    // Force the pre-match INTRO with a specific variant, held open (no auto-advance / namecall)
    // so intro-rotation coverage can render + step each pose. Resets P1's sprite so the intro
    // action re-resolves cleanly.
    forceIntro: variant => {
      startHarnessMatch()
      gameState = GAME_STATES.INTRO
      namecallActive = false
      matchIntroTimer = 9999
      countdown = ROUND_START_COUNTDOWN
      if (p1) {
        p1._introPlaying = true
        p1._introSeq     = null          // force a single held variant (bypass any introSequence stepper)
        p1._introVariant = variant
        if (p1.spriteHandler) { p1.spriteHandler.currentAction = null; p1.spriteHandler.frameIndex = 0; p1.spriteHandler.frameTimer = 0; p1.spriteHandler.locked = false }
      }
      if (p2) p2._introPlaying = false
      // Hold this single forced intro open: mark the sequential stage machine "done" so it neither
      // auto-advances P1 off nor starts P2 (this hook drives one side's intro-rotation coverage).
      introStage = "done"
    }
  }
})()
