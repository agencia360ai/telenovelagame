/**
 * SkinAvatar — renders a 2D avatar skin image (generated in Layer AI).
 *
 * Skins are full-body 2:3 portraits, so:
 *   shape="portrait" → shows the whole standing figure (contain) — use in the
 *                      lobby viewport and the wardrobe preview.
 *   shape="circle"   → round bust crop (cover) — small thumbnails.
 *   shape="card"     → rounded square crop (cover).
 *
 * If a skin has no art registered yet (empty entry in SKIN_IMAGES) it draws a
 * styled placeholder using the skin's accent color.
 */
import React from "react";
import { View, Image, Text, StyleSheet } from "react-native";
import { resolveSkin } from "../game/assets";
import { getSkin } from "../game/skins";
import { colors } from "../theme/colors";

type Props = {
  skinId: string;
  size?: number;
  shape?: "circle" | "card" | "portrait";
  locked?: boolean;
  selected?: boolean;
};

export function SkinAvatar({
  skinId,
  size = 96,
  shape = "circle",
  locked = false,
  selected = false,
}: Props) {
  const skin = getSkin(skinId);
  const source = resolveSkin(skinId);
  const accent = skin?.accent ?? colors.dispatch.cyan;

  const isPortrait = shape === "portrait";
  const width = size;
  const height = isPortrait ? Math.round(size * 1.4) : size;
  const radius = shape === "circle" ? size / 2 : 16;
  const resizeMode = isPortrait ? "contain" : "cover";

  return (
    <View
      style={[
        styles.frame,
        {
          width,
          height,
          borderRadius: radius,
          borderColor: selected ? colors.dispatch.cyan : accent + "66",
          borderWidth: selected ? 3 : 2,
        },
      ]}
    >
      {source ? (
        <Image
          source={source}
          style={{ width: "100%", height: "100%", borderRadius: radius - 2 }}
          resizeMode={resizeMode}
        />
      ) : (
        <View
          style={[
            styles.placeholder,
            { backgroundColor: accent + "22", borderRadius: radius - 2 },
          ]}
        >
          <Text style={[styles.placeholderIcon, { fontSize: size * 0.34 }]}>
            {"👤"}
          </Text>
        </View>
      )}

      {locked && (
        <View style={[styles.lockOverlay, { borderRadius: radius - 2 }]}>
          <Text style={styles.lockIcon}>🔒</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: "hidden",
    backgroundColor: colors.dispatch.bg,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderIcon: {
    opacity: 0.85,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10, 14, 26, 0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  lockIcon: {
    fontSize: 22,
  },
});
