// Merge aivsai_batch.mjs JSON shards into one ranking (win% vs the reference set, damage margin) and show each
// fighter's current rosterParity levers. Usage: node tools/balance/weak_tier_rank.mjs shard1.json [shard2.json ...]
import fs from "node:fs"
import { ROSTER_DAMAGE_BOOST, OG_TABLE } from "../../rosterParity.js"
const rows = {}
for (const f of process.argv.slice(2)) if (fs.existsSync(f)) Object.assign(rows, JSON.parse(fs.readFileSync(f, "utf8")))
const lc = Object.fromEntries(Object.entries(OG_TABLE).map(([k, v]) => [k.toLowerCase(), v]))
const list = Object.entries(rows).map(([k, r]) => ({ k, win: r.winRate, g: r.games, margin: r.margin, err: r.err,
  boost: ROSTER_DAMAGE_BOOST[k.toLowerCase()] || 1, og: lc[k.toLowerCase()] || null })).sort((a, b) => (a.win ?? -1) - (b.win ?? -1) || a.margin - b.margin)
for (const x of list) console.log([x.k.padEnd(22), String(Math.round((x.win ?? 0) * 100)).padStart(3) + "%", String(x.g).padStart(3), String(x.margin).padStart(8),
  "boost " + x.boost, x.og ? `og ${x.og.dmg}/${x.og.hp}/${x.og.spd}` : "", x.err ? "ERR " + x.err.slice(0, 60) : ""].join("  "))
const w = list.filter(x => x.win != null).map(x => x.win)
console.log(`n=${w.length}  mean=${(w.reduce((a, b) => a + b, 0) / w.length * 100).toFixed(1)}%  <40%: ${w.filter(v => v < 0.4).length}`)
