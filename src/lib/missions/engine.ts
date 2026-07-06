/**
 * Mission engine — pure functions that walk a mission beat graph.
 *
 * No React, no I/O: given a Mission + the current MissionRuntime, resolve which
 * lines to show, apply a choice's effects, find the next beat, and compute the
 * correct dispatch + score bonus. Kept pure so it's trivially testable and so
 * the same logic can run on a server later.
 */
import { DispatchType } from "../../game/types";
import {
  MapPinChoice,
  Mission,
  MissionBeat,
  MissionChoice,
  MissionCondition,
  MissionLine,
  MissionRuntime,
} from "./types";

/** Reserved variable: added to the reward on a correct dispatch. */
export const SCORE_BONUS_VAR = "score_bonus";
/** Clamp so a single mission can't balloon the economy. */
export const MAX_SCORE_BONUS = 5;

export function initRuntime(mission: Mission): MissionRuntime {
  return {
    variables: { ...(mission.initial_variables ?? {}) },
    flags: { ...(mission.initial_flags ?? {}) },
    choices_made: [],
  };
}

export function getBeat(mission: Mission, beatId: string): MissionBeat | undefined {
  return mission.beats.find((b) => b.id === beatId);
}

export function getStartBeat(mission: Mission): MissionBeat | undefined {
  return getBeat(mission, mission.start);
}

export function evaluateCondition(
  condition: MissionCondition,
  rt: MissionRuntime
): boolean {
  if ("choice" in condition) {
    return rt.choices_made.includes(condition.choice);
  }
  if ("flag" in condition) {
    const val = rt.flags[condition.flag] ?? false;
    return condition.eq !== undefined ? val === condition.eq : val;
  }
  if ("var" in condition) {
    const current = rt.variables[condition.var] ?? 0;
    switch (condition.op) {
      case ">=":
        return current >= condition.value;
      case "<=":
        return current <= condition.value;
      case ">":
        return current > condition.value;
      case "<":
        return current < condition.value;
      case "==":
        return current === condition.value;
    }
  }
  return false;
}

/** The lines to show for a beat — the first matching variant, else base lines. */
export function resolveLines(beat: MissionBeat, rt: MissionRuntime): MissionLine[] {
  if (beat.variants && beat.variants.length > 0) {
    for (const variant of beat.variants) {
      if (evaluateCondition(variant.when, rt)) {
        return variant.lines;
      }
    }
  }
  return beat.lines ?? [];
}

/** Apply a decision choice to runtime state (effects, flags, choice log). */
export function applyChoice(
  rt: MissionRuntime,
  choice: MissionChoice
): MissionRuntime {
  const variables = { ...rt.variables };
  if (choice.effects) {
    for (const [key, delta] of Object.entries(choice.effects)) {
      variables[key] = (variables[key] ?? 0) + delta;
    }
  }
  const flags = { ...rt.flags };
  if (choice.set_flags) {
    for (const [key, val] of Object.entries(choice.set_flags)) {
      flags[key] = val;
    }
  }
  return {
    variables,
    flags,
    choices_made: [...rt.choices_made, choice.id],
  };
}

/** Apply a map pin selection to runtime state (same rules as a decision choice). */
export function applyPin(rt: MissionRuntime, pin: MapPinChoice): MissionRuntime {
  const variables = { ...rt.variables };
  if (pin.effects) {
    for (const [key, delta] of Object.entries(pin.effects)) {
      variables[key] = (variables[key] ?? 0) + delta;
    }
  }
  const flags = { ...rt.flags };
  if (pin.set_flags) {
    for (const [key, val] of Object.entries(pin.set_flags)) {
      flags[key] = val;
    }
  }
  return {
    variables,
    flags,
    choices_made: [...rt.choices_made, pin.id],
  };
}

/** Pins whose `requires` condition is met (or that have none). */
export function visiblePins(beat: MissionBeat, rt: MissionRuntime): MapPinChoice[] {
  const pins = beat.pins ?? [];
  return pins.filter((p) => !p.requires || evaluateCondition(p.requires, rt));
}

/**
 * Where to go after a beat: the first matching `next_rules` entry wins, else
 * the plain `next`. Lets a beat fan out to different branches (e.g. endings)
 * based on the accumulated runtime/story state.
 */
export function resolveNextBeat(
  beat: MissionBeat,
  rt: MissionRuntime
): string | null | undefined {
  if (beat.next_rules) {
    for (const rule of beat.next_rules) {
      if (evaluateCondition(rule.when, rt)) return rule.next;
    }
  }
  return beat.next;
}

/**
 * The correct unit for a dispatch beat. Conditional rules win in order; then a
 * declared default; then the simple `correct`; finally a safe fallback.
 */
export function resolveCorrectUnit(
  beat: MissionBeat,
  rt: MissionRuntime
): DispatchType {
  if (beat.correct_rules) {
    for (const rule of beat.correct_rules) {
      if (evaluateCondition(rule.when, rt)) return rule.unit;
    }
  }
  return beat.default_correct ?? beat.correct ?? "police";
}

/** Bonus XP earned from good mid-call decisions (clamped). */
export function scoreBonus(rt: MissionRuntime): number {
  const raw = rt.variables[SCORE_BONUS_VAR] ?? 0;
  return Math.max(0, Math.min(MAX_SCORE_BONUS, Math.round(raw)));
}
