export type CallMessage = {
  sender: "caller" | "operator";
  text: string;
};

export type DispatchType = "police" | "firefighters" | "border_patrol";

export type CallScenario = {
  id: string;
  callerName: string;
  callType: string;
  location: string;
  videoUrl: string;
  messages: CallMessage[];
  correctDispatch: DispatchType;
  reward: number;
};

export const DISPATCH_OPTIONS: {
  id: DispatchType;
  label: string;
  icon: string;
}[] = [
  { id: "police", label: "POLICE", icon: "🚔" },
  { id: "firefighters", label: "FIRE DEPT", icon: "🚒" },
  { id: "border_patrol", label: "BORDER\nPATROL", icon: "🛂" },
];

export function getDispatchLabel(id: DispatchType): string {
  return DISPATCH_OPTIONS.find((o) => o.id === id)?.label ?? id;
}

const calls: CallScenario[] = [
  {
    id: "border-runners",
    callerName: "Jake Morrison",
    callType: "SUSPICIOUS ACTIVITY",
    location: "Highway 2 · Mile 47",
    videoUrl:
      "https://www.dropbox.com/scl/fi/29p7w6ahmv04qsk3aok24/M-1.mp4?rlkey=jrtt9h9fdwaxc0rkznfs8xp88&dl=1",
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
    correctDispatch: "border_patrol",
    reward: 5,
  },
  {
    id: "kitchen-fire",
    callerName: "Maria Santos",
    callType: "FIRE EMERGENCY",
    location: "742 Oak Avenue",
    videoUrl:
      "https://www.dropbox.com/scl/fi/pmt42dbx9upde7diw4lqp/M-2.mp4?rlkey=n01sjuoodnx0ynd6aapq2qu8c&dl=1",
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
    correctDispatch: "firefighters",
    reward: 5,
  },
  {
    id: "armed-robbery",
    callerName: "Anonymous Caller",
    callType: "CRIME IN PROGRESS",
    location: "QuickMart · 5th & Main",
    videoUrl:
      "https://www.dropbox.com/scl/fi/sgpnw5olpjle9k89gpoqu/M-3.mp4?rlkey=v9e6nxyzng47d1686wew2kyoc&dl=1",
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
    correctDispatch: "police",
    reward: 5,
  },
];

export function getCallById(id: string): CallScenario {
  return calls.find((c) => c.id === id) ?? calls[0];
}

export function getRandomCallId(): string {
  return calls[Math.floor(Math.random() * calls.length)].id;
}
