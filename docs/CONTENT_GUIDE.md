# 911 Dispatch — Content Guide

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

Videos are **large**, so they are streamed from a URL (never bundled). Add the
URL to `VIDEOS` in `src/game/assets.ts`, keyed by the call id:

```ts
export const VIDEOS = {
  "warehouse-collapse": "https://<cdn>/warehouse.mp4",
};
```

**Where to host videos** (pick one):
- **Supabase Storage** — already a dependency; make a public `videos` bucket and
  use the public URL. Best long-term home.
- **Cloudflare R2 / AWS S3 + CloudFront** — production CDN.
- **Dropbox** (current quick option) — share link with `?dl=1` at the end so it
  serves the raw file. Fine for prototyping, not for production traffic.

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
