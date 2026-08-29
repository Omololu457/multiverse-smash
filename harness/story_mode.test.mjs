// harness/story_mode.test.mjs
// Part 1 — Story Mode MVP: data integrity + sequential-unlock progression + persistence.
// Pure Node (no browser): validates the chapter data against the real roster (parsed from
// characters.js text, avoiding its browser-coupled imports) and exercises storyProgress with a
// localStorage shim to prove clears unlock the next chapter and survive a "reload".

import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

let pass = 0, fail = 0
const ok  = (c, m) => { if (c) { pass++ } else { fail++; console.log("  ✗", m) } }

// ── real roster keys, parsed from characters.js source (no import → no DOM/audio deps) ──
const charSrc = fs.readFileSync(path.join(ROOT, "characters.js"), "utf8")
const ROSTER = new Set()
for (const m of charSrc.matchAll(/rosterKey:\s*["']([a-z0-9_]+)["']/g)) ROSTER.add(m[1])

// ── localStorage shim so storyProgress persistence is testable in node ──
const _lsStore = new Map()
globalThis.localStorage = {
  getItem: k => (_lsStore.has(k) ? _lsStore.get(k) : null),
  setItem: (k, v) => _lsStore.set(k, String(v)),
  removeItem: k => _lsStore.delete(k),
  clear: () => _lsStore.clear()
}

const story = await import("../story.js")
const sp = await import("../storyProgress.js")

// ── 1. chapter data integrity ──
const chs = story.STORY_CHAPTERS
ok(chs.length === 15, `expected 15 chapters, got ${chs.length}`)
ok(story.STORY_CHAPTER_COUNT === chs.length, "STORY_CHAPTER_COUNT matches array length")
chs.forEach((c, i) => {
  ok(c.id === i + 1, `chapter ${i} id sequential (${c.id})`)
  ok(typeof c.num === "string" && c.num.length > 0, `chapter ${i} has roman num`)
  ok(typeof c.title === "string" && c.title.length > 0, `chapter ${i} has title`)
  ok(ROSTER.has(c.player), `chapter ${i} player "${c.player}" is a real roster key`)
  ok(ROSTER.has(c.opponent), `chapter ${i} opponent "${c.opponent}" is a real roster key`)
  ok(Array.isArray(c.pre) && c.pre.length === 2, `chapter ${i} has a 2-line pre exchange`)
  ok(typeof c.win === "string" && c.win.length > 0, `chapter ${i} has a win line`)
})

// no chapter should reference a hidden/non-playable key (cell/omololu etc. are isPlayable:false)
const nonPlayable = new Set()
for (const m of charSrc.matchAll(/rosterKey:\s*["']([a-z0-9_]+)["'][^\n]*isPlayable:\s*false/g)) nonPlayable.add(m[1])
for (const c of chs) {
  ok(!nonPlayable.has(c.player) && !nonPlayable.has(c.opponent), `chapter ${c.id} avoids non-playable keys`)
}

// exactly one finale boss, and it carries a boss profile with super-armor
const bosses = chs.filter(c => c.boss)
ok(bosses.length === 1, `exactly one boss chapter (got ${bosses.length})`)
ok(bosses[0] === chs[chs.length - 1], "the boss chapter is the finale")
ok(bosses[0].bossProfile && bosses[0].bossProfile.superArmorThreshold > 0, "finale has a super-armor boss profile")

// difficulty ramps: early = easy, finale = impossible
ok(story.chapterDifficulty(0) === "easy", "chapter 1 is easy")
ok(story.chapterDifficulty(14) === "impossible", "finale is impossible")

// ── 2. sequential-unlock progression (fresh state) ──
sp.resetStoryProgress()
let prog = sp.getStoryProgress()
ok(prog.highest === 0, "fresh: only chapter 0 unlocked")
ok(sp.isChapterUnlocked(0) === true,  "fresh: chapter 0 unlocked")
ok(sp.isChapterUnlocked(1) === false, "fresh: chapter 1 locked")
ok(sp.isChapterUnlocked(14) === false, "fresh: finale locked")

// clearing chapter 0 unlocks chapter 1 and marks 0 completed
let r0 = sp.completeStoryChapter(0)
ok(r0.unlockedNext === 1, "clearing ch0 unlocks ch1")
ok(sp.isChapterCompleted(0) === true, "ch0 marked completed")
ok(sp.isChapterUnlocked(1) === true, "ch1 now unlocked")
ok(sp.isChapterUnlocked(2) === false, "ch2 still locked")

// re-clearing an already-cleared, non-furthest chapter does NOT advance highest
sp.completeStoryChapter(0)
ok(sp.getStoryProgress().highest === 1, "re-clearing ch0 doesn't push highest past 1")

// ── 3. persistence across a simulated reload ──
prog = sp.getStoryProgress()
const reloaded = sp._reloadStoryProgressForTest()
ok(reloaded.highest === prog.highest, "reload preserves highest")
ok(!!reloaded.completed[0], "reload preserves completed ch0")

// ── 4. clearing every chapter completes the campaign ──
sp.resetStoryProgress()
let campaignDone = false
for (let i = 0; i < story.STORY_CHAPTER_COUNT; i++) {
  const res = sp.completeStoryChapter(i)
  if (i < story.STORY_CHAPTER_COUNT - 1) ok(sp.isChapterUnlocked(i + 1), `clearing ch${i} unlocked ch${i + 1}`)
  campaignDone = res.campaignComplete
}
ok(campaignDone === true, "clearing all chapters flags campaignComplete")
ok(sp.isCampaignComplete() === true, "isCampaignComplete true after full clear")

console.log(`\nstory_mode: ${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
