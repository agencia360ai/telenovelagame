export type Expression = string;

export type CharacterDef = {
  name: string;
  avatars: Record<Expression, string>;
};

export type Line = {
  speaker: string;
  expr: Expression;
  text: string;
};

export type Condition =
  | { choice: string }
  | { flag: string; eq?: boolean }
  | { var: string; op: ">=" | "<=" | ">" | "<" | "=="; value: number };

export type Variant = {
  when: Condition;
  lines: Line[];
};

export type Choice = {
  id: string;
  label: string;
  gem_cost: number;
  premium?: boolean;
  /** Add a delta to numeric variables. */
  effects?: Record<string, number>;
  /** Set numeric variables to an absolute value; applied after `effects`. */
  set_vars?: Record<string, number>;
  set_flags?: Record<string, boolean>;
  next: string;
};

export type Decision = {
  prompt: string;
  choices: Choice[];
};

export type Media = {
  type: "image" | "video";
  key: string;
};

export type BeatType =
  | "dialogue"
  | "decision"
  | "cliffhanger"
  | "chapter_end";

export type Beat = {
  id: string;
  type: BeatType;
  background?: string;
  media?: Media;
  characters_on_scene?: string[];
  lines?: Line[];
  variants?: Variant[];
  decision?: Decision;
  next?: string | null;
};

export type Chapter = {
  id: string;
  title: string;
  order: number;
  start_beat: string;
  beats: Beat[];
};

export type Story = {
  id: string;
  title: string;
  version: string;
  locale_default: string;
  start_chapter: string;
  characters: Record<string, CharacterDef>;
  initial_variables: Record<string, number>;
  initial_flags: Record<string, boolean>;
  starting_gems: number;
  chapters: Chapter[];
};

export type PlayerState = {
  user_id: string;
  story_id: string;
  current_chapter: string;
  current_beat: string;
  variables: Record<string, number>;
  flags: Record<string, boolean>;
  gems: number;
  choices_made: string[];
  completed_beats: string[];
  updated_at: string;
};
