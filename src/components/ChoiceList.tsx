import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
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
  const promptOpacity = useSharedValue(0);

  useEffect(() => {
    promptOpacity.value = withTiming(1, { duration: 300 });
  }, []);

  const promptStyle = useAnimatedStyle(() => ({
    opacity: promptOpacity.value,
  }));

  const handleSelect = (choice: Choice) => {
    if (Platform.OS !== "web") {
      const isPremium = (choice.gem_cost ?? 0) > 0;
      Haptics.impactAsync(
        isPremium
          ? Haptics.ImpactFeedbackStyle.Heavy
          : Haptics.ImpactFeedbackStyle.Medium
      );
    }
    onSelect(choice);
  };

  return (
    <View style={styles.container}>
      <Animated.Text style={[styles.prompt, promptStyle]}>
        {prompt}
      </Animated.Text>
      {choices.map((choice, idx) => (
        <ChoiceButton
          key={choice.id}
          choice={choice}
          gems={gems}
          index={idx}
          onSelect={handleSelect}
        />
      ))}
    </View>
  );
}

function ChoiceButton({
  choice,
  gems,
  index,
  onSelect,
}: {
  choice: Choice;
  gems: number;
  index: number;
  onSelect: (choice: Choice) => void;
}) {
  const canAfford = gems >= (choice.gem_cost ?? 0);
  const isPremium = (choice.gem_cost ?? 0) > 0;

  const opacity = useSharedValue(0);
  const translateX = useSharedValue(20);

  useEffect(() => {
    const delay = 200 + index * 100;
    opacity.value = withDelay(
      delay,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) })
    );
    translateX.value = withDelay(
      delay,
      withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) })
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <TouchableOpacity
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
    </Animated.View>
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
