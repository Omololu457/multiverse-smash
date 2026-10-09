// harness/hinata_specials.test.mjs — deterministic unit checks for Hinata's Phase-2 ability LOGIC that
// doesn't need the browser game loop: Hakkesho Guuten projectile deflection + Byakugan buff tick + the
// per-frame no-op guard. (Cast poses / damage / drain / FX are proven live in harness/hinata_live.mjs.)
import { activeProjectiles, applyHinataGuutenToProjectiles, updateHinata } from "../abilities.js";

let fails = 0;
const ok = (c, msg) => { console.log(`  ${c ? "✅" : "❌"} ${msg}`); if (!c) fails++; };

// ── Hakkesho Guuten — deflects ENEMY projectiles inside the spin radius, keeps far ones ──
{
  const hinata = { rosterKey: "hinata", x: 100, y: 0, w: 60, h: 100, _hhGuuten: 20 };
  activeProjectiles.length = 0;
  activeProjectiles.push({ owner: { rosterKey: "naruto" }, x: 140, y: 50, vx: -8 });  // near
  activeProjectiles.push({ owner: { rosterKey: "naruto" }, x: 900, y: 50, vx: -8 });  // far
  applyHinataGuutenToProjectiles(hinata);
  ok(activeProjectiles.length === 1 && activeProjectiles[0].x === 900, "Guuten deflects the NEAR enemy projectile, keeps the far one");
}
// ── own projectiles are never deflected ──
{
  const hinata = { rosterKey: "hinata", x: 100, y: 0, w: 60, h: 100, _hhGuuten: 20 };
  activeProjectiles.length = 0;
  activeProjectiles.push({ owner: hinata, x: 140, y: 50 });
  applyHinataGuutenToProjectiles(hinata);
  ok(activeProjectiles.length === 1, "Guuten does NOT deflect Hinata's own projectiles");
}
// ── window closed → no deflect ──
{
  const hinata = { rosterKey: "hinata", x: 100, y: 0, w: 60, h: 100, _hhGuuten: 0 };
  activeProjectiles.length = 0;
  activeProjectiles.push({ owner: { rosterKey: "naruto" }, x: 140, y: 50 });
  applyHinataGuutenToProjectiles(hinata);
  ok(activeProjectiles.length === 1, "no deflect when the Guuten window is closed");
}
// ── Byakugan buff: ticks down + regenerates chakra ──
{
  const h = { rosterKey: "hinata", _hhByakugan: 3, energy: 10, maxEnergy: 160 };
  updateHinata(h);
  ok(h._hhByakugan === 2 && h.energy > 10, "Byakugan buff decrements + regens chakra");
}
// ── no-op for non-Hinata ──
{
  const o = { rosterKey: "naruto", _hhByakugan: 5, energy: 10, maxEnergy: 100 };
  updateHinata(o);
  activeProjectiles.length = 0; activeProjectiles.push({ owner: { rosterKey: "x" }, x: 0, y: 0 });
  applyHinataGuutenToProjectiles(o);
  ok(o._hhByakugan === 5 && o.energy === 10 && activeProjectiles.length === 1, "updateHinata / Guuten are no-ops for non-Hinata");
}
activeProjectiles.length = 0;

console.log(`\n  HINATA-SPECIALS LOGIC: ${5 - fails}/5 passed`);
process.exit(fails ? 1 : 0);
