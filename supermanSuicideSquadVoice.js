// supermanSuicideSquadVoice.js
// ---------------------------------------------------------------------------
// Superman voice pack #3 — Suicide Squad: Kill the Justice League rip (audio-only; NO gameplay
// effect). Assigned to the "Superman (New 52)" variant (rosterKey "superman_new52") to give it a
// voice DISTINCT from base Superman AND from the MultiVersus/Classic pack. TONE FIT: in SSKTJL
// Superman is BRAINWASHED by Brainiac into a lethal antagonist — cold, menacing, contemptuous
// ("Snuffed out." / "Your death is inevitable." / "I won't make it painless."). New 52 is the
// edgiest, most aggressive Superman variant, so it carries the corrupted/menacing pack best
// (deliberate pairing — see Stage 5 report / VOICE routing).
//
// Source = 216 clips ("superman_ssqk_*.mp3", English). Every clip TRANSCRIBED (faster-whisper base)
// — see SUPERMAN_SUICIDESQUAD_VOICE_LOG.md. REALITY OF THE PACK: the rip mixes menacing villain
// lines with pre-corruption/heroic flashback lines and squad-named dialogue (Boomerang / Harley /
// the League / Brainiac). To keep the variant's identity SHARP the wiring favours the distinct
// menacing lines and discards the wholesome/named ones (they'd sound like base Superman). 216 → 12 wired.
//
// Consumed by supermanVoice.pickSupermanVoice(pool, "superman_new52"). Base Superman + the other
// still-generic variants are UNAFFECTED (they keep the Injustice-2 SUPERMAN_VOICE pool).
// ---------------------------------------------------------------------------

export const SUPERMAN_SSQK_VOICE = {
  intro: [
    "superman_ssqk_155.mp3",   // "My world was dying."
    "superman_ssqk_052.mp3",   // "I won't make it painless."
  ],
  taunt: [
    "superman_ssqk_004.mp3",   // "Snuffed out."
    "superman_ssqk_057.mp3",   // "He wants you to die."
    "superman_ssqk_036.mp3",   // "It's exhilarating."
    "superman_ssqk_043.mp3",   // "But sleeping on the job?"
    "superman_ssqk_176.mp3",   // "You're no good to us unconscious."
  ],
  lowHealth: [
    "superman_ssqk_070.mp3",   // "I'm hurt."
  ],
  win: [
    "superman_ssqk_100.mp3",   // "Your death is inevitable."
    "superman_ssqk_073.mp3",   // "No one will remember you."
  ],
}
