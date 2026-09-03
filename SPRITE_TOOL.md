# Sprite Tool

A composable sprite creation / editing pipeline that matches the conventions the
rest of `tools/` already uses, so its output drops straight into a `characters.js`
`animationData` entry — no new pipeline for the codebase to learn.

- **`tools/sprite_tool.py`** — the CLI: `generate · key · slice · recolor · contact`.
- **`tools/sprite_preview.html`** — an isolated, client-side drag-and-drop viewer to
  eyeball a key / frame-grid / hue-recolor before committing. Touches **no** game file.

It is a standalone tool. It does **not** modify any character's `animationData`,
stats, or specials.

## Why these conventions

Every existing `reslice_*.py` emits one `*_uniform.png` **strip per action**: all
frames repacked into a single `uW×uH` cell, **centered-X and bottom-aligned** so feet
line up (→ `anchorY: 0`), with the background keyed transparent. `sprite_tool.py`
reuses exactly that math (see `reslice_bardock.py`, `reslice_piccolo.py`,
`harness/slice_scan.mjs`, `tools/reslice_strip.mjs`, `tools/recolor_palette.py`), so a
sliced strip is byte-shape-compatible with the engine and with the existing skin
generators.

An `animationData` entry looks like (from `bardock`):

```js
idle: { frames: 6, width: 108, height: 122, speed: 8, anchorY: 0, sheet: "./bardock_idle_uniform.png" },
```

`slice` prints that exact line for you (frames / width / height / anchorY / sheet).

---

## The four steps

Run `python3 tools/sprite_tool.py <verb> -h` for all flags. Requires `Pillow`,
`numpy`, `scipy` (already used across `tools/`).

### 1. `generate` — text → base sheet  *(backend STUBBED)*

```bash
python3 tools/sprite_tool.py generate \
  --prompt "a green-skinned alien mage, front-facing idle, pixel-art like piccolo" \
  --out cell_idle_raw.png --cols 6 --rows 1 --cell-w 96 --cell-h 128 --ref piccolo
```

**No image-generation backend is configured in this environment** (no API key or gen
script was found). So `generate` writes a **keyable placeholder sheet** — numbered-cell
humanoid silhouettes on solid `#00FF50` green, bottom-aligned — and prints the TODO
plus the documented backend interface. The placeholder is real enough that
`key → slice → recolor` all run on it today.

**To wire real AI generation later:** implement one function and point
`SPRITE_GEN_BACKEND=module:function` at it —

```python
def generate(prompt: str, out_path: str, *, cols: int, rows: int,
             cell_w: int, cell_h: int, ref: str | None) -> str:
    """Write a sprite SHEET at out_path: cols*rows frames on a SOLID #00FF50 green
    background, each figure bottom-aligned in its cell. Return out_path."""
```

Keep the **green-screen + bottom-aligned-cell** contract and the downstream verbs are
unchanged. Candidate backends: Anthropic / OpenAI Images / Stability / Replicate, or a
local ComfyUI workflow over HTTP.

### 2. `key` — remove background

```bash
# EB green-screen family (green #00FF50 + teal #008080 gutter):
python3 tools/sprite_tool.py key --in cell_idle_raw.png --out cell_idle_keyed.png \
  --mode green --report

# Tight key for a foreground close to the key color (e.g. Piccolo's green skin):
python3 tools/sprite_tool.py key --in cell_idle_raw.png --out cell_idle_keyed.png \
  --mode green --flood --report
```

`--mode green|color|alpha`. `--flood` is the **tight key**: it removes only key-colored
pixels **connected to the image border** (the true background), so an interior region
that happens to match the key — a green-skinned alien, Frieza's fill — is preserved.
This is the codebase's "green-fill" approach expressed as a border-connected component
filter (`PICCOLO_ASSET_MAP.md` / `FRIEZA` green-fill handling).

### 3. `slice` — frames → uniform feet-aligned strip

```bash
python3 tools/sprite_tool.py slice --in cell_idle_keyed.png --out cell_idle_uniform.png \
  --method gutter --report
```

- `--method gutter` (default): frames = column runs separated by transparent gutters
  (`slice_scan.mjs` / `reslice_strip.mjs` scheme). Best for horizontal strips.
- `--method cc`: connected-component islands, ordered `(y//band, x)`
  (`reslice_bardock.py` scheme). Best for grid / montage source sheets.
  Flags: `--min-area`, `--min-dim`, `--band`.
- `--flip` mirrors every cell (EB rips are drawn facing LEFT; the engine draws P1
  un-flipped expecting RIGHT).
- `--picks 0,3,5` keeps/reorders specific detected frames.

Packing is identical to `reslice_*.py`: `uW = max width + 2·pad`, `uH = max height +
2·pad`, centered-X, bottom-aligned. Prints the ready-to-paste `animationData` line.

### 4. `recolor` — palette / hue for alt skins & transform tiers

```bash
# hue-rotate the whole sheet (quick tier tint):
python3 tools/sprite_tool.py recolor --in cell_idle_uniform.png --out-tag violet --to-hue 275

# targeted: only the robe hue-band, exact target color:
python3 tools/sprite_tool.py recolor --in cell_idle_uniform.png --out-tag gold \
  --from-hue 90-160 --to "#E0B028" --report
```

Delegates to `tools/recolor_palette.py` (single source of truth), so results match
every `gen_*_creative.py` skin build. Output is `<stem>__<tag>.png`, the
`recolorSkinAnim` naming skins.js expects. For a global hue bake you can also use
`harness/recolor_hue.mjs`.

### `contact` — quick visual check

```bash
python3 tools/sprite_tool.py contact --in cell_idle_uniform.png --out cell_idle_contact.png --scale 3
```

Tiles the strip into a labeled scaled montage (same idea as `preview()` in the
`gen_*_creative.py` scripts). For an interactive check, open `tools/sprite_preview.html`
and drag the PNG in.

---

## Worked example — Cell (the roster's spriteless dev character)

`cell` exists in `characters.js` as `isPlayable: false` with **no sprite art yet** — a
real gap, not a throwaway. Here is the exact flow to give it an idle. *(This is the
documented procedure; it does not modify `characters.js` as part of the tool task.)*

```bash
# 1. base sheet (placeholder today; real art once a backend is wired)
python3 tools/sprite_tool.py generate \
  --prompt "Cell, DBZ perfect form, green/black bio-armor, idle breathing, pixel-art" \
  --out cell_idle_raw.png --cols 6 --rows 1 --cell-w 96 --cell-h 128 --ref piccolo

# 2. key the green background — FLOOD because Cell's body is green (tight key so his
#    own green armor survives, exactly like Piccolo)
python3 tools/sprite_tool.py key --in cell_idle_raw.png --out cell_idle_keyed.png \
  --mode green --flood --report

# 3. slice into a uniform feet-aligned strip
python3 tools/sprite_tool.py slice --in cell_idle_keyed.png --out cell_idle_uniform.png \
  --method gutter --report
#   → prints, e.g.:
#   animationData → { frames: 6, width: 43, height: 113, anchorY: 0, sheet: "./cell_idle_uniform.png" }

# 4. (optional) an alt "Imperfect Cell" green-tier tint
python3 tools/sprite_tool.py recolor --in cell_idle_uniform.png --out-tag imperfect --to-hue 130
```

Then that printed line becomes Cell's `idle` in `animationData` (add `speed:`, wire
the rest of the states), and `isPlayable` can flip to `true`:

```js
idle: { frames: 6, width: 43, height: 113, speed: 8, anchorY: 0, sheet: "./cell_idle_uniform.png" },
```

---

## Smoke tests (all passing)

Run from the repo root:

```bash
# End-to-end on a generated placeholder — asserts frame count matches --cols.
python3 tools/sprite_tool.py generate --prompt "green alien mage idle" --out /tmp/mage_raw.png --cols 5 --rows 1
python3 tools/sprite_tool.py key   --in /tmp/mage_raw.png   --out /tmp/mage_keyed.png --report
python3 tools/sprite_tool.py slice --in /tmp/mage_keyed.png --out /tmp/mage_uniform.png --report   # → 5 frames

# Round-trip a REAL uniform strip — hand-checked expectation from characters.js:
#   bardock.idle = { frames: 6, width: 108, height: 122 }
python3 tools/sprite_tool.py slice --in bardock_idle_uniform.png --out /tmp/bardock_rt.png --report
#   → "detected 6 raw frame(s)" · cell 108x122  ✓ matches characters.js exactly
```

Verified during build:

| Check | Result |
|---|---|
| `generate → key → slice` on a 5-cell placeholder | **5 frames** detected ✓ |
| Round-trip `bardock_idle_uniform.png` | **6 frames, 108×122** — matches `characters.js` ✓ |
| `--method cc --flip` on `bardock_win_uniform.png` | 6 frames, feet-aligned ✓ |
| Tight `--flood` key vs threshold on a green-on-green fixture | threshold eats interior green (0 px kept); flood preserves it (100 px kept) ✓ |
| `sprite_preview.html` headless load | loads, no JS errors, references no game file ✓ |

---

## What's built / where it lives / what's deferred

**Built**
- `tools/sprite_tool.py` — `generate` (stub) · `key` (green/color/alpha + tight flood) ·
  `slice` (gutter + connected-component, flip, picks, uniform feet-aligned output) ·
  `recolor` (delegates to `recolor_palette.py`) · `contact` (montage). Importable
  functions (`key_image`, `slice_sheet`, `recolor_sheet`, `generate_sheet`,
  `contact_sheet`) for scripting.
- `tools/sprite_preview.html` — isolated client-side viewer (key toggle + tolerance,
  frame-grid overlay, hue/saturate recolor preview, color-pick key). No server, no
  changes to `game.js` / `sprite.js` / `index.html`.
- `SPRITE_TOOL.md` — this file.

**Stubbed / deferred**
- **GENERATE has no live image-gen backend** in this environment — it emits a keyable
  placeholder + a documented `SPRITE_GEN_BACKEND=module:function` interface. Wire an
  API/local model to that contract (green-screen, bottom-aligned cells) and steps 2–4
  are unchanged.
- Slicing assumes frames are separated by transparent gutters (post-key) or are
  distinct opaque islands. A sheet with touching figures on a busy background needs
  `--method cc` tuning (`--min-area` / `--band`) or a manual pre-key, same caveat the
  existing `reslice_*.py` scripts carry.
- `recolor` exposes the common `recolor_palette.py` options (hue / exact-target /
  hue-band / yband); the full multi-pass region classifier used by `gen_*_creative.py`
  stays in those per-character scripts by design (single source of truth).
- No credits impact: this tool ships **no** sourced art. Any real sheet generated or
  imported through it must still add its `credits.js` entry in the same commit
  (`npm run test:credits`), per the repo's hard rule.
