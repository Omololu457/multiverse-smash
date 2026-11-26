// creative_skins.test.mjs — the roster-wide CREATIVE skins (tools/creativeskins → creativeSkins.js):
// every creative skin is registered, its art (every sheet + portrait) exists on disk, ids are unique,
// the flat / broken skins they replace are gone, and every fighter keeps its Default first.
import fs from "node:fs"
const { CREATIVE_SKINS, CREATIVE_DROP } = await import("../creativeSkins.js")
const { getSkins } = await import("../skins.js")
let pass = 0, fail = 0
const ok = (c, m) => { if (c) pass++; else { fail++; console.log("FAIL", m) } }
const f = p => fs.existsSync(String(p).replace(/^\.\//, ""))
for (const [key, list] of Object.entries(CREATIVE_SKINS)) {
  const skins = getSkins(key) || []
  ok(skins[0]?.id === "default" || key === "ghostface", `${key}: Default first`)
  const ids = skins.map(s => s.id)
  ok(new Set(ids).size === ids.length, `${key}: unique ids`)
  for (const d of CREATIVE_DROP[key] || []) ok(!ids.includes(d), `${key}: dropped ${d}`)
  for (const [tag, name] of list) {
    // Ghostface themes are worn by a killer: id "<identity>_<tag>", name "<Killer> · <theme>"
    const s = skins.find(x => key === "ghostface" ? /^ghostface[A-Z][a-z]+_/.test(x.id) && x.id.endsWith(`_${tag}`) : x.id === `${key === "cyborg" ? "cy" : key}_${tag}`)
    ok(!!s && (s.name === name || s.name.endsWith(` · ${name}`)), `${key}: ${tag} registered`)
    if (!s) continue
    const sheets = [...new Set(Object.values(s.animationData || {}).map(a => a?.sheet).filter(Boolean))]
    const missing = sheets.filter(p => !f(p))
    ok(sheets.length > 0 && missing.length === 0, `${key}/${tag}: sheets (${missing.slice(0, 2)})`)
    ok(!s.portrait || f(s.portrait), `${key}/${tag}: portrait ${s.portrait}`)
    ok(!/cyborg/i.test(s.id) && (!/AlienX$/.test(s.id)), `${key}/${tag}: id safe`)
  }
}
console.log(`creative_skins: ${pass} pass / ${fail} fail`)
process.exit(fail ? 1 : 0)
