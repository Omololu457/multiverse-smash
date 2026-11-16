// controls_lab/moves.js — the MOVE LIST, generated from the game's own data (never hand-written, never copied):
//   academy.buildCharacterLessons(key, character)  → name / input notation / description / category per move
//   kits.getKit(key, character)                    → cost (and the kit text)
//   characters[key].basic_attacks / specials / ultimate → damage / startup / active / recovery (where the data has it)
// Each move also gets a frame-exact demo script (notation.js) and tags derived from its data + description.
import { parseNotation, stepsToScript } from "./notation.js"

const NORMAL_KEY = { light: ["light", "crouchLight", "lowAttack"], heavy: ["heavy"], upAttack: ["upAttack"], air: ["airAttack", "airHeavy", "air_heavy", "downAir"], grab: ["grab"] }

function pickBasic(C, cat, input) {
  const B = C.basic_attacks || {}
  const t = String(input || "").toLowerCase()
  if (cat === "air" && /down/.test(t)) return B.downAir || B.airHeavy || B.air_heavy || null
  if (cat === "air" && /heavy/.test(t)) return B.airHeavy || B.air_heavy || B.airAttack || null
  if (cat === "light" && /down|crouch/.test(t)) return B.crouchLight || B.lowAttack || B.light || null
  for (const k of NORMAL_KEY[cat] || []) if (B[k]) return B[k]
  return null
}
const norm = s => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "")
function pickSpecial(C, name, input) {
  const S = C.specials || {}
  const list = Array.isArray(S) ? S : Object.values(S)
  const n = String(name || "").toLowerCase()
  return list.find(s => s && (String(s.name || "").toLowerCase() === n)) ||
         (!Array.isArray(S) && S[Object.keys(S).find(k => norm(k) === norm(name))]) ||
         list.find(s => s && s.input && String(s.input).toLowerCase() === String(input || "").toLowerCase()) || null
}
// The direction a special's OWN data names ("Fwd: advancing rush…", "Back: counter stance…"), as kit notation.
const DATA_DIR = { neutral: "Special", fwd: "Forward + Special", forward: "Forward + Special", up: "Up + Special", down: "Down + Special", back: "Back + Special" }
function dataInput(fd) {
  const m = /^\s*(neutral|fwd|forward|up|down|back)\s*:/i.exec(String(fd?.effect || fd?.description || ""))
  return m ? DATA_DIR[m[1].toLowerCase()] : null
}

export function tagsFor(lesson, data, parsed) {
  const name = lesson.name.toLowerCase(), inp = lesson.input.toLowerCase(), desc = (lesson.desc || "").toLowerCase()
  const tags = []
  const lowInput = /\b(down|crouch)\b|↓|↙|↘/.test(inp) && !parsed?.air && /(light|heavy|kick|sweep)/.test(inp + " " + name)
  if (lowInput || /\bsweep\b|\blow (kick|thrust|attack|slash)/.test(name + " " + desc)) tags.push("low")
  if (/overhead/.test(name + " " + desc) || (parsed?.air && /down/.test(inp))) tags.push("overhead")
  if (lesson.cat === "upAttack" || data?.launcher || /\blaunch(er|es)?\b/.test(desc)) tags.push("launcher")
  if (lesson.cat !== "grab" && /projectile|beam|blast|bolt|shuriken|kunai|arrow|bullet|fireball|energy ball|\bwave\b|\bshot\b/.test(name + " " + desc)) tags.push("projectile")
  if (/invinc|intangib|armou?r|\bcounter|parry/.test(name + " " + desc)) tags.push("invincible")
  if (parsed?.air) tags.push("air only")
  if (parsed?.conditional) tags.push("form only")
  return tags
}

// Move cards for one character (passives are listed separately as notes; they have nothing to perform).
export function buildMoves(mods, key) {
  const { academy, kits, characters } = mods
  const C = characters[key]
  if (!C) return { moves: [], notes: [] }
  const lessons = academy.buildCharacterLessons(key, C)
  const kit = kits.getKit(key, C) || {}
  const kitItems = [...(kit.basics || []), ...(kit.specials || []), kit.mobility, kit.ultimate].filter(Boolean)
  const moves = [], notes = []
  for (const l of lessons) {
    if (l.cat === "passive") { notes.push({ name: l.name, desc: l.desc }); continue }
    let fd = null
    if (NORMAL_KEY[l.cat]) fd = pickBasic(C, l.cat, l.input)
    else if (l.cat === "ultimate") fd = C.ultimate || null
    else if (l.cat === "special" || l.cat === "mobility") fd = pickSpecial(C, l.name, l.input)
    const ki = kitItems.find(k => k.name === l.name)
    const cost = ki?.cost ?? fd?.cost ?? null
    // ENGINE TRUTH over kit text: the universal Down-Air is airborne ↓ + LIGHT (game.js buildNormalControlState:
    // `downAir: airborne && light && down`). Some kit entries write "Down-Air (jump + Heavy)"; the Lab teaches the
    // input the engine actually reads and says so on the card.
    let input = l.input, desc = l.desc, also = null, fix = null
    if (/^down-?air\b/i.test(String(l.input).trim())) {
      if (/heavy/i.test(l.input)) fix = `Engine input: jump, then ↓ + Light (the kit text says "${l.input}").`
      input = "Air Down + Light"; also = "down_air"
    } else if (["light", "heavy", "upAttack", "air"].includes(l.cat) && !parseNotation(l.input, l.cat).conditional) also = "*"   // a plain normal: the
    // demo presses only that button, so ANY attack starting is the move (form variants rename it, e.g. Shikai normals)
    // a normal the kit lists but the fighter has no engine data for (combat._getMD → null → the press does nothing)
    const B = C.basic_attacks || {}
    const unavailable = l.cat === "air" && (also === "down_air" ? !(B.downAir || B.down_air) : !(B.airAttack || B.air || B.air_attack || B.airHeavy || B.air_heavy))
    if (unavailable) fix = `${fix ? fix + " " : ""}Not in this fighter's engine data yet — pressing it does nothing.`
    // the special's own data names its direction and the kit text disagrees → teach the data's direction
    const di = l.cat === "special" ? dataInput(fd) : null
    if (di && /^((forward|back|up|down)\s*\+\s*)?special$/i.test(String(l.input).trim()) && norm(di) !== norm(l.input)) {
      fix = `${fix ? fix + " " : ""}Input from the move's data: ${di} (the kit text says "${l.input}").`; input = di
    }
    const parsed = parseNotation(input, l.cat)
    const { script, at } = stepsToScript(parsed)
    moves.push({
      id: l.id, name: l.name, input, kitInput: l.input, desc: fix ? `${desc || ""} ${fix}`.trim() : desc, cat: l.cat, section: l.section,
      unavailable,
      also: l.cat === "grab" ? "grabbed" : also,   // extra engine signal: this attack name also counts as "performed"
      gap: l.cat === "grab" ? 6 : 34,         // grabs need the foe inside the 75 px grab reach (combat.resolveGrab)
      damage: num(fd?.damage), startup: num(fd?.startup), active: num(fd?.active), recovery: num(fd?.recovery),
      cost: num(cost), tags: unavailable ? ["not in engine"] : tagsFor(l, fd, parsed), parsed, script, at, lesson: l,
    })
  }
  return { moves, notes, kit }
}
const num = v => (typeof v === "number" && isFinite(v) ? v : null)
