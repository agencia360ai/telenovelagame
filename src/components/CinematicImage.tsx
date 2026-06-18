import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ImageBackground,
  ImageSourcePropType,
} from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { colors } from "../theme/colors";
import { sizes } from "../theme/sizes";

const AnimatedImageBackground =
  Animated.createAnimatedComponent(ImageBackground);

type Props = {
  /** A bundled require() number or a remote URL string. */
  source: number | string;
  /** Called on tap or when the auto-advance timer elapses. */
  onComplete: () => void;
  /** Big headline, e.g. "PROMOTED". */
  title?: string;
  /** Subtitle under the title / bottom caption. */
  caption?: string;
  /** Small label top-left, e.g. "DISPATCH CENTER". */
  tag?: string;
  /** Auto-advance delay. Default 3800ms. Pass 0 to disable auto-advance. */
  durationMs?: number;
  /** Bottom CTA label. Default "TAP TO CONTINUE ▸". */
  cta?: string;
};

/**
 * Full-screen still used as a cinematic placeholder until a real video clip
 * exists. A slow Ken Burns zoom keeps a static image feeling alive, with the
 * same letterbox/caption "film" treatment as CutscenePlayer so the two are
 * visually interchangeable. Tap anywhere (or wait) to continue.
 */
export function CinematicImage({
  source,
  onComplete,
  title,
  caption,
  tag,
  durationMs = 3800,
  cta = "TAP TO CONTINUE ▸",
}: Props) {
  const [hint, setHint] = useState(false);
  const [failed, setFailed] = useState(false);
  const done = useRef(false);
  const zoom = useSharedValue(1);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    onComplete();
  };

  useEffect(() => {
    // Ken Burns: drift-zoom over the full beat for a filmic feel.
    zoom.value = withTiming(1.12, {
      duration: Math.max(durationMs, 4000),
      easing: Easing.out(Easing.quad),
    });
    const hintTimer = setTimeout(() => setHint(true), 900);
    const advance =
      durationMs > 0 ? setTimeout(finish, durationMs) : undefined;
    return () => {
      clearTimeout(hintTimer);
      if (advance) clearTimeout(advance);
    };
  }, []);

  const imgStyle = useAnimatedStyle(() => ({
    transform: [{ scale: zoom.value }],
  }));

  const imageSource: ImageSourcePropType =
    typeof source === "number" ? source : { uri: source };

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      exiting={FadeOut.duration(300)}
      style={styles.container}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={finish}>
        {failed ? (
          // Themed title-card fallback so a missing/blocked image never shows
          // as a broken picture — it reads as an intentional cinematic card.
          <Animated.View style={[StyleSheet.absoluteFill, imgStyle, styles.fallback]}>
            <View pointerEvents="none" style={styles.fallbackGlow} />
            <Text style={styles.fallbackBadge}>911</Text>
          </Animated.View>
        ) : (
          <AnimatedImageBackground
            source={imageSource}
            style={[StyleSheet.absoluteFill, imgStyle]}
            resizeMode="cover"
            onError={() => setFailed(true)}
          >
            {/* Bottom scrim so text stays readable over any image */}
            <View pointerEvents="none" style={styles.scrim} />
          </AnimatedImageBackground>
        )}

        {/* Cinematic letterbox bars (above either layer) */}
        <View pointerEvents="none" style={styles.barTop} />
        <View pointerEvents="none" style={styles.barBottom} />

        {tag ? (
          <View style={styles.tagWrap}>
            <View style={styles.recDot} />
            <Text style={styles.tagText}>{tag}</Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {caption ? <Text style={styles.caption}>{caption}</Text> : null}
          {hint ? <Text style={styles.cta}>{cta}</Text> : null}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const BAR_HEIGHT = 44;

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
    borderBottomWidth: 260,
    borderBottomColor: "rgba(0,0,0,0.55)",
  },
  fallback: {
    backgroundColor: colors.dispatch.bg,
    justifyContent: "center",
    alignItems: "center",
  },
  fallbackGlow: {
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(34, 211, 238, 0.08)",
  },
  fallbackBadge: {
    position: "absolute",
    color: "rgba(34, 211, 238, 0.25)",
    fontSize: 120,
    fontWeight: "900",
    letterSpacing: 4,
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
  footer: {
    position: "absolute",
    bottom: BAR_HEIGHT + 22,
    left: 20,
    right: 20,
    gap: 6,
  },
  title: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 2,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
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
  cta: {
    color: colors.dispatch.cyan,
    fontSize: sizes.font.sm,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginTop: 6,
  },
});
