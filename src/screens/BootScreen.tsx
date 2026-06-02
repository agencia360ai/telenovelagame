import React, { useEffect } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useUserIdentity } from "../context/UserIdentityContext";
import { colors } from "../theme/colors";
import { sizes } from "../theme/sizes";
import { analytics } from "../lib/analytics";

type Props = NativeStackScreenProps<RootStackParamList, "Boot">;

export function BootScreen({ navigation }: Props) {
  const { userId, loading } = useUserIdentity();

  useEffect(() => {
    if (!loading && userId) {
      analytics.init();
      analytics.track("app_open");
      navigation.replace("Home");
    }
  }, [loading, userId, navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{"Corazón en Roaming"}</Text>
      <ActivityIndicator size="large" color={colors.accent.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    alignItems: "center",
    justifyContent: "center",
    gap: sizes.spacing.xl,
  },
  title: {
    fontSize: sizes.font.title,
    fontWeight: "800",
    color: colors.accent.primary,
    letterSpacing: 1,
  },
});
