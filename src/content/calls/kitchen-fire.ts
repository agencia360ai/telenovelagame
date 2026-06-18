import { CallScenario } from "../../game/types";

export const kitchenFire: CallScenario = {
  id: "kitchen-fire",
  callerName: "Maria Santos",
  callType: "FIRE EMERGENCY",
  location: "742 Oak Avenue",
  video: "kitchen-fire",
  introVideo: "kitchen-fire-intro",
  introCaption: "742 Oak Avenue — caller reports a kitchen fire",
  difficulty: 1,
  reward: 5,
  correctDispatch: "firefighters",
  correctExplanation:
    "Active fires with people trapped require FIRE DEPT — they have the gear to suppress flames and perform rescue operations.",
  messages: [
    { sender: "caller", text: "Help! My kitchen is on fire! Oh God!" },
    { sender: "operator", text: "Ma'am, are you inside the house?" },
    {
      sender: "caller",
      text: "Yes! The grease pan caught fire and it spread to the curtains! Smoke everywhere!",
    },
    {
      sender: "operator",
      text: "Get everyone out now. Is anyone else inside?",
    },
    {
      sender: "caller",
      text: "My kids are upstairs! I can hear them coughing! Please send someone fast!",
    },
  ],
};
