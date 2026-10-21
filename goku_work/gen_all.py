#!/usr/bin/env python3
"""Drive forms.py to emit every per-form sheet + a contact sheet, and report
direct/recoloured/fallback counts per form. Source is only READ."""
import importlib.util, json, numpy as np
from PIL import Image
from scipy import ndimage

spec = importlib.util.spec_from_file_location("forms", "goku_work/forms.py")
forms = importlib.util.module_from_spec(spec); spec.loader.exec_module(forms)
inv = json.load(open("assets/source/goku_inventory.json"))
baseim = Image.open("assets/source/goku_original.png").convert("RGBA")
H, W = forms.H, forms.W

def remove_eyebrows(out):
    """SSJ3 canon: recolour brow pixels (dark pixels embedded in skin on the
    upper face) to the surrounding skin tone."""
    skin = forms.skin_full
    changed = 0
    for r in inv["rows"]:
        for f in r["frames"]:
            y0 = f["y"] + int(f["h"] * 0.08); y1 = f["y"] + int(f["h"] * 0.5)
            x0 = f["x"]; x1 = f["x"] + f["w"]
            if y1 <= y0:
                continue
            sk = skin[y0:y1, x0:x1]
            if sk.sum() < 20:
                continue
            sub = out[y0:y1, x0:x1, :3]
            rr, gg, bb = sub[:, :, 0], sub[:, :, 1], sub[:, :, 2]
            lum = 0.3*rr + 0.59*gg + 0.11*bb
            dark = (lum < 80) & (rr - bb < 40)
            # brow = dark speck fully embedded in skin (skin on BOTH sides within
            # 2px AND skin above) in the forehead/eye band — not neck/jaw shadow
            skL = np.zeros_like(sk); skL[:, 1:] = sk[:, :-1]
            skR = np.zeros_like(sk); skR[:, :-1] = sk[:, 1:]
            skL2 = np.zeros_like(sk); skL2[:, 2:] = sk[:, :-2]
            skR2 = np.zeros_like(sk); skR2[:, :-2] = sk[:, 2:]
            skU = np.zeros_like(sk); skU[1:, :] = sk[:-1, :]
            brow = dark & (~sk) & (skL | skL2) & (skR | skR2) & skU
            if brow.sum() == 0 or brow.sum() > 10:
                continue
            # skin mean colour in this window
            sc = out[y0:y1, x0:x1, :3][sk]
            if len(sc) == 0:
                continue
            mean = sc.mean(0).astype(int)
            sub[brow] = mean
            changed += int(brow.sum())
    return changed

def contact(form, out, note):
    """base | result pairs for a representative spread of frames."""
    want = [(0,0),(0,3),(2,2),(2,6),(6,1),(7,4),(8,5),(9,3),(10,4),(8,14),
            (14,2),(15,2),(20,3),(21,5),(22,4)]
    res = Image.fromarray(out.astype("uint8"))
    cell = 92
    picks = []
    for (ri, fi) in want:
        for r in inv["rows"]:
            if r["row"] == ri and fi < len(r["frames"]):
                picks.append(r["frames"][fi]); break
    m = Image.new("RGBA", (cell*2*len(picks), cell+18), (0,128,128,255))
    for i, f in enumerate(picks):
        x,y,w,h = f["x"],f["y"],f["w"],f["h"]
        m.paste(baseim.crop((x,y,x+w,y+h)), (i*2*cell+6, 20))
        m.paste(res.crop((x,y,x+w,y+h)), (i*2*cell+cell+6, 20))
    m = m.resize((m.width*2, m.height*2), Image.NEAREST)
    m.save(f"goku_work/_contact_{form}.png")
    m.save(f"assets/goku_forms/goku_{form}_contact.png")

REPORT = {}
for form in ["ssj","ssj2","ssj3","god","blue","ui"]:
    out, stats = forms.build_form(form)
    eyes = forms.eyes_pass(out, form)
    brows = remove_eyebrows(out) if form == "ssj3" else 0
    Image.fromarray(out.astype("uint8")).save(f"assets/goku_forms/goku_{form}.png")
    contact(form, out, "")
    REPORT[form] = dict(stats=stats, eyes_px=eyes, brow_px=brows)
    print(f"{form:5s} frames={stats['frames']} recoloured(confident)={stats['confident']} "
          f"fallback={stats['fallback']} eyes_px={eyes} brow_px={brows}")
json.dump(REPORT, open("goku_work/_forms_report.json","w"), indent=1)
print("wrote 6 sheets to assets/goku_forms/ + contact sheets")
