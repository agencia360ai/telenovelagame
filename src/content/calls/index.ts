import { CallScenario, DispatchOption, DispatchType } from "../../game/types";
import { borderRunners } from "./border-runners";
import { kitchenFire } from "./kitchen-fire";
import { armedRobbery } from "./armed-robbery";

/**
 * The call registry. To add a new emergency call:
 *   1. create ./my-call.ts exporting a CallScenario
 *   2. import it here and add it to CALLS
 * That's the whole framework — screens read from this list.
 */
export const CALLS: CallScenario[] = [
  borderRunners,
  kitchenFire,
  armedRobbery,
];

/** The units the operator can dispatch (rendered as buttons in a call). */
export const DISPATCH_OPTIONS: DispatchOption[] = [
  { id: "police", label: "POLICE", icon: "🚔" },
  { id: "firefighters", label: "FIRE DEPT", icon: "🚒" },
  { id: "border_patrol", label: "BORDER\nPATROL", icon: "🛂" },
];

export function getCallById(id: string): CallScenario {
  return CALLS.find((c) => c.id === id) ?? CALLS[0];
}

export function getRandomCallId(): string {
  return CALLS[Math.floor(Math.random() * CALLS.length)].id;
}

export function getDispatchLabel(id: DispatchType): string {
  return DISPATCH_OPTIONS.find((o) => o.id === id)?.label.replace("\n", " ") ?? id;
}
