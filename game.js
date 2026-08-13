// game.js

import { bindingVows, activateBindingVow, hasBindingVow, activeVows, clearAllBindingVows, tryActivateBindingVow } from "./bindingvow.js"
import { characters, characterList } from "./characters.js"
import {
  switchAlien, applyAlien, BEN10_ALIEN_POOL, BEN10_ART_ALIENS, isArtBackedAlien, DEFAULT_OMNITRIX, setupBen10,
  isTransformDevice, updateTransformDevice, tryTransform, revertToHuman, selectAlienSlot
} from "./fighters.js"
import { camera } from "./camera.js"
import { SpriteHandler, processPendingSpawns, preloadCharacterSprites, preloadSheets, loadedSheetCount } from "./sprite.js"
import { loadSpriteSheets, getSpriteSheets, spritesReady } from "./spritesheets.js"
import { fxSheetsForFighters } from "./preloadManifest.js"
import { gameRng, reseed as reseedRng, makeSeed } from "./rng.js"   // Stage 11A: seeded gameplay RNG
import {
  keys, mouse, setupMouseInput, pointInRect, consumeMouseClick,
  inputSettings, getFighterInput, updateDebugInputToggles, getDebugInputState,
  recordInputFrame, recordInputSequence, getInputHistory, endInputFrame,
  clearInputBuffers, PS5_MAP, STICK_DEADZONE, inputCallCount, getConnectedPadCount, getPlayerGamepad,
  readRawControls, writeRawControls
} from "./input.js"
import * as replay from "./replay.js"   // Stage 11B: input recording (replay foundation)
import {
  activeSummons,
  updateSummons as updateActiveSummons,
  drawSummons as drawActiveSummons,
  spawnSummon as spawnAssistSummon,  // ← fixed: alias included
  summonShadowClone, dispelShadowClones,   // debug hotkeys (",", ".") wire straight to these
  spawnShadowClone,                        // immediate clone spawn (harness clone-combo staging — no audio-window delay)
  countShadowClones,                       // #21 Clone Rendan Storm gate (Naruto light-string extension)
  getClonePuffCount,                       // harness: Zenitsu Double Attack partner poof count
  getWoodReleaseFxCount,                   // harness: Hashirama wood-clone log-dispersal despawn FX count
  getWaterCloneFxCount,                    // harness: Tobirama water-clone burst(destroy)/ripple(dismiss) FX counts
  getCloneStrikeFxCount,                   // harness: cumulative clone lunge-strike impacts (prove clones ATTACK)
  setCloneAggro, isCloneAggro,             // clone behavior-AI master toggle (active lunge-strike vs legacy decoy)
  isCloneCapable,                          // single source of truth: does this char have the shadow-clone mechanic?
  revealClonesHitByProjectiles,            // decoy hit-reveal: a projectile poofs a clone (any-hit reveal)
  setCloneTell, isCloneTell                // decoy visual-tell toggle (Stage 4 no-tell mode)
} from "./summons.js"
import { physics } from "./physics.js"
import {
  updateCombat, resolveProjectileHits, resolveProjectileHitsMulti, resolveAttackHit,
  updateProjectiles as updateCombatProjectiles,
  checkClash, checkParry, resolveGrab, updateGrab,
  getAttackPhase, getAttackHitbox,   // training overlay: live frame data + real attack hitbox
  getHurtbox,                         // harness: verify the Susanoo giant hurtbox + Edo dummy body-overlap
  attackIsActive,                     // Edo Tensei: only an ACTIVE swing can cancel via the standing dummy
  rectsOverlap,                       // Edo Tensei: opponent-attack vs standing-Tobirama dummy overlap
  GLOBAL_DAMAGE_SCALE,                // Edo Tensei: scale a dummy-cancel hit to the same net damage a normal hit deals
  applyScaledDamage,                  // Stage 1a: the one scaled-damage choke-point (DOT ticks + Hisoka portal-drop route through it)
  tryComboBreaker, COMBO_BREAKER,     // MK-feel Stage 2d: universal block+special combo breaker (fires only vs a >=3 combo)
  tryComebackFinisher, comebackFinisherReady, comebackFinisherDamage, COMEBACK_FINISHER,   // Fatal-Blow-style comeback finisher (once/match, <30% HP, block+grab)
  startMove,                          // harness: drive a real p2 attack (Substitution incoming-window)
  getCancelWindow                     // harness/combo-flow: inspect a fighter's shared cancel window
} from "./combat.js"
import { resolveStageHazard, hazardBox } from "./stageHazards.js"   // STAGE INTERACTABLES pilot — knocked-into-hazard reaction + draw box
import { updatePlatforms, drawPlatforms, spawnPlatform, clearPlatforms, getPlatforms, PLATFORM_DEFAULTS } from "./platforms.js"   // Wood Release climbable terrain (Stage 1 — isolated primitive)
import {
  activeProjectiles, spawnProjectile,
  triggerSpecial, triggerUltimate, triggerTransformation,
  executeTobiramaWaterFlicker,   // Tobirama Water Body-Flicker escape (hitstun/knockdown reversal)
  revertEdoTensei,   // Tobirama Edo Tensei: auto-revert from the vessel back to Tobirama at window's end
  updateEdoTensei,   // Tobirama Edo Tensei: per-frame windup→swap + active-window fuel-drain driver
  endEdoTenseiWindow,   // Tobirama Edo Tensei: launch the un-summon (fuel-empty OR opponent hit the standing Tobirama)
  enterSSJRose, revertSSJRose, applyGokuBlackFormSystem,   // Goku Black SSJ Rose (Stage 2)
  enterMangekyou, revertMangekyou, applyMangekyouSystem, isMangekyouActive,   // Itachi Mangekyou Sharingan (buff mode)
  applyGodspeedSystem,   // Killua Godspeed: sustained buff-mode ultimate (drain tick + afterimage trail)
  applyFlashTimeSystem, forceRevertFlashTime,   // Flash — Flash Time: sustained buff-mode ultimate (drain tick + block-lockout + afterimage trail)
  applyGonAdultFormSystem, forceRevertGonAdultForm,   // Gon Adult Form: sustained buff-mode ultimate (drain tick + movement-lockout + green aura trail)
  applyHisokaOverdriveSystem, forceRevertHisokaOverdrive,   // Hisoka Bloodlust Overdrive: sustained buff-mode ultimate (drain tick + _skinAnim golden power-up body-swap)
  updateTransformJutsu, isTransformJutsuActive, transformJutsuTier,   // Transformation Jutsu (Naruto-universe): per-frame window driver + state reads
  revertTransformJutsu,   // harness/force-revert
  applySupermanModeSystem, forceRevertSupermanModes,   // Superman Stage 4: Solar Flare (gold) + Kryptonian Overload (blue) sustained mode-toggles (drain tick + auto-revert)
  enterVegetaSSJ, revertVegetaSSJ, applyVegetaFormSystem, ensureVegetaSSJWaypoint,   // Vegeta Super Saiyan (Stage 1)
  enterVegetaBlue, revertVegetaBlue, vegetaIsSuper,   // Vegeta Super Saiyan Blue (3rd form, chained off SSJ)
  updateTransformationState, doEnergyCharge, applyGojoPassiveSystems,
  regenEnergy, updatePendingSpawns, clearAbilityState, executeSukunaMalevolentDash,
  applyCloneRendanStorm,   // #21 Clone Rendan Storm — flurry follow-ups on Naruto's basic light hit
  sasukeInSusanoo, SUSANOO_DURATION_FRAMES, SASUKE_SUSANOO_DURATION_FRAMES,   // Susanoo: pause round clock + purple duration readout (Sasuke timer-bar max is the Stage-3e Sasuke-specific value)
  spawnAbsoluteDefenseFx,   // Sasuke Absolute Defense — repurposed Susanoo-intro sheet as the barrier FX

  updateVegetaCommandCombat,   // Vegeta command-normal cancel chain (Y-track kick target combo)
  updateBen10CommandCombat,   // Ben 10 per-form Fwd+Heavy command chain (Ben jab / XLR8 combo / Diamondhead crystal swing)
  updateOmegaRangerCommandCombat,   // Omega Ranger kick-chain (Fwd+Heavy rekka) + Fwd+Light push / air-Heavy down-air-2 pokes
  updateRedRangerMmprCommandCombat,   // Red Ranger MMPR punch-chain (Fwd+Heavy rekka → super 360° launcher) + air-Heavy dive-kick poke
  updateNeteroCommandCombat,   // Netero Down+Heavy command-normal cancel chain (down_attck_1 → cancel-on-hit → down_attck_2)
  updateOmniManCommandCombat,   // Omni-Man "Viltrumite Beatdown" Fwd+Heavy rekka + Fwd+Light push poke
  applyOmniManFlightSystem, toggleOmniManFlight, isOmniManFlying, isOmniManForcedDescent, executeOmniManSpecial, forceRevertOmniManFlight,   // Omni-Man Flight: toggle movement mode + shared-pool drain + forced-descent state machine + Stage-3 special + round-reset cleanup
  updateNeteroGuanyinCombat,   // Netero Guanyin giant: base attack buttons re-routed to the 4 avatar attacks
  updateSaikiCommandCombat,   // Saiki Fwd+Heavy 4-hit projectile rekka + Fwd+Light Basic Burst poke
  updateKilluaCommandCombat,   // Killua Down+Heavy 4-hit Barrage command-normal cancel chain (barrage1→…→barrage4, cancel-on-hit)
  updateFlashCommandCombat,   // Flash Down+Heavy 2-hit "Speed Rush" command-normal cancel chain (rush1→rush2, cancel-on-hit)
  updateGonCommandCombat,     // Gon Down+Heavy 2-hit "Rush" command-normal cancel chain (rush1 flurry→rush2 launcher, cancel-on-hit)
  updateStandardStringCombat, // MK-feel Stage 2b: single-poke chars' shared light→light→heavy(launcher) + heavy→special cancel string

  updateBatmanCommandCombat,  // Batman Down+Heavy 3-hit "Combo" command-normal cancel chain (batCombo1→2→3 launcher, cancel-on-hit)
  updateSupermanCommandCombat,  // Superman Fwd+Heavy 3-hit "Kryptonian Rush" flying-punch chain (supRush1→2→Fin launcher, cancel-on-hit)
  updateTobiramaCommandCombat,   // Tobirama Fwd+Heavy 3-hit taijutsu chain (combo1→combo2→comboFin) + Fwd+Light/Back+Heavy pokes
  updateHashiramaCommandCombat,  // Hashirama Fwd+Heavy 3-hit chain (comboA→comboB→comboFin launcher) + Fwd+Light wood-straight poke
  updateMadaraCommandCombat,     // Madara Fwd+Heavy → Susanoo Base Punch (command-normal, Stage 3 special #6)
  updateObitoCommandCombat,      // Obito Fwd+Heavy → "Kamui Rod Combo" 3-hit rekka (obitoRod1→2→3, cancel-on-hit)
  updatePainCommandCombat,       // Pain Fwd+Light → painJab; Fwd+Heavy → 3-stage rekka (painCombo1→2→3)
  updatePainAssistCombo,         // Pain "Six Paths Summon" — Charge + slot → 1 of 5 Akatsuki assist calls
  updateObitoKamui, toggleObitoKamui, deactivateObitoKamui,   // Obito Kamui Intangibility (Stage 4): P-TAP continuous toggle + per-frame drain/melee-drop driver
  updateTobiCombat,              // Tobi (masked Obito alias) — per-frame combat watcher: Stage-2 air-kunai projectile spawn (own `_tobi*` state, no Obito coupling)
  updateTobiChainGrab,           // Tobi Stage-3 Chain Grab scripted state machine (whip→reach→snatched→smash, all `_tobiChain*`)
  updateTobiKamui, toggleTobiKamui, deactivateTobiKamui,   // Tobi Stage-4 Kamui Intangibility (own `_tobi*` state; independent of Obito's `_kamui*`)
  updateSasukeCommandCombat,     // Sasuke grab button → standalone skeletal Susanoo command-grab (Tier-1, independent of the staged ultimate)
  revertMadaraSusanoo,           // Madara tier-3 Susanoo armor-mode auto-revert (Stage 3 special #7)
  revertMadaraCompleteSusanoo,   // Madara tier-4 Complete Susanoo giant-form auto-revert (Stage 5 HOLD ult)
  updateMinatoCommandCombat,   // Minato Fwd+Heavy 3-hit "Yellow Flash Rush" chain (rush1→rush2→rushFin) + Fwd+Light/Back+Heavy pokes
  updateHisokaCommandCombat,   // Hisoka Down+Heavy 2-hit "Card Flourish" command-normal cancel chain (rekka1 strike→rekka2 card-slash launcher, cancel-on-hit)
  updateZenitsuCommandCombat,  // Zenitsu Down+Heavy 3-hit "Thunderclap Flurry" chain (zenCombo1→2→3 launcher, cancel-on-hit)
  updateRengokuCommandCombat,  // Rengoku Fwd+Heavy branching "Flame Breathing" ground+air chains (Heavy=continue / Special=super finisher)
  updateShinobuCommandCombat,  // Shinobu Fwd+Heavy "Insect Breathing" thrust chain + Poison-on-hit watcher
  updateInosukeCommandCombat,  // Inosuke Fwd+Heavy "Beast Breathing Flurry" 5-stage chain + Down+Heavy Beast Fang
  updateNezukoCommandCombat,   // Nezuko Fwd+B ball-kick projectile + Down+B i-frame dodge (B-family command normals)
  updateBeastBreathingAssist,  // Inosuke mid-combo partner call — auto-resumes the flurry when the freeze lifts
  updateZarakiYachiruLink,     // Zaraki (Shikai) mid-combo Yachiru link — auto-resumes the rekka when the freeze lifts
  getBeastAssistPartners,      // data-driven Demon Slayer partner roster (auto-extends for Nezuko/future chars)
  updateGhostfaceCommandCombat,  // Ghostface Down+Heavy "Slasher Frenzy" low-knife chain + Bleed/Knockdown-on-hit watchers
  updateMiwaCommandCombat,  // Miwa Fwd+Heavy "Battojutsu Rush" 3-hit katana chain (miwaG1 lunge→miwaG2 thrust→miwaG3 launcher, cancel-on-hit)
  updateMakiCommandCombat,  // Maki Fwd+Heavy "Cursed Tool Flurry" 3-hit kick chain (makiG1→makiG2→makiG3, cancel-on-hit) — Heavenly-Vow TIGHT link window
  updateTojiCommandCombat,  // Toji Fwd+Heavy A-B-C-A+B hand-combo rekka (tojiG1 jab→G2 cross→G3 hook→G4 finisher) + Back+Heavy Handgun bullet poke
  applyTojiComeback,        // Toji two-stage comeback: intercept HP-reaches-zero (save1 25% / save2 40%+Reincarnated Form / 3rd = normal KO)
  updateIchigoCommandCombat,  // Ichigo "Zangetsu" command system: Fwd+Heavy 3-hit rekka (slash→double→combo-launcher) + Down/Back+Heavy, Fwd+Light, Dash+Heavy command normals
  updateZarakiCommandCombat,  // Zaraki command normals: Fwd+Light/Fwd+Heavy slashes + Up+B aerial route (up-swing → repeat → down slam) + Shikai combo kit
  fireZarakiChargedDash,      // Zaraki Charged Dash Attack — fired from handleChargeRelease (CHARGE hold→release, tap/hold power tiers)
  revertZarakiShikai,         // Zaraki Shikai timed-mode auto-revert (timer expiry / KO / round reset)
  startYujiKoma,            // Yuji "Koma" REPEAT release — begin the mash-extend flurry (Ultimate Phase-2 payload; Stage 4 engine)
  updateYujiKomaCombat,     // Yuji "Koma" per-frame driver — mash to extend the flurry, auto-chain to the finisher
  fireMakiPowerCharge, revertMakiPowerCharge, makiShibuyaActive,  // Maki Power Charge self-buff (charge-release) + Shibuya-form probe

  getGhostfaceCallInPool,        // Ghostface Call-In: the active identity's 4-character companion pool
  triggerGhostfaceSwap, updateGhostfaceSwap, isGhostfaceSwapActive, ghostfaceSwapTimer, ghostfaceSwapTarget, GHOSTFACE_SWAP_SLOTS,  // Ghostface Companion Swap ("Kameo"): full-kit swap into a pool companion, fixed window, auto-revert (now a branch of the Backstage Pass)
  updateGhostfaceBackstagePass, isGhostfaceBackstagePassActive, ghostfaceBackstagePassBranch,   // Ghostface Backstage Pass (Special, spec §4.2): dash-off + phantom hit + branch (switch/getaway/fakeout/swap)
  updateGhostfacePresentation, getGhostfacePresentation,   // Ghostface visual staging: Stalk Vanish off-screen/re-entry + 3-beat killer-swap transition (render-only)
  updateGhostfaceAmbush, isGhostfaceAmbushActive, ghostfaceAmbushPhase, triggerGhostfaceAmbush,   // Ghostface "Phone Call" ambush swap (Charge+Special): 4-beat bait→retreat→2nd-killer strike→handoff
  applySkillHunter, revertSkillHunter,   // Chrollo Skill Hunter engine — imported ONLY for a test-hook "unaffected" proof (drives the real shared field-swap)
  triggerBanditEcho, updateBanditEcho, updateBanditEchoUltMark, isBanditEchoActive,   // Chrollo "Bandit's Echo" (Down+Ult): copy the marked opponent special/ultimate once (HP+energy cost, single-use) + per-frame auto-revert driver + cinematic-ultimate mark watcher

  fireRengokuFlameStrike,      // Rengoku Charged Flame Strike — fired from handleChargeRelease (CHARGE hold→release, tap/hold power tiers)
  fireHashiramaWoodPunch,      // Hashirama Wood Release Punch — fired from handleChargeRelease (CHARGE hold→release, tap=base / hold=Super wood spear)
  fireNezukoRunScratchRelease, // Nezuko Run & Scratch — fired from handleChargeRelease (CHARGE hold→release, forward claw rush)
  updateNezukoUltChain,        // Nezuko Kekijutsu Baketsu — per-frame phase1→phase2 auto-chain driver
  revertNezukoDemon            // Nezuko Demon Transformation — revert-to-base (timer expiry)
} from "./abilities.js"
import { spawnProjectileFromMove } from "./projectiles.js"
import { bevelPath as _bevelPath, mkAmbientBackdrop as _mkAmbientBackdrop, withAlpha as _withAlpha } from "./ui.js"
import {
  drawBattleBackground, drawCharacterSelectScreen, drawControlsInfo,
  drawCountdown, drawFighter, drawHealthAndEnergyBars, drawMatchEnd,
  drawProjectiles, drawRoundBreak, drawStartScreen, drawStageSelectScreen,
  selectCardAnim, selectCardAdvance, drawSelectCardFrame,   // shared select-card hover/confirm animation (char-select → skin-select)
  drawTrainingCollisionBoxes, drawTrainingOverlay, drawUniverseSelectScreen,
  drawGameplaySelectScreen, drawAIDifficultyScreen, drawPauseMenu,
  drawAiVsAiSetupScreen, getAiVsAiSetupRects, drawAiVsAiSummaryScreen, getAiVsAiSummaryRects,
  drawTowerSelectScreen, getTowerSelectRects,
  drawArcadeSetupScreen, getArcadeSetupRects, drawRivalIntroScreen, drawArcadeEndingScreen,
  drawBracketSetupScreen, getBracketSetupRects, drawBracketScreen,
  drawFFASetupScreen, getFFASetupRects, drawFFACharSelectScreen,
  drawFFATeamSelectScreen, getFFATeamSelectRects,
  drawFFASlotSelectScreen, getFFASlotSelectRects,
  PAUSE_MENU_ITEMS, getStartMenuRects, getGameplaySelectRects,
  getAIDifficultyRects, getUniverseCardRects, getCharacterCardRects,
  getStageCardRects, drawStartInfoPanel,
  lastBattleBgRect,
  drawAlienSelectScreen, getAlienSelectCardRects, getAlienSelectButtons, alienGridOpts,
  CHAR_GRID_OPTS, charSelectGridOpts, getSelectDetailRect, scrollGridBy, setGridScroll, getGridScrollbar, getGridViewport, pickGridCard, resetGridScroll,
  getMainMenuRects, drawMainMenuScreen, drawStoryModeScreen, getStoryBackButton,
  drawCreditsScreen,
  drawMoveListScreen, getMoveListCardRects, getMoveListButtons,
  drawTutorialScreen, getTutorialButtons, getTutorialPageCount,
  drawAccountScreen, getAccountButtons,
  resolveEnergyLabel, isHeavenlyRestriction, noMeterFlavor,   // HUD energy-bar resource name + no-meter flavor (Heavenly Restriction / Total Concentration) — display-only, exposed for the harness
  drawImageFit   // shared aspect-ratio-preserving image fitter (portraits never stretch/squash)
} from "./ui.js"
import { CREDITS, SOURCED_ART, artistLineForCharacter, allAttributedKeys } from "./credits.js"
import { poolAcquire, poolRelease, poolStats, poolResetStats } from "./pool.js"
import { createAccount, getCurrentAccount, isValidUsername, listAccounts, connectSaveFile, isFileConnected, isFileApiSupported, hasPersistedData, persistence, setSnapshotDecorator,
  initSaveServerTier, isSaveServerAvailable, reattachStoredHandle, reconnectSaveFile, needsReconnect, saveFileStatus, exportSaveText, exportSaveFilename, importSaveText } from "./account.js"
import {
  awardMatchXp, awardXp, getLevel, xpProgress, isUnlocked, requiredLevel,
  loadProgressionFromAccount, PROGRESS_DOES_NOT_PERSIST,
  setDevUnlock, isDevUnlocked, DEV_CODE,
  applyUnlockCode, isBetaUnlocked, clearBetaUnlock, restoreUnlockFlags,
  FEATURES, levelFromXp,
  setArcadeCleared, isArcadeCleared, isArcadeNoContinueCleared, getArcadeCleared,
  setTowerTierCleared, getTowerCleared,
  saveBracket, loadBracket, clearBracket
} from "./progression.js"
import {
  isCharacterUnlocked, unlockConditionFor, unlockLabel, charactersUnlockedBetween, partitionRoster
} from "./unlocks.js"
import {
  ARCADE_FIGHTS, ARCADE_RIVAL_FIGHT, ARCADE_BOSS_FIGHT, arcadeState,
  arcadeFightRole, arcadeBossKey, arcadeDifficultyForFight, arcadeRivalKey, arcadeRivalDialogue, ARCADE_XP
} from "./arcade.js"
import { endingSlidesFor } from "./endings.js"
import { readSession, writeSession, clearSession } from "./session.js"
import { getSkins, getSkin, getSkinAnimationData, isSkinUnlocked, buildUnlockedSkinsSnapshot } from "./skins.js"
import { getKit, CONTROL_REFERENCE } from "./kits.js"
import { createAIController, resetAIController, setAIDifficulty, getAIInput } from "./ai.js"
import { recordMotionInput, detectMotion, getRecentMotions } from "./motionInput.js"   // classic motion-input engine (Naruto-universe only; dedicated motionHistory buffer, no cycle)
import {
  createSpectatorSession, startMatchLog, logMoveUsed, logHit, logRoundEnd, finalizeMatchLog,
  sessionToJSON, sessionToCSV, summarizeSession, downloadText,
  SPECTATOR_DIFFICULTIES, SPECTATOR_SPEEDS
} from "./spectator.js"
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
  updateMinatoKurama, isMinatoKuramaActive, drawMinatoKurama, clearMinatoKurama, getMinatoKuramaStatus
} from "./minatoKurama.js"
import {
  updateObitoJuubi, isObitoJuubiCinematicActive, drawObitoJuubi, clearObitoJuubi, getObitoJuubiCinematicStatus
} from "./obitoJuubiCinematic.js"
import {
  updateTobiNineTails, isTobiNineTailsCinematicActive, drawTobiNineTails, clearTobiNineTails, getTobiNineTailsCinematicStatus
} from "./tobiNineTailsCinematic.js"
import {
  updateSasukeCinematic, isSasukeCinematicActive, drawSasukeCinematic, clearSasukeCinematic,
  getSasukeCinematicStatus
} from "./sasukeCinematic.js"
import {
  updateSSJRoseCinematic, isSSJRoseCinematicActive, drawSSJRoseCinematic, clearSSJRoseCinematic,
  getSSJRoseCinematicStatus
} from "./ssjRoseCinematic.js"
import {
  updateKilluaGodspeedCinematic, isKilluaGodspeedCinematicActive, drawKilluaGodspeedCinematic,
  clearKilluaGodspeedCinematic, getKilluaGodspeedCinematicStatus
} from "./killuaGodspeedCinematic.js"
import {
  updateFlashTimeCinematic, isFlashTimeCinematicActive, drawFlashTimeCinematic,
  clearFlashTimeCinematic, getFlashTimeCinematicStatus
} from "./flashTimeCinematic.js"
import {
  updateGonAdultFormCinematic, isGonAdultFormCinematicActive, drawGonAdultFormCinematic,
  clearGonAdultFormCinematic, getGonAdultFormCinematicStatus
} from "./gonAdultFormCinematic.js"
import {
  updateHisokaOverdriveCinematic, isHisokaOverdriveCinematicActive, drawHisokaOverdriveCinematic,
  clearHisokaOverdriveCinematic, getHisokaOverdriveCinematicStatus
} from "./hisokaOverdriveCinematic.js"
import {
  updateTojiReincarnationCinematic, isTojiReincarnationCinematicActive, drawTojiReincarnationCinematic,
  clearTojiReincarnationCinematic, getTojiReincarnationCinematicStatus
} from "./tojiReincarnationCinematic.js"
import {
  updateTojiFlyHeadsSwarm, isTojiFlyHeadsSwarmActive, drawTojiFlyHeadsSwarm,
  clearTojiFlyHeadsSwarm, getTojiFlyHeadsSwarmStatus
} from "./tojiFlyHeadsSwarm.js"
import {
  updateGokuBlackSwordCinematic, isGokuBlackSwordCinematicActive, drawGokuBlackSwordCinematic,
  clearGokuBlackSwordCinematic, getGokuBlackSwordCinematicStatus
} from "./gokuBlackSwordCinematic.js"
import {
  updateRedRangerPowerSwordCinematic, isRedRangerPowerSwordCinematicActive, drawRedRangerPowerSwordCinematic,
  clearRedRangerPowerSwordCinematic, getRedRangerPowerSwordCinematicStatus
} from "./redRangerPowerSwordCinematic.js"
import {
  activateMangekyouCinematic, updateMangekyouCinematic, isMangekyouCinematicActive,
  drawMangekyouCinematic, clearMangekyouCinematic, getMangekyouCinematicStatus
} from "./mangekyouCinematic.js"
import {
  updateVegetaFinalFlashCinematic, isVegetaFinalFlashCinematicActive, drawVegetaFinalFlashCinematic,
  clearVegetaFinalFlashCinematic, getVegetaFinalFlashCinematicStatus
} from "./vegetaFinalFlashCinematic.js"
import {
  updateBeerusKiBallCinematic, isBeerusKiBallCinematicActive, drawBeerusKiBallCinematic,
  clearBeerusKiBallCinematic, getBeerusKiBallCinematicStatus
} from "./beerusKiBallCinematic.js"
import {
  updateBen10OmnitrixCinematic, isBen10OmnitrixCinematicActive, drawBen10OmnitrixCinematic,
  clearBen10OmnitrixCinematic, getBen10OmnitrixCinematicStatus
} from "./ben10OmnitrixCinematic.js"
import {
  updateBatmanDarkKnightCinematic, isBatmanDarkKnightCinematicActive, drawBatmanDarkKnightCinematic,
  clearBatmanDarkKnightCinematic, getBatmanDarkKnightCinematicStatus
} from "./batmanDarkKnightCinematic.js"
import {
  updateOmniManBodySlamCinematic, isOmniManBodySlamCinematicActive, drawOmniManBodySlamCinematic,
  clearOmniManBodySlamCinematic, getOmniManBodySlamCinematicStatus
} from "./omnimanBodySlamCinematic.js"
import {
  updateSupermanUltimateCinematic, isSupermanUltimateCinematicActive, drawSupermanUltimateCinematic,
  clearSupermanUltimateCinematic, getSupermanUltimateCinematicStatus
} from "./supermanUltimateCinematic.js"
import {
  updateRengokuFlameExplosionCinematic, isRengokuFlameExplosionCinematicActive, drawRengokuFlameExplosionCinematic,
  clearRengokuFlameExplosionCinematic, getRengokuFlameExplosionCinematicStatus
} from "./rengokuFlameExplosionCinematic.js"
import {
  updateMadaraTengaiShinseiCinematic, isMadaraTengaiShinseiCinematicActive, drawMadaraTengaiShinseiCinematic,
  clearMadaraTengaiShinseiCinematic, getMadaraTengaiShinseiCinematicStatus
} from "./madaraTengaiShinseiCinematic.js"
import {
  updateHashiramaSealingJutsuCinematic, isHashiramaSealingJutsuCinematicActive, drawHashiramaSealingJutsuCinematic,
  clearHashiramaSealingJutsuCinematic, getHashiramaSealingJutsuCinematicStatus
} from "./hashiramaSealingJutsuCinematic.js"
import {
  updatePainChibakuTenseiCinematic, isPainChibakuTenseiCinematicActive, drawPainChibakuTenseiCinematic,
  clearPainChibakuTenseiCinematic, getPainChibakuTenseiCinematicStatus
} from "./painChibakuTenseiCinematic.js"
import {
  updateYujiUltimateCinematic, isYujiUltimateCinematicActive, drawYujiUltimateCinematic,
  clearYujiUltimateCinematic, getYujiUltimateCinematicStatus
} from "./yujiUltimateCinematic.js"
import {
  updateShinobuButterflyCinematic, isShinobuButterflyCinematicActive, drawShinobuButterflyCinematic,
  clearShinobuButterflyCinematic, getShinobuButterflyCinematicStatus
} from "./shinobuButterflyCinematic.js"
import {
  updateInosukeBeastCinematic, isInosukeBeastCinematicActive, drawInosukeBeastCinematic,
  clearInosukeBeastCinematic, getInosukeBeastCinematicStatus
} from "./inosukeBeastCinematic.js"
import {
  updateMakiShibuyaCinematic, isMakiShibuyaCinematicActive, drawMakiShibuyaCinematic,
  clearMakiShibuyaCinematic, getMakiShibuyaCinematicStatus
} from "./makiShibuyaCinematic.js"
import {
  updateGhostfaceFinalActCinematic, isGhostfaceFinalActCinematicActive, drawGhostfaceFinalActCinematic,
  clearGhostfaceFinalActCinematic, getGhostfaceFinalActCinematicStatus
} from "./ghostfaceFinalActCinematic.js"
import {
  updateMiwaUltimateCinematic, isMiwaUltimateCinematicActive, drawMiwaUltimateCinematic,
  clearMiwaUltimateCinematic, getMiwaUltimateCinematicStatus
} from "./miwaUltimateCinematic.js"
import {
  updateIchigoGetsugaCinematic, isIchigoGetsugaCinematicActive, drawIchigoGetsugaCinematic,
  clearIchigoGetsugaCinematic, getIchigoGetsugaCinematicStatus
} from "./ichigoGetsugaTenshoCinematic.js"
import {
  updateEdoTenseiCinematic, isEdoTenseiCinematicActive, drawEdoTenseiCinematic,
  clearEdoTenseiCinematic, getEdoTenseiCinematicStatus
} from "./tobiramaEdoTenseiCinematic.js"
import { sound, SFX, MUSIC, MENU_PLAYLIST, menuTrackDisplayName } from "./sound.js"
import { pickRickVoice, RICK_VOICE } from "./rickVoice.js"
import { pickKilluaVoice, KILLUA_VOICE, KILLUA_CHARGE_COMPLETE_SFX } from "./killuaVoice.js"
import { pickGonVoice, GON_VOICE } from "./gonVoice.js"
import { pickHisokaVoice, HISOKA_VOICE } from "./hisokaVoice.js"
import { pickGhostfaceVoice, GHOSTFACE_VOICE } from "./ghostfaceVoice.js"   // Ghostface intro + win voice pools (audio-only)
import { pickMinatoVoice, MINATO_VOICE } from "./minatoVoice.js"
import { pickBatmanVoice, BATMAN_VOICE } from "./batmanVoice.js"
import { pickOmniManVoice, OMNIMAN_VOICE } from "./omnimanVoice.js"
import { pickSupermanVoice, SUPERMAN_VOICE } from "./supermanVoice.js"
import { pickTobiramaVoice, TOBIRAMA_VOICE } from "./tobiramaVoice.js"
import { pickFlashVoice, FLASH_VOICE } from "./flashVoice.js"
import { pickItachiVoice, ITACHI_VOICE } from "./itachiVoice.js"
// Sukuna voice pack DELETED 2026-08-04 (audio-only removal) — sukunaVoice.js/pickSukunaVoice gone.
import { pickSaikiVoice } from "./saikiVoice.js"
import { pickSkinVoice, GOJOYOUNG_VOICE } from "./gojoVoice.js"   // per-skin voice override (Gojo "Limitless" young pack)
import { pickZenitsuVoice, ZENITSU_VOICE } from "./zenitsuVoice.js"   // Zenitsu intro voice pool + harness hooks (audio-only)
import { pickRengokuVoice, RENGOKU_VOICE } from "./rengokuVoice.js"   // Rengoku intro/win voice pools + harness hooks (audio-only)
import { pickShinobuVoice, SHINOBU_VOICE } from "./shinobuVoice.js"   // Shinobu intro voice pool + harness hooks (audio-only)
import { pickInosukeVoice, INOSUKE_VOICE } from "./inosukeVoice.js"   // Inosuke intro/win voice pools + harness hooks (audio-only)
import { pickNezukoVoice, NEZUKO_VOICE } from "./nezukoVoice.js"   // Nezuko intro/win grunt pools + harness hooks (audio-only; muffled — no dialogue)
import { pickMiwaVoice, MIWA_VOICE } from "./miwaVoice.js"   // Miwa intro(+taunt)/win voice pools (audio-only, JP dub)
import { pickMadaraVoice, MADARA_VOICE } from "./madaraVoice.js"   // Madara intro(+taunt)/win voice pools (audio-only, JA)
import { pickHashiramaVoice, HASHIRAMA_VOICE } from "./hashiramaVoice.js"   // Hashirama intro(+taunt)/win/clone voice pools (audio-only, JA)
import { pickPainVoice, PAIN_VOICE } from "./painVoice.js"   // Pain intro(+taunt)/win voice pools (audio-only, JA)
import { pickObitoVoice, OBITO_VOICE } from "./obitoVoice.js"   // Obito intro(+taunt)/win voice pools (audio-only, JA)
import { TOBI_VOICE } from "./tobiVoice.js"                     // Tobi (masked Obito alias) intro voice pool (audio-only, JA — separate module from Obito)
import { pickZarakiVoice, ZARAKI_VOICE } from "./zarakiVoice.js"   // Zaraki intro/taunt/win voice pools (audio-only, JA)
import { pickIchigoVoice, ICHIGO_VOICE } from "./ichigoVoice.js"   // Ichigo intro(+taunt)/win voice pools (audio-only, JA)
import { pickSukunaVoice, SUKUNA_VOICE, getSukunaVoiceLang, setSukunaVoiceLang } from "./sukunaVoice.js"   // Sukuna intro(+taunt)/win voice pools (audio-only; JA default, EN switchable)
import { pickYujiVoice, YUJI_VOICE, setYujiVoiceLang, getYujiVoiceLang } from "./yujiVoice.js"   // Yuji intro/win voice pools (audio-only; EN+JA, JA active)
import { pickTojiVoice, TOJI_VOICE, setTojiVoiceLang, getTojiVoiceLang } from "./tojiVoice.js"   // Toji intro/win voice pools (audio-only; EN+JA, JA active)
import {
  createMatchStats, createVictoryState, recordHit, recordRoundEnd,
  drawRoundCountdown, drawRoundBreak as drawRoundBreakFlow,
  drawVictoryScreen, drawMatchIntro, drawLowHealthWarning, drawRoundTimer, drawSusanooTimer,
  updateVictoryState, handleVictoryClick, handleVictoryKey, resetFighterForRematch
} from "./matchflow.js"
import {
  startMatchEntryTransition, updateMatchEntryTransition, setMatchEntryTransitionDuration,
  drawMatchEntryTransition, matchEntryTransitionStatus
} from "./matchEntryTransition.js"
import {
  startRiftTransition, updateRiftTransition, drawRiftTransition, riftTransitionStatus
} from "./riftTransition.js"

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

// ── SCROLLABLE CARD GRIDS (character / Edo vessel / FFA pick / Omnitrix loadout) ──────────────
// The card-grid draw + layout (ui.js) is scroll-aware; this is the CONSUMER side that drives it:
// mouse-wheel / trackpad, a draggable scrollbar thumb, and reset-to-top on screen entry. Every screen
// that shows a card grid taller than the viewport routes through activeScrollGrid() — ONE source of
// truth so a future grid gets scroll for free by adding a case here (no per-screen listeners, no
// hardcoded row counts). While a grid fits, maxOffset is 0 and all of this is a silent no-op.
function activeScrollGrid() {
  switch (gameState) {
    case GAME_STATES.SELECT_CHARACTER:  return { roster: getCharacterRosterForSelectedUniverse(), opts: charSelectGridOpts(canvas, true) }
    case GAME_STATES.SELECT_EDO_BACKUP: return { roster: getEdoBackupRoster(),                     opts: CHAR_GRID_OPTS }
    case GAME_STATES.FFA_CHARSELECT:    return { roster: ffaSelectableRoster(),                     opts: CHAR_GRID_OPTS }
    case GAME_STATES.SELECT_ALIENS:     return { roster: getAlienPoolList(),                        opts: alienGridOpts(canvas) }
    default: return null
  }
}

canvas.addEventListener("wheel", e => {
  // CREDITS screen consumes wheel to scroll the attribution list (Stage 18).
  if (gameState === GAME_STATES.CREDITS) {
    e.preventDefault()
    creditsScroll = Math.max(0, Math.min(_creditsMaxScroll(), creditsScroll + e.deltaY))
    return
  }
  const g = activeScrollGrid()
  if (!g) return
  e.preventDefault()   // keep the page from scrolling; the grid consumes the delta
  scrollGridBy(g.opts.scrollKey, e.deltaY, g.roster.length, canvas, g.opts)
}, { passive: false })

// Scrollbar thumb drag + track-jump. mouse.x/mouse.y are the canvas-space coords every other
// hit-test uses (kept current by setupMouseInput's mousemove handler).
let _gridDrag = null   // { g, grabY, startOffset, range } while dragging the thumb
canvas.addEventListener("mousedown", () => {
  const g = activeScrollGrid()
  if (!g) return
  const bar = getGridScrollbar(g.roster.length, canvas, g.opts)
  if (!bar) return
  const range = Math.max(1, bar.track.h - bar.thumb.h)
  if (pointInRect(mouse.x, mouse.y, bar.thumb)) {
    _gridDrag = { g, grabY: mouse.y, startOffset: bar.offset, range, maxOffset: bar.maxOffset }
  } else if (pointInRect(mouse.x, mouse.y, bar.track)) {
    // Click on the empty track → jump the thumb (centered) to that spot.
    const frac = Math.max(0, Math.min(1, (mouse.y - bar.track.y - bar.thumb.h / 2) / range))
    setGridScroll(g.opts.scrollKey, frac * bar.maxOffset, g.roster.length, canvas, g.opts)
  }
})
canvas.addEventListener("mousemove", () => {
  if (!_gridDrag) return
  const { g, grabY, startOffset, range, maxOffset } = _gridDrag
  const target = startOffset + ((mouse.y - grabY) / range) * maxOffset
  setGridScroll(g.opts.scrollKey, target, g.roster.length, canvas, g.opts)
})
const _endGridDrag = () => { _gridDrag = null }
window.addEventListener("mouseup", _endGridDrag)
canvas.addEventListener("mouseleave", _endGridDrag)

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

// ── EXPORT / IMPORT (17D) — manual backup that works on EVERY browser (Safari incl.) ──
// Export downloads the current snapshot via a blob URL (no picker, no permission). Import
// reads a chosen file and runs it through account.js's load+migration path, then hydrates
// the live modules — so unlock flags / audio settings / progression round-trip exactly.
function doExportSave() {
  const ok = downloadText(exportSaveFilename(), exportSaveText(), "application/json")
  _saveUiMsg = ok ? "Exported to your downloads." : "Export unavailable here."
}
function doImportSave() {
  if (typeof document === "undefined") return
  if (!_saveImportInput) {
    _saveImportInput = document.createElement("input")
    _saveImportInput.type = "file"; _saveImportInput.accept = "application/json,.json"
    _saveImportInput.style.display = "none"
    _saveImportInput.addEventListener("change", () => {
      const file = _saveImportInput.files && _saveImportInput.files[0]
      _saveImportInput.value = ""   // allow re-picking the same file later
      if (!file) return
      file.text().then(text => {
        const n = importSaveText(text)
        if (n > 0) { hydrateFromLoadedSave(); _saveUiMsg = `Imported ${n} profile${n === 1 ? "" : "s"}.` }
        else _saveUiMsg = "Import failed — not a valid save file."
      }).catch(() => { _saveUiMsg = "Import failed — could not read file." })
    })
    document.body.appendChild(_saveImportInput)
  }
  _saveImportInput.click()
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
  CREDITS:          "credits",         // scrolling art/audio/attribution screen (Stage 18)
  GAMEPLAY_SELECT:  "gameplaySelect",
  TOWER_SELECT:     "towerSelect",     // pick a Tower tier (3/10/25/40/∞ floors)
  ARCADE_SETUP:     "arcadeSetup",     // pick arcade difficulty (fixed for the run) — Stage 19
  ARCADE_RIVAL_INTRO: "arcadeRivalIntro", // pre-rival two-line exchange (fight 5)
  ARCADE_ENDING:    "arcadeEnding",    // per-character ending slides after a clear
  BRACKET_SETUP:    "bracketSetup",    // local tournament: pick size + your fighter (Stage 24B)
  BRACKET_VIEW:     "bracketView",     // tournament bracket tree between matches
  FFA_SETUP:        "ffaSetup",        // free-for-all: choose player count (3/4)
  FFA_CHARSELECT:   "ffaCharSelect",   // free-for-all: pick a fighter per slot
  FFA_SLOTSELECT:   "ffaSlotSelect",   // free-for-all: assign each slot to a human device or AI (+ difficulty)
  FFA_TEAMSELECT:   "ffaTeamSelect",   // free-for-all: assign each slot to Team A/B (or none)
  FFA_BATTLE:       "ffaBattle",       // free-for-all: N-fighter last-standing / team match
  AI_DIFFICULTY:    "aiDifficulty",
  AI_VS_AI_SETUP:   "aiVsAiSetup",     // spectator/testing: pick 2 chars + 2 difficulties + match count + speed
  AI_VS_AI_SUMMARY: "aiVsAiSummary",   // spectator/testing: run-complete summary + log export
  SELECT_UNIVERSE:  "selectUniverse",
  SELECT_CHARACTER: "selectCharacter",
  SELECT_SKIN:      "selectSkin",
  SELECT_ALIENS:    "selectAliens",
  SELECT_EDO_BACKUP: "selectEdoBackup",   // Tobirama-only detour: pick the Edo Tensei summon (any built roster char)
  SELECT_STAGE:     "selectStage",
  BATTLE:           "battle",
  ROUND_BREAK:      "roundBreak",
  MATCH_END:        "matchEnd",
  PAUSED:           "paused",
  VICTORY:          "victory",
  INTRO:            "intro",
  ONLINE_PLACEHOLDER: "onlinePlaceholder",   // dev-unlocked Online stub (no netcode)
  STORY_MODE:         "storyMode"            // Stage 14: UI placeholder only (styled "coming soon" card)
}

// ------------------------------------------------------------------
// CONTROLS
// ------------------------------------------------------------------
// CANONICAL INPUT SCHEME — W A S D U I O P J K L + ; (dedicated block).
//   W=jump/up  A=left  S=crouch/down (NO LONGER blocks)  D=right  (double-tap A/D = dash)
//   J=light  K=heavy  I=up-attack/launcher  L=special  U=ultimate/domain  O=grab
//   P=charge (HOLD) / per-character toggle (TAP — Gojo: Infinity).
//   ; = BLOCK (dedicated guard button — MK-feel Stage 1c moved guard off Down; gamepad = Circle).
// `dash` is intentionally unbound to a key ("") — dashing is double-tap A/D.
// `toggle` shares the P key; tap-vs-hold is disambiguated on keyup (handleChargeTap).
const P1_CONTROLS = {
  left: "a", right: "d", up: "w", down: "s", jump: "w",
  light: "j", heavy: "k", upAttack: "i", special: "l", ultimate: "u",
  grab: "o", charge: "p", toggle: "p", transform: "p", dash: "", block: ";"   // ; = dedicated guard (MK-feel Stage 1c; Down no longer blocks)
}
// P2 (local-versus only) must use physically-distinct keys, so it necessarily
// falls outside the 11-key rule; arrows + a right-hand cluster mirror P1's layout.
const P2_CONTROLS = {
  left: "arrowleft", right: "arrowright", up: "arrowup", down: "arrowdown", jump: "arrowup",
  light: "1", heavy: "2", upAttack: "3", special: "4", ultimate: "5",
  grab: "6", charge: "7", toggle: "7", transform: "7", dash: "", block: "/"   // / = dedicated guard (near P2's arrows)
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
  grab: "p3_grab", charge: "p3_charge", toggle: "p3_charge", transform: "p3_charge", dash: "", block: "p3_block"
}
const P4_CONTROLS = {
  left: "p4_left", right: "p4_right", up: "p4_up", down: "p4_down", jump: "p4_up",
  light: "p4_light", heavy: "p4_heavy", upAttack: "p4_upAttack", special: "p4_special", ultimate: "p4_ultimate",
  grab: "p4_grab", charge: "p4_charge", toggle: "p4_charge", transform: "p4_charge", dash: "", block: "p4_block"
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
  dragonball:  "DB_3.mp3",   // only real DB track on disk; both DB stages share it (DB_1/DB_2 never existed)
  demonslayer: null,   // TODO: e.g. "demonslayer_theme.mp3"
  rickmorty:   null,   // TODO: e.g. "rickmorty_theme.mp3"
  ben10:       null,   // TODO: e.g. "ben10_theme.mp3"
  // Universe stages (added with the 8 gap-universe maps) — no track sourced yet → procedural theme.
  bleach:       null,  // TODO: e.g. "bleach_theme.mp3"
  dc:           null,  // TODO
  horror:       null,  // TODO
  hxh:          null,  // TODO
  invincible:   null,  // TODO
  powerrangers: null,  // TODO
  saiki:        null,  // TODO
  original:     null,  // TODO
  other:       null
}

// Pre-match name-call clips, keyed by rosterKey (same shape as SERIES_MUSIC). Any
// character NOT listed here simply gets NO announcement beat — the pre-countdown
// sequence skips that fighter cleanly (see beginNamecallSequence). Case-sensitive.
const NAMECALL_AUDIO = {
  naruto:     "naruto_namecall.mp3",
  gojo:       "gojo_namecall.mp3",
  // sukuna namecall DELETED 2026-08-04 (voice removal) — no entry = pre-match sequence skips Sukuna cleanly.
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
  { name: "Jujutsu High Courtyard", series: "jjk",         music: "JJk_3.mp3", landmark: "jujutsu_high", sky: "#87bfff", mid: "#6aa86a", floor: "#556b2f", accent: "#cbd5e1", backgroundImage: "jujutsu_high_courtyard.png" },
  // STAGE INTERACTABLES 2nd pilot: a crimson "cursed rail" hazard (same stageHazards.js mechanic; `tint`
  // recolors the pylon glow so it reads as cursed-energy, not the Test Map's electric one).
  { name: "Shibuya Incident",       series: "jjk",         music: "JJK_2.mp3", landmark: "shibuya",      sky: "#0b1022", mid: "#1f2937", floor: "#111827", accent: "#ef4444", backgroundImage: "shibuya_incident_bg.png",
    hazards: [{ id: "cursed_rail", x: 1180, w: 46, height: 150, damage: 55, hitstun: 26, tint: "#ef4444" }] },
  { name: "Hidden Leaf Village",    series: "naruto",      landmark: "hidden_leaf",  sky: "#bfdbfe", mid: "#86efac", floor: "#a16207", accent: "#22c55e" },
  { name: "Valley of the End",      series: "naruto",      music: "Anime Kei - Bad Situation (Naruto Sad).mp3", landmark: "valley_of_end",sky: "#9fb6c9", mid: "#5b7184", floor: "#2f3b46", accent: "#e2e8f0", backgroundImage: "valley_of_the_end_bg.png" },
  { name: "Planet Namek",           series: "dragonball",  landmark: "namek",        sky: "#5eead4", mid: "#34d399", floor: "#15803d", accent: "#fef08a" },
  { name: "World Tournament Arena", series: "dragonball",  landmark: "tournament",   sky: "#93c5fd", mid: "#fde68a", floor: "#b45309", accent: "#ffffff" },
  { name: "Mugen Train",            series: "demonslayer", landmark: "mugen_train",  sky: "#0c1330", mid: "#241a3a", floor: "#1a1326", accent: "#f59e0b", backgroundImage: "mugen_train_bg.png" },
  { name: "Citadel of Ricks",       series: "rickmorty",   landmark: "citadel",      sky: "#11182b", mid: "#1e293b", floor: "#0f172a", accent: "#39ff14" },
  { name: "Null Void",              series: "ben10",       landmark: "null_void",    sky: "#1a0b2e", mid: "#2e1065", floor: "#170a28", accent: "#22d3ee" },
  // ── UNIVERSE STAGES — fill the 8 gap universes that previously fell back to the generic "other" maps.
  // No dedicated background art on disk → each renders via a bespoke procedural landmark (ui.js
  // drawStageLandmarks), same as Hidden Leaf / Namek / etc. `music` UNSET → series fallback (currently
  // null → procedural theme); real per-stage tracks are a separate follow-up. Palettes chosen distinct
  // from all existing entries. Home-stage routing added via _UNIVERSE_SERIES + SERIES_MUSIC below.
  // `music` below = INTERIM PLACEHOLDER tracks pulled from the existing on-disk library (no official
  // universe themes exist yet). Each is a real, verified file and a one-line swap once real themes are
  // sourced; until then a distinct track per stage beats the procedural fallback.
  { name: "Soul Society",           series: "bleach",       music: "jhene__aiko_-_stay_ready__instrumental_.mp3", landmark: "seireitei",       sky: "#f2d5c4", mid: "#dbe3ec", floor: "#7d8794", accent: "#c8a24a" },
  { name: "Gotham Rooftops",        series: "dc",           music: "Future___Young_Thug_-_No_Cap__Official_Audio_.mp3", landmark: "gotham",          sky: "#0e1a1e", mid: "#16232a", floor: "#0a1114", accent: "#fcd34d" },
  { name: "Woodsboro",              series: "horror",       music: "Noble_f3mii_Instrumental.mp3", landmark: "woodsboro",       sky: "#20293e", mid: "#2b3446", floor: "#181c26", accent: "#b91c1c" },
  { name: "Heaven's Arena",         series: "hxh",          music: "Rochelle_Jordan_-_Lowkey___sped_up__.mp3", landmark: "heavens_arena",   sky: "#c4b5fd", mid: "#7c6bb8", floor: "#3b2f63", accent: "#e879f9" },
  { name: "Viltrumite Warzone",     series: "invincible",   music: "needybounce.mp3", landmark: "viltrum_warzone", sky: "#3d2020", mid: "#2a1a1e", floor: "#160e10", accent: "#60a5fa" },
  { name: "Command Center",         series: "powerrangers", music: "neddy sped up.mp3", landmark: "command_center",  sky: "#f6c68a", mid: "#cf9560", floor: "#8f6038", accent: "#f43f5e" },
  { name: "PK Academy",             series: "saiki",        music: "Rema_-_Dumebi.mp3", landmark: "pk_academy",      sky: "#ffd6e8", mid: "#a7e8c4", floor: "#c9a878", accent: "#ff6ba3" },
  { name: "Analysis Nexus",         series: "original",     music: "love_nwantiti__feat__Dj_Yo____AX_EL___Remix_.mp3", landmark: "analysis_nexus",  sky: "#051a1f", mid: "#0a2e33", floor: "#04141a", accent: "#2dd4bf" },
  { name: "Shadow Garden",          series: "other",       landmark: "shadow_garden",sky: "#111827", mid: "#1f2937", floor: "#0f172a", accent: "#7c3aed" },
  // Neutral grid-floor TEST MAP — a plain reference stage (no series flavor). Standard 3200 world;
  // full-scroll background test_map_bg.png (2752x1536). A normal selectable stage, not FFA-only.
  // STAGE INTERACTABLES PILOT: one mid-stage "arc pylon" hazard (stageHazards.js) — a fighter knocked
  // into it takes contact damage + a wall-splat reaction. Data-driven → rollout to other stages is trivial.
  { name: "Test Map",               series: "other",       landmark: "test_map",     sky: "#aebccc", mid: "#c6bfb2", floor: "#8c8c94", accent: "#e5e7eb", backgroundImage: "test_map_bg.png",
    hazards: [{ id: "arc_pylon", x: 2000, w: 46, height: 156, damage: 55, hitstun: 26 }] },
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
// COMEBACK FINISHER — once-per-MATCH usage, keyed by side. Fighters are recreated each round
// (resetRound), so the match-level token lives here, not on the fighter. Reset in startMatch.
let comebackFinisherUsed = { p1: false, p2: false, p3: false, p4: false }
// INSTANT MATCH-END OVERRIDE — set by a sudden-death mechanic (Gon Adult Form "Final Blow") to force an
// immediate match winner, INDEPENDENTLY of the normal roundWins>=2 / MAX_ROUNDS logic. `{ winnerSide }`
// or null. Consumed (one-shot) inside _checkMatchOver(). See forceMatchEnd() / _updateGonSuddenDeath().
let _matchOverride   = null
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
let _koStamp = 0, _koStampMax = 0   // Stage 9: angular "K.O." slam stamp (over the white KO flash)
let _roundEndAudioStopped = false   // latch so the round-end voice/SFX stop fires ONCE per round
let slowdownTimer  = 0
let slowdownTarget = null
let hoverThrottle  = 0

const comboDisplay = {
  // pop = per-increment scale punch (kicked to 1 each time the count climbs, decays each frame);
  // prevCount tracks the last displayed count so we only punch on a genuine new hit.
  p1: { opacity: 0, fadeDir: "out", lastCount: 0, holdTimer: 0, pop: 0, prevCount: 0 },
  p2: { opacity: 0, fadeDir: "out", lastCount: 0, holdTimer: 0, pop: 0, prevCount: 0 }
}

const allCharacterKeys = Object.keys(characters).filter(k => !characters[k].hidden)
const universeMap      = buildUniverseMap()
const universeKeys     = Object.keys(universeMap)

let hoverStartIndex      = 0
let hoverGameplayIndex   = 0
let hoverTowerIndex      = 0
let hoverArcadeIndex     = 0
let hoverBracketIndex    = 0
let characterLockMsg     = ""   // transient "X — Reach Level N" shown when a locked fighter is clicked (Stage 21)
let hoverFFAIndex        = 0
let hoverFFACharIndex    = 0
let hoverFFASlotIndex    = 0
let hoverFFATeamIndex    = 0
let hoverDifficultyIndex = 0
let hoverAiVsAiIndex     = 0     // AI-vs-AI setup screen row
let hoverAiVsAiSummaryIndex = 0  // AI-vs-AI run-complete summary row
let hoverUniverseIndex   = 0
let hoverCharacterIndex  = 0
let hoverEdoBackupIndex  = 0   // Edo Tensei vessel-select grid hover
let hoverStageIndex      = 0
let hoverMainMenuIndex   = 0
let _storyBackHover      = false   // Stage 14: STORY_MODE placeholder BACK-button hover
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
  modifiers:        [],   // Stage 24A: active match modifiers (Tower floors assign these)
  selectedUniverse: null,
  selectingSide:    "p1",
  selectedStage:    null,
  p1Char: null, p2Char: null,
  p1CharKey: null, p2CharKey: null,
  // Ben 10: the 5 aliens each player picked, plus the in-progress draft.
  p1Aliens: null, p2Aliens: null,
  alienDraft: [], alienSelectSide: "p1",
  // Skins (Task 4): selected skin id per side; default until the skin-select picks one.
  p1Skin: "default", p2Skin: "default",
  // Stage 11A: the gameplay-RNG seed this match was started from (stamped in startMatch). Captured so
  // the exact match can later be reproduced/replayed. NOT persisted to the save file (per-match only).
  seed: null
}

// Stage 11A: harness/replay override — when set (a number), startMatch seeds the match RNG from THIS
// instead of a fresh makeSeed(). Null in all normal play (every match gets a fresh seed). Replay
// playback (11B) and determinism tests set it to reproduce an exact match.
let _forcedSeed = null

// Stage 11B: replay recording state. _replayFrame is the 0-based battle-frame index (resets per match,
// advances only on real battle frames); _lastReplay holds the finalized replay of the most recent match
// (for the victory-screen "Save Replay" in 11D / the harness). Recording runs for the standard
// two-fighter modes only — FFA (N fighters, different input model) and AI-vs-AI (fully seed-reproducible)
// are skipped.
let _replayFrame = 0
let _lastReplay  = null
const RECORDED_MODES = new Set(["vs", "pvp", "tower", "training"])
function shouldRecordMatch() { return !!(p1 && p2) && RECORDED_MODES.has(matchConfig.mode) }

// Apply a selected skin's complete animationData (own + borrowed) + display scale
// onto a fighter. null skinAnim = the character's default art. Per-fighter, so a
// mirror match can have two different skins.
function applySkin(fighter, skinId) {
  if (!fighter) return
  // GHOSTFACE has NO base identity — there is no plain "Ghostface", only one of the 5 killers wearing the
  // mask. Enforce it at this ONE choke point (every fighter-creation path — 1v1, Tower, vs-AI, FFA/Team,
  // harness — calls applySkin): any non-identity skinId (the removed "default", an invalid id, or an
  // AI/random/Tower/FFA fighter that was handed "default") resolves to a killer identity. An explicit
  // player pick (one of the 5) passes through unchanged; only the fallback/AI paths draw a RANDOM identity —
  // so Ghostface can never exist without one.
  if (fighter.rosterKey === "ghostface") {
    const ids = Object.keys(GHOSTFACE_SKIN_MODS)   // the 5 killer identities (single source of truth)
    if (!ids.includes(skinId)) skinId = ids[Math.floor(Math.random() * ids.length)]
  }
  fighter._skinAnim = getSkinAnimationData(fighter.rosterKey, skinId)
  const skin = getSkin(fighter.rosterKey, skinId)
  // Alt-color recolor skins carry a `recolorTag`. Stash it + the recoloured BASE anim so a
  // transform (Vegeta SSJ/Blue, Goku Black Rose) can retag its form art and a revert can restore
  // the recoloured base (see abilities.js retagFormAnim). Non-recolor skins clear both.
  fighter._recolorTag  = skin?.recolorTag || null
  fighter._baseSkinAnim = fighter._skinAnim
  if (skin?.spriteScale) fighter.spriteScale = skin.spriteScale
  // A skin may carry a colour wash (Task 4 "Pink Fit" = default art + pink tint,
  // since no bespoke pink sheets exist). applyMirrorTint() reads skinTint and sets
  // tintColor; null clears it so non-tinted skins render natively.
  fighter.skinTint = skin?.skinTint || null
  fighter.skinId = skinId
  fighter._voidFX = null   // drop any prior Void Form starfield; it regenerates on next draw if re-applied
  fighter._pzFX = null     // drop any prior Phantom Zone spectral overlay likewise
  fighter._emberFX = null  // drop any prior Void Ember overlay likewise (Rengoku)
  fighter._nezukoEmberFX = null   // drop any prior Nezuko Void Sovereign ember overlay likewise
  fighter._portalFX = null // drop any prior Portal Void swirl overlay likewise (Rick)
  // GHOSTFACE per-identity GAMEPLAY modifier (project-first exception: these skins are NOT cosmetic-only).
  // Stamp the resolved mod object onto the fighter; combat.js / physics.js / abilities.js READ it off the
  // fighter (no imports → no cycles). null for the default skin / every other character.
  fighter._gfSkinMod = (fighter.rosterKey === "ghostface" && GHOSTFACE_SKIN_MODS[skinId]) || null
  // GHOSTFACE Call-In: default the selected companion to the active identity's first pool member (so a
  // skin switch always leaves a valid, in-pool partner). Players/harness can re-select within the pool.
  if (fighter.rosterKey === "ghostface") {
    const pool = getGhostfaceCallInPool(fighter)
    if (!fighter._callInPartner || !pool.includes(fighter._callInPartner)) fighter._callInPartner = pool[0] || null
  }
}

// GHOSTFACE KILLER-IDENTITY MODIFIERS — the ONLY project-wide skins that alter gameplay (deliberate,
// confirmed design). Same shared moveset across all 5; each skin only nudges frame/cost/movement values
// on SPECIFIC moves (not new content). Read via fighter._gfSkinMod at the relevant hooks.
const GHOSTFACE_SKIN_MODS = {
  ghostfaceBilly:  { lungeStartupScale: 0.5 },                    // Billy: faster Gutting Lunge (approach) startup
  ghostfaceDebbie: { deceptiveHurt: true },                       // Debbie: hit-react pose mismatched from real dmg (VISUAL ONLY)
  ghostfaceRoman:  { swapCostScale: 0.65 },                       // Roman: Companion Swap costs 35% less Dread (23 vs 35) — his identity is enhanced companion access
  ghostfaceJill:   { jillCounter: true },                         // Jill: reactive bait-counter while idle (negate + riposte)
  ghostfaceAmber:  { fwdSpeedScale: 1.14, stickPressure: 0.45 },  // Amber: +move speed; hits push the foe LESS (harder to escape/juke her)
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

// Random opponent + random stage + escalating difficulty. Routed through the central BETA gate so a
// BETA session never spawns a spriteless (procedural-box) Tower opponent; falls back to the full roster
// only if the filter somehow empties (never, given the sprite roster is non-empty).
function _towerPickOpponent() {
  const pool = filterAllowedRosterKeys(allCharacterKeys)         // non-hidden roster, BETA-filtered
  const src = pool.length ? pool : allCharacterKeys
  return src[Math.floor(Math.random() * src.length)] || "gojo"
}
function _towerPickStage() {
  return stages[Math.floor(Math.random() * stages.length)] || stages[0]
}
// Force the current floor's RANDOM opponent + RANDOM stage + floor-scaled difficulty
// onto matchConfig (P1 unchanged). No player stage-select screen while a tower is active.
function applyTowerFloor() {
  if (!towerState.active) return
  matchConfig.modifiers = _towerFloorModifiers()   // Stage 24A: this floor's modifiers
  let opp = _towerPickOpponent()
  if (matchConfig.modifiers.includes("mirrorOnly")) opp = matchConfig.p1CharKey || opp   // mirror = fight yourself
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
    setTowerTierCleared(towerState.tierId)   // Stage 21: persist the tier clear (tower-gated unlocks)
    resetToStart()
    return
  }
  applyTowerFloor()
  towerState._applyCarry = true   // resetRound applies the carry-over health to P1
  victoryState = createVictoryState()
  startMatch()
}

// ══════════════════════════════════════════════════════════════════════════════
// MATCH MODIFIERS (Stage 24A) — a match-wide rule set (matchConfig.modifiers[]), applied to the
// freshly-created fighters each round in resetRound. Data-driven + near-zero cost. Tower floors
// (tier ≥ 2) assign them for variety; every other mode runs clean (empty modifiers).
// ──────────────────────────────────────────────────────────────────────────────
const MATCH_MODIFIERS = {
  doubleHealth: "Double Health", oneHitKO: "One-Hit KO", speedUp: "Hyper Speed",
  lowGravity: "Low Gravity", mirrorOnly: "Mirror Match", noBlock: "No Blocking", meterDrain: "Meter Drain"
}
const MODIFIER_POOL = Object.keys(MATCH_MODIFIERS)
const PHYSICS_DEFAULT_GRAVITY = physics.gravity   // capture the baseline so lowGravity can restore it
function hasModifier(id) { return Array.isArray(matchConfig.modifiers) && matchConfig.modifiers.includes(id) }
function activeModifierLabels() { return (matchConfig.modifiers || []).map(id => MATCH_MODIFIERS[id]).filter(Boolean) }
function _applyMatchModifiers() {
  // Gravity is a SHARED physics property → set per match; restore the baseline when not modified.
  physics.gravity = hasModifier("lowGravity") ? 0.42 : PHYSICS_DEFAULT_GRAVITY
  for (const f of [p1, p2]) {
    if (!f) continue
    if (hasModifier("doubleHealth")) { f.maxHealth = Math.round((f.maxHealth || 1000) * 2); f.health = f.maxHealth }
    if (hasModifier("speedUp"))      { f.baseSpeed = (f.baseSpeed || f.speed || 8) * 1.6; f.speed = f.baseSpeed; f.dashSpeed = (f.dashSpeed || 20) * 1.35 }
    if (hasModifier("oneHitKO"))     { f.maxHealth = 1; f.health = 1 }   // applied LAST → any clean hit KOs
    f._noBlock    = hasModifier("noBlock")
    f._meterDrain = hasModifier("meterDrain")
  }
}
// Tower floor → modifier assignment. Tier 1 is clean (learn the game); higher tiers spice floors,
// tier 4/5 can stack a second modifier on later floors. Deterministic by (floor, tier).
function _towerFloorModifiers() {
  if (!towerState.active || towerState.tier < 2) return []
  const fn = towerState.floor + 1, mods = []
  if (fn % 2 === 0 || towerState.tier >= 3) mods.push(MODIFIER_POOL[(fn + towerState.tier) % MODIFIER_POOL.length])
  if (towerState.tier >= 4 && fn % 3 === 0)  mods.push(MODIFIER_POOL[(fn * 2 + 1) % MODIFIER_POOL.length])
  return [...new Set(mods)]
}
// Modifier banner shown on the match intro (Stage 24A).
function _drawActiveModifiers() {
  const labels = activeModifierLabels()
  if (!labels.length) return
  ctx.save()
  ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = "800 15px Arial"
  const text = "⚡ " + labels.join("   ·   ") + " ⚡"
  const bw = ctx.measureText(text).width + 44, x = canvas.width / 2 - bw / 2, y = 66
  ctx.fillStyle = "rgba(120,40,20,0.88)"; ctx.fillRect(x, y, bw, 30)
  ctx.strokeStyle = "#f59e0b"; ctx.lineWidth = 2; ctx.strokeRect(x, y, bw, 30)
  ctx.fillStyle = "#ffd27f"; ctx.fillText(text, canvas.width / 2, y + 16)
  ctx.restore()
}

// ══════════════════════════════════════════════════════════════════════════════
// ARCADE MODE (Stage 19) — a FIXED 7-fight ladder built on the Tower engine.
// Parallel to towerState (arcadeState lives in arcade.js) so the two never interfere.
// Reuses: the opponent/stage pickers, health-carry (_applyCarry), and the victory→continue wiring.
// ──────────────────────────────────────────────────────────────────────────────
function isArcade() { return matchConfig.mode === "arcade" }

// ARCADE_ENDING playback clock.
let arcadeEndingSlides = []
let arcadeEndingIndex  = 0
let arcadeEndingStartMs = 0

function startArcade(difficulty = "adaptive") {
  arcadeState.active = true
  arcadeState.difficulty = difficulty
  arcadeState.fight = 0; arcadeState.continuesUsed = 0
  arcadeState.cleared = false; arcadeState.carryPct = 1
  arcadeState._lastWon = false; arcadeState._applyCarry = false
  arcadeState.endingPending = false; arcadeState.rosterKey = null
  matchConfig.mode = "arcade"
  resetSelections()
  beginUniverseSelect()   // player picks THEIR fighter; the ladder is generated per fight
}

function _arcadePickOpponent(exclude) {
  const pool = filterAllowedRosterKeys(allCharacterKeys).filter(k => k !== exclude)
  const src = pool.length ? pool : filterAllowedRosterKeys(allCharacterKeys)
  return src[Math.floor(Math.random() * src.length)] || "gojo"
}

// Force the current fight's opponent + difficulty + random stage onto matchConfig (P1 unchanged).
// normal → random; rival (fight 5) → the player's arcadeRival (or random if none); boss (fight 7)
// → the designated arcade boss (Stage 20 will layer its bossProfile buffs on top).
function applyArcadeFight() {
  if (!arcadeState.active) return
  if (!arcadeState.rosterKey) arcadeState.rosterKey = matchConfig.p1CharKey
  const fightNum = arcadeState.fight + 1
  const role = arcadeFightRole(fightNum)
  const player = matchConfig.p1CharKey
  let opp
  if (role === "boss")       opp = arcadeBossKey(player)
  else if (role === "rival") opp = arcadeRivalKey(player, characters) || _arcadePickOpponent(player)
  else                       opp = _arcadePickOpponent(player)
  matchConfig.p2CharKey     = opp
  matchConfig.p2Char        = characters[opp]
  matchConfig.p2IsBoss      = (role === "boss")   // Stage 20: only the final fight applies bossProfile
  matchConfig.aiDifficulty  = arcadeDifficultyForFight(arcadeState.difficulty, fightNum)
  matchConfig.selectedStage = _towerPickStage()
}

// Begin the current fight: the rival fight detours through the two-line intro first; every other
// fight goes straight to the match. Shared by the first fight (post-select) and continueArcade.
function _beginArcadeFight() {
  applyArcadeFight()
  if (arcadeFightRole(arcadeState.fight + 1) === "rival") { gameState = GAME_STATES.ARCADE_RIVAL_INTRO; return }
  startMatch()
}

// Called from _checkMatchOver. Win → per-fight XP + carry-over health (+ mark cleared after the
// boss); lose → small XP (a continue may follow). Advance/teardown happens on continue.
function updateArcadeOutcome(winner) {
  if (!arcadeState.active) return
  const fightNum = arcadeState.fight + 1
  if (winner === "p1") {
    arcadeState._lastWon = true
    awardXp(ARCADE_XP.perFight(fightNum))
    const pct = p1 ? Math.max(0, (p1.health || 0) / (p1.maxHealth || 1)) : 1
    arcadeState.carryPct = Math.min(1, pct + 0.30)
    if (fightNum >= ARCADE_BOSS_FIGHT) { arcadeState.cleared = true; arcadeState.endingPending = true }
  } else {
    arcadeState._lastWon = false
    awardXp(20)
  }
}

// From the victory screen. Win → advance (or, after the boss, roll the ending). Loss → spend a
// continue and refight the SAME fight ("MAIN MENU" ends the run instead — handled by the caller).
function continueArcade() {
  if (!arcadeState.active) { resetToStart(); return }
  if (arcadeState.endingPending) { _startArcadeEnding(); return }
  if (!arcadeState._lastWon) {
    arcadeState.continuesUsed++                 // CONTINUE — retry the same fight
    victoryState = createVictoryState()
    _beginArcadeFight()
    return
  }
  arcadeState.fight++
  victoryState = createVictoryState()
  arcadeState._applyCarry = true               // resetRound applies the carry-over health to P1
  _beginArcadeFight()
}

// Enter the ending: award the clear bonus + persist the clear, then present the slides. The run
// is over here (active=false) — the ending is pure presentation.
function _startArcadeEnding() {
  const key = arcadeState.rosterKey || matchConfig.p1CharKey
  const noContinue = arcadeState.continuesUsed === 0
  awardXp(ARCADE_XP.clearBonus + (noContinue ? ARCADE_XP.noContinueBonus : 0))
  setArcadeCleared(key, noContinue)   // Stage 19D — persists under acct.arcade (survives reload)
  // TODO(Stage 20): unlock the arcade boss as playable. TODO(Stage 22): unlock this char's alt palette.
  arcadeEndingSlides  = endingSlidesFor(key, characters)
  arcadeEndingIndex   = 0
  arcadeEndingStartMs = performance.now()
  arcadeState.endingPending = false
  arcadeState.active  = false
  gameState = GAME_STATES.ARCADE_ENDING
}
function _endArcadeEnding() { arcadeEndingSlides = []; resetToStart() }

// ── BOSS PROFILE (Stage 20) — data-driven boss buffs applied to the arcade final-boss opponent.
// Mutates a freshly-created fighter: 2× HP, visibly larger, free specials, and a super-armor
// threshold (light hits below it can't stagger/interrupt the boss → it can't be jabbed out of its
// own combos; there is no universal combo-breaker mechanic to be "immune" to, so this delivers that
// intent). aiDifficulty + single-round are handled where the fight is set up / resolved.
function _applyBossProfile(fighter, char) {
  const bp = char?.bossProfile
  if (!fighter || !bp) return
  fighter._isBoss   = true
  fighter._bossName = fighter.name || char?.name || "BOSS"
  fighter.maxHealth = Math.max(1, Math.round((fighter.maxHealth || 1000) * (bp.healthMult || 1)))
  fighter.health    = fighter.maxHealth
  if (bp.scale) fighter.spriteScale = (fighter.spriteScale || 1) * bp.scale       // visibly larger
  if (bp.meterFree) { fighter.infiniteEnergy = true; fighter.energy = fighter.maxEnergy }  // free specials
  if (bp.superArmorThreshold != null) { fighter._bossArmor = true; fighter._bossArmorThreshold = bp.superArmorThreshold }
}

// ══════════════════════════════════════════════════════════════════════════════
// LOCAL TOURNAMENT BRACKET (Stage 24B) — single-elimination, best-of-3, 4 or 8 entrants (the human
// is entrant 0; the rest are CPUs). The human plays their own path; all-CPU matches auto-resolve so
// the bracket runs to completion. Persisted to the account (Stage 17) so it survives a reload.
// ──────────────────────────────────────────────────────────────────────────────
let bracketState = null   // { size, entrants:[{key,name,ai}], rounds:[[{a,b,winner}]], round, matchIdx, champion }
let _pendingBracketSize = 4
function isBracket() { return matchConfig.mode === "bracket" && !!bracketState }

// Build the entrant field (human = entrant 0, chosen char; rest = random unlocked CPUs) and start.
function _buildAndStartBracket() {
  const size = _pendingBracketSize || 4
  const humanKey = matchConfig.p1CharKey || "gojo"
  const pool = Object.keys(characters).filter(k => !characters[k]?.hidden && rosterKeyAllowed(k) && isCharUnlocked(k) && k !== humanKey)
  const entrants = [{ key: humanKey, name: characters[humanKey]?.name || humanKey, ai: false }]
  for (let i = 1; i < size; i++) {
    const k = pool.length ? pool[Math.floor(Math.random() * pool.length)] : "gojo"
    entrants.push({ key: k, name: characters[k]?.name || k, ai: true })
  }
  startBracket(size, entrants)
}

function startBracket(size, entrants) {
  // entrants: [{ key, name, ai }] of length `size` (2,4,8). Round 0 pairs 0v1, 2v3, …
  const r0 = []
  for (let i = 0; i < size; i += 2) r0.push({ a: entrants[i], b: entrants[i + 1], winner: null })
  bracketState = { size, entrants, rounds: [r0], round: 0, matchIdx: 0, champion: null }
  matchConfig.mode = "bracket"
  _saveBracketState()
  _advanceToNextBracketMatch()
}
function _saveBracketState() { try { saveBracket(bracketState) } catch (_) {} }

function _currentBracketMatch() { return bracketState?.rounds[bracketState.round]?.[bracketState.matchIdx] || null }

// Play or auto-resolve the current match, skipping any that are already decided; build the next round
// when a round completes; crown the champion at the end.
function _advanceToNextBracketMatch() {
  if (!bracketState) return
  let m = _currentBracketMatch()
  // Skip already-decided matches; roll to the next round when this one is exhausted.
  while (bracketState.round < bracketState.rounds.length) {
    const round = bracketState.rounds[bracketState.round]
    if (bracketState.matchIdx >= round.length) {
      // Round done → build the next round from its winners (or crown champion).
      const winners = round.map(mm => mm.winner).filter(Boolean)
      if (winners.length === 1) { bracketState.champion = winners[0]; _saveBracketState(); _showBracketView(); return }
      const next = []
      for (let i = 0; i < winners.length; i += 2) next.push({ a: winners[i], b: winners[i + 1], winner: null })
      bracketState.rounds.push(next); bracketState.round++; bracketState.matchIdx = 0
      continue
    }
    m = round[bracketState.matchIdx]
    if (m.winner) { bracketState.matchIdx++; continue }     // already decided (resumed) → next
    // A match with a HUMAN is played; an all-CPU match auto-resolves.
    if (m.a.ai && m.b.ai) { m.winner = (Math.random() < 0.5 ? m.a : m.b); _saveBracketState(); bracketState.matchIdx++; continue }
    // Human match → set up the real 1v1 and show the bracket first (player clicks to fight).
    _saveBracketState(); _showBracketView(); return
  }
}
function _showBracketView() { gameState = GAME_STATES.BRACKET_VIEW }

// Start the actual match for the current (human) bracket pairing. The human always drives p1.
function _startBracketMatch() {
  const m = _currentBracketMatch()
  if (!m) return
  const human = m.a.ai ? m.b : m.a, opp = m.a.ai ? m.a : m.b
  bracketState._humanRef = human   // remember which entrant the human is THIS match
  matchConfig.mode = "bracket"
  matchConfig.p1CharKey = human.key; matchConfig.p1Char = characters[human.key]
  matchConfig.p2CharKey = opp.key;   matchConfig.p2Char = characters[opp.key]
  matchConfig.p1Skin = "default"; matchConfig.p2Skin = "default"
  matchConfig.aiDifficulty = "adaptive"
  matchConfig.modifiers = []
  matchConfig.selectedStage = matchConfig.selectedStage || _towerPickStage()
  startMatch()
}

// Called from _checkMatchOver. p1 won → the human's entrant advances; p2 won → the opponent does.
function updateBracketOutcome(winner) {
  const m = _currentBracketMatch()
  if (!m || !bracketState) return
  const human = bracketState._humanRef || (m.a.ai ? m.b : m.a), opp = (m.a === human) ? m.b : m.a
  m.winner = (winner === "p1") ? human : opp
  _saveBracketState()
  bracketState.matchIdx++
}

// From the victory screen (bracket match). Advance the bracket → next match / view / champion.
function continueBracket() {
  _advanceToNextBracketMatch()
  victoryState = createVictoryState()
  // _advanceToNextBracketMatch left us on BRACKET_VIEW (champion or next human match) or auto-resolved.
}

function endBracket() { bracketState = null; matchConfig.mode = null; try { clearBracket() } catch (_) {}; resetToStart() }

// Harness snapshot of the bracket (also used by the boot-resume hook).
function H_bracketInfo() {
  if (!bracketState) return { active: false, gameState }
  const m = _currentBracketMatch()
  return {
    active: true, gameState, size: bracketState.size, round: bracketState.round, matchIdx: bracketState.matchIdx,
    totalRounds: bracketState.rounds.length, champion: bracketState.champion?.key || null,
    current: m ? { a: m.a.key, b: m.b.key, aAI: m.a.ai, bAI: m.b.ai, winner: m.winner?.key || null } : null,
    entrants: bracketState.entrants.map(e => ({ key: e.key, ai: e.ai })),
    rounds: bracketState.rounds.map(r => r.map(mm => ({ a: mm.a.key, b: mm.b.key, winner: mm.winner?.key || null }))),
    p1: matchConfig.p1CharKey, p2: matchConfig.p2CharKey, mode: matchConfig.mode
  }
}

// Resume a persisted bracket at boot (Stage 17). Returns true if one was restored.
function resumeBracketIfSaved() {
  let saved = null
  try { saved = loadBracket() } catch (_) { saved = null }
  if (!saved || saved.champion) return false
  bracketState = saved
  matchConfig.mode = "bracket"
  return true
}

// Render the pre-rival exchange (ARCADE_RIVAL_INTRO). Opponent (p2) was set by applyArcadeFight.
function drawArcadeRivalIntro() {
  const playerKey = matchConfig.p1CharKey, rivalKey = matchConfig.p2CharKey
  const d = arcadeRivalDialogue(playerKey, rivalKey, characters)
  drawRivalIntroScreen(ctx, canvas, {
    playerKey, rivalKey,
    playerName: characters[playerKey]?.name || playerKey,
    rivalName:  characters[rivalKey]?.name || rivalKey,
    lines: d.pre
  })
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
    grab: p + "gr", charge: p + "ch", toggle: p + "ch", transform: p + "ch", dash: "", block: p + "blk"   // AI guard input (MK-feel Stage 1c)
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
    const _pAlive = _tickSparkParticles(spark)   // FFA path: same debris burst as the 1v1 loop
    if (spark.timer <= 0 && _pAlive === 0) hitSparks.splice(i, 1)
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
  revealClonesHitByProjectiles(activeProjectiles)   // decoy: projectile→clone poof (multi/FFA path)

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
const trainingState = { enabled: false, infiniteResources: false, dummyBehavior: "stand", cloneNoTell: false }
const DUMMY_BEHAVIORS = ["stand", "block", "jump"]
const _trainingKeyPrev = {}   // edge-detect the F2/F3/F4 training hotkeys

// ── SESSION PERSISTENCE (cross-reload restore of "what the player was doing") ─────────────────
// Snapshots menu selections + training toggles + unlock flags to localStorage (session.js) on any
// change, and restores them on page load. NEVER stores mid-match combat state: the persisted SCREEN
// is only ever a safe non-match menu/select state (anything else is stored as MAIN_MENU), so a reload
// during a fight lands on a clean menu — it does not resume the round. Selections are stored as stable
// KEYS/NAMES (not the live objects) and re-derived on restore.
// Screens safe to re-enter on reload (depend only on matchConfig, no multi-step draft/setup state).
const SESSION_RESTORABLE_SCREENS = new Set([
  GAME_STATES.MAIN_MENU, GAME_STATES.GAMEPLAY_SELECT, GAME_STATES.AI_DIFFICULTY,
  GAME_STATES.TOWER_SELECT, GAME_STATES.ARCADE_SETUP, GAME_STATES.SETTINGS, GAME_STATES.MOVE_LIST,
  GAME_STATES.SELECT_UNIVERSE, GAME_STATES.SELECT_CHARACTER, GAME_STATES.SELECT_SKIN,
  GAME_STATES.SELECT_STAGE
])
function _sessionSafeScreen() {
  // Non-restorable (a match / transient / multi-step-draft screen) collapses to the clean main menu.
  return SESSION_RESTORABLE_SCREENS.has(gameState) ? gameState : GAME_STATES.MAIN_MENU
}
function snapshotSession() {
  return {
    v: 1,
    screen: _sessionSafeScreen(),
    match: {
      mode:             matchConfig.mode,
      aiDifficulty:     matchConfig.aiDifficulty,
      selectedUniverse: matchConfig.selectedUniverse,
      selectedStage:    matchConfig.selectedStage?.name || null,   // stages have no id → key by unique name
      p1CharKey:        matchConfig.p1CharKey,
      p2CharKey:        matchConfig.p2CharKey,
      p1Skin:           matchConfig.p1Skin,
      p2Skin:           matchConfig.p2Skin,
      selectingSide:    matchConfig.selectingSide
    },
    training: {
      infiniteResources: trainingState.infiniteResources,
      dummyBehavior:     trainingState.dummyBehavior
    },
    unlocks: { dev: isDevUnlocked(), beta: isBetaUnlocked() }   // guests keep unlocks across reload too
  }
}
// Session persistence is ALWAYS on in real play. Under the test harness it is OFF by default (so the
// 40+ existing harness tests — which assume a reload resets in-memory flags — are untouched and never
// see cross-reload contamination); a test opts INTO the real behavior with `?harness=1&session=1`.
let _sessionEnabledCached = null
function _sessionEnabled() {
  if (_sessionEnabledCached === null) {
    try { const p = new URLSearchParams(window.location.search); _sessionEnabledCached = !(p.has("harness") && !p.has("session")) }
    catch (_) { _sessionEnabledCached = true }
  }
  return _sessionEnabledCached
}
let _lastSessionJson = null
// Called once per frame: writes only when the snapshot actually changed (cheap JSON diff), so a
// meaningful change (selection / toggle / unlock) persists within a frame without spamming storage.
function persistSessionIfChanged() {
  if (!_sessionEnabled()) return
  const json = JSON.stringify(snapshotSession())
  if (json === _lastSessionJson) return
  _lastSessionJson = json
  writeSession(JSON.parse(json))
}
// Restore on boot. Applies unlock flags + selections + training toggles, then lands on the persisted
// (always-safe) screen. Selections re-derive from stored keys; anything stale/removed is skipped.
function restoreSession() {
  if (!_sessionEnabled()) return
  const s = readSession()
  if (!s || typeof s !== "object") return
  if (s.unlocks) restoreUnlockFlags({ dev: !!s.unlocks.dev, beta: !!s.unlocks.beta })
  const m = s.match || {}
  if (m.mode) matchConfig.mode = m.mode
  if (m.aiDifficulty) matchConfig.aiDifficulty = m.aiDifficulty
  if (m.selectedUniverse && universeMap[m.selectedUniverse]) matchConfig.selectedUniverse = m.selectedUniverse
  if (m.selectedStage) { const st = stages.find(x => x.name === m.selectedStage); if (st) matchConfig.selectedStage = st }
  if (m.p1CharKey && characters[m.p1CharKey]) { matchConfig.p1CharKey = m.p1CharKey; matchConfig.p1Char = characters[m.p1CharKey] }
  if (m.p2CharKey && characters[m.p2CharKey]) { matchConfig.p2CharKey = m.p2CharKey; matchConfig.p2Char = characters[m.p2CharKey] }
  if (typeof m.p1Skin === "string") matchConfig.p1Skin = m.p1Skin
  if (typeof m.p2Skin === "string") matchConfig.p2Skin = m.p2Skin
  if (m.selectingSide) matchConfig.selectingSide = m.selectingSide
  const t = s.training || {}
  if (typeof t.infiniteResources === "boolean") trainingState.infiniteResources = t.infiniteResources
  if (typeof t.dummyBehavior === "string" && DUMMY_BEHAVIORS.includes(t.dummyBehavior)) trainingState.dummyBehavior = t.dummyBehavior
  if (s.screen && SESSION_RESTORABLE_SCREENS.has(s.screen)) gameState = s.screen
}
const p2AI             = createAIController("easy")
// AI-vs-AI SPECTATOR MODE: a SECOND controller drives P1 (mode "aivsai" only). Independent
// instance = its own difficulty/memory, so a hard-AI P1 can face an easy-AI P2 (ai.js keeps
// all state on the controller, so two run side-by-side with no shared-state issues).
const p1AI             = createAIController("easy")

// Live controller for the AI-vs-AI mode. `active` gates the fast-forward + auto-advance paths
// (all inert outside the mode). `session` is the spectator.js telemetry log.
const aiVsAiState = {
  active:        false,
  speed:         1,          // logic ticks per rendered frame (fast-forward)
  matchesTotal:  1,
  matchesDone:   0,
  autoAdvance:   0,          // countdown frames on the VICTORY screen before the next match
  session:       null,       // spectator.js session (accumulated log)
  lastRoundFrame:0,
  finished:      false,      // whole run complete → summary screen
  lastExport:    null        // { json, csv, filename } of the finished run (for the summary/harness)
}
// SETUP-screen selections (pre-match). Cursor keys/mouse mutate these; START commits them.
const aiVsAiConfig = {
  p1Key:  "netero",
  p2Key:  "beerus",
  p1Diff: "impossible",
  p2Diff: "easy",
  matches: 3,
  speedIndex: 2,             // index into SPECTATOR_SPEEDS ([1,2,4,8]) → 4x default
  sel: 0                     // keyboard cursor row on the setup screen
}
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
    if (characters[key]?.hidden) continue   // skip any hidden/non-selectable entry (e.g. transform-only forms)
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
// A character is BETA-SELECTABLE only if it has real sprite art (hasSprites) AND real, non-empty
// animationData. The animationData clause is a safety net (per the beta spec: lock anyone whose
// hasSprites is false OR who has no real animationData) — today every hasSprites:true char also has
// real animationData, so this reduces to hasSprites, but it future-proofs against a half-wired char.
function hasRealAnimData(c) { return !!c?.animationData && typeof c.animationData === "object" && Object.keys(c.animationData).length > 0 }
function betaSelectableKey(key) { const c = characters[key]; return !!c?.hasSprites && hasRealAnimData(c) }
function betaRosterKeys() { return Object.keys(characters).filter(betaSelectableKey) }
// ── THE ONE CENTRAL BETA ROSTER GATE ─────────────────────────────────────────
// EVERY place that offers/picks a fighter — the main character-select AND every mode-specific pool
// (Tower opponents, FFA roster, AI-vs-AI roster, safety fallbacks) — must route its candidate keys
// through this single predicate so BETA filters UNIFORMLY. While a BETA (non-dev) session is active a
// character is offerable only if it's beta-selectable (real sprites + animationData); a dev or no-code
// session offers the whole roster. Do NOT re-implement this test per mode — call rosterKeyAllowed /
// filterAllowedRosterKeys everywhere instead.
// A character is PLAYABLE (finished enough to ship) unless explicitly flagged isPlayable:false —
// e.g. an art-less placeholder that would render as a procedural box. DISTINCT from Stage 21's
// unlockedBy (progression gating): isPlayable means "built", unlockedBy means "earned". Dev sees
// unplayable characters (for building/testing); everyone else does not.
function isPlayableKey(key) { return characters[key]?.isPlayable !== false }
function rosterKeyAllowed(key) {
  if (isDevUnlocked()) return true                    // dev: whole roster, incl. unfinished/unplayable
  if (!isPlayableKey(key)) return false               // unfinished art-less entries — hidden from normal + beta
  return !isBetaUnlocked() || betaSelectableKey(key)  // beta additionally requires real sprites + animationData
}
function filterAllowedRosterKeys(keys) { return keys.filter(rosterKeyAllowed) }
// Universes that contain at least one CURRENTLY-offerable character (session-aware via
// rosterKeyAllowed) — so a universe emptied by the playable/beta filter (e.g. "original", whose
// only member is the art-less omololu) drops off the universe-select screen for normal players.
function playableUniverseSet() {
  const set = new Set()
  for (const k of Object.keys(characters)) {
    if (characters[k]?.hidden || !rosterKeyAllowed(k)) continue
    const u = characters[k]?.universe; if (u) set.add(u)
  }
  return set
}

// ── CHARACTER UNLOCKS (Stage 21) ─────────────────────────────────────────────
// Locked characters still APPEAR on select (as silhouettes) — the gate is on PICKING, not on
// listing (unlike isPlayable, which hides art-less entries entirely). This builds the live context
// (level + persisted arcade/tower clears + dev/beta) for unlocks.js's pure predicate.
function characterUnlockCtx() {
  const arcadeCleared = getArcadeCleared()
  return {
    level: getLevel(), dev: isDevUnlocked(), beta: isBetaUnlocked(),
    arcadeCleared, towerTiers: getTowerCleared(),
    arcadeAny: Object.keys(arcadeCleared).length > 0   // "beat the arcade boss" = any arcade clear
  }
}
function isCharUnlocked(key) { return isCharacterUnlocked(key, characterUnlockCtx(), characters) }
function charLockLabel(key)  { return unlockLabel(unlockConditionFor(key, characters), characters) }
// Universes that contain at least one beta-selectable character — the only universes the
// beta code exposes on the universe-select screen.
function spriteUniverseSet() {
  const set = new Set()
  for (const k of betaRosterKeys()) { const u = characters[k]?.universe; if (u) set.add(u) }
  return set
}

// EDO TENSEI backup pool: every fully-built (sprite) roster character EXCEPT Tobirama himself —
// the "any already-built roster character" the player reanimates. Returns char objects (with .id)
// so it drops straight into drawCharacterSelectScreen / getCharacterCardRects like a normal roster.
function getEdoBackupRoster() {
  return spriteRosterKeys().filter(k => k !== "tobirama").map(k => {
    const c = characters[k]
    return { id: k, name: c?.name || k, universe: c?.universe ? formatUniverseName(c.universe) : "" }
  })
}

// Stamp a Tobirama fighter's Edo Tensei vessel (its ultimate reanimates this char). No-op for
// non-Tobirama. Falls back to the first available built char so the ultimate never lacks a body.
function assignEdoBackup(fighter, chosen) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "tobirama") return
  const pool = getEdoBackupRoster()
  const valid = chosen && characters[chosen] && chosen !== "tobirama"
  fighter._edoBackup = valid ? chosen : (pool[0]?.id || "naruto")
}

function getUniverseCharacters() {
  if (!matchConfig.selectedUniverse || !universeMap[matchConfig.selectedUniverse]) return []
  const keys = universeMap[matchConfig.selectedUniverse]
  // Beta code (BETA/GojoV1): restrict selectable fighters to those WITH real sprite art + animationData,
  // even if a spriteless-universe somehow got selected (defense-in-depth alongside the universe-list
  // filter). Routed through the SAME central gate every other mode uses (rosterKeyAllowed).
  return filterAllowedRosterKeys(keys)
}

function getStageTheme()        { return matchConfig.selectedStage || stages[0] }
function getStageFloorHeight()  { return getStageTheme()?.floorHeight || FLOOR_HEIGHT }
function getStageGroundOffset() { const s = getStageTheme(); return typeof s?.groundOffset === "number" ? s.groundOffset : 100 }
function getStageWorldWidth()   { return getStageTheme()?.worldWidth || WORLD_WIDTH }
function getStageHazards()      { return getStageTheme()?.hazards || [] }   // STAGE INTERACTABLES pilot

// STAGE INTERACTABLES pilot: resolve a fighter against the active stage's hazards (knocked-into-hazard →
// contact damage + wall-splat reaction). Funnels damage through the one applyScaledDamage choke-point and
// flags a camera shake (consumed alongside _wallBounceShake). No-op on stages with no `hazards`.
function updateStageHazards(fighter) {
  if (!fighter) return
  const dmg = resolveStageHazard(fighter, getStageHazards(), groundY)
  if (dmg > 0) applyScaledDamage(fighter, dmg, { source: "stage-hazard" })
}

// STAGE INTERACTABLES pilot: draw the active stage's hazards (world space, under the camera transform) —
// a warning-capped metallic pylon with a pulsing electric core. No-op on stages with no `hazards`.
function drawStageHazards(ctx) {
  const hazards = getStageHazards()
  if (!hazards.length) return
  const pulse = 0.5 + 0.5 * Math.sin(globalFrameCount * 0.18)
  for (const hz of hazards) {
    const b = hazardBox(hz, groundY)
    // Per-hazard glow tint (default = electric yellow). `core`/`arc` are rgba-parametrised by the pulse.
    const glow = hz.tint || "#fde047"
    const core = hz.tint ? `rgba(239,68,68,` : `rgba(253,224,71,`    // crimson (cursed) vs yellow (electric)
    const arc  = hz.tint ? `rgba(255,150,150,` : `rgba(255,240,150,`
    ctx.fillStyle = "#3a3f4b"; ctx.fillRect(b.x, b.y, b.w, b.h)              // metal post
    ctx.fillStyle = "#20242c"; ctx.fillRect(b.x + 3, b.y, 4, b.h)           // shading stripe
    ctx.save()
    ctx.shadowBlur = 14 + 10 * pulse; ctx.shadowColor = glow
    const coreX = b.x + b.w / 2 - 3
    ctx.fillStyle = `${core}${0.55 + 0.35 * pulse})`
    ctx.fillRect(coreX, b.y + 6, 6, b.h - 12)                               // glowing core
    ctx.strokeStyle = `${arc}${0.6 + 0.4 * pulse})`; ctx.lineWidth = 2
    ctx.beginPath(); let ay = b.y + 10; ctx.moveTo(coreX + 3, ay)
    while (ay < b.y + b.h - 10) { const dx = ((ay / 9) % 2 < 1 ? -1 : 1) * 7 * pulse; ay += 14; ctx.lineTo(coreX + 3 + dx, ay) }
    ctx.stroke(); ctx.restore()
    ctx.fillStyle = "#ef4444"; ctx.fillRect(b.x - 2, b.y - 6, b.w + 4, 8)   // red hazard cap
  }
}

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
  // Shadow-clone users only (Naruto + Minato ported it) — the light-string extension keys off
  // live clones, so any non-clone character is a no-op regardless.
  if (!fighter || (fighter.rosterKey !== "naruto" && fighter.rosterKey !== "minato")) return
  const ca = fighter.currentAttack
  if (!ca || ca.name !== "light" || !ca.hasHit || ca._cloneRendanDone) return
  if (countShadowClones(fighter) <= 0) return
  ca._cloneRendanDone = true
  fighter._rendanFired = (fighter._rendanFired || 0) + 1   // test hook: deterministic flurry-fire count
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
  // Up+Special (simultaneous) suppresses the jump so a grounded Up-direction special (Yuji's Cursed-Energy
  // Pillar) is reachable — `up` and `jump` share the same bind, so the jump vKey must be withheld here too
  // (input.js already withholds buffer.jump). _specialHeldDir reads raw inputState, so the "U" direction is
  // still detected. Non-simultaneous jump-then-air-special is unaffected.
  if ((inputState.up || inputState.jump) && !(inputState.up && inputState.special)) v[controls.up] = true
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
// MK-feel Stage 4b: dash FREQUENCY as a clean function of the speed archetype. The spec's premise
// ("dash fields are defaulted for everyone") was wrong — every character hand-set dashSpeed/
// dashDuration/dashCooldownMax, but the COOLDOWNS were inconsistent with speed (e.g. Minato spd 98
// dashed on a cd of 40 like a heavy; Naruto/Sasuke spd 90 on cd 45 like Rick/Megumi) and NONE hit the
// spec's targets. This maps speed → cooldown so a speedster (98) recovers in ~14f and a heavy (~78) in
// ~34f — the "~14f speedsters / ~34f heavies" anchors. dashSpeed/dashDuration (dash DISTANCE/burst) stay
// per-character (they were already archetype-differentiated); only the frequency is re-derived here.
function archetypeDashCooldown(speed) {
  return Math.max(14, Math.min(34, Math.round(112 - (speed || 88))))   // 98→14, 90→22, 84→28, ≤78→34
}
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
    jumpsUsed: 0, jumpCount: 0, jumpHeld: false, juggleCount: 0,
    dashSpeed:    stats.dashSpeed    || 20,
    dashDuration: stats.dashDuration || 8,
    dashCooldownMax: archetypeDashCooldown(speed),   // Stage 4b: derived from the speed tier (supersedes the inconsistent hand-set stats.dashCooldownMax)
    dashTimer: 0, dashCooldown: 0,
    attackMultiplier, damageMultiplier, speedMultiplier, defenseMultiplier,
    moveMultiplier:        movement.moveMultiplier        || 1,
    attackSpeedMultiplier: movement.attackSpeedMultiplier || 1,
    wallJump:    !!movement.wallJump,
    dashTeleport: !!movement.dashTeleport,
    // Opt-in: forward ground movement resolves to the RUN sprite (this game's speed
    // scale never reaches the >10 vx run threshold, so advancing normally shows WALK).
    // Retreat/backpedal still reads as a walk. Used by run-cycle characters (Tobirama).
    runWhenAdvancing: !!movement.runWhenAdvancing,
    hitstun: 0, blockstun: 0, hitstop: 0, attackCooldown: 0,
    currentAttack: null, attacking: false, currentMove: null,
    currentMoveData: null, moveTimer: 0, movePhase: "idle",
    hasHitThisMove: false, isBlocking: false,
    grounded: true, onGround: true, isLaunched: false,
    airHits: 0, maxAirHits: 3,
    comboCounter: 0, comboTimer: 0,
    comboBreakStocks: COMBO_BREAKER.stocksPerRound,   // universal combo-break resource — fresh fighter each round → auto-refills per round

    directionHistory: [],
    motionHistory: [],   // dedicated classic motion-input buffer (Naruto-universe only; see motionInput.js)
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
    spriteHandler: char?.hasSprites ? new SpriteHandler() : null,
    // Characters that START in a form (Zaraki Shikai as its own select entry): stamp the form flag so the
    // existing Shikai command/special kit drives it natively. No _shikaiTimer is ever set → no auto-revert.
    _shikaiActive: !!char?.startsInShikai
  }
}

// ------------------------------------------------------------------
// MATCH / ROUND MANAGEMENT
// ------------------------------------------------------------------
// Safety default when no character was chosen — prefer a BETA-allowed fighter so a BETA session never
// falls back onto a spriteless character; degrade to the full roster only if the filter empties.
function getFallbackCharacterKey() { return filterAllowedRosterKeys(allCharacterKeys)[0] || allCharacterKeys[0] || null }

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
  sound.stopAllSfx?.({ includePersistent: true })   // clear any lingering cue as a fresh round begins
  _roundEndAudioStopped = false                      // re-arm the round-end stop for the new round
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
    comboDisplay[side].pop       = 0
    comboDisplay[side].prevCount = 0
  }

  syncPhysicsBounds()
  ensureTrainingOpponent()

  const { p1X, p2X } = getSpawnPositions()
  p1 = createFighter(matchConfig.p1CharKey, matchConfig.p1Char, p1X,  1, P1_CONTROLS, "p1")
  p2 = createFighter(matchConfig.p2CharKey, matchConfig.p2Char, p2X, -1, P2_CONTROLS, "p2")
  applySkin(p1, matchConfig.p1Skin)   // Task 4: load the selected skin's art
  applySkin(p2, matchConfig.p2Skin)
  // Arcade final-boss buffs (Stage 20): applied ONLY when this p2 is the arcade boss opponent. Any
  // other appearance of the same character (normal vs, other fights) is a fair, normal fighter. MUST
  // run AFTER applySkin — applySkin resets spriteScale from the skin/char, which would clobber the
  // boss's ×scale otherwise.
  if (matchConfig.p2IsBoss) _applyBossProfile(p2, matchConfig.p2Char)
  // Edo Tensei vessel: stamp each Tobirama's chosen backup (falling back to a default so the
  // ultimate always has a body — e.g. an AI Tobirama, or a harness quick-start that skipped the UI).
  assignEdoBackup(p1, matchConfig.p1EdoBackup)
  assignEdoBackup(p2, matchConfig.p2EdoBackup)
  applyMirrorTint(p1, p2)   // same-character mirror → red wash on P2 (Task 1)
  // Tower health carry-over: at the START of a new floor (not between rounds),
  // set P1's health to the carried %. _applyCarry is one-shot (set in continueTower).
  if (towerState._applyCarry && p1) {
    p1.health = Math.max(1, Math.round((p1.maxHealth || 1000) * towerState.carryPct))
    towerState._applyCarry = false
  }
  // Arcade uses the SAME carry-over between fights (set in continueArcade).
  if (arcadeState._applyCarry && p1) {
    p1.health = Math.max(1, Math.round((p1.maxHealth || 1000) * arcadeState.carryPct))
    arcadeState._applyCarry = false
  }
  _applyMatchModifiers()   // Stage 24A: apply the active match modifiers to the fresh fighters

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
  clearKuramaUltimate(); clearMinatoKurama(); clearObitoJuubi(); clearTobiNineTails()
  clearSasukeCinematic()
  clearSSJRoseCinematic()
  clearGokuBlackSwordCinematic()
  clearRedRangerPowerSwordCinematic()
  clearKilluaGodspeedCinematic()
  clearFlashTimeCinematic(); if (p1) forceRevertFlashTime(p1); if (p2) forceRevertFlashTime(p2)
  clearGonAdultFormCinematic()
  clearHisokaOverdriveCinematic()
  clearTojiReincarnationCinematic()
  clearTojiFlyHeadsSwarm()
  for (const _f of [p1, p2]) { if (!_f) continue; forceRevertGonAdultForm(_f); forceRevertHisokaOverdrive(_f); forceRevertOmniManFlight(_f); forceRevertSupermanModes(_f); revertZarakiShikai(_f); _f._suddenDeathWatch = false; _f._suddenDeathAtk = null }
  _matchOverride = null   // clear any pending sudden-death override on every reset path
  clearMangekyouCinematic()
  clearVegetaFinalFlashCinematic()
  clearBeerusKiBallCinematic()
  clearBen10OmnitrixCinematic()
  clearBatmanDarkKnightCinematic()
  clearOmniManBodySlamCinematic()
  clearSupermanUltimateCinematic()
  clearRengokuFlameExplosionCinematic()
  clearMadaraTengaiShinseiCinematic()
  clearHashiramaSealingJutsuCinematic()
  clearPainChibakuTenseiCinematic()
  clearYujiUltimateCinematic()
  clearShinobuButterflyCinematic()
  clearInosukeBeastCinematic()
  clearGhostfaceFinalActCinematic()
  clearMiwaUltimateCinematic()
  clearIchigoGetsugaCinematic()
  clearMakiShibuyaCinematic()
  clearEdoTenseiCinematic()

  if (typeof clearInputBuffers === "function") clearInputBuffers([p1, p2].filter(Boolean))

  hitSparks.length     = 0
  activeDomains.length = 0
  roundBreakTimer      = 0

  resetAIController(p2AI)
  if (matchConfig.mode === "aivsai") {
    // Spectator mode: BOTH slots are CPU, each with its OWN difficulty.
    resetAIController(p1AI)
    setAIDifficulty(p1AI, aiVsAiConfig.p1Diff)
    setAIDifficulty(p2AI, aiVsAiConfig.p2Diff)
    clearAIControlKeys(p1)
  } else if (isPvP()) {
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
  // introSequencePool = a POOL of SEQUENCES (Red Ranger MMPR): pick ONE sequence at random per
  // match, then drive it exactly like a fixed introSequence. Lets some pool entries be multi-step
  // (unmorphed steps → shared morph-flash) while others are standalone single-step, all randomized.
  const seqPool = fighter.introSequencePool
  const seq = (Array.isArray(seqPool) && seqPool.length)
    ? seqPool[Math.floor(Math.random() * seqPool.length)]
    : fighter.introSequence
  if (Array.isArray(seq) && seq.length) {
    fighter._introSeq      = seq
    fighter._introSeqIdx   = 0
    fighter._introVariant  = seq[0]
    fighter._introSeqTimer = introStepFrames(fighter, seq[0])
  } else {
    fighter._introSeq     = null
    fighter._introVariant = pickIntroVariant(fighter)
  }
  // KILLUA skateboard roll-in: stash the battle position, then start off-screen BEHIND him so he rides
  // in on the board (updateKilluaIntroRollIn eases him home). facing is already set (fighters face off).
  if ((fighter.rosterKey || "").toLowerCase() === "killua" && fighter._introVariant === "intro") {
    fighter._introHomeX = fighter.x
    fighter.x = fighter.x - (fighter.facing || 1) * KILLUA_ROLLIN_DIST
  } else if ((fighter.rosterKey || "").toLowerCase() === "superman") {
    // SUPERMAN entrance: stash the battle position, then start OFF-SCREEN at the arena edge behind him.
    // updateSupermanIntro eases him home across the Clark run-in + liftoff while the CAMERA tracks him.
    fighter._introHomeX = fighter.x
    fighter.x = fighter.x - (fighter.facing || 1) * SUPERMAN_RUNIN_DIST
  } else if ((fighter.rosterKey || "").toLowerCase() === "shinobu") {
    // SHINOBU entrance: stash the battle position, then start OFF-SCREEN at the arena edge behind her.
    // updateShinobuIntro glides her home (haori spread as wings) while the CAMERA tracks the travel.
    // DELIBERATE tracked-movement entrance (per design) — distinct from Rengoku's stationary intro.
    fighter._introHomeX = fighter.x
    fighter.x = fighter.x - (fighter.facing || 1) * SHINOBU_GLIDEIN_DIST
  } else {
    fighter._introHomeX = null
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
  minato: { pool: MINATO_VOICE.intro, gateReveal: false },  // picks ONE intro line at random per match (Japanese Storm-Connections pack)
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
  // Itachi picks ONE of three calm opening lines at random per match ("Stay calm" / "Fighting is
  // pointless" / "I can take down any enemy"). Fires at his first intro-play frame (no reveal gate).
  itachi: { pool: ITACHI_VOICE.intro, gateReveal: false },
  // Killua's single intro cry ("Let's begin!"). Fires at his first intro-play frame (no reveal gate).
  killua: { pool: KILLUA_VOICE.intro, gateReveal: false },
  // Tobirama picks ONE of his will-of-fire / hokage power-declarations at random per match. Fires at
  // his first intro-play frame (no reveal gate).
  tobirama: { pool: TOBIRAMA_VOICE.intro, gateReveal: false },
  // Flash picks ONE of his intro boasts ("only one fastest man alive" / "only seems fair to warn you").
  flash: { pool: FLASH_VOICE.intro, gateReveal: false },
  // Gon picks ONE of his eager pre-fight lines ("Alright, come on!" / "Anytime is fine" / "Let's hurry").
  // No taunt action exists for Gon → the intro/taunt pool fires on the intro beat only (see gonVoice.js NOTE).
  gon: { pool: GON_VOICE.intro, gateReveal: false },
  // Hisoka picks ONE of his eager/appraising pre-fight lines ("The stronger the prey, the better" /
  // "I'm so looking forward to this~"). No taunt action → the flirty taunt pool rides the offense-connect
  // trigger instead (see hisokaVoice.js NOTE); intro fires here.
  hisoka: { pool: HISOKA_VOICE.intro, gateReveal: false },
  // Zenitsu picks ONE of his eager pre-fight lines at random per match ("How about that?" / "Come on, I'll
  // saw through!"). No taunt action → the determination pool folds into the offense-connect bark (see
  // zenitsuVoice.js NOTES); intro fires here at his first intro-play frame (no reveal gate).
  zenitsu: { pool: ZENITSU_VOICE.intro, gateReveal: false },
  // Rengoku picks ONE of his composed pre-fight lines at random per match ("Hmm, alright" / "Great skill" /
  // "What's wrong?" / "Is that all?"). No taunt action → the taunt-combat pool rides the offense-connect
  // trigger instead (see rengokuVoice.js NOTES); intro fires here at his first intro-play frame (no reveal gate).
  rengoku: { pool: RENGOKU_VOICE.intro, gateReveal: false },
  // Shinobu picks ONE of her composed pre-fight lines at random per match ("Being forceful isn't good" /
  // "Go ahead, slowly" / "Can you keep up?"). No taunt action → the intro/taunt pool fires on intro only
  // (see shinobuVoice.js NOTES); fires at her first intro-play frame (no reveal gate).
  shinobu: { pool: SHINOBU_VOICE.intro, gateReveal: false },
  // Inosuke picks ONE of his eager/boisterous pre-fight lines at random per match ("Interesting!" /
  // "Here it comes!" / "Let's go!"). No taunt-voice event (his introPool IS the taunt sprite; enrolling
  // one would change gameplay) → the intro/taunt pool fires on the intro beat only (see inosukeVoice.js).
  inosuke: { pool: INOSUKE_VOICE.intro, gateReveal: false },
  // Nezuko is muffled (no words) — a medium, calmer-toned grunt on the intro beat (see nezukoVoice.js).
  nezuko: { pool: NEZUKO_VOICE.intro, gateReveal: false },
  // Batman picks ONE of his grim pre-fight lines ("we both have a job to do" / "The Justice League is a
  // calling" / "It's your chance to prove yourself" / "I conquered fear long ago"). No taunt action → the
  // taunt pool rides the offense-connect trigger instead (see batmanVoice.js NOTE); intro fires here.
  batman: { pool: BATMAN_VOICE.intro, gateReveal: false },
  // Omni-Man picks ONE pre-fight declaration ("I'm here to save you all from yourselves" / "I claim this
  // timeline for the Viltrum Empire" / …). No taunt action → the taunt pool rides the offense-connect
  // trigger instead (see omnimanVoice.js NOTE); intro fires here.
  omniman: { pool: OMNIMAN_VOICE.intro, gateReveal: false },
  // Superman picks ONE pre-fight declaration ("There won't be any ties today" / "I'm the hero Earth needs" /
  // Regime "Traitors, all of you"). His `taunt` action drives the universal heal, so the trash-talk pool
  // rides the offense-connect trigger instead (see supermanVoice.js NOTE); intro fires here.
  superman: { pool: SUPERMAN_VOICE.intro, gateReveal: false },
  ghostface: { pool: GHOSTFACE_VOICE.intro, gateReveal: false },   // one of his openers at random ("What's your favorite scary movie?" …)
  // Miwa picks ONE of her pre-fight openers / nervous-taunt lines at random per match ("I will defeat you
  // here!" / "I'm not drunk!" / "Please don't think of me as a bad girl!"). No taunt action exists → the
  // intro and taunt pools are combined and fire on the intro beat only (see miwaVoice.js NOTE). JP dub.
  miwa: { pool: [...MIWA_VOICE.intro, ...MIWA_VOICE.taunt], gateReveal: false },
  // Yuji picks ONE of his eager pre-fight lines at random per match ("Let's do this!" / "Prepare yourself!" /
  // "I want to be stronger!"). No taunt action → intro-only. Uses `pick` (not a static pool) so it stays
  // language-aware — pickYujiVoice reads the active EN/JA set (JA default, see yujiVoice.js).
  yuji: { pick: () => pickYujiVoice("intro"), gateReveal: false },
  toji: { pick: () => pickTojiVoice("intro"), gateReveal: false },   // Toji has no taunt action → intro-only (Maki precedent); language-aware EN/JA pool
  // Sukuna picks ONE of his contemptuous pre-fight lines at random per match ("Judge this if you can." /
  // "Do you have a death wish?" / "Know your place."). No taunt action → intro + taunt pools merge on the
  // intro beat (see sukunaVoice.js). Uses `pick` (not a static pool) so it stays language-aware — JA default.
  sukuna: { pick: () => pickSukunaVoice("intro"), gateReveal: false },
  // Madara picks ONE of his imperious pre-fight / dance-for-me lines at random per match ("I am Madara
  // Uchiha" / "No one can reach me" / "Dance for me!"). No taunt action → intro + taunt pools combine and
  // fire on the intro beat only (see madaraVoice.js). JA.
  madara: { pool: [...MADARA_VOICE.intro, ...MADARA_VOICE.taunt], gateReveal: false },
  // Hashirama picks ONE of his First-Hokage / Will-of-Fire pre-fight lines at random per match ("I am
  // Senju Hashirama" / "Know the power of the Hokage" / dismissive taunts). No taunt-voice event → intro +
  // taunt pools combine and fire on the intro beat only (see hashiramaVoice.js). JA.
  hashirama: { pool: [...HASHIRAMA_VOICE.intro, ...HASHIRAMA_VOICE.taunt], gateReveal: false },
  // Pain picks ONE of his philosophy / "Know pain" pre-fight lines at random per match. No taunt action →
  // intro + taunt pools combine and fire on the intro beat only (see painVoice.js). JA.
  pain: { pool: [...PAIN_VOICE.intro, ...PAIN_VOICE.taunt], gateReveal: false },
  // Obito picks ONE of his pre-fight / taunt lines at random per match. No taunt action → intro + taunt
  // pools combine and fire on the intro beat only (see obitoVoice.js). JA.
  obito: { pool: [...OBITO_VOICE.intro, ...OBITO_VOICE.taunt], gateReveal: false },
  tobi: { pool: TOBI_VOICE.intro, gateReveal: false },   // Tobi goofy pre-match banter (own pool; independent of Obito's)
  // Ichigo picks ONE of his pre-fight lines at random per match ("Let's get started." / "I've come to
  // stop you." / "I'll protect everyone." / "Come and get me."). No taunt action → intro + taunt pools
  // combine and fire on the intro beat only (see ichigoVoice.js). JA.
  ichigo: { pool: [...ICHIGO_VOICE.intro, ...ICHIGO_VOICE.taunt], gateReveal: false },
  // Zaraki picks ONE pre-fight line per match ("I'm Zaraki Kenpachi" / "Ready to die?" / "Came to kill you").
  // UNLIKE Madara/Ichigo he HAS a taunt action, so intro is intro-only here (the taunt pool fires separately
  // on the Down-hold taunt commit). Both entries — base + the dedicated Shikai select char. JA.
  zaraki:        { pick: () => pickZarakiVoice("intro"), gateReveal: false },
  zaraki_shikai: { pick: () => pickZarakiVoice("intro"), gateReveal: false },
  // Netero intro voice removed (audio files deleted); with no entry here he skips the intro-voice
  // beat cleanly (maybeFireIntroVoice no-ops for unmapped fighters). Re-add an entry to re-enable.
}
function maybeFireIntroVoice(fighter) {
  if (!fighter || fighter._introVoiceDone) return
  // Per-skin OVERRIDE takes priority (Gojo "Limitless" young pack); null under any other
  // skin → fall through to the base INTRO_VOICE entry (base Gojo has none → nothing plays).
  const skinClip = pickSkinVoice(fighter.rosterKey, fighter.skinId, "intro")
  const cfg = INTRO_VOICE[fighter.rosterKey]
  if (!skinClip && !cfg) return
  // Reveal / sequence-step gates come from the base cfg (if any) and apply to the skin
  // override too, so a gated char keeps its timing. Gojo has no cfg → fires on the first
  // intro-play frame (same beat as Naruto/Itachi/Netero).
  if (cfg?.gateReveal && (fighter._introRevealFrame || 0) < (fighter.introReveal?.hide || 0)) return
  if (cfg?.gateSeqStep && fighter._introVariant !== cfg.gateSeqStep) return   // hold until the reveal step of a two-part intro
  fighter._introVoiceDone = true
  // `pick`: a per-match selector fn (language-aware pools, e.g. Yuji EN/JA) — takes priority over pool/clip.
  const clip = skinClip || cfg.pick?.() || (cfg.pool ? cfg.pool[Math.floor(Math.random() * cfg.pool.length)] : cfg.clip)
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

// KILLUA skateboard roll-in — during his intro he ENTERS from off-screen (behind him) riding the board
// and rolls to his battle position. initIntroVariant stashes the home x + offsets him off-screen behind
// him; this eases him back to home over the ROLLING frames, then holds at home (the hop-off/land frames
// play in place). Combat/physics are frozen during INTRO, so setting x directly is safe. No-op for anyone
// else / any other intro variant.
// Skateboard art = 10 frames: [0..5] rolling, [6..8] hop off the board, [9] landed stance. So he should
// ARRIVE at his battle position by frame 6 (as he hops off); the hop-off/land then play in place.
const KILLUA_ROLLIN_ARRIVE_FRAME = 6
const KILLUA_ROLLIN_DIST         = 300   // px behind his battle position to start (off-screen)
function updateKilluaIntroRollIn(fighter) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "killua") return
  if (!fighter._introPlaying || fighter._introVariant !== "intro" || fighter._introHomeX == null) return
  // Drive the roll off the ACTUAL animation playback (frameIndex + sub-frame frameTimer) rather than a
  // wall-clock counter, so the ride stays synced to the rolling frames and smooth regardless of loop speed.
  const sh = fighter.spriteHandler
  const speed = sh?._actionDef?.speed || 4
  const animFrame = (sh?.frameIndex || 0) + Math.min(1, (sh?.frameTimer || 0) / speed)   // continuous 0..9
  const t = Math.min(1, animFrame / KILLUA_ROLLIN_ARRIVE_FRAME)
  const eased = 1 - (1 - t) * (1 - t)   // easeOutQuad — rides in, decelerates to a stop at home
  const from = fighter._introHomeX - (fighter.facing || 1) * KILLUA_ROLLIN_DIST
  fighter.x = from + (fighter._introHomeX - from) * eased
}
// Snap Killua back to his battle position when the intro ENDS or is SKIPPED (skipToBattle) — the roll-in
// offsets his x, so without this a skip-to-battle (harness boot, or a player skipping the intro) would
// leave him displaced off-screen. No-op once cleared / for anyone else.
function finalizeKilluaIntroPos(fighter) {
  if (fighter && (fighter.rosterKey || "").toLowerCase() === "killua" && fighter._introHomeX != null) {
    fighter.x = fighter._introHomeX
    fighter._introHomeX = null
  }
}

// ── SUPERMAN — camera-tracked run-in entrance ─────────────────────────────────
// He starts OFF-SCREEN at the arena edge (initIntroVariant offsets him). Across the Clark-Kent run-in
// (introRunIn) and into the shirt-rip/liftoff step (introLiftoff), he eases to his battle position
// while the CAMERA pans to follow him — so the background scrolls past a framed, running Superman
// (a tracking shot, not a static camera he runs into). Arrival lands just as the liftoff frames hit,
// then introHover holds him at home. Combat is frozen during INTRO, so setting x directly is safe.
const SUPERMAN_RUNIN_DIST = 460   // px behind his battle position to start (off-screen at the edge)
function updateSupermanIntro(fighter) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "superman") return
  if (!fighter._introPlaying || fighter._introHomeX == null) return
  const v = fighter._introVariant
  // Travel budget: all of introRunIn (21 frames) + the first ~10 frames of introLiftoff (the run/rip
  // before he leaves the ground). Cumulative frame index across those two steps drives the ease.
  const sh = fighter.spriteHandler
  const speed = sh?._actionDef?.speed || 4
  const animFrame = (sh?.frameIndex || 0) + Math.min(1, (sh?.frameTimer || 0) / speed)
  let cumulative
  if (v === "introRunIn")        cumulative = animFrame                 // 0 .. 21
  else if (v === "introLiftoff") cumulative = 21 + animFrame            // 21 .. 38
  else                           cumulative = 999                        // introHover / anything later = home
  const ARRIVE = 31   // land home as the liftoff frames begin (21 + first 10 of introLiftoff)
  const t = Math.min(1, cumulative / ARRIVE)
  const eased = 1 - (1 - t) * (1 - t)   // easeOutQuad — decelerate into the battle spot
  const from = fighter._introHomeX - (fighter.facing || 1) * SUPERMAN_RUNIN_DIST
  fighter.x = from + (fighter._introHomeX - from) * eased
  // CAMERA follows him in (background scrolls). Track his center; camera.advance() smooths the pan.
  const cx = (typeof fighter.centerX === "number") ? fighter.centerX : (fighter.x + (fighter.w || 60) / 2)
  camera.targetX = cx
}
// Snap Superman home when the intro ENDS / is SKIPPED, and hand the camera back to normal 2-fighter
// framing so the fight opens correctly. No-op once cleared / for anyone else.
function finalizeSupermanIntroPos(fighter) {
  if (fighter && (fighter.rosterKey || "").toLowerCase() === "superman" && fighter._introHomeX != null) {
    fighter.x = fighter._introHomeX
    fighter._introHomeX = null
    if (camera.focusBetween && p1 && p2) camera.focusBetween(p1, p2, 0.85)
  }
}

// ── SHINOBU — camera-tracked glide-in entrance ────────────────────────────────
// She starts OFF-SCREEN at the arena edge (initIntroVariant offsets her). While the introGlide art
// plays (haori spread as butterfly wings), she eases inward to her battle position and the CAMERA pans
// to follow her — a tracking shot, same architecture as Superman's run-in. Driven by the monotonic
// intro-frame counter (introGlide loops, so animation frameIndex isn't monotonic). Combat is frozen
// during INTRO, so setting x directly is safe. DELIBERATE per-character tracked intro (NOT Rengoku's
// stationary path). No-op for anyone else.
const SHINOBU_GLIDEIN_DIST   = 440   // px behind her battle position to start (off-screen at the edge)
const SHINOBU_GLIDEIN_ARRIVE = 34    // intro frames to reach home (< INTRO_MIN_FRAMES 54 → holds home after)
function updateShinobuIntro(fighter) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "shinobu") return
  if (!fighter._introPlaying || fighter._introHomeX == null) return
  const t = Math.min(1, (fighter._introRevealFrame || 0) / SHINOBU_GLIDEIN_ARRIVE)
  const eased = 1 - (1 - t) * (1 - t)   // easeOutQuad — glide in, decelerate into the spot
  const from = fighter._introHomeX - (fighter.facing || 1) * SHINOBU_GLIDEIN_DIST
  fighter.x = from + (fighter._introHomeX - from) * eased
  // CAMERA follows her in (background scrolls). Track her center; camera.advance() smooths the pan.
  const cx = (typeof fighter.centerX === "number") ? fighter.centerX : (fighter.x + (fighter.w || 60) / 2)
  camera.targetX = cx
}
// Snap Shinobu home when the intro ENDS / is SKIPPED, and hand the camera back to 2-fighter framing.
function finalizeShinobuIntroPos(fighter) {
  if (fighter && (fighter.rosterKey || "").toLowerCase() === "shinobu" && fighter._introHomeX != null) {
    fighter.x = fighter._introHomeX
    fighter._introHomeX = null
    if (camera.focusBetween && p1 && p2) camera.focusBetween(p1, p2, 0.85)
  }
}

// ── RENGOKU intro ─────────────────────────────────────────────────────────────
// Rengoku's two intros (introRunIn / intro2, random-cycled via introPool) both play STATIONARY at his
// normal starting position — no camera tracking, no positional movement. So there is NO Rengoku-specific
// intro updater/finalizer (the earlier tracked dash-in was removed): the standard intro path handles him.

// ── EDO TENSEI — summoned-vessel intro beat ───────────────────────────────────
// When the Edo Tensei tomb finishes opening and the vessel takes the field, the vessel plays ITS OWN
// intro (the same pose + intro voice line a match-start intro fires) as a brief FROZEN reveal beat —
// AFTER the coffin cinematic fully ends, so it never overlaps the tomb's rise/reveal. Reuses the real
// intro system: `_introPlaying` drives sprite.js to render `_introVariant`, and maybeFireIntroVoice
// fires the same INTRO_VOICE clip (keyed by rosterKey, which is swapped to the vessel during the window).
// We play the intro POSE IN PLACE — no entrance locomotion (Killua's roll-in / Toji's walk-in) — since the
// vessel already emerged from the tomb mid-arena; an entrance walk would look wrong here.
const EDO_INTRO_MIN_FRAMES = 66   // ~1.1s so the reveal pose + voice read before control hands over
let _edoCineMode = null           // last Edo cinematic mode seen active ("in"/"out") — detects an "in" summon ending
function startEdoVesselIntro(fighter) {
  if (!fighter) return
  fighter._introPlaying     = true
  fighter._introRevealFrame = 0
  fighter._introVoiceDone   = false
  // Pick the pose exactly as a match-start intro would (fixed-order sequence's final "ready" step, else a
  // random introPool variant — both swapped/derived from the vessel), but as a SINGLE held pose: clear
  // _introSeq so no multi-step walk-in runs, and null _introHomeX so the Killua roll-in offset never fires.
  const seq = fighter.introSequence
  fighter._introSeq     = null
  fighter._introVariant = (Array.isArray(seq) && seq.length) ? seq[seq.length - 1] : pickIntroVariant(fighter)
  fighter._introHomeX   = null
  fighter._edoIntroTimer = Math.max(EDO_INTRO_MIN_FRAMES, introStepFrames(fighter, fighter._introVariant || "transform"))
  fighter._edoIntroPlaying = true
}
// Per-frame driver for the frozen vessel-intro beat. Returns true while a beat is in flight (updateBattle
// early-returns on it, freezing combat/input the same way the coffin cinematic did — the render path still
// advances the intro sprite frames, so the pose animates). Fires the intro voice once, then hands control
// to the vessel when the timer runs out.
function updateEdoVesselIntro() {
  const f = (p1 && p1._edoIntroPlaying) ? p1 : (p2 && p2._edoIntroPlaying) ? p2 : null
  if (!f) return false
  f._introRevealFrame = (f._introRevealFrame || 0) + 1
  maybeFireIntroVoice(f)
  if (camera && typeof camera.focusOnFighter === "function") camera.focusOnFighter(f, 1.12)   // frame the reveal
  if (--f._edoIntroTimer <= 0) { f._introPlaying = false; f._edoIntroPlaying = false }
  return true
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

// ── STAGE 10: match-start asset preload ────────────────────────────────────────────────────────
// Decode every sheet both fighters (+ their skins) and their spawned FX can render BEFORE the fight
// actually starts, so no move first-use-faults to the _FALLBACK box while its PNG is still decoding.
// The intro (~90-frame settle + per-side intro strips) is the cover; the INTRO→BATTLE transition is
// gated on _preloadReady so a slow connection briefly holds on the intro rather than flashing a box.
let _preloadReady    = true                 // true when nothing is pending (also the pre-first-match state)
let _preloadFailures = []                   // [{ path, error }] from the last preloadMatch, logged at start
let _preloadProgress = { done: 0, total: 0 }
let _preloadPromise  = Promise.resolve({ failures: [] })
const PRELOAD_GRACE_FRAMES = 180            // intro frames to wait on preload before FAIL-OPEN (never hang)
let _preloadGraceFrames = 0

// Collect the distinct .sheet paths one fighter can render: the character's own animationData merged
// with the active skin's per-action overrides (the renderer reads the merged set via _skinAnim, so a
// base-only walk would still first-use-fault on skin-overridden actions). Lives here — not in sprite.js
// — so sprite.js needn't statically import characters/skins (that extra load-graph edge measurably
// perturbed startMatch timing for real-time-sensitive suites). Deduped by path.
function collectFighterSheets(rosterKey, skinId) {
  const paths = new Set()
  const base = characters?.[rosterKey]?.animationData || {}
  for (const def of Object.values(base)) if (def?.sheet) paths.add(def.sheet)
  if (skinId && skinId !== "default") {
    let skinAnim = null
    try { skinAnim = getSkinAnimationData(rosterKey, skinId) } catch (_) {}
    for (const def of Object.values(skinAnim || {})) if (def?.sheet) paths.add(def.sheet)
  }
  return [...paths]
}

function preloadMatch(cfg) {
  _preloadReady    = false
  _preloadGraceFrames = PRELOAD_GRACE_FRAMES   // reset the fail-open budget for this match
  _preloadFailures = []
  _preloadProgress = { done: 0, total: 0 }
  const bump = () => { _preloadProgress.done++; try { window.__setLoadProgress?.(_preloadProgress.done, _preloadProgress.total) } catch (_) {} }

  // One combined, deduped list (both fighters' body+skin sheets + both fighters' FX) through ONE bounded
  // pool — so the concurrency cap is global, not multiplied across separate preloadFighter/FX calls.
  const paths = new Set()
  if (cfg.p1CharKey) for (const p of collectFighterSheets(cfg.p1CharKey, cfg.p1Skin)) paths.add(p)
  if (cfg.p2CharKey) for (const p of collectFighterSheets(cfg.p2CharKey, cfg.p2Skin)) paths.add(p)
  for (const p of fxSheetsForFighters(cfg.p1CharKey, cfg.p2CharKey)) paths.add(p)

  const jobs = [preloadSheets([...paths], bump)]

  _preloadPromise = Promise.all(jobs).then(results => {
    _preloadProgress.total = results.reduce((n, r) => n + (r?.total || 0), 0)
    _preloadProgress.done  = _preloadProgress.total
    _preloadFailures = results.flatMap(r => r?.failures || [])
    _preloadReady = true
    // Report failures LOUDLY by filename at match start — a 404 or decode error here is otherwise
    // invisible until the offending move draws a fallback mid-fight (see AUDIO_INVENTORY phantom refs).
    if (_preloadFailures.length) {
      console.warn(`[preload] ${_preloadFailures.length} sheet(s) failed to preload for this match:`)
      for (const f of _preloadFailures) console.warn(`  ✗ ${f.path} — ${f.error}`)
    }
    try { window.__setLoadProgress?.(_preloadProgress.done, _preloadProgress.total) } catch (_) {}
    return { failures: _preloadFailures, progress: { ..._preloadProgress } }
  }).catch(() => { _preloadReady = true; return { failures: _preloadFailures } })  // never wedge the intro

  return _preloadPromise
}

// Stage 11C: start REPLAYING a recorded match. Validates (reject-on-mismatch), forces the recorded
// roster/skins/mode + seed, then runs startMatch with playback armed — updateBattle drives input from
// the replay instead of live keys, and verifies state against the recorded checkpoints (desync check).
// Returns { ok } or { ok:false, reason }.
function beginReplayPlayback(rep) {
  const v = replay.validateReplay(rep)
  if (!v.ok) { console.warn("[replay] refused:", v.reason); return { ok: false, reason: v.reason } }
  if (rep.p1Char && characters[rep.p1Char]) { matchConfig.p1CharKey = rep.p1Char; matchConfig.p1Char = characters[rep.p1Char] }
  if (rep.p2Char && characters[rep.p2Char]) { matchConfig.p2CharKey = rep.p2Char; matchConfig.p2Char = characters[rep.p2Char] }
  matchConfig.p1Skin = rep.p1Skin || "default"
  matchConfig.p2Skin = rep.p2Skin || "default"
  if (rep.mode) matchConfig.mode = rep.mode
  _forcedSeed = (rep.seed >>> 0)     // reproduce the exact gameplay RNG stream (Kamui etc.)
  replay.startPlayback(rep)          // arm playback BEFORE startMatch so its recording block suppresses
  startMatch()
  _forcedSeed = null                 // seed already consumed + stamped; don't leak into a later match
  return { ok: true }
}

// Round [x,y,energy] to 4dp for float-noise-safe state checkpoints (health is an integer). Shared by
// the recorder and playback so their snapshots are directly comparable.
function _replaySnap(f) { const r = v => Math.round((v || 0) * 1e4) / 1e4; return f ? [r(f.x), r(f.y), f.health, r(f.energy)] : [0, 0, 0, 0] }

// Stage 11D: download the most recent finished match's replay as a JSON file (victory-screen button).
function replayFilename(rep) { return `replay-${rep?.p1Char || "p1"}-vs-${rep?.p2Char || "p2"}-${rep?.seed || 0}.json` }
function saveLastReplay() {
  if (!_lastReplay) return false
  try { downloadText(replayFilename(_lastReplay), JSON.stringify(_lastReplay), "application/json"); return true } catch (_) { return false }
}

function startMatch() {
  sound.stopAllSfx?.({ includePersistent: true })   // new match → no cue from a prior match/menu bleeds in
  // Stage 11A: seed the gameplay RNG for THIS match before anything rolls (AI setup runs in resetRound
  // below). A forced seed reproduces an exact match (replay/tests); otherwise a fresh per-match seed.
  // Stamped onto matchConfig so the match is reproducible. Rounds within a match share the continuing
  // stream (reseed is per-MATCH, not per-round) — resetRound never reseeds.
  const _matchSeed = (_forcedSeed != null) ? (_forcedSeed >>> 0) : makeSeed()
  matchConfig.seed = _matchSeed
  reseedRng(_matchSeed)
  _roundEndAudioStopped = false
  // A standard 1v1/tower/training match never runs the FFA array path — make the flag honest
  // in case an FFA session was left without the result-screen exit (dispatch keys off gameState,
  // so this is bookkeeping hygiene, not a behavior gate).
  ffaState.active = false
  roundNumber  = 1
  roundWins    = { p1: 0, p2: 0 }
  comebackFinisherUsed = { p1: false, p2: false, p3: false, p4: false }   // fresh match → each side's one finisher is available again
  winnerText   = ""
  matchStats   = createMatchStats()
  victoryState = createVictoryState()
  roundTimer   = ROUND_TIME
  // Fresh match → default training toggles (a NEW session shouldn't inherit the last
  // one's infinite/dummy state). Per-round resets (resetRound) deliberately DON'T touch
  // these, so a toggle persists across rounds within the same session.
  trainingState.infiniteResources = false
  trainingState.dummyBehavior     = "stand"
  trainingState.cloneNoTell       = true    // confirmed design: standing clone is ZERO-tell (pixel-identical); the wash is a debug-only opt-in
  clearPlatforms()   // Wood Release climbable terrain: no stale platforms carry into a fresh match
  setCloneTell(false)

  // Keep the original synchronous per-character warmup + sheet-map population UNCHANGED — some
  // timing-sensitive suites depend on the exact startMatch cadence it produces. preloadMatch below
  // ADDS the decode-and-gate layer on top (body + skin + FX) without altering this.
  if (matchConfig.p1CharKey) { preloadCharacterSprites?.(matchConfig.p1CharKey); loadSpriteSheets(matchConfig.p1CharKey) }
  if (matchConfig.p2CharKey) { preloadCharacterSprites?.(matchConfig.p2CharKey); loadSpriteSheets(matchConfig.p2CharKey) }
  // Full decode-and-gate preload: body sheets (both fighters + skins) AND spawned FX. This Promise is
  // what gates the INTRO→BATTLE hop so no move first-use-faults to the _FALLBACK box mid-fight.
  preloadMatch(matchConfig)

  resetRound()

  // Stage 11B/11C: recording vs playback. During PLAYBACK (beginReplayPlayback already called
  // startPlayback) we do NOT record — the input is driven from the replay. Otherwise begin recording
  // this match's inputs (p1/p2 now exist), delta-encoded from the seed + roster + stage → a full replay.
  _replayFrame = 0
  if (replay.isPlayback()) {
    replay.abortRecording()
  } else if (shouldRecordMatch()) {
    replay.startRecording({
      seed: matchConfig.seed, mode: matchConfig.mode, rounds: MAX_ROUNDS,
      p1Char: matchConfig.p1CharKey, p1Skin: matchConfig.p1Skin,
      p2Char: matchConfig.p2CharKey, p2Skin: matchConfig.p2Skin,
      stage: matchConfig.selectedStage?.name || matchConfig.selectedStage || null
    })
  } else { replay.abortRecording() }

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
  matchConfig.p1EdoBackup = null; matchConfig.p2EdoBackup = null   // Edo Tensei vessel (Tobirama ultimate)
  matchConfig.p2IsBoss = false    // Stage 20: cleared on every fresh selection (only Arcade fight 7 sets it)
  matchConfig.modifiers = []      // Stage 24A: cleared on fresh selection (only Tower floors assign)
  hoverUniverseIndex  = 0
  hoverCharacterIndex = 0
  hoverEdoBackupIndex = 0
  hoverStageIndex     = 0
}

// Skin-select state (Task 4).
let skinSelectSide = "p1"
let _skinConfirm = null   // { side, index, timer, kicked } — brief lock-in flourish hold before proceeding (so the confirm flash is actually seen)
let hoverSkinIndex = 0

// After a character is locked in for a side, open the SKIN-SELECT for that side's
// character. Confirming a skin there calls _proceedAfterSkin() to continue.
// Lock in a character by key (shared by the click handler AND random-select, Stage 23). Honours the
// Stage 21 unlock gate + the Ben 10 / Tobirama detours. Returns true if it advanced.
function _selectCharacterKey(key) {
  const char = characters[key]
  if (!char) return false
  if (!isCharUnlocked(key)) { characterLockMsg = `${char.name || key} — ${charLockLabel(key) || "Locked"}`; try { sound.play?.(SFX.MENU_DENY || SFX.KO) } catch (_) {} return false }
  characterLockMsg = ""
  const side = matchConfig.selectingSide
  matchConfig[side + "Char"]    = char
  matchConfig[side + "CharKey"] = key
  if (key === "ben10") {
    matchConfig.alienSelectSide = side
    matchConfig.alienDraft = ((matchConfig[side + "Aliens"]?.length ? matchConfig[side + "Aliens"] : DEFAULT_OMNITRIX).filter(isArtBackedAlien)).slice()
    gameState = GAME_STATES.SELECT_ALIENS
  } else if (key === "tobirama") {
    matchConfig.edoSelectSide = side; hoverEdoBackupIndex = 0
    gameState = GAME_STATES.SELECT_EDO_BACKUP
  } else {
    proceedAfterCharacter(side)
  }
  return true
}

// RANDOM SELECT (Stage 23). universeOnly = pick within the current universe; else any playable +
// UNLOCKED fighter across the roster (so random never hands you a locked/silhouette character).
function pickRandomCharacter(universeOnly) {
  const pool = universeOnly
    ? getCharacterRosterForSelectedUniverse().map(c => c.id).filter(isCharUnlocked)
    : Object.keys(characters).filter(k => !characters[k]?.hidden && rosterKeyAllowed(k) && isCharUnlocked(k))
  if (!pool.length) return false
  const key = pool[Math.floor(Math.random() * pool.length)]
  // A cross-universe random needs the universe set so downstream (roster, detail) resolves correctly.
  if (!universeOnly) matchConfig.selectedUniverse = characters[key]?.universe || matchConfig.selectedUniverse
  const r = getCharacterRosterForSelectedUniverse()
  hoverCharacterIndex = Math.max(0, r.findIndex(c => c.id === key))
  return _selectCharacterKey(key)
}

// HOME STAGE (Stage 23). characters[key].homeStage (a stage NAME) wins; otherwise derive from the
// character's universe → series → that series' first non-FFA stage; else a neutral fallback.
const _UNIVERSE_SERIES = { jujutsu_kaisen: "jjk", naruto: "naruto", dragon_ball: "dragonball", demon_slayer: "demonslayer", rick_and_morty: "rickmorty", ben_10: "ben10",
  // 8 gap universes now have dedicated stages → route each to its new home stage (was falling back to Test Map).
  bleach: "bleach", dc: "dc", horror: "horror", hunter_x_hunter: "hxh", invincible: "invincible", power_rangers: "powerrangers", saiki_k: "saiki", original: "original" }
function homeStageFor(charKey) {
  const c = characters[charKey]; if (!c) return null
  if (c.homeStage) { const s = stages.find(st => st.name === c.homeStage); if (s) return s }
  const series = _UNIVERSE_SERIES[c.universe]
  if (series) { const s = stages.find(st => st.series === series && !st.ffa); if (s) return s }
  return stages.find(st => st.name === "Test Map") || stages[0]
}
// Pre-select the P1 fighter's home stage when the stage-select opens (player can still change it).
function _applyHomeStageDefault() {
  const s = homeStageFor(matchConfig.p1CharKey)
  if (s) { matchConfig.selectedStage = s; hoverStageIndex = Math.max(0, stages.indexOf(s)) }
}

function proceedAfterCharacter(side) {
  skinSelectSide = side
  hoverSkinIndex = 0
  _skinConfirm = null                       // clear any stale confirm hold from a prior skin pick
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
    } else if (matchConfig.mode === "arcade") {
      _beginArcadeFight()                     // fight 1 (or the rival intro) — Arcade auto-assigns opponent/stage
    } else if (matchConfig.mode === "bracket") {
      _buildAndStartBracket()                 // Stage 24B: field the bracket, show the tree, first match
    } else if (matchConfig.mode === "training") {
      matchConfig.p2Char    = matchConfig.p1Char
      matchConfig.p2CharKey = matchConfig.p1CharKey
      matchConfig.p2Aliens  = matchConfig.p1Aliens ? matchConfig.p1Aliens.slice() : null
      _applyHomeStageDefault()   // Stage 23: default to P1's home stage
      gameState = GAME_STATES.SELECT_STAGE
    } else {
      matchConfig.selectingSide    = "p2"
      matchConfig.selectedUniverse = null
      gameState = GAME_STATES.SELECT_UNIVERSE
    }
  } else {
    _applyHomeStageDefault()   // Stage 23: default to P1's home stage
    gameState = GAME_STATES.SELECT_STAGE
  }
}

// Layout for the skin cards on the SELECT_SKIN screen. Wraps into a centered GRID when the cards
// don't fit one row (chars can now have many recolor skins — e.g. Gojo's 9), and shrinks the cards
// as a fallback so even a large set stays fully on-screen and clickable.
function getSkinSelectRects(canvas, count) {
  const gap = 24, topPad = 150, botPad = 40, sidePad = 40
  let cardW = 180, cardH = 230
  const availW = canvas.width - sidePad * 2
  const availH = canvas.height - topPad - botPad
  // columns that fit at full size; then compute rows and shrink to fit vertically if needed.
  let cols = Math.max(1, Math.min(count, Math.floor((availW + gap) / (cardW + gap))))
  let rows = Math.ceil(count / cols)
  const maxH = (availH - (rows - 1) * gap) / rows
  if (cardH > maxH) { const s = maxH / cardH; cardH = maxH; cardW = Math.round(cardW * s) }
  // re-fit columns to the (possibly shrunk) width so a wide-but-short set doesn't overflow.
  cols = Math.max(1, Math.min(count, Math.floor((availW + gap) / (cardW + gap))))
  rows = Math.ceil(count / cols)
  const blockH = rows * cardH + (rows - 1) * gap
  const y0 = topPad + Math.max(0, (availH - blockH) / 2)
  const rects = []
  for (let i = 0; i < count; i++) {
    const row = Math.floor(i / cols), col = i % cols
    const inRow = Math.min(cols, count - row * cols)
    const rowW = inRow * cardW + (inRow - 1) * gap
    const x0 = canvas.width / 2 - rowW / 2
    rects.push({ x: x0 + col * (cardW + gap), y: y0 + row * (cardH + gap), w: cardW, h: cardH, index: i })
  }
  return rects
}

function drawSkinSelectScreen() {
  ctx.fillStyle = "#0a1322"; ctx.fillRect(0, 0, canvas.width, canvas.height)
  const charKey = matchConfig[skinSelectSide + "CharKey"]
  const skins = getSkins(charKey)
  ctx.textAlign = "center"; ctx.fillStyle = "#e2e8f0"; ctx.font = "700 32px Arial"
  ctx.fillText(`SELECT SKIN — ${charKey?.toUpperCase() || ""}  (P${skinSelectSide === "p1" ? 1 : 2})`, canvas.width / 2, 110)
  const rects = getSkinSelectRects(canvas, skins.length)
  // Same select-card animation LANGUAGE as the character-select grid: eased hover scale-up + accent
  // glow-pulse, and a punchy confirm flash + zoom-punch on the picked skin. Accent = the character's own
  // select colour so the glow matches char-select. selectCardAdvance() drives the shared glow clock once.
  selectCardAdvance()
  const accent = charSelectAccent(charKey) || "#38bdf8"
  rects.forEach((r, i) => {
    const skin = skins[i]
    const unlocked = isSkinUnlocked(charKey, skin.id)
    const hovered  = i === hoverSkinIndex
    const confirmKick = !!(_skinConfirm && _skinConfirm.index === i && !_skinConfirm.kicked)
    if (confirmKick) _skinConfirm.kicked = true
    const a  = selectCardAnim(`skin:${charKey}:${skin.id}`, hovered && unlocked, confirmKick)
    const cx = r.x + r.w / 2, cy = r.y + r.h / 2
    ctx.save()
    if (a.scale !== 1) { ctx.translate(cx, cy); ctx.scale(a.scale, a.scale); ctx.translate(-cx, -cy) }
    // Dark bevel-shaped backing + the skin portrait (contain-fit, clipped to the MK card shape).
    ctx.save(); _bevelPath(ctx, r.x, r.y, r.w, r.h, 12); ctx.clip()
    ctx.fillStyle = "#101c2e"; ctx.fillRect(r.x, r.y, r.w, r.h)
    const img = _skinPortrait(skin.portrait)
    if (img && img.complete && img.naturalWidth > 0) drawImageFit(ctx, img, r.x + 10, r.y + 10, r.w - 20, r.h - 64, { fit: "contain" })
    ctx.restore()
    // Selection language on top (hover tint/border/glow-pulse + confirm flash) — transparent base fill
    // so the portrait shows through until hovered.
    drawSelectCardFrame(ctx, r, { accent, hover: a.hover, confirm: a.confirm, locked: !unlocked, cut: 12, baseFill: "rgba(0,0,0,0)" })
    ctx.textAlign = "center"; ctx.fillStyle = "#e6edf7"; ctx.font = "700 16px Arial"
    ctx.fillText(skin.name, cx, r.y + r.h - 22)
    if (!unlocked) {
      ctx.save(); _bevelPath(ctx, r.x, r.y, r.w, r.h, 12); ctx.clip()
      ctx.fillStyle = "rgba(8,12,24,0.66)"; ctx.fillRect(r.x, r.y, r.w, r.h)
      ctx.fillStyle = "#94a3b8"; ctx.font = "700 22px Arial"; ctx.fillText("🔒", cx, cy - 10)
      ctx.fillStyle = "#cbd5e1"; ctx.font = "600 14px Arial"; ctx.fillText(`Unlocks at Lv. ${skin.unlockLevel}`, cx, cy + 18)
      ctx.restore()
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
  sound.stopAllSfx?.({ includePersistent: true })   // leaving the match/victory → stop ALL cues incl. win-lines
  gameState        = GAME_STATES.START
  aiVsAiState.active = false   // leaving a match kills any in-progress AI-vs-AI run (stops fast-forward/auto-advance)
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
  clearKuramaUltimate(); clearMinatoKurama(); clearObitoJuubi(); clearTobiNineTails()
  clearSasukeCinematic()
  clearSSJRoseCinematic()
  clearGokuBlackSwordCinematic()
  clearRedRangerPowerSwordCinematic()
  clearKilluaGodspeedCinematic()
  clearFlashTimeCinematic(); if (p1) forceRevertFlashTime(p1); if (p2) forceRevertFlashTime(p2)
  clearGonAdultFormCinematic()
  clearHisokaOverdriveCinematic()
  clearTojiReincarnationCinematic()
  clearTojiFlyHeadsSwarm()
  for (const _f of [p1, p2]) { if (!_f) continue; forceRevertGonAdultForm(_f); forceRevertHisokaOverdrive(_f); forceRevertOmniManFlight(_f); forceRevertSupermanModes(_f); revertZarakiShikai(_f); _f._suddenDeathWatch = false; _f._suddenDeathAtk = null }
  _matchOverride = null   // clear any pending sudden-death override on every reset path
  clearMangekyouCinematic()
  clearVegetaFinalFlashCinematic()
  clearBeerusKiBallCinematic()
  clearBen10OmnitrixCinematic()
  clearBatmanDarkKnightCinematic()
  clearOmniManBodySlamCinematic()
  clearSupermanUltimateCinematic()
  clearRengokuFlameExplosionCinematic()
  clearMadaraTengaiShinseiCinematic()
  clearHashiramaSealingJutsuCinematic()
  clearPainChibakuTenseiCinematic()
  clearYujiUltimateCinematic()
  clearShinobuButterflyCinematic()
  clearInosukeBeastCinematic()
  clearGhostfaceFinalActCinematic()
  clearMiwaUltimateCinematic()
  clearIchigoGetsugaCinematic()
  clearMakiShibuyaCinematic()
  clearEdoTenseiCinematic()
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
    comboDisplay[side].pop       = 0
    comboDisplay[side].prevCount = 0
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
    // Single-pad convention is keyboard(P1) + pad(P2). If a pad was plugged in BEFORE PvP was
    // chosen, the gamepadconnected auto-activate may have flipped P1 → controller from the cold
    // keyboard/keyboard menu — which would strand the keyboard player. Restore P1 = keyboard
    // unless there are 2+ pads (genuine pad/pad play, which still wants P1 on a controller).
    if (getConnectedPadCount() < 2) inputSettings.p1Type = "keyboard"
    beginUniverseSelect()
    return
  }
  gameState = GAME_STATES.AI_DIFFICULTY
}

function chooseDifficulty(difficulty) {
  matchConfig.aiDifficulty = difficulty
  beginUniverseSelect()
}

// ── AI vs AI — SPECTATOR / TESTING MODE ──────────────────────────────────────
// Two CPU fighters battle with no human input. Reuses the SAME per-fighter AI path
// as the 1v1 CPU (getAIInput → applyAIInputToKeys), just wired to BOTH slots with
// independent difficulties. Fast-forward + auto-repeat + a move-by-move telemetry
// log (spectator.js) sit on top; none of it changes any character's balance data.
function _nowMs() { return (typeof performance !== "undefined" ? performance.now() : Date.now()) }

// Selectable roster for the AI-vs-AI picker. Sprite-having fighters first (best spectacle) but every
// non-hidden character is pickable — the mode works for procedural-box fighters too.
let _aiVsAiRosterCache = null
function aiVsAiRoster() {
  if (!_aiVsAiRosterCache) {
    const list = characterList.filter(c => !c.hidden)
    list.sort((a, b) => (b.hasSprites ? 1 : 0) - (a.hasSprites ? 1 : 0))
    _aiVsAiRosterCache = list.map(c => ({ key: c.rosterKey, name: c.name }))
  }
  // BETA gate applied on RETURN (not baked into the cache) so it tracks BETA toggling live: while BETA
  // is active the spectator picker offers only sprite-having fighters (a no-op passthrough otherwise),
  // same central check as everywhere.
  return _aiVsAiRosterCache.filter(c => rosterKeyAllowed(c.key))
}

function _cycleAiVsAiChar(which, dir) {
  const r = aiVsAiRoster()
  const keyField = which === "p1" ? "p1Key" : "p2Key"
  let i = r.findIndex(c => c.key === aiVsAiConfig[keyField])
  if (i < 0) i = 0
  i = (i + dir + r.length) % r.length
  aiVsAiConfig[keyField] = r[i].key
}

// Change a setup-screen row's value by dir (-1/+1). Rows without a value (start/back) are no-ops.
function _cycleAiVsAiRow(id, dir) {
  const diffs = SPECTATOR_DIFFICULTIES
  const counts = [1, 3, 5, 10, 25]
  switch (id) {
    case "p1char": _cycleAiVsAiChar("p1", dir); break
    case "p2char": _cycleAiVsAiChar("p2", dir); break
    case "p1diff": { let i = diffs.indexOf(aiVsAiConfig.p1Diff); i = (i + dir + diffs.length) % diffs.length; aiVsAiConfig.p1Diff = diffs[i]; break }
    case "p2diff": { let i = diffs.indexOf(aiVsAiConfig.p2Diff); i = (i + dir + diffs.length) % diffs.length; aiVsAiConfig.p2Diff = diffs[i]; break }
    case "matches": { let i = counts.indexOf(aiVsAiConfig.matches); if (i < 0) i = 1; i = (i + dir + counts.length) % counts.length; aiVsAiConfig.matches = counts[i]; break }
    case "speed": { const n = SPECTATOR_SPEEDS.length; aiVsAiConfig.speedIndex = (aiVsAiConfig.speedIndex + dir + n) % n; break }
  }
}

// Act on a setup row (Enter / click): value rows cycle forward; start/back navigate.
function _activateAiVsAiRow(id) {
  if (id === "start")     { startAiVsAiSession(); return }
  if (id === "back")      { gameState = GAME_STATES.GAMEPLAY_SELECT; return }
  _cycleAiVsAiRow(id, +1)
}

// Filename-safe timestamp; performance.now() isn't wall-clock so fall back to Date for the label.
function _fileStamp() {
  try { return new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19) }
  catch (_) { return "run" }
}

// Deterministic stage rotation across the run so a repeated matchup gets varied stages.
function _aiVsAiStageFor(matchIndex) {
  if (!Array.isArray(stages) || !stages.length) return null
  return stages[matchIndex % stages.length]
}

// Begin the current match's telemetry log and reset the per-fighter move-usage latches.
function _beginAiVsAiMatchLog() {
  startMatchLog(aiVsAiState.session, {
    index:         aiVsAiState.matchesDone + 1,
    p1Char:        matchConfig.p1CharKey, p1Difficulty: aiVsAiConfig.p1Diff,
    p2Char:        matchConfig.p2CharKey, p2Difficulty: aiVsAiConfig.p2Diff,
    frame:         globalFrameCount
  })
  if (p1) p1._specLastAtk = null
  if (p2) p2._specLastAtk = null
}

// Kick off a fresh N-match spectator run from the setup-screen selections.
function startAiVsAiSession() {
  const p1Key = aiVsAiConfig.p1Key, p2Key = aiVsAiConfig.p2Key
  if (!characters[p1Key] || !characters[p2Key]) return
  resetSelections()
  towerState.active = false
  ffaState.active   = false
  matchConfig.mode          = "aivsai"
  matchConfig.aiDifficulty  = aiVsAiConfig.p2Diff        // legacy single-field; per-slot diffs used in resetRound
  matchConfig.selectedStage = _aiVsAiStageFor(0) || (Array.isArray(stages) ? stages[0] : null)
  matchConfig.p1CharKey = p1Key; matchConfig.p1Char = characters[p1Key]
  matchConfig.p2CharKey = p2Key; matchConfig.p2Char = characters[p2Key]
  matchConfig.p1Skin = "default"; matchConfig.p2Skin = "default"

  aiVsAiState.active       = true
  aiVsAiState.finished     = false
  aiVsAiState.speed        = SPECTATOR_SPEEDS[aiVsAiConfig.speedIndex] || 1
  aiVsAiState.matchesTotal = Math.max(1, aiVsAiConfig.matches | 0)
  aiVsAiState.matchesDone  = 0
  aiVsAiState.autoAdvance  = 0
  aiVsAiState.lastExport   = null
  aiVsAiState.session = createSpectatorSession({
    p1Char: p1Key, p1Difficulty: aiVsAiConfig.p1Diff,
    p2Char: p2Key, p2Difficulty: aiVsAiConfig.p2Diff,
    matches: aiVsAiState.matchesTotal, speed: aiVsAiState.speed,
    stage: matchConfig.selectedStage?.name || matchConfig.selectedStage || null
  }, _nowMs())

  _beginAiVsAiMatchLog()
  startMatch()
}

// Per-frame telemetry: detect a NEW attack instance on each fighter (covers whiffs) and log it as
// a "move used". Object-identity on currentAttack means one log per move start, not per active frame.
function _aiVsAiWatchMoves() {
  for (const [side, f] of [["p1", p1], ["p2", p2]]) {
    if (!f) continue
    const atk = f.currentAttack || null
    if (atk && atk !== f._specLastAtk) {
      const name = atk.name || f.currentMove || "attack"
      const cat  = atk.isUltimate ? "ultimate" : atk.isSpecial ? "special" : (atk.category || null)
      logMoveUsed(aiVsAiState.session, side, name, { frame: globalFrameCount, category: cat })
    }
    f._specLastAtk = atk
  }
}

// Finalise the just-ended match into the session log (called once when VICTORY is reached).
function _finalizeAiVsAiMatch() {
  aiVsAiState.matchesDone++
  finalizeMatchLog(aiVsAiState.session, {
    winner:     victoryState.winnerSide,
    winnerName: victoryState.winnerName,
    roundsWon:  { p1: roundWins.p1, p2: roundWins.p2 },
    frame:      globalFrameCount
    // method omitted → spectator.js defaults it to the last logged round's method (ko/timeout/double_ko)
  })
  aiVsAiState.autoAdvance = 45   // brief result dwell (itself fast-forwarded) before the next match
}

// Whole run complete: serialise the session to JSON + CSV and land on the summary screen.
function _finishAiVsAiRun() {
  const session = aiVsAiState.session
  const stamp = _fileStamp()
  aiVsAiState.lastExport = {
    json:     sessionToJSON(session),
    csv:      sessionToCSV(session),
    summary:  summarizeSession(session),
    jsonName: `aivsai-log-${stamp}.json`,
    csvName:  `aivsai-log-${stamp}.csv`
  }
  aiVsAiState.finished = true
  aiVsAiState.active   = false   // stop fast-forward + auto-advance
  // Auto-export both formats to the browser's downloads (no-op in a headless/no-DOM harness — the
  // harness reads aiVsAiState.lastExport directly). The summary screen can re-download on demand.
  const exp = aiVsAiState.lastExport
  downloadText(exp.jsonName, exp.json, "application/json")
  downloadText(exp.csvName,  exp.csv,  "text/csv")
  gameState = GAME_STATES.AI_VS_AI_SUMMARY
}

// Driven every frame from updateCurrentState. Handles move telemetry during the fight and the
// auto-advance / repeat-N / finish flow on the VICTORY screen. Inert outside the mode.
function updateAiVsAiController() {
  if (!aiVsAiState.active) return
  if (gameState === GAME_STATES.BATTLE) _aiVsAiWatchMoves()

  if (gameState === GAME_STATES.VICTORY) {
    if (aiVsAiState.session?._current) _finalizeAiVsAiMatch()   // finalise once
    if (aiVsAiState.autoAdvance > 0) { aiVsAiState.autoAdvance--; return }
    if (aiVsAiState.matchesDone < aiVsAiState.matchesTotal) {
      _beginAiVsAiMatchLog()
      startMatch()                                              // next match (fresh best-of-3)
    } else {
      _finishAiVsAiRun()
    }
  }
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
  // INSTANT MATCH-END OVERRIDE (Gon Adult Form sudden-death) is checked INDEPENDENTLY of — not as an
  // addition alongside — the normal roundWins/MAX_ROUNDS gate: when `_matchOverride` is set the match
  // ends NOW with the forced winner, even if NEITHER player has reached 2 round wins (e.g. Gon at 0-0).
  const forced = _matchOverride
  // BOSS single-round (Stage 20, bossProfile.noRoundLimit): an arcade boss fight is one round to the
  // death — the FIRST round decision ends the match (no best-of-3).
  const bossFight = !!(p1?._isBoss || p2?._isBoss)
  if (forced || roundWins.p1 >= 2 || roundWins.p2 >= 2 || roundNumber >= MAX_ROUNDS ||
      (bossFight && (roundWins.p1 >= 1 || roundWins.p2 >= 1))) {
    _matchOverride = null   // one-shot: consume so it can't re-fire
    const winner = forced ? forced.winnerSide
      : roundWins.p1 > roundWins.p2 ? "p1" : roundWins.p2 > roundWins.p1 ? "p2" : "draw"
    // Stage 11B/11D: match over → finalize the replay and offer it on the victory screen (Save Replay).
    if (replay.isRecording()) { _lastReplay = replay.finishRecording(); if (_lastReplay) _lastReplay.winner = winner }
    victoryState.canSaveReplay = !!_lastReplay
    // Stage 24C: offer CHANGE CHARACTER for plain versus modes (not mid-Tower/Arcade/FFA runs).
    victoryState.canChangeChar = ["vs", "pvp", "training"].includes(matchConfig.mode) && !towerState.active && !arcadeState.active
    victoryState.active     = true
    victoryState.fadeAlpha  = 0
    victoryState.winnerSide = winner
    victoryState.winnerName =
      winner === "p1" ? (p1?.name || "Player 1")
      : winner === "p2" ? (p2?.name || (isPvP() ? "Player 2" : "CPU"))
      : "Draw"
    // WIN/LOSE POSE (Stage 8): pose the winner + loser via _forceAction, gated on the fighter defining a
    // win/lose animationData clip (currently only Nezuko — roster-safe no-op for everyone else). Fighters are
    // recreated on rematch, so the override never leaks past this match. See NEZUKO_ASSET_MAP.md.
    if (winner === "p1" || winner === "p2") {
      const winF  = winner === "p1" ? p1 : p2
      const loseF = winner === "p1" ? p2 : p1
      if (winF?.animationData?.win)   winF._forceAction  = "win"
      if (loseF?.animationData?.lose) loseF._forceAction = "lose"
    }
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
    if (matchConfig.mode !== "training" && matchConfig.mode !== "aivsai") {
      const p1Won  = winner === "p1"
      const beforeLevel = getLevel()
      victoryState.xpResult = awardMatchXp({ won: p1Won, roundsWon: roundWins.p1, perfect: p1Won && roundWins.p2 === 0 })
      // Stage 21: any CHARACTER whose level-gate was crossed this match → victory-screen "NEW FIGHTER" note.
      victoryState.charUnlocks = charactersUnlockedBetween(beforeLevel, victoryState.xpResult.level, characters)
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
    if (arcadeState.active) {
      updateArcadeOutcome(winner)
      // Arcade-aware result screen: fight N/7 context + a role-specific prompt. On a loss the
      // primary button spends a CONTINUE (the run only truly ends via "MAIN MENU").
      const fightNum = arcadeState.fight + 1
      const role = arcadeFightRole(fightNum)
      const roleTag = role === "boss" ? "BOSS" : role === "rival" ? "RIVAL" : `FIGHT ${fightNum}/${ARCADE_FIGHTS}`
      if (winner === "p1") {
        if (arcadeState.cleared)  { victoryState.subtitle = `ARCADE CLEARED${arcadeState.continuesUsed === 0 ? " · NO CONTINUES!" : ""}`; victoryState.primaryLabel = "ENDING" }
        else if (role === "rival"){ victoryState.subtitle = `RIVAL DEFEATED`;                                            victoryState.primaryLabel = "NEXT FIGHT" }
        else                      { victoryState.subtitle = `ARCADE · ${roleTag} CLEARED`;                                victoryState.primaryLabel = "NEXT FIGHT" }
      } else {
        victoryState.subtitle = `ARCADE · FELL ON ${roleTag} — CONTINUE?`
        victoryState.primaryLabel = "CONTINUE"
      }
    }
    if (isBracket()) {
      updateBracketOutcome(winner)   // p1 win → human advances; p2 → they're eliminated (bracket still runs)
      const rd = bracketState.round + 1, total = bracketState.rounds.length
      victoryState.subtitle = winner === "p1" ? `TOURNAMENT · ROUND ${rd} WON` : `TOURNAMENT · ELIMINATED (round ${rd})`
      victoryState.primaryLabel = "BRACKET"
    }
    sound.stopMusic?.()
    sound.play?.(SFX.KO)
    // WIN/LOSS lines are INTENTIONAL post-match audio → mark them persistent so the round-end/menu
    // stopAllSfx (which already cut the combat audio above) can't silence them on the victory screen.
    sound._forcePersistent = true
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
      // MINATO win voice — one of three victory lines at random ("I win", "this is my victory", "…connects to the future").
      if (winFighter?.rosterKey === "minato") {
        sound.playSfxFile?.(pickMinatoVoice("win"), null)
      }
      // SASUKE win voice — same 50/50 coin-flip pattern as Beerus/Goku Black; alternates between
      // "It's over. It's over." and "Right now, I am the strongest in this world."
      if (winFighter?.rosterKey === "sasuke") {
        sound.playSfxFile?.(Math.random() < 0.5 ? "sasuke_win_line.mp3" : "sasuke_win_alt.mp3", null)
      }
      // ITACHI win voice — random pick from his win pool ("Winning is easy" / "It's already over" /
      // "You lose"). Fires only when the WINNER is Itachi.
      if (winFighter?.rosterKey === "itachi") {
        sound.playSfxFile?.(pickItachiVoice("win"), null)
      }
      // RICK win voice — same alternation family; random pick between "Time to get schwifty" and
      // his "Rick dance" win bark. Fires only when the WINNER is Rick.
      if (winFighter?.rosterKey === "rick") {
        sound.playSfxFile?.(pickRickVoice("win"), null)
      }
      // KILLUA win voice — random pick from his victory pool (laugh / "Alright, win" / "Let's test it out").
      // Fires only when the WINNER is Killua.
      if (winFighter?.rosterKey === "killua") {
        sound.playSfxFile?.(pickKilluaVoice("win"), null)
      }
      // GON win voice — random pick from his victory pool ("Big victory!" / "Let's do it again" /
      // "Managed to win" / "That was tough, you got stronger"). Fires only when the WINNER is Gon.
      if (winFighter?.rosterKey === "gon") {
        sound.playSfxFile?.(pickGonVoice("win"), null)
      }
      // HISOKA win voice — random pick from his victory pool ("You pass~" / "How about dinner after
      // this~?" / "I toyed with you a bit too much~"). Fires only when the WINNER is Hisoka.
      if (winFighter?.rosterKey === "hisoka") {
        sound.playSfxFile?.(pickHisokaVoice("win"), null)
      }
      // GHOSTFACE win voice — random pick from his victory pool ("Now you lose" / "You won't get a
      // sequel!" / "See you soon!"). Fires only when the WINNER is Ghostface.
      if (winFighter?.rosterKey === "ghostface") {
        sound.playSfxFile?.(pickGhostfaceVoice("win"), null)
      }
      // MIWA win voice — random pick from her victory pool ("I did it!" / "I won safely!" / "It was a good
      // match, wasn't it?"). Fires only when the WINNER is Miwa. JP dub.
      if (winFighter?.rosterKey === "miwa") {
        sound.playSfxFile?.(pickMiwaVoice("win"), null)
      }
      // MADARA win voice — random pick from his victory pool ("There's no time to be a loser" / "You have no
      // place here" / "Farewell"). Fires only when the WINNER is Madara. JA.
      if (winFighter?.rosterKey === "madara") {
        sound.playSfxFile?.(pickMadaraVoice("win"), null)
      }
      // HASHIRAMA win voice — random pick from his victory pool ("A fine match!" / "Hone your skills and
      // come back" / "Your spirit is splendid"). Fires only when the WINNER is Hashirama. JA.
      if (winFighter?.rosterKey === "hashirama") {
        sound.playSfxFile?.(pickHashiramaVoice("win"), null)
      }
      // PAIN win voice — random pick from his victory pool ("Goodbye" / "Let's finish this" / "I'll send you to the next world"). Fires only when the WINNER is Pain. JA.
      if (winFighter?.rosterKey === "pain") {
        sound.playSfxFile?.(pickPainVoice("win"), null)
      }
      // OBITO win voice — random pick from his victory pool. Fires only when the WINNER is Obito. JA.
      if (winFighter?.rosterKey === "obito") {
        sound.playSfxFile?.(pickObitoVoice("win"), null)
      }
      // ICHIGO win voice — random pick from his victory pool ("It's my win." / "That was fun." /
      // "Let's end this."). Fires only when the WINNER is Ichigo. JA.
      if (winFighter?.rosterKey === "ichigo") {
        sound.playSfxFile?.(pickIchigoVoice("win"), null)
      }
      // ZARAKI win voice — random pick from his victory pool ("Good fight." / "This isn't over!" / "Come kill
      // me again."). Fires when the WINNER is either Zaraki entry (base or Shikai). JA.
      if (["zaraki", "zaraki_shikai"].includes(winFighter?.rosterKey)) {
        sound.playSfxFile?.(pickZarakiVoice("victory"), null)
      }
      // YUJI win voice — random pick from his victory pool ("I did it!" / "I'm the winner!" / "That was a
      // good match!"). Fires only when the WINNER is Yuji. JA active (EN switchable).
      if (winFighter?.rosterKey === "yuji") {
        sound.playSfxFile?.(pickYujiVoice("win"), null)
      }
      // SUKUNA win voice — random pick from his victory pool ("It's over." / "Did you think you could win?" /
      // "Well done."). Fires only when the WINNER is Sukuna. JA active (EN switchable).
      if (winFighter?.rosterKey === "sukuna") {
        sound.playSfxFile?.(pickSukunaVoice("win"), null)
      }
      // TOJI win voice — random pick from his victory pool ("It's over." / "Job's done." / "Go home now.").
      // Fires only when the WINNER is Toji. JA active (EN switchable).
      if (winFighter?.rosterKey === "toji") {
        sound.playSfxFile?.(pickTojiVoice("win"), null)
      }
      // BATMAN win voice — random pick from his victory pool ("You'll find plenty back in Arkham" /
      // "Gotham will rise again"). Fires only when the WINNER is Batman.
      if (winFighter?.rosterKey === "batman") {
        sound.playSfxFile?.(pickBatmanVoice("win"), null)
      }
      // OMNI-MAN win voice — random pick from his victory pool ("Recognize your superior" / "What a
      // disgrace to your species"). Fires only when the WINNER is Omni-Man.
      if (winFighter?.rosterKey === "omniman") {
        sound.playSfxFile?.(pickOmniManVoice("win"), null)
      }
      // SUPERMAN win voice — random pick from his victory pool ("Crime doesn't pay" / "Please don't get
      // up"). Fires only when the WINNER is Superman.
      if (winFighter?.rosterKey === "superman") {
        sound.playSfxFile?.(pickSupermanVoice("win"), null)
      }
      // RENGOKU win voice — random pick from his determination/resolve pool ("Set your heart ablaze" /
      // "I'll fulfill my duty" / "I'll defeat you here"). Fires only when the WINNER is Rengoku.
      if (winFighter?.rosterKey === "rengoku") {
        sound.playSfxFile?.(pickRengokuVoice("win"), null)
      }
      // INOSUKE win voice — random pick from his victory pool ("Yesss!" / "My cutting is my pride" /
      // victory laugh). Fires only when the WINNER is Inosuke.
      if (winFighter?.rosterKey === "inosuke") {
        sound.playSfxFile?.(pickInosukeVoice("win"), null)
      }
      // NEZUKO win grunt — random pick from her longer-vocalization pool. Fires only when the WINNER is Nezuko.
      if (winFighter?.rosterKey === "nezuko") {
        sound.playSfxFile?.(pickNezukoVoice("win"), null)
      }
      // FLASH "Reverse Flash" SKIN win voice — skin-gated (pickSkinVoice returns null on every other
      // Flash skin, and base Flash has no win pool → base Flash's win beat is silent, unchanged).
      if (winFighter?.rosterKey === "flash") {
        const clip = pickSkinVoice("flash", winFighter.skinId, "win")
        if (clip) sound.playSfxFile?.(clip, null)
      }
      // TOBIRAMA win voice — random pick from his finisher/victory declarations ("For the future, forward"
      // / "No longer needed" / "Stay asleep"). Fires only when the WINNER is Tobirama.
      if (winFighter?.rosterKey === "tobirama") {
        sound.playSfxFile?.(pickTobiramaVoice("finisher"), null)
      }
      // Netero win voice removed (audio files deleted); re-add a `winFighter?.rosterKey === "netero"`
      // block here (mirroring the Rick one above) to re-enable.
      // GOJO "Limitless" skin win voice — young-Gojo victory pack, random pick. Gated to the
      // gojo2 skin via pickSkinVoice (returns null on the default skin), so base Gojo's win beat
      // is unchanged. Fires only when the WINNER is a Limitless-skin Gojo.
      if (winFighter?.rosterKey === "gojo") {
        const clip = pickSkinVoice("gojo", winFighter.skinId, "win")
        if (clip) sound.playSfxFile?.(clip, null)
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
    sound._forcePersistent = false   // end of the intentional post-match audio window
    sound.playMenuMusic?.()   // win screen is non-stadium → Passion_fruitmp3.mp3
    gameState = GAME_STATES.VICTORY
  } else {
    roundNumber++
    roundBreakTimer = ROUND_BREAK_DURATION
    gameState = GAME_STATES.ROUND_BREAK
  }
}

// INSTANT MATCH END — force the match to resolve NOW with `winnerSide` ("p1"/"p2"), bypassing the normal
// roundWins>=2 condition entirely (Gon Adult Form sudden-death). Arms the one-shot override then routes
// through the SAME _checkMatchOver() path (victory screen / XP / tower / win-voice all reuse). No-op if
// the match is already resolved.
function forceMatchEnd(winnerSide) {
  if (victoryState.active) return
  if (winnerSide !== "p1" && winnerSide !== "p2") return
  _matchOverride = { winnerSide }
  _checkMatchOver()
}

// GON SUDDEN-DEATH ("Final Blow") watcher — per frame, resolve an armed Adult Form finisher:
//   • a CLEAN unblocked connect (combat marks _sdConnect="clean")           → INSTANT WIN for Gon
//   • the swing fully resolves without a clean connect (whiff OR block)     → INSTANT LOSS for Gon
// Either outcome overrides the round score (forceMatchEnd → _checkMatchOver override). One throw per form.
function _updateGonSuddenDeath() {
  for (const f of [p1, p2]) {
    if (!f || !f._suddenDeathWatch) continue
    const gonSide = (f === p1) ? "p1" : "p2"
    const oppSide = (gonSide === "p1") ? "p2" : "p1"
    const atk = f._suddenDeathAtk
    if (atk && atk._sdConnect === "clean") {                 // landed clean → Gon WINS the match outright
      f._suddenDeathWatch = false; f._suddenDeathAtk = null
      forceMatchEnd(gonSide)
      return
    }
    // Swing over (attack ended / replaced) with no clean connect → Gon LOSES the match outright.
    if (!f.attacking || f.currentAttack !== atk) {
      f._suddenDeathWatch = false; f._suddenDeathAtk = null
      forceMatchEnd(oppSide)
      return
    }
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

// Stage 24C: return to the fighter-select flow from the victory screen, KEEPING mode + stage +
// settings. Only reached for plain vs/pvp/training (canChangeChar gates it).
function _changeCharacter() {
  towerState.active = false; arcadeState.active = false
  victoryState.active = false
  matchConfig.selectingSide    = "p1"
  matchConfig.selectedUniverse = null
  matchConfig.p1CharKey = null; matchConfig.p2CharKey = null
  matchConfig.p1Char = null; matchConfig.p2Char = null
  matchConfig.p1Skin = "default"; matchConfig.p2Skin = "default"
  matchConfig.p1Aliens = null; matchConfig.p2Aliens = null
  // matchConfig.mode + selectedStage kept intentionally.
  gameState = GAME_STATES.SELECT_UNIVERSE
}

function _doRematch() {
  sound.stopAllSfx?.({ includePersistent: true })   // rematch → clear the victory-screen win-line + any leftover cue
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
  clearKuramaUltimate(); clearMinatoKurama(); clearObitoJuubi(); clearTobiNineTails()
  clearSasukeCinematic()
  clearSSJRoseCinematic()
  clearGokuBlackSwordCinematic()
  clearRedRangerPowerSwordCinematic()
  clearKilluaGodspeedCinematic()
  clearFlashTimeCinematic(); if (p1) forceRevertFlashTime(p1); if (p2) forceRevertFlashTime(p2)
  clearGonAdultFormCinematic()
  clearHisokaOverdriveCinematic()
  clearTojiReincarnationCinematic()
  clearTojiFlyHeadsSwarm()
  for (const _f of [p1, p2]) { if (!_f) continue; forceRevertGonAdultForm(_f); forceRevertHisokaOverdrive(_f); forceRevertOmniManFlight(_f); forceRevertSupermanModes(_f); revertZarakiShikai(_f); _f._suddenDeathWatch = false; _f._suddenDeathAtk = null }
  _matchOverride = null   // clear any pending sudden-death override on every reset path
  clearMangekyouCinematic()
  clearVegetaFinalFlashCinematic()
  clearBeerusKiBallCinematic()
  clearBen10OmnitrixCinematic()
  clearBatmanDarkKnightCinematic()
  clearOmniManBodySlamCinematic()
  clearSupermanUltimateCinematic()
  clearRengokuFlameExplosionCinematic()
  clearMadaraTengaiShinseiCinematic()
  clearHashiramaSealingJutsuCinematic()
  clearPainChibakuTenseiCinematic()
  clearYujiUltimateCinematic()
  clearShinobuButterflyCinematic()
  clearInosukeBeastCinematic()
  clearGhostfaceFinalActCinematic()
  clearMiwaUltimateCinematic()
  clearIchigoGetsugaCinematic()
  clearMakiShibuyaCinematic()
  clearEdoTenseiCinematic()
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
  ;[c.left, c.right, c.up, c.down, c.light, c.heavy, c.upAttack, c.special, c.ultimate, c.grab, c.charge, c.block]
    .forEach(k => { if (k) keys[k] = false })
}

function applyAIInputToKeys(fighter, aiInput) {
  if (!fighter || !aiInput) return
  const c = fighter.controls
  clearAIControlKeys(fighter)
  if (aiInput.left)                         keys[c.left]    = true
  if (aiInput.right)                        keys[c.right]   = true
  if (aiInput.down)                         keys[c.down]    = true         // hold Down = crouch / down-motion (no longer blocks)
  if (aiInput.block)                        keys[c.block]   = true         // dedicated guard input (MK-feel Stage 1c)
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
  // AI vs AI: BOTH fighters are CPU-driven. Reuses the exact same per-fighter AI path as the
  // 1v1 CPU below — just runs it a second time for P1 with its own controller (p1AI).
  if (matchConfig.mode === "aivsai") {
    if (p1) {
      if (isTransformDevice(p1) && !p1.transformed) tryTransform(p1)
      applyAIInputToKeys(p1, getAIInput(p1AI, p1, p2, { stage: getStageTheme(), roundNumber, mode: "aivsai" }))
    }
    if (isTransformDevice(p2) && !p2.transformed) tryTransform(p2)
    applyAIInputToKeys(p2, getAIInput(p2AI, p2, p1, { stage: getStageTheme(), roundNumber, mode: "aivsai" }))
    return
  }
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
    if (trainingState.dummyBehavior === "block") keys[c.block] = true           // hold guard (dedicated block input — MK-feel Stage 1c)
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

// MADARA tiered-Ultimate tap/hold (mirrors the CHARGE tap/hold): the Ultimate button is resolved on
// RELEASE for Madara — a quick TAP = Perfect Susanoo / Tengai Shinsei, a HOLD (≥ threshold) = Complete
// Susanoo (gated on energy inside executeMadaraUltimate). Every OTHER character keeps press-to-fire.
const MADARA_ULT_HOLD_MS = 250   // hold ≥ this on the Ultimate key = the HOLD tier
function handleUltimateDown(fighter, key) {
  if (!fighter || key !== fighter.controls?.ultimate) return
  if (!fighter._ultHeld) { fighter._ultHeld = true; fighter._ultDownTime = performance.now() }
}
function handleUltimateRelease(fighter, key) {
  if (!fighter || key !== fighter.controls?.ultimate) return
  const wasHeld = !!fighter._ultHeld
  const hold = wasHeld && (performance.now() - (fighter._ultDownTime || 0)) >= MADARA_ULT_HOLD_MS
  fighter._ultHeld = false
  const rk = (fighter.rosterKey || "").toLowerCase()
  if (!wasHeld || (rk !== "madara" && rk !== "nezuko")) return   // Madara + Nezuko are release-driven (tap/hold split)
  triggerUltimate(fighter, getAbilityContext(), { hold })   // triggerUltimate self-gates (cooldown/busy) → safe to call here
}

// P-TAP (released within 200ms) = per-character toggle: Gojo → Infinity on/off;
// transform-capable characters → cycle transformation. A longer HOLD is a charge
// (handled by inputState.charge → doEnergyCharge) and does NOT toggle.
function handleChargeRelease(fighter, key) {
  if (!fighter || key !== fighter.controls.charge) return
  // GHOSTFACE SWAP consumed this charge press (it was the swap combo's CHARGE modifier). Swallow the
  // RELEASE so it can't fire the swapped-in companion's charge-release action — e.g. Itachi's Mangekyou
  // (a freeze cinematic that would strand the swap), Goku Black's SSJ Rose, or Gojo's Infinity toggle.
  // The latch clears here; a fresh, deliberate charge+release afterward drives the companion normally.
  if (fighter._suppressChargeUntilRelease) { fighter._suppressChargeUntilRelease = false; fighter._chargeHeld = false; return }
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
    else if (enterMangekyou(fighter)) activateMangekyouCinematic(fighter)   // eye-transformation reveal on ignite
    return
  }

  // MINATO — quick Charge-TAP cycles the SELECTED Flying Raijin mark (only when ≥2 marks are
  // placed; the HUD 1/2/3 indicator moves). A charge HOLD still builds chakra normally via
  // doEnergyCharge during the hold; only the tap is repurposed. No marks → the tap is a no-op.
  if (fighter.rosterKey === "minato") {
    if (wasHeld && wasTap && (fighter._frMarks?.length || 0) > 1) {
      fighter._frSel = ((fighter._frSel || 0) + 1) % fighter._frMarks.length
    }
    return
  }

  // RENGOKU — CHARGED FLAME STRIKE: hold P to wind up (isCharging plays the "charge" pose), RELEASE to
  // strike. A quick TAP (<200ms) fires the weak tier; a longer HOLD fires the strong tier (wide flame arc).
  // Cooldown-gated (fireRengokuFlameStrike checks flameCd). No energy (maxEnergy 0) → the hold just poses.
  if ((fighter.rosterKey || "").toLowerCase() === "rengoku") {
    if (wasHeld) fireRengokuFlameStrike(fighter, !wasTap, getAbilityContext())
    return
  }

  // HASHIRAMA — WOOD RELEASE PUNCH: hold P to wind up (isCharging plays the hand-seals "charge" pose),
  // RELEASE to strike. A quick TAP (<200ms) = base wood-spear punch; a longer HOLD = the Super branching
  // wood eruption (higher dmg + longer reach). Cooldown-gated (fireHashiramaWoodPunch checks woodPunchCd);
  // holding P also builds chakra (doEnergyCharge) — the wind-up is the cost, not the meter.
  if ((fighter.rosterKey || "").toLowerCase() === "hashirama") {
    if (wasHeld) fireHashiramaWoodPunch(fighter, !wasTap, getAbilityContext())
    return
  }

  // MAKI — POWER CHARGE: hold P then RELEASE to fire the self-buff (1.3× damage, ~5s, cooldown-gated, no
  // energy). Same no-energy charge-release shape as Rengoku's Flame Strike; the buff timer + recast tick in
  // updateMiscTimers (auto-revert). A pure self-buff, so any real press-release fires it (tap or hold).
  if ((fighter.rosterKey || "").toLowerCase() === "maki") {
    if (wasHeld) fireMakiPowerCharge(fighter, getAbilityContext())
    return
  }

  // NEZUKO — RUN & SCRATCH: hold P to wind up, RELEASE to unleash the forward claw rush (Rengoku Flame
  // Strike shape; cooldown/recovery-gated, no energy → the hold just poses). Any real press-release fires it.
  if ((fighter.rosterKey || "").toLowerCase() === "nezuko") {
    if (wasHeld) fireNezukoRunScratchRelease(fighter, getAbilityContext())
    return
  }

  // ZARAKI — CHARGED DASH ATTACK: hold P to wind up (isCharging plays the super_foward_attack windup pose),
  // RELEASE to unleash the forward dashing sword rush. A quick TAP (<200ms) = short lunge (weak tier); a
  // longer HOLD = the full committed rush (strong tier). Cooldown-gated (fireZarakiChargedDash checks
  // chargeDashCd). Holding P still builds reiatsu (doEnergyCharge) during the wind-up; the release spends
  // the wind-up, not the meter. Same charge-release shape as Rengoku's Flame Strike.
  if (["zaraki", "zaraki_shikai"].includes((fighter.rosterKey || "").toLowerCase())) {
    // Charged Dash is a BASE-form move; in Shikai (mid-match toggle OR the dedicated Shikai entry) the
    // CHARGE hold just builds reiatsu (no dash). fireZarakiChargedDash also self-gates on isShikaiForm.
    if (wasHeld && !fighter._shikaiActive) fireZarakiChargedDash(fighter, !wasTap, getAbilityContext())
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
  // FLIGHT toggle (Omni-Man + Superman, any traits.canFly char): a quick P-TAP engages/disengages
  // Flight (a HOLD charges the shared pool instead, see updateMovementInput). Same charge-TAP shape as
  // Gojo's Infinity. toggleOmniManFlight no-ops if crashing / in hitstun / out of energy.
  if (fighter.traits?.canFly) { toggleOmniManFlight(fighter); return }
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
  } else if (fighter.rosterKey === "obito") {
    // Obito — KAMUI INTANGIBILITY toggle. Same charge-TAP idiom as Gojo's Infinity / Sasuke's
    // Absolute Defense, but a CONTINUOUS phase (drains chakra, auto-drops at 0 or on a melee swing).
    // toggleObitoKamui owns the on/off + the clear ON flash; deactivation is silent (asymmetry).
    toggleObitoKamui(fighter, getAbilityContext())
  } else if (fighter.rosterKey === "tobi") {
    // Tobi — KAMUI INTANGIBILITY toggle (own `_tobi*` implementation; identical idiom to Obito's,
    // fully independent state). Silent deactivation (asymmetry).
    toggleTobiKamui(fighter, getAbilityContext())
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

// ── SPEED-TIER TELEPORT-DASH ────────────────────────────────────────────────────────────────
// Any fighter whose BASE speed stat meets/exceeds the roster baseline (98) is "speed-tier":
// a double-tap-dash TOWARD the opponent blinks behind them (reuses teleportBehindTarget) and plays the
// character's OWN dash sprite on the blink. This GENERALISES the old hardcoded `movement.dashTeleport`
// flag: speed-tier fighters get the teleport-dash even without the flag.
// NOTE: a rotating spin/blur ("_speedBlur") overlay used to be drawn on top here — it obscured the dash
// sprite into an unreadable swirl and was REMOVED. Every teleport-dasher now shows its real dash art.
const SPEED_TIER_THRESHOLD = 98
// FEAT allowlist — characters whose canonical instant-speed / behind-you-in-an-instant feats qualify
// them for the teleport-dash EVEN IF their raw base-speed stat sits below Toji's tier. Each falls
// through to the shared dash-pose default below, so the blink plays the character's OWN dash sheet.
//   • obito / tobi (masked Obito) — Kamui makes displacement effectively instantaneous (speed 96)
//   • pain — Deva Path gravity (Shinra Tensei / Bansho Ten'in) closes distance instantly (speed 90)
//   • naruto — Body Flicker / Kurama-cloak burst speed (speed 90)
//   • madara — Uchiha Sharingan shunshin, on par with Sasuke/Itachi who already teleport-dash (speed 92)
//   • zaraki — raw Shinigami combat speed / shunpo-class blitz (speed 88)
//   • killua — Godspeed-class reflexes (Nanika/lightning; his ult is literally Godspeed) (speed 95)
//   • netero — "Speed of God" (Hyakushiki self-boost); canonically the fastest Hunter (speed 94)
//   • hisoka — precision Bungee-Gum-assisted repositioning / burst closing speed (speed 91)
//   • beerus — God of Destruction reaction speed (his dash sprite is already a Hakai energy streak) (speed 95)
const SPEED_TIER_TELEPORT_KEYS = new Set([
  "obito", "tobi", "pain",                                       // Stage-0 originals (Kamui / gravity feats)
  "naruto", "madara", "zaraki", "killua", "netero", "hisoka", "beerus"   // Stage-2 speed-blitz additions
])
function isSpeedTierTeleport(fighter) {
  const key = (fighter?.rosterKey || fighter?.id || "").toLowerCase()
  if (SPEED_TIER_TELEPORT_KEYS.has(key)) return true
  return (fighter?.baseSpeed ?? fighter?.speed ?? 0) >= SPEED_TIER_THRESHOLD
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

// MINATO FLYING RAIJIN — blink to the SELECTED teleport mark (free execution). Reuses the
// teleportBehindTarget pattern (set x/y + teleportFlash + camera) but lands on the mark's stored
// ground position instead of beside the opponent. Faces the opponent on arrival. Returns true if a
// mark was consumed. Marks are placed by a missed Flying Raijin kunai (abilities.placeFlyingRaijinMark).
function teleportToFlyingRaijinMark(fighter) {
  const marks = fighter?._frMarks
  if (!marks || !marks.length) return false
  const sel  = Math.min(Math.max(fighter._frSel || 0, 0), marks.length - 1)
  const mark = marks[sel]
  const sw   = getStageWorldWidth()
  fighter.x  = Math.max(0, Math.min(sw - fighter.w, mark.x - fighter.w / 2))
  fighter.y  = mark.y
  fighter.vx = 0; fighter.vy = 0
  const target = getOpponent(fighter)
  if (target) fighter.facing = target.x >= fighter.x ? 1 : -1   // face the opponent on arrival
  fighter.teleportFlash = 12
  fighter._frTeleportFxAt = { x: mark.x, y: mark.y }             // ui.js draws the yellow-flash ring here
  fighter.attackCooldown = Math.max(fighter.attackCooldown || 0, 10)
  // Marks PERSIST across teleports (recall repeatedly) — they only drop via the rolling 3-cap when a
  // 4th kunai is thrown. The 48-frame dashTeleportCooldown already rate-limits recall, so it isn't free spam.
  if (typeof camera.focusOnFighter === "function") camera.focusOnFighter(fighter, 1.0, 10)
  return true
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
    if ((fighter.dashTeleport || isSpeedTierTeleport(fighter)) && isToward && (fighter.dashTeleportCooldown || 0) <= 0) {
      // MINATO FLYING RAIJIN: with ≥1 teleport mark placed, the F→F blink RECALLS to the selected
      // mark (his signature) instead of blinking behind the opponent. With no marks it falls through
      // to the normal blink-behind (Stage 1 behavior preserved).
      if (fighter.rosterKey === "minato" && teleportToFlyingRaijinMark(fighter)) {
        fighter._spriteCastMove = "dash"; fighter._spriteCastTimer = 14   // Flying-Raijin flash-ring blink
        fighter.dashTeleportCooldown = 48
        // Flying Raijin is INSTANTANEOUS mobility (reposition-only) — it must NOT impose an
        // attack-recovery lockout, or the shared teleport attackCooldown (10f) swallows a
        // follow-up Special pressed right after the blink (the "Shadow Clone does nothing after
        // a blink" bug; Naruto never hits this — he has no dashTeleport). Spam is already gated
        // by the 48f dashTeleportCooldown above.
        fighter.attackCooldown = 0
        return
      }
      teleportBehindTarget(fighter)                                   // blink BEHIND, facing the opponent
      if (fighter.rosterKey === "sukuna" && typeof executeSukunaMalevolentDash === "function") executeSukunaMalevolentDash(fighter)
      else if (fighter.rosterKey === "sasuke") { fighter._spriteCastMove = "dash"; fighter._spriteCastTimer = 14 }  // reposition-only like Gojo; sasuke_dash.png plays the blink
      else if (fighter.rosterKey === "tobirama") { fighter._spriteCastMove = "dash"; fighter._spriteCastTimer = 14 }  // water body-flicker: tobirama_dash_uniform.png plays the blink (reposition-only)
      else if (fighter.rosterKey === "minato")   { fighter._spriteCastMove = "dash"; fighter._spriteCastTimer = 14; fighter.attackCooldown = 0 }  // Yellow-Flash body-flicker: reposition-only, INSTANTANEOUS — clear the shared 10f teleport attackCooldown so a follow-up Special (Shadow Clone) isn't swallowed right after the blink
      else if (fighter.rosterKey === "rick")   { fighter._spriteCastMove = "portalTravel"; fighter._spriteCastTimer = 14 }  // Portal-Behind: reposition-only, rick_portal_attack_travel.png plays the blink
      else if (fighter.rosterKey === "naruto") { fighter.attackCooldown = 0 }  // Body Flicker: clear the shared 10f teleport lockout so his F→F+Special Clone Rush isn't swallowed by the blink (same collision Minato solves above); dash-pose default below plays naruto_kcm_move
      // NOTE (Obito): NO char-branch here on purpose — the double-tap teleport-behind is the shared SPEED-TIER
      // mechanic (raw speed, not space-time), so he falls through to the dash-pose default below which plays
      // his own DASH pose (obito_dash_uniform). His Kamui blink art (obitoTeleport) is reserved
      // for the actual space-time moves (self-portal / teleport-grab), never this speed dash.
      else if (fighter.rosterKey === "omniman" || fighter.rosterKey === "superman") { fighter._spriteCastMove = "flyMove"; fighter._spriteCastTimer = 14 }  // Viltrumite/Kryptonian speed-blitz: reposition-only, the streaking flyMove pose sells the blink
      // DASH-POSE DEFAULT: show the character's OWN dash sprite on the blink. Any teleport-dasher that
      // didn't already pick a specific pose above (Rick portal / Omni-Man·Superman flyMove / Sukuna
      // malevolent dash / Sasuke·Tobirama·Minato dash) falls back to its dedicated dash sheet. This
      // covers Gojo & Itachi (previously left on their WALK sheet on the blink) and every speed-tier
      // char (Obito/Flash/Maki/Toji/Tobi/Pain). No spin/blur overlay — that swirl was removed.
      if ((fighter._spriteCastTimer || 0) <= 0 && (fighter._skinAnim?.dash || fighter.animationData?.dash)) {
        fighter._spriteCastMove = "dash"; fighter._spriteCastTimer = 14
      }
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
      recordMotionInput(fighter, key)           // classic motion buffer (Naruto-universe only; pad parity)
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

// MAKI — "Cursed Tool Awakening" HP-threshold unlock. Her Shibuya-Arc Ultimate has NO meter; the transform
// OPTION unlocks only once HP drops to ≤25%, and PERSISTS the rest of the match even if she heals back above
// 25% (a genuine risk/reward comeback, not a re-lockable gate). executeMakiShibuyaUltimate reads _shibuyaUnlocked.
function trackMakiShibuyaUnlock(fighter) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "maki") return
  if (fighter._shibuyaUnlocked) return                                     // one-way: once true, stays true
  const pct = (fighter.health || 0) / (fighter.maxHealth || 1) * 100
  if (pct <= 25) fighter._shibuyaUnlocked = true
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
  if (fighter.comboBreakerCd > 0) fighter.comboBreakerCd--                // meterless combo-breaker cooldown-cost (Stage 1 pilot: zenitsu)
  if (fighter.summonCooldown  > 0) fighter.summonCooldown--
  if (fighter._cloneSummonWindow > 0) fighter._cloneSummonWindow--        // clone-summon audio window (summons.js)
  if (fighter.teleportCooldown      > 0) fighter.teleportCooldown--       // Gojo Up+Special blink
  if (fighter.dashTeleportCooldown  > 0) fighter.dashTeleportCooldown--   // Toji teleport-dash
  if (fighter.malevolentDashCooldown > 0) fighter.malevolentDashCooldown-- // Sukuna Malevolent Dash
  if (fighter.chainCooldown > 0) fighter.chainCooldown--                   // Toji Chain-Knife
  if (fighter.thunderCd > 0) fighter.thunderCd--                           // Zenitsu Thunder Breathing 1st Form dash-strike
  if (fighter.doubleAtkCd > 0) fighter.doubleAtkCd--                       // Zenitsu Double Attack (Tanjiro/Inosuke), shared cooldown
  if (fighter.bbaCd > 0) fighter.bbaCd--                                   // Inosuke Beast Breathing Assist cooldown
  if (fighter.beastSpecialCd > 0) fighter.beastSpecialCd--                 // Inosuke cinematic-special cooldown (shared by all 3)
  if (fighter.flameCd > 0) fighter.flameCd--                               // Rengoku Charged Flame Strike cooldown
  if (fighter.counterCd > 0) fighter.counterCd--                           // Rengoku Counter cooldown
  if (fighter.poisonCd > 0) fighter.poisonCd--                             // Shinobu Poison Thrust cooldown
  if (fighter.flitCd > 0) fighter.flitCd--                                 // Shinobu Butterfly Flit cooldown
  if (fighter._nzCountering > 0) fighter._nzCountering--                    // Nezuko Counter Stance parry-window countdown
  if (fighter.nzCounterCd > 0) fighter.nzCounterCd--                       // Nezuko Counter Stance cooldown
  if (fighter.nzSlumberCd > 0) fighter.nzSlumberCd--                       // Nezuko Blood Demon Slumber cooldown
  if (fighter.nzAssistCd > 0) fighter.nzAssistCd--                         // Nezuko Ally Call (Tanjiro/Zenitsu) cooldown
  updateNezukoUltChain(fighter)                                            // Nezuko Kekijutsu Baketsu — auto-chain phase 1 barrage → phase 2 finisher
  if (fighter._nzDemonTimer > 0 && --fighter._nzDemonTimer <= 0) revertNezukoDemon(fighter)   // Demon Transformation window expiry → auto-revert to base
  // NEZUKO — Blood Demon Slumber: heal over the VULNERABLE window. She is NOT invulnerable — if a hit lands
  // (hitstun > 0) the sleep is INTERRUPTED: forfeit the remaining heal and drop vulnerability (the hit that
  // woke her was already amplified in resolveAttackHit). Otherwise heal per-frame and keep her rooted.
  if (fighter._nzSlumberTimer > 0) {
    if ((fighter.hitstun || 0) > 0) {
      fighter._nzSlumberTimer = 0; fighter._nzSlumberVuln = false; fighter._spriteCastMove = null   // woken by a hit
    } else {
      const per = Math.ceil(230 / 72)   // NEZUKO_SLUMBER_HEAL / DURATION
      const heal = Math.min(per, fighter._nzSlumberHealRemain || 0)
      fighter.health = Math.min(fighter.maxHealth || fighter.health, (fighter.health || 0) + heal)
      fighter._nzSlumberHealRemain = (fighter._nzSlumberHealRemain || 0) - heal
      fighter.vx = 0
      fighter._nzSlumberVuln = true
      if (--fighter._nzSlumberTimer <= 0) fighter._nzSlumberVuln = false
    }
  }
  if (fighter.callInCd > 0) fighter.callInCd--                             // Ghostface Call-In companion special cooldown (Roman: halved)
  if (fighter.chargeDashCd > 0) fighter.chargeDashCd--                     // Zaraki Charged Dash Attack cooldown (CHARGE-release special)
  if (fighter.woodPunchCd > 0) fighter.woodPunchCd--                       // Hashirama Wood Release Punch cooldown (CHARGE-release tap/hold)
  if (fighter.yachiruCd > 0) fighter.yachiruCd--                           // Zaraki Yachiru Assist cooldown (Down+Special)
  if (fighter.yachiruLinkCd > 0) fighter.yachiruLinkCd--                   // Zaraki (Shikai) Yachiru combo-link cooldown
  // Zaraki SHIKAI timed power-up: tick the duration → auto-revert to Base on expiry; also revert on KO.
  if (fighter._shikaiActive && (fighter.health || 0) <= 0) revertZarakiShikai(fighter)
  else if (fighter._shikaiTimer > 0 && --fighter._shikaiTimer <= 0) revertZarakiShikai(fighter)
  if (fighter.kunaiCd > 0) fighter.kunaiCd--                               // Maki Kunai Throw cooldown (no-energy special)
  if (fighter.nunchakuCd > 0) fighter.nunchakuCd--                         // Maki Nunchaku Flurry cooldown (no-energy special)
  if (fighter._gunCd > 0) fighter._gunCd--                                 // Toji Handgun poke cooldown (no-energy command normal)
  if (fighter._splitSoulCd > 0) fighter._splitSoulCd--                     // Toji Split Soul Katana cooldown (no-energy special)
  if (fighter._rapidSlashCd > 0) fighter._rapidSlashCd--                   // Toji Rapid Sword Slashes cooldown (no-energy special)
  if (fighter._chainCd > 0) fighter._chainCd--                             // Toji Chain of a Thousand Miles cooldown (no-energy 5-part special)
  if (fighter._playfulCloudCd > 0) fighter._playfulCloudCd--               // Toji Playful Cloud cooldown (no-energy special)
  if (fighter._flyHeadCd > 0) fighter._flyHeadCd--                         // Toji Fly Heads swarm cooldown (no-energy special)
  if (fighter._flyBarrageCd > 0) fighter._flyBarrageCd--                   // Toji OFFENSIVE Fly Heads swarm (Down+Heavy damaging projectile fan) cooldown
  if (fighter._tojiFlyFadeTimer > 0) {                                     // Toji Fly Heads self-fade window (render-only near-invisibility)
    fighter._tojiFlyFadeTimer--
    if (!isTojiFlyHeadsSwarmActive()) fighter._tojiFlyFadeTimer = 0        // swarm ended (naturally or via round/KO reset) → snap back to visible
  }
  if (fighter._makiPowerCd > 0) fighter._makiPowerCd--                     // Maki Power Charge recast lockout
  if (fighter._makiPowerTimer > 0 && --fighter._makiPowerTimer <= 0) revertMakiPowerCharge(fighter)   // Power Charge buff window expiry → auto-revert
  trackMakiShibuyaUnlock(fighter)                                          // Maki HP-threshold (≤25%) ultimate unlock (persists once crossed)
  if (fighter._rengokuCountering > 0) fighter._rengokuCountering--          // Rengoku Counter riposte-window countdown (checkParry hook)
  if (fighter._gunbaiReflect > 0) fighter._gunbaiReflect--                  // Madara Gunbai reflect-window countdown (combat.resolveProjectileHitsMulti hook)
  if (fighter._madaraSusanoo > 0) { fighter._madaraSusanoo--; if (fighter._madaraSusanoo <= 0) revertMadaraSusanoo(fighter) }   // Madara tier-3 Susanoo armor-mode duration → auto-revert
  if (fighter._madaraComplete > 0) { fighter._madaraComplete--; if (fighter._madaraComplete <= 0) revertMadaraCompleteSusanoo(fighter) }   // Madara tier-4 Complete Susanoo giant duration → auto-revert
  if (fighter.activeDomainTimer > 0) fighter.activeDomainTimer--
  if (fighter._spriteCastTimer > 0 && --fighter._spriteCastTimer <= 0) fighter._spriteCastMove = null
  if (fighter.parryFlash      > 0) fighter.parryFlash--
  if (fighter.armorFlash      > 0) fighter.armorFlash--
  if (fighter.clashFlash      > 0) fighter.clashFlash--
  if (fighter.restrainTimer   > 0) { fighter.restrainTimer--;  if (fighter.restrainTimer  <= 0) fighter.restrained = false }
  if (fighter._wallSplat      > 0) { fighter._wallSplat--;     if (fighter._wallSplat     <= 0) fighter.wallBounce = false }   // MK-feel Stage 2e: wall-splat pinned window (extended hitstun runs in updateCombat)
  if (fighter.obscuredTimer   > 0) { fighter.obscuredTimer--;  if (fighter.obscuredTimer  <= 0) fighter.obscured   = false }
  // Generic damage-over-time (e.g. Naruto Rasenshuriken wind-chip). Applies `dmg` every
  // `interval` frames for `ticks` counts, then clears. Stamped by resolveProjectileHits.
  if (fighter._dot && fighter._dot.ticks > 0) {
    if (--fighter._dot.delay <= 0) {
      applyScaledDamage(fighter, fighter._dot.dmg, { source: "dot" })
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
// LOW-HEALTH COSMETIC IDLE threshold: a fighter shipping an `idleLow` strip swaps to its wounded
// idle at/below this fraction of max HP (Zaraki). PROPOSED placeholder — visual only, no stat change.
const LOW_HEALTH_IDLE_FRAC = 0.30
function tauntAnimFrames(fighter) {
  // Variant-aware: the committed timer must match whichever taunt strip is about to play
  // (primary or the random alt), so _tauntVariant is chosen BEFORE this is read (see commit block).
  const key = fighter._tauntVariant || "taunt"
  const a = fighter.animationData?.[key] || fighter.animationData?.taunt
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
    // ALT-TAUNT pick: a fighter with a `tauntAlt` strip randomly commits to either its primary or alt
    // taunt (Zaraki). Chosen here BEFORE the timer so tauntAnimFrames sizes the lock to the right strip;
    // sprite.js reads _tauntVariant to render it. Chars without a tauntAlt strip always play "taunt".
    fighter._tauntVariant = (fighter.animationData?.tauntAlt && Math.random() < 0.5) ? "tauntAlt" : "taunt"
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
    // ZARAKI taunt voice — provocations ("Come kill me again!" / "Aim better!" / "That all?"). Zaraki HAS a
    // real taunt action (unlike Madara/Ichigo), so this fires on the taunt-heal commit. Both Zaraki entries. JA.
    if (["zaraki", "zaraki_shikai"].includes((fighter.rosterKey || "").toLowerCase())) {
      sound.playSfxFile?.(pickZarakiVoice("taunt"), null)
    }
    // SAIKI KUSUO taunt voice — deadpan English-dub dismissals ("Not listening", "Who
    // cares", "I'll pass"…). Random pick per commit from the 12-entry pool (saikiVoice.js).
    // Wired READY-AND-WAITING onto the same universal commit transition: Saiki has NO
    // `taunt` action yet, so this is dormant (the block above never runs for him) and lights
    // up automatically the moment a taunt animation is added — no new mechanic built here.
    if ((fighter.rosterKey || "").toLowerCase() === "saiki") {
      sound.playSfxFile?.(pickSaikiVoice("taunt"), null)
    }
    // Netero taunt voice removed (audio files deleted). The universal taunt-commit trigger POINT
    // remains here; re-add a `rosterKey === "netero"` block (mirroring Saiki above) to re-enable.
    // GOJO "Limitless" skin taunt voice — the largest young-Gojo pool (59). STAGED like
    // Saiki/Netero: Gojo has NO `taunt` action, so this commit block never runs for him today
    // (the pool is dormant). Gated to the gojo2 skin via pickSkinVoice — under the default skin
    // (or when a taunt action is later added while wearing another skin) it stays silent. It
    // lights up automatically the instant a `taunt` animation is added AND Limitless is equipped.
    if ((fighter.rosterKey || "").toLowerCase() === "gojo") {
      const clip = pickSkinVoice("gojo", fighter.skinId, "taunt")
      if (clip) sound.playSfxFile?.(clip, null)
    }
  }
}

function updateMovementInput(fighter) {
  if (!fighter) return
  const inputState = getFighterInput(fighter)

  // LOW-HEALTH COSMETIC IDLE flag (opt-in): any fighter shipping an `idleLow` strip gets flagged
  // below LOW_HEALTH_IDLE_FRAC of max HP so sprite.js swaps its neutral idle to a wounded pose.
  // Set/cleared every frame here; purely visual — no stat, hitbox, or move change. No-op for every
  // character without an `idleLow` strip (the flag stays false and is never read).
  if (fighter.animationData?.idleLow) {
    fighter._lowHealthIdle = (fighter.health || 0) / (fighter.maxHealth || 1) <= LOW_HEALTH_IDLE_FRAC
  }

  // Taunt state machine runs first. While the committed taunt plays, the fighter is
  // FULLY LOCKED — no movement/block/action (combat actions are gated in
  // updatePlayerCombat; physics.moveFighter also honours _tauntPlaying).
  updateTauntState(fighter, !!inputState.down)
  if (fighter._tauntPlaying) { fighter.isBlocking = false; fighter.isCharging = false; fighter.vx = 0; return }
  // BACKSTAGE PASS: committed dash — no movement control (the BP driver owns vx + the emerge). Don't zero
  // vx here (that's the dash) — just deny input so the teleport can't be steered/cancelled.
  if (fighter._bpActive) { fighter.isBlocking = false; fighter.isCharging = false; return }

  const vKeys      = mapInputToVirtualKeys(inputState, fighter.controls)
  fighter.isBlocking = false
  if (isTransformDevice(fighter)) handleOmnitrixSwitch(fighter, inputState)
  else fighter.isCharging = false   // reset each frame for normal characters (devices set their own)
  // PAIN — "Six Paths Summon" assist selector (Charge + slot). Runs before the jump/attack path so its
  // _omxConsume can swallow the Charge+↑ / Charge+Light slot press (no double jump/swing).
  updatePainAssistCombo(fighter, inputState, getAbilityContext())
  if (fighter.hitstun > 0 || fighter.blockstun > 0) return
  // OMNI-MAN FLIGHT: the P (charge) button is TAP-to-toggle-Flight / HOLD-to-charge (Gojo-Infinity
  // pattern). The TAP toggle fires on keyUP in handleChargeRelease; a HOLD falls through to the
  // universal hold-to-charge path below — so Smart Atoms IS chargeable (Fix #1). We only gate that
  // charge so it can't refill mid-flight or during a forced-descent crash (shared-pool tension: no
  // free refills in the air) — grounded/normal-air charging is unrestricted.
  const isFlyer = !!fighter.traits?.canFly   // Omni-Man / Superman: shared-pool flyers
  const omniCantCharge = isFlyer && (fighter._flightActive || isOmniManForcedDescent(fighter))
  // HOLD-TO-CHARGE (Task 2): a meter character holding P (charge), not attacking,
  // builds cursed energy AND enters the charging state (drives the charge aura +
  // sprite). For Ben/Albedo the charge button is the device dial (handled above).
  // Resolved BEFORE the block gate so the universal "charging = fully vulnerable"
  // lockout (no block below, no movement in physics.moveFighter) holds on the SAME
  // frame the charge begins — for NORMAL chars too, not just the transform device.
  // RENGOKU is a NO-ENERGY charger (maxEnergy 0): holding P must still enter isCharging (drives the
  // "charge" windup pose) so the Charged Flame Strike can release on keyup — but there's no meter to build.
  const noEnergyCharger = (fighter.rosterKey || "").toLowerCase() === "rengoku"
  if (!inputState.charge) fighter._suppressChargeUntilRelease = false   // Ghostface-swap latch clears on release
  if (inputState.charge && !fighter._suppressChargeUntilRelease && !isTransformDevice(fighter) && !fighter.attacking && ((fighter.maxEnergy || 0) > 0 || noEnergyCharger) && !omniCantCharge) {
    if ((fighter.maxEnergy || 0) > 0) doEnergyCharge(fighter)
    fighter.isCharging = true
  }
  // UNIVERSAL CHARGE LOCKOUT — can't block while charging (deliberate vulnerability, all chars).
  // FLASH TIME LOCKOUT — Flash cannot block/defend at all while Flash Time is active (its whole
  // premise: he's moving too fast to hold a guard). The block input is simply ignored for him.
  // (Omni-Man: while flying, Down = DESCEND — not block; and he can't block mid-crash/recovery.)
  // BLOCK is now a DEDICATED input (keyboard ctrl.block / gamepad Circle) — MK-feel Stage 1c moved it OFF
  // Down so crouch / Down-air (S+J) / Down-motion specials / the taunt Down-hold no longer double as guard.
  if ((inputState.block || fighter._forceGuard) && !fighter.isCharging && !fighter._flashTimeActive &&
      !fighter._noBlock &&   // Stage 24A "No Blocking" modifier — guard input is ignored
      !fighter._flightActive && !isOmniManForcedDescent(fighter)) fighter.isBlocking = true
  // Omnitrix "up" slot combo (CHARGE+↑ for a deep loadout) consumes the jump so it morphs instead of
  // hopping. No-op for the current cardinal loadout (jump combo = slot 4, unfilled) — future-proof.
  if (fighter._omxConsume?.jump) vKeys[fighter.controls.jump] = false
  physics.moveFighter(fighter, vKeys, fighter.controls)
}

// ── OMNITRIX / ULTIMATRIX — in-fight transform device (Ben & Albedo) ───────
// DELIBERATE SLOT TRANSFORM (rebuilt 2026-07-28 — replaces the old cycle scheme). Each loadout slot
// has its OWN fixed CHARGE+input combo, so you morph into the EXACT alien you want in one press — from
// human OR from any other alien — instead of tapping through a cycle. Data-driven: the Nth slot uses
// BEN10_SLOT_COMBOS[N], and only as many combos as the loadout actually holds are live (scales cleanly
// as more art-backed aliens are added — nothing is hardcoded to 5).
//   • CHARGE + <slot combo> (edge) → transform DIRECTLY into that slot's alien.
//   • CHARGE alone, while HUMAN (and recharged) → re-engage the last-used alien (convenience).
//   • CHARGE alone, while TRANSFORMED → CHARGE the meter (fast refill; can't block, a hit interrupts).
// selectAlienSlot() enforces the per-switch recharge + from-human energy gate and no-ops a bad slot.
//
// Combo table — cardinal directions first (no attack-button conflict), then attack buttons for a
// loadout deeper than 4. Slot i is reached by CHARGE + this input. Extend the array to add more slots.
const BEN10_SLOT_COMBOS = [
  { field: "down",     label: "↓" },   // slot 1
  { field: "left",     label: "←" },   // slot 2
  { field: "right",    label: "→" },   // slot 3
  { field: "jump",     label: "↑" },   // slot 4  (up; consumed so it won't also jump)
  { field: "light",    label: "+ Light" },   // slot 5  (consumed so it won't also attack)
  { field: "heavy",    label: "+ Heavy" },   // slot 6
]
// Public so the pre-match slot-select UI can label each slot with its real combo (single source of truth).
export function ben10SlotCombo(i) { return BEN10_SLOT_COMBOS[i] || null }

function handleOmnitrixSwitch(fighter, inputState) {
  if (!fighter?.omnitrix) return
  const held = (fighter._omx = fighter._omx || {})
  const charge   = !!inputState.charge
  const nSlots   = Math.min(fighter.omnitrix.aliens?.length || 0, BEN10_SLOT_COMBOS.length)

  fighter.isCharging = false   // re-evaluated each frame below
  fighter._omxConsume = null   // reset each frame; set only on the frame a slot-combo actually fires
  let comboFired = false

  if (charge) {
    // Deliberate slot transform: first slot-combo whose input just went down (edge) wins.
    for (let i = 0; i < nSlots; i++) {
      const f = BEN10_SLOT_COMBOS[i].field
      const down = !!inputState[f]
      if (down && !held[f]) {
        if (selectAlienSlot(fighter, i)) {
          comboFired = true
          fighter.vx = 0                                   // plant + morph (don't slide on the combo)
          fighter._omxConsume = { light: f === "light", heavy: f === "heavy", jump: f === "jump" }
        }
        break
      }
    }
    // CHARGE alone (no slot combo held this frame):
    //   • TRANSFORMED → charge the drain meter (hold P).
    //   • HUMAN → intentionally NOTHING. Transforming from human is DELIBERATE and slot-only (P+combo);
    //     a bare-P auto-re-engage used to fire on the P-hold frame BEFORE the direction was added,
    //     flickering into the wrong (last-used) alien and making P+slot unreliable. Removed.
    const anyComboHeld = BEN10_SLOT_COMBOS.slice(0, nSlots).some(c => !!inputState[c.field])
    if (!comboFired && !anyComboHeld && fighter.transformed) {
      fighter.isCharging = true
    }
  }

  held.charge = charge
  for (const c of BEN10_SLOT_COMBOS) held[c.field] = !!inputState[c.field]
}

// ── GHOSTFACE COMPANION SWAP combo ─────────────────────────────────────────
// Built FRESH for Ghostface (deliberately does NOT reuse Ben10's slot-transform code, whose select-
// the-wrong-slot behaviour was never confirmed fixed). CHARGE + a cardinal (on the frame the cardinal
// goes DOWN — an edge) swaps Ghostface into that slot's pool companion via triggerGhostfaceSwap.
// Deterministic by construction: physical-key slots index straight into the pool, and there is NO
// bare-CHARGE swap (charge-alone only builds Dread), so nothing can fire "the last/random companion"
// on the charge frame before the direction registers — the exact ambiguity behind that class of bug.
// (Ghostface Companion Swap is triggered by a MOTION + Special inside executeGhostfaceSpecial — abilities.js
// tryGhostfaceSwapMotion — NOT a charge combo, so there is no per-frame input handler here anymore.)

function buildNormalControlState(fighter, vKeys) {
  const c = fighter.controls
  const g = !!fighter.onGround
  // Omnitrix slot combos that use an ATTACK button (CHARGE+Light / CHARGE+Heavy for a deep loadout)
  // consume that press so it morphs INSTEAD of also swinging. No-op for the current cardinal-only
  // loadout (down/left/right never set these) — future-proofs slots 5-6 without a rebuild.
  const consume = fighter._omxConsume
  const cl = consume?.light, ch = consume?.heavy
  return {
    upAttack: g  && vKeys[c.upAttack],                 // dedicated I = up-attack/launcher
    grab:     g  && vKeys[c.grab],                      // dedicated O = grab
    air:      !g && vKeys[c.light] && !vKeys[c.down] && !cl,   // airborne J = air attack
    downAir:  !g && vKeys[c.light] &&  vKeys[c.down] && !cl,   // airborne S+J = down-air spike
    airHeavy: !g && vKeys[c.heavy] && !ch,             // airborne K = AERIAL HARD (Madara Susanoo-hand grab); no-op for chars without an air_heavy move
    light:    g  && vKeys[c.light] && !cl,             // J
    heavy:    g  && vKeys[c.heavy] && !ch               // K
  }
}

function updatePlayerCombat(fighter) {
  if (!fighter) return
  // Stamp the acting fighter as the AMBIENT voice owner for the duration of its combat/ability update, so
  // every cue it fires (attack barks, special/ultimate casts) auto-tags without touching each call site.
  // The owner is the single-voice-channel key: a newer line from this fighter stops its previous line
  // (sound.playSfxFile). Defender hit-reactions override this to `defender` in combat.js so they land on
  // the DEFENDER's channel, not the attacker's.
  const _prevVoiceOwner = sound._voiceOwner
  sound._voiceOwner = fighter
  try { _updatePlayerCombatBody(fighter) } finally { sound._voiceOwner = _prevVoiceOwner }
}
function _updatePlayerCombatBody(fighter) {
  if (!fighter) return
  const opts = { hitEffects: hitSparks, damageNumbers, stageWidth: getStageWorldWidth() }

  if (fighter._waterFlickerCd > 0) fighter._waterFlickerCd--   // Tobirama escape cooldown ticks every frame

  // EDO TENSEI: tick the ritual windup→swap and the active window→auto-revert EVERY frame (even during
  // hitstun/mid-animation) so the handoff fires regardless of match state. During the summon ritual the
  // fighter is a COMMITTED cast — vulnerable, takes no input (timers still tick so it can't soft-lock).
  updateEdoTensei(fighter, getStageWorldWidth())
  if (fighter._edoWindup > 0) { updateCombat(fighter, getOpponent(fighter), {}, opts); return }

  // BACKSTAGE PASS: committed teleport-reposition/swap — takes no input during the dash (the BP driver, run
  // in the per-fighter update, owns movement + the emerge). updateCombat still runs so hitstun/knockback
  // resolve (the swap branch has no i-frames → a clean hit cancels it). Mirrors the Edo committed-cast gate.
  if (fighter._bpActive) { updateCombat(fighter, getOpponent(fighter), {}, opts); return }

  // TOBIRAMA — Water Body-Flicker reversal (reactive escape): Special pressed while in hitstun or
  // knockdown dissolves him into water and reforms retreating with i-frames. Read here, AHEAD of the
  // stun early-return below (which normally ignores input), so it works as a true reversal. Costs
  // 35 Chakra + a 90f cooldown (executeTobiramaWaterFlicker) → committed, not a free get-out.
  if ((fighter.rosterKey || "").toLowerCase() === "tobirama" &&
      ((fighter.hitstun || 0) > 0 || fighter.knockdownState) &&
      getFighterInput(fighter).special &&
      executeTobiramaWaterFlicker(fighter, getAbilityContext())) {
    updateCombat(fighter, getOpponent(fighter), {}, opts); return
  }

  // COMBO BREAKER (MK-feel Stage 2d; universal break-stock resource): while in HITSTUN and being combo'd
  // (attacker comboCounter >= 3), BLOCK + SPECIAL breaks out (spends one per-round BREAK STOCK, i-frames,
  // blasts the attacker away). Read AHEAD of the stun early-return below (like Tobirama's reversal) so it's a
  // true reversal. The cheap pre-checks (being combo'd + has a stock) gate reading input during hitstun so the
  // input buffer isn't ticked in the common (non-breakable) stun path; tryComboBreaker owns the >= 3 gate +
  // stock spend. Stocks are universal (no meter dependency) → the whole roster breaks identically.
  {
    const cbOpp = getOpponent(fighter)
    if ((fighter.hitstun || 0) > 0 && (cbOpp?.comboCounter || 0) >= COMBO_BREAKER.threshold && (fighter.comboBreakStocks || 0) > 0 &&
        tryComboBreaker(fighter, getFighterInput(fighter), cbOpp)) {
      updateCombat(fighter, cbOpp, {}, opts); return
    }
  }

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

  // OMNI-MAN FORCED-DESCENT LOCK: while crashing out of the sky (Smart Atoms depleted mid-air) AND
  // during the crash-landing recovery window, he starts nothing and is fully vulnerable. Tick combat
  // timers with empty controls so the recovery resolves cleanly (mirrors the taunt lock).
  if (isOmniManForcedDescent(fighter)) { updateCombat(fighter, getOpponent(fighter), {}, opts); return }

  const inputState = getFighterInput(fighter)

  const vKeys      = mapInputToVirtualKeys(inputState, fighter.controls)
  const canStart   = !fighter.attacking && !fighter.currentMove

  // UNIVERSAL CHARGE LOCKOUT: while holding a charge (isCharging), the fighter is fully
  // committed and vulnerable — physics.moveFighter blocks movement/jump/dash and
  // updateMovementInput blocks guarding. Here we also lock out every NORMAL attack and the
  // ULTIMATE. The SPECIAL button is the sole exception: it is the charge's own release/fire
  // trigger (e.g. Naruto's Big Ball Rasengan / Rasenshuriken read isCharging to pick the
  // charged variant). Releasing P clears isCharging next frame → instant, lag-free exit.
  const charging = !!fighter.isCharging

  // COMEBACK FINISHER (Fatal-Blow-style): BLOCK + GRAB, once per MATCH, only below 30% HP, for eligible
  // (non-excluded) pilot chars. Checked BEFORE special/ultimate/normal so the dedicated combo is intercepted
  // and its inputs are consumed. The match-level token (comebackFinisherUsed[side]) is the authoritative
  // once-per-match gate (fighters reset each round); tryComebackFinisher owns the HP/exclusion/commit logic.
  if (canStart && !charging && inputState.block && inputState.grab && !comebackFinisherUsed[fighter.side] &&
      tryComebackFinisher(fighter, inputState, getOpponent(fighter))) {
    comebackFinisherUsed[fighter.side] = true
    return
  }

  // Specials are L (direction-modified inside executeXSpecial). Gojo's Infinity
  // toggle moved to P-TAP (handleChargeRelease), so Down+Special is free for the
  // S+L motion specials (e.g. Hollow Purple = S,A+L).
  if (canStart && inputState.special)  {
    // BETA input simplification: stamp the single relative direction currently HELD so
    // abilities.getRelativeDirections' beta branch can pick the special the equivalent
    // motion roll would have produced. Beta-gated → normal play never sets/reads this.
    if (isBetaUnlocked()) fighter._betaHeldDir = betaHeldDirFromInput(inputState, fighter.facing)
    // LIVE held direction the frame Special is pressed ("F"|"B"|"U"|"D"|null) — a robust, non-time-
    // windowed source for direction-branched specials (Killua: Fwd=Lightning Palm, Down=Electric Ball,
    // neutral=Yo-Yo). Only read by chars that opt in; unused by everyone else.
    fighter._specialHeldDir = betaHeldDirFromInput(inputState, fighter.facing)
    // Modifiers held the SAME frame Special is buffered — read by Ghostface's Backstage Pass to pick its
    // branch (Grab/Charge = swap, attack btn = fakeout). Only Ghostface reads it; harmless for everyone else.
    fighter._specialHeldMods = { grab: !!inputState.grab, charge: !!inputState.charge, attack: !!(inputState.light || inputState.heavy || inputState.upAttack) }
    triggerSpecial(fighter,  getAbilityContext()); return
  }
  // CHROLLO — Down+Ultimate = BANDIT'S ECHO (copy the marked opponent special/ultimate). Plain Ultimate stays
  // Skill Hunter. Only real Chrollo with an armed mark: Down+Ult IS Echo's dedicated input, so with a mark we
  // never leak the press to Skill Hunter (fires or fizzles-and-returns); with NO mark it falls through so a
  // crouching Chrollo can still Skill Hunter. betaHeldDirFromInput reads the live held dir the same way the
  // special path does.
  if (canStart && !charging && inputState.ultimate && (fighter.rosterKey || "").toLowerCase() === "chrollo"
      && betaHeldDirFromInput(inputState, fighter.facing) === "D" && fighter._beMark) {
    triggerBanditEcho(fighter, getAbilityContext()); return
  }
  // MADARA + NEZUKO fire the Ultimate on RELEASE (tap/hold split in handleUltimateRelease), so skip the press path for them.
  if (canStart && !charging && inputState.ultimate && !["madara", "nezuko"].includes((fighter.rosterKey || "").toLowerCase())) { triggerUltimate(fighter, getAbilityContext()); return }

  // TOJI stance combat: Blade stance fires its real normals + drives the rekka; Chain/Gun
  // fire the Phase-1 placeholder light. Consumes the grounded light/heavy/up press when it
  // acts (returns true → skip the normal path). Suppressed while charging (lockout).
  // YUJI "KOMA" REPEAT release (Ultimate Phase-2 payload): while active it OWNS all input — each
  // attack-button mash extends the flurry, then it auto-chains to the finisher. Runs first + returns
  // true so no normal/special path fires during the release. Inert unless _komaActive (set by startYujiKoma).
  // Stamp the RAW attack-key state (not the 7-frame-buffered inputState) so fast mashing reads as distinct
  // edges — a buffered read would collapse a rapid mash into one held press and starve the flurry.
  if (fighter._komaActive) {
    fighter._komaRawBtn = !!(keys[fighter.controls.light] || keys[fighter.controls.heavy])
    if (updateYujiKomaCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return
  }

  // VEGETA command-normal chain: Forward+Heavy opens the "Y-track" kick target combo, re-tap
  // Heavy during recovery to continue (cancel-on-hit). Consumes the input only when it fires
  // (returns true → skip normal path); neutral light/heavy stay on the normal path below.
  if ((fighter.rosterKey || "").toLowerCase() === "vegeta" && !charging &&
      updateVegetaCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // BEN 10 command chain: Forward+Heavy opens the active form's rekka (Ben-human jab / XLR8 3-hit combo /
  // Diamondhead crystal swing), re-tap Heavy during recovery to continue (cancel-on-hit). Form-aware via
  // the active alien. Consumes the input only when it fires; neutral light/heavy stay on the normal path.
  if (isTransformDevice(fighter) && !charging &&
      updateBen10CommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // OMEGA RANGER command chain (Fwd+Heavy kick → re-tap Heavy on hit → spin_kick → low_attack)
  // + free pokes (Fwd+Light Forward Push, airborne Heavy Downward Air Attack 2). Consumes the
  // input only when it fires; neutral light/heavy/up stay on the normal path below.
  if ((fighter.rosterKey || "").toLowerCase() === "omega_ranger" && !charging &&
      updateOmegaRangerCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // RED RANGER MMPR command chain (Fwd+Heavy jab → re-tap Heavy on hit → cross → super 360° launcher)
  // + airborne-Heavy dive-kick poke. Consumes the input only when it fires; neutral light/heavy/up/air/
  // down_air stay on the normal path below.
  if ((fighter.rosterKey || "").toLowerCase() === "red_ranger_mmpr" && !charging &&
      updateRedRangerMmprCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // NETERO command chain: Down+Heavy opens down_attck_1, re-tap Heavy during recovery to cancel into
  // down_attck_2 (cancel-on-hit; a whiff/block ends the string). Consumes the input only when it fires
  // (returns true → skip normal path); neutral light/heavy stay on the normal path below.
  if ((fighter.rosterKey || "").toLowerCase() === "netero" && !charging &&
      updateNeteroCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // OMNI-MAN "Viltrumite Beatdown" chain: Fwd+Heavy opens omCombo1, re-tap Heavy during recovery to
  // cancel into omCombo2 → omComboFin launcher (cancel-on-hit; a whiff/block ends the string). Fwd+Light
  // = Forward Push poke. Consumes the input only when it fires; neutral light/heavy/up stay normal.
  if ((fighter.rosterKey || "").toLowerCase() === "omniman" && !charging &&
      updateOmniManCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // SAIKI command combat: Forward+Heavy opens the 4-hit projectile rekka (chain1→2→3→finisher, each a
  // traveling magenta bolt; cancel-on-hit re-tap Heavy during recovery). Forward+Light = Basic Burst
  // point-blank poke. Consumes the input only when it fires; neutral light/heavy stay on the normal path.
  if ((fighter.rosterKey || "").toLowerCase() === "saiki" && !charging &&
      updateSaikiCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // KILLUA Barrage command chain: Down+Heavy opens barrage1, re-tap Heavy during recovery to cancel into
  // barrage2→barrage3→barrage4 (cancel-on-hit; a whiff/block ends the string). Consumes the input only
  // when it fires (returns true → skip normal path); neutral light/heavy stay on the normal path below.
  if ((fighter.rosterKey || "").toLowerCase() === "killua" && !charging &&
      updateKilluaCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // FLASH "Speed Rush" command chain: Down+Heavy opens rush1, re-tap Heavy during recovery to cancel into
  // rush2 (cancel-on-hit; a whiff/block ends the string). Consumes the input only when it fires (returns
  // true → skip normal path); neutral light/heavy stay on the normal path below.
  if ((fighter.rosterKey || "").toLowerCase() === "flash" && !charging &&
      updateFlashCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // STANDARD COMBO STRING (MK-feel Stage 2b): the "single-poke" characters (Goku/Gojo/Sukuna/Naruto/
  // Megumi/Rick) get a shared dial-a-combo — light→light→heavy(launcher) + heavy→special — via one
  // data-driven handler. Cancels fire only during a CONNECTED recovery; it consumes the input only when a
  // cancel fires (returns true → skip normal path). Neutral light/heavy openers stay on the normal path below.
  if (!charging && updateStandardStringCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // GON "Rush": Down+Heavy opens rush1 (flurry), re-tap Heavy on hit → rush2 (launcher). Cancel-on-hit;
  // a whiff/block ends the string. Consumes the input only when it fires; neutral normals stay below.
  if ((fighter.rosterKey || "").toLowerCase() === "gon" && !charging &&
      updateGonCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // HISOKA "Card Flourish": Down+Heavy opens rekka1 (crouch strike), re-tap Heavy on hit → rekka2
  // (extended-reach card-slash launcher). Cancel-on-hit; a whiff/block ends the string. Consumes the
  // input only when it fires (returns true → skip normal path); neutral light/heavy stay on the path below.
  if ((fighter.rosterKey || "").toLowerCase() === "hisoka" && !charging &&
      updateHisokaCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // BATMAN "Combo": Down+Heavy opens batCombo1 (jab), re-tap Heavy on hit → batCombo2 (uppercut) →
  // batCombo3 (launcher). Cancel-on-hit; a whiff/block ends the string. Consumes the input only when
  // it fires (returns true → skip normal path); neutral light/heavy stay on the normal path below.
  if ((fighter.rosterKey || "").toLowerCase() === "batman" && !charging &&
      updateBatmanCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // SUPERMAN "Kryptonian Rush": Fwd+Heavy opens supRush1 (flying cross), re-tap Heavy on hit → supRush2
  // → supRushFin (charged-haymaker launcher). Cancel-on-hit; a whiff/block ends the string. Consumes the
  // input only when it fires (returns true → skip normal path); neutral light/heavy stay on the normal path.
  if ((fighter.rosterKey || "").toLowerCase() === "superman" && !charging &&
      updateSupermanCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // TOBIRAMA taijutsu chain: Fwd+Heavy opens tobiCombo1, re-tap Heavy on hit → tobiCombo2 → tobiComboFin
  // (cancel-on-hit; a whiff/block ends the string). Free pokes: Fwd+Light = Strong Forward, Back+Heavy =
  // Rising Knee. Consumes the input only when it fires; neutral light/heavy/up stay on the normal path.
  if ((fighter.rosterKey || "").toLowerCase() === "tobirama" && !charging &&
      updateTobiramaCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // HASHIRAMA taijutsu chain: Fwd+Heavy opens hashiComboA, re-tap Heavy on hit → hashiComboB → hashiComboFin
  // launcher (cancel-on-hit; a whiff/block ends the string). Free poke: Fwd+Light = wood-beam straight.
  // Consumes the input only when it fires; neutral light/heavy/up/air/down_air stay on the normal path.
  if ((fighter.rosterKey || "").toLowerCase() === "hashirama" && !charging &&
      updateHashiramaCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // MADARA — Fwd+Heavy → Susanoo Base Punch (command-normal; neutral Heavy stays the combo_1 normal).
  // Consumes the input only when it fires.
  if ((fighter.rosterKey || "").toLowerCase() === "madara" && !charging &&
      updateMadaraCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // OBITO "Kamui Rod Combo": Fwd+Heavy opens obitoRod1 → re-tap Heavy on a clean hit → obitoRod2 →
  // obitoRod3 launcher finisher (cancel-on-hit; a whiff/block ends the string). Consumes the input
  // only when it fires (returns true → skip normal path); neutral light/heavy/up/air/down_air stay normal.
  if ((fighter.rosterKey || "").toLowerCase() === "obito" && !charging &&
      updateObitoCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // PAIN — Fwd+Light → painJab (single); Fwd+Heavy → 3-stage rekka painCombo1→2→3 (re-tap Heavy on a
  // clean hit to advance). Consumes the input only when it fires; neutral light/heavy/up/air/air_heavy/
  // down_air stay on the normal path.
  if ((fighter.rosterKey || "").toLowerCase() === "pain" && !charging &&
      updatePainCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // TOBI (masked Obito alias) — per-frame combat watcher. Stage 2: spawns the thrown kunai on the
  // air-normal's active frame (a side-effect; returns true only if it consumes an input, none yet).
  // Fully independent of Obito (own `_tobi*` state). Later stages add command inputs here.
  if ((fighter.rosterKey || "").toLowerCase() === "tobi" && !charging &&
      updateTobiCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // SASUKE — the grab button (Down+Light) IS his standalone skeletal Susanoo command-grab (Tier-1),
  // fired from neutral and fully independent of his staged Susanoo ultimate. Consumes the grab input
  // (suppresses the generic grab below) whenever grounded; other inputs stay on the normal path.
  if ((fighter.rosterKey || "").toLowerCase() === "sasuke" && !charging &&
      updateSasukeCommandCombat(fighter, inputState, getAbilityContext())) return

  // MINATO "Yellow Flash Rush": Fwd+Heavy opens minatoRush1, re-tap Heavy on hit → minatoRush2 →
  // minatoRushFin (cancel-on-hit; a whiff/block ends the string). Free pokes: Fwd+Light = Floor Combo,
  // Back+Heavy = Melee Rush. Consumes the input only when it fires; neutral normals stay on the normal path.
  if ((fighter.rosterKey || "").toLowerCase() === "minato" && !charging &&
      updateMinatoCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // ZENITSU "Thunderclap Flurry": Down+Heavy opens zenCombo1, re-tap Heavy on hit → zenCombo2 →
  // zenCombo3 (cancel-on-hit; a whiff/block ends the string). Consumes the input only when it fires;
  // neutral light/heavy/up/air/down_air stay on the normal path.
  if ((fighter.rosterKey || "").toLowerCase() === "zenitsu" && !charging &&
      updateZenitsuCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // RENGOKU "Flame Breathing" chains: Fwd+Heavy opens the chain (grounded → ground / airborne → air);
  // re-tap Heavy on a clean hit to continue the normal chain, or press Special on a clean hit to branch
  // into the escalated super finisher. Cancel-on-hit; a whiff/block ends the string. Consumes the input
  // only when it fires (returns true → skip normal path); neutral light/heavy/up/air/down_air stay normal.
  if ((fighter.rosterKey || "").toLowerCase() === "rengoku" && !charging &&
      updateRengokuCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // SHINOBU "Insect Breathing" thrust chain: Fwd+Heavy opens shinobuG1, re-tap Heavy on a clean hit →
  // shinobuG2 → shinobuG3 (cancel-on-hit; a whiff/block ends the string). Also drives the POISON-on-hit
  // watcher for her Poison Thrust special. Consumes the input only when it fires; neutral normals stay normal.
  if ((fighter.rosterKey || "").toLowerCase() === "shinobu" && !charging &&
      updateShinobuCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // INOSUKE "Beast Breathing Flurry" chain: Fwd+Heavy opens inosukeB1, re-tap Heavy on a clean hit →
  // B2 → B3 → B4 → B5 finisher (5-stage, cancel-on-hit; a whiff/block ends the string). Also Down+Heavy
  // = Beast Fang command normal. Consumes the input only when it fires; neutral heavy stays a normal.
  if ((fighter.rosterKey || "").toLowerCase() === "inosuke" && !charging &&
      updateInosukeCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // NEZUKO B-family directional command normals: Fwd+B = Ball Kick (launches a ball projectile),
  // Down+B = Dodge (low i-frame evade, no strike). Neutral/Up/Air Light stay normal. Fires only when it
  // intercepts (returns true → skip normal path); consumes the Light press so it doesn't also throw a punch.
  if ((fighter.rosterKey || "").toLowerCase() === "nezuko" && !charging &&
      updateNezukoCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // GHOSTFACE "Slasher Frenzy" low-knife chain: Down+Heavy opens ghostfaceCombo1, re-tap Heavy on a clean
  // hit → Combo2 → Combo3 (cancel-on-hit; a whiff/block ends the string). Also drives the BLEED- and
  // KNOCKDOWN-on-hit watchers for his Gutting Lunge / Low Gut specials. Consumes the input only when it fires.
  if ((fighter.rosterKey || "").toLowerCase() === "ghostface" && !charging &&
      updateGhostfaceCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // MIWA "Battojutsu Rush" katana chain: Fwd+Heavy opens miwaG1, re-tap Heavy on a clean hit → miwaG2 →
  // miwaG3 launcher (cancel-on-hit; a whiff/block ends the string). Consumes the input only when it fires;
  // neutral heavy stays a normal. Mirrors updateMakiCommandCombat/updateShinobuCommandCombat.
  if ((fighter.rosterKey || "").toLowerCase() === "miwa" && !charging &&
      updateMiwaCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // MAKI "Cursed Tool Flurry" kick chain: Fwd+Heavy opens makiG1, re-tap Heavy on a clean hit → makiG2 →
  // makiG3 finisher (cancel-on-hit; a whiff/block ends the string). Same shared rekka gate as Miwa/Shinobu,
  // but with the Heavenly-Vow per-character TIGHT cancel window (fireMakiCommand stamps _cancelWindowFrames).
  if ((fighter.rosterKey || "").toLowerCase() === "maki" && !charging &&
      updateMakiCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // TOJI A-B-C-A+B hand-combo chain: Fwd+Heavy opens tojiG1 (jab), re-tap Heavy on a clean hit → tojiG2
  // (cross) → tojiG3 (hook) → tojiG4 (big-straight finisher; cancel-on-hit, whiff/block ends the string).
  // Back+Heavy = Handgun bullet poke. Consumes the input only when it fires; neutral light/heavy stay normal.
  if ((fighter.rosterKey || "").toLowerCase() === "toji" && !charging &&
      updateTojiCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // ICHIGO "Zangetsu" command system: Fwd+Heavy opens the 3-hit rekka (ichigoRekka1 slash → ichigoRekka2
  // double-slash → ichigoRekka3 combo→launcher finisher, cancel-on-hit). Plus free command normals:
  // Down+Heavy low sweep, Back+Heavy advancing launcher, Fwd+Light hilt-jab, Dash+Heavy rushing combo.
  // Consumes the input only when it fires (returns true → skip normal path); neutral light/heavy stay normal.
  if ((fighter.rosterKey || "").toLowerCase() === "ichigo" && !charging &&
      updateIchigoCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // ZARAKI command normals: Fwd+Light / Fwd+Heavy forward slashes + the Up+B AERIAL route (airborne
  // Up-attack = up-swing; repeat Up+B while it's live cancels into the descent slam). Consumes the input
  // only when it fires (returns true → skip normal path); neutral light/heavy/up stay normal. Runs airborne too.
  if (["zaraki", "zaraki_shikai"].includes((fighter.rosterKey || "").toLowerCase()) && !charging &&
      updateZarakiCommandCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  // NETERO Guanyin giant: the base attack buttons fire the 4 avatar attacks (light=leg, heavy=arm-sweep,
  // up=punch-burst; combo-slash is on SPECIAL). Consumes the press only when it fires.
  if ((fighter.rosterKey || "").toLowerCase() === "netero" && fighter._guanyinActive && !charging &&
      updateNeteroGuanyinCombat(fighter, inputState, getAbilityContext(), getAttackPhase)) return

  let ctrlState = buildNormalControlState(fighter, vKeys)
  // Sasuke's grab button IS his standalone skeletal Susanoo command-grab (updateSasukeCommandCombat,
  // above) — so suppress the generic combat.js grab for him (else the level-triggered grab would
  // re-grab every held frame). Other characters keep the normal grab.
  if ((fighter.rosterKey || "").toLowerCase() === "sasuke") ctrlState = { ...ctrlState, grab: false }
  // Obito's grab button IS his Kamui Teleport Grab (updateObitoCommandCombat) — suppress the generic grab.
  if ((fighter.rosterKey || "").toLowerCase() === "obito") ctrlState = { ...ctrlState, grab: false }
  // Charge lockout: suppress EVERY normal (grounded + aerial + grab) while charging. The
  // special (release/fire) already ran above; nothing else may start until P is released.
  if (charging) ctrlState = { light: false, heavy: false, upAttack: false, air: false, downAir: false, airHeavy: false, grab: false }
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

// SUPERMAN SOLAR FLARE (Stage 4) — gold radiant glow while _solarFlareActive (OVERLAY, no body-swap).
// A warm pulsing gold halo + soft rays. Drawn BEHIND the body, mirroring the other auras. No-op otherwise.
function drawSupermanSolarFlareAura(c, fighter) {
  if (!c || !fighter?._solarFlareActive) return
  const x = fighter.x ?? 0, y = fighter.y ?? 0, w = fighter.w ?? 60, h = fighter.h ?? 110
  const pulse  = 0.5 + 0.5 * Math.sin(fighter._solarFlarePulse = (fighter._solarFlarePulse || 0) + 0.16)
  const cx = x + w / 2, cy = y + h / 2
  c.save()
  // radiant gold halo
  c.globalAlpha = 0.22 + pulse * 0.14
  c.shadowBlur  = 26 + pulse * 12
  c.shadowColor = "#ffcc2e"
  c.strokeStyle = "#ffe27a"
  c.lineWidth   = 10 + pulse * 5
  const spread = 12 + pulse * 5, rx = x - spread / 2, ry = y - spread / 2, rw = w + spread, rh = h + spread, r = 16
  c.beginPath()
  c.moveTo(rx + r, ry)
  c.arcTo(rx + rw, ry, rx + rw, ry + rh, r); c.arcTo(rx + rw, ry + rh, rx, ry + rh, r)
  c.arcTo(rx, ry + rh, rx, ry, r);          c.arcTo(rx, ry, rx + rw, ry, r)
  c.closePath(); c.stroke()
  // solar rays radiating out
  c.globalAlpha = 0.18 + pulse * 0.10; c.strokeStyle = "#fff2b0"; c.lineWidth = 2
  const R0 = Math.max(w, h) * 0.5, R1 = R0 + 14 + pulse * 8
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + fighter._solarFlarePulse * 0.05
    c.beginPath(); c.moveTo(cx + Math.cos(a) * R0, cy + Math.sin(a) * R0); c.lineTo(cx + Math.cos(a) * R1, cy + Math.sin(a) * R1); c.stroke()
  }
  c.restore()
}

// SUPERMAN KRYPTONIAN OVERLOAD (Stage 4) — blue electric crackle while _overloadActive (OVERLAY). A blue
// pulsing outline + jagged lightning arcs around the body. Drawn BEHIND the body. No-op otherwise.
function drawSupermanOverloadAura(c, fighter) {
  if (!c || !fighter?._overloadActive) return
  const x = fighter.x ?? 0, y = fighter.y ?? 0, w = fighter.w ?? 60, h = fighter.h ?? 110
  const t = (fighter._overloadPulse = (fighter._overloadPulse || 0) + 0.4)
  const pulse = 0.5 + 0.5 * Math.sin(t)
  c.save()
  // blue electric outline
  c.globalAlpha = 0.22 + pulse * 0.16
  c.shadowBlur  = 16 + pulse * 8
  c.shadowColor = "#38bdf8"
  c.strokeStyle = "#bae6fd"
  c.lineWidth   = 3 + pulse * 2
  const spread = 8 + pulse * 5, rx = x - spread / 2, ry = y - spread / 2, rw = w + spread, rh = h + spread, r = 14
  c.beginPath()
  c.moveTo(rx + r, ry)
  c.arcTo(rx + rw, ry, rx + rw, ry + rh, r); c.arcTo(rx + rw, ry + rh, rx, ry + rh, r)
  c.arcTo(rx, ry + rh, rx, ry, r);          c.arcTo(rx, ry, rx + rw, ry, r)
  c.closePath(); c.stroke()
  // jagged lightning arcs down each side (deterministic zig from the pulse clock — no Math.random)
  c.globalAlpha = 0.5 + pulse * 0.3; c.strokeStyle = "#e0f2fe"; c.lineWidth = 2; c.shadowBlur = 8
  for (const side of [-1, 1]) {
    const bx = x + (side < 0 ? 0 : w)
    c.beginPath(); c.moveTo(bx, y)
    for (let s = 1; s <= 5; s++) { const yy = y + (h * s) / 5; const jag = side * ((s % 2 ? 6 : -3) + Math.sin(t * 2 + s) * 3); c.lineTo(bx + jag, yy) }
    c.stroke()
  }
  c.restore()
}

// RICK VOID FORM — procedural COSMIC STARFIELD overlay (cosmetic). Drawn ON TOP of the black void
// sprite. The pattern is generated ONCE per skin-load (seeded → deterministic, never re-randomized per
// frame, so it never flickers) and stored in NORMALIZED sprite-bbox coords, so it tracks the sprite's
// exact drawn position/scale (sprite.js records _lastDraw*) across every pose. Reuses the same on-canvas
// procedural-FX pattern as the other auras (no baked pixels). No-op unless the Void Form skin is active.
function _mulberry32(a) {
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
}
function _rgbaHex(hex, a) {
  const h = hex.replace("#", ""); const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}
function seedVoidStarfield(fighter) {
  const rnd = _mulberry32(0x51DEC0DE)          // fixed seed → identical pattern every load (stable)
  // Scatter within a HUMANOID profile of the bbox (narrow head, wide torso, narrow legs) so stars land
  // on Rick's silhouette rather than floating in the empty bbox corners — no per-frame image sampling.
  const halfWidth = ny => ny < 0.28 ? 0.17 : (ny < 0.64 ? 0.27 : 0.13)   // head / torso+coat / legs
  const stars = []
  for (let i = 0; i < 22; i++) {               // low density — subtle scattered stars, not a haze
    const ny = 0.08 + rnd() * 0.87
    const nx = 0.5 + (rnd() * 2 - 1) * halfWidth(ny)
    stars.push({ nx, ny, r: rnd() < 0.72 ? 1 : 2, a: 0.55 + rnd() * 0.45 })
  }
  const palette = ["#9B6FD4", "#5FC7C7", "#E288B4"]   // muted purple / teal / pink nebulae
  const nebulae = []
  for (let i = 0; i < 3; i++) {                 // 2-3 sparse, diffuse "distant galaxy" blobs, centred on the torso
    nebulae.push({ nx: 0.34 + rnd() * 0.32, ny: 0.22 + rnd() * 0.42, r: 0.15 + rnd() * 0.1, color: palette[i % 3], a: 0.16 + rnd() * 0.08 })
  }
  fighter._voidFX = { stars, nebulae }
}
function drawVoidStarfield(c, fighter) {
  if (!c || fighter?.skinId !== "rickVoidForm") return
  if (!fighter._voidFX) seedVoidStarfield(fighter)
  const x = fighter._lastDrawX, y = fighter._lastDrawY, w = fighter._lastDrawW, h = fighter._lastDrawH
  if (x == null || w == null) return
  const fx = fighter._voidFX
  c.save()
  // nebulae behind the stars — soft radial blobs
  for (const n of fx.nebulae) {
    const cx = x + n.nx * w, cy = y + n.ny * h, rad = n.r * Math.max(w, h)
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, rad)
    g.addColorStop(0, _rgbaHex(n.color, n.a)); g.addColorStop(1, _rgbaHex(n.color, 0))
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, rad, 0, Math.PI * 2); c.fill()
  }
  // stars — fixed-position pale dots with a soft glow (fixed brightness, no per-frame flicker)
  c.shadowColor = "#CFE0FF"; c.shadowBlur = 2; c.fillStyle = "#F5F5FF"
  for (const s of fx.stars) {
    c.globalAlpha = s.a
    c.fillRect(x + s.nx * w - s.r / 2, y + s.ny * h - s.r / 2, s.r, s.r)
  }
  c.restore()
}

// MAKI "VOID HUNTER" — procedural VOID-COSMOS overlay (cosmetic), on top of the near-black full-form sprite.
// Same architecture as Rick's Void Form starfield (SEEDED ONCE per skin-load, normalized to the sprite bbox
// via _lastDraw* so it tracks every pose) — but living: the pale stars slowly DRIFT and the red/violet
// nebulae gently SWIRL around their seed centres (advanced by _voidHunterClock). BASE-FORM ONLY — self-skips
// while _shibuyaActive (the black Shibuya costume has its own look). No baked pixels; no-op for anyone else.
function seedVoidHunterField(fighter) {
  const rnd = _mulberry32(0x1DEA5EED)
  const halfWidth = ny => ny < 0.28 ? 0.17 : (ny < 0.64 ? 0.27 : 0.14)   // head / torso / legs
  const stars = []
  for (let i = 0; i < 22; i++) {                // low density — subtle scattered void-lights
    const ny = 0.08 + rnd() * 0.87
    const nx = 0.5 + (rnd() * 2 - 1) * halfWidth(ny)
    stars.push({ nx, ny, r: rnd() < 0.72 ? 1 : 2, a: 0.5 + rnd() * 0.45,
      driftAmp: 0.006 + rnd() * 0.014, driftFreq: 0.5 + rnd() * 1.0, phase: rnd() * Math.PI * 2 })
  }
  const palette = ["#B02A3A", "#7E2E8F", "#A83373"]   // red / violet / magenta void nebulae (distinct signature)
  const nebulae = []
  for (let i = 0; i < 3; i++) {                 // 3 sparse, diffuse nebula blobs centred on the torso
    nebulae.push({ nx: 0.33 + rnd() * 0.34, ny: 0.24 + rnd() * 0.40, r: 0.16 + rnd() * 0.1,
      color: palette[i % 3], a: 0.16 + rnd() * 0.08,
      swirlR: 0.02 + rnd() * 0.03, swirlFreq: 0.4 + rnd() * 0.6, phase: rnd() * Math.PI * 2 })
  }
  fighter._voidHunterFX = { stars, nebulae }
}
function drawVoidHunterOverlay(c, fighter) {
  if (!c || fighter?.skinId !== "makiVoidHunter") return
  if (fighter._shibuyaActive) return                    // base-form only (the Shibuya costume has its own look)
  if (!fighter._voidHunterFX) seedVoidHunterField(fighter)
  const x = fighter._lastDrawX, y = fighter._lastDrawY, w = fighter._lastDrawW, h = fighter._lastDrawH
  if (x == null || w == null) return
  const fx = fighter._voidHunterFX
  const t = (fighter._voidHunterClock = (fighter._voidHunterClock || 0) + 1)
  c.save()
  // nebulae behind the stars — soft radial blobs that gently SWIRL around their seed centre
  for (const n of fx.nebulae) {
    const cx = x + (n.nx + n.swirlR * Math.cos(t * 0.02 * n.swirlFreq + n.phase)) * w
    const cy = y + (n.ny + n.swirlR * Math.sin(t * 0.02 * n.swirlFreq + n.phase)) * h
    const rad = n.r * Math.max(w, h)
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, rad)
    g.addColorStop(0, _rgbaHex(n.color, n.a)); g.addColorStop(1, _rgbaHex(n.color, 0))
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, rad, 0, Math.PI * 2); c.fill()
  }
  // stars — pale void-lights that slowly DRIFT (fixed brightness glow, gentle sway, no strobe flicker)
  c.shadowColor = "#D8C4FF"; c.shadowBlur = 2; c.fillStyle = "#F3EEFF"
  for (const s of fx.stars) {
    const nx = s.nx + s.driftAmp * Math.sin(t * 0.03 * s.driftFreq + s.phase)
    const ny = s.ny + s.driftAmp * 0.6 * Math.cos(t * 0.03 * s.driftFreq + s.phase)
    c.globalAlpha = s.a
    c.fillRect(x + nx * w - s.r / 2, y + ny * h - s.r / 2, s.r, s.r)
  }
  c.restore()
}

// PAIN "VOID PATH" skin — on top of the unified near-black sprite: small drifting DEEP-RED particles
// (tying to his Rinnegan / piercing red) + occasional soft expanding gravity RIPPLE-PULSES (evoking his
// Shinra Tensei / Bansho Ten'in gravitational techniques). Seeded ONCE, normalized to the drawn bbox
// (_lastDraw*) so it TRACKS every pose incl. Chibaku Tensei. Same architecture as the other Void overlays
// (no strobe; continuous motion).
function seedPainVoidField(fighter) {
  const rnd = _mulberry32(0x9A17ED0F)
  const RED = ["#C81E1E", "#9E1414", "#E23A3A", "#7A1018"]
  const halfWidth = ny => ny < 0.30 ? 0.17 : (ny < 0.66 ? 0.28 : 0.16)   // head / torso / legs envelope
  const motes = []
  for (let i = 0; i < 28; i++) {
    const ny = 0.05 + rnd() * 0.92
    const nx = 0.5 + (rnd() * 2 - 1) * halfWidth(ny)
    motes.push({ nx, ny, r: rnd() < 0.62 ? 2 : 3, color: RED[(rnd() * RED.length) | 0],
      a: 0.55 + rnd() * 0.35, driftAmp: 0.006 + rnd() * 0.016, driftFreq: 0.25 + rnd() * 0.7, phase: rnd() * Math.PI * 2 })
  }
  // gravity ripple-pulses — expanding rings from the torso; staggered so one is always mid-bloom
  const ripples = []
  for (let i = 0; i < 3; i++) ripples.push({ cx: 0.5, cy: 0.42, period: 96, offset: i * 32 })
  fighter._painVoidFX = { motes, ripples }
}
function drawPainVoidOverlay(c, fighter) {
  if (!c || fighter?.skinId !== "painVoidPath") return
  if (!fighter._painVoidFX) seedPainVoidField(fighter)
  const x = fighter._lastDrawX, y = fighter._lastDrawY, w = fighter._lastDrawW, h = fighter._lastDrawH
  if (x == null || w == null) return
  const fx = fighter._painVoidFX
  const t = (fighter._painVoidClock = (fighter._painVoidClock || 0) + 1)
  c.save()
  // gravity ripple-pulses — soft expanding crimson rings (Shinra Tensei / Bansho Ten'in feel)
  c.globalCompositeOperation = "lighter"
  for (const rp of fx.ripples) {
    const prog = ((t + rp.offset) % rp.period) / rp.period   // 0→1
    const cx = x + rp.cx * w, cy = y + rp.cy * h
    const rad = prog * Math.max(w, h) * 0.85
    const alpha = Math.sin(prog * Math.PI) * 0.28            // fade in then out
    if (alpha <= 0.01) continue
    c.strokeStyle = `rgba(210,40,40,${alpha})`
    c.lineWidth = 2.2 * (1 - prog) + 0.6
    c.beginPath(); c.ellipse(cx, cy, rad, rad * 0.9, 0, 0, Math.PI * 2); c.stroke()
  }
  c.globalCompositeOperation = "source-over"
  // drifting deep-red motes (Rinnegan / piercing tie) — fixed glow, gentle sway, no strobe
  c.shadowColor = "#E23A3A"; c.shadowBlur = 3
  for (const m of fx.motes) {
    const nx = m.nx + m.driftAmp * Math.sin(t * 0.03 * m.driftFreq + m.phase)
    const ny = m.ny + m.driftAmp * 0.6 * Math.cos(t * 0.03 * m.driftFreq + m.phase)
    c.globalAlpha = m.a; c.fillStyle = m.color
    c.fillRect(x + nx * w - m.r / 2, y + ny * h - m.r / 2, m.r, m.r)
  }
  c.restore()
}

// RED RANGER "MORPHER VOID" (Alien-X style) — on top of the full-form near-black sprite: small drifting
// particles in bright MORPHER-ENERGY RED (tying to his own colour identity + the "Morpher Energy" resource
// label) + occasional soft expanding red-white PULSE-RINGS evoking a teleport / morph-flash. Seeded ONCE,
// normalized to the drawn bbox (_lastDraw*) so it TRACKS every pose incl. the Power Sword Ultimate. Same
// architecture as the other Void overlays (no strobe; continuous motion).
function seedMorpherVoidField(fighter) {
  const rnd = _mulberry32(0x5ED9A17E)
  const RED = ["#FF3B30", "#E01818", "#FF5B52", "#C81020"]   // bright morpher-energy red
  const halfWidth = ny => ny < 0.30 ? 0.17 : (ny < 0.66 ? 0.28 : 0.16)   // head / torso / legs envelope
  const motes = []
  for (let i = 0; i < 26; i++) {
    const ny = 0.05 + rnd() * 0.92
    const nx = 0.5 + (rnd() * 2 - 1) * halfWidth(ny)
    motes.push({ nx, ny, r: rnd() < 0.6 ? 2 : 3, color: RED[(rnd() * RED.length) | 0],
      a: 0.6 + rnd() * 0.35, driftAmp: 0.007 + rnd() * 0.016, driftFreq: 0.3 + rnd() * 0.7, phase: rnd() * Math.PI * 2 })
  }
  // morph-flash pulse-rings — expanding red-white rings from the torso; staggered so one is always mid-bloom
  const rings = []
  for (let i = 0; i < 2; i++) rings.push({ cx: 0.5, cy: 0.40, period: 132, offset: i * 66 })
  fighter._morpherVoidFX = { motes, rings }
}
function drawMorpherVoidOverlay(c, fighter) {
  if (!c || fighter?.skinId !== "rr_void") return
  if (!fighter._morpherVoidFX) seedMorpherVoidField(fighter)
  const x = fighter._lastDrawX, y = fighter._lastDrawY, w = fighter._lastDrawW, h = fighter._lastDrawH
  if (x == null || w == null) return
  const fx = fighter._morpherVoidFX
  const t = (fighter._morpherVoidClock = (fighter._morpherVoidClock || 0) + 1)
  c.save()
  // morph-flash pulse-rings — bright red-white expanding rings (teleport / morph-flash feel)
  c.globalCompositeOperation = "lighter"
  for (const rg of fx.rings) {
    const prog = ((t + rg.offset) % rg.period) / rg.period   // 0→1
    const cx = x + rg.cx * w, cy = y + rg.cy * h
    const rad = prog * Math.max(w, h) * 0.95
    const alpha = Math.pow(Math.sin(prog * Math.PI), 1.4) * 0.5   // sharp bloom, then fade
    if (alpha <= 0.01) continue
    c.strokeStyle = `rgba(255,236,230,${alpha * 0.7})`             // white-hot inner ring
    c.lineWidth = 2.2 * (1 - prog) + 0.5
    c.beginPath(); c.ellipse(cx, cy, rad, rad * 0.92, 0, 0, Math.PI * 2); c.stroke()
    c.strokeStyle = `rgba(255,60,48,${alpha})`                     // morpher-red outer ring
    c.lineWidth = 3.2 * (1 - prog) + 0.8
    c.beginPath(); c.ellipse(cx, cy, rad * 1.06, rad * 0.98, 0, 0, Math.PI * 2); c.stroke()
  }
  c.globalCompositeOperation = "source-over"
  // drifting bright morpher-red particles — fixed glow, gentle sway, no strobe
  c.shadowColor = "#FF3B30"; c.shadowBlur = 3
  for (const m of fx.motes) {
    const nx = m.nx + m.driftAmp * Math.sin(t * 0.03 * m.driftFreq + m.phase)
    const ny = m.ny + m.driftAmp * 0.6 * Math.cos(t * 0.03 * m.driftFreq + m.phase)
    c.globalAlpha = m.a; c.fillStyle = m.color
    c.fillRect(x + nx * w - m.r / 2, y + ny * h - m.r / 2, m.r, m.r)
  }
  c.restore()
}

// TOBI "KAMUI VOID" (Alien-X style) — on top of the full-form near-black sprite: small drifting deep-VIOLET
// + RED particles + occasional soft rotating SWIRL-PULSE vortices evoking the Kamui portal specifically
// (spiral arms that grow + rotate + bloom, unlike the concentric ring pulses of the other Void skins).
// Seeded ONCE, normalized to the drawn bbox (_lastDraw*) so it TRACKS every pose. Continuous motion, no strobe.
function seedKamuiVoidField(fighter) {
  const rnd = _mulberry32(0x0B17A0BE)
  const COL = ["#B44CE6", "#8A2ED0", "#C81E28", "#E23A6A"]   // deep violet + Kamui red
  const halfWidth = ny => ny < 0.28 ? 0.15 : (ny < 0.66 ? 0.30 : 0.20)   // head / cloak / hem envelope
  const motes = []
  for (let i = 0; i < 28; i++) {
    const ny = 0.05 + rnd() * 0.92
    const nx = 0.5 + (rnd() * 2 - 1) * halfWidth(ny)
    motes.push({ nx, ny, r: rnd() < 0.6 ? 2 : 3, color: COL[(rnd() * COL.length) | 0],
      a: 0.55 + rnd() * 0.35, driftAmp: 0.007 + rnd() * 0.016, driftFreq: 0.25 + rnd() * 0.7, phase: rnd() * Math.PI * 2 })
  }
  // Kamui swirl-pulses — spiral vortices at the torso; staggered so one is always mid-bloom
  const swirls = []
  for (let i = 0; i < 2; i++) swirls.push({ cx: 0.5, cy: 0.42, period: 150, offset: i * 75, dir: i % 2 ? 1 : -1 })
  fighter._kamuiVoidFX = { motes, swirls }
}
function drawKamuiVoidOverlay(c, fighter) {
  if (!c || fighter?.skinId !== "tobiKamuiVoid") return
  if (!fighter._kamuiVoidFX) seedKamuiVoidField(fighter)
  const x = fighter._lastDrawX, y = fighter._lastDrawY, w = fighter._lastDrawW, h = fighter._lastDrawH
  if (x == null || w == null) return
  const fx = fighter._kamuiVoidFX
  const t = (fighter._kamuiVoidClock = (fighter._kamuiVoidClock || 0) + 1)
  c.save()
  // Kamui portal swirl-pulses — rotating spiral arms that grow + bloom then fade (the vortex draw-in feel)
  c.globalCompositeOperation = "lighter"
  for (const sw of fx.swirls) {
    const prog = ((t + sw.offset) % sw.period) / sw.period
    const alpha = Math.sin(prog * Math.PI) * 0.42
    if (alpha <= 0.01) continue
    const cx = x + sw.cx * w, cy = y + sw.cy * h
    const baseR = prog * Math.max(w, h) * 0.5
    const rot = sw.dir * t * 0.06
    c.lineWidth = 1.6
    for (let arm = 0; arm < 4; arm++) {
      const a0 = rot + arm * (Math.PI / 2)
      c.strokeStyle = `rgba(178,72,230,${alpha})`   // violet spiral arm
      c.beginPath()
      for (let k = 0; k <= 11; k++) {
        const ang = a0 + k * 0.34
        const rr = baseR * (0.28 + k * 0.075)
        const sx = cx + Math.cos(ang) * rr, sy = cy + Math.sin(ang) * rr * 0.9
        if (k === 0) c.moveTo(sx, sy); else c.lineTo(sx, sy)
      }
      c.stroke()
    }
    // red vortex core dot
    c.fillStyle = `rgba(226,58,58,${alpha * 0.9})`
    c.beginPath(); c.arc(cx, cy, 2.2 * (1 - prog) + 1, 0, Math.PI * 2); c.fill()
  }
  c.globalCompositeOperation = "source-over"
  // drifting deep-violet / red particles — fixed glow, gentle sway, no strobe
  c.shadowColor = "#B44CE6"; c.shadowBlur = 3
  for (const m of fx.motes) {
    const nx = m.nx + m.driftAmp * Math.sin(t * 0.03 * m.driftFreq + m.phase)
    const ny = m.ny + m.driftAmp * 0.6 * Math.cos(t * 0.03 * m.driftFreq + m.phase)
    c.globalAlpha = m.a; c.fillStyle = m.color
    c.fillRect(x + nx * w - m.r / 2, y + ny * h - m.r / 2, m.r, m.r)
  }
  c.restore()
}

// TOBI "CELESTIAL VEIL" — a deliberately SERENE / ELEGANT cosmic overlay (NOT a harsh Void skin). On top
// of the pale lavender-white base: soft, slow-drifting PASTEL star-lights (gentle pinks / soft blues /
// pale golds) that twinkle gently + a few very diffuse pastel nebula glows that slowly swirl — a beautiful,
// dreamy look rather than an intimidating void. Same architecture as Void Hunter (seeded ONCE, normalized
// to the drawn bbox `_lastDraw*` so it TRACKS across every pose, smooth continuous motion, no strobe).
function seedTobiCelestialField(fighter) {
  const rnd = _mulberry32(0x7EE1CE1A)
  // Richer JEWEL-pastels (rose · periwinkle · amber · orchid) — a pale/white star vanishes on the pale
  // lavender base, so these carry enough colour+depth to read as gentle sparkles against it while staying
  // soft and pretty (dreamy gems on a veil), NOT the harsh white/ember of the Void skins.
  const PASTEL = ["#E24E93", "#5A6EE8", "#E8A838", "#A64ED8"]
  const halfWidth = ny => ny < 0.30 ? 0.19 : (ny < 0.66 ? 0.30 : 0.16)   // head / torso / legs envelope
  const stars = []
  for (let i = 0; i < 34; i++) {
    const ny = 0.05 + rnd() * 0.92
    const nx = 0.5 + (rnd() * 2 - 1) * halfWidth(ny)
    stars.push({ nx, ny, r: rnd() < 0.60 ? 2 : 3, color: PASTEL[(rnd() * PASTEL.length) | 0],
      a: 0.70 + rnd() * 0.25, twAmp: 0.12 + rnd() * 0.22, twFreq: 0.20 + rnd() * 0.45,   // gentle twinkle (soft, not strobe)
      driftAmp: 0.006 + rnd() * 0.014, driftFreq: 0.30 + rnd() * 0.7, phase: rnd() * Math.PI * 2 })
  }
  const nebulae = []
  for (let i = 0; i < 3; i++) {
    nebulae.push({ nx: 0.30 + rnd() * 0.40, ny: 0.20 + rnd() * 0.48, r: 0.17 + rnd() * 0.12,
      color: PASTEL[i % PASTEL.length], a: 0.20 + rnd() * 0.10,                          // soft dreamy swirls (readable on pale)
      swirlR: 0.014 + rnd() * 0.022, swirlFreq: 0.30 + rnd() * 0.5, phase: rnd() * Math.PI * 2 })
  }
  fighter._tobiCelestialFX = { stars, nebulae }
}
function drawTobiCelestialOverlay(c, fighter) {
  if (!c || fighter?.skinId !== "tobiCelestial") return
  if (!fighter._tobiCelestialFX) seedTobiCelestialField(fighter)
  const x = fighter._lastDrawX, y = fighter._lastDrawY, w = fighter._lastDrawW, h = fighter._lastDrawH
  if (x == null || w == null) return
  const fx = fighter._tobiCelestialFX
  const t = (fighter._tobiCelestialClock = (fighter._tobiCelestialClock || 0) + 1)
  c.save()
  // diffuse pastel nebulae — dreamy soft glows that gently swirl around their seed centre
  for (const n of fx.nebulae) {
    const cx = x + (n.nx + n.swirlR * Math.cos(t * 0.015 * n.swirlFreq + n.phase)) * w
    const cy = y + (n.ny + n.swirlR * Math.sin(t * 0.015 * n.swirlFreq + n.phase)) * h
    const rad = n.r * Math.max(w, h)
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, rad)
    g.addColorStop(0, _rgbaHex(n.color, n.a)); g.addColorStop(1, _rgbaHex(n.color, 0))
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, rad, 0, Math.PI * 2); c.fill()
  }
  // pastel star-lights — slow drift + a gentle twinkle. A saturated-pastel body + soft colour glow (so it
  // READS on the pale base) with a tiny white core for a delicate sparkle. Elegant, not a harsh burst.
  for (const s of fx.stars) {
    const nx = s.nx + s.driftAmp * Math.sin(t * 0.025 * s.driftFreq + s.phase)
    const ny = s.ny + s.driftAmp * 0.6 * Math.cos(t * 0.025 * s.driftFreq + s.phase)
    const tw = 1 - s.twAmp * (0.5 + 0.5 * Math.sin(t * s.twFreq + s.phase))   // gentle brightness sway
    const px = x + nx * w, py = y + ny * h
    c.globalAlpha = Math.max(0, Math.min(1, s.a * tw))
    c.shadowColor = s.color; c.shadowBlur = 4; c.fillStyle = s.color
    // soft 4-point pastel sparkle
    c.fillRect(px - s.r, py - 0.5, s.r * 2, 1); c.fillRect(px - 0.5, py - s.r, 1, s.r * 2)
    c.fillRect(px - s.r / 2, py - s.r / 2, s.r, s.r)
    // tiny bright core
    c.globalAlpha = Math.max(0, Math.min(1, s.a * tw * 0.9)); c.shadowBlur = 2; c.fillStyle = "#FFFFFF"
    c.fillRect(px - 0.5, py - 0.5, 1, 1)
  }
  c.restore()
}

// YUJI "VOID" — procedural overlay on top of the void-black sprite. SIGNATURE (distinct from every prior
// Void skin): dense small WHITE/PALE scattered dots (the dominant feature) + a FEW soft VIOLET-ONLY clusters
// (no red/magenta like Maki's Void Hunter). Same architecture as the others: seeded ONCE (deterministic),
// normalized to the drawn sprite bbox (_lastDraw*) so it TRACKS across every pose incl. air combo & Ultimate,
// smooth continuous drift only (no strobe).
function seedYujiVoidField(fighter) {
  const rnd = _mulberry32(0x59C1B10D)
  const halfWidth = ny => ny < 0.28 ? 0.18 : (ny < 0.64 ? 0.28 : 0.15)   // head / torso / legs
  const dots = []
  for (let i = 0; i < 34; i++) {                // higher density than Void Hunter — scattered pale void-dust
    const ny = 0.06 + rnd() * 0.90
    const nx = 0.5 + (rnd() * 2 - 1) * halfWidth(ny)
    dots.push({ nx, ny, r: rnd() < 0.78 ? 1 : 2, a: 0.45 + rnd() * 0.5,
      driftAmp: 0.006 + rnd() * 0.016, driftFreq: 0.5 + rnd() * 1.1, phase: rnd() * Math.PI * 2 })
  }
  const violet = ["#7C4DD6", "#9B6BEB", "#6A3FB8"]   // soft VIOLET-only clusters (the signature — no red/magenta)
  const clusters = []
  for (let i = 0; i < 3; i++) {                 // 3 diffuse violet glows, torso-centred
    clusters.push({ nx: 0.32 + rnd() * 0.36, ny: 0.22 + rnd() * 0.44, r: 0.14 + rnd() * 0.10,
      color: violet[i % 3], a: 0.14 + rnd() * 0.07,
      swirlR: 0.018 + rnd() * 0.028, swirlFreq: 0.4 + rnd() * 0.6, phase: rnd() * Math.PI * 2 })
  }
  fighter._yujiVoidFX = { dots, clusters }
}
function drawYujiVoidOverlay(c, fighter) {
  if (!c || fighter?.skinId !== "yujiVoid") return
  if (!fighter._yujiVoidFX) seedYujiVoidField(fighter)
  const x = fighter._lastDrawX, y = fighter._lastDrawY, w = fighter._lastDrawW, h = fighter._lastDrawH
  if (x == null || w == null) return
  const fx = fighter._yujiVoidFX
  const t = (fighter._yujiVoidClock = (fighter._yujiVoidClock || 0) + 1)
  c.save()
  // soft violet clusters behind the dots — gentle swirl around their seed centre
  for (const n of fx.clusters) {
    const cx = x + (n.nx + n.swirlR * Math.cos(t * 0.02 * n.swirlFreq + n.phase)) * w
    const cy = y + (n.ny + n.swirlR * Math.sin(t * 0.02 * n.swirlFreq + n.phase)) * h
    const rad = n.r * Math.max(w, h)
    const g = c.createRadialGradient(cx, cy, 0, cx, cy, rad)
    g.addColorStop(0, _rgbaHex(n.color, n.a)); g.addColorStop(1, _rgbaHex(n.color, 0))
    c.fillStyle = g; c.beginPath(); c.arc(cx, cy, rad, 0, Math.PI * 2); c.fill()
  }
  // pale white dots — the dominant feature; fixed glow, slow drift, no flicker
  c.shadowColor = "#E7DCFF"; c.shadowBlur = 2; c.fillStyle = "#FBF8FF"
  for (const s of fx.dots) {
    const nx = s.nx + s.driftAmp * Math.sin(t * 0.03 * s.driftFreq + s.phase)
    const ny = s.ny + s.driftAmp * 0.6 * Math.cos(t * 0.03 * s.driftFreq + s.phase)
    c.globalAlpha = s.a
    c.fillRect(x + nx * w - s.r / 2, y + ny * h - s.r / 2, s.r, s.r)
  }
  c.restore()
}

// SUPERMAN PHANTOM ZONE — procedural SPECTRAL-ENERGY overlay (cosmetic), on top of the void-black
// sprite. Same architecture as Rick's Void Form starfield, different visual: wispy pale green-white
// (Kryptonian/Phantom-Zone) energy TENDRILS drifting loosely along the silhouette edges + a few soft
// diffuse glow points ("spectral mist"). Pattern SEEDED ONCE per skin-load (deterministic paths — no
// per-frame re-randomization) with only a SMOOTH continuous drift animating the sway (not flicker).
// Normalized to the sprite bbox → tracks the drawn position/scale across all poses incl. flight.
function seedPhantomZone(fighter) {
  const rnd = _mulberry32(0x9A2057ED)
  const bases = [0.16, 0.84, 0.30, 0.70, 0.50]   // near the silhouette edges + a couple interior
  const tendrils = []
  for (let i = 0; i < 5; i++) {
    tendrils.push({
      bx: bases[i] + (rnd() * 2 - 1) * 0.04,
      ny0: 0.04 + rnd() * 0.14, ny1: 0.70 + rnd() * 0.26,
      amp: 0.045 + rnd() * 0.055, freq: 2 + rnd() * 2.4, phase: rnd() * Math.PI * 2,
      drift: (0.010 + rnd() * 0.010) * (rnd() < 0.5 ? -1 : 1),   // slow smooth sway drift
      a: 0.16 + rnd() * 0.14,
    })
  }
  const glows = []
  for (let i = 0; i < 4; i++) {
    glows.push({ nx: 0.3 + rnd() * 0.4, ny: 0.18 + rnd() * 0.52, r: 0.14 + rnd() * 0.1, a: 0.09 + rnd() * 0.07 })
  }
  fighter._pzFX = { tendrils, glows }
}
function drawPhantomZoneOverlay(c, fighter) {
  if (!c || fighter?.skinId !== "supermanPhantomZone") return
  if (!fighter._pzFX) seedPhantomZone(fighter)
  const x = fighter._lastDrawX, y = fighter._lastDrawY, w = fighter._lastDrawW, h = fighter._lastDrawH
  if (x == null || w == null) return
  const fx = fighter._pzFX
  const t = (fighter._pzClock = (fighter._pzClock || 0) + 1)
  const GREEN = "#B8E0C4"
  c.save()
  // soft spectral glow mist first (diffuse, behind the tendrils)
  for (const g of fx.glows) {
    const cx = x + g.nx * w, cy = y + g.ny * h, rad = g.r * Math.max(w, h)
    const grad = c.createRadialGradient(cx, cy, 0, cx, cy, rad)
    grad.addColorStop(0, _rgbaHex(GREEN, g.a)); grad.addColorStop(1, _rgbaHex(GREEN, 0))
    c.fillStyle = grad; c.beginPath(); c.arc(cx, cy, rad, 0, Math.PI * 2); c.fill()
  }
  // wispy drifting energy tendrils — thin translucent lines that sway along the silhouette edges
  c.strokeStyle = GREEN; c.lineWidth = Math.max(1, w * 0.012); c.lineCap = "round"
  c.shadowColor = GREEN; c.shadowBlur = 4
  for (const td of fx.tendrils) {
    c.globalAlpha = td.a
    c.beginPath()
    const steps = 18
    for (let s = 0; s <= steps; s++) {
      const f2 = s / steps
      const ny = td.ny0 + (td.ny1 - td.ny0) * f2
      const nx = td.bx + td.amp * Math.sin(f2 * td.freq * Math.PI * 2 + td.phase + t * td.drift)
      const px = x + nx * w, py = y + ny * h
      s === 0 ? c.moveTo(px, py) : c.lineTo(px, py)
    }
    c.stroke()
  }
  c.restore()
}

// RENGOKU VOID EMBER — procedural rising-EMBER overlay (cosmetic), on top of the void-black sprite.
// Same architecture as Rick's Void Form starfield / Superman's Phantom Zone: pattern SEEDED ONCE per
// skin-load (deterministic), normalized to the sprite bbox (_lastDraw*) so it tracks the drawn position
// & scale across every pose incl. the combo chain and Ultimate. Unlike the static starfield, each ember
// SLOWLY RISES (ny decreases each frame, wrapping bottom→top) with a gentle horizontal sway + alpha
// flicker — warm orange-red glowing dots evoking a dying campfire. No baked pixels; no-op for anyone else.
function seedEmberOverlay(fighter) {
  const rnd = _mulberry32(0xE7B0A5E2)
  const halfWidth = ny => ny < 0.30 ? 0.16 : (ny < 0.66 ? 0.30 : 0.20)   // head / torso+haori / legs+hem
  const embers = []
  for (let i = 0; i < 16; i++) {               // sparse — scattered embers, not a haze
    const ny = 0.06 + rnd() * 0.9
    const nx = 0.5 + (rnd() * 2 - 1) * halfWidth(ny)
    embers.push({
      nx, ny, r: rnd() < 0.7 ? 1 : 2,
      rise: 0.0016 + rnd() * 0.0026,           // slow upward drift (fraction of bbox per frame)
      swayAmp: 0.010 + rnd() * 0.022, swayFreq: 0.6 + rnd() * 1.1, phase: rnd() * Math.PI * 2,
      a: 0.5 + rnd() * 0.4, flick: 0.4 + rnd() * 1.1,
    })
  }
  const glows = []
  for (let i = 0; i < 3; i++) {                 // a couple soft ember-glow pools low on the body (embers' source)
    glows.push({ nx: 0.32 + rnd() * 0.36, ny: 0.6 + rnd() * 0.34, r: 0.12 + rnd() * 0.1, a: 0.10 + rnd() * 0.07 })
  }
  fighter._emberFX = { embers, glows }
}
function drawEmberOverlay(c, fighter) {
  if (!c || fighter?.skinId !== "rengokuVoidEmber") return
  if (!fighter._emberFX) seedEmberOverlay(fighter)
  const x = fighter._lastDrawX, y = fighter._lastDrawY, w = fighter._lastDrawW, h = fighter._lastDrawH
  if (x == null || w == null) return
  const fx = fighter._emberFX
  const t = (fighter._emberClock = (fighter._emberClock || 0) + 1)
  const EMBER = "#E8703B"
  c.save()
  // soft ember-glow pools first (diffuse warmth low on the silhouette)
  for (const g of fx.glows) {
    const cx = x + g.nx * w, cy = y + g.ny * h, rad = g.r * Math.max(w, h)
    const grad = c.createRadialGradient(cx, cy, 0, cx, cy, rad)
    grad.addColorStop(0, _rgbaHex(EMBER, g.a)); grad.addColorStop(1, _rgbaHex(EMBER, 0))
    c.fillStyle = grad; c.beginPath(); c.arc(cx, cy, rad, 0, Math.PI * 2); c.fill()
  }
  // rising embers — warm glowing dots that drift upward and wrap; each with a soft glow + gentle flicker
  c.shadowColor = "#FFB073"; c.shadowBlur = 3; c.fillStyle = "#FFC98A"
  for (const e of fx.embers) {
    let ny = e.ny - t * e.rise
    ny = ny - Math.floor(ny)                    // wrap into [0,1): ember rises off the top, reappears low
    const nx = e.nx + e.swayAmp * Math.sin(t * 0.04 * e.swayFreq + e.phase)
    const glow = 0.6 + 0.4 * Math.sin(t * 0.08 * e.flick + e.phase)   // subtle flicker
    const fade = ny < 0.12 ? ny / 0.12 : 1      // fade out as it nears the top (dying out)
    c.globalAlpha = Math.max(0, Math.min(1, e.a * glow * fade))
    c.fillRect(x + nx * w - e.r / 2, y + ny * h - e.r / 2, e.r, e.r)
  }
  c.restore()
}

// SUKUNA VOID SOVEREIGN — procedural drifting dark-red EMBER overlay (cosmetic), on top of the void-black
// sprite. Same architecture as Rengoku's Void Ember / Rick's starfield / Maki's Void Hunter: SEEDED ONCE per
// skin-load (deterministic), normalized to the sprite bbox (_lastDraw*) so it tracks the drawn position &
// scale across EVERY pose (idle, combo chain, specials, Ultimate). Visual: small dark-crimson ember motes
// slowly drifting up + swaying with a low cursed-red glow — severe, not warm. No baked pixels; no-op for all.
function seedSukunaVoidEmber(fighter) {
  const rnd = _mulberry32(0x5A9C13F7)
  const halfWidth = ny => ny < 0.30 ? 0.15 : (ny < 0.66 ? 0.28 : 0.20)   // head / torso / legs
  const embers = []
  for (let i = 0; i < 18; i++) {
    const ny = 0.05 + rnd() * 0.92
    const nx = 0.5 + (rnd() * 2 - 1) * halfWidth(ny)
    embers.push({
      nx, ny, r: rnd() < 0.72 ? 1 : 2,
      rise: 0.0012 + rnd() * 0.0022,           // slow upward drift
      swayAmp: 0.012 + rnd() * 0.024, swayFreq: 0.5 + rnd() * 1.0, phase: rnd() * Math.PI * 2,
      a: 0.42 + rnd() * 0.40, flick: 0.4 + rnd() * 1.0,
    })
  }
  const glows = []
  for (let i = 0; i < 3; i++) {                 // low cursed-red glow pools (the embers' source)
    glows.push({ nx: 0.30 + rnd() * 0.40, ny: 0.55 + rnd() * 0.36, r: 0.13 + rnd() * 0.11, a: 0.10 + rnd() * 0.06 })
  }
  fighter._sukunaEmberFX = { embers, glows }
}
function drawSukunaVoidEmberOverlay(c, fighter) {
  if (!c || fighter?.skinId !== "sukunaVoidSovereign") return
  if (!fighter._sukunaEmberFX) seedSukunaVoidEmber(fighter)
  const x = fighter._lastDrawX, y = fighter._lastDrawY, w = fighter._lastDrawW, h = fighter._lastDrawH
  if (x == null || w == null) return
  const fx = fighter._sukunaEmberFX
  const t = (fighter._sukunaEmberClock = (fighter._sukunaEmberClock || 0) + 1)
  const DEEP = "#7A0E16"   // dark-red glow pools
  c.save()
  for (const g of fx.glows) {
    const cx = x + g.nx * w, cy = y + g.ny * h, rad = g.r * Math.max(w, h)
    const grad = c.createRadialGradient(cx, cy, 0, cx, cy, rad)
    grad.addColorStop(0, _rgbaHex(DEEP, g.a)); grad.addColorStop(1, _rgbaHex(DEEP, 0))
    c.fillStyle = grad; c.beginPath(); c.arc(cx, cy, rad, 0, Math.PI * 2); c.fill()
  }
  // drifting dark-red ember motes — cursed crimson with a soft red glow + gentle flicker
  c.shadowColor = "#C41E2A"; c.shadowBlur = 3; c.fillStyle = "#E23A44"
  for (const e of fx.embers) {
    let ny = e.ny - t * e.rise
    ny = ny - Math.floor(ny)                    // wrap: rises off the top, reappears low
    const nx = e.nx + e.swayAmp * Math.sin(t * 0.035 * e.swayFreq + e.phase)
    const glow = 0.6 + 0.4 * Math.sin(t * 0.07 * e.flick + e.phase)
    const fade = ny < 0.12 ? ny / 0.12 : 1
    c.globalAlpha = Math.max(0, Math.min(1, e.a * glow * fade))
    c.fillRect(x + nx * w - e.r / 2, y + ny * h - e.r / 2, e.r, e.r)
  }
  c.restore()
}

// TOJI VOID KILLER — procedural drifting DEEP-RED particles over the near-black void sprite (cosmetic).
// Small crimson motes rising slowly with a soft red glow, SEEDED ONCE per skin-load (deterministic) and
// normalized to the drawn sprite bbox (_lastDraw*), so they track the body across EVERY pose incl. the
// sword specials and Chain of a Thousand Miles. No baked pixels — the black form art carries no colour.
function seedTojiVoidField(fighter) {
  const rnd = _mulberry32(0x70A1CE55)
  const halfWidth = ny => ny < 0.28 ? 0.16 : (ny < 0.60 ? 0.30 : 0.22)   // head / torso / legs
  const parts = []
  for (let i = 0; i < 26; i++) {
    const ny = 0.05 + rnd() * 0.92
    const nx = 0.5 + (rnd() * 2 - 1) * halfWidth(ny)
    parts.push({
      nx, ny, r: rnd() < 0.5 ? 1 : 2,
      rise: 0.0010 + rnd() * 0.0022,           // slow upward drift
      swayAmp: 0.010 + rnd() * 0.022, swayFreq: 0.5 + rnd() * 1.1, phase: rnd() * Math.PI * 2,
      a: 0.55 + rnd() * 0.42, flick: 0.4 + rnd() * 1.1,
    })
  }
  const glows = []
  for (let i = 0; i < 3; i++)                   // deep-red pools (the particles' source)
    glows.push({ nx: 0.34 + rnd() * 0.32, ny: 0.48 + rnd() * 0.40, r: 0.13 + rnd() * 0.11, a: 0.12 + rnd() * 0.06 })
  fighter._tojiVoidFX = { parts, glows }
}
function drawTojiVoidOverlay(c, fighter) {
  if (!c || fighter?.skinId !== "tojiVoidKiller") return
  if (!fighter._tojiVoidFX) seedTojiVoidField(fighter)
  const x = fighter._lastDrawX, y = fighter._lastDrawY, w = fighter._lastDrawW, h = fighter._lastDrawH
  if (x == null || w == null) return
  const fx = fighter._tojiVoidFX
  const t = (fighter._tojiVoidClock = (fighter._tojiVoidClock || 0) + 1)
  const DEEP = "#6E0C14"
  c.save()
  for (const g of fx.glows) {
    const cx = x + g.nx * w, cy = y + g.ny * h, rad = g.r * Math.max(w, h)
    const grad = c.createRadialGradient(cx, cy, 0, cx, cy, rad)
    grad.addColorStop(0, _rgbaHex(DEEP, g.a)); grad.addColorStop(1, _rgbaHex(DEEP, 0))
    c.fillStyle = grad; c.beginPath(); c.arc(cx, cy, rad, 0, Math.PI * 2); c.fill()
  }
  c.shadowColor = "#E01E2A"; c.shadowBlur = 4; c.fillStyle = "#F0424C"   // deep-red motes with a soft crimson glow
  for (const p of fx.parts) {
    let ny = p.ny - t * p.rise
    ny = ny - Math.floor(ny)                     // wrap: rises off the top, reappears low
    const nx = p.nx + p.swayAmp * Math.sin(t * 0.035 * p.swayFreq + p.phase)
    const glow = 0.6 + 0.4 * Math.sin(t * 0.07 * p.flick + p.phase)
    const fade = ny < 0.12 ? ny / 0.12 : 1
    c.globalAlpha = Math.max(0, Math.min(1, p.a * glow * fade))
    c.fillRect(x + nx * w - p.r / 2, y + ny * h - p.r / 2, p.r, p.r)
  }
  c.restore()
}

// ZARAKI VOID SOVEREIGN — procedural crackling RED-BLACK spiritual-pressure (reiatsu) overlay (cosmetic),
// on top of the void-black sprite. Zaraki's monstrous reiatsu, NOT generic stars: harsh fast-flickering
// crimson sparks that jitter in place (electric crackle) over deep-red pressure pools, plus a few brighter
// slow-pulsing "bell" glints (the Kenpachi/Yachiru bell motif). SEEDED ONCE per skin-load (deterministic),
// normalized to the sprite bbox (_lastDraw*) so it tracks the drawn position/scale across EVERY pose incl.
// specials & the Shikai form swap. No baked pixels — the black form art carries no colour, the overlay does.
function seedZarakiVoidField(fighter) {
  const rnd = _mulberry32(0x2B7C4E9F)
  const halfWidth = ny => ny < 0.26 ? 0.18 : (ny < 0.66 ? 0.30 : 0.17)   // head / torso / legs
  const sparks = []
  for (let i = 0; i < 30; i++) {
    const ny = 0.05 + rnd() * 0.92
    const nx = 0.5 + (rnd() * 2 - 1) * halfWidth(ny)
    sparks.push({ nx, ny, r: rnd() < 0.66 ? 1 : 2,
      jitAmp: 0.006 + rnd() * 0.012, jitFreq: 1.2 + rnd() * 2.2, phase: rnd() * Math.PI * 2,
      a: 0.45 + rnd() * 0.5, flick: 1.4 + rnd() * 2.4 })   // fast, harsh crackle
  }
  const glows = []
  for (let i = 0; i < 3; i++)                    // deep-red reiatsu pools (the pressure's core)
    glows.push({ nx: 0.30 + rnd() * 0.40, ny: 0.42 + rnd() * 0.44, r: 0.14 + rnd() * 0.12, a: 0.11 + rnd() * 0.07 })
  const bells = []
  for (let i = 0; i < 3; i++)                    // brighter, slower-pulsing warm "bell" glints
    bells.push({ nx: 0.5 + (rnd() * 2 - 1) * 0.22, ny: 0.10 + rnd() * 0.70, pulse: 0.5 + rnd() * 0.8, phase: rnd() * Math.PI * 2 })
  fighter._zarakiVoidFX = { sparks, glows, bells }
}
function drawZarakiVoidOverlay(c, fighter) {
  if (!c || fighter?.skinId !== "zarakiVoidSovereign") return
  if (!fighter._zarakiVoidFX) seedZarakiVoidField(fighter)
  const x = fighter._lastDrawX, y = fighter._lastDrawY, w = fighter._lastDrawW, h = fighter._lastDrawH
  if (x == null || w == null) return
  const fx = fighter._zarakiVoidFX
  const t = (fighter._zarakiVoidClock = (fighter._zarakiVoidClock || 0) + 1)
  const DEEP = "#7C0F14"
  c.save()
  for (const g of fx.glows) {                    // deep-red reiatsu pools (behind the sparks)
    const cx = x + g.nx * w, cy = y + g.ny * h, rad = g.r * Math.max(w, h)
    const grad = c.createRadialGradient(cx, cy, 0, cx, cy, rad)
    grad.addColorStop(0, _rgbaHex(DEEP, g.a)); grad.addColorStop(1, _rgbaHex(DEEP, 0))
    c.fillStyle = grad; c.beginPath(); c.arc(cx, cy, rad, 0, Math.PI * 2); c.fill()
  }
  // crackling crimson sparks — jitter in place + a sharp on/off flicker (many blink to ~0 = electric crackle)
  c.shadowColor = "#D01E2A"; c.shadowBlur = 3; c.fillStyle = "#F5434E"
  for (const s of fx.sparks) {
    const nx = s.nx + s.jitAmp * Math.sin(t * 0.09 * s.jitFreq + s.phase)
    const ny = s.ny + s.jitAmp * 0.7 * Math.cos(t * 0.11 * s.jitFreq + s.phase)
    const cr = Math.sin(t * 0.14 * s.flick + s.phase)
    const glow = Math.max(0, cr) ** 1.6          // sharp crackle (not smooth pulse)
    c.globalAlpha = Math.max(0, Math.min(1, s.a * glow))
    c.fillRect(x + nx * w - s.r / 2, y + ny * h - s.r / 2, s.r, s.r)
  }
  // "bell" glints — a few brighter, slower warm sparks (Kenpachi/Yachiru bells)
  c.shadowColor = "#FF9A2E"; c.shadowBlur = 4; c.fillStyle = "#FFC24D"
  for (const b of fx.bells) {
    c.globalAlpha = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(t * 0.05 * b.pulse + b.phase))
    c.fillRect(x + b.nx * w - 1, y + b.ny * h - 1, 2, 2)
  }
  c.restore()
}

// HASHIRAMA exact-spec GLOW overlays — the "glowing eyes" / green Void aura the recolor tooling can't paint
// (eyes aren't an isolable region on the posterized sheets; glow needs a draw pass). One function handles
// all four glow skins by skinId, normalized to the drawn bbox (_lastDraw*) so it tracks pose/scale/facing:
//   goldensage → amber-gold eyes · ashenreanim → white-blue eyes · whitebinding → green eyes ·
//   voidgreen → green swirling Wood-Release aura + bright green eyes (the 2nd, green Void).
function seedHashiramaVoidGreenField(fighter) {
  const rnd = _mulberry32(0x4A17C0DE)                       // fixed seed → identical swirl every load
  const sparks = []
  for (let i = 0; i < 30; i++)                              // drifting/orbiting green motes over the silhouette
    sparks.push({ nx: 0.5 + (rnd() - 0.5) * 0.8, ny: 0.12 + rnd() * 0.78, r: 1 + rnd() * 2,
      a: 0.30 + rnd() * 0.5, orbR: 0.02 + rnd() * 0.05, orbSpd: 0.4 + rnd() * 1.1,
      flick: 0.5 + rnd() * 1.2, phase: rnd() * Math.PI * 2 })
  const glows = []
  for (let i = 0; i < 4; i++)                               // soft green aura pools (behind the motes)
    glows.push({ nx: 0.3 + rnd() * 0.4, ny: 0.22 + rnd() * 0.5, r: 0.16 + rnd() * 0.14, a: 0.08 + rnd() * 0.10 })
  fighter._hashiVoidFX = { sparks, glows }
}
function drawHashiramaSpecOverlay(c, fighter) {
  if (!c || !fighter) return
  const EYE = { hashiramaGoldensage: "#FFC533", hashiramaAshenreanim: "#BFE3FF", hashiramaWhitebinding: "#7CFF8E", hashiramaVoidgreen: "#39FF6A" }
  const col = EYE[fighter.skinId]
  if (!col) return
  const x = fighter._lastDrawX, y = fighter._lastDrawY, w = fighter._lastDrawW, h = fighter._lastDrawH
  if (x == null || w == null) return
  const t = (fighter._hashiSpecClock = (fighter._hashiSpecClock || 0) + 1)
  c.save()
  // VOID (green): swirling Wood-Release aura BEHIND the eyes — green pools + orbiting motes
  if (fighter.skinId === "hashiramaVoidgreen") {
    if (!fighter._hashiVoidFX) seedHashiramaVoidGreenField(fighter)
    const fx = fighter._hashiVoidFX
    for (const g of fx.glows) {
      const cx = x + g.nx * w, cy = y + g.ny * h, rad = g.r * Math.max(w, h)
      const grad = c.createRadialGradient(cx, cy, 0, cx, cy, rad)
      grad.addColorStop(0, _rgbaHex("#1F8A3A", g.a)); grad.addColorStop(1, _rgbaHex("#1F8A3A", 0))
      c.fillStyle = grad; c.beginPath(); c.arc(cx, cy, rad, 0, Math.PI * 2); c.fill()
    }
    c.shadowColor = "#39FF6A"; c.shadowBlur = 5; c.fillStyle = "#9CFFB4"
    for (const s of fx.sparks) {
      const nx = s.nx + s.orbR * Math.cos(t * 0.05 * s.orbSpd + s.phase)
      const ny = s.ny + s.orbR * Math.sin(t * 0.05 * s.orbSpd + s.phase)
      c.globalAlpha = Math.max(0, Math.min(1, s.a * (0.6 + 0.4 * Math.sin(t * 0.13 * s.flick + s.phase))))
      const r = s.r + 1
      c.fillRect(x + nx * w - r / 2, y + ny * h - r / 2, r, r)
    }
    c.globalAlpha = 1; c.shadowBlur = 0
  }
  // GLOWING EYES (all four) — two soft blooms + bright core at the head, leaning slightly by facing.
  // Void/Golden Sage glow harder (prominent per spec); Ashen/White Binding are the "faint" ones.
  const face = fighter.facing || 1
  const strong = fighter.skinId === "hashiramaVoidgreen" || fighter.skinId === "hashiramaGoldensage"
  const flick = (strong ? 0.8 : 0.62) + (strong ? 0.2 : 0.28) * Math.sin(t * 0.17)
  const rad = Math.max(4, w * (strong ? 0.12 : 0.09))
  c.shadowColor = col; c.shadowBlur = strong ? 6 : 3
  for (const dx of [-0.072, 0.072]) {
    const cx = x + (0.5 + face * 0.015 + dx) * w, cy = y + 0.165 * h
    const grad = c.createRadialGradient(cx, cy, 0, cx, cy, rad)
    grad.addColorStop(0, _rgbaHex(col, 0.95 * flick)); grad.addColorStop(0.5, _rgbaHex(col, 0.45 * flick)); grad.addColorStop(1, _rgbaHex(col, 0))
    c.fillStyle = grad; c.beginPath(); c.arc(cx, cy, rad, 0, Math.PI * 2); c.fill()
    c.globalAlpha = Math.min(1, flick + 0.1); c.fillStyle = "#FFFFFF"; c.fillRect(cx - 1, cy - 1.5, 2, 3)   // hot white core
    c.globalAlpha = 1
  }
  c.shadowBlur = 0
  c.restore()
}

// HASHIRAMA motif overlay — the gold Senju-clan SPIRAL (#4) + gold TRIM accents (#6) that the sprite has
// no isolable region for. A STAMPED procedural emblem on the torso (normalized to the bbox so it tracks
// pose/scale/facing) — not true per-frame art, so it reads as a clan decal rather than woven trim.
function drawHashiramaMotifOverlay(c, fighter) {
  if (!c || !fighter) return
  const id = fighter.skinId
  if (id !== "hashiramaSenjuspiral" && id !== "hashiramaGoldensage") return
  const x = fighter._lastDrawX, y = fighter._lastDrawY, w = fighter._lastDrawW, h = fighter._lastDrawH
  if (x == null || w == null) return
  const t = (fighter._hashiMotifClock = (fighter._hashiMotifClock || 0) + 1)
  const face = fighter.facing || 1
  const GOLD = "#E7B93E"
  c.save()
  c.shadowColor = "#7A5210"; c.shadowBlur = 2
  if (id === "hashiramaSenjuspiral") {
    // gold Uzumaki/Senju spiral crest on the chest — a real spiral path, slow shimmer
    const cx = x + (0.5 + face * 0.02) * w, cy = y + 0.40 * h
    const maxR = Math.max(4, w * 0.085), spin = 0.12 * Math.sin(t * 0.03)
    c.strokeStyle = GOLD; c.lineWidth = Math.max(1.4, w * 0.018); c.lineCap = "round"
    c.beginPath()
    const turns = 2.3, steps = 54
    for (let i = 0; i <= steps; i++) {
      const a = face * (i / steps * turns * Math.PI * 2) + spin, rr = maxR * (i / steps)
      const pxp = cx + Math.cos(a) * rr, pyp = cy + Math.sin(a) * rr
      i ? c.lineTo(pxp, pyp) : c.moveTo(pxp, pyp)
    }
    c.globalAlpha = 0.78 + 0.14 * Math.sin(t * 0.06); c.stroke(); c.globalAlpha = 1
  } else {
    // Golden Sage — gold trim ticks along the collar + shoulders (accent only, keeps the red/black base)
    c.fillStyle = GOLD; c.globalAlpha = 0.82
    for (const [nx, ny, wf] of [[0.5, 0.30, 0.06], [0.38, 0.34, 0.04], [0.62, 0.34, 0.04]]) {
      const cx = x + nx * w, cy = y + ny * h, bw = Math.max(2, w * wf)
      c.fillRect(cx - bw / 2, cy - 1, bw, 2)
    }
    c.globalAlpha = 1
  }
  c.restore()
}

// EDO TENSEI reanimation — procedural "reanimated corpse" overlay drawn ON TOP of the vessel's base art
// (which is already washed sickly green-gray by EDO_REANIM_TINT).
// Two decayed-flesh cues, NOT generic sparks: (1) soft dark-green DECAY MOTTLING that breathes slowly, and
// (2) dark STITCHED SEAMS — short cracks with perpendicular stitch-ticks, evoking the summon's patched-together
// corpse. Seeded ONCE per fighter (deterministic), normalized to the sprite bbox (_lastDraw*) so it tracks the
// drawn pose/scale across every animation. No baked pixels — works on ANY vessel.
function seedEdoReanimField(fighter) {
  const rnd = _mulberry32(0x5D0A17C3)
  const seams = []
  for (let i = 0; i < 7; i++) {                              // near-vertical stitched seams over torso/limbs
    seams.push({
      x0: 0.28 + rnd() * 0.44, y0: 0.14 + rnd() * 0.56,
      ang: -0.55 + rnd() * 1.10,                             // lean off-vertical (radians)
      len: 0.15 + rnd() * 0.18,
      ticks: 4 + Math.floor(rnd() * 4),
      a: 0.62 + rnd() * 0.22, phase: rnd() * Math.PI * 2, pulse: 0.5 + rnd() * 0.7,
    })
  }
  const mottle = []
  for (let i = 0; i < 6; i++)                                // decayed blotches — soft dark-green pools
    mottle.push({ nx: 0.24 + rnd() * 0.52, ny: 0.14 + rnd() * 0.66, r: 0.07 + rnd() * 0.09,
      a: 0.12 + rnd() * 0.12, pulse: 0.35 + rnd() * 0.75, phase: rnd() * Math.PI * 2 })
  fighter._edoReanimFX = { seams, mottle }
}
function drawEdoReanimOverlay(c, fighter) {
  if (!c || !fighter?._edoActive) return
  if (!fighter._edoReanimFX) seedEdoReanimField(fighter)
  const x = fighter._lastDrawX, y = fighter._lastDrawY, w = fighter._lastDrawW, h = fighter._lastDrawH
  if (x == null || w == null) return
  const fx = fighter._edoReanimFX
  const t = (fighter._edoReanimClock = (fighter._edoReanimClock || 0) + 1)
  c.save()
  // (1) decay mottling — soft dark-green blotches breathing slowly (rot spreading across the corpse)
  const MOTTLE = "#2F3E29"
  for (const m of fx.mottle) {
    const cx = x + m.nx * w, cy = y + m.ny * h, rad = m.r * Math.max(w, h)
    const a = m.a * (0.68 + 0.32 * Math.sin(t * 0.018 * m.pulse + m.phase))
    const grad = c.createRadialGradient(cx, cy, 0, cx, cy, rad)
    grad.addColorStop(0, _rgbaHex(MOTTLE, a)); grad.addColorStop(1, _rgbaHex(MOTTLE, 0))
    c.fillStyle = grad; c.beginPath(); c.arc(cx, cy, rad, 0, Math.PI * 2); c.fill()
  }
  // (2) stitched seams — dark sutures with pronounced perpendicular stitch-ticks + a pale thread glint,
  // so the patched-together reanimated flesh reads clearly (not just a faint crack).
  const SEAM = "#141A12"          // dark suture line
  const THREAD = "#C9D6BC"        // pale sickly-green thread highlight on the ticks
  const scale = Math.max(w, h)
  c.lineCap = "round"
  for (const s of fx.seams) {
    const a = s.a * (0.8 + 0.2 * Math.sin(t * 0.03 * s.pulse + s.phase))
    const sx = Math.sin(s.ang), sy = Math.cos(s.ang)         // near-vertical seam direction
    const ax = x + s.x0 * w, ay = y + s.y0 * h
    const dx = sx * s.len * w * 0.6, dy = sy * s.len * h     // body is taller than wide → seam runs mostly down
    const bx = ax + dx, by = ay + dy
    // the wound line down the seam
    c.strokeStyle = _rgbaHex(SEAM, a); c.lineWidth = 2.2
    c.beginPath(); c.moveTo(ax, ay); c.lineTo(bx, by); c.stroke()
    // perpendicular stitch-ticks — crossing the seam, dark suture with a pale thread core
    const px = -sy, py = sx
    const tick = 0.038 * scale
    for (let k = 1; k <= s.ticks; k++) {
      const f = k / (s.ticks + 1)
      const mx = ax + dx * f, my = ay + dy * f
      const x1 = mx - px * tick, y1 = my - py * tick, x2 = mx + px * tick, y2 = my + py * tick
      c.strokeStyle = _rgbaHex(SEAM, a); c.lineWidth = 2.4
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke()
      c.strokeStyle = _rgbaHex(THREAD, a * 0.7); c.lineWidth = 1
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke()
    }
  }
  c.restore()
}

// NEZUKO VOID SOVEREIGN — procedural drifting CRIMSON-PINK ember overlay (cosmetic), on top of the void-black
// sprite. Thematically her fire-based Blood Demon Art (Exploding Blood) — pink-crimson flame motes, NOT generic
// stars. Same architecture as Rengoku/Sukuna void embers: SEEDED ONCE per skin-load (deterministic), normalized
// to the sprite bbox (_lastDraw*) so it tracks the drawn position & scale across EVERY pose. No baked pixels.
function seedNezukoVoidEmber(fighter) {
  const rnd = _mulberry32(0x2ECAF17E)
  const halfWidth = ny => ny < 0.30 ? 0.15 : (ny < 0.66 ? 0.30 : 0.22)   // head / torso+haori / kimono+legs
  const embers = []
  for (let i = 0; i < 17; i++) {
    const ny = 0.05 + rnd() * 0.92
    const nx = 0.5 + (rnd() * 2 - 1) * halfWidth(ny)
    embers.push({
      nx, ny, r: rnd() < 0.72 ? 1 : 2,
      rise: 0.0014 + rnd() * 0.0024,           // slow upward drift (fraction of bbox per frame)
      swayAmp: 0.011 + rnd() * 0.023, swayFreq: 0.6 + rnd() * 1.1, phase: rnd() * Math.PI * 2,
      a: 0.46 + rnd() * 0.42, flick: 0.4 + rnd() * 1.1,
    })
  }
  const glows = []
  for (let i = 0; i < 3; i++) {                 // low crimson-pink glow pools (the embers' source)
    glows.push({ nx: 0.30 + rnd() * 0.40, ny: 0.55 + rnd() * 0.36, r: 0.12 + rnd() * 0.11, a: 0.10 + rnd() * 0.07 })
  }
  fighter._nezukoEmberFX = { embers, glows }
}
function drawNezukoVoidEmberOverlay(c, fighter) {
  if (!c || fighter?.skinId !== "nezukoVoidSovereign") return
  if (!fighter._nezukoEmberFX) seedNezukoVoidEmber(fighter)
  const x = fighter._lastDrawX, y = fighter._lastDrawY, w = fighter._lastDrawW, h = fighter._lastDrawH
  if (x == null || w == null) return
  const fx = fighter._nezukoEmberFX
  const t = (fighter._nezukoEmberClock = (fighter._nezukoEmberClock || 0) + 1)
  const EMBER = "#FF3D6E"   // crimson-pink Blood Demon Art flame
  c.save()
  for (const g of fx.glows) {                   // soft crimson-pink glow pools low on the silhouette
    const cx = x + g.nx * w, cy = y + g.ny * h, rad = g.r * Math.max(w, h)
    const grad = c.createRadialGradient(cx, cy, 0, cx, cy, rad)
    grad.addColorStop(0, _rgbaHex(EMBER, g.a)); grad.addColorStop(1, _rgbaHex(EMBER, 0))
    c.fillStyle = grad; c.beginPath(); c.arc(cx, cy, rad, 0, Math.PI * 2); c.fill()
  }
  c.shadowColor = "#FF6E9A"; c.shadowBlur = 3; c.fillStyle = "#FFB0C8"   // bright pink core + soft glow
  for (const e of fx.embers) {
    let ny = e.ny - t * e.rise; ny = ny - Math.floor(ny)   // rise + wrap
    const nx = e.nx + e.swayAmp * Math.sin(t * 0.04 * e.swayFreq + e.phase)
    const glow = 0.6 + 0.4 * Math.sin(t * 0.08 * e.flick + e.phase)     // flicker
    const fade = ny < 0.12 ? ny / 0.12 : 1                              // die out near the top
    c.globalAlpha = Math.max(0, Math.min(1, e.a * glow * fade))
    c.fillRect(x + nx * w - e.r / 2, y + ny * h - e.r / 2, e.r, e.r)
  }
  c.restore()
}

// INOSUKE VOID BOAR — procedural drifting white "TUSK-SHARD" overlay (cosmetic), on top of the void-black
// sprite. Same architecture as the other Void overlays (Sukuna ember / Minato spark / Gojo Infinity):
// SEEDED ONCE per skin-load (deterministic _mulberry32), normalized to the sprite bbox (_lastDraw*) so it
// TRACKS the drawn position & scale across EVERY pose (idle, flurry chain, cinematic-special swings).
// DISTINCT from every prior Void effect (dots / embers / swirls / sparks / rings / starfield / nebulae):
// sparse JAGGED white tusk/fang SHARDS (thin triangles that slowly drift, rotate & twinkle) + occasional
// triple "claw-mark" scratch strokes — tying the overlay to Inosuke's feral/beast identity. Drawn on top;
// the void-flatten already darkened his blue slash FX, so the white shards read cleanly over attack frames.
function seedVoidBoarField(fighter) {
  const rnd = _mulberry32(0x1B0A5E77)
  const halfWidth = ny => ny < 0.30 ? 0.16 : (ny < 0.66 ? 0.30 : 0.22)   // head / torso / legs silhouette
  const shards = []
  for (let i = 0; i < 15; i++) {
    const ny = 0.06 + rnd() * 0.90
    const nx = 0.5 + (rnd() * 2 - 1) * halfWidth(ny)
    shards.push({
      nx, ny,
      len: 0.05 + rnd() * 0.075,               // fang length (fraction of max(w,h))
      wid: 0.010 + rnd() * 0.014,              // fang base half-width
      ang: rnd() * Math.PI * 2,                // orientation
      spin: (rnd() * 2 - 1) * 0.010,           // slow rotation
      drift: 0.0009 + rnd() * 0.0018,          // slow upward drift
      swayAmp: 0.010 + rnd() * 0.020, swayFreq: 0.5 + rnd() * 1.0, phase: rnd() * Math.PI * 2,
      a: 0.42 + rnd() * 0.42, twk: 0.5 + rnd() * 1.1,
    })
  }
  const claws = []
  for (let i = 0; i < 3; i++) {                 // triple claw-mark scratch anchors (fade in/out on a cycle)
    claws.push({ nx: 0.28 + rnd() * 0.44, ny: 0.30 + rnd() * 0.44, len: 0.13 + rnd() * 0.10,
                 ang: -0.9 + rnd() * 0.5, gap: 0.03 + rnd() * 0.02, phase: rnd() * Math.PI * 2, freq: 0.6 + rnd() * 0.6 })
  }
  fighter._voidBoarFX = { shards, claws }
}
function drawVoidBoarOverlay(c, fighter) {
  if (!c || fighter?.skinId !== "inosukeVoidBoar") return
  if (!fighter._voidBoarFX) seedVoidBoarField(fighter)
  const x = fighter._lastDrawX, y = fighter._lastDrawY, w = fighter._lastDrawW, h = fighter._lastDrawH
  if (x == null || w == null) return
  const fx = fighter._voidBoarFX
  const t = (fighter._voidBoarClock = (fighter._voidBoarClock || 0) + 1)
  const S = Math.max(w, h)
  const WHITE = "#EEF1F6"
  c.save()
  c.shadowColor = "#BFE8FF"; c.shadowBlur = 3; c.fillStyle = WHITE
  // drifting jagged tusk-shards (thin white fangs)
  for (const s of fx.shards) {
    let ny = s.ny - t * s.drift
    ny = ny - Math.floor(ny)                    // wrap: drifts off the top, reappears low
    const nx = s.nx + s.swayAmp * Math.sin(t * 0.03 * s.swayFreq + s.phase)
    const fade = ny < 0.12 ? ny / 0.12 : 1
    const twk = 0.6 + 0.4 * Math.sin(t * 0.06 * s.twk + s.phase)
    c.globalAlpha = Math.max(0, Math.min(1, s.a * twk * fade))
    const cx = x + nx * w, cy = y + ny * h
    const ang = s.ang + t * s.spin
    const len = s.len * S, wid = s.wid * S
    const tx = cx + Math.cos(ang) * len, ty = cy + Math.sin(ang) * len
    const px = Math.cos(ang + Math.PI / 2), py = Math.sin(ang + Math.PI / 2)
    c.beginPath(); c.moveTo(tx, ty); c.lineTo(cx + px * wid, cy + py * wid); c.lineTo(cx - px * wid, cy - py * wid); c.closePath(); c.fill()
  }
  // occasional triple "claw-mark" scratch strokes (fade in and out on a slow cycle)
  c.shadowBlur = 2; c.strokeStyle = WHITE; c.lineCap = "round"
  for (const k of fx.claws) {
    const pulse = Math.sin(t * 0.02 * k.freq + k.phase)
    if (pulse <= 0) continue
    c.globalAlpha = Math.max(0, Math.min(1, pulse * 0.6))
    c.lineWidth = Math.max(1, 0.006 * S)
    const dx = Math.cos(k.ang), dy = Math.sin(k.ang)
    const gx = Math.cos(k.ang + Math.PI / 2) * k.gap * S, gy = Math.sin(k.ang + Math.PI / 2) * k.gap * S
    const len = k.len * S
    for (let m = -1; m <= 1; m++) {
      const bx = x + k.nx * w + gx * m, by = y + k.ny * h + gy * m
      c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + dx * len, by + dy * len); c.stroke()
    }
  }
  c.restore()
}

// MINATO VOID FLASH — procedural drifting golden-yellow SPARK overlay (cosmetic), on top of the void-black
// sprite. Same architecture as Rengoku's Void Ember / Sukuna's / Maki's Void Hunter: SEEDED ONCE per
// skin-load (deterministic), normalized to the sprite bbox (_lastDraw*) so it tracks the drawn position &
// scale across EVERY pose (idle, combo chain, specials, Ultimate). Visual ties to Flying Raijin / lightning-
// fast identity: small bright golden sparks that TWINKLE fast (electric flicker, some blinking near-off then
// bright) with a light upward-and-outward drift + a few brief bright flash-pulses. No baked pixels; no-op for all.
function seedVoidFlashOverlay(fighter) {
  const rnd = _mulberry32(0x4A1B0FE7)
  const halfWidth = ny => ny < 0.30 ? 0.16 : (ny < 0.66 ? 0.30 : 0.22)   // head / torso+haori / legs+hem
  const sparks = []
  for (let i = 0; i < 24; i++) {               // sparse bright motes, not a haze
    const ny = 0.05 + rnd() * 0.92
    const nx = 0.5 + (rnd() * 2 - 1) * halfWidth(ny)
    sparks.push({
      nx, ny, r: rnd() < 0.55 ? 1 : 2,
      rise: 0.0016 + rnd() * 0.0030,           // light upward drift (fraction of bbox per frame)
      swayAmp: 0.014 + rnd() * 0.028, swayFreq: 0.9 + rnd() * 1.6, phase: rnd() * Math.PI * 2,
      a: 0.6 + rnd() * 0.4,
      twinkle: 2.2 + rnd() * 3.4,              // FAST twinkle rate — electric, unlike the slow ember flicker
      duty: 0.5 + rnd() * 0.4,                 // fraction of the cycle the spark is visibly lit (blinks off between)
    })
  }
  const glows = []
  for (let i = 0; i < 3; i++) {                 // faint gold glow pools (the sparks' source)
    glows.push({ nx: 0.30 + rnd() * 0.40, ny: 0.4 + rnd() * 0.5, r: 0.12 + rnd() * 0.11, a: 0.08 + rnd() * 0.06 })
  }
  fighter._voidFlashFX = { sparks, glows }
}
function drawVoidFlashOverlay(c, fighter) {
  if (!c || fighter?.skinId !== "minatoVoidFlash") return
  if (!fighter._voidFlashFX) seedVoidFlashOverlay(fighter)
  const x = fighter._lastDrawX, y = fighter._lastDrawY, w = fighter._lastDrawW, h = fighter._lastDrawH
  if (x == null || w == null) return
  const fx = fighter._voidFlashFX
  const t = (fighter._voidFlashClock = (fighter._voidFlashClock || 0) + 1)
  const GOLD = "#FFD11A"
  c.save()
  // faint gold glow pools (diffuse warmth under the sparks)
  for (const g of fx.glows) {
    const cx = x + g.nx * w, cy = y + g.ny * h, rad = g.r * Math.max(w, h)
    const grad = c.createRadialGradient(cx, cy, 0, cx, cy, rad)
    grad.addColorStop(0, _rgbaHex(GOLD, g.a)); grad.addColorStop(1, _rgbaHex(GOLD, 0))
    c.fillStyle = grad; c.beginPath(); c.arc(cx, cy, rad, 0, Math.PI * 2); c.fill()
  }
  // drifting golden sparks — bright gold with a fast electric TWINKLE (blink off→bright) + light drift
  c.shadowColor = "#FFE96B"; c.shadowBlur = 5; c.fillStyle = "#FFF3B0"
  for (const s of fx.sparks) {
    let ny = s.ny - t * s.rise
    ny = ny - Math.floor(ny)                    // wrap: drifts off the top, reappears low
    const nx = s.nx + s.swayAmp * Math.sin(t * 0.05 * s.swayFreq + s.phase)
    // fast twinkle: a raised sine gated by `duty` → each spark blinks bright then near-off (electric flicker)
    const cyc = 0.5 + 0.5 * Math.sin(t * 0.06 * s.twinkle + s.phase)
    const lit = cyc > (1 - s.duty) ? (cyc - (1 - s.duty)) / s.duty : 0
    const fade = ny < 0.12 ? ny / 0.12 : 1      // fade in as it re-enters low
    c.globalAlpha = Math.max(0, Math.min(1, s.a * lit * fade))
    c.fillRect(x + nx * w - s.r / 2, y + ny * h - s.r / 2, s.r, s.r)
  }
  c.restore()
}

// RICK PORTAL VOID — procedural SWIRL overlay (cosmetic), on top of the void-black sprite. Same
// architecture as the other overlay skins (Rick Void Form starfield / Superman Phantom Zone tendrils /
// Rengoku Void Ember): pattern SEEDED ONCE per skin-load (deterministic), normalized to the sprite bbox
// (_lastDraw*) so it tracks the drawn position & scale across every pose. Visual: vivid portal-green
// curling SPIRAL wisps tracing loosely around the silhouette — a few larger diffuse swirl clusters at
// asymmetric anchors (shoulder / hand / feet) + finer thin trailing wisps. Only a SMOOTH continuous
// rotation drift animates (no per-frame re-randomization → no flicker). No baked pixels; no-op otherwise.
function seedPortalVoid(fighter) {
  const rnd = _mulberry32(0x9017A1ED)
  const halfWidth = ny => ny < 0.28 ? 0.18 : (ny < 0.66 ? 0.30 : 0.16)   // head / torso+coat / legs
  // 3 larger, diffuse swirl clusters at ASYMMETRIC anchors (shoulder, one hand, near the feet)
  const clusters = [
    { nx: 0.68, ny: 0.24, r: 0.17 + rnd() * 0.05, turns: 2.1 + rnd() * 0.5, phase: rnd() * Math.PI * 2, drift: 0.014 + rnd() * 0.008, a: 0.20 + rnd() * 0.08, lw: 0.022, glow: 0.12 },
    { nx: 0.15, ny: 0.52, r: 0.15 + rnd() * 0.05, turns: 1.9 + rnd() * 0.5, phase: rnd() * Math.PI * 2, drift: -(0.012 + rnd() * 0.008), a: 0.18 + rnd() * 0.08, lw: 0.020, glow: 0.11 },
    { nx: 0.52, ny: 0.90, r: 0.16 + rnd() * 0.05, turns: 2.3 + rnd() * 0.5, phase: rnd() * Math.PI * 2, drift: 0.011 + rnd() * 0.008, a: 0.17 + rnd() * 0.07, lw: 0.021, glow: 0.10 },
  ]
  // finer thin trailing wisps scattered near the silhouette edges
  const wisps = []
  for (let i = 0; i < 7; i++) {
    const ny = 0.10 + rnd() * 0.80
    const nx = 0.5 + (rnd() * 2 - 1) * halfWidth(ny)
    wisps.push({
      nx, ny, r: 0.06 + rnd() * 0.06, turns: 1.2 + rnd() * 0.7, phase: rnd() * Math.PI * 2,
      drift: (0.016 + rnd() * 0.014) * (rnd() < 0.5 ? -1 : 1), a: 0.30 + rnd() * 0.14, lw: 0.012,
    })
  }
  fighter._portalFX = { clusters, wisps }
}
function _strokeSwirl(c, cx, cy, radPx, s, t) {
  // an outward-growing spiral arc (portal-edge curl), stroked over N steps
  const steps = 26
  c.globalAlpha = s.a
  c.lineWidth = Math.max(1, radPx * s.lw * 6)
  c.beginPath()
  for (let k = 0; k <= steps; k++) {
    const f = k / steps
    const ang = s.phase + f * s.turns * Math.PI * 2 + t * s.drift
    const rr = radPx * (0.15 + 0.85 * f)
    const px = cx + Math.cos(ang) * rr, py = cy + Math.sin(ang) * rr
    k === 0 ? c.moveTo(px, py) : c.lineTo(px, py)
  }
  c.stroke()
}
function drawPortalVoidOverlay(c, fighter) {
  if (!c || fighter?.skinId !== "rickPortalVoid") return
  if (!fighter._portalFX) seedPortalVoid(fighter)
  const x = fighter._lastDrawX, y = fighter._lastDrawY, w = fighter._lastDrawW, h = fighter._lastDrawH
  if (x == null || w == null) return
  const fx = fighter._portalFX
  const t = (fighter._portalClock = (fighter._portalClock || 0) + 1)
  const GREEN = "#3FE855"
  const M = Math.max(w, h)
  c.save()
  c.lineCap = "round"; c.lineJoin = "round"; c.strokeStyle = GREEN
  c.shadowColor = "#8FF5A0"
  // larger diffuse clusters first (behind) — a soft radial glow pool + a wider, softer swirl
  for (const s of fx.clusters) {
    const cx = x + s.nx * w, cy = y + s.ny * h, radPx = s.r * M
    const grad = c.createRadialGradient(cx, cy, 0, cx, cy, radPx)
    grad.addColorStop(0, _rgbaHex(GREEN, s.glow)); grad.addColorStop(1, _rgbaHex(GREEN, 0))
    c.fillStyle = grad; c.beginPath(); c.arc(cx, cy, radPx, 0, Math.PI * 2); c.fill()
    c.shadowBlur = 6
    _strokeSwirl(c, cx, cy, radPx, s, t)
  }
  // finer trailing wisps on top
  c.shadowBlur = 4
  for (const s of fx.wisps) {
    const cx = x + s.nx * w, cy = y + s.ny * h
    _strokeSwirl(c, cx, cy, s.r * M, s, t)
  }
  c.restore()
}

// GOJO INFINITY VOID — procedural blue-white overlay (cosmetic), on top of the full-near-black void sprite.
// Same architecture as the other overlay skins (seeded ONCE per skin-load, normalized to the sprite bbox
// _lastDraw* so it tracks every pose incl. specials & Ultimate). Built to reflect GOJO SPECIFICALLY — not a
// reuse of another char's void: (a) small cool blue-white particles that drift SLOWLY and calmly (space
// "slowed to infinity" near him, Limitless), plus (b) occasional larger soft BARRIER-RING pulses — concentric
// rings that expand outward from anchor points and fade, evoking his Infinity/Limitless barrier rather than
// plain drifting stars. No baked pixels; no-op for everyone else.
function seedGojoInfinityVoid(fighter) {
  const rnd = _mulberry32(0x605A7011)
  const halfWidth = ny => ny < 0.30 ? 0.16 : (ny < 0.66 ? 0.28 : 0.20)   // head / torso / legs
  const motes = []
  for (let i = 0; i < 22; i++) {                // sparse cool blue-white dust
    const ny = 0.05 + rnd() * 0.92
    const nx = 0.5 + (rnd() * 2 - 1) * halfWidth(ny)
    motes.push({
      nx, ny, r: rnd() < 0.66 ? 1 : 2,
      rise: 0.0006 + rnd() * 0.0014,            // SLOW drift — near-frozen (Limitless slows approach to zero)
      swayAmp: 0.010 + rnd() * 0.020, swayFreq: 0.4 + rnd() * 0.8, phase: rnd() * Math.PI * 2,
      a: 0.40 + rnd() * 0.40, twinkle: 0.5 + rnd() * 1.1,
    })
  }
  // barrier-ring pulse emitters — a few anchors that periodically emit an expanding concentric ring
  const rings = []
  for (let i = 0; i < 3; i++) {
    rings.push({
      nx: 0.34 + rnd() * 0.32, ny: 0.30 + rnd() * 0.42,
      period: 150 + Math.floor(rnd() * 90),     // frames between pulses (slow, deliberate)
      phase: Math.floor(rnd() * 150),
      rMax: 0.26 + rnd() * 0.14, a: 0.24 + rnd() * 0.12, lw: 1.4 + rnd() * 1.0,
    })
  }
  fighter._gojoInfinityFX = { motes, rings }
}
function drawGojoInfinityVoidOverlay(c, fighter) {
  if (!c || fighter?.skinId !== "gojoInfinityVoid") return
  if (!fighter._gojoInfinityFX) seedGojoInfinityVoid(fighter)
  const x = fighter._lastDrawX, y = fighter._lastDrawY, w = fighter._lastDrawW, h = fighter._lastDrawH
  if (x == null || w == null) return
  const fx = fighter._gojoInfinityFX
  const t = (fighter._gojoInfinityClock = (fighter._gojoInfinityClock || 0) + 1)
  const M = Math.max(w, h)
  const PALE = "#CFE6FF", COOL = "#7FB4FF"
  c.save()
  // (b) expanding barrier-ring pulses — concentric, fade as they grow; drawn behind the motes
  c.lineCap = "round"
  for (const g of fx.rings) {
    const local = ((t + g.phase) % g.period) / g.period   // 0→1 across one pulse cycle
    // brief emission window each period (rest of the cycle is quiet)
    const p = local < 0.5 ? local / 0.5 : -1
    if (p < 0) continue
    const cx = x + g.nx * w, cy = y + g.ny * h
    const rad = (0.04 + p * g.rMax) * M
    const alpha = g.a * (1 - p) * (1 - p)                 // bright small → fade to nothing as it expands
    c.globalAlpha = Math.max(0, alpha)
    c.strokeStyle = COOL; c.shadowColor = PALE; c.shadowBlur = 5; c.lineWidth = g.lw
    c.beginPath(); c.arc(cx, cy, rad, 0, Math.PI * 2); c.stroke()
    c.globalAlpha = Math.max(0, alpha * 0.5)              // faint inner ring for a layered barrier feel
    c.beginPath(); c.arc(cx, cy, rad * 0.62, 0, Math.PI * 2); c.stroke()
  }
  // (a) slow cool blue-white motes — near-frozen drift + gentle twinkle
  c.shadowColor = PALE; c.shadowBlur = 4; c.fillStyle = PALE
  for (const m of fx.motes) {
    let ny = m.ny - t * m.rise
    ny = ny - Math.floor(ny)
    const nx = m.nx + m.swayAmp * Math.sin(t * 0.02 * m.swayFreq + m.phase)
    const glow = 0.55 + 0.45 * Math.sin(t * 0.04 * m.twinkle + m.phase)
    const fade = ny < 0.12 ? ny / 0.12 : 1
    c.globalAlpha = Math.max(0, Math.min(1, m.a * glow * fade))
    c.fillRect(x + nx * w - m.r / 2, y + ny * h - m.r / 2, m.r, m.r)
  }
  c.restore()
}

// Obito KAMUI intangibility overlay — spiralling warp ellipses that rotate and shrink toward a violet
// focal core near the face (the Sharingan eye Kamui spins reality into), over the ghosted body. Drawn
// ONLY while `_kamuiPhased` (turning Kamui off simply stops drawing it — the silent-OFF asymmetry).
function drawObitoKamuiAura(c, fighter) {
  if (!c || (fighter?.rosterKey || "").toLowerCase() !== "obito" || !fighter._kamuiPhased) return
  const x = fighter._lastDrawX, y = fighter._lastDrawY, w = fighter._lastDrawW, h = fighter._lastDrawH
  if (x == null || w == null) return
  const t = fighter._kamuiClock || 0
  const cx = x + w * 0.5, cy = y + h * 0.30           // focal point: upper body / face
  const M = Math.max(w, h)
  const VIOLET = "#9A6BFF", DEEP = "#3A1E66"
  c.save()
  c.lineCap = "round"
  const N = 4
  for (let i = 0; i < N; i++) {
    const k   = ((t * 0.06 + i / N) % 1)              // 0→1 shrink cycle (converging inward)
    const rad = (0.55 - k * 0.5) * M
    const rot = t * 0.05 + i * 1.7                    // rotating swirl
    const a   = (1 - k) * (1 - k)                     // fade as it converges to the core
    c.globalAlpha = 0.7 * a
    c.strokeStyle = i % 2 ? VIOLET : DEEP
    c.shadowColor = VIOLET; c.shadowBlur = 6; c.lineWidth = 2.4
    c.beginPath(); c.ellipse(cx, cy, rad * 0.68, rad, rot, 0, Math.PI * 2); c.stroke()   // squashed ellipse = warp distortion
  }
  c.globalAlpha = 0.6 + 0.3 * Math.sin(t * 0.2)       // pulsing violet focal core
  c.fillStyle = VIOLET; c.shadowColor = VIOLET; c.shadowBlur = 10
  c.beginPath(); c.arc(cx, cy, Math.max(2, M * 0.03), 0, Math.PI * 2); c.fill()
  c.restore()
}

// Tobi KAMUI intangibility overlay — same converging warp-swirl as Obito's, but an ORANGE focal core
// (tying to Tobi's mask) so it reads as HIS Kamui, not Obito's. Own guard (`_tobiPhased`), so it draws
// ONLY for a phased Tobi and never for Obito — fully independent. Drawn over the ghosted body.
function drawTobiKamuiAura(c, fighter) {
  if (!c || (fighter?.rosterKey || "").toLowerCase() !== "tobi" || !fighter._tobiPhased) return
  const x = fighter._lastDrawX, y = fighter._lastDrawY, w = fighter._lastDrawW, h = fighter._lastDrawH
  if (x == null || w == null) return
  const t = fighter._tobiClock || 0
  const cx = x + w * 0.5, cy = y + h * 0.30
  const M = Math.max(w, h)
  const ORANGE = "#E08A2A", DEEP = "#5A2E12"
  c.save()
  c.lineCap = "round"
  const N = 4
  for (let i = 0; i < N; i++) {
    const k   = ((t * 0.06 + i / N) % 1)
    const rad = (0.55 - k * 0.5) * M
    const rot = t * 0.05 + i * 1.7
    const a   = (1 - k) * (1 - k)
    c.globalAlpha = 0.7 * a
    c.strokeStyle = i % 2 ? ORANGE : DEEP
    c.shadowColor = ORANGE; c.shadowBlur = 6; c.lineWidth = 2.4
    c.beginPath(); c.ellipse(cx, cy, rad * 0.68, rad, rot, 0, Math.PI * 2); c.stroke()
  }
  c.globalAlpha = 0.6 + 0.3 * Math.sin(t * 0.2)
  c.fillStyle = ORANGE; c.shadowColor = ORANGE; c.shadowBlur = 10
  c.beginPath(); c.arc(cx, cy, Math.max(2, M * 0.03), 0, Math.PI * 2); c.fill()
  c.restore()
}

// Obito "VOID MASK" skin overlay — seeded ONCE, then drifts each frame: (a) a slow cloud of
// Sharingan-palette (deep-red / purple) particles, and (b) occasional soft Kamui-portal SWIRL pulses
// (concentric warp ellipses) that bloom and fade — tying the void motif to his signature Kamui portal.
// Tracks the live sprite bbox (_lastDraw*) so it follows every combat pose, INCLUDING while intangible
// (its own explicit alpha overrides the phased-body ghost alpha so the FX stays visible). Gated on skinId.
const OBITO_VOID_RED = "#D8283A", OBITO_VOID_PURPLE = "#8A4CD8", OBITO_VOID_SWIRL = "#9A6BFF"
function seedObitoVoid(fighter) {
  const R = (a, b) => a + Math.random() * (b - a)
  const dots = [], swirls = []
  for (let i = 0; i < 26; i++) dots.push({ nx: Math.random(), ny: Math.random(), r: R(0.9, 2.3), rise: R(0.002, 0.006), sway: R(0.4, 1.2), phase: R(0, 6.28), red: Math.random() < 0.55, a: R(0.4, 0.9) })
  for (let i = 0; i < 3; i++) swirls.push({ nx: R(0.3, 0.7), ny: R(0.22, 0.6), period: R(130, 210), phase: R(0, 210), size: R(0.30, 0.52) })
  fighter._obitoVoidFX = { dots, swirls }
}
function drawObitoVoidOverlay(c, fighter) {
  if (!c || fighter?.skinId !== "obitoVoid") return
  if (!fighter._obitoVoidFX) seedObitoVoid(fighter)
  const x = fighter._lastDrawX, y = fighter._lastDrawY, w = fighter._lastDrawW, h = fighter._lastDrawH
  if (x == null || w == null) return
  const fx = fighter._obitoVoidFX
  const t = (fighter._obitoVoidClock = (fighter._obitoVoidClock || 0) + 1)
  const M = Math.max(w, h)
  c.save()
  c.lineCap = "round"
  // (a) periodic Kamui-portal swirl pulses (bloom → fade)
  for (const s of fx.swirls) {
    const local = ((t + s.phase) % s.period) / s.period
    const p = local < 0.4 ? local / 0.4 : (local < 0.8 ? 1 - (local - 0.4) / 0.4 : 0)
    if (p <= 0) continue
    const cx = x + s.nx * w, cy = y + s.ny * h
    const rad = s.size * M * (0.6 + p * 0.5)
    c.globalAlpha = p * 0.5
    c.strokeStyle = OBITO_VOID_SWIRL; c.shadowColor = OBITO_VOID_RED; c.shadowBlur = 8; c.lineWidth = 2
    for (let k = 0; k < 3; k++) { const rr = rad * (1 - k * 0.28); c.beginPath(); c.ellipse(cx, cy, rr * 0.68, rr, t * 0.06 + k * 1.6, 0, Math.PI * 2); c.stroke() }
  }
  // (b) drifting Sharingan-red / purple particles
  c.shadowBlur = 4
  for (const d of fx.dots) {
    let ny = d.ny - t * d.rise; ny = ny - Math.floor(ny)
    const nx = d.nx + 0.04 * Math.sin(t * 0.02 * d.sway + d.phase)
    const glow = 0.6 + 0.4 * Math.sin(t * 0.05 + d.phase)
    const col = d.red ? OBITO_VOID_RED : OBITO_VOID_PURPLE
    c.globalAlpha = Math.max(0, Math.min(1, d.a * glow))
    c.fillStyle = col; c.shadowColor = col
    c.fillRect(x + nx * w - d.r / 2, y + ny * h - d.r / 2, d.r, d.r)
  }
  c.restore()
}

// KILLUA GODSPEED overlay (Stage 5) — the electric-afterimage effect layered on the normal sprite
// while _godspeedActive (the OVERLAY path, not a body-swap). Draws faded electric-cyan SILHOUETTE
// ghosts at Killua's recent positions (a speed-blur trail; abilities.applyGodspeedSystem records
// them) plus a pulsing electric outline on the body. Drawn BEFORE the sprite (behind), mirroring the
// other auras. No-op for anyone else / when inactive.
function drawGodspeedAura(c, fighter) {
  if (!c || !fighter?._godspeedActive) return
  const w = fighter.w ?? 60, h = fighter.h ?? 110
  const trail = fighter._godspeedTrail || []
  // Afterimage ghosts — older = fainter, drawn oldest-first so the newest sits closest to the body.
  c.save()
  for (let i = trail.length - 1; i >= 0; i--) {
    const g = trail[i]
    c.globalAlpha = 0.06 + 0.05 * (trail.length - i)   // 0.06 (oldest) → brighter (newest)
    c.fillStyle   = "#38bdf8"
    c.shadowBlur  = 14
    c.shadowColor = "#7dd3fc"
    c.fillRect(g.x, g.y, w, h)
  }
  c.restore()
  // Pulsing electric outline on the current body.
  const x = fighter.x ?? 0, y = fighter.y ?? 0
  const pulse  = 0.5 + 0.5 * Math.sin(fighter._godspeedPulse = (fighter._godspeedPulse || 0) + 0.35)
  const spread = 8 + pulse * 5
  c.save()
  c.globalAlpha = 0.20 + pulse * 0.14
  c.shadowBlur  = spread * 2.4
  c.shadowColor = "#7dd3fc"
  c.strokeStyle = "#e0f2fe"
  c.lineWidth   = 3 + pulse * 2
  const rx = x - spread / 2, ry = y - spread / 2, rw = w + spread, rh = h + spread, r = 14
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

// Flash — FLASH TIME afterimage overlay (mirrors drawGodspeedAura, red/gold speed-force colours).
// Draws faded red SILHOUETTE ghosts at Flash's recent positions (a speed-blur trail;
// abilities.applyFlashTimeSystem records _ftTrail) + a pulsing gold outline on the live body.
function drawFlashAura(c, fighter) {
  if (!c || !fighter?._flashTimeActive) return
  const w = fighter.w ?? 60, h = fighter.h ?? 110
  const trail = fighter._ftTrail || []
  c.save()
  for (let i = trail.length - 1; i >= 0; i--) {
    const g = trail[i]
    c.globalAlpha = 0.05 + 0.05 * (trail.length - i)   // oldest faintest → newest brightest
    c.fillStyle   = "#e8352a"                            // Flash red
    c.shadowBlur  = 14
    c.shadowColor = "#fde047"                            // gold lightning glow
    c.fillRect(g.x, g.y, w, h)
  }
  c.restore()
  const x = fighter.x ?? 0, y = fighter.y ?? 0
  const pulse  = 0.5 + 0.5 * Math.sin(fighter._ftPulse = (fighter._ftPulse || 0) + 0.4)
  const spread = 8 + pulse * 5
  c.save()
  c.globalAlpha = 0.20 + pulse * 0.14
  c.shadowBlur  = spread * 2.4
  c.shadowColor = "#fde047"
  c.strokeStyle = "#fff7c2"
  c.lineWidth   = 3 + pulse * 2
  const rx = x - spread / 2, ry = y - spread / 2, rw = w + spread, rh = h + spread, r = 14
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

// GON — ADULT FORM aura overlay (mirrors drawFlashAura, green Nen colours). Signals the buff-mode
// transformation on the (unswapped) child body: faded green silhouette ghosts at recent positions
// (abilities.applyGonAdultFormSystem records _adultTrail) + a pulsing bright-green outline on the body.
function drawGonAdultAura(c, fighter) {
  if (!c || !fighter?._adultFormActive) return
  const w = fighter.w ?? 60, h = fighter.h ?? 110
  const trail = fighter._adultTrail || []
  c.save()
  for (let i = trail.length - 1; i >= 0; i--) {
    const g = trail[i]
    c.globalAlpha = 0.04 + 0.045 * (trail.length - i)
    c.fillStyle   = "#22c55e"                            // Nen green
    c.shadowBlur  = 14
    c.shadowColor = "#86efac"
    c.fillRect(g.x, g.y, w, h)
  }
  c.restore()
  const x = fighter.x ?? 0, y = fighter.y ?? 0
  const pulse  = 0.5 + 0.5 * Math.sin(fighter._adultPulse = (fighter._adultPulse || 0) + 0.35)
  const spread = 8 + pulse * 6
  c.save()
  c.globalAlpha = 0.22 + pulse * 0.16
  c.shadowBlur  = spread * 2.4
  c.shadowColor = "#86efac"
  c.strokeStyle = "#dcfce7"
  c.lineWidth   = 3 + pulse * 2
  const rx = x - spread / 2, ry = y - spread / 2, rw = w + spread, rh = h + spread, r = 14
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

// MIWA — Rapid Slash Vortex FX (§10): a SEPARATE overlay layer (NOT part of the character animation
// sub-clip) played on the air-special hit. Sprite = kasumi_vortex_fx.png (4 spinning-vortex frames,
// character frames 0-1 stay in the airVortex sub-clip). Armed by abilities.fireMiwaAirSlash (_miwaVortex
// {t,max}); ticked in the per-fighter update; drawn IN FRONT of the body at the strike point.
let _miwaVortexImg = null
function drawMiwaVortex(c, fighter) {
  const v = fighter?._miwaVortex
  if (!c || !v) return
  if (!_miwaVortexImg) { _miwaVortexImg = new Image(); _miwaVortexImg.src = "./kasumi_vortex_fx.png" }
  if (!_miwaVortexImg.complete || !_miwaVortexImg.naturalWidth) return
  const FR = 4, FW = 51, FH = 51
  const frame = Math.min(FR - 1, Math.floor((v.t / v.max) * FR))
  const w = fighter.w ?? 60, h = fighter.h ?? 110
  const cx = (fighter.x ?? 0) + w / 2 + (fighter.facing || 1) * w * 0.55   // in front of the sword
  const cy = (fighter.y ?? 0) + h * 0.42
  const scale = (fighter.spriteScale || 1.7) * 1.5
  const dw = FW * scale, dh = FH * scale
  const fade = 1 - Math.max(0, v.t - v.max * 0.65) / (v.max * 0.35)         // fade out over the last third
  c.save()
  c.globalAlpha = 0.9 * Math.max(0, Math.min(1, fade))
  c.drawImage(_miwaVortexImg, frame * FW, 0, FW, FH, cx - dw / 2, cy - dh / 2, dw, dh)
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
  const dealt = applyScaledDamage(f, dmg, { source: "portal-drop" })
  spawnDamageNumber({ x: f.x + (f.w || 60) / 2, y: f.y, damage: dealt, category: pd.category || "special" })
  camera.shake?.(10, 8)
  f._portalDrop = null
}

function updateFighterState(fighter) {
  if (!fighter) return fighter
  const updated = updateTransformationState(fighter, getAbilityContext()) || fighter
  applyGojoPassiveSystems(updated)
  applyGokuBlackFormSystem(updated)  // SSJ Rose: continuous per-frame energy drain + instant auto-revert at 0
  applyMangekyouSystem(updated)      // Itachi Mangekyou: continuous chakra drain + instant auto-revert at 0
  updateObitoKamui(updated)          // Obito Kamui Intangibility: continuous chakra drain + auto-deactivate at 0 + melee-drop/reactivate + sustains the i-frame phase
  updateTobiChainGrab(updated, getAbilityContext())   // Tobi Chain Grab: scripted whip→reach→snatched→smash grab-combo state machine (own `_tobiChain*` state)
  updateTobiKamui(updated)           // Tobi Kamui Intangibility: continuous chakra drain + auto-off at 0 + melee-drop/reactivate + i-frame phase (own `_tobi*` state)
  applyGodspeedSystem(updated)       // Killua Godspeed: continuous Nen drain + auto-revert at 0 + afterimage-trail recording
  applyFlashTimeSystem(updated)      // Flash — Flash Time: continuous Speed Force drain + auto-revert + block-lockout + afterimage-trail recording
  applyGonAdultFormSystem(updated)   // Gon Adult Form: continuous Nen drain + auto-revert at 0 + green-aura-trail recording (movement-lockout is set at enter)
  applyHisokaOverdriveSystem(updated)   // Hisoka Bloodlust Overdrive: continuous Nen drain + auto-revert at 0 (buff + _skinAnim body-swap set at enter)
  updateTransformJutsu(updated)         // Transformation Jutsu (Naruto-universe): counts the disguise/full-copy window down + auto-reverts
  updateGhostfaceSwap(updated)          // Ghostface Companion Swap: counts the borrowed-kit window down + auto-reverts to Ghostface
  updateBeastBreathingAssist(updated)   // Inosuke Beast Breathing Assist: auto-resumes the flurry the instant the partner-link freeze lifts
  updateZarakiYachiruLink(updated)      // Zaraki (Shikai) Yachiru combo-link: auto-resumes the rekka the instant the partner-link freeze lifts
  updateBanditEcho(updated)             // Chrollo Bandit's Echo: auto-reverts the instant the single borrowed move resolves
  updateBanditEchoUltMark(updated, getAbilityContext())   // Chrollo Bandit's Echo: mark an opponent's freeze-cinematic ULTIMATE that damaged Chrollo (bypasses the melee/projectile hit sites)
  updateGhostfaceBackstagePass(updated, getAbilityContext())   // Ghostface Backstage Pass: ticks the dash + phantom hit, then emerges (reposition/swap)
  updateGhostfaceAmbush(updated, getAbilityContext())   // Ghostface "Phone Call" ambush swap: drives the 4-beat bait→retreat→2nd-killer strike→handoff
  updateGhostfacePresentation(updated)   // Ghostface visual staging: advances the Stalk-Vanish off-screen/re-entry + the 3-beat killer-swap transition (render-only)
  if (updated._miwaVortex && ++updated._miwaVortex.t >= updated._miwaVortex.max) updated._miwaVortex = null   // Miwa Rapid Slash Vortex FX lifetime
  applySupermanModeSystem(updated)      // Superman Solar Flare / Kryptonian Overload: continuous Solar Energy drain + auto-revert at 0
  applyVegetaFormSystem(updated)     // Vegeta Super Saiyan: continuous per-frame energy drain + instant auto-revert at 0
  applyKuramaShroudSystem(updated)   // health-gated 5-stage Kurama shroud (Naruto only)
  applyOmniManFlightSystem(updated)  // Omni-Man Flight: shared-pool Smart Atoms drain while flying → forced descent at 0 → landing-recovery window (BEFORE applyGravity, which then hovers/falls him)
  updateMiscTimers(updated)
  physics.applyGravity(updated)
  resolvePortalDropLanding(updated)   // Rick Portal-Pull/Push: impact damage the frame they reground
  physics.updateAttackBox(updated)
  // Ben/Albedo run the transform-device drain/charge/revert system instead of
  // the generic passive regen (which would fight the drain). Driven by real
  // per-frame delta ms.
  if (isTransformDevice(updated)) updateTransformDevice(updated, getAbilityContext().deltaMs)
  else if (!isOmniManFlying(updated)) regenEnergy(updated)   // Omni-Man: no passive regen WHILE flying, or the flight drain would never deplete the shared pool (he regens normally on the ground)
  if (updated._meterDrain && !updated.infiniteEnergy && (updated.maxEnergy || 0) > 0) updated.energy = Math.max(0, (updated.energy || 0) - 0.5)   // Stage 24A "Meter Drain" modifier
  maybeKilluaChargeCompleteVoice(updated)   // Killua "charge complete!" bark — precise charge-animation-finished event
  return updated
}

// KILLUA "charge complete" voice (killuanen_082) — a DIRECT content match, wired precisely to the
// charge-animation completing (NOT a generic pool). Killua's charge sheet is the concat
// killua_charge_animation_part_1 → part_2 (18f, tail-loops from loopStart 14). "Finishes playing" =
// the buildup+form sequence has played through once → frameIndex first reaches the last frame. Fires
// ONCE per charge session (flag), reset the instant the player releases the charge. Audio-only.
function maybeKilluaChargeCompleteVoice(f) {
  if (!f || (f.rosterKey || "").toLowerCase() !== "killua") return
  if (!f.isCharging) { f._killuaChargeVoiceDone = false; return }   // charge released → re-arm for next time
  if (f._killuaChargeVoiceDone) return
  const chargeDef = f.animationData?.charge || f._skinAnim?.charge
  const lastFrame = (chargeDef?.frames || 18) - 1
  const sh = f.spriteHandler
  if (f._lastSpriteAction === "charge" && sh && (sh.frameIndex || 0) >= lastFrame) {
    f._killuaChargeVoiceDone = true
    sound.playSfxFile?.(KILLUA_CHARGE_COMPLETE_SFX, null)
  }
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
  const d = poolAcquire("dmg")   // Stage 22C: reuse a recycled damage-number instead of allocating
  d.x = spark.x; d.y = spark.y
  d.text = String(Math.round(spark.damage || 0))
  d.color = colorMap[spark.category || "light"] || "#ffffff"
  d.timer = 45; d.maxTimer = 45; d.opacity = 1
  d.vy = -1.2; d.fontSize = 22
  damageNumbers.push(d)
}

function updateDamageNumbers() {
  // Stage 22C: single-pass COMPACTION (O(n), order preserved) — expired numbers are RECYCLED to the
  // pool instead of spliced-per-item (O(n²)) and dropped to GC. Many expire together after a burst.
  let w = 0
  for (let i = 0; i < damageNumbers.length; i++) {
    const d = damageNumbers[i]
    d.y -= 1.2; d.timer--; d.opacity = d.timer / d.maxTimer
    if (d.timer <= 0) { poolRelease("dmg", d); continue }   // expired → recycle + drop
    damageNumbers[w++] = d                                   // keep → compact
  }
  damageNumbers.length = w
}

function updateComboDisplay(fighter, side) {
  if (!fighter) return
  const ds    = comboDisplay[side]
  const count = fighter.comboCounter || 0
  if (count >= 2) {
    if (count > ds.prevCount) ds.pop = 1          // new hit landed → punch the number
    ds.lastCount = count; ds.holdTimer = 30; ds.fadeDir = "in"
  }
  else if (ds.holdTimer > 0) ds.holdTimer--
  else ds.fadeDir = "out"
  ds.prevCount = count
  ds.pop = Math.max(0, (ds.pop || 0) - 0.12)       // decay the scale punch each frame
  ds.opacity = ds.fadeDir === "in"
    ? Math.min(1, (ds.opacity || 0) + 1 / 6)
    : Math.max(0, (ds.opacity || 0) - 1 / 30)
}

function updateEffectsAndDomains() {
  updateDomains([p1, p2].filter(Boolean), hitSparks)
  // Hashirama Sealing Jutsu domain OVERLAY — non-freezing: ticks the gate-slam + looping cameo strikes
  // alongside the live domain (combat is NOT paused; only the trapped opponent is frozen by the domain).
  if (isHashiramaSealingJutsuCinematicActive()) {
    updateHashiramaSealingJutsuCinematic({ camera, hitEffects: hitSparks, damageNumbers, sound })
  }
  updateEffects()
  updateEnergyRegen([p1, p2].filter(Boolean))
  // Stage 22C: forward COMPACTION (order + fresh-spark side effects preserved) — expired sparks are
  // RECYCLED to the pool instead of spliced-per-item and GC'd. Ultimates spawn dozens at once.
  let _sw = 0
  for (let i = 0; i < hitSparks.length; i++) {
    const spark = hitSparks[i]
    if (spark?._fresh !== false) {
      spark.maxTimer = spark.maxTimer || spark.timer
      spawnDamageNumber(spark)
      const attSide = (p1?.comboCounter || 0) >= (p2?.comboCounter || 0) ? "p1" : "p2"
      recordHit?.(matchStats, attSide, spark.damage || 0,
        Math.max(p1?.comboCounter || 0, p2?.comboCounter || 0),
        spark.category === "special" || spark.category === "ultimate",
        spark.category === "ultimate")
      // AI-vs-AI telemetry: log the CONNECTED hit (damage per move / combo strings). The spark now
      // carries the true attacker + move name (combat.js tags), so this is exact — not the heuristic
      // attSide above (kept as a fallback for the pre-existing on-screen stats panel).
      if (aiVsAiState.active && aiVsAiState.session) {
        const side = spark.attackerSide || attSide
        const attacker = side === "p1" ? p1 : p2
        logHit(aiVsAiState.session, side, {
          frame:    globalFrameCount,
          move:     spark.moveName || "attack",
          category: spark.category || "light",
          damage:   spark.damage || 0,
          blocked:  !!spark.blocked,
          combo:    attacker?.comboCounter || 0
        })
      }
      // FX camera-shake tie-in (Stage 2): a brief thud on landed heavy / spike hits (the resolveAttackHit
      // path has no per-hit shake of its own — only wall-splat / hazard / ult cinematics do). Skipped on
      // block so a guarded hit doesn't shake like a clean landing.
      if (!spark.blocked) { const _sh = _sparkCfg(spark).shake; if (_sh) camera.shake?.(_sh, _sh + 2) }
      spark._fresh = false
    }
    spark.timer--
    const _pAlive = _tickSparkParticles(spark)   // advance the debris burst (seeds lazily on first tick)
    if (spark.timer <= 0 && _pAlive === 0) { poolRelease("spark", spark); continue }   // flash gone AND debris settled → recycle
    hitSparks[_sw++] = spark                                          // keep → compact
  }
  hitSparks.length = _sw
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
  // F6 — CLONE NO-TELL escalation (default OFF): remove the decoy visual tell so clones are
  // indistinguishable from the real fighter until hit. The hit-reveal rule still applies in both modes.
  if (_trainingKeyPressed("f6")) { trainingState.cloneNoTell = !trainingState.cloneNoTell; setCloneTell(!trainingState.cloneNoTell) }
  // F7 — WOOD RELEASE climbable-terrain PROBE (Stage 1, isolated): spawn a test platform a short reach
  // in front of P1, rising from the fighter's own ground. NOT wired to any character's kit — a debug hook
  // to prove jump-onto-growing / stand-at-full / recede-sync before Hashirama's Wood Release consumes it.
  if (_trainingKeyPressed("f7") && p1) {
    const gy = p1.groundY != null ? p1.groundY : groundY
    spawnPlatform({ x: p1.x + (p1.facing || 1) * 120, w: 150, groundY: gy, maxHeight: 190, growDur: 34, holdDur: 150, recedeDur: 40 })
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
  if (victoryState.active) return   // match already resolved (e.g. a Gon sudden-death force-ended it this frame) — don't re-process round/KO
  // ROUND/MATCH END — stop every in-flight voice/SFX cue ONCE the round ends (KO or time-over) so
  // combat audio can't bleed past the fight. Fires BEFORE the round-end / win barks below (which start
  // AFTER this), and win-lines are marked persistent, so intentional post-match audio is preserved.
  const _roundOver = roundTimer <= 0 || p1.health <= 0 || p2.health <= 0
  if (_roundOver && !_roundEndAudioStopped) { sound.stopAllSfx?.(); _roundEndAudioStopped = true }
  if (roundTimer <= 0) {
    const p1h = p1?.health || 0, p2h = p2?.health || 0
    let rw = null
    if      (p1h > p2h) { roundWins.p1++; rw = "p1"; winnerText = isPvP() ? "Time Over — Player 1 Wins" : "Time Over — Player 1 Wins" }
    else if (p2h > p1h) { roundWins.p2++; rw = "p2"; winnerText = isPvP() ? "Time Over — Player 2 Wins" : "Time Over — CPU Wins" }
    else                { winnerText = "Time Over — Draw" }
    recordRoundEnd?.(matchStats, rw, p1h, p2h)   // per-round (drives perfectRounds → FLAWLESS)
    if (aiVsAiState.active) logRoundEnd(aiVsAiState.session, { round: roundNumber, winner: rw || "draw", method: "timeout", p1Health: p1h, p2Health: p2h, frame: globalFrameCount })
    maybeRickRoundVoice(rw, true)   // time-over bell (suppressed if this ends the match)
    _checkMatchOver(); return
  }
  if (p1.health > 0 && p2.health > 0) return
  if ((p1.health <= 0 || p2.health <= 0) && knockoutFlash === 0) { knockoutFlash = 18; _koStamp = _koStampMax = 48 }   // Stage 9: fire the K.O. stamp on the knockout frame
  let rw = null
  if      (p1.health <= 0 && p2.health <= 0) winnerText = "Double KO"
  else if (p1.health > 0) { roundWins.p1++; rw = "p1"; winnerText = "Player 1 Wins Round" }
  else                    { roundWins.p2++; rw = "p2"; winnerText = isPvP() ? "Player 2 Wins Round" : "CPU Wins Round" }
  recordRoundEnd?.(matchStats, rw, p1?.health || 0, p2?.health || 0)   // per-round (drives perfectRounds)
  if (aiVsAiState.active) {
    const method = (p1.health <= 0 && p2.health <= 0) ? "double_ko" : "ko"
    logRoundEnd(aiVsAiState.session, { round: roundNumber, winner: rw || "draw", method, p1Health: p1?.health || 0, p2Health: p2?.health || 0, frame: globalFrameCount })
  }
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

// ── KILLUA GODSPEED — per-opponent TIME-SLOW ──────────────────────────────────────────────────
// While Killua's Godspeed is active, his OPPONENT runs at a reduced frame-rate: an accumulator lets the
// opponent's per-frame update through only a fraction of frames (the rest are skipped = frozen), so its
// movement, combat AND animation advance slowly — while Killua is never skipped and keeps full speed.
// This is the engine's existing frame-skip slow-mo idiom (cf. the global `slowdownTimer % 3`) but scoped
// to ONE fighter instead of the whole game. GODSPEED_OPP_TIMESCALE = fraction of normal speed for the foe.
const GODSPEED_OPP_TIMESCALE = 0.4
// GENERALIZED to any per-opponent time-slow user (Killua Godspeed @0.4, Flash — Flash Time @_ftOppTimeScale
// ~0.34). Returns the fraction-of-normal-speed the given fighter imposes on its foe while its speed
// ultimate is live, or 0 if it isn't imposing one. Both ults share this ONE frame-skip idiom.
function _oppTimeScaleOf(user) {
  if (!user) return 0
  if (user._godspeedActive) return GODSPEED_OPP_TIMESCALE
  if (user._flashTimeActive) return user._ftOppTimeScale || 0.34
  return 0
}
function _updateGodspeedTimeSlow() {
  for (const [user, foe] of [[p1, p2], [p2, p1]]) {
    const ts = _oppTimeScaleOf(user)
    if (ts > 0 && foe && !foe.eliminated) {
      foe._timeSlowAcc = (foe._timeSlowAcc || 0) + ts
      if (foe._timeSlowAcc >= 1) { foe._timeSlowAcc -= 1; foe._timeSlowFlag = false }   // this frame runs
      else foe._timeSlowFlag = true                                                     // this frame is skipped (slowed)
    } else if (foe && (foe._timeSlowFlag || foe._timeSlowAcc)) {
      foe._timeSlowFlag = false; foe._timeSlowAcc = 0   // not slowed → clear
    }
  }
}
// True on the frames the fighter is being time-slow-skipped (Godspeed opponent). Also read by sprite.js
// to freeze that fighter's animation advance on the same frames (via fighter._timeSlowFlag).
function _timeSlowFrozen(f) { return !!(f && f._timeSlowFlag) }

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

  // Stage 11B/11C: replay input at the SAME per-frame point (after AI + gamepad wrote `keys`, before
  // combat consumes them). PLAYBACK overwrites keys from the recorded masks; otherwise RECORD the raw
  // masks (delta-encoded). Then, every HASH_INTERVAL frames, checkpoint both fighters' state — the
  // recorder stores it, playback compares it (desync check → first divergent frame).
  if (replay.isPlayback()) {
    const m = replay.playbackMaskAt(_replayFrame)
    if (m) { writeRawControls(p1, replay.decodeInput(m.p1)); writeRawControls(p2, replay.decodeInput(m.p2)) }
    if (_replayFrame % replay.HASH_INTERVAL === 0) replay.playbackCheckState(_replayFrame, _replaySnap(p1), _replaySnap(p2))
  } else if (replay.isRecording()) {
    replay.recordInputs(_replayFrame, replay.encodeInput(readRawControls(p1)), replay.encodeInput(readRawControls(p2)))
    if (_replayFrame % replay.HASH_INTERVAL === 0) replay.recordState(_replayFrame, _replaySnap(p1), _replaySnap(p2))
  }
  _replayFrame++

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

  // MINATO KURAMA ULTIMATE CINEMATIC — same freeze contract (its own module, Minato's own art).
  if (isMinatoKuramaActive()) {
    updateMinatoKurama({ camera, hitEffects: hitSparks, damageNumbers, sound })
    if (typeof camera.advance === "function") camera.advance(canvas)
    return                                     // skip movement/combat/physics this frame
  }

  // OBITO JUUBI ULTIMATE CINEMATIC — same freeze contract (its own module, Obito's own Ten-Tails art).
  if (isObitoJuubiCinematicActive()) {
    updateObitoJuubi({ camera, hitEffects: hitSparks, damageNumbers, sound })
    if (typeof camera.advance === "function") camera.advance(canvas)
    return                                     // skip movement/combat/physics this frame
  }

  // TOBI NINE-TAILS ULTIMATE CINEMATIC — same freeze contract (its OWN module, Tobi's own NINE-Tails art).
  if (isTobiNineTailsCinematicActive()) {
    updateTobiNineTails({ camera, hitEffects: hitSparks, damageNumbers, sound })
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

  // RED RANGER (MMPR) POWER SWORD CINEMATIC: SAME freeze contract — combat/physics/input are paused for
  // the whole sequence; the camera frames BOTH fighters and the guaranteed damage lands at the STRIKE
  // connect beat via the cinematic's onImpact, then combat resumes.
  if (isRedRangerPowerSwordCinematicActive()) {
    updateRedRangerPowerSwordCinematic({ camera, hitEffects: hitSparks, damageNumbers, sound })
    if (typeof camera.advance === "function") camera.advance(canvas)
    return                                     // skip movement/combat/physics this frame
  }

  // KILLUA GODSPEED ACTIVATION CINEMATIC: SAME freeze contract — combat/physics/input paused while the
  // camera pushes in on Killua and his charge-up plays, then pulls back. The buff was already applied at
  // the trigger (executeKilluaUltimate); this is the visual activation.
  if (isKilluaGodspeedCinematicActive()) {
    updateKilluaGodspeedCinematic({ camera, sound })
    if (typeof camera.advance === "function") camera.advance(canvas)
    return                                     // skip movement/combat/physics this frame
  }

  // FLASH TIME ACTIVATION CINEMATIC: SAME freeze contract as Godspeed — combat/physics/input paused
  // while the camera pushes in on Flash and his spin-up plays, then pulls back. The buff (opponent
  // time-slow + self speed + block-lockout) was already applied at the trigger (executeFlashUltimate).
  if (isFlashTimeCinematicActive()) {
    updateFlashTimeCinematic({ camera, sound })
    if (typeof camera.advance === "function") camera.advance(canvas)
    return                                     // skip movement/combat/physics this frame
  }

  // GON ADULT FORM ACTIVATION CINEMATIC: SAME freeze contract as Godspeed/Flash Time — combat/physics/
  // input paused while the camera pushes in on Gon and his child→adult growth plays, then pulls back.
  // The buff + movement-lockout were already applied at the trigger (executeGonUltimate).
  if (isGonAdultFormCinematicActive()) {
    updateGonAdultFormCinematic({ camera, sound })
    if (typeof camera.advance === "function") camera.advance(canvas)
    return                                     // skip movement/combat/physics this frame
  }

  // HISOKA BLOODLUST OVERDRIVE ACTIVATION CINEMATIC: SAME freeze contract — combat/physics/input paused
  // while the camera pushes in on Hisoka and his card-cape→golden-aura transform plays, then pulls back.
  // The buff + _skinAnim body-swap were already applied at the trigger (executeHisokaUltimate).
  if (isHisokaOverdriveCinematicActive()) {
    updateHisokaOverdriveCinematic({ camera, sound })
    if (typeof camera.advance === "function") camera.advance(canvas)
    return                                     // skip movement/combat/physics this frame
  }

  // TOJI REINCARNATED FORM ACTIVATION CINEMATIC: SAME freeze contract — combat/physics/input paused while
  // the camera pushes in on Toji and his crimson cursed-aura transformation plays, then pulls back. The
  // buff + crimson tint were already applied at the trigger (executeTojiUltimate). This is the MANUAL,
  // player-chosen ultimate — the automatic two-stage comeback does NOT play this (it is a mid-combat save).
  if (isTojiReincarnationCinematicActive()) {
    updateTojiReincarnationCinematic({ camera, sound })
    if (typeof camera.advance === "function") camera.advance(canvas)
    return                                     // skip movement/combat/physics this frame
  }

  // ITACHI MANGEKYOU ACTIVATION CINEMATIC: SAME freeze contract — combat/physics/input paused while
  // the eye-transformation reveal plays (camera isolates Itachi). The BUFF was already applied by
  // enterMangekyou; this is the reveal, then combat resumes.
  if (isMangekyouCinematicActive()) {
    updateMangekyouCinematic({ camera, sound })
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
  if (isBen10OmnitrixCinematicActive()) {
    updateBen10OmnitrixCinematic({ camera, hitEffects: hitSparks, damageNumbers, sound })
    if (typeof camera.advance === "function") camera.advance(canvas)
    return
  }
  // BATMAN "THE DARK KNIGHT" CINEMATIC: SAME freeze contract — combat/physics/input paused for the
  // whole batarang barrage; the guaranteed damage lands at the connect beat via onImpact, then resume.
  if (isBatmanDarkKnightCinematicActive()) {
    updateBatmanDarkKnightCinematic({ camera, hitEffects: hitSparks, damageNumbers, sound })
    if (typeof camera.advance === "function") camera.advance(canvas)
    return
  }
  // OMNI-MAN "VILTRUMITE ONSLAUGHT" CINEMATIC: SAME freeze contract — combat/physics/input paused for
  // the whole body-slam; the guaranteed damage lands at the SLAM connect beat via onImpact, then resume.
  if (isOmniManBodySlamCinematicActive()) {
    updateOmniManBodySlamCinematic({ camera, hitEffects: hitSparks, damageNumbers, sound })
    if (typeof camera.advance === "function") camera.advance(canvas)
    return
  }

  // SUPERMAN "SOLAR OVERLOAD" CINEMATIC: SAME freeze contract — combat/physics/input paused for the whole
  // green energy-surge → dissolve → detonation; the guaranteed damage lands at the DETONATION beat, then resume.
  if (isSupermanUltimateCinematicActive()) {
    updateSupermanUltimateCinematic({ camera, hitEffects: hitSparks, damageNumbers, sound })
    if (typeof camera.advance === "function") camera.advance(canvas)
    return
  }

  // RENGOKU "FLAME EXPLOSION" CINEMATIC: SAME freeze contract — combat/physics/input paused for the whole
  // blade-raise → flame eruption → detonation; the guaranteed AOE damage lands at the DETONATION beat, then resume.
  if (isRengokuFlameExplosionCinematicActive()) {
    updateRengokuFlameExplosionCinematic({ camera, hitEffects: hitSparks, damageNumbers, sound })
    if (typeof camera.advance === "function") camera.advance(canvas)
    return
  }

  // MADARA "TENGAI SHINSEI" CINEMATIC (Perfect Susanoo, TAP ult): SAME freeze contract — combat/physics/input
  // paused through the summon → meteor fall → impact; the guaranteed meteor damage lands at the IMPACT beat, then resume.
  if (isMadaraTengaiShinseiCinematicActive()) {
    updateMadaraTengaiShinseiCinematic({ camera, hitEffects: hitSparks, damageNumbers, sound })
    if (typeof camera.advance === "function") camera.advance(canvas)
    return
  }

  // HASHIRAMA "SEALING JUTSU" is NOT a freeze cinematic anymore — it's a DOMAIN-EXPANSION trap (domains.js,
  // rosterKey "hashirama"): only the OPPONENT is frozen; Hashirama keeps playing live combat. Its overlay
  // (gate-slam + looping cameo strikes) ticks in updateEffectsAndDomains, so there is NO freeze-gate here.

  // PAIN "CHIBAKU TENSEI" CINEMATIC (Ultimate): SAME freeze contract — combat/physics/input paused through
  // the arms-raised cast → sphere growth → slam; the guaranteed devastation damage lands at the SLAM beat, then resume.
  if (isPainChibakuTenseiCinematicActive()) {
    updatePainChibakuTenseiCinematic({ camera, hitEffects: hitSparks, damageNumbers, sound })
    if (typeof camera.advance === "function") camera.advance(canvas)
    return
  }

  // YUJI "BLACK FLASH" CINEMATIC: SAME freeze contract — combat/physics/input paused through the Phase-1
  // cursed-energy BUILDUP. Its resolve begins the mashable "Koma" release (startYujiKoma); the freeze then
  // LIFTS into the interactive flurry (Phase 2), so the payoff is the player's mash, not a scripted hit.
  if (isYujiUltimateCinematicActive()) {
    updateYujiUltimateCinematic({ camera, hitEffects: hitSparks, damageNumbers, sound })
    if (typeof camera.advance === "function") camera.advance(canvas)
    return
  }

  // SHINOBU "BUTTERFLY DANCE" CINEMATIC: SAME freeze contract — combat/physics/input paused for the whole
  // dash-in → spinning slash; the guaranteed damage + poison finisher land at the STRIKE beat, then resume.
  if (isShinobuButterflyCinematicActive()) {
    updateShinobuButterflyCinematic({ camera, hitEffects: hitSparks, damageNumbers, sound })
    if (typeof camera.advance === "function") camera.advance(canvas)
    return
  }

  // GHOSTFACE "THE FINAL ACT" CINEMATIC: SAME freeze contract — combat/physics/input paused for the whole
  // stalk → stab flurry; the guaranteed damage + bleed finisher land at the CONNECT beat, then resume.
  if (isGhostfaceFinalActCinematicActive()) {
    updateGhostfaceFinalActCinematic({ camera, hitEffects: hitSparks, damageNumbers, sound })
    if (typeof camera.advance === "function") camera.advance(canvas)
    return
  }

  // MIWA "BLADE OF THE NEOPHYTE" CINEMATIC: SAME freeze contract — combat/physics/input paused for the whole
  // battojutsu windup → draw-slash; the single guaranteed slash lands at the CONNECT beat, then resume.
  if (isMiwaUltimateCinematicActive()) {
    updateMiwaUltimateCinematic({ camera, hitEffects: hitSparks, damageNumbers, sound })
    if (typeof camera.advance === "function") camera.advance(canvas)
    return
  }

  // ICHIGO "GETSUGA TENSHŌ" CINEMATIC: SAME freeze contract — combat/physics/input paused through the
  // dash-slash → rising uppercut (part_1→part_2 continuous); the single guaranteed Getsuga lands at the
  // uppercut CONNECT beat, then resume.
  if (isIchigoGetsugaCinematicActive()) {
    updateIchigoGetsugaCinematic({ camera, hitEffects: hitSparks, damageNumbers, sound })
    if (typeof camera.advance === "function") camera.advance(canvas)
    return
  }

  // INOSUKE "BEAST BREATHING" CINEMATIC SPECIALS: SAME freeze contract — combat/physics/input paused for the
  // short push-in → strike → pull-back; the range-gated hit lands at the STRIKE beat, then resume.
  if (isInosukeBeastCinematicActive()) {
    updateInosukeBeastCinematic({ camera, hitEffects: hitSparks, damageNumbers, sound })
    if (typeof camera.advance === "function") camera.advance(canvas)
    return
  }

  // MAKI "CURSED TOOL AWAKENING" CINEMATIC: SAME freeze contract — combat/physics/input paused through the
  // Shibuya-Arc reveal (the form/buff/scale are already applied at activation; this is the presentational
  // push-in + flash). Flash-only, single body → duplicate-render-immune. Resumes into the awakened moveset.
  if (isMakiShibuyaCinematicActive()) {
    updateMakiShibuyaCinematic({ camera, hitEffects: hitSparks, damageNumbers, sound })
    if (typeof camera.advance === "function") camera.advance(canvas)
    return
  }

  // TOBIRAMA EDO TENSEI CINEMATIC (summon + un-summon): SAME freeze contract — combat/physics/input are
  // paused while the coffin ritual plays; the body-swap (in) / revert (out) fires at the cinematic's
  // resolve beat. This freeze is ALSO the timer-pause: while any inner-ultimate cinematic runs, this
  // early-return keeps updatePlayerCombat (which ticks the Edo window timer) from running.
  if (isEdoTenseiCinematicActive()) {
    _edoCineMode = getEdoTenseiCinematicStatus().mode   // remember mode so we can detect an "in" summon ENDING
    updateEdoTenseiCinematic({ camera, sound, worldWidth: getStageWorldWidth() })
    if (typeof camera.advance === "function") camera.advance(canvas)
    return
  }
  // The coffin cinematic just ended. If it was an "in" summon, the vessel now holds the field — play ITS
  // OWN intro (pose + voice) as the next frozen beat, AFTER the tomb fully closed (no overlap with the
  // reveal). _edoIntroPlayed guards it to once per summon (reset each summon in applyEdoTensei).
  if (_edoCineMode === "in") {
    _edoCineMode = null
    const summoned = [p1, p2].find(f => f && f._edoActive && !f._edoEnding && !f._edoIntroPlayed)
    if (summoned) { summoned._edoIntroPlayed = true; startEdoVesselIntro(summoned) }
  } else if (_edoCineMode) {
    _edoCineMode = null   // an "out" un-summon ended — no intro beat
  }
  // Vessel-intro reveal beat — a brief FROZEN intro pose + voice for the just-summoned vessel.
  if (updateEdoVesselIntro()) { if (typeof camera.advance === "function") camera.advance(canvas); return }

  // BINDING VOWS: match each player's recent RAW directional sequence (own
  // character's vows only). AI fighters have no directionHistory → never match.
  if (vowCue.timer > 0) vowCue.timer--
  for (const f of [p1, p2]) {
    if (!f) continue
    const vow = tryActivateBindingVow(f)
    if (vow) { _triggerVowCue(vow); f.teleportFlash = 20; knockoutFlash = Math.max(knockoutFlash, 8) }
  }

  _runClashCheck()

  // KILLUA GODSPEED TIME-SLOW: stamp _timeSlowFrozen on the Godspeed user's opponent for the frames it
  // should be skipped (runs at a reduced frame-rate → visibly slowed movement + animation). Killua himself
  // is never stamped, so he keeps acting at full speed. NOT a global game-speed change (unlike slowdownTimer).
  _updateGodspeedTimeSlow()

  if (!_timeSlowFrozen(p1)) updateMovementInput(p1)
  if (!_timeSlowFrozen(p2)) updateMovementInput(p2)

  applyGojoInfinityField(p1, p2)
  applyGojoInfinityField(p2, p1)
  applyGojoInfinityToProjectiles(p1)   // TASK 4: slow/shrink/despawn enemy projectiles in the zone
  applyGojoInfinityToProjectiles(p2)

  updatePlatforms()   // Wood Release climbable terrain: advance grow/hold/recede BEFORE physics so the floor query reads the current top-Y

  if (!_timeSlowFrozen(p1)) p1 = updateFighterState(p1)
  if (!_timeSlowFrozen(p2)) p2 = updateFighterState(p2)

  applyGojoInfinityBarrier(p1, p2)
  applyGojoInfinityBarrier(p2, p1)

  if (typeof physics.resolvePlayerCollision === "function") physics.resolvePlayerCollision(p1, p2)

  // STAGE INTERACTABLES pilot: after positions/collision settle, check each fighter against the stage's
  // hazards (knocked-into-hazard → contact damage + wall-splat reaction). No-op on hazard-less stages.
  if (!_timeSlowFrozen(p1)) updateStageHazards(p1)
  if (!_timeSlowFrozen(p2)) updateStageHazards(p2)

  for (const fighter of [p1, p2].filter(Boolean)) {
    if (fighter._wallBounceShake) { camera.shake?.(8, 6); fighter._wallBounceShake = false }
    if (fighter._hazardShake)     { camera.shake?.(9, 7); fighter._hazardShake = false }   // stage-hazard contact shake
  }

  updateFacing()
  updateEffectsAndDomains()
  if (!_timeSlowFrozen(p1)) updatePlayerCombat(p1)
  if (!_timeSlowFrozen(p2)) updatePlayerCombat(p2)

  // NOTE: voice/SFX cues are intentionally NOT cut when a fighter's source animation ends — a line plays
  // to natural completion. The only thing that interrupts a character's line is a NEWER line from the SAME
  // character (the single-voice-channel rule, enforced in sound.playSfxFile). Match-end still stops audio
  // (stopAllSfx at checkRoundEnd / menu / rematch). See the revised audio-cutoff design.

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
  revealClonesHitByProjectiles(activeProjectiles)   // decoy: any projectile that hits a clone poofs it (after real-fighter hits resolve)

  // EDO TENSEI counter-play: the opponent can hit the STANDING Tobirama (fighter._edoDummy) to cancel the
  // jutsu on the spot. Checked after combat + projectile resolution so the opponent's swing/shot already
  // whiffed on the far-away vessel; the same hit here damages the shared HP and launches the un-summon.
  checkEdoDummyHit(p1)
  checkEdoDummyHit(p2)

  updateTojiFlyHeadsSwarm(canvas)   // Toji Fly Heads — tick the dense vision-denial swarm overlay (0 damage, no combat freeze)
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
  _updateGonSuddenDeath()   // Gon Adult Form "Final Blow": resolve an armed sudden-death BEFORE round-end (its clean hit also KOs, which we don't want double-counted)
  // TOJI two-stage comeback: intercept a fighter whose HP just reached zero and (if saves remain) restore
  // it BEFORE checkRoundEnd resolves a KO. Ungated by training so it fires in every mode. Catches all sources.
  applyTojiComeback(p1, getAbilityContext()); applyTojiComeback(p2, getAbilityContext())
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

// TOJI FLY HEADS self-vanish alpha: 1 normally; dips to ~14% (near-invisible) across the fade window, easing
// in over TOJI_FADE_IN frames and back out over TOJI_FADE_OUT so it never hard-pops. Countdown `_tojiFlyFadeTimer`
// is set in abilities.fireTojiFlyHeads and ticked (and force-cleared on swarm end) in the fighter cooldown loop.
const TOJI_FADE_MIN = 0.14, TOJI_FADE_IN = 16, TOJI_FADE_OUT = 30
function _tojiFlyFadeAlpha(fighter) {
  const t = fighter._tojiFlyFadeTimer || 0
  if (t <= 0) return 1
  const dur = fighter._tojiFlyFadeMax || t
  const elapsed = dur - t
  if (elapsed < TOJI_FADE_IN) return 1 - (1 - TOJI_FADE_MIN) * (elapsed / TOJI_FADE_IN)   // ramp 1 → MIN
  if (t < TOJI_FADE_OUT)      return TOJI_FADE_MIN + (1 - TOJI_FADE_MIN) * (1 - t / TOJI_FADE_OUT)   // ramp MIN → 1
  return TOJI_FADE_MIN
}

function renderHybridFighter(fighter) {
  if (!fighter) return
  // Cinematic hide: the Minato Kurama ultimate hides the REAL caster and draws its own transforming
  // Minato + fox overlay, so the real frozen body doesn't double-render next to the overlay (the
  // "second Minato" bug). minatoKurama sets/clears this flag.
  if (fighter._kuramaHide || fighter._tobiKuramaHide) return
  // Freeze sprite frame-advance while paused (the pause state still renders this
  // frame, so draw() must not keep ticking animations). sprite.js reads this flag.
  fighter._animFrozen = (gameState === GAME_STATES.PAUSED)
  const key = fighter.rosterKey
  const drawTo = (c) => {
    drawKuramaShroudAura(c, fighter)   // Kurama shroud glow, behind the body/sprite (Naruto only)
    drawMangekyouAura(c, fighter)      // Itachi Mangekyou crimson glow, behind the body (Itachi only)
    drawSupermanSolarFlareAura(c, fighter)   // Superman Solar Flare gold radiant halo, behind the body (Superman only)
    drawSupermanOverloadAura(c, fighter)     // Superman Kryptonian Overload blue electric crackle, behind the body (Superman only)
    drawGodspeedAura(c, fighter)       // Killua Godspeed electric-afterimage trail, behind the body (Killua only)
    drawFlashAura(c, fighter)          // Flash — Flash Time red/gold afterimage trail, behind the body (Flash only)
    drawGonAdultAura(c, fighter)       // Gon — Adult Form green Nen aura/afterimage, behind the body (Gon only)
    drawMiwaVortex(c, fighter)         // Miwa — Rapid Slash Vortex FX, a separate overlay layer in front of the body (Miwa only)
    if (fighter.hasSprites && fighter.spriteHandler && spritesReady(key)) {
      fighter.spriteHandler.draw(c, fighter, getSpriteSheets(key))
    } else {
      drawFighter(c, fighter, camera)
    }
    drawVoidStarfield(c, fighter)       // Rick Void Form — cosmic starfield, ON TOP of the black sprite
    drawPhantomZoneOverlay(c, fighter)  // Superman Phantom Zone — spectral energy, ON TOP of the void sprite
    drawEmberOverlay(c, fighter)        // Rengoku Void Ember — drifting rising embers, ON TOP of the void sprite
    drawPortalVoidOverlay(c, fighter)   // Rick Portal Void — curling green portal swirls, ON TOP of the void sprite
    drawVoidHunterOverlay(c, fighter)   // Maki Void Hunter — drifting stars + swirling red/violet nebulae, ON TOP of the void sprite
    drawYujiVoidOverlay(c, fighter)     // Yuji Void — pale white void-dust dots + soft violet clusters, ON TOP of the void sprite
    drawSukunaVoidEmberOverlay(c, fighter)   // Sukuna Void Sovereign — drifting dark-red ember motes, ON TOP of the void sprite
    drawZarakiVoidOverlay(c, fighter)        // Zaraki Void Sovereign — crackling red-black reiatsu sparks + bell glints, ON TOP of the void sprite
    drawVoidFlashOverlay(c, fighter)    // Minato Void Flash — drifting golden Raijin sparks (fast twinkle), ON TOP of the void sprite
    drawGojoInfinityVoidOverlay(c, fighter)  // Gojo Infinity Void — slow blue-white motes + expanding barrier-ring pulses, ON TOP of the void sprite
    drawVoidBoarOverlay(c, fighter)     // Inosuke Void Boar — drifting jagged white tusk-shards + claw-mark scratches, ON TOP of the void sprite
    drawNezukoVoidEmberOverlay(c, fighter)   // Nezuko Void Sovereign — drifting crimson-pink Blood-Demon-Art ember motes, ON TOP of the void sprite
    drawTojiVoidOverlay(c, fighter)          // Toji Void Killer — drifting deep-red particles, ON TOP of the void-black sprite (tracks the sword/chain specials)
    drawMorpherVoidOverlay(c, fighter)       // Red Ranger Morpher Void — drifting morpher-red particles + morph-flash pulse-rings, ON TOP of the void-black sprite
    drawKamuiVoidOverlay(c, fighter)         // Tobi Kamui Void — drifting violet/red particles + rotating Kamui portal swirl-pulses, ON TOP of the void-black sprite
    drawHashiramaSpecOverlay(c, fighter)     // Hashirama spec skins — glowing eyes (Golden Sage amber / Ashen Reanimation white-blue / White Binding green) + green Wood-Release Void aura, ON TOP of the sprite (self-gates on skinId)
    drawHashiramaMotifOverlay(c, fighter)    // Hashirama motif — gold Senju spiral crest (Senju Spiral) + gold collar/shoulder trim ticks (Golden Sage), stamped on the torso (self-gates on skinId)
    drawEdoReanimOverlay(c, fighter)         // Edo Tensei reanimation — decay mottling + stitched seams over the green-gray reanimated vessel (gated fighter._edoActive)
    // Obito's sustained Kamui swirl REMOVED (correction): while intangible he is visually IDENTICAL to
    // normal — the only tell is the one-time activation pose (obitoKamuiActivate). drawObitoKamuiAura is
    // retained (unused) for reference. Tobi keeps its OWN independent aura below.
    drawTobiKamuiAura(c, fighter)      // Tobi Kamui Intangibility — same swirl, orange focal core (Tobi only, while `_tobiPhased`); independent of Obito
    drawObitoVoidOverlay(c, fighter)   // Obito "Void Mask" skin — drifting Sharingan-red/purple particles + periodic Kamui-portal swirl pulses, ON TOP of the near-black sprite (gated on skinId obitoVoid)
    drawTobiCelestialOverlay(c, fighter)   // Tobi "Celestial Veil" skin — serene pastel star-lights + soft nebulae over the pale lavender base (gated on skinId tobiCelestial)
    drawPainVoidOverlay(c, fighter)    // Pain "Void Path" skin — drifting deep-red motes + expanding gravity ripple-pulses, ON TOP of the near-black sprite (gated on skinId painVoidPath)
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

  // KAMUI GHOST: while phased, render Obito's body semi-transparent — the clear, opponent-visible
  // "intangible is ON" cue. Turning it off just clears _kamuiPhased → full opacity again (silent revert).
  // NB: Obito's `_kamuiPhased` intentionally does NOT dim the body — while intangible he looks COMPLETELY
  // NORMAL (the ONLY tell is the one-time activation pose). `_tobiPhased` (the separate Tobi char) keeps its
  // own ghost.
  // TOJI FLY HEADS self-vanish: while the fade window runs, Toji drops to ~14% opacity (near-invisible),
  // easing in/out so it doesn't hard-pop. Render-only (no i-frames) — see abilities.fireTojiFlyHeads.
  // GHOSTFACE staging (render-only): Stalk-Vanish off-screen fade + opposite-edge slide-in, and the killer-
  // swap EXIT/FLASH/EMERGE body opacity. dx is a world-space DRAW offset — the hitbox/logic x never move.
  const _gfP = (fighter.rosterKey === "ghostface" || fighter._gfSwapActive || fighter._gfVanish || fighter._gfSwapCine) ? getGhostfacePresentation(fighter) : null
  const bodyAlpha = revealAlpha * (fighter._tobiPhased ? 0.4 : 1) * _tojiFlyFadeAlpha(fighter) * (_gfP ? _gfP.alpha : 1)
  const gfDX = _gfP ? _gfP.dx : 0

  if (!fighter.tintColor) {
    if (bodyAlpha >= 1 && gfDX === 0) { drawTo(ctx); return }
    ctx.save(); ctx.globalAlpha *= bodyAlpha; if (gfDX) ctx.translate(gfDX, 0); drawTo(ctx); ctx.restore(); return
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
  if (bodyAlpha < 1) ctx.globalAlpha *= bodyAlpha   // intro delayed-reveal fade + Kamui ghost (tinted mirror path)
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

// ─────────────────────────────────────────────────────────────────────────────
// COMBAT HIT FX — real multi-particle bursts (Stage 1). PURE RENDER/UPDATE LAYER:
// reads the SAME spark data combat.js/domains.js already push (category/color/radius);
// it just draws it as scattering, gravity-pulled, independently-fading debris instead
// of a static flower of radiating lines. Particles are seeded lazily onto the pooled
// spark (spark._particles) and simulated in the effects tick; the pool clears the field
// on release so nothing leaks between reuses. Math.random is intentional here (visual-
// only, excluded from the gameplay RNG per rng.js). Optional per-spark override:
// `particleCount` (a push site MAY set it; none need to).
// ─────────────────────────────────────────────────────────────────────────────
// Per-category burst profile. count/size/speed scale with the hit's weight; grav/drag
// tuned so particles pop out, arc, and FALL. Stage 1 is isotropic (full-circle) scatter;
// category-specific SHAPE bias (upward launcher cone, downward spike puff) lands in Stage 2.
// Per-category burst profile. Stage 2 gives each a distinct SHAPE via `dir` (emission centre angle;
// canvas Y is DOWN, so −π/2 = up, +π/2 = down) and `arc` (half-spread; π = full isotropic circle):
//   • launcher → tight UPWARD cone, low gravity (debris SHOOTS up — "sent flying"),
//   • spike    → wide DOWNWARD/sideways ground puff, high gravity, dusty tan color (ground impact),
//   • block    → small tight UPWARD deflection off the guard (reads "stopped", not "landed"),
//   • light/heavy/special/ultimate/parry/clash → isotropic scatter (heavier = more/bigger/faster).
// `shake` = a brief camera-shake tie-in fired once when the spark spawns (heavy/spike thud).
const _SPARK_FX = {
  light:    { count: 8,  speed: 3.2, grav: 0.17, drag: 0.90, size: [1.4, 2.6], life: [11, 17], up: 0.30, dir: 0,            arc: Math.PI },
  heavy:    { count: 14, speed: 4.4, grav: 0.19, drag: 0.90, size: [1.8, 3.4], life: [15, 24], up: 0.30, dir: 0,            arc: Math.PI, shake: 4 },
  launcher: { count: 16, speed: 5.2, grav: 0.09, drag: 0.93, size: [1.6, 3.0], life: [20, 30], up: 0.55, dir: -Math.PI / 2, arc: 0.6 },
  spike:    { count: 16, speed: 4.0, grav: 0.24, drag: 0.87, size: [1.7, 3.2], life: [12, 20], up: 0.00, dir:  Math.PI / 2, arc: 1.5, dust: true, shake: 4 },
  special:  { count: 18, speed: 4.8, grav: 0.16, drag: 0.91, size: [1.8, 3.6], life: [18, 28], up: 0.28, dir: 0,            arc: Math.PI },
  ultimate: { count: 26, speed: 5.6, grav: 0.15, drag: 0.92, size: [2.0, 4.2], life: [22, 34], up: 0.26, dir: 0,            arc: Math.PI },
  clash:    { count: 14, speed: 4.6, grav: 0.14, drag: 0.91, size: [1.8, 3.4], life: [16, 24], up: 0.20, dir: 0,            arc: Math.PI },
  parry:    { count: 10, speed: 4.0, grav: 0.10, drag: 0.92, size: [1.6, 3.0], life: [14, 22], up: 0.15, dir: 0,            arc: Math.PI },
  block:    { count: 7,  speed: 2.8, grav: 0.14, drag: 0.86, size: [1.3, 2.2], life: [8,  13], up: 0.55, dir: -Math.PI / 2, arc: 0.9 },
}
const _SPARK_PARTICLE_CAP = 40   // hard per-spark ceiling (guards an override / future heavy category)

// The effect SHAPE for a spark: block flag wins, then the category (which already carries
// "launcher"/"spike" from combat's _catFromName), then a light fallback.
function _sparkShape(spark) {
  if (spark.blocked) return "block"
  return (spark.category && _SPARK_FX[spark.category]) ? spark.category : "light"
}
function _sparkCfg(spark) { return _SPARK_FX[_sparkShape(spark)] || _SPARK_FX.light }

// Seed the individual particles once, reading the existing spark fields. Each gets its own
// outward velocity within the shape's emission cone (+ an upward pop so it arcs), size, and life.
function _seedSparkParticles(spark) {
  const cfg = _sparkCfg(spark)
  const want = spark.particleCount != null ? spark.particleCount : cfg.count
  const count = Math.max(0, Math.min(_SPARK_PARTICLE_CAP, want | 0))
  const r = spark.radius || 14
  const baseSpeed = cfg.speed * (0.75 + r / 48)          // bigger-radius categories scatter wider
  const dir = cfg.dir || 0
  const arc = cfg.arc != null ? cfg.arc : Math.PI         // π ⇒ full circle (isotropic)
  if (cfg.dust) spark._pColor = "#c9b48f"                 // ground-puff debris reads as tan dust, not energy
  const parts = new Array(count)
  for (let i = 0; i < count; i++) {
    const ang = dir + (Math.random() * 2 - 1) * arc       // emission cone around `dir`
    const sp  = baseSpeed * (0.5 + Math.random())
    const life = cfg.life[0] + ((Math.random() * (cfg.life[1] - cfg.life[0] + 1)) | 0)
    parts[i] = {
      x: spark.x, y: spark.y,
      vx: Math.cos(ang) * sp,
      vy: Math.sin(ang) * sp - baseSpeed * cfg.up,       // upward pop → arc → fall
      life, maxLife: life,
      size: cfg.size[0] + Math.random() * (cfg.size[1] - cfg.size[0]),
      rot: Math.random() * Math.PI, spin: (Math.random() - 0.5) * 0.4,
    }
  }
  spark._particles = parts
}

// Advance one frame of particle physics (seed lazily on first tick). Returns the live count
// so the effects loops can keep a spark alive until its debris has finished falling.
function _tickSparkParticles(spark) {
  if (spark._particles == null) _seedSparkParticles(spark)
  const parts = spark._particles
  if (!parts || !parts.length) return 0
  const cfg = _sparkCfg(spark)
  let alive = 0
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]
    if (p.life <= 0) continue
    p.x += p.vx; p.y += p.vy
    p.vy += cfg.grav
    p.vx *= cfg.drag; p.vy *= cfg.drag
    p.rot += p.spin
    if (--p.life > 0) alive++
  }
  spark._pAlive = alive
  return alive
}

function drawHitSparksEnhanced() {
  if (!hitSparks.length) return
  // NOTE: this runs INSIDE drawBattleScene's active camera transform — do NOT
  // re-apply it here or sparks get double-transformed (drawn way off-screen as
  // giant glowing artifacts: the "screen glitches out on attack" bug).
  for (const spark of hitSparks) {
    const { x, y, category, color, timer, maxTimer, radius } = spark
    const c = color || "#fff1a8"
    const r = radius || 14
    // Core flash fades on the (short) combat timer; particles fade on their OWN life.
    const coreAlpha = Math.max(0, Math.min(1, timer / Math.max(1, maxTimer || timer)))
    ctx.save()

    // ── PARTICLE BURST (Stage 1) — scattering debris/energy that arcs and falls ──
    // No shadowBlur per particle (the expensive canvas op); the streak+head reads bright on its own.
    const parts = spark._particles
    if (parts) {
      const pc = spark._pColor || c                       // spike debris is tan dust; else the hit color
      ctx.lineCap = "round"
      ctx.strokeStyle = pc
      ctx.fillStyle = pc
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i]
        if (p.life <= 0) continue
        const pa  = p.life / p.maxLife
        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
        const nx  = spd > 0.01 ? p.vx / spd : Math.cos(p.rot)
        const ny  = spd > 0.01 ? p.vy / spd : Math.sin(p.rot)
        const tail = Math.min(11, 2.5 + spd * 1.3)       // faster → longer streak
        ctx.globalAlpha = pa
        ctx.lineWidth = Math.max(1, p.size * 0.85)
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - nx * tail, p.y - ny * tail); ctx.stroke()
        ctx.globalAlpha = Math.min(1, pa * 1.25)         // bright head dot
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size)
      }
    }

    // ── CORE FLASH — a SHAPE-SPECIFIC treatment per category (quick bright pop under the debris) ──
    if (coreAlpha > 0.01) {
      const shape = _sparkShape(spark)
      ctx.globalAlpha = coreAlpha
      if (shape === "launcher") {
        // Upward energy chevron — sells "sent flying up" (distinct from a flat round pop).
        ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.lineCap = "round"
        ctx.shadowBlur = 8; ctx.shadowColor = c
        const h = r * 1.4
        ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x - r * 0.5, y - h * 0.35); ctx.moveTo(x, y - h); ctx.lineTo(x + r * 0.5, y - h * 0.35); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(x, y - h * 0.9); ctx.lineTo(x, y + r * 0.2); ctx.stroke()
        ctx.shadowBlur = 0
      } else if (shape === "spike") {
        // Flat ground-impact dust smear at the point — a low wide ellipse, downward read.
        ctx.fillStyle = "#c9b48f66"
        ctx.beginPath(); ctx.ellipse(x, y + r * 0.35, r * 1.5, r * 0.42, 0, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = "#e8dcc0aa"; ctx.lineWidth = 2
        ctx.beginPath(); ctx.moveTo(x - r * 1.3, y + r * 0.5); ctx.lineTo(x + r * 1.3, y + r * 0.5); ctx.stroke()
      } else if (shape === "block") {
        // A bright DEFLECTION ARC over the guard — reads "stopped", NOT a landed round burst.
        ctx.strokeStyle = "#cfe8ff"; ctx.lineWidth = 3.5; ctx.lineCap = "round"
        ctx.shadowBlur = 8; ctx.shadowColor = "#9ecbff"
        ctx.beginPath(); ctx.arc(x, y, r * 1.1, Math.PI * 1.18, Math.PI * 1.82); ctx.stroke()
        ctx.shadowBlur = 0
      } else {
        if (shape === "heavy" || shape === "special" || shape === "ultimate" || shape === "clash") {
          ctx.shadowBlur  = (shape === "ultimate" || shape === "special") ? 12 : 0
          ctx.shadowColor = c
          ctx.fillStyle   = c + "55"
          ctx.beginPath(); ctx.arc(x, y, r * 0.4, 0, Math.PI * 2); ctx.fill()
          ctx.shadowBlur  = 0
        }
        // Special/Ultimate: real EXPANDING SHOCKWAVE ring(s) layered over the debris (ultimate = double).
        if (shape === "ultimate" || shape === "special" || shape === "clash") {
          const ringR = r * 0.5 + r * 1.7 * (1 - coreAlpha)
          ctx.strokeStyle = c + "77"; ctx.lineWidth = shape === "ultimate" ? 3 : 2
          ctx.beginPath(); ctx.arc(x, y, ringR, 0, Math.PI * 2); ctx.stroke()
          if (shape === "ultimate") {
            ctx.strokeStyle = c + "33"; ctx.lineWidth = 2
            ctx.beginPath(); ctx.arc(x, y, ringR * 0.55, 0, Math.PI * 2); ctx.stroke()
          }
        }
        if (shape === "parry") {
          ctx.strokeStyle = "#38bdf8"; ctx.lineWidth = 3
          ctx.beginPath(); ctx.arc(x, y, r * (0.5 + 0.5 * (1 - coreAlpha)), 0, Math.PI * 2); ctx.stroke()
        }
      }
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

// HOLD-TO-CHARGE aura: the generic "gathering energy" charge-up effect for any meter fighter holding P
// that DOESN'T ship its own dedicated charge sprite. Original procedural design (no art, no trace):
// a TIGHT, upward-coiling blue/cyan spiral that funnels INWARD as it rises (converging = gathering) and
// caps in a bright convergence point above the head, with cyan energy MOTES streaming up the coil. Twin
// depth-shaded ribbons fake front/behind wrap in 2D. Fixed cyan/blue palette (deliberately not tinted to
// f.energyColor — a consistent, better-reading "charge-up" look than the old yellow vortex). Brighter as
// the meter fills. Everything is driven off globalFrameCount (deterministic — no Math.random in the loop).
const CHARGE_CORE = "#eaf7ff"   // near-white hot core / motes
const CHARGE_NEAR = "#38bdf8"   // cyan — the near (front) half of the coil
const CHARGE_FAR  = "#1d4ed8"   // deep blue — the far (behind) half
function _drawChargeAura(f) {
  if (!f || !f.isCharging) return
  // Fighters with their own charge-aura SPRITE (Goku Black's power-up/Rose strips, Killua/Netero's charge
  // strips) normally render that INSTEAD — skip the procedural aura so the two don't stack.
  if (f._skinAnim?.charge || f.animationData?.charge) {
    // EXCEPTION — Netero: once his Guanyin charge animation has played through to its HELD last frame, layer
    // the generic cyan energy vortex AROUND the settled pose (his charge is loop:false + lockLastFrame, so it
    // parks on the final frame). During the buildup (still animating toward the last frame) → don't layer yet.
    if ((f.rosterKey || "").toLowerCase() !== "netero") return
    const sh = f.spriteHandler, def = sh?._actionDef
    const heldOnLastChargeFrame = def && f._lastSpriteAction === "charge" && (sh.frameIndex >= (def.frames || 1) - 1)
    if (!heldOnLastChargeFrame) return
  }
  _chargeAuraRenderCount++

  const cx    = f.x + f.w / 2, baseY = f.y + f.h
  const pct   = Math.max(0, Math.min(1, (f.energy || 0) / (f.maxEnergy || 1)))
  const bright = 0.55 + pct * 0.45                 // meter-fill brightness

  const H     = f.h * (1.02 + pct * 0.26)          // coil height — rises past the head as the meter fills
  const Rbase = Math.max(f.w * 0.44, 24)           // TIGHT, compact swirl that hugs the body (chakra-mold look)
  const spin  = globalFrameCount * 0.34            // FAST rotation — a whipping chakra vortex, not a gentle glow
  const TURNS = 5.0                                // more coils packed over the height = a dense tight spiral
  const STRANDS = 2                                // twin intertwined ribbons
  const SEG   = 40                                 // fewer, longer segments read sharper/more angular
  // radius funnels inward toward the crown (convergence): feet ≈ Rbase → crown ≈ 0.24·Rbase
  const radAt = u => Rbase * (1 - u * 0.76) * (0.9 + 0.18 * Math.sin(Math.PI * u))
  // CRACKLE: deterministic per-segment jaggedness (two out-of-phase high-freq sines → chaotic, not a clean
  // wave) that also SHIVERS each frame. Perturbs the radius (kinks in/out) and the angle (whips sideways) so
  // the coil reads as a crackling chakra vortex rather than a smooth curve. Grows a touch as the meter fills.
  const jagAmp = 0.5 + pct * 0.2
  const jag = (i, s) => Math.sin(i * 2.7 + globalFrameCount * 0.9 + s * 2.1) * Math.sin(i * 1.13 + globalFrameCount * 0.5)

  ctx.save()
  ctx.lineCap = "butt"; ctx.lineJoin = "miter"; ctx.miterLimit = 2   // hard corners → jagged, electric

  // faint gathering pool at the feet (energy pooling before it rises)
  ctx.globalAlpha = 0.15 * bright
  ctx.shadowColor = CHARGE_NEAR; ctx.shadowBlur = 12; ctx.fillStyle = CHARGE_NEAR
  ctx.beginPath(); ctx.ellipse(cx, baseY - 2, Rbase * 0.7, f.h * 0.05, 0, 0, Math.PI * 2); ctx.fill()

  let sampleX = cx
  for (let s = 0; s < STRANDS; s++) {
    const strandPhase = spin + s * Math.PI          // the two ribbons sit on opposite sides of the coil
    let prev = null
    for (let i = 0; i <= SEG; i++) {
      const u     = i / SEG                          // 0 = feet → 1 = crown
      const j     = jag(i, s)
      const theta = u * TURNS * Math.PI * 2 + strandPhase + j * 0.22   // angular whip (jagged sideways kicks)
      const rx    = radAt(u) * (1 + jagAmp * j)                        // radial crackle (kinks in/out)
      const x     = cx + Math.cos(theta) * rx
      const y     = baseY - u * H - j * 2.2                            // small vertical jitter → sharper zigzag
      const front = (Math.sin(theta) + 1) * 0.5      // 1 = near (front of body), 0 = far (behind)
      const fade  = 0.4 + 0.6 * Math.sin(Math.PI * u)   // soften the feet/crown ends
      if (prev) {
        // depth-shaded segment: near half = bright cyan/thick/glowing (in front), far half = deep blue/thin
        ctx.strokeStyle = front > 0.5 ? CHARGE_NEAR : CHARGE_FAR
        ctx.shadowColor = front > 0.5 ? "#7dd3fc" : CHARGE_FAR
        ctx.globalAlpha = Math.max(0, Math.min(1, (0.20 + front * 0.80) * bright * fade))
        ctx.lineWidth   = (0.8 + front * 2.4) * (0.7 + pct * 0.5)
        ctx.shadowBlur  = 2 + front * 6      // less glow → the hard jagged kinks stay crisp (crackle, not haze)
        ctx.beginPath(); ctx.moveTo(prev.x, prev.y); ctx.lineTo(x, y); ctx.stroke()
        // crackle spark: a tiny bright node at a sharp kink (|jag| peak) → sells the electric snap
        if (front > 0.6 && Math.abs(j) > 0.82) {
          ctx.save(); ctx.globalAlpha = 0.9 * bright * fade; ctx.fillStyle = CHARGE_CORE
          ctx.shadowColor = CHARGE_NEAR; ctx.shadowBlur = 6
          ctx.beginPath(); ctx.arc(x, y, 1.1 + pct * 0.9, 0, Math.PI * 2); ctx.fill(); ctx.restore()
        }
      }
      if (s === 0 && i === Math.round(SEG * 0.5)) sampleX = x   // real drawn mid-coil x (harness rotation probe)
      prev = { x, y }
    }
  }

  // Rising MOTES — the "gathering energy" tell: cyan-white sparks that spawn low, climb the coil while
  // funnelling inward, and fade out as they converge at the crown. Wrap continuously (a steady updraft).
  const MOTES = 5
  ctx.fillStyle = CHARGE_CORE; ctx.shadowColor = CHARGE_NEAR
  for (let m = 0; m < MOTES; m++) {
    const mu    = ((globalFrameCount * 0.019) + m / MOTES) % 1     // height fraction, rising over time
    const theta = mu * TURNS * Math.PI * 2 + spin + m * 1.7
    const mx    = cx + Math.cos(theta) * radAt(mu) * 0.92
    const my    = baseY - mu * H
    ctx.globalAlpha = 0.9 * bright * Math.sin(Math.PI * mu)        // fade in low, out high
    ctx.shadowBlur  = 9
    ctx.beginPath(); ctx.arc(mx, my, 1.4 + pct * 1.7, 0, Math.PI * 2); ctx.fill()
  }

  // bright convergence "head" where the spiral funnels to a point above the fighter
  const headTheta = TURNS * Math.PI * 2 + spin
  const headX = cx + Math.cos(headTheta) * radAt(1) * 0.6
  ctx.globalAlpha = 0.9 * bright
  ctx.fillStyle = CHARGE_CORE; ctx.shadowColor = CHARGE_NEAR; ctx.shadowBlur = 15 + pct * 10
  ctx.beginPath(); ctx.arc(headX, baseY - H, 2.4 + pct * 2.6, 0, Math.PI * 2); ctx.fill()

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

// ── EDO TENSEI — standing Tobirama dummy (world space) ───────────────────────
// During the window the controlled fighter IS the vessel; Tobirama's own body stays on screen as a
// non-controllable, HITTABLE dummy next to the tomb (snapshotted in applyEdoTensei → fighter._edoDummy).
// Drawn directly in world coords (the camera transform is already applied by drawBattleScene). A hittable
// hurtbox and the hit→cancel are handled in checkEdoDummyHit (combat side).
const _edoDummyImgs = new Map()
function _edoDummyImg(src) { if (!_edoDummyImgs.has(src)) { const i = new Image(); i.src = src; _edoDummyImgs.set(src, i) } return _edoDummyImgs.get(src) }

// MINATO FLYING RAIJIN — world-space teleport marks. A yellow kunai-seal glyph at each placed mark
// (minato_kuni_knife_baragge.png = the 8-kunai spread), the SELECTED one brighter + larger with a
// pulsing ring, plus a one-shot flash ellipse at the arrival point on a recall. Drawn AFTER summons.
let _frMarkImg = null, _frPortalImg = null
function drawFlyingRaijinMarks(fighter) {
  if (!fighter || (fighter.rosterKey || "").toLowerCase() !== "minato") return
  const marks = fighter._frMarks || []
  if (!_frMarkImg) { _frMarkImg = new Image(); _frMarkImg.src = "./minato_kuni_knife_baragge.png" }
  const sel   = Math.min(Math.max(fighter._frSel || 0, 0), Math.max(0, marks.length - 1))
  const footH = fighter.h || 100
  for (let i = 0; i < marks.length; i++) {
    const m = marks[i]
    const footY = m.y + footH
    const selected = i === sel
    ctx.save()
    ctx.globalAlpha = selected ? 0.95 : 0.55
    ctx.strokeStyle = selected ? "#fde047" : "#f59e0b"
    ctx.lineWidth = selected ? 3 : 2
    ctx.beginPath(); ctx.ellipse(m.x, footY - 6, selected ? 24 : 16, selected ? 9 : 6, 0, 0, Math.PI * 2); ctx.stroke()
    if (_frMarkImg.complete && _frMarkImg.naturalWidth) {
      const s = selected ? 0.55 : 0.42
      const w = _frMarkImg.naturalWidth * s, h = _frMarkImg.naturalHeight * s
      ctx.drawImage(_frMarkImg, m.x - w / 2, footY - h - 4, w, h)
    }
    ctx.restore()
  }
  const fx = fighter._frTeleportFxAt
  if (fx && (fighter.teleportFlash || 0) > 0) {
    if (!_frPortalImg) { _frPortalImg = new Image(); _frPortalImg.src = "./minato_yellow_flash_teleport.png" }
    ctx.save()
    ctx.globalAlpha = (fighter.teleportFlash / 12) * 0.95
    if (_frPortalImg.complete && _frPortalImg.naturalWidth) {
      const s = 1.15, w = _frPortalImg.naturalWidth * s, h = _frPortalImg.naturalHeight * s
      ctx.drawImage(_frPortalImg, fx.x - w / 2, fx.y + footH * 0.5 - h / 2, w, h)   // Flying-Raijin flash portal
    } else {
      ctx.strokeStyle = "#fde047"; ctx.lineWidth = 4
      const r = (12 - fighter.teleportFlash) * 7 + 12
      ctx.beginPath(); ctx.ellipse(fx.x, fx.y + footH * 0.5, r * 0.55, r, 0, 0, Math.PI * 2); ctx.stroke()
    }
    ctx.restore()
  }
}
function drawEdoDummy(fighter) {
  const d = fighter && fighter._edoActive && fighter._edoDummy
  if (!d || !d.sheet) return
  const img = _edoDummyImg(d.sheet)
  if (!img.complete || img.naturalWidth === 0) return
  const scale = (d.spriteScale || 1)
  const dw = d.sw * scale, dh = d.sh * scale
  const fi = Math.floor((d._f = (d._f || 0) + 1) / 10) % Math.max(1, d.frames)   // slow idle cycle
  const cx = d.x + d.w / 2, footY = d.y + d.h    // anchor at the feet so it stands on the ground like a fighter
  ctx.save()
  ctx.translate(cx, footY - dh)
  if (d.facing < 0) { ctx.translate(dw, 0); ctx.scale(-1, 1) }
  ctx.drawImage(img, fi * d.sw, 0, d.sw, d.sh, 0, 0, dw, dh)
  ctx.restore()
}

// A hurtbox for the standing dummy (mirrors combat.getHurtbox's inset so reach feels consistent).
function _edoDummyRect(d) { return { x: d.x + 6, y: d.y + 6, w: Math.max(1, d.w - 12), h: Math.max(1, d.h - 6) } }
// The counter-play resolver. If the opponent's active swing OR one of their projectiles overlaps the
// standing Tobirama, deal that hit's (scaled) damage to the SHARED health bar and de-summon immediately.
// Floors the shared HP at 1 so the interrupt itself can't be the KO (a normal follow-up still finishes).
function checkEdoDummyHit(fighter) {
  if (!fighter || !fighter._edoActive || !fighter._edoDummy || fighter._edoEnding) return
  const opp = getOpponent(fighter)
  if (!opp) return
  const rect = _edoDummyRect(fighter._edoDummy)
  let raw = 0
  const a = opp.currentAttack
  // Melee: the opponent auto-FACES the (far-away) vessel, so a strict directional hitbox rarely reaches
  // Tobirama standing at the edge. Count a hit when the active swing's hitbox OR the attacker's own body
  // overlaps the dummy — i.e. the opponent has walked over to Tobirama and is swinging on him. Gated on
  // ACTIVE frames + not-yet-consumed so it reads like a real connect (and one swing = one target).
  if (a && !a.hasHit && attackIsActive(a)) {
    const hb = getAttackHitbox(opp)
    if ((hb && rectsOverlap(hb, rect)) || rectsOverlap(getHurtbox(opp), rect)) { a.hasHit = true; raw = a.damage || 30 }
  }
  if (!raw) {
    for (let i = activeProjectiles.length - 1; i >= 0; i--) {
      const p = activeProjectiles[i]
      if (!p || p.owner !== opp) continue
      const r = p.radius || p.size || (p.w && p.h ? Math.max(p.w, p.h) / 2 : 10)
      if (rectsOverlap({ x: p.x - r, y: p.y - r, w: r * 2, h: r * 2 }, rect)) { activeProjectiles.splice(i, 1); raw = p.damage || 30; break }
    }
  }
  if (!raw) return
  const dmg = Math.max(1, Math.floor(raw * GLOBAL_DAMAGE_SCALE))
  const d = fighter._edoDummy
  applyScaledDamage(fighter, dmg, { scale: 1, floor: 1, source: "edo-cancel" })   // dmg already scaled above; funnel the write through the choke-point
  spawnDamageNumber({ x: d.x + d.w / 2, y: d.y, damage: dmg, category: "special" })
  camera.shake?.(10, 8)
  endEdoTenseiWindow(fighter, getStageWorldWidth())
}

// The world-y range the camera currently sees (screen top→bottom un-projected through the transform),
// padded so camera shake/smoothing can't briefly expose an un-covered edge. Fed to drawBattleBackground
// so the stage backdrop always fills the full view — the fix for fullscreen's bottom-favouring gap.
function cameraCoverY() {
  const ch = canvas.height
  const zoom = camera.zoom || 1
  const half = (ch / zoom) / 2
  const margin = 160
  return { top: camera.y - half - margin, bottom: camera.y + half + margin }
}

function drawBattleScene() {
  const stage = getStageTheme()
  const hasTransform = typeof camera.applyTransform === "function"
  ctx.save()

  // 1) Stage background — WORLD space. Skipped while a domain fully covers the
  //    screen (kept during the fade-out so the domain dissolves back to it).
  if (hasTransform) camera.applyTransform(ctx, canvas)   // applyTransform does its own ctx.save()
  // The visible world-y span under the live camera (+margin for shake/smoothing) so the backdrop covers
  // the whole view — no undrawn band above the sky or below the floor at any viewport height/ratio.
  if (activeDomains.length === 0) drawBattleBackground(ctx, canvas, stage, groundY, getStageFloorHeight(), cameraCoverY())
  if (hasTransform && typeof camera.clearTransform === "function") camera.clearTransform(ctx)

  // 2) Domain background — SCREEN space, fullscreen. Drawn outside the camera
  //    transform so the Gojo void video / Sukuna shrine covers the ENTIRE
  //    viewport regardless of zoom/pan (was world-clipped to a small region),
  //    and on top of the stage so the fade-out reveals it. No-ops when idle.
  if (typeof drawDomainBackground === "function") drawDomainBackground(ctx, canvas, groundY, getStageFloorHeight())

  // 3) Everything else — WORLD space, on top of the domain backdrop.
  if (hasTransform) camera.applyTransform(ctx, canvas)
  drawDomains(ctx)
  drawStageHazards(ctx)   // STAGE INTERACTABLES pilot — draw hazards behind the fighters (world space)
  drawPlatforms(ctx)      // Wood Release climbable terrain — draw platforms behind the fighters (world space; Stage 1 procedural rect = collision box)
  drawProjectiles(ctx, activeProjectiles, camera)
  renderHybridFighter(p1)
  renderHybridFighter(p2)
  drawEdoDummy(p1)   // Tobirama Edo Tensei: the standing, hittable Tobirama body next to the tomb (world space)
  drawEdoDummy(p2)
  // Shikigami/summons drawn AFTER the fighters (world space) so Megumi's Divine
  // Dog / Nue / Toad etc. are never hidden behind a fighter sprite — they were
  // previously drawn underneath and could be occluded near the action.
  drawActiveSummons(ctx)
  // Hashirama Sealing Jutsu domain overlay — WORLD space so the gates/cameos track the trapped opponent
  // as the live camera moves (drawn over the fighters). No-op when the domain isn't up.
  drawHashiramaSealingJutsuCinematic(ctx)
  drawFlyingRaijinMarks(p1)
  drawFlyingRaijinMarks(p2)
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
  if (susFighter) drawSusanooTimer?.(ctx, canvas, susFighter._susanooTimer || 0, SASUKE_SUSANOO_DURATION_FRAMES)   // Sasuke-only bar → Stage-3e ~13.3s max
  drawLowHealthWarning?.(ctx, canvas, p1, p2, globalFrameCount)

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

// MK1/Tekken-8 combo counter (Stage 2): the number ESCALATES in size + heat as the count
// climbs (2 hits reads small/white, 20 hits reads huge/red), punches on each new hit (ds.pop),
// and is drawn metallic — italic slant, dark outline, tier-colored glow, accent underline —
// matching the Stage-1 HUD direction. Visual-only; reads comboDisplay state, changes no combat.
function _drawComboCounters() {
  const cw = canvas.width, ch = canvas.height
  const baseY = ch * 0.38
  for (const side of ["p1","p2"]) {
    const ds    = comboDisplay[side]
    const count = ds.lastCount
    if (ds.opacity <= 0 || count < 2) continue
    const isP1  = side === "p1"
    const baseX = isP1 ? cw * 0.22 : cw * 0.78
    // Heat tiers (align with Stage-1 battle-worn palette): white → gold → orange → blood-red.
    const color   = count >= 15 ? "#ff4d4d" : count >= 9 ? "#ff8a3d" : count >= 5 ? "#ffd24a" : "#f4f4f5"
    const accent  = count >= 15 ? "#d64b4b" : count >= 9 ? "#e0722e" : count >= 5 ? "#d7a13e" : "#7dd3fc"
    // Steeper escalation than before (was 48→72): 2 hits ≈ 46px, ramps ~6px/hit, caps ~140px.
    const base    = Math.min(140, 46 + (count - 2) * 6)
    const pop     = Math.max(0, ds.pop || 0)
    const fontSize = base * (1 + pop * 0.32)           // per-hit scale punch
    const slant    = isP1 ? 0.12 : -0.12               // lean the number toward the opponent (Tekken feel)

    ctx.save()
    ctx.globalAlpha = Math.max(0, ds.opacity)
    ctx.textAlign   = "center"; ctx.textBaseline = "middle"

    // Slanted, outlined, glowing number
    ctx.save()
    ctx.translate(baseX, baseY - 14)
    ctx.transform(1, 0, slant, 1, 0, 0)                // italic skew
    ctx.font = `900 ${fontSize}px Arial`
    ctx.lineJoin = "round"
    ctx.lineWidth = Math.max(3, fontSize * 0.07)
    ctx.strokeStyle = "rgba(6,8,12,0.92)"              // dark metallic outline
    ctx.strokeText(String(count), 0, 0)
    ctx.shadowBlur = 16 + pop * 22; ctx.shadowColor = color
    // vertical sheen: bright top → tier color bottom
    const g = ctx.createLinearGradient(0, -fontSize * 0.5, 0, fontSize * 0.5)
    g.addColorStop(0, "#ffffff"); g.addColorStop(0.45, color); g.addColorStop(1, accent)
    ctx.fillStyle = g
    ctx.fillText(String(count), 0, 0)
    ctx.restore()

    // Accent underline sized to the number (angular metallic touch)
    ctx.shadowBlur = 0
    const uw = fontSize * 0.62
    const uy = baseY - 14 + fontSize * 0.52
    const ug = ctx.createLinearGradient(baseX - uw / 2, 0, baseX + uw / 2, 0)
    ug.addColorStop(0, "rgba(0,0,0,0)"); ug.addColorStop(0.5, accent); ug.addColorStop(1, "rgba(0,0,0,0)")
    ctx.fillStyle = ug
    ctx.fillRect(baseX - uw / 2, uy, uw, Math.max(2, fontSize * 0.03))

    // "HIT COMBO" label — tracked-out caps under the underline
    const labelSize = Math.max(12, Math.floor(base * 0.24))
    ctx.font = `800 ${labelSize}px Arial`
    ctx.fillStyle = "rgba(240,244,248,0.9)"
    ctx.shadowBlur = 6; ctx.shadowColor = "rgba(0,0,0,0.8)"
    ctx.fillText("H I T   C O M B O", baseX, uy + labelSize)
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

// Stage 9: punchy angular "K.O." slam — zoom-punch (big → settle) + shake + red accent flash + slash
// bars, layered over the white KO flash. Metallic language (dark outline, red gradient, accent glow).
function _drawKoStamp() {
  if (_koStamp <= 0) return
  const cw = canvas.width, ch = canvas.height
  const p = 1 - _koStamp / _koStampMax           // 0 → 1 over the stamp's life
  const inP = Math.min(1, p / 0.22)               // fast slam-in
  const scale = 1.7 - 0.7 * (1 - Math.pow(1 - inP, 3))   // 1.7 → 1.0 (ease-out)
  const alpha = _koStamp < 10 ? _koStamp / 10 : 1        // fade out at the tail
  const shake = inP < 1 ? (1 - inP) * 9 : 0
  ctx.save()
  // red accent flash on the slam-in
  if (p < 0.25) { ctx.globalAlpha = (1 - p / 0.25) * 0.35; ctx.fillStyle = "#ff2a2a"; ctx.fillRect(0, 0, cw, ch) }
  ctx.globalAlpha = alpha
  ctx.translate(cw / 2 + Math.sin(_koStamp * 1.9) * shake, ch * 0.42)
  ctx.scale(scale, scale)
  // angular slash bars behind the text
  ctx.save(); ctx.globalAlpha = alpha * 0.8; ctx.fillStyle = "#ff3b3b"; ctx.shadowBlur = 20; ctx.shadowColor = "#ff2a2a"
  ctx.fillRect(-190, -6, 380, 4); ctx.fillRect(-150, 30, 300, 3); ctx.restore()
  // "K.O." — dark outline + white→red gradient + red glow
  ctx.font = "900 118px Arial"; ctx.textAlign = "center"; ctx.textBaseline = "middle"
  ctx.lineJoin = "round"; ctx.lineWidth = 11; ctx.strokeStyle = "rgba(6,8,12,0.92)"; ctx.strokeText("K.O.", 0, 0)
  ctx.shadowBlur = 34; ctx.shadowColor = "#ff3b3b"
  const g = ctx.createLinearGradient(0, -60, 0, 60); g.addColorStop(0, "#ffffff"); g.addColorStop(0.5, "#ff5a5a"); g.addColorStop(1, "#a81c1c")
  ctx.fillStyle = g; ctx.fillText("K.O.", 0, 0)
  ctx.restore()
  _koStamp--
}

// GHOSTFACE killer-swap FLASH (beat 2 of the 3-beat transition): a full-screen wash tinted to the
// DESTINATION identity's real skin color (crimson/indigo/bronze/magenta/green). Screen-space, over the
// fighters, under the HUD — same idiom as _drawKOFlash. Render-only; no gameplay effect.
function _drawGhostfaceSwapFlash() {
  for (const f of [p1, p2]) {
    if (!f?._gfSwapCine && !f?._gfAmbushFlash) continue   // swap 3-beat flash OR ambush-strike flash
    const p = getGhostfacePresentation(f)
    if (!p.flash || p.flash.alpha <= 0) continue
    ctx.save()
    // ADDITIVE wash: the identity colors are deliberately DARK (crimson/indigo/bronze/…), so a normal fill
    // would just darken. "lighter" ADDS the exact identity hue as light → a bright COLORED flash that still
    // reads as that killer's real palette. A faint source-over core seals the peak so it's unmistakable.
    ctx.globalCompositeOperation = "lighter"
    ctx.globalAlpha = Math.max(0, Math.min(1, p.flash.alpha))
    ctx.fillStyle   = p.flash.color
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.globalCompositeOperation = "source-over"
    ctx.globalAlpha = Math.max(0, Math.min(1, p.flash.alpha)) * 0.35
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.restore()
  }
}

function drawBattle() {
  drawBattleScene()
  if (!(typeof window !== "undefined" && window.__hideTojiSwarm))   // harness-only: hide the flies to isolate Toji's self-fade for evidence shots (swarm logic still ticks)
    drawTojiFlyHeadsSwarm(ctx, canvas)   // Toji Fly Heads — dense screen-clutter swarm OVER the fighters but UNDER the HUD (vision-denial, HP bars stay readable)
  _drawGhostfaceSwapFlash()   // Ghostface killer-swap identity-tinted flash (over fighters, under HUD)
  drawBattleHud()
  if (countdown > 0) drawRoundCountdown?.(ctx, canvas, countdown, roundNumber)
  _drawDamageNumbers()
  _drawComboCounters()
  _drawDomainHUDBar()
  _drawKOFlash()
  _drawKoStamp()   // Stage 9: angular K.O. slam over the flash
  _drawVowCue()
  drawKuramaCinematic(ctx, canvas)   // fullscreen Tailed Beast Bomb overlay, on top of all
  drawMinatoKurama(ctx, canvas)      // Minato's own Kurama TBB overlay (same layer)
  drawObitoJuubi(ctx, canvas)        // Obito's own Ten-Tails Bijūdama overlay (same layer)
  drawTobiNineTails(ctx, canvas)     // Tobi's own NINE-Tails Bijūdama overlay (same layer; independent module)
  drawSasukeCinematic(ctx, canvas)   // fullscreen Sharingan-awakening overlay (Susanoo Lv2)
  drawSSJRoseCinematic(ctx, canvas)  // fullscreen SSJ Rose transform overlay (pink flash/aura)
  drawGokuBlackSwordCinematic(ctx, canvas)  // fullscreen Sword Slash overlay (magenta flash + slash streak)
  drawRedRangerPowerSwordCinematic(ctx, canvas)  // fullscreen Power Sword overlay (red vignette + strike flash + slash streak)
  drawKilluaGodspeedCinematic(ctx, canvas)  // fullscreen Godspeed activation overlay (cyan burst flash)
  drawFlashTimeCinematic(ctx, canvas)       // fullscreen Flash Time activation overlay (red/gold burst flash)
  drawGonAdultFormCinematic(ctx, canvas)    // fullscreen Adult Form activation overlay (green burst flash)
  drawHisokaOverdriveCinematic(ctx, canvas) // fullscreen Bloodlust Overdrive activation overlay (gold/magenta burst flash)
  drawTojiReincarnationCinematic(ctx, canvas) // fullscreen Reincarnated Form activation overlay (crimson burst flash)
  drawMangekyouCinematic(ctx, canvas)       // fullscreen Mangekyou activation overlay (centered eye transformation)
  drawVegetaFinalFlashCinematic(ctx, canvas)  // fullscreen Overcharged Final Flash overlay (gold beam + impact explosion)
  drawBeerusKiBallCinematic(ctx, canvas)      // fullscreen Ki Ball overlay (charging orb → impact explosion)
  drawBen10OmnitrixCinematic(ctx, canvas)     // fullscreen Omnitrix transformation overlay (green glow → burst shockwave)
  drawBatmanDarkKnightCinematic(ctx, canvas)  // fullscreen batarang-barrage overlay (windup glow → rain → impact flash)
  drawOmniManBodySlamCinematic(ctx, canvas)   // fullscreen body-slam overlay (crimson vignette → impact flash → ground shockwave)
  drawSupermanUltimateCinematic(ctx, canvas)  // fullscreen Solar Overload overlay (green vignette → detonation flash → shockwave rings)
  drawRengokuFlameExplosionCinematic(ctx, canvas)  // fullscreen Flame Explosion overlay (ember vignette → detonation flash → flame rings)
  drawMadaraTengaiShinseiCinematic(ctx, canvas)    // fullscreen Tengai Shinsei overlay (Rinnegan sky → falling meteor → impact explosion + shockwave)
  // (Hashirama Sealing Jutsu draws in WORLD space near the trapped opponent — see drawHashiramaSealingJutsuCinematic(ctx) above, NOT here.)
  drawPainChibakuTenseiCinematic(ctx, canvas)      // fullscreen Chibaku Tensei overlay (gravity sky → growing sphere → slam → flat/dome/flame-pillar ground effect)
  drawYujiUltimateCinematic(ctx, canvas)   // fullscreen "Black Flash" buildup overlay (cyan cursed-energy vignette → red/black flash burst)
  drawShinobuButterflyCinematic(ctx, canvas)  // fullscreen Butterfly Dance overlay (violet vignette → strike flash → spiral slash rings)
  drawInosukeBeastCinematic(ctx, canvas)      // fullscreen Beast Breathing overlay (earthy vignette → strike flash → radiating slash arcs)
  drawMakiShibuyaCinematic(ctx, canvas)       // fullscreen Cursed Tool Awakening overlay (isolate + push-in + reveal flash)
  drawGhostfaceFinalActCinematic(ctx, canvas) // fullscreen The Final Act overlay (blood vignette → stab-flurry slashes → red impact flash)
  drawMiwaUltimateCinematic(ctx, canvas)   // fullscreen Blade of the Neophyte overlay (cursed-energy vignette → connect flash → slash arc)
  drawIchigoGetsugaCinematic(ctx, canvas)  // fullscreen Getsuga Tenshō overlay (reiatsu vignette → dash streak → uppercut flash + rising crescent)
  drawEdoTenseiCinematic(ctx, canvas)         // Edo Tensei summon/un-summon overlay (giant coffin + vessel reveal)
  drawMatchEntryTransition(ctx, canvas)       // MK-feel match-entry sting — directional wipe reveal, lands on ROUND 1 (over everything)
  if (aiVsAiState.active) _drawAiVsAiHud()
}

// Spectator overlay: shows this is an AI-vs-AI run — match progress, speed, and each side's AI tier.
function _drawAiVsAiHud() {
  ctx.save()
  ctx.textAlign = "center"; ctx.textBaseline = "middle"
  const cx = canvas.width / 2
  ctx.fillStyle = "rgba(8,12,28,0.72)"
  const bw = 360, bh = 40, bx = cx - bw / 2, by = canvas.height - 58
  ctx.fillRect(bx, by, bw, bh)
  ctx.strokeStyle = "rgba(124,252,152,0.5)"; ctx.lineWidth = 1; ctx.strokeRect(bx, by, bw, bh)
  ctx.font = "800 15px Arial"; ctx.fillStyle = "#7CFC98"
  ctx.fillText(`AI vs AI  ·  MATCH ${Math.min(aiVsAiState.matchesDone + 1, aiVsAiState.matchesTotal)}/${aiVsAiState.matchesTotal}  ·  ${aiVsAiState.speed}× SPEED`, cx, by + 13)
  ctx.font = "12px Arial"; ctx.fillStyle = "rgba(220,230,255,0.85)"
  ctx.fillText(`${(p1?.name || "P1")} [${aiVsAiConfig.p1Diff}]   vs   ${(p2?.name || "P2")} [${aiVsAiConfig.p2Diff}]`, cx, by + 29)
  ctx.restore()
}

// ── FREE-FOR-ALL rendering (parallel to drawBattle; array-driven) ─────────────
const FFA_BAR_COLORS = ["#38bdf8", "#f87171", "#4ade80", "#facc15"]   // per-slot bar colour
function drawFFAScene() {
  const stage = getStageTheme()
  const hasTransform = typeof camera.applyTransform === "function"
  ctx.save()
  if (hasTransform) camera.applyTransform(ctx, canvas)
  drawBattleBackground(ctx, canvas, stage, groundY, getStageFloorHeight(), cameraCoverY())
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

// FFA character-select roster — non-hidden, routed through the central BETA gate (spriteless fighters
// vanish from the FFA grid while BETA is active, same as the main select screen).
function ffaSelectableRoster() { return characterList.filter(c => !c.hidden && rosterKeyAllowed(c.rosterKey)) }

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
// SAVE DATA panel (17D): live persistence-tier readout + manual Export/Import + Reconnect.
// Anchored top-left (empty space on the Settings screen); rects filled by _layoutSettings.
const saveExportRect    = { x: 20, y: 150, w: 190, h: 34 }
const saveImportRect    = { x: 20, y: 190, w: 190, h: 34 }
const saveReconnectRect = { x: 20, y: 230, w: 190, h: 34 }
let _saveImportInput = null   // lazily-created hidden <input type=file> for Import
let _saveUiMsg = ""           // transient feedback ("Exported." / "Imported N profile(s)." / error)
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
  _mkAmbientBackdrop(ctx, canvas, { top: "#08111f", bottom: "#101a30" })
  // Angular beveled control box — the shared metallic language, keeping each control's own tone/edge/state.
  const box = (r, fill, stroke, lw = 1, glow = false, cut = 8) => {
    _bevelPath(ctx, r.x, r.y, r.w, r.h, cut); ctx.fillStyle = fill; ctx.fill()
    if (glow) { ctx.save(); ctx.shadowBlur = 12; ctx.shadowColor = stroke; ctx.strokeStyle = stroke; ctx.lineWidth = lw; _bevelPath(ctx, r.x, r.y, r.w, r.h, cut); ctx.stroke(); ctx.restore() }
    else { ctx.strokeStyle = stroke; ctx.lineWidth = lw; _bevelPath(ctx, r.x, r.y, r.w, r.h, cut); ctx.stroke() }
  }
  ctx.textAlign = "center"
  ctx.fillStyle = "#f3f7ff"; ctx.font = "800 36px Arial"
  ctx.shadowBlur = 18; ctx.shadowColor = "rgba(74,168,224,0.4)"; ctx.fillText("INPUT SETTINGS", canvas.width / 2, 120); ctx.shadowBlur = 0

  // ── SAVE DATA (17D): live tier readout + manual Export/Import (+ Reconnect) ──
  ctx.textAlign = "left"
  ctx.fillStyle = "#9cf"; ctx.font = "700 16px Arial"
  ctx.fillText("SAVE DATA", saveExportRect.x, saveExportRect.y - 34)
  ctx.fillStyle = "#cfe0ff"; ctx.font = "13px Arial"
  ctx.fillText(saveFileStatus(), saveExportRect.x, saveExportRect.y - 14)
  const drawSaveBtn = (r, label, tone = "#1d2c42") => {
    box(r, tone, _withAlpha("#4aa8e0", 0.5), 1.2)
    ctx.fillStyle = "#e6edf7"; ctx.font = "15px Arial"; ctx.textAlign = "center"
    ctx.fillText(label, r.x + r.w / 2, r.y + 22); ctx.textAlign = "left"
  }
  drawSaveBtn(saveExportRect, "Export Save")
  drawSaveBtn(saveImportRect, "Import Save")
  if (needsReconnect()) drawSaveBtn(saveReconnectRect, "Reconnect save file", "#4a3010")
  if (_saveUiMsg) { ctx.fillStyle = "#fbbf24"; ctx.font = "12px Arial"; ctx.fillText(_saveUiMsg, saveExportRect.x, (needsReconnect() ? saveReconnectRect : saveImportRect).y + 52) }
  ctx.textAlign = "center"

  // ── Per-player device (Task 4) + Two Keyboards placeholder (Task 3) ──
  box(p1SettingRect, "rgba(20,26,40,0.92)", _withAlpha("#4aa8e0", 0.45), 1.5)
  box(p2SettingRect, "rgba(20,26,40,0.92)", _withAlpha("#4aa8e0", 0.45), 1.5)
  ctx.fillStyle = "#FFF"; ctx.font = "700 22px Arial"
  ctx.fillText(`P1 Device: ${inputSettings.p1Type.toUpperCase()}  (click to change)`, canvas.width / 2, p1SettingRect.y + 38)
  ctx.fillText(`P2 Device: ${inputSettings.p2Type.toUpperCase()}  (click to change)`, canvas.width / 2, p2SettingRect.y + 38)
  // Two Keyboards — DISABLED placeholder.
  const tk = { x: canvas.width / 2 - 200, y: 254, w: 400, h: 44 }
  box(tk, "rgba(14,16,22,0.9)", "rgba(120,130,150,0.35)", 1)
  ctx.fillStyle = "#666"; ctx.font = "18px Arial"
  ctx.fillText("Two Keyboards — coming soon", canvas.width / 2, tk.y + 20)
  ctx.font = "12px Arial"
  ctx.fillText("(browsers can't yet distinguish two keyboards)", canvas.width / 2, tk.y + 37)

  // ── Audio: two INDEPENDENT mute toggles (SFX / Music) — red=muted, green=on preserved ──
  const drawAudioToggle = (r, label, muted) => {
    box(r, muted ? "rgba(74,23,23,0.9)" : "rgba(23,58,36,0.9)", muted ? "#f87171" : "#4ade80", 2, true)
    ctx.fillStyle = "#FFF"; ctx.font = "700 15px Arial"
    ctx.fillText(`${label}: ${muted ? "MUTED" : "ON"}`, r.x + r.w / 2, r.y + 20)
  }
  drawAudioToggle(sfxToggleRect,   "Sound Effects", audioSettings.sfxMuted)
  drawAudioToggle(musicToggleRect, "Music",         audioSettings.musicMuted)

  // ── Keybind grid (Task 2) ──
  ctx.fillStyle = "#9cf"; ctx.font = "700 16px Arial"
  ctx.fillText("P1 KEYBOARD BINDINGS — click an action, then press a key (W A S D U I O P J K L)", canvas.width / 2, KEYBIND_Y0 - 16)
  for (const r of getKeybindRects()) {
    const awaiting = rebindAction === r.action
    box(r, awaiting ? "rgba(34,80,52,0.95)" : "rgba(24,30,42,0.9)", awaiting ? "#4ade80" : "rgba(120,150,200,0.35)", awaiting ? 2 : 1, awaiting, 6)
    ctx.fillStyle = "#FFF"; ctx.font = "15px Arial"
    const keyLabel = awaiting ? "press a key…" : `[ ${(P1_CONTROLS[r.action] || "—").toUpperCase()} ]`
    ctx.fillText(`${r.label}: ${keyLabel}`, r.x + r.w / 2, r.y + 21)
  }
  const rb = resetBindRect()
  box(rb, "rgba(30,36,50,0.92)", _withAlpha("#4aa8e0", 0.5), 1.2)
  ctx.fillStyle = "#FFF"; ctx.font = "700 18px Arial"
  ctx.fillText("Reset to Defaults", canvas.width / 2, rb.y + 26)

  // Warning + in-memory note.
  if (rebindWarning) { ctx.fillStyle = "#fbbf24"; ctx.font = "15px Arial"; ctx.fillText(rebindWarning, canvas.width / 2, rb.y + 58) }
  ctx.fillStyle = "#888"; ctx.font = "13px Arial"
  ctx.fillText("Changes are in-memory only — not saved (sandbox blocks storage).", canvas.width / 2, rb.y + 80)

  // ── Menu music playlist (reorder) — left margin ──
  ctx.textAlign = "left"
  ctx.fillStyle = "#9cf"; ctx.font = "700 16px Arial"
  ctx.fillText("MENU MUSIC — playlist order (▲/▼)", PLAYLIST_X0, PLAYLIST_Y0 - 16)
  // Live now-playing cursor (sound keeps it pinned to the same song across reorders) — highlight that row
  // so a reorder is VISIBLY reflected (the highlight follows the song / the upcoming order shifts).
  const nowPlaying = sound.getMenuPlaying?.() || { index: -1, playing: false }
  for (const r of getPlaylistRects()) {
    const isNow = nowPlaying.playing && r.index === nowPlaying.index
    box(r.rowRect, isNow ? "rgba(32,64,106,0.95)" : "rgba(26,34,48,0.9)", isNow ? "#63b3ff" : "rgba(120,170,255,0.25)", isNow ? 2 : 1, isNow, 6)
    // track number + clean name (clipped to the label area); the live track gets a ► marker + accent colour
    ctx.fillStyle = isNow ? "#bfe0ff" : "#e6edf7"; ctx.font = isNow ? "700 13px Arial" : "13px Arial"
    ctx.save()
    ctx.beginPath(); ctx.rect(r.rowRect.x + 8, r.rowRect.y, r.rowRect.w - PLAYLIST_BTN * 2 - 20, r.rowRect.h); ctx.clip()
    ctx.fillText(`${isNow ? "► " : ""}${r.index + 1}. ${menuTrackDisplayName(r.file)}`, r.rowRect.x + 8, r.rowRect.y + 18)
    ctx.restore()
    // ▲ up (disabled on first row) / ▼ down (disabled on last row)
    const drawArrow = (br, glyph, enabled) => {
      box(br, enabled ? "rgba(29,44,66,0.95)" : "rgba(20,24,30,0.9)", enabled ? _withAlpha("#4aa8e0", 0.5) : "rgba(90,100,115,0.4)", 1, false, 5)
      ctx.fillStyle = enabled ? "#cfe0ff" : "#55606e"; ctx.font = "15px Arial"; ctx.textAlign = "center"
      ctx.fillText(glyph, br.x + br.w / 2, br.y + br.h / 2 + 5)
      ctx.textAlign = "left"
    }
    drawArrow(r.upRect,   "▲", r.index > 0)
    drawArrow(r.downRect, "▼", r.index < MENU_PLAYLIST.length - 1)
  }
  ctx.textAlign = "center"

  // Back — red action accent, angular.
  box(backSettingRect, "rgba(60,20,20,0.92)", "#e05454", 1.5, true)
  ctx.fillStyle = "#FFF"; ctx.font = "700 22px Arial"
  ctx.fillText("BACK", canvas.width / 2, backSettingRect.y + 35)
}

// ── CREDITS screen (Stage 18) — slow auto-scroll + wheel/drag, with a BACK button ──
let creditsScroll = 0
let creditsContentHeight = 0
const creditsBackRect = { x: 20, y: 20, w: 120, h: 40 }
function _creditsMaxScroll() { return Math.max(0, creditsContentHeight - (canvas.height - 160)) }
// Stage 16: resolve a REAL on-disk sheet file per SOURCED_ART entry, so the credits screen can show a
// live thumbnail. The character's animationData sheets are the actual files the game loads; we pick the
// first one that MATCHES the entry's credits.js `files` glob (so the selection is driven by credits.js
// data, per the rule). `found:false` when nothing matches → the view flags it (no placeholder invented).
let _creditsThumbCache = null
function _globToRegex(glob) { return new RegExp("^" + String(glob).replace(/[.]/g, "\\.").replace(/[*]/g, ".*") + "$") }
function getCreditsThumbnails() {
  if (_creditsThumbCache) return _creditsThumbCache
  const out = {}
  for (const [key, a] of Object.entries(SOURCED_ART)) {
    const cand = characters[key]
      ? [...new Set(Object.values(characters[key].animationData || {}).map(v => v.sheet).filter(Boolean))]
      : []
    const globs = (a.files || []).map(_globToRegex)
    const file = cand.find(c => globs.some(rx => rx.test(String(c).replace(/^\.\//, "")))) || null
    out[a.work] = { key, file, found: !!file }
  }
  _creditsThumbCache = out
  return out
}

function drawCreditsState() {
  creditsBackRect.x = 20; creditsBackRect.y = 20
  // Gentle auto-scroll toward the bottom, then rest (player can wheel/drag freely too).
  const max = _creditsMaxScroll()
  if (creditsScroll < max) creditsScroll = Math.min(max, creditsScroll + 0.5)
  creditsContentHeight = drawCreditsScreen(ctx, canvas, creditsScroll, { thumbnails: getCreditsThumbnails() })
  ctx.fillStyle = "#A00"; ctx.fillRect(creditsBackRect.x, creditsBackRect.y, creditsBackRect.w, creditsBackRect.h)
  ctx.fillStyle = "#FFF"; ctx.font = "20px Arial"; ctx.textAlign = "center"
  ctx.fillText("BACK", creditsBackRect.x + creditsBackRect.w / 2, creditsBackRect.y + 27)
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
    case GAME_STATES.CREDITS:         drawCreditsState(); break
    case GAME_STATES.MAIN_MENU:
      drawMainMenuScreen(ctx, canvas, hoverMainMenuIndex, getCurrentAccount())
      _drawProgressionBadge()
      _drawDevCodeOverlay()
      break
    case GAME_STATES.ONLINE_PLACEHOLDER: _drawOnlinePlaceholder(); break
    case GAME_STATES.STORY_MODE: drawStoryModeScreen(ctx, canvas, _storyBackHover); break
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
        showControls: moveListShowControls, controlRef: CONTROL_REFERENCE,
        accentFor: (key) => charSelectAccent(key) || "#4aa8e0"   // selected fighter's identity accent on the kit panel
      })
      break
    }
    case GAME_STATES.GAMEPLAY_SELECT: drawGameplaySelectScreen(ctx, canvas, hoverGameplayIndex); break
    case GAME_STATES.TOWER_SELECT:    drawTowerSelectScreen(ctx, canvas, hoverTowerIndex); break
    case GAME_STATES.ARCADE_SETUP:    drawArcadeSetupScreen(ctx, canvas, hoverArcadeIndex); break
    case GAME_STATES.ARCADE_RIVAL_INTRO: drawArcadeRivalIntro(); break
    case GAME_STATES.ARCADE_ENDING:   drawArcadeEndingScreen(ctx, canvas, { rosterKey: arcadeState.rosterKey || matchConfig.p1CharKey, slides: arcadeEndingSlides, index: arcadeEndingIndex, elapsedMs: performance.now() - arcadeEndingStartMs }); break
    case GAME_STATES.BRACKET_SETUP:   drawBracketSetupScreen(ctx, canvas, hoverBracketIndex); break
    case GAME_STATES.BRACKET_VIEW:    drawBracketScreen(ctx, canvas, bracketState); break
    case GAME_STATES.FFA_SETUP:       drawFFASetupScreen(ctx, canvas, hoverFFAIndex, FFA_MAX_PLAYERS, getConnectedPadCount?.() || 0); break
    case GAME_STATES.FFA_CHARSELECT:  drawFFACharSelectScreen(ctx, canvas, ffaState.pickSlot, ffaState.playerCount, ffaSelectableRoster(), hoverFFACharIndex, ffaState.charKeys); break
    case GAME_STATES.FFA_SLOTSELECT:  drawFFASlotSelectScreen(ctx, canvas, ffaState.playerCount, ffaState.aiSlots, ffaState.charKeys, ffaDeviceCount(), hoverFFASlotIndex); break
    case GAME_STATES.FFA_TEAMSELECT:  drawFFATeamSelectScreen(ctx, canvas, ffaState.playerCount, ffaState.teams, ffaState.charKeys, hoverFFATeamIndex, TEAM_COLORS); break
    case GAME_STATES.FFA_BATTLE:      drawFFABattle(); break
    case GAME_STATES.AI_DIFFICULTY:   drawAIDifficultyScreen(ctx, canvas, hoverDifficultyIndex); break
    case GAME_STATES.AI_VS_AI_SETUP:  drawAiVsAiSetupScreen(ctx, canvas, aiVsAiConfig, aiVsAiRoster(), hoverAiVsAiIndex); break
    case GAME_STATES.AI_VS_AI_SUMMARY: drawAiVsAiSummaryScreen(ctx, canvas, aiVsAiState.lastExport || {}, hoverAiVsAiSummaryIndex); break
    case GAME_STATES.SELECT_UNIVERSE:
      drawUniverseSelectScreen(ctx, canvas, getUniverseList(), hoverUniverseIndex); break
    case GAME_STATES.SELECT_CHARACTER:
      drawCharacterSelectScreen(ctx, canvas, {
        roster:        getCharacterRosterForSelectedUniverse(),
        selectedIndex: hoverCharacterIndex,
        p1Selected:    matchConfig.p1CharKey,
        p2Selected:    matchConfig.p2CharKey,
        currentPlayer: matchConfig.selectingSide === "p1" ? 1 : 2,
        isLocked:      (key) => !isCharUnlocked(key),     // Stage 21: locked → silhouette + condition
        lockLabel:     (key) => charLockLabel(key),
        lockMsg:       characterLockMsg,
        // MK-feel select redesign: per-character accent = the SAME energyConfig.color the HUD energy
        // panel reads (used for the cursor/hover glow; P1/P2 selected tint stays blue/red). View-only.
        accentFor:     (key) => charSelectAccent(key),
        // Stage 23: stats + archetype + move preview for the hovered fighter (one getKit generator).
        ...(() => { const r = getCharacterRosterForSelectedUniverse(); const hv = r[hoverCharacterIndex]; const ck = hv && characters[hv.id];
          return ck ? { detailChar: ck, detailKit: getKit(hv.id, ck) } : {} })(),
        randomHint: "Click a fighter · [R] random · [U] random in universe",
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
        player: matchConfig.alienSelectSide === "p1" ? 1 : 2,
        slotCap: BEN10_SLOT_COMBOS.length,                      // data-driven slot count (not hardcoded 5)
        slotCombos: BEN10_SLOT_COMBOS.map(c => c.label),        // per-slot transform combo labels
        mouse: { x: mouse.x, y: mouse.y }                        // for card hover animation
      }); break
    case GAME_STATES.SELECT_EDO_BACKUP:
      drawCharacterSelectScreen(ctx, canvas, {
        roster:        getEdoBackupRoster(),
        selectedIndex: hoverEdoBackupIndex,
        currentPlayer: matchConfig.edoSelectSide === "p1" ? 1 : 2,
        title: "EDO TENSEI — CHOOSE YOUR REANIMATED VESSEL"
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
          p1Universe: formatUniverseName(matchConfig.p1Char?.universe || ""),   // Stage 23 versus splash
          p2Universe: formatUniverseName(matchConfig.p2Char?.universe || ""),
          timer: matchIntroTimer, maxTimer: 90
        })
        _drawActiveModifiers()   // Stage 24A: show this floor's modifiers on the intro
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
  // Dimensional-rift screen transition (Stage 11): a glitch/tear wipe over the DESTINATION screen,
  // drawn LAST so it overlays whatever screen just switched in. Inert unless a transition is playing.
  drawRiftTransition(ctx, canvas)
}

// ------------------------------------------------------------------
// MENU CLICK HANDLERS
// ------------------------------------------------------------------
function getUniverseList() {
  let keys = universeKeys
  // Non-dev sessions only see universes with at least one offerable fighter. This subsumes the old
  // beta-only filter (playableUniverseSet routes through rosterKeyAllowed, which already applies the
  // beta sprite gate) AND hides normal-play universes emptied by isPlayable:false. Dev sees them all.
  if (!isDevUnlocked()) { const pu = playableUniverseSet(); keys = keys.filter(k => pu.has(k)) }
  return keys.map(k => ({ name: formatUniverseName(k), id: k, accent: universeAccent(k) }))
}

// Flat list of every Omnitrix alien for the Ben 10 loadout screen.
let _alienPoolListCache = null
function getAlienPoolList() {
  if (!_alienPoolListCache) {
    // Only ART-BACKED aliens are offered in the loadout picker (art-less entries stay in the
    // pool as fallback data but are hidden until real sprite art is sourced — see BEN10_ART_ALIENS).
    _alienPoolListCache = Object.entries(BEN10_ALIEN_POOL)
      .filter(([key]) => isArtBackedAlien(key))
      .map(([key, a]) => ({ key, name: a.name, color: a.color }))
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

// MK-feel character-select accent palette (SELECT SCREEN ONLY — does NOT recolor the in-match HUD energy
// bars). Per-character cursor/hover glow color. Precedence: an explicit energyConfig.color (Rick/Beerus)
// wins; else a thematic color per traits.energyType; else the HUD default cyan. Gives each fighter-type a
// distinct identity glow while the two custom-colored characters still read exactly as their HUD color.
const ENERGY_TYPE_ACCENT = {
  ki:            "#f4b63a",   // Dragon Ball — golden ki aura
  god_ki:        "#b24cf0",   // Beerus — violet god ki
  chakra:        "#4fa9ff",   // Naruto — chakra blue
  cursed_energy: "#7c5cff",   // Jujutsu Kaisen — cursed violet
  nen:           "#e0563b",   // Hunter x Hunter — nen aura red
  reiatsu:       "#38e0e0",   // Bleach — spiritual cyan
  symbol_power:  "#ff5ea8",   // Power Rangers — morphin magenta
  morphin_grid:  "#ff5ea8",   // Power Rangers — morphin magenta
  portal_tech:   "#58e070",   // Rick & Morty — portal green
  bullshit_science: "#8be04e", // Rick — (also his explicit energyConfig.color)
  smart_atoms:   "#c0a0ff",   // Invincible tech — pale violet
  gadget:        "#9aa7b5",   // Batman — brushed steel
  psi:           "#e07cff",   // Saiki — psychic magenta
  speed_force:   "#ffe14a",   // Flash — lightning yellow
  spd_energy:    "#3a8cff",   // SPD — blue
  solar_energy:  "#ff8a3d",   // Superman — solar orange
  stamina:       "#64d68a",   // green vigor
  dread:         "#c0304a",   // Ghostface — horror crimson
  omnitrix:      "#78e06a",   // Ben 10 — Omnitrix green
  ultimatrix:    "#ff5a5a",   // Albedo — Ultimatrix red
}
function charSelectAccent(key) {
  const c = characters[key]
  return c?.energyConfig?.color || ENERGY_TYPE_ACCENT[c?.traits?.energyType] || null   // null → ui.js HUD default #38bdf8
}

// NEW CONVENTION (UI-polish pass): a per-universe identity accent color. No universe accent existed
// before this pass — this map IS the convention, reused by universe-select cards (and available to any
// future per-universe UI). Thematic to each franchise; distinct hues so the grid reads as varied.
const UNIVERSE_ACCENT = {
  dragon_ball:     "#f4b63a",   // ki gold
  naruto:          "#f6852e",   // ninja orange
  jujutsu_kaisen:  "#7c5cff",   // cursed violet
  hunter_x_hunter: "#2fbf7a",   // nen jade
  demon_slayer:    "#33c0c0",   // breathing teal
  power_rangers:   "#ff3b6b",   // ranger crimson
  dc:              "#3a6ff0",   // DC blue
  ben_10:          "#9ede3a",   // Omnitrix lime
  invincible:      "#ec4f6e",   // Invincible red
  rick_and_morty:  "#6fe0b0",   // portal cyan-green
  bleach:          "#38c0e0",   // reiatsu cyan
  horror:          "#c0304a",   // horror crimson
  saiki_k:         "#e07cff",   // psychic pink
  original:        "#9aa7b5",   // neutral steel
}
function universeAccent(id) { return UNIVERSE_ACCENT[id] || "#4aa8e0" }

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
  if (gameState === GAME_STATES.STORY_MODE)       { _storyBackHover = pointInRect(mouse.x, mouse.y, getStoryBackButton(canvas)); return }   // only the BACK button is interactive (chapters are inert)
  if (gameState === GAME_STATES.GAMEPLAY_SELECT)  { tryHover(getGameplaySelectRects(canvas),  hoverGameplayIndex,   v => hoverGameplayIndex   = v); return }
  if (gameState === GAME_STATES.TOWER_SELECT)     { tryHover(getTowerSelectRects(canvas),      hoverTowerIndex,      v => hoverTowerIndex      = v); return }
  if (gameState === GAME_STATES.ARCADE_SETUP)     { tryHover(getArcadeSetupRects(canvas),      hoverArcadeIndex,     v => hoverArcadeIndex     = v); return }
  if (gameState === GAME_STATES.BRACKET_SETUP)    { tryHover(getBracketSetupRects(canvas),     hoverBracketIndex,    v => hoverBracketIndex    = v); return }
  if (gameState === GAME_STATES.FFA_SETUP)        { tryHover(getFFASetupRects(canvas, FFA_MAX_PLAYERS), hoverFFAIndex, v => hoverFFAIndex = v); return }
  if (gameState === GAME_STATES.FFA_CHARSELECT)   { tryHover(getCharacterCardRects(canvas, ffaSelectableRoster()), hoverFFACharIndex, v => hoverFFACharIndex = v); return }
  if (gameState === GAME_STATES.FFA_SLOTSELECT)   { tryHover(getFFASlotSelectRects(canvas, ffaState.playerCount), hoverFFASlotIndex, v => hoverFFASlotIndex = v); return }
  if (gameState === GAME_STATES.FFA_TEAMSELECT)   { tryHover(getFFATeamSelectRects(canvas, ffaState.playerCount), hoverFFATeamIndex, v => hoverFFATeamIndex = v); return }
  if (gameState === GAME_STATES.AI_DIFFICULTY)    { tryHover(getAIDifficultyRects(canvas),    hoverDifficultyIndex, v => hoverDifficultyIndex = v); return }
  if (gameState === GAME_STATES.AI_VS_AI_SETUP)   { tryHover(getAiVsAiSetupRects(canvas),     hoverAiVsAiIndex,     v => { hoverAiVsAiIndex = v; aiVsAiConfig.sel = v }); return }
  if (gameState === GAME_STATES.AI_VS_AI_SUMMARY) { tryHover(getAiVsAiSummaryRects(canvas),   hoverAiVsAiSummaryIndex, v => hoverAiVsAiSummaryIndex = v); return }
  if (gameState === GAME_STATES.SELECT_UNIVERSE)  { tryHover(getUniverseCardRects(canvas, getUniverseList()), hoverUniverseIndex,  v => hoverUniverseIndex  = v); return }
  if (gameState === GAME_STATES.SELECT_CHARACTER) { tryHover(getCharacterCardRects(canvas, getCharacterRosterForSelectedUniverse(), charSelectGridOpts(canvas, true)), hoverCharacterIndex, v => hoverCharacterIndex = v); return }
  if (gameState === GAME_STATES.SELECT_EDO_BACKUP) { tryHover(getCharacterCardRects(canvas, getEdoBackupRoster()), hoverEdoBackupIndex, v => hoverEdoBackupIndex = v); return }
  if (gameState === GAME_STATES.SELECT_SKIN)      { const sk = getSkins(matchConfig[skinSelectSide + "CharKey"]); tryHover(getSkinSelectRects(canvas, sk.length), hoverSkinIndex, v => hoverSkinIndex = v); return }
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
      else if (c.id === "story")    { gameState = GAME_STATES.STORY_MODE; startRiftTransition("#9a7bff") }   // Stage 14: styled placeholder (rift into it for consistency)
      else if (c.id === "moveList") { moveListIndex = 0; moveListShowControls = false; gameState = GAME_STATES.MOVE_LIST }
      else if (c.id === "tutorial") { tutorialPage = 0; gameState = GAME_STATES.TUTORIAL }
      else if (c.id === "account")  { accountMessage = ""; accountDraftName = getCurrentAccount()?.username || ""; gameState = GAME_STATES.ACCOUNT }
      else if (c.id === "savefile") { /* handled by the dedicated mouseup listener (needs a real user gesture for the file picker) */ }
      else if (c.id === "settings") gameState = GAME_STATES.SETTINGS
      else if (c.id === "credits")  { creditsScroll = 0; gameState = GAME_STATES.CREDITS }
      else if (c.id === "back")     gameState = GAME_STATES.START
      break
    }
    case GAME_STATES.CREDITS:
      // Click BACK (or anywhere — the screen is read-only) returns to the menu.
      gameState = GAME_STATES.MAIN_MENU
      break
    case GAME_STATES.ONLINE_PLACEHOLDER:
      gameState = GAME_STATES.MAIN_MENU   // any click (the BACK button) returns to the menu
      break
    case GAME_STATES.STORY_MODE:
      // Placeholder: only the BACK button does anything; the locked chapter rows are inert.
      if (pointInRect(mouse.x, mouse.y, getStoryBackButton(canvas))) { gameState = GAME_STATES.MAIN_MENU; _storyBackHover = false }
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
      // ── SAVE DATA: Export (blob download) / Import (file picker) / Reconnect (FSA gesture) ──
      if (pointInRect(mouse.x, mouse.y, saveExportRect)) { doExportSave(); break }
      if (pointInRect(mouse.x, mouse.y, saveImportRect)) { doImportSave(); break }
      if (needsReconnect() && pointInRect(mouse.x, mouse.y, saveReconnectRect)) {
        // requestPermission() needs THIS gesture; reconnectSaveFile awaits it, then hydrates.
        reconnectSaveFile().then(r => {
          if (r?.ok) { hydrateFromLoadedSave(); _saveUiMsg = "Save file reconnected." }
          else _saveUiMsg = "Reconnect cancelled."
        })
        break
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
      else if (c.id === "arcade") { hoverArcadeIndex = 0; gameState = GAME_STATES.ARCADE_SETUP }   // pick difficulty first
      else if (c.id === "bracket") { hoverBracketIndex = 0; gameState = GAME_STATES.BRACKET_SETUP }   // pick bracket size first
      else if (c.id === "ffa")  { hoverFFAIndex = 0; gameState = GAME_STATES.FFA_SETUP }   // free-for-all
      else if (c.id === "aivsai") { hoverAiVsAiIndex = 0; aiVsAiConfig.sel = 0; gameState = GAME_STATES.AI_VS_AI_SETUP }
      else if (c.id === "back")gameState = GAME_STATES.MAIN_MENU
      break
    }
    case GAME_STATES.AI_VS_AI_SETUP: {
      const c = getAiVsAiSetupRects(canvas).find(r => pointInRect(mouse.x, mouse.y, r))
      if (!c) break
      _activateAiVsAiRow(c.id)
      break
    }
    case GAME_STATES.AI_VS_AI_SUMMARY: {
      const c = getAiVsAiSummaryRects(canvas).find(r => pointInRect(mouse.x, mouse.y, r))
      if (!c) break
      const exp = aiVsAiState.lastExport
      if      (c.id === "json" && exp) downloadText(exp.jsonName, exp.json, "application/json")
      else if (c.id === "csv"  && exp) downloadText(exp.csvName,  exp.csv,  "text/csv")
      else if (c.id === "again")       { hoverAiVsAiIndex = 0; aiVsAiConfig.sel = 0; gameState = GAME_STATES.AI_VS_AI_SETUP }
      else if (c.id === "menu")        { aiVsAiState.finished = false; resetToStart() }
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
      const idx = pickGridCard(canvas, roster, mouse.x, mouse.y, CHAR_GRID_OPTS)   // viewport-guarded (ignores cards scrolled under the header)
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
    case GAME_STATES.ARCADE_SETUP: {
      const c = getArcadeSetupRects(canvas).find(r => pointInRect(mouse.x, mouse.y, r))
      if (!c) break
      if (c.id === "back") gameState = GAME_STATES.GAMEPLAY_SELECT
      else startArcade(c.id)                      // c.id === "easy"|"adaptive"|"impossible"
      break
    }
    case GAME_STATES.ARCADE_RIVAL_INTRO:
      startMatch()                                // click anywhere → begin the rival fight
      break
    case GAME_STATES.BRACKET_SETUP: {
      const c = getBracketSetupRects(canvas).find(r => pointInRect(mouse.x, mouse.y, r))
      if (!c) break
      if (c.id === "back") { gameState = GAME_STATES.GAMEPLAY_SELECT; break }
      _pendingBracketSize = c.id === "size8" ? 8 : 4
      resetSelections(); matchConfig.mode = "bracket"   // Stage 24B: pick YOUR fighter next; CPUs fill the rest
      beginUniverseSelect()
      break
    }
    case GAME_STATES.BRACKET_VIEW:
      if (bracketState?.champion) endBracket()          // tournament over → back to title
      else _startBracketMatch()                         // play the next (human) match
      break
    case GAME_STATES.ARCADE_ENDING:
      if (arcadeEndingIndex < arcadeEndingSlides.length - 1) { arcadeEndingIndex++; arcadeEndingStartMs = performance.now() }
      else _endArcadeEnding()                     // past the last slide → back to the title
      break
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
      if (idx >= 0 && universes[idx]) { matchConfig.selectedUniverse = universes[idx].id; gameState = GAME_STATES.SELECT_CHARACTER; startRiftTransition(universeAccent(universes[idx].id)) }
      break
    }
    case GAME_STATES.SELECT_CHARACTER: {
      const roster = getCharacterRosterForSelectedUniverse()
      const idx    = pickGridCard(canvas, roster, mouse.x, mouse.y, charSelectGridOpts(canvas, true))   // viewport-guarded, reserves detail panel
      if (idx < 0 || !roster[idx]) break
      _selectCharacterKey(roster[idx].id)
      break
    }
    case GAME_STATES.SELECT_EDO_BACKUP: {
      const side   = matchConfig.edoSelectSide
      const roster = getEdoBackupRoster()
      const idx    = pickGridCard(canvas, roster, mouse.x, mouse.y, CHAR_GRID_OPTS)   // viewport-guarded
      if (idx < 0 || !roster[idx]) break
      matchConfig[side + "EdoBackup"] = roster[idx].id   // read at activation (executeTobiramaUltimate)
      proceedAfterCharacter(side)
      break
    }
    case GAME_STATES.SELECT_ALIENS: {
      const side  = matchConfig.alienSelectSide
      const draft = matchConfig.alienDraft
      // Card click → toggle an alien in/out of the loadout (viewport-guarded so a scrolled-off card
      // can't be clicked through the header).
      const cardIdx = pickGridCard(canvas, getAlienPoolList(), mouse.x, mouse.y, alienGridOpts(canvas))
      if (cardIdx >= 0) {
        const aKey = getAlienPoolList()[cardIdx].key
        const at   = draft.indexOf(aKey)
        if (at >= 0)            draft.splice(at, 1)
        else if (draft.length < BEN10_SLOT_COMBOS.length) draft.push(aKey)   // cap = # of slot combos (data-driven)
        break
      }
      const btn = getAlienSelectButtons(canvas).find(r => pointInRect(mouse.x, mouse.y, r))
      if (btn?.id === "back") { gameState = GAME_STATES.SELECT_CHARACTER }
      // Confirm needs at least one alien (the cap is however many are art-backed — currently 2 —
      // not a hardcoded 5). Grows automatically as BEN10_ART_ALIENS gains entries.
      else if (btn?.id === "confirm" && draft.length >= 1) {
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
      if (_skinConfirm) break                               // already confirming — ignore extra clicks
      matchConfig[skinSelectSide + "Skin"] = skin.id        // remember the choice
      sound.play?.(SFX.UI_SELECT)
      // Play the lock-in flourish (flash + zoom-punch) for a short beat, THEN continue the flow.
      _skinConfirm = { side: skinSelectSide, index: r.index, timer: 15, kicked: false }
      break
    }
    case GAME_STATES.SELECT_STAGE: {
      const idx = getStageCardRects(canvas, stages).findIndex(r => pointInRect(mouse.x, mouse.y, r))
      if (idx >= 0 && stages[idx]) { matchConfig.selectedStage = stages[idx]; startRiftTransition(charSelectAccent(matchConfig.p1CharKey) || "#4ad5ff"); startMatch() }   // rift into match-load, tinted the fighter's accent
      break
    }
    case GAME_STATES.MATCH_END: resetToStart(); break
    case GAME_STATES.VICTORY: {
      const action = handleVictoryClick?.(victoryState, mouse, canvas)
      if (action === "rematch") { if (towerState.active) continueTower(); else if (arcadeState.active) continueArcade(); else if (isBracket()) continueBracket(); else _doRematch() }   // Tower: next floor · Arcade: next fight · Bracket: next match
      if (action === "menu")    { towerState.active = false; arcadeState.active = false; if (isBracket()) endBracket(); else resetToStart() }
      if (action === "saveReplay") saveLastReplay()   // Stage 11D: download the just-finished match's replay JSON
      if (action === "changeChar") _changeCharacter()   // Stage 24C: back to select, keep mode/stage
      break
    }
  }

  consumeMouseClick()
}

// ------------------------------------------------------------------
// MAIN LOOP
// ------------------------------------------------------------------
let _prevGridState = null
function updateCurrentState() {
  // On ENTERING any scrollable card-grid screen, snap it back to the top. Screens share the "chars"
  // scrollKey (char-select / Edo vessel / FFA pick), so without this a scroll position would bleed
  // from one screen to the next. Keyed off the gameState transition, not a per-screen hook.
  if (gameState !== _prevGridState) {
    _prevGridState = gameState
    const g = activeScrollGrid()
    if (g) resetGridScroll(g.opts.scrollKey)
  }

  updateHoverIndices()
  handleMenuClicks()

  // Skin-select lock-in flourish hold: after a pick, let the confirm flash/zoom-punch play for a short
  // beat, THEN continue the select flow (so the confirmation is actually seen, not skipped instantly).
  if (gameState === GAME_STATES.SELECT_SKIN && _skinConfirm) {
    if (--_skinConfirm.timer <= 0) { const side = _skinConfirm.side; _skinConfirm = null; _proceedAfterSkin(side) }
  }

  switch (gameState) {
    case GAME_STATES.INTRO:
      // SEQUENTIAL intro stage machine: P1 plays its full intro, THEN P2's begins. Only the active
      // side advances; the other holds idle. Runs every intro frame (during namecall AND after).
      if (introStage === "p1") {
        if (p1 && p1._introPlaying) { p1._introRevealFrame = (p1._introRevealFrame || 0) + 1; maybeFireIntroVoice(p1); advanceIntroSequence(p1); updateKilluaIntroRollIn(p1); updateSupermanIntro(p1); updateShinobuIntro(p1) }
        if (--introStageTimer <= 0) {
          if (p1) { p1._introPlaying = false; finalizeKilluaIntroPos(p1); finalizeSupermanIntroPos(p1); finalizeShinobuIntroPos(p1) }
          if (p2) { p2._introPlaying = true; initIntroVariant(p2); introStage = "p2"; introStageTimer = introTotalFrames(p2) }
          else introStage = "done"
        }
      } else if (introStage === "p2") {
        if (p2 && p2._introPlaying) { p2._introRevealFrame = (p2._introRevealFrame || 0) + 1; maybeFireIntroVoice(p2); advanceIntroSequence(p2); updateKilluaIntroRollIn(p2); updateSupermanIntro(p2); updateShinobuIntro(p2) }
        if (--introStageTimer <= 0) { if (p2) { p2._introPlaying = false; finalizeKilluaIntroPos(p2); finalizeSupermanIntroPos(p2); finalizeShinobuIntroPos(p2) } introStage = "done" }
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
        // STAGE 10 GATE: don't enter BATTLE until every fighter/FX sheet has decoded. On a normal
        // connection preload finishes long before the intro does, so this never stalls; on a slow one
        // it holds the last intro frame for a few frames rather than ever flashing a _FALLBACK box.
        // FAIL-OPEN after a grace cap so it can NEVER hang: a synchronous harness step-loop can't run
        // the preload promise's microtasks (so _preloadReady would stay false forever), and a real
        // player must never be stuck on a genuinely wedged decode. Past the cap we proceed regardless —
        // worst case a move briefly renders the fallback box; match STATE is unaffected either way.
        if (matchIntroTimer <= 0 && (_preloadReady || --_preloadGraceFrames <= 0)) {
          gameState = GAME_STATES.BATTLE; countdown = ROUND_START_COUNTDOWN
          if (p1) p1._introPlaying = false   // BUG_9: back to idle once the fight starts
          if (p2) p2._introPlaying = false
          // MK-feel match-entry sting (Stage 3): fire the punchy reveal ONCE per match, at the
          // ROUND-1 countdown only (not per-round, not AI-vs-AI spectator). Overlays the first
          // ~0.5s of the countdown window → lands on the "ROUND 1" callout, adds no time.
          if (roundNumber === 1 && !aiVsAiState.active) startMatchEntryTransition()
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
        updateMatchEntryTransition()   // advance the match-entry sting during the countdown window
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

  // AI-vs-AI spectator controller: move telemetry + auto-advance/repeat-N/finish. Inert otherwise.
  updateAiVsAiController()
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

// ── PROFILING OVERLAY (Stage 22D) — behind ?debug=1 ──────────────────────────
// FPS, frame time (avg/max over 120 frames), draw-call count, live projectile/summon/effect
// counts, and the loaded-image count. Zero cost when off. Draw calls are counted by wrapping
// ctx.drawImage ONCE (below) — the counter resets each frame.
let _debugOverlay = false
try { _debugOverlay = new URLSearchParams(window.location.search).has("debug") } catch (_) {}
const _frameMs = new Float32Array(120)   // ring buffer of per-frame compute+render ms
let _frameMsIdx = 0, _frameMsFilled = 0
let _drawCalls = 0, _drawCallsShown = 0
let _fps = 60, _fpsEma = 60
if (_debugOverlay && ctx && typeof ctx.drawImage === "function") {
  const _realDrawImage = ctx.drawImage.bind(ctx)
  ctx.drawImage = function (...a) { _drawCalls++; return _realDrawImage(...a) }
}
function _pushFrameMs(ms) { _frameMs[_frameMsIdx] = ms; _frameMsIdx = (_frameMsIdx + 1) % _frameMs.length; if (_frameMsFilled < _frameMs.length) _frameMsFilled++ }
function _drawDebugOverlay() {
  let sum = 0, max = 0
  for (let i = 0; i < _frameMsFilled; i++) { const v = _frameMs[i]; sum += v; if (v > max) max = v }
  const avg = _frameMsFilled ? sum / _frameMsFilled : 0
  const summons = (typeof activeSummons !== "undefined" ? activeSummons.length : 0)
  const ps = poolStats()._totals
  const lines = [
    `FPS ${_fps.toFixed(0)}   frame ${avg.toFixed(2)}ms avg / ${max.toFixed(2)}ms max (120f)`,
    `draw calls ${_drawCallsShown}   images ${loadedSheetCount()}`,
    `projectiles ${activeProjectiles.length}   summons ${summons}   fx ${hitSparks.length}   dmg# ${damageNumbers.length}`,
    `pool: ${ps.reuses} reused / ${ps.allocs} alloc   free ${ps.free}   (Stage 22C)`
  ]
  ctx.save()
  ctx.font = "12px monospace"; ctx.textAlign = "left"; ctx.textBaseline = "top"
  const w = 340, h = lines.length * 16 + 12
  ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(8, 8, w, h)
  ctx.fillStyle = max > 20 ? "#fca5a5" : "#8ef5a8"   // red if any frame blew the ~16.7ms budget hard
  lines.forEach((ln, i) => ctx.fillText(ln, 16, 14 + i * 16))
  ctx.restore()
}

function gameLoop(now) {
  requestAnimationFrame(gameLoop)
  const _t0 = _debugOverlay ? (typeof performance !== "undefined" ? performance.now() : 0) : 0
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
  updateRiftTransition()   // advance the dimensional-rift screen transition (Stage 11), if playing
  persistSessionIfChanged()   // cross-reload session save (selections / training toggles / unlocks) — writes only on change
  // FAST-FORWARD (AI-vs-AI spectator mode only): run extra LOGIC ticks per rendered frame so a
  // test match resolves in a fraction of the wall-clock time. Only the update runs again — render
  // happens once — so the sim advances Nx while we still draw at the display rate. Gated to the
  // in-match states; menus/setup always run at 1x. Inert in every other mode (active=false).
  if (aiVsAiState.active && aiVsAiState.speed > 1 && _aiVsAiFastForwardState()) {
    for (let i = 1; i < aiVsAiState.speed; i++) { globalFrameCount++; updateCurrentState() }
  }
  renderCurrentState()
  if (_debugOverlay) {
    const t1 = (typeof performance !== "undefined" ? performance.now() : 0)
    _pushFrameMs(t1 - _t0)                          // this pass's compute+render cost
    _drawCallsShown = _drawCalls; _drawCalls = 0    // draw.Image calls this frame (reset for next)
    _fpsEma = _fpsEma * 0.9 + (elapsed > 0 ? Math.min(1000 / elapsed, 240) : _fpsEma) * 0.1
    _fps = _fpsEma
    _drawDebugOverlay()                             // drawn ON TOP (its own drawImage calls aren't counted — text only)
  }
  endInputFrame()
}

// The gameStates during which fast-forward may add extra sim ticks (fight + post-match dwell).
function _aiVsAiFastForwardState() {
  return gameState === GAME_STATES.BATTLE || gameState === GAME_STATES.INTRO ||
         gameState === GAME_STATES.ROUND_BREAK || gameState === GAME_STATES.VICTORY
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
      else if (mode === "beta") { devCodeMessage = isBetaUnlocked() ? "✓ BETA ON: sprite roster only + all skins unlocked" : "BETA OFF: full roster restored"; devCodeEntry = false }
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

  // Stage 23: RANDOM SELECT on the character-select screen — R = any unlocked fighter, U = random
  // within the current universe. Locks in like a normal pick (unlock gate + detours honoured).
  if (gameState === GAME_STATES.SELECT_CHARACTER && (key === "r" || key === "u")) {
    e.preventDefault(); pickRandomCharacter(key === "u"); return
  }

  // FULLSCREEN TOGGLE — "F" (plain, no modifier so Ctrl/Cmd+F browser-find is untouched). Global across
  // every screen; placed AFTER the text-entry captures (devcode/rebind/account) so typing an "f" there is
  // never hijacked. "f" is not a gameplay/rebindable key (ALLOWED_KEYS excludes it), so reserving it is safe.
  if (key === "f" && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); toggleFullscreen(); return }

  // TUTORIAL: arrow keys flip pages, Esc exits to the menu.
  if (gameState === GAME_STATES.TUTORIAL) {
    if (key === "arrowright" || key === "d") tutorialPage = Math.min(getTutorialPageCount(P1_CONTROLS) - 1, tutorialPage + 1)
    else if (key === "arrowleft" || key === "a") tutorialPage = Math.max(0, tutorialPage - 1)
    else if (key === "escape") gameState = GAME_STATES.MAIN_MENU
    return
  }

  // AI-vs-AI SETUP: ↑↓ pick a row, ◀▶ change its value, Enter start, Esc back.
  if (gameState === GAME_STATES.AI_VS_AI_SETUP) {
    const rows = getAiVsAiSetupRects(canvas)
    const n = rows.length
    if (key === "arrowup" || key === "w")        aiVsAiConfig.sel = (aiVsAiConfig.sel - 1 + n) % n
    else if (key === "arrowdown" || key === "s") aiVsAiConfig.sel = (aiVsAiConfig.sel + 1) % n
    else if (key === "arrowleft" || key === "a") _cycleAiVsAiRow(rows[aiVsAiConfig.sel]?.id, -1)
    else if (key === "arrowright"|| key === "d") _cycleAiVsAiRow(rows[aiVsAiConfig.sel]?.id, +1)
    else if (key === "enter" || key === "j")     _activateAiVsAiRow(rows[aiVsAiConfig.sel]?.id)
    else if (key === "escape")                   gameState = GAME_STATES.GAMEPLAY_SELECT
    hoverAiVsAiIndex = aiVsAiConfig.sel
    return
  }
  if (gameState === GAME_STATES.AI_VS_AI_SUMMARY) {
    if (key === "escape" || key === "m") { aiVsAiState.finished = false; resetToStart() }
    else if (key === "enter") { hoverAiVsAiIndex = 0; aiVsAiConfig.sel = 0; gameState = GAME_STATES.AI_VS_AI_SETUP }
    return
  }

  if (gameState === GAME_STATES.VICTORY) {
    const action = handleVictoryKey?.(victoryState, key)
    if (action === "rematch") { if (towerState.active) continueTower(); else _doRematch() }   // Tower: advance floor
    if (action === "menu")    { towerState.active = false; resetToStart() }
    return
  }
  handlePauseInput(key)

  // CLONE CONTROLS — STANDARDIZED binding, identical across EVERY clone character (Naruto, Minato,
  // Hashirama Wood Clone, Tobirama Water Clone): "," = CREATE a clone, "." = DISPERSE all clones.
  // Gated on the SINGLE source of truth isCloneCapable() (summons.js CLONE_CAPABLE_KEYS) so the binding
  // can never drift per-character again. Battle only; owner = p1, target = the opponent. Inert for any
  // non-clone character (same as pressing a special they don't have). summons.js owns all chakra-split +
  // lifecycle. (This SUPERSEDES the old per-character D→F/D→B + double-QCF motion clone spawn/dispel.)
  if (!e.repeat && gameState === GAME_STATES.BATTLE && p1 && isCloneCapable(p1)) {
    if (key === ",") { summonShadowClone(p1, getOpponent(p1), { onFocus: () => camera.focusOnFighter?.(p1, 1.02) }); if ((p1.rosterKey || "").toLowerCase() === "hashirama") { try { sound.playSfxFile?.(pickHashiramaVoice("woodClone"), null) } catch (_) {} } return }
    if (key === ".") { dispelShadowClones(p1); return }
  }

  // CRITICAL (Task 2): only act on a REAL key PRESS, never OS auto-repeat. While a
  // key is HELD the browser fires repeated keydown events; feeding those into
  // directionHistory / the double-tap detector is what made "hold A" dash AND
  // spuriously trigger a binding vow. Movement itself reads the held key state
  // elsewhere (keys[]/getFighterInput), so skipping repeats here costs nothing.
  if (!e.repeat) {
    if (p1) { recordDirectionInput(p1, key); recordMotionInput(p1, key); detectDoubleTapDashTeleport(p1, key); handleToggleInputs(p1, key); handleUltimateDown(p1, key) }
    if (p2) {
      recordDirectionInput(p2, key)
      recordMotionInput(p2, key)   // motion buffer is gated internally (Naruto-universe only), so this is safe unconditionally for a P2 Naruto/Minato/etc.
      if (isPvP() || matchConfig.mode !== "vs") { detectDoubleTapDashTeleport(p2, key); handleToggleInputs(p2, key); handleUltimateDown(p2, key) }
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
  // MADARA tiered-Ultimate: resolve tap vs hold on the Ultimate key RELEASE (no-op for every other char).
  if (p1) handleUltimateRelease(p1, key)
  if (p2 && (isPvP() || matchConfig.mode !== "vs")) handleUltimateRelease(p2, key)
})

// ------------------------------------------------------------------
// RESIZE
// ------------------------------------------------------------------
// Re-fit the canvas to the current viewport (window resize AND fullscreen enter/exit both land here).
// The game has no fixed aspect ratio — groundY, physics bounds and camera are all derived from the live
// canvas dimensions — so resizing to any viewport (incl. the full screen) reflows cleanly with no
// letterboxing. See HEIGHT_REFERENCE.md: spriteScale is resolution-independent (scales the sprite cell,
// not the canvas), so heights stay canon-correct at any size.
function applyViewportSize() {
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
}
window.addEventListener("resize", applyViewportSize)

// ------------------------------------------------------------------
// FULLSCREEN TOGGLE — native Fullscreen API. Button (#fullscreenBtn) + the "F" key both call this.
// Targets documentElement so the whole page (canvas fills it via 100vw/100vh) goes edge-to-edge with no
// browser chrome. Entering/exiting fires a resize which applyViewportSize handles; we also re-fit on
// fullscreenchange directly so the reflow is immediate (some browsers delay the resize event).
// ------------------------------------------------------------------
const fullscreenBtn = document.getElementById("fullscreenBtn")
function isFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement)
}
function toggleFullscreen() {
  try {
    if (isFullscreen()) {
      (document.exitFullscreen || document.webkitExitFullscreen)?.call(document)
    } else {
      const el = document.documentElement
      ;(el.requestFullscreen || el.webkitRequestFullscreen)?.call(el)
    }
  } catch (_) { /* Fullscreen API unavailable or blocked (e.g. no user gesture) — no-op */ }
}
function syncFullscreenButton() {
  if (!fullscreenBtn) return
  const fs = isFullscreen()
  fullscreenBtn.textContent = fs ? "⤢" : "⛶"          // exit vs enter glyph
  fullscreenBtn.title = fs ? "Exit fullscreen (F)" : "Fullscreen (F)"
  fullscreenBtn.setAttribute("aria-label", fullscreenBtn.title)
}
if (fullscreenBtn) {
  fullscreenBtn.addEventListener("click", () => { toggleFullscreen(); fullscreenBtn.blur() })
}
document.addEventListener("fullscreenchange", () => { applyViewportSize(); syncFullscreenButton() })
document.addEventListener("webkitfullscreenchange", () => { applyViewportSize(); syncFullscreenButton() })

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

// ASYNC BOOT TIERS (do NOT block first frame): the two persistence tiers that can't run
// synchronously at import — the local dev save SERVER (fetch) and the reattachable FSA
// file HANDLE (IndexedDB). Both are silent no-ops when absent (GitHub Pages, file://,
// dev:noserver, Safari), so this never warns and never blocks. If either restores data,
// re-hydrate the live modules on top of the localStorage boot. The promise is exposed so
// the harness (and any future caller) can await boot completion deterministically.
const _asyncBootReady = (async () => {
  // 1. Local save server (dev only) — first-success-wins over localStorage per the tier order.
  try { const n = await initSaveServerTier(); if (n > 0) hydrateFromLoadedSave() } catch (_) {}
  // 2. FSA handle stored in IndexedDB — reattach with zero clicks when permission is still granted.
  try { const r = await reattachStoredHandle(); if (r?.ok && r.count > 0) hydrateFromLoadedSave() } catch (_) {}
  return { server: isSaveServerAvailable(), reconnect: needsReconnect() }
})()

// SESSION RESTORE (universal, guests included): re-apply the last selections / training toggles /
// unlock flags and land on the screen the player was on (never a match — mid-fight collapses to the
// main menu). Runs AFTER account hydrate so account unlocks compose (OR-in) with session unlocks.
restoreSession()
// Stage 24B: resume an in-progress local tournament that was saved before a reload (Stage 17 save).
if (resumeBracketIfSaved()) gameState = GAME_STATES.BRACKET_VIEW
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
    arcadeState.active = false  // …nor an arcade run
    // Default: training vs a dummy. Pass { mode:"vs", difficulty:"easy" } for a real
    // CPU match (used to test the pause-menu → Training Mode transition).
    matchConfig.mode          = opts.mode || "training"
    matchConfig.aiDifficulty  = opts.difficulty || (matchConfig.mode === "training" ? "dummy" : "easy")
    matchConfig.selectedStage = stages[0]
    matchConfig.p1CharKey = p1Key; matchConfig.p1Char = characters[p1Key]
    matchConfig.p2CharKey = p2Key; matchConfig.p2Char = characters[p2Key]
    // Skins default to "default"; a test may pass opts.p1Skin/p2Skin (e.g. "gojo2") so the skin
    // is applied inside startMatch BEFORE the intro plays — needed to prove the per-skin intro voice.
    matchConfig.p1Skin = opts.p1Skin || "default"; matchConfig.p2Skin = opts.p2Skin || "default"
    startMatch()
  }

  // Collapse INTRO + namecall + countdown so the BATTLE update loop actually runs
  // combat/animation. (updateBattle only ticks once countdown<=0 — see BATTLE case.)
  function skipToBattle() {
    matchIntroTimer = 0
    if (p1) p1._introPlaying = false
    if (p2) p2._introPlaying = false
    finalizeKilluaIntroPos(p1); finalizeKilluaIntroPos(p2)   // undo the roll-in offset if we skip mid-roll
    finalizeSupermanIntroPos(p1); finalizeSupermanIntroPos(p2)   // undo Superman's off-screen offset if skipped mid-run
    finalizeShinobuIntroPos(p1); finalizeShinobuIntroPos(p2)   // undo Shinobu's glide-in offset if skipped mid-glide
    gameState = GAME_STATES.BATTLE
    countdown = 0
  }

  const snap = f => f && ({
    key: f.rosterKey, x: f.x, y: f.y, w: f.w, h: f.h, facing: f.facing,
    energy: f.energy, maxEnergy: f.maxEnergy, health: f.health, maxHealth: f.maxHealth,
    vy: f.vy || 0, vx: f.vx || 0, grounded: !!(f.onGround ?? f.grounded), canJump: f.canJump !== false,
    airHits: f.airHits || 0, isLaunched: !!f.isLaunched,   // air-combo counter + launched state (Up-Attack launcher tests)
    charging:         !!f.isCharging,   // universal charge-lockout state (charging = fully vulnerable)
    susanooStage:     f._susanooStage || 0,
    susanooTimer:     f._susanooTimer || 0,
    itachiSusanoo:    !!f._itachiSusanoo,          // Itachi single-tier Susanoo giant active
    itachiSusanooTimer: f._itachiSusanooTimer || 0,
    lightningPhase:   f._lightningPhase || null,
    rooted:           !!f._rooted,
    attacking:        !!f.attacking,
    blocking:         !!f.isBlocking,
    invulnTimer:      f.invulnTimer || 0,        // i-frames remaining (Stalk Vanish / dodge tests)
    knockdownState:   !!f.knockdownState,        // grounded-knockdown state (trip/launcher tests)
    isGrabbed:        !!f.isGrabbed,             // real command-grab state (Uchiha Susanoo Tier-1 grab tests)
    tobiChainPhase:   f._tobiChainPhase || null, // Tobi Chain Grab scripted phase (whip/reach/snatched/smash/recover)
    tobiIntangible:   !!f._tobiIntangible,       // Tobi Kamui Intangibility toggle ON
    tobiPhased:       !!f._tobiPhased,           // Tobi Kamui currently PHASED (ghost + i-frames; false mid-melee-drop)
    grabTeleport:     !!f._grabTeleport,         // pending Kamui opponent-teleport payload (shared combat contract, per-instance)
    grabTimer:        f.grabTimer || 0,          // frames until the grab's pop-up-and-drop throw resolves
    baseSpeed:        f.baseSpeed || f.speed || 0,   // base speed STAT (Toji-speed-tier threshold audit)
    dashCooldownMax:  f.dashCooldownMax || 0,        // Stage 4b: per-archetype dash cooldown (speed-tiered)
    dashCooldown:     f.dashCooldown || 0,           // frames until the next dash is available
    dashTimer:        f.dashTimer || 0,              // active-dash frames remaining
    teleportFlash:    f.teleportFlash || 0,      // teleport-behind landing flash
    hitstun:          f.hitstun || 0,
    hitstop:          f.hitstop || 0,          // impact-freeze frames remaining (combo-flow layer telemetry)
    domainFrozen:     !!f.domainFrozen,        // trapped+frozen inside a domain (Gojo/Hashirama seal) — can't act
    domainBuff:       !!f.domainBuff,          // owns an active domain (caster side)
    stun:             f.stun || 0,
    blockstun:        f.blockstun || 0,
    currentMove:      f.currentMove || null,
    gunbaiReflect:    f._gunbaiReflect || 0,         // Madara Gunbai Summon reflect-window countdown
    susanooArmor:     f._madaraSusanoo || 0,         // Madara tier-3 Susanoo armor-mode countdown
    completeSusanoo:  f._madaraComplete || 0,        // Madara tier-4 Complete Susanoo giant-form countdown
    damageMult2:      f.damageMultiplier || 1,       // active mode damage buff (Madara armor / other forms)
    isCharging:       !!f.isCharging,                // hold-charge lockout (Minato Big Ball / Reaper gate)
    rekkaNext:        f._rekkaNext || null,          // command-normal chain: next queued stage
    cmdHitLanded:     !!f._cmdHitLanded,             // command-normal chain: cancel-on-hit latch
    attackPhase:      f.currentAttack ? getAttackPhase(f) : "idle",
    introVariant:     f._introVariant || null,
    castMove:         f._spriteCastMove || null,   // sprite-cast override (specials that don't set currentMove)
    nzCountering:     f._nzCountering || 0,         // Nezuko Counter Stance parry-window remaining
    nzSlumberTimer:   f._nzSlumberTimer || 0,       // Nezuko Blood Demon Slumber remaining frames
    nzSlumberVuln:    !!f._nzSlumberVuln,            // Nezuko slumber damage-amp active (takes bonus dmg)
    nzLastSibling:    f._nzLastSibling || null,      // Nezuko last Ally Call sibling ("tanjiro"|"zenitsu")
    nzDemonActive:    !!f._nzDemonActive,            // Nezuko Demon Transformation active
    nzDemonTimer:     f._nzDemonTimer || 0,          // Demon Transformation remaining frames
    dmgMult:          f.damageMultiplier || 1,       // current damage multiplier (verify transform buff/revert)
    ultCooldown:      f.ultimateCooldown || 0,       // universal ultimate cooldown
    spriteSheet:      f.spriteHandler?._actionDef?.sheet ?? null,
    spriteFrames:     f.spriteHandler?._actionDef?.frames ?? null,
    spriteFrameIndex: f.spriteHandler?.frameIndex ?? null,        // live animation frame (movement-feel telemetry)
    spriteAction:     f.spriteHandler?.currentAction ?? null,     // resolved sprite action (walk/run/dash/idle…)
    spriteSourceX:    f.spriteHandler?._actionDef?.sourceX ?? 0,   // active clip's sourceX (verify win/lose intro_3 split)
    spriteSourceY:    f.spriteHandler?._actionDef?.sourceY ?? 0,   // active clip's sourceY (atlas row offset — Stage 22)
    forceAction:      f._forceAction || null,                      // active _forceAction override (win/lose pose)
    spriteScale:      f.spriteScale ?? null,
    spriteReady:      !!(f.spriteHandler?._actionDef?.sheet),
    hasSpriteHandler: !!f.spriteHandler,        // false → procedural box renderer (no hasSprites)
    hasSprites:       f.hasSprites !== false,    // Stage 5 sprite-flag telemetry (false → flag-removed → procedural)
    weaponStance:     f.weaponStance || null,    // Toji stance (blade/chain/gun) — box-tint + HUD-label readable
    currentForm:      f.currentForm || null,     // transformation state (Goku SSB etc.)
    mangekyouActive:  !!f._mangekyouActive,       // Itachi Mangekyou Sharingan buff-mode
    godspeedActive:   !!f._godspeedActive,        // Killua Godspeed buff-mode ultimate
    overdriveActive:  !!f._overdriveActive,       // Hisoka Bloodlust Overdrive buff-mode form
    flashTimeActive:  !!f._flashTimeActive,        // Flash — Flash Time buff-mode ultimate
    currentForm:      f.currentForm || null,       // active transform/mode ("solarFlare"|"overload"|"base"|…)
    solarFlare:       !!f._solarFlareActive,        // Superman Stage 4: gold Solar Flare mode
    overload:         !!f._overloadActive,          // Superman Stage 4: blue Kryptonian Overload mode
    damageMult:       f.damageMultiplier || 1,
    atkSpeedMult:     f.attackSpeedMultiplier || 1,
    speedMult:        f.speedMultiplier || 1,
    flightActive:     !!f._flightActive,          // Omni-Man: Flight movement mode engaged
    forcedDescent:    !!f._forcedDescent,         // Omni-Man: crashing out of the sky (Smart Atoms depleted mid-air)
    descentLandTimer: f._descentLandTimer || 0,   // Omni-Man: crash-landing recovery frames remaining
    isBlocking:       !!f.isBlocking,              // live guard state (Flash Time block-lockout test)
    cmdHitLanded:     !!f._cmdHitLanded,           // rekka cancel-on-hit gate: true only after a clean connect (interrupt test)
    timeSlowFrozen:   !!f._timeSlowFlag,           // this fighter is being time-slow-skipped this frame (Godspeed / Flash Time)
    attackSpeedMultiplier: f.attackSpeedMultiplier ?? 1,   // buff-mode attack-speed scale (Godspeed)
    damageMultiplier: f.damageMultiplier ?? 1,    // buff-mode damage scale (Mangekyou/SSJ etc.)
    transformIndex:   f.transformIndex ?? null,
    hasSkinAnim:      !!f._skinAnim,
    shikaiActive:     !!f._shikaiActive,          // Zaraki Shikai timed power-up mode engaged
    shikaiTimer:      f._shikaiTimer || 0,        // Shikai remaining duration frames
    chargeDashCd:     f.chargeDashCd || 0,        // Zaraki Charged Dash cooldown
    yachiruCd:        f.yachiruCd || 0,           // Zaraki Yachiru Assist cooldown
    yachiruLinkActive: !!f._yachiruLinkActive,    // Zaraki (Shikai) Yachiru combo-link freeze in flight
    comboCounter:     f.comboCounter || 0,        // live combo count (verify the link continues the combo)
    skinId:           f.skinId || null,          // equipped skin (per-skin voice-override gate)
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
    juggleCount:      f.juggleCount || 0,       // MK-feel Stage 1b: air-hit count driving juggle gravity ramp
    attackCooldown:   f.attackCooldown || 0,
    thunderCd:        f.thunderCd || 0,         // Zenitsu Thunder Breathing dash-strike cooldown
    doubleAtkCd:      f.doubleAtkCd || 0,       // Zenitsu Double Attack shared cooldown
    flameCd:          f.flameCd || 0,           // Rengoku Charged Flame Strike cooldown
    counterCd:        f.counterCd || 0,         // Rengoku Counter cooldown
    rengokuCountering: f._rengokuCountering || 0, // Rengoku Counter reactive-window countdown
    doubleAtkVariant: f._doubleAtkVariant || null,   // last Double Attack partner fired
    zenUltWhiff:      !!f._zenUltWhiff,          // Zenitsu Ultimate fired on a level mismatch (whiffed)
    tauntCharge:      f._tauntCharge || 0,
    tauntPlaying:     !!f._tauntPlaying,
    tauntTimer:       f._tauntTimer || 0,
    tauntHealFlash:   f._tauntHealFlash || 0,
    edoActive:        !!f._edoActive,           // Edo Tensei window active (Tobirama body-swapped into the vessel)
    edoEnding:        !!f._edoEnding,           // un-summon cinematic in flight (either end condition)
    edoWindup:        f._edoWindup || 0,        // summoning-ritual windup frames remaining (pre-swap)
    edoFuel:          f._edoActive ? (f.energy || 0) : 0,   // window fuel = the vessel's ENERGY bar (drains → 0 ends the jutsu; extendable by building energy)
    edoVessel:        f._edoVessel || null,     // which char the vessel currently is
    edoBackup:        f._edoBackup || null,     // pre-chosen vessel
    edoDummy:         f._edoDummy ? { x: f._edoDummy.x, y: f._edoDummy.y, w: f._edoDummy.w, h: f._edoDummy.h } : null,  // standing Tobirama body
    kuramaHide:       !!f._kuramaHide,          // real body suppressed from renderHybridFighter (Minato Kurama + Edo Tensei two-vessel fix)
    name:             f.name || null,           // display name (identity proof during Ghostface Companion Swap)
    infiniteEnergy:   !!f.infiniteEnergy,        // Ghostface Swap grants this for the window (unlimited resource)
    gfSwapActive:     !!f._gfSwapActive,         // Ghostface Companion Swap window active (playing a borrowed kit)
    gfSwapTarget:     f._gfSwapTarget || null,   // which companion Ghostface swapped into
    gfSwapTimer:      f._gfSwapTimer || 0,       // frames left in the swap window (auto-revert at 0)
    invulnTimer:      f.invulnTimer || 0
  })

  window.__harness = {
    version: 1,
    __sound:     sound,     // the live SoundManager singleton — lets a test spy on SFX file calls
    // ── AUDIO-CUTOFF harness (voice/SFX stop-on-animation-end + stop-on-match-end) ──
    sfxActive: () => (sound._activeSfx ? [...sound._activeSfx].map(e => ({ file: (e.audio?.src || "").split("/").pop(), paused: !!e.audio?.paused, owned: !!e.owner, persistent: !!e.persistent })) : []),
    playSfxOwned: (file, who = "p1", persistent = false) => { const f = who === "p2" ? p2 : who === "none" ? null : p1; return !!sound.playSfxFile(file, null, { owner: f, persistent }) },   // who="none" → UNOWNED cue (models real intro/win-lines, exempt from the single-voice-channel stop)
    sfxStopAll: (inclPersistent = false) => sound.stopAllSfx?.({ includePersistent: inclPersistent }),
    start:       startHarnessMatch,
    skipToBattle,
    // Read a character's static definition (intro pool + animation sheets + stats) — test-only
    // window into characters.js data (used by per-character build harnesses, e.g. intro-pool checks).
    charDef: (key) => { const c = characters[key]; if (!c) return null; return { spriteScale: c.spriteScale ?? null, hasSprites: !!c.hasSprites, introSequencePool: c.introSequencePool || null, introPool: c.introPool || null, introSequence: c.introSequence || null, animationData: Object.fromEntries(Object.entries(c.animationData || {}).map(([k, v]) => [k, { sheet: v.sheet || null, frames: v.frames || null }])), stats: c.stats || null } },
    // ── STAGE 10 preload hooks ──────────────────────────────────────────────────
    preloadDone:     () => _preloadPromise,                 // resolves once every match sheet has decoded/errored
    preloadReady:    () => _preloadReady,                   // the INTRO→BATTLE gate flag
    preloadFailures: () => _preloadFailures.map(f => ({ ...f })),
    preloadProgress: () => ({ ..._preloadProgress }),
    // ── STAGE 11A determinism hooks ─────────────────────────────────────────────
    rng: {
      seed:           () => matchConfig.seed,               // the seed the CURRENT match was started from
      forceSeed:      (v) => { _forcedSeed = (v == null) ? null : (v >>> 0) },  // next startMatch() uses this
      clearForceSeed: () => { _forcedSeed = null },
      reseed:         (v) => reseedRng(v),                  // reseed the live stream directly (unit-test the PRNG)
      draw:           (n = 1) => Array.from({ length: n }, () => gameRng.next()),  // pull n values from the stream
      currentSeed:    () => gameRng.seed
    },
    // ── STAGE 11B replay-recording hooks ────────────────────────────────────────
    replay: {
      recording:  () => replay.isRecording(),
      current:    () => replay.getRecording(),          // live snapshot of the in-progress recording
      last:       () => _lastReplay,                    // finalized replay of the most recent finished match
      frame:      () => _replayFrame,                   // current battle-frame index
      rawMask:    (who = "p1") => replay.encodeInput(readRawControls(who === "p2" ? p2 : p1)),
      rawInput:   (who = "p1") => readRawControls(who === "p2" ? p2 : p1),
      encode:     (raw) => replay.encodeInput(raw),
      decode:     (mask) => replay.decodeInput(mask),
      balanceStamp: () => replay.BALANCE_STAMP,
      // ── 11C playback ──
      stopAndGet:    () => replay.finishRecording(),       // finalize the in-progress recording → replay obj
      validate:      (rep) => replay.validateReplay(rep),
      play:          (rep) => beginReplayPlayback(rep),     // start playing a replay back
      isPlayback:    () => replay.isPlayback(),
      playbackState: () => replay.playbackState(),
      stopPlayback:  () => replay.stopPlayback(),
      // ── 11D save/load round-trip + victory button ──
      lastJson:      () => _lastReplay ? JSON.stringify(_lastReplay) : null,   // the finished match, serialized
      playJson:      (str) => { try { return beginReplayPlayback(JSON.parse(str)) } catch (e) { return { ok: false, reason: String(e) } } },
      saveLast:      () => saveLastReplay(),                 // trigger the download (browser save)
      // Prove the Save-Replay victory button wiring without a full match: build a live victoryState and
      // hit-test the button center. Returns "saveReplay" when available, else what that spot resolves to.
      victorySaveHitTest: (canSave) => {
        const vs = createVictoryState(); vs.active = true; vs.fadeAlpha = 1; vs.canSaveReplay = !!canSave
        const c = { x: canvas.width / 2, y: canvas.height * 0.82 + 66 + 20 }   // center of _saveReplayRect
        return handleVictoryClick(vs, c, canvas)
      },
      // Stage 24C: the CHANGE CHARACTER button hit-test (with a replay present → right-slot layout).
      victoryChangeCharHitTest: () => {
        const vs = createVictoryState(); vs.active = true; vs.fadeAlpha = 1; vs.canSaveReplay = true; vs.canChangeChar = true
        const c = { x: canvas.width / 2 + 110, y: canvas.height * 0.82 + 66 + 20 }   // center of the change-char (right) slot
        return handleVictoryClick(vs, c, canvas)
      }
    },
    // Center point of a GAMEPLAY_SELECT button by id — so menu-click tests stay correct when the
    // menu gains/loses rows (the vertical layout re-centers all rows on any count change).
    gameplayRect: (id) => { const r = getGameplaySelectRects(canvas).find(x => x.id === id); return r ? { x: Math.round(r.x + r.w / 2), y: Math.round(r.y + r.h / 2) } : null },
    // ── AI vs AI SPECTATOR MODE (aivsai.test.mjs) ────────────────────────────────
    // Drives the REAL mode: configures the setup, starts the run, and ticks the actual
    // updateCurrentState() logic synchronously (no rAF wait) so N matches resolve in ms.
    // Returns the SAME exported log a player would download from the summary screen.
    aiVsAi: {
      // Configure + start an N-match run. opts: { p1, p2, p1Diff, p2Diff, matches, speed }
      start: (opts = {}) => {
        if (opts.p1 && characters[opts.p1]) aiVsAiConfig.p1Key = opts.p1
        if (opts.p2 && characters[opts.p2]) aiVsAiConfig.p2Key = opts.p2
        if (opts.p1Diff) aiVsAiConfig.p1Diff = opts.p1Diff
        if (opts.p2Diff) aiVsAiConfig.p2Diff = opts.p2Diff
        if (opts.matches) aiVsAiConfig.matches = opts.matches | 0
        if (opts.speed != null) { const i = SPECTATOR_SPEEDS.indexOf(opts.speed); if (i >= 0) aiVsAiConfig.speedIndex = i }
        startAiVsAiSession()
        return { mode: matchConfig.mode, matchesTotal: aiVsAiState.matchesTotal, speed: aiVsAiState.speed }
      },
      // Advance the real game logic by n frames (synchronous; bypasses the rAF clock).
      step: (n = 1) => { for (let i = 0; i < n; i++) { globalFrameCount++; updateCurrentState() } },
      // Start a run and tick until it finishes (or a frame cap). Returns the exported log.
      runToCompletion: (opts = {}, frameCap = 400000) => {
        window.__harness.aiVsAi.start(opts)
        let frames = 0
        while (!aiVsAiState.finished && frames < frameCap) { globalFrameCount++; updateCurrentState(); frames++ }
        return { frames, finished: aiVsAiState.finished, ...window.__harness.aiVsAi.getExport() }
      },
      state: () => ({
        active: aiVsAiState.active, finished: aiVsAiState.finished,
        matchesDone: aiVsAiState.matchesDone, matchesTotal: aiVsAiState.matchesTotal,
        speed: aiVsAiState.speed, gameState
      }),
      // How many LOGIC ticks gameLoop runs per rendered frame right now — mirrors the exact
      // fast-forward guard in gameLoop, so a test can prove the speed control is engaged.
      ticksPerFrame: () => (aiVsAiState.active && aiVsAiState.speed > 1 && _aiVsAiFastForwardState()) ? aiVsAiState.speed : 1,
      // The finished run's exported log (null until the run completes).
      getExport: () => aiVsAiState.lastExport
        ? { json: aiVsAiState.lastExport.json, csv: aiVsAiState.lastExport.csv,
            summary: aiVsAiState.lastExport.summary,
            jsonName: aiVsAiState.lastExport.jsonName, csvName: aiVsAiState.lastExport.csvName }
        : null,
      // Live snapshot of the in-progress session log (before completion) — for mid-run assertions.
      liveSession: () => aiVsAiState.session ? sessionToJSON(aiVsAiState.session) : null
    },
    // Last frame the persistent Absolute Defense ribcage/aura SHEET actually rendered — lets a
    // test prove the imagery persists past the one-shot toggle FX (playtester visual-bug fix).
    absDefAuraSheetFrame: () => _absDefAuraSheetFrame,
    // Vegeta intro-aura overlay probe: total renders + last frame drawn (proves the
    // intro_2_effects layer actually composites over the intro2 pose).
    introAura: () => ({ renders: _vegetaIntroAuraRenderCount, frame: _vegetaIntroAuraFrame }),
    // Vegeta command-normal chain probe (drive the rekka precisely from a test): current move +
    // attack phase + pending next stage + whether the current hit connected + the heavy-edge latch.
    vegCmd: () => (p1 ? { action: p1._lastSpriteAction || null, move: p1.currentMove || null, phase: getAttackPhase(p1), rekkaNext: p1._rekkaNext || null, connected: !!p1._cmdHitLanded, prevHeavy: !!p1._cmdPrevHeavy, attacking: !!p1.attacking, cooldown: p1.attackCooldown || 0 } : null),
    miwaCmd: () => (p1 ? { action: p1._lastSpriteAction || null, move: p1.currentMove || null, phase: getAttackPhase(p1), rekkaNext: p1._rekkaNext || null, connected: !!p1._cmdHitLanded, attacking: !!p1.attacking, cooldown: p1.attackCooldown || 0 } : null),
    // Ichigo "Zangetsu" command-chain probe (mirrors miwaCmd) — drive the Fwd+Heavy rekka + command normals precisely from a test.
    ichigoCmd: (who = "p1") => { const f = who === "p2" ? p2 : p1; return f ? { action: f._lastSpriteAction || null, move: f.currentMove || null, phase: getAttackPhase(f), rekkaNext: f._rekkaNext || null, connected: !!f._cmdHitLanded, attacking: !!f.attacking, cooldown: f.attackCooldown || 0, cast: f._spriteCastMove || null } : null },
    // Obito "Kamui Rod Combo" Fwd+Heavy rekka probe (mirrors ichigoCmd) — drive obitoRod1→2→3 precisely.
    obitoCmd: (who = "p1") => { const f = who === "p2" ? p2 : p1; return f ? { action: f._lastSpriteAction || null, move: f.currentMove || null, phase: getAttackPhase(f), rekkaNext: f._rekkaNext || null, connected: !!f._cmdHitLanded, attacking: !!f.attacking, cooldown: f.attackCooldown || 0 } : null },
    // Obito KAMUI INTANGIBILITY probe (Stage 4): toggle state + whether he's currently PHASED (ghost + i-frames)
    // vs tangible (mid-melee drop) + live chakra + the sustained invulnTimer.
    obitoKamui: (who = "p1") => { const f = who === "p2" ? p2 : p1; return f ? { intangible: !!f._kamuiIntangible, phased: !!f._kamuiPhased, energy: Math.round(f.energy || 0), invulnTimer: f.invulnTimer || 0, attacking: !!f.attacking } : null },
    // Directly flip Kamui from a test (mirrors the P-TAP path) — returns the resulting state.
    obitoKamuiToggle: (who = "p1") => { const f = who === "p2" ? p2 : p1; if (!f) return null; toggleObitoKamui(f, getAbilityContext()); return { intangible: !!f._kamuiIntangible, phased: !!f._kamuiPhased, energy: Math.round(f.energy || 0) } },
    // Tobi KAMUI INTANGIBILITY probe + toggle (Stage 4) — INDEPENDENT `_tobi*` state; reads none of Obito's.
    tobiKamui: (who = "p1") => { const f = who === "p2" ? p2 : p1; return f ? { intangible: !!f._tobiIntangible, phased: !!f._tobiPhased, energy: Math.round(f.energy || 0), invulnTimer: f.invulnTimer || 0, attacking: !!f.attacking } : null },
    tobiKamuiToggle: (who = "p1") => { const f = who === "p2" ? p2 : p1; if (!f) return null; toggleTobiKamui(f, getAbilityContext()); return { intangible: !!f._tobiIntangible, phased: !!f._tobiPhased, energy: Math.round(f.energy || 0) } },
    miwaFx: (who = "p1") => { const f = who === "p2" ? p2 : p1; return f ? { vortex: !!f._miwaVortex, vortexT: f._miwaVortex?.t ?? null, energy: f.energy, charging: !!f.isCharging, action: f._lastSpriteAction || null, move: f.currentMove || null } : null },
    hisokaPull: () => (p1 && p2 ? { grabPull: p1._grabPull || null, heldDir: p1._specialHeldDir || null, p1x: p1.x, p1w: p1.w, p2x: p2.x, p2w: p2.w, grabbed: !!p2.isGrabbed, grabTimer: p2.grabTimer || 0 } : null),
    // Maki command-normal chain probe (mirrors miwaCmd) — drive the "Cursed Tool Flurry" rekka precisely.
    // Adds `window` = the EFFECTIVE cancel window (getCancelWindow: recovery span, narrowed windowFrames,
    // and whether the tightened link is currently open) so a test can prove the Heavenly-Vow tight timing.
    makiCmd: () => (p1 ? { action: p1._lastSpriteAction || null, move: p1.currentMove || null, phase: getAttackPhase(p1), rekkaNext: p1._rekkaNext || null, connected: !!p1._cmdHitLanded, attacking: !!p1.attacking, cooldown: p1.attackCooldown || 0, window: getCancelWindow(p1) } : null),
    tojiCmd: (who = "p1") => { const f = who === "p2" ? p2 : p1; return f ? { action: f._lastSpriteAction || null, move: f.currentMove || null, phase: getAttackPhase(f), rekkaNext: f._rekkaNext || null, connected: !!f._cmdHitLanded, attacking: !!f.attacking, cooldown: f.attackCooldown || 0, cast: f._spriteCastMove || null, gunCd: f._gunCd || 0 } : null },
    // Toji two-stage comeback state (Stage 6 tests): saves used, form, HP, buff multiplier.
    tojiComeback: (who = "p1") => { const f = who === "p2" ? p2 : p1; return f ? { savesUsed: f._comebackSavesUsed || 0, reincarnated: !!f._reincarnated, manualFormUsed: !!f._tojiFormManualUsed, form: f.currentForm || null, health: Math.round(f.health || 0), maxHealth: f.maxHealth || 0, hpPct: Math.round((f.health || 0) / (f.maxHealth || 1) * 100), dmgMult: f.damageMultiplier || 1, invuln: f.invulnTimer || 0 } : null },
    setP1HealthRaw: v => { if (p1) p1.health = v },   // UNCLAMPED health set (comeback tests need to drive to exactly 0)
    // Is a fighter's resource meter fully suppressed? Mirrors the exact ui.js drawEnergyPanel gate
    // (traits.hideResourceMeter) — Maki is HP-only, no meter at all.
    resourceMeterHidden: (who = "p1") => { const f = who === "p2" ? p2 : p1; return !!(f?.traits?.hideResourceMeter) },
    // Maki "Cursed Tool Awakening" Stage-4 probe: HP-threshold unlock state + live Shibuya-form view.
    makiShibuya: (who = "p1") => { const f = who === "p2" ? p2 : p1; if (!f) return null; return { unlocked: !!f._shibuyaUnlocked, hpPct: (f.health || 0) / (f.maxHealth || 1) * 100, active: makiShibuyaActive(f), form: f.currentForm || "base", dmgMult: f.damageMultiplier || 1, spriteScale: f.spriteScale || 0 } },
    makiShibuyaCine: () => ({ active: isMakiShibuyaCinematicActive(), ...(getMakiShibuyaCinematicStatus?.() || {}) }),
    // Maki "Void Hunter" skin overlay probe: seeded-once starfield/nebula counts + animation clock + the
    // tracked sprite bbox the overlay follows (drawVoidHunterOverlay, gated on skinId makiVoidHunter).
    voidHunterFX: (who = "p1") => { const f = who === "p2" ? p2 : p1; const fx = f?._voidHunterFX; return { seeded: !!fx, stars: fx?.stars?.length || 0, nebulae: fx?.nebulae?.length || 0, clock: f?._voidHunterClock || 0, rect: { x: f?._lastDrawX ?? null, y: f?._lastDrawY ?? null, w: f?._lastDrawW ?? null, h: f?._lastDrawH ?? null } } },
    // Obito "Void Mask" skin overlay probe: seeded-once Sharingan particles + Kamui swirl pulses + the tracked sprite bbox.
    obitoVoidFX: (who = "p1") => { const f = who === "p2" ? p2 : p1; const fx = f?._obitoVoidFX; return { seeded: !!fx, dots: fx?.dots?.length || 0, swirls: fx?.swirls?.length || 0, clock: f?._obitoVoidClock || 0, skinId: f?.skinId || null, rect: { x: f?._lastDrawX ?? null, y: f?._lastDrawY ?? null, w: f?._lastDrawW ?? null, h: f?._lastDrawH ?? null } } },
    // tracked sprite bbox the Yuji Void overlay follows (drawYujiVoidOverlay, gated on skinId yujiVoid).
    yujiVoidFX: (who = "p1") => { const f = who === "p2" ? p2 : p1; const fx = f?._yujiVoidFX; return { seeded: !!fx, dots: fx?.dots?.length || 0, clusters: fx?.clusters?.length || 0, clock: f?._yujiVoidClock || 0, skinId: f?.skinId || null, rect: { x: f?._lastDrawX ?? null, y: f?._lastDrawY ?? null, w: f?._lastDrawW ?? null, h: f?._lastDrawH ?? null } } },
    // Minato Void Flash — golden Raijin spark overlay (drawVoidFlashOverlay, gated on skinId minatoVoidFlash).
    minatoVoidFX: (who = "p1") => { const f = who === "p2" ? p2 : p1; const fx = f?._voidFlashFX; return { seeded: !!fx, sparks: fx?.sparks?.length || 0, glows: fx?.glows?.length || 0, clock: f?._voidFlashClock || 0, skinId: f?.skinId || null, rect: { x: f?._lastDrawX ?? null, y: f?._lastDrawY ?? null, w: f?._lastDrawW ?? null, h: f?._lastDrawH ?? null } } },
    gojoInfinityFX: (who = "p1") => { const f = who === "p2" ? p2 : p1; const fx = f?._gojoInfinityFX; return { seeded: !!fx, motes: fx?.motes?.length || 0, rings: fx?.rings?.length || 0, clock: f?._gojoInfinityClock || 0, skinId: f?.skinId || null, rect: { x: f?._lastDrawX ?? null, y: f?._lastDrawY ?? null, w: f?._lastDrawW ?? null, h: f?._lastDrawH ?? null } } },
    // Omega Ranger command-chain probe (mirrors vegCmd) — drive the kick-chain rekka precisely.
    orCmd: () => (p1 ? { action: p1._lastSpriteAction || null, move: p1.currentMove || null, phase: getAttackPhase(p1), rekkaNext: p1._rekkaNext || null, connected: !!p1._cmdHitLanded, attacking: !!p1.attacking, cooldown: p1.attackCooldown || 0 } : null),
    // Combo-flow Stage 2: the SHARED cancel-window view for either fighter — proves every character's
    // cancel timing reads through the one getCancelWindow() API in the same frame-defined shape.
    cancelWindow: (who = "p1") => { const f = who === "p2" ? p2 : p1; return f ? getCancelWindow(f) : null },
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
      // ── SERVER TIER (situation D) ──────────────────────────────────────────
      awaitBoot: () => _asyncBootReady,                // resolves once the async server + FSA-reattach boot tiers finish
      serverAvailable: () => isSaveServerAvailable(),  // did /api/health respond? (false on Pages/file:///noserver)
      status: () => saveFileStatus(),                  // which tier is live, human-readable (Settings row text)
      // ── EXPORT / IMPORT round-trip ─────────────────────────────────────────
      exportText: () => exportSaveText(),              // the downloadable snapshot JSON string
      importText: (t) => { const n = importSaveText(t); if (n > 0) hydrateFromLoadedSave(); return n },
      reconnect: async () => { const r = await reconnectSaveFile(); if (r?.ok) hydrateFromLoadedSave(); return r },
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
    // ── EDO TENSEI vessel-select (Stage 6 Step B) ────────────────────────────────
    // Live view of the Tobirama backup-select flow + the click rects for its grid + the stamped
    // per-fighter vessel. Lets a test click through the real SELECT_EDO_BACKUP screen.
    edoBackup: {
      state: () => ({ gameState, selectState: GAME_STATES.SELECT_EDO_BACKUP, side: matchConfig.edoSelectSide || null, roster: getEdoBackupRoster().map(c => c.id), p1Backup: matchConfig.p1EdoBackup || null, p2Backup: matchConfig.p2EdoBackup || null }),
      cardRects: () => getCharacterCardRects(canvas, getEdoBackupRoster()),
      fighterBackup: (who = "p1") => (who === "p2" ? p2 : p1)?._edoBackup || null,
      setBackup: (key, who = "p1") => { const f = who === "p2" ? p2 : p1; if (f) f._edoBackup = key; return f?._edoBackup || null },   // test-only: pick the vessel post-boot
      revert: (who = "p1") => { const f = who === "p2" ? p2 : p1; return f ? revertEdoTensei(f) : false },   // force the auto-revert (Step D timing test)
      setFuel: (n, who = "p1") => { const f = who === "p2" ? p2 : p1; if (f && f._edoActive) f.energy = n; return f?.energy ?? null },   // fast-forward the window: the fuel IS the vessel's energy bar — set near 0 → next drain tick de-summons
      dummyRect: (who = "p1") => { const f = who === "p2" ? p2 : p1; return f?._edoDummy ? { x: f._edoDummy.x, y: f._edoDummy.y, w: f._edoDummy.w, h: f._edoDummy.h } : null },   // the standing Tobirama's hit-box for the counter-play test
      cine: () => getEdoTenseiCinematicStatus(),   // summon/un-summon cinematic status (active/mode/frame/resolved)
      // Vessel-intro reveal beat (plays the summoned char's OWN intro pose+voice after the coffin closes).
      introBeat: (who = "p1") => { const f = who === "p2" ? p2 : p1; return f ? { playing: !!f._edoIntroPlaying, variant: f._introVariant || null, revealFrame: f._introRevealFrame || 0, introPlaying: !!f._introPlaying } : null },
      // Fast-forward a timer-based nested form (Susanoo) to its expiry so the drain-pause test can observe
      // the vessel REVERT (and the outer Edo drain resume) without waiting out the full ~20s form timer.
      expireVesselTimerForm: (who = "p1") => { const f = who === "p2" ? p2 : p1; if (!f) return false; if ((f._itachiSusanooTimer || 0) > 1) f._itachiSusanooTimer = 1; if ((f._susanooTimer || 0) > 1) f._susanooTimer = 1; return true },
      // Is ANY inner-ultimate cinematic freezing the loop right now? (proves the Edo window timer pauses.)
      innerCineActive: () => isFlashTimeCinematicActive() || isBeerusKiBallCinematicActive() || isBen10OmnitrixCinematicActive() || isBatmanDarkKnightCinematicActive() || isOmniManBodySlamCinematicActive() || isSupermanUltimateCinematicActive() || isRengokuFlameExplosionCinematicActive() || isMadaraTengaiShinseiCinematicActive() || isPainChibakuTenseiCinematicActive() || isYujiUltimateCinematicActive() || isShinobuButterflyCinematicActive() || isMakiShibuyaCinematicActive() || isGhostfaceFinalActCinematicActive() || isMiwaUltimateCinematicActive() || isIchigoGetsugaCinematicActive() || isVegetaFinalFlashCinematicActive() || isKilluaGodspeedCinematicActive() || isHisokaOverdriveCinematicActive() || isTojiReincarnationCinematicActive() || isSSJRoseCinematicActive() || isGokuBlackSwordCinematicActive() || isRedRangerPowerSwordCinematicActive() || isMangekyouCinematicActive() || isSasukeCinematicActive() || isKuramaCinematicActive() || isMinatoKuramaActive() || isObitoJuubiCinematicActive() || isTobiNineTailsCinematicActive(),
      skipCine: () => { clearEdoTenseiCinematic(); _edoCineMode = null; for (const f of [p1, p2]) if (f) f._edoIntroPlayed = true; return getEdoTenseiCinematicStatus() },   // force-complete the cinematic (fires its resolve = swap/revert) + suppress the follow-on vessel-intro beat (fast-forward past all presentation) for tests
      // Start a match PRESERVING the current UI selections (unlike boot(), which resets) — so a test
      // can prove the vessel picked through the real screens survives into the live fighter.
      startPreserving: () => { matchConfig.selectedStage = matchConfig.selectedStage || stages[0]; if (matchConfig.mode === "training") { matchConfig.p2Char = matchConfig.p1Char; matchConfig.p2CharKey = matchConfig.p1CharKey } startMatch(); skipToBattle(); return { p1: p1?.rosterKey, edo: p1?._edoBackup } }
    },
    // ── UNLOCK CODES + menu visibility (beta-redefinition test) ──────────────────
    // Apply a dev/beta code and read back the resulting unlock flags. Beta codes TOGGLE
    // (entering one again turns beta back off).
    applyCode: (code) => ({ result: applyUnlockCode(code), beta: isBetaUnlocked(), dev: isDevUnlocked() }),
    // Explicit "clear action" for beta — turns it off regardless of current state (separate from re-entry).
    clearBeta: () => ({ beta: (clearBetaUnlock(), isBetaUnlocked()), dev: isDevUnlocked() }),
    // ── CREDITS screen (Stage 18) ────────────────────────────────────────────────
    // Drive the in-game attribution screen + read the live attribution data so a test can
    // prove the .txt-named artists actually reach the player (screen + per-character line).
    credits: {
      enter: () => { creditsScroll = 0; gameState = GAME_STATES.CREDITS; return gameState },
      state: () => ({ gameState, isCredits: gameState === GAME_STATES.CREDITS, scroll: creditsScroll, contentHeight: creditsContentHeight }),
      // Flattened list of every artist name that appears in the rendered CREDITS sections.
      artistsShown: () => CREDITS.flatMap(s => (s.entries || []).flatMap(e => e.artists || [])),
      sourcedKeys: () => Object.keys(SOURCED_ART),
      artistLine: (key) => artistLineForCharacter(key),      // the select-screen "Art: …" line (null if none)
      attributedKeys: () => [...allAttributedKeys()]
    },
    // Ground-truth sprite roster (hasSprites+animData-derived) + full non-hidden roster — so tests can
    // assert the beta filter equals the live selectable set without hardcoding names.
    rosterSets: () => ({ sprite: betaRosterKeys(), all: Object.keys(characters).filter(k => !characters[k]?.hidden), spriteUniverses: [...spriteUniverseSet()],
      // Stage 5B: playable = offerable in the CURRENT session (isPlayable + beta gate); nonPlayable = built-out but flagged isPlayable:false.
      playable: Object.keys(characters).filter(k => !characters[k]?.hidden && rosterKeyAllowed(k)), nonPlayable: Object.keys(characters).filter(k => characters[k]?.isPlayable === false), playableUniverses: [...playableUniverseSet()] }),
    // Character POOLS for every mode OUTSIDE the main select screen — so a test can assert the BETA gate
    // covers them all, not just the main select. Keys only. mainSelect is the flat main-select set.
    modeRosters: () => {
      const prev = matchConfig.selectedUniverse
      const mainSelect = []
      for (const u of Object.keys(universeMap)) { matchConfig.selectedUniverse = u; mainSelect.push(...getUniverseCharacters()) }
      matchConfig.selectedUniverse = prev
      return {
        mainSelect,
        tower:    filterAllowedRosterKeys(allCharacterKeys),        // Tower-Mode opponent draw pool
        ffa:      ffaSelectableRoster().map(c => c.rosterKey),      // FFA character-select grid
        aiVsAi:   aiVsAiRoster().map(c => c.key),                   // AI-vs-AI spectator picker
        fallback: getFallbackCharacterKey()                        // safety default
      }
    },
    // Draw the ACTUAL Tower random-opponent picker N times → the DISTINCT set of keys it can yield.
    // Proves the live randomness (not just the pool) never surfaces a spriteless fighter under BETA.
    towerSample: (n = 300) => { const s = new Set(); for (let i = 0; i < n; i++) s.add(_towerPickOpponent()); return [...s] },
    // Jump to the REAL FFA character-select grid so a screenshot shows the mode's roster surface honoring
    // the BETA filter (renders ffaSelectableRoster(), which is now BETA-gated).
    showFfaCharSelect: (count = 4) => { resetSelections(); matchConfig.mode = "ffa"; ffaState.playerCount = count; ffaState.charKeys = []; ffaState.pickSlot = 0; hoverFFACharIndex = 0; gameState = GAME_STATES.FFA_CHARSELECT; return { gameState, roster: ffaSelectableRoster().map(c => c.rosterKey) } },
    // FFA setup/slot/team preview: populate plausible FFA state so each screen renders meaningfully.
    showFfa: (screen = "FFA_SETUP", hover = 0) => {
      matchConfig.mode = "ffa"; ffaState.playerCount = 4
      ffaState.charKeys = ["goku", "naruto", "gojo", "sasuke"]
      ffaState.aiSlots  = [null, "hard", null, "easy"]
      ffaState.teams    = ["A", "B", "A", "B"]
      const S = GAME_STATES[screen]; if (S == null) return { error: screen }
      gameState = S
      if (screen === "FFA_SETUP")      hoverFFAIndex     = hover | 0
      if (screen === "FFA_SLOTSELECT") hoverFFASlotIndex = hover | 0
      if (screen === "FFA_TEAMSELECT") hoverFFATeamIndex = hover | 0
      if (screen === "FFA_CHARSELECT") { hoverFFACharIndex = hover | 0; ffaState.pickSlot = 0 }
      return { gameState, screen, hover: hover | 0 }
    },
    // Is a specific (level-gated) skin currently unlocked? Proves beta grants ALL skins.
    skinUnlocked: (rosterKey, skinId) => isSkinUnlocked(rosterKey, skinId),
    // ── SESSION PERSISTENCE (cross-reload restore test) ──────────────────────────
    // Live view of the persisted session (what will be restored on reload) + the current gameState +
    // key selection/training fields. `raw` is the exact localStorage blob (null if nothing persisted).
    session: () => ({
      raw: readSession(),
      gameState,
      mode: matchConfig.mode, aiDifficulty: matchConfig.aiDifficulty,
      selectedUniverse: matchConfig.selectedUniverse, selectedStage: matchConfig.selectedStage?.name || null,
      p1CharKey: matchConfig.p1CharKey, p2CharKey: matchConfig.p2CharKey,
      p1Skin: matchConfig.p1Skin, p2Skin: matchConfig.p2Skin,
      infiniteResources: trainingState.infiniteResources, dummyBehavior: trainingState.dummyBehavior,
      beta: isBetaUnlocked(), dev: isDevUnlocked()
    }),
    clearSession: () => { clearSession(); _lastSessionJson = null; return true },   // simulate a truly-fresh player (also test-isolation between reloads)
    // Directly set selections/training toggles (drives the persistence save without clicking menus),
    // then force a snapshot so the change is on disk immediately (no need to wait a frame).
    setSession: (patch = {}) => {
      if (patch.mode !== undefined) matchConfig.mode = patch.mode
      if (patch.selectedUniverse !== undefined) matchConfig.selectedUniverse = patch.selectedUniverse
      if (patch.selectedStage !== undefined) { const st = stages.find(x => x.name === patch.selectedStage); matchConfig.selectedStage = st || matchConfig.selectedStage }
      if (patch.p1CharKey !== undefined && characters[patch.p1CharKey]) { matchConfig.p1CharKey = patch.p1CharKey; matchConfig.p1Char = characters[patch.p1CharKey] }
      if (patch.p2CharKey !== undefined && characters[patch.p2CharKey]) { matchConfig.p2CharKey = patch.p2CharKey; matchConfig.p2Char = characters[patch.p2CharKey] }
      if (patch.p1Skin !== undefined) matchConfig.p1Skin = patch.p1Skin
      if (patch.p2Skin !== undefined) matchConfig.p2Skin = patch.p2Skin
      if (patch.infiniteResources !== undefined) trainingState.infiniteResources = !!patch.infiniteResources
      if (patch.dummyBehavior !== undefined && DUMMY_BEHAVIORS.includes(patch.dummyBehavior)) trainingState.dummyBehavior = patch.dummyBehavior
      if (patch.screen !== undefined) gameState = patch.screen
      persistSessionIfChanged()
      return window.__harness.session()
    },
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
    // UI-POLISH capture hook: jump to a simple menu/select screen and set its hover row, so each
    // redesigned screen can be screenshotted + its hover animation driven. View-only navigation.
    showMenu: (screen = "MAIN_MENU", hover = 0) => {
      const S = GAME_STATES[screen]; if (S == null) return { error: "unknown screen " + screen }
      gameState = S
      const setters = {
        MAIN_MENU:       v => hoverMainMenuIndex = v,
        GAMEPLAY_SELECT: v => hoverGameplayIndex = v,
        TOWER_SELECT:    v => hoverTowerIndex = v,
        AI_DIFFICULTY:   v => hoverDifficultyIndex = v,
        SELECT_UNIVERSE: v => hoverUniverseIndex = v,
        SELECT_STAGE:    v => hoverStageIndex = v,
        ARCADE_SETUP:    v => hoverArcadeIndex = v,
        BRACKET_SETUP:   v => hoverBracketIndex = v,
        AI_VS_AI_SETUP:  v => hoverAiVsAiIndex = v,
        AI_VS_AI_SUMMARY:v => hoverAiVsAiSummaryIndex = v,
      }
      setters[screen]?.(hover | 0)
      return { gameState, screen, hover: hover | 0 }
    },
    // Arcade-mode screen previews (Stage 21): rival intro / ending slide / bracket tree.
    showArcade: (which = "bracket") => {
      if (which === "rival") {
        matchConfig.p1CharKey = "goku"; matchConfig.p2CharKey = "vegeta"
        gameState = GAME_STATES.ARCADE_RIVAL_INTRO
      } else if (which === "ending") {
        arcadeState.rosterKey = "goku"
        try { arcadeEndingSlides = endingSlidesFor("goku", characters) } catch (_) { arcadeEndingSlides = [{ text: "The multiverse is safe — for now." }] }
        arcadeEndingIndex = 0; arcadeEndingStartMs = performance.now() - 2500
        gameState = GAME_STATES.ARCADE_ENDING
      } else {
        bracketState = { size: 4, entrants: [], rounds: [
          [ { a: { name: "Goku" }, b: { name: "Vegeta" }, winner: { name: "Goku" } }, { a: { name: "Naruto" }, b: { name: "Sasuke" }, winner: null } ],
          [ { a: { name: "Goku" }, b: null, winner: null } ]
        ], round: 0, matchIdx: 1, champion: null }
        gameState = GAME_STATES.BRACKET_VIEW
      }
      return { gameState, which }
    },
    // Ben10 alien (Omnitrix) select preview: pick a couple forms + hover a card.
    showAlienSelect: (picks = 2, hoverX = null, hoverY = null) => {
      matchConfig.mode = "vs"; matchConfig.alienSelectSide = "p1"
      const pool = getAlienPoolList()
      matchConfig.alienDraft = pool.slice(0, Math.max(0, picks | 0)).map(a => a.key)
      gameState = GAME_STATES.SELECT_ALIENS
      if (hoverX != null) { mouse.x = hoverX; mouse.y = hoverY }
      return { gameState, draft: matchConfig.alienDraft }
    },
    // Move List screen preview: select a fighter row and toggle the controls/kit view.
    showMoveList: (idx = 0, controls = false) => { const f = getMoveListFighters(); moveListIndex = Math.max(0, Math.min(f.length - 1, idx | 0)); moveListShowControls = !!controls; gameState = GAME_STATES.MOVE_LIST; return { gameState, idx: moveListIndex, controls: moveListShowControls, fighter: f[moveListIndex]?.key } },
    // Results/victory screen preview (Stage 9): boot a match if needed, populate a victoryState with
    // sample stats, and show the results screen.
    showVictory: (side = "p1") => {
      if (!p1 || !p2) { startHarnessMatch(); skipToBattle() }
      victoryState = createVictoryState()
      victoryState.active = true; victoryState.fadeAlpha = 1
      victoryState.winnerSide = side; victoryState.winnerName = (side === "p2" ? p2 : p1)?.name || "Player 1"
      victoryState.canSaveReplay = true; victoryState.canChangeChar = true
      victoryState.flawless = false
      const st = matchStats || createMatchStats()
      st.p1 = { ...st.p1, damageDealt: 1840, hitsLanded: 42, maxCombo: 9, specialsUsed: 6, ultimatesUsed: 1, roundsWon: 2, perfectRounds: 1 }
      st.p2 = { ...st.p2, damageDealt: 1210, hitsLanded: 31, maxCombo: 6, specialsUsed: 4, ultimatesUsed: 0, roundsWon: 1, perfectRounds: 0 }
      victoryState.stats = st
      gameState = GAME_STATES.VICTORY
      return { gameState, side }
    },
    // Fire the K.O. stamp directly (for capture) — the same slam a real knockout triggers.
    triggerKo: () => { knockoutFlash = 18; _koStamp = _koStampMax = 48; return { koStamp: _koStamp } },
    // Pause menu preview (needs a live match behind it for the frosted backdrop): boot to battle if not
    // already in one, then enter the paused state at the given menu row.
    showPause: (hover = 0) => {
      if (gameState !== GAME_STATES.BATTLE && gameState !== GAME_STATES.PAUSED) { startHarnessMatch(); skipToBattle() }
      stateBeforePause = GAME_STATES.BATTLE
      gameState = GAME_STATES.PAUSED
      pauseMenuIndex = Math.max(0, Math.min(PAUSE_MENU_ITEMS.length - 1, hover | 0))
      return { gameState, hover: pauseMenuIndex }
    },
    // Stage 23: random select + read the hovered fighter's detail (stats + archetype + kit).
    randomSelect: (universeOnly = false) => { pickRandomCharacter(universeOnly); return { gameState, side: matchConfig.selectingSide, picked: matchConfig[matchConfig.selectingSide === "p1" ? "p1CharKey" : "p2CharKey"] } },
    selectDetail: () => { const r = getCharacterRosterForSelectedUniverse(); const hv = r[hoverCharacterIndex]; const ck = hv && characters[hv.id]; return ck ? { key: hv.id, name: ck.name, stats: ck.stats, kitType: getKit(hv.id, ck)?.type, difficulty: getKit(hv.id, ck)?.difficulty, homeStage: ck.homeStage || null } : null },
    // Jump to the REAL skin-select screen for a character (renders each skin's portrait) — for alt-skin previews.
    showSkinSelect: (char = "beerus", side = "p1", hover = 1) => { resetSelections(); matchConfig.mode = "training"; matchConfig[side + "CharKey"] = char; matchConfig[side + "Char"] = characters[char]; skinSelectSide = side; hoverSkinIndex = hover; _skinConfirm = null; gameState = GAME_STATES.SELECT_SKIN; return { gameState, char, skins: getSkins(char).map(s => ({ id: s.id, name: s.name, portrait: s.portrait, portraitReady: (() => { const im = _skinPortrait(s.portrait); return !!(im && im.complete && im.naturalWidth > 0) })() })) } },
    setSkinHover: (i = 0) => { hoverSkinIndex = Math.max(0, i | 0); return hoverSkinIndex },   // drive the hover animation deterministically
    pickSkin: (i = 0) => { const sk = getSkins(matchConfig[skinSelectSide + "CharKey"]); const s = sk[i]; if (!s || !isSkinUnlocked(matchConfig[skinSelectSide + "CharKey"], s.id) || _skinConfirm) return null; matchConfig[skinSelectSide + "Skin"] = s.id; _skinConfirm = { side: skinSelectSide, index: i, timer: 15, kicked: false }; return { index: i, id: s.id } },   // trigger the confirm flourish (same path as a click)
    skinConfirmState: () => (_skinConfirm ? { ..._skinConfirm } : null),
    skinPortraitsReady: () => { const sk = getSkins(matchConfig[skinSelectSide + "CharKey"]); return sk.map(s => { const im = _skinPortrait(s.portrait); return { name: s.name, portrait: s.portrait, ready: !!(im && im.complete && im.naturalWidth > 0) } }) },   // CURRENT decode state (check AFTER images load)
    // A character's configured `portrait` field (exact on-disk filename) — proves mugshot wiring.
    charPortrait: key => characters[key]?.portrait || null,
    // Card rects for the CURRENT select-universe roster (same order as showCharSelect().roster) → crop a card.
    charCardRects: () => getCharacterCardRects(canvas, getCharacterRosterForSelectedUniverse(), charSelectGridOpts(canvas, true)),
    // Viewport-guarded char-select hit-test at a canvas coord — EXACTLY what a real click runs (returns
    // the roster index or -1 if the point falls outside the clear band, e.g. behind the stats panel).
    pickCharAt: (x, y) => pickGridCard(canvas, getCharacterRosterForSelectedUniverse(), x, y, charSelectGridOpts(canvas, true)),
    // ── FIT-BY-SHRINK selection screens (selection-scroll audit) ────────────────────
    // These screens don't scroll — their layouts shrink cards/rows to keep every item on one page.
    // The audit checks all rects stay within the viewport at max item counts (proves reachable).
    skinSelectRects: () => getSkinSelectRects(canvas, getSkins(matchConfig[skinSelectSide + "CharKey"] || "beerus").length),  // SELECT_SKIN = Ghostface identity picker + all skin picks
    towerSelectRects: () => getTowerSelectRects(canvas),                       // TOWER_SELECT tier menu
    ffaTeamRects: (count = 4) => getFFATeamSelectRects(canvas, count),         // FFA_TEAMSELECT team-assignment
    // ── SCROLLABLE GRID introspection (selection-scroll audit) ──────────────────────
    // Scroll metrics for whichever card grid the current screen shows (char/Edo/FFA/alien): does it
    // overflow, how many cards, and the max scroll offset. Drives the audit's "overflows → scroll active".
    activeGridScrollbar: () => {
      const g = activeScrollGrid()
      if (!g) return { hasScroll: false, count: 0, maxOffset: 0 }
      const bar = getGridScrollbar(g.roster.length, canvas, g.opts)
      return { hasScroll: !!bar, count: g.roster.length, maxOffset: bar ? bar.maxOffset : 0 }
    },
    // Live (scroll-offset-applied) card rects for the active grid — same rects that draw + hit-test use.
    activeGridRects: () => {
      const g = activeScrollGrid()
      if (!g) return null
      return gameState === GAME_STATES.SELECT_ALIENS
        ? getAlienSelectCardRects(canvas, g.roster)
        : getCharacterCardRects(canvas, g.roster, g.opts)
    },
    // Omnitrix loadout card rects (Ben 10) — scroll-offset-applied, same source draw + click use.
    alienGridRects: () => getAlienSelectCardRects(canvas, getAlienPoolList()),
    // MK-feel select redesign: the exact per-character accent the cursor/hover glow pulls for card `i`
    // (= the SAME energyConfig.color the HUD reads, else the HUD default #38bdf8). Proves real values.
    cardAccent: (i = 0) => { const r = getCharacterRosterForSelectedUniverse(); const c = r[i]; return c ? (charSelectAccent(c.id) || "#38bdf8") : null },
    // MK-feel select redesign (Stage 2/3/4): move the character-select cursor, and confirm a pick, so
    // the hover-animation + lock-in flourish can be captured from a test. View-driving only.
    setCharHover: (i = 0) => { const r = getCharacterRosterForSelectedUniverse(); hoverCharacterIndex = Math.max(0, Math.min(r.length - 1, i | 0)); return { hover: hoverCharacterIndex } },
    // Indices of the currently-pickable (unlocked) cards — lets a capture drive the flow over real,
    // pickable cards regardless of roster order (which can drift across runs).
    selectUnlockedIndices: () => getCharacterRosterForSelectedUniverse().map((c, i) => (isCharUnlocked(c.id) ? i : -1)).filter(i => i >= 0),
    confirmCharPick: (side = "p1", i = null) => { const r = getCharacterRosterForSelectedUniverse(); const idx = i == null ? hoverCharacterIndex : Math.max(0, Math.min(r.length - 1, i | 0)); const c = r[idx]; if (!c) return null; if (side === "p2") matchConfig.p2CharKey = c.id; else matchConfig.p1CharKey = c.id; return { side, key: c.id, idx } },
    // Main character-select geometry (scroll-audit): the SELECT-DEPTH detail panel's top and the grid's
    // reserved viewport band. A card is "clear" (reachable + clickable) only inside [viewTop, viewBottom],
    // which the fix pins to just above the panel so the bottom rows can scroll out from behind it.
    charSelectViewport: () => {
      const d = getSelectDetailRect(canvas)
      const vp = getGridViewport(canvas, charSelectGridOpts(canvas, true))
      return { detailTop: d.y, viewTop: vp.top, viewBottom: vp.bottom }
    },
    // Pause-menu introspection: current selection + item id (drive with real esc/↓/enter keys).
    pauseSel: () => ({ gameState, index: pauseMenuIndex, item: PAUSE_MENU_ITEMS[pauseMenuIndex] }),
    // Camera introspection (zoom regression diagnosis).
    camera: () => ({ zoom: camera.zoom, targetZoom: camera.targetZoom, x: camera.x, y: camera.y }),
    // Expire an active Susanoo so the normal update loop auto-reverts it (recovery timing).
    expireSusanoo: () => { if (p1 && (p1._susanooStage || 0) > 0) p1._susanooTimer = 1 },
    // Toji stance system introspection (foundation): stance + live attack phase/move.
    // Render-scale introspection: the resolved action + its rendered cell height (dstH).
    // Used to confirm old-row-sheet actions (guard/grab/…) render at correct proportion.
    renderInfo: who => { const f = who === "p2" ? p2 : p1; return f ? { action: f._lastSpriteAction || null, dstH: f._lastDstH ?? null } : null },
    // ── BEN 10 (build Stage 1) — transform a live fighter to a named alien form (or "human")
    // so a screenshot harness can capture each form's sprite set. Drives the REAL applyAlien /
    // revertToHuman path (so _skinAnim swaps exactly as in-match). Inert without ?harness.
    benForm: (key = "xlr8", who = "p1") => {
      const f = who === "p2" ? p2 : p1
      if (!f) return null
      if (key === "human") revertToHuman(f)
      else { f.transformed = true; applyAlien(f, key) }
      return { activeAlien: f.activeAlien || "human", name: f.activeAlienName, transformed: f.transformed, hasSkinAnim: !!f._skinAnim, action: f._lastSpriteAction || null }
    },
    // Force a specific sprite action on the LIVE fighter (deterministic pose for screenshots).
    // Pass null to release. Mutates the real p1/p2 (not the snap()), so spriteCrop renders it.
    benPose: (action = null, who = "p1") => { const f = who === "p2" ? p2 : p1; if (!f) return null; if (action) f._forceAction = action; else delete f._forceAction; return f._forceAction || null },
    // Ichigo 8-way aerial dash POSE probe — forces the dashDir strip at a given direction index
    // (0 up · 1 down · 2 down-fwd · 3 up-fwd · 4 level-fwd · 5 back) for deterministic screenshots.
    // Pass idx=null to release. Mutates the real p1/p2 (like benPose) so spriteCrop renders it.
    ichigoDashPose: (idx = 4, who = "p1") => { const f = who === "p2" ? p2 : p1; if (!f) return null; if (idx == null) { delete f._forceAction; f._dashDirIdx = null; return null } f._forceAction = "dashDir"; f._dashDirIdx = idx; return { action: f._forceAction, idx: f._dashDirIdx } },
    // Generic sprite-action override (sprite.js:301 honors _forceAction). Renders any animationData
    // action deterministically for evidence shots — e.g. states with no live input driver (dodge) or
    // long-charge states (taunt = 10s Down-hold). Pass action=null to release.
    forceAction: (action = null, who = "p1") => { const f = who === "p2" ? p2 : p1; if (!f) return null; if (action == null) delete f._forceAction; else f._forceAction = action; return { action: f._forceAction || null, sheet: f.spriteHandler?._actionDef?.sheet ?? null } },
    // Inosuke Beast Breathing Assist telemetry — the data-driven DS partner roster + live assist state.
    beastAssistPartners: (who = "p1") => { const f = who === "p2" ? p2 : p1; return f ? getBeastAssistPartners(f) : [] },
    beastAssistState:    (who = "p1") => { const f = who === "p2" ? p2 : p1; return f ? { active: !!f._bbaActive, partner: f._bbaPartner || null, last: f._lastAssistPartner || null, resume: f._bbaResumeQueued || null, cd: f.bbaCd || 0, idx: f._bbaIdx || 0, hitstop: f.hitstop || 0, currentMove: f.currentMove || null, attacking: !!f.attacking, rekkaNext: f._rekkaNext || null, combo: f.comboCounter || 0 } : null },
    beastAssistSummons:  () => activeSummons.filter(s => s.id === "beastAssist").map(s => ({ sheet: s.sheet, damage: s.damage, x: Math.round(s.x), owner: s.owner?.rosterKey || null })),
    clearBeastAssistCd:  (who = "p1") => { const f = who === "p2" ? p2 : p1; if (f) { f.bbaCd = 0; f.beastSpecialCd = 0; f._bbaIdx = f._bbaIdx || 0 } return true },
    setBeastAssistIdx:   (i, who = "p1") => { const f = who === "p2" ? p2 : p1; if (f) f._bbaIdx = i | 0; return f?._bbaIdx ?? null },
    // Ben 10 loadout/prune probe: the art-backed picker list + the live Omnitrix loadout. Pass a
    // selection to REBUILD the loadout (tests the art-backed filter — e.g. a stale save of hidden aliens).
    benLoadout: (rebuildSel) => { if (rebuildSel && p1) setupBen10(p1, rebuildSel); return { picker: getAlienPoolList().map(a => a.key), aliens: p1?.omnitrix?.aliens || null, index: p1?.omnitrix?.index ?? null, artBacked: [...BEN10_ART_ALIENS] } },
    // Ben 10 command-chain probe (mirrors orCmd/vegCmd) — drive the Fwd+Heavy rekka precisely from a test.
    benCmd: (who = "p1") => { const f = who === "p2" ? p2 : p1; return f ? { form: f.transformed === false ? "human" : (f.activeAlien || null), move: f.currentMove || f.currentAttack?.name || null, action: f._lastSpriteAction || null, phase: getAttackPhase(f), rekkaNext: f._rekkaNext || null, connected: !!f._cmdHitLanded, attacking: !!f.attacking, cooldown: f.attackCooldown || 0 } : null },
    // ── CHARACTER-HEIGHT REFERENCE measurement (height-reference audit) ───────────
    // Renders the fighter's CURRENT sprite through the REAL SpriteHandler.draw() path onto a clean
    // offscreen canvas, then scans the alpha channel for the non-transparent bounding box. Returns the
    // VISIBLE BODY pixel height (contentH — what the eye reads as the character's height), distinct
    // from _lastDstH (the full cell × scale, which includes the sheet's transparent margins). This is
    // the constant-conditions measurement Step 1 of the reference-block methodology needs: every
    // character measured through one identical pipeline. Inert without ?harness.
    measureSprite: (who = "p1") => {
      const f = who === "p2" ? p2 : p1;
      if (!f || !f.spriteHandler) return null;
      const W = 900, H = 1800;
      const oc = document.createElement("canvas"); oc.width = W; oc.height = H;
      const octx = oc.getContext("2d", { willReadFrequently: true });
      const sx = f.x, sy = f.y, sf = f.facing, sbob = f.spriteHandler._giantBobClock;
      f.x = W / 2; f.y = H - 260; f.facing = 1;   // feet high enough that even 3.2×-scale bodies fit
      octx.clearRect(0, 0, W, H);
      f.spriteHandler.draw(octx, f);
      f.x = sx; f.y = sy; f.facing = sf; f.spriteHandler._giantBobClock = sbob;
      const data = octx.getImageData(0, 0, W, H).data;
      let minY = H, maxY = -1, minX = W, maxX = -1;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (data[(y * W + x) * 4 + 3] > 16) { if (y < minY) minY = y; if (y > maxY) maxY = y; if (x < minX) minX = x; if (x > maxX) maxX = x; }
      }
      return {
        contentH: maxY >= 0 ? maxY - minY + 1 : 0,
        contentW: maxX >= 0 ? maxX - minX + 1 : 0,
        cellDstH: f._lastDstH ?? null,
        scale: f.spriteScale ?? 1,
        action: f._lastSpriteAction || null,
        clipped: (maxY >= H - 1 || minY <= 0 || maxX >= W - 1 || minX <= 0)
      };
    },
    // Companion to measureSprite: returns the TRIMMED idle sprite as a PNG data-URL plus its content
    // dims, so a harness can composite a feet-aligned full-roster montage at true relative scale.
    spriteCrop: (who = "p1") => {
      const f = who === "p2" ? p2 : p1;
      if (!f || !f.spriteHandler) return null;
      const W = 900, H = 1800;
      const oc = document.createElement("canvas"); oc.width = W; oc.height = H;
      const octx = oc.getContext("2d", { willReadFrequently: true });
      const sx = f.x, sy = f.y, sf = f.facing, sbob = f.spriteHandler._giantBobClock;
      f.x = W / 2; f.y = H - 260; f.facing = 1;
      octx.clearRect(0, 0, W, H);
      f.spriteHandler.draw(octx, f);
      f.x = sx; f.y = sy; f.facing = sf; f.spriteHandler._giantBobClock = sbob;
      const data = octx.getImageData(0, 0, W, H).data;
      let minY = H, maxY = -1, minX = W, maxX = -1;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        if (data[(y * W + x) * 4 + 3] > 16) { if (y < minY) minY = y; if (y > maxY) maxY = y; if (x < minX) minX = x; if (x > maxX) maxX = x; }
      }
      if (maxY < 0) return null;
      const cw = maxX - minX + 1, ch = maxY - minY + 1;
      const cc = document.createElement("canvas"); cc.width = cw; cc.height = ch;
      cc.getContext("2d").drawImage(oc, minX, minY, cw, ch, 0, 0, cw, ch);
      return { dataURL: cc.toDataURL("image/png"), contentH: ch, contentW: cw };
    },
    // Hurtbox introspection (Susanoo giant-hurtbox fix): the box combat uses for hits.
    hurtbox: who => { const f = who === "p2" ? p2 : p1; const hb = getHurtbox(f); return f && hb ? { ...hb, fx: f.x, fy: f.y, fw: f.w, fh: f.h, drawTop: f._lastDrawY ?? null, drawH: f._lastDrawH ?? null } : null },
    state: () => ({ gameState, countdown, frame: globalFrameCount }),
    // Vertical-framing probe (fullscreen centering audit): where the drawn stage sits ON SCREEN given
    // the live camera. Returns the screen-y of the floor line + the top/bottom edges of the drawn stage
    // rectangle, so a test can assert the empty margins above/below the stage are balanced at any height.
    frameGeom: () => {
      const ch = canvas.height, cw = canvas.width
      const z = camera.zoom, camY = camera.y
      const bgTopWorld = lastBattleBgRect.top      // top of the drawn stage rect (world y)
      const bgBotWorld = lastBattleBgRect.bottom   // bottom of the drawn stage rect (world y)
      const toScreenY = wy => (wy - camY) * z + ch / 2
      return {
        ch, cw, zoom: z, cameraY: camY, groundY, floorHeight: getStageFloorHeight(),
        floorLineScreenY: toScreenY(groundY),
        stageTopScreenY:  toScreenY(bgTopWorld),
        stageBotScreenY:  toScreenY(bgBotWorld),
      }
    },
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
    // The no-meter FLAVOR label actually drawn for an energyType-"none" fighter, or null if they have a
    // normal meter ("HEAVENLY RESTRICTION" JJK / "TOTAL CONCENTRATION" Demon Slayer). Mirrors ui.js drawEnergyPanel.
    noMeterFlavor: who => noMeterFlavor(who === "p2" ? p2 : p1),
    roundTimer: () => roundTimer,
    // ── MATCH-FLOW introspection + control (Gon Adult Form sudden-death override, gon.test.mjs) ──
    // Read the live match-winner state + set the round score so a test can prove the sudden-death
    // override fires INDEPENDENTLY of roundWins (e.g. instant win at 0-0, instant loss while ahead).
    matchFlow: () => ({ roundWins: { p1: roundWins.p1, p2: roundWins.p2 }, roundNumber, gameState,
                        victoryActive: !!victoryState.active, winnerSide: victoryState.winnerSide || null,
                        winnerName: victoryState.winnerName || null, override: _matchOverride ? { ..._matchOverride } : null }),
    setRoundWins: (p1w = 0, p2w = 0) => { roundWins.p1 = p1w | 0; roundWins.p2 = p2w | 0; return { p1: roundWins.p1, p2: roundWins.p2 } },
    // Gon Adult Form state (buff/lockout/drain + armed sudden-death) for either fighter.
    gonAdultForm: (who = "p1") => { const f = who === "p2" ? p2 : p1; return f ? {
      active: !!f._adultFormActive, currentForm: f.currentForm || null,
      canJump: f.canJump !== false, noDash: !!f.noDash, speed: f.speed, energy: f.energy,
      suddenDeathWatch: !!f._suddenDeathWatch, sdConnect: f._suddenDeathAtk?._sdConnect || null,
      action: f._lastSpriteAction || null, onGround: !!(f.onGround || f.grounded), vy: f.vy } : null },
    adultFormCine: () => getGonAdultFormCinematicStatus(),
    setP1X: x => { if (p1) p1.x = x },
    // ── STAGE INTERACTABLES pilot hooks ──
    stageHazards: () => getStageHazards().map(h => ({ ...h })),
    // Music-wiring verification: select a stage by name, resolve its music, and drive the REAL
    // sound.playStageTrack path (same call startMatch makes). Returns the wired music filename.
    selectStageByName: (name) => { const st = stages.find(s => s.name === name); if (!st) return { error: "no such stage", have: stages.map(s => s.name) }; matchConfig.selectedStage = st; return { name: st.name, music: st.music || null, seriesFallback: SERIES_MUSIC[st.series] || null } },
    showStageSelect: (name) => { const i = stages.findIndex(s => s.name === name); if (i < 0) return { error: "no such stage" }; hoverStageIndex = i; gameState = GAME_STATES.SELECT_STAGE; return { name, index: i, total: stages.length } },   // jump to the stage-select screen hovering a given stage (screenshot verification)
    homeStageForKey: (k) => { const s = homeStageFor(k); return s ? s.name : null },   // verify universe→home-stage routing (_UNIVERSE_SERIES)
    playStageMusicNow: () => { const st = matchConfig.selectedStage || getStageTheme(); try { sound.playStageTrack?.(st); } catch (e) { return { error: String(e) } } return { stage: st?.name, music: st?.music || null } },
    musicState: () => ({ fileSrc: sound?._musicFileSrc || null, fallbackTheme: sound?._fileFallbackTheme || null, gestured: !!sound?._gestured, muted: !!sound?._musicMuted, paused: sound?._musicFile ? !!sound._musicFile.paused : null, currentTime: sound?._musicFile ? sound._musicFile.currentTime : null }),
    // ── MENU PLAYLIST reorder investigation hooks ──
    menuMusicStart: () => { sound?.playMenuMusic?.(); return true },
    showSettings: () => { gameState = GAME_STATES.SETTINGS; return true },   // jump to the Settings screen (playlist reorder panel) for screenshots
    menuPlaying: () => (sound?.getMenuPlaying?.() ?? null),
    menuAudio: () => ({ index: sound?._menuPlaylistIndex, active: !!sound?._menuPlaylistActive, playingFile: (sound?._musicFileSrc || "").replace(/^\.\//, ""), order: [...MENU_PLAYLIST], pointsAt: MENU_PLAYLIST[sound?._menuPlaylistIndex] }),
    menuMove: (i, dir) => (sound?.moveMenuTrack?.(i, dir) ?? null),
    menuSimulateTrackEnd: () => { const f = sound?._musicFile; if (f && typeof f.onended === "function") { f.onended(); return true } return false },   // fire the auto-advance to see what plays NEXT
    // Place a fighter flying INTO the first stage hazard (real knockback + hitstun = a genuine "knocked
    // into it" state), then let the loop's updateStageHazards resolve the contact. Returns the setup.
    knockIntoHazard: (who = "p1", vx = 12) => {
      const f = who === "p2" ? p2 : p1; if (!f) return null
      const hz = getStageHazards()[0]; if (!hz) return null
      const b = hazardBox(hz, groundY)
      f.x = b.x - (f.w || 60) + 6; f.y = groundY - (f.h || 90)   // right edge just inside the pylon
      f.vx = Math.abs(vx); f.hitstun = Math.max(f.hitstun || 0, 20); f.isLaunched = false; f._hazardCd = 0
      return { x: f.x, vx: f.vx, hazardX: b.x }
    },
    hazardState: (who = "p1") => { const f = who === "p2" ? p2 : p1; return f ? {
      health: f.health, hitstun: f.hitstun || 0, vx: f.vx, wallBounce: !!f.wallBounce,
      hazardHit: f._hazardHitId || null, hazardCd: f._hazardCd || 0 } : null },
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
    // HUD damage-trail proof (Stage 1): drop a fighter's HP by `v` and stamp the render-only
    // hit tier so the MK-feel bar shows the correct big-vs-light reaction. Test-only view hook.
    hudHit: (who = "p2", v = 220, tier = "big") => { const f = who === "p1" ? p1 : p2; if (!f) return null; f._hudDmgTier = tier; f.health = Math.max(1, (f.health || 0) - v); return { who, health: f.health, tier } },
    // Combo-counter visual proof (Stage 2): drive a fighter's live comboCounter (with a fresh
    // comboTimer so it doesn't decay under the shot) so the REAL _drawComboCounters escalation +
    // per-hit pop renders. Only the counter source is injected; the display pipeline is untouched.
    setCombo: (who = "p1", n = 2) => { const f = who === "p1" ? p1 : p2; if (!f) return null; f.comboCounter = n; f.comboTimer = 120; return { who, combo: f.comboCounter } },
    // HUD boss-bar variant proof (Stage 4): flag P2 as an arcade boss so the HUD draws the single
    // wide center-draining boss bar (view-only; does not change combat). Mirrors the p2._isBoss branch.
    forceBoss: (on = true) => { if (p2) p2._isBoss = !!on; return { boss: !!(p2 && p2._isBoss) } },
    matchEntryTransition: () => matchEntryTransitionStatus(),   // Stage 3: match-entry sting status (armed/progress/auto-clear)
    riftTransition: () => riftTransitionStatus(),               // Stage 11: dimensional-rift transition status
    triggerRift: (accent = null, dur = 60) => { startRiftTransition(accent, dur); return riftTransitionStatus() },   // capture hook (dur stretched for a legible filmstrip; ships 24f)
    setMatchEntryDuration: (n) => setMatchEntryTransitionDuration(n),   // capture-only: stretch the sting for a legible filmstrip (ships 30f)
    sasukeCine: () => getSasukeCinematicStatus(),
    ssjRoseCine: () => getSSJRoseCinematicStatus(),
    swordCine: () => getGokuBlackSwordCinematicStatus(),
    powerSwordCine: () => getRedRangerPowerSwordCinematicStatus(),   // Red Ranger MMPR Power Sword ultimate cinematic status (Stage 4)
    sealingCine: () => getHashiramaSealingJutsuCinematicStatus(),   // Hashirama Sealing Jutsu domain OVERLAY status (gate-slam + looping cameo strikes)
    setTreeTier: (n = 1) => { if (p1) { p1._treeTier = Math.max(0, (n | 0) - 1); p1._treeLastCast = performance.now(); } },   // force the NEXT Down+Special tree-summon to tier n (deterministic ladder for scale shots)
    domainState: () => { const d = activeDomains[0]; return d ? { rosterKey: d.rosterKey, timer: d.timer, timerMax: d.timerMax, name: d.name, ownerKey: d.owner?.rosterKey || null } : null },   // active Domain Expansion state (bg/trap/timer)
    godspeedCine: () => getKilluaGodspeedCinematicStatus(),
    overdriveCine: () => getHisokaOverdriveCinematicStatus(),
    tojiReincarnationCine: () => getTojiReincarnationCinematicStatus(),
    tojiFlyHeadsSwarm: () => getTojiFlyHeadsSwarmStatus(),
    tojiFade: (who = "p1") => { const f = who === "p2" ? p2 : p1; return f ? { timer: f._tojiFlyFadeTimer || 0, max: f._tojiFlyFadeMax || 0, alpha: _tojiFlyFadeAlpha(f) } : null },
    flashTimeCine: () => getFlashTimeCinematicStatus(),
    mangekyouCine: () => getMangekyouCinematicStatus(),
    vegetaUltCine: () => getVegetaFinalFlashCinematicStatus(),
    beerusUltCine: () => getBeerusKiBallCinematicStatus(),
    ben10UltCine: () => getBen10OmnitrixCinematicStatus(),
    batmanUltCine: () => getBatmanDarkKnightCinematicStatus(),
    omnimanUltCine: () => getOmniManBodySlamCinematicStatus(),
    supermanUltCine: () => getSupermanUltimateCinematicStatus(),
    rengokuUltCine: () => getRengokuFlameExplosionCinematicStatus(),
    madaraUltCine: () => getMadaraTengaiShinseiCinematicStatus(),
    painUltCine: () => getPainChibakuTenseiCinematicStatus(),
    yujiUltCine: () => getYujiUltimateCinematicStatus(),
    miwaUltCine: () => getMiwaUltimateCinematicStatus(),
    ichigoUltCine: () => getIchigoGetsugaCinematicStatus(),
    shinobuUltCine: () => getShinobuButterflyCinematicStatus(),
    inosukeBeastCine: () => getInosukeBeastCinematicStatus(),
    ghostfaceUltCine: () => getGhostfaceFinalActCinematicStatus(),
    kuramaUltCine: () => getKuramaCinematicStatus(),
    minatoKuramaUltCine: () => getMinatoKuramaStatus(),
    obitoJuubiUltCine: () => getObitoJuubiCinematicStatus(),
    tobiNineTailsUltCine: () => getTobiNineTailsCinematicStatus(),
    tobiKuramaHide: (who = "p1") => { const f = who === "p2" ? p2 : p1; return f ? { hide: !!f._tobiKuramaHide, kamuiHide: !!f._kuramaHide } : null },
    tobiCelestialFX: (who = "p1") => { const f = who === "p2" ? p2 : p1; return f ? { skinId: f.skinId || null, seeded: !!f._tobiCelestialFX, stars: f._tobiCelestialFX?.stars?.length || 0, nebulae: f._tobiCelestialFX?.nebulae?.length || 0, clock: f._tobiCelestialClock || 0, x: f._lastDrawX, y: f._lastDrawY, w: f._lastDrawW, h: f._lastDrawH } : null },
    p1CloneCount: () => (p1 ? countShadowClones(p1) : 0),   // test hook: live shadow-clone count (barrage gate)
    p1RendanFired: () => (p1 ? (p1._rendanFired || 0) : 0), // test hook: Clone Rendan Storm flurry-fire count (deterministic)
    p1FrMarks: () => (p1 ? (p1._frMarks || []).map(m => ({ x: m.x, y: m.y })) : []),   // Flying Raijin marks
    p1FrSel:   () => (p1 ? (p1._frSel || 0) : 0),                                       // selected mark index
    clearP1FrMarks: () => { if (p1) { p1._frMarks = []; p1._frSel = 0 } },              // reset marks between test cases
    placeP1FrMark: (x) => { if (!p1) return 0; p1._frMarks = p1._frMarks || []; p1._frMarks.push({ x: x ?? p1.x, y: p1.groundY ?? p1.y }); p1._frSel = p1._frMarks.length - 1; return p1._frMarks.length },   // deterministically stage a Flying Raijin mark (Flying Raijin Clones test)
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
    // hitstop is cleared too: a lingering hitstop from a just-connected hit freezes the sprite on the
    // previous action (sprite.js) and would non-deterministically mask the forced knockdown pose.
    p1Knockdown: () => { if (p1) { p1.knockdownState = true; p1.knockdownTimer = 40; p1.hitstun = 0; p1.hitstop = 0; p1.attacking = false; p1.grounded = true } },
    setP1Energy: (v = 0) => { if (p1) p1.energy = v },   // exercise the SSJ drain auto-revert without waiting ~18s
    // LIVE dump of the merged _skinAnim entries actually on the fighter (BUG-hunt: which object/sheet is live).
    skinAnimDump: (keys = []) => { const s = p1?._skinAnim; return { has: !!s, entries: keys.map(k => ({ k, sheet: s?.[k]?.sheet ?? null, frames: s?.[k]?.frames ?? null, w: s?.[k]?.width ?? null })) } },
    // BOTH fighters' on-screen horizontal extent given the live camera — used to confirm the Sword
    // Slash cinematic keeps BOTH in frame (unlike SSJ Rose which isolates one). onFrame = any part visible.
    bothScreenX: () => {
      const box = f => { if (!f) return null; const cw = canvas.width; const l = (f.x - camera.x) * camera.zoom + cw / 2; const r = (f.x + (f.w || 60) - camera.x) * camera.zoom + cw / 2; return { left: l, right: r, cw, onFrame: r > 0 && l < cw } }
      return { p1: box(p1), p2: box(p2) }
    },
    // Full on-screen rect (x,y,w,h in canvas pixels) of either fighter given the live camera —
    // lets a screenshot test crop tightly to the fighter regardless of camera pan/zoom.
    // screen = worldXY*zoom + canvas/2 - camera*zoom (mirrors camera.applyTransform).
    screenRect: (who = "p1") => {
      const f = who === "p2" ? p2 : p1; if (!f) return null
      const cw = canvas.width, ch = canvas.height, z = camera.zoom
      return {
        x: (f.x - camera.x) * z + cw / 2,
        y: (f.y - camera.y) * z + ch / 2,
        w: (f.w || 60) * z, h: (f.h || 100) * z, zoom: z
      }
    },
    // Opponent (p2) on-screen horizontal extent given the live camera — used to confirm the SSJ Rose
    // cinematic frames Goku Black ONLY (p2 fully off-frame). screenX = (worldX - cam.x)*zoom + cw/2.
    p2ScreenX: () => { if (!p2) return null; const cw = canvas.width; const cx = p2.x + (p2.w || 60) / 2; const left = (p2.x - camera.x) * camera.zoom + cw / 2; const right = (p2.x + (p2.w || 60) - camera.x) * camera.zoom + cw / 2; return { left, right, cw, offFrame: right < 0 || left > cw, center: (cx - camera.x) * camera.zoom + cw / 2 } },
    projectiles: () => activeProjectiles.map(p => ({ name: p.name, x: p.x, y: p.y, vx: p.vx, vy: p.vy, w: p.w, h: p.h, radius: p.radius, spriteScale: p.spriteScale, spriteFrames: p.spriteFrames, spriteH: p.spriteH, spriteOnce: !!p.spriteOnce, visualOnly: !!p.visualOnly, returning: !!p.returning, boomerang: !!p.boomerang, sheet: p.sheet })),
    // ── WOOD RELEASE climbable terrain (Stage 1 — isolated primitive) ──
    // spawnPlatform: create a test platform (all opts optional; groundY defaults to P1's floor). Returns its id.
    spawnPlatform: (opts = {}) => { const gy = opts.groundY != null ? opts.groundY : (p1?.groundY != null ? p1.groundY : groundY); return spawnPlatform({ ...opts, groundY: gy }).id },
    // platforms: live dump — phase/timer + the derived standable top-Y & height (the collision surface).
    platforms: () => getPlatforms().map(p => ({ id: p.id, phase: p.phase, t: p.t, x: p.x, w: p.w, groundY: p.groundY, maxHeight: p.maxHeight, topY: p.topY, height: p.height, growthP: p.growthP, hasSprite: !!p.sprite })),
    clearPlatforms: () => clearPlatforms(),
    // ── COMBAT HIT FX (particle bursts) — live dump for the visual-FX proof harness ──
    // Per spark: category + how many particles it seeded + how many are still alive, plus the debris'
    // average Y and average speed (so a test can prove genuine scatter/FALL frame-to-frame, not static lines).
    sparks: () => hitSparks.map(s => {
      const ps = (s._particles || []).filter(p => p.life > 0)
      const avgY = ps.length ? ps.reduce((a, p) => a + p.y, 0) / ps.length : null
      const avgVy = ps.length ? ps.reduce((a, p) => a + p.vy, 0) / ps.length : null
      const avgSpd = ps.length ? ps.reduce((a, p) => a + Math.sqrt(p.vx*p.vx + p.vy*p.vy), 0) / ps.length : null
      return { category: s.category || null, blocked: !!s.blocked, x: s.x, y: s.y, timer: s.timer, nParticles: (s._particles || []).length, pAlive: ps.length, avgY, avgVy, avgSpd, pColor: s._pColor || null }
    }),
    cameraShake: () => ({ timer: camera.shakeTimer || 0, strength: camera.shakeStrength || 0 }),
    setDummyBehavior: (b = "stand") => { if (DUMMY_BEHAVIORS.includes(b)) { trainingState.enabled = true; trainingState.dummyBehavior = b; return b } return trainingState.dummyBehavior },
    // Spawn a hit spark of a category at a world point (models a connect for the FX clip — reads the SAME
    // shape combat.js pushes). Does NOT touch combat logic. Returns the spark's seeded particle count.
    spawnSpark: (category = "light", x = null, y = null, opts = {}) => {
      const fx = x != null ? x : (p1 ? p1.x + (p1.w||60)/2 : 400)
      const fy = y != null ? y : (p1 ? p1.y + (p1.h||100)/2 : 300)
      const persist = category === "ultimate" ? 30 : category === "special" ? 22 : category === "heavy" ? 18 : category === "parry" ? 16 : category === "clash" ? 20 : 10
      const sp = Object.assign(poolAcquire("spark"), {
        x: fx, y: fy, timer: persist, maxTimer: persist, category,
        color: (category === "special" || category === "ultimate") ? "#ffd166" : null,
        radius: category === "ultimate" ? 40 : category === "special" ? 28 : category === "heavy" ? 22 : 14,
        lines: 6, damage: opts.damage ?? null, blocked: !!opts.blocked, isBlocking: !!opts.blocked,
      })
      if (opts.particleCount != null) sp.particleCount = opts.particleCount
      hitSparks.push(sp)
      return { category, nParticles: 0 }   // seeded lazily on the next effects tick
    },
    // Place P1 standing on a platform's top (models the player having jumped onto it — the traversal between
    // pillars, NOT the chain-height mechanic under test). Next physics frame stamps _floorPlatformId.
    standP1OnPlatform: (id) => { const p = getPlatforms().find(z => z.id === id); if (!p1 || !p) return false; p1.x = p.x + p.w/2 - (p1.w||60)/2; p1.y = p.topY - (p1.h||100); p1.vx = 0; p1.vy = 0; p1.onGround = true; p1.grounded = true; p1.isLaunched = false; p1._prevFeetY = p.topY; p1._floorPlatformId = id; return true },   // _prevFeetY/_floorPlatformId make the one-way query read it as ALREADY resting (not a from-below teleport)
    // p1State/p2State feet+grounding snapshot for the climb/recede assertions (feet = y+h; floorPlatformId = which surface).
    fighterFloor: (who = "p1") => { const f = who === "p2" ? p2 : p1; if (!f) return null; return { x: f.x, y: f.y, feet: f.y + (f.h || 0), vy: f.vy || 0, onGround: !!(f.onGround || f.grounded), floorPlatformId: f._floorPlatformId ?? null } },
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
    summons: () => activeSummons.map(s => ({ id: s.id, ownerSide: s.owner?.side ?? null, x: s.x, y: s.y, vx: s.vx, frame: s.frame, hasHit: !!s.hasHit, lifetime: s.lifetime, sheet: s.sheet ?? null })),
    clonePuffCount: () => getClonePuffCount(),
    woodReleaseFxCount: () => getWoodReleaseFxCount(),   // Hashirama wood-clone despawn (revert-to-logs) FX count
    resetUlt:   () => { if (p1) { p1.ultimateCooldown = 0; p1.energy = p1.maxEnergy; p1.attackCooldown = 0 } },   // clear ult lockout for back-to-back ultimate tests
    liftP2:     (dy = 40) => { if (p2) { p2.onGround = false; p2.grounded = false; p2.y -= dy; p2.vy = 0; p2.isLaunched = true } },  // raise the dummy into an aerial path (e.g. Rick's rising rocket)
    setTauntCharge: v => { if (p1) p1._tauntCharge = v },   // fast-forward the 10s taunt charge for tests
    healP1:     () => { if (p1) { p1.health = p1.maxHealth || 1050; p1.hitstun = 0; p1.knockdownState = false } },
    setP1Health: (v) => { if (p1) p1.health = Math.max(1, v) },   // force P1 HP (Reaper self-cost gate test)
    setP2Health: (v) => { if (p2) p2.health = Math.max(1, v) },   // force P2 HP (comeback-finisher damage-on-target readout)
    // ── COMBO BREAKER + COMEBACK FINISHER harness hooks (Stage 1 pilot) ──
    breakerProbe: (who = "p1") => { const f = who === "p2" ? p2 : p1; return f ? { key: f.rosterKey, hitstun: f.hitstun || 0, stocks: f.comboBreakStocks || 0, cd: f.comboBreakerCd || 0, energy: Math.round(f.energy || 0), maxEnergy: f.maxEnergy || 0, invuln: f.invulnTimer || 0, isLaunched: !!f.isLaunched } : null },
    finisherProbe: (who = "p1") => { const f = who === "p2" ? p2 : p1; if (!f) return null; const hpPct = Math.round((f.health || 0) / (f.maxHealth || 1) * 100); return { key: f.rosterKey, health: Math.round(f.health || 0), maxHealth: f.maxHealth || 0, hpPct, ready: comebackFinisherReady(f), used: !!comebackFinisherUsed[f.side], dmg: comebackFinisherDamage(f), attacking: !!f.attacking } },
    // Set up a defender caught mid-combo: defender in hitstun + launched, ATTACKER on a real >=3 combo, placed adjacent.
    armBreakerScenario: (defenderWho = "p1", hitstun = 40) => { const d = defenderWho === "p2" ? p2 : p1; const a = defenderWho === "p2" ? p1 : p2; if (!d || !a) return null; d.hitstun = hitstun; d.blockstun = 0; d.isLaunched = true; d.attacking = false; d.currentMove = null; a.comboCounter = 4; a.comboTimer = 90; a.attacking = true; a.currentAttack = a.currentAttack || { name: "light" }; a.x = d.x + (d.facing >= 0 ? 70 : -70); if (a.groundY != null) { a.y = a.groundY - (a.h || 0); } return { defHitstun: d.hitstun, atkCombo: a.comboCounter } },
    expireShikai: () => { if (p1 && p1._shikaiActive) p1._shikaiTimer = 1 },   // force Zaraki Shikai timer to the brink (auto-revert-on-expiry test)
    koP1: () => { if (p1) p1.health = 0 },   // KO P1 outright (Zaraki Shikai revert-on-KO test; setP1Health clamps to ≥1)
    setP2Invuln: (v = 600) => { if (p2) p2.invulnTimer = v },   // let a projectile pass through the dummy (free-flight range measurement)
    setP2Blocking: (on = true) => { if (p2) p2.isBlocking = !!on },   // force the dummy to hold guard (block-during-time-slow test)
    setP2ForceBlock: (on = true) => { if (p2) p2._forceGuard = !!on },   // PERSISTENT dummy guard — updatePlayer honors _forceGuard so isBlocking survives the per-frame clear (blockable/unblockable tests)
    fillEnergy: () => { if (p1) p1.energy = p1.maxEnergy },
    setEnergy:  v => { if (p1) p1.energy = v },
    // Reposition the dummy AND settle it on the ground. The launcher raise (Fast -30 … Heavy -33) keeps a
    // just-launched dummy airborne noticeably longer; harness reset/setup helpers call setP2X between
    // move-tests, and a still-airborne dummy makes the next follow-up (ground OR air) whiff. Grounding here
    // is safe: no test ever lifts the dummy (liftP2 is unused) — its airborne state only comes from a
    // launcher, and setP2X is the "position for the next test" reset, where grounded is exactly wanted.
    setP2X:     x => { if (p2) { p2.x = x; if (p2.groundY != null) { p2.y = p2.groundY - (p2.h || 0); p2.vy = 0; p2.onGround = true; p2.grounded = true; p2.isLaunched = false } } },
    setP2Air:   () => { if (p2) { p2.onGround = false; p2.grounded = false; p2.y -= 60; p2.vy = -12 } },   // pop the dummy airborne (grab-whiffs-on-airborne tests — resolveGrab requires defender.onGround)
    expireItachiSusanoo: () => { if (p1 && p1._itachiSusanoo) p1._itachiSusanooTimer = 1 },   // force the auto-revert next tick (skip the ~20s wait)
    // ── deterministic reset for the beta-input test (clears the motion buffer + cooldowns so
    //    successive command-special casts don't contaminate each other via stale directionHistory
    //    or a lingering summon/chain recast lock). Test-only, like the rest of __harness.
    resetFighterInput: (who = "p1") => { const f = who === "p2" ? p2 : p1; if (!f) return; f.directionHistory = []; f.motionHistory = []; f.attackCooldown = 0; f.summonCooldown = 0; f.chainCooldown = 0; f.teleportCooldown = 0; f.ultimateCooldown = 0; f.chargeDashCd = 0; f.yachiruCd = 0; f.comboCounter = 0; f.comboTimer = 0; if (typeof clearInputBuffers === "function") clearInputBuffers([f]) },   // also clear combo state + the buffered-press queue so a leftover Special from a prior cast can't fire when the fighter next becomes actionable (motion tests); motionHistory cleared so classic-motion casts don't contaminate each other
    p1MotionHistory: () => ((p1?.motionHistory) || []).map(d => d.dir),   // classic motion buffer contents (test assertions: populated for Naruto-universe, empty otherwise)
    p1DetectMotion: (name) => (p1 ? detectMotion(p1, name) : false),      // query the motion engine directly (Stage-1 engine proof)
    p1RecentMotions: () => (p1 ? getRecentMotions(p1) : []),
    setCloneTell: (on) => { setCloneTell(on); return isCloneTell() },     // decoy visual-tell toggle (Stage 4 no-tell mode)
    cloneTell: () => isCloneTell(),
    p1CloneStates: () => activeSummons.filter(s => s.id === "shadowClone" && s.owner === p1).map(s => ({ x: Math.round(s.x), state: s._state, hidden: !!s._hidden, atk: s._atk || null, vx: Math.round((s.vx || 0) * 10) / 10 })),   // clone lifecycle + behavior-AI inspection
    cloneStrikeFxCount: () => getCloneStrikeFxCount(),   // cumulative clone lunge-strike impacts (prove clones ATTACK)
    setCloneAggro: (on = true) => setCloneAggro(!!on),   // toggle the clone behavior AI (active vs legacy decoy)
    p2ProjectileAtClone: () => { if (!p2 || !p1) return -1; const c = activeSummons.find(s => s.id === "shadowClone" && s.owner === p1 && s._state === "idle" && !s._hidden); if (!c) return -1; spawnProjectile(p2, "testBolt", { damage: 30, speed: 0, lifetime: 30, w: 30, h: 30, spawnX: c.x + c.w / 2, spawnY: c.y + c.h / 2 }, {}); return countShadowClones(p1) },   // fire an ENEMY projectile overlapping a clone → hit-reveal poof (returns clone count before)
    p1TransformJutsu: () => (p1 ? { active: isTransformJutsuActive(p1), tier: transformJutsuTier(p1), target: p1._tjTarget || null, name: p1.name, rosterKey: p1.rosterKey, spriteSheet: p1.spriteHandler?._actionDef?.sheet ?? null, lightDmg: p1.basic_attacks?.light?.damage ?? null, specialsKeys: Object.keys(p1.specials || {}).sort() } : null),   // Transformation Jutsu state + proof that moves/stats are (Tier1) unchanged
    p1SwapFlags: () => (p1 ? { tj: !!p1._tjActive, sh: !!p1._shActive, gfSwap: !!p1._gfSwapActive } : null),   // NON-CONFLICT proof: Transformation Jutsu (_tj*) is a separate namespace from Skill Hunter (_sh*) / Ghostface swap (_gfSwap*)
    forceRevertTransformJutsu: () => (p1 ? revertTransformJutsu(p1) : false),
    clearProjectiles:  () => { activeProjectiles.length = 0 },
    // Test affordance: spawn a P2-owned bolt just in front of P1 travelling toward him (for the
    // Madara Gunbai-reflect test). Mirrors p2ProjectileAtClone's enemy-projectile pattern.
    spawnEnemyBolt:    (opts = {}) => { if (!p1 || !p2) return null; const p = spawnProjectile(p2, "testBolt", { damage: opts.damage ?? 40, speed: 10, lifetime: 90, vx: -10, vy: 0, w: 28, h: 28, hitstun: 12, knockbackX: 5, spawnX: p1.x + (p1.w || 60) + 60, spawnY: p1.y + (p1.h || 100) * 0.4 }, {}); return p ? { name: p.name, vx: p.vx } : null },
    clearSummons:      () => { activeSummons.length = 0 },
    healP2:     () => { if (p2) { p2.health = p2.maxHealth || 1000; p2.hitstun = 0; p2.knockdownState = false }   // reset dummy between damage checks
      // Also clear BOTH fighters' combo state: a fresh single-hit damage measurement must not be decayed by
      // a combo lingering from the previous check (projectiles now build combo count too — combo-flow Stage 3).
      for (const f of [p1, p2]) if (f) { f.comboCounter = 0; f.comboTimer = 0 } },
    liftP1:     (dy = 40) => { if (p1) { p1.onGround = false; p1.grounded = false; p1.y -= dy; p1.vy = 0; p1.isLaunched = true } },  // put P1 at a low airborne altitude (test air normals on the descent)
    // Real jump impulse for P1 (Wood Release platform proof): mirrors physics.moveFighter's jump — upward vy,
    // leaves the ground, isLaunched. Optional vx to arc horizontally onto a platform beside the fighter.
    jumpP1:     (vx = 0) => { if (p1) { p1.vy = p1.jumpForce || -22; p1.vx = vx; p1.onGround = false; p1.grounded = false; p1.isLaunched = true; p1.jumpCount = 1; p1.jumpHeld = true } },
    hurtP1:     (v = 20) => { if (p1) { p1.hitstun = v; p1.attacking = false } },  // simulate getting hit (cancel tests)
    setP1Energy: (v = 0) => { if (p1) { p1.energy = Math.max(0, Math.min(p1.maxEnergy || 0, v)); return p1.energy } return null },  // set Smart Atoms / any energy pool (flight-drain / forced-descent tests)
    hurtP2:     (v = 20) => { if (p2) { p2.hitstun = v; p2.attacking = false } },  // put the dummy in hitstun (Naruto clone-finisher contextual gate)
    // Stage EXACTLY n shadow clones on P1 immediately (bypasses the ~2.5s audio-window delay of the
    // "," hotkey, which leaves a lingering delayed spawn that races the clone-count gates). Clone users only.
    spawnP1Clones:  (n = 2) => { if (!p1 || !isCloneCapable(p1)) return 0; dispelShadowClones(p1); for (let i = 0; i < n; i++) spawnShadowClone(p1, getOpponent(p1)); return countShadowClones(p1) },
    waterCloneFx:   () => getWaterCloneFxCount(),   // Tobirama water-clone despawn FX counts {burst(destroy), ripple(dismiss), total}
    dispelP1Clones: () => (p1 ? dispelShadowClones(p1) : 0),
    knockdownP1: (t = 60) => { if (p1) { p1.knockdownState = true; p1.knockdownTimer = t; p1.attacking = false } },  // drive the downed/get-up (knockdown) pose for sprite verification
    // Yuji "Koma" REPEAT engine (Stage 4, isolation test — the ult trigger lands in Stage 5): begin the
    // release directly, then observe the mash-extend flurry → finisher chain.
    startKoma: (who = "p1") => { const f = who === "p2" ? p2 : p1; return f ? startYujiKoma(f, getAbilityContext()) : false },
    komaState: (who = "p1") => { const f = who === "p2" ? p2 : p1; return f ? { active: !!f._komaActive, phase: f._komaPhase || null, hits: f._komaHits || 0, window: f._komaWindow || 0, finTimer: f._komaFinTimer || 0, action: f._lastSpriteAction || null, castMove: f._spriteCastMove || null, hitstop: f.hitstop || 0, spriteSheet: f.spriteHandler?._actionDef?.sheet ?? null } : null },
    // Drive a REAL p2 attack (generous startup so a defender can react) — used to open the
    // Substitution incoming-attack window and to verify the swing actually whiffs on a substitute.
    p2Attack:   () => { if (p2) { p2.attackCooldown = 0; p2.attacking = false; startMove(p2, "light", { startup: 10, active: 6, recovery: 16, damage: 60, rangeX: 120, rangeY: 90, hitstun: 18, knockbackX: 6 }) } },
    // Fire P1's SPECIAL with a chosen relative direction ("F"|"B"|"U"|"D"|null), bypassing keyboard timing
    // races (up→jump, down→block-crouch) so a test can exercise a direction-branched special's MECHANIC
    // cleanly. Clears the special cooldowns/recovery so it reliably fires. Routing (real dir input → move) is
    // still covered by the keyboard-driven sprite checks.
    p1SpecialDir: (dir = null) => { if (!p1) return null; p1.nzCounterCd = 0; p1.nzSlumberCd = 0; p1.attackCooldown = 0; p1.attacking = false; p1._specialHeldDir = dir; triggerSpecial(p1, getAbilityContext()); return { move: p1.currentMove || null, cast: p1._spriteCastMove || null } },
    // Clear P1's ability cooldowns (test-only) so a back-to-back move isn't gated by a prior cast's cooldown.
    p1ClearCooldowns: () => { if (p1) { p1.nzAssistCd = 0; p1.nzCounterCd = 0; p1.nzSlumberCd = 0; p1.attackCooldown = 0; p1.ultimateCooldown = 0 } },
    // Force the match to end with `side` as the winner (test-only) → runs _checkMatchOver, which fires the
    // win/lose pose hook. Reuses the sudden-death _matchOverride path so it works in any harness mode.
    forceMatchWin: (side = "p1") => { _matchOverride = { winnerSide: side }; _checkMatchOver(); return { gameState, victory: !!victoryState.active, winner: victoryState.winnerSide || null } },
    p1ForceLight: () => { if (p1) { p1.attackCooldown = 0; p1.attacking = false; startMove(p1, "light", { startup: 4, active: 6, recovery: 12, damage: 45, rangeX: 150, rangeY: 100, hitstun: 12, knockbackX: 3 }) } },   // deterministic light swing (Rendan-fire test, no keyboard flake)
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
    // Stage 24A: active match modifiers + a peek at how they landed on the live fighters.
    modifiers: () => ({ active: matchConfig.modifiers || [], labels: activeModifierLabels(),
      p1: p1 ? { maxHealth: p1.maxHealth, speed: Math.round(p1.speed || 0), noBlock: !!p1._noBlock, meterDrain: !!p1._meterDrain } : null,
      p2: p2 ? { maxHealth: p2.maxHealth, key: p2.rosterKey } : null, gravity: physics.gravity }),
    setModifiers: (mods = []) => { matchConfig.modifiers = Array.isArray(mods) ? mods : []; if (p1 && p2) _applyMatchModifiers(); return matchConfig.modifiers },
    forceP1Win: () => { if (p2) p2.health = 0 },
    forceP1Lose: () => { if (p1) p1.health = 0 },
    // ── ARCADE diagnostics + drivers (Stage 19) ──────────────────────────────
    arcadeInfo: () => ({
      active: arcadeState.active, fight: arcadeState.fight, fightNum: arcadeState.fight + 1,
      totalFights: ARCADE_FIGHTS, rivalFight: ARCADE_RIVAL_FIGHT, bossFight: ARCADE_BOSS_FIGHT,
      role: arcadeFightRole(arcadeState.fight + 1),
      rosterKey: arcadeState.rosterKey, difficulty: arcadeState.difficulty,
      continuesUsed: arcadeState.continuesUsed, cleared: arcadeState.cleared,
      lastWon: arcadeState._lastWon, endingPending: arcadeState.endingPending,
      mode: matchConfig.mode, gameState,
      p1: matchConfig.p1CharKey, p2: matchConfig.p2CharKey,
      aiDifficulty: matchConfig.aiDifficulty, stage: matchConfig.selectedStage ? matchConfig.selectedStage.name : null,
      endingSlides: arcadeEndingSlides.length, endingIndex: arcadeEndingIndex
    }),
    // Drive the REAL arcade state machine, bypassing only the manual P1 fighter-pick UI.
    arcadeStart: (p1Key = "gojo", difficulty = "adaptive") => {
      startArcade(difficulty)
      matchConfig.p1CharKey = p1Key; matchConfig.p1Char = characters[p1Key] || characters.gojo; matchConfig.p1Skin = "default"
      arcadeState.rosterKey = p1Key
      _beginArcadeFight()   // fight 1 (or the rival intro on a fixture that starts there)
    },
    arcadeContinue: () => continueArcade(),
    // Advance through the rival intro / ending slides from a test (mirrors a click).
    arcadeAdvance: () => {
      if (gameState === GAME_STATES.ARCADE_RIVAL_INTRO) { startMatch(); return "match" }
      if (gameState === GAME_STATES.ARCADE_ENDING) {
        if (arcadeEndingIndex < arcadeEndingSlides.length - 1) { arcadeEndingIndex++; arcadeEndingStartMs = performance.now(); return "slide" }
        _endArcadeEnding(); return "done"
      }
      return gameState
    },
    arcadeCleared: () => ({ map: getArcadeCleared(), current: isArcadeCleared(arcadeState.rosterKey || matchConfig.p1CharKey), noContinue: isArcadeNoContinueCleared(arcadeState.rosterKey || matchConfig.p1CharKey) }),
    // ── TOURNAMENT BRACKET (Stage 24B) ────────────────────────────────────────
    bracketStart: (size = 4, humanKey = "gojo") => { _pendingBracketSize = size; matchConfig.p1CharKey = humanKey; matchConfig.p1Char = characters[humanKey]; _buildAndStartBracket(); return H_bracketInfo() },
    bracketInfo: () => H_bracketInfo(),
    bracketPlay: () => { if (bracketState && !bracketState.champion) _startBracketMatch(); return { gameState } },   // start the pending human match
    bracketAdvance: () => { continueBracket(); return H_bracketInfo() },   // from victory → next match / view
    bracketResume: () => { const ok = resumeBracketIfSaved(); return { resumed: ok, ...H_bracketInfo() } },
    // ── BOSS diagnostics (Stage 20) ──────────────────────────────────────────
    bossState: () => {
      const b = (p2?._isBoss) ? p2 : (p1?._isBoss) ? p1 : null
      if (!b) return { present: false }
      const norm = characters[b.rosterKey] || {}
      return { present: true, rosterKey: b.rosterKey, name: b.name, isBoss: true,
        maxHealth: b.maxHealth, health: b.health, spriteScale: b.spriteScale, infiniteEnergy: !!b.infiniteEnergy,
        bossArmor: !!b._bossArmor, bossArmorThreshold: b._bossArmorThreshold,
        normalMaxHealth: norm.stats?.maxHealth ?? null, normalScale: norm.spriteScale ?? 1,
        healthMult: norm.bossProfile?.healthMult ?? null }
    },
    // Drive a REAL hit through combat.js resolveAttackHit onto the boss (p2), reading whether it
    // staggered. aoe hitbox centered on the attacker → guaranteed overlap; the boss is set "attacking"
    // so we can also see whether it was interrupted. Exercises the actual super-armor code path.
    probeBossHit: (dmg = 20, cat = "light") => {
      if (!p1 || !p2) return null
      p2.isBlocking = false; p2.invulnTimer = 0; p2.knockdownState = false; p2.knockdownTimer = 0
      p2.hitstun = 0; p2.attacking = true; p2.currentAttack = { name: "bossmove" }   // boss mid-attack → interrupt test
      const startHealth = p2.health
      p1.x = p2.x; p1.y = p2.y; p1.facing = 1; p1.attacking = true; p1.onGround = true
      p1.currentAttack = { name: "probe", damage: dmg, category: cat, hitstun: 20, pushX: 6, rangeX: 320, rangeY: 320,
        aoe: true, hasHit: false, total: 10, timer: 5, activeStart: 0, activeEnd: 10 }
      try { resolveAttackHit(p1, p2, null, { stageWidth: WORLD_WIDTH }) } catch (e) { return { error: String(e) } }
      return { hitstun: p2.hitstun, attacking: p2.attacking, vx: p2.vx,
        armored: (p2.hitstun === 0 && p2.attacking === true),
        tookDamage: p2.health < startHealth, hpLost: Math.round(startHealth - p2.health) }
    },
    // ── UNLOCKS (Stage 21) ────────────────────────────────────────────────────
    unlockInfo: () => {
      const ctx = characterUnlockCtx()
      const keys = Object.keys(characters).filter(k => !characters[k]?.hidden && characters[k]?.isPlayable !== false)
      const part = partitionRoster(keys, ctx, characters)
      const conditions = {}
      for (const k of part.locked) conditions[k] = unlockLabel(unlockConditionFor(k, characters), characters)
      return { ctx: { level: ctx.level, dev: ctx.dev, beta: ctx.beta, arcadeAny: ctx.arcadeAny, towerTiers: ctx.towerTiers, arcadeCleared: ctx.arcadeCleared },
        unlocked: part.unlocked.sort(), locked: part.locked.sort(), conditions }
    },
    charUnlocked: (key) => isCharUnlocked(key),
    markTowerCleared: (tier = "tier2") => { setTowerTierCleared(tier); return getTowerCleared() },
    // ── PROFILING (Stage 22D) ─────────────────────────────────────────────────
    perf: () => ({ debugOverlay: _debugOverlay, loadedImages: loadedSheetCount(),
      projectiles: activeProjectiles.length, summons: (typeof activeSummons !== "undefined" ? activeSummons.length : 0),
      fx: hitSparks.length, dmgNumbers: damageNumbers.length, drawCalls: _drawCallsShown, pool: poolStats() }),
    poolResetStats: () => { poolResetStats(); return poolStats() },   // Stage 22C: reset counters before a burst measurement
    markArcadeCleared: (key = "gojo") => { setArcadeCleared(key, true); return getArcadeCleared() },   // test-only shortcut for the gate (real flow proven in arcade.test)
    victoryUnlocks: () => ({ chars: victoryState?.charUnlocks || [], leveledUp: !!victoryState?.xpResult?.leveledUp, level: victoryState?.xpResult?.level ?? null }),
    // Sample the Rick voice-pool randomizer N times (the SAME pickRickVoice used by every wired
    // Rick trigger) → lets a test prove genuine random selection / pair-alternation deterministically.
    rickVoicePick: (pool, n = 1) => Array.from({ length: n }, () => pickRickVoice(pool)),
    // Same idea for Killua's 8 pools (intro/taunt/specialPalm/specialGodspeed/specialCast/combatBark/
    // hitReact/win) — proves genuine random selection within each, using the SAME pickKilluaVoice the
    // live triggers call. `killuaVoicePool` exposes the raw pool so a test can verify full coverage.
    killuaVoicePick: (pool, n = 1) => Array.from({ length: n }, () => pickKilluaVoice(pool)),
    killuaVoicePool: pool => KILLUA_VOICE[pool] || null,
    // Same for Tobirama's 5 pools (intro/cast/ultimateCast/taunt/finisher) — proves genuine random
    // selection within each, using the SAME pickTobiramaVoice the live triggers call.
    tobiramaVoicePick: (pool, n = 1) => Array.from({ length: n }, () => pickTobiramaVoice(pool)),
    tobiramaVoicePool: pool => TOBIRAMA_VOICE[pool] || null,
    // Flash's 3 wired pools (intro/taunt/hitReact) — proves random selection within each.
    flashVoicePick: (pool, n = 1) => Array.from({ length: n }, () => pickFlashVoice(pool)),
    flashVoicePool: pool => FLASH_VOICE[pool] || null,
    gonVoicePick: (pool, n = 1) => Array.from({ length: n }, () => pickGonVoice(pool)),
    gonVoicePool: pool => GON_VOICE[pool] || null,
    // Zenitsu's 7 wired pools (intro/thunderclap/ultimate/combatBark/hitReact/lowHealth/doubleAttack) —
    // proves genuine random selection within each, using the SAME pickZenitsuVoice the live triggers call.
    zenitsuVoicePick: (pool, n = 1) => Array.from({ length: n }, () => pickZenitsuVoice(pool)),
    zenitsuVoicePool: pool => ZENITSU_VOICE[pool] || null,
    // Rengoku's 8 wired pools (intro/formCallout/concentration/ultimate/combatBark/hitReact/lowHealth/win) —
    // proves genuine random selection within each, using the SAME pickRengokuVoice the live triggers call.
    rengokuVoicePick: (pool, n = 1) => Array.from({ length: n }, () => pickRengokuVoice(pool)),
    rengokuVoicePool: pool => RENGOKU_VOICE[pool] || null,
    shinobuVoicePool: pool => SHINOBU_VOICE[pool] || null,
    shinobuVoicePick: (pool, n = 1) => Array.from({ length: n }, () => pickShinobuVoice(pool)),
    // Inosuke's 8 wired pools (intro/specialCast/beastAssist/combatBark/hitReact/hitGrunt/lowHealth/win) —
    // proves genuine random selection within each, using the SAME pickInosukeVoice the live triggers call.
    inosukeVoicePool: pool => INOSUKE_VOICE[pool] || null,
    inosukeVoicePick: (pool, n = 1) => Array.from({ length: n }, () => pickInosukeVoice(pool)),
    // Nezuko's 6 acoustic-sorted grunt pools (intro/combatBark/hitReact/hitGrunt/lowHealth/win).
    nezukoVoicePool: pool => NEZUKO_VOICE[pool] || null,
    nezukoVoicePick: (pool, n = 1) => Array.from({ length: n }, () => pickNezukoVoice(pool)),
    // Miwa's 9 JA pools (intro/taunt/iaiDash/airVortex/ultimate/combatBark/hitReact/lowHealth/win).
    miwaVoicePool: pool => MIWA_VOICE[pool] || null,
    miwaVoicePick: (pool, n = 1) => Array.from({ length: n }, () => pickMiwaVoice(pool)),
    madaraVoicePick: (pool, n = 1) => Array.from({ length: n }, () => pickMadaraVoice(pool)),
    madaraVoicePool: (pool) => (MADARA_VOICE[pool] || []).slice(),
    hashiramaVoicePick: (pool, n = 1) => Array.from({ length: n }, () => pickHashiramaVoice(pool)),
    hashiramaVoicePool: (pool) => (HASHIRAMA_VOICE[pool] || []).slice(),
    painVoicePick: (pool, n = 1) => Array.from({ length: n }, () => pickPainVoice(pool)),
    painVoicePool: (pool) => (PAIN_VOICE[pool] || []).slice(),
    obitoVoicePick: (pool, n = 1) => Array.from({ length: n }, () => pickObitoVoice(pool)),
    obitoVoicePool: (pool) => (OBITO_VOICE[pool] || []).slice(),
    zarakiVoicePick: (pool, n = 1) => Array.from({ length: n }, () => pickZarakiVoice(pool)),
    zarakiVoicePool: (pool) => (ZARAKI_VOICE[pool] || []).slice(),
    ichigoVoicePick: (pool, n = 1) => Array.from({ length: n }, () => pickIchigoVoice(pool)),
    ichigoVoicePool: (pool) => (ICHIGO_VOICE[pool] || []).slice(),
    // Yuji's EN+JA pool sets (intro/offense/cast/blackFlash/hitReact/lowHealth/win). lang switch is live.
    yujiVoicePool: (pool, lang) => (YUJI_VOICE[lang || getYujiVoiceLang()] || {})[pool] || null,
    yujiVoicePick: (pool, n = 1) => Array.from({ length: n }, () => pickYujiVoice(pool)),
    yujiVoiceLang: lang => (lang ? setYujiVoiceLang(lang) : getYujiVoiceLang()),
    // Sukuna's EN+JA pool sets (intro/taunt/offense/cast/castCleave/castFlame/castDomain/hitReact/lowHealth/win). lang switch is live.
    sukunaVoicePool: (pool, lang) => (SUKUNA_VOICE[lang || getSukunaVoiceLang()] || {})[pool] || null,
    sukunaVoicePick: (pool, n = 1) => Array.from({ length: n }, () => pickSukunaVoice(pool)),
    sukunaVoiceLang: lang => (lang ? setSukunaVoiceLang(lang) : getSukunaVoiceLang()),
    // Hisoka's 10 pools (intro/taunt/bungee/texture/overdrive/rekka/combatBark/hitReact/lowHealth/win)
    // — proves genuine random selection within each, using the SAME pickHisokaVoice the live triggers call.
    hisokaVoicePick: (pool, n = 1) => Array.from({ length: n }, () => pickHisokaVoice(pool)),
    ghostfaceVoicePick: (pool, n = 1) => Array.from({ length: n }, () => pickGhostfaceVoice(pool)),   // proves genuine random selection within a Ghostface pool
    ghostfaceVoicePool: (pool) => (GHOSTFACE_VOICE[pool] || []).slice(),   // the pool's clip array (coverage assertions)
    hisokaVoicePool: pool => HISOKA_VOICE[pool] || null,
    minatoVoicePick: (pool, n = 1) => Array.from({ length: n }, () => pickMinatoVoice(pool)),
    minatoVoicePool: pool => MINATO_VOICE[pool] || null,
    // Batman's 4 wired pools (intro/taunt/hitReact/win) — proves random selection within each.
    batmanVoicePick: (pool, n = 1) => Array.from({ length: n }, () => pickBatmanVoice(pool)),
    batmanVoicePool: pool => BATMAN_VOICE[pool] || null,
    omnimanVoicePick: (pool, n = 1) => Array.from({ length: n }, () => pickOmniManVoice(pool)),
    omnimanVoicePool: pool => OMNIMAN_VOICE[pool] || null,
    supermanVoicePick: (pool, n = 1) => Array.from({ length: n }, () => pickSupermanVoice(pool)),
    supermanVoicePool: pool => SUPERMAN_VOICE[pool] || null,
    // Sukuna voice pack deleted 2026-08-04 — sukunaVoicePick harness hook removed with it.
    // Same idea for Saiki's single 12-entry English-dub taunt pool — proves genuine
    // random, non-repeating selection deterministically (uses the SAME pickSaikiVoice
    // the live taunt-commit hook calls).
    saikiVoicePick: (pool, n = 1) => Array.from({ length: n }, () => pickSaikiVoice(pool)),
    // Netero voice harness hook removed (audio files + neteroVoice.js deleted).
    // Gojo "Limitless" (gojo2) skin voice pack — sample the SAME pickSkinVoice("gojo","gojo2",pool)
    // every wired Limitless trigger uses. Proves genuine random selection within each of the 6 pools.
    // Passing a null/other skinId returns nulls (proves the override is skin-gated, not global).
    gojoVoicePick: (skinId, pool, n = 1) => Array.from({ length: n }, () => pickSkinVoice("gojo", skinId, pool)),
    // Generic per-skin voice sampler (any rosterKey/skinId) — used by the Reverse Flash skin-gating test.
    skinVoicePick: (rosterKey, skinId, pool, n = 1) => Array.from({ length: n }, () => pickSkinVoice(rosterKey, skinId, pool)),
    // TEST-ONLY: live-apply a skin to a fighter (calls the real applySkin) so a test can toggle
    // the Limitless skin ON/OFF mid-session and prove the voice override activates/reverts.
    setSkin: (side = "p1", skinId = "default") => { const f = side === "p2" ? p2 : p1; if (f) { applySkin(f, skinId); return f.skinId } return null },
    // ── GHOSTFACE CALL-IN harness hooks ──
    callInPool:        (side = "p1") => { const f = side === "p2" ? p2 : p1; return f ? getGhostfaceCallInPool(f) : [] },   // the active identity's 4-char pool
    callInPartner:     (side = "p1") => { const f = side === "p2" ? p2 : p1; return f ? (f._callInPartner || null) : null }, // currently selected companion
    setCallInPartner:  (key, side = "p1") => { const f = side === "p2" ? p2 : p1; if (!f) return null; const pool = getGhostfaceCallInPool(f); if (pool.includes(key)) f._callInPartner = key; return f._callInPartner || null },   // select — REJECTS anyone outside this identity's pool
    lastCallInPartner: (side = "p1") => { const f = side === "p2" ? p2 : p1; return f ? (f._lastCallInPartner || null) : null }, // who was actually summoned by the last Call-In
    callInCd:          (side = "p1") => { const f = side === "p2" ? p2 : p1; return f ? (f.callInCd || 0) : 0 },
    resetCallIn:       (side = "p1") => { const f = side === "p2" ? p2 : p1; if (f) { f.callInCd = 0; f._lastCallInPartner = null } return true },   // clear the Call-In cooldown for back-to-back tests
    // GHOSTFACE PRESENTATION introspection (Stalk-Vanish off-screen/re-entry + 3-beat killer-swap flash).
    // Fire a companion swap DETERMINISTICALLY (same triggerGhostfaceSwap path the motion+Grab combo reaches
    // at Backstage-Pass emerge) — removes the flaky motion-input timing for presentation capture/tests.
    forceGfSwap: (slot = 0, side = "p1") => { const f = side === "p2" ? p2 : p1; return f ? triggerGhostfaceSwap(f, slot, getAbilityContext()) : false },
    // Fire the "Phone Call" AMBUSH swap deterministically (same triggerGhostfaceAmbush path as Charge+Special).
    forceGfAmbush: (slot = 0, side = "p1") => { const f = side === "p2" ? p2 : p1; return f ? triggerGhostfaceAmbush(f, slot, getAbilityContext()) : false },
    gfAmbush: (side = "p1") => { const f = side === "p2" ? p2 : p1; if (!f) return null
      return { active: isGhostfaceAmbushActive(f), phase: ghostfaceAmbushPhase(f), roster: f.rosterKey, swapActive: !!f._gfSwapActive,
               ambushFlash: f._gfAmbushFlash ? { color: f._gfAmbushFlash.color, t: f._gfAmbushFlash.t } : null,
               strikers: activeSummons.filter(s => s.id === "gfAmbush").map(s => ({ x: Math.round(s.x), hasHit: !!s.hasHit, sheet: (s.sheet||"").split("/").pop() })) } },
    gfPres: (side = "p1") => { const f = side === "p2" ? p2 : p1; if (!f) return null
      const p = getGhostfacePresentation(f)
      return { vanish: f._gfVanish ? { phase: f._gfVanish.phase, t: f._gfVanish.t, dir: f._gfVanish.dir } : null,
               swapCine: f._gfSwapCine ? { t: f._gfSwapCine.t, color: f._gfSwapCine.color } : null,
               alpha: +p.alpha.toFixed(3), dx: Math.round(p.dx), flash: p.flash ? { color: p.flash.color, alpha: +p.flash.alpha.toFixed(3) } : null } },
    // GHOSTFACE COMPANION SWAP introspection: live window state + which companion the CURRENT combo slots map to.
    // gfSwap().slots = [{combo, companion}] for the equipped identity → proves each slot deterministically → its pool member.
    gfSwap: (side = "p1") => {
      const f = side === "p2" ? p2 : p1
      if (!f) return null
      const pool = getGhostfaceCallInPool(f)
      return {
        active: isGhostfaceSwapActive(f), target: ghostfaceSwapTarget(f), timer: ghostfaceSwapTimer(f),
        rosterKey: f.rosterKey, name: f.name, energy: f.energy, maxEnergy: f.maxEnergy, infiniteEnergy: !!f.infiniteEnergy,
        skinId: f.skinId || null, pool,
        recolorTag: f._recolorTag || null,           // during a swap this is the companion's "crew" affiliation skin (spec §3)
        hasSkinAnim: !!f._skinAnim,                   // the borrowed art is the recoloured _crew sheet set, not the companion default
        slots: GHOSTFACE_SWAP_SLOTS.map((s, i) => ({ combo: s.label, companion: pool[i] || null }))
      }
    },
    // Ghostface Backstage Pass (spec §4.2) live state — branch, dash timer, whether the phantom hit landed.
    bp: (side = "p1") => {
      const f = side === "p2" ? p2 : p1
      if (!f) return null
      return { active: isGhostfaceBackstagePassActive(f), branch: ghostfaceBackstagePassBranch(f), timer: f._bpTimer || 0,
               hitLanded: !!f._bpHitLanded, gfSwapActive: !!f._gfSwapActive, rosterKey: f.rosterKey,
               x: f.x, facing: f.facing, invulnTimer: f.invulnTimer || 0 }
    },
    // Force-expire the swap window so the update loop auto-reverts THIS frame (revert-timing test without a 12s wait).
    expireGfSwap: (side = "p1") => { const f = side === "p2" ? p2 : p1; if (f && f._gfSwapActive) f._gfSwapTimer = 1; return true },
    // Shorten the swap window to `n` frames so the NATURAL updateGhostfaceSwap countdown can be watched
    // ticking to 0 and auto-reverting (not a forced revert) without waiting the full 12s.
    setGfSwapTimer: (n = 30, side = "p1") => { const f = side === "p2" ? p2 : p1; if (f && f._gfSwapActive) f._gfSwapTimer = n; return f ? f._gfSwapTimer : null },
    // TEST-ONLY: arm Chrollo's Skill Hunter unlock (normally earned by the opponent landing 3 distinct moves)
    // so a test can drive his REAL ultimate and confirm Skill Hunter still swaps — proving the shared
    // field-swap engine + charge path are unaffected by the Ghostface Companion Swap.
    forceChrolloUnlock: (side = "p1") => { const f = side === "p2" ? p2 : p1; if (!f || (f.rosterKey || "").toLowerCase() !== "chrollo") return false; f._shUnlocked = true; return true },
    shState: (side = "p1") => { const f = side === "p2" ? p2 : p1; return f ? { active: !!f._shActive, target: f._shTarget || null, rosterKey: f.rosterKey, unlocked: !!f._shUnlocked } : null },
    // TEST-ONLY (Bandit's Echo, Stage 2): read Chrollo's current mark so a harness can prove a special/
    // ultimate connect marked the right move. Returns null when no mark is armed. Independent of shState.
    beState: (side = "p1") => { const f = side === "p2" ? p2 : p1; return f && f._beMark ? { ...f._beMark } : null },
    clearBeMark: (side = "p1") => { const f = side === "p2" ? p2 : p1; if (f) f._beMark = null },   // TEST-ONLY: drop the current Bandit's Echo mark (independent subtests)
    // TEST-ONLY (Stage 3/4): arm a Bandit's Echo mark deterministically (e.g. an Ultimate-tier mark that's
    // awkward to land live), so a test can drive the activation path without staging the exact connect.
    forceBeMark: (mark, side = "p1") => { const f = side === "p2" ? p2 : p1; if (!f || !mark || !mark.rosterKey) return false; f._beMark = { rosterKey: String(mark.rosterKey).toLowerCase(), isUltimate: !!mark.isUltimate, moveName: mark.moveName || (mark.isUltimate ? "ultimate" : "special"), dir: mark.dir || null, displayName: mark.displayName || mark.rosterKey }; return true },
    // TEST-ONLY: fire Bandit's Echo directly (bypasses the Down+Ult input) + report the HP debit / mark-consume.
    beActivate: (side = "p1") => { const f = side === "p2" ? p2 : p1; if (!f) return null; const hpBefore = f.health, hadMark = !!f._beMark; const fired = triggerBanditEcho(f, getAbilityContext()); return { fired, hpBefore, hpAfter: f.health, hadMark, markAfter: f._beMark ? { ...f._beMark } : null, active: !!f._beActive, rosterKey: f.rosterKey } },
    beActive: (side = "p1") => { const f = side === "p2" ? p2 : p1; return f ? { active: !!f._beActive, target: f._beTarget || null, rosterKey: f.rosterKey } : null },
    // TEST-ONLY: drive Chrollo's REAL Skill Hunter field-swap engine (applySkillHunter → revertSkillHunter)
    // directly onto the live fighter, bypassing the (separately-wired) activation cinematic — proves the
    // shared engine the Ghostface Companion Swap reuses is intact and Chrollo's swap+restore still works.
    chrolloEngineCheck: (target = "rengoku", side = "p1") => {
      const f = side === "p2" ? p2 : p1
      if (!f || (f.rosterKey || "").toLowerCase() !== "chrollo") return null
      const before = f.rosterKey
      const okApply = applySkillHunter(f, target); const during = f.rosterKey
      const okRevert = revertSkillHunter(f); const after = f.rosterKey
      return { okApply, during, okRevert, after, before }
    },
    // TEST-ONLY: inject a minimal `taunt` animationData onto the LIVE p1 fighter so a
    // test can drive the real taunt commit-transition and prove the (dormant) Saiki voice
    // hook fires the moment a taunt action exists. Does NOT ship a taunt to Saiki — the
    // real build defines none; this only mutates the in-page fighter instance for the proof.
    giveP1TestTaunt: (frames = 4) => { if (p1) { p1.animationData = p1.animationData || {}; p1.animationData.taunt = { frames, width: 32, height: 48, speed: 4, loop: false, lockLastFrame: true, sheet: "./saiki_idle_u.png" } } },
    // Zero the LIVE fighter's offense-voice state (cooldown + combo) so a test can force a
    // CLEAN single-hit connect — p1()/p2() return snapshots, so mutating those can't reset it.
    resetOffenseVoice: (side = "p1") => { const f = side === "p2" ? p2 : p1; if (f) { f._atkVoiceCd = 0; f._hitVoiceCd = 0; f.comboCounter = 0; f.comboTimer = 0; f._gruntVoiceCd = 0; f._prevAttacking = false; } },
    damageP1: (v = 100) => { if (p1) p1.health = Math.max(1, (p1.health || 0) - v) },   // chip P1 so a round isn't perfect
    victoryInfo: () => ({ flawless: !!victoryState.flawless, subtitle: victoryState.subtitle || "", primaryLabel: victoryState.primaryLabel || "", winner: victoryState.winnerSide, perfectP1: matchStats?.p1?.perfectRounds, roundsWonP1: matchStats?.p1?.roundsWon }),
    // ── FREE-FOR-ALL diagnostics/drivers ──────────────────────────────────────
    // teams: optional per-slot "A"/"B" array → team mode; omit/[] → pure FFA.
    // aiSlots: optional per-slot difficulty ("easy"/"adaptive"/"impossible") or null=human →
    // AI-fills those slots (default omitted → all human, so existing FFA/team tests are unaffected).
    ffaStart: (count = 3, charKeys = ["gojo", "sukuna", "megumi", "yuji"], teams = [], aiSlots = []) => {
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
        slot: f.ffaSlot, key: f.rosterKey, skinId: f.skinId || null, playerNumber: f.playerNumber, team: f.team || null,
        x: Math.round(f.x), y: Math.round(f.y), health: Math.round(f.health), maxHealth: f.maxHealth,
        eliminated: !!f.eliminated, facing: f.facing, attacking: !!f.attacking,
        isAI: !!f._aiControlled, aiDifficulty: f.aiDifficulty || null, aiTarget: f._aiTargetSlot ?? null
      }))
    }),
    // Jump straight to the team-assignment screen (device cap blocks the menu route without pads).
    ffaTeamSelectPreview: (count = 3, charKeys = ["gojo", "sukuna", "megumi", "yuji"]) => {
      ffaState.playerCount = count; ffaState.charKeys = charKeys.slice(0, count)
      ffaState.teams = Array.from({ length: count }, (_, i) => FFA_TEAMS[i % 2]); ffaState.pickSlot = count
      hoverFFATeamIndex = 0; gameState = GAME_STATES.FFA_TEAMSELECT
    },
    // Jump to the slot-assignment (human/AI + difficulty) screen and read/drive it.
    ffaSlotSelectPreview: (count = 4, charKeys = ["gojo", "sukuna", "megumi", "yuji"]) => {
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
    setInputType: (pn, t) => { const k = { 1: "p1Type", 2: "p2Type", 3: "p3Type", 4: "p4Type" }[pn]; if (k) inputSettings[k] = t; return { [k]: inputSettings[k] } },   // test-only: mirror the Settings device toggle
    chooseModePvp: () => { chooseMode("pvp"); return { p1: inputSettings.p1Type, p2: inputSettings.p2Type } },   // test-only: exercise the real PvP device-assignment path
    padBinding: pn => (getPlayerGamepad(pn) ? getPlayerGamepad(pn).index : null),   // which pad.index a player is actually bound to (null = none)
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
