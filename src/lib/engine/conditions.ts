import { Condition, PlayerState } from "./types";

export function evaluateCondition(
  condition: Condition,
  state: PlayerState
): boolean {
  if ("choice" in condition) {
    return state.choices_made.includes(condition.choice);
  }

  if ("flag" in condition) {
    const val = state.flags[condition.flag] ?? false;
    return condition.eq !== undefined ? val === condition.eq : val;
  }

  if ("var" in condition) {
    const current = state.variables[condition.var] ?? 0;
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
