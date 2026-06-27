import React, { useEffect, useMemo, useRef } from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  FadeIn,
} from "react-native-reanimated";
import { colors } from "../theme/colors";
import { RadarStreets } from "./RadarStreets";
import { AmbientUnit } from "./AmbientUnit";
import { MapPin } from "./MapPin";
import { getUnlockedUnits } from "../content/missions";
import { nodes } from "../game/streetGraph";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const RADAR_SIZE = Math.min(SCREEN_WIDTH - 64, 300);
const CENTER = RADAR_SIZE / 2;
const RINGS = [0.25, 0.5, 0.75, 1];

// ── Map simulation sizing (easy to tweak) ────────────────────────────────────
const SIM_UNIT_DOT = 16; // ambient ("simulation") unit dot diameter
const SIM_UNIT_ICON = 9; // ambient unit emoji size
const SIM_PIN_SIZE = 16; // ambient destination pin bubble diameter
const HERO_UNIT_DOT = 32; // selected unit — keeps the prominent radar look
const HERO_UNIT_ICON = 16;
const DISPATCH_SPEED = 2200; // ms per normalized distance (≈2–3.5s per trip)
const SPEED_VARIANCE = 0.25; // ambient units vary their speed ±25%
// ─────────────────────────────────────────────────────────────────────────────

const SIM_PIN_H = SIM_PIN_SIZE + Math.round(SIM_PIN_SIZE * 0.45);

type Props = {
  location: string;
  unitIcon: string;
  unitLabel: string;
  callId: string;
  onComplete: () => void;
};

function hashStr(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function shuffle<T>(arr: T[], seed: number): T[] {
  // Deterministic-ish shuffle so a given call keeps a stable layout.
  const a = [...arr];
  let s = seed || 1;
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function DispatchRadar({
  location,
  unitIcon,
  unitLabel,
  callId,
  onComplete,
}: Props) {
  const scanY = useSharedValue(0);
  const blipScale = useSharedValue(1);
  const arrivedOpacity = useSharedValue(0);
  const doneRef = useRef(false);

  // Allocate unique street nodes: the selected unit's start + objective, plus a
  // start and a destination pin for one ambient unit of every unlocked type.
  // The objective is deterministic from callId so a call keeps a stable spot.
  const layout = useMemo(() => {
    const seed = hashStr(callId);
    const R = RADAR_SIZE / 2;
    const ids = Object.keys(nodes);
    const px = (id: string) => ({
      x: nodes[id].x * RADAR_SIZE,
      y: nodes[id].y * RADAR_SIZE,
    });
    const within = (x: number, y: number, m: number) =>
      Math.hypot(x - CENTER, y - CENTER) <= R - m;
    const pinFits = (id: string) => {
      const p = px(id);
      const top = p.y - SIM_PIN_H;
      return (
        within(p.x - SIM_PIN_SIZE / 2, top, 2) &&
        within(p.x + SIM_PIN_SIZE / 2, top, 2) &&
        within(p.x, p.y, 2)
      );
    };
    const insideIds = ids.filter((id) => {
      const p = px(id);
      return within(p.x, p.y, HERO_UNIT_DOT / 2 + 2);
    });
    const pinIds = ids.filter(pinFits);

    const used = new Set<string>();
    const take = (pool: string[]): string => {
      for (const id of shuffle(pool, seed + used.size)) {
        if (!used.has(id)) {
          used.add(id);
          return id;
        }
      }
      return pool[0];
    };

    // Hero objective: deterministic node inside the circle.
    const heroTargetPool = insideIds.length ? insideIds : ids;
    const heroTarget = heroTargetPool[seed % heroTargetPool.length];
    used.add(heroTarget);
    const heroStart = take(insideIds);

    const sims = getUnlockedUnits().map((u) => {
      const factor = 1 + (Math.random() * 2 - 1) * SPEED_VARIANCE; // 0.75..1.25
      return {
        id: u.id,
        icon: u.icon,
        speed: DISPATCH_SPEED / factor,
        startId: take(insideIds),
        destId: take(pinIds),
      };
    });

    return { heroTarget, heroStart, sims };
  }, [callId]);

  const heroNode = nodes[layout.heroTarget];
  const heroX = heroNode.x * RADAR_SIZE;
  const heroY = heroNode.y * RADAR_SIZE;

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onComplete();
  };

  const handleHeroArrive = () => {
    arrivedOpacity.value = withTiming(1, { duration: 300 });
    setTimeout(finish, 1000);
  };

  useEffect(() => {
    blipScale.value = withRepeat(
      withSequence(
        withTiming(1.6, { duration: 500, easing: Easing.out(Easing.ease) }),
        withTiming(1, { duration: 500, easing: Easing.in(Easing.ease) })
      ),
      -1,
      false
    );
    scanY.value = withRepeat(
      withTiming(RADAR_SIZE, { duration: 2200, easing: Easing.linear }),
      -1,
      false
    );

    // Safety: always advance the flow even if the arrival callback never fires.
    const safety = setTimeout(finish, 9000);
    return () => clearTimeout(safety);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scanStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: scanY.value }],
  }));
  const blipAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: blipScale.value }],
  }));
  const arrivedStyle = useAnimatedStyle(() => ({
    opacity: arrivedOpacity.value,
  }));

  return (
    <Animated.View entering={FadeIn.duration(250)} style={styles.container}>
      <Text style={styles.headerLabel}>DEPLOYING UNIT</Text>
      <View style={styles.unitRow}>
        <Text style={styles.unitIcon}>{unitIcon}</Text>
        <Text style={styles.unitLabel}>{unitLabel}</Text>
      </View>

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

          <View
            style={[styles.crossH, { top: CENTER - 0.5, width: RADAR_SIZE }]}
          />
          <View
            style={[styles.crossV, { left: CENTER - 0.5, height: RADAR_SIZE }]}
          />

          <Animated.View
            style={[styles.scanLine, { width: RADAR_SIZE }, scanStyle]}
          />

          <RadarStreets size={RADAR_SIZE} />

          {/* Ambient simulation pins (small) */}
          {layout.sims.map((u) =>
            u.destId ? (
              <MapPin
                key={`pin-${u.id}`}
                x={nodes[u.destId].x * RADAR_SIZE}
                y={nodes[u.destId].y * RADAR_SIZE}
                icon={u.icon}
                size={SIM_PIN_SIZE}
                color="rgba(34, 211, 238, 0.7)"
              />
            ) : null
          )}

          {/* Ambient simulation units (small + dimmed) */}
          {layout.sims.map((u) => (
            <AmbientUnit
              key={`sim-${u.id}`}
              size={RADAR_SIZE}
              icon={u.icon}
              speed={u.speed}
              startId={u.startId}
              targetId={u.destId}
              dotSize={SIM_UNIT_DOT}
              iconSize={SIM_UNIT_ICON}
              dim
            />
          ))}

          {/* Selected unit objective — the prominent amber blip (unchanged look) */}
          <Animated.View
            style={[
              styles.blip,
              { left: heroX - 8, top: heroY - 8 },
              blipAnimStyle,
            ]}
          />

          {/* Selected unit — prominent, but travels along the streets too */}
          <AmbientUnit
            size={RADAR_SIZE}
            icon={unitIcon}
            speed={DISPATCH_SPEED}
            startId={layout.heroStart}
            targetId={layout.heroTarget}
            dotSize={HERO_UNIT_DOT}
            iconSize={HERO_UNIT_ICON}
            onArrive={handleHeroArrive}
          />
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.locationLabel}>TO: {location.toUpperCase()}</Text>
        <Animated.Text style={[styles.arrivedText, arrivedStyle]}>
          UNIT ON SCENE
        </Animated.Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 32,
  },
  headerLabel: {
    color: colors.dispatch.cyan,
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 4,
  },
  unitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  unitIcon: {
    fontSize: 28,
  },
  unitLabel: {
    color: colors.dispatch.text,
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1,
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
  blip: {
    position: "absolute",
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "rgba(245, 158, 11, 0.4)",
    borderWidth: 2,
    borderColor: colors.dispatch.amber,
  },
  footer: {
    alignItems: "center",
    gap: 8,
  },
  locationLabel: {
    color: colors.dispatch.amber,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 2,
    textShadowColor: "rgba(245, 158, 11, 0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
  },
  arrivedText: {
    color: colors.dispatch.answer,
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 3,
    textShadowColor: "rgba(34, 197, 94, 0.5)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});
