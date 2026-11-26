// storyProgress.js
// STORY MODE progression — STANDALONE localStorage persistence (guest-safe).
//
// Mirrors the challenges.js / personality.js pattern: its own localStorage key, account-INDEPENDENT,
// so progress survives a reload for BOTH signed-in and guest players (the same guest-persistence fix
// applied to XP/personality/challenges). Chapters unlock sequentially — you can replay any chapter
// you've reached, and the next one opens when you clear the current furthest.
//
// State shape: { highest: <index of furthest UNLOCKED chapter, 0-based>, completed: { [index]: true } }

import { STORY_CHAPTER_COUNT } from "./story.js"

const LS_KEY = "multiverse-smash-story"

function _lsAvailable() { try { return typeof localStorage !== "undefined" && localStorage !== null } catch (_) { return false } }

function _blank() { return { highest: 0, completed: {} } }

function _repair(s) {
  if (!s || typeof s !== "object") return _blank()
  const out = _blank()
  out.highest = Math.max(0, Math.min(STORY_CHAPTER_COUNT - 1, Number(s.highest) || 0))
  if (s.completed && typeof s.completed === "object") {
    for (const k of Object.keys(s.completed)) if (s.completed[k]) out.completed[k] = true
  }
  return out
}

let _state = _blank()
let _loaded = false

function _load() {
  if (_loaded) return _state
  _loaded = true
  if (_lsAvailable()) {
    try { _state = _repair(JSON.parse(localStorage.getItem(LS_KEY) || "null")) } catch (_) { _state = _blank() }
  }
  return _state
}

function _persist() {
  if (_lsAvailable()) { try { localStorage.setItem(LS_KEY, JSON.stringify(_state)) } catch (_) {} }
}

// A snapshot of progress for the UI: how far the player has unlocked + which chapters are cleared.
export function getStoryProgress() {
  const s = _load()
  return { highest: s.highest, completed: { ...s.completed } }
}

// Is chapter `idx` (0-based) currently playable? Chapter 0 is always open; the rest open once the
// player has UNLOCKED that far (highest advances only on a real clear of the current furthest).
export function isChapterUnlocked(idx) {
  const s = _load()
  return idx >= 0 && idx < STORY_CHAPTER_COUNT && idx <= s.highest
}

export function isChapterCompleted(idx) {
  const s = _load()
  return !!s.completed[idx]
}

// Record a clear. Marks the chapter done and, if it was the current furthest, unlocks the next one.
// Returns { unlockedNext: <index|null>, campaignComplete: bool }.
export function completeStoryChapter(idx) {
  const s = _load()
  if (idx < 0 || idx >= STORY_CHAPTER_COUNT) return { unlockedNext: null, campaignComplete: false }
  s.completed[idx] = true
  let unlockedNext = null
  if (idx === s.highest && s.highest < STORY_CHAPTER_COUNT - 1) {
    s.highest += 1
    unlockedNext = s.highest
  }
  _persist()
  const campaignComplete = Object.keys(s.completed).length >= STORY_CHAPTER_COUNT
  return { unlockedNext, campaignComplete }
}

export function isCampaignComplete() {
  const s = _load()
  return Object.keys(s.completed).filter(k => s.completed[k]).length >= STORY_CHAPTER_COUNT
}

export function resetStoryProgress() {
  _state = _blank()
  _loaded = true
  _persist()
  return _state
}

// TEST HOOK: force a fresh read from storage (node tests swap the localStorage shim between cases).
export function _reloadStoryProgressForTest() {
  _loaded = false
  return _load()
}
