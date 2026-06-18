import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  SafeAreaView,
  Dimensions,
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
import {
  getCallById,
  DISPATCH_OPTIONS,
} from "../content/calls";
import { DispatchType } from "../game/types";
import { resolveVideo } from "../game/assets";
import { SHIFT_SIZE } from "../game/ranks";
import { audio } from "../lib/audio";
import { DispatchTimer } from "../components/DispatchTimer";
import { DispatchRadar } from "../components/DispatchRadar";
import { CutscenePlayer } from "../components/CutscenePlayer";
import { ResultBreakdown } from "../components/ResultBreakdown";
import { colors } from "../theme/colors";
import { sizes } from "../theme/sizes";

type Props = NativeStackScreenProps<RootStackParamList, "Call">;

type Phase = "intro" | "dialogue" | "dispatch" | "deploying" | "result";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const VIDEO_HEIGHT = SCREEN_HEIGHT * 0.38;
const DISPATCH_TIME_LIMIT = 15;

export function CallScreen({ navigation, route }: Props) {
  const { callId } = route.params;
  const call = getCallById(callId);
  const progress = useDispatchProgress();
  const scrollRef = useRef<ScrollView>(null);

  const [phase, setPhase] = useState<Phase>(
    call.introVideo ? "intro" : "dialogue"
  );
  const [visibleCount, setVisibleCount] = useState(0);
  const [dispatchTimer, setDispatchTimer] = useState(DISPATCH_TIME_LIMIT);
  const [chosenDispatch, setChosenDispatch] = useState<DispatchType | null>(null);
  const dispatchStartTime = useRef<number>(0);
  const isFirstCall = useRef(progress.callsHandled === 0).current;

  const flashOpacity = useSharedValue(0);
  const flashColor = useRef<string>(colors.dispatch.answer);
  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const player = useVideoPlayer(resolveVideo(call.video), (p) => {
    p.loop = true;
    p.play();
  });

  useEffect(() => {
    audio.stopMusic();
  }, []);

  // Mute/pause the looping background video while the full-screen intro
  // cutscene is on top, so their audio doesn't clash; resume on dialogue.
  useEffect(() => {
    try {
      if (phase === "intro") {
        player.pause();
      } else {
        player.play();
      }
    } catch {}
  }, [phase]);

  // Dispatch countdown timer
  useEffect(() => {
    if (phase !== "dispatch") return;
    if (dispatchTimer <= 0) return;
    const t = setTimeout(() => setDispatchTimer((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [phase, dispatchTimer]);

  const allShown = visibleCount >= call.messages.length;

  const scrollSoon = () =>
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);

  const handleTap = () => {
    if (phase !== "dialogue") return;
    if (!allShown) {
      audio.playSfx("tap");
      Haptics.selectionAsync();
      setVisibleCount((v) => v + 1);
      scrollSoon();
    } else {
      audio.playSfx("tap");
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      dispatchStartTime.current = Date.now();
      setPhase("dispatch");
      scrollSoon();
    }
  };

  const handleDispatch = (choice: DispatchType) => {
    audio.playSfx("dispatch");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    const elapsed = (Date.now() - dispatchStartTime.current) / 1000;
    setChosenDispatch(choice);
    progress.recordResult(choice === call.correctDispatch, call.reward, elapsed);

    flashColor.current = colors.dispatch.cyan;
    flashOpacity.value = withSequence(
      withTiming(0.3, { duration: 80 }),
      withTiming(0, { duration: 300 })
    );

    setPhase("deploying");
  };

  const handleDeployComplete = () => {
    const correct = chosenDispatch === call.correctDispatch;
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

  const handleNextCall = () => {
    audio.playSfx("tap");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.replace("DispatchLobby");
  };

  const shiftLabel = `${progress.shiftProgress + 1}/${SHIFT_SIZE}`;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.liveDot} />
          <Text style={styles.callType}>{call.callType}</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.shiftPill}>
            <Text style={styles.shiftText}>SHIFT {shiftLabel}</Text>
          </View>
          <Text style={styles.location}>{call.location}</Text>
        </View>
      </View>

      <View style={styles.videoWrap}>
        <VideoView
          player={player}
          style={styles.video}
          contentFit="cover"
          nativeControls={false}
        />
        <View style={styles.callerTag}>
          <Text style={styles.callerTagText}>{call.callerName}</Text>
        </View>
        {call.difficulty && (
          <View style={styles.difficultyTag}>
            <Text style={styles.difficultyText}>
              {"⬥".repeat(call.difficulty)}
            </Text>
          </View>
        )}
      </View>

      <Pressable style={styles.chatArea} onPress={handleTap}>
        <ScrollView
          ref={scrollRef}
          style={styles.chatScroll}
          contentContainerStyle={styles.chatContent}
          showsVerticalScrollIndicator={false}
        >
          {visibleCount === 0 && phase === "dialogue" && (
            <Animated.View entering={FadeIn} style={styles.introWrap}>
              {isFirstCall && (
                <View style={styles.tutorialCard}>
                  <Text style={styles.tutorialTitle}>👋 WELCOME, OPERATOR</Text>
                  <Text style={styles.tutorialBody}>
                    Read the emergency, then send the right unit. Tap anywhere
                    to hear the caller.
                  </Text>
                </View>
              )}
              <Text style={styles.introText}>
                {isFirstCall
                  ? "Tap to begin…"
                  : "Tap to listen to the caller…"}
              </Text>
            </Animated.View>
          )}

          {call.messages.slice(0, visibleCount).map((msg, idx) => (
            <Animated.View
              key={idx}
              entering={FadeInDown.duration(240)}
              style={[
                styles.bubble,
                msg.sender === "caller"
                  ? styles.callerBubble
                  : styles.operatorBubble,
              ]}
            >
              <Text
                style={[
                  styles.senderLabel,
                  msg.sender === "caller"
                    ? styles.callerLabel
                    : styles.operatorLabel,
                ]}
              >
                {msg.sender === "caller" ? call.callerName : "You (Dispatch)"}
              </Text>
              <Text style={styles.bubbleText}>{msg.text}</Text>
            </Animated.View>
          ))}

          {phase === "dispatch" && (
            <Animated.View entering={FadeInDown} style={styles.dispatchSection}>
              <DispatchTimer seconds={dispatchTimer} />
              <Text style={styles.dispatchPrompt}>WHO DO YOU DISPATCH?</Text>
              {isFirstCall && (
                <Text style={styles.tutorialHint}>
                  💡 Match the emergency type to the unit
                </Text>
              )}
              <View style={styles.dispatchRow}>
                {DISPATCH_OPTIONS.map((opt) => (
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
              correctDispatch={call.correctDispatch}
              correctExplanation={call.correctExplanation}
              chosenDispatch={chosenDispatch ?? undefined}
            />
          )}
        </ScrollView>
      </Pressable>

      {phase === "dialogue" && (
        <View style={styles.bottomBar}>
          <Text style={styles.hintText}>
            {allShown ? "TAP TO DISPATCH ▸" : "TAP TO CONTINUE ▸"}
          </Text>
        </View>
      )}

      {phase === "result" && (
        <View style={styles.bottomBar}>
          <Pressable style={styles.nextCallBtn} onPress={handleNextCall}>
            <Text style={styles.nextCallText}>NEXT CALL ▸</Text>
          </Pressable>
        </View>
      )}

      {phase === "intro" && call.introVideo && (
        <View style={StyleSheet.absoluteFill}>
          <CutscenePlayer
            source={call.introVideo}
            caption={call.introCaption}
            tag={`INCOMING · ${call.location}`}
            onComplete={() => setPhase("dialogue")}
          />
        </View>
      )}

      {phase === "deploying" && chosenDispatch && (
        <View style={StyleSheet.absoluteFill}>
          <DispatchRadar
            location={call.location}
            unitIcon={
              DISPATCH_OPTIONS.find((o) => o.id === chosenDispatch)?.icon ??
              "🚔"
            }
            unitLabel={
              DISPATCH_OPTIONS.find((o) => o.id === chosenDispatch)
                ?.label.replace("\n", " ") ?? "UNIT"
            }
            callId={call.id}
            onComplete={handleDeployComplete}
          />
        </View>
      )}

      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: flashColor.current },
          flashStyle,
        ]}
      />
    </SafeAreaView>
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
    paddingVertical: sizes.spacing.sm,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  headerRight: {
    alignItems: "flex-end",
    gap: 3,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.dispatch.decline,
  },
  callType: {
    color: colors.dispatch.decline,
    fontSize: sizes.font.xs,
    fontWeight: "900",
    letterSpacing: 1,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  location: {
    color: colors.dispatch.textMuted,
    fontSize: sizes.font.xs,
    fontWeight: "600",
  },
  shiftPill: {
    backgroundColor: "rgba(34, 211, 238, 0.1)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  shiftText: {
    color: colors.dispatch.cyan,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  videoWrap: {
    height: VIDEO_HEIGHT,
    marginHorizontal: sizes.spacing.sm,
    borderRadius: sizes.radius.lg,
    borderWidth: 1,
    borderColor: colors.dispatch.border,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  video: {
    width: "100%",
    height: "100%",
  },
  callerTag: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: sizes.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  callerTagText: {
    color: "#fff",
    fontSize: sizes.font.xs,
    fontWeight: "700",
  },
  difficultyTag: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    borderRadius: sizes.radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  difficultyText: {
    color: colors.dispatch.amber,
    fontSize: 12,
    letterSpacing: 2,
  },
  chatArea: {
    flex: 1,
  },
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    padding: sizes.spacing.md,
    paddingBottom: sizes.spacing.xxl,
    gap: 10,
  },
  introWrap: {
    paddingVertical: sizes.spacing.xl,
    alignItems: "center",
  },
  introText: {
    color: colors.dispatch.textMuted,
    fontSize: sizes.font.md,
    fontStyle: "italic",
  },
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
  tutorialBody: {
    color: colors.dispatch.text,
    fontSize: sizes.font.sm,
    lineHeight: 19,
    textAlign: "center",
  },
  tutorialHint: {
    color: colors.dispatch.cyan,
    fontSize: sizes.font.sm,
    fontWeight: "700",
    textAlign: "center",
  },
  bubble: {
    maxWidth: "82%",
    borderRadius: sizes.radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
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
  senderLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 3,
    textTransform: "uppercase",
  },
  callerLabel: {
    color: colors.dispatch.amber,
  },
  operatorLabel: {
    color: colors.dispatch.cyan,
  },
  bubbleText: {
    color: colors.dispatch.text,
    fontSize: sizes.font.md,
    lineHeight: 21,
  },
  dispatchSection: {
    marginTop: sizes.spacing.md,
    alignItems: "center",
    gap: sizes.spacing.md,
  },
  dispatchPrompt: {
    color: colors.dispatch.amber,
    fontSize: sizes.font.lg,
    fontWeight: "900",
    letterSpacing: 2,
  },
  dispatchRow: {
    flexDirection: "row",
    gap: 12,
  },
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
  dispatchIcon: {
    fontSize: 32,
  },
  dispatchLabel: {
    color: colors.dispatch.text,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    textAlign: "center",
  },
  streakHint: {
    color: "#FF6B6B",
    fontSize: 12,
    fontWeight: "700",
  },
  bottomBar: {
    paddingVertical: sizes.spacing.md,
    alignItems: "center",
  },
  hintText: {
    color: colors.dispatch.textMuted,
    fontSize: sizes.font.sm,
    fontWeight: "700",
    letterSpacing: 1,
  },
  nextCallBtn: {
    backgroundColor: colors.dispatch.cyan,
    borderRadius: sizes.radius.md,
    paddingHorizontal: 32,
    paddingVertical: 14,
  },
  nextCallText: {
    color: "#0A0E1A",
    fontSize: sizes.font.md,
    fontWeight: "900",
    letterSpacing: 2,
  },
});
