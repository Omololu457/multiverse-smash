#!/usr/bin/env python3
"""Controls Lab: the ONLY engine-side edits (approved list, all additive).

  game.js  (1) ui.js import list: + getAcademyLabButton
           (2) main-menu click: "controlsLab" -> controls.html
           (3) Academy grid click: CONTROLS LAB button -> controls.html
           (4) Academy pad-nav rects: + the CONTROLS LAB button
           (5) setupTestHarness: read-only `controls()` accessor (live P1/P2 keyboard binds)
  ui.js    main-menu item + Academy grid button (rect + draw)

Idempotent and anchor-based (each anchor must occur exactly once), so it applies the same edits to the
working copy and to a clean HEAD copy used for the commit.   usage: apply_game_links.py <repo_dir>
"""
import sys, pathlib

root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else ".")
MARK = "CONTROLS LAB"


def patch(path, edits):
    p = root / path
    s = p.read_text()
    for anchor, new, done_marker in edits:
        if done_marker in s:
            continue
        n = s.count(anchor)
        if n != 1:
            sys.exit(f"{path}: anchor found {n}x: {anchor[:70]!r}")
        s = s.replace(anchor, new)
    p.write_text(s)


patch("game.js", [
    ("  drawAcademyGridScreen, academyGridLayout, getAcademyBackButton, getAcademyWatchBrutButton,",
     "  drawAcademyGridScreen, academyGridLayout, getAcademyBackButton, getAcademyWatchBrutButton, getAcademyLabButton,",
     "getAcademyWatchBrutButton, getAcademyLabButton,"),
    ('      else if (c.id === "academy")  openAcademy(GAME_STATES.MAIN_MENU)\n',
     '      else if (c.id === "academy")  openAcademy(GAME_STATES.MAIN_MENU)\n'
     '      else if (c.id === "controlsLab") { sound.play?.(SFX.UI_SELECT); window.location.href = "controls.html" }   // CONTROLS LAB (standalone page)\n',
     'c.id === "controlsLab") { sound.play'),
    ("      if (pointInRect(mouse.x, mouse.y, getAcademyBackButton(canvas))) { gameState = screenReturnState || GAME_STATES.MAIN_MENU; screenReturnState = null; break }\n",
     "      if (pointInRect(mouse.x, mouse.y, getAcademyBackButton(canvas))) { gameState = screenReturnState || GAME_STATES.MAIN_MENU; screenReturnState = null; break }\n"
     '      if (pointInRect(mouse.x, mouse.y, getAcademyLabButton(canvas))) { sound.play?.(SFX.UI_SELECT); window.location.href = "controls.html"; break }   // CONTROLS LAB link\n',
     "pointInRect(mouse.x, mouse.y, getAcademyLabButton(canvas))"),
    ("      return [...cards, ...L.filterRects, getAcademyBackButton(canvas)]\n",
     "      return [...cards, ...L.filterRects, getAcademyBackButton(canvas), getAcademyLabButton(canvas)]\n",
     "getAcademyBackButton(canvas), getAcademyLabButton(canvas)]"),
    ("    keys:  () => ({ ...keys }),                      // proves key delivery to input.js\n",
     "    keys:  () => ({ ...keys }),                      // proves key delivery to input.js\n"
     "    controls: () => ({ p1: { ...P1_CONTROLS }, p2: { ...P2_CONTROLS } }),   // CONTROLS LAB: live keyboard binds (read-only copy)\n",
     "controls: () => ({ p1: { ...P1_CONTROLS }"),
])

patch("ui.js", [
    ('    { id: "academy",  label: "ACADEMY",   subLabel: "Learn every fighter — demos & hands-on drills" },\n',
     '    { id: "academy",  label: "ACADEMY",   subLabel: "Learn every fighter — demos & hands-on drills" },\n'
     '    { id: "controlsLab", label: "CONTROLS LAB", subLabel: "Watch every move, see your controller, guided combo trials" },\n',
     'id: "controlsLab", label: "CONTROLS LAB"'),
    ("// \"WATCH BRUTALITIES\" button (bottom-right of the char screen)",
     "// CONTROLS LAB link (bottom-right of the Academy GRID screen) — opens controls.html.\n"
     "export function getAcademyLabButton(canvas) {\n"
     "  const { width: w, height: h } = getCanvasSize(canvas)\n"
     '  return { id: "controlsLab", x: w - 40 - 250, y: h - 60, w: 250, h: 42 }\n'
     "}\n"
     "// \"WATCH BRUTALITIES\" button (bottom-right of the char screen)",
     "export function getAcademyLabButton(canvas)"),
    ('  drawMkButton(ctx, getAcademyBackButton(canvas), { label: "BACK", active: opts.backHover, id: "acadback", cut: 10 })\n',
     '  drawMkButton(ctx, getAcademyBackButton(canvas), { label: "BACK", active: opts.backHover, id: "acadback", cut: 10 })\n'
     '  drawMkButton(ctx, getAcademyLabButton(canvas), { label: "CONTROLS LAB ▸", active: false, id: "acadlab", cut: 10 })\n',
     'id: "acadlab"'),
])
print("ok")
