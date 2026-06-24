import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, { FadeInDown, FadeIn, ZoomIn } from "react-native-reanimated";
import { CallResultDetails, DispatchType } from "../game/types";
import { getAchievement } from "../game/achievements";
import { getXPProgress } from "../game/ranks";
import { getDispatchLabel } from "../content/calls";
import { useDispatchProgress } from "../context/DispatchProgressContext";
import { XPBar } from "./XPBar";
import { colors } from "../theme/colors";

type Props = {
  result: CallResultDetails;
  correctDispatch: DispatchType;
  correctExplanation?: string;
  chosenDispatch?: DispatchType;
};

export function ResultBreakdown({
  result,
  correctDispatch,
  correctExplanation,
  chosenDispatch,
}: Props) {
  const progress = useDispatchProgress();
  const xpInfo = getXPProgress(progress.xp, progress.rankIndex);

  if (!result.correct) {
    const correctLabel = getDispatchLabel(correctDispatch);
    const chosenLabel = chosenDispatch
      ? getDispatchLabel(chosenDispatch)
      : "—";

    return (
      <Animated.View
        entering={FadeInDown.duration(400)}
        style={[styles.box, styles.boxFail]}
      >
        <Text style={styles.emoji}>✗</Text>
        <Text style={styles.title}>WRONG UNIT</Text>
        <View style={styles.teachSection}>
          <Text style={styles.teachSent}>
            You sent {chosenLabel}
          </Text>
          <Text style={styles.teachCorrect}>
            The right call was {correctLabel}
          </Text>
          {correctExplanation && (
            <Animated.Text
              entering={FadeIn.delay(400).duration(300)}
              style={styles.teachWhy}
            >
              {correctExplanation}
            </Animated.Text>
          )}
        </View>
        <Text style={styles.sub}>Streak reset — keep going!</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      style={[styles.box, styles.boxSuccess]}
    >
      <Text style={styles.emoji}>✓</Text>
      <Text style={styles.title}>CORRECT DISPATCH!</Text>

      <View style={styles.breakdown}>
        <Row label="Base XP" value={`+${result.baseReward}`} delay={100} />
        {result.streakBonus > 0 && (
          <Row
            label={`Streak x${result.streakMultiplier}`}
            value={`+${result.streakBonus}`}
            color={colors.dispatch.amber}
            delay={200}
          />
        )}
        {result.speedBonusXP > 0 && (
          <Row
            label={`Speed (${result.speedLabel})`}
            value={`+${result.speedBonusXP}`}
            color={colors.dispatch.cyan}
            delay={300}
          />
        )}
        <View style={styles.divider} />
        <Row
          label="Total XP"
          value={`+${result.totalXP}`}
          bold
          delay={600}
        />
      </View>

      <View style={styles.xpSection}>
        <Text style={styles.rankLabel}>
          {result.newRankIcon} {result.newRankName}
        </Text>
        <XPBar
          current={xpInfo.current}
          needed={xpInfo.needed}
          percent={xpInfo.percent}
        />
      </View>

      {result.rankedUp && (
        <Animated.View entering={ZoomIn.delay(700).duration(500)} style={styles.rankUp}>
          <Text style={styles.rankUpIcon}>{result.newRankIcon}</Text>
          <Text style={styles.rankUpText}>RANK UP!</Text>
          <Text style={styles.rankUpName}>{result.newRankName}</Text>
        </Animated.View>
      )}

      {result.newAchievements.length > 0 &&
        result.newAchievements.map((id, i) => {
          const a = getAchievement(id);
          if (!a) return null;
          return (
            <Animated.View
              key={id}
              entering={FadeIn.delay(800 + i * 200).duration(400)}
              style={styles.achievement}
            >
              <Text style={styles.achieveIcon}>{a.icon}</Text>
              <View>
                <Text style={styles.achieveTitle}>{a.name}</Text>
                <Text style={styles.achieveDesc}>{a.description}</Text>
              </View>
            </Animated.View>
          );
        })}

      {result.newStreak >= 3 && (
        <Animated.View entering={FadeIn.delay(900)} style={styles.streakPill}>
          <Text style={styles.streakText}>
            🔥 {result.newStreak} STREAK
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}

function Row({
  label,
  value,
  color,
  bold,
  delay = 0,
}: {
  label: string;
  value: string;
  color?: string;
  bold?: boolean;
  delay?: number;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(delay).duration(250)}
      style={styles.row}
    >
      <Text
        style={[
          styles.rowLabel,
          bold && styles.rowBold,
          color ? { color } : null,
        ]}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.rowValue,
          bold && styles.rowBold,
          color ? { color } : null,
        ]}
      >
        {value}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: {
    marginTop: 12,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 8,
  },
  boxSuccess: {
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderWidth: 2,
    borderColor: colors.dispatch.answer,
  },
  boxFail: {
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    borderWidth: 2,
    borderColor: colors.dispatch.decline,
  },
  emoji: {
    fontSize: 36,
    color: "#fff",
    fontWeight: "900",
  },
  title: {
    fontSize: 20,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 1,
  },
  sub: {
    fontSize: 14,
    color: colors.dispatch.textMuted,
    fontWeight: "600",
  },
  teachSection: {
    width: "100%",
    backgroundColor: "rgba(0,0,0,0.25)",
    borderRadius: 10,
    padding: 14,
    gap: 6,
    alignItems: "center",
  },
  teachSent: {
    color: colors.dispatch.decline,
    fontSize: 13,
    fontWeight: "700",
  },
  teachCorrect: {
    color: colors.dispatch.answer,
    fontSize: 14,
    fontWeight: "900",
  },
  teachWhy: {
    color: colors.dispatch.text,
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 18,
    textAlign: "center",
    marginTop: 2,
    opacity: 0.85,
  },
  breakdown: {
    width: "100%",
    marginTop: 8,
    gap: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  rowLabel: {
    color: colors.dispatch.text,
    fontSize: 13,
    fontWeight: "600",
  },
  rowValue: {
    color: colors.dispatch.text,
    fontSize: 13,
    fontWeight: "700",
  },
  rowBold: {
    fontWeight: "900",
    fontSize: 15,
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginVertical: 4,
  },
  xpSection: {
    width: "100%",
    marginTop: 4,
    gap: 4,
  },
  rankLabel: {
    color: colors.dispatch.cyan,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  rankUp: {
    marginTop: 4,
    backgroundColor: "rgba(34, 211, 238, 0.15)",
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.dispatch.cyan,
    gap: 2,
  },
  rankUpIcon: {
    fontSize: 32,
  },
  rankUpText: {
    color: colors.dispatch.cyan,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 3,
  },
  rankUpName: {
    color: colors.dispatch.text,
    fontSize: 14,
    fontWeight: "700",
  },
  achievement: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    width: "100%",
  },
  achieveIcon: {
    fontSize: 24,
  },
  achieveTitle: {
    color: colors.dispatch.amber,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  achieveDesc: {
    color: colors.dispatch.text,
    fontSize: 11,
    fontWeight: "500",
  },
  streakPill: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  streakText: {
    color: "#FF6B6B",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
