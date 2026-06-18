import { CallScenario } from "../../game/types";

export const borderRunners: CallScenario = {
  id: "border-runners",
  callerName: "Jake Morrison",
  callType: "SUSPICIOUS ACTIVITY",
  location: "Highway 2 · Mile 47",
  video: "border-runners",
  introVideo: "border-runners-intro",
  introCaption: "Highway 2, Mile 47 — suspicious vehicles heading for the border",
  difficulty: 2,
  reward: 8,
  correctDispatch: "border_patrol",
  correctExplanation:
    "Suspicious cross-border vehicle activity falls under BORDER PATROL jurisdiction — they monitor and intercept at border zones.",
  messages: [
    {
      sender: "caller",
      text: "911! I need help! I'm on Highway 2 near mile marker 47!",
    },
    { sender: "operator", text: "What's your emergency?" },
    {
      sender: "caller",
      text: "Two trucks just flew past me going off-road toward the border. No headlights. They're hauling something.",
    },
    { sender: "operator", text: "Can you describe the vehicles?" },
    {
      sender: "caller",
      text: "Dark pickup trucks, modified suspension. They turned off the highway into the desert. Please hurry!",
    },
  ],
};
