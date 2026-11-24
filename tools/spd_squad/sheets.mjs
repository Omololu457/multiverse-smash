// sheets.mjs — prints {form: [base sheet paths]} for the S.P.D. + Mighty Morphin Rangers forms (input for build_squad_skins.py)
const { characters } = await import('../../characters.js')
const out = {}
for (const k of ['spd_red', 'spd_blue', 'spd_green', 'spd_yellow', 'spd_pink', 'omega_ranger', 'red_ranger_mmpr', 'mmpr_black', 'mmpr_pink', 'green_ranger', 'mmpr_white']) out[k] = [...new Set(Object.values(characters[k].animationData).map(a => a.sheet).filter(Boolean))]
console.log(JSON.stringify(out))
