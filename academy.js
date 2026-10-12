// academy.js — CHARACTER ACADEMY (additive, isolated). Pure data/logic only: generates a lesson list per
// fighter from getKit() data, turns a move's input notation into a device-correct LABEL and a SHOW-ME raw-input
// SCRIPT (replayed through the real pipeline by game.js), composites READ-ONLY signals into a per-move success
// detector, and persists progress to localStorage (guest-safe). It NEVER touches combat.js, kits or balance —
// game.js owns the match instance and feeds this module plain snapshots. The Academy never auto-launches.
import { getKit } from "./kits.js"

// ──────────────────────────────────────────────────────────────────────────────
// PROGRESS (localStorage, guest-safe — every access wrapped; failure is a no-op, never blocks)
// ──────────────────────────────────────────────────────────────────────────────
const LS_KEY = "multiverse-smash-academy"
export function loadAcademyProgress() {
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}") || {} } catch (_) { return {} }
}
export function saveAcademyProgress(prog) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(prog || {})) } catch (_) {}
}
export function markLessonComplete(prog, charKey, lessonId) {
  if (!prog[charKey]) prog[charKey] = {}
  prog[charKey][lessonId] = 1
  saveAcademyProgress(prog)
  return prog
}
export function lessonsDoneFor(prog, charKey) { return prog[charKey] ? Object.keys(prog[charKey]).length : 0 }
export function isLessonDone(prog, charKey, lessonId) { return !!(prog[charKey] && prog[charKey][lessonId]) }

// ──────────────────────────────────────────────────────────────────────────────
// LESSON GENERATION — from the hand-authored / synthesized kit (getKit). Grouped into the Academy's sections.
// A lesson = { id, section, name, input, desc, cat }. cat drives the SHOW-ME script + the success detector.
// ──────────────────────────────────────────────────────────────────────────────
export const ACADEMY_SECTIONS = ["Guided Lessons", "Basics", "Specials", "Ultimates", "Modes & Transformations", "Summons & Allies", "Mechanics & Passives"]

// Heuristic: route a special/ult into a finer section from its words (kits carry no structured requirement field;
// Phase 2 adds explicit tags — this keeps the grouping sensible until then).
function _descSection(name, desc, fallback) {
  const t = ((name || "") + " " + (desc || "")).toLowerCase()
  if (/\b(summon|clone|kuchiyose|shadow[- ]clone|partner|ally|dog|ninken|toad|gamabunta|shukaku|kurama|edo tensei|assist)\b/.test(t)) return "Summons & Allies"
  if (/\b(transform|transformation|mode|form|ladder|tier|avatar|susano|awaken|cloak|kcm|rose|ssj|bankai|overdrive|godspeed|flicker time|karma|stance)\b/.test(t)) return "Modes & Transformations"
  return fallback
}

function _mk(id, section, name, input, desc, cat) { return { id, section, name: name || "Move", input: input || "", desc: desc || "", cat } }

export function buildCharacterLessons(rosterKey, character) {
  const kit = getKit(rosterKey, character)
  if (!kit) return []
  const out = []
  let n = 0
  const add = (section, name, input, desc, cat) => out.push(_mk(`${rosterKey}:${cat}:${n++}:${(name || "").replace(/\s+/g, "_")}`, section, name, input, desc, cat))

  // BASICS — movement + guard are universal; then the kit's own basic_attacks.
  add("Basics", "Move", "Left / Right", "Walk back and forth to control spacing.", "move")
  add("Basics", "Jump", "Up", "Hop into the air — the start of air routes.", "jump")
  add("Basics", "Guard", "Block", "Hold guard to block an incoming attack.", "block")
  for (const b of (kit.basics || [])) add("Basics", b.name, b.input, b.desc, _basicCat(b))

  // SPECIALS (+ mobility) — routed into finer sections by their description.
  for (const s of (kit.specials || [])) add(_descSection(s.name, s.desc, "Specials"), s.name, s.input, s.desc, "special")
  if (kit.mobility) add("Specials", kit.mobility.name, kit.mobility.input, kit.mobility.desc, "mobility")
  for (const extra of ["flickerTime", "kotoamatsukami", "susanoo", "susanoo2", "domain"]) {
    const m = kit[extra]; if (m && m.name) add(_descSection(m.name, m.desc, "Ultimates"), m.name, m.input, m.desc, "ultimate")
  }

  // ULTIMATES
  if (kit.ultimate) add(_descSection(kit.ultimate.name, kit.ultimate.desc || kit.ultimate.effect, "Ultimates"), kit.ultimate.name, kit.ultimate.input, kit.ultimate.desc || kit.ultimate.effect, "ultimate")

  // MECHANICS & PASSIVES
  if (kit.passive && kit.passive.name) add("Mechanics & Passives", kit.passive.name, "(passive)", kit.passive.effect, "passive")
  if (kit.passiveNote) add("Mechanics & Passives", "Note", "(passive)", kit.passiveNote, "passive")

  return out
}
function _basicCat(b) {
  const t = ((b.name || "") + " " + (b.input || "")).toLowerCase()
  if (/dash|flicker step|double-?tap|teleport|shunshin/.test(t)) return "mobility"
  if (/grab|throw/.test(t)) return "grab"
  if (/air/.test(t)) return "air"
  if (/up[- ]?attack|launcher|rising/.test(t)) return "upAttack"
  if (/heavy/.test(t)) return "heavy"
  if (/light|jab|string/.test(t)) return "light"
  if (/ribcage|guard|passive|mangek|sharingan/.test(t)) return "passive"
  return "light"
}

// Group a flat lesson list into the fixed section order (skipping empties).
export function groupLessons(lessons) {
  return ACADEMY_SECTIONS.map(sec => ({ section: sec, lessons: lessons.filter(l => l.section === sec) })).filter(g => g.lessons.length)
}

// ──────────────────────────────────────────────────────────────────────────────
// INPUT NOTATION → DEVICE LABEL. Shows the prompt for the player's current device.
// glyphs = padGlyphs(getPadType()) from input.js (passed in so this stays import-light).
// ──────────────────────────────────────────────────────────────────────────────
const KB = { light: "J", heavy: "K", upAttack: "I", special: "L", ultimate: "U", grab: "O", charge: "P", block: ";", jump: "W", down: "S", forward: "D", back: "A" }
export function inputLabelForDevice(input, device, glyphs) {
  if (!input) return ""
  if (device === "pad" && glyphs) {
    // map the notation tokens to pad glyphs
    const pad = { light: glyphs.down, heavy: glyphs.left, special: glyphs.up, ultimate: `${glyphs.l2}/${glyphs.r2}`, grab: glyphs.l1, charge: glyphs.r1, upAttack: "D-Pad↑ + " + glyphs.down, block: glyphs.r1, jump: "Up" }
    return _retokenize(input, (tok) => pad[tok] || null, "D-Pad")
  }
  if (device === "touch") return input   // touch shows the on-screen button names as written
  return _retokenize(input, (tok) => KB[tok] || null, "A/D")   // keyboard (default)
}
function _retokenize(input, lookup, dirWord) {
  // normalize common tokens → device label, leave motion/modifier words intact
  return String(input)
    .replace(/\bUp-?Attack\b/gi, lookup("upAttack") || "Up-Attack")
    .replace(/\bLight\b/gi, lookup("light") || "Light")
    .replace(/\bHeavy\b/gi, lookup("heavy") || "Heavy")
    .replace(/\bSpecial\b/gi, lookup("special") || "Special")
    .replace(/\bUltimate\b/gi, lookup("ultimate") || "Ultimate")
    .replace(/\bGrab\b/gi, lookup("grab") || "Grab")
    .replace(/\bCharge\b/gi, lookup("charge") || "Charge")
    .replace(/\bBlock\b/gi, lookup("block") || "Block")
}

// ──────────────────────────────────────────────────────────────────────────────
// SHOW-ME SCRIPT — parse a move's input notation into a sequence of raw-input FRAMES. game.js replays each
// frame through writeRawControls() (the real pipeline). The demo fighter faces RIGHT, so Forward = right.
// Each frame is a plain object of REPLAY_INPUT_FIELDS booleans. We hold presses a few frames with gaps.
// ──────────────────────────────────────────────────────────────────────────────
function _hold(obj, n, out) { for (let i = 0; i < n; i++) out.push({ ...obj }) }
function _buttonField(input) {
  const t = input.toLowerCase()
  if (/ultimate/.test(t)) return "ultimate"
  if (/\bgrab\b/.test(t)) return "grab"
  if (/up-?attack/.test(t)) return "upAttack"
  if (/\bheavy\b/.test(t)) return "heavy"
  if (/\blight\b/.test(t)) return "light"
  if (/\bspecial\b/.test(t)) return "special"
  if (/\bcharge\b/.test(t)) return "charge"
  if (/\bblock|guard\b/.test(t)) return "block"
  return "special"
}
function _dirField(input) {
  const t = input.toLowerCase()
  if (/\b(forward|fwd)\b|\bf\s*\+|→/.test(t)) return "right"
  if (/\b(back)\b|\bb\s*\+|←/.test(t)) return "left"
  if (/\bup\b|↑/.test(t)) return "up"
  if (/\bdown\b|↓/.test(t)) return "down"
  return null
}
export function scriptForInput(input, cat) {
  const out = []
  const s = String(input || "").toLowerCase()
  _hold({}, 8, out)   // settle to neutral
  // basics
  if (cat === "move")  { _hold({ right: true }, 14, out); _hold({}, 4, out); _hold({ left: true }, 14, out); _hold({}, 6, out); return out }
  if (cat === "jump")  { _hold({ jump: true, up: true }, 3, out); _hold({}, 30, out); return out }
  if (cat === "block") { _hold({ block: true }, 34, out); _hold({}, 4, out); return out }
  if (cat === "air")   { _hold({ jump: true, up: true }, 3, out); _hold({}, 14, out); _hold({ light: true }, 5, out); _hold({}, 10, out); return out }
  if (cat === "grab")  { const dir = _dirField(s); if (dir) { _hold({ [dir]: true }, 3, out); _hold({ [dir]: true, grab: true }, 5, out); } else _hold({ grab: true }, 5, out); _hold({}, 10, out); return out }

  // charge-tap toggles (Sharingan etc.) — a QUICK tap (press+release), not a hold
  if (/charge-?tap/.test(s)) { const crouch = /crouch/.test(s); _hold({ charge: true, down: crouch }, 2, out); _hold({ down: crouch }, 1, out); _hold({}, 26, out); return out }
  // dash / double-tap
  if (/dash|double-?tap/.test(s)) { _hold({ right: true }, 2, out); _hold({}, 3, out); _hold({ right: true }, 6, out); _hold({}, 10, out); return out }

  const btn = _buttonField(s), dir = _dirField(s)
  // motion inputs (quarter-circles)
  if (/qcf/.test(s)) { _hold({ down: true }, 3, out); _hold({ down: true, right: true }, 3, out); _hold({ right: true }, 2, out); _hold({ right: true, [btn]: true }, 5, out); _hold({}, 8, out); return out }
  if (/qcb/.test(s)) { _hold({ down: true }, 3, out); _hold({ down: true, left: true }, 3, out); _hold({ left: true }, 2, out); _hold({ left: true, [btn]: true }, 5, out); _hold({}, 8, out); return out }

  if (dir) { _hold({ [dir]: true }, 4, out); _hold({ [dir]: true, [btn]: true }, 6, out); _hold({}, 10, out) }
  else     { _hold({ [btn]: true }, 6, out); _hold({}, 12, out) }
  return out
}

// ──────────────────────────────────────────────────────────────────────────────
// READ-ONLY DETECTION — game.js captures a plain SNAPSHOT of the fighter each frame; we compare a baseline
// (taken when TRY-IT arms) against the latest to decide if the move fired. COMPOSITE: normals via the move
// key; specials/ults/modes via an energy-drop OR a new cast-pose OR a fresh projectile OR a toggled flag.
// snapshot = { energy, attackName, castMove, attacking, projCount, formCount, dir, ult, grabbing }.
// ──────────────────────────────────────────────────────────────────────────────
const _NORMAL_KEY = { light: "light", heavy: "heavy", upAttack: "up", air: "air" }
export function detectLesson(lesson, base, now) {
  if (!base || !now) return false
  const cat = lesson.cat
  const movedFar = Math.abs((now.x || 0) - (base.x || 0)) >= 36
  const inp = (lesson.input || "").toLowerCase()
  // a dash / flicker / teleport step (even if mis-categorized as a normal) → detect by the big reposition
  if (/dash|double-?tap|flicker|teleport|shunshin|body ?flicker/.test(inp + " " + lesson.name.toLowerCase())) return movedFar || now.castMove !== base.castMove
  if (cat === "move")  return movedFar
  if (cat === "jump")  return now.airborne === true || (now.jumps || 0) > (base.jumps || 0)
  if (cat === "block") return now.blocking === true
  // normals: the universal move key (reliable)
  if (_NORMAL_KEY[cat]) return now.attackName === _NORMAL_KEY[cat] || (cat === "air" && now.attackName === "air")
  if (cat === "grab")  return !!now.grabbing || (now.castMove && /grab|throw|snatch|choke/.test(now.castMove)) || now.attackName === "grab" || (now.attacking && now.castMove !== base.castMove)
  if (cat === "passive") return (now.formCount || 0) > (base.formCount || 0) || (now.energy < base.energy - 2) || (now.castMove && now.castMove !== base.castMove)
  // specials / mobility / ultimates / modes: a composite "the move fired" signal
  const spentMeter = (now.energy || 0) < (base.energy || 0) - 2
  const newCast    = now.castMove && now.castMove !== base.castMove && now.castMove !== "idle"
  const newProj    = (now.projCount || 0) > (base.projCount || 0)
  const newForm    = (now.formCount || 0) > (base.formCount || 0)
  const newUlt     = now.ult && now.ult !== base.ult
  return spentMeter || newCast || newProj || newForm || newUlt
}

// ──────────────────────────────────────────────────────────────────────────────
// COVERAGE classifiers (Phase 3) — is a lesson a fireable move, and how is its success detected read-only?
// Also: does a move's prose imply a scenario tag it's missing? Pure functions over a lesson (+ its tags).
// ──────────────────────────────────────────────────────────────────────────────
export function lessonDetectability(lesson) {
  const c = lesson.cat
  if (c === "passive") return { fireable: false, detect: "n/a (passive)" }
  if (c === "move" || c === "jump" || c === "block") return { fireable: true, detect: "state" }
  if (c === "light" || c === "heavy" || c === "upAttack" || c === "air") return { fireable: true, detect: "move-key" }
  if (c === "grab") return { fireable: true, detect: "grab-state" }
  // specials / mobility / ultimates / modes → composite (energy drop · cast pose · projectile · form flag)
  const t = (lesson.desc || "").toLowerCase()
  const hasSignal = /projectile|fire(s|d)?\b|throw|beam|blast|bolt|shuriken|kunai|slash|strike|rush|lunge|summon|transform|mode|aura|buff|teleport|blink|\bgrab\b|stun|heal|susano|rasen|chidori|kamehameha|volley|barrage|flame|lightning|punch|kick|sword|wave|dash|charge|clone|portal/.test(t)
  return { fireable: true, detect: hasSignal ? "composite" : "composite-weak" }
}
export function lessonMissingTag(lesson, tags) {
  const t = `${lesson.name} ${lesson.desc}`.toLowerCase()
  const wants = []
  if (/\b(counter|kawarimi|substitut|reflect|parry|read)\b/.test(t) && !tags.some(x => x.startsWith("incoming"))) wants.push("incoming_melee/projectile")
  if (/anti-?air|air ?grab/.test(t) && !tags.includes("target_airborne")) wants.push("target_airborne")
  if (/corner/.test(t) && !tags.some(x => x.includes("corner"))) wants.push("corner")
  if (/(while|inside|during|only in)\s+(?:the\s+)?(susano|form|mode|sharingan|mangek|kcm|avatar|bankai|rose|karma|flicker time)/.test(t) && !tags.some(x => x.startsWith("mode_active"))) wants.push("mode_active")
  if (/\b(summon|clone|kuchiyose|ninken|bijuudama)\b/.test(t) && !tags.includes("summon_active")) wants.push("summon_active")
  if (/\b(follows?|after|links? (from|into)|on hit|re-?tap)\b/.test(t) && !tags.includes("combo_followup")) wants.push("combo_followup")
  return wants
}

// A hint escalates after 3 misses: timing / direction / slow demo.
export function hintForLesson(lesson, misses) {
  if (misses < 3) return null
  if (misses === 3) {
    const d = _dirField(lesson.input)
    if (d) return `Hold ${({ right: "Forward", left: "Back", up: "Up", down: "Down" })[d]} as you press the button.`
    if (/charge-?tap/.test((lesson.input || "").toLowerCase())) return "Tap Charge briefly — don't hold it."
    return "Press the button cleanly from neutral, then watch for the effect."
  }
  return "Here's a slow demo — watch the inputs, then match them."   // misses >= 4 → caller plays a 50% SHOW ME
}
