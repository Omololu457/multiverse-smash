// padLayout.js — THE SINGLE SOURCE OF TRUTH for the in-battle controller layout.
//
// action → standard-gamepad button index → glyph position. input.js pollGamepad / readRawControls /
// pollMenuGamepad and game.js updateGamepadEdges read button indices from here, and EVERY help surface
// (kits.js Move List controls panel, game.js _controlRefForPad, the ui.js controls overlay, academy.js
// prompts) generates its controller text from here. Change the layout here and the help follows; there is
// no second table to drift. Leaf module: no imports, no DOM, safe in Node.
//
// Glyph positions are STANDARD-gamepad positions (down = bottom face button, right, left, up = top face
// button, l1/r1 shoulders, l2/r2 triggers), so one layout reads correctly on PlayStation, Xbox and Switch.

// Real layout (PlayStation names):
//   Square = Light   Triangle = Heavy   Cross = Jump   Circle = Block
//   R1 = Special     R2 = Ultimate      L1 = Grab      L2 = Charge (hold; tap = toggle)
//   D-Pad / Left stick = move, Up = Jump (when "Jump on Up" is enabled), Up + Light/Heavy = Up-Attack
export const PAD_LAYOUT = Object.freeze([
  Object.freeze({ action: "light",    label: "Light",    button: 2, glyph: "left"  }),
  Object.freeze({ action: "heavy",    label: "Heavy",    button: 3, glyph: "up"    }),
  Object.freeze({ action: "jump",     label: "Jump",     button: 0, glyph: "down"  }),
  Object.freeze({ action: "block",    label: "Block",    button: 1, glyph: "right" }),
  Object.freeze({ action: "special",  label: "Special",  button: 5, glyph: "r1"    }),
  Object.freeze({ action: "ultimate", label: "Ultimate", button: 7, glyph: "r2"    }),
  Object.freeze({ action: "grab",     label: "Grab",     button: 4, glyph: "l1"    }),
  Object.freeze({ action: "charge",   label: "Charge",   button: 6, glyph: "l2"    }),
])

// action → button index (e.g. PAD_BUTTON.light === 2)
export const PAD_BUTTON = Object.freeze(Object.fromEntries(PAD_LAYOUT.map(r => [r.action, r.button])))
// action → glyph position (e.g. PAD_GLYPH_POS.light === "left")
export const PAD_GLYPH_POS = Object.freeze(Object.fromEntries(PAD_LAYOUT.map(r => [r.action, r.glyph])))

// Directions + sticks + menu buttons (standard mapping).
export const PAD_DPAD = Object.freeze({ up: 12, down: 13, left: 14, right: 15 })
export const PAD_AXES = Object.freeze({ leftX: 0, leftY: 1 })
export const PAD_MENU = Object.freeze({ confirm: 0, back: 1, start: 9 })   // menus: Cross confirm, Circle back, Options pause

// Glyph text per controller family, keyed by glyph position.
export const PAD_GLYPHS = Object.freeze({
  xbox:        { down: "Ⓐ A", right: "Ⓑ B", left: "Ⓧ X", up: "Ⓨ Y", l1: "LB", r1: "RB", l2: "LT", r2: "RT", label: "Xbox" },
  playstation: { down: "✕ Cross", right: "○ Circle", left: "□ Square", up: "△ Triangle", l1: "L1", r1: "R1", l2: "L2", r2: "R2", label: "PlayStation" },
  nintendo:    { down: "Ⓑ B", right: "Ⓐ A", left: "Ⓨ Y", up: "Ⓧ X", l1: "L", r1: "R", l2: "ZL", r2: "ZR", label: "Switch" },
  generic:     { down: "✕ Cross", right: "○ Circle", left: "□ Square", up: "△ Triangle", l1: "L1", r1: "R1", l2: "L2", r2: "R2", label: "Controller" }
})

// The glyph text an action is bound to, for a given glyph set (padGlyphs()).
export function padGlyphFor(action, glyphs = PAD_GLYPHS.generic) {
  const pos = PAD_GLYPH_POS[action]
  return pos ? (glyphs[pos] || pos) : null
}

// Help rows ([label, text]) for every controller help surface, generated from PAD_LAYOUT.
// opts.jumpOnUp: whether Up also jumps for this player (Phase 4 setting); defaults to true.
export function padHelpRows(glyphs = PAD_GLYPHS.generic, opts = {}) {
  const jumpOnUp = opts.jumpOnUp !== false
  const g = a => padGlyphFor(a, glyphs)
  const short = a => String(g(a)).split(" ")[0]   // "□ Square" → "□" (compact two-button rows)
  return [
    ["Move",          "L-Stick / D-Pad"],
    ["Jump",          jumpOnUp ? `${g("jump")} / Up` : g("jump")],
    ["Light",         g("light")],
    ["Heavy",         g("heavy")],
    ["Up-Attack",     `Up + ${short("light")} / ${short("heavy")}`],
    ["Block",         g("block")],
    ["Special",       g("special")],
    ["Ultimate",      g("ultimate")],
    ["Grab",          g("grab")],
    ["Charge",        `${g("charge")} (hold / tap)`],
    ["Dash",          "double-tap ← / →"],
  ]
}
