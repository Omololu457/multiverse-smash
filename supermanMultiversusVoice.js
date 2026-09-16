// supermanMultiversusVoice.js
// ---------------------------------------------------------------------------
// Superman voice pack #2 — MultiVersus rip (audio-only; NO gameplay effect). Assigned to
// the "Superman (Classic)" variant (rosterKey "superman_classic") to give it a voice DISTINCT
// from base Superman's Injustice-2 pack. TONE FIT: MultiVersus Superman is the bright, earnest,
// wholesome Boy-Scout — "let's all fight fair", "proud of you all" — which is exactly the Classic
// heroic Superman's personality, so the pairing is deliberate (see Stage 5 report / VOICE routing).
//
// Source = 98 clips ("superman_mvs_*.mp3", English). Every clip TRANSCRIBED (faster-whisper base)
// — see SUPERMAN_MULTIVERSUS_VOICE_LOG.md. REALITY OF THE PACK: MultiVersus is a crossover party
// fighter, so a LARGE share NAMES other roster characters (Batman/Bruce, Wonder Woman/Diana, Jake,
// Raven, Rick, Crypto the dog, Team Titans) or is a menu/announcer line — those are ALL discarded
// per the project rule. Only self-contained, non-named heroic lines are wired. 98 clips → 11 wired.
//
// Consumed by supermanVoice.pickSupermanVoice(pool, "superman_classic"). Base Superman + the other
// still-generic variants are UNAFFECTED (they keep the Injustice-2 SUPERMAN_VOICE pool).
// ---------------------------------------------------------------------------

export const SUPERMAN_MVS_VOICE = {
  intro: [
    "superman_mvs_031.mp3",   // "Some days I worry that I'm not doing enough."
    "superman_mvs_040.mp3",   // "We might be living in some strange times."
    "superman_mvs_008.mp3",   // "You can count on me. I won't let you down. Let's all fight fair."
  ],
  taunt: [
    "superman_mvs_044.mp3",   // "Try me."
    "superman_mvs_055.mp3",   // "I am taking you down. Had enough?"
    "superman_mvs_051.mp3",   // "I'll show you real power."
    "superman_mvs_052.mp3",   // "But I pity you. I'm ready when you are."
    "superman_mvs_053.mp3",   // "If you've got the guts, that is."
  ],
  lowHealth: [
    "superman_mvs_078.mp3",   // "Now I'm mad. Let's try again — the gloves are off now."
  ],
  win: [
    "superman_mvs_098.mp3",   // "Proud of you all. Glad it was a good, clean fight."
    "superman_mvs_096.mp3",   // "Just gotta believe in yourselves. Just keep trying."
  ],
}
