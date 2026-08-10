// rng.js — deterministic seeded PRNG for GAMEPLAY randomness (MK-conversion Wave-2 Stage 11A).
//
// Only randomness that affects REPLAYED MATCH STATE routes through here — currently AI decision rolls
// (ai.js chance()/rand()) and Kamui grab-teleport destinations (abilities.js). Voice-pool picks, camera
// shake, and particle scatter deliberately STAY on Math.random: they don't touch the state that a replay
// reproduces or that the desync hash covers, so seeding them would only add churn (and break the 5 voice
// suites that patch Math.random). This is the "gameplay-only" scope chosen for Stage 11 — see the plan.
//
// Algorithm: mulberry32 — a tiny, fast, well-distributed 32-bit generator. Same seed → same stream, on
// every engine, forever (the property replays and the frame-hash desync check rely on).

export function createRng(seed = 1) {
  let s = (seed >>> 0) || 1;   // 0 is a fixed point for the recurrence → coerce to 1
  let _seed = s;
  const next = () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;   // → [0, 1)
  };
  return {
    next,                                            // float in [0,1) — the Math.random() drop-in
    int:    (n) => Math.floor(next() * n),           // integer in [0, n)
    pick:   (arr) => (arr && arr.length) ? arr[Math.floor(next() * arr.length)] : undefined,
    chance: (p) => next() < p,                       // true with probability p
    reseed: (v) => { s = (v >>> 0) || 1; _seed = s; },
    get seed() { return _seed; }                     // the seed this stream was (re)started from
  };
}

// The single match-wide gameplay RNG. Reseeded per match in game.js startMatch() and stored on
// matchConfig.seed. A fixed non-zero default keeps behaviour sane before the first match / in isolation.
export const gameRng = createRng(1);

export function reseed(v) { gameRng.reseed(v); }

// Fresh per-match seed for normal play. Date.now() is fine here (real browser runtime — not a
// determinism concern: the seed is captured onto matchConfig so the exact match can be reproduced).
export function makeSeed() { return (Date.now() >>> 0) || 1; }
