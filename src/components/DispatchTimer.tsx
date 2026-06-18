import React, { useEffect, useRef } from "react";
import { Text, StyleSheet } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
} from "react-native-reanimated";
import { colors } from "../theme/colors";

type Props = {
  seconds: number;
};

export function DispatchTimer({ seconds }: Props) {
  const flash = useSharedValue(1);
  const isUrgent = seconds <= 5;

  useEffect(() => {
    if (isUrgent) {
      flash.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 300 }),
          withTiming(1, { duration: 300 })
        ),
        -1,
        false
      );
    } else {
      cancelAnimation(flash);
      flash.value = 1;
    }
    return () => cancelAnimation(flash);
  }, [isUrgent]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: flash.value,
  }));

  const timerColor =
    seconds > 10
      ? colors.dispatch.answer
      : seconds > 5
        ? colors.dispatch.amber
        : colors.dispatch.decline;

  return (
    <Animated.View style={[styles.container, animStyle]}>
      <Text style={[styles.label, { color: timerColor }]}>DISPATCH IN</Text>
      <Text style={[styles.timer, { color: timerColor }]}>{seconds}s</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: 2,
  },
  label: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
  },
  timer: {
    fontSize: 28,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
  },
});
