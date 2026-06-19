import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  SafeAreaView,
  Dimensions,
  Alert,
} from "react-native";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
} from "react-native-reanimated";
import { useVideoPlayer, VideoView } from "expo-video";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useDispatchProgress } from "../context/DispatchProgressContext";
import { useEconomy } from "../context/EconomyContext";
import {
  getMissionById,
  DISPATCH_OPTIONS,
} from "../content/missions";
import {
  getBeat,
  resolveLines,
  applyChoice,
  resolveCorrectUnit,
  scoreBonus,
  initRuntime,
} from "../lib/missions/engine";
import {
  MissionBeat,
  MissionChoice,
  MissionLine,
  MissionRuntime,
} from "../lib/missions/types";
import { DispatchType } from "../game/types";
import { resolveVideo, IMAGES, VIDEOS } from "../game/assets";
import { SHIFT_SIZE } from "../game/ranks";
import { audio } from "../lib/audio";
import { DispatchTimer } from "../components/DispatchTimer";
import { DispatchRadar } from "../components/DispatchRadar";
import { CutscenePlayer } from "../components/CutscenePlayer";
import { CinematicImage } from "../components/CinematicImage";
import { ResultBreakdown } from "../components/ResultBreakdown";
import { Avatar3D } from "../components/Avatar3D";
import { MODELS } from "../game/assets";
import { colors } from "../theme/colors";
import { sizes } from "../theme/sizes";

type Props = NativeStackScreenProps<RootStackParamList, "Mission">;

type Phase = "intro" | "play" | "dispatch" | "deploying" | "result";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const VIDEO_HEIGHT = SCREEN_HEIGHT * 0.38;

const DEPLOY_KEY = "border-runners-intro";

export function MissionScreen({ navigation, route }: Props) {
  const { missionId } = route.params;
  const mission = getMissionById(missionId);
  const progress = useDispatchProgress();
  const economy = useEconomy();
  const scrollRef = useRef<ScrollView>(null);

  const introAsset = mission.assets.find((a) => a.role === "intro");
  // Looping CCTV background for the whole call. Prefer the bundled intro clip:
  // it loads instantly with no buffering, where the streamed "ambient" URL may
  // not play on mobile (the CCTV "CONNECTING FEED" fallback covers that case).
  const ambientKey =
    introAsset?.key ??
    mission.assets.find((a) => a.role === "ambient")?.key ??
    mission.id;
  const callerAvatar =
    mission.caller.avatar ??
    (MODELS["officer"] != null ? "officer" : undefined);
  const timeLimit = mission.time_limit_seconds ?? 15;
  const units = mission.units ?? DISPATCH_OPTIONS.map((o) => o.id);
  const unitOptions = DISPATCH_OPTIONS.filter((o) => units.includes(o.id));

  const [phase, setPhase] = useState<Phase>(introAsset ? "intro" : "play");
  const [beatId, setBeatId] = useState(mission.start);
  const [runtime, setRuntime] = useState<MissionRuntime>(() =>
    initRuntime(mission)
  );
  const [displayedLines, setDisplayedLines] = useState<MissionLine[]>([]);
  const [lineIndex, setLineIndex] = useState(0);
  const [showChoices, setShowChoices] = useState(false);
  const [allLinesShown, setAllLinesShown] = useState(false);
  const pendingNext = useRef<string | null>(null);

  const [dispatchTimer, setDispatchTimer] = useState(timeLimit);
  const [chosenDispatch, setChosenDispatch] = useState<DispatchType | null>(null);
  const [correctUnit, setCorrectUnit] = useState<DispatchType>("police");
  const [explanation, setExplanation] = useState<string | undefined>(undefined);
  const [showRankUp, setShowRankUp] = useState(false);
  const dispatchStartTime = useRef<number>(0);
  const isFirstMission = useRef(progress.callsHandled === 0).current;

  const beat = getBeat(mission, beatId);

  const flashOpacity = useSharedValue(0);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));

  const player = useVideoPlayer(resolveVideo(ambientKey), (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  const deployPlayer = useVideoPlayer(VIDEOS[DEPLOY_KEY] as number, (p) => {
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    audio.stopMusic();
  }, []);

  // Pause the looping feed under full-screen overlays so audio doesn't clash.
  useEffect(() => {
    try {
      if (phase === "intro" || phase === "deploying") player.pause();
      else player.play();
    } catch {}
  }, [phase]);

  useEffect(() => {
    try {
      if (phase === "deploying") deployPlayer.replay();
      else deployPlayer.pause();
    } catch {}
  }, [phase]);

  // Dispatch countdown.
  useEffect(() => {
    if (phase !== "dispatch") return;
    if (dispatchTimer <= 0) return;
    const t = setTimeout(() => setDispatchTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, dispatchTimer]);

  const scrollSoon = () =>
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

  // Load a beat when we enter it (during the "play" phase). A dispatch beat
  // switches us into the dispatch phase instead of showing lines.
  const loadBeat = useCallback(
    (b: MissionBeat, rt: MissionRuntime) => {
      if (b.type === "dispatch") {
        setCorrectUnit(resolveCorrectUnit(b, rt));
        setExplanation(b.explanation);
        dispatchStartTime.current = Date.now();
        setDispatchTimer(timeLimit);
        setPhase("dispatch");
        return;
      }
      const lines = resolveLines(b, rt);
      if (lines.length > 0) {
        setDisplayedLines([lines[0]]);
        setLineIndex(1);
        setShowChoices(false);
        setAllLinesShown(false);
      } else {
        setDisplayedLines([]);
        setLineIndex(0);
        if (b.type === "decision") {
          setShowChoices(true);
          setAllLinesShown(false);
        } else {
          setShowChoices(false);
          setAllLinesShown(true);
        }
      }
      scrollSoon();
    },
    [timeLimit]
  );

  useEffect(() => {
    if (phase !== "play") return;
    if (!beat) return;
    loadBeat(beat, runtime);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beatId, phase]);

  const advanceLine = () => {
    if (!beat) return;
    const lines = resolveLines(beat, runtime);
    if (lineIndex < lines.length) {
      setDisplayedLines((prev) => [...prev, lines[lineIndex]]);
      setLineIndex((i) => i + 1);
      audio.playSfx("tap");
      Haptics.selectionAsync();
      scrollSoon();
    } else if (beat.type === "decision") {
      setShowChoices(true);
      scrollSoon();
    } else {
      setAllLinesShown(true);
    }
  };

  const goToBeat = (nextId: string | null | undefined) => {
    if (!nextId) return;
    setShowChoices(false);
    setAllLinesShown(false);
    setBeatId(nextId);
  };

  const handleTap = () => {
    if (phase !== "play") return;
    if (showChoices || allLinesShown) return; // waiting on a button
    advanceLine();
  };

  const handleNext = () => {
    audio.playSfx("tap");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (pendingNext.current) {
      const next = pendingNext.current;
      pendingNext.current = null;
      goToBeat(next);
      return;
    }
    if (beat) goToBeat(beat.next);
  };

  const handleChoice = (choice: MissionChoice) => {
    const cost = choice.gem_cost ?? 0;
    if (cost > 0 && economy.gems < cost) {
      Alert.alert(
        "Not enough gems",
        "You need more gems for this option.",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Get gems", onPress: () => navigation.navigate("Shop") },
        ]
      );
      return;
    }
    if (cost > 0) economy.spend(cost);

    audio.playSfx("tap");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const nextRuntime = applyChoice(runtime, choice);
    setRuntime(nextRuntime);
    setShowChoices(false);

    if (choice.feedback) {
      // Surface the consequence as a dispatch note, then tap to continue.
      setDisplayedLines((prev) => [
        ...prev,
        { speaker: "dispatch", text: choice.feedback as string },
      ]);
      setAllLinesShown(true);
      pendingNext.current = choice.next;
      scrollSoon();
    } else {
      goToBeat(choice.next);
    }
  };

  const handleDispatch = (choice: DispatchType) => {
    audio.playSfx("dispatch");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const elapsed = (Date.now() - dispatchStartTime.current) / 1000;
    const correct = choice === correctUnit;
    const reward = mission.reward + (correct ? scoreBonus(runtime) : 0);

    setChosenDispatch(choice);
    progress.recordResult(correct, reward, elapsed);

    flashOpacity.value = withSequence(
      withTiming(0.3, { duration: 80 }),
      withTiming(0, { duration: 300 })
    );
    setPhase("deploying");
  };

  const handleDeployComplete = () => {
    const correct = chosenDispatch === correctUnit;
    setPhase("result");
    scrollSoon();
    setTimeout(() => {
      audio.playSfx(correct ? "success" : "fail");
      Haptics.notificationAsync(
        correct
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error
      );
    }, 200);
  };

  const handleNextMission = () => {
    audio.playSfx("tap");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (progress.lastResult?.rankedUp && IMAGES["rank-up"]) {
      audio.playSfx("success");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowRankUp(true);
      return;
    }
    navigation.replace("DispatchLobby");
  };

  const shiftLabel = `${progress.shiftProgress + 1}/${SHIFT_SIZE}`;
  const isDecisionPrompt = beat?.type === "decision" && showChoices;

  const senderName = (speaker: string) =>
    speaker === "operator"
      ? "You (Dispatch)"
      : speaker === "dispatch"
      ? "Dispatch · Note"
      : speaker === "narrator"
      ? ""
      : mission.caller.name;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.liveDot} />
          <Text style={styles.callType}>{mission.caller.type}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.shiftPill}>
            <Text style={styles.shiftText}>SHIFT {shiftLabel}</Text>
          </View>
          <Text style={styles.location}>{mission.caller.location}</Text>
        </View>
      </View>

      <View style={styles.videoWrap}>
        <View style={styles.feedFallback}>
          <View style={styles.feedGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={`h${i}`} style={[styles.feedGridLine, { top: `${(i + 1) * 14.2}%` }]} />
            ))}
            {Array.from({ length: 4 }).map((_, i) => (
              <View key={`v${i}`} style={[styles.feedGridLineV, { left: `${(i + 1) * 20}%` }]} />
            ))}
          </View>
          <Text style={styles.feedStatus}>CONNECTING FEED…</Text>
        </View>

        <VideoView player={player} style={styles.video} contentFit="cover" nativeControls={false} />

        <View pointerEvents="none" style={[styles.cctvCorner, styles.cctvTL]} />
        <View pointerEvents="none" style={[styles.cctvCorner, styles.cctvTR]} />
        <View pointerEvents="none" style={[styles.cctvCorner, styles.cctvBL]} />
        <View pointerEvents="none" style={[styles.cctvCorner, styles.cctvBR]} />

        <View style={styles.recWrap}>
          <View style={styles.recDotLive} />
          <Text style={styles.recLabel}>REC</Text>
        </View>

        <View style={styles.callerPortrait}>
          {callerAvatar ? (
            <Avatar3D
              source={callerAvatar}
              mode="bust"
              size={64}
              rimColor={0xf59e0b}
              bgColor={0x0d1117}
            />
          ) : (
            <View style={styles.callerInitial}>
              <Text style={styles.callerInitialText}>
                {mission.caller.name.charAt(0)}
              </Text>
            </View>
          )}
          <Text style={styles.callerName}>{mission.caller.name}</Text>
        </View>
        <View style={styles.difficultyTag}>
          <Text style={styles.difficultyText}>{"⬥".repeat(mission.difficulty)}</Text>
        </View>
      </View>

      <Pressable style={styles.chatArea} onPress={handleTap}>
        <ScrollView
          ref={scrollRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {phase === "play" && displayedLines.length === 0 && !showChoices && (
            <Animated.View entering={FadeIn} style={styles.introWrap}>
              {isFirstMission && (
                <View style={styles.tutorialCard}>
                  <Text style={styles.tutorialTitle}>👋 WELCOME, OPERATOR</Text>
                  <Text style={styles.tutorialBody}>
                    Work the call: listen, make the right calls, then dispatch
                    the correct unit. Tap anywhere to continue.
                  </Text>
                </View>
              )}
              <Text style={styles.introText}>Tap to take the call…</Text>
            </Animated.View>
          )}

          {displayedLines.map((line, idx) => {
            const name = senderName(line.speaker);
            const isOperator = line.speaker === "operator";
            const isNote = line.speaker === "dispatch";
            return (
              <Animated.View
                key={`${beatId}-${idx}`}
                entering={FadeInDown.duration(240)}
                style={[
                  styles.bubble,
                  isNote
                    ? styles.noteBubble
                    : isOperator
                    ? styles.operatorBubble
                    : styles.callerBubble,
                ]}
              >
                {name !== "" && (
                  <Text
                    style={[
                      styles.senderLabel,
                      isNote
                        ? styles.noteLabel
                        : isOperator
                        ? styles.operatorLabel
                        : styles.callerLabel,
                    ]}
                  >
                    {name}
                  </Text>
                )}
                <Text style={styles.bubbleText}>{line.text}</Text>
              </Animated.View>
            );
          })}

          {isDecisionPrompt && beat?.choices && (
            <Animated.View entering={FadeInDown} style={styles.decisionSection}>
              <Text style={styles.decisionPrompt}>{beat.prompt}</Text>
              {beat.choices.map((c) => {
                const cost = c.gem_cost ?? 0;
                return (
                  <Pressable
                    key={c.id}
                    style={[styles.choiceBtn, c.premium && styles.choiceBtnPremium]}
                    onPress={() => handleChoice(c)}
                  >
                    <Text style={styles.choiceLabel}>{c.label}</Text>
                    {cost > 0 && (
                      <View style={styles.gemPill}>
                        <Text style={styles.gemPillText}>💎 {cost}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </Animated.View>
          )}

          {phase === "dispatch" && (
            <Animated.View entering={FadeInDown} style={styles.dispatchSection}>
              <DispatchTimer seconds={dispatchTimer} />
              <Text style={styles.dispatchPrompt}>
                {beat?.prompt ?? "WHO DO YOU DISPATCH?"}
              </Text>
              {isFirstMission && (
                <Text style={styles.tutorialHint}>
                  💡 Match the emergency to the right unit
                </Text>
              )}
              <View style={styles.dispatchRow}>
                {unitOptions.map((opt) => (
                  <Pressable
                    key={opt.id}
                    style={styles.dispatchBtn}
                    onPress={() => handleDispatch(opt.id)}
                  >
                    <Text style={styles.dispatchIcon}>{opt.icon}</Text>
                    <Text style={styles.dispatchLabel}>{opt.label}</Text>
                  </Pressable>
                ))}
              </View>
              {progress.currentStreak >= 2 && (
                <Text style={styles.streakHint}>
                  🔥 {progress.currentStreak} streak — keep it going!
                </Text>
              )}
            </Animated.View>
          )}

          {phase === "result" && progress.lastResult && (
            <ResultBreakdown
              result={progress.lastResult}
              correctDispatch={correctUnit}
              correctExplanation={explanation}
              chosenDispatch={chosenDispatch ?? undefined}
            />
          )}
        </ScrollView>
      </Pressable>

      {phase === "play" && (showChoices === false) && (allLinesShown ? (
        <View style={styles.bottomBar}>
          <Pressable style={styles.nextInlineBtn} onPress={handleNext}>
            <Text style={styles.nextInlineText}>CONTINUE ▸</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.bottomBar}>
          <Text style={styles.hintText}>TAP TO CONTINUE ▸</Text>
        </View>
      ))}

      {phase === "result" && (
        <View style={styles.bottomBar}>
          <Pressable style={styles.nextCallBtn} onPress={handleNextMission}>
            <Text style={styles.nextCallText}>NEXT CALL ▸</Text>
          </Pressable>
        </View>
      )}

      {phase === "intro" && introAsset && (
        <View style={StyleSheet.absoluteFill}>
          <CutscenePlayer
            source={introAsset.key}
            caption={introAsset.caption}
            tag={`INCOMING · ${mission.caller.location}`}
            onComplete={() => setPhase("play")}
          />
        </View>
      )}

      {showRankUp && IMAGES["rank-up"] && (
        <View style={StyleSheet.absoluteFill}>
          <CinematicImage
            source={IMAGES["rank-up"]}
            tag="PROMOTION"
            title="PROMOTED"
            caption={`You made ${progress.lastResult?.newRankName ?? "the next rank"}!`}
            durationMs={4200}
            onComplete={() => navigation.replace("DispatchLobby")}
          />
        </View>
      )}

      {phase === "deploying" && chosenDispatch && (
        <View style={StyleSheet.absoluteFill}>
          <VideoView
            player={deployPlayer}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
          />
          <View style={styles.deployVideoOverlay} />
          <DispatchRadar
            location={mission.caller.location}
            unitIcon={unitOptions.find((o) => o.id === chosenDispatch)?.icon ?? "🚔"}
            unitLabel={
              unitOptions.find((o) => o.id === chosenDispatch)?.label.replace("\n", " ") ??
              "UNIT"
            }
            callId={mission.id}
            onComplete={handleDeployComplete}
          />
        </View>
      )}

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.dispatch.cyan }, flashStyle]}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dispatch.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: sizes.spacing.md,
    paddingVertical: sizes.spacing.sm,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  headerRight: { alignItems: "flex-end", gap: 3 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.dispatch.decline },
  callType: {
    color: colors.dispatch.decline,
    fontSize: sizes.font.xs,
    fontWeight: "900",
    letterSpacing: 1,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  location: { color: colors.dispatch.textMuted, fontSize: sizes.font.xs, fontWeight: "600" },
  shiftPill: {
    backgroundColor: "rgba(34, 211, 238, 0.1)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  shiftText: { color: colors.dispatch.cyan, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  videoWrap: {
    height: VIDEO_HEIGHT,
    marginHorizontal: sizes.spacing.sm,
    borderRadius: sizes.radius.lg,
    borderWidth: 1,
    borderColor: colors.dispatch.border,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  feedFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#060A14",
    justifyContent: "center",
    alignItems: "center",
  },
  feedGrid: { ...StyleSheet.absoluteFillObject },
  feedGridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(34, 211, 238, 0.04)",
  },
  feedGridLineV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(34, 211, 238, 0.04)",
  },
  feedStatus: { color: "rgba(34, 211, 238, 0.35)", fontSize: 11, fontWeight: "800", letterSpacing: 3 },
  video: { width: "100%", height: "100%" },
  cctvCorner: { position: "absolute", width: 18, height: 18 },
  cctvTL: { top: 6, left: 6, borderTopWidth: 2, borderLeftWidth: 2, borderColor: "rgba(34, 211, 238, 0.4)" },
  cctvTR: { top: 6, right: 6, borderTopWidth: 2, borderRightWidth: 2, borderColor: "rgba(34, 211, 238, 0.4)" },
  cctvBL: { bottom: 6, left: 6, borderBottomWidth: 2, borderLeftWidth: 2, borderColor: "rgba(34, 211, 238, 0.4)" },
  cctvBR: { bottom: 6, right: 6, borderBottomWidth: 2, borderRightWidth: 2, borderColor: "rgba(34, 211, 238, 0.4)" },
  recWrap: { position: "absolute", top: 10, left: 10, flexDirection: "row", alignItems: "center", gap: 4 },
  recDotLive: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.dispatch.decline },
  recLabel: { color: colors.dispatch.decline, fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  callerPortrait: {
    position: "absolute",
    bottom: 6,
    left: 6,
    alignItems: "center",
    gap: 3,
  },
  callerInitial: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    borderWidth: 2,
    borderColor: "rgba(245, 158, 11, 0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  callerInitialText: {
    color: colors.dispatch.amber,
    fontSize: 24,
    fontWeight: "900",
  },
  callerName: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  difficultyTag: {
    position: "absolute",
    top: 8,
    right: 40,
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    borderRadius: sizes.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  difficultyText: { color: colors.dispatch.amber, fontSize: 12, letterSpacing: 2 },
  deployVideoOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(5, 8, 16, 0.55)" },
  chatArea: { flex: 1 },
  chatScroll: { flex: 1 },
  chatContent: { padding: sizes.spacing.md, paddingBottom: sizes.spacing.xxl, gap: 10 },
  introWrap: { paddingVertical: sizes.spacing.xl, alignItems: "center" },
  introText: { color: colors.dispatch.textMuted, fontSize: sizes.font.md, fontStyle: "italic" },
  tutorialCard: {
    backgroundColor: "rgba(34, 211, 238, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(34, 211, 238, 0.3)",
    borderRadius: sizes.radius.md,
    padding: sizes.spacing.md,
    marginBottom: sizes.spacing.md,
    gap: 6,
  },
  tutorialTitle: {
    color: colors.dispatch.cyan,
    fontSize: sizes.font.sm,
    fontWeight: "900",
    letterSpacing: 1,
    textAlign: "center",
  },
  tutorialBody: { color: colors.dispatch.text, fontSize: sizes.font.sm, lineHeight: 19, textAlign: "center" },
  tutorialHint: { color: colors.dispatch.cyan, fontSize: sizes.font.sm, fontWeight: "700", textAlign: "center" },
  bubble: { maxWidth: "86%", borderRadius: sizes.radius.md, paddingHorizontal: 14, paddingVertical: 10 },
  callerBubble: {
    alignSelf: "flex-start",
    backgroundColor: colors.dispatch.panel,
    borderWidth: 1,
    borderColor: colors.dispatch.border,
    borderBottomLeftRadius: 4,
  },
  operatorBubble: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(34, 211, 238, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(34, 211, 238, 0.25)",
    borderBottomRightRadius: 4,
  },
  noteBubble: {
    alignSelf: "center",
    backgroundColor: "rgba(245, 158, 11, 0.10)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  senderLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 3,
    textTransform: "uppercase",
  },
  callerLabel: { color: colors.dispatch.amber },
  operatorLabel: { color: colors.dispatch.cyan },
  noteLabel: { color: colors.dispatch.amber },
  bubbleText: { color: colors.dispatch.text, fontSize: sizes.font.md, lineHeight: 21 },
  decisionSection: { marginTop: sizes.spacing.sm, gap: 8 },
  decisionPrompt: {
    color: colors.dispatch.amber,
    fontSize: sizes.font.md,
    fontWeight: "800",
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  choiceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    backgroundColor: colors.dispatch.panel,
    borderWidth: 1,
    borderColor: colors.dispatch.border,
    borderRadius: sizes.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  choiceBtnPremium: { borderColor: "rgba(245, 158, 11, 0.45)" },
  choiceLabel: { color: colors.dispatch.text, fontSize: sizes.font.md, fontWeight: "600", flex: 1, lineHeight: 20 },
  gemPill: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  gemPillText: { color: colors.dispatch.amber, fontSize: 12, fontWeight: "800" },
  dispatchSection: { marginTop: sizes.spacing.md, alignItems: "center", gap: sizes.spacing.md },
  dispatchPrompt: { color: colors.dispatch.amber, fontSize: sizes.font.lg, fontWeight: "900", letterSpacing: 2, textAlign: "center" },
  dispatchRow: { flexDirection: "row", gap: 12 },
  dispatchBtn: {
    flex: 1,
    backgroundColor: colors.dispatch.panel,
    borderWidth: 1,
    borderColor: colors.dispatch.border,
    borderRadius: sizes.radius.lg,
    paddingVertical: 18,
    alignItems: "center",
    gap: 6,
  },
  dispatchIcon: { fontSize: 32 },
  dispatchLabel: { color: colors.dispatch.text, fontSize: 11, fontWeight: "900", letterSpacing: 1, textAlign: "center" },
  streakHint: { color: "#FF6B6B", fontSize: 12, fontWeight: "700" },
  bottomBar: { paddingVertical: sizes.spacing.md, alignItems: "center" },
  hintText: { color: colors.dispatch.textMuted, fontSize: sizes.font.sm, fontWeight: "700", letterSpacing: 1 },
  nextInlineBtn: {
    borderColor: colors.dispatch.cyan,
    borderWidth: 1,
    borderRadius: sizes.radius.md,
    paddingHorizontal: 28,
    paddingVertical: 10,
  },
  nextInlineText: { color: colors.dispatch.cyan, fontSize: sizes.font.sm, fontWeight: "900", letterSpacing: 2 },
  nextCallBtn: { backgroundColor: colors.dispatch.cyan, borderRadius: sizes.radius.md, paddingHorizontal: 32, paddingVertical: 14 },
  nextCallText: { color: "#0A0E1A", fontSize: sizes.font.md, fontWeight: "900", letterSpacing: 2 },
});
