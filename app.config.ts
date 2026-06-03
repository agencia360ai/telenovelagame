import { ExpoConfig, ConfigContext } from "expo/config";

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "Corazón en Roaming",
  slug: "corazon-en-roaming",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "dark",
  ios: {
    supportsTablet: false,
    bundleIdentifier: "com.agencia360.corazonenroaming",
  },
  android: {
    adaptiveIcon: {
      foregroundImage: "./assets/android-icon-foreground.png",
      backgroundImage: "./assets/android-icon-background.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
      backgroundColor: "#1A0A2E",
    },
    package: "com.agencia360.corazonenroaming",
  },
  web: {
    favicon: "./assets/favicon.png",
  },
  extra: {
    supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
    supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
    cdnBase: process.env.EXPO_PUBLIC_CDN_BASE ?? "",
    mockSubscriptions:
      process.env.EXPO_PUBLIC_MOCK_SUBSCRIPTIONS === "true",
    mockIAP: process.env.EXPO_PUBLIC_MOCK_IAP === "true",
    revenueCatKeyIOS: process.env.EXPO_PUBLIC_REVENUECAT_KEY_IOS ?? "",
    revenueCatKeyAndroid:
      process.env.EXPO_PUBLIC_REVENUECAT_KEY_ANDROID ?? "",
  },
});
