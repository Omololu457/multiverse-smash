import subprocess, os, tempfile
def head(f): return subprocess.run(["git","show",f"HEAD:{f}"],capture_output=True,text=True).stdout
def wt(f): return open(f,encoding="utf-8").read()
def brace_end(lines, i):
    depth=0; started=False
    for j in range(i,len(lines)):
        depth+=lines[j].count("{")-lines[j].count("}")
        if "{" in lines[j]: started=True
        if started and depth<=0: return j
    raise RuntimeError("no brace close")
def extract_const(wtsrc, decl):
    L=wtsrc.split("\n")
    i=next(k for k,l in enumerate(L) if decl in l)
    # back up over leading comment lines
    s=i
    while s>0 and L[s-1].lstrip().startswith("//"): s-=1
    e=brace_end(L,i)
    return "\n".join(L[s:e+1])
def verify_stage(f,newtext,foreign_ok_substrings=()):
    h=head(f)
    import tempfile
    a=tempfile.NamedTemporaryFile("w",delete=False,suffix=".h",encoding="utf-8"); a.write(h); a.close()
    b=tempfile.NamedTemporaryFile("w",delete=False,suffix=".n",encoding="utf-8"); b.write(newtext); b.close()
    diff=subprocess.run(["git","diff","--no-index",a.name,b.name],capture_output=True,text=True).stdout
    os.unlink(a.name); os.unlink(b.name)
    adds=[l[1:] for l in diff.splitlines() if l.startswith("+") and not l.startswith("+++")]
    bad=[]
    for l in adds:
        low=l.lower()
        if any(k in low for k in ["goku_rose","gokurose","rosé","gogeta","roseki","rosekameha","rosedragon","rosesword","rosescythe","rosekameha"]):
            if not any(ok in l for ok in foreign_ok_substrings): bad.append(l)
    if bad:
        print(f"  ✗ {f}: FOREIGN leak:"); [print("     ",x[:80]) for x in bad[:4]]; return False
    if "shisui_blade" not in " ".join(adds).lower() and "blKunai" not in " ".join(adds) and "shisuiBlade" not in " ".join(adds):
        print(f"  ✗ {f}: no blade content"); return False
    sha=subprocess.run(["git","hash-object","-w","--stdin"],input=newtext,capture_output=True,text=True).stdout.strip()
    subprocess.run(["git","update-index","--cacheinfo",f"100644,{sha},{f}"],check=True)
    print(f"  ✓ {f}: staged mine-only (+{len(adds)} vs HEAD, {sha[:8]})")
    return True
ok=True

# characters.js
f="characters.js"; H=head(f); W=wt(f)
blade=extract_const(W,"const shisuiBlade = {")
new=H.replace("\nexport const characters = {", "\n"+blade+"\n\nexport const characters = {",1)
new=new.replace(
"  shisui_trinity: shisuiTrinity      // NEW additive — MK1-Ghostface 3-identity fighter (Loyalist form, P1); Blade/Puppeteer identities added in later phases\n}",
"  shisui_trinity: shisuiTrinity,     // NEW additive — MK1-Ghostface 3-identity fighter (Loyalist form, P1); Blade/Puppeteer identities added in later phases\n  shisui_blade: shisuiBlade          // SHISUI — THE BLADE identity (P2). HIDDEN (isPlayable:false); reached via the Variant Swap (P4), boots directly in the harness\n}")
ok&=verify_stage(f,new)

# abilities.js
f="abilities.js"; H=head(f); W=wt(f); L=W.split("\n")
s=next(k for k,l in enumerate(L) if "THE BLADE (shisui_blade) — PHASE 2" in l)
while s>0 and L[s-1].lstrip().startswith("//"): s-=1
e=next(k for k in range(s,len(L)) if L[k].startswith("export function triggerSpecial(fighter, context = {})"))
blade=L[s:e]   # includes trailing blank
new=H.replace("export function triggerSpecial(fighter, context = {})", "\n".join(blade)+"\nexport function triggerSpecial(fighter, context = {})",1)
new=new.replace(
'    case "shisui_trinity": return executeShisuiTrinitySpecial(fighter, context)   // SHISUI — THE LOYALIST: Fwd=Backstab / N=Fireball / B=Genjutsu Grab / D=Kunai Rain / U=Flurry. Blade/Puppeteer identities (P2/P3) add their own cases.',
'    case "shisui_trinity": return executeShisuiTrinitySpecial(fighter, context)   // SHISUI — THE LOYALIST: Fwd=Backstab / N=Fireball / B=Genjutsu Grab / D=Kunai Rain / U=Flurry. Blade/Puppeteer identities (P2/P3) add their own cases.\n    case "shisui_blade": return executeShisuiBladeSpecial(fighter, context)   // SHISUI — THE BLADE: Fwd=Backstab / N=Kunai Barrage / D=Iaido Draw / U=Rising Overhead / B=Afterimage Feint / Charge+Sp=Mangekyou Focus.')
new=new.replace(
'      case "shisui_trinity": cast = executeShisuiTrinityUltimate(fighter, context); break   // SHISUI — THE LOYALIST: Susanoo Tsukumo (ribcage + magatama + needle volley). Blade/Puppeteer ults (P2/P3) add their own cases.',
'      case "shisui_trinity": cast = executeShisuiTrinityUltimate(fighter, context); break   // SHISUI — THE LOYALIST: Susanoo Tsukumo (ribcage + magatama + needle volley). Blade/Puppeteer ults (P2/P3) add their own cases.\n      case "shisui_blade": cast = executeShisuiBladeUltimate(fighter, context); break   // SHISUI — THE BLADE: Shunshin: Thousand Cuts (committed multi-hit blade flurry).')
ok&=verify_stage(f,new)
print("chars+abilities:",ok)

# skins.js
f="skins.js"; H=head(f)
anchor='  shisui_trinity: [\n    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.shisui_trinity?.portrait, spriteScale: characters.shisui_trinity?.spriteScale, animationData: null },\n  ],\n'
add=anchor+'''  // Shisui (Trinity) — THE BLADE identity (P2). REQUIRED default entry so getSkins() carries its real
  // spriteScale (1.35) instead of clobbering to 1 when the Blade is swapped in / booted directly.
  shisui_blade: [
    { id: "default", name: "Default", unlockLevel: 0, portrait: characters.shisui_blade?.portrait, spriteScale: characters.shisui_blade?.spriteScale, animationData: null },
  ],
'''
assert anchor in H, "skins anchor missing"
ok&=verify_stage(f,H.replace(anchor,add))

# sprite.js
f="sprite.js"; H=head(f)
anchor='  shiKunaiRain: "shiKunaiRain", shiFlurry: "shiFlurry", shiArmslam: "shiArmslam", shiSusanoo: "shiSusanoo",\n'
add=anchor+'''  // Shisui (Trinity) — THE BLADE special cast poses (own blade sheets). (Kunai Barrage / Iaido / Rising Overhead / Afterimage Feint / Focus / Thousand Cuts.)
  blKunai: "blKunai", blIaido: "blIaido", blRising: "blRising", blFeint: "blFeint", blFocus: "blFocus", blThousand: "blThousand",
'''
assert anchor in H, "sprite anchor missing"
ok&=verify_stage(f,H.replace(anchor,add))
print("skins+sprite:",ok)
