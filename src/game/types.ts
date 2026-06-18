/**
 * Core game types for the 911 Dispatch framework.
 *
 * The game is data-driven: a "call" is pure data (caller, video, a scripted
 * conversation, and the correct unit to dispatch). Adding content means adding
 * a CallScenario to the registry in src/content/calls — no screen changes.
 */

// The emergency units the operator can dispatch. To add a new unit:
//   1. add it to this union
//   2. add it to DISPATCH_OPTIONS in src/content/calls/index.ts
export type DispatchType = "police" | "firefighters" | "border_patrol";

export type DispatchOption = {
  id: DispatchType;
  label: string;
  icon: string;
};

export type CallMessage = {
  sender: "caller" | "operator";
  text: string;
};

export type CallScenario = {
  /** Stable unique id (also used for analytics + asset lookup). */
  id: string;
  callerName: string;
  /** Short banner shown in the call header, e.g. "FIRE EMERGENCY". */
  callType: string;
  location: string;
  /**
   * Video key resolved through the asset registry (src/game/assets.ts).
   * May also be a raw http(s) URL or a require() number as a fallback.
   */
  video: string | number;
  /** Scripted back-and-forth revealed one tap at a time. */
  messages: CallMessage[];
  /** The unit that earns the reward. */
  correctDispatch: DispatchType;
  /** Score awarded for a correct dispatch. */
  reward: number;
  /** 1 = easy, 2 = medium, 3 = hard. Reserved for future call selection. */
  difficulty?: 1 | 2 | 3;
  /** Shown on wrong answers — teaches why the correct unit was the right call. */
  correctExplanation?: string;
};

export type CallResult = {
  callId: string;
  chosen: DispatchType;
  correct: boolean;
  reward: number;
};

export type CallResultDetails = {
  correct: boolean;
  baseReward: number;
  streakMultiplier: number;
  streakBonus: number;
  speedBonusXP: number;
  speedLabel: string;
  shiftBonus: number;
  perfectShiftBonus: number;
  totalXP: number;
  newStreak: number;
  newAchievements: string[];
  rankedUp: boolean;
  newRankName: string;
  newRankIcon: string;
  shiftComplete: boolean;
  shiftPerfect: boolean;
};
