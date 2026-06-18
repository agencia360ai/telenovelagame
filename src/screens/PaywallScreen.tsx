import React, { useEffect } from "react";
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

export function PaywallScreen({ navigation }: Props) {
  const { subscribe, restore, isSubscribed } = usePaywall();
  const progress = useDispatchProgress();
  const rank = RANKS[progress.rankIndex] ?? RANKS[0];

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

        {/* Headline */}
        <Animated.View entering={FadeInDown.delay(200).duration(500)}>
          <Text style={styles.headline}>Your Trial Has Ended</Text>
          <Text style={styles.subline}>
            Unlock full access to keep dispatching
          </Text>
        </Animated.View>

        {/* Stats hook — show what they'll lose */}
        {progress.callsHandled > 0 && (
          <Animated.View
            entering={FadeInDown.delay(350).duration(500)}
            style={styles.statsCard}
          >
            <Text style={styles.statsTitle}>YOUR PROGRESS</Text>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Text style={styles.statValue}>{rank.icon} {rank.name}</Text>
                <Text style={styles.statLabel}>Current Rank</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{progress.score} XP</Text>
                <Text style={styles.statLabel}>Total Score</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statValue}>{progress.bestStreak}</Text>
                <Text style={styles.statLabel}>Best Streak</Text>
              </View>
            </View>
            <Text style={styles.statsWarning}>
              Don't lose your progress — subscribe to keep going!
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

        {/* Price card */}
        <Animated.View
          entering={FadeInDown.delay(700).duration(500)}
          style={styles.priceCard}
        >
          <View style={styles.priceHeader}>
            <Text style={styles.priceBadge}>BEST VALUE</Text>
          </View>
          <Text style={styles.priceBig}>$4.99</Text>
          <Text style={styles.pricePeriod}>per week</Text>
          <Text style={styles.priceNote}>Cancel anytime · No commitment</Text>
        </Animated.View>

        {/* CTA */}
        <Animated.View entering={FadeInDown.delay(900).duration(500)}>
          <Pressable onPress={handleSubscribe}>
            <Animated.View style={[styles.ctaButton, shimmerStyle]}>
              <Text style={styles.ctaText}>SUBSCRIBE NOW</Text>
            </Animated.View>
          </Pressable>
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

  priceCard: {
    width: "100%",
    backgroundColor: colors.dispatch.panel,
    borderRadius: sizes.radius.xl,
    borderWidth: 2,
    borderColor: colors.dispatch.cyan,
    padding: sizes.spacing.lg,
    alignItems: "center",
    marginBottom: sizes.spacing.lg,
  },
  priceHeader: {
    position: "absolute",
    top: -12,
    backgroundColor: colors.dispatch.cyan,
    borderRadius: sizes.radius.full,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  priceBadge: {
    color: colors.dispatch.bg,
    fontSize: sizes.font.xs,
    fontWeight: "900",
    letterSpacing: 1,
  },
  priceBig: {
    color: "#fff",
    fontSize: 48,
    fontWeight: "900",
    marginTop: sizes.spacing.sm,
  },
  pricePeriod: {
    color: colors.dispatch.textMuted,
    fontSize: sizes.font.lg,
    fontWeight: "600",
  },
  priceNote: {
    color: colors.dispatch.textMuted,
    fontSize: sizes.font.xs,
    marginTop: sizes.spacing.xs,
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
