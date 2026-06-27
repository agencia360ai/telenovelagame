import React, { useEffect } from "react";
import { Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withRepeat,
  cancelAnimation,
  runOnJS,
  interpolate,
  Easing,
} from "react-native-reanimated";
import {
  nodes,
  dist,
  shortestPath,
  randomNodeId,
  randomDifferentNodeId,
} from "../game/streetGraph";
import { colors } from "../theme/colors";

type Props = {
  /** Canvas size in px; normalized 0..1 graph coords are scaled by this. */
  size: number;
  icon: string;
  /** ms per normalized distance unit (1.0 = full canvas width). Higher = slower. */
  speed: number;
  /** When set, the unit spawns exactly on this node (instead of a random one). */
  startId?: string;
  /** When set, the unit routes to this node once and stops (ignores `loop`). */
  targetId?: string;
  /** Keep wandering forever (only used when there is no fixed target). */
  loop?: boolean;
  /** Small constant px offset so units sharing a node/destination don't overlap. */
  offset?: { x: number; y: number };
};

const DOT = 26;
const RING = 30;

/**
 * A single unit that walks the street graph in straight, segment-by-segment
 * lines. The whole route is one `withSequence` per axis (tx/ty share each
 * segment's duration), so both axes advance in lockstep and the unit stays
 * exactly on each axis-aligned street segment — no diagonals.
 *
 * With a `targetId` it drives once to that node and stops, playing a subtle
 * radar "ping" (an expanding ring x2) and settling into a faint steady glow.
 */
export function AmbientUnit({
  size,
  icon,
  speed,
  startId,
  targetId,
  loop,
  offset,
}: Props) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const opacity = useSharedValue(0); // avoid a one-frame flash at the (0,0) corner

  // Arrival ping + steady glow.
  const ringScale = useSharedValue(0.6);
  const ringOpacity = useSharedValue(0);
  const glow = useSharedValue(0);

  const offX = offset?.x ?? 0;
  const offY = offset?.y ?? 0;

  useEffect(() => {
    // Spawn instantly on the given node, else a node away from the target.
    const start =
      startId ??
      (targetId != null ? randomDifferentNodeId(targetId) : randomNodeId());
    const startNode = nodes[start];
    tx.value = startNode.x * size;
    ty.value = startNode.y * size;
    opacity.value = 1;
    startRouteFrom(start);

    return () => {
      cancelAnimation(tx);
      cancelAnimation(ty);
      cancelAnimation(ringScale);
      cancelAnimation(ringOpacity);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startRouteFrom(from: string) {
    const to = targetId ?? randomDifferentNodeId(from);
    const path = shortestPath(from, to);
    if (path.length < 2) {
      if (targetId == null && loop) startRouteFrom(from);
      return;
    }

    // One timed step per segment; tx and ty steps share the same duration so
    // both axes finish each segment together (always L-shaped, never diagonal).
    const xSteps = [];
    const ySteps = [];
    const lastId = path[path.length - 1];
    for (let i = 1; i < path.length; i++) {
      const a = nodes[path[i - 1]];
      const b = nodes[path[i]];
      const duration = Math.max(150, dist(a, b) * speed);
      const isLast = i === path.length - 1;
      xSteps.push(withTiming(b.x * size, { duration, easing: Easing.linear }));
      ySteps.push(
        withTiming(
          b.y * size,
          { duration, easing: Easing.linear },
          isLast
            ? (finished) => {
                "worklet";
                if (!finished) return;
                if (targetId != null) {
                  runOnJS(triggerArrival)();
                } else if (loop) {
                  runOnJS(startRouteFrom)(lastId);
                }
              }
            : undefined
        )
      );
    }

    tx.value = withSequence(...xSteps);
    ty.value = withSequence(...ySteps);
  }

  // Subtle radar ping on arrival: an expanding ring that fades, twice, then a
  // faint steady glow to mark the unit as "on scene".
  function triggerArrival() {
    ringScale.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 0 }),
        withTiming(2.2, { duration: 1000, easing: Easing.out(Easing.ease) })
      ),
      2,
      false
    );
    ringOpacity.value = withRepeat(
      withSequence(
        withTiming(0.5, { duration: 0 }),
        withTiming(0, { duration: 1000, easing: Easing.out(Easing.ease) })
      ),
      2,
      false
    );
    glow.value = withTiming(1, { duration: 500 });
  }

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: tx.value - DOT / 2 + offX },
      { translateY: ty.value - DOT / 2 + offY },
    ],
  }));

  const unitInnerStyle = useAnimatedStyle(() => ({
    backgroundColor: `rgba(34, 211, 238, ${interpolate(glow.value, [0, 1], [0.18, 0.32])})`,
    borderColor: `rgba(34, 211, 238, ${interpolate(glow.value, [0, 1], [0.6, 1])})`,
  }));

  const ringStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ scale: ringScale.value }],
  }));

  return (
    <Animated.View style={[styles.wrap, style]}>
      <Animated.View style={[styles.ring, ringStyle]} />
      <Animated.View style={[styles.unit, unitInnerStyle]}>
        <Text style={styles.icon}>{icon}</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    top: 0,
    width: DOT,
    height: DOT,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 2,
    borderColor: colors.dispatch.cyan,
  },
  unit: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: "rgba(34, 211, 238, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(34, 211, 238, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  icon: {
    fontSize: 14,
  },
});
