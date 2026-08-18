// naoyaVoice.js
// ---------------------------------------------------------------------------
// Naoya Zenin voice-line pools (audio-only; NO gameplay effect). 39 provided clips (naoya_line_001..039.mp3),
// silence-split from "Naoya Dialogue Compilation Part 1" (93.8s, JUJUTSU KAISEN, Japanese/Kansai-ben). NO
// transcript at split time → I transcribed all 39 myself via faster_whisper (tools/transcribe_naoya.py →
// naoya_raw_transcript.tsv) + an acoustic pass (loudness/end-energy) to sort the ~12 NON-VERBAL grunts and
// flag mid-word cuts. Classification is CONTENT-forward where the JA is discernible, ACOUSTIC for the grunts.
// pickNaoyaVoice(pool) → ONE clip at random; callers play it via sound.playSfxFile(clip, null).
//
// ── CONFIDENCE / KEY CONTENT ──
//   HIGH:  line_011 = "Zen'in Naoya!" (his own NAME → namecall/intro).  line_028 = arrogant laugh (win).
//          The 12 empty/grunt clips = non-verbal → effort / hit / knockdown by loudness.
//   MED:   arrogant taunts (line_002 "don't you have a human heart?", 014 "I don't care about you", 016/026),
//          aggressive declarations (018 "I'll have you die", 037/038 technique-ish shouts) → Frame-Trap /
//          special casts. line_019 (smug 3.2s monologue) → the promoted Frame-Trap ULTIMATE.
//   LOW:   whisper garbles Kansai-ben + proper nouns → the story-context lines (004/007/008/013/015/020/017)
//          are BANKED as `unclear`, NOT force-wired.
//
// ── TRIGGER MAP (hooks in game.js / abilities.js / combat.js) ──
//   intro       → pre-match reveal (namecall + boasts + arrogant banter)   game.js INTRO_VOICE table
//   frameTrap   → Frame-Trap OPEN telegraph (Down+Special) — the in-character "I've already planned this" beat
//                 (prompt Step 3: a DEDICATED arrogant line on the signature special, not the generic pool)
//                                                                          abilities.fireNaoyaFrameTrap
//   special     → Energy Dart / Pitch Throw / Frame-Skip casts             abilities.fireNaoya{EnergyDart,Pitch,FrameSkip}
//   ultimate    → promoted guaranteed Frame-Trap ultimate (U)              abilities.executeNaoyaUltimate
//   effort      → LIGHT normal strike shout (gated _naoyaAtkVoiceCd)       combat.applyNaoyaAttackVoice
//   hitLight    → takes a LIGHT hit — soft pained grunt                    combat.applyNaoyaHitVoice
//   hitHeavy    → takes a HEAVY/strong hit — defiant grunt/curse           combat.applyNaoyaHitVoice
//   knockdown   → knocked down                                            combat.js knockdown watcher
//   win         → victory (his arrogant laugh / scoff)                     game.js win dispatch
//
// ── FLAGS / OPEN ITEMS (see Step 4/5 report) ──
//   * line_010 ("あなたを…" — "You…") is a clean FRAGMENT (0.85s, ends mid-phrase) → BANKED, flagged for
//     manual re-listen/re-split. NOT wired.
//   * `unclear` = 6 garbled story-context lines (004/007/008/013/015/020) + line_017 (a resigned/pained line
//     that would suit DEFEAT — but the codebase has NO defeat-voice hook, so it is banked, not wired).
//   * NO Frame-Skip-specific line is strong enough to warrant its own pool → Frame-Skip shares `special`.
//   * The source is explicitly "Part 1" → a PART 2 likely exists and is NOT in this 39-clip set (flagged).
//   * OVERLAPPING manifest timestamps (013/14, 20/21, 22/23, 26/27, 31/32, 38/39) → the seam between each
//     pair is provisional; they transcribed/decayed as complete-enough clips, but re-verify if any sounds
//     clipped at its start.
// ---------------------------------------------------------------------------

export const NAOYA_VOICE = {
  // INTRO / pre-match — namecall + self-declarations + arrogant banter (no taunt action exists → taunt-vibe
  // lines fold onto the intro beat, the project's standing pattern).
  intro: [
    "naoya_line_011.mp3",   // "Zen'in Naoya!" — his NAME (namecall)
    "naoya_line_009.mp3",   // "special-grade sorcerer!" — self boast
    "naoya_line_002.mp3",   // "don't you have a human heart?" — signature snark
    "naoya_line_001.mp3",   // "that's harsh~" — mocking
    "naoya_line_003.mp3",   // casual opener
    "naoya_line_021.mp3",   // "I'm looking for you" — pre-match
  ],
  // FRAME-TRAP telegraph (Down+Special) — the DEDICATED arrogant "already planned this" line on his signature.
  frameTrap: [
    "naoya_line_014.mp3",   // "I don't care about you" — peak dismissive
    "naoya_line_018.mp3",   // "I'll have you die"
    "naoya_line_016.mp3",   // menacing ("...your legs")
    "naoya_line_026.mp3",   // taunting
  ],
  // GENERIC special casts — Energy Dart / Pitch Throw / Frame-Skip (aggressive shouts / short taunts).
  special: [
    "naoya_line_037.mp3",   // technique-ish shout
    "naoya_line_038.mp3",   // exertion shout
    "naoya_line_005.mp3",   // Kansai taunt
    "naoya_line_012.mp3",   // taunt
  ],
  // ULTIMATE — the promoted guaranteed Frame-Trap: his longest smug villain-monologue line.
  ultimate: [
    "naoya_line_019.mp3",   // "...write me a letter before that~" (3.2s smug monologue)
  ],
  // LIGHT-normal effort — short strike grunts (gated so the flurry doesn't machine-gun). Louder short grunts.
  effort: [
    "naoya_line_006.mp3", "naoya_line_024.mp3", "naoya_line_032.mp3",
    "naoya_line_034.mp3", "naoya_line_035.mp3", "naoya_line_039.mp3",
  ],
  // TAKES A LIGHT HIT — soft pained grunts (quieter empty clips).
  hitLight: [
    "naoya_line_029.mp3", "naoya_line_030.mp3", "naoya_line_033.mp3",
  ],
  // TAKES A HEAVY/STRONG HIT — defiant grunt / curse.
  hitHeavy: [
    "naoya_line_027.mp3",   // "damn—!" curse
    "naoya_line_036.mp3",   // "what the—"
    "naoya_line_022.mp3",   // grunt
  ],
  // KNOCKED DOWN — sharper pained grunts.
  knockdown: [
    "naoya_line_023.mp3", "naoya_line_031.mp3",
  ],
  // VICTORY — his arrogant laugh / scoff.
  win: [
    "naoya_line_028.mp3",   // "hahaha" arrogant laugh
    "naoya_line_025.mp3",   // "heh" scoff
  ],
  // BANKED — genuinely unclear / no matching trigger. NOT wired. (Story-context garble + a defeat-suited line
  // with no defeat hook + the mid-word FRAGMENT flagged for re-split.)
  unclear: [
    "naoya_line_004.mp3", "naoya_line_007.mp3", "naoya_line_008.mp3",
    "naoya_line_013.mp3", "naoya_line_015.mp3", "naoya_line_020.mp3",
    "naoya_line_017.mp3",   // resigned/pained — would suit DEFEAT, but no defeat-voice hook exists → banked
    "naoya_line_010.mp3",   // ★ FRAGMENT ("You…", cut mid-phrase) — flagged for manual re-split
  ],
}

let _bag = {}
export function pickNaoyaVoice(pool) {
  const arr = NAOYA_VOICE[pool]
  if (!arr || !arr.length) return null
  // shuffle-bag per pool so repeats don't cluster
  let bag = _bag[pool]
  if (!bag || !bag.length) { bag = arr.slice(); _bag[pool] = bag }
  const i = Math.floor(Math.random() * bag.length)
  return bag.splice(i, 1)[0]
}
