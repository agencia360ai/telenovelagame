import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { RANKS } from "../game/ranks";
import { colors } from "../theme/colors";

type Props = {
  rankIndex: number;
  size?: "small" | "large";
};

export function RankBadge({ rankIndex, size = "small" }: Props) {
  const rank = RANKS[rankIndex] ?? RANKS[0];
  const isLarge = size === "large";

  return (
    <View style={[styles.badge, isLarge && styles.badgeLarge]}>
      <Text style={[styles.icon, isLarge && styles.iconLarge]}>
        {rank.icon}
      </Text>
      <Text
        style={[styles.name, isLarge && styles.nameLarge]}
        numberOfLines={1}
      >
        {rank.name.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(34, 211, 238, 0.1)",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(34, 211, 238, 0.2)",
  },
  badgeLarge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 6,
  },
  icon: {
    fontSize: 12,
  },
  iconLarge: {
    fontSize: 20,
  },
  name: {
    color: colors.dispatch.cyan,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  nameLarge: {
    fontSize: 13,
  },
});
