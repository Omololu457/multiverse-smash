import json, sys, subprocess, os
# args: transcript.json  staging_dir  outLog  title  wired_csv  header_text
tj, sdir, out, title, wired_csv, header = sys.argv[1:7]
d = json.load(open(tj))
wired = set(w.strip() for w in wired_csv.split(",") if w.strip())
def dur(k):
    p=os.path.join(sdir,k)
    try: return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',p]).strip())
    except: return -1
lines=[f"# {title}",""]
lines.append(header); lines.append("")
lines.append(f"**{len(wired)} of {len(d)} clips wired.** Per-file transcript log below (✅ = wired, — = discarded).")
lines.append("")
for k in sorted(d):
    v=d[k]; txt=(v['text'] if isinstance(v,dict) else v).strip()
    lang=v.get('lang','') if isinstance(v,dict) else ''
    mark="✅" if k in wired else "—"
    lines.append(f"- {mark} `{k}` ({dur(k):.1f}s{', '+lang if lang else ''}) — {txt or '[non-speech / silence]'}")
open(out,"w").write("\n".join(lines)+"\n")
print("wrote",out,f"({len(wired)}/{len(d)})")
