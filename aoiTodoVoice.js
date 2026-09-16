// aoiTodoVoice.js
// ---------------------------------------------------------------------------
// Aoi Todo voice-line pools (audio-only; NO gameplay effect). Source = 516 clips
// ("aoi_todo_*.mp3"). Filenames encode ONLY the source index, so every clip was
// TRANSCRIBED (faster-whisper base + VAD) to a real content log — see
// AOI_TODO_VOICE_LOG.md — NOT guessed from filenames.
//
// ── LANGUAGE POLICY (Stage 3) ──
// The 516-clip rip is a MIX of the Japanese dub (410 clips) and the English dub
// (86 clips), plus 20 non-speech / VAD-empty clips. Per the owner's decision, ONLY
// the JAPANESE clips are wired for Aoi Todo. The English clips were set aside for a
// possible future English-mode in the "voice lines new/" source workspace, which was
// removed from the tree once runtime voice migrated to voice/<char>/ — recover the
// reserves from git history if English-mode is ever built. The language of every clip
// came from real ASR detection, NOT filename/guesswork.
//
// Only clean, short, self-contained Japanese single lines are wired below; the many
// long stitched compilations and sub-word fragments are left unwired (see LOG). JA.
//
// pickAoiTodoVoice(pool) returns ONE clip at random (genuine Math.random), same shape
// as pickSukunaVoice. Callers play via sound.playSfxFile(clip, null).
//
// ── TRIGGER MAP ──
//   intro     → game.js INTRO_VOICE — his bored-challenge openers ("Will you free me from boredom?")
//   taunt     → combat.js applyAoiTodoOffenseVoice (attacker STRONG / long connect) — "Can you keep up?!" / "120%!"
//   hitReact  → combat.js applyAoiTodoHitVoice (defender got hit) — short reaction grunt
//   win       → game.js _checkMatchOver (winner = Aoi Todo) — bored-victor close-out
// ---------------------------------------------------------------------------

export const AOI_TODO_VOICE = {
  intro: [
    "aoi_todo_299.mp3",   // "お前は俺を退屈から解放してくれるのか" — "Will you free me from my boredom?"
    "aoi_todo_333.mp3",   // "俺を満たしてくれる奴はいないのか" — "Is there no one who can satisfy me?"
    "aoi_todo_409.mp3",   // "さあ、勝利を始めようか！" — "Now then — let's begin the victory!"
  ],
  taunt: [
    "aoi_todo_301.mp3",   // "果たして俺の戦いについてこられるか！" — "Can you keep up with my fight?!"
    "aoi_todo_320.mp3",   // "そんな退屈な奴なら、やるだけ無駄だ" — "Someone that boring? Pointless."
    "aoi_todo_431.mp3",   // "おのれの限界を超えるいい機会だ" — "A fine chance to exceed your limits."
    "aoi_todo_161.mp3",   // "120％だ！" — his "120%!" hype catchphrase
  ],
  hitReact: [
    "aoi_todo_486.mp3",   // "ダメだ！" — "No good!" (reaction)
    "aoi_todo_263.mp3",   // "なに？" — "What?!" (surprise reaction)
    "aoi_todo_166.mp3",   // "せい！" — short effort grunt
  ],
  win: [
    "aoi_todo_346.mp3",   // "もっと楽しめると思ったんだがな" — "I thought I'd enjoy it more…" (bored victor)
    "aoi_todo_302.mp3",   // "俺が勝利へと導いてみせるさ" — "I'll lead the way to victory."
  ],
}

export function pickAoiTodoVoice(pool) {
  const arr = AOI_TODO_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
