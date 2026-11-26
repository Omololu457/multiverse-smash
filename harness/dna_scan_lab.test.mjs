// DNA SCAN in the CONTROLS LAB — Ben / Albedo / Kevin: the three DNA move cards play for real (scannable Naruto dummy,
// scan / transform prep with the meter kept full), no DNA rows leak into the fatality list, and other moves go back to
// the mirror dummy.  USAGE: node harness/dna_scan_lab.test.mjs  (starts its own static server)
import { startServer, launch, openLab, checker } from "./controls_lab_common.mjs"
const { server, base } = await startServer(); const browser = await launch(); const C = checker()
for (const ch of ["ben10", "albedo", "kevin_levin"]) {
  const { page, errs } = await openLab(browser, base, ch)
  const out = await page.evaluate(async () => {
    const { S, eng, api } = window.__lab
    const res = { fat: S.moves.filter(m => /DNA.*FATALITY/.test(m.name)).length, rows: {} }
    const snap = () => { const f = eng.h.kevinTest.raw(), d = f._dna || {}; return { scanKey: d.scanKey, active: !!d.active, rk: f.rosterKey } }
    for (const m of S.moves.filter(m => /DNA/.test(m.name))) {
      let sawActive = false; const fn = () => { if (eng.h.kevinTest.raw()._dna?.active) sawActive = true }; eng.listeners.add(fn)
      const r = await api.runMoveDemo(m); eng.listeners.delete(fn)
      res.rows[m.name] = { fired: !!r?.fired, p2: eng.p2Key, sawActive, ...snap() }
    }
    await api.runMoveDemo(S.moves.find(m => m.cat === "heavy") || S.moves[0]); res.after = eng.p2Key
    return res
  })
  const R = out.rows, sc = R["DNA Scan"], al = R["DNA Alien (6th slot)"], dr = R["Drop the DNA form"]
  C.check(`${ch}: no DNA rows in the fatality list`, out.fat === 0, out.fat)
  C.check(`${ch}: DNA Scan stores the dummy (naruto)`, sc?.fired && sc.p2 === "naruto" && sc.scanKey === "naruto" && !sc.active, JSON.stringify(sc))
  C.check(`${ch}: DNA Alien turns into it`, al?.fired && al.active && al.rk === "naruto", JSON.stringify(al))
  C.check(`${ch}: Drop turns back`, dr?.fired && dr.sawActive && !dr.active && dr.rk === ch, JSON.stringify(dr))
  C.check(`${ch}: other moves use the mirror dummy again`, out.after === ch, out.after)
  const bad = errs.filter(e => !/api\/health|Failed to load resource/.test(e)); C.check(`${ch}: no page errors`, !bad.length, bad.slice(0, 3).join(" | "))
  await page.close()
}
await browser.close(); server.close()
console.log(`\n${C.pass} passed, ${C.fail} failed`); process.exit(C.fail ? 1 : 0)
