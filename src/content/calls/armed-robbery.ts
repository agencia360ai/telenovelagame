import { CallScenario } from "../../game/types";

export const armedRobbery: CallScenario = {
  id: "armed-robbery",
  callerName: "Anonymous Caller",
  callType: "CRIME IN PROGRESS",
  location: "QuickMart · 5th & Main",
  video: "armed-robbery",
  difficulty: 2,
  reward: 8,
  correctDispatch: "police",
  correctExplanation:
    "Armed crime in progress requires POLICE — they're trained to respond to active threats and secure the scene.",
  messages: [
    {
      sender: "caller",
      text: "I'm whispering because I'm hiding. There's a robbery at the QuickMart on 5th and Main.",
    },
    { sender: "operator", text: "Are you safe? How many suspects?" },
    {
      sender: "caller",
      text: "Two guys with masks. One has a gun pointed at the cashier. I ducked behind the shelves.",
    },
    { sender: "operator", text: "Stay hidden and stay on the line." },
    {
      sender: "caller",
      text: "They're shouting about the safe. Please hurry, the cashier looks terrified!",
    },
  ],
};
