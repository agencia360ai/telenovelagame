import React, { useEffect } from "react";
import { Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  cancelAnimation,
  runOnJS,
  Easing,
} from "react-native-reanimated";
import {
  nodes,
  dist,
  shortestPath,
  randomNodeId,
  randomDifferentNodeId,
} from "../game/streetGraph";

type Props = {
  /** Canvas size in px; normalized 0..1 graph coords are scaled by this. */
  size: number;
  icon: string;
  /** ms per normalized distance unit (1.0 = full canvas width). Higher = slower. */
  speed: number;
  /** Keep moving forever (pick a new destination on arrival). */
  loop: boolean;
};

const DOT = 26;

/**
 * A single unit that walks the street graph in straight, segment-by-segment
 * lines. The whole route is animated as one `withSequence` per axis, with both
 * axes sharing the same per-segment duration, so they advance in lockstep and
 * the unit stays exactly on each (axis-aligned) street segment — no diagonals
 * and no teleports between segments.
 */
export function AmbientUnit({ size, icon, speed, loop }: Props) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const opacity = useSharedValue(0); // avoid a one-frame flash at the (0,0) corner

  useEffect(() => {
    // Spawn instantly on a random node, then head somewhere else.
    const start = randomNodeId();
    const startNode = nodes[start];
    tx.value = startNode.x * size;
    ty.value = startNode.y * size;
    opacity.value = 1;
    startRouteFrom(start);

    return () => {
      cancelAnimation(tx);
      cancelAnimation(ty);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startRouteFrom(from: string) {
    const to = randomDifferentNodeId(from);
    const path = shortestPath(from, to);
    if (path.length < 2) {
      // Shouldn't happen on a connected graph; just try again from here.
      if (loop) startRouteFrom(from);
      return;
    }

    // One timed step per segment. tx and ty steps share the same duration, so
    // both axes finish each segment together. Each segment is purely horizontal
    // or vertical (grid edges), so the moving axis interpolates while the other
    // holds — the path is always L-shaped, never diagonal.
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
                if (finished && loop) {
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

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: tx.value - DOT / 2 },
      { translateY: ty.value - DOT / 2 },
    ],
  }));

  return (
    <Animated.View style={[styles.unit, style]}>
      <Text style={styles.icon}>{icon}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  unit: {
    position: "absolute",
    left: 0,
    top: 0,
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
