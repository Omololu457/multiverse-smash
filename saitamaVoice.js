// saitamaVoice.js
// ---------------------------------------------------------------------------
// Saitama (One Punch Man) voice-line pools (audio-only; NO gameplay effect). 18 provided clips: 5 were
// CONTENT-IDENTIFIED via offline speech recognition (★, mapped to the trigger the phrase names), the other
// 13 are UNIDENTIFIED short battle barks used as a RANDOMIZED hit-reaction pool (mapped by TRIGGER, not
// content — they're generic combat exclamations). Filenames are the provided originals, PRESERVED EXACTLY.
// pickSaitamaVoice(pool) → ONE clip at random; callers play it via sound.playSfxFile(clip, null), the same
// pattern as hiruzenVoice.js / jasonVoice.js. NO combat logic is touched by this module.
//
// ── TRIGGER MAP (hooks in game.js / abilities.js / combat.js) ──
//   intro       → pre-match intro beat                                    game.js INTRO_VOICE table
//   bargain     → "Today Is Bargain Sale" special cast (Up+Special)       abilities.fireSaitamaAttackSpecial
//   punchCombo  → tiered punch-combo TAP tier (neutral-Special release)   abilities.fireSaitamaPunchCombo
//   ultimate    → "Death Punch" ultimate activation (U)                   abilities.executeSaitamaUltimate
//   win         → victory                                                  game.js win dispatch
//   hitLight    → Saitama takes a LIGHT (non-strong) hit — 13-bark pool   combat.applySaitamaHitVoice
//
// ── DELIBERATE OPEN GAPS (left UNMAPPED — no correct-content clip exists; do not force-fit) ──
//   taunt · heavy hit-reaction · knockdown · namecall
//
// ── "finishing move" clip DECISION: mapped to the ULTIMATE (Death Punch), NOT Serious Punch. Rationale:
//   the ult is the game's climactic once-per-meter finisher, so a "my finishing move" callout reads best
//   there; Serious Punch is a frequently-cast cost-45 special (cheap to spam) and a signature line would
//   wear out. Serious Punch is therefore left VOICELESS (an accepted gap). Flip the single `ultimate`
//   entry into a new `serious` pool + a fireSaitamaSeriousPunch hook to move it if preferred.
// ---------------------------------------------------------------------------

export const SAITAMA_VOICE = {
  // ── INTRO / pre-match — his defining creed. ★content ("I'm a hero for fun"). ──
  intro: [
    "saitama_hero_for_fun_061.1s.mp3",     // "I'm just a hero for fun." ★ (hero-for-fun creed)
  ],
  // ── TODAY IS BARGAIN SALE — Up+Special cast. ★content (names the move). ──
  bargain: [
    "saitama_bargain_sale_042.2s.mp3",     // "Today is a bargain sale!" ★ (the special's own callout)
  ],
  // ── PUNCH-COMBO (TAP tier) — neutral-Special flurry. ★content (normal-punches line). ──
  punchCombo: [
    "saitama_normal_punches_096.0s.mp3",   // "Normal punches!" (his consecutive-punch flurry) ★
  ],
  // ── ULTIMATE — Death Punch activation. ★content ("finishing move"). See DECISION note above. ──
  ultimate: [
    "saitama_finishing_move_066.9s.mp3",   // "…my finishing move!" ★ (mapped to the ult, not Serious Punch)
  ],
  // ── WIN — victory line. ★content ("counting on you" — confident sign-off; no mid-match slot on this roster). ──
  win: [
    "saitama_counting_on_you_155.1s.mp3",  // "I'm counting on you." ★ (confident victory sign-off)
  ],
  // ── HIT REACTION (light) — 13 UNIDENTIFIED short barks, randomized. Content unknown → generic combat
  //    exclamations; mapped by trigger only (same random-pick approach as other frequently-repeated slots). ──
  hitLight: [
    "saitama_bark_01_0150.0s.mp3", "saitama_bark_02_0156.7s.mp3", "saitama_bark_03_0162.8s.mp3",
    "saitama_bark_04_0168.8s.mp3", "saitama_bark_05_0174.5s.mp3", "saitama_bark_06_0180.2s.mp3",
    "saitama_bark_07_0185.7s.mp3", "saitama_bark_08_0190.6s.mp3", "saitama_bark_09_0196.8s.mp3",
    "saitama_bark_10_0201.6s.mp3", "saitama_bark_11_0206.3s.mp3", "saitama_bark_12_0216.1s.mp3",
    "saitama_bark_13_0223.1s.mp3",
  ],
}

export function pickSaitamaVoice(pool) {
  const arr = SAITAMA_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
