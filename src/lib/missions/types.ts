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
export type MediaRole =
  | "intro"
  | "ambient"
  /** Plays (looping) after the "ambient" clip finishes its single pass. */
  | "ambient_next"
  | "deploy"
  | "still"
  | "portrait";

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
  /** Gem cost; >0 gates the choice behind the premium economy. */
  gem_cost?: number;
  /** Cash cost; >0 spends the earned cash wallet (e.g. buying dinner). */
  cash_cost?: number;
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

/**
 * A destination pin on an interactive map beat. Choosing a pin is the map
 * equivalent of a `MissionChoice`: it can set flags / mutate variables and then
 * routes the conversation to `next` (a beat in the SAME mission).
 */
export type MapPinChoice = {
  id: string;
  /** Normalized map coordinates in [0,1] (x = fraction of width, y of height). */
  x: number;
  y: number;
  /** Emoji shown in the pin bubble (like MapPin). */
  icon: string;
  /** Visible name under the pin. */
  label: string;
  /**
   * System note echoed into the chat when this pin is picked, so the player
   * sees a record of where they went (e.g. "Moved to the Hospital"). Defaults
   * to `Moved to {label}` when omitted.
   */
  note?: string;
  /** Mutate numeric variables (same as MissionChoice). */
  effects?: Record<string, number>;
  /** Set boolean flags (persist into the mission runtime). */
  set_flags?: Record<string, boolean>;
  /** Optional gating; hidden/disabled when the condition isn't met. */
  requires?: MissionCondition;
  /** Beat to continue at (within this mission). */
  next: string;
};

/** Conditional correctness for a dispatch beat. */
export type CorrectRule = {
  when: MissionCondition;
  unit: DispatchType;
};

// ── Beats ──────────────────────────────────────────────────────────────────────
export type BeatType = "dialogue" | "decision" | "dispatch" | "outcome" | "map";

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

  // map (interactive displacement to a destination)
  /** Background map image key (e.g. "manhattan2"). Defaults to the radar map. */
  map?: string;
  /** Destination pins the player can pick from. */
  pins?: MapPinChoice[];
  /** Label for the button that opens the map from the chat (default "Go to map"). */
  map_cta?: string;

  // dispatch
  correct?: DispatchType;
  correct_rules?: CorrectRule[];
  default_correct?: DispatchType;
  explanation?: string;

  // outcome
  deploy_media?: MediaRef;

  next?: string | null;
  /**
   * Conditional routing: after this beat, jump to the first rule whose
   * condition matches the runtime state (accumulated across missions via the
   * story context). Falls back to `next`. This is what lets every mission's
   * decisions converge into different endings of the same narrative.
   */
  next_rules?: { when: MissionCondition; next: string }[];
};

// ── Mission ──────────────────────────────────────────────────────────────────
/**
 * Where a mission fits in the in-game weekly calendar (see src/lib/calendar).
 * - "daily"     → drawn at random from the daily pool on a normal weekday.
 * - "game_plot" → ordered story call, served on the week's plot day (see gamePlot.ts).
 * - "weekend"   → drawn from the weekend pool on weekend days.
 * - "intro"     → one-off scene played outside the calendar (e.g. the prologue,
 *                 shown once at first launch). Never served by the scheduler.
 * - "event"     → ordered off-duty vignette (breaks, meals, purchases) served
 *                 once per week on a random weekday. No dispatch; choices may
 *                 spend cash via `cash_cost`.
 * - "life"      → rank-up follow-up scene, served on promotion (not calendar).
 * Defaults to "daily" when omitted (keeps older content valid).
 */
export type MissionCategory =
  | "daily"
  | "game_plot"
  | "weekend"
  | "intro"
  | "event"
  | "life";

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
  /** Serving order for sequential missions ("game_plot" and "weekend"). Lower plays first. */
  order?: number;
  /**
   * Optional gating for sequential missions (honored today only for "game_plot").
   * If the condition isn't met that week, the entry is retried in later weeks.
   */
  unlock?: { minRank?: number; minWeek?: number };

  caller: {
    name: string;
    type: string;
    location: string;
    /** MODELS key or GLB URL for the caller's 3D portrait (Streamoji). */
    avatar?: string;
  };

  /**
   * Optional display names for extra speakers used in narrative missions
   * (e.g. { mara: "Mara", grandma: "Grandma" }). The reserved speakers
   * caller/operator/dispatch/narrator are handled by the screen; any other
   * speaker falls back to the caller's name unless mapped here.
   */
  speakers?: Record<string, string>;

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
