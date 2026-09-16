import sys, os, json, glob
from faster_whisper import WhisperModel
group_dir, prefix, out = sys.argv[1], sys.argv[2], sys.argv[3]
model = WhisperModel("base", device="cpu", compute_type="int8")
files = sorted(glob.glob(os.path.join(group_dir, prefix + "_*.mp3")))
res = {}
for f in files:
    segs, info = model.transcribe(f, beam_size=1, task="translate")
    res[os.path.basename(f)] = " ".join(s.text for s in segs).strip()
json.dump(res, open(out,"w"), indent=0, ensure_ascii=False)
print("DONE", prefix, len(files))
