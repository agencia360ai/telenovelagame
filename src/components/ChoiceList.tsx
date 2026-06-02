import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Choice } from "../lib/engine/types";
import { colors } from "../theme/colors";
import { sizes } from "../theme/sizes";

type Props = {
  prompt: string;
  choices: Choice[];
  gems: number;
  onSelect: (choice: Choice) => void;
};

export function ChoiceList({ prompt, choices, gems, onSelect }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>{prompt}</Text>
      {choices.map((choice) => {
        const canAfford = gems >= (choice.gem_cost ?? 0);
        const isPremium = (choice.gem_cost ?? 0) > 0;

        return (
          <TouchableOpacity
            key={choice.id}
            style={[
              styles.choiceButton,
              isPremium && styles.premiumButton,
              isPremium && !canAfford && styles.lockedButton,
            ]}
            onPress={() => onSelect(choice)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.choiceText,
                isPremium && !canAfford && styles.lockedText,
              ]}
            >
              {choice.label}
            </Text>
            {isPremium && (
              <Text style={[styles.gemCost, !canAfford && styles.lockedText]}>
                {choice.gem_cost} {"💎"}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: sizes.spacing.md,
    gap: sizes.spacing.sm,
  },
  prompt: {
    fontSize: sizes.font.md,
    color: colors.text.secondary,
    textAlign: "center",
    marginBottom: sizes.spacing.sm,
    fontStyle: "italic",
  },
  choiceButton: {
    backgroundColor: colors.bg.card,
    borderRadius: sizes.radius.md,
    paddingVertical: sizes.spacing.md,
    paddingHorizontal: sizes.spacing.lg,
    borderWidth: 1,
    borderColor: colors.accent.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: sizes.spacing.sm,
  },
  premiumButton: {
    borderColor: colors.accent.gem,
    backgroundColor: colors.bg.secondary,
  },
  lockedButton: {
    opacity: 0.6,
    borderColor: colors.ui.border,
  },
  choiceText: {
    fontSize: sizes.font.md,
    color: colors.text.primary,
    fontWeight: "600",
    textAlign: "center",
    flex: 1,
  },
  lockedText: {
    color: colors.text.muted,
  },
  gemCost: {
    fontSize: sizes.font.sm,
    color: colors.accent.gem,
    fontWeight: "700",
  },
});
