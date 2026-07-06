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
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeInDown,
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
// ratio so normalized (x÷width, y÷height) pin coords land on the streets. A touch
// shorter than the radar so the info panel below the map has room to breathe.
const MAP_ASPECT = 720 / 1280; // manhattan2.png width / height (portrait)
const RADAR_H = Math.min(SCREEN_HEIGHT * 0.55, (SCREEN_WIDTH - 32) / MAP_ASPECT);
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
  /** Called once when the player confirms a pin. */
  onSelectPin: (pin: MapPinChoice) => void;
};

/**
 * An interactive version of the dispatch radar: the same Manhattan map + street
 * graph, but each destination pin is tappable. Selection is two-step: tapping a
 * pin previews its info (name + description) in a panel below the map; the move
 * only fires — via `onSelectPin` — once the player taps "Move here". The panel
 * (and its confirm button) stay hidden until a pin is tapped.
 */
export function ExcursionMap({ prompt, map, pins, onSelectPin }: Props) {
  // The pin being previewed (null = nothing tapped yet, so no panel/button).
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Latched once the player confirms, to lock the UI while the move resolves.
  const [confirmed, setConfirmed] = useState(false);
  const source = MAP_IMAGES[map ?? "manhattan2"] ?? MAP_IMAGES.manhattan2;
  const selectedPin = pins.find((p) => p.id === selectedId) ?? null;

  // A shared slow pulse driving the attention ring behind every pin.
  const pulse = useSharedValue(0);
  React.useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.out(Easing.ease) }),
      -1,
      false
    );
  }, [pulse]);

  // Tapping a pin just previews it (can be changed freely until confirmed).
  const handlePreview = (pin: MapPinChoice) => {
    if (confirmed) return;
    Haptics.selectionAsync();
    setSelectedId(pin.id);
  };

  const handleConfirm = () => {
    if (!selectedPin || confirmed) return;
    setConfirmed(true);
    onSelectPin(selectedPin);
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
          const isChosen = selectedId === pin.id;
          const isDimmed = selectedId !== null && !isChosen;
          const color = isChosen ? colors.dispatch.cyan : colors.dispatch.amber;
          return (
            <React.Fragment key={pin.id}>
              <PulseRing x={px} y={py} pulse={pulse} dimmed={isDimmed} />
              <MapPin x={px} y={py} icon={pin.icon} size={PIN_SIZE} color={color} />
              <Pressable
                onPress={() => handlePreview(pin)}
                disabled={confirmed}
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

      {/* Info panel — hidden until a pin is tapped. Shows the place's name and a
          short description, plus the button that confirms the move. */}
      {selectedPin ? (
        <Animated.View
          key={selectedPin.id}
          entering={FadeInDown.duration(220)}
          style={styles.infoPanel}
        >
          <Text style={styles.infoName}>
            {selectedPin.icon} {selectedPin.label}
          </Text>
          {selectedPin.description ? (
            <Text style={styles.infoDesc}>{selectedPin.description}</Text>
          ) : null}
          <Pressable
            style={[styles.confirmBtn, confirmed && styles.confirmBtnDim]}
            onPress={handleConfirm}
            disabled={confirmed}
          >
            <Text style={styles.confirmLabel}>
              {confirmed ? "Moving…" : "Move here"}
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}
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
  infoPanel: {
    width: RADAR_W + 40,
    maxWidth: SCREEN_WIDTH - 24,
    gap: 8,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(34, 211, 238, 0.30)",
    borderLeftWidth: 3,
    borderLeftColor: colors.dispatch.cyan,
    backgroundColor: "rgba(10, 14, 26, 0.92)",
  },
  infoName: {
    color: colors.dispatch.text,
    fontSize: 17,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  infoDesc: {
    color: "rgba(226, 232, 240, 0.72)",
    fontSize: 14,
    lineHeight: 20,
  },
  confirmBtn: {
    marginTop: 4,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(34, 211, 238, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(34, 211, 238, 0.55)",
    borderRadius: 10,
    paddingVertical: 13,
  },
  confirmBtnDim: {
    opacity: 0.6,
  },
  confirmLabel: {
    color: colors.dispatch.cyan,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
});
