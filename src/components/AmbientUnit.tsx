import React, { useEffect, useRef } from "react";
import { Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
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
  /** ms per normalized distance unit (1.0 = full canvas width). */
  speed: number;
  /** Keep moving forever (pick a new destination on arrival). */
  loop: boolean;
};

const DOT = 26;

/**
 * A single unit that walks the street graph in straight, segment-by-segment
 * lines. Each segment is a linear `withTiming` whose duration is proportional
 * to its length, so visual speed stays roughly constant. Because every position
 * is a linear blend of two adjacent nodes, the unit can never cut across a block.
 */
export function AmbientUnit({ size, icon, speed, loop }: Props) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  // Mutable route state lives in a ref (driven from JS, not the UI thread).
  const route = useRef<string[]>([]);
  const segIndex = useRef(0);

  useEffect(() => {
    // Spawn instantly on a random node, then head somewhere else.
    const start = randomNodeId();
    const startNode = nodes[start];
    tx.value = startNode.x * size;
    ty.value = startNode.y * size;
    planNewRoute(start);

    return () => {
      cancelAnimation(tx);
      cancelAnimation(ty);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function planNewRoute(from: string) {
    const to = randomDifferentNodeId(from);
    const path = shortestPath(from, to);
    // Fall back to a fresh start if the graph ever returns nothing.
    route.current = path.length >= 2 ? path : [from, randomDifferentNodeId(from)];
    segIndex.current = 0;
    moveToNextNode();
  }

  function moveToNextNode() {
    const next = route.current[segIndex.current + 1];
    if (next == null) {
      // Reached the destination.
      if (loop) {
        planNewRoute(route.current[route.current.length - 1]);
      }
      return;
    }

    const fromNode = nodes[route.current[segIndex.current]];
    const toNode = nodes[next];
    const duration = Math.max(150, dist(fromNode, toNode) * speed);

    tx.value = withTiming(toNode.x * size, {
      duration,
      easing: Easing.linear,
    });
    ty.value = withTiming(
      toNode.y * size,
      { duration, easing: Easing.linear },
      (finished) => {
        if (finished) {
          runOnJS(advanceSegment)();
        }
      }
    );
  }

  function advanceSegment() {
    segIndex.current += 1;
    moveToNextNode();
  }

  const style = useAnimatedStyle(() => ({
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
