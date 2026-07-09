import { Choice, PlayerState } from "./types";

export function applyChoiceEffects(
  state: PlayerState,
  choice: Choice
): PlayerState {
  const variables = { ...state.variables };
  if (choice.effects) {
    for (const [key, delta] of Object.entries(choice.effects)) {
      variables[key] = (variables[key] ?? 0) + delta;
    }
  }
  // Absolute assignment runs AFTER the deltas, so on a shared key set_vars wins.
  if (choice.set_vars) {
    for (const [key, val] of Object.entries(choice.set_vars)) {
      variables[key] = val;
    }
  }

  const flags = { ...state.flags };
  if (choice.set_flags) {
    for (const [key, val] of Object.entries(choice.set_flags)) {
      flags[key] = val;
    }
  }

  return {
    ...state,
    variables,
    flags,
    gems: state.gems - (choice.gem_cost ?? 0),
    choices_made: [...state.choices_made, choice.id],
    updated_at: new Date().toISOString(),
  };
}
