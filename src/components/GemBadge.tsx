import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors } from "../theme/colors";
import { sizes } from "../theme/sizes";
import { useEconomy } from "../context/EconomyContext";

type Props = {
  onPress?: () => void;
};

export function GemBadge({ onPress }: Props) {
  const { gems } = useEconomy();

  const content = (
    <View style={styles.container}>
      <Text style={styles.icon}>{"💎"}</Text>
      <Text style={styles.count}>{gems}</Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.bg.card,
    borderRadius: sizes.radius.full,
    paddingVertical: sizes.spacing.xs,
    paddingHorizontal: sizes.spacing.md,
    borderWidth: 1,
    borderColor: colors.accent.gem,
    gap: 4,
  },
  icon: {
    fontSize: sizes.font.md,
  },
  count: {
    fontSize: sizes.font.md,
    fontWeight: "700",
    color: colors.text.primary,
  },
});
