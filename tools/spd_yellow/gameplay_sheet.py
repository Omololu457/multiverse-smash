"""Stitch the deterministic S.P.D. Yellow frame captures (harness/spd_yellow_visual.mjs -> docs/spd_yellow/frames/)
into one labelled gameplay contact sheet: docs/spd_yellow/gameplay_contact_sheet.png.
Each row = one feature; each cell = one exact simulation frame (label = feature + frame since the action started).
    python3 tools/spd_yellow/gameplay_sheet.py
"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
FR = ROOT / 'docs/spd_yellow/frames'
OUT = ROOT / 'docs/spd_yellow/gameplay_contact_sheet.png'
ROWS = [('pistol', 'Compact pistol (tap) — shot leaves frame 12'), ('long_gun', 'Long gun (held 34 f) — frames after release'),
        ('blink', 'Double-tap blink — streak0 vanish / streak1 travel / acro4 recovery'), ('duplicate', 'Duplicate (Down Special) — appears frame 14'),
        ('swap', 'Swap (Forward Special) — exchange on frame 8'), ('coins', 'Tactical Coins — earn spin (supplied HUD frames)'),
        ('zord_intercept', 'Ninja Megazord — Intercept Punch'), ('zord_rising', 'Ninja Megazord — Rising Kick'), ('zord_sword', 'Ninja Megazord — Sword Finish'),
        ('stance', 'Command stance panel'), ('ult', 'Duplicate Raid: Ninja Crossbreaker — frames from the opener')]
SCALE = 0.5


def main():
    rows = []
    for key, title in ROWS:
        files = sorted(FR.glob(f'{key}_*.png'))
        if files:
            rows.append((key, title, files))
    if not rows:
        raise SystemExit('no frames — run node harness/spd_yellow_visual.mjs first')
    w0, h0 = Image.open(rows[0][2][0]).size
    cw, ch = int(w0 * SCALE), int(h0 * SCALE)
    cols = max(len(f) for _, _, f in rows)
    head = 18
    sheet = Image.new('RGB', (cols * (cw + 4) + 4, len(rows) * (ch + head + 6) + 4), (16, 18, 24))
    d = ImageDraw.Draw(sheet)
    for r, (key, title, files) in enumerate(rows):
        y = 4 + r * (ch + head + 6)
        d.text((6, y + 2), title, fill=(242, 216, 28))
        for c, f in enumerate(files):
            im = Image.open(f).convert('RGB').resize((cw, ch), Image.NEAREST)
            x = 4 + c * (cw + 4)
            sheet.paste(im, (x, y + head))
            d.text((x + 4, y + head + 3), f'f{int(f.stem.split("_")[-1])}', fill=(255, 255, 255))
    sheet.save(OUT)
    print(OUT.relative_to(ROOT), sheet.size, sum(len(f) for _, _, f in rows), 'cells')


if __name__ == '__main__':
    main()
