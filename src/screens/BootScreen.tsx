import React, { useEffect, useState } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  Easing,
} from "react-native-reanimated";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useUserIdentity } from "../context/UserIdentityContext";
import { useWardrobe } from "../context/WardrobeContext";
import { CinematicImage } from "../components/CinematicImage";
import { IMAGES } from "../game/assets";
import { colors } from "../theme/colors";
import { sizes } from "../theme/sizes";
import { analytics } from "../lib/analytics";

type Props = NativeStackScreenProps<RootStackParamList, "Boot">;

// Optional cinematic establishing shot shown once after the splash.
const INTRO_IMAGE_KEY = "dispatch-center";

export function BootScreen({ navigation }: Props) {
  const { userId, loading } = useUserIdentity();
  const { ready: wardrobeReady, isChosen } = useWardrobe();
  const [showIntro, setShowIntro] = useState(false);

  const badgeOpacity = useSharedValue(0);
  const badgeScale = useSharedValue(0.8);
  const ringPulse = useSharedValue(0.6);
  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);
  const loaderOpacity = useSharedValue(0);

  useEffect(() => {
    badgeOpacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    badgeScale.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.back(1.4)) });
    ringPulse.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }),
        withTiming(0.6, { duration: 900, easing: Easing.in(Easing.quad) })
      ),
      -1,
      false
    );
    titleOpacity.value = withDelay(300, withTiming(1, { duration: 600 }));
    subtitleOpacity.value = withDelay(600, withTiming(1, { duration: 600 }));
    loaderOpacity.value = withDelay(900, withTiming(1, { duration: 400 }));
  }, []);

  useEffect(() => {
    if (loading || !userId || !wardrobeReady) return;
    analytics.init();
    analytics.track("app_open");
    const timer = setTimeout(() => {
      // First launch: pick a gender before anything else.
      if (!isChosen) {
        navigation.replace("GenderSelect");
        return;
      }
      if (IMAGES[INTRO_IMAGE_KEY]) {
        setShowIntro(true);
      } else {
        navigation.replace("DispatchLobby");
      }
    }, 1600);
    return () => clearTimeout(timer);
  }, [loading, userId, wardrobeReady, isChosen, navigation]);

  const badgeStyle = useAnimatedStyle(() => ({
    opacity: badgeOpacity.value,
    transform: [{ scale: badgeScale.value }],
  }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringPulse.value * 0.5,
    transform: [{ scale: 0.9 + ringPulse.value * 0.5 }],
  }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value }));
  const subtitleStyle = useAnimatedStyle(() => ({ opacity: subtitleOpacity.value }));
  const loaderStyle = useAnimatedStyle(() => ({ opacity: loaderOpacity.value }));

  if (showIntro) {
    return (
      <CinematicImage
        source={IMAGES[INTRO_IMAGE_KEY]}
        tag="DISPATCH CENTER · LIVE"
        title="NIGHT SHIFT"
        caption="The city is calling. Every second counts, operator."
        onComplete={() => navigation.replace("DispatchLobby")}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.badgeWrap}>
          <Animated.View style={[styles.ring, ringStyle]} />
          <Animated.View style={[styles.badge, badgeStyle]}>
            <Animated.Text style={styles.badgeText}>911</Animated.Text>
          </Animated.View>
        </View>
        <Animated.Text style={[styles.title, titleStyle]}>DISPATCH</Animated.Text>
        <Animated.Text style={[styles.subtitle, subtitleStyle]}>
          Emergency Response Simulator
        </Animated.Text>
      </View>
      <Animated.View style={[styles.loaderWrap, loaderStyle]}>
        <ActivityIndicator size="small" color={colors.dispatch.cyan} />
        <Animated.Text style={styles.loaderText}>
          INITIALIZING DISPATCH CENTER…
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dispatch.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    gap: sizes.spacing.md,
  },
  badgeWrap: {
    width: 140,
    height: 140,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: sizes.spacing.sm,
  },
  ring: {
    position: "absolute",
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    borderColor: colors.dispatch.cyan,
  },
  badge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.dispatch.panel,
    borderWidth: 3,
    borderColor: colors.dispatch.cyan,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: {
    color: colors.dispatch.cyan,
    fontSize: 38,
    fontWeight: "900",
    letterSpacing: 2,
  },
  title: {
    fontSize: sizes.font.title,
    fontWeight: "900",
    color: colors.dispatch.text,
    letterSpacing: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: sizes.font.sm,
    color: colors.dispatch.textMuted,
    letterSpacing: 1,
    fontWeight: "600",
  },
  loaderWrap: {
    position: "absolute",
    bottom: 70,
    alignItems: "center",
    gap: sizes.spacing.sm,
  },
  loaderText: {
    color: colors.dispatch.textMuted,
    fontSize: sizes.font.xs,
    letterSpacing: 1.5,
    fontWeight: "700",
  },
});
