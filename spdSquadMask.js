// spdSquadMask.js — the S.P.D. Rangers dial's input SWALLOW (spdSquad.js), kept import-free so input.js can use it
// without pulling the five Rangers' data into its module graph. After ↓↓ + J/K/L/O/P calls a Ranger, that button is
// hidden from every input reader (getFighterInput + readRawControls) until it is released — so the pick never also fires
// the incoming Ranger's ↓+button move. No-op for every fighter without f._squadEat.
export function squadMaskInput(f, out, raw) {
  const eat = f?._squadEat; if (!eat || !out) return out
  let any = false
  for (const b of Object.keys(eat)) { if (!raw?.[b]) delete eat[b]; else { out[b] = false; any = true } }
  if (!any) f._squadEat = null
  return out
}
