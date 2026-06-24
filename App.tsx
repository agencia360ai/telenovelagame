import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { UserIdentityProvider } from "./src/context/UserIdentityContext";
import { SettingsProvider, useSettings } from "./src/context/SettingsContext";
import { I18nProvider } from "./src/context/I18nContext";
import { EconomyProvider } from "./src/context/EconomyContext";
import { StoryProgressProvider } from "./src/context/StoryProgressContext";
import { NarrativeStateProvider } from "./src/context/NarrativeStateContext";
import { SubscriptionProvider } from "./src/context/SubscriptionContext";
import { DispatchProgressProvider } from "./src/context/DispatchProgressContext";
import { WardrobeProvider } from "./src/context/WardrobeContext";
import { PaywallProvider } from "./src/context/PaywallContext";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { audio } from "./src/lib/audio";
import storyData from "./src/content/stories/corazon-en-roaming.json";

const initialVariables = (storyData as any).initial_variables ?? {};
const initialFlags = (storyData as any).initial_flags ?? {};
const startingGems = (storyData as any).starting_gems ?? 10;

/** Initializes the audio engine once and keeps it in sync with the sound setting. */
function AudioBridge() {
  const { soundEnabled } = useSettings();
  useEffect(() => {
    audio.init();
  }, []);
  useEffect(() => {
    audio.setMuted(!soundEnabled);
  }, [soundEnabled]);
  return null;
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
      <UserIdentityProvider>
        <SettingsProvider>
          <I18nProvider>
            <EconomyProvider initialGems={startingGems}>
              <StoryProgressProvider>
                <NarrativeStateProvider
                  initialVariables={initialVariables}
                  initialFlags={initialFlags}
                >
                  <SubscriptionProvider>
                    <DispatchProgressProvider>
                      <WardrobeProvider>
                        <PaywallProvider>
                          <StatusBar style="light" />
                          <AudioBridge />
                          <AppNavigator />
                        </PaywallProvider>
                      </WardrobeProvider>
                    </DispatchProgressProvider>
                  </SubscriptionProvider>
                </NarrativeStateProvider>
              </StoryProgressProvider>
            </EconomyProvider>
          </I18nProvider>
        </SettingsProvider>
      </UserIdentityProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
