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
import AsyncStorage from "@react-native-async-storage/async-storage";
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
import { useCalendar } from "../context/CalendarContext";
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
import { resolveVideo, IMAGES, DEPLOY_VIDEOS } from "../game/assets";
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

// Default deploy clip used as the fallback when a unit has no tailored video.
const DEPLOY_KEY = "border-runners-intro";

// Persisted flag: the one-off prologue/intro has been played (see BootScreen).
const INTRO_SEEN_KEY = "dispatch_intro_seen_v1";

export function MissionScreen({ navigation, route }: Props) {
  const { missionId, intro: isIntro = false } = route.params;
  const mission = getMissionById(missionId);
  const progress = useDispatchProgress();
  const calendar = useCalendar();
  const economy = useEconomy();
  const scrollRef = useRef<ScrollView>(null);

  // Capture the week/day label once so it stays stable after the call advances.
  const calendarLabel = useRef(calendar.shortLabel).current;

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
  // The dispatch ("deploying") clip, read from the mission's outcome beat — or
  // an asset declared with role "deploy". Optional: missions without it skip the
  // video and just show the radar over the feed.
  const deployKey: string | undefined =
    mission.beats.find((b) => b.type === "outcome")?.deploy_media?.key ??
    mission.assets.find((a) => a.role === "deploy")?.key;
  const deploySource = deployKey ? resolveVideo(deployKey) : null;
  const timeLimit = mission.time_limit_seconds ?? 15;
  // Default option set excludes special units (e.g. zombie_unit) — those only
  // show on calls that explicitly list them in their `units` field.
  const SPECIAL_UNITS = ["zombie_unit", "dino_control"];
  const units =
    mission.units ??
    DISPATCH_OPTIONS.filter((o) => !SPECIAL_UNITS.includes(o.id)).map(
      (o) => o.id
    );
  const unitOptions = DISPATCH_OPTIONS.filter((o) => units.includes(o.id));

  const [phase, setPhase] = useState<Phase>(introAsset ? "intro" : "play");
  const [beatId, setBeatId] = useState(mission.start);
  const [runtime, setRuntime] = useState<MissionRuntime>(() =>
    initRuntime(mission)
  );
  const [displayedLines, setDisplayedLines] = useState<MissionLine[]>([]);
  const [showChoices, setShowChoices] = useState(false);
  // How many lines of the CURRENT beat are revealed (chat accumulates across beats).
  const [revealIndex, setRevealIndex] = useState(0);

  const [dispatchTimer, setDispatchTimer] = useState(timeLimit);
  const [chosenDispatch, setChosenDispatch] = useState<DispatchType | null>(null);
  // Deploy plays in two stages: the unit's video CLIP first, then the radar closer.
  const [deployStage, setDeployStage] = useState<"clip" | "radar">("clip");
  const [correctUnit, setCorrectUnit] = useState<DispatchType>("police");
  const [explanation, setExplanation] = useState<string | undefined>(undefined);
  const [showRankUp, setShowRankUp] = useState(false);
  // Narrative missions (game_plot / weekend) have no dispatch: they end on an
  // `outcome` beat and are resolved as a "scene complete" instead of a dispatch.
  const [isNarrative, setIsNarrative] = useState(false);
  const narrativeDone = useRef(false);
  const dispatchStartTime = useRef<number>(0);
  // While true (right after a choice) the caller's reply auto-plays and the
  // next options appear after a short beat — instead of waiting on a tap.
  const autoMode = useRef(false);
  const isFirstMission = useRef(progress.callsHandled === 0).current;
  // A mission with no dispatch beat is a narrative scene (game_plot / weekend);
  // there we keep narrator lines (they ARE the story) and end with a scene card.
  const isStoryMission = useRef(
    !mission.beats.some((b) => b.type === "dispatch")
  ).current;

  const beat = getBeat(mission, beatId);

  const flashOpacity = useSharedValue(0);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));

  const player = useVideoPlayer(resolveVideo(ambientKey), (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  const deployPlayer = useVideoPlayer(deploySource, (p) => {
    p.loop = false;
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
    if (phase !== "deploying") {
      try {
        deployPlayer.pause();
      } catch {}
      return;
    }
    if (deployStage === "clip") {
      // Stage 1: play the unit's deploy clip full-screen ALL THE WAY THROUGH
      // (no loop), then hand off to the radar closer when it ends. A generous
      // safety cap prevents a stalled stream from trapping the player here.
      let done = false;
      const toRadar = () => {
        if (done) return;
        done = true;
        setDeployStage("radar");
      };
      let sub: { remove: () => void } | undefined;
      try {
        deployPlayer.loop = false;
        deployPlayer.muted = false;
        try {
          deployPlayer.currentTime = 0;
        } catch {}
        deployPlayer.play();
        sub = deployPlayer.addListener("playToEnd", toRadar);
      } catch {}
      const t = setTimeout(toRadar, 20000);
      return () => {
        clearTimeout(t);
        sub?.remove();
      };
    } else {
      // Stage 2: the clip holds on its last frame (muted, no loop) behind the
      // radar closer — it already played in full during stage 1.
      try {
        deployPlayer.loop = false;
        deployPlayer.muted = true;
      } catch {}
    }
  }, [phase, deployStage]);

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
      // Narrative ending: a mission that reaches an `outcome` beat during play
      // (i.e. without a dispatch step) is a story scene — resolve it as complete.
      if (b.type === "outcome") {
        if (!narrativeDone.current) {
          narrativeDone.current = true;
          if (isIntro) {
            // One-off intro (prologue): don't touch progress or the calendar —
            // just remember it's been seen so it won't replay on next launch.
            AsyncStorage.setItem(INTRO_SEEN_KEY, "1").catch(() => {});
          } else {
            progress.recordResult(true, mission.reward, 0);
            calendar.completeMission(mission.id, true);
          }
          setIsNarrative(true);
          setTimeout(() => {
            audio.playSfx("success");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }, 150);
        }
        setPhase("result");
        scrollSoon();
        return;
      }
      if (b.type === "dispatch") {
        autoMode.current = false;
        setCorrectUnit(resolveCorrectUnit(b, rt));
        setExplanation(b.explanation);
        // Beat of silence: let the caller's last line land for ~1s before the
        // dispatch options (and the countdown) appear.
        setTimeout(() => {
          dispatchStartTime.current = Date.now();
          setDispatchTimer(timeLimit);
          setPhase("dispatch");
          // Scroll the dispatch buttons into view (the chat above can be long).
          scrollSoon();
        }, 1000);
        return;
      }
      const lines = resolveLines(b, rt).filter(
        (l) => isStoryMission || l.speaker !== "narrator"
      );

      // Dialogue auto-plays — no tap-to-continue. Reveal this beat's line(s),
      // then advance on a timer so the chat reads at a natural pace. The player
      // only taps for the things that matter: decision choices and dispatch.
      if (lines.length > 0) {
        setDisplayedLines((prev) => [...prev, ...lines]);
        setRevealIndex(lines.length);
      } else {
        setRevealIndex(0);
      }
      setShowChoices(false);
      if (b.type === "decision") {
        // Let the line land, then surface the choices.
        setTimeout(() => {
          setShowChoices(true);
          scrollSoon();
        }, lines.length > 0 ? 1000 : 300);
      } else if (b.next) {
        // Hold ~1s before the next message so the chat doesn't dump at once.
        setTimeout(() => goToBeat(b.next), 1000);
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

  const goToBeat = (nextId: string | null | undefined) => {
    if (!nextId) return;
    setShowChoices(false);
    setBeatId(nextId);
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

    // Echo what the operator chose, then (after ~1s) any feedback note, then
    // auto-play the caller's reply — spacing each message so the back-and-forth
    // reads at a natural, human pace instead of appearing all at once.
    setDisplayedLines((prev) => [
      ...prev,
      { speaker: "operator", text: choice.label },
    ]);
    scrollSoon();
    autoMode.current = true;
    const proceed = () => goToBeat(choice.next);
    if (choice.feedback) {
      setTimeout(() => {
        setDisplayedLines((prev) => [
          ...prev,
          { speaker: "dispatch", text: choice.feedback as string },
        ]);
        scrollSoon();
        setTimeout(proceed, 1000);
      }, 1000);
    } else {
      setTimeout(proceed, 1000);
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
    calendar.completeMission(mission.id, correct);

    // "No dispatch needed": nothing rolls out, so skip the deploy clip AND the
    // radar closer — go straight to the result card.
    if (choice === "no_unit") {
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
      return;
    }

    // Swap in the reusable deploy clip for the chosen unit ONLY when it differs
    // from the one already loaded — otherwise replacing with the same source
    // forces a reload and flashes the video for a frame.
    try {
      const deployKey = DEPLOY_VIDEOS[choice] ?? DEPLOY_KEY;
      const nextSrc = resolveVideo(deployKey);
      const currentSrc = resolveVideo(DEPLOY_KEY);
      if (nextSrc !== currentSrc) {
        deployPlayer.replace(nextSrc);
      }
    } catch {}

    flashOpacity.value = withSequence(
      withTiming(0.3, { duration: 80 }),
      withTiming(0, { duration: 300 })
    );
    setDeployStage("clip");
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
    // After the prologue (intro), play the "NIGHT SHIFT" shot before the menu.
    navigation.replace(isIntro ? "IntroCinematic" : "DispatchLobby");
  };

  const isDecisionPrompt = beat?.type === "decision" && showChoices;

  const senderName = (speaker: string) => {
    if (speaker === "operator") return "You (Dispatch)";
    if (speaker === "dispatch") return "Dispatch · Note";
    if (speaker === "narrator") return "";
    if (speaker === "caller") return mission.caller.name;
    return mission.speakers?.[speaker] ?? mission.caller.name;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.liveDot} />
          <Text style={styles.callType}>{mission.caller.type}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.shiftPill}>
            <Text style={styles.shiftText}>{calendarLabel}</Text>
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

      <View style={styles.chatArea}>
        <ScrollView
          ref={scrollRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator
          // Auto-scroll once the new bubble has actually laid out — smoother than
          // a fixed timeout, which fires before the content has grown.
          onContentSizeChange={() =>
            scrollRef.current?.scrollToEnd({ animated: true })
          }
        >
          {phase === "play" && displayedLines.length === 0 && !showChoices && (
            <Animated.View entering={FadeIn} style={styles.introWrap}>
              {isFirstMission && (
                <View style={styles.tutorialCard}>
                  <Text style={styles.tutorialTitle}>👋 WELCOME, OPERATOR</Text>
                  <Text style={styles.tutorialBody}>
                    The call plays out on its own — read it, make the right
                    calls at each choice, then dispatch the correct unit.
                  </Text>
                </View>
              )}
              <Text style={styles.introText}>Connecting the call…</Text>
            </Animated.View>
          )}

          {displayedLines.map((line, idx) => {
            const name = senderName(line.speaker);
            const isOperator = line.speaker === "operator";
            const isNote = line.speaker === "dispatch";
            return (
              <Animated.View
                key={idx}
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

          {phase === "result" && isNarrative && (
            <Animated.View entering={FadeInDown.duration(400)} style={styles.sceneBox}>
              <Text style={styles.sceneIcon}>✓</Text>
              <Text style={styles.sceneTitle}>
                {isIntro ? "WELCOME TO THE FLOOR" : "CASE COMPLETED"}
              </Text>
              <Text style={styles.sceneSub}>
                {isIntro
                  ? "Your shift begins."
                  : `+${progress.lastResult?.totalXP ?? mission.reward} XP`}
              </Text>
            </Animated.View>
          )}

          {phase === "result" && !isNarrative && progress.lastResult && (
            <ResultBreakdown
              result={progress.lastResult}
              correctDispatch={correctUnit}
              correctExplanation={explanation}
              chosenDispatch={chosenDispatch ?? undefined}
            />
          )}
        </ScrollView>
      </View>

      {phase === "result" && (
        <View style={styles.bottomBar}>
          <Pressable style={styles.nextCallBtn} onPress={handleNextMission}>
            <Text style={styles.nextCallText}>
              {isIntro ? "ENTER DISPATCH ▸" : "NEXT CALL ▸"}
            </Text>
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

      {phase === "deploying" && chosenDispatch && deployStage === "clip" && (
        // Stage 1: the deploy clip, full-screen (no overlay so it's fully visible).
        <View style={StyleSheet.absoluteFill}>
          <VideoView
            player={deployPlayer}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            nativeControls={false}
          />
          <View style={styles.deployClipTag}>
            <Text style={styles.deployClipText}>
              DISPATCHING{" "}
              {unitOptions
                .find((o) => o.id === chosenDispatch)
                ?.label.replace("\n", " ") ?? "UNIT"}
              …
            </Text>
          </View>
        </View>
      )}

      {phase === "deploying" && chosenDispatch && deployStage === "radar" && (
        // Stage 2: the radar closer (clip loops softly behind a dark overlay).
        <View style={StyleSheet.absoluteFill}>
          {deploySource && (
            <>
              <VideoView
                player={deployPlayer}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                nativeControls={false}
              />
              <View style={styles.deployVideoOverlay} />
            </>
          )}
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
  deployClipTag: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  deployClipText: {
    color: "#fff",
    fontSize: sizes.font.sm,
    fontWeight: "900",
    letterSpacing: 2,
  },
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
    // Distinct from the dialogue bubbles (neutral dark "panel"): the choices use
    // a lighter elevated surface + a cyan accent border so they read as tappable
    // actions, not as more speech.
    backgroundColor: colors.dispatch.panelLight,
    borderWidth: 1,
    borderColor: "rgba(34, 211, 238, 0.40)",
    borderLeftWidth: 3,
    borderLeftColor: colors.dispatch.cyan,
    borderRadius: sizes.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  choiceBtnPremium: { borderColor: "rgba(245, 158, 11, 0.45)", borderLeftColor: colors.dispatch.amber },
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
  sceneBox: {
    marginTop: 12,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderWidth: 2,
    borderColor: colors.dispatch.answer,
  },
  sceneIcon: { fontSize: 36, color: "#fff", fontWeight: "900" },
  sceneTitle: { fontSize: 20, fontWeight: "900", color: "#fff", letterSpacing: 1 },
  sceneSub: { fontSize: 15, fontWeight: "800", color: colors.dispatch.answer },
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
