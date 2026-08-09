// ghostfaceVoice.js
// ---------------------------------------------------------------------------
// Ghostface voice-line pools (audio-only; NO gameplay effect). English audio
// (ghostface_* — MK1 rip). Every entry is an on-disk mp3 filename (exact case).
// Curated from GHOSTFACE_VOICE_LOG.md (55 kept of 338; the rest = SFX / named-
// character intros / fragments / near-dupes).
//
// pickGhostfaceVoice(pool) returns ONE clip at random — same shared-helper shape
// as pickChrolloVoice / pickGonVoice. Callers play via sound.playSfxFile(clip, null).
//
// ── TRIGGER MAP (where each pool fires) ──
//   intro        → game.js INTRO_VOICE (round-1 match intro; no taunt action → intro-only, Chrollo precedent)
//   taunt        → combat.js applyGhostfaceOffenseVoice (~30% of connects — "taunt rides offense-connect")
//   specialCast  → abilities.executeGhostfaceSpecial (knife specials) + executeGhostfaceUltimate
//   combatBark   → combat.js applyGhostfaceOffenseVoice (~70% of heavy/long-string connects)
//   hitReact     → combat.js applyGhostfaceHitVoice (taking an unblocked hit)
//   lowHealth    → combat.js applyGhostfaceLowHealthVoice (once, crossing the ≤25% line)
//   win          → game.js _checkMatchOver (winner = Ghostface)
//
// NOTE: the Backstage-Pass SWAP / fakeout branch is NOT voiced here — that's the
// Kameo companion transform (it uses the companion's own voice), so a Ghostface
// specialCast bark only fires on his knife specials + The Final Act ultimate.
// ---------------------------------------------------------------------------

export const GHOSTFACE_VOICE = {
  // ── INTRO — pre-fight openers ──
  intro: [
    "ghostface_049_t02m04_8s.mp3",   // "What's your favorite scary movie?"
    "ghostface_007_t00m18_7s.mp3",   // "Don't you watch scary movies?"
    "ghostface_037_t01m27_1s.mp3",   // "Are you watching?"
    "ghostface_036_t01m25_2s.mp3",   // "This is my movie!"
    "ghostface_025_t00m59_7s.mp3",   // "It's a simple game."
    "ghostface_180_t09m02_8s.mp3",   // "Yeah, be afraid. Be very afraid."
    "ghostface_132_t06m40_1s.mp3",   // "Fine. No small talk. It's straight to the violence."
    "ghostface_012_t00m32_4s.mp3",   // "Did you miss me?"
    "ghostface_010_t00m26_2s.mp3",   // "Do you want to die tonight?"
  ],

  // ── TAUNT — mid-fight jeers (rides ~30% of offense connects) ──
  taunt: [
    "ghostface_028_t01m06_4s.mp3",   // "Better start running!"
    "ghostface_201_t09m58_6s.mp3",   // "Afraid of a little jump scare?"
    "ghostface_013_t00m34_3s.mp3",   // "You're too weak for this franchise."
    "ghostface_187_t09m23_6s.mp3",   // "Quit stealing my lines!"
    "ghostface_126_t06m18_3s.mp3",   // "You auditioning to wear this mask next?"
    "ghostface_029_t01m09_5s.mp3",   // "Cut the crap!"
    "ghostface_168_t08m24_5s.mp3",   // "If you could see my smile, you'd know that's bullshit."
    "ghostface_179_t08m59_1s.mp3",   // "Go ahead — give it your best shot!"
  ],

  // ── SPECIAL-CAST — technique/attack callouts (knife specials + ultimate) ──
  //    Contains the flagged move-name callouts (see GHOSTFACE_VOICE_LOG.md Step 3);
  //    reserve specific lines per move once the moveset expands.
  specialCast: [
    "ghostface_155_t07m46_6s.mp3",   // "STAB!"
    "ghostface_038_t01m29_1s.mp3",   // "I'll gut you!"
    "ghostface_022_t00m53_5s.mp3",   // "Kill, kill, kill!"
    "ghostface_129_t06m28_1s.mp3",   // "How about the knife? It's gonna rip through your flesh!"
    "ghostface_163_t08m09_6s.mp3",   // "Who needs a knife? I'm already under your skin."
    "ghostface_040_t01m33_3s.mp3",   // "Cut flesh, scrape bone."
    "ghostface_084_t03m54_5s.mp3",   // "Got time for a little hack-and-slash."
    "ghostface_093_t04m23_9s.mp3",   // "You want to see magic? I'm a wizard with a knife!"
    "ghostface_042_t01m39_5s.mp3",   // "So many ways to kill!"
  ],

  // ── COMBAT BARK — on landing a hit / offense (rides ~70% of heavy/long-string connects) ──
  combatBark: [
    "ghostface_039_t01m31_2s.mp3",   // "So much fun!"
    "ghostface_085_t03m57_7s.mp3",   // "This is gonna be my most epic kill ever."
    "ghostface_031_t01m13_2s.mp3",   // "That was overdue."
    "ghostface_136_t06m52_5s.mp3",   // "Looks like I struck a nerve."
    "ghostface_167_t08m20_8s.mp3",   // "It's about to be drenched in your blood."
    "ghostface_046_t01m54_7s.mp3",   // "I'm gonna rip you up from the inside out."
    "ghostface_118_t05m48_1s.mp3",   // "I'm gonna crack you open like a crab!"
    "ghostface_174_t08m41_0s.mp3",   // "Death by a thousand cuts."
  ],

  // ── HIT-REACT — taking a hit ──
  hitReact: [
    "ghostface_004_t00m09_6s.mp3",   // "Where'd you learn to punch like that?"
    "ghostface_019_t00m48_3s.mp3",   // "Now that's scary."
    "ghostface_018_t00m46_3s.mp3",   // "Feeling woozy."
    "ghostface_114_t05m36_8s.mp3",   // "Did your blood run cold?"
  ],

  // ── LOW-HEALTH — hurt but still fighting (once, crossing the ≤25% line) ──
  lowHealth: [
    "ghostface_195_t09m43_8s.mp3",   // "I'll survive. I always do."
    "ghostface_197_t09m48_1s.mp3",   // "We're only in the first reel."
    "ghostface_151_t07m34_1s.mp3",   // "You'll have to kill me to find out."
    "ghostface_175_t08m44_7s.mp3",   // "Even if you kill me, I'll be back for the sequel."
    "ghostface_206_t10m10_4s.mp3",   // "This story's plot isn't done twisting!"
  ],

  // ── WIN — victory ──
  win: [
    "ghostface_026_t01m02_1s.mp3",   // "Now you lose."
    "ghostface_030_t01m10_9s.mp3",   // "You won't get a sequel!"
    "ghostface_032_t01m15_2s.mp3",   // "Guess you had a death wish."
    "ghostface_058_t02m40_0s.mp3",   // "You're dead already."
    "ghostface_001_t00m01_4s.mp3",   // "See you soon!"
    "ghostface_125_t06m14_5s.mp3",   // "The sequel's already greenlit."
    "ghostface_016_t00m41_8s.mp3",   // "You're dying."
    "ghostface_113_t05m34_2s.mp3",   // "Time to put you on a slab!"
    "ghostface_002_t00m04_4s.mp3",   // "We're not finished yet!"
  ],
}

export function pickGhostfaceVoice(pool) {
  const arr = GHOSTFACE_VOICE[pool]
  if (!Array.isArray(arr) || arr.length === 0) return null
  return arr[Math.floor(Math.random() * arr.length)]
}
