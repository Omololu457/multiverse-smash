#!/usr/bin/env node
// tools/story/build_story_data.js — MSV1-STORY: parse docs/story/STORY_SCRIPT.md into the data module the game loads.
//
//   node tools/story/build_story_data.js            → writes data/story/story.json + data/story/storyData.js
//                                                     + docs/msv1/story/DATA_REPORT.md
//   node tools/story/build_story_data.js --check    → parse + verify only (no writes); exit 1 on any failure
//
// RULES (the script is the source of truth):
//   • Text is NEVER altered. Every displayed string is a verbatim slice of a script line. The only place a line is cut is
//     a stage-direction line that mixes narration with an instruction to the engine ("… knock. Play the selected fighter's
//     ending, then CREDITS.") — the instruction sentence is lifted out as a directive and the narration part is kept
//     byte-for-byte (a prefix of the original line). Every cut is listed in the report.
//   • Fails LOUDLY on an unknown fighter key, an unknown map name, or a malformed block.
//   • Script keys that differ from game keys go through KEY_MAP below (the script text itself is never edited).
//   • The counts are verified against the spec and the tool exits 1 if any differs.
import fs from "node:fs"
import path from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..")
const SCRIPT = path.join(ROOT, "docs/story/STORY_SCRIPT.md")
const CHECK_ONLY = process.argv.includes("--check")

// Script key → game key. Every key in the script matched the game when this was written, so the table is empty;
// add an entry here (never edit the script) if a fighter is ever renamed in the game.
export const KEY_MAP = {}
// Script map name → game stage name (same policy as KEY_MAP).
export const MAP_MAP = {}

const MAX_LINE = 140
const FRANCHISES = ["Dragon Ball", "Jujutsu Kaisen", "Naruto/Boruto", "Demon Slayer", "Rick and Morty", "Ben 10", "Invincible", "DC",
  "The Boys", "Power Rangers", "Hunter x Hunter", "Saiki K.", "The Incredibles", "Horror", "Bleach", "One-Punch Man", "Death Note",
  "Marvel", "Hajime no Ippo", "One Piece", "Originals", "Divine", "Baki"]
// Select-screen universe group → template franchise label.
const UNIVERSE_FRANCHISE = { dragon_ball: "Dragon Ball", jujutsu_kaisen: "Jujutsu Kaisen", naruto: "Naruto/Boruto", demon_slayer: "Demon Slayer",
  rick_and_morty: "Rick and Morty", ben_10: "Ben 10", dc: "DC", power_rangers: "Power Rangers", hunter_x_hunter: "Hunter x Hunter",
  saiki_k: "Saiki K.", the_incredibles: "The Incredibles", horror: "Horror", bleach: "Bleach", one_punch_man: "One-Punch Man",
  deathnote: "Death Note", marvel: "Marvel", hajime_no_ippo: "Hajime no Ippo", one_piece: "One Piece", original: "Originals",
  divine: "Divine", baki: "Baki" }
// Spec overrides on top of the select-screen groups (Krybot + every Ranger already sit in power_rangers).
const FRANCHISE_OVERRIDE = { invincible: "Invincible", omniman_viltrum: "Invincible", omniman: "Invincible", homelander: "The Boys", soldier_boy: "The Boys" }

const EXPECT = { encounters: 36, secret: 1, rivals: 83, templates: 45, intros: 110, endings: 110, addresses: 9, speech: 6, credits: 6 }

class ScriptError extends Error {}
const die = (msg, ln) => { throw new ScriptError(`STORY_SCRIPT.md${ln ? `:${ln}` : ""} — ${msg}`) }

// ── game reference data ────────────────────────────────────────────────────────────────────────────────────────────
async function loadGame() {
  const { characters } = await import(pathToFileURL(path.join(ROOT, "characters.js")))
  const src = fs.readFileSync(path.join(ROOT, "game.js"), "utf8")
  const a = src.indexOf("const STAGE_DEFS"), b = src.indexOf("const stages = STAGE_DEFS")
  if (a < 0 || b < 0) die("could not find STAGE_DEFS in game.js")
  const stages = [...src.slice(a, b).matchAll(/^\s*\{\s*name:\s*"([^"]+)"/gm)].map(m => m[1])
  return { characters, stages }
}

// ── line classification ────────────────────────────────────────────────────────────────────────────────────────────
const RE_SPEAK = /^(.+?) \[([A-Za-z0-9_]+)\] — (.+)$/
const RE_WINS = /^(.+?) \[([A-Za-z0-9_]+)\] wins — (.+)$/
const RE_NAMEKEY = /^(.+?) \[([A-Za-z0-9_]+)\]$/
// stage-direction sentences addressed to the engine (lifted out as directives, never shown)
const DIRECTIVES = [
  { re: /Play the six ISSHIKI speech lines here\. Append the selected fighter's special address when present\.$/, id: "ISSHIKI_SPEECH" },
  { re: /Play the ISSHIKI defeat line\.$/, id: "ISSHIKI_DEFEAT" },
  { re: /Play the selected fighter's ending, then CREDITS\.$/, id: "ENDING_CREDITS" },
  { re: /Play the ISSHIKI half-health line once\.$/, id: "ISSHIKI_HALF" }
]
const cuts = []

function parseLine(raw, ln, ctx) {
  const key = k => { const g = KEY_MAP[k] || k; if (!ctx.characters[g]) die(`unknown fighter key [${k}]`, ln); return g }
  let m = RE_WINS.exec(raw)
  if (m) return { kind: "wins", name: m[1], key: key(m[2]), text: m[3], ln }
  m = RE_SPEAK.exec(raw)
  if (m) {
    const text = m[3]
    return { kind: "say", name: m[1], key: key(m[2]), text, silent: /^\[/.test(text) && !/^\[Telepathy\]/.test(text), ln }
  }
  for (const d of DIRECTIVES) {
    const dm = d.re.exec(raw)
    if (!dm) continue
    const keep = raw.slice(0, dm.index).replace(/\s+$/, "")
    if (keep) { cuts.push({ ln, line: raw, shown: keep, directive: d.id }); return [{ kind: "narr", text: keep, ln }, { kind: "directive", id: d.id, ln }] }
    return { kind: "directive", id: d.id, ln }
  }
  if (/ — /.test(raw)) die(`line has " — " but no "Name [key]" speaker: ${raw}`, ln)
  if (/\[[a-z0-9_]+\]/.test(raw) && !/^\[/.test(raw)) die(`stray [key] inside a narration line: ${raw}`, ln)
  return { kind: "narr", text: raw, silent: /^\[/.test(raw), ln }
}
const flat = a => a.flatMap(x => Array.isArray(x) ? x : [x])

// ── parser ─────────────────────────────────────────────────────────────────────────────────────────────────────────
export async function buildStory() {
  cuts.length = 0
  const game = await loadGame()
  const ctx = { characters: game.characters }
  const lines = fs.readFileSync(SCRIPT, "utf8").split(/\r?\n/).map((t, i) => ({ t: t.replace(/\s+$/, ""), ln: i + 1 })).filter(l => l.t.length)
  const TOP = /^(PROLOGUE|ACT \d+|FINALE|SECRET|RIVAL TABLE|TEMPLATES|ENDINGS|ISSHIKI|CREDITS)$/
  // split into top-level sections
  const sections = []
  for (const l of lines) {
    if (TOP.test(l.t)) sections.push({ head: l.t, ln: l.ln, body: [] })
    else { if (!sections.length) die(`text before the first section header: ${l.t}`, l.ln); sections.at(-1).body.push(l) }
  }
  const out = { title: "", notes: [], acts: [], encounters: [], secret: null, rivals: [], templates: [], fighters: {}, isshiki: null, credits: null, meta: {} }
  const mapName = (n, ln) => { const g = MAP_MAP[n] || n; if (!game.stages.includes(g)) die(`unknown map "${n}"`, ln); return g }
  const usedMaps = new Set()

  // an encounter block (01-36, S1) — body lines up to the next encounter header
  const RE_ENC = /^(\d{2}|S\d) · (.+)$/
  const parseEncounter = (head, body, actIndex) => {
    const parts = head.t.split(" · "), id = parts[0]
    const tags = [], rest = []
    for (const p of parts.slice(1)) (["BOSS", "FINAL BOSS", "Tutorial"].includes(p) ? tags : rest).push(p)
    if (!rest.length) die(`encounter ${id} has no title`, head.ln)
    const enc = { id, num: /^\d+$/.test(id) ? +id : null, title: rest[0], subtitle: rest.slice(1).join(" · "), boss: tags.includes("BOSS") || tags.includes("FINAL BOSS"),
      finalBoss: tags.includes("FINAL BOSS"), tutorial: tags.includes("Tutorial"), act: actIndex, header: head.t, map: null, secondMap: null, secondMapText: [],
      opponents: [], before: [], after: [], scene: [], closing: [], midFightCue: null, ln: head.ln }
    let block = null
    for (const l of body) {
      let m
      if ((m = /^Map · (.+)$/.exec(l.t))) { if (enc.map) die(`encounter ${id}: two Map lines`, l.ln); enc.map = mapName(m[1], l.ln); usedMaps.add(enc.map); block = null; continue }
      if ((m = /^Second map · (.+)$/.exec(l.t))) { enc.secondMap = mapName(m[1], l.ln); usedMaps.add(enc.secondMap); block = "secondMapText"; continue }
      if ((m = /^Opponent (\d+) · (.+)$/.exec(l.t))) {
        const nk = RE_NAMEKEY.exec(m[2]); if (!nk) die(`malformed opponent line: ${l.t}`, l.ln)
        if (+m[1] !== enc.opponents.length + 1) die(`encounter ${id}: opponent numbers out of order (${m[1]})`, l.ln)
        const k = KEY_MAP[nk[2]] || nk[2]; if (!game.characters[k]) die(`unknown fighter key [${nk[2]}]`, l.ln)
        enc.opponents.push({ name: nk[1], key: k }); block = null; continue
      }
      if (/^Mid-fight cue · /.test(l.t)) { const d = flat([parseLine(l.t.replace(/^Mid-fight cue · /, ""), l.ln, ctx)]).find(x => x.kind === "directive"); if (!d) die(`unknown mid-fight cue: ${l.t}`, l.ln); enc.midFightCue = d.id; block = null; continue }
      if (l.t === "Before") { block = "before"; continue }
      if (l.t === "After victory") { block = "after"; continue }
      if (l.t === "Scene") { block = "scene"; continue }
      if (l.t === "Closing") { block = "closing"; continue }
      if (!block) die(`encounter ${id}: line outside any block: ${l.t}`, l.ln)
      enc[block].push(...flat([parseLine(l.t, l.ln, ctx)]))
    }
    if (!enc.map) die(`encounter ${id}: no Map line`, head.ln)
    if (!enc.opponents.length) die(`encounter ${id}: no opponents`, head.ln)
    if (enc.opponents.length > 7) die(`encounter ${id}: more than 7 opponents`, head.ln)
    if (!enc.before.length) die(`encounter ${id}: no Before block`, head.ln)
    if (!enc.after.length) die(`encounter ${id}: no After victory block`, head.ln)
    if (enc.secondMap && !enc.secondMapText.length) die(`encounter ${id}: Second map without its text line`, head.ln)
    for (const b of ["before", "after", "scene", "closing", "secondMapText"]) for (const x of enc[b]) if (x.kind === "wins") die(`encounter ${id}: a "wins —" line outside the rival table`, x.ln)
    return enc
  }
  const encountersOf = (sec, actIndex) => {
    const pre = [], encs = []
    let cur = null
    for (const l of sec.body) {
      if (RE_ENC.test(l.t)) { cur = { head: l, body: [] }; encs.push(cur); continue }
      if (cur) cur.body.push(l); else pre.push(l)
    }
    return { pre, encs: encs.map(e => parseEncounter(e.head, e.body, actIndex)) }
  }

  let actIndex = 0
  for (const sec of sections) {
    if (sec.head === "PROLOGUE") {
      const { pre, encs } = encountersOf(sec, 0)
      if (!pre.length) die("PROLOGUE has no title line", sec.ln)
      out.title = pre[0].t
      out.notes = pre.slice(1).map(l => l.t)   // design notes for the engine (not shown in game)
      out.acts.push({ index: 0, label: "PROLOGUE", title: out.title, opening: [] })
      out.encounters.push(...encs)
    } else if (/^ACT \d+$/.test(sec.head) || sec.head === "FINALE") {
      actIndex++
      const { pre, encs } = encountersOf(sec, actIndex)
      const act = { index: actIndex, label: sec.head, title: "", opening: [] }
      if (sec.head !== "FINALE") {
        if (!pre.length) die(`${sec.head} has no title`, sec.ln)
        act.title = pre[0].t
        if (pre[1]?.t !== "Opening") die(`${sec.head}: expected "Opening" after the title`, pre[1]?.ln || sec.ln)
        act.opening = flat(pre.slice(2).map(l => parseLine(l.t, l.ln, ctx)))
        if (!act.opening.length) die(`${sec.head}: empty Opening`, sec.ln)
      } else if (pre.length) die(`FINALE: unexpected text before encounter 34: ${pre[0].t}`, pre[0].ln)
      out.acts.push(act); out.encounters.push(...encs)
    } else if (sec.head === "SECRET") {
      const { pre, encs } = encountersOf(sec, -1)
      if (encs.length !== 1) die(`SECRET must hold exactly one encounter (found ${encs.length})`, sec.ln)
      const u = pre.find(l => /^UNLOCK • /.test(l.t)); if (!u) die("SECRET: no UNLOCK line", sec.ln)
      out.secret = { ...encs[0], unlockText: u.t.replace(/^UNLOCK • /, ""), unlock: "firstCredits" }
    } else if (sec.head === "RIVAL TABLE") {
      let cur = null
      for (const l of sec.body) {
        const m = /^(R\d{2}) · (.+?) \[([A-Za-z0-9_]+)\] ↔ (.+?) \[([A-Za-z0-9_]+)\]$/.exec(l.t)
        if (m) {
          const ka = KEY_MAP[m[3]] || m[3], kb = KEY_MAP[m[5]] || m[5]
          for (const [k, raw] of [[ka, m[3]], [kb, m[5]]]) if (!game.characters[k]) die(`unknown fighter key [${raw}]`, l.ln)
          cur = { id: m[1], a: { name: m[2], key: ka }, b: { name: m[4], key: kb }, open: [], wins: {}, ln: l.ln }; out.rivals.push(cur); continue
        }
        if (!cur) { out.meta.rivalRules = (out.meta.rivalRules || []).concat(l.t); continue }
        const p = flat([parseLine(l.t, l.ln, ctx)])[0]
        if (p.kind === "wins") { if (p.key !== cur.a.key && p.key !== cur.b.key) die(`${cur.id}: winner [${p.key}] is not in the pair`, l.ln); cur.wins[p.key] = p }
        else if (p.kind === "say") { if (p.key !== cur.a.key && p.key !== cur.b.key) die(`${cur.id}: speaker [${p.key}] is not in the pair`, l.ln); cur.open.push(p) }
        else die(`${cur.id}: malformed rival line: ${l.t}`, l.ln)
      }
      for (const r of out.rivals) {
        if (r.open.length !== 2) die(`${r.id}: expected 2 opening lines, got ${r.open.length}`, r.ln)
        if (!r.wins[r.a.key] || !r.wins[r.b.key] || Object.keys(r.wins).length !== 2) die(`${r.id}: needs one "wins" line for each side`, r.ln)
      }
    } else if (sec.head === "TEMPLATES") {
      let cur = null
      for (const l of sec.body) {
        const m = /^(T\d{2}) · (.+) ↔ (.+)$/.exec(l.t)
        if (m) {
          for (const f of [m[2], m[3]]) if (!FRANCHISES.includes(f)) die(`${m[1]}: unknown franchise "${f}"`, l.ln)
          cur = { id: m[1], a: m[2], b: m[3], lines: [], ln: l.ln }; out.templates.push(cur); continue
        }
        if (!cur) { out.meta.templateRules = (out.meta.templateRules || []).concat(l.t); continue }
        const lm = /^(.+?) — (.+)$/.exec(l.t)
        if (!lm || (lm[1] !== cur.a && lm[1] !== cur.b)) die(`${cur.id}: malformed template line: ${l.t}`, l.ln)
        cur.lines.push({ franchise: lm[1], text: lm[2], silent: /^\[/.test(lm[2]), ln: l.ln })
      }
      for (const t of out.templates) {
        if (t.lines.length !== 3) die(`${t.id}: expected 3 lines, got ${t.lines.length}`, t.ln)
        const order = t.lines.map(x => x.franchise).join("|")
        if (order !== [t.a, t.b, t.a].join("|")) die(`${t.id}: lines are not in the listed franchise order (${order})`, t.ln)
      }
    } else if (sec.head === "ENDINGS") {
      let cur = null, block = null
      for (const l of sec.body) {
        const nk = RE_NAMEKEY.exec(l.t)
        if (nk && !/^\[/.test(l.t)) {
          const k = KEY_MAP[nk[2]] || nk[2]; if (!game.characters[k]) die(`unknown fighter key [${nk[2]}]`, l.ln)
          if (out.fighters[k]) die(`duplicate ENDINGS entry for [${k}]`, l.ln)
          cur = out.fighters[k] = { name: nk[1], key: k, intro: [], ending: [], ln: l.ln }; block = null; continue
        }
        if (l.t === "Intro") { block = "intro"; continue }
        if (l.t === "Ending") { block = "ending"; continue }
        if (!cur || !block) { out.meta.endingRules = (out.meta.endingRules || []).concat(l.t); continue }
        cur[block].push({ text: l.t, silent: /^\[/.test(l.t), ln: l.ln })
      }
      for (const f of Object.values(out.fighters)) {
        if (f.intro.length !== 3) die(`[${f.key}]: Intro has ${f.intro.length} lines (want 3)`, f.ln)
        if (f.ending.length !== 4) die(`[${f.key}]: Ending has ${f.ending.length} lines (want 4)`, f.ln)
      }
    } else if (sec.head === "ISSHIKI") {
      const I = { key: null, name: "", speech: [], addresses: {}, halfHealth: null, defeat: null }
      let block = null
      for (const l of sec.body) {
        if (!I.key) { const nk = RE_NAMEKEY.exec(l.t); if (!nk) die("ISSHIKI: first line must be the speaker", l.ln); I.key = KEY_MAP[nk[2]] || nk[2]; I.name = nk[1]; if (!game.characters[I.key]) die(`unknown fighter key [${nk[2]}]`, l.ln); continue }
        if (/^Before fight 36 · Speech$/.test(l.t)) { block = "speech"; continue }
        if (/^Personal address · /.test(l.t)) { block = "addr"; continue }
        if (l.t === "Mid-fight · Half health") { block = "half"; continue }
        if (l.t === "Defeat") { block = "defeat"; continue }
        if (block === "speech") I.speech.push({ text: l.t, ln: l.ln })
        else if (block === "addr") {
          const m = /^To (.+?) \[([A-Za-z0-9_]+)\] — (.+)$/.exec(l.t); if (!m) die(`malformed personal address: ${l.t}`, l.ln)
          const k = KEY_MAP[m[2]] || m[2]; if (!game.characters[k]) die(`unknown fighter key [${m[2]}]`, l.ln)
          if (I.addresses[k]) die(`duplicate personal address for [${k}]`, l.ln)
          I.addresses[k] = { to: m[1], text: m[3], ln: l.ln }
        } else if (block === "half") { if (I.halfHealth) die("ISSHIKI: two half-health lines", l.ln); I.halfHealth = { text: l.t, ln: l.ln } }
        else if (block === "defeat") { if (I.defeat) die("ISSHIKI: two defeat lines", l.ln); I.defeat = { text: l.t, ln: l.ln } }
        else die(`ISSHIKI: line outside any block: ${l.t}`, l.ln)
      }
      if (!I.halfHealth || !I.defeat) die("ISSHIKI: missing half-health or defeat line", sec.ln)
      out.isshiki = I
    } else if (sec.head === "CREDITS") {
      const C = { narration: [] }
      let block = null
      for (const l of sec.body) {
        if (l.t === "Closing narration") { block = "narr"; continue }
        if (l.t === "Roster ledger" || l.t === "Fighters without special lines") { block = "meta"; out.meta[l.t] = []; continue }
        if (block === "narr") C.narration.push({ text: l.t, ln: l.ln })
        else if (block === "meta") out.meta[Object.keys(out.meta).at(-1)].push(l.t)   // metadata: never shown in game
        else die(`CREDITS: line outside any block: ${l.t}`, l.ln)
      }
      out.credits = C
    }
  }

  // ── cross-checks ──
  const nums = out.encounters.map(e => e.num)
  for (let i = 0; i < nums.length; i++) if (nums[i] !== i + 1) die(`encounters out of order: expected ${String(i + 1).padStart(2, "0")}, got ${out.encounters[i].id}`)
  // every directive the engine must honour has to be found where the spec expects it
  const e35 = out.encounters[34], e36 = out.encounters[35]
  if (!e35?.scene.some(x => x.kind === "directive" && x.id === "ISSHIKI_SPEECH")) die("encounter 35: Scene is missing the ISSHIKI speech directive")
  if (!e36?.after.some(x => x.kind === "directive" && x.id === "ISSHIKI_DEFEAT")) die("encounter 36: After victory is missing the ISSHIKI defeat directive")
  if (!e36?.closing.some(x => x.kind === "directive" && x.id === "ENDING_CREDITS")) die("encounter 36: Closing is missing the ending/credits directive")
  if (e36?.midFightCue !== "ISSHIKI_HALF") die("encounter 36: missing the ISSHIKI half-health mid-fight cue")
  // rival pairs must be unique (either order)
  const pairSeen = new Map()
  for (const r of out.rivals) { const k = [r.a.key, r.b.key].sort().join("|"); if (pairSeen.has(k)) die(`${r.id} duplicates ${pairSeen.get(k)} (${k})`, r.ln); pairSeen.set(k, r.id) }
  const tplSeen = new Map()
  for (const t of out.templates) { const k = [t.a, t.b].sort().join("|"); if (tplSeen.has(k)) die(`${t.id} duplicates ${tplSeen.get(k)} (${k})`, t.ln); tplSeen.set(k, t.id) }

  // ── fighter → franchise (select-screen groups + spec overrides) ──
  const visible = Object.keys(game.characters).filter(k => !game.characters[k].hidden)
  const franchise = {}
  for (const k of Object.keys(game.characters)) {
    const u = game.characters[k].universe
    franchise[k] = FRANCHISE_OVERRIDE[k] || UNIVERSE_FRANCHISE[u] || null
  }
  for (const k of visible) if (!franchise[k]) die(`selectable fighter [${k}] (universe ${game.characters[k].universe}) has no franchise label`)
  const missingEnd = visible.filter(k => !out.fighters[k]), extraEnd = Object.keys(out.fighters).filter(k => !visible.includes(k))
  if (missingEnd.length) die(`selectable fighters without an ENDINGS entry: ${missingEnd.join(", ")}`)
  if (extraEnd.length) die(`ENDINGS entries for fighters that are not selectable: ${extraEnd.join(", ")}`)

  // ── line length report (never edited) ──
  const all = []
  const push = (where, x, speaker) => all.push({ where, ln: x.ln, speaker: speaker || "", text: x.text })
  for (const a of out.acts) for (const x of a.opening) if (x.text) push(`${a.label} Opening`, x, x.name)
  for (const e of [...out.encounters, out.secret]) for (const b of ["before", "after", "scene", "closing", "secondMapText"]) for (const x of e[b]) if (x.text) push(`${e.id} ${b}`, x, x.name)
  for (const r of out.rivals) { for (const x of r.open) push(r.id, x, x.name); for (const x of Object.values(r.wins)) push(`${r.id} wins`, x, x.name) }
  for (const t of out.templates) for (const x of t.lines) push(t.id, x, x.franchise)
  for (const f of Object.values(out.fighters)) { for (const x of f.intro) push(`${f.key} intro`, x); for (const x of f.ending) push(`${f.key} ending`, x) }
  for (const x of out.isshiki.speech) push("ISSHIKI speech", x)
  for (const [k, x] of Object.entries(out.isshiki.addresses)) push(`ISSHIKI → ${k}`, x)
  push("ISSHIKI half", out.isshiki.halfHealth); push("ISSHIKI defeat", out.isshiki.defeat)
  for (const x of out.credits.narration) push("CREDITS", x)
  const long = all.filter(x => x.text.length > MAX_LINE)
  out.meta.longest = Math.max(...all.map(x => x.text.length))

  out.franchise = franchise
  out.selectable = visible
  out.meta.usedMaps = [...usedMaps]
  out.meta.unusedMaps = game.stages.filter(s => !usedMaps.has(s))
  out.meta.cuts = cuts.slice()
  out.meta.longLines = long
  out.meta.lineCount = all.length
  out.meta.source = "docs/story/STORY_SCRIPT.md"
  out.meta.keyMap = KEY_MAP
  out.meta.mapMap = MAP_MAP

  const counts = { encounters: out.encounters.length, secret: out.secret ? 1 : 0, rivals: out.rivals.length, templates: out.templates.length,
    intros: Object.values(out.fighters).filter(f => f.intro.length === 3).length, endings: Object.values(out.fighters).filter(f => f.ending.length === 4).length,
    addresses: Object.keys(out.isshiki.addresses).length, speech: out.isshiki.speech.length, credits: out.credits.narration.length }
  out.meta.counts = counts
  const bad = Object.entries(EXPECT).filter(([k, v]) => counts[k] !== v)
  return { story: out, counts, bad, game, long }
}

// strip parse-only fields (line numbers stay: they let a test point back at the script)
export function toGameData(story) { return story }

function report({ story, counts, bad, game, long }) {
  const L = []
  L.push("# MSV1-STORY — DATA REPORT", "", `Generated by \`tools/story/build_story_data.js\` from \`docs/story/STORY_SCRIPT.md\`. Re-run any time: the tool is the only writer of \`data/story/*\`.`, "")
  L.push("## Counts (verified — the tool exits 1 if any differs)", "", "| item | parsed | expected |", "|---|---|---|")
  for (const [k, v] of Object.entries(EXPECT)) L.push(`| ${k} | ${counts[k]} | ${v} |`)
  L.push("", `Total displayable lines checked for length: **${story.meta.lineCount}**.`, "")
  L.push("## Keys / maps that needed mapping", "", Object.keys(KEY_MAP).length ? Object.entries(KEY_MAP).map(([a, b]) => `- [${a}] → ${b}`).join("\n") : "- **None.** Every fighter key in the script is a game roster key.",
    Object.keys(MAP_MAP).length ? Object.entries(MAP_MAP).map(([a, b]) => `- ${a} → ${b}`).join("\n") : "- **None.** Every map name in the script is a game stage name.", "")
  L.push(`## Lines over ${MAX_LINE} characters (NOT edited)`, "", long.length ? long.map(x => `- line ${x.ln} (${x.where}, ${x.text.length} chars): ${x.text}`).join("\n") : `- **None.** The longest line is ${story.meta.longest} characters.`, "")
  L.push("## Maps", "", `Game stages: ${game.stages.length}. Used by the script: ${story.meta.usedMaps.length}.`, "", story.meta.unusedMaps.length ? "Unused: " + story.meta.unusedMaps.join(", ") : "**Every map is used at least once.**", "")
  L.push("## Stage directions lifted out as engine directives", "", "These sentences tell the engine what to do; they are not shown. Where a line also holds narration, the narration part is shown verbatim (a prefix of the line).", "")
  for (const e of [...story.encounters, story.secret]) for (const b of ["before", "after", "scene", "closing"]) for (const x of e[b]) if (x.kind === "directive") L.push(`- ${e.id} ${b}: \`${x.id}\` (script line ${x.ln})`)
  L.push("- 36 Mid-fight cue: `" + story.encounters[35].midFightCue + "`")
  for (const c of story.meta.cuts) L.push(`- line ${c.ln} split: shown "${c.shown}" + directive \`${c.directive}\``)
  L.push("", "## Not shown in game (metadata)", "", "- PROLOGUE design notes (" + story.notes.length + " lines after the title).", "- RIVAL TABLE / TEMPLATES / ENDINGS rule paragraphs.", "- SECRET `UNLOCK •` prefix (the rest of that line is the menu entry's description).", "- CREDITS → Roster ledger, Fighters without special lines.", "")
  L.push("## Fighter → franchise", "", "Built from the select-screen universe groups, with the spec overrides: Mark Grayson + Omni-Man → Invincible, Homelander + Soldier Boy → The Boys, Krybot + every Ranger → Power Rangers (already their group).", "")
  const byF = {}
  for (const k of story.selectable) (byF[story.franchise[k]] = byF[story.franchise[k]] || []).push(k)
  for (const f of FRANCHISES) L.push(`- **${f}** (${(byF[f] || []).length}): ${(byF[f] || []).join(", ")}`)
  const usedF = new Set(story.templates.flatMap(t => [t.a, t.b]))
  L.push("", "Franchise labels used by the templates: " + [...usedF].join(", ") + ".")
  L.push("", "## Encounters", "", "| # | title | map | second map | opponents |", "|---|---|---|---|---|")
  for (const e of [...story.encounters, story.secret]) L.push(`| ${e.id}${e.boss ? " BOSS" : ""} | ${e.title} | ${e.map} | ${e.secondMap || ""} | ${e.opponents.map(o => o.key).join(" → ")} |`)
  return L.join("\n") + "\n"
}

async function main() {
  let res
  try { res = await buildStory() } catch (e) { if (e instanceof ScriptError) { console.error("✗ STORY PARSE FAILED:", e.message); process.exit(1) } throw e }
  const { story, counts, bad, long } = res
  console.log("MSV1-STORY parser counts:")
  for (const [k, v] of Object.entries(EXPECT)) console.log(`  ${counts[k] === v ? "✅" : "❌"} ${k.padEnd(11)} ${counts[k]} (expected ${v})`)
  console.log(`  lines checked: ${story.meta.lineCount}; over ${MAX_LINE}: ${long.length}`)
  for (const x of long) console.log(`    ⚠ line ${x.ln} (${x.text.length}): ${x.text}`)
  console.log(`  maps used: ${story.meta.usedMaps.length}/${res.game.stages.length}; unused: ${story.meta.unusedMaps.join(", ") || "none"}`)
  if (bad.length) { console.error("✗ COUNT MISMATCH:", bad.map(([k, v]) => `${k}=${counts[k]} (want ${v})`).join(", ")); process.exit(1) }
  if (CHECK_ONLY) return
  const dir = path.join(ROOT, "data/story"); fs.mkdirSync(dir, { recursive: true })
  const json = JSON.stringify(toGameData(story), null, 1)
  fs.writeFileSync(path.join(dir, "story.json"), json + "\n")
  fs.writeFileSync(path.join(dir, "storyData.js"), "// GENERATED by tools/story/build_story_data.js from docs/story/STORY_SCRIPT.md — do not edit by hand; re-run the tool.\nexport const STORY = " + json + "\nexport default STORY\n")
  fs.mkdirSync(path.join(ROOT, "docs/msv1/story"), { recursive: true })
  fs.writeFileSync(path.join(ROOT, "docs/msv1/story/DATA_REPORT.md"), report(res))
  console.log("wrote data/story/story.json, data/story/storyData.js, docs/msv1/story/DATA_REPORT.md")
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main()
