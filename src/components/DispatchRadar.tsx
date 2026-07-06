import React, { useEffect, useMemo, useRef } from "react";
import { View, Text, StyleSheet, Dimensions, Image } from "react-native";
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
import { UnitIcon } from "./UnitIcon";
import { MapPin } from "./MapPin";
import { getUnlockedUnits } from "../content/missions";
import { nodes } from "../game/streetGraph";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// The dispatch map is a portrait Manhattan image. Keep the radar canvas at the
// image's exact aspect ratio so the normalized (x÷width, y÷height) graph coords
// land precisely on the streets, and fit it within the screen preserving that.
const MAP_IMAGE = require("../../assets/map/manhattan2.png");
const MAP_ASPECT = 720 / 1280; // manhattan2.png width / height (portrait)
const RADAR_H = Math.min(SCREEN_HEIGHT * 0.6, (SCREEN_WIDTH - 48) / MAP_ASPECT);
const RADAR_W = RADAR_H * MAP_ASPECT;

// ── Map simulation sizing (easy to tweak) ────────────────────────────────────
const SIM_UNIT_DOT = 8; // ambient ("simulation") unit dot diameter
const SIM_UNIT_ICON = 5; // ambient unit emoji size
const SIM_PIN_SIZE = 8; // ambient destination pin bubble diameter
const HERO_UNIT_DOT = 16; // selected unit — keeps the prominent radar look
const HERO_UNIT_ICON = 8;
const DISPATCH_SPEED = 3960; // ms per normalized distance (80% longer than 2200 ≈ 4–6s/trip)
const SPEED_VARIANCE = 0.25; // ambient units vary their speed ±25%
// ─────────────────────────────────────────────────────────────────────────────

const SIM_PIN_H = SIM_PIN_SIZE + Math.round(SIM_PIN_SIZE * 0.45);

type Props = {
  location: string;
  unitIcon: string;
  unitLabel: string;
  /** Fleet unit id (e.g. "police") — shows the unit's vehicle art in the
   *  header when it has an image registered; falls back to the emoji. */
  unitId?: string;
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
  unitId,
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
    const ids = Object.keys(nodes);
    // The map is rectangular, so every node is on-canvas. Only keep destination
    // pins that won't clip past the top edge (the pin bubble extends upward).
    const pinFits = (id: string) => nodes[id].y * RADAR_H - SIM_PIN_H >= 2;
    const insideIds = ids;
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
  const heroX = heroNode.x * RADAR_W;
  const heroY = heroNode.y * RADAR_H;

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
      withTiming(RADAR_H, { duration: 2200, easing: Easing.linear }),
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
        {unitId ? (
          <UnitIcon kind={unitId} emoji={unitIcon} size={24} />
        ) : (
          <Text style={styles.unitIcon}>{unitIcon}</Text>
        )}
        <Text style={styles.unitLabel}>{unitLabel}</Text>
      </View>

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

          {/* Ambient simulation pins (small) */}
          {layout.sims.map((u) =>
            u.destId ? (
              <MapPin
                key={`pin-${u.id}`}
                x={nodes[u.destId].x * RADAR_W}
                y={nodes[u.destId].y * RADAR_H}
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
              size={RADAR_W}
              height={RADAR_H}
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
            size={RADAR_W}
            height={RADAR_H}
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
