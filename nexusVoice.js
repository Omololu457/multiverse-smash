// nexusVoice.js — Story Mode cutscene TTS voice mapping, shared by the GENERATOR (tools/gen_nexus_voice.mjs,
// which runs macOS `say`) and the ENGINE (game.js, which plays the clip when a beat displays).
//
// Clips are named by a STABLE CONTENT HASH of speaker+text, so the audio file for a line is the same
// regardless of the line's position in the scene (reordering/inserting beats never desyncs the audio).
// Audio is macOS's built-in `say` (free, offline, no API key) — functional but robotic; see the report note.

// A distinct `say` voice per speaking character (male/female/accent variety so they don't all sound alike).
export const VOICE_BY_SPEAKER = {
  "":                "Daniel",   // narration — calm GB narrator
  "OMOLOLU":         "Rocko",    // protagonist (US)
  "OMOLOLU (V.O.)":  "Rocko",    // same character, voiceover
  "RICK PRIME":      "Fred",     // cold villain — robotic
  "GENOS":           "Albert",   // cyborg — synthetic
  "ICHIGO":          "Ralph",    // gruff, deep
  "OBITO":           "Reed",     // masked, measured
  "GOJO":            "Aman",     // cocky (IN accent)
  "SUKUNA":          "Grandpa",  // ancient cursed king
  "TOJI":            "Eddy",     // mercenary
  "BEERUS":          "Rishi",    // playful god (IN accent)
  "VEGETA":          "Junior",   // arrogant prince
  "SAITAMA":         "Sandy",    // deadpan
  "FRIEZA":          "Shelley",  // refined, androgynous menace
  "DEATHSTROKE":     "Kathy",    // distinct
}
export const FALLBACK_VOICE = "Samantha"

export function voiceForSpeaker(speaker) {
  return VOICE_BY_SPEAKER[speaker ?? ""] || FALLBACK_VOICE
}

// djb2 — tiny deterministic string hash; identical in Node and the browser.
function _hash(str) {
  let h = 5381
  for (let i = 0; i < str.length; i++) h = (((h << 5) + h) + str.charCodeAt(i)) >>> 0
  return h.toString(36)
}

// The audio filename for a beat's line (relative to the nexus_voice/ dir). null if the beat has no text.
export function voiceClipName(speaker, text) {
  if (!text) return null
  return "line_" + _hash((speaker ?? "") + "|" + text) + ".m4a"
}

export const NEXUS_VOICE_DIR = "nexus_voice"
