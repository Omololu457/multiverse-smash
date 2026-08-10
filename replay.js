// replay.js — Stage 11B: input recording for deterministic replays.
//
// Records the RAW per-frame held-control state of both fighters as a compact bitmask, delta-encoded
// (a frame is written only when either mask CHANGES). Combined with the match seed (Stage 11A) and the
// recorded characters/skins/stage, this is everything needed to reproduce a match bit-identically on
// playback (11C): writing the raw keys back each frame re-runs the exact same (deterministic) input
// buffering, and the seed reproduces the only gameplay RNG (AI + Kamui).
//
// WHY RAW keys, not getFighterInput's resolved/buffered output: getFighterInput advances buffers and a
// wiring counter as a side effect, so it must not be called an extra time per frame. Raw key state is
// side-effect-free to read and, replayed through the normal pipeline, produces identical buffering.

import { REPLAY_INPUT_FIELDS } from "./input.js"

export const REPLAY_VERSION = 1;

// Reject-on-mismatch stamp (SECTION D decision): a replay recorded under a different balance will
// desync, so playback (11C) refuses a replay whose balanceStamp != current. BUMP THIS whenever a
// gameplay-affecting balance value changes (damage scale, move data, hitstun, etc.).
export const BALANCE_STAMP = "mk-conv-1a";

// 14-field input bitmask. Bit order is REPLAY_INPUT_FIELDS' order — stable and shared with input.js so
// encode/decode and playback all agree. (jump shares the up key and dash is double-tap-derived, so
// those bits are redundant/always-0 respectively, but keeping full parity with getFighterInput keeps
// playback's writeRawControls a straight inverse.)
export function encodeInput(raw) {
  let m = 0;
  for (let i = 0; i < REPLAY_INPUT_FIELDS.length; i++) if (raw && raw[REPLAY_INPUT_FIELDS[i]]) m |= (1 << i);
  return m;
}
export function decodeInput(mask) {
  const o = {};
  for (let i = 0; i < REPLAY_INPUT_FIELDS.length; i++) o[REPLAY_INPUT_FIELDS[i]] = !!(mask & (1 << i));
  return o;
}

let _rec = null;   // active recording, or null

// meta: { seed, p1Char, p1Skin, p2Char, p2Skin, stage, mode, rounds }
export function startRecording(meta = {}) {
  _rec = {
    version:      REPLAY_VERSION,
    balanceStamp: BALANCE_STAMP,
    seed:         meta.seed ?? null,
    p1Char: meta.p1Char ?? null, p1Skin: meta.p1Skin ?? "default",
    p2Char: meta.p2Char ?? null, p2Skin: meta.p2Skin ?? "default",
    stage:  meta.stage ?? null, mode: meta.mode ?? null, rounds: meta.rounds ?? null,
    frames: [],                 // delta-encoded: [{ f, p1, p2 }, ...] only where a mask changed
    frameCount: 0,              // total battle frames spanned (for a progress bar / sanity)
    _lp1: -1, _lp2: -1          // last-written masks (internal; stripped on export)
  };
}

// Called once per battle frame with the frame index (0-based from battle start) and both masks.
export function recordInputs(frameIndex, p1Mask, p2Mask) {
  if (!_rec) return;
  _rec.frameCount = frameIndex + 1;
  if (p1Mask !== _rec._lp1 || p2Mask !== _rec._lp2) {
    _rec.frames.push({ f: frameIndex, p1: p1Mask, p2: p2Mask });
    _rec._lp1 = p1Mask; _rec._lp2 = p2Mask;
  }
}

function _clean(rec) {
  if (!rec) return null;
  const { _lp1, _lp2, ...clean } = rec;   // strip internals
  return clean;
}

// Finalize and return the replay object (or null if not recording).
export function finishRecording() {
  const out = _clean(_rec);
  _rec = null;
  return out;
}

// Live snapshot without stopping (for the harness / an in-progress save).
export function getRecording() { return _clean(_rec); }
export function isRecording()  { return !!_rec; }
export function abortRecording(){ _rec = null; }

// ─────────────────────────────────────────────────────────────────
// STATE CHECKPOINTS (Stage 11C desync verification)
// Every HASH_INTERVAL battle frames the recorder snapshots both fighters' {x,y,health,energy}. Playback
// recomputes the same snapshot and compares — the first mismatch is the desync frame. This is the
// determinism regression test: a bit-identical replay produces zero desyncs.
// ─────────────────────────────────────────────────────────────────
export const HASH_INTERVAL = 60;

// snap = [x, y, health, energy] (already rounded by the caller for float-noise safety).
export function recordState(frameIndex, p1Snap, p2Snap) {
  if (!_rec) return;
  (_rec.states ||= []).push({ f: frameIndex, a: p1Snap, b: p2Snap });
}

// ─────────────────────────────────────────────────────────────────
// PLAYBACK (Stage 11C)
// ─────────────────────────────────────────────────────────────────

// Reject-on-mismatch (SECTION D): a replay from a different format/balance would desync, so refuse it.
// Returns { ok } or { ok:false, reason }.
export function validateReplay(rep) {
  if (!rep || typeof rep !== "object")        return { ok: false, reason: "not a replay object" };
  if (rep.version !== REPLAY_VERSION)         return { ok: false, reason: `version ${rep.version} != ${REPLAY_VERSION}` };
  if (rep.balanceStamp !== BALANCE_STAMP)     return { ok: false, reason: `balance "${rep.balanceStamp}" != "${BALANCE_STAMP}"` };
  if (!Array.isArray(rep.frames))             return { ok: false, reason: "missing frames" };
  return { ok: true };
}

let _play = null;

export function startPlayback(rep) {
  _play = {
    replay: rep,
    cursor: 0,                 // index into rep.frames (delta stream), advanced as frames elapse
    p1: 0, p2: 0,              // current reconstructed masks (carry forward between deltas)
    checks: 0, matched: 0,     // state-checkpoint tallies
    desyncFrame: null          // first frame where playback state diverged from the recording
  };
  return _play;
}
export function isPlayback()  { return !!_play; }
export function stopPlayback(){ const p = _play; _play = null; return p; }

// Reconstruct the input masks for the given battle-frame index by advancing the delta cursor. Called
// once per frame with a monotonically increasing frameIndex. Returns { p1, p2} masks.
export function playbackMaskAt(frameIndex) {
  if (!_play) return null;
  const frames = _play.replay.frames;
  while (_play.cursor < frames.length && frames[_play.cursor].f <= frameIndex) {
    _play.p1 = frames[_play.cursor].p1;
    _play.p2 = frames[_play.cursor].p2;
    _play.cursor++;
  }
  return { p1: _play.p1, p2: _play.p2 };
}

function _arrEq(a, b) { return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]); }

// Compare live playback state to the recorded checkpoint at this frame (if one exists). Records the
// first divergent frame. p1Snap/p2Snap = [x,y,health,energy] rounded identically to record time.
export function playbackCheckState(frameIndex, p1Snap, p2Snap) {
  if (!_play) return;
  const rec = (_play.replay.states || []).find(s => s.f === frameIndex);
  if (!rec) return;
  _play.checks++;
  if (_arrEq(rec.a, p1Snap) && _arrEq(rec.b, p2Snap)) _play.matched++;
  else if (_play.desyncFrame == null) _play.desyncFrame = frameIndex;
}

export function playbackState() {
  if (!_play) return null;
  return {
    cursor: _play.cursor, totalFrames: _play.replay.frames.length,
    checks: _play.checks, matched: _play.matched, desyncFrame: _play.desyncFrame,
    frameCount: _play.replay.frameCount ?? null
  };
}
