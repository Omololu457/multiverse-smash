// harness/gaara_phase4.test.mjs — deterministic unit checks for Gaara's Phase-4 Shukaku LOGIC that runs in
// updateGaara (the per-frame driver): the One-Tail GAUGE fill (damage-taken + sand-move-hit), and the
// Shukaku channel + END conditions (3 clean hits / Block / ~12s timer). The full summon / 5 commands / TBB /
// LOSE render are proven live in gaara_live4.mjs. (No browser; no gameRng → fully deterministic.)
import { updateGaara } from "../abilities.js";

let fails = 0;
const ok = (c, msg) => { console.log(`  ${c ? "✅" : "❌"} ${msg}`); if (!c) fails++; };
const ctx = { getOpponent: () => OPP };
let OPP = { rosterKey: "naruto", x: 600, y: 0, w: 60, h: 100, eliminated: false, invulnTimer: 0 };
const mk = (o = {}) => ({ rosterKey: "gaara", x: 100, y: 0, w: 60, h: 100, vx: 0, health: 1280, energy: 180, maxEnergy: 180, facing: 1, ...o });

// ── ONE-TAIL GAUGE — fills on damage taken ──
{
  const g = mk();
  updateGaara(g, ctx);            // establishes _gaaraLastHp baseline
  g.health = 1200;               // took a hit
  updateGaara(g, ctx);
  ok((g._oneTailGauge || 0) > 0, `gauge fills when Gaara takes damage (${g._oneTailGauge})`);
}
// ── gauge fills when a sand move HITS (hitFlag) ──
{
  const g = mk();
  updateGaara(g, ctx);
  g._gaaraSandHit = true;
  updateGaara(g, ctx);
  ok((g._oneTailGauge || 0) >= 10 && !g._gaaraSandHit, `gauge fills + clears the flag on a sand-move hit (${g._oneTailGauge})`);
}
// ── gauge caps at 100 ──
{
  const g = mk({ _oneTailGauge: 95 });
  updateGaara(g, ctx); g._gaaraSandHit = true; updateGaara(g, ctx);
  updateGaara(g, ctx); g._gaaraSandHit = true; updateGaara(g, ctx);
  ok((g._oneTailGauge || 0) === 100, `gauge caps at 100 (${g._oneTailGauge})`);
}
// ── no gauge gain while Shukaku is already out ──
{
  const g = mk({ _oneTailGauge: 50, _shukaku: { timer: 700, max: 720, hitCount: 0, x: 0, y: 100, facing: 1, pose: "idle", poseT: 0, poseHold: 0, ending: false, endT: 0 } });
  updateGaara(g, ctx); g.health = 1200; updateGaara(g, ctx);
  ok((g._oneTailGauge || 0) === 50, `gauge does NOT fill while Shukaku is out (${g._oneTailGauge})`);
}

// ── CHANNEL — Gaara is locked in place (vx 0) while Shukaku is out ──
{
  const g = mk({ vx: 9, _shukaku: { timer: 700, max: 720, hitCount: 0, x: 0, y: 100, facing: 1, pose: "idle", poseT: 0, poseHold: 0, ending: false, endT: 0 } });
  updateGaara(g, ctx);
  ok(g.vx === 0, `channel locks Gaara in place (vx=${g.vx})`);
}
// ── END: 3 clean hits on Gaara ──
{
  const g = mk({ _shukaku: { timer: 700, max: 720, hitCount: 0, x: 0, y: 100, facing: 1, pose: "idle", poseT: 0, poseHold: 0, ending: false, endT: 0 } });
  updateGaara(g, ctx);           // baseline
  for (let i = 0; i < 3; i++) { g.health -= 40; updateGaara(g, ctx); }
  ok(g._shukaku && g._shukaku.ending, `3 clean hits start the LOSE sequence (hitCount=${g._shukaku?.hitCount}, ending=${g._shukaku?.ending})`);
}
// ── END: Block pressed ──
{
  const g = mk({ isBlocking: true, _shukaku: { timer: 700, max: 720, hitCount: 0, x: 0, y: 100, facing: 1, pose: "idle", poseT: 0, poseHold: 0, ending: false, endT: 0 } });
  updateGaara(g, ctx);
  ok(g._shukaku && g._shukaku.ending, `pressing Block ends the summon (ending=${g._shukaku?.ending})`);
}
// ── END: timer expiry ──
{
  const g = mk({ _shukaku: { timer: 1, max: 720, hitCount: 0, x: 0, y: 100, facing: 1, pose: "idle", poseT: 0, poseHold: 0, ending: false, endT: 0 } });
  updateGaara(g, ctx);
  ok(g._shukaku && g._shukaku.ending, `the ~12s timer ends the summon (ending=${g._shukaku?.ending})`);
}
// ── LOSE sequence clears the summon after its window ──
{
  const g = mk({ _shukaku: { timer: 700, max: 720, hitCount: 0, x: 0, y: 100, facing: 1, pose: "lose", poseT: 0, poseHold: 0, ending: true, endT: 0 } });
  for (let i = 0; i < 80; i++) updateGaara(g, ctx);
  ok(g._shukaku == null, `the LOSE sequence despawns Shukaku (shukaku=${g._shukaku})`);
}
// ── no-op for non-Gaara ──
{
  const o = { rosterKey: "naruto", health: 100, energy: 100, _oneTailGauge: 0 };
  updateGaara(o, ctx);
  ok((o._oneTailGauge || 0) === 0 && o._shukaku === undefined, `updateGaara is a no-op for non-Gaara`);
}

const TOTAL = 10;
console.log(`\n  GAARA-PHASE4 LOGIC: ${TOTAL - fails}/${TOTAL} passed`);
process.exit(fails ? 1 : 0);
