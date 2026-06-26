import React from "react";
import { View, StyleSheet } from "react-native";
import { nodes, edges } from "../game/streetGraph";

type Props = {
  /** Canvas size in px; normalized 0..1 graph coords are scaled by this. */
  size: number;
};

/**
 * Draws the street graph faintly: each edge is a thin rotated rect (same trick
 * as the radar `trail`), each node a small dot at the intersection.
 */
export function RadarStreets({ size }: Props) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {edges.map(([aId, bId]) => {
        const a = nodes[aId];
        const b = nodes[bId];
        const ax = a.x * size;
        const ay = a.y * size;
        const dx = (b.x - a.x) * size;
        const dy = (b.y - a.y) * size;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        return (
          <View
            key={`${aId}-${bId}`}
            style={[
              styles.street,
              {
                left: ax,
                top: ay,
                width: length,
                transform: [{ rotate: `${angle}rad` }],
              },
            ]}
          />
        );
      })}

      {Object.values(nodes).map((n) => (
        <View
          key={n.id}
          style={[
            styles.node,
            { left: n.x * size - NODE_SIZE / 2, top: n.y * size - NODE_SIZE / 2 },
          ]}
        />
      ))}
    </View>
  );
}

const NODE_SIZE = 5;

const styles = StyleSheet.create({
  street: {
    position: "absolute",
    height: 2,
    backgroundColor: "rgba(34, 211, 238, 0.18)",
    transformOrigin: "left center",
  },
  node: {
    position: "absolute",
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    backgroundColor: "rgba(34, 211, 238, 0.35)",
  },
});
