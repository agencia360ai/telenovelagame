import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { BootScreen } from "../screens/BootScreen";
import { DispatchLobbyScreen } from "../screens/DispatchLobbyScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { ReaderScreen } from "../screens/ReaderScreen";
import { ShopScreen } from "../screens/ShopScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { ChapterEndScreen } from "../screens/ChapterEndScreen";
import { colors } from "../theme/colors";

export type RootStackParamList = {
  Boot: undefined;
  DispatchLobby: undefined;
  Home: undefined;
  Reader: {
    storyId: string;
    chapterId: string;
    beatId: string;
  };
  Shop: undefined;
  Settings: undefined;
  ChapterEnd: {
    type: "chapter_transition" | "continuara";
    nextChapterId?: string;
  };
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
        <Stack.Screen name="DispatchLobby" component={DispatchLobbyScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen
          name="Reader"
          component={ReaderScreen}
          options={{ gestureEnabled: false }}
        />
        <Stack.Group screenOptions={{ presentation: "modal" }}>
          <Stack.Screen name="Shop" component={ShopScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
        </Stack.Group>
        <Stack.Screen
          name="ChapterEnd"
          component={ChapterEndScreen}
          options={{ gestureEnabled: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
