# Toji Fushiguro — Control Reference

Every move + its exact input on the **default Player 1 keyboard layout**.
Verified live (buttons actually pressed) via `harness/toji_moveset_verify.mjs` (8/0) —
every move below fires and produces visible output.

> Toji has **no energy meter** — every special is **cooldown-gated** (no resource to manage).

---

## Basic controls (default P1)

| Action | Key |
|---|---|
| Move left / right | **A** / **D** |
| Jump / Up | **W** |
| Crouch | **S** |
| Block / Guard | **;** (semicolon) |
| Dash | **double-tap A or D** |
| Light attack | **J** |
| Heavy attack | **K** |
| Grab | **O** |
| Up-attack (launcher) | **I** |

*Directions are relative to facing: "Forward" = toward the opponent, "Back" = away.*

---

## Specials — Special button = **L** (hold the direction as you press)

| Move | Input | What it does |
|---|---|---|
| **Split Soul Katana** | `L` (neutral) | 2-part continuous sword combo |
| **Rapid Sword Slashes** | **Down + L** (`S`+`L`) | stationary multi-hit katana flurry |
| **Chain of a Thousand Miles** *(Inverted Spear of Heaven)* | **Forward + L** (`D`+`L`) | 5-part continuous chain string |
| **Playful Cloud** | **Up + L** (`W`+`L`) | staff dash-through gap-closer |
| **Fly Heads — Defensive** *(vision-denial)* | **Back + L** (`A`+`L`) | Toji goes near-invisible ~7s + fly swarm; **0 damage** (disruption) |

> **Playful Cloud tip:** `W` is also Jump. Hold **W and L together** — the game suppresses the
> jump only while both are held. Tapping W first (you jump) then L yields nothing.

---

## Command normals — Heavy button = **K**

| Move | Input | What it does |
|---|---|---|
| **Hand-combo rekka** (A-B-C-A+B) | **Forward + K** (`D`+`K`), then re-tap **K** on hit | jab → cross → hook → finisher |
| **Cursed Tool: Handgun** | **Back + K** (`A`+`K`) | fast bullet projectile poke |
| **Fly Heads — Offensive** *(damaging swarm)* | **Down + K** (`S`+`K`) | fan of 6 fly-head **projectiles** that deal real damage |

> **Two Fly Heads:** `A`+`L` is the **defensive** vanish/vision-denial version (0 damage);
> `S`+`K` is the **offensive** projectile swarm (real damage). Different inputs, both usable.

---

## Ultimate — Ultimate button = **U**

| Move | Input | What it does |
|---|---|---|
| **Reincarnation** | **U** | freeze-cinematic → Reincarnated Form (damage buff, crimson aura); once per round |

Toji also has a **two-stage automatic Comeback**: on first fatal hit he survives at ~25% HP;
on a second, he enters Reincarnated Form (+40% HP). This is automatic — no input.

---

*Default keybinds are in `game.js` (P1 control map). The in-battle on-screen "Controls"
panel reflects the basics; this file is the full move list.*
