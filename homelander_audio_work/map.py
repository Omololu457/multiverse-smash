#!/usr/bin/env python3
"""STEP 2 — map clips to event pools by acoustic class + length + energy. The 27 long originals are
EXCLUDED (replaced by their _pNN pieces). No music found. Since the words can't be read, voice-line
pool choices are heuristic → marked 'unverified' for auditioning. Writes the enriched AUDIO_ANALYSIS.csv
(adds pool/assigned/unverified/reason) + pools.json for the JS map generator."""
import csv, json, os
from collections import defaultdict

HERE = os.path.dirname(__file__)
CSV = os.path.join(HERE, "..", "docs", "homelander", "AUDIO_ANALYSIS.csv")
POOLS_JSON = os.path.join(HERE, "pools.json")

rows = list(csv.DictReader(open(CSV)))
def fnum(r, k): return float(r[k])

# EXCLUDE the 27 long originals (multi-line sources) — their _pNN pieces carry the single lines.
def is_long_source(r):
    f = r["file"]
    return f.startswith("long_over_8s_maybe_music/") and "_p" not in f.split("/")[-1]
for r in rows:
    r["excluded"] = is_long_source(r) or r["class"] == "music"

mappable = [r for r in rows if not r["excluded"]]
voice = sorted([r for r in mappable if r["class"] == "voice"], key=lambda r: r["file"])
sfx   = sorted([r for r in mappable if r["class"] == "sfx"],   key=lambda r: r["file"])

pools = defaultdict(list)
assign = {}   # file -> (pool, unverified, reason)
def put(r, pool, unverified, reason):
    pools[pool].append(r["file"]); assign[r["file"]] = (pool, unverified, reason)

# ── SFX POOLS (acoustic fingerprint) ─────────────────────────────────────────
# held tone (sustained, low envelope variance, mid centroid) = LASER_BEAM
# bright/short = LASER_CHARGE · low-centroid fast-attack = SUPERSONIC (boom) · mid whoosh = FLIGHT_TAKEOFF
def held(r):  return (min(fnum(r,"length_s"),4)/4) * (1-min(fnum(r,"rms_cv"),1)) * (1 if 400<fnum(r,"centroid")<2800 else 0.4)
def charge(r):return (1 if fnum(r,"centroid")>3000 else 0.3) * (1 if fnum(r,"length_s")<1.6 else 0.5)
def boom(r):  return (1 if fnum(r,"attack_s")<0.06 else 0.3) * (1 if fnum(r,"centroid")<2200 else 0.4)
def whoosh(r):return (1 if 1800<fnum(r,"centroid")<4200 else 0.3) * (1 if 0.4<fnum(r,"length_s")<2.5 else 0.5)

used = set()
def take(scorer, pool, n, uv_reason):
    cands = sorted([r for r in sfx if r["file"] not in used], key=scorer, reverse=True)[:n]
    for r in cands:
        used.add(r["file"]); put(r, pool, True, uv_reason)
take(held,   "LASER_BEAM",     4, "held-tone SFX — audition")
take(charge, "LASER_CHARGE",   4, "bright charge SFX — audition")
take(boom,   "SUPERSONIC",     6, "boom/transient SFX — audition")
take(whoosh, "FLIGHT_TAKEOFF", 6, "whoosh SFX — audition")
# remaining sfx → round-robin across the 4 sfx pools for variety
rest_sfx = [r for r in sfx if r["file"] not in used]
sfx_cycle = ["SUPERSONIC", "FLIGHT_TAKEOFF", "LASER_CHARGE", "LASER_BEAM"]
for i, r in enumerate(rest_sfx):
    put(r, sfx_cycle[i % 4], True, "extra SFX variety — audition")

# ── VOICE GRUNT POOLS (short) ────────────────────────────────────────────────
# < 1.15s voice = non-verbal grunts → HIT_REACT / ATTACK_EFFORT / KO (can't tell which by ear → unverified)
grunts = [r for r in voice if fnum(r, "length_s") < 1.15]
longer = [r for r in voice if fnum(r, "length_s") >= 1.15]
grunt_cycle = ["HIT_REACT", "ATTACK_EFFORT", "HIT_REACT", "ATTACK_EFFORT", "KO"]
for i, r in enumerate(sorted(grunts, key=lambda r: r["file"])):
    put(r, grunt_cycle[i % len(grunt_cycle)], True, "short grunt — HIT/EFFORT/KO indistinct by ear")

# ── VOICE LINE POOLS (spoken lines, words unreadable → distributed, all unverified) ──
# INTRO/WIN/LOSE/SPECIAL_CALLOUT/FLEX_TAUNT/ULTIMATE/BRUTALITY/ROUND_START/GRAB
line_pools = ["INTRO", "WIN", "LOSE", "SPECIAL_CALLOUT", "FLEX_TAUNT", "ULTIMATE", "BRUTALITY", "ROUND_START", "GRAB"]
for i, r in enumerate(sorted(longer, key=lambda r: (round(fnum(r, "length_s")), r["file"]))):
    put(r, line_pools[i % len(line_pools)], True, "spoken line — pool is a length heuristic, words unread")

# ── write enriched CSV + pools.json ──────────────────────────────────────────
for r in rows:
    pool, uv, reason = assign.get(r["file"], ("", "", ""))
    r["pool"] = "" if r["excluded"] else pool
    r["assigned"] = "no" if r["excluded"] else "yes"
    r["unverified"] = "" if r["excluded"] else ("yes" if uv else "no")
    r["map_reason"] = "excluded: long multi-line source (see _pNN pieces)" if r["excluded"] else reason

fields = list(rows[0].keys())
with open(CSV, "w", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=fields); w.writeheader(); w.writerows(rows)

# pools.json keyed by pool with the repo-relative ogg path (assets/audio/homelander/source/...)
BASE = "assets/audio/homelander/source/"
out = {p: [BASE + f for f in sorted(fs)] for p, fs in sorted(pools.items())}
json.dump(out, open(POOLS_JSON, "w"), indent=1)

print("POOL SIZES:")
for p in ["INTRO","WIN","LOSE","ROUND_START","KO","HIT_REACT","ATTACK_EFFORT","SPECIAL_CALLOUT",
          "FLEX_TAUNT","GRAB","ULTIMATE","BRUTALITY","LASER_CHARGE","LASER_BEAM","SUPERSONIC","FLIGHT_TAKEOFF"]:
    print(f"  {p:16s} {len(pools[p])}")
print(f"mapped {sum(len(v) for v in pools.values())} clips | excluded {sum(1 for r in rows if r['excluded'])} long-sources | voice {len(voice)} sfx {len(sfx)}")
