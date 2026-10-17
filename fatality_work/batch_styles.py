import re, os
from PIL import Image
ns={}; exec(open("fatality_work/gen_styles.py").read().split('if __name__')[0], ns)
STYLES={"smoosh":ns["smoosh"],"riddled":ns["riddled"],"ashen":ns["ashen"]}
cj=open("characters.js",encoding="utf-8").read()
os.makedirs("fatality",exist_ok=True)
keys=[(m.start(),m.group(1)) for m in re.finditer(r'rosterKey:\s*"([a-zA-Z0-9_]+)"',cj)]
idle=list(re.finditer(r'idle:\s*\{\s*frames:\s*(\d+),\s*width:\s*(\d+),[^}]*?sheet:\s*"\./([^"]+)"',cj))
counts={k:0 for k in STYLES}; skip=0
for pos,key in keys:
    nxt=next((mm for mm in idle if mm.start()>pos),None)
    if not nxt: continue
    fw=int(nxt.group(2)); sheet=nxt.group(3)
    if not os.path.exists(sheet): skip+=1; continue
    for sn,fn in STYLES.items():
        try: fn(sheet,fw,f"fatality/{key}_{sn}.png"); counts[sn]+=1
        except Exception as e: pass
print("generated:",counts,"skipped-missing:",skip)
print("total fatality/ pngs:",len([f for f in os.listdir("fatality") if f.endswith(".png")]))
