# tools/story/voice/build_voice.py — MSV1-STORY voice: cast every story speaker to a Piper LibriTTS-R voice and render the clips.
#
# Free + offline: Piper neural TTS (en_US-libritts_r-medium, CC-BY 4.0, 904 speakers) + ffmpeg. No account, no API key, and the
# script text never leaves this machine. Voices are CAST, not cloned: each character gets the unused LibriTTS-R speaker whose
# measured pitch / pitch movement best fits its casting sheet (casting.json), plus optional pitch shift and effects.
#
# Setup (once):
#   python3 -m venv ~/.cache/msv1-story-voice/venv && ~/.cache/msv1-story-voice/venv/bin/pip install piper-tts
#   ~/.cache/msv1-story-voice/venv/bin/python -m piper.download_voices en_US-libritts_r-medium --data-dir ~/.cache/msv1-story-voice/models
#   ~/.cache/msv1-story-voice/venv/bin/python tools/story/voice/profile_speakers.py      # → speakers.json (already committed)
# Build (re-runnable; only changed clips are rendered, orphans removed):
#   node tools/story/voice/list_lines.mjs                                                 # → jobs.json (from the game's own rules)
#   ~/.cache/msv1-story-voice/venv/bin/python tools/story/voice/build_voice.py            # → story_voice/<voice>/<id>.m4a + data/story/voiceManifest.js
import json, math, os, subprocess, sys, tempfile, wave, hashlib
from concurrent.futures import ThreadPoolExecutor
import numpy as np
from piper import PiperVoice, SynthesisConfig

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
MODEL = os.path.expanduser("~/.cache/msv1-story-voice/models/en_US-libritts_r-medium.onnx")
OUT = os.path.join(ROOT, "story_voice")
CAST = json.load(open(os.path.join(HERE, "casting.json")))
SPK = {int(k): v for k, v in json.load(open(os.path.join(HERE, "speakers.json"))).items()}
JOBS = json.load(open(os.path.join(HERE, "jobs.json")))
ONLY = [v for v in os.environ.get("VOICE_ONLY", "").split(",") if v]   # sample run: render just these voices (no manifest / orphan pass)
if ONLY: JOBS = [j for j in JOBS if j["voice"] in ONLY][: int(os.environ.get("VOICE_LIMIT", "4")) * len(ONLY)]

ST = lambda hz: 12 * math.log2(hz / 100.0)
BAND = {"m": {"deep": 90, "low": 104, "mid": 117, "high": 131, "young": 146, "kid": 146},
        "f": {"low": 170, "mid": 192, "high": 214, "young": 232, "kid": 232}}
MOVE = {"flat": 2.0, "calm": 2.5, "lively": 3.3, "wild": 4.2}
PACE = {"slow": 1.12, "normal": 1.0, "fast": 0.9}
NOISE = {"flat": (0.45, 0.6), "calm": (0.55, 0.7), "lively": (0.7, 0.85), "wild": (0.8, 0.95)}
FX = {
    "god":       "aecho=0.8:0.7:60|130:0.32|0.2,lowpass=f=7000",
    "echo":      "aecho=0.8:0.6:50:0.3",
    "dark":      "aecho=0.8:0.5:35:0.18,lowpass=f=6500",
    "robot":     "flanger=delay=1.5:depth=1.5:regen=20:speed=0.4,highpass=f=120",
    "alien":     "flanger=delay=3:depth=3:regen=30,aecho=0.8:0.6:70:0.3",
    "changer":   "acrusher=bits=10:mix=0.25:mode=log,lowpass=f=4200",
    "demon":     "aecho=0.8:0.55:40:0.22",
    "holy":      "aecho=0.8:0.85:90|180:0.3|0.2",
    "telepathy": "aecho=0.8:0.8:70|140|210:0.4|0.25|0.15,highpass=f=200",
}

# ── casting: base characters get a unique speaker; "same" variants reuse their base's speaker ──
def resolve(key):
    c = dict(CAST[key])
    if "same" in c:
        base = resolve(c["same"]); st = base.get("st", 0) + c.get("st", 0)
        merged = {**base, **{k: v for k, v in c.items() if k not in ("same", "st")}}; merged["st"] = st; merged["base"] = base.get("base", c["same"])
        if "fx" not in c: merged["fx"] = base.get("fx")
        return merged
    c.setdefault("st", 0); c["base"] = key
    return c

usable = {sid: v for sid, v in SPK.items() if v["rms"] >= 0.1 and 2.4 <= v["dur"] <= 3.6}
assigned, used = {}, set()
bases = [k for k in CAST if not k.startswith("_") and "same" not in CAST[k] and not CAST[k].get("silent")]
for key in bases:
    c = CAST[key]; tgt = ST(BAND[c["g"]][c["band"]]); mv = MOVE[c["en"]]
    best = min((sid for sid in usable if sid not in used), key=lambda sid: abs(ST(usable[sid]["f0"]) - tgt) + 0.7 * abs(usable[sid]["move"] - mv))
    used.add(best); assigned[key] = best

def params(key, variant=""):
    c = resolve(key); sid = assigned[c["base"]]
    st = c.get("st", 0) + (3 if c.get("band") == "kid" else 0)
    ns, nw = NOISE[c["en"]]
    fx = [FX[c["fx"]]] if c.get("fx") else []
    if variant == "telepathy": fx.append(FX["telepathy"])
    p = {"speaker": sid, "length": PACE[c["pace"]], "noise": ns, "noise_w": nw, "st": st, "fx": ",".join(fx)}
    p["sig"] = hashlib.sha1(json.dumps(p, sort_keys=True).encode()).hexdigest()[:10]
    return p

# ── render ──
voice = PiperVoice.load(MODEL); SR = voice.config.sample_rate
state_path = os.path.join(HERE, "render_state.json")
state = json.load(open(state_path)) if os.path.exists(state_path) else {}
def ffmpeg(wav, dst, p):
    chain = []
    if p["st"]:
        r = 2 ** (p["st"] / 12.0)
        chain += [f"asetrate={int(SR * r)}", f"aresample={SR}", f"atempo={1 / r:.5f}"]
    if p["fx"]: chain.append(p["fx"])
    chain += ["silenceremove=start_periods=1:start_threshold=-50dB", "areverse", "silenceremove=start_periods=1:start_threshold=-50dB", "areverse",
              "loudnorm=I=-18:TP=-2:LRA=11", f"aresample={SR}"]
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    subprocess.run(["ffmpeg", "-loglevel", "error", "-y", "-i", wav, "-af", ",".join(chain), "-ac", "1", "-ar", str(SR), "-c:a", "aac", "-b:a", "32k", dst], check=True)
    os.unlink(wav)

todo = []
for j in JOBS:
    p = params(j["voice"], j["variant"]); dst = os.path.join(OUT, j["voice"], j["id"] + ".m4a")
    if os.path.exists(dst) and state.get(j["voice"] + "/" + j["id"]) == p["sig"]: continue
    todo.append((j, p, dst))
print(f"{len(JOBS)} clips, {len(todo)} to render", flush=True)
tmp = tempfile.mkdtemp(prefix="msv1-voice-")
with ThreadPoolExecutor(max_workers=4) as pool:
    futs = []
    for i, (j, p, dst) in enumerate(todo):
        cfg = SynthesisConfig(speaker_id=p["speaker"], length_scale=p["length"], noise_scale=p["noise"], noise_w_scale=p["noise_w"])
        wav = os.path.join(tmp, j["id"] + ".wav")
        with wave.open(wav, "wb") as w:
            w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
            for ch in voice.synthesize(j["text"], cfg): w.writeframes(ch.audio_int16_bytes)
        futs.append((pool.submit(ffmpeg, wav, dst, p), j, p))
        if i % 100 == 0: print(f"  {i}/{len(todo)} {j['voice']}", flush=True)
    for f, j, p in futs: f.result(); state[j["voice"] + "/" + j["id"]] = p["sig"]
json.dump(state, open(state_path, "w"), indent=0, sort_keys=True)
if ONLY: print("sample done"); sys.exit(0)

# ── orphans + manifest + cast report ──
want = {}
for j in JOBS: want.setdefault(j["voice"], set()).add(j["id"])
removed = 0
for d in (os.listdir(OUT) if os.path.isdir(OUT) else []):
    for f in os.listdir(os.path.join(OUT, d)):
        if f.endswith(".m4a") and f[:-4] not in want.get(d, set()): os.unlink(os.path.join(OUT, d, f)); removed += 1
manifest = {v: sorted(ids) for v, ids in sorted(want.items())}
with open(os.path.join(ROOT, "data", "story", "voiceManifest.js"), "w") as fh:
    fh.write("// GENERATED by tools/story/voice/build_voice.py — the story lines that have a spoken clip (story_voice/<voice>/<id>.m4a).\n")
    fh.write("export const STORY_VOICE = " + json.dumps(manifest, separators=(",", ":")) + "\nexport default STORY_VOICE\n")
cast = {k: {**{x: resolve(k).get(x) for x in ("g", "band", "en", "pace", "st", "fx", "base")}, "speaker": assigned[resolve(k)["base"]],
            "f0": usable[assigned[resolve(k)["base"]]]["f0"], "move": usable[assigned[resolve(k)["base"]]]["move"]}
        for k in CAST if not k.startswith("_") and not CAST[k].get("silent")}
json.dump(cast, open(os.path.join(HERE, "cast.json"), "w"), indent=1, sort_keys=True)
size = sum(os.path.getsize(os.path.join(OUT, d, f)) for d in os.listdir(OUT) for f in os.listdir(os.path.join(OUT, d)))
print(f"done: {sum(len(v) for v in want.values())} clips, {len(want)} voices, {removed} orphans removed, {size / 1e6:.1f} MB")
