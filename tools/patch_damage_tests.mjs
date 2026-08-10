// Stage 1a — update the damage-assertion suites to the new ×0.60 effective values now that
// all damage routes through applyScaledDamage. Each entry is [file, find, replace]; find must
// occur exactly once. Run: node tools/patch_damage_tests.mjs
import { readFileSync, writeFileSync } from "node:fs"

const H = new URL("../harness/", import.meta.url)
const edits = [
  // [file, find, replace]
  ["rick.test.mjs", `fall-impact damage (42)", Math.round(hp0 - hp1) === 42`, `fall-impact damage (25 = 42×0.60)", Math.round(hp0 - hp1) === 25`],
  ["rick.test.mjs", `fall-impact damage (65)", Math.round(hp0 - hp1) === 65`, `fall-impact damage (39 = 65×0.60)", Math.round(hp0 - hp1) === 39`],
  ["vegeta.test.mjs", `(≥300, biggest in kit)", (hp0 - (await p2()).health) >= 300`, `(≥200 = 340×0.60, biggest in kit)", (hp0 - (await p2()).health) >= 200`],
  ["rengoku.test.mjs", `(range-independent ~340)", (uhp - (await p2()).health) >= 320`, `(range-independent ~204 = 340×0.60)", (uhp - (await p2()).health) >= 190`],
  ["ben10_stage4.test.mjs", `check("Omnitrix burst big guaranteed damage", hp0 - (await p2()).health > 200`, `check("Omnitrix burst big guaranteed damage (~192 = 320×0.60)", hp0 - (await p2()).health > 180`],
  ["yuji.test.mjs", `check("sure-hit damage (unblocked)", dmg >= 40 && dmg <= 65`, `check("sure-hit damage (unblocked, ~30 = 50×0.60)", dmg >= 25 && dmg <= 40`],
  ["shinobu.test.mjs", `(~300)", (uhp0 - uhpHit) >= 280`, `(~180 = 300×0.60)", (uhp0 - uhpHit) >= 170`],
  ["ichigo.test.mjs", `(~330 at 520px)", hp0 - (await p2()).health >= 250`, `(~198 = 330×0.60 at 520px)", hp0 - (await p2()).health >= 180`],
  ["superman.test.mjs", `(range-independent ~380)", (uhp - (await p2()).health) >= 360`, `(range-independent ~228 = 380×0.60)", (uhp - (await p2()).health) >= 200`],
  ["batman.test.mjs", `(~300)", uhp0 - (await p2()).health >= 250`, `(~180 = 300×0.60)", uhp0 - (await p2()).health >= 170`],
  ["goku_black_sword_cinematic.test.mjs", `check("exactly 110 damage on a clean hit (SWORD.dmg unchanged)", (hp2_0 - d2.health) === 110`, `check("exactly 66 damage on a clean hit (SWORD.dmg 110 × 0.60)", (hp2_0 - d2.health) === 66`],
  ["chrollo_bandits_echo.test.mjs", `(~300)", (a2p2 - (await p2()).health) >= 250`, `(~180 = 300×0.60)", (a2p2 - (await p2()).health) >= 170`],
  ["chrollo_bandits_echo.test.mjs", `(~300)", (cP2 - (await p2()).health) >= 250`, `(~180 = 300×0.60)", (cP2 - (await p2()).health) >= 170`],
  ["saiki.test.mjs", `check("ultimate is the biggest hit in the kit", ultDmg > 200`, `check("ultimate is the biggest hit in the kit (~180 = 300×0.60)", ultDmg > 150`],
  ["obito.test.mjs", `(~360)", dmg>=300 && dmg<=400`, `(~216 = 360×0.60)", dmg>=180 && dmg<=250`],
  ["tobi.test.mjs", `ok(jdmg>=300 && jdmg<=400, \`cinematic-band damage (~360): \${jdmg}\`)`, `ok(jdmg>=180 && jdmg<=250, \`cinematic-band damage (~216 = 360×0.60): \${jdmg}\`)`],
  ["naruto_ult_impact_shot.mjs", `check("TBB connects for 600 guaranteed damage (unblocked, clean hit)", dealt === 600`, `check("TBB connects for 360 guaranteed damage (600 × 0.60, unblocked, clean hit)", dealt === 360`],
  ["naruto_ult_impact_shot.mjs", `live tuning verified (40s / 600 / 95)`, `live tuning verified (40s / 360 eff / 95)`],
  ["omniman_stage5_shots.mjs", `(~340)", oppHP0 - oppHP1 >= 300`, `(~204 = 340×0.60)", oppHP0 - oppHP1 >= 190`],
  // stage-split files carrying their own copy of the same ultimate assertion
  ["vegeta_ssj.test.mjs", `(≥400)", (hp0 - (await p2()).health) >= 400`, `(≥240 = 420×0.60)", (hp0 - (await p2()).health) >= 240`],
  ["vegeta_ssj_blue.test.mjs", `(≥460)", (hp0 - (await p2()).health) >= 460`, `(≥280 = 480×0.60)", (hp0 - (await p2()).health) >= 280`],
  ["ichigo_stage4_shots.mjs", `(~330 at 520px)", dmg >= 250`, `(~198 = 330×0.60 at 520px)", dmg >= 180`],
  ["yuji_stage6.mjs", `sure-hit damage landed (unblocked)", r.dmg >= 40 && r.dmg <= 65`, `sure-hit damage landed (unblocked, ~30 = 50×0.60)", r.dmg >= 25 && r.dmg <= 40`],
  ["vegeta_ssj.test.mjs", `check("Self-Destruct dealt big proximity AOE damage", (hp0 - (await p2()).health) >= 150`, `check("Self-Destruct dealt big proximity AOE damage (~108 = 180×0.60)", (hp0 - (await p2()).health) >= 100`],
  // stage-split / voice / duplicate harness files carrying their own copy of the ultimate assertion
  ["batman_stage4_shots.mjs", `check("barrage deals big guaranteed damage (~300)", dmg >= 250`, `check("barrage deals big guaranteed damage (~180 = 300×0.60)", dmg >= 170`],
  ["chrollo_bandits_echo_stage4.mjs", `check("copied ULTIMATE dealt its guaranteed damage (~300)", (p2hp0 - p2hp1) >= 250`, `check("copied ULTIMATE dealt its guaranteed damage (~180 = 300×0.60)", (p2hp0 - p2hp1) >= 170`],
  ["minato.test.mjs", `check("TBB guaranteed damage, survivable", dmg > 400 && (await p2()).health > 0`, `check("TBB guaranteed damage, survivable (~360 = 600×0.60)", dmg > 300 && (await p2()).health > 0`],
  ["minato_stage6.mjs", `check("TBB dealt guaranteed damage", dmg > 400`, `check("TBB dealt guaranteed damage (~360 = 600×0.60)", dmg > 300`],
  ["miwa.test.mjs", `check("GUARANTEED range-independent slash (~280 at 520px)", dmg >= 200`, `check("GUARANTEED range-independent slash (~168 = 280×0.60 at 520px)", dmg >= 150`],
  ["miwa_stage4_shots.mjs", `check("GUARANTEED range-independent damage landed (~280)", dmg >= 200`, `check("GUARANTEED range-independent damage landed (~168 = 280×0.60)", dmg >= 150`],
  ["obito_stage7_shots.mjs", `check("opponent took the guaranteed cinematic-band damage (~360)", dmg >= 300 && dmg <= 400`, `check("opponent took the guaranteed cinematic-band damage (~216 = 360×0.60)", dmg >= 180 && dmg <= 250`],
  ["omniman.test.mjs", `check("guaranteed body-slam damage lands (~340)", oppHP0 - (await p2()).health >= 300`, `check("guaranteed body-slam damage lands (~204 = 340×0.60)", oppHP0 - (await p2()).health >= 190`],
  ["rengoku_stage5_shots.mjs", `check("guaranteed detonation damage lands (range-independent ~340)", dealt >= 320`, `check("guaranteed detonation damage lands (range-independent ~204 = 340×0.60)", dealt >= 190`],
  ["shinobu_stage4.mjs", `check("STRIKE deals guaranteed direct damage (range-independent, ~300)", directDmg >= 280`, `check("STRIKE deals guaranteed direct damage (range-independent, ~180 = 300×0.60)", directDmg >= 170`],
  ["superman_stage5_shots.mjs", `check("guaranteed detonation damage lands (~380, range-independent)", dmg >= 360`, `check("guaranteed detonation damage lands (~228 = 380×0.60, range-independent)", dmg >= 200`],
  ["tobi_stage6_shots.mjs", `ok(dmg >= 300 && dmg <= 400, \`foe took the guaranteed cinematic-band damage (~360): dmg=\${dmg}\`)`, `ok(dmg >= 180 && dmg <= 250, \`foe took the guaranteed cinematic-band damage (~216 = 360×0.60): dmg=\${dmg}\`)`],
  ["ghostface_stage1_abilities.mjs", `check("Ultimate dealt heavy guaranteed damage (~≥280)", (h0 - hUlt) >= 280`, `check("Ultimate dealt heavy guaranteed damage (~180 = 300×0.60)", (h0 - hUlt) >= 170`],
  ["shinobu_voice.test.mjs", `check("strike damage landed AFTER the activation line (≥280 direct)", dmgFull >= 280`, `check("strike damage landed AFTER the activation line (≥180 = 300×0.60 direct)", dmgFull >= 170`],
  ["samurai_red_voice.test.mjs", `check("strike damage landed AFTER the activation line (≥300 direct)", dmgFull >= 300`, `check("strike damage landed AFTER the activation line (≥204 = 340×0.60 direct)", dmgFull >= 190`],
  ["sukuna_cursed_slash.mjs", `check("unblocked → ~full damage (~100)", (eHP0 - eHP1) >= 80`, `check("unblocked → ~full damage (~60 = 100×0.60)", (eHP0 - eHP1) >= 50`],
]

let done = 0, skipped = 0
for (const [file, find, replace] of edits) {
  const url = new URL(file, H)
  const src = readFileSync(url, "utf8")
  const count = src.split(find).length - 1
  if (count === 0 && src.includes(replace)) { console.log(`• ${file} (already patched)`); skipped++; continue }
  if (count !== 1) { console.error(`✗ ${file}: find matched ${count}× (expected 1) — ${find.slice(0, 50)}`); process.exit(1) }
  writeFileSync(url, src.replace(find, replace))
  console.log(`✓ ${file}`)
  done++
}
console.log(`\nPatched ${done} assertions (${skipped} already patched)`)
