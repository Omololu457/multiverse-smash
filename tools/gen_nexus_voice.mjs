// tools/gen_nexus_voice.mjs — generate TTS audio for every Story Mode cutscene line using macOS `say`.
// For each beat with text: pick the speaker's voice, `say -o <aiff>`, then afconvert → .m4a (AAC, web-safe).
// Clip filenames come from voiceClipName() (content hash) so they match what the engine looks up at runtime.
// Usage: node tools/gen_nexus_voice.mjs            (skips clips that already exist)
//        node tools/gen_nexus_voice.mjs --force    (regenerate all)
import { execFileSync } from "node:child_process"
import fs from "node:fs"; import path from "node:path"; import os from "node:os"
import { fileURLToPath } from "node:url"
import { NEXUS_FRACTURE_FULL } from "../nexusFracture.js"
import { voiceForSpeaker, voiceClipName, NEXUS_VOICE_DIR } from "../nexusVoice.js"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const OUT = path.join(ROOT, NEXUS_VOICE_DIR)
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "nexusvoice-"))
const FORCE = process.argv.includes("--force")
fs.mkdirSync(OUT, { recursive: true })

// De-dupe by clip name (identical speaker+text → one file). Preserves the voice/text for the manifest.
const lines = new Map()
for (const b of NEXUS_FRACTURE_FULL) {
  if (b.fight || !b.text) continue
  const name = voiceClipName(b.speaker, b.text)
  if (!lines.has(name)) lines.set(name, { speaker: b.speaker ?? "", text: b.text, voice: voiceForSpeaker(b.speaker) })
}

let made = 0, skipped = 0, failed = 0
const manifest = []
for (const [name, { speaker, text, voice }] of lines) {
  const outPath = path.join(OUT, name)
  manifest.push({ file: name, speaker, voice, text })
  if (!FORCE && fs.existsSync(outPath) && fs.statSync(outPath).size > 0) { skipped++; continue }
  const aiff = path.join(TMP, name.replace(/\.m4a$/, ".aiff"))
  try {
    execFileSync("say", ["-v", voice, "-o", aiff, text], { stdio: "ignore" })
    execFileSync("afconvert", [aiff, outPath, "-f", "m4af", "-d", "aac"], { stdio: "ignore" })
    fs.rmSync(aiff, { force: true })
    made++
    process.stdout.write(`\r  generated ${made}  (skipped ${skipped})   `)
  } catch (e) { failed++; console.error(`\n  ✗ ${voice} / "${text.slice(0, 40)}..." — ${e.message}`) }
}
fs.writeFileSync(path.join(OUT, "manifest.json"), JSON.stringify({ count: lines.size, voices: [...new Set([...lines.values()].map(l => l.voice))], lines: manifest }, null, 2))
fs.rmSync(TMP, { recursive: true, force: true })
console.log(`\n✅ nexus voice: ${made} generated, ${skipped} skipped, ${failed} failed → ${NEXUS_VOICE_DIR}/ (${lines.size} distinct lines)`)
process.exit(failed ? 1 : 0)
