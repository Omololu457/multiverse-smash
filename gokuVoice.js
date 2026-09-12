// gokuVoice.js
// ---------------------------------------------------------------------------
// Goku voice-line pools (audio-only; NO gameplay effect). Source = 32 clips
// ("goku_*.mp3", English dub from DBZ Extreme Butoden). Filenames encode ONLY the
// source index, so every clip was TRANSCRIBED (faster-whisper base + VAD) to a real
// content log — see GOKU_VOICE_LOG.md — NOT guessed from filenames. NOTE: base Goku
// previously had NO voice at all (only goku_black did), so this is his first pack.
//
// Goku's rip is rich in clean short single lines (his eager "let's fight" openers).
// A handful of longer post-battle stitches are left unwired (LOG). EN. His signature
// "My name's not Kakarot — it's Son Goku!" runs through the intro pool.
//
// pickGokuVoice(pool) returns ONE clip at random (genuine Math.random). Callers play
// via sound.playSfxFile(clip, null).
//
// ── TRIGGER MAP ──
//   intro     → game.js INTRO_VOICE — eager pre-fight openers ("How about a quick scrap?")
//   taunt     → combat.js applyGokuOffenseVoice (attacker STRONG / long connect) — confident trash-talk
//   lowHealth → combat.js applyGokuLowHealthVoice (once, crossing 30% HP) — "I've still got more left in me!"
//   win       → game.js _checkMatchOver (winner = Goku) — his rematch-hungry victory lines
// ---------------------------------------------------------------------------

export const GOKU_VOICE = {
  intro: [
    "goku_009.mp3",   // "How about a quick scrap?"
    "goku_011.mp3",   // "I want to see what you can do. My name's not Kakarot!"
    "goku_015.mp3",   // "Let's go a few rounds. My name's not Kakarot!"
    "goku_017.mp3",   // "My name is Goku and I'm a Saiyan!"
  ],
  taunt: [
    "goku_001.mp3",   // "I'm your worst nightmare."
    "goku_007.mp3",   // "This guy's a cut above the rest!"
    "goku_032.mp3",   // "Have you even been training?"
  ],
  lowHealth: [
    "goku_029.mp3",   // "I've still got more left in me!"
  ],
  win: [
    "goku_030.mp3",   // "Let's go again! The more you fight, the stronger you get!"
    "goku_031.mp3",   // "I can't wait to fight you again!"
    "goku_024.mp3",   // "It's always exciting to go head to head with you."
  ],
}

export function pickGokuVoice(pool) {
  const arr = GOKU_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
