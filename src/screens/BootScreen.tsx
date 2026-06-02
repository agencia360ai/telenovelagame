import React, { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useUserIdentity } from "../context/UserIdentityContext";
import { colors } from "../theme/colors";
import { sizes } from "../theme/sizes";
import { analytics } from "../lib/analytics";

type Props = NativeStackScreenProps<RootStackParamList, "Boot">;

export function BootScreen({ navigation }: Props) {
  const { userId, loading } = useUserIdentity();

  const titleOpacity = useSharedValue(0);
  const titleScale = useSharedValue(0.9);
  const subtitleOpacity = useSharedValue(0);
  const loaderOpacity = useSharedValue(0);

  useEffect(() => {
    titleOpacity.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    titleScale.value = withTiming(1, { duration: 800, easing: Easing.out(Easing.cubic) });
    subtitleOpacity.value = withDelay(400, withTiming(1, { duration: 600 }));
    loaderOpacity.value = withDelay(800, withTiming(1, { duration: 400 }));
  }, []);

  useEffect(() => {
    if (!loading && userId) {
      analytics.init();
      analytics.track("app_open");
      const timer = setTimeout(() => {
        navigation.replace("Home");
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [loading, userId, navigation]);

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ scale: titleScale.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const loaderStyle = useAnimatedStyle(() => ({
    opacity: loaderOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.Text style={[styles.heart, titleStyle]}>
          {"❤️"}
        </Animated.Text>
        <Animated.Text style={[styles.title, titleStyle]}>
          {"Corazón\nen Roaming"}
        </Animated.Text>
        <Animated.Text style={[styles.subtitle, subtitleStyle]}>
          Una historia de amor y secretos
        </Animated.Text>
      </View>
      <Animated.View style={[styles.loaderWrap, loaderStyle]}>
        <ActivityIndicator size="small" color={colors.accent.secondary} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    gap: sizes.spacing.md,
  },
  heart: {
    fontSize: 48,
    marginBottom: sizes.spacing.sm,
  },
  title: {
    fontSize: sizes.font.title,
    fontWeight: "800",
    color: colors.accent.primary,
    letterSpacing: 1,
    textAlign: "center",
    lineHeight: 42,
  },
  subtitle: {
    fontSize: sizes.font.md,
    color: colors.text.secondary,
    marginTop: sizes.spacing.xs,
  },
  loaderWrap: {
    position: "absolute",
    bottom: 80,
  },
});
