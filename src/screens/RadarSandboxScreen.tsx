import React, { useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Image,
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Portrait Manhattan map; canvas kept at the image's aspect ratio so normalized
// (x÷width, y÷height) graph coords land exactly on the streets.
const MAP_IMAGE = require("../../assets/map/manhattan.png");
const MAP_ASPECT = 688 / 1316; // manhattan.png width / height
const RADAR_H = Math.min(SCREEN_HEIGHT * 0.62, (SCREEN_WIDTH - 32) / MAP_ASPECT);
const RADAR_W = RADAR_H * MAP_ASPECT;

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
      withTiming(RADAR_H, { duration: 2600, easing: Easing.linear }),
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
    const ids = Object.keys(nodes);
    // Rectangular map: every node is on-canvas. Only keep destination nodes whose
    // pin bubble won't clip past the top edge (it extends upward by PIN_H).
    const pinFits = (id: string) => nodes[id].y * RADAR_H - PIN_H >= 2;

    const destPool = shuffle(ids.filter(pinFits));
    const dests = destPool.slice(0, N);
    const destSet = new Set(dests);
    const startPool = shuffle(ids.filter((id) => !destSet.has(id)));
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
            <Image
              source={MAP_IMAGE}
              style={{ position: "absolute", top: 0, left: 0, width: RADAR_W, height: RADAR_H }}
              resizeMode="stretch"
            />

            <Animated.View
              style={[styles.scanLine, { width: RADAR_W }, scanStyle]}
            />

            <RadarStreets size={RADAR_W} height={RADAR_H} />

            {/* One destination pin per unit — tip at the node, unit's own icon */}
            {units.map((u) => {
              if (!u.destId) return null;
              const dx = nodes[u.destId].x * RADAR_W;
              const dy = nodes[u.destId].y * RADAR_H;
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
                size={RADAR_W}
                height={RADAR_H}
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
    borderRadius: 14,
    borderWidth: 2,
    borderColor: "rgba(34, 211, 238, 0.25)",
    padding: 3,
    backgroundColor: "rgba(34, 211, 238, 0.03)",
  },
  radar: {
    width: RADAR_W,
    height: RADAR_H,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(10, 14, 26, 0.95)",
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
