// aiMasterTuning.js — per-fighter MASTER CPU tuning from AI-vs-AI self-play (tools/ai_scout/master_train.mjs).
// GENERATED — do not hand-edit; re-run the trainer. Read by aiMaster.js only.
//   params: overrides of aiMaster.js MASTER (style: how often it steps in, how patient it is)
//   prior:  starting payoff per tool / per "defer" situation — [samples, mean (damage dealt − taken) per frame];
//           entered with at most `priorWeight` samples, so in-match learning still adapts to the real opponent
//   kind:   the same per kind (combo / poke / punish …) — the start value of a tool it never tried in training
export const AI_MASTER_TUNING = { version: 0, priorWeight: 4, fighters: {} }
