import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

type Props = {
  /** Pixel position of the marked node; the pin tip points here. */
  x: number;
  y: number;
  icon: string;
  /** Bubble diameter in px (default 18). */
  size?: number;
  /** Accent color for the bubble/tip (default dispatch amber). */
  color?: string;
};

/** Tip height as a fraction of the bubble size. */
const TIP_RATIO = 0.45;

/**
 * A small map marker: a round bubble holding an icon with a downward tip whose
 * point sits exactly on (x, y). Size is parameterized so simulation pins can be
 * made smaller than the main objective.
 */
export function MapPin({ x, y, icon, size = 18, color = colors.dispatch.amber }: Props) {
  const tip = Math.round(size * TIP_RATIO);
  const totalH = size + tip;
  return (
    <View
      style={[styles.wrap, { left: x - size / 2, top: y - totalH, width: size }]}
      pointerEvents="none"
    >
      <View
        style={[
          styles.bubble,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderColor: color,
          },
        ]}
      >
        <Text style={{ fontSize: Math.round(size * 0.55) }}>{icon}</Text>
      </View>
      <View
        style={[
          styles.tip,
          {
            marginTop: -2,
            borderLeftWidth: tip * 0.6,
            borderRightWidth: tip * 0.6,
            borderTopWidth: tip,
            borderTopColor: color,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    alignItems: "center",
  },
  bubble: {
    backgroundColor: "rgba(10, 14, 26, 0.6)",
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  tip: {
    width: 0,
    height: 0,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
  },
});
