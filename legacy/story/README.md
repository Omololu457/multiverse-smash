# Legacy Story (unused)

The previous story mode ("Story Mode MVP" chapter map + THE NEXUS FRACTURE cutscenes), restored **unused** from
`57ec13262^`. That sync commit (2026-11-25) had already deleted these files and their cutscene engine
(`GAME_STATES.CUTSCENE`) from `game.js`, which is why nothing imports them now and no menu entry reaches them.
They're kept here for reference only. They are not imported, not bundled, and not tested.

| file | was |
|---|---|
| `story.js` | chapter list / Story Mode MVP data |
| `storyProgress.js` | chapter progress save |
| `nexusFracture.js` | THE NEXUS FRACTURE cutscene script |
| `nexusVoice.js` | TTS voice map for the cutscenes (the `nexus_voice/*.m4a` clips are not restored) |

The live story mode is MSV1-STORY: `storyEngine.js`, `storyUI.js`, `data/story/`, `docs/msv1/story/`.
