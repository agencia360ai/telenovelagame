-- ============================================================================
-- Content Framework — missions, versioned definitions, assets, packs,
-- entitlements and per-mission progress. See docs/CONTENT_FRAMEWORK.md.
--
-- Apply with:  supabase db push   (or paste into the SQL editor)
-- Storage:     create a PUBLIC bucket named "media" for the files.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── Packs (seasons / purchasable groups) ────────────────────────────────────
create table if not exists public.content_packs (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  title       text not null,
  is_premium  boolean not null default false,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- ── Missions (catalog metadata; the playable definition lives in versions) ──
create table if not exists public.missions (
  id               text primary key,            -- matches Mission.id (e.g. "armed-robbery")
  pack_id          uuid references public.content_packs(id) on delete set null,
  title            text not null,
  difficulty       int not null default 1 check (difficulty between 1 and 3),
  tags             text[] not null default '{}',
  reward           int not null default 5,
  time_limit_seconds int not null default 15,
  locale_default   text not null default 'en',
  sort_order       int not null default 0,      -- drives catalog order + prefetch window
  is_published     boolean not null default false,
  min_app_version  text,                        -- gate by app version if needed
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ── Versioned mission definitions (the full mission@1 JSON) ─────────────────
create table if not exists public.mission_versions (
  id           uuid primary key default gen_random_uuid(),
  mission_id   text not null references public.missions(id) on delete cascade,
  version      text not null,                   -- e.g. "1.0.0"
  definition   jsonb not null,                  -- the full mission@1 document
  checksum     text not null,                   -- sha256 of definition (cache key)
  is_published boolean not null default false,
  created_at   timestamptz not null default now(),
  unique (mission_id, version)
);

-- ── Assets (every media file, with specs + size + checksum for the cache) ───
create table if not exists public.assets (
  id           uuid primary key default gen_random_uuid(),
  key          text not null,                   -- logical key referenced by beats
  mission_id   text references public.missions(id) on delete cascade,  -- null = shared
  type         text not null check (type in ('video','image')),
  role         text not null check (role in ('intro','ambient','deploy','still','portrait')),
  storage_path text not null,                   -- path in the "media" bucket
  public_url   text,                            -- resolved CDN/Storage URL
  bytes        bigint not null default 0,       -- for prefetch planning
  checksum     text,                            -- dedupe / integrity
  duration_ms  int,
  width        int,
  height       int,
  spec         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  unique (mission_id, key)
);

create index if not exists assets_mission_idx on public.assets (mission_id);
create index if not exists missions_order_idx on public.missions (sort_order);

-- ── Per-user, per-mission progress (telenovela uses player_state separately) ─
create table if not exists public.mission_progress (
  user_id      uuid not null,
  mission_id   text not null references public.missions(id) on delete cascade,
  status       text not null default 'in_progress'
                 check (status in ('in_progress','completed','failed')),
  best_score   int not null default 0,
  choice_path  jsonb not null default '[]'::jsonb,  -- ids of choices made
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (user_id, mission_id)
);

-- ── Entitlements (which packs a user owns; powers the paywall) ──────────────
create table if not exists public.entitlements (
  user_id    uuid not null,
  pack_id    uuid not null references public.content_packs(id) on delete cascade,
  source     text not null default 'purchase',   -- purchase | grant | subscription
  granted_at timestamptz not null default now(),
  primary key (user_id, pack_id)
);

-- ── The client manifest: published missions in order + their assets ─────────
-- One round-trip the app calls to learn the catalog. Joins the latest
-- published version's definition with the mission metadata and its assets.
create or replace view public.content_manifest as
select
  m.id,
  m.title,
  m.difficulty,
  m.tags,
  m.reward,
  m.time_limit_seconds,
  m.locale_default,
  m.sort_order,
  m.pack_id,
  m.min_app_version,
  v.version,
  v.checksum,
  v.definition,
  coalesce(
    (select jsonb_agg(jsonb_build_object(
       'key', a.key, 'type', a.type, 'role', a.role,
       'url', a.public_url, 'bytes', a.bytes, 'checksum', a.checksum,
       'duration_ms', a.duration_ms, 'width', a.width, 'height', a.height,
       'spec', a.spec
     ) order by a.role)
     from public.assets a where a.mission_id = m.id),
    '[]'::jsonb
  ) as assets
from public.missions m
join lateral (
  select * from public.mission_versions mv
  where mv.mission_id = m.id and mv.is_published
  order by mv.created_at desc
  limit 1
) v on true
where m.is_published
order by m.sort_order;

-- ── Row-level security ──────────────────────────────────────────────────────
alter table public.content_packs    enable row level security;
alter table public.missions         enable row level security;
alter table public.mission_versions enable row level security;
alter table public.assets           enable row level security;
alter table public.mission_progress enable row level security;
alter table public.entitlements     enable row level security;

-- Published content is world-readable (anon key). Authoring is service-role only.
create policy "read packs"   on public.content_packs    for select using (true);
create policy "read missions" on public.missions        for select using (is_published);
create policy "read versions" on public.mission_versions for select using (is_published);
create policy "read assets"   on public.assets          for select using (true);

-- Progress + entitlements are private to the owner.
create policy "own progress read"   on public.mission_progress
  for select using (auth.uid() = user_id);
create policy "own progress write"  on public.mission_progress
  for insert with check (auth.uid() = user_id);
create policy "own progress update" on public.mission_progress
  for update using (auth.uid() = user_id);

create policy "own entitlements" on public.entitlements
  for select using (auth.uid() = user_id);
