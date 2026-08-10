// MK-feel Stage 1c — the block input moved off Down onto the dedicated ';' (P1) key. Update harness
// tests that used to BLOCK by holding 's': convert `keyboard.down("s")`/`up("s")` → ';' but ONLY when
// the hold is within ±4 lines of a BLOCK/guard assertion (so down-air `s+j`, down-motion specials, and
// 1-frame down-taps for special variants are left as 's'). Run: node tools/migrate_block_key.mjs
import { readFileSync, writeFileSync } from "node:fs"

const H = new URL("../harness/", import.meta.url)
const FILES = [
  "batman.test.mjs", "batman_stage1_shots.mjs", "beerus.test.mjs", "chrollo_stage1.mjs",
  "flash.test.mjs", "flash_stage1_shots.mjs", "flash_stage4_shots.mjs", "ghostface_stage1_shots.mjs",
  "gon.test.mjs", "hisoka.test.mjs", "hisoka_stage1.mjs", "inosuke_stage1.mjs",
  "killua.test.mjs", "killua_stage1.mjs", "minato_stage1_shots.mjs", "netero.test.mjs",
  "netero_stage1.mjs", "obito.test.mjs", "obito_stage1_shots.mjs", "omniman_stage1_shots.mjs",
  "rengoku_stage1_shots.mjs", "rengoku.test.mjs", "tobirama_stage1_shots.mjs", "vegeta.test.mjs",
  "vegeta_ssj.test.mjs", "absolute_defense.test.mjs", "kawarimi.test.mjs", "substitution.test.mjs",
  "goku_black.test.mjs", "charge_lockout.test.mjs",
]
// A line that ASSERTS / comments a block state (near which a down-hold is a block hold, not down-air/motion).
const BLOCK_CTX = /action === "guard"|=== "guard"|acts\[0\] === "guard"|\.blocking\b|isBlocking|holds guard|normal block|→ block|= block|hold DOWN|holding Down|CANNOT block|guard resolves|guard →|guard uses|guard renders|renders .*guard|blocks \(hold/i
// A line where 's' is part of a NON-block combo (down-air / attack-cancel) — never convert these.
const COMBO = /down\("[jkl]"\)|up\("[jkl]"\)|down\("[jkl] |waitFrames\(1\)\b|wf\(1\)\b/

let total = 0
for (const file of FILES) {
  const url = new URL(file, H)
  const lines = readFileSync(url, "utf8").split("\n")
  let n = 0
  const out = lines.map((line, i) => {
    if (!/keyboard\.(down|up)\("s"\)/.test(line)) return line
    if (COMBO.test(line)) return line                                   // down-air / attack combo / 1-frame tap → keep 's'
    const near = lines.slice(Math.max(0, i - 4), i + 5).some(l => BLOCK_CTX.test(l))
    if (!near) return line                                              // not a block hold → keep 's'
    n++
    return line.replace(/keyboard\.(down|up)\("s"\)/g, 'keyboard.$1(";")')
  })
  if (n) { writeFileSync(url, out.join("\n")); total += n; console.log(`✓ ${file}: ${n} block-hold(s) → ';'`) }
}
console.log(`\nConverted ${total} block-hold occurrences across the harness`)
