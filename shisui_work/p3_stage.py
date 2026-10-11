import subprocess, os, tempfile
def head(f): return subprocess.run(["git","show",f"HEAD:{f}"],capture_output=True,text=True).stdout
def wt(f): return open(f,encoding="utf-8").read()
def brace_end(lines,i):
    depth=0;started=False
    for j in range(i,len(lines)):
        depth+=lines[j].count("{")-lines[j].count("}")
        if "{" in lines[j]:started=True
        if started and depth<=0:return j
    raise RuntimeError("brace")
FOREIGN=["goku_rose","gokurose","rosé","gogeta","rosedragon","rosekameha","rosescythe","madara_war","madarawar","executemadara","drawmadarawar"]
def verify_stage(f,newtext):
    h=head(f)
    a=tempfile.NamedTemporaryFile("w",delete=False,suffix=".h",encoding="utf-8");a.write(h);a.close()
    b=tempfile.NamedTemporaryFile("w",delete=False,suffix=".n",encoding="utf-8");b.write(newtext);b.close()
    diff=subprocess.run(["git","diff","--no-index",a.name,b.name],capture_output=True,text=True).stdout
    os.unlink(a.name);os.unlink(b.name)
    adds=[l[1:] for l in diff.splitlines() if l.startswith("+") and not l.startswith("+++")]
    bad=[l for l in adds if any(k in l.lower() for k in FOREIGN) and not l.strip().startswith("//")]
    if bad:
        print(f"  ✗ {f}: FOREIGN leak:");[print("    ",x[:76]) for x in bad[:4]];return False
    if "puppeteer" not in " ".join(adds).lower() and "shisuiPuppeteer" not in " ".join(adds) and "puCast" not in " ".join(adds) and "_koto" not in " ".join(adds).lower():
        print(f"  ✗ {f}: no puppeteer content");return False
    sha=subprocess.run(["git","hash-object","-w","--stdin"],input=newtext,capture_output=True,text=True).stdout.strip()
    subprocess.run(["git","update-index","--cacheinfo",f"100644,{sha},{f}"],check=True)
    print(f"  ✓ {f}: staged mine-only (+{len(adds)} vs HEAD, {sha[:8]})");return True
ok=True
# characters.js
f="characters.js";H=head(f);W=wt(f);L=W.split("\n")
i=next(k for k,l in enumerate(L) if "const shisuiPuppeteer = {" in l); s=i
while s>0 and L[s-1].lstrip().startswith("//"):s-=1
e=brace_end(L,i); block="\n".join(L[s:e+1])
new=H.replace("\nexport const characters = {","\n"+block+"\n\nexport const characters = {",1)
new=new.replace(
"  shisui_blade: shisuiBlade          // SHISUI — THE BLADE identity (P2). HIDDEN (isPlayable:false); reached via the Variant Swap (P4), boots directly in the harness\n}",
"  shisui_blade: shisuiBlade,         // SHISUI — THE BLADE identity (P2). HIDDEN (isPlayable:false); reached via the Variant Swap (P4), boots directly in the harness\n  shisui_puppeteer: shisuiPuppeteer  // SHISUI — THE PUPPETEER identity (P3). HIDDEN (isPlayable:false); reached via the Variant Swap (P4), boots directly in the harness\n}")
ok&=verify_stage(f,new)
# abilities.js
f="abilities.js";H=head(f);W=wt(f);L=W.split("\n")
s=next(k for k,l in enumerate(L) if "THE PUPPETEER (shisui_puppeteer) — PHASE 3" in l)
while s>0 and L[s-1].lstrip().startswith("//"):s-=1
e=next(k for k in range(s,len(L)) if L[k].startswith("export function triggerSpecial(fighter, context = {})"))
block=L[s:e]
new=H.replace("export function triggerSpecial(fighter, context = {})","\n".join(block)+"\nexport function triggerSpecial(fighter, context = {})",1)
new=new.replace(
'    case "shisui_blade": return executeShisuiBladeSpecial(fighter, context)   // SHISUI — THE BLADE: Fwd=Backstab / N=Kunai Barrage / D=Iaido Draw / U=Rising Overhead / B=Afterimage Feint / Charge+Sp=Mangekyou Focus.',
'    case "shisui_blade": return executeShisuiBladeSpecial(fighter, context)   // SHISUI — THE BLADE: Fwd=Backstab / N=Kunai Barrage / D=Iaido Draw / U=Rising Overhead / B=Afterimage Feint / Charge+Sp=Mangekyou Focus.\n    case "shisui_puppeteer": return executeShisuiPuppeteerSpecial(fighter, context)   // SHISUI — THE PUPPETEER: Fwd=Backstab / N=Gokakyu / B=Hosenka / D=Susanoo Stance(→Needle/Sword) / U=Flurry / Charge+Sp=Shuriken.')
new=new.replace(
'      case "shisui_blade": cast = executeShisuiBladeUltimate(fighter, context); break   // SHISUI — THE BLADE: Shunshin: Thousand Cuts (committed multi-hit blade flurry).',
'      case "shisui_blade": cast = executeShisuiBladeUltimate(fighter, context); break   // SHISUI — THE BLADE: Shunshin: Thousand Cuts (committed multi-hit blade flurry).\n      case "shisui_puppeteer": cast = executeShisuiPuppeteerUltimate(fighter, context); break   // SHISUI — THE PUPPETEER: Kotoamatsukami (genjutsu-world backdrop + 3 eyes → mirror opp L/R + lock specials ~2.5s).')
ok&=verify_stage(f,new)
print("ok:",ok)
