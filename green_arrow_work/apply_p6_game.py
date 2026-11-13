# PASS3 P6: wire the munitions render-only SFX hook to the WebAudio synth. The munitions module
# stays a leaf (no sound import); game.js owns the sound layer, so it registers the callback here.
import sys
IMP_OLD = ', setMunitionDebug, explodeAt, registerMunitionProfile, MUNITION_PROFILES } from "./munitions.js"'
IMP_NEW = ', setMunitionDebug, setMunitionSfx, explodeAt, registerMunitionProfile, MUNITION_PROFILES } from "./munitions.js"'
ANCHOR = 'import { sound, SFX, MUSIC, MENU_PLAYLIST, menuTrackDisplayName, juicePitch, juicePickVariant, juiceHash } from "./sound.js"'
REG = ANCHOR + '''

// GREEN ARROW: bomb/hazard SFX. munitions.js is a leaf (no sound import) and just emits abstract
// events; the audio layer lives here, so wire its render-only sfx hook to the WebAudio synth.
// Pitch is derived from the event's deterministic seed (no Math.random); chain booms drop in pitch.
setMunitionSfx((ev, x, y, seed, extra) => {
  const s = (seed | 0) || 1, pitch = 0.92 + ((s % 17) / 100)
  if (ev === "spawn")        sound.playGreenArrow?.("ga_whistle", pitch, s)
  else if (ev === "boom")    sound.playGreenArrow?.("ga_boom", pitch - Math.min(0.2, ((extra && extra.chainDepth) || 0) * 0.05), s)
  else if (ev === "reticle") sound.playGreenArrow?.("ga_reticle", pitch, s)
  else if (ev === "napalm")  sound.playGreenArrow?.("ga_napalm", pitch, s)
  else if (ev === "plane")   sound.playGreenArrow?.("ga_plane", pitch, s)
})'''
def patch(p):
    s = open(p, encoding="utf-8").read()
    if "setMunitionSfx(" in s and "playGreenArrow" in s:
        print("already", p); return
    assert s.count(IMP_OLD) == 1, f"import anchor x{s.count(IMP_OLD)} in {p}"
    assert s.count(ANCHOR) == 1, f"sound anchor x{s.count(ANCHOR)} in {p}"
    s = s.replace(IMP_OLD, IMP_NEW, 1).replace(ANCHOR, REG, 1)
    open(p, "w", encoding="utf-8").write(s)
    print("patched", p)
for p in sys.argv[1:]:
    patch(p)
