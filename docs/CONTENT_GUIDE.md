# 911 Dispatch — Content Guide

> **New (interactive missions):** calls are now authored as branching JSON
> **missions** — short lines + decisions *during* the call, ending in the
> dispatch. See **[CONTENT_FRAMEWORK.md](./CONTENT_FRAMEWORK.md)** for the
> `mission@1` schema, the media spec, the Supabase model, and progressive
> download. The linear `CallScenario` system below still works and is kept for
> reference, but new content should use the mission framework.

How to add content to the game without touching screen code. The game is
**data-driven**: screens read from registries, so adding content = adding data.

## Architecture at a glance

```
src/game/types.ts        core types (CallScenario, DispatchType, …)
src/game/assets.ts       ASSET REGISTRY — where every video/sound/model lives
src/content/calls/       one file per emergency call + index.ts registry
src/lib/audio.ts         AudioManager (music + sfx)
src/context/DispatchProgressContext.tsx   persistent score / streak
src/screens/
  BootScreen.tsx         911 splash
  DispatchLobbyScreen.tsx  3D officer + countdown + incoming call
  CallScreen.tsx         video + tap-through chat + dispatch decision
```

## 1. Add a new emergency call

1. Create `src/content/calls/<my-call>.ts`:
   ```ts
   import { CallScenario } from "../../game/types";
   export const myCall: CallScenario = {
     id: "warehouse-collapse",
     callerName: "Site Foreman",
     callType: "STRUCTURAL COLLAPSE",
     location: "Dockside Warehouse 9",
     video: "warehouse-collapse",     // key in VIDEOS (see step 2) or a raw URL
     reward: 5,
     difficulty: 2,
     correctDispatch: "firefighters",
     messages: [
       { sender: "caller", text: "Part of the roof just came down!" },
       { sender: "operator", text: "Is anyone trapped?" },
       // …keep it to ~5 messages
     ],
   };
   ```
2. Register it in `src/content/calls/index.ts` (`import` + add to `CALLS`).

That's it — it now appears in the random rotation.

## 2. Add a video

Videos are **large**, so they are streamed from a URL (never bundled). Each
scene can have **two** clips:

| Key in `VIDEOS`   | Role                                                     |
| ----------------- | -------------------------------------------------------- |
| `"<id>"`          | looping background shown **during** the call             |
| `"<id>-intro"`    | full-screen cinematic that plays **once** before dialogue |

```ts
export const VIDEOS = {
  "warehouse-collapse": "https://<cdn>/warehouse-loop.mp4",
  "warehouse-collapse-intro": "https://<cdn>/warehouse-cinematic.mp4",
};
```

Then on the scenario:

```ts
export const myCall: CallScenario = {
  // …
  video: "warehouse-collapse",
  introVideo: "warehouse-collapse-intro",
  introCaption: "Dockside Warehouse 9 — partial roof collapse",
};
```

**Graceful fallback:** if a `"<id>-intro"` entry is empty, the intro reuses the
base `"<id>"` video automatically — so the cinematic works even before you've
made a dedicated intro clip. Paste the real URL later and it upgrades itself.

### Where to host videos (recommended: Supabase Storage)

You already have `@supabase/supabase-js`. Steps:

1. In your Supabase project → **Storage** → create a **public** bucket named
   `videos`.
2. Upload your `.mp4` files (drag-and-drop in the dashboard, or the CLI).
3. Click a file → **Copy URL** (public). It looks like:
   `https://<project>.supabase.co/storage/v1/object/public/videos/kitchen-fire-intro.mp4`
4. Paste that URL into the matching key in `VIDEOS`.

Other options:
- **Cloudflare R2 / Bunny.net / AWS S3 + CloudFront** — best for heavy video
  traffic at scale.
- **Dropbox** (quick prototype) — share link with `?dl=1` at the end so it
  serves the raw file. Rate-limited; fine for testing, not production.

**Keep cinematics short & light:** 5–10 s, H.264 mp4, ≤ ~5 MB each. Long/large
clips buffer slowly on mobile and the player will show a "CONNECTING FEED…"
state while it loads.

## 2b. Cinematic stills (placeholders for video moments)

Some "movie" moments don't have a video yet (boot intro, rank-up, result). Use a
**still image** as a cinematic placeholder via `CinematicImage` — it adds
letterbox bars, a slow Ken-Burns zoom, a caption, and tap/auto-advance, so a
static image still feels like a film beat. If the image fails to load it falls
back to a themed "911" title-card (never a broken image).

1. Generate or draw the image (we used Layer.ai → **GPT Image 2**, portrait
   1024×1536).
2. Add it to `IMAGES` in `src/game/assets.ts`:
   ```ts
   export const IMAGES = {
     "dispatch-center": require("../../assets/images/cinematics/dispatch-center.png"),
     // …or a remote URL string (Dropbox `?dl=1` / Supabase public URL)
   };
   ```
3. Render it where you want the beat:
   ```tsx
   <CinematicImage
     source={IMAGES["dispatch-center"]}
     tag="DISPATCH CENTER · LIVE"
     title="NIGHT SHIFT"
     caption="The city is calling, operator."
     onComplete={goNext}
   />
   ```

The boot intro already uses this (`src/screens/BootScreen.tsx`). When you have a
real **video** for the moment, add it to `VIDEOS` and switch to `CutscenePlayer`
instead — same framing, so it's a drop-in upgrade.

## 3. Add sounds / music

Small audio files **are** bundled. Drop the file in `assets/audio/` and register
it in `SFX` or `MUSIC` in `src/game/assets.ts`. See `assets/audio/README.md`.

## 4. Add the real 3D officer (FBX → GLB)

See `assets/models/README.md`. Short version: convert FBX to **GLB** (embed
textures), put it in `assets/models/`, register in `MODELS`, load with
`GLTFLoader` in `OfficerScene3D.tsx`.

## Asset hosting cheat-sheet

| Asset type        | Bundle or host? | Where                                  |
| ----------------- | --------------- | -------------------------------------- |
| Videos (MB+)      | **Host**        | Supabase Storage / CDN / Dropbox(`dl=1`) |
| Sound fx & music  | Bundle          | `assets/audio/`                        |
| 3D models (GLB)   | Bundle (small)  | `assets/models/`                       |
| UI images / icons | Bundle          | `assets/`                              |
