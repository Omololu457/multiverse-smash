// musicPersonality.js
// ─────────────────────────────────────────────────────────────────────────────
// TRAIT → MUSIC mapping + trait-informed selection.
//
// Groups the player's background-song collection by Big-Five personality type and
// ranks/suggests tracks against a player's TRACKED trait profile (from
// personality.js). "Trait-informed selection": a player whose behaviour reads as
// high-Extraversion gets steered toward hype/party tracks; a high-Neuroticism read
// gets moody/introspective ones; etc.
//
// ── HOW THE MAPPING WAS MADE (heuristic rubric, not ground truth) ────────────
// Each song carries an AFFINITY per trait in roughly [-1, 1]: "a player HIGH in
// this trait tends to gravitate toward this song." Positive = draws them in,
// negative = steers them away. Assigned by mood/genre:
//   O (Openness)          experimental / atmospheric / foreign-language / genre-
//                         bending / instrumental / artsy / dreamy
//   C (Conscientiousness) uplifting / motivational / positive / disciplined / gospel
//   E (Extraversion)      high-energy / party / club / hype / danceable / bold /
//                         confident / aggressive-dominant
//   A (Agreeableness)     warm / romantic / tender / smooth R&B  (violent-dominance
//                         tracks get a small NEGATIVE A — steers warm players away)
//   N (Neuroticism)       moody / melancholic / sad / introspective / slowed+reverb
// These are deliberately coarse and subjective — treat them as a tunable starting
// point, exactly like the behavioural mapping in personality.js. Keyed by EXACT
// on-disk filename so a chosen song can actually be played.
// ─────────────────────────────────────────────────────────────────────────────

import * as personality from "./personality.js"

export const TRAITS = ["O", "C", "E", "A", "N"]

// [file, {trait affinities}] — omitted traits are 0. File names are exact (case +
// punctuation sensitive) so they resolve on disk.
export const SONG_CATALOG = [
  ["20 Min.mp3",                                                              { N: 0.7, A: 0.4 }],
  ["9AM in Calabasas - Playboi Carti.mp3",                                    { E: 0.8, O: 0.4 }],
  ["All I Need (Sped Up).mp3",                                                 { A: 0.6, E: 0.4 }],
  ["Almeda.mp3",                                                              { O: 0.8, A: 0.4 }],
  ["Amaarae - SAD GIRLZ LUV MONEY Remix ft Kali Uchis (Lyric Video).mp3",      { O: 0.7, E: 0.6 }],
  ["At The Club.mp3",                                                         { E: 0.9 }],
  ["BACKR00MS FT TRAVIS SCOTT SEXISDEATH INDIANA420BITCH.mp3",                 { E: 0.7, O: 0.6 }],
  ["Baby Keem - lost souls (Brent Faiyaz Only) Best Version.mp3",             { N: 0.7, O: 0.4 }],
  ["Big Boogie - My Lil Sht (with 187 Cash) (Official Audio).mp3",            { E: 0.7 }],
  ["Blue Dream.mp3",                                                         { O: 0.5, N: 0.4 }],
  ["Boo'd Up.mp3",                                                            { A: 0.9 }],
  ["Brent Faiyaz - All Mine (Slowed Down To Perfection).mp3",                 { N: 0.8, A: 0.4 }],
  ["Brent Faiyaz - ROLE MODEL [Official Audio].mp3",                          { N: 0.6, A: 0.4 }],
  ["Brent Faiyaz - Wish You Well (Full Version).mp3",                         { N: 0.7, A: 0.4 }],
  ["Bryson Tiller - Don't (Explicit Version).mp3",                            { N: 0.6, A: 0.5 }],
  ["Camila Cabello - Havana (Audio) ft. Young Thug.mp3",                      { E: 0.8, A: 0.4 }],
  ["Chris Brown - No Guidance (Audio) ft. Drake.mp3",                         { A: 0.7, E: 0.5 }],
  ["Chris Brown - Under The Influence (Audio).mp3",                           { E: 0.7, A: 0.5 }],
  ["Chérie  23  (Sloweddd).mp3",                                              { N: 0.7, A: 0.5 }],
  ["Cochise - Hatchback (Official Video).mp3",                                { E: 0.8, O: 0.4 }],
  ["Cochise - Knicks (Official Video).mp3",                                   { E: 0.8, O: 0.4 }],
  ["Crystal Waters - Gypsy Woman [sped up].mp3",                              { E: 0.7, O: 0.5 }],
  ["DaBaby x Stunna 4 Vegas - No Dribble.mp3",                                { E: 0.9 }],
  ["Doja Cat - Gorgeous (Lyrics).mp3",                                        { E: 0.6, A: 0.4 }],
  ["Drake & Playboi Carti - Pain 1993 V1 (AI REMASTER).mp3",                  { N: 0.7, E: 0.4 }],
  ["Drake - IDGAF (Audio) ft. Yeat.mp3",                                      { E: 0.7, O: 0.4 }],
  ["Ella Mai - Trip (Audio).mp3",                                             { A: 0.8, N: 0.3 }],
  ["Freek-A-Leek Remix (feat. Twista and Jermaine Dupri).mp3",               { E: 0.9 }],
  ["Future - Life Is Good (Official Music Video) ft. Drake.mp3",              { E: 0.8 }],
  ["Future - Mask Off (Official Music Video).mp3",                            { E: 0.7, O: 0.4 }],
  ["Future - Solo (Official Audio).mp3",                                      { N: 0.6, E: 0.4 }],
  ["Gang Over Luv.mp3",                                                       { N: 0.6, A: 0.4 }],
  ["Gangsta Love.mp3",                                                        { A: 0.6, E: 0.4 }],
  ["Glokk40Spaz - Remember Me (Jhene Aiko Stranger Remix) (1).mp3",           { N: 0.7, E: 0.4 }],
  ["Glokk40Spaz - Remember Me (Jhene Aiko Stranger Remix).mp3",               { N: 0.7, E: 0.4 }],
  ["Glokk40Spaz - Turbo.mp3",                                                 { E: 0.8 }],
  ["Glokk40spaz - Backdoor (Official Audio).mp3",                             { E: 0.8 }],
  ["Heartburn x No Role Modelz (slowed & reverb).mp3",                        { N: 0.8 }],
  ["It Seems Like You're Ready - R. Kelly (sped up  pitched).mp3",            { A: 0.7 }],
  ["Jace! - Goose Creek (OFFICIAL VIDEO) [Shot By_ @Jmoney1041 Edit By_ @jacepowers ].mp3", { E: 0.7 }],
  ["Jhené Aiko - Sativa ft. Swae Lee (Official Audio).mp3",                   { A: 0.6, O: 0.5, N: 0.3 }],
  ["Jhené Aiko - stranger (Audio).mp3",                                       { N: 0.7, A: 0.4 }],
  ["Katy Perry - Harleys In Hawaii (Lyrics) You and I, Ridin' Harleys in Hawaii-i-i.mp3", { E: 0.6, A: 0.5, O: 0.4 }],
  ["King Von - Crazy Story (Official Music Video).mp3",                       { E: 0.8, A: -0.4 }],
  ["King Von - Crazy Story, Pt. 3 (Official Video).mp3",                      { E: 0.8, A: -0.4 }],
  ["King Von - Gleesh Place (Official Video).mp3",                            { E: 0.8, A: -0.4 }],
  ["King Von - Took Her To The O (Official Video).mp3",                       { E: 0.8, A: -0.4 }],
  ["Kirk Franklin - I Smile (Official Video).mp3",                            { C: 0.8, A: 0.6, N: -0.5 }],
  ["LUCKI - 2021 Vibes (Official Video).mp3",                                 { N: 0.7, O: 0.5 }],
  ["LUCKI - Leave Her (Official Audio).mp3",                                  { N: 0.7, O: 0.4 }],
  ["Lil Uzi Vert - New Patek [Official Audio].mp3",                           { E: 0.8, O: 0.4 }],
  ["Lil Yachty - Oprah's Bank Account (Lyrics) ft. DaBaby & Drake.mp3",       { E: 0.7 }],
  ["Luv Punnani (1).mp3",                                                     { E: 0.6, A: 0.4 }],
  ["Luv Punnani.mp3",                                                         { E: 0.6, A: 0.4 }],
  ["Luxurious.mp3",                                                           { E: 0.6, A: 0.4 }],
  ["Metro Boomin, Don Toliver, Future - Too Many Nights (Official Video).mp3", { E: 0.6, O: 0.5, N: 0.3 }],
  ["Midas The Jagaban - Party With A Jagaban (Lyrics).mp3",                   { E: 0.9, O: 0.4 }],
  ["My Body.mp3",                                                             { A: 0.6, E: 0.4 }],
  ["NBA YoungBoy - BossManeDlow (TOP MIX).mp3",                               { E: 0.7, N: 0.3 }],
  ["NBA YoungBoy - Vette Motors.mp3",                                         { E: 0.7 }],
  ["NBA Youngboy - 4 Sons of a King (Official Audio).mp3",                    { N: 0.6, A: 0.4 }],
  ["NBA Youngboy - Fish Scale.mp3",                                           { E: 0.7, A: -0.3 }],
  ["NLE Choppa  - Mmm Hmm (Official Music Video).mp3",                        { E: 0.8 }],
  ["Nardo Wick - Who Want Smoke__ ft. Lil Durk, 21 Savage & G Herbo (Official Music Video) (1).mp3", { E: 0.8, A: -0.5 }],
  ["Nardo Wick - Who Want Smoke__ ft. Lil Durk, 21 Savage & G Herbo (Official Music Video).mp3",     { E: 0.8, A: -0.5 }],
  ["Nine Vicious - Trevon O'Ryan Echols.mp3",                                 { O: 0.5, N: 0.4 }],
  ["No Savage - Dedication ( Official Video ) Dir. @Waxbando.mp3",            { E: 0.6, N: 0.4 }],
  ["One Dance (feat. WizKid & Kyla) - Drake (Official Audio).mp3",            { E: 0.7, A: 0.5, C: 0.3 }],
  ["One More Chance  Stay with Me (Remix) (2007 Remaster).mp3",               { A: 0.6, E: 0.5, O: 0.4 }],
  ["PAIN 1993 [OG]  SLOWED & REVERB.mp3",                                     { N: 0.9, O: 0.4 }],
  ["PELIGROSA.mp3",                                                           { E: 0.8, A: 0.4 }],
  ["PinkPantheress - I must apologise (Extended).mp3",                        { O: 0.8, N: 0.4 }],
  ["Playboi Carti - Sky [Official Video].mp3",                                { O: 0.7, E: 0.4 }],
  ["Rema - dumebi (sped up).mp3",                                             { E: 0.7, A: 0.4, O: 0.3 }],
  ["SZA - Broken Clocks (Official Audio).mp3",                                { N: 0.6, A: 0.5, O: 0.4 }],
  ["SZA - Shirt (Audio).mp3",                                                 { N: 0.6, A: 0.4 }],
  ["Sheck Wes - WESPN (Official Audio).mp3",                                  { E: 0.8, A: -0.3 }],
  ["Shiloh Dynasty - So low.mp3",                                             { N: 0.9, O: 0.4 }],
  ["Stay Schemin.mp3",                                                        { E: 0.7, A: -0.3 }],
  ["Stereo Love (Remastered Version).mp3",                                    { E: 0.7, O: 0.5 }],
  ["Steve Lacy - N Side (Official Audio).mp3",                                { O: 0.8, A: 0.4 }],
  ["Summer Walker - Girls Need Love (Audio).mp3",                             { A: 0.7, N: 0.4 }],
  ["Taeko Ōnuki (大貫妙子) - Tokai (都会) [Lyrics EngRomKan].mp3",              { O: 0.9, C: 0.3 }],
  ["Tek It.mp3",                                                              { O: 0.7, N: 0.4 }],
  ["Vicetone - Nevada (ft. Cozi Zuehlsdorff).mp3",                            { E: 0.7, O: 0.5, C: 0.3 }],
  ["Wine & Dine.mp3",                                                         { A: 0.7 }],
  ["Wisdom - Kickback (Official Music Video).mp3",                            { C: 0.6, A: 0.5, E: 0.4 }],
  ["Young Thug & Gunna - Ski [Official Video]  Young Stoner Life.mp3",         { E: 0.8, O: 0.4 }],
  ["Young Thug - I'm Scared ft. 21 Savage & Doeboy (Official Audio).mp3",     { N: 0.5, E: 0.5 }],
  ["Young Thug - Surf ft. Gunna [Official Video].mp3",                        { E: 0.7, A: 0.4 }],
  ["YoungBoy Never Broke Again - 1.5 [Official Audio].mp3",                   { E: 0.6, N: 0.4 }],
  ["YoungBoy Never Broke Again - Nevada [Official Audio].mp3",                { N: 0.6, E: 0.4 }],
  ["Zero IQ Freestyle.mp3",                                                   { E: 0.7 }],
  ["baby you're worth it.mp3",                                                { A: 0.8 }],
  ["don't need a lot (slowed).mp3",                                           { N: 0.7, A: 0.4 }],
  ["j. cole  no role modelz ﾉ slowed  reverb ﾉ.mp3",                          { N: 0.8 }],
  ["megan thee stallion  big ole freak [slowed  pitched] [daycore].mp3",      { E: 0.7, A: -0.2 }],
  ["no idea x body party (sped up).mp3",                                      { A: 0.6, E: 0.5 }],
  ["pain 1993 og carti verse.mp3",                                            { N: 0.7, E: 0.4 }],
  ["playboi carti - backr00ms but its in the actual backrooms.mp3",          { O: 0.8, E: 0.3 }],
  ["stereo love but its slowed to perfection.mp3",                           { N: 0.7, O: 0.5 }],
  ["情绪回收站 (治愈纯音乐版).mp3",                                              { O: 0.8, C: 0.4, N: -0.3 }],
  ["眠れぬ都会 (Sleepless City).mp3",                                          { O: 0.9, N: 0.4 }]
]

// Fast lookup: file → affinity map.
const AFFINITY_BY_FILE = new Map(SONG_CATALOG.map(([f, t]) => [f, t]))

export function getSongFiles() { return SONG_CATALOG.map(([f]) => f) }
export function getAffinity(file) { return AFFINITY_BY_FILE.get(file) || null }

// ── GROUPING (the "group songs by personality type" deliverable) ─────────────
// A song belongs to a trait's group when that trait is its strongest POSITIVE
// affinity. Ties keep the first trait encountered. Returns filenames.
export function songsForTrait(trait) {
  const out = []
  for (const [file, aff] of SONG_CATALOG) {
    let best = null, bestVal = 0
    for (const t of TRAITS) { const v = aff[t] || 0; if (v > bestVal) { bestVal = v; best = t } }
    if (best === trait) out.push(file)
  }
  return out
}

// Full grouping: { O:[...files], C:[...], E:[...], A:[...], N:[...] }.
export function groupByTrait() {
  const groups = { O: [], C: [], E: [], A: [], N: [] }
  for (const t of TRAITS) groups[t] = songsForTrait(t)
  return groups
}

// ── TRAIT-INFORMED SELECTION ─────────────────────────────────────────────────
// Confidence-gated per the personality doc §7: a trait only steers selection once
// the model is reasonably sure of it. Below the gate a trait contributes little;
// if NO trait clears the gate, we DON'T personalize on a half-formed estimate —
// the caller falls back to the default order (see buildPersonalizedPlaylist).
const CONF_GATE_PCT = 50      // doc §7: gate downstream logic on confidence, not just mu
const NEUTRAL_MU = 4.0        // 1-7 midpoint
const MU_SPAN = 3.0           // 4 → 7 is +1.0 elevation

// Normalize a profile into { trait: {elevation:-1..1, weight:0..1} }.
// Accepts either personality.summarize() shape ({O:{mu,confidence}}) or a plain
// {O:mu,...} map (weights default to 1 when no confidence is supplied).
function normalizeProfile(profile) {
  const out = {}
  for (const t of TRAITS) {
    const raw = profile?.[t]
    let mu = NEUTRAL_MU, conf = null
    if (raw && typeof raw === "object") { mu = Number(raw.mu ?? NEUTRAL_MU); conf = Number(raw.confidence ?? NaN) }
    else if (typeof raw === "number")   { mu = raw }
    const elevation = Math.max(-1, Math.min(1, (mu - NEUTRAL_MU) / MU_SPAN))
    // Confidence → weight: 0 below a small floor, ramping to 1 at the gate, capped at 1.
    const weight = Number.isFinite(conf) ? Math.max(0, Math.min(1, conf / CONF_GATE_PCT)) : 1
    out[t] = { elevation, weight }
  }
  return out
}

// True when at least one trait is BOTH confident enough AND meaningfully off-neutral
// — i.e. there is a real signal worth personalizing on.
export function hasActionableSignal(profile) {
  const p = normalizeProfile(profile)
  return TRAITS.some(t => p[t].weight >= 1 && Math.abs(p[t].elevation) >= 0.1)
}

// Score one song against a normalized profile: Σ affinity[t] · elevation[t] · weight[t].
function scoreSong(aff, np) {
  let s = 0
  for (const t of TRAITS) s += (aff[t] || 0) * np[t].elevation * np[t].weight
  return s
}

// Rank the whole catalog for a profile, best match first. Returns
// [{ file, score, affinity }]. Stable: equal scores keep catalog order.
export function rankSongsForProfile(profile) {
  const np = normalizeProfile(profile)
  return SONG_CATALOG
    .map(([file, aff], i) => ({ file, affinity: aff, score: scoreSong(aff, np), _i: i }))
    .sort((a, b) => (b.score - a.score) || (a._i - b._i))
    .map(({ _i, ...rest }) => rest)
}

// The player-facing result: a personalized ORDER of filenames. If there's no
// actionable signal (early game / low confidence), returns the default catalog
// order rather than a noisy personalization (doc §7 fallback). `n` optionally caps
// the length.
export function buildPersonalizedPlaylist(profile, n = 0) {
  const files = hasActionableSignal(profile)
    ? rankSongsForProfile(profile).map(r => r.file)
    : getSongFiles()
  return n > 0 ? files.slice(0, n) : files
}

// ── INTEGRATION with personality.js (the tracked player profile) ─────────────
// Read the current account's tracked Big-Five profile and produce a personalized
// menu order over the song catalog. `personalized` reports whether real behaviour
// actually drove it (vs the neutral fallback), so callers/UI can be honest about it.
export function getPersonalizedMenuOrder(account, n = 0) {
  let summary = null
  try {
    const p = personality.getPersonality(account)
    if (p) summary = personality.summarize(p.traits)
  } catch (_) {}
  const personalized = !!summary && hasActionableSignal(summary)
  return { files: buildPersonalizedPlaylist(summary || {}, n), personalized, profile: summary }
}
