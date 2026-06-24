# assets/skins

Pre-baked 2D avatar skins (one consistent dispatcher, different outfits per
rank/tier), shipped to every player. Generated offline — not at runtime.

- `<id>.png` — one file per skin id in `src/game/skins.ts`.
- `_style/reference.png` — your style reference image (the comic cel-shade
  look). Drop it here so the generator keeps every skin on-style.

Generate with:

```
npm run generate-skins              # missing only
npm run generate-skins -- --force   # regenerate all
npm run generate-skins -- rookie    # specific ids
```

Then paste the printed `SKIN_IMAGES` block into `src/game/assets.ts`.
See `docs/SKINS_GUIDE.md` for the full workflow.
