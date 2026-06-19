import { Mission } from "../missions/types";

/** One media file as returned by the Supabase `content_manifest` view. */
export type AssetEntry = {
  key: string;
  type: "video" | "image";
  role: "intro" | "ambient" | "deploy" | "still" | "portrait";
  url: string | null;
  bytes: number;
  checksum: string | null;
  duration_ms?: number | null;
  width?: number | null;
  height?: number | null;
  spec?: Record<string, unknown>;
};

/** One mission row from the manifest: metadata + full definition + its assets. */
export type ManifestEntry = {
  id: string;
  title: string;
  difficulty: number;
  tags: string[];
  reward: number;
  time_limit_seconds: number;
  locale_default: string;
  sort_order: number;
  version: string;
  checksum: string;
  definition: Mission;
  assets: AssetEntry[];
};

export type RemoteManifest = ManifestEntry[];
