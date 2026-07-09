import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { resolveVideo } from "../game/assets";
import { colors } from "../theme/colors";
import { sizes } from "../theme/sizes";

type Props = {
  /** A VIDEOS key, a raw URL, or a require() number. */
  source: string | number;
  /** Called when the clip ends, is skipped, errors, or hits the safety cap. */
  onComplete: () => void;
  /** Optional caption shown over the footer (e.g. "INCOMING — 742 Oak Ave"). */
  caption?: string;
  /** Small label top-left, e.g. "DISPATCH FEED". */
  tag?: string;
  /** Persistent establishing caption shown top-center (e.g. a time/place). */
  note?: string;
  /** Delay before the SKIP button appears. Default 1200ms. */
  allowSkipAfterMs?: number;
  /** Hard cap so a stalled stream never traps the player. Default 30s. */
  maxDurationMs?: number;
  /** Mute the clip (memory cinematics carry no dialogue). Default false. */
  muted?: boolean;
};

/**
 * Full-screen cinematic video used as a scene transition. Plays once, then
 * calls onComplete. Built defensively for streaming on real devices:
 *  - a SKIP button (player autonomy — SDT) appears shortly after start
 *  - a loading state covers buffering instead of a black screen
 *  - on a playback error or a max-duration timeout it finishes gracefully,
 *    so the player is never stuck on a cutscene that won't load.
 */
export function CutscenePlayer({
  source,
  onComplete,
  caption,
  tag,
  note,
  allowSkipAfterMs = 1200,
  maxDurationMs = 30000,
  muted = false,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [canSkip, setCanSkip] = useState(false);
  const done = useRef(false);

  const player = useVideoPlayer(resolveVideo(source), (p) => {
    p.loop = false;
    p.muted = muted;
    p.play();
  });

  const finish = () => {
    if (done.current) return;
    done.current = true;
    onComplete();
  };

  useEffect(() => {
    const subs = [
      player.addListener("playToEnd", finish),
      player.addListener("statusChange", (payload: any) => {
        const status = payload?.status ?? payload;
        if (status === "readyToPlay") setLoading(false);
        if (status === "error") finish();
      }),
      player.addListener("playingChange", (payload: any) => {
        const isPlaying =
          typeof payload === "boolean" ? payload : payload?.isPlaying;
        if (isPlaying) setLoading(false);
      }),
    ];

    const skipTimer = setTimeout(() => setCanSkip(true), allowSkipAfterMs);
    const maxTimer = setTimeout(finish, maxDurationMs);

    return () => {
      subs.forEach((s) => {
        try {
          s?.remove?.();
        } catch {}
      });
      clearTimeout(skipTimer);
      clearTimeout(maxTimer);
    };
  }, []);

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(250)}
      style={styles.container}
    >
      <VideoView
        player={player}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Cinematic letterbox bars + vignette for the "film" feel */}
      <View pointerEvents="none" style={styles.barTop} />
      <View pointerEvents="none" style={styles.barBottom} />

      {tag ? (
        <View style={styles.tagWrap}>
          <View style={styles.recDot} />
          <Text style={styles.tagText}>{tag}</Text>
        </View>
      ) : null}

      {note ? (
        <View pointerEvents="none" style={styles.noteWrap}>
          <Text style={styles.noteText}>{note}</Text>
        </View>
      ) : null}

      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.dispatch.cyan} size="large" />
          <Text style={styles.loadingText}>CONNECTING FEED…</Text>
        </View>
      )}

      {caption ? (
        <View style={styles.captionWrap}>
          <Text style={styles.caption}>{caption}</Text>
        </View>
      ) : null}

      {canSkip && (
        <Pressable style={styles.skipBtn} onPress={finish} hitSlop={12}>
          <Text style={styles.skipText}>SKIP ▸</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

const BAR_HEIGHT = 48;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
    justifyContent: "center",
  },
  barTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: BAR_HEIGHT,
    backgroundColor: "#000",
  },
  barBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: BAR_HEIGHT,
    backgroundColor: "#000",
  },
  tagWrap: {
    position: "absolute",
    top: BAR_HEIGHT + 14,
    left: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  recDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: colors.dispatch.decline,
  },
  tagText: {
    color: "#fff",
    fontSize: sizes.font.xs,
    fontWeight: "900",
    letterSpacing: 2,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  noteWrap: {
    position: "absolute",
    top: BAR_HEIGHT + 18,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  noteText: {
    color: "#fff",
    fontSize: sizes.font.sm,
    fontWeight: "700",
    fontStyle: "italic",
    letterSpacing: 3,
    opacity: 0.85,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  loadingWrap: {
    alignSelf: "center",
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    color: colors.dispatch.cyan,
    fontSize: sizes.font.sm,
    fontWeight: "800",
    letterSpacing: 2,
  },
  captionWrap: {
    position: "absolute",
    bottom: BAR_HEIGHT + 18,
    left: 18,
    right: 18,
  },
  caption: {
    color: "#fff",
    fontSize: sizes.font.md,
    fontWeight: "700",
    letterSpacing: 0.5,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  skipBtn: {
    position: "absolute",
    bottom: BAR_HEIGHT - 6,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  skipText: {
    color: "#fff",
    fontSize: sizes.font.sm,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
});
