#!/usr/bin/env python3
"""Attach verified key-frame picks + row labels to goku_inventory.json.
These coordinates were confirmed by eye against zoomed crops in Phase 1.
Does NOT touch the source image."""
import json

INV = "assets/source/goku_inventory.json"
inv = json.load(open(INV))

# --- verified key frames (tight source bbox: x,y,w,h) ---
inv["key_frames"] = {
    # transformation donor heads / reference standing frames (right cluster, y~205-290)
    "battle_damage_1":  {"x": 1004, "y": 212, "w": 44, "h": 70, "note": "shirtless torn-gi standing #1 (low-HP idle / lose)"},
    "battle_damage_2":  {"x": 1052, "y": 212, "w": 44, "h": 70, "note": "shirtless torn-gi standing #2"},
    "base_standing":    {"x": 1100, "y": 212, "w": 46, "h": 70, "note": "BASE idle reference (black hair)"},
    "god_standing":     {"x": 1148, "y": 212, "w": 46, "h": 70, "note": "GOD idle reference (red hair)"},
    "ui_standing":      {"x": 1196, "y": 212, "w": 46, "h": 70, "note": "ULTRA INSTINCT idle reference (silver hair)"},
    "ui_head_1":        {"x": 1210, "y": 218, "w": 26, "h": 27, "note": "UI silver loose head #1"},
    "ui_head_2":        {"x": 1241, "y": 218, "w": 28, "h": 27, "note": "UI silver loose head #2"},
    "god_head_1":       {"x": 1210, "y": 255, "w": 28, "h": 30, "note": "GOD red loose head #1"},
    "god_head_2":       {"x": 1245, "y": 255, "w": 28, "h": 30, "note": "GOD red loose head #2"},
    # gold SSJ cluster (right, y~0-200)
    "ssj_loose_head_1": {"x": 1004, "y": 18, "w": 46, "h": 52, "note": "SSJ gold loose head #1 (top gold row)"},
    "ssj_loose_head_2": {"x": 1105, "y": 18, "w": 46, "h": 52, "note": "SSJ gold loose head #2"},
    "kaioken_standing": {"x": 1156, "y": 5, "w": 36, "h": 66, "note": "Kaioken crimson-tinted standing frame (overlay tint sample)"},
    # effect strips
    "crescent_arc":     {"x": 617, "y": 1561, "w": 81, "h": 43, "note": "pale CRESCENT KICK arc effect"},
    "afterimage_ghost": {"x": 1173, "y": 1067, "w": 63, "h": 56, "note": "OUTLINE-ONLY white ghost (zanzoken / afterimage)"},
    "fist_barrage_band":{"x": 760, "y": 1180, "w": 640, "h": 150, "note": "RAPID FIST BARRAGE effect strip (4 flying-fist frames with blue trails)"},
    "ki_charge_band":   {"x": 300, "y": 159, "w": 460, "h": 95, "note": "~13-frame powering-up / KI CHARGE row"},
    "gold_ssj_idle_band":   {"x": 820, "y": 0, "w": 420, "h": 130, "note": "SSJ gold idle-stance frames"},
    "gold_ssj_flight_band": {"x": 820, "y": 130, "w": 580, "h": 75, "note": "SSJ gold flight/dash frames"},
}

# SSJ3 explicit finding
inv["ssj3"] = {
    "donor_frames_present": False,
    "decision": "NO SSJ3 long-haired powering frames and NO loose SSJ3 head exist on this "
                "sheet (verified by full visual scan of the transformation cluster + a "
                "black-hair-mass distribution scan). SSJ3 will be built 100% as FALLBACK in "
                "Phase 2: SSJ gold sheet with a brighter ramp + removed eyebrows (brow->skin). "
                "The Phase-3 SSJ3 transform cinematic substitutes a code-drawn long-hair flare "
                "over the KI-CHARGE frames instead of dedicated long-hair frames.",
}

# best-effort row category labels (visually verified groupings)
labels = {
 0:"idle + base standing refs + gold loose heads (mixed top band)",
 1:"base loose heads / small head frames",
 2:"KI CHARGE powering-up row (~13 frames) + heads",
 3:"jump arcs / UI standing ref overflow",
 4:"gold SSJ idle-stance + flight overflow",
 5:"gold SSJ flight/dash",
 6:"crouch / low frames",
 7:"walk + attack starts (mixed)",
 8:"punch & combat strings + knockdowns (dense block)",
 9:"kick strings",
 10:"aerial / jump-kick strings",
 11:"hurt / stagger",
 12:"fall / knockdown / getup (dense)",
 13:"get-up / recovery",
 14:"dash / blur-streak frames",
 15:"aerials + AFTERIMAGE ghost (idx16)",
 16:"fist-barrage / small-fx overflow",
 17:"jump / flip",
 18:"advancing / forward punches",
 19:"kicks",
 20:"crescent kick + CRESCENT ARC (idx10)",
 21:"combat / specials poses (dense)",
 22:"walk / stance + crescent overflow",
}
for r in inv["rows"]:
    r["label"] = labels.get(r["row"], "")
    r["use"]   = "see docs/goku/LEDGER.md"

json.dump(inv, open(INV, "w"), indent=1)
print("annotated", INV, "| key_frames:", len(inv["key_frames"]), "| rows:", len(inv["rows"]))
