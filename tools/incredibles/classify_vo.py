#!/usr/bin/env python3
"""
classify_vo.py: copy the delivered Incredibles voice clips into assets/audio/<rosterKey>/source/ and sort each clip into a
voice POOL from its WAVEFORM ONLY. Nobody listened to these clips; no filename is trusted for content.
Same feature set and rule shape as tools/ben10/classify_vo.py, with two differences for this delivery:
  • every source folder is ONE named character from ONE named game / voice actor, so there is no "unverified era" tier;
  • Syndrome is a VILLAIN: his pool balance leans TAUNT / SPECIAL_CALLOUT instead of the hero split (see classify / rank_long).

Features (ffprobe + ffmpeg decode to 16 kHz mono float32; numpy):
  duration, peak dBFS, RMS dBFS (whole clip and voiced frames), zero-crossing rate, spectral centroid,
  voiced-energy ratio (30 ms frames that are loud and periodic: autocorrelation peak in 75–500 Hz ≥ 0.35),
  silence ratio (frames under -45 dBFS), and the RMS slope across the clip (end vs start loudness).

Rules (first match wins; the delivery is loudness-normalised to -16 LUFS, so loudness thresholds are RELATIVE to the
clip's own source folder medians):
  > 8.0 s                         EXCLUDED "unverified, possible music" (music / narration bleed likely)
  silence ≥ 0.85 or RMS < -42     EXCLUDED "near-silent"
  voiced < 0.20                   SFX (non-speech: impact, whoosh, breath)
  ≤ 0.9 s                         ATTACK_EFFORT if voiced RMS ≥ the folder median, else HIT_REACT (a quieter grunt)
  0.9–2.6 s   hero                SPECIAL_CALLOUT if voiced RMS ≥ median AND voiced ratio ≥ median (a loud dense shout), else TAUNT
              villain             SPECIAL_CALLOUT if voiced RMS ≥ median (any loud line is a callout), else TAUNT
  2.6–8.0 s   hero                rank by RMS slope, thirds: rising → WIN, middle → INTRO, falling → LOSE
              villain             rank by RMS slope: top 15 % → WIN, bottom 15 % → LOSE, the 15 % above that → INTRO,
                                  the remaining middle → TAUNT (a villain monologues; fewer victory lines)
  INTRO / WIN / LOSE are flagged "wording unverified (shape-assigned)". No clip names a move that can be confirmed
  without listening, so every SPECIAL_CALLOUT is GENERIC (no per-ability pools).
Outputs: byte-identical copies, assets/audio/<key>/source/manifest.json (features, pool, flags), incrediblesVoicePools.js,
docs/incredibles/AUDIO_ANALYSIS.json. Deterministic (sorted inputs, no randomness).
USAGE: python3 tools/incredibles/classify_vo.py [SRC_DIR]   (default ~/Downloads/incredibles_voice_clips; read only)
"""
import os, sys, json, shutil, subprocess
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.expanduser("~/Downloads/incredibles_voice_clips")
SR = 16000

# source folder → (pool owner = rosterKey, villain?). All six are live roster characters on main (Phase 0 precheck).
DEST = {
  "dash":          ("dash_parr",     False),   # roster key is dash_parr (the folder is "dash")
  "elastigirl":    ("elastigirl",    False),
  "frozone":       ("frozone",       False),
  "mr_incredible": ("mr_incredible", False),
  "syndrome":      ("syndrome",      True),
  "violet":        ("violet",        False),
}

def decode(path):
    raw = subprocess.check_output(["ffmpeg", "-v", "quiet", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"])
    return np.frombuffer(raw, dtype="<f4").astype(np.float64)

def probe(path):
    j = json.loads(subprocess.check_output(["ffprobe", "-v", "quiet", "-print_format", "json", "-show_format", "-show_streams", path]))
    s = j["streams"][0]
    return dict(duration=round(float(j["format"]["duration"]), 3), codec=s.get("codec_name"), sample_rate=int(s.get("sample_rate", 0)), channels=s.get("channels"))

db = lambda x: float(20 * np.log10(max(x, 1e-9)))

def features(x):
    n = int(0.03 * SR); hop = n
    frames = [x[i:i + n] for i in range(0, max(1, len(x) - n), hop)] or [x]
    rms = np.array([np.sqrt(np.mean(f ** 2)) if len(f) else 0 for f in frames])
    rms_db = np.array([db(r) for r in rms])
    loud = rms_db > -45
    voiced = np.zeros(len(frames), bool)
    lo, hi = SR // 500, SR // 75
    for i, f in enumerate(frames):
        if not loud[i] or len(f) < hi + 1: continue
        f = f - f.mean(); ac = np.correlate(f, f, "full")[len(f) - 1:]
        if ac[0] <= 0: continue
        voiced[i] = (ac[lo:hi].max() / ac[0]) >= 0.35
    zcr = float(np.mean(np.abs(np.diff(np.sign(x))) > 0)) if len(x) > 1 else 0.0
    spec = np.abs(np.fft.rfft(x * np.hanning(len(x)))) if len(x) > 1 else np.zeros(2)
    freqs = np.fft.rfftfreq(len(x), 1 / SR) if len(x) > 1 else np.zeros(2)
    centroid = float((spec * freqs).sum() / max(spec.sum(), 1e-12))
    half = len(rms) // 2
    slope = db(rms[half:].mean() if half else rms.mean()) - db(rms[:half].mean() if half else rms.mean())
    vr = rms[voiced]
    return dict(peak_db=round(db(np.abs(x).max() if len(x) else 0), 2), rms_db=round(db(np.sqrt(np.mean(x ** 2)) if len(x) else 0), 2),
                voiced_rms_db=round(db(np.sqrt(np.mean(vr ** 2))) if len(vr) else -120.0, 2), zcr=round(zcr, 4), centroid_hz=round(centroid, 1),
                voiced_ratio=round(float(voiced.mean()), 3), silence_ratio=round(float((~loud).mean()), 3), rms_slope_db=round(slope, 2))

def classify(d, F, villain, med):
    if d > 8.0: return None, "unverified, possible music (> 8 s)"
    if F["silence_ratio"] >= 0.85 or F["rms_db"] < -42: return None, "near-silent"
    if F["voiced_ratio"] < 0.20: return "SFX", None
    if d <= 0.9: return ("ATTACK_EFFORT" if F["voiced_rms_db"] >= med["voiced_rms_db"] else "HIT_REACT"), None
    if d <= 2.6:
        loud = F["voiced_rms_db"] >= med["voiced_rms_db"]
        dense = F["voiced_ratio"] >= med["voiced_ratio"]
        return ("SPECIAL_CALLOUT" if (loud and (villain or dense)) else "TAUNT"), None
    return "LONG", None

def rank_long(recs, villain):
    """2.6–8 s speech ranked by RMS slope (rising first; ties by file name)."""
    longs = sorted([r for r in recs if r["pool"] == "LONG"], key=lambda r: (-r["rms_slope_db"], r["file"]))
    n = len(longs)
    if not villain:
        a = (n + 2) // 3; b = n - n // 3
        for i, r in enumerate(longs): r["pool"] = "WIN" if i < a else ("INTRO" if i < b else "LOSE")
        return
    q = max(1, round(n * 0.15)) if n >= 4 else 0
    for i, r in enumerate(longs):
        r["pool"] = "WIN" if i < q else ("LOSE" if i >= n - q else ("INTRO" if i >= n - 2 * q else "TAUNT"))

def main():
    pools, analysis = {}, {}
    for folder, (owner, villain) in DEST.items():
        m = json.load(open(os.path.join(SRC, folder, "manifest.json")))
        dest = f"assets/audio/{owner}/source"
        os.makedirs(os.path.join(ROOT, dest), exist_ok=True)
        recs = []
        for c in sorted(m["clips"], key=lambda c: c["file"]):
            src = os.path.join(SRC, folder, c["file"]); out = os.path.join(ROOT, dest, c["file"])
            shutil.copyfile(src, out)
            P = probe(out); F = features(decode(out))
            recs.append(dict(file=c["file"], path="./" + os.path.relpath(out, ROOT), origin=folder, owner=owner, **P, **F))
        speech = [r for r in recs if r["duration"] <= 8.0 and r["voiced_ratio"] >= 0.20] or recs
        med = {k: float(np.median([r[k] for r in speech])) for k in ("voiced_rms_db", "voiced_ratio")}
        for r in recs: r["pool"], r["skipped"] = classify(r["duration"], r, villain, med)
        rank_long(recs, villain)
        for r in recs:
            r["flags"] = ["wording unverified (shape-assigned)"] if r["pool"] in ("INTRO", "WIN", "LOSE") else []
            if r["pool"]: pools.setdefault(owner, {}).setdefault(r["pool"], []).append(r["path"])
        analysis[owner] = dict(source_folder=folder, display_name=m.get("display_name"), source_credit=m.get("source_credit"),
                               villain=villain, folder_medians={k: round(v, 3) for k, v in med.items()}, clips=recs)
        json.dump(dict(destination=dest, origin=folder, display_name=m.get("display_name"), source_credit=m.get("source_credit"),
                       generated_by="tools/incredibles/classify_vo.py", clips=recs),
                  open(os.path.join(ROOT, dest, "manifest.json"), "w"), indent=1)
    os.makedirs(os.path.join(ROOT, "docs/incredibles"), exist_ok=True)
    json.dump(analysis, open(os.path.join(ROOT, "docs/incredibles/AUDIO_ANALYSIS.json"), "w"), indent=1)
    order = ["INTRO", "WIN", "LOSE", "HIT_REACT", "ATTACK_EFFORT", "SPECIAL_CALLOUT", "SFX", "TAUNT"]
    L = ["// incrediblesVoicePools.js: AUTO-GENERATED by tools/incredibles/classify_vo.py (waveform classification; do not hand-edit).",
         "// rosterKey → pool → clip paths (dash_parr / elastigirl / frozone / mr_incredible / syndrome / violet).",
         "// See docs/incredibles/AUDIO_MAP.md for every clip's pool, skips and flags.",
         "export const INCREDIBLES_VO_POOLS = {"]
    for owner in sorted(pools):
        L.append(f"  {json.dumps(owner)}: {{")
        for p in order:
            if pools[owner].get(p): L.append(f"    {p}: {json.dumps(sorted(pools[owner][p]))},")
        L.append("  },")
    L.append("}")
    open(os.path.join(ROOT, "incrediblesVoicePools.js"), "w").write("\n".join(L) + "\n")
    for owner in sorted(pools): print(owner, {p: len(pools[owner].get(p, [])) for p in order}, "skipped", sum(1 for r in analysis[owner]["clips"] if not r["pool"]))

if __name__ == "__main__":
    main()
