// announcerVoice.js
// ---------------------------------------------------------------------------
// GENERIC ANNOUNCER voice pools (audio-only; NO gameplay effect). 227 clips in announcer_clips, REAL-transcribed
// (faster-whisper) + aligned to SCRIPT_REFERENCE.txt by content (biased by recording order). One pool per
// script section; pickAnnouncer(pool) returns ONE clip at random. Played via sound.playSfxFile(clip, null,
// { owner: null }) — untagged, so it never cross-cuts a fighter's single voice channel.
// ---------------------------------------------------------------------------

const A = "./announcer_clips/"

export const ANNOUNCER_VOICE = {
  boot:            [A + "announcer_001.mp3", A + "announcer_002.mp3", A + "announcer_003.mp3", A + "announcer_004.mp3"],
  mainMenu:        [A + "announcer_005.mp3", A + "announcer_006.mp3", A + "announcer_007.mp3"],
  modeSelect:      [A + "announcer_008.mp3", A + "announcer_009.mp3", A + "announcer_010.mp3", A + "announcer_011.mp3", A + "announcer_012.mp3", A + "announcer_013.mp3", A + "announcer_014.mp3", A + "announcer_015.mp3"],
  settings:        [A + "announcer_016.mp3", A + "announcer_017.mp3"],
  charSelect:      [A + "announcer_018.mp3", A + "announcer_019.mp3", A + "announcer_020.mp3"],
  charHover:       [A + "announcer_021.mp3", A + "announcer_022.mp3", A + "announcer_023.mp3", A + "announcer_024.mp3", A + "announcer_025.mp3", A + "announcer_026.mp3", A + "announcer_027.mp3"],
  charLock:        [A + "announcer_028.mp3", A + "announcer_029.mp3", A + "announcer_030.mp3"],
  charRandom:      [A + "announcer_031.mp3", A + "announcer_032.mp3"],
  skinSelect:      [A + "announcer_033.mp3", A + "announcer_034.mp3"],
  stageSelect:     [A + "announcer_035.mp3", A + "announcer_036.mp3", A + "announcer_037.mp3"],
  stageHover:      [A + "announcer_038.mp3", A + "announcer_039.mp3"],
  vs:              [A + "announcer_040.mp3", A + "announcer_041.mp3", A + "announcer_042.mp3", A + "announcer_043.mp3", A + "announcer_044.mp3", A + "announcer_045.mp3", A + "announcer_046.mp3"],
  countdown:       [A + "announcer_047.mp3", A + "announcer_048.mp3", A + "announcer_049.mp3"],
  roundStart:      [A + "announcer_050.mp3", A + "announcer_051.mp3", A + "announcer_052.mp3", A + "announcer_053.mp3", A + "announcer_054.mp3"],   // Round one/two/three/Final round/Sudden death
  fight:           [A + "announcer_055.mp3"],   // "Fight!" — split out so the go-moment always plays it
  roundModifier:   [A + "announcer_056.mp3", A + "announcer_057.mp3", A + "announcer_058.mp3"],
  earlyNeutral:    [A + "announcer_059.mp3", A + "announcer_060.mp3", A + "announcer_061.mp3"],
  firstHit:        [A + "announcer_062.mp3", A + "announcer_063.mp3", A + "announcer_064.mp3"],
  blocked:         [A + "announcer_065.mp3", A + "announcer_066.mp3", A + "announcer_067.mp3", A + "announcer_068.mp3", A + "announcer_069.mp3"],
  parry:           [A + "announcer_070.mp3", A + "announcer_071.mp3", A + "announcer_072.mp3", A + "announcer_073.mp3"],
  clash:           [A + "announcer_074.mp3", A + "announcer_075.mp3", A + "announcer_076.mp3"],
  counterHit:      [A + "announcer_077.mp3", A + "announcer_078.mp3", A + "announcer_079.mp3"],
  midHype:         [A + "announcer_080.mp3", A + "announcer_081.mp3", A + "announcer_082.mp3", A + "announcer_083.mp3", A + "announcer_084.mp3", A + "announcer_085.mp3", A + "announcer_086.mp3", A + "announcer_087.mp3"],
  comboStart:      [A + "announcer_088.mp3", A + "announcer_089.mp3"],
  comboMilestone:  [A + "announcer_090.mp3", A + "announcer_091.mp3", A + "announcer_092.mp3", A + "announcer_093.mp3", A + "announcer_094.mp3", A + "announcer_095.mp3", A + "announcer_096.mp3"],
  comboDropped:    [A + "announcer_097.mp3", A + "announcer_098.mp3", A + "announcer_099.mp3", A + "announcer_100.mp3"],
  launcher:        [A + "announcer_101.mp3", A + "announcer_102.mp3", A + "announcer_103.mp3"],
  specialLanded:   [A + "announcer_104.mp3", A + "announcer_105.mp3"],
  specialWhiffed:  [A + "announcer_106.mp3", A + "announcer_107.mp3", A + "announcer_108.mp3"],
  ultActivate:     [A + "announcer_109.mp3", A + "announcer_110.mp3", A + "announcer_111.mp3"],
  ultConnect:      [A + "announcer_112.mp3", A + "announcer_113.mp3", A + "announcer_114.mp3", A + "announcer_115.mp3"],
  ultWhiff:        [A + "announcer_116.mp3", A + "announcer_117.mp3", A + "announcer_118.mp3"],
  transform:       [A + "announcer_119.mp3", A + "announcer_120.mp3", A + "announcer_121.mp3", A + "announcer_122.mp3"],
  domain:          [A + "announcer_123.mp3", A + "announcer_124.mp3", A + "announcer_125.mp3"],
  grab:            [A + "announcer_126.mp3", A + "announcer_127.mp3", A + "announcer_128.mp3"],
  throwEscape:     [A + "announcer_129.mp3", A + "announcer_130.mp3"],
  knockdown:       [A + "announcer_131.mp3", A + "announcer_132.mp3"],
  wakeup:          [A + "announcer_133.mp3", A + "announcer_134.mp3"],
  lowHealth:       [A + "announcer_135.mp3", A + "announcer_136.mp3", A + "announcer_137.mp3", A + "announcer_138.mp3", A + "announcer_139.mp3"],
  critical:        [A + "announcer_140.mp3", A + "announcer_141.mp3", A + "announcer_142.mp3"],
  comeback:        [A + "announcer_143.mp3", A + "announcer_144.mp3", A + "announcer_145.mp3", A + "announcer_146.mp3"],
  chipFinish:      [A + "announcer_147.mp3", A + "announcer_148.mp3"],
  ko:              [A + "announcer_149.mp3", A + "announcer_150.mp3", A + "announcer_151.mp3", A + "announcer_152.mp3", A + "announcer_153.mp3"],
  perfect:         [A + "announcer_154.mp3", A + "announcer_155.mp3", A + "announcer_156.mp3", A + "announcer_157.mp3", A + "announcer_158.mp3"],
  brutality:       [A + "announcer_159.mp3", A + "announcer_160.mp3", A + "announcer_161.mp3", A + "announcer_162.mp3", A + "announcer_163.mp3"],
  roundTransition: [A + "announcer_164.mp3", A + "announcer_165.mp3", A + "announcer_166.mp3"],
  doubleKo:        [A + "announcer_167.mp3", A + "announcer_168.mp3", A + "announcer_169.mp3"],
  timeOver:        [A + "announcer_170.mp3", A + "announcer_171.mp3", A + "announcer_172.mp3"],
  victory:         [A + "announcer_173.mp3", A + "announcer_174.mp3", A + "announcer_175.mp3", A + "announcer_176.mp3", A + "announcer_177.mp3", A + "announcer_178.mp3", A + "announcer_179.mp3", A + "announcer_180.mp3"],
  rematch:         [A + "announcer_181.mp3", A + "announcer_182.mp3", A + "announcer_183.mp3"],
  returnMenu:      [A + "announcer_184.mp3", A + "announcer_185.mp3"],
  modeEntry:       [A + "announcer_186.mp3", A + "announcer_187.mp3", A + "announcer_188.mp3", A + "announcer_189.mp3", A + "announcer_190.mp3", A + "announcer_191.mp3", A + "announcer_192.mp3", A + "announcer_193.mp3"],
  arcadeProgress:  [A + "announcer_194.mp3", A + "announcer_195.mp3", A + "announcer_196.mp3"],
  towerProgress:   [A + "announcer_197.mp3", A + "announcer_198.mp3", A + "announcer_199.mp3", A + "announcer_200.mp3"],
  ffaElim:         [A + "announcer_201.mp3", A + "announcer_202.mp3", A + "announcer_203.mp3"],
  ffaVictory:      [A + "announcer_204.mp3", A + "announcer_205.mp3"],
  team:            [A + "announcer_206.mp3", A + "announcer_207.mp3"],
  training:        [A + "announcer_208.mp3", A + "announcer_209.mp3", A + "announcer_210.mp3"],
  challengeSuccess: [A + "announcer_211.mp3", A + "announcer_212.mp3", A + "announcer_213.mp3"],
  challengeFail:   [A + "announcer_214.mp3", A + "announcer_215.mp3", A + "announcer_216.mp3"],
  levelUp:         [A + "announcer_217.mp3", A + "announcer_218.mp3"],
  unlock:          [A + "announcer_219.mp3", A + "announcer_220.mp3", A + "announcer_221.mp3"],
  pause:           [A + "announcer_222.mp3", A + "announcer_223.mp3"],
  disconnect:      [A + "announcer_224.mp3", A + "announcer_225.mp3"],
  idle:            [A + "announcer_226.mp3", A + "announcer_227.mp3"],
}

export function pickAnnouncer(pool) {
  const arr = ANNOUNCER_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}

// Per-mode-card hover line — the SPECIFIC modeSelect clip whose spoken name matches the card the cursor is
// on (GAMEPLAY_SELECT). Keyed by the card `id` from getGameplaySelectRects. Cards WITHOUT a dedicated
// recorded line (bracket = "Tournament", aivsai) are omitted → the hover falls back to a random modeSelect
// pick. "Story Mode." (008) has no card on this screen, so it's only reachable via that fallback.
export const MODE_SELECT_BY_CARD = {
  training:    A + "announcer_013.mp3",   // "Training."
  comboTrials: A + "announcer_015.mp3",   // "Combo Trials."
  vs:          A + "announcer_010.mp3",   // "Versus."
  pvp:         A + "announcer_010.mp3",   // "Versus." (2-player local versus shares the line)
  arcade:      A + "announcer_009.mp3",   // "Arcade."
  tower:       A + "announcer_011.mp3",   // "Tower Challenge."
  ffa:         A + "announcer_012.mp3",   // "Free For All."
  online:      A + "announcer_014.mp3",   // "Online — local network."
}

// Resolve the announcer clip for a hovered mode card: its specific line, else a random modeSelect line;
// null for BACK (not a mode → stays silent).
export function pickModeCardAnnouncer(cardId) {
  if (!cardId || cardId === "back") return null
  return MODE_SELECT_BY_CARD[cardId] || pickAnnouncer("modeSelect")
}
