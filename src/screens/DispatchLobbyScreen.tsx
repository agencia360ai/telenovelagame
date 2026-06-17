import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
} from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  cancelAnimation,
} from "react-native-reanimated";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { OfficerScene3D } from "../components/OfficerScene3D";
import { useDispatchProgress } from "../context/DispatchProgressContext";
import { getRandomCallId } from "../content/calls";
import { audio } from "../lib/audio";
import { colors } from "../theme/colors";
import { sizes } from "../theme/sizes";

type Props = NativeStackScreenProps<RootStackParamList, "DispatchLobby">;

const COUNTDOWN_START = 10;

export function DispatchLobbyScreen({ navigation }: Props) {
  const progress = useDispatchProgress();
  const [phase, setPhase] = useState<"idle" | "ringing" | "connecting">("idle");
  const [countdown, setCountdown] = useState(COUNTDOWN_START);

  const pulse = useSharedValue(1);
  const glow = useSharedValue(0.4);

  // Lobby ambience — resumes whenever we return here from a call.
  useEffect(() => {
    audio.playMusic("lobby");
  }, []);

  // Countdown to the next incoming call
  useEffect(() => {
    if (phase !== "idle") return;
    if (countdown <= 0) {
      setPhase("ringing");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, phase]);

  // Ringing: pulse the button + haptic buzz + ring tone
  useEffect(() => {
    if (phase === "ringing") {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 450, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 450, easing: Easing.in(Easing.quad) })
        ),
        -1,
        false
      );
      glow.value = withRepeat(
        withSequence(
          withTiming(0.9, { duration: 450 }),
          withTiming(0.4, { duration: 450 })
        ),
        -1,
        false
      );
      audio.playSfx("ring");
      const buzz = setInterval(() => {
        audio.playSfx("ring");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }, 2000);
      return () => {
        clearInterval(buzz);
        cancelAnimation(pulse);
        cancelAnimation(glow);
        pulse.value = 1;
        glow.value = 0.4;
      };
    }
  }, [phase]);

  const answerCall = () => {
    audio.playSfx("dispatch");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPhase("connecting");
    setTimeout(() => {
      navigation.replace("Call", { callId: getRandomCallId() });
    }, 800);
  };

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  return (
    <SafeAreaView style={styles.container}>
      {/* Header / console bar */}
      <View style={styles.header}>
        <View style={styles.statusRow}>
          <View style={styles.onlineDot} />
          <Text style={styles.statusText}>ON DUTY</Text>
        </View>
        <Text style={styles.title}>DISPATCH CENTER</Text>
        <View style={styles.scoreChip}>
          <Text style={styles.scoreIcon}>★</Text>
          <Text style={styles.scoreValue}>{progress.score}</Text>
        </View>
      </View>

      {/* 3D officer viewport */}
      <View style={styles.viewport}>
        <OfficerScene3D />
        <View style={styles.viewportLabel}>
          <Text style={styles.viewportLabelText}>UNIT 911 · LIVE</Text>
        </View>
      </View>

      {/* Bottom console */}
      <View style={styles.console}>
        {phase === "idle" && (
          <View style={styles.standby}>
            <Text style={styles.standbyLabel}>NEXT CALL IN</Text>
            <Text style={styles.countdown}>
              0:{countdown.toString().padStart(2, "0")}
            </Text>
            <Text style={styles.standbyHint}>
              {progress.callsHandled > 0
                ? `${progress.callsHandled} handled · streak ${progress.currentStreak} · best ${progress.bestStreak}`
                : "Stand by, operator…"}
            </Text>
          </View>
        )}

        {phase === "ringing" && (
          <View style={styles.ringing}>
            <Text style={styles.incomingLabel}>● INCOMING CALL</Text>
            <View style={styles.answerWrap}>
              <Animated.View style={[styles.answerGlow, glowStyle]} />
              <Animated.View style={buttonStyle}>
                <Pressable
                  style={styles.answerButton}
                  onPress={answerCall}
                  accessibilityLabel="Answer call"
                >
                  <Text style={styles.answerIcon}>✆</Text>
                  <Text style={styles.answerText}>ANSWER</Text>
                </Pressable>
              </Animated.View>
            </View>
          </View>
        )}

        {phase === "connecting" && (
          <View style={styles.standby}>
            <Text style={styles.connecting}>CONNECTING…</Text>
            <Text style={styles.standbyHint}>Patching you through</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dispatch.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: sizes.spacing.lg,
    paddingTop: sizes.spacing.sm,
    paddingBottom: sizes.spacing.md,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    width: 90,
  },
  onlineDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.dispatch.answer,
  },
  statusText: {
    color: colors.dispatch.answer,
    fontSize: sizes.font.xs,
    fontWeight: "800",
    letterSpacing: 1,
  },
  title: {
    color: colors.dispatch.cyan,
    fontSize: sizes.font.md,
    fontWeight: "900",
    letterSpacing: 2,
  },
  scoreChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.dispatch.panel,
    borderColor: colors.dispatch.border,
    borderWidth: 1,
    borderRadius: sizes.radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    width: 90,
    justifyContent: "flex-end",
  },
  scoreIcon: {
    color: colors.dispatch.amber,
    fontSize: sizes.font.sm,
  },
  scoreValue: {
    color: colors.dispatch.text,
    fontSize: sizes.font.sm,
    fontWeight: "800",
  },
  viewport: {
    flex: 1,
    marginHorizontal: sizes.spacing.md,
    borderRadius: sizes.radius.lg,
    borderWidth: 1,
    borderColor: colors.dispatch.border,
    backgroundColor: "#070A12",
    overflow: "hidden",
  },
  viewportLabel: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: "rgba(34, 211, 238, 0.12)",
    borderRadius: sizes.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  viewportLabelText: {
    color: colors.dispatch.cyan,
    fontSize: sizes.font.xs,
    fontWeight: "700",
    letterSpacing: 1,
  },
  console: {
    height: 220,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: sizes.spacing.lg,
  },
  standby: {
    alignItems: "center",
    gap: 6,
  },
  standbyLabel: {
    color: colors.dispatch.textMuted,
    fontSize: sizes.font.sm,
    fontWeight: "700",
    letterSpacing: 2,
  },
  countdown: {
    color: colors.dispatch.cyan,
    fontSize: 56,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
  standbyHint: {
    color: colors.dispatch.textMuted,
    fontSize: sizes.font.sm,
  },
  connecting: {
    color: colors.dispatch.amber,
    fontSize: sizes.font.xxl,
    fontWeight: "900",
    letterSpacing: 2,
  },
  ringing: {
    alignItems: "center",
    gap: sizes.spacing.lg,
  },
  incomingLabel: {
    color: colors.dispatch.decline,
    fontSize: sizes.font.lg,
    fontWeight: "900",
    letterSpacing: 2,
  },
  answerWrap: {
    justifyContent: "center",
    alignItems: "center",
  },
  answerGlow: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.dispatch.answer,
  },
  answerButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.dispatch.answer,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "#4ADE80",
  },
  answerIcon: {
    color: "#fff",
    fontSize: 34,
    lineHeight: 38,
  },
  answerText: {
    color: "#fff",
    fontSize: sizes.font.md,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
