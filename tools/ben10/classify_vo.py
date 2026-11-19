#!/usr/bin/env python3
"""
classify_vo.py: copy the delivered Ben 10 voice clips into assets/audio/ and sort each clip into a voice POOL from its
WAVEFORM ONLY. Nobody listened to these clips and no filename is trusted for content; this tool never reads clip names
for meaning.

Features (ffprobe + ffmpeg decode to 16 kHz mono float32; numpy):
  duration, peak dBFS, RMS dBFS (whole clip and voiced frames), zero-crossing rate, spectral centroid,
  voiced-energy ratio (30 ms frames that are loud and periodic: autocorrelation peak in 75–500 Hz ≥ 0.35),
  silence ratio (frames under -45 dBFS), and the RMS slope across the clip (start vs end loudness).

Rules (first match wins):
  > 8.0 s                         EXCLUDED "unverified, possible music" (narration / score bleed likely)
  silence ≥ 0.85 or RMS < -42     EXCLUDED "near-silent"
  voiced < 0.20                   SFX (non-speech: impact, whoosh, transform noise)
  (the delivery is loudness-normalised to -16 LUFS, so loudness thresholds are RELATIVE to the clip's own source folder)
  ≤ 0.9 s                         ATTACK_EFFORT if voiced RMS ≥ the folder median, else HIT_REACT (a quieter grunt)
  0.9–2.6 s                       SPECIAL_CALLOUT if voiced RMS ≥ folder median AND voiced ratio ≥ folder median
                                  (a loud, dense shout), else TAUNT
  2.6–8.0 s                       a verified folder: rank the folder's 2.6–8 s speech clips by RMS slope (end vs start
                                  loudness) and split in thirds: rising third → WIN, falling third → LOSE, middle → INTRO
                                  an unverified folder: TAUNT
  UNVERIFIED-era folders are clamped to ATTACK_EFFORT / SFX / TAUNT (HIT_REACT→ATTACK_EFFORT, SPECIAL_CALLOUT→TAUNT,
  INTRO/WIN/LOSE→TAUNT). INTRO/WIN/LOSE from verified folders are flagged "wording unverified (shape-assigned)":
  the owner chose (2026-11-18) to fill them by shape for spot-checking by ear.

CURATION: tools/ben10/vo_curation.json lists clips a reviewer dropped because the transcript / voice match shows another
speaker (or not this character); they are kept on disk but never wired.
Outputs: the copies (byte-identical), <dest>/manifest.json per destination (origin folder, features, pool, flags),
ben10VoicePools.js (the generated pool tables), docs/ben10/AUDIO_ANALYSIS.json. Deterministic.
USAGE: python3 tools/ben10/classify_vo.py
"""
import os, json, shutil, subprocess
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(ROOT, "ben10_voice_clips")
SR = 16000

# source folder → (destination dir, pool owner key, verified?). Owner keys: rosterKey for humans/Vilgax, READY alien key for aliens.
DEST = {
  "ben_young":        ("assets/audio/ben10/human/ben_young/source", "ben10:classic"),
  "ben_teen":         ("assets/audio/ben10/human/ben_teen/source",  "ben10:alienforce"),
  "albedo":           ("assets/audio/albedo/human/source",          "albedo"),
  "ghostfreak_young": ("assets/audio/ben10/ghostfreak/source",      "ghostfreak"),
  "ghostfreak_teen":  ("assets/audio/ben10/ghostfreak/source",      "ghostfreak"),
  "heatblast_young":  ("assets/audio/ben10/heatblast/source",       "heatblast"),
  "wildvine_young":   ("assets/audio/ben10/wildvine/source",        "wildvine"),
  "bigchill":         ("assets/audio/ben10/bigchill/source",        "bigchill"),
  "diamondhead":      ("assets/audio/ben10/diamondhead_ov/source",  "diamondhead_ov"),   # READY key, never the legacy twin
  "feedback":         ("assets/audio/ben10/feedback_ov/source",     "feedback_ov"),
  "humongousaur":     ("assets/audio/ben10/humongousaur/source",    "humongousaur"),
  "rath":             ("assets/audio/ben10/rath/source",            "rath"),
  "swampfire":        ("assets/audio/ben10/swampfire/source",       "swampfire"),
  "upgrade":          ("assets/audio/ben10/upgrade_ov/source",      "upgrade_ov"),
  "xlr8":             ("assets/audio/ben10/xlr8/source",            "xlr8"),
  "vilgax":           ("assets/audio/vilgax/source",                "vilgax"),             # Vilgax IS a roster character (owner: copy + wire)
  "kevin11":          ("assets/audio/_unassigned/kevin11",          None),                 # not a roster character: copied, NOT wired
}
GENERIC = {"ATTACK_EFFORT", "SFX", "TAUNT"}
# path → reason. Written after reviewing the transcript + voice-match evidence (tools/ben10/vo_speaker_check.py).
_cur = os.path.join(os.path.dirname(os.path.abspath(__file__)), "vo_curation.json")
_CJ = json.load(open(_cur)) if os.path.exists(_cur) else {}
CURATION, MOVES = _CJ.get("drop", {}), _CJ.get("move", {})

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

def classify(d, F, verified, med):
    """med = the source folder's medians {voiced_rms_db, voiced_ratio}. Long verified speech returns "LONG" (ranked later)."""
    if d > 8.0: return None, "unverified, possible music (> 8 s)"
    if F["silence_ratio"] >= 0.85 or F["rms_db"] < -42: return None, "near-silent"
    if F["voiced_ratio"] < 0.20: pool = "SFX"
    elif d <= 0.9: pool = "ATTACK_EFFORT" if F["voiced_rms_db"] >= med["voiced_rms_db"] else "HIT_REACT"
    elif d <= 2.6: pool = "SPECIAL_CALLOUT" if (F["voiced_rms_db"] >= med["voiced_rms_db"] and F["voiced_ratio"] >= med["voiced_ratio"]) else "TAUNT"
    else: pool = "LONG" if verified else "TAUNT"
    if not verified and pool not in GENERIC:
        pool = {"HIT_REACT": "ATTACK_EFFORT"}.get(pool, "TAUNT")
    return pool, None

def rank_long(recs):
    """Verified 2.6–8 s speech: thirds by RMS slope → WIN (rising) / INTRO (middle) / LOSE (falling). Ties by file name."""
    longs = sorted([r for r in recs if r["pool"] == "LONG"], key=lambda r: (-r["rms_slope_db"], r["file"]))
    n = len(longs); a = (n + 2) // 3; b = n - n // 3
    for i, r in enumerate(longs): r["pool"] = "WIN" if i < a else ("INTRO" if i < b else "LOSE")

def main():
    top = json.load(open(os.path.join(SRC, "manifest.json")))
    pools, analysis, per_dest = {}, {}, {}
    for folder, (dest, owner) in DEST.items():
        m = json.load(open(os.path.join(SRC, folder, "manifest.json")))
        verified = bool(m.get("era_verified_by_ear"))
        os.makedirs(os.path.join(ROOT, dest), exist_ok=True)
        recs = []
        for c in m["clips"]:
            src = os.path.join(SRC, folder, c["file"]); out = os.path.join(ROOT, dest, c["file"])
            shutil.copyfile(src, out)
            P = probe(out); F = features(decode(out))
            recs.append(dict(file=c["file"], path="./" + os.path.relpath(out, ROOT), origin=folder, owner=owner, verified_era=verified, **P, **F))
        speech = [r for r in recs if r["duration"] <= 8.0 and r["voiced_ratio"] >= 0.20] or recs
        med = {k: float(np.median([r[k] for r in speech])) for k in ("voiced_rms_db", "voiced_ratio")}
        for r in recs:
            r["pool"], r["skipped"] = classify(r["duration"], r, verified, med)
            if owner is None: r["pool"], r["skipped"] = None, "not wired (Kevin 11 is not a roster character)"
        rank_long(recs)
        for r in recs:   # reviewer curation (tools/ben10/vo_curation.json): drop clips that are another speaker / not this character
            c = CURATION.get(r["path"])
            if c and r["pool"]: r["pool"], r["skipped"] = None, "wrong speaker / not this character: " + c
            if r["pool"] and r["path"] in MOVES: r["pool"], r["moved"] = MOVES[r["path"]], True   # the transcript shows the role
        for r in recs:
            r["flags"] = (["UNVERIFIED era (source folder)"] if not verified else []) + \
                         ((["role set from the transcript"] if r.get("moved") else ["wording unverified (shape-assigned)"]) if r["pool"] in ("INTRO", "WIN", "LOSE") else [])
            per_dest.setdefault(dest, []).append(r); analysis.setdefault(folder, []).append(r)
            if r["pool"]: pools.setdefault(owner, {}).setdefault(r["pool"], []).append(r["path"])
    for dest, recs in per_dest.items():
        origins = sorted({r["origin"] for r in recs})
        json.dump(dict(destination=dest, origins={o: dict(note=json.load(open(os.path.join(SRC, o, "manifest.json"))).get("note"),
                       era_verified_by_ear=json.load(open(os.path.join(SRC, o, "manifest.json"))).get("era_verified_by_ear")) for o in origins},
                       generated_by="tools/ben10/classify_vo.py", clips=recs), open(os.path.join(ROOT, dest, "manifest.json"), "w"), indent=1)
    os.makedirs(os.path.join(ROOT, "docs/ben10"), exist_ok=True)
    json.dump(analysis, open(os.path.join(ROOT, "docs/ben10/AUDIO_ANALYSIS.json"), "w"), indent=1)
    order = ["INTRO", "WIN", "LOSE", "HIT_REACT", "ATTACK_EFFORT", "SPECIAL_CALLOUT", "SFX", "TAUNT"]
    L = ["// ben10VoicePools.js: AUTO-GENERATED by tools/ben10/classify_vo.py (waveform classification; do not hand-edit).",
         "// owner key → pool → clip paths. Owners: \"ben10:classic\" / \"ben10:alienforce\" (human Ben by variant; Prime has none),",
         "// \"albedo\" (Albedo human), READY alien keys (one alien = one voice for whoever transformed), \"vilgax\".",
         "// See docs/ben10/AUDIO_MAP.md for every clip's pool, skips and UNVERIFIED flags.",
         "export const BEN10_VO_POOLS = {"]
    for owner in sorted(pools):
        L.append(f"  {json.dumps(owner)}: {{")
        for p in order:
            if pools[owner].get(p): L.append(f"    {p}: {json.dumps(sorted(pools[owner][p]))},")
        L.append("  },")
    L.append("}")
    open(os.path.join(ROOT, "ben10VoicePools.js"), "w").write("\n".join(L) + "\n")
    for owner in sorted(pools): print(owner, {p: len(v) for p, v in pools[owner].items()})

if __name__ == "__main__":
    main()
