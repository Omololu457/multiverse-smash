// controls_lab/notation.js — the kits' free-text input notation → a frame-exact raw-input SCRIPT + a STEP list.
//
// Pure + deterministic. Input is whatever kits.js says ("↓↘→ + Special", "Air Down + Heavy", "Light, fresh Light",
// "Hold Charge (≥ 18 f)", "Double-tap toward"…). Output:
//   script : [raw, raw, …]  one REPLAY_INPUT_FIELDS object per 60 Hz logic frame (fed through the real pipeline)
//   steps  : [{ kind, dirs:[numpad…], buttons:[field…], hold, at }]  — what the controller GUIDE shows and what a
//            trial judges, `at` = the script frame the step's button goes down.
// Scripts are authored FACING RIGHT (Forward = right); engine.mirrorRaw() flips them when the fighter faces left.

const BTN = { light: "light", heavy: "heavy", special: "special", ultimate: "ultimate", grab: "grab", charge: "charge", block: "block", "up-attack": "upAttack", upattack: "upAttack" }
// numpad (facing right): 1 ↙ 2 ↓ 3 ↘ 4 ← 5 · 6 → 7 ↖ 8 ↑ 9 ↗
const ARROW = { "↓": 2, "↘": 3, "→": 6, "↙": 1, "←": 4, "↗": 9, "↑": 8, "↖": 7 }
const WORD_DIR = { "down-forward": 3, "down-back": 1, "up-forward": 9, "up-back": 7, forward: 6, fwd: 6, toward: 6, back: 4, up: 8, down: 2, crouch: 2, neutral: 5, left: 4, right: 6 }
export function dirRaw(n) { return { left: [1, 4, 7].includes(n), right: [3, 6, 9].includes(n), down: n <= 3, up: n >= 7 } }

// Pick the primary form of a notation: the first alternative, without "(…)" qualifiers.
export function primaryForm(input) {
  let s = String(input || "").replace(/\s+/g, " ").trim()
  const qual = (s.match(/\(([^)]*)\)/g) || []).join(" ").toLowerCase()
  s = s.replace(/\([^)]*\)/g, " ").replace(/—.*$/, " ")
  s = s.split(/\s+\/\s+|;|\bor\b/)[0]          // "Light / Heavy" → "Light", "X, or Y" → "X"
  return { form: s.replace(/\s+/g, " ").trim(), qual }
}

// Parse one notation into steps. Returns { steps, air, conditional, unparsed }.
export function parseNotation(input, cat) {
  const raw = String(input || "")
  const { form, qual } = primaryForm(raw)
  const low = form.toLowerCase()
  const out = { steps: [], air: false, conditional: false, note: null }
  if (/\b(needs|only|while|inside|in a|in the stance|with an armed|after|armed|marked|stage|set\b|in water|touches|resolved|confirmed|retap)\b/i.test(raw)) out.conditional = true

  // whole-move shapes first
  if (cat === "move" || /^left \/ right$|^move\b/.test(low)) { out.steps.push({ kind: "walk", dirs: [6], frames: 18 }, { kind: "walk", dirs: [4], frames: 18 }); return out }
  if (cat === "block" || /^block$/.test(low)) { out.steps.push({ kind: "hold", dirs: [5], buttons: ["block"], frames: 34 }); return out }
  if (cat === "jump" && /^up$/.test(low)) { out.steps.push({ kind: "jump" }); return out }
  if (/double-?tap|^dash\b|dodge/.test(low) && !/special|light|heavy/.test(low)) {
    const back = /back|←|left/.test(low) && !/toward|right|forward/.test(low)
    if (/^(jump|air)\b|\bin the air\b/.test(low)) out.air = true   // "Jump, then double-tap" = an AIR dash / slide: jump first
    out.steps.push({ kind: "doubletap", dirs: [back ? 4 : 6] }); return out
  }

  // air prefix: "Air …", "Down-Air", "jump +", "in the air"
  let rest = low
  if (/^(air\b|jump\b|down-air|in the air)|\bin the air\b|jump \+|airborne/.test(rest) || cat === "air") {
    out.air = true
    rest = rest.replace(/^air\s*\+?\s*/, "").replace(/^jump( in the air| while airborne)?\s*\+?\s*/, "").replace(/\bin the air\b/, "")
    if (/^down-air/.test(rest)) rest = "down + " + (/(light|heavy|special)/.exec(raw.toLowerCase().replace(/^.*?jump \+/, ""))?.[1] || "heavy")
  }
  // "Down-Air (jump + Heavy)" style: the button lives in the qualifier
  if (out.air && !/(light|heavy|special|ultimate|grab|charge|up-?attack)/.test(rest)) {
    const b = /(light|heavy|special)/.exec(qual)?.[1] || (/down/.test(low) ? "heavy" : "light")
    rest = (/down/.test(low) ? "down + " : "") + b
  }
  if (cat === "air" && /^up-?attack$/.test(rest.trim())) rest = "up + light"

  // sequences: "A, fresh B, fresh C" / "A → B → C" / "A · B"
  const parts = rest.split(/\s*(?:,|→(?=\s*(?:fresh|light|heavy|special|forward|down|up|back|clean))|then)\s*/).map(p => p.replace(/\b(fresh|clean|again)\b/g, "").trim()).filter(Boolean)
  for (const p of parts) {
    const st = parseChord(p, qual)
    if (st) out.steps.push(st)
  }
  if (!out.steps.length) out.unparsed = true
  return out
}

// One chord: optional motion/direction + button(s), or a hold/charge.
function parseChord(p, qual) {
  const s = p.toLowerCase()
  const step = { kind: "press", dirs: [], buttons: [], hold: 0 }
  // buttons
  for (const [w, f] of Object.entries(BTN)) if (new RegExp(`\\b${w.replace("-", "-?")}\\b`).test(s)) step.buttons.push(f)
  if (/\bup-?attack\b/.test(s)) step.buttons = step.buttons.filter(b => b !== "light" && b !== "heavy")   // "Up-Attack" is its own button
  // hold / charge-release
  const fm = /(\d+)\s*f\b/.exec(s + " " + qual)
  if (/\bhold\b/.test(s) || /\bhold\b/.test(qual) || /release/.test(s)) step.hold = fm ? Math.max(+fm[1] + 4, 20) : (/charge/.test(s) ? 60 : 40)
  if (/\btap\b/.test(s) && /charge/.test(s)) step.hold = 2
  // motion: arrows / QCF / QCB / "Down, Forward" / "→→" / "↓↓"
  const arrows = []
  for (const ch of s) { if (ARROW[ch]) arrows.push(ARROW[ch]); else if (ch === "·" && arrows.length) arrows.push(5) }
  if (/\bqcf\b/.test(s)) arrows.push(2, 3, 6)
  if (/\bqcb\b/.test(s)) arrows.push(2, 1, 4)
  if (arrows.length) { step.kind = "motion"; step.dirs = arrows }
  else {
    // word directions, in order of appearance ("Down, Back + Special" is split earlier; "Down-Back" is one dir)
    const words = s.match(/down-forward|down-back|up-forward|up-back|forward|fwd|toward|back|up(?!-?attack)|down|crouch|neutral|left|right/g) || []
    const dirs = words.map(w => WORD_DIR[w]).filter(d => d != null)
    if (dirs.length > 1) { step.kind = "motion"; step.dirs = dirs }
    else if (dirs.length === 1) step.dirs = dirs
  }
  if (!step.buttons.length && !step.dirs.length) return null
  if (!step.buttons.length && step.dirs.length) step.kind = step.kind === "motion" ? "motion" : "dir"
  return step
}

// Steps → frame script. Gaps are short + human ("brisk") so wall-clock motion windows are met at 1x and 0.5x.
export function stepsToScript(parsed, { gap = 14 } = {}) {
  const S = [], hold = (o, n) => { for (let i = 0; i < n; i++) S.push({ ...o }) }
  const at = []
  hold({}, 8)                                                  // settle to neutral
  if (parsed.air) { hold({ jump: true, up: true }, 3); hold({}, 9) }
  parsed.steps.forEach((st, i) => {
    if (i > 0) hold({}, st.kind === "press" && !st.dirs.length ? 2 : 3)
    if (st.kind === "walk") { at.push(S.length); hold(dirRaw(st.dirs[0]), st.frames); hold({}, 4); return }
    if (st.kind === "jump") { at.push(S.length); hold({ jump: true, up: true }, 3); hold({}, 30); return }
    if (st.kind === "doubletap") { const d = dirRaw(st.dirs[0]); at.push(S.length); hold(d, 2); hold({}, 3); hold(d, 6); hold({}, 10); return }
    const btns = Object.fromEntries((st.buttons || []).map(b => [b, true]))
    if (st.kind === "motion") {
      st.dirs.slice(0, -1).forEach((d, j) => { hold(d === 5 ? {} : dirRaw(d), 3); if (st.dirs[j + 1] === d) hold({}, 2) })
      const last = st.dirs[st.dirs.length - 1]
      const dl = last === 5 ? {} : dirRaw(last)
      if (st.buttons.length) { hold(dl, 1); at.push(S.length); hold({ ...dl, ...btns }, Math.max(5, st.hold || 0)) }
      else { at.push(S.length); hold(dl, 6) }
    } else if (st.kind === "dir") { at.push(S.length); hold(dirRaw(st.dirs[0]), 8) }
    else {
      const d = st.dirs.length ? dirRaw(st.dirs[0]) : {}
      if (st.dirs.length) hold(d, 3)
      at.push(S.length)
      hold({ ...d, ...btns }, st.hold || 5)
      if (st.hold > 5) hold(d, 1)
    }
    if (i === parsed.steps.length - 1) hold({}, gap + 10)
    else hold({}, Math.max(2, gap - 8))
  })
  return { script: S, at }
}

// Numpad (facing-relative) + button fields for one raw frame — the INPUT HISTORY / trial vocabulary.
export function rawToNumpad(raw, facing = 1) {
  const fwd = facing >= 0 ? raw.right : raw.left, back = facing >= 0 ? raw.left : raw.right
  const h = fwd && !back ? 1 : back && !fwd ? -1 : 0
  const v = raw.up || raw.jump ? 1 : raw.down ? -1 : 0
  return 5 + h + v * 3
}
export const BUTTON_FIELDS = ["light", "heavy", "upAttack", "special", "ultimate", "grab", "charge", "block", "jump"]
export function rawButtons(raw) { return BUTTON_FIELDS.filter(f => raw[f]) }
export const NUMPAD_ARROW = { 1: "↙", 2: "↓", 3: "↘", 4: "←", 5: "•", 6: "→", 7: "↖", 8: "↑", 9: "↗" }
