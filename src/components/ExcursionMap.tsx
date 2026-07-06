import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  Pressable,
  ImageSourcePropType,
} from "react-native";
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  type SharedValue,
} from "react-native-reanimated";
import { colors } from "../theme/colors";
import { RadarStreets } from "./RadarStreets";
import { MapPin } from "./MapPin";
import type { MapPinChoice } from "../lib/missions/types";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Same portrait Manhattan canvas as DispatchRadar: keep the image's exact aspect
// ratio so normalized (x÷width, y÷height) pin coords land on the streets.
const MAP_ASPECT = 720 / 1280; // manhattan2.png width / height (portrait)
const RADAR_H = Math.min(SCREEN_HEIGHT * 0.62, (SCREEN_WIDTH - 32) / MAP_ASPECT);
const RADAR_W = RADAR_H * MAP_ASPECT;

/** Background images available to a map beat, keyed like the mission `map` field. */
const MAP_IMAGES: Record<string, ImageSourcePropType> = {
  manhattan2: require("../../assets/map/manhattan2.png"),
};

const PIN_SIZE = 26; // tappable pin bubble diameter
const PIN_TIP = Math.round(PIN_SIZE * 0.45);
const PIN_TOTAL_H = PIN_SIZE + PIN_TIP;
const HIT_W = 84; // hit-area / label width

type Props = {
  /** Prompt shown above the map (e.g. "¿A dónde quieres ir hoy?"). */
  prompt?: string;
  /** Background map image key; defaults to the Manhattan radar. */
  map?: string;
  /** Destination pins to render. */
  pins: MapPinChoice[];
  /** Called once when the player taps a pin. */
  onSelectPin: (pin: MapPinChoice) => void;
};

/**
 * An interactive version of the dispatch radar: the same Manhattan map + street
 * graph, but each destination pin is tappable. Picking a pin fires `onSelectPin`
 * once (further taps are ignored while the selection resolves).
 */
export function ExcursionMap({ prompt, map, pins, onSelectPin }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const source = MAP_IMAGES[map ?? "manhattan2"] ?? MAP_IMAGES.manhattan2;

  // A shared slow pulse driving the attention ring behind every pin.
  const pulse = useSharedValue(0);
  React.useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
  }, [pulse]);

  const handlePress = (pin: MapPinChoice) => {
    if (selected) return;
    setSelected(pin.id);
    onSelectPin(pin);
  };

  return (
    <View style={styles.root}>
      {prompt ? (
        <Animated.Text entering={FadeIn.duration(400)} style={styles.prompt}>
          {prompt}
        </Animated.Text>
      ) : null}

      <View style={[styles.canvas, { width: RADAR_W, height: RADAR_H }]}>
        <Image
          source={source}
          style={{ width: RADAR_W, height: RADAR_H }}
          resizeMode="stretch"
        />
        <RadarStreets size={RADAR_W} height={RADAR_H} />

        {pins.map((pin) => {
          const px = pin.x * RADAR_W;
          const py = pin.y * RADAR_H;
          const isChosen = selected === pin.id;
          const isDimmed = selected !== null && !isChosen;
          const color = isChosen ? colors.dispatch.cyan : colors.dispatch.amber;
          return (
            <React.Fragment key={pin.id}>
              <PulseRing x={px} y={py} pulse={pulse} dimmed={isDimmed} />
              <MapPin x={px} y={py} icon={pin.icon} size={PIN_SIZE} color={color} />
              <Pressable
                onPress={() => handlePress(pin)}
                disabled={selected !== null}
                hitSlop={8}
                style={[
                  styles.hit,
                  {
                    left: px - HIT_W / 2,
                    top: py - PIN_TOTAL_H - 6,
                    width: HIT_W,
                    opacity: isDimmed ? 0.35 : 1,
                  },
                ]}
              >
                <View style={{ height: PIN_TOTAL_H + 4 }} />
                <Text numberOfLines={1} style={[styles.label, { color }]}>
                  {pin.label}
                </Text>
              </Pressable>
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}

/** An expanding, fading ring centered on a pin to signal it's tappable. */
function PulseRing({
  x,
  y,
  pulse,
  dimmed,
}: {
  x: number;
  y: number;
  pulse: SharedValue<number>;
  dimmed: boolean;
}) {
  const SIZE = 40;
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: 0.4 + pulse.value * 0.9 }],
    opacity: (dimmed ? 0.4 : 1) * (0.5 - pulse.value * 0.5),
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.ring,
        { left: x - SIZE / 2, top: y - SIZE / 2, width: SIZE, height: SIZE, borderRadius: SIZE / 2 },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  prompt: {
    color: colors.dispatch.cyan,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  canvas: {
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(34, 211, 238, 0.25)",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#05070d",
  },
  hit: {
    position: "absolute",
    alignItems: "center",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  ring: {
    position: "absolute",
    borderWidth: 2,
    borderColor: colors.dispatch.amber,
  },
});
