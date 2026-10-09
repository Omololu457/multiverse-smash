// harness/gaara_phase2.test.mjs — deterministic unit checks for Gaara's Phase-2 ability LOGIC that doesn't
// need the browser game loop: Ultimate Defense projectile-stop (standing-still gate + melee-immunity +
// energy cost + cooldown), Sand Armor (defenseMultiplier on/off + per-hit drain), the Sand Coffin bind
// tick, and the per-frame no-op guard. (Cast poses / FX / in-match binds are proven live in gaara_live2.mjs.)
import { activeProjectiles, applyGaaraUltimateDefense, updateGaara } from "../abilities.js";

let fails = 0;
const ok = (c, msg) => { console.log(`  ${c ? "✅" : "❌"} ${msg}`); if (!c) fails++; };
const mkGaara = (o = {}) => ({ rosterKey: "gaara", x: 100, y: 0, w: 60, h: 100, vx: 0, grounded: true, onGround: true, attacking: false, hitstun: 0, energy: 180, maxEnergy: 180, health: 1280, ...o });

// ── ULTIMATE DEFENSE — stops the FIRST incoming enemy projectile while standing still + Sand ≥ threshold ──
{
  const g = mkGaara();
  activeProjectiles.length = 0;
  activeProjectiles.push({ owner: { rosterKey: "naruto" }, x: 60, y: 50, vx: 8 });   // left of Gaara, moving RIGHT (toward) → incoming
  const e0 = g.energy;
  applyGaaraUltimateDefense(g);
  ok(activeProjectiles.length === 0 && g.energy < e0 && g._gaaraUltDefCd > 0, "Ultimate Defense stops the incoming projectile + spends Sand + sets cooldown");
}
// ── only the FIRST (one per use); and a RECEDING projectile is ignored ──
{
  const g = mkGaara();
  activeProjectiles.length = 0;
  activeProjectiles.push({ owner: { rosterKey: "naruto" }, x: 60, y: 50, vx: 8 });    // incoming
  activeProjectiles.push({ owner: { rosterKey: "naruto" }, x: 61, y: 50, vx: 8 });    // also incoming
  applyGaaraUltimateDefense(g);
  ok(activeProjectiles.length === 1, "Ultimate Defense stops only ONE projectile per activation");
}
{
  const g = mkGaara();
  activeProjectiles.length = 0;
  activeProjectiles.push({ owner: { rosterKey: "naruto" }, x: 150, y: 50, vx: 8 });   // right of Gaara (x150>100) moving RIGHT → receding
  applyGaaraUltimateDefense(g);
  ok(activeProjectiles.length === 1, "a RECEDING projectile is NOT stopped (never a melee/retreating guard)");
}
// ── never triggers while MOVING (not standing still) ──
{
  const g = mkGaara({ vx: 6 });
  activeProjectiles.length = 0;
  activeProjectiles.push({ owner: { rosterKey: "naruto" }, x: 60, y: 50, vx: 8 });
  applyGaaraUltimateDefense(g);
  ok(activeProjectiles.length === 1, "no projectile-stop while Gaara is moving");
}
// ── never triggers below the Sand threshold ──
{
  const g = mkGaara({ energy: 10 });
  activeProjectiles.length = 0;
  activeProjectiles.push({ owner: { rosterKey: "naruto" }, x: 60, y: 50, vx: 8 });
  applyGaaraUltimateDefense(g);
  ok(activeProjectiles.length === 1, "no projectile-stop when Sand is below threshold");
}
// ── own projectiles are never stopped ──
{
  const g = mkGaara();
  activeProjectiles.length = 0;
  activeProjectiles.push({ owner: g, x: 60, y: 50, vx: 8 });
  applyGaaraUltimateDefense(g);
  ok(activeProjectiles.length === 1, "Gaara's OWN projectile is never stopped");
}

// ── SAND ARMOR — defenseMultiplier buffed while Sand high; drains on a hit; reverts when Sand low ──
{
  const g = mkGaara({ energy: 180, defenseMultiplier: 1 });
  updateGaara(g);
  ok(g.defenseMultiplier > 1, "Sand Armor raises defenseMultiplier while Sand is high");
}
{
  const g = mkGaara({ energy: 180, health: 1280 });
  updateGaara(g);              // establishes _gaaraLastHp = 1280 + armor ON
  g.health = 1200;            // took a hit
  const e1 = g.energy;
  updateGaara(g);
  ok(g.energy < e1, "Sand Armor spends Sand when a hit lands");
}
{
  const g = mkGaara({ energy: 180, defenseMultiplier: 1 });
  updateGaara(g);              // armor ON
  g.energy = 10;              // Sand drops below threshold
  updateGaara(g);
  ok(g.defenseMultiplier === 1, "Sand Armor reverts defenseMultiplier once Sand runs low");
}

// ── SAND COFFIN bind tick — keeps the stored target pinned, then releases ──
{
  const opp = { rosterKey: "naruto", eliminated: false, hitstun: 0, vx: 7 };
  const g = mkGaara({ _coffinBind: 2, _coffinTarget: opp });
  updateGaara(g);
  ok(g._coffinBind === 1 && opp.hitstun > 0 && opp.vx === 0, "Coffin bind pins the foe (hitstun + zero velocity) and counts down");
}

// ── no-op for non-Gaara ──
{
  const o = { rosterKey: "naruto", energy: 180, defenseMultiplier: 1, health: 100 };
  updateGaara(o);
  activeProjectiles.length = 0; activeProjectiles.push({ owner: { rosterKey: "x" }, x: 0, y: 0, vx: 1 });
  applyGaaraUltimateDefense({ rosterKey: "naruto", energy: 180, x: 0, y: 0, w: 60, h: 100, vx: 0, grounded: true });
  ok(o.defenseMultiplier === 1 && activeProjectiles.length === 1, "updateGaara / Ultimate Defense are no-ops for non-Gaara");
}
activeProjectiles.length = 0;

const TOTAL = 11;
console.log(`\n  GAARA-PHASE2 LOGIC: ${TOTAL - fails}/${TOTAL} passed`);
process.exit(fails ? 1 : 0);
