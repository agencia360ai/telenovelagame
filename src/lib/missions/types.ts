/**
 * Mission schema (`mission@1`) — the data model for an interactive 911 call.
 *
 * A mission is a branching graph of BEATS. The operator makes decisions DURING
 * the call (not just a final dispatch tap), and those decisions can rewrite the
 * dialogue that follows, change the score, and even change which unit is the
 * correct dispatch. See docs/CONTENT_FRAMEWORK.md for the full spec.
 *
 * This mirrors the telenovela engine (src/lib/engine) on purpose, so authoring
 * and tooling stay consistent across both content domains.
 */
import { DispatchType } from "../../game/types";

// ── Conditions (same syntax as the telenovela engine) ───────────────────────
export type MissionCondition =
  | { choice: string }
  | { flag: string; eq?: boolean }
  | { var: string; op: ">=" | "<=" | ">" | "<" | "=="; value: number };

// ── Media ────────────────────────────────────────────────────────────────────
export type MediaType = "video" | "image";
export type MediaRole = "intro" | "ambient" | "deploy" | "still" | "portrait";

/** Production + delivery hints for one media file (see the table in the docs). */
export type MediaSpec = {
  aspect?: "9:16" | "16:9" | "1:1" | "4:5";
  loop?: boolean;
  muted?: boolean;
  max_seconds?: number;
  max_mb?: number;
  codec?: string;
  width?: number;
  height?: number;
};

/** A media file the mission needs, declared once in the mission `assets` list. */
export type MissionAsset = {
  key: string; // logical key — resolved via cache → bundle → remote URL
  type: MediaType;
  role: MediaRole;
  required?: boolean;
  caption?: string;
  spec?: MediaSpec;
};

/** A reference to an asset from inside a beat. */
export type MediaRef = { key: string; role?: MediaRole };

// ── Dialogue & choices ────────────────────────────────────────────────────────
export type Speaker = "caller" | "operator" | "dispatch" | "narrator" | string;

export type MissionLine = {
  speaker: Speaker;
  text: string;
  /** Optional expression key for a portrait (reserved for future avatars). */
  expr?: string;
};

export type MissionChoice = {
  id: string;
  label: string;
  /** Gem cost; >0 gates the choice behind the economy. */
  gem_cost?: number;
  premium?: boolean;
  /** Mutate numeric variables (e.g. { intel: 1, score_bonus: 2 }). */
  effects?: Record<string, number>;
  /** Set boolean flags. */
  set_flags?: Record<string, boolean>;
  /** A short operator-feedback line shown right after choosing. */
  feedback?: string;
  next: string;
};

export type MissionVariant = {
  when: MissionCondition;
  lines: MissionLine[];
};

/** Conditional correctness for a dispatch beat. */
export type CorrectRule = {
  when: MissionCondition;
  unit: DispatchType;
};

// ── Beats ──────────────────────────────────────────────────────────────────────
export type BeatType = "dialogue" | "decision" | "dispatch" | "outcome";

export type MissionBeat = {
  id: string;
  type: BeatType;
  media?: MediaRef;

  // dialogue / decision dialogue
  lines?: MissionLine[];
  variants?: MissionVariant[];

  // decision
  prompt?: string;
  choices?: MissionChoice[];

  // dispatch
  correct?: DispatchType;
  correct_rules?: CorrectRule[];
  default_correct?: DispatchType;
  explanation?: string;

  // outcome
  deploy_media?: MediaRef;

  next?: string | null;
};

// ── Mission ──────────────────────────────────────────────────────────────────
/**
 * Where a mission fits in the in-game weekly calendar (see src/lib/calendar).
 * - "daily"     → drawn at random from the daily pool on a normal weekday.
 * - "game_plot" → ordered story call, served on the week's plot day (see gamePlot.ts).
 * - "weekend"   → drawn from the weekend pool on weekend days.
 * Defaults to "daily" when omitted (keeps older content valid).
 */
export type MissionCategory = "daily" | "game_plot" | "weekend";

export type Mission = {
  schema: "mission@1";
  id: string;
  title: string;
  version: string;
  locale_default: string;
  difficulty: 1 | 2 | 3;
  tags?: string[];
  /** Calendar bucket (default "daily"). */
  category?: MissionCategory;
  /** Ordering hint for "game_plot" missions (lower plays first). */
  order?: number;

  caller: {
    name: string;
    type: string;
    location: string;
    /** MODELS key or GLB URL for the caller's 3D portrait (Streamoji). */
    avatar?: string;
  };

  units?: DispatchType[];
  reward: number;
  time_limit_seconds?: number;

  initial_variables?: Record<string, number>;
  initial_flags?: Record<string, boolean>;

  start: string;
  assets: MissionAsset[];
  beats: MissionBeat[];
};

/** The mutable runtime state while playing a mission. */
export type MissionRuntime = {
  variables: Record<string, number>;
  flags: Record<string, boolean>;
  choices_made: string[];
};
