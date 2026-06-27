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
import { getUnlockedUnits } from "../content/missions";
import { nodes } from "../game/streetGraph";
import { colors } from "../theme/colors";

// ── Test config ──────────────────────────────────────────────────────────────
const UNIT_SPEED = 9000; // ms per normalized distance unit (higher = slower)
const SPEED_VARIANCE = 0.25; // each unit's speed varies by ±25%
// ─────────────────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const RADAR_SIZE = Math.min(SCREEN_WIDTH - 48, 340);
const CENTER = RADAR_SIZE / 2;
const RINGS = [0.25, 0.5, 0.75, 1];
const UNIT_CLEARANCE = 16; // px a spawning unit must stay inside the radar edge

type Props = NativeStackScreenProps<RootStackParamList, "RadarSandbox">;

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

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

  // One unit per unlocked type. Each gets its OWN unique start node and its OWN
  // unique destination node (pin) — no two pins and no two spawn points overlap.
  // Destination nodes are restricted to those where the pin fits fully inside the
  // radar circle; start nodes just need to sit inside it. Memoized so re-renders
  // don't reshuffle anything.
  const units = useMemo(() => {
    const unlocked = getUnlockedUnits();
    const N = unlocked.length;
    const R = RADAR_SIZE / 2;
    const ids = Object.keys(nodes);
    const px = (id: string) => ({
      x: nodes[id].x * RADAR_SIZE,
      y: nodes[id].y * RADAR_SIZE,
    });
    const within = (x: number, y: number, margin: number) =>
      Math.hypot(x - CENTER, y - CENTER) <= R - margin;
    const pinFits = (id: string) => {
      const p = px(id);
      const top = p.y - PIN_H;
      return (
        within(p.x - PIN_W / 2, top, 2) &&
        within(p.x + PIN_W / 2, top, 2) &&
        within(p.x, p.y, 2)
      );
    };

    const destPool = shuffle(ids.filter(pinFits));
    const dests = destPool.slice(0, N);
    const destSet = new Set(dests);
    const startPool = shuffle(
      ids.filter((id) => {
        if (destSet.has(id)) return false;
        const p = px(id);
        return within(p.x, p.y, UNIT_CLEARANCE);
      })
    );
    const starts = startPool.slice(0, N);

    return unlocked.map((u, i) => {
      const factor = 1 + (Math.random() * 2 - 1) * SPEED_VARIANCE; // 0.75..1.25
      return {
        id: u.id,
        icon: u.icon,
        label: u.label.replace("\n", " "),
        // Higher speed value = slower; divide so a higher factor → faster.
        speed: UNIT_SPEED / factor,
        startId: starts[i],
        destId: dests[i],
      };
    });
  }, []);

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

            {/* One destination pin per unit — tip at the node, unit's own icon */}
            {units.map((u) => {
              if (!u.destId) return null;
              const dx = nodes[u.destId].x * RADAR_SIZE;
              const dy = nodes[u.destId].y * RADAR_SIZE;
              return (
                <View
                  key={`pin-${u.id}`}
                  style={[styles.pin, { left: dx - PIN_W / 2, top: dy - PIN_H }]}
                  pointerEvents="none"
                >
                  <View style={styles.pinBubble}>
                    <Text style={styles.pinIcon}>{u.icon}</Text>
                  </View>
                  <View style={styles.pinTip} />
                </View>
              );
            })}

            {units.map((u) => (
              <AmbientUnit
                key={u.id}
                size={RADAR_SIZE}
                icon={u.icon}
                speed={u.speed}
                startId={u.startId}
                targetId={u.destId}
              />
            ))}
          </View>
        </View>

        <Text style={styles.hint}>
          {units.length} units · cada una a su propio destino
        </Text>
      </View>
    </SafeAreaView>
  );
}

const PIN_W = 34;
const PIN_BUBBLE = 34;
const PIN_TIP = 8;
const PIN_H = PIN_BUBBLE + PIN_TIP;

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
  pin: {
    position: "absolute",
    width: PIN_W,
    alignItems: "center",
  },
  pinBubble: {
    width: PIN_BUBBLE,
    height: PIN_BUBBLE,
    borderRadius: PIN_BUBBLE / 2,
    backgroundColor: "rgba(245, 158, 11, 0.18)",
    borderWidth: 2,
    borderColor: colors.dispatch.amber,
    alignItems: "center",
    justifyContent: "center",
  },
  pinIcon: {
    fontSize: 16,
  },
  pinTip: {
    width: 0,
    height: 0,
    marginTop: -2,
    borderLeftWidth: 5,
    borderRightWidth: 5,
    borderTopWidth: PIN_TIP,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: colors.dispatch.amber,
  },
  hint: {
    color: colors.dispatch.textMuted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
  },
});
