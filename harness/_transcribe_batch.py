import sys, os, json, glob
from faster_whisper import WhisperModel
group_dir = sys.argv[1]; prefix = sys.argv[2]; out = sys.argv[3]
model_size = sys.argv[4] if len(sys.argv) > 4 else "base"
model = WhisperModel(model_size, device="cpu", compute_type="int8")
files = sorted(glob.glob(os.path.join(group_dir, prefix + "_*.mp3")))
res = {}
for i, f in enumerate(files):
    try:
        segs, info = model.transcribe(f, beam_size=1)
        text = " ".join(s.text for s in segs).strip()
        res[os.path.basename(f)] = {"lang": info.language, "p": round(info.language_probability,2), "text": text}
    except Exception as e:
        res[os.path.basename(f)] = {"lang": None, "p": 0, "text": "", "error": str(e)}
    if (i+1) % 10 == 0:
        json.dump(res, open(out,"w"), indent=0, ensure_ascii=False)
        print(f"  {prefix}: {i+1}/{len(files)}", flush=True)
json.dump(res, open(out,"w"), indent=0, ensure_ascii=False)
print(f"DONE {prefix}: {len(files)} -> {out}", flush=True)
