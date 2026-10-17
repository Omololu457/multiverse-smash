# Batch pre-build chopped-victim sprites for the roster, from each character's existing idle frame.
import re, os
from PIL import Image
import importlib.util
spec = importlib.util.spec_from_file_location("gen_chop", "fatality_work/gen_chop.py")
# we just reuse the chop() function by exec (gen_chop runs demo at import; guard that)
src = open("fatality_work/gen_chop.py").read().split("# Demo on")[0]  # drop the demo tail
ns = {}; exec(src, ns); chop = ns["chop"]

cj = open("characters.js", encoding="utf-8").read()
os.makedirs("fatality", exist_ok=True)
# map each rosterKey to the nearest following idle def (frames,width,sheet)
keys = [(m.start(), m.group(1)) for m in re.finditer(r'rosterKey:\s*"([a-zA-Z0-9_]+)"', cj)]
idle = list(re.finditer(r'idle:\s*\{\s*frames:\s*(\d+),\s*width:\s*(\d+),[^}]*?sheet:\s*"\./([^"]+)"', cj))
made=0; miss=[]; nofile=[]
for pos, key in keys:
    nxt = next((mm for mm in idle if mm.start() > pos), None)
    if not nxt: miss.append(key); continue
    fw = int(nxt.group(2)); sheet = nxt.group(3)
    if not os.path.exists(sheet): nofile.append(f"{key}:{sheet}"); continue
    try:
        chop(sheet, frame_w=fw, seed=(abs(hash(key))%1000), out=f"fatality/{key}_chopped.png")
        made += 1
    except Exception as e:
        nofile.append(f"{key}:ERR {str(e)[:30]}")
print(f"generated {made} chopped sprites -> fatality/")
if miss: print("no-idle:", len(miss), miss[:6])
if nofile: print("skipped:", len(nofile), nofile[:6])
