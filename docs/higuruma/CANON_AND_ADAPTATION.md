# Hiromi Higuruma: canon and adaptation

This page separates what the source material establishes, what the supplied sprite sheet shows, and what this game
invents for fighting-game play. It invents nothing about the character's story. Every crime, verdict detail and legal
claim shown in the game is a gameplay label, not a canonical fact.

## Canon used (Jujutsu Kaisen, Culling Game arc)
- Hiromi Higuruma is a former defense attorney who awakened as a sorcerer and entered the Culling Game.
- His Domain Expansion is **Deadly Sentencing**. Inside it his shikigami Judgeman presents a case. The defendant may
  answer, and a guilty verdict brings a penalty.
- Possible penalties include **confiscation** of the defendant's cursed technique and, on a death sentence, the
  **Executioner's Sword**, which kills in one strike.
- His weapon is a **gavel** that he can manifest, resize and extend.

References: the Jujutsu Kaisen manga, Culling Game arc (Higuruma's introduction and his trial of Yuji Itadori), and
the matching anime adaptation. Only these broad, widely known facts are used. No specific case, accusation or
verdict text is copied.

## What the supplied sheet shows (and nothing more is drawn)
- A small, extended and giant gavel; a gavel on a wavy cord still held in his hand; glowing evidence presented and
  returned; the Executioner's Sword manifesting, raised, thrust and in a dive lunge; an intro turn, a victory turn
  with the gavel dissolving, and a portrait.
- **No Judgeman, no courtroom and no opponent art.** The game draws neither. The court in the ultimate is simple
  code-drawn rails, a bench and floor markings (higurumaFx.js), deliberately not a detailed courtroom.

## Adaptation decisions
| Canon | In this game | Why |
|---|---|---|
| Domain traps the target; trial follows | A 16 f extended-gavel opener must land **clean** (whiff or block = 40 f recovery, no domain) | Fighting-game fairness: a guaranteed domain would be unanswerable |
| Judgeman presents evidence | **CASE REVIEW** panel lists this match's own Case File marks (CLOSE / REACH / WEIGHT counts) | Deterministic and real; no invented crime |
| Confiscation removes a technique | **CONFISCATION** beat is *presentation only* (on-screen note "presentation only — no ability is removed") | Removing another fighter's kit would break every other character |
| Executioner's Sword = instant death | Opener 30 + verdict 70 + sword 170 = 270 raw (stored ×1.95, then the shared 0.6 damage scale) | Brief: no instant kill. A full-HP target survives (measured) |
| Gavel resizing | Small (chain), extended (lash, Extension of the Court), giant (overhead, upswing, Order in the Court) | Three reach / commitment tiers from the drawn art |
| Legal reasoning | **Case File → Precedent**: clean hits with three gavel sizes earn one dash-cancel token | Rewards mixing sizes; categories are gameplay labels, not accusations |
| Objection (courtroom idiom) | Back + Special counter: catches one frontal strike | A defense-attorney flavoured guard; it never reflects projectiles |
| Thrown gavel (optional in the brief) | **Not implemented**: the art is tethered (cord in hand) with no recall art | The brief permits it only if the art supports it |

## Never done
- No generated or substitute art, no Judgeman, no detailed courtroom, no other character's sprites.
- No invented canonical crimes, accusations or verdict texts. Captions are fixed labels ("DOMAIN EXPANSION — DEADLY SENTENCING",
  "CASE REVIEW", "CONFISCATION", "VERDICT: GUILTY", "EXECUTIONER'S SWORD"; intro card "HIROMI HIGURUMA — THE COURT IS IN SESSION").
- No Math.random and no gameplay RNG in cosmetics (all variation comes from the sim tick).
