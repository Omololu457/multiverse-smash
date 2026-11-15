// Green Ranger skin identity packages — DATA ONLY (UI text, UI shapes, cosmetic colours). Never read by the
// simulation. The body/portrait recolours are PRECOMPUTED by tools/green_ranger/build_skins.py from the same palette
// table (tools/green_ranger/skins.json is generated from this file's hexes — keep them in sync; the build script
// asserts it). Creative crossover palettes: labelled "inspired / custom", never official Green Ranger costumes.
export const GREEN_ZORD_TITLE = 'RANGER ZORD ASSAULT'
const D = (id, tag, name, source, suit, shield, trim, effect, tagline, glyph, subtitle, entrance, victory, notes, extra = {}) =>
  ({ id, tag, name, source, classification: 'inspired', suit, shield, trim, effect, tagline, glyph, subtitle, entrance, victory, notes, ...extra })

export const GREEN_SKIN_TABLE = [
  { id: 'default', tag: null, name: 'Default', source: 'Supplied sheet palette (Supaman2525 edit)', classification: 'default',
    suit: '#296b00', shield: '#e0c020', trim: '#d5d5d5', effect: '#5fe08a', tagline: 'Strike with purpose.', glyph: 'note',
    subtitle: 'FALCONZORD', entrance: 'morph', victory: 'flex', notes: 'Original supplied pixels, unchanged.' },
  D('green_ranger_starfield', 'starfield', 'STARFIELD DRAGON', 'Alien X (Ben 10) — inspired', '#0F1020', '#AEB6D0', '#C9CFE6', '#6D4AFF',
    'Strike beneath the stars.', 'star4', 'EVENT HORIZON DIVE', 'stars', 'starDrift',
    'Sparse 3-5 px stars on the suit only (cached overlay, slow twinkle, static fallback). Violet star-streak Falconzord.', { stars: true }),
  D('green_ranger_omnitrix', 'omnitrix', 'OMNITRIX DRAGON', 'Ben 10 — inspired', '#101410', '#F2F2F2', '#2ED84A', '#39FF14',
    'Pick your moment.', 'hexagon', 'HERO TIME DIVE', 'scan', 'ringPulse', 'Green trails / Zord glow / call flash. No Omnitrix symbol anywhere; the hexagon is a plain shape.'),
  D('green_ranger_xlr8', 'xlr8', 'XLR8 DRAGON', 'Ben 10 (XLR8) — inspired', '#0D0F14', '#7FA8C9', '#1F8BFF', '#7FD0FF',
    'Faster than the call.', 'chevron2', 'TOP-SPEED DIVE', 'streak', 'echo', 'Longer, denser run / dash echoes under the same copy cap as every skin.', { echo: 4 }),
  D('green_ranger_heatblast', 'heatblast', 'HEATBLAST DRAGON', 'Ben 10 (Heatblast) — inspired', '#1A1210', '#FF6A00', '#FFC21A', '#FF8A1F',
    'Burn bright.', 'flame', 'SOLAR DIVE', 'embers', 'risingEmbers', 'Capped ember specks on trails and the Zord; Pulse looks hotter but behaves identically.', { embers: true }),
  D('green_ranger_cursed_prodigy', 'cursed', 'CURSED PRODIGY', 'Jujutsu Kaisen (Itadori) — inspired', '#2B2D33', '#8E1F3A', '#B0405E', '#E8728F',
    'Hit like you mean it.', 'shard', 'CURSED FLASH DIVE', 'flashOutline', 'rimFlash', 'Red-pink hit rims and a pink call circle.'),
  D('green_ranger_limitless', 'limitless', 'LIMITLESS BLUE', 'Jujutsu Kaisen (Gojo) — inspired', '#0E1424', '#E9F2FF', '#7BE8FF', '#2FD7FF',
    'Untouchable skies.', 'ringDot', 'INFINITE DIVE', 'haze', 'halo', 'Clean cyan haze on the flute, pale shield, cyan-white Zord. No blindfold or eye effect.'),
  D('green_ranger_shrine', 'shrine', 'MALEVOLENT SHRINE', 'Jujutsu Kaisen (Sukuna) — inspired', '#141012', '#B3121F', '#E8DCC8', '#E02030',
    'Cut first. Cut deep.', 'slash3', 'CLEAVE DIVE', 'slashLines', 'sparkBurst', 'Crimson blade trails, bone-white spark burst on the ultimate. No new markings on the character.'),
  D('green_ranger_ten_shadows', 'shadows', 'TEN SHADOWS', 'Jujutsu Kaisen (Megumi) — inspired', '#1B2230', '#3C4A66', '#7C8CAE', '#4A6FB0',
    'Call what answers.', 'crescent', 'SHADOW FLIGHT', 'inkRim', 'rimFade', 'Strongest outline / contrast pass (dark on dark). Ink-black Zord with a pale rim, above minimum opacity.', { rim: '#c9d6f2' }),
  D('green_ranger_resonance', 'resonance', 'RESONANCE', 'Jujutsu Kaisen (Nobara) — inspired', '#2E2A2A', '#C8651F', '#E0A15A', '#E07A2A',
    'Every strike rings true.', 'diamond', 'RESONANT DIVE', 'copperRing', 'rustRing', 'Copper trails and a rust ring on the call circles.'),
  D('green_ranger_heavenly', 'heavenly', 'HEAVENLY RESTRICTION', 'Jujutsu Kaisen (Toji) — inspired', '#2A3028', '#8E9A86', '#4E5A4A', '#9AA894',
    'No power. No problem.', 'bracket', 'NO-FRILLS DIVE', 'fade', 'still', 'Plainest effects: short subtle trails, gray Zord. Must still read on every stage.', { muted: true }),
]
export const GREEN_SKIN_BY_TAG = Object.fromEntries(GREEN_SKIN_TABLE.map(s => [s.tag || 'default', s]))
export const greenSkinOf = f => GREEN_SKIN_BY_TAG[f?._recolorTag || 'default'] || GREEN_SKIN_BY_TAG.default
// Per-skin Zord ultimate presentation (title is the real move name; subtitle is UI flavour only).
export const greenZordPresentation = f => { const s = greenSkinOf(f); return { title: GREEN_ZORD_TITLE, subtitle: s.subtitle, tint: s.tag ? s.effect : null, accent: s.effect, rim: s.rim || null } }
