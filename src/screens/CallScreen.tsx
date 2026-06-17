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
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useVideoPlayer, VideoView } from "expo-video";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useDispatchProgress } from "../context/DispatchProgressContext";
import {
  getCallById,
  getDispatchLabel,
  DISPATCH_OPTIONS,
} from "../content/calls";
import { DispatchType } from "../game/types";
import { resolveVideo } from "../game/assets";
import { audio } from "../lib/audio";
import { colors } from "../theme/colors";
import { sizes } from "../theme/sizes";

type Props = NativeStackScreenProps<RootStackParamList, "Call">;

type Phase = "dialogue" | "dispatch" | "result";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const VIDEO_HEIGHT = SCREEN_HEIGHT * 0.38;

export function CallScreen({ navigation, route }: Props) {
  const { callId } = route.params;
  const call = getCallById(callId);
  const progress = useDispatchProgress();
  const scrollRef = useRef<ScrollView>(null);

  const [phase, setPhase] = useState<Phase>("dialogue");
  // Start empty — the first message only appears on the first tap.
  const [visibleCount, setVisibleCount] = useState(0);
  const [chosenDispatch, setChosenDispatch] = useState<DispatchType | null>(
    null
  );

  const player = useVideoPlayer(resolveVideo(call.video), (p) => {
    p.loop = true;
    p.play();
  });

  // The call's own audio (the scene) plays — pause any background music.
  useEffect(() => {
    audio.stopMusic();
  }, []);

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
      setPhase("dispatch");
      scrollSoon();
    }
  };

  const handleDispatch = (choice: DispatchType) => {
    audio.playSfx("dispatch");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const correct = choice === call.correctDispatch;
    setChosenDispatch(choice);
    progress.recordResult(correct, call.reward);
    setPhase("result");
    scrollSoon();

    setTimeout(() => {
      audio.playSfx(correct ? "success" : "fail");
      Haptics.notificationAsync(
        correct
          ? Haptics.NotificationFeedbackType.Success
          : Haptics.NotificationFeedbackType.Error
      );
    }, 250);

    setTimeout(() => {
      navigation.replace("DispatchLobby");
    }, 3000);
  };

  const isCorrect = chosenDispatch === call.correctDispatch;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.liveDot} />
          <Text style={styles.callType}>{call.callType}</Text>
        </View>
        <Text style={styles.location}>{call.location}</Text>
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
              <Text style={styles.introText}>
                Tap to listen to the caller…
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
              <Text style={styles.dispatchPrompt}>WHO DO YOU DISPATCH?</Text>
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
            </Animated.View>
          )}

          {phase === "result" && chosenDispatch != null && (
            <Animated.View
              entering={FadeInDown}
              style={[
                styles.resultBox,
                isCorrect ? styles.resultSuccess : styles.resultFail,
              ]}
            >
              <Text style={styles.resultEmoji}>{isCorrect ? "✓" : "✗"}</Text>
              <Text style={styles.resultTitle}>
                {isCorrect ? "CORRECT DISPATCH!" : "WRONG UNIT!"}
              </Text>
              <Text style={styles.resultSub}>
                {isCorrect
                  ? `+${call.reward} ★ earned`
                  : `Should have sent: ${getDispatchLabel(
                      call.correctDispatch
                    )}`}
              </Text>
            </Animated.View>
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
  },
  location: {
    color: colors.dispatch.textMuted,
    fontSize: sizes.font.xs,
    fontWeight: "600",
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

  chatArea: {
    flex: 1,
  },
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    padding: sizes.spacing.md,
    paddingBottom: sizes.spacing.xl,
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

  resultBox: {
    marginTop: sizes.spacing.md,
    borderRadius: sizes.radius.lg,
    padding: sizes.spacing.lg,
    alignItems: "center",
    gap: 6,
  },
  resultSuccess: {
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    borderWidth: 2,
    borderColor: colors.dispatch.answer,
  },
  resultFail: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    borderWidth: 2,
    borderColor: colors.dispatch.decline,
  },
  resultEmoji: {
    fontSize: 40,
    color: "#fff",
    fontWeight: "900",
  },
  resultTitle: {
    fontSize: sizes.font.xl,
    fontWeight: "900",
    color: "#fff",
    letterSpacing: 1,
  },
  resultSub: {
    fontSize: sizes.font.md,
    color: colors.dispatch.text,
    fontWeight: "600",
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
});
