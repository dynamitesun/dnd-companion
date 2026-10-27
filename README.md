# Solo DM

A standalone Android app for playing D&D 5e solo with an AI Dungeon Master, plus every companion tool in one place.

## Install on your phone
1. Open this repo's **Releases** page on your phone and download the newest `SoloDM.apk`.
2. Open it. Android will ask to allow installs from your browser or files app — allow it once.
3. Launch **Solo DM**, tap ⚙️, paste your Anthropic API key (console.anthropic.com → API Keys).

Every push to `main` builds a new APK automatically (Actions tab → Build APK). New builds install over the old one and keep your saved campaigns.

## What's inside
- **Play**: AI DM that narrates, runs NPCs and monsters, and voices up to three AI companions who act on their own personalities (and can refuse). You roll your own checks by tapping; the DM's rolls come from real pre-rolled dice and are shown in the log.
- **Adventure Book**: load your adventure PDF (e.g. Curse of Strahd); the DM pulls the relevant sections each turn and follows the book.
- **Party**: four full character sheets, D&D Beyond PDF import, rests, death saves, conditions.
- **Map**: grid maps, uploaded battle maps, tokens, fog of war with line of sight, secret NPC tokens, terrain painting.
- **Dice**: any formula, advantage/disadvantage, saved rolls, history.
- **Tools**: initiative, spells, journal (auto-filled by the DM), encounter builder, generators, level-up helper, Strahd tracker, rules lookup, shops, downtime, calendar & moon phases, procedural soundboard + your own audio, session recaps, homebrew builder, backup/export.

## Develop
```
npm install
npm run dev          # browser preview
npm run build && npx cap sync android
```
Rules reference data is based on the D&D 5e SRD 5.1 (CC-BY-4.0).
