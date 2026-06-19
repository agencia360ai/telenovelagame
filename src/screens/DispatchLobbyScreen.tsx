import React, { useEffect, useState } from "react";
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
  FadeIn,
} from "react-native-reanimated";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { OfficerScene3D } from "../components/OfficerScene3D";
import { RankBadge } from "../components/RankBadge";
import { XPBar } from "../components/XPBar";
import { useDispatchProgress } from "../context/DispatchProgressContext";
import { usePaywall } from "../context/PaywallContext";
import { getNextMissionId } from "../content/missions";
import { getXPProgress, RANKS, SHIFT_SIZE } from "../game/ranks";
import { audio } from "../lib/audio";
import { colors } from "../theme/colors";
import { sizes } from "../theme/sizes";

type Props = NativeStackScreenProps<RootStackParamList, "DispatchLobby">;

const COUNTDOWN_START = 10;

export function DispatchLobbyScreen({ navigation }: Props) {
  const progress = useDispatchProgress();
  const { canPlay, isTrialActive, trialDaysLeft, isSubscribed } = usePaywall();
  const [phase, setPhase] = useState<"idle" | "ringing" | "connecting">("idle");
  const [countdown, setCountdown] = useState(COUNTDOWN_START);

  const pulse = useSharedValue(1);
  const glow = useSharedValue(0.4);

  const xpInfo = getXPProgress(progress.xp, progress.rankIndex);
  const nearRankUp = xpInfo.percent >= 0.7 && xpInfo.needed > 0;
  const nextRank = RANKS[progress.rankIndex + 1];
  const accuracy =
    progress.callsHandled > 0
      ? Math.round((progress.correctCount / progress.callsHandled) * 100)
      : 0;

  const goalGlow = useSharedValue(0.5);

  useEffect(() => {
    if (!nearRankUp) return;
    goalGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
    return () => cancelAnimation(goalGlow);
  }, [nearRankUp]);

  const goalGlowStyle = useAnimatedStyle(() => ({
    opacity: goalGlow.value,
  }));

  useEffect(() => {
    audio.playMusic("lobby");
    progress.clearLastResult();
  }, []);

  useEffect(() => {
    if (phase !== "idle") return;
    if (countdown <= 0) {
      setPhase("ringing");
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, phase]);

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
    if (!canPlay) {
      navigation.navigate("Paywall" as any);
      return;
    }
    audio.playSfx("dispatch");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPhase("connecting");
    setTimeout(() => {
      navigation.replace("Mission", {
        missionId: getNextMissionId(progress.callsHandled, progress.rankIndex),
      });
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
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <RankBadge rankIndex={progress.rankIndex} />
        </View>
        <Text style={styles.title}>DISPATCH CENTER</Text>
        <Pressable
          style={styles.scoreChip}
          onPress={() => navigation.navigate("Stats" as any)}
        >
          <Text style={styles.scoreIcon}>★</Text>
          <Text style={styles.scoreValue}>{progress.xp}</Text>
        </Pressable>
      </View>

      {/* XP Progress + Trial indicator */}
      <View style={styles.xpRow}>
        <XPBar
          current={xpInfo.current}
          needed={xpInfo.needed}
          percent={xpInfo.percent}
          showLabel={false}
        />
        {nearRankUp && nextRank && (
          <Animated.View style={[styles.goalGradient, goalGlowStyle]}>
            <Text style={styles.goalText}>
              Almost {nextRank.icon} {nextRank.name}!
            </Text>
          </Animated.View>
        )}
        {isTrialActive && !isSubscribed && (
          <Pressable
            onPress={() => navigation.navigate("Paywall" as any)}
            style={styles.trialPill}
          >
            <Text style={styles.trialText}>
              FREE TRIAL · {trialDaysLeft}d left
            </Text>
          </Pressable>
        )}
      </View>

      {/* 3D officer viewport */}
      <View style={styles.viewport}>
        <OfficerScene3D />
        <View style={styles.viewportLabel}>
          <Text style={styles.viewportLabelText}>UNIT 911 · LIVE</Text>
        </View>
        {progress.currentStreak >= 3 && (
          <View style={styles.streakTag}>
            <Text style={styles.streakTagText}>
              🔥 {progress.currentStreak}
            </Text>
          </View>
        )}
      </View>

      {/* Bottom console */}
      <View style={styles.console}>
        {phase === "idle" && (
          <View style={styles.standby}>
            <Text style={styles.standbyLabel}>NEXT CALL IN</Text>
            <Text style={styles.countdown}>
              0:{countdown.toString().padStart(2, "0")}
            </Text>

            {progress.callsHandled > 0 ? (
              <>
                <Animated.Text
                  entering={FadeIn.duration(600)}
                  style={styles.primingText}
                >
                  {progress.correctCount} emergencies resolved · lives impacted
                </Animated.Text>
                <View style={styles.statsRow}>
                  <StatChip label="Calls" value={progress.callsHandled} />
                  <StatChip label="Accuracy" value={`${accuracy}%`} />
                  <StatChip label="Streak" value={progress.currentStreak} />
                  <StatChip label="Best" value={progress.bestStreak} />
                </View>
              </>
            ) : (
              <Text style={styles.standbyHint}>Stand by, operator…</Text>
            )}

            {/* Shift progress */}
            <View style={styles.shiftRow}>
              <Text style={styles.shiftLabel}>
                SHIFT {progress.shiftsCompleted + 1}
              </Text>
              <View style={styles.shiftDots}>
                {Array.from({ length: SHIFT_SIZE }).map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.shiftDot,
                      i < progress.shiftProgress && styles.shiftDotFilled,
                    ]}
                  />
                ))}
              </View>
            </View>

            {/* Zeigarnik open-loop: nudge when 1 call left in shift */}
            {progress.shiftProgress === SHIFT_SIZE - 1 && (
              <Animated.Text
                entering={FadeIn.duration(400)}
                style={styles.shiftNudge}
              >
                1 call left to complete your shift!
              </Animated.Text>
            )}

            {/* Daily login streak (loss aversion #3) */}
            {progress.dailyStreak >= 2 && (
              <View style={styles.dailyStreakRow}>
                <Text style={styles.dailyStreakIcon}>📅</Text>
                <Text style={styles.dailyStreakText}>
                  {progress.dailyStreak} day streak — don't break it!
                </Text>
              </View>
            )}
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

function StatChip({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
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
    paddingHorizontal: sizes.spacing.md,
    paddingTop: sizes.spacing.sm,
    paddingBottom: 4,
  },
  headerLeft: {
    width: 100,
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
    width: 100,
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
  xpRow: {
    paddingHorizontal: sizes.spacing.md,
    marginBottom: sizes.spacing.sm,
    gap: 4,
  },
  goalGradient: {
    alignSelf: "center",
    marginTop: 2,
  },
  goalText: {
    color: colors.dispatch.cyan,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  trialPill: {
    alignSelf: "center",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.25)",
  },
  trialText: {
    color: colors.dispatch.amber,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
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
  streakTag: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderRadius: sizes.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  streakTagText: {
    color: "#FF6B6B",
    fontSize: 13,
    fontWeight: "900",
  },
  console: {
    minHeight: 220,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: sizes.spacing.lg,
    paddingBottom: sizes.spacing.sm,
  },
  standby: {
    alignItems: "center",
    gap: 6,
    width: "100%",
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
  primingText: {
    color: colors.dispatch.answer,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  shiftNudge: {
    color: colors.dispatch.amber,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
    textAlign: "center",
  },
  dailyStreakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
    marginTop: 2,
  },
  dailyStreakIcon: {
    fontSize: 14,
  },
  dailyStreakText: {
    color: colors.dispatch.amber,
    fontSize: 11,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  statChip: {
    alignItems: "center",
    backgroundColor: colors.dispatch.panel,
    borderRadius: sizes.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.dispatch.border,
    minWidth: 60,
  },
  statValue: {
    color: colors.dispatch.text,
    fontSize: 15,
    fontWeight: "900",
  },
  statLabel: {
    color: colors.dispatch.textMuted,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  shiftRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  shiftLabel: {
    color: colors.dispatch.textMuted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  shiftDots: {
    flexDirection: "row",
    gap: 4,
  },
  shiftDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(34, 211, 238, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(34, 211, 238, 0.3)",
  },
  shiftDotFilled: {
    backgroundColor: colors.dispatch.cyan,
    borderColor: colors.dispatch.cyan,
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
