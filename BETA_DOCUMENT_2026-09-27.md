# Multiverse Smash — Beta Tester Reference (2026-09-27)

A practical hand-to-a-tester reference for the consolidated `main` build
(`origin/main` @ commit `f16d9de4`). **Accuracy over polish** — known-shaky things
are flagged in *Known Issues*, don't skip that section.

Verified today: fresh `git clone` from origin → real match boots (browser path,
0 page errors); `determinism` 9/0 and `combo-standard` 230/0 on the final pushed
state. Full 3-hour suite was **not** run today (no time) — see *Known Issues*.

---

## Launch (desktop)

```
git clone https://github.com/Omololu457/multiverse-smash.git
cd multiverse-smash/electron
npm install          # one-time; needs internet (downloads Electron for this OS)
cd ..
npm run desktop      # launches the fullscreen game
```

- Needs **Node.js 20 or 22 LTS**. ⚠️ **On Node 24 the Electron install produces a
  broken stub** and `npm run desktop` errors *"Electron failed to install
  correctly"* (confirmed today on Node 24.16). Use Node 20/22, **or** the browser
  build below — it plays identically.
- ~5 GB free disk (≈1.6 GiB clone + ≈3 GB checkout + ≈265 MB node_modules).

**Browser build (fallback, no Electron):**
```
npm install          # in the repo root (dev-server deps)
npm run dev          # then open the printed http://localhost URL in a browser
```

---

## LAN multiplayer (2 devices, same network)

Both machines on the **same Wi-Fi/router**. Each runs `npm run desktop` (the host
starts its LAN relay automatically — no IPs, no port-forwarding).

- **Host (device A):** Title → **PLAY → ONLINE (LAN) → HOST** → a short join
  **CODE** appears (e.g. `A7K3-9F`). Read it to the other player; leave the screen up.
- **Join (device B):** Title → **PLAY → ONLINE (LAN) → JOIN** → type the CODE →
  **Connect**. Pick fighters; the match starts on both screens.
- ⚠️ Ignore the separate **"ONLINE"** entry on the *main menu* — it's a locked
  *"Coming soon"* placeholder, **not** this feature. LAN lives under **PLAY**.
- Local network only (no internet play without a VPN). Allow Node/the app through
  the host firewall.

---

## Story Mode — "THE NEXUS FRACTURE"

Full data-driven cutscene campaign (playable, reuses the real fighters/engine):
**Prologue → Act 1 → Act 2 → Act 3 (Convergence) → Epilogue / post-credits**
(~129 beats, 17 real fights, with spoken TTS dialogue on macOS). Reachable from the
title's **Story Mode**. Story fights continue the scene on victory (no drop to title).

---

## Roster — 101 playable characters

| Universe | Characters |
|---|---|
| **Naruto** (18) | Naruto, Sasuke, Itachi, Tobirama, Hashirama, Minato, Madara, Obito, Tobi, Pain, Six Paths of Pain, Hiruzen, Kakashi, Boruto, Isshiki, Orochimaru, Onoki, Kiba |
| **Jujutsu Kaisen** (11) | Gojo, Sukuna, Alternate Sukuna, Aoi Todo, Maki, Toji, Yuji, Naoya, Kasumi Miwa, Yuta, Megumi |
| **Dragon Ball** (11) | Goku, Goku Black, Vegeta, Dark Vegeta, Piccolo, Frieza, Teen Gohan, Gotenks, Bardock, Beerus, Vegito |
| **DC** (11) | The Flash, Batman (×2), Superman + variants (Custom / New 52 / Classic / Fighter), Deathstroke, Brainiac, Green Lantern |
| **Marvel** (8) | Spider-Man, Spider-Man (Raimi / SSF2 / Cosmic Invasion), Miles Morales, Iron Man (1 / 2 / 3) |
| **Bleach** (6) | Ichigo, Zaraki (base / Shikai), Mayuri, Byakuya, Yamamoto |
| **Hunter × Hunter** (6) | Netero, Killua, Gon, Hisoka, Chrollo, Kurapika |
| **Demon Slayer** (5) | Zenitsu, Rengoku, Shinobu, Inosuke, Nezuko |
| **Power Rangers** (5) | Omega (SPD White), Samurai Red (Fire), Gold Samurai (Light), Green Samurai (Forest), Red (MMPR) |
| **Ben 10** (4) | Ben 10, Albedo, Gwen, Vilgax |
| **Horror** (4) | Ghostface, Billy Ghostface, Ghostface.exe, Jason Voorhees |
| **Death Note** (2) | Light Yagami, L |
| **One Punch Man** (2) | Saitama, Genos |
| **Rick & Morty** (2) | Rick Sanchez, Rick Prime |
| **Singles** | Baki (Baki), Invincible (Omni-Man), Ippo (Ippo), Saiki K (Saiki), Divine (Jesus), Original (Omololu) |

**New this build — Naruto-universe clone choreography** (additive, verified today):
authored, deterministic clone sequences that render each clone as the character's
*real* sprite. Naruto = **Uzumaki Barrage** (Down+Special) + **summon-then-select**
(Up+Special → direction picks Barrage / Shuriken / Substitution / Flank; Two Thousand
Combo is the neutral Ultimate). Tobirama/Minato/Hashirama/Hiruzen/Kakashi/Itachi/
Madara/Boruto/Pain get a 6-move clone kit via **↓↓↑ + Special** (summon a formation,
then a direction selects; Ultimate-while-staged = the swarm). Sasuke/Obito get 1–2
light clone moves. Persistent `","` clones still work for the non-Naruto clone chars.

---

## Controls

**Keyboard — Player 1**

| Action | Key | | Action | Key |
|---|---|---|---|---|
| Move | A / D | | Special | **L** |
| Jump / Up | W | | Ultimate | **U** |
| Crouch | S | | Grab | O |
| Block | ; (semicolon) | | Charge / Omnitrix | P |
| Light | J | | Dash | double-tap A / D |
| Heavy | K | | Up-Attack (air-combo launch) | ↑ + Light/Heavy (or I) |

**Keyboard — Player 2:** Move ← / →, Jump ↑, Crouch ↓, Block `/`, Light 1, Heavy 2,
Up-Attack 3, Special 4, Ultimate 5, Grab 6, Charge 7, Dash double-tap arrows.

**Gamepad:** Move/Jump = L-Stick / D-Pad · Light = ✕ · Heavy = □ · Special = △ ·
Dash = ○ · Ultimate = L2 / R2 · Grab = L1 · Charge/Omnitrix = R1.

**Touch (mobile/tablet):** on-screen D-pad + attack buttons (auto-shown on touch
devices).

**Specials / how the kit works:**
- **Special** = 1st special. **Hold ↓ + Special** = 2nd. **Hold → (toward foe) +
  Special** = 3rd / mobility move. (Beta input mode simplifies motions to *hold one
  direction + Special*.)
- **Ultimate** button (full meter) = ultimate / domain expansion.
- **Up-Attack** (↑ + Light/Heavy) launches **both** fighters up for air combos.

---

## Known issues / demo with care

- **Desktop launch needs Node 20/22.** On Node 24 `npm run desktop` fails with the
  Electron-stub error (reproduced today). Have the tester on Node 20/22, or use the
  browser build (`npm run dev`) — identical gameplay.
- **LAN is local-network only** and is a newer feature: verified deterministic in
  code (two clients produce bit-identical frames) but do a quick host/join dry-run
  **before** demoing it live, especially across two physical machines.
- **Verification scope today:** only the fast checks (`determinism` 9/0,
  `combo-standard` 230/0) plus targeted spot-checks (Naruto clone choreography,
  Minato/Pain clone kits, Pain 5 Brutality finishers + execute, `","` clone spawn) —
  **not** the full multi-hour suite. Unspot-checked systems are in their
  last-known-good state (determinism confirms no sim perturbation), but treat
  anything not listed above as "probably fine, not re-verified today."
- **Some alternate-costume / variant art is still being polished** (e.g. a few
  Spider-Man / Superman skin palettes); base costumes are solid — prefer default
  skins if a variant looks off.
- Naruto's persistent `","` clone was intentionally replaced by his choreography
  system — that's by design, not a bug (his clones now come from Uzumaki Barrage /
  summon-select, not the `","` key).

---
*Build: `origin/main` @ f16d9de4 · consolidated 2026-09-27.*
