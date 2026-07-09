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
  /** Up to three VIDEOS keys / URLs / require() numbers, played back to back. */
  sources: (string | number)[];
  /** Called once the whole sequence finishes (or is skipped through). */
  onComplete: () => void;
  /** Mute every clip (memory cinematics carry no dialogue). */
  muted?: boolean;
  /** Persistent caption shown at the top across the whole sequence. */
  note?: string;
};

const BAR_HEIGHT = 48;

/**
 * Plays up to three clips one after another with NO buffering between them:
 * every clip's player is created at mount, so they all buffer in parallel and
 * switching to the next one is instant. Each clip can be skipped individually.
 */
export function CutsceneSequence({
  sources,
  onComplete,
  muted = false,
  note,
}: Props) {
  const setup = (p: any) => {
    p.loop = false;
    p.muted = muted;
  };
  // Fixed hook count (three) — the intro sequence is three clips. Empty slots
  // reuse clip 0 so the hooks always receive a valid source.
  const p0 = useVideoPlayer(resolveVideo(sources[0]), setup);
  const p1 = useVideoPlayer(resolveVideo(sources[1] ?? sources[0]), setup);
  const p2 = useVideoPlayer(resolveVideo(sources[2] ?? sources[0]), setup);
  const players = [p0, p1, p2];

  const [i, setI] = useState(0);
  const [loading, setLoading] = useState(true);
  const [canSkip, setCanSkip] = useState(false);
  const done = useRef(false);

  const finishAll = () => {
    if (done.current) return;
    done.current = true;
    onComplete();
  };
  const advance = () => {
    if (i + 1 < Math.min(sources.length, 3)) setI(i + 1);
    else finishAll();
  };

  useEffect(() => {
    const cur = players[Math.min(i, 2)];
    setLoading(true);
    try {
      cur.currentTime = 0;
      cur.play();
    } catch {}
    const subs = [
      cur.addListener("playToEnd", advance),
      cur.addListener("playingChange", (payload: any) => {
        const playing =
          typeof payload === "boolean" ? payload : payload?.isPlaying;
        if (playing) setLoading(false);
      }),
      cur.addListener("statusChange", (payload: any) => {
        const status = payload?.status ?? payload;
        if (status === "readyToPlay") setLoading(false);
        if (status === "error") advance();
      }),
    ];
    const cap = setTimeout(advance, 25000);
    const skip = setTimeout(() => setCanSkip(true), 900);
    return () => {
      subs.forEach((s) => {
        try {
          (s as any)?.remove?.();
        } catch {}
      });
      clearTimeout(cap);
      clearTimeout(skip);
      try {
        cur.pause();
      } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      exiting={FadeOut.duration(250)}
      style={styles.container}
    >
      <VideoView
        player={players[Math.min(i, 2)]}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        nativeControls={false}
      />

      <View pointerEvents="none" style={styles.barTop} />
      <View pointerEvents="none" style={styles.barBottom} />

      {note ? (
        <View pointerEvents="none" style={styles.noteWrap}>
          <Text style={styles.noteText}>{note}</Text>
        </View>
      ) : null}

      {loading && (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.dispatch.cyan} size="large" />
        </View>
      )}

      {canSkip && (
        <Pressable style={styles.skipBtn} onPress={advance} hitSlop={12}>
          <Text style={styles.skipText}>SKIP ▸</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}

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
