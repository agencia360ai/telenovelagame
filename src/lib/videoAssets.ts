const videoModules: Record<string, number> = {
  "videos/ch1/M-1.mp4": require("../../assets/videos/M1.mp4"),
  "videos/ch1/M-2.mp4": require("../../assets/videos/M2.mp4"),
  "videos/ch1/M-3.mp4": require("../../assets/videos/M3.mp4"),
};

export function getVideoSource(key: string): number | string {
  return videoModules[key] ?? key;
}
