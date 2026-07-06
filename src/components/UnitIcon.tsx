import React from "react";
import { Text, Image, StyleSheet } from "react-native";
import { resolveUnitIcon } from "../game/assets";

/**
 * Dispatch unit icon — renders the cel-shaded vehicle image registered in
 * UNIT_ICON_IMAGES (src/game/assets.ts), falling back to the emoji while a
 * unit has no art yet. Drop-in replacement for the old emoji <Text>.
 */
export function UnitIcon({
  kind,
  emoji,
  size = 22,
}: {
  /** Fleet unit id, e.g. "police". */
  kind: string;
  /** Emoji fallback shown until the unit has image art. */
  emoji: string;
  /** Square icon size in px (emoji fallback scales to match). */
  size?: number;
}) {
  const source = resolveUnitIcon(kind);
  if (source) {
    return (
      <Image
        source={source}
        style={[styles.img, { width: size, height: size }]}
        resizeMode="contain"
      />
    );
  }
  return <Text style={{ fontSize: size * 0.82 }}>{emoji}</Text>;
}

const styles = StyleSheet.create({
  img: {},
});
