import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useDispatchProgress } from "../context/DispatchProgressContext";
import { RANKS, getXPProgress } from "../game/ranks";
import { ACHIEVEMENTS } from "../game/achievements";
import { RankBadge } from "../components/RankBadge";
import { XPBar } from "../components/XPBar";
import { colors } from "../theme/colors";
import { sizes } from "../theme/sizes";

type Props = NativeStackScreenProps<RootStackParamList, "Stats">;

export function StatsScreen({ navigation }: Props) {
  const p = useDispatchProgress();
  const xpInfo = getXPProgress(p.xp, p.rankIndex);
  const accuracy =
    p.callsHandled > 0
      ? Math.round((p.correctCount / p.callsHandled) * 100)
      : 0;
  const nextRank =
    p.rankIndex < RANKS.length - 1 ? RANKS[p.rankIndex + 1] : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← BACK</Text>
        </Pressable>
        <Text style={styles.title}>CAREER STATS</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Rank section */}
        <View style={styles.card}>
          <RankBadge rankIndex={p.rankIndex} size="large" />
          <View style={styles.xpWrap}>
            <XPBar
              current={xpInfo.current}
              needed={xpInfo.needed}
              percent={xpInfo.percent}
            />
            {nextRank && (
              <Text style={styles.nextRank}>
                Next: {nextRank.icon} {nextRank.name} ({nextRank.minXP} XP)
              </Text>
            )}
          </View>
          <Text style={styles.totalXP}>{p.xp} XP</Text>
        </View>

        {/* Stats grid */}
        <View style={styles.grid}>
          <GridItem label="Calls" value={p.callsHandled} />
          <GridItem label="Correct" value={p.correctCount} />
          <GridItem label="Accuracy" value={`${accuracy}%`} />
          <GridItem label="Best Streak" value={p.bestStreak} />
          <GridItem label="Weeks" value={p.weeksCompleted} />
          <GridItem label="Perfect" value={p.perfectWeeks} />
        </View>

        {/* Rank ladder */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>RANK LADDER</Text>
          {RANKS.map((rank, i) => {
            const unlocked = i <= p.rankIndex;
            return (
              <View
                key={rank.name}
                style={[styles.rankRow, i === p.rankIndex && styles.rankCurrent]}
              >
                <Text style={styles.rankIcon}>
                  {unlocked ? rank.icon : "🔒"}
                </Text>
                <View style={styles.rankInfo}>
                  <Text
                    style={[
                      styles.rankName,
                      !unlocked && styles.rankLocked,
                    ]}
                  >
                    {rank.name}
                  </Text>
                  <Text style={styles.rankXP}>{rank.minXP} XP</Text>
                </View>
                {i === p.rankIndex && (
                  <Text style={styles.currentTag}>CURRENT</Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Achievements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            ACHIEVEMENTS ({p.unlockedAchievements.length}/{ACHIEVEMENTS.length})
          </Text>
          {ACHIEVEMENTS.map((a) => {
            const unlocked = p.unlockedAchievements.includes(a.id);
            return (
              <View
                key={a.id}
                style={[
                  styles.achieveRow,
                  unlocked && styles.achieveUnlocked,
                ]}
              >
                <Text style={styles.achieveIcon}>
                  {unlocked ? a.icon : "🔒"}
                </Text>
                <View style={styles.achieveInfo}>
                  <Text
                    style={[
                      styles.achieveName,
                      !unlocked && styles.achieveNameLocked,
                    ]}
                  >
                    {a.name}
                  </Text>
                  <Text style={styles.achieveDesc}>{a.description}</Text>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function GridItem({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <View style={styles.gridItem}>
      <Text style={styles.gridValue}>{value}</Text>
      <Text style={styles.gridLabel}>{label}</Text>
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
    paddingVertical: sizes.spacing.md,
  },
  backBtn: {
    width: 70,
  },
  backText: {
    color: colors.dispatch.cyan,
    fontSize: sizes.font.sm,
    fontWeight: "800",
  },
  title: {
    color: colors.dispatch.cyan,
    fontSize: sizes.font.lg,
    fontWeight: "900",
    letterSpacing: 2,
    textAlign: "center",
  },
  content: {
    padding: sizes.spacing.md,
    paddingBottom: sizes.spacing.xxl,
    gap: sizes.spacing.md,
  },
  card: {
    backgroundColor: colors.dispatch.panel,
    borderRadius: sizes.radius.lg,
    padding: sizes.spacing.lg,
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: colors.dispatch.border,
  },
  xpWrap: {
    width: "100%",
    gap: 4,
  },
  nextRank: {
    color: colors.dispatch.textMuted,
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
  totalXP: {
    color: colors.dispatch.amber,
    fontSize: 28,
    fontWeight: "900",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  gridItem: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: colors.dispatch.panel,
    borderRadius: sizes.radius.md,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.dispatch.border,
  },
  gridValue: {
    color: colors.dispatch.text,
    fontSize: 22,
    fontWeight: "900",
  },
  gridLabel: {
    color: colors.dispatch.textMuted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: 2,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: colors.dispatch.textMuted,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 4,
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.dispatch.panel,
    borderRadius: sizes.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.dispatch.border,
  },
  rankCurrent: {
    borderColor: colors.dispatch.cyan,
    backgroundColor: "rgba(34, 211, 238, 0.08)",
  },
  rankIcon: {
    fontSize: 20,
  },
  rankInfo: {
    flex: 1,
  },
  rankName: {
    color: colors.dispatch.text,
    fontSize: 14,
    fontWeight: "800",
  },
  rankLocked: {
    color: colors.dispatch.textMuted,
  },
  rankXP: {
    color: colors.dispatch.textMuted,
    fontSize: 11,
    fontWeight: "600",
  },
  currentTag: {
    color: colors.dispatch.cyan,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  achieveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.dispatch.panel,
    borderRadius: sizes.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.dispatch.border,
  },
  achieveUnlocked: {
    borderColor: "rgba(245, 158, 11, 0.3)",
    backgroundColor: "rgba(245, 158, 11, 0.06)",
  },
  achieveIcon: {
    fontSize: 22,
  },
  achieveInfo: {
    flex: 1,
  },
  achieveName: {
    color: colors.dispatch.text,
    fontSize: 13,
    fontWeight: "800",
  },
  achieveNameLocked: {
    color: colors.dispatch.textMuted,
  },
  achieveDesc: {
    color: colors.dispatch.textMuted,
    fontSize: 11,
    fontWeight: "500",
  },
});
