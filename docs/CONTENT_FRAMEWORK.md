# Content Framework — Missions, Media & Progressive Delivery

This document is the answer to three questions:

1. **How do calls become interactive** (story + short lines + decisions *during*
   the conversation, not tap‑through‑to‑dispatch)?
2. **What is the modular structure** so we can add / swap missions and their
   videos by editing/uploading JSON — where every video carries its own spec?
3. **How do we keep most content in the cloud and stream/download it as the
   player advances** (e.g. on mission 5 we pre‑download 6, 7, 8; the rest stay
   online), all prepared for **Supabase**?

The design unifies everything onto **one data model**: a *mission* is a small
**branching beat graph** authored in JSON. It is the same proven shape the
telenovela engine already uses (`src/lib/engine`), specialized for dispatch.

---

## 1. The mission model (interactive by design)

A mission is a graph of **beats**. Each beat is one of:

| Beat type   | What the player sees                                                        |
| ----------- | --------------------------------------------------------------------------- |
| `dialogue`  | Caller/operator lines, revealed one tap at a time (short, telenovela‑style).|
| `decision`  | A **mid‑call** choice: what the operator *says or does next*. Sets flags / variables. Branches. |
| `dispatch`  | The climax: choose the unit. Correctness can depend on what you learned.     |
| `outcome`   | Deployment cutscene + result breakdown.                                     |

`decision` beats are the heart of request #1. They let the operator *calm the
caller*, *gather intel*, *make a judgement call* — and those choices change the
dialogue that follows (`variants`), the score, and even **which dispatch is
correct** (`correct_rules`). A mission is no longer "read 5 lines, pick a unit";
it's a branching scene with consequences.

### Mission JSON schema (`mission@1`)

```jsonc
{
  "schema": "mission@1",
  "id": "armed-robbery",                 // stable id (analytics + asset folder)
  "title": "Armed Robbery in Progress",
  "version": "1.0.0",                    // bump when you edit content
  "locale_default": "en",
  "difficulty": 2,                       // 1=easy 2=medium 3=hard (paces selection)
  "tags": ["crime", "weapons"],

  "caller":   { "name": "Anonymous Caller", "type": "CRIME IN PROGRESS",
                "location": "QuickMart · 5th & Main" },

  "units": ["police", "firefighters", "border_patrol"],  // optional; defaults to global set
  "reward": 8,                           // base XP for a correct dispatch
  "time_limit_seconds": 15,              // dispatch countdown

  "initial_variables": { "panic": 0, "intel": 0, "score_bonus": 0 },
  "initial_flags": {},
  "start": "b1",                         // first beat id

  // ── Media manifest: every file this mission needs, each with its spec ──
  "assets": [
    { "key": "armed-robbery-intro", "type": "video", "role": "intro",
      "required": true, "caption": "QuickMart, 5th & Main — armed robbery",
      "spec": { "aspect": "9:16", "max_seconds": 10, "max_mb": 5,
                "codec": "h264", "loop": false } },
    { "key": "armed-robbery", "type": "video", "role": "ambient",
      "spec": { "aspect": "9:16", "loop": true, "muted": true } }
  ],

  "beats": [
    { "id": "b1", "type": "dialogue",
      "media": { "key": "armed-robbery", "role": "ambient" },
      "lines": [
        { "speaker": "caller",   "text": "I'm hiding. There's a robbery at the QuickMart." },
        { "speaker": "operator", "text": "Are you safe? How many suspects?" }
      ],
      "next": "d1" },

    { "id": "d1", "type": "decision",
      "prompt": "The caller is panicking. What do you do?",
      "choices": [
        { "id": "d1_calm",  "label": "Stay hidden and quiet — help is coming.",
          "effects": { "panic": -1, "intel": 1, "score_bonus": 1 },
          "feedback": "A calm caller gives clearer intel.", "next": "b2" },
        { "id": "d1_push",  "label": "Describe the suspects, now.",
          "effects": { "panic": 1, "intel": 1 }, "next": "b2" },
        { "id": "d1_nego",  "label": "Patch in a negotiator.", "gem_cost": 5,
          "premium": true, "effects": { "panic": -2, "intel": 2, "score_bonus": 2 },
          "next": "b2" }
      ] },

    { "id": "b2", "type": "dialogue",
      "variants": [
        { "when": { "choice": "d1_calm" },
          "lines": [ { "speaker": "caller", "text": "Okay… okay. Two men, masks, one has a gun." } ] }
      ],
      "lines": [ { "speaker": "caller", "text": "They're shouting about the safe!" } ],
      "next": "dispatch" },

    { "id": "dispatch", "type": "dispatch",
      "prompt": "WHO DO YOU DISPATCH?",
      "correct": "police",
      "explanation": "Armed crime in progress → POLICE secure the scene.",
      "next": "outcome" },

    { "id": "outcome", "type": "outcome",
      "deploy_media": { "key": "border-runners-intro", "role": "deploy" } }
  ]
}
```

### Branching primitives (shared with the telenovela engine)

- **`variants`** on a beat: pick the first `lines` whose `when` condition matches
  the runtime state — so prior choices rewrite later dialogue.
- **`Condition`**: `{ "choice": "<id>" }` | `{ "flag": "x", "eq": true }` |
  `{ "var": "intel", "op": ">=", "value": 2 }`.
- **`effects`** / **`set_flags`** on a choice: mutate variables/flags.
- **Reserved variable `score_bonus`**: added to the reward on a correct
  dispatch — this is how good mid‑call decisions pay off mechanically.
- **Conditional correctness** on a `dispatch` beat:
  ```jsonc
  "correct_rules": [ { "when": { "flag": "fire_spreading", "eq": true },
                       "unit": "firefighters" } ],
  "default_correct": "police"
  ```
  The "right answer" can depend on intel the player did (or didn't) gather.
- **Premium choices**: `gem_cost` + `premium` gate a choice behind the gem
  economy (reuses `EconomyContext`) — a clean, non‑coercive monetization hook.

### Where it runs

`src/screens/MissionScreen.tsx` walks the beat graph with `src/lib/missions/engine.ts`.
It reuses the existing dispatch UI (CCTV video frame, `DispatchTimer`,
`DispatchRadar`, `ResultBreakdown`) and scoring (`DispatchProgressContext`). The
old linear `CallScenario` path (`CallScreen`) still works, so nothing breaks.

---

## 2. Modular content — add a mission by dropping a JSON

```
src/content/missions/
  armed-robbery.json      ← one file per mission
  border-runners.json
  kitchen-fire.json
  index.ts                ← registry (imports the JSON, validates, orders)
scripts/validate-missions.ts   ← run `npm run validate-missions` before shipping
```

**To add a mission today (offline / bundled):**
1. Create `src/content/missions/<id>.json` following `mission@1`.
2. Add its `assets` (declare each video/image with `role` + `spec`).
3. Register it in `index.ts` (one import + one array entry).
4. `npm run validate-missions` (checks ids, reachability, unknown speakers,
   dangling `next`, missing assets, negative gem costs).

That's the whole framework locally. **To add a mission from the cloud (no app
update)** — see §3: you upload the same JSON to Supabase and it appears via the
manifest.

### The media spec (so each video adapts to where it's used)

Every asset declares a **role** and a **spec**. The role tells the renderer how
to use the file; the spec tells production how to make it and the downloader how
big it is.

| `role`    | Used as…                                   | Recommended spec                          |
| --------- | ------------------------------------------ | ----------------------------------------- |
| `intro`   | Full‑screen cutscene, plays **once**       | 9:16, ≤10 s, ≤5 MB, h264, `loop:false`    |
| `ambient` | Looping background **during** the call     | 9:16, `loop:true`, `muted:true`, ≤8 MB    |
| `deploy`  | Backdrop behind the deployment radar       | 9:16, `loop:true`, `muted:true`           |
| `still`   | Cinematic placeholder image                | 9:16 (1024×1536), ≤300 KB                 |
| `portrait`| Character avatar                           | 1:1 or 4:5, ≤150 KB                       |

Because media is referenced by **logical `key`**, the same physical file can be
reused across missions, and a file can be swapped (bundled → CDN → Supabase)
without touching mission JSON. Resolution order (`src/game/assets.ts` +
`src/lib/content`): **local cache → bundled `require()` → remote URL**.

---

## 3. Cloud delivery + progressive download (Supabase)

Goal: ship the app light; keep the catalog online; **download the next few
missions ahead of the player** and stream/evict the rest.

### Supabase schema

See `supabase/migrations/0001_content_framework.sql`. Tables:

| Table              | Purpose                                                                 |
| ------------------ | ----------------------------------------------------------------------- |
| `missions`         | One row per mission: slug, title, difficulty, `sort_order`, `is_published`, `min_app_version`, `pack_id`. Drives the ordered catalog. |
| `mission_versions` | Versioned full mission JSON (`definition jsonb`, `checksum`). The app loads the latest published version. Edit content = insert a new version. |
| `assets`           | Every media file: `key`, `mission_id`, `type`, `role`, `storage_path`, `public_url`, `bytes`, `checksum`, `duration_ms`, `width/height`, `spec jsonb`. The downloader reads `bytes`/`checksum` to plan & dedupe. |
| `content_packs`    | Group missions into seasons/packs (free vs premium).                    |
| `entitlements`     | `(user_id, pack_id)` — which packs a user owns (paywall).               |
| `mission_progress` | `(user_id, mission_id)` status / best_score / choice path / completed_at. (`player_state` already mirrors the telenovela.) |

Storage: a public bucket `media` holds the files at `storage_path`
(`missions/<id>/<key>.<ext>`). RLS: published content is world‑readable via the
anon key; `*_progress` / `entitlements` are row‑scoped to `auth.uid()`.

A `content_manifest` view (or RPC) returns published missions in `sort_order`
with their assets — that single payload is what the client syncs.

### Client: the download manager

`src/lib/content/downloadManager.ts` (uses **`expo-file-system`**, lazy‑loaded so
the app still bundles before you install it):

```
syncManifest()                  → fetch + cache the catalog (missions + assets)
prefetchWindow(currentIndex, n) → ensure assets for missions [i .. i+n] are
                                  on disk (cacheDirectory/missions/<id>/<key>),
                                  newest‑needed first, skipping checksum matches
localUriForKey(missionId, key)  → cached file:// uri, or null (→ stream remote)
evictBeyondBudget(maxBytes)     → LRU‑drop assets of finished, far‑behind missions
```

**Lifecycle** (wired in the lobby, fire‑and‑forget, all guarded so it no‑ops
until Supabase env is set):
1. App opens → `syncManifest()` (cached; works offline after first sync).
2. Compute `currentIndex` from progress → `prefetchWindow(currentIndex, 3)`.
3. A screen needs media `key` → resolver returns the **local** uri if cached,
   else the **remote** url (and triggers a background fetch).
4. Over budget → `evictBeyondBudget()` drops the oldest completed missions.

Net effect: missions 6–8 are already on disk when you reach 5; 9+ stream on
demand the first time, then cache. Fully offline once cached.

### Turning it on

Off by default (bundled JSON is the source of truth). To enable cloud content:

```bash
npx expo install expo-file-system          # pinned to the SDK 54 version
# set in your env / EAS secrets:
EXPO_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>
EXPO_PUBLIC_CDN_BASE=...                    # optional CDN in front of Storage
EXPO_PUBLIC_REMOTE_CONTENT=true             # flip the framework on
```

Apply the migration (`supabase db push` or paste the SQL in the dashboard),
upload media to the `media` bucket, insert `missions` + `mission_versions` +
`assets` rows (or use `scripts/build-manifest.ts` as a starting point).

---

## File map

```
src/lib/missions/types.ts       mission@1 types (the schema, in TS)
src/lib/missions/engine.ts      conditions / effects / variants / scoring
src/content/missions/*.json     the missions (data)
src/content/missions/index.ts   registry + difficulty‑paced selection
src/screens/MissionScreen.tsx   interactive renderer (beat graph → UI)
scripts/validate-missions.ts    content linter

src/lib/content/types.ts        RemoteManifest / AssetEntry types
src/lib/content/contentSource.ts  fetch manifest from Supabase
src/lib/content/downloadManager.ts  prefetch / cache / evict
supabase/migrations/0001_content_framework.sql   the database
```
