import React, { useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { RadarStreets } from "../components/RadarStreets";
import { AmbientUnit } from "../components/AmbientUnit";
import { colors } from "../theme/colors";

// ── Test config ──────────────────────────────────────────────────────────────
const NUM_AMBIENT_UNITS = 6; // how many units appear
const UNIT_SPEED = 9000; // ms per normalized distance unit (higher = slower)
const TEST_LOOP = true; // units never stop while testing
// ─────────────────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const RADAR_SIZE = Math.min(SCREEN_WIDTH - 48, 340);
const CENTER = RADAR_SIZE / 2;
const RINGS = [0.25, 0.5, 0.75, 1];
const UNIT_ICONS = ["🚔", "🚑", "🚒"];

type Props = NativeStackScreenProps<RootStackParamList, "RadarSandbox">;

export function RadarSandboxScreen({ navigation }: Props) {
  const scanY = useSharedValue(0);

  useEffect(() => {
    scanY.value = withRepeat(
      withTiming(RADAR_SIZE, { duration: 2600, easing: Easing.linear }),
      -1,
      false
    );
  }, []);

  const scanStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanY.value }],
  }));

  // Stable icon assignment per unit across re-renders.
  const unitIcons = useMemo(
    () =>
      Array.from({ length: NUM_AMBIENT_UNITS }).map(
        () => UNIT_ICONS[Math.floor(Math.random() * UNIT_ICONS.length)]
      ),
    []
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.exitBtn}>
          <Text style={styles.exitText}>← Exit</Text>
        </Pressable>
        <Text style={styles.title}>STREET GRAPH · SANDBOX</Text>
        <View style={styles.exitBtn} />
      </View>

      <View style={styles.center}>
        <View style={styles.radarOuter}>
          <View style={styles.radar}>
            {RINGS.map((r) => {
              const size = RADAR_SIZE * r;
              return (
                <View
                  key={r}
                  style={[
                    styles.ring,
                    {
                      width: size,
                      height: size,
                      borderRadius: size / 2,
                      left: CENTER - size / 2,
                      top: CENTER - size / 2,
                    },
                  ]}
                />
              );
            })}

            <View style={[styles.crossH, { top: CENTER - 0.5, width: RADAR_SIZE }]} />
            <View style={[styles.crossV, { left: CENTER - 0.5, height: RADAR_SIZE }]} />

            <Animated.View
              style={[styles.scanLine, { width: RADAR_SIZE }, scanStyle]}
            />

            <RadarStreets size={RADAR_SIZE} />

            {unitIcons.map((icon, i) => (
              <AmbientUnit
                key={i}
                size={RADAR_SIZE}
                icon={icon}
                speed={UNIT_SPEED}
                loop={TEST_LOOP}
              />
            ))}
          </View>
        </View>

        <Text style={styles.hint}>
          {NUM_AMBIENT_UNITS} units · moving along the street graph
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dispatch.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  exitBtn: {
    width: 70,
  },
  exitText: {
    color: colors.dispatch.cyan,
    fontSize: 15,
    fontWeight: "800",
  },
  title: {
    color: colors.dispatch.cyan,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 2,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
  },
  radarOuter: {
    borderRadius: RADAR_SIZE / 2 + 4,
    borderWidth: 2,
    borderColor: "rgba(34, 211, 238, 0.25)",
    padding: 3,
    backgroundColor: "rgba(34, 211, 238, 0.03)",
  },
  radar: {
    width: RADAR_SIZE,
    height: RADAR_SIZE,
    borderRadius: RADAR_SIZE / 2,
    overflow: "hidden",
    backgroundColor: "rgba(10, 14, 26, 0.95)",
  },
  ring: {
    position: "absolute",
    borderWidth: 1,
    borderColor: "rgba(34, 211, 238, 0.1)",
  },
  crossH: {
    position: "absolute",
    left: 0,
    height: 1,
    backgroundColor: "rgba(34, 211, 238, 0.08)",
  },
  crossV: {
    position: "absolute",
    top: 0,
    width: 1,
    backgroundColor: "rgba(34, 211, 238, 0.08)",
  },
  scanLine: {
    position: "absolute",
    left: 0,
    top: 0,
    height: 2,
    backgroundColor: "rgba(34, 211, 238, 0.15)",
  },
  hint: {
    color: colors.dispatch.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
