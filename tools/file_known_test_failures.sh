#!/bin/sh
# file_known_test_failures.sh — file the 4 pre-existing regression failures as GitHub issues.
#
# These failures exist on main independent of the 2026-09-16 consolidation pass; they were
# found during the full-suite regression and confirmed to fail when run individually (clean),
# in subsystems (voice / sprite-anim / ben10) untouched by the consolidation.
#
# gh must be authenticated first:   gh auth login
# Then:                             sh tools/file_known_test_failures.sh
#
# Re-running is NOT idempotent — it creates duplicates. Run once.

set -e
command -v gh >/dev/null 2>&1 || { echo "gh CLI not found"; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "Not authenticated. Run: gh auth login"; exit 1; }

DIR=$(mktemp -d)
trap 'rm -rf "$DIR"' EXIT

cat > "$DIR/maki.md" <<'EOF'
## Summary
`npm run test:maki-voice` fails to run: **0 passed, 1 failed**.

## Error
```
FATAL page.evaluate: TypeError: window.__harness.makiVoicePool is not a function
  MAKI voice: 0 passed, 1 failed
```

## Analysis
The harness (`harness/maki_voice.test.mjs`) calls `window.__harness.makiVoicePool()`, but that
hook is not exposed on `__harness`, so the test aborts before asserting anything (0 passed).
This is a **test-infra / harness-hook mismatch** (missing or renamed hook), not necessarily a
gameplay bug: wire the `makiVoicePool` hook into the harness, or update the test to the current
hook name.

## Repro
```
npm run test:maki-voice
```

## Notes
Pre-existing on `main`; unrelated to the 2026-09-16 consolidation pass (touched no voice code).
Same failure class as test:chrollo-voice.
EOF

cat > "$DIR/chrollo.md" <<'EOF'
## Summary
`npm run test:chrollo-voice` fails to run: **0 passed, 1 failed**.

## Error
```
FATAL page.evaluate: TypeError: window.__harness.chrolloVoicePool is not a function
  CHROLLO voice: 0 passed, 1 failed
```

## Analysis
`harness/chrollo_voice.test.mjs` calls `window.__harness.chrolloVoicePool()`, which is not
exposed on `__harness`, so the test aborts before any assertion (0 passed). **Test-infra /
harness-hook mismatch** (missing or renamed hook) — wire the `chrolloVoicePool` hook into the
harness, or update the test to the current hook name.

## Repro
```
npm run test:chrollo-voice
```

## Notes
Pre-existing on `main`; unrelated to the 2026-09-16 consolidation pass (touched no voice code).
Same failure class as test:maki-voice.
EOF

cat > "$DIR/ghost.md" <<'EOF'
## Summary
`npm run test:anim-transition-ghost`: **7 passed, 1 failed**.

## Failing assertion
```
FAIL  madara [large-kit] — attack transition ARMS the after-image (life->0, into null)  — maxLife=0
```

## Analysis
For `madara` (large-kit path), an attack-state transition is expected to arm the transition
after-image (a decaying ghost of the outgoing pose), but the ghost's `maxLife` is 0 — it never
arms for this case. The other 7 cases pass, so the after-image system works generally; this is a
gap for the large-kit / `madara` transition specifically.

## Repro
```
npm run test:anim-transition-ghost
```

## Notes
Pre-existing on `main`; unrelated to the 2026-09-16 consolidation pass (touched no sprite/anim
code). Per project history the anim-transition-ghost feature was built at 8/0 but landed only
partially — this looks like the drifted case. Cosmetic (presentation-only), not a sim/balance bug.
EOF

cat > "$DIR/ben10.md" <<'EOF'
## Summary
`npm run test:ben10-stage3`: **17 passed, 1 failed**.

## Failing assertion
```
DH Rising Diamonds spawns ground hitbox  — proj=null
```

## Analysis
Diamondhead's **Rising Diamonds** move is expected to spawn a ground hitbox/projectile, but the
harness observes `proj=null` — no hitbox is created. The other 17 Ben 10 Stage 3 assertions pass.

## Repro
```
npm run test:ben10-stage3
```

## Notes
Pre-existing on `main`; unrelated to the 2026-09-16 consolidation pass (touched no Ben 10 kit
code). Verify whether Rising Diamonds is wired to spawn its projectile/hitbox, or whether the
test's spawn hook/expectation drifted.
EOF

echo "Filing 4 issues…"
gh issue create --title "test:maki-voice fails — window.__harness.makiVoicePool is not a function" --body-file "$DIR/maki.md"
gh issue create --title "test:chrollo-voice fails — window.__harness.chrolloVoicePool is not a function" --body-file "$DIR/chrollo.md"
gh issue create --title "test:anim-transition-ghost — madara large-kit transition does not arm the after-image (maxLife=0)" --body-file "$DIR/ghost.md"
gh issue create --title "test:ben10-stage3 — Diamondhead 'Rising Diamonds' spawns no ground hitbox (proj=null)" --body-file "$DIR/ben10.md"
echo "Done — 4 issues filed."
