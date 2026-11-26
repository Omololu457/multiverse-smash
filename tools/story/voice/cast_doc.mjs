// tools/story/voice/cast_doc.mjs — writes docs/msv1/story/VOICE.md (the voice cast table) from tools/story/voice/cast.json.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { STORY } from "../../../data/story/storyData.js"
import { STORY_VOICE } from "../../../data/story/voiceManifest.js"
const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, "../../..")
const cast = JSON.parse(fs.readFileSync(path.join(HERE, "cast.json"), "utf8"))
const name = k => k === "narrator" ? "Narrator" : STORY.fighters[k]?.name || k
const clips = k => (STORY_VOICE[k] || []).length
const total = Object.values(STORY_VOICE).reduce((a, v) => a + v.length, 0)
const rows = Object.keys(cast).sort((a, b) => (STORY.franchise[a] || "").localeCompare(STORY.franchise[b] || "") || a.localeCompare(b)).map(k => {
  const c = cast[k], fx = [c.st ? `${c.st > 0 ? "+" : ""}${c.st} st` : "", c.fx || ""].filter(Boolean).join(", ")
  return `| ${name(k)} (\`${k}\`) | ${STORY.franchise[k] || "—"} | ${c.base === k ? `#${c.speaker}` : `same as ${name(c.base)}`} | ${c.f0} Hz | ${c.g} · ${c.band} · ${c.en} · ${c.pace} | ${fx || "—"} | ${clips(k)} |`
})
fs.writeFileSync(path.join(ROOT, "docs/msv1/story/VOICE.md"), `# MSV1-STORY — spoken voices

Every spoken story line has an AI voice clip: **${total} clips** for **${Object.keys(STORY_VOICE).length} voices**, in \`story_voice/<voice>/<id>.m4a\` (AAC mono 32 kb/s).

**Engine.** [Piper](https://github.com/OHF-Voice/piper1-gpl) neural TTS, model \`en_US-libritts_r-medium\`: 904 speakers, trained on LibriTTS-R (CC BY 4.0).
- Free and offline: no account or API key, and the script never left this machine.
- The attribution is in the in-game credits (Audio — Voice & SFX).

**Casting, not cloning.** No real actor's voice was copied. Each character has a casting sheet in \`tools/story/voice/casting.json\`:
- gender, pitch band, temperament and pace;
- optional pitch shift and effect (god-echo, voice changer, robot…).

How a speaker is picked:
- Every one of the 904 speakers was measured (\`profile_speakers.py\`: median pitch, pitch movement, speed).
- Each character gets the **unused** speaker that best fits its sheet, so no two characters share a voice.
- Variants of one person (both Gojos, the three Sukunas, the Sasukes, the Kakashis…) share their voice, with a small age/mood shift.

**What is spoken.**
- Spoken: every speaker line, narration (by the Narrator), and the half-health / second-map captions.
- Template lines are spoken by whichever fighter of that franchise is in the bout, so they have one clip per possible speaker.
- \`[Telepathy]\` is spoken without its label, with an echo.
- Not spoken: \`[stage directions]\`, silent fighters (Nezuko, Jason, Krybot) and unsigned rift-display lines.

**In game.**
- One story-voice channel: a new line, Skip Scene, or the fight starting cuts the previous line.
- It ducks the music and follows the SFX volume / mute.
- **VOICE: ON/OFF** is on the story menu.

**Recasting.** Edit \`casting.json\`, then run \`node tools/story/voice/list_lines.mjs\` and \`~/.cache/msv1-story-voice/venv/bin/python tools/story/voice/build_voice.py\`.
- Only clips whose text or casting changed are rendered again; orphans are removed.
- Setup steps are at the top of \`build_voice.py\`.

| character | franchise | LibriTTS-R speaker | measured pitch | cast (gender · band · temperament · pace) | shift / effect | clips |
|---|---|---|---|---|---|---|
${rows.join("\n")}
`)
console.log("wrote docs/msv1/story/VOICE.md", rows.length, "rows")
