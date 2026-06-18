import React, { useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { colors } from "../theme/colors";

type Props = {
  current: number;
  needed: number;
  percent: number;
  showLabel?: boolean;
};

export function XPBar({ current, needed, percent, showLabel = true }: Props) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withTiming(Math.min(percent, 1), {
      duration: 800,
      easing: Easing.out(Easing.cubic),
    });
  }, [percent]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value * 100}%` as any,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, barStyle]} />
      </View>
      {showLabel && needed > 0 && (
        <Text style={styles.label}>
          {current}/{needed} XP
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 3,
  },
  track: {
    height: 6,
    backgroundColor: "rgba(34, 211, 238, 0.15)",
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    backgroundColor: colors.dispatch.cyan,
    borderRadius: 3,
  },
  label: {
    color: colors.dispatch.textMuted,
    fontSize: 10,
    fontWeight: "700",
    textAlign: "right",
  },
});
