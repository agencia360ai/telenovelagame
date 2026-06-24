import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, SafeAreaView } from "react-native";
import * as Haptics from "expo-haptics";
import Animated, { FadeIn, FadeInDown, ZoomIn } from "react-native-reanimated";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useCalendar } from "../context/CalendarContext";
import { useDispatchProgress } from "../context/DispatchProgressContext";
import { useEconomy } from "../context/EconomyContext";
import {
  WEEK_COMPLETE_BONUS,
  PERFECT_WEEK_BONUS,
  WEEK_COMPLETE_GEMS,
  PERFECT_WEEK_GEMS,
} from "../game/ranks";
import { audio } from "../lib/audio";
import { colors } from "../theme/colors";
import { sizes } from "../theme/sizes";

type Props = NativeStackScreenProps<RootStackParamList, "WeekComplete">;

export function WeekCompleteScreen({ navigation }: Props) {
  const calendar = useCalendar();
  const progress = useDispatchProgress();
  const economy = useEconomy();

  const summary = calendar.weekSummary;
  const perfect = summary.total > 0 && summary.correct === summary.total;
  const bonusXP = WEEK_COMPLETE_BONUS + (perfect ? PERFECT_WEEK_BONUS : 0);
  const bonusGems = WEEK_COMPLETE_GEMS + (perfect ? PERFECT_WEEK_GEMS : 0);

  // Award the reward exactly once, even if the screen re-renders.
  const claimed = useRef(false);
  useEffect(() => {
    if (claimed.current) return;
    claimed.current = true;
    progress.recordWeekComplete(perfect, bonusXP);
    economy.earn(bonusGems);
    audio.playSfx("success");
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
  }, []);

  const handleContinue = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    audio.playSfx("tap");
    calendar.startNextWeek();
    navigation.replace("DispatchLobby");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.Text entering={FadeIn.duration(500)} style={styles.tag}>
          SHIFT REPORT
        </Animated.Text>
        <Animated.Text entering={ZoomIn.duration(500)} style={styles.title}>
          WEEK {summary.week} COMPLETE
        </Animated.Text>
        {perfect && (
          <Animated.Text
            entering={FadeIn.delay(300)}
            style={styles.perfectBadge}
          >
            ★ PERFECT WEEK ★
          </Animated.Text>
        )}

        <Animated.View entering={FadeInDown.delay(300)} style={styles.statsCard}>
          <StatRow label="Calls resolved" value={`${summary.total}`} />
          <StatRow label="Correct" value={`${summary.correct}`} />
          <StatRow label="Accuracy" value={`${summary.accuracy}%`} />
          <StatRow label="Best streak" value={`${progress.bestStreak}`} />
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(500)} style={styles.rewardCard}>
          <Text style={styles.rewardTitle}>WEEK BONUS</Text>
          <View style={styles.rewardRow}>
            <Text style={styles.rewardValue}>+{bonusXP} XP</Text>
            <Text style={styles.rewardValue}>💎 {bonusGems}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(700)}>
          <Pressable style={styles.button} onPress={handleContinue}>
            <Text style={styles.buttonText}>START WEEK {summary.week + 1} ▸</Text>
          </Pressable>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dispatch.bg,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: sizes.spacing.xl,
    gap: sizes.spacing.md,
  },
  tag: {
    color: colors.dispatch.textMuted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 3,
  },
  title: {
    color: colors.dispatch.cyan,
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 1,
    textAlign: "center",
  },
  perfectBadge: {
    color: "#E879F9",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 2,
  },
  statsCard: {
    width: "100%",
    backgroundColor: colors.dispatch.panel,
    borderRadius: sizes.radius.lg,
    borderWidth: 1,
    borderColor: colors.dispatch.border,
    padding: sizes.spacing.lg,
    gap: 10,
    marginTop: sizes.spacing.sm,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statLabel: {
    color: colors.dispatch.textMuted,
    fontSize: 14,
    fontWeight: "600",
  },
  statValue: {
    color: colors.dispatch.text,
    fontSize: 16,
    fontWeight: "900",
  },
  rewardCard: {
    width: "100%",
    backgroundColor: "rgba(34, 197, 94, 0.10)",
    borderRadius: sizes.radius.lg,
    borderWidth: 1,
    borderColor: colors.dispatch.answer,
    padding: sizes.spacing.lg,
    alignItems: "center",
    gap: 8,
  },
  rewardTitle: {
    color: colors.dispatch.answer,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
  },
  rewardRow: {
    flexDirection: "row",
    gap: sizes.spacing.xl,
  },
  rewardValue: {
    color: colors.dispatch.text,
    fontSize: 22,
    fontWeight: "900",
  },
  button: {
    backgroundColor: colors.dispatch.cyan,
    borderRadius: sizes.radius.md,
    paddingHorizontal: 36,
    paddingVertical: 16,
    marginTop: sizes.spacing.md,
  },
  buttonText: {
    color: "#0A0E1A",
    fontSize: sizes.font.md,
    fontWeight: "900",
    letterSpacing: 2,
  },
});
