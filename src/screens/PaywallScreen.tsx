import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  SafeAreaView,
  ScrollView,
  Platform,
} from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  FadeInDown,
  FadeIn,
} from "react-native-reanimated";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { usePaywall } from "../context/PaywallContext";
import { useDispatchProgress } from "../context/DispatchProgressContext";
import { RANKS } from "../game/ranks";
import { colors } from "../theme/colors";
import { sizes } from "../theme/sizes";

type Props = NativeStackScreenProps<RootStackParamList, "Paywall">;

const FEATURES = [
  { icon: "📞", title: "Unlimited Calls", desc: "Answer every emergency — no limits" },
  { icon: "🏅", title: "Rank Up", desc: "Climb from Trainee to Director" },
  { icon: "🔥", title: "Streak Multipliers", desc: "3x XP on hot streaks" },
  { icon: "🎬", title: "New Scenarios", desc: "Fresh calls added every week" },
];

// Two plans. The annual total is the high ANCHOR (bias #1) that makes the
// weekly price read as accessible; the per-week math on annual makes it the
// honest better value. Both are real, transparent prices (no fake discounts).
type PlanId = "weekly" | "annual";
const PLANS: Record<
  PlanId,
  { price: string; period: string; perDay: string; note: string; badge?: string }
> = {
  weekly: {
    price: "$4.99",
    period: "per week",
    perDay: "just $0.71 / day",
    note: "3-day free trial, then $4.99/week",
  },
  annual: {
    price: "$99.99",
    period: "per year",
    perDay: "$1.92 / week — save 62%",
    note: "3-day free trial, then $99.99/year",
    badge: "BEST VALUE",
  },
};

export function PaywallScreen({ navigation }: Props) {
  const { subscribe, restore, isSubscribed, isTrialActive, trialDaysLeft } =
    usePaywall();
  const progress = useDispatchProgress();
  const rank = RANKS[progress.rankIndex] ?? RANKS[0];
  const [plan, setPlan] = useState<PlanId>("weekly");

  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: 0.6 + shimmer.value * 0.4,
  }));

  useEffect(() => {
    if (isSubscribed) {
      navigation.replace("DispatchLobby");
    }
  }, [isSubscribed]);

  const handleSubscribe = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    // In production: launch RevenueCat purchase flow here
    // For now: stub that immediately subscribes
    subscribe();
  };

  const handleRestore = () => {
    Haptics.selectionAsync();
    restore();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Badge */}
        <Animated.View entering={FadeIn.duration(600)} style={styles.badgeWrap}>
          <View style={styles.badge}>
            <Text style={styles.badgeIcon}>🚨</Text>
          </View>
          <Text style={styles.badgeGlow}>911</Text>
        </Animated.View>

        {/* Headline — framed positively, adapts to trial state (framing #2) */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={styles.headline}>
            {isTrialActive ? "Keep Your Badge" : "Welcome Back, Operator"}
          </Text>
          <Text style={styles.subline}>
            {isTrialActive
              ? `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left in your free trial`
              : "Your trial ended — pick up right where you left off"}
          </Text>
        </Animated.View>

        {/* Endowment + competence priming (#4, #18): surface what they OWN */}
        {progress.callsHandled > 0 && (
          <Animated.View
            entering={FadeInDown.delay(350).duration(500)}
            style={styles.statsCard}
          >
            <Text style={styles.statsTitle}>YOUR DISPATCH CAREER</Text>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{rank.icon} {rank.name}</Text>
                <Text style={styles.statLabel}>Your Rank</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{progress.correctCount}</Text>
                <Text style={styles.statLabel}>Emergencies Resolved</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{progress.bestStreak}</Text>
                <Text style={styles.statLabel}>Best Streak</Text>
              </View>
            </View>
            <Text style={styles.statsWarning}>
              Keep your rank, streak, and {progress.score} XP — they're yours.
            </Text>
          </Animated.View>
        )}

        {/* Features */}
        <Animated.View
          entering={FadeInDown.delay(500).duration(500)}
          style={styles.featureList}
        >
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureRow}>
              <Text style={styles.featureIcon}>{f.icon}</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </Animated.View>

        {/* Plan picker — annual is the high anchor (#1), weekly is default.
            Per-week / per-day framing (#2) makes the value legible. */}
        <Animated.View
          entering={FadeInDown.delay(700).duration(500)}
          style={styles.planList}
        >
          {(Object.keys(PLANS) as PlanId[]).map((id) => {
            const p = PLANS[id];
            const selected = plan === id;
            return (
              <Pressable
                key={id}
                onPress={() => {
                  Haptics.selectionAsync();
                  setPlan(id);
                }}
                style={[styles.planCard, selected && styles.planCardSelected]}
              >
                {p.badge && (
                  <View style={styles.planBadge}>
                    <Text style={styles.planBadgeText}>{p.badge}</Text>
                  </View>
                )}
                <View style={styles.planLeft}>
                  <View
                    style={[styles.radio, selected && styles.radioSelected]}
                  >
                    {selected && <View style={styles.radioDot} />}
                  </View>
                  <View>
                    <Text style={styles.planPrice}>
                      {p.price}{" "}
                      <Text style={styles.planPeriod}>{p.period}</Text>
                    </Text>
                    <Text style={styles.planPerDay}>{p.perDay}</Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </Animated.View>

        {/* CTA — dead-simple copy (cognitive ease #17) */}
        <Animated.View entering={FadeInDown.delay(900).duration(500)}>
          <Pressable onPress={handleSubscribe}>
            <Animated.View style={[styles.ctaButton, shimmerStyle]}>
              <Text style={styles.ctaText}>
                {isTrialActive ? "CONTINUE FREE TRIAL" : "START FREE TRIAL"}
              </Text>
            </Animated.View>
          </Pressable>
          <Text style={styles.ctaSub}>{PLANS[plan].note} · Cancel anytime</Text>
          <Pressable onPress={handleRestore} style={styles.restoreBtn}>
            <Text style={styles.restoreText}>Restore Purchase</Text>
          </Pressable>
        </Animated.View>

        {/* Legal */}
        <Text style={styles.legal}>
          Payment will be charged to your {Platform.OS === "ios" ? "Apple ID" : "Google Play"} account.
          Subscription automatically renews unless canceled at least 24 hours
          before the end of the current period. Manage in your device settings.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dispatch.bg,
  },
  scroll: {
    padding: sizes.spacing.lg,
    paddingBottom: sizes.spacing.xxl,
    alignItems: "center",
  },

  badgeWrap: {
    alignItems: "center",
    marginTop: sizes.spacing.lg,
    marginBottom: sizes.spacing.lg,
  },
  badge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.dispatch.panel,
    borderWidth: 2,
    borderColor: colors.dispatch.amber,
    justifyContent: "center",
    alignItems: "center",
  },
  badgeIcon: {
    fontSize: 36,
  },
  badgeGlow: {
    position: "absolute",
    bottom: -4,
    color: colors.dispatch.amber,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 4,
  },

  headline: {
    color: "#fff",
    fontSize: sizes.font.xxl,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: 0.5,
  },
  subline: {
    color: colors.dispatch.textMuted,
    fontSize: sizes.font.md,
    textAlign: "center",
    marginTop: 6,
    marginBottom: sizes.spacing.lg,
  },

  statsCard: {
    width: "100%",
    backgroundColor: colors.dispatch.panel,
    borderRadius: sizes.radius.lg,
    borderWidth: 1,
    borderColor: colors.dispatch.amber,
    padding: sizes.spacing.md,
    marginBottom: sizes.spacing.lg,
  },
  statsTitle: {
    color: colors.dispatch.amber,
    fontSize: sizes.font.xs,
    fontWeight: "900",
    letterSpacing: 2,
    textAlign: "center",
    marginBottom: sizes.spacing.sm,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  stat: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    color: "#fff",
    fontSize: sizes.font.md,
    fontWeight: "800",
  },
  statLabel: {
    color: colors.dispatch.textMuted,
    fontSize: sizes.font.xs,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.dispatch.border,
  },
  statsWarning: {
    color: colors.dispatch.decline,
    fontSize: sizes.font.xs,
    fontWeight: "700",
    textAlign: "center",
    marginTop: sizes.spacing.sm,
  },

  featureList: {
    width: "100%",
    gap: 14,
    marginBottom: sizes.spacing.lg,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.dispatch.panel,
    borderRadius: sizes.radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.dispatch.border,
  },
  featureIcon: {
    fontSize: 28,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    color: "#fff",
    fontSize: sizes.font.md,
    fontWeight: "800",
  },
  featureDesc: {
    color: colors.dispatch.textMuted,
    fontSize: sizes.font.sm,
    marginTop: 2,
  },

  planList: {
    width: "100%",
    gap: 12,
    marginBottom: sizes.spacing.md,
  },
  planCard: {
    width: "100%",
    backgroundColor: colors.dispatch.panel,
    borderRadius: sizes.radius.lg,
    borderWidth: 2,
    borderColor: colors.dispatch.border,
    paddingVertical: sizes.spacing.md,
    paddingHorizontal: sizes.spacing.md,
  },
  planCardSelected: {
    borderColor: colors.dispatch.cyan,
    backgroundColor: "rgba(34, 211, 238, 0.08)",
  },
  planBadge: {
    position: "absolute",
    top: -10,
    right: 14,
    backgroundColor: colors.dispatch.amber,
    borderRadius: sizes.radius.full,
    paddingHorizontal: 12,
    paddingVertical: 3,
  },
  planBadgeText: {
    color: colors.dispatch.bg,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  planLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.dispatch.textMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  radioSelected: {
    borderColor: colors.dispatch.cyan,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.dispatch.cyan,
  },
  planPrice: {
    color: "#fff",
    fontSize: sizes.font.xl,
    fontWeight: "900",
  },
  planPeriod: {
    color: colors.dispatch.textMuted,
    fontSize: sizes.font.sm,
    fontWeight: "600",
  },
  planPerDay: {
    color: colors.dispatch.cyan,
    fontSize: sizes.font.xs,
    fontWeight: "700",
    marginTop: 2,
  },

  ctaButton: {
    backgroundColor: colors.dispatch.cyan,
    borderRadius: sizes.radius.full,
    paddingVertical: 18,
    paddingHorizontal: 48,
    alignItems: "center",
  },
  ctaText: {
    color: colors.dispatch.bg,
    fontSize: sizes.font.lg,
    fontWeight: "900",
    letterSpacing: 2,
  },
  ctaSub: {
    color: colors.dispatch.textMuted,
    fontSize: sizes.font.xs,
    textAlign: "center",
    marginTop: sizes.spacing.sm,
  },
  restoreBtn: {
    marginTop: sizes.spacing.md,
    alignItems: "center",
  },
  restoreText: {
    color: colors.dispatch.textMuted,
    fontSize: sizes.font.sm,
    textDecorationLine: "underline",
  },

  legal: {
    color: colors.dispatch.textMuted,
    fontSize: 10,
    textAlign: "center",
    marginTop: sizes.spacing.lg,
    lineHeight: 14,
    opacity: 0.7,
  },
});
