import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  DevSettings,
  Modal,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { SkinAvatar } from "../components/SkinAvatar";
import { FleetPanel } from "../components/FleetPanel";
import { UnitIcon } from "../components/UnitIcon";
import {
  useFleet,
  FLEET_KINDS,
  FLEET_UNITS,
  FleetKind,
} from "../context/FleetContext";
import { useDispatchProgress } from "../context/DispatchProgressContext";
import { useCalendar } from "../context/CalendarContext";
import { useWardrobe } from "../context/WardrobeContext";
import { usePaywall } from "../context/PaywallContext";
import { resolveSkin, getLobbyVideo } from "../game/assets";
import { getMissionById } from "../content/missions";
import { getXPProgress, RANKS } from "../game/ranks";
import { audio } from "../lib/audio";
import { colors } from "../theme/colors";
import { sizes } from "../theme/sizes";

type Props = NativeStackScreenProps<RootStackParamList, "DispatchLobby">;

const COUNTDOWN_START = 8;
const FIRST_CALL_COUNTDOWN = 5; // the very first call rings faster
// Unit unlocks the player has already been congratulated for (popup shown once).
const UNITS_SEEN_KEY = "fleet_units_seen_v1";

export function DispatchLobbyScreen({ navigation }: Props) {
  // Top inset applied by hand (with a minimum) — the wallet chip was still
  // clipping under the status bar on some devices via SafeAreaView alone.
  const insets = useSafeAreaInsets();
  const headerTop = Math.max(insets.top, 24) + 4;
  const progress = useDispatchProgress();
  const fleet = useFleet();
  const calendar = useCalendar();
  const { equippedId } = useWardrobe();
  const { canPlay, isTrialActive, trialDaysLeft, isSubscribed } = usePaywall();
  // Show the equipped 2D skin in the viewport whenever it has art (including the
  // default "rookie" sprite); fall back to the 3D officer only when there's no art.
  const showSkin = resolveSkin(equippedId) != null;

  // Dev helper: long-press the avatar to wipe all saved progress and reload.
  const resetProgress = () => {
    Alert.alert(
      "Reiniciar progreso",
      "Borra rango, llamadas, vestuario y guardado. ¿Seguro?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Reiniciar",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.clear();
            DevSettings.reload();
          },
        },
      ]
    );
  };
  const [phase, setPhase] = useState<"idle" | "ringing" | "connecting">("idle");
  const [countdown, setCountdown] = useState(
    progress.callsHandled === 0 ? FIRST_CALL_COUNTDOWN : COUNTDOWN_START
  );

  // Units unlocked since the last visit → congratulate with a popup, once.
  const [newUnits, setNewUnits] = useState<FleetKind[]>([]);
  useEffect(() => {
    (async () => {
      const unlocked = FLEET_KINDS.filter((k) => fleet.isUnlocked(k));
      try {
        const raw = await AsyncStorage.getItem(UNITS_SEEN_KEY);
        if (raw == null) {
          // First visit: seed with what's already unlocked, no popup.
          await AsyncStorage.setItem(UNITS_SEEN_KEY, JSON.stringify(unlocked));
          return;
        }
        const seen: string[] = JSON.parse(raw);
        const fresh = unlocked.filter((k) => !seen.includes(k));
        if (fresh.length > 0) {
          setNewUnits(fresh);
          audio.playSfx("success");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          await AsyncStorage.setItem(UNITS_SEEN_KEY, JSON.stringify(unlocked));
        }
      } catch {}
    })();
  }, [fleet.callsCompleted]);


  // Lobby viewport clip: a calm desk loop while idle, swapping to the ringing
  // clip when a call comes in. One looping player; we just swap its source.
  const lobbyPlayer = useVideoPlayer(
    getLobbyVideo(progress.rankIndex, "idle"),
    (p) => {
      p.loop = true;
      p.muted = true;
      p.play();
    }
  );
  // Re-evaluate when the phase (idle/ringing) OR the player's rank changes, so a
  // promotion swaps in the new rank's desk footage right away. We track both so
  // a rank-up while sitting in the lobby still upgrades the clip. The ref is
  // seeded with the initial idle tag so the first mount doesn't trigger a fade.
  const lobbyClip = useRef<string>(`idle@${progress.rankIndex}`);
  // Black overlay opacity for the fade-to-black transition between clips.
  const fadeBlack = useSharedValue(0);
  useEffect(() => {
    const want = phase === "ringing" ? "ringing" : "idle";
    const tag = `${want}@${progress.rankIndex}`;
    if (lobbyClip.current === tag) return;
    lobbyClip.current = tag;
    // Fade to black, swap the source at the darkest point, then fade back in.
    fadeBlack.value = withTiming(1, {
      duration: 200,
      easing: Easing.in(Easing.quad),
    });
    const swap = setTimeout(() => {
      try {
        lobbyPlayer.replace(getLobbyVideo(progress.rankIndex, want));
        lobbyPlayer.loop = true;
        lobbyPlayer.muted = true;
        lobbyPlayer.play();
      } catch {}
      fadeBlack.value = withTiming(0, {
        duration: 260,
        easing: Easing.out(Easing.quad),
      });
    }, 210);
    return () => clearTimeout(swap);
  }, [phase, progress.rankIndex]);
  const fadeBlackStyle = useAnimatedStyle(() => ({
    opacity: fadeBlack.value,
  }));

  const pulse = useSharedValue(1);
  const glow = useSharedValue(0.4);

  const xpInfo = getXPProgress(progress.xp, progress.rankIndex);
  const nearRankUp = xpInfo.percent >= 0.7 && xpInfo.needed > 0;
  const currentRank = RANKS[progress.rankIndex];
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

  // The week's calls are all handled → go to the week summary + reward screen.
  useEffect(() => {
    if (calendar.isWeekComplete) {
      navigation.replace("WeekComplete");
    }
  }, [calendar.isWeekComplete]);

  // Pending off-duty event scene? Personal moments don't ring the phone —
  // flow straight into the scene (covers app relaunch mid-day).
  useEffect(() => {
    if (calendar.isWeekComplete) return;
    const next = calendar.getNextMission();
    if (!next) return;
    if (getMissionById(next.missionId)?.category === "event") {
      navigation.replace("Mission", { missionId: next.missionId });
    }
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
    const next = calendar.getNextMission();
    if (!next) {
      navigation.replace("WeekComplete");
      return;
    }
    audio.playSfx("dispatch");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setPhase("connecting");
    setTimeout(() => {
      navigation.replace("Mission", { missionId: next.missionId });
    }, 800);
  };

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value,
  }));

  return (
    <SafeAreaView style={styles.container} edges={["left", "right", "bottom"]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: headerTop }]}>
        <Pressable
          style={styles.headerLeft}
          onPress={() => navigation.navigate("Wardrobe" as any)}
        >
          <RankBadge rankIndex={progress.rankIndex} />
        </Pressable>
        <Text
          style={styles.title}
          onLongPress={() => navigation.navigate("RadarSandbox" as any)}
        >
          DISPATCH CENTER
        </Text>
        {/* Cash wallet (display only). */}
        <View style={styles.scoreChip}>
          <Text style={styles.scoreIcon}>💵</Text>
          <Text style={styles.scoreValue} numberOfLines={1}>
            ${fleet.cash}
          </Text>
        </View>
      </View>

      {/* Free-trial banner (top) */}
      {isTrialActive && !isSubscribed && (
        <Pressable
          onPress={() => navigation.navigate("Paywall" as any)}
          style={styles.trialBanner}
        >
          <Text style={styles.trialText}>FREE TRIAL · {trialDaysLeft}d left</Text>
        </Pressable>
      )}

      {/* Lobby viewport: looping desk clip (idle) / ringing clip when a call is
          incoming. The operator's avatar sits small in the top-right corner. */}
      <View style={styles.viewport}>
        <VideoView
          player={lobbyPlayer}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={false}
        />
        {/* Fade-to-black layer: covers the clip while the source swaps. */}
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "#000" },
            fadeBlackStyle,
          ]}
        />
        {/* Small avatar (tap → wardrobe, long-press → dev reset) */}
        <Pressable
          style={styles.miniAvatar}
          onPress={() => navigation.navigate("Wardrobe" as any)}
          onLongPress={resetProgress}
          delayLongPress={700}
        >
          {showSkin ? (
            <SkinAvatar skinId={equippedId} size={60} shape="portrait" />
          ) : (
            <OfficerScene3D />
          )}
        </Pressable>
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

      {/* Persistent player card under the video: rank + XP. Tapping the rank
          row opens the experience window (Stats). */}
      <View style={styles.infoPanel}>
        <Pressable
          style={styles.infoRankRow}
          onPress={() => navigation.navigate("Stats" as any)}
        >
          <Text style={styles.infoRankName}>
            {currentRank?.icon} {currentRank?.name ?? "Operator"}
          </Text>
          {nearRankUp && nextRank ? (
            <Animated.Text style={[styles.goalText, goalGlowStyle]}>
              Almost {nextRank.icon} {nextRank.name}!
            </Animated.Text>
          ) : (
            <Text style={styles.infoXP}>★ {progress.xp} XP</Text>
          )}
        </Pressable>
        <XPBar
          current={xpInfo.current}
          needed={xpInfo.needed}
          percent={xpInfo.percent}
          showLabel={false}
        />
        <View style={styles.statsRow}>
          <StatChip label="Resolved" value={progress.correctCount} />
          <StatChip label="Calls" value={progress.callsHandled} />
          <StatChip label="Accuracy" value={`${accuracy}%`} />
          <StatChip label="Streak" value={progress.currentStreak} />
        </View>
      </View>

      {/* Fleet: owned vehicles per unit, buy buttons, Fire Dept unlock progress */}
      <FleetPanel />

      {/* Bottom console */}
      <View style={styles.console}>
        {phase === "idle" && (
          <View style={styles.standby}>
            <Text style={styles.standbyLabel}>NEXT CALL IN</Text>
            <Text style={styles.countdown}>
              0:{countdown.toString().padStart(2, "0")}
            </Text>

            <Text style={styles.standbyHint}>Stand by, operator…</Text>

            {/* Week / day progress */}
            <View style={styles.shiftRow}>
              <Text style={styles.shiftLabel}>{calendar.shortLabel}</Text>
              <View style={styles.shiftDots}>
                {Array.from({ length: Math.max(calendar.dayMissionCount, 1) }).map(
                  (_, i) => (
                    <View
                      key={i}
                      style={[
                        styles.shiftDot,
                        i < calendar.dayMissionIndex && styles.shiftDotFilled,
                      ]}
                    />
                  )
                )}
              </View>
            </View>

            {/* Zeigarnik open-loop: nudge when 1 call left in the day */}
            {calendar.dayMissionCount > 1 &&
              calendar.dayMissionIndex === calendar.dayMissionCount - 1 && (
                <Animated.Text
                  entering={FadeIn.duration(400)}
                  style={styles.shiftNudge}
                >
                  1 call left to finish {calendar.dayLabel}!
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

      {/* New unit unlocked — one-time congratulation popup. */}
      <Modal
        visible={newUnits.length > 0}
        transparent
        animationType="fade"
        onRequestClose={() => setNewUnits([])}
      >
        <View style={styles.unlockBackdrop}>
          <View style={styles.unlockSheet}>
            <Text style={styles.unlockTitle}>🎉 NEW UNIT UNLOCKED</Text>
            {newUnits.map((k) => (
              <View key={k} style={styles.unlockRow}>
                <UnitIcon kind={k} emoji={FLEET_UNITS[k].icon} size={34} />
                <Text style={styles.unlockName}>{FLEET_UNITS[k].label}</Text>
              </View>
            ))}
            <Text style={styles.unlockSub}>
              Now available on your dispatch board.
            </Text>
            <Pressable
              style={styles.unlockBtn}
              onPress={() => setNewUnits([])}
            >
              <Text style={styles.unlockBtnText}>OK</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    // Grow with the XP number instead of a hard width (which let big numbers
    // spill outside the pill). Anchored to the right by the header's
    // space-between, so it expands leftward and stays on-screen.
    minWidth: 100,
    maxWidth: 160,
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
  trialBanner: {
    alignSelf: "center",
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginTop: 2,
    marginBottom: 4,
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
  skinViewport: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
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
  miniAvatar: {
    position: "absolute",
    top: 10,
    right: 10,
    width: 64,
    height: 64,
    borderRadius: sizes.radius.md,
    overflow: "hidden",
    backgroundColor: colors.dispatch.panel,
    borderWidth: 1,
    borderColor: colors.dispatch.border,
    alignItems: "center",
    justifyContent: "center",
  },
  streakTag: {
    position: "absolute",
    bottom: 10,
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
  infoPanel: {
    paddingHorizontal: sizes.spacing.md,
    paddingTop: sizes.spacing.sm,
    paddingBottom: sizes.spacing.sm,
    gap: 8,
    alignItems: "center",
  },
  infoRankRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  infoRankName: {
    color: colors.dispatch.text,
    fontSize: sizes.font.sm,
    fontWeight: "900",
    letterSpacing: 1,
  },
  infoXP: {
    color: colors.dispatch.amber,
    fontSize: sizes.font.sm,
    fontWeight: "800",
  },
  // New-unit-unlocked popup
  unlockBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    padding: sizes.spacing.lg,
  },
  unlockSheet: {
    backgroundColor: colors.dispatch.panel,
    borderColor: colors.dispatch.cyan,
    borderWidth: 1,
    borderRadius: sizes.radius.lg,
    padding: sizes.spacing.lg,
    gap: 10,
    alignItems: "center",
  },
  unlockTitle: {
    color: colors.dispatch.cyan,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  unlockRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.dispatch.panelLight,
    borderColor: colors.dispatch.border,
    borderWidth: 1,
    borderRadius: sizes.radius.md,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  unlockIcon: { fontSize: 28 },
  unlockName: {
    color: colors.dispatch.text,
    fontSize: 16,
    fontWeight: "900",
  },
  unlockSub: {
    color: colors.dispatch.textMuted,
    fontSize: 12,
    textAlign: "center",
  },
  unlockBtn: {
    marginTop: 4,
    alignSelf: "stretch",
    alignItems: "center",
    paddingVertical: 12,
    backgroundColor: "rgba(34, 211, 238, 0.16)",
    borderColor: "rgba(34, 211, 238, 0.4)",
    borderWidth: 1,
    borderRadius: sizes.radius.md,
  },
  unlockBtnText: {
    color: colors.dispatch.cyan,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1,
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
