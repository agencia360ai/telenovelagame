import React from "react";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { UserIdentityProvider } from "./src/context/UserIdentityContext";
import { SettingsProvider } from "./src/context/SettingsContext";
import { I18nProvider } from "./src/context/I18nContext";
import { EconomyProvider } from "./src/context/EconomyContext";
import { StoryProgressProvider } from "./src/context/StoryProgressContext";
import { NarrativeStateProvider } from "./src/context/NarrativeStateContext";
import { SubscriptionProvider } from "./src/context/SubscriptionContext";
import { AppNavigator } from "./src/navigation/AppNavigator";
import storyData from "./src/content/stories/corazon-en-roaming.json";

const initialVariables = (storyData as any).initial_variables ?? {};
const initialFlags = (storyData as any).initial_flags ?? {};
const startingGems = (storyData as any).starting_gems ?? 10;

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
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
                    <StatusBar style="light" />
                    <AppNavigator />
                  </SubscriptionProvider>
                </NarrativeStateProvider>
              </StoryProgressProvider>
            </EconomyProvider>
          </I18nProvider>
        </SettingsProvider>
      </UserIdentityProvider>
    </GestureHandlerRootView>
  );
}
