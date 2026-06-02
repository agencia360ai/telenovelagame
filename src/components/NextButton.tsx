import React, { useEffect } from "react";
import { Text, StyleSheet, Pressable, Platform } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { colors } from "../theme/colors";
import { sizes } from "../theme/sizes";
import { useI18n } from "../context/I18nContext";

type Props = {
  onPress: () => void;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function NextButton({ onPress }: Props) {
  const { t } = useI18n();
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withRepeat(
      withSequence(
        withTiming(1.03, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };

  return (
    <AnimatedPressable
      style={[styles.button, animatedStyle]}
      onPress={handlePress}
    >
      <Text style={styles.text}>{t("reader_next")}</Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.accent.primary,
    borderRadius: sizes.radius.xl,
    paddingVertical: sizes.spacing.md,
    paddingHorizontal: sizes.spacing.xl,
    alignSelf: "center",
    minWidth: sizes.button.minWidth,
    alignItems: "center",
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  text: {
    color: colors.text.primary,
    fontSize: sizes.font.lg,
    fontWeight: "800",
    letterSpacing: 2,
  },
});
