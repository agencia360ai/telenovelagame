import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BootScreen } from "../screens/BootScreen";
import { IntroCinematicScreen } from "../screens/IntroCinematicScreen";
import { DispatchLobbyScreen } from "../screens/DispatchLobbyScreen";
import { CallScreen } from "../screens/CallScreen";
import { MissionScreen } from "../screens/MissionScreen";
import { StatsScreen } from "../screens/StatsScreen";
import { PaywallScreen } from "../screens/PaywallScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { ReaderScreen } from "../screens/ReaderScreen";
import { ShopScreen } from "../screens/ShopScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { WardrobeScreen } from "../screens/WardrobeScreen";
import { ChapterEndScreen } from "../screens/ChapterEndScreen";
import { WeekCompleteScreen } from "../screens/WeekCompleteScreen";
import { RadarSandboxScreen } from "../screens/RadarSandboxScreen";
import { colors } from "../theme/colors";

export type RootStackParamList = {
  Boot: undefined;
  // Gender selection is no longer in the boot flow (gender defaults and can be
  // changed in the Wardrobe). The route type is kept so the screen still
  // type-checks and can be re-added later if desired.
  GenderSelect: undefined;
  // Full-screen "NIGHT SHIFT" shot shown after the prologue, before the menu.
  IntroCinematic: undefined;
  DispatchLobby: undefined;
  Call: { callId: string };
  Mission: { missionId: string; intro?: boolean };
  WeekComplete: undefined;
  Stats: undefined;
  Paywall: undefined;
  Home: undefined;
  Reader: {
    storyId: string;
    chapterId: string;
    beatId: string;
  };
  Shop: undefined;
  Settings: undefined;
  Wardrobe: undefined;
  ChapterEnd: {
    type: "chapter_transition" | "continuara";
    nextChapterId?: string;
  };
  RadarSandbox: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Boot"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg.primary },
          animation: "fade",
        }}
      >
        <Stack.Screen name="Boot" component={BootScreen} />
        <Stack.Screen name="IntroCinematic" component={IntroCinematicScreen} />
        <Stack.Screen name="DispatchLobby" component={DispatchLobbyScreen} />
        <Stack.Screen
          name="Call"
          component={CallScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="Mission"
          component={MissionScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen
          name="WeekComplete"
          component={WeekCompleteScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen name="Stats" component={StatsScreen} />
        <Stack.Screen
          name="Paywall"
          component={PaywallScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen
          name="Reader"
          component={ReaderScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Group screenOptions={{ presentation: "modal" }}>
          <Stack.Screen name="Shop" component={ShopScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Wardrobe" component={WardrobeScreen} />
        </Stack.Group>
        <Stack.Screen
          name="ChapterEnd"
          component={ChapterEndScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Screen name="RadarSandbox" component={RadarSandboxScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
