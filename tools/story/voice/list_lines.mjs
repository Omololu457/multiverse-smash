// tools/story/voice/list_lines.mjs — MSV1-STORY voice: every line the story can speak (one job per voice + text).
// Uses the game's own storyEngine.js rules (storyVoiceFor / storyVoiceId), so the clips match what the game asks for.
//   node tools/story/voice/list_lines.mjs   → tools/story/voice/jobs.json
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import * as E from "../../../storyEngine.js"
const HERE = path.dirname(fileURLToPath(import.meta.url))
const S = E.STORY, jobs = new Map()
const add = line => { const v = E.storyVoiceFor(line); if (v) jobs.set(E.storyVoiceId(v), { id: E.storyVoiceId(v), ...v }) }
const parsed = x => x.kind === "say" ? E.mkLine(x.key, x.name, x.text) : x.kind === "narr" ? E.mkLine(null, null, x.text) : null
for (const e of [...S.encounters, S.secret]) {
  for (const b of ["before", "after", "scene", "closing"]) for (const pk of [null, ...Object.keys(S.isshiki.addresses)]) E.expandBlock(e[b] || [], pk).forEach(add)
  for (const x of e.secondMapText || []) add(E.mkLine(null, null, x.text))
  const cue = E.storyMidFightLine(e); if (cue) add(cue)
}
for (const a of S.acts) for (const x of a.opening || []) { const l = parsed(x); if (l) add(l) }
for (const r of S.rivals) { r.open.forEach(x => add(E.mkLine(x.key, x.name, x.text))); Object.values(r.wins).forEach(x => add(E.mkLine(x.key, x.name, x.text))) }
for (const [k, f] of Object.entries(S.fighters)) [...f.intro, ...f.ending].forEach(x => add(E.mkLine(k, f.name, x.text)))
for (const x of S.credits.narration) add(E.mkLine(null, null, x.text))
// templates: a line belongs to a franchise, spoken by whichever of its fighters is in the bout → one clip per member
const members = {}; for (const [k, f] of Object.entries(S.franchise)) (members[f] = members[f] || []).push(k)
for (const t of S.templates) for (const l of t.lines) for (const k of members[l.franchise] || []) if (S.fighters[k]) add(E.mkLine(k, null, l.text))
const out = [...jobs.values()].sort((a, b) => a.voice.localeCompare(b.voice) || a.id.localeCompare(b.id))
fs.writeFileSync(path.join(HERE, "jobs.json"), JSON.stringify(out))
const by = {}; for (const j of out) by[j.voice] = (by[j.voice] || 0) + 1
console.log(`${out.length} clips · ${Object.keys(by).length} voices · ${out.reduce((a, j) => a + j.text.length, 0)} characters`)
