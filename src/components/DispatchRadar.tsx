import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withDelay,
  Easing,
  FadeIn,
} from "react-native-reanimated";
import { colors } from "../theme/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const RADAR_SIZE = Math.min(SCREEN_WIDTH - 64, 300);
const CENTER = RADAR_SIZE / 2;
const RINGS = [0.25, 0.5, 0.75, 1];

type Props = {
  location: string;
  unitIcon: string;
  unitLabel: string;
  callId: string;
  onComplete: () => void;
};

function callCoords(id: string): { x: number; y: number } {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash + id.charCodeAt(i)) | 0;
  }
  const x = ((hash & 0xff) / 255) * 0.5 + 0.25;
  const y = (((hash >> 8) & 0xff) / 255) * 0.5 + 0.25;
  return { x, y };
}

export function DispatchRadar({
  location,
  unitIcon,
  unitLabel,
  callId,
  onComplete,
}: Props) {
  const coords = useRef(callCoords(callId)).current;
  const targetX = coords.x * RADAR_SIZE;
  const targetY = coords.y * RADAR_SIZE;
  const dx = targetX - CENTER;
  const dy = targetY - CENTER;

  const unitTX = useSharedValue(0);
  const unitTY = useSharedValue(0);
  const blipScale = useSharedValue(1);
  const scanY = useSharedValue(0);
  const arrivedOpacity = useSharedValue(0);
  const trailOpacity = useSharedValue(0);

  useEffect(() => {
    blipScale.value = withRepeat(
      withSequence(
        withTiming(1.6, { duration: 500, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 500, easing: Easing.in(Easing.ease) })
      ),
      -1,
      false
    );

    scanY.value = withRepeat(
      withTiming(RADAR_SIZE, { duration: 2200, easing: Easing.linear }),
      -1,
      false
    );

    trailOpacity.value = withDelay(
      300,
      withTiming(0.6, { duration: 200 })
    );

    unitTX.value = withDelay(
      500,
      withTiming(dx, { duration: 1200, easing: Easing.inOut(Easing.cubic) })
    );
    unitTY.value = withDelay(
      500,
      withTiming(dy, { duration: 1200, easing: Easing.inOut(Easing.cubic) })
    );

    arrivedOpacity.value = withDelay(1800, withTiming(1, { duration: 300 }));

    const timer = setTimeout(onComplete, 2400);
    return () => clearTimeout(timer);
  }, []);

  const unitStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: unitTX.value },
      { translateY: unitTY.value },
    ],
  }));

  const blipAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: blipScale.value }],
  }));

  const scanStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanY.value }],
  }));

  const arrivedStyle = useAnimatedStyle(() => ({
    opacity: arrivedOpacity.value,
  }));

  const trailStyle = useAnimatedStyle(() => ({
    opacity: trailOpacity.value,
  }));

  return (
    <Animated.View entering={FadeIn.duration(250)} style={styles.container}>
      <Text style={styles.headerLabel}>DEPLOYING UNIT</Text>
      <View style={styles.unitRow}>
        <Text style={styles.unitIcon}>{unitIcon}</Text>
        <Text style={styles.unitLabel}>{unitLabel}</Text>
      </View>

      <View style={styles.radarOuter}>
        <View style={styles.radar}>
          {RINGS.map((r) => {
            const size = RADAR_SIZE * r;
            return (
              <View
                key={r}
                style={[
                  styles.ring,
                  {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    left: CENTER - size / 2,
                    top: CENTER - size / 2,
                  },
                ]}
              />
            );
          })}

          <View
            style={[styles.crossH, { top: CENTER - 0.5, width: RADAR_SIZE }]}
          />
          <View
            style={[styles.crossV, { left: CENTER - 0.5, height: RADAR_SIZE }]}
          />

          <Animated.View
            style={[styles.scanLine, { width: RADAR_SIZE }, scanStyle]}
          />

          <Animated.View
            style={[
              styles.trail,
              {
                left: CENTER,
                top: CENTER,
                width: Math.sqrt(dx * dx + dy * dy),
                transform: [
                  { rotate: `${Math.atan2(dy, dx)}rad` },
                ],
              },
              trailStyle,
            ]}
          />

          <Animated.View
            style={[
              styles.blip,
              { left: targetX - 8, top: targetY - 8 },
              blipAnimStyle,
            ]}
          />

          <View
            style={[styles.centerDot, { left: CENTER - 3, top: CENTER - 3 }]}
          />

          <Animated.View
            style={[
              styles.unitDot,
              { left: CENTER - 16, top: CENTER - 16 },
              unitStyle,
            ]}
          >
            <Text style={styles.unitDotEmoji}>{unitIcon}</Text>
          </Animated.View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.locationLabel}>
          TO: {location.toUpperCase()}
        </Text>
        <Animated.Text style={[styles.arrivedText, arrivedStyle]}>
          UNIT ON SCENE
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#050810",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 32,
  },
  headerLabel: {
    color: colors.dispatch.cyan,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 4,
  },
  unitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  unitIcon: {
    fontSize: 28,
  },
  unitLabel: {
    color: colors.dispatch.text,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1,
  },
  radarOuter: {
    borderRadius: RADAR_SIZE / 2 + 4,
    borderWidth: 2,
    borderColor: "rgba(34, 211, 238, 0.25)",
    padding: 3,
    backgroundColor: "rgba(34, 211, 238, 0.03)",
  },
  radar: {
    width: RADAR_SIZE,
    height: RADAR_SIZE,
    borderRadius: RADAR_SIZE / 2,
    overflow: "hidden",
    backgroundColor: "rgba(10, 14, 26, 0.95)",
  },
  ring: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "rgba(34, 211, 238, 0.1)",
  },
  crossH: {
    position: "absolute",
    left: 0,
    height: 1,
    backgroundColor: "rgba(34, 211, 238, 0.08)",
  },
  crossV: {
    position: "absolute",
    top: 0,
    width: 1,
    backgroundColor: "rgba(34, 211, 238, 0.08)",
  },
  scanLine: {
    position: "absolute",
    left: 0,
    top: 0,
    height: 2,
    backgroundColor: "rgba(34, 211, 238, 0.15)",
  },
  trail: {
    position: "absolute",
    height: 1,
    backgroundColor: colors.dispatch.cyan,
    transformOrigin: "left center",
  },
  blip: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(245, 158, 11, 0.4)",
    borderWidth: 2,
    borderColor: colors.dispatch.amber,
  },
  centerDot: {
    position: "absolute",
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.dispatch.cyan,
  },
  unitDot: {
    position: "absolute",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(34, 211, 238, 0.2)",
    borderWidth: 1,
    borderColor: colors.dispatch.cyan,
    justifyContent: "center",
    alignItems: "center",
  },
  unitDotEmoji: {
    fontSize: 16,
  },
  footer: {
    alignItems: "center",
    gap: 8,
  },
  locationLabel: {
    color: colors.dispatch.amber,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    textShadowColor: "rgba(245, 158, 11, 0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  arrivedText: {
    color: colors.dispatch.answer,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 3,
    textShadowColor: "rgba(34, 197, 94, 0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});
