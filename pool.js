// pool.js
// ──────────────────────────────────────────────────────────────────────────
// OBJECT FREE-LIST RECYCLER (Stage 22C). The short-lived "churn" objects — damage
// numbers, hit sparks, projectiles, summons — are spawned in BURSTS during ultimates
// (a Kurama TBB or Guanyin combo drops dozens in a frame) and freed a few frames later.
// Allocating + GC-ing them every frame is exactly the kind of unpredictable pause the
// profiling overlay was built to catch. This recycles them instead.
//
// DESIGN (keeps the public arrays untouched, so the ~50 consumers don't change):
//   • The live arrays (damageNumbers, hitSparks, …) still hold ONLY active objects, so
//     iteration / .length / .filter all stay correct.
//   • On SPAWN, poolAcquire(name) hands back a recycled {} (or a fresh one) that the
//     spawn site fully overwrites; on REMOVAL, poolRelease(name, obj) resets its fields
//     and returns it to a capped free-list. After warm-up, a burst allocates nothing.
//   • Reset sets every own key to undefined (NOT delete) → no stale fields leak into the
//     next use, and the object keeps a stable (monomorphic) shape for the JIT.
// ──────────────────────────────────────────────────────────────────────────
const _pools = Object.create(null)   // name -> { free:[], cap, reuses, allocs, released }
function _p(name, cap = 256) { return _pools[name] || (_pools[name] = { free: [], cap, reuses: 0, allocs: 0, released: 0 }) }

// Get a clean object for `name` — a recycled one if available, else a fresh {}.
export function poolAcquire(name, cap) {
  const p = _p(name, cap)
  if (p.free.length) { p.reuses++; return p.free.pop() }
  p.allocs++; return {}
}
// Return `obj` to the `name` free-list (reset first). No-op past the cap (bounded memory).
export function poolRelease(name, obj) {
  if (!obj || typeof obj !== "object") return
  const p = _p(name)
  p.released++
  for (const k in obj) obj[k] = undefined   // clear → next use starts blank; undefined reads falsy
  if (p.free.length < p.cap) p.free.push(obj)
}
// Snapshot for the profiling overlay (Stage 22D): per-pool free / reuse / alloc counts.
export function poolStats() {
  const out = {}
  let freeTotal = 0, reuseTotal = 0, allocTotal = 0
  for (const name in _pools) {
    const p = _pools[name]
    out[name] = { free: p.free.length, reuses: p.reuses, allocs: p.allocs, released: p.released }
    freeTotal += p.free.length; reuseTotal += p.reuses; allocTotal += p.allocs
  }
  out._totals = { free: freeTotal, reuses: reuseTotal, allocs: allocTotal }
  return out
}
// Test/measure helper — reset the counters (not the free-lists).
export function poolResetStats() { for (const name in _pools) { _pools[name].reuses = 0; _pools[name].allocs = 0; _pools[name].released = 0 } }
