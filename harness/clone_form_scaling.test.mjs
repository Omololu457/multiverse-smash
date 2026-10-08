// harness/clone_form_scaling.test.mjs — STAGE 6 UNIT verification of the form-dependent clone multipliers.
// Pure (no browser): imports cloneFormScaling.js and asserts the deterministic stage detection for EVERY
// clone character's REAL in-code form flag, the linear-clones / sublinear-damage / modest-cost multiplier
// tables, the symmetric formation fan (identity at the base 4), the MAX_LIVE_CLONES cap, and hit rounding.
import { cloneFormStage, cloneScaling, formationOffsets, formationCloneCount, scaleHitDamage, MAX_LIVE_CLONES } from "../cloneFormScaling.js";
let pass = 0, fail = 0; const check = (n, c, e = "") => { console.log(`${c ? "✓" : "✗"} ${n}${e ? "  — " + e : ""}`); c ? pass++ : fail++; };
const F = (rosterKey, extra = {}) => ({ rosterKey, ...extra });

// ── STAGE DETECTION per REAL form flag (no invented forms) ──
console.log("\n── cloneFormStage: real forms → 0 (base) / 1 (in-form) / 2 (highest) ──");
// Naruto — Kurama shroud, health-gated 0..5 (shroudStage); 5 = highest.
check("naruto shroudStage 0 → 0", cloneFormStage(F("naruto", { shroudStage: 0 })) === 0);
check("naruto shroudStage 1 → 1", cloneFormStage(F("naruto", { shroudStage: 1 })) === 1);
check("naruto shroudStage 4 → 1", cloneFormStage(F("naruto", { shroudStage: 4 })) === 1);
check("naruto shroudStage 5 → 2 (highest)", cloneFormStage(F("naruto", { shroudStage: 5 })) === 2);
// Sasuke — Susanoo _susanooStage 0/1/2; 2 = highest.
check("sasuke _susanooStage 0 → 0", cloneFormStage(F("sasuke", { _susanooStage: 0 })) === 0);
check("sasuke _susanooStage 1 → 1", cloneFormStage(F("sasuke", { _susanooStage: 1 })) === 1);
check("sasuke _susanooStage 2 → 2 (highest)", cloneFormStage(F("sasuke", { _susanooStage: 2 })) === 2);
// Itachi — Mangekyou (1) escalating to Itachi Susanoo (2, highest).
check("itachi base → 0", cloneFormStage(F("itachi", {})) === 0);
check("itachi _mangekyouActive → 1", cloneFormStage(F("itachi", { _mangekyouActive: true })) === 1);
check("itachi _itachiSusanoo → 2 (highest)", cloneFormStage(F("itachi", { _mangekyouActive: true, _itachiSusanoo: true })) === 2);
// Kakashi — Mangekyou, single tier.
check("kakashi base → 0", cloneFormStage(F("kakashi", {})) === 0);
check("kakashi _mangekyouActive → 1", cloneFormStage(F("kakashi", { _mangekyouActive: true })) === 1);
// Boruto — Karma, single tier.
check("boruto _karmaActive → 1", cloneFormStage(F("boruto", { _karmaActive: true })) === 1);
check("boruto base → 0", cloneFormStage(F("boruto", {})) === 0);
// Madara — Susanoo (special, timer), single tier.
check("madara _madaraSusanoo>0 → 1", cloneFormStage(F("madara", { _madaraSusanoo: 200 })) === 1);
check("madara base → 0", cloneFormStage(F("madara", {})) === 0);
// Formless clone chars — ALWAYS 0 (unchanged), even if unrelated fields are set.
for (const k of ["tobirama", "minato", "hashirama", "hiruzen", "pain", "obito"]) {
  check(`${k} has NO form → always 0`, cloneFormStage(F(k, { _susanooStage: 2, _mangekyouActive: true, shroudStage: 5 })) === 0);
}

// ── MULTIPLIER TABLES: clones LINEAR (1,2,3) · damage SUBLINEAR (1,1.4,1.7) · cost modest (1,1.25,1.5) ──
console.log("\n── cloneScaling multiplier tables ──");
const s0 = cloneScaling(F("sasuke", { _susanooStage: 0 })), s1 = cloneScaling(F("sasuke", { _susanooStage: 1 })), s2 = cloneScaling(F("sasuke", { _susanooStage: 2 }));
check("stage0 = {×1, ×1.0, ×1.0}", s0.cloneMult === 1 && s0.dmgMult === 1 && s0.costMult === 1, JSON.stringify(s0));
check("stage1 = {×2, ×1.4, ×1.25}", s1.cloneMult === 2 && s1.dmgMult === 1.4 && s1.costMult === 1.25, JSON.stringify(s1));
check("stage2 = {×3, ×1.7, ×1.5}", s2.cloneMult === 3 && s2.dmgMult === 1.7 && s2.costMult === 1.5, JSON.stringify(s2));
check("damage growth is SUBLINEAR vs clones (1.4<2, 1.7<3)", s1.dmgMult < s1.cloneMult && s2.dmgMult < s2.cloneMult);

// ── FORMATION FAN: identity at 4, symmetric, correct counts ──
console.log("\n── formationOffsets: symmetric fan, base-4 identity ──");
const o4 = formationOffsets(4);
check("base-4 matches the original fixed offsets (±74, ±128)", JSON.stringify(o4.map(o => o.dx)) === JSON.stringify([-74, 74, -128, 128]), JSON.stringify(o4.map(o => o.dx)));
const o8 = formationOffsets(8), o12 = formationOffsets(12);
check("n=8 yields 8 offsets", o8.length === 8);
check("n=12 yields 12 offsets", o12.length === 12);
check("fan is symmetric (every +dx has a matching -dx)", o12.every(o => o12.some(p => p.dx === -o.dx)));
check("offsets step strictly outward in pairs", o12[10].dx < o12[8].dx && o12[8].dx < o12[6].dx);

// ── CLONE COUNT + CAP ──
console.log("\n── formationCloneCount: 4 → 8 → 12, capped at MAX_LIVE_CLONES ──");
check("out-of-form → 4 clones", formationCloneCount(F("sasuke", { _susanooStage: 0 })) === 4);
check("stage1 → 8 clones", formationCloneCount(F("sasuke", { _susanooStage: 1 })) === 8);
check("stage2 → 12 clones", formationCloneCount(F("sasuke", { _susanooStage: 2 })) === 12);
check(`MAX_LIVE_CLONES cap is ${MAX_LIVE_CLONES}`, MAX_LIVE_CLONES === 12);
check("highest stage never exceeds the cap (3×4=12 ≤ cap)", formationCloneCount(F("naruto", { shroudStage: 5 })) <= MAX_LIVE_CLONES);

// ── DAMAGE SCALING (rounded; identity at stage 0) ──
console.log("\n── scaleHitDamage: rounded, identity at ×1 ──");
check("×1.0 is identity (same object semantics / value)", scaleHitDamage({ damage: 14 }, 1).damage === 14);
check("14 × 1.4 = 19.6 → 20 (rounded)", scaleHitDamage({ damage: 14 }, 1.4).damage === 20);
check("26 × 1.7 = 44.2 → 44 (rounded)", scaleHitDamage({ damage: 26 }, 1.7).damage === 44);
check("preserves other hit fields (projectile/speed)", (() => { const h = scaleHitDamage({ damage: 12, projectile: true, speed: 15 }, 1.4); return h.projectile === true && h.speed === 15 && h.damage === 17; })());
check("no-op on a damage-less hit", scaleHitDamage({ knockbackX: 5 }, 1.7).knockbackX === 5);

console.log(`\nRESULT: ${pass} pass / ${fail} fail`);
process.exit(fail ? 1 : 0);
