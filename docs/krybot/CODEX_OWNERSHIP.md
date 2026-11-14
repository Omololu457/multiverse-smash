# Krybot ownership

Codex owns krybot*.js, tools/krybot/, assets/krybot/, harness/krybot*, and docs/krybot/. Shared integration is limited to reviewed imports and Krybot-only hooks/registration in characters.js, game.js, combat.js, spritesheets.js, input.js, kits.js, the default skin scale entry, and the credit registry. input.js supplies actual held controller edges and preserves injected replay/LAN inputs. No branch or checkout operations, staging, commits, source-sheet edits, generated skins, music or unrelated asset edits.

Start: main at 4da8b4d123230d15e05dd67093e95d958484d0fb. No staged paths. Existing tracked changes: sanji.js, sanjiState.js, harness/sanji_render_scenarios.mjs and the protected Naruto PNG; all belong to other work. Full initial status and SHA-256 hashes of tracked working files and Krybot source are in checkout_baseline.json.

PROJECT_HANDOFF.md is absent; no AGENTS.md was found in this project or its parent tree. updates.TXT exists and is empty at start. Preserve concurrent work; reread shared regions and diff before narrow edits. If an overlapping region changes, retain independent work and provide an integration patch.
