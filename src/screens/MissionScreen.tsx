import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Dimensions,
  Alert,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
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
import { useFleet } from "../context/FleetContext";
import { useDispatchStory } from "../context/DispatchStoryContext";
import {
  getMissionById,
  getLifeMissionForRank,
  DISPATCH_OPTIONS,
  SPECIAL_UNITS,
} from "../content/missions";
import {
  getBeat,
  resolveLines,
  applyChoice,
  applyPin,
  visiblePins,
  resolveCorrectUnit,
  resolveNextBeat,
  scoreBonus,
  initRuntime,
} from "../lib/missions/engine";
import {
  MapPinChoice,
  MissionBeat,
  MissionChoice,
  MissionLine,
  MissionRuntime,
} from "../lib/missions/types";
import { DispatchType } from "../game/types";
import { resolveVideo, DEPLOY_VIDEOS } from "../game/assets";
import { audio } from "../lib/audio";
import { DispatchTimer } from "../components/DispatchTimer";
import { DispatchRadar } from "../components/DispatchRadar";
import { ExcursionMap } from "../components/ExcursionMap";
import { CutscenePlayer } from "../components/CutscenePlayer";
import { ResultBreakdown } from "../components/ResultBreakdown";
import { UnitIcon } from "../components/UnitIcon";
import { colors } from "../theme/colors";
import { sizes } from "../theme/sizes";

type Props = NativeStackScreenProps<RootStackParamList, "Mission">;

type Phase =
  | "intro"
  | "plotIntro"
  | "play"
  | "map"
  | "dispatch"
  | "deploying"
  | "result";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const VIDEO_HEIGHT = SCREEN_HEIGHT * 0.38;

// Default deploy clip used as the fallback when a unit has no tailored video.
const DEPLOY_KEY = "border-runners-intro";

// Persisted flag: the one-off prologue/intro has been played (see BootScreen).
const INTRO_SEEN_KEY = "dispatch_intro_seen_v1";
// Cash per correct dispatch scales with rank: $5 as Trainee, $10 at rank 1,
// $15 at rank 2… — promotions are raises, matching the rising costs (debt
// installments, dates, unit prices) of the later weeks.
const CASH_PER_CORRECT_BASE = 5;
// Chat pacing: each message (narrator included) holds this long before the
// next message / choices appear — a tap anywhere on the chat skips the wait.
const LINE_PACE_MS = 2000;

export function MissionScreen({ navigation, route }: Props) {
  const { missionId, intro: isIntro = false, lifeScene: isLifeScene = false } =
    route.params;
  const mission = getMissionById(missionId);
  const progress = useDispatchProgress();
  const calendar = useCalendar();
  const economy = useEconomy();
  const insets = useSafeAreaInsets();
  const fleet = useFleet();
  const story = useDispatchStory();
  const scrollRef = useRef<ScrollView>(null);

  // Capture the week/day label once so it stays stable after the call advances.
  const calendarLabel = useRef(calendar.shortLabel).current;

  const introAsset = mission.assets.find((a) => a.role === "intro");
  const ambientAssetKey = mission.assets.find((a) => a.role === "ambient")?.key;
  // Looping CCTV background for the whole call. Regular calls prefer the intro
  // clip (bundled = instant); game-plot scenes keep intro and ambient SEPARATE:
  // the intro plays once on the big opening screen, the ambient loops in chat.
  const ambientKey =
    (mission.category === "game_plot"
      ? ambientAssetKey ?? introAsset?.key
      : introAsset?.key ?? ambientAssetKey) ?? mission.id;
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
  const units =
    mission.units ??
    DISPATCH_OPTIONS.filter((o) => !SPECIAL_UNITS.includes(o.id)).map(
      (o) => o.id
    );
  const unitOptions = DISPATCH_OPTIONS.filter((o) => units.includes(o.id));

  // Game-plot scenes open on a large one-shot video with the intro text — the
  // "intro" asset when declared (e.g. w1's van clip), else the ambient clip.
  // The ambient then loops behind the dialogue as usual.
  const hasPlotIntro =
    mission.category === "game_plot" && Boolean(introAsset ?? ambientAssetKey);
  const plotIntroKey = introAsset?.key ?? ambientKey;
  const [phase, setPhase] = useState<Phase>(
    hasPlotIntro ? "plotIntro" : introAsset ? "intro" : "play"
  );
  const [beatId, setBeatId] = useState(mission.start);
  // Seed the runtime with the PERSISTENT story state (past plot & life
  // decisions) plus the player's real wallet, so this mission's `variants`
  // and `correct_rules` can react to everything that came before.
  const [runtime, setRuntime] = useState<MissionRuntime>(() => {
    const base = initRuntime(mission);
    return {
      ...base,
      variables: { ...base.variables, ...story.variables, cash: fleet.cash },
      flags: { ...base.flags, ...story.flags },
    };
  });
  // Merge the finished mission's state back into the persistent story (once).
  const storyCommitted = useRef(false);
  const commitStory = (rt: MissionRuntime) => {
    if (storyCommitted.current) return;
    storyCommitted.current = true;
    story.merge(rt.variables, rt.flags);
  };
  const [displayedLines, setDisplayedLines] = useState<MissionLine[]>([]);
  const [showChoices, setShowChoices] = useState(false);
  // A per-beat intro clip played full-screen before the beat's lines (e.g. the
  // "video del lugar" after picking a map destination). Holds the beat to resume.
  const [beatCutscene, setBeatCutscene] = useState<{
    key: string;
    caption?: string;
    beat: MissionBeat;
    rt: MissionRuntime;
  } | null>(null);
  const cutscenePlayedFor = useRef<string | null>(null);
  // How many lines of the CURRENT beat are revealed (chat accumulates across beats).
  const [revealIndex, setRevealIndex] = useState(0);

  const [dispatchTimer, setDispatchTimer] = useState(timeLimit);
  const [chosenDispatch, setChosenDispatch] = useState<DispatchType | null>(null);
  // Ran out of time on the dispatch screen — no unit was ever sent.
  const [timedOut, setTimedOut] = useState(false);
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
  // Rank-scaled paycheck for a correct dispatch ($5, $10, $15…). Read once at
  // mount so a mid-call promotion pays out at the rank the call started at.
  const cashPerCorrect = useRef(
    CASH_PER_CORRECT_BASE * (progress.rankIndex + 1)
  ).current;
  // A mission with no dispatch beat is a narrative scene (game_plot / weekend);
  // there we keep narrator lines (they ARE the story) and end with a scene card.
  const isStoryMission = useRef(
    !mission.beats.some((b) => b.type === "dispatch")
  ).current;
  // Off-duty event scenes are personal moments, not calls — presented without
  // the LIVE call framing and entered directly after a call (no lobby ring).
  const isEventMission = mission.category === "event";

  const beat = getBeat(mission, beatId);

  const flashOpacity = useSharedValue(0);
  const flashStyle = useAnimatedStyle(() => ({ opacity: flashOpacity.value }));

  // Optional chained background: when declared, the ambient clip plays ONCE
  // and, as soon as it ends, this clip takes over and loops.
  const ambientNextKey = mission.assets.find(
    (a) => a.role === "ambient_next"
  )?.key;
  const player = useVideoPlayer(resolveVideo(ambientKey), (p) => {
    p.loop = !ambientNextKey;
    p.muted = true;
    p.play();
  });
  useEffect(() => {
    if (!ambientNextKey) return;
    const sub = player.addListener("playToEnd", () => {
      try {
        player.replace(resolveVideo(ambientNextKey));
        player.loop = true;
        player.muted = true;
        player.play();
      } catch {}
    });
    return () => {
      try {
        (sub as any)?.remove?.();
      } catch {}
    };
  }, []);
  const deployPlayer = useVideoPlayer(deploySource, (p) => {
    p.loop = false;
    p.muted = true;
  });

  useEffect(() => {
    audio.stopMusic();
  }, []);

  // Some story beats swap the looping background to their own clip via
  // `beat.media` (e.g. Week 1's "police rushes in" ending). One-way switch:
  // beats without media keep whatever's already playing.
  useEffect(() => {
    const b = getBeat(mission, beatId);
    if (!b?.media?.key || b.media.role === "intro") return; // intro = cutscene
    try {
      const src = resolveVideo(b.media.key);
      // Unregistered / empty placeholder keys are skipped silently.
      const playable =
        typeof src === "number" ||
        (typeof src === "string" && /^https?:/.test(src));
      if (!playable) return;
      player.replace(src);
      player.loop = true;
      player.muted = true;
      player.play();
    } catch {}
  }, [beatId]);

  // Pause the looping feed under full-screen overlays so audio doesn't clash.
  useEffect(() => {
    try {
      if (
        phase === "intro" ||
        phase === "plotIntro" ||
        phase === "deploying" ||
        phase === "map"
      )
        player.pause();
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

  // Dispatch countdown. Hitting 0 means no dispatch was sent: the call is
  // marked failed (wrong window, "There was no dispatch sent") with zero XP
  // and zero cash — recordResult(false, 0) awards nothing.
  useEffect(() => {
    if (phase !== "dispatch") return;
    if (dispatchTimer <= 0) {
      setTimedOut(true);
      setChosenDispatch(null);
      commitStory(runtime);
      progress.recordResult(false, 0, 0);
      calendar.completeMission(mission.id, false);
      setPhase("result");
      scrollSoon();
      setTimeout(() => {
        audio.playSfx("fail");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }, 200);
      return;
    }
    const t = setTimeout(() => setDispatchTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, dispatchTimer]);

  const scrollSoon = () =>
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

  // Paced reveal machinery: one pending step at a time (next line, choices, or
  // next beat). A tap on the chat fires the pending step immediately.
  const paceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const paceAction = useRef<(() => void) | null>(null);
  const paceStep = (fn: () => void, delay: number) => {
    if (paceTimer.current) clearTimeout(paceTimer.current);
    paceAction.current = fn;
    paceTimer.current = setTimeout(() => {
      paceTimer.current = null;
      paceAction.current = null;
      fn();
    }, delay);
  };
  const paceSkip = () => {
    if (!paceTimer.current || !paceAction.current) return;
    clearTimeout(paceTimer.current);
    const fn = paceAction.current;
    paceTimer.current = null;
    paceAction.current = null;
    fn();
  };
  useEffect(
    () => () => {
      if (paceTimer.current) clearTimeout(paceTimer.current);
    },
    []
  );

  // Load a beat when we enter it (during the "play" phase). A dispatch beat
  // switches us into the dispatch phase instead of showing lines.
  const loadBeat = useCallback(
    (b: MissionBeat, rt: MissionRuntime) => {
      // A beat may declare an intro clip to play once, full-screen, before its
      // content (e.g. the destination "video del lugar" reached from a map beat).
      // Show it, then re-enter this beat to reveal its lines/choices. Ambient
      // beat.media swaps are handled by the [beatId] effect above.
      if (b.media?.role === "intro" && cutscenePlayedFor.current !== b.id) {
        cutscenePlayedFor.current = b.id;
        const asset = mission.assets.find((a) => a.key === b.media?.key);
        setBeatCutscene({ key: b.media.key, caption: asset?.caption, beat: b, rt });
        return;
      }
      // Narrative ending: a mission that reaches an `outcome` beat during play
      // (i.e. without a dispatch step) is a story scene — resolve it as complete.
      if (b.type === "outcome") {
        if (!narrativeDone.current) {
          narrativeDone.current = true;
          commitStory(rt);
          if (isIntro) {
            // One-off intro (prologue): don't touch progress or the calendar —
            // just remember it's been seen so it won't replay on next launch.
            AsyncStorage.setItem(INTRO_SEEN_KEY, "1").catch(() => {});
          } else if (isLifeScene) {
            // Personal-life scene (rank-up follow-up): standalone, so it must not
            // award progress or advance the calendar.
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
      if (b.type === "map") {
        // Interactive displacement: DON'T jump to the map yet. Stay in "play" so
        // the preceding dialogue stays readable and surface a "Go to map" button
        // (handleGoToMap) — the player opens the map when they're done reading.
        autoMode.current = false;
        setShowChoices(false);
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

      // Dialogue auto-plays ONE MESSAGE AT A TIME: each line (narrator too)
      // holds ~2s before the next line / choices / next beat, so nothing
      // scrolls away unread. A tap on the chat skips the current wait.
      setShowChoices(false);
      const finish = () => {
        if (b.type === "decision") {
          setShowChoices(true);
          scrollSoon();
        } else {
          // Conditional routing (next_rules) lets accumulated decisions steer
          // the path — e.g. the finale fanning out into its endings.
          const nextId = resolveNextBeat(b, rt);
          if (nextId) goToBeat(nextId);
        }
      };
      if (lines.length > 0) {
        const step = (i: number) => {
          setDisplayedLines((prev) => [...prev, lines[i]]);
          setRevealIndex(i + 1);
          scrollSoon();
          if (i + 1 < lines.length) paceStep(() => step(i + 1), LINE_PACE_MS);
          else paceStep(finish, LINE_PACE_MS);
        };
        step(0);
      } else {
        setRevealIndex(0);
        paceStep(finish, 300);
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
    // Cash-priced option (off-duty events): spend from the earned wallet.
    const cashCost = choice.cash_cost ?? 0;
    if (cashCost > 0 && !fleet.spendCash(cashCost)) {
      audio.playSfx("fail");
      Alert.alert(
        "Not enough cash",
        `This costs $${cashCost}. Earn cash by resolving calls correctly.`
      );
      return;
    }
    if (cost > 0) economy.spend(cost);

    // Reserved effect `cash`: positive deltas pay REAL money into the wallet
    // (e.g. taking the envelope). The wallet is the source of truth — the
    // runtime copy only feeds conditions and is never persisted.
    const cashEffect = choice.effects?.cash ?? 0;
    if (cashEffect > 0) fleet.earnCash(cashEffect);

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

  const handleGoToMap = () => {
    audio.playSfx("tap");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPhase("map");
    scrollSoon();
  };

  const handlePinSelect = (pin: MapPinChoice) => {
    audio.playSfx("tap");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Choosing a pin applies its flags/effects (same rules as a decision) and
    // routes the conversation to the destination beat within this mission.
    const nextRuntime = applyPin(runtime, pin);
    setRuntime(nextRuntime);
    autoMode.current = true;
    // Small beat so the pin's selected state reads before the map dismisses.
    setTimeout(() => {
      setPhase("play");
      // Echo a system note into the chat so there's a record of the choice
      // (e.g. "Moved to the Hospital") before the destination scene plays.
      setDisplayedLines((prev) => [
        ...prev,
        { speaker: "dispatch", text: pin.note ?? `Moved to ${pin.label}` },
      ]);
      goToBeat(pin.next);
    }, 650);
  };

  const doDispatch = (choice: DispatchType) => {
    audio.playSfx("dispatch");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Consume a vehicle (managed units) and advance the unlock progress.
    fleet.onDispatch(choice);

    const elapsed = (Date.now() - dispatchStartTime.current) / 1000;
    const correct = choice === correctUnit;
    const reward = mission.reward + (correct ? scoreBonus(runtime) : 0);
    commitStory(runtime);

    setChosenDispatch(choice);
    progress.recordResult(correct, reward, elapsed);
    calendar.completeMission(mission.id, correct);

    // Reward cash for a correct dispatch (spent on units; gems stay premium).
    if (correct) fleet.earnCash(cashPerCorrect);

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

    // Pick the deploy clip: the mission's own tailored clip (deploy_media) wins
    // when the player dispatched the correct unit; otherwise the reusable
    // per-unit clip. Only replace when it differs from the preloaded source —
    // replacing with the same source forces a reload and flashes the video.
    try {
      const unitKey = DEPLOY_VIDEOS[choice] ?? DEPLOY_KEY;
      const nextSrc = resolveVideo(
        correct && deployKey ? deployKey : unitKey
      );
      const currentSrc = deploySource ?? resolveVideo(DEPLOY_KEY);
      if (nextSrc !== currentSrc) {
        deployPlayer.replace(nextSrc);
      }
    } catch {}

    flashOpacity.value = withSequence(
      withTiming(0.3, { duration: 80 }),
      withTiming(0, { duration: 300 })
    );
    // A siren rolls only for the emergency vehicles (not special units).
    if (choice === "police" || choice === "firefighters" || choice === "ambulance") {
      audio.playRandomSiren();
    }
    setDeployStage("clip");
    setPhase("deploying");
  };

  // Fleet gate — units are unlock-only now. Locked units explain the unlock;
  // anything unlocked can always be dispatched.
  const handleDispatch = (choice: DispatchType) => {
    if (fleet.canDispatch(choice)) {
      doDispatch(choice);
      return;
    }
    audio.playSfx("fail");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Unit locked",
      `${fleet.labelOf(choice)} unlocks after ${fleet.unlockCallsOf(choice)} calls (${fleet.callsCompleted}/${fleet.unlockCallsOf(choice)}).`
    );
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
    // A life scene is itself a rank-up follow-up, so don't loop the badge.
    if (!isLifeScene && progress.lastResult?.rankedUp) {
      audio.playSfx("success");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowRankUp(true);
      return;
    }
    // Off-duty event next in the day? Flow straight into the personal scene —
    // no lobby, no ringing phone: it shouldn't feel like another call.
    if (!isIntro && !isLifeScene) {
      const next = calendar.getNextMission();
      const nextMission = next ? getMissionById(next.missionId) : null;
      if (nextMission?.category === "event") {
        navigation.replace("Mission", { missionId: nextMission.id });
        return;
      }
    }
    // After the prologue (intro), play the "NIGHT SHIFT" shot before the menu.
    navigation.replace(isIntro ? "IntroCinematic" : "DispatchLobby");
  };

  const isDecisionPrompt = beat?.type === "decision" && showChoices;

  // Upcoming fleet unlock — surfaced on the case-completed / result screen.
  const upcomingUnit = fleet.nextUnlock();

  // Intro text for the plot-intro screen: the start beat's first narrator line.
  const plotIntroText = hasPlotIntro
    ? getBeat(mission, mission.start)?.lines?.find(
        (l) => l.speaker === "narrator"
      )?.text
    : undefined;

  const senderName = (speaker: string) => {
    if (speaker === "operator") return "You (Dispatch)";
    if (speaker === "dispatch") return "Dispatch · Note";
    if (speaker === "narrator") return "";
    if (speaker === "caller") return mission.caller.name;
    return mission.speakers?.[speaker] ?? mission.caller.name;
  };

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + sizes.spacing.sm }]}>
        <View style={styles.headerLeft}>
          {!isEventMission && <View style={styles.liveDot} />}
          <Text style={styles.callType}>
            {isEventMission ? "OFF DUTY" : "LIVE"}
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.shiftPill}>
            <Text style={styles.shiftText}>{calendarLabel}</Text>
          </View>
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
          <Text style={styles.callerName}>{mission.caller.name}</Text>
        </View>
        <View style={styles.difficultyTag}>
          <Text style={styles.difficultyText}>{"⬥".repeat(mission.difficulty)}</Text>
        </View>
      </View>

      {/* Tapping the chat skips the current message wait (paced reveal). */}
      <Pressable style={styles.chatArea} onPress={paceSkip}>
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
              {/* Mini cash wallet — shown when some option costs cash. */}
              {beat.choices.some((c) => (c.cash_cost ?? 0) > 0) && (
                <View style={styles.cashWallet}>
                  <Text style={styles.cashWalletText}>💵 ${fleet.cash}</Text>
                </View>
              )}
              {beat.choices.map((c) => {
                const cost = c.gem_cost ?? 0;
                const cashCost = c.cash_cost ?? 0;
                const cantAfford = cashCost > 0 && fleet.cash < cashCost;
                return (
                  <Pressable
                    key={c.id}
                    style={[
                      styles.choiceBtn,
                      c.premium && styles.choiceBtnPremium,
                      cantAfford && styles.choiceBtnDim,
                    ]}
                    onPress={() => handleChoice(c)}
                  >
                    <Text style={styles.choiceLabel}>{c.label}</Text>
                    {cost > 0 && (
                      <View style={styles.gemPill}>
                        <Text style={styles.gemPillText}>💎 {cost}</Text>
                      </View>
                    )}
                    {cashCost > 0 && (
                      <View style={[styles.cashPill, cantAfford && styles.cashPillDim]}>
                        <Text style={styles.cashPillText}>💵 ${cashCost}</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </Animated.View>
          )}

          {phase === "play" && beat?.type === "map" && (
            <Animated.View entering={FadeInDown} style={styles.mapCtaWrap}>
              <Pressable style={styles.mapCtaBtn} onPress={handleGoToMap}>
                <Text style={styles.mapCtaLabel}>{beat.map_cta ?? "Go to map"}</Text>
              </Pressable>
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
                {unitOptions.map((opt) => {
                  const locked = !fleet.isUnlocked(opt.id);
                  return (
                    <Pressable
                      key={opt.id}
                      style={[styles.dispatchBtn, locked && styles.dispatchBtnDisabled]}
                      onPress={() => handleDispatch(opt.id)}
                    >
                      {locked ? (
                        <Text style={styles.dispatchIcon}>🔒</Text>
                      ) : (
                        <UnitIcon kind={opt.id} emoji={opt.icon} size={26} />
                      )}
                      <Text style={styles.dispatchLabel}>{opt.label}</Text>
                      {locked && (
                        <Text style={styles.dispatchLocked}>
                          {fleet.callsCompleted}/{fleet.unlockCallsOf(opt.id)}
                        </Text>
                      )}
                    </Pressable>
                  );
                })}
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
                {isIntro
                  ? "WELCOME TO THE FLOOR"
                  : isEventMission
                  ? "OFF DUTY"
                  : "CASE COMPLETED"}
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
              cashEarned={cashPerCorrect}
              timedOut={timedOut}
            />
          )}

          {/* Progress toward the next fleet unlock (not on off-duty scenes,
              and not on the player's very first call). */}
          {phase === "result" && upcomingUnit && !isEventMission && fleet.callsCompleted > 1 && (
            <Animated.View
              entering={FadeIn.delay(500).duration(400)}
              style={styles.nextUnlockBox}
            >
              <Text style={styles.nextUnlockText}>
                NEXT UNLOCK · {upcomingUnit.icon} {upcomingUnit.label} —{" "}
                {fleet.callsCompleted}/{upcomingUnit.unlock} calls
              </Text>
            </Animated.View>
          )}
        </ScrollView>
      </Pressable>

      {phase === "result" && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + sizes.spacing.md }]}>
          <Pressable style={styles.nextCallBtn} onPress={handleNextMission}>
            <Text style={styles.nextCallText}>
              {isIntro
                ? "ENTER DISPATCH ▸"
                : isEventMission
                ? "BACK TO THE DESK ▸"
                : "NEXT CALL ▸"}
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

      {/* Game-plot opening: the scene clip fills ~3/4 of the screen and plays
          ONCE with the story's intro text below; it then loops as the ambient
          background behind the dialogue. */}
      {phase === "plotIntro" && (
        <View style={[StyleSheet.absoluteFill, styles.plotIntroWrap]}>
          <View style={styles.plotIntroVideo}>
            <CutscenePlayer
              source={plotIntroKey}
              tag={`STORY · ${mission.caller.location}`}
              onComplete={() => setPhase("play")}
            />
          </View>
          <View style={styles.plotIntroTextWrap}>
            {plotIntroText ? (
              <Animated.Text
                entering={FadeIn.delay(400).duration(600)}
                style={styles.plotIntroText}
              >
                {plotIntroText}
              </Animated.Text>
            ) : null}
          </View>
        </View>
      )}

      {phase === "map" && beat?.type === "map" && (
        <View style={styles.mapOverlay}>
          <ExcursionMap
            prompt={beat.prompt}
            map={beat.map}
            pins={visiblePins(beat, runtime)}
            onSelectPin={handlePinSelect}
          />
        </View>
      )}

      {beatCutscene && (
        <View style={StyleSheet.absoluteFill}>
          <CutscenePlayer
            source={beatCutscene.key}
            caption={beatCutscene.caption}
            onComplete={() => {
              const pending = beatCutscene;
              setBeatCutscene(null);
              loadBeat(pending.beat, pending.rt);
            }}
          />
        </View>
      )}

      {showRankUp && (
        <View style={StyleSheet.absoluteFill}>
          <CutscenePlayer
            source="pov-promotion"
            tag="PROMOTION"
            caption={`You made ${progress.lastResult?.newRankName ?? "the next rank"}!`}
            onComplete={() => {
              // After the promotion badge, play this rank's personal-life scene
              // (bully-to-respect arc) if there is one; otherwise back to lobby.
              const life = getLifeMissionForRank(progress.rankIndex);
              if (life) {
                navigation.replace("Mission", {
                  missionId: life.id,
                  lifeScene: true,
                });
              } else {
                navigation.replace("DispatchLobby");
              }
            }}
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
            unitId={chosenDispatch ?? undefined}
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
    </View>
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
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#05070d",
  },
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
  mapCtaWrap: { marginTop: sizes.spacing.sm, alignItems: "stretch" },
  mapCtaBtn: {
    // Same tappable-action look as the dialogue choices, but centered and with a
    // stronger cyan fill so "Go to map" reads as the single next step.
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(34, 211, 238, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(34, 211, 238, 0.55)",
    borderRadius: sizes.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  mapCtaLabel: {
    color: colors.dispatch.cyan,
    fontSize: sizes.font.md,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
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
  choiceBtnDim: { opacity: 0.55 },
  cashPill: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cashPillDim: { backgroundColor: "rgba(100, 116, 139, 0.15)" },
  cashPillText: { color: colors.dispatch.answer, fontSize: 12, fontWeight: "800" },
  cashWallet: {
    alignSelf: "flex-end",
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    borderColor: "rgba(34, 197, 94, 0.3)",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 2,
  },
  cashWalletText: { color: colors.dispatch.answer, fontSize: 12, fontWeight: "900" },
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
  dispatchBtnDisabled: { opacity: 0.4 },
  dispatchIcon: { fontSize: 32 },
  dispatchLabel: { color: colors.dispatch.text, fontSize: 11, fontWeight: "900", letterSpacing: 1, textAlign: "center" },
  // Exhausted unit: the button shows the price and buys + sends in one tap.
  // Game-plot opening screen (video ~3/4 + intro text below)
  plotIntroWrap: {
    backgroundColor: "#000",
    zIndex: 10,
  },
  plotIntroVideo: {
    height: SCREEN_HEIGHT * 0.75,
    backgroundColor: "#070A12",
    overflow: "hidden",
  },
  plotIntroTextWrap: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: sizes.spacing.lg,
  },
  plotIntroText: {
    color: colors.dispatch.text,
    fontSize: sizes.font.md,
    fontStyle: "italic",
    lineHeight: 22,
    textAlign: "center",
  },
  nextUnlockBox: {
    marginTop: 10,
    alignSelf: "center",
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderColor: "rgba(245, 158, 11, 0.25)",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  nextUnlockText: {
    color: colors.dispatch.amber,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  dispatchLocked: { color: colors.dispatch.amber, fontSize: 10, fontWeight: "800" },
  streakHint: { color: "#FF6B6B", fontSize: 12, fontWeight: "700" },
  sceneBox: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderWidth: 1.5,
    borderColor: colors.dispatch.answer,
  },
  sceneIcon: { fontSize: 24, color: "#fff", fontWeight: "900" },
  sceneTitle: { fontSize: 15, fontWeight: "900", color: "#fff", letterSpacing: 1 },
  sceneSub: { fontSize: 12, fontWeight: "800", color: colors.dispatch.answer },
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