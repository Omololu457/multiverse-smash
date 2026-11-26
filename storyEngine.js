// storyEngine.js — MSV1-STORY: the campaign logic for "The Other End of the Line" (pure: no DOM, no canvas, no Math.random).
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
// The script text lives in data/story/storyData.js (generated from docs/story/STORY_SCRIPT.md by tools/story/build_story_data.js —
// never hand-edited). This module turns it into the ordered list of STEPS an encounter plays:
//     act card + Opening (first encounter of an act) → [first run only: the player's 3 Intro lines before 01]
//     → encounter card (BOSS banner) → "Before" → per opponent: entrance lines → FIGHT → exit line
//     → "After victory" → "Scene" → "Closing" → (36: ending + credits narration + credits roll)
// and resolves the personal dialogue at each opponent entrance:
//     1. the encounter's own "Before" (once per encounter, before opponent 1)
//     2. a RIVAL entry for (player, opponent) in either order → its two opening lines in printed order
//     3. else a TEMPLATE for (player franchise, opponent franchise) in either order → its three lines in the listed franchise
//        order, each spoken by the real fighter of that franchise; each franchise pair at most once per encounter
//     4. else nothing.  A MIRROR (opponent = player) gets neither.
// At the end of a bout only the WINNER's rival line plays. game.js drives the matches; everything here is deterministic.
// ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
import { STORY } from "./data/story/storyData.js"

export { STORY }
export const STORY_RELAY_RECOVERY = 0.20      // health recovered between relay opponents (fraction of max health) — tune here
export const STORY_SECRET_ID = "S1"
export const STORY_MIRROR_LABEL = "Rift Mirror"
// Fighters who never speak aloud (their own lines are bracketed actions, or — Krybot — the spec says so).
export const STORY_SILENT = new Set(["nezuko", "jason", "krybot", ...Object.values(STORY.fighters)
  .filter(f => [...f.intro, ...f.ending].every(l => /^\[/.test(l.text))).map(f => f.key)])

const ENC = STORY.encounters
export const storyEncounterCount = () => ENC.length
export function storyEncounter(id) {
  if (id === STORY_SECRET_ID || id === "secret") return STORY.secret
  if (typeof id === "number") return ENC[id] || null
  return ENC.find(e => e.id === id) || null
}
export const franchiseOf = key => STORY.franchise[key] || null
const _pairKey = (a, b) => [a, b].sort().join("|")
const RIVALS = new Map(STORY.rivals.map(r => [_pairKey(r.a.key, r.b.key), r]))
const TEMPLATES = new Map(STORY.templates.map(t => [_pairKey(t.a, t.b), t]))
export const findRival = (a, b) => (a && b && a !== b) ? RIVALS.get(_pairKey(a, b)) || null : null
export const findTemplate = (fa, fb) => (fa && fb && fa !== fb) ? TEMPLATES.get(_pairKey(fa, fb)) || null : null
export const isMirror = (playerKey, oppKey) => !!playerKey && playerKey === oppKey
export const storyFighterEntry = key => STORY.fighters[key] || null
export const isshikiAddressFor = key => STORY.isshiki.addresses[key] || null

// ── display lines ─────────────────────────────────────────────────────────────────────────────────────────────────────
// { speaker: rosterKey|null, name: string|null, text, italic, telepathy, narration, unsigned, voiced }
const _nameOf = key => STORY.fighters[key]?.name || null
export function mkLine(speaker, name, text, extra = {}) {
  const telepathy = /^\[Telepathy\]/.test(text)
  const bracket = /^\[/.test(text) && !telepathy
  const narration = !speaker
  return { speaker: speaker || null, name: speaker ? (name || _nameOf(speaker) || speaker) : null, text, italic: bracket, telepathy,
    narration, unsigned: false, voiced: !!speaker && !bracket && !STORY_SILENT.has(speaker), ...extra }
}
const fromParsed = x => x.kind === "say" ? mkLine(x.key, x.name, x.text) : mkLine(null, null, x.text)

// Expand an encounter block (Before / After / Scene / Closing): parsed lines + engine directives.
export function expandBlock(items, playerKey, out = []) {
  for (const x of items || []) {
    if (x.kind === "directive") {
      if (x.id === "ISSHIKI_SPEECH") {
        for (const s of STORY.isshiki.speech) out.push(mkLine(STORY.isshiki.key, STORY.isshiki.name, s.text, { group: "speech" }))
        const a = isshikiAddressFor(playerKey)
        if (a) out.push(mkLine(STORY.isshiki.key, STORY.isshiki.name, a.text, { group: "address", to: playerKey }))
      } else if (x.id === "ISSHIKI_DEFEAT") out.push(mkLine(STORY.isshiki.key, STORY.isshiki.name, STORY.isshiki.defeat.text, { group: "defeat" }))
      // ENDING_CREDITS / ISSHIKI_HALF are handled as their own steps / cues
      continue
    }
    out.push(fromParsed(x))
  }
  return out
}
const hasDirective = (items, id) => (items || []).some(x => x.kind === "directive" && x.id === id)

// ── entrance / exit resolution ───────────────────────────────────────────────────────────────────────────────────────
// usedPairs: Set of franchise-pair keys already played this encounter (mutated when a template plays).
export function resolveEntrance(playerKey, oppKey, usedPairs = new Set()) {
  if (isMirror(playerKey, oppKey)) return { type: "mirror", lines: [], rival: null, template: null }
  const r = findRival(playerKey, oppKey)
  if (r) return { type: "rival", rival: r, template: null, lines: r.open.map(l => mkLine(l.key, l.name, l.text)) }
  const fp = franchiseOf(playerKey), fo = franchiseOf(oppKey)
  const t = findTemplate(fp, fo)
  if (t) {
    const pk = _pairKey(fp, fo)
    if (usedPairs.has(pk)) return { type: "none", lines: [], rival: null, template: null, repeated: t.id }
    usedPairs.add(pk)
    const who = f => f === fp ? playerKey : oppKey
    return { type: "template", rival: null, template: t, lines: t.lines.map(l => {
      const k = who(l.franchise)
      if (STORY_SILENT.has(k)) return mkLine(null, null, l.text, { unsigned: true, franchise: l.franchise, from: k })   // silent fighter → unsigned rift caption
      return mkLine(k, null, l.text, { franchise: l.franchise })
    }) }
  }
  return { type: "none", lines: [], rival: null, template: null }
}
export function rivalWinLine(rival, winnerKey) {
  const w = rival?.wins?.[winnerKey]
  return w ? mkLine(w.key, w.name, w.text, { group: "wins" }) : null
}

// ── difficulty (reuses ai.js keys) ───────────────────────────────────────────────────────────────────────────────────
const LADDER = ["easy", "adaptive", "impossible", "master"]
export function storyDifficulty(enc) {
  if (!enc) return "adaptive"
  if (enc.id === STORY_SECRET_ID) return "master"
  const n = enc.num
  if (n === 1) return "easy"                                  // tutorial
  if (enc.finalBoss) return "master"                          // 36
  const tier = n <= 9 ? 0 : n <= 21 ? 1 : 2                   // Acts 1–2 (02–09) easy · Acts 3–5 (10–21) adaptive · Act 6 → Finale (22–35) impossible
  return LADDER[Math.min(3, tier + (enc.boss ? 1 : 0))]       // a BOSS is one step harder
}

// ── steps ────────────────────────────────────────────────────────────────────────────────────────────────────────────
// opts: { introSeen, includeAct, retry }  (retry: restart at opponent 1, Before already heard)
export function buildEncounterSteps(encId, playerKey, opts = {}) {
  const enc = storyEncounter(encId)
  if (!enc) return []
  const S = []
  const secret = enc.id === STORY_SECRET_ID
  const idx = secret ? -1 : ENC.indexOf(enc)
  if (!opts.retry) {
    const act = secret ? null : STORY.acts[enc.act]
    const firstOfAct = !secret && ENC.findIndex(e => e.act === enc.act) === idx
    if (idx === 0 && !opts.introSeen) {
      const f = storyFighterEntry(playerKey)
      if (f) S.push({ t: "lines", kind: "intro", card: { title: f.name, sub: "Intro" }, lines: f.intro.map(l => mkLine(playerKey, f.name, l.text)) })
    }
    if (firstOfAct && opts.includeAct !== false && act) {
      const lines = act.opening.map(fromParsed)
      S.push({ t: "lines", kind: "act", card: { label: act.label, title: act.title, act: act.index }, lines })
    }
    S.push({ t: "lines", kind: "card", card: { enc: enc.id, title: enc.title, sub: enc.subtitle, boss: enc.boss, finalBoss: enc.finalBoss, tutorial: enc.tutorial, map: enc.map, secret }, lines: [] })
    S.push({ t: "lines", kind: "before", lines: expandBlock(enc.before, playerKey) })
  }
  const used = new Set()
  enc.opponents.forEach((o, i) => {
    const ent = resolveEntrance(playerKey, o.key, used)
    S.push({ t: "lines", kind: "entrance", opp: i, entrance: ent.type, rivalId: ent.rival?.id || null, templateId: ent.template?.id || null, lines: ent.lines })
    S.push({ t: "fight", opp: i, oppKey: o.key, mirror: ent.type === "mirror", rivalId: ent.rival?.id || null })
    const win = ent.rival ? rivalWinLine(ent.rival, playerKey) : null
    S.push({ t: "lines", kind: "exit", opp: i, lines: win ? [win] : [] })
  })
  S.push({ t: "lines", kind: "after", lines: expandBlock(enc.after, playerKey) })
  if (enc.scene?.length) S.push({ t: "lines", kind: "scene", lines: expandBlock(enc.scene, playerKey) })
  if (enc.closing?.length) S.push({ t: "lines", kind: "closing", lines: expandBlock(enc.closing, playerKey) })
  if (hasDirective(enc.closing, "ENDING_CREDITS")) {
    const f = storyFighterEntry(playerKey)
    if (f) S.push({ t: "lines", kind: "ending", card: { title: f.name, sub: "Ending" }, lines: f.ending.map(l => mkLine(playerKey, f.name, l.text)) })
    S.push({ t: "lines", kind: "credits", card: { title: "CREDITS" }, lines: STORY.credits.narration.map(l => mkLine(null, null, l.text)) })
    S.push({ t: "credits" })
  }
  S.push({ t: "complete" })
  return S.filter(s => s.t !== "lines" || s.lines.length || s.card)
}
// The loss path for a bout: the opponent's rival win line (if the bout used a rival entry), then the retry prompt.
export function buildLossSteps(playerKey, oppKey) {
  const r = findRival(playerKey, oppKey)
  const win = r ? rivalWinLine(r, oppKey) : null
  return [...(win ? [{ t: "lines", kind: "lossLine", lines: [win] }] : []), { t: "retry" }]
}
// The mid-fight caption for fight 36 (and any future encounter carrying the cue).
export const storyMidFightLine = enc => enc?.midFightCue === "ISSHIKI_HALF" ? mkLine(STORY.isshiki.key, STORY.isshiki.name, STORY.isshiki.halfHealth.text, { group: "half" }) : null
export const storySecondMapLine = enc => enc?.secondMapText?.[0] ? mkLine(null, null, enc.secondMapText[0].text) : null
// Tutorial control hints for fight 01 (render-only), keyed to Genos's lines.
export const STORY_TUTORIAL_HINTS = [
  { cue: "Strike my guard.", hint: "Attack: J light · K heavy · I launcher" },
  { cue: "Step clear when my palm lights up.", hint: "Move: A / D (double-tap to dash) · Block: ;" },
  { cue: "Then try the bell behind me.", hint: "Specials: L (+ direction) · Ultimate: U when the meter is full" }
]

// ── deterministic helpers (no Math.random) ──────────────────────────────────────────────────────────────────────────
export function storyHash(...xs) {
  let h = 0x811c9dc5
  for (const x of xs) { const s = String(x); for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0 } h ^= 0x9e; h = Math.imul(h, 0x01000193) >>> 0 }
  return h >>> 0
}
// ── spoken voice (tools/story/voice/ renders the clips; the game plays them) ─────────────────────────────────────────
// What a line SAYS aloud: no [Telepathy] label, no [stage directions] inside the line. null = not spoken.
export function storySpokenText(text) {
  const t = String(text || "").replace(/^\[Telepathy\]\s*/, "").replace(/\[[^\]]*\]/g, " ").replace(/\s+/g, " ").trim()
  return /[A-Za-z0-9]/.test(t) ? t : null
}
// Who voices a display line: { voice: rosterKey | "narrator", variant: "" | "telepathy", text } or null (silent / bracket / rift display).
export function storyVoiceFor(line) {
  if (!line || line.unsigned || line.italic) return null
  if (line.speaker && STORY_SILENT.has(line.speaker)) return null
  const text = storySpokenText(line.text); if (!text) return null
  return { voice: line.speaker || "narrator", variant: line.telepathy ? "telepathy" : "", text }
}
// Stable clip id (content hash) — the generator names files with it, the game looks them up with it.
export const storyVoiceId = v => storyHash(v.voice, v.variant, v.text).toString(16).padStart(8, "0")
export const storyVoicePath = v => `./story_voice/${v.voice}/${storyVoiceId(v)}.m4a`

// Alternate skin for a mirror opponent: the first non-default skin that differs from the player's (hash-picked when several).
export function storyMirrorSkin(skins, playerSkin, seedParts = []) {
  const ids = (skins || []).map(s => s?.id || s).filter(id => id && id !== "default" && id !== playerSkin)
  if (!ids.length) return "default"
  return ids[storyHash("mirror", ...seedParts) % Math.min(ids.length, 4)]
}

// ── saves ────────────────────────────────────────────────────────────────────────────────────────────────────────────
// { v: 1, fighters: { [key]: { highest, checkpoint, endingSeen, introSeen, clears } }, secretUnlocked, campaignsCleared, textSpeed }
// highest = highest encounter number CLEARED (0 = none) · checkpoint = encounter INDEX to resume at (its start)
export const STORY_SAVE_KEY = "msv1_story_save_v1"
export const STORY_TEXT_SPEEDS = ["slow", "normal", "fast", "instant"]
export function storyBlankSave() { return { v: 1, fighters: {}, secretUnlocked: false, secretSeen: false, secretCleared: false, campaignsCleared: 0, textSpeed: "normal", voice: true } }
export function sanitizeStorySave(raw) {
  const s = storyBlankSave()
  if (!raw || typeof raw !== "object" || raw.v !== 1) return s
  s.secretUnlocked = raw.secretUnlocked === true
  s.secretSeen = raw.secretSeen === true
  s.secretCleared = raw.secretCleared === true
  s.campaignsCleared = Number.isInteger(raw.campaignsCleared) && raw.campaignsCleared >= 0 ? raw.campaignsCleared : 0
  s.textSpeed = STORY_TEXT_SPEEDS.includes(raw.textSpeed) ? raw.textSpeed : "normal"
  s.voice = raw.voice !== false   // spoken lines on unless switched off
  const n = ENC.length
  for (const [k, f] of Object.entries(raw.fighters && typeof raw.fighters === "object" ? raw.fighters : {})) {
    if (!STORY.fighters[k] || !f || typeof f !== "object") continue
    const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi ? v : lo
    s.fighters[k] = { highest: int(f.highest, 0, n), checkpoint: int(f.checkpoint, 0, n - 1), endingSeen: f.endingSeen === true, introSeen: f.introSeen === true, clears: int(f.clears, 0, 1e6) }
  }
  return s
}
export function loadStorySave(storage) {
  try { const t = storage?.getItem?.(STORY_SAVE_KEY); return sanitizeStorySave(t ? JSON.parse(t) : null) } catch (_) { return storyBlankSave() }
}
export function writeStorySave(storage, save) {
  try { storage?.setItem?.(STORY_SAVE_KEY, JSON.stringify(sanitizeStorySave(save))); return true } catch (_) { return false }
}
export function storyFighterSave(save, key) {
  if (!save.fighters[key]) save.fighters[key] = { highest: 0, checkpoint: 0, endingSeen: false, introSeen: false, clears: 0 }
  return save.fighters[key]
}
// Record an encounter clear for `key` (index into the campaign). Returns { campaignClear }.
export function storyRecordClear(save, key, encIndex) {
  const f = storyFighterSave(save, key)
  f.highest = Math.max(f.highest, encIndex + 1)
  const last = encIndex >= ENC.length - 1
  f.checkpoint = last ? 0 : encIndex + 1
  if (last) { f.endingSeen = true; f.clears++; save.campaignsCleared++; save.secretUnlocked = true }
  return { campaignClear: last }
}
