# MSV1-STORY — spoken voices

Every spoken story line has an AI voice clip: **1823 clips** for **108 voices**, in `story_voice/<voice>/<id>.m4a` (AAC mono 32 kb/s).

**Engine.** [Piper](https://github.com/OHF-Voice/piper1-gpl) neural TTS, model `en_US-libritts_r-medium`: 904 speakers, trained on LibriTTS-R (CC BY 4.0).
- Free and offline: no account or API key, and the script never left this machine.
- The attribution is in the in-game credits (Audio — Voice & SFX).

**Casting, not cloning.** No real actor's voice was copied. Each character has a casting sheet in `tools/story/voice/casting.json`:
- gender, pitch band, temperament and pace;
- optional pitch shift and effect (god-echo, voice changer, robot…).

How a speaker is picked:
- Every one of the 904 speakers was measured (`profile_speakers.py`: median pitch, pitch movement, speed).
- Each character gets the **unused** speaker that best fits its sheet, so no two characters share a voice.
- Variants of one person (both Gojos, the three Sukunas, the Sasukes, the Kakashis…) share their voice, with a small age/mood shift.

**What is spoken.**
- Spoken: every speaker line, narration (by the Narrator), and the half-health / second-map captions.
- Template lines are spoken by whichever fighter of that franchise is in the bout, so they have one clip per possible speaker.
- `[Telepathy]` is spoken without its label, with an echo.
- Not spoken: `[stage directions]`, silent fighters (Nezuko, Jason, Krybot) and unsigned rift-display lines.

**In game.**
- One story-voice channel: a new line, Skip Scene, or the fight starting cuts the previous line.
- It ducks the music and follows the SFX volume / mute.
- **VOICE: ON/OFF** is on the story menu.

**Recasting.** Edit `casting.json`, then run `node tools/story/voice/list_lines.mjs` and `~/.cache/msv1-story-voice/venv/bin/python tools/story/voice/build_voice.py`.
- Only clips whose text or casting changed are rendered again; orphans are removed.
- Setup steps are at the top of `build_voice.py`.

| character | franchise | LibriTTS-R speaker | measured pitch | cast (gender · band · temperament · pace) | shift / effect | clips |
|---|---|---|---|---|---|---|
| Narrator (`narrator`) | — | #158 | 170.9 Hz | f · low · calm · slow | — | 36 |
| Baki Hanma (`baki`) | Baki | #361 | 146 Hz | m · young · flat · normal | — | 19 |
| Albedo (`albedo`) | Ben 10 | same as Ben Tennyson | 147 Hz | m · young · flat · fast | -1 st, dark | 14 |
| Ben Tennyson (`ben10`) | Ben 10 | #673 | 147 Hz | m · young · lively · fast | — | 16 |
| Gwen (`gwen`) | Ben 10 | #467 | 193.4 Hz | f · mid · calm · normal | — | 16 |
| Kevin Levin (`kevin_levin`) | Ben 10 | #463 | 115.4 Hz | m · mid · flat · normal | — | 14 |
| Vilgax (`vilgax`) | Ben 10 | #479 | 94.2 Hz | m · deep · calm · slow | -2 st, alien | 13 |
| Byakuya (`byakuya`) | Bleach | #552 | 99.8 Hz | m · low · flat · slow | — | 13 |
| Ichigo (`ichigo`) | Bleach | #631 | 115.4 Hz | m · mid · wild · normal | — | 17 |
| Mayuri (`mayuri`) | Bleach | #104 | 131.2 Hz | m · high · wild · fast | — | 13 |
| Zaraki Kenpachi (`zaraki`) | Bleach | #182 | 98 Hz | m · deep · wild · normal | — | 13 |
| Zaraki Shikai (`zaraki_shikai`) | Bleach | same as Zaraki Kenpachi | 98 Hz | m · deep · wild · normal | -1 st | 13 |
| Batman (`batman`) | DC | #533 | 95.9 Hz | m · deep · flat · slow | — | 22 |
| Beast Boy (`beast_boy`) | DC | #407 | 146.5 Hz | m · young · wild · fast | — | 17 |
| Cyborg (`cyborg`) | DC | #543 | 104.5 Hz | m · low · lively · normal | robot | 18 |
| The Flash (`flash`) | DC | #489 | 132 Hz | m · high · lively · fast | — | 18 |
| Green Arrow (`green_arrow`) | DC | #720 | 108.6 Hz | m · low · flat · normal | — | 17 |
| Raven (`raven`) | DC | #274 | 170.9 Hz | f · low · flat · slow | — | 18 |
| Robin (`robin`) | DC | #289 | 147 Hz | m · young · flat · fast | — | 18 |
| Starfire (`starfire`) | DC | #420 | 216.2 Hz | f · high · lively · normal | — | 17 |
| Superman (`superman`) | DC | #410 | 118.5 Hz | m · mid · calm · normal | — | 23 |
| L (`l_ryuuzaki`) | Death Note | #662 | 117.3 Hz | m · mid · flat · slow | — | 24 |
| Light Yagami (`light`) | Death Note | #821 | 130.5 Hz | m · high · calm · normal | — | 24 |
| Inosuke (`inosuke`) | Demon Slayer | #375 | 116.7 Hz | m · mid · wild · fast | — | 14 |
| Rengoku (`rengoku`) | Demon Slayer | #814 | 118.5 Hz | m · mid · wild · normal | — | 17 |
| Shinobu (`shinobu`) | Demon Slayer | #468 | 191.7 Hz | f · mid · calm · normal | — | 16 |
| Zenitsu (`zenitsu`) | Demon Slayer | #816 | 148 Hz | m · young · wild · fast | — | 17 |
| Jesus (`jesus`) | Divine | #452 | 102.1 Hz | m · low · calm · slow | holy | 18 |
| Beerus (`beerus`) | Dragon Ball | #584 | 117.9 Hz | m · mid · flat · slow | — | 17 |
| Goku (`goku`) | Dragon Ball | #358 | 131.2 Hz | m · high · lively · normal | — | 19 |
| Goku Black (`goku_black`) | Dragon Ball | same as Goku | 131.2 Hz | m · high · calm · slow | -1 st, dark | 14 |
| Vegeta (`vegeta`) | Dragon Ball | #117 | 117.3 Hz | m · mid · wild · fast | — | 17 |
| Dark Vegeta (`vegeta_dark`) | Dragon Ball | same as Vegeta | 117.3 Hz | m · mid · wild · fast | -1.5 st, dark | 15 |
| Ippo (`ippo`) | Hajime no Ippo | #102 | 147 Hz | m · young · lively · normal | — | 19 |
| Ghostface (`ghostface`) | Horror | #547 | 107.6 Hz | m · low · calm · slow | -4 st, changer | 12 |
| Chrollo (`chrollo`) | Hunter x Hunter | #139 | 118.5 Hz | m · mid · calm · slow | — | 14 |
| Hisoka (`hisoka`) | Hunter x Hunter | #497 | 132 Hz | m · high · lively · slow | — | 13 |
| Killua (`killua`) | Hunter x Hunter | #364 | 148.5 Hz | m · young · flat · fast | — | 17 |
| Netero (`netero`) | Hunter x Hunter | #797 | 93 Hz | m · deep · lively · slow | — | 13 |
| Mark Grayson (`invincible`) | Invincible | #53 | 131.2 Hz | m · high · lively · normal | — | 19 |
| Omni-Man (`omniman_viltrum`) | Invincible | #296 | 95.7 Hz | m · deep · flat · slow | — | 17 |
| Alternate Sukuna (`alt_sukuna`) | Jujutsu Kaisen | same as Sukuna | 90.4 Hz | m · deep · calm · slow | -1 st, demon | 16 |
| Aoi Todo (`aoi_todo`) | Jujutsu Kaisen | #137 | 90.4 Hz | m · deep · wild · normal | — | 13 |
| Gojo Satoru (`gojo`) | Jujutsu Kaisen | #406 | 131.2 Hz | m · high · lively · normal | — | 22 |
| Satoru Gojo Shinjuku (`gojo_shinjuku`) | Jujutsu Kaisen | same as Gojo Satoru | 131.2 Hz | m · high · lively · normal | — | 18 |
| Hiromi Higuruma (`higuruma`) | Jujutsu Kaisen | #522 | 104 Hz | m · low · calm · slow | — | 15 |
| Maki Zenin (`maki`) | Jujutsu Kaisen | #119 | 169.6 Hz | f · low · flat · fast | — | 14 |
| Megumi Fushiguro (`megumi_fushiguro`) | Jujutsu Kaisen | #385 | 116.1 Hz | m · mid · flat · normal | — | 16 |
| Kasumi Miwa (`miwa`) | Jujutsu Kaisen | #695 | 214.1 Hz | f · high · lively · fast | — | 16 |
| Sukuna (`sukuna`) | Jujutsu Kaisen | #499 | 90.4 Hz | m · deep · calm · slow | demon | 16 |
| Ryomen Sukuna Shinjuku (`sukuna_shinjuku`) | Jujutsu Kaisen | same as Sukuna | 90.4 Hz | m · deep · calm · slow | demon | 16 |
| Toji Fushiguro (`toji`) | Jujutsu Kaisen | #629 | 104.5 Hz | m · low · flat · slow | — | 13 |
| Yuji Itadori (`yuji`) | Jujutsu Kaisen | #549 | 145.1 Hz | m · young · lively · fast | — | 14 |
| Yuta Okkotsu (`yuta`) | Jujutsu Kaisen | #308 | 146 Hz | m · young · calm · normal | — | 14 |
| Spider-Man (`spiderman`) | Marvel | #812 | 147 Hz | m · young · lively · fast | — | 19 |
| Gaara (`gaara`) | Naruto/Boruto | #248 | 103 Hz | m · low · flat · slow | — | 15 |
| Hashirama (`hashirama`) | Naruto/Boruto | #618 | 117.3 Hz | m · mid · lively · normal | — | 13 |
| Hinata (`hinata`) | Naruto/Boruto | #103 | 214.1 Hz | f · high · calm · slow | — | 14 |
| Isshiki Otsutsuki (`isshiki`) | Naruto/Boruto | #132 | 91.5 Hz | m · deep · calm · slow | -1 st, god | 32 |
| Itachi (`itachi`) | Naruto/Boruto | #342 | 105 Hz | m · low · calm · slow | — | 18 |
| Jiraiya (`jiraiya`) | Naruto/Boruto | #615 | 104 Hz | m · low · lively · normal | — | 14 |
| Kakashi (`kakashi`) | Naruto/Boruto | #288 | 116.7 Hz | m · mid · calm · slow | — | 15 |
| Kakashi ANBU (`kakashi_anbu`) | Naruto/Boruto | same as Kakashi | 116.7 Hz | m · mid · calm · normal | +0.5 st | 17 |
| Kakashi Kamui (`kakashi_war`) | Naruto/Boruto | same as Kakashi | 116.7 Hz | m · mid · calm · slow | -0.5 st | 17 |
| Madara (`madara`) | Naruto/Boruto | #186 | 94 Hz | m · deep · calm · slow | — | 13 |
| Minato (`minato`) | Naruto/Boruto | #398 | 131.2 Hz | m · high · calm · normal | — | 14 |
| Naruto (`naruto`) | Naruto/Boruto | #888 | 145.1 Hz | m · young · wild · fast | — | 22 |
| Naruto Seventh Hokage (`naruto_seventh`) | Naruto/Boruto | same as Naruto | 145.1 Hz | m · young · lively · normal | -1.5 st | 18 |
| Obito (`obito`) | Naruto/Boruto | #353 | 116.4 Hz | m · mid · wild · normal | — | 20 |
| Pain (`pain`) | Naruto/Boruto | #594 | 103 Hz | m · low · flat · slow | — | 13 |
| Sakura (`sakura`) | Naruto/Boruto | #213 | 191.7 Hz | f · mid · lively · fast | — | 14 |
| Sasuke (`sasuke`) | Naruto/Boruto | #804 | 119.8 Hz | m · mid · flat · normal | — | 19 |
| Sasuke Adult (`sasuke_adult`) | Naruto/Boruto | same as Sasuke | 119.8 Hz | m · mid · flat · normal | -1 st | 17 |
| Sasuke Sensei (`sasuke_sensei`) | Naruto/Boruto | same as Sasuke | 119.8 Hz | m · mid · flat · slow | -1.5 st | 18 |
| Shisui Fallen (`shisui_fallen`) | Naruto/Boruto | #233 | 116.1 Hz | m · mid · calm · normal | dark | 14 |
| Six Paths of Pain (`six_paths_pain`) | Naruto/Boruto | same as Pain | 103 Hz | m · low · flat · slow | echo | 13 |
| Tobi (`tobi`) | Naruto/Boruto | same as Obito | 116.4 Hz | m · mid · calm · normal | -1 st, echo | 18 |
| Tobirama (`tobirama`) | Naruto/Boruto | #43 | 103 Hz | m · low · flat · normal | — | 13 |
| Arlong (`arlong`) | One Piece | #687 | 97.1 Hz | m · deep · wild · normal | — | 17 |
| Buggy (`buggy`) | One Piece | #286 | 131.2 Hz | m · high · wild · fast | — | 15 |
| Luffy (`luffy`) | One Piece | #722 | 145.1 Hz | m · young · wild · fast | — | 19 |
| Sanji (`sanji`) | One Piece | #156 | 117.3 Hz | m · mid · lively · normal | — | 20 |
| Zoro (`zoro`) | One Piece | #496 | 107.6 Hz | m · low · flat · normal | — | 18 |
| Genos (`genos`) | One-Punch Man | #19 | 130.5 Hz | m · high · flat · fast | robot | 17 |
| Saitama (`saitama`) | One-Punch Man | #527 | 116.4 Hz | m · mid · flat · slow | — | 15 |
| Dseyl (`dseyl`) | Originals | #400 | 102.1 Hz | m · low · calm · normal | — | 34 |
| Enoch (`enoch`) | Originals | #843 | 132 Hz | m · high · lively · normal | — | 37 |
| Omololu (`omololu`) | Originals | #572 | 117.3 Hz | m · mid · lively · normal | — | 43 |
| Dino Thunder Rangers (`dinothunder`) | Power Rangers | #32 | 132.4 Hz | m · high · lively · fast | — | 14 |
| Gold Samurai (`gold_samurai_ranger`) | Power Rangers | #204 | 132 Hz | m · high · lively · fast | — | 14 |
| Green Samurai (`green_samurai_ranger`) | Power Rangers | #110 | 145.1 Hz | m · young · lively · normal | — | 13 |
| Mighty Morphin Rangers (`mmpr_rangers`) | Power Rangers | #898 | 117.3 Hz | m · mid · lively · normal | — | 15 |
| Ninja Storm CGPT (`ninja_storm_cgpt`) | Power Rangers | #777 | 193.4 Hz | f · mid · lively · fast | — | 13 |
| Ninja Storm Rangers (`ninja_storm_rangers`) | Power Rangers | #388 | 116.7 Hz | m · mid · lively · fast | — | 13 |
| Ninja Storm Squad (`ns_squad`) | Power Rangers | #89 | 147 Hz | m · young · lively · normal | — | 14 |
| Samurai Red (`samurai_red_ranger`) | Power Rangers | #418 | 116.7 Hz | m · mid · lively · normal | — | 13 |
| S.P.D. Rangers (`spd_rangers`) | Power Rangers | #686 | 119.2 Hz | m · mid · flat · fast | — | 15 |
| Rick Sanchez (`rick`) | Rick and Morty | #113 | 104.5 Hz | m · low · wild · fast | — | 18 |
| Rick Prime (`rickPrime`) | Rick and Morty | same as Rick Sanchez | 104.5 Hz | m · low · calm · slow | -1.5 st, dark | 15 |
| Saiki Kusuo (`saiki`) | Saiki K. | #219 | 119.8 Hz | m · mid · flat · normal | — | 15 |
| Homelander (`homelander`) | The Boys | #600 | 116.7 Hz | m · mid · calm · slow | — | 17 |
| Soldier Boy (`soldier_boy`) | The Boys | #800 | 99.8 Hz | m · low · flat · normal | — | 14 |
| Dash (`dash_parr`) | The Incredibles | #519 | 146 Hz | m · kid · wild · fast | — | 13 |
| Elastigirl (`elastigirl`) | The Incredibles | #541 | 169.6 Hz | f · low · lively · normal | — | 13 |
| Frozone (`frozone`) | The Incredibles | #736 | 105.5 Hz | m · low · lively · normal | — | 12 |
| Mr. Incredible (`mr_incredible`) | The Incredibles | #806 | 96.3 Hz | m · deep · lively · normal | — | 13 |
| Syndrome (`syndrome`) | The Incredibles | #209 | 131.2 Hz | m · high · wild · fast | — | 15 |
| Violet (`violet`) | The Incredibles | #250 | 232.1 Hz | f · young · flat · normal | — | 15 |
