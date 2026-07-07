import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Image,
  Pressable,
  ScrollView,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors } from "../theme/colors";
import { RadarStreets } from "./RadarStreets";
import { MapPin } from "./MapPin";
import type { MapPinChoice } from "../lib/missions/types";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

/**
 * Maps available to a `map` beat, keyed like the mission `map` field.
 * `streets: true` overlays the Manhattan street graph — only meaningful for the
 * Manhattan radar; other maps (e.g. a country map) render the image alone.
 * The canvas size is derived from each image's real aspect ratio (below), so
 * any image — portrait or landscape — is shown without distortion.
 */
const MAP_DEFS: Record<string, { source: ImageSourcePropType; streets?: boolean }> = {
  manhattan2: { source: require("../../assets/map/manhattan2.png"), streets: true },
  usamap: { source: require("../../assets/map/usamap.png") },
};
const DEFAULT_MAP = "manhattan2";

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
  const insets = useSafeAreaInsets();
  // The pin being previewed (null = nothing tapped yet, so no panel/button).
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Latched once the player confirms, to lock the UI while the move resolves.
  const [confirmed, setConfirmed] = useState(false);
  const def = MAP_DEFS[map ?? DEFAULT_MAP] ?? MAP_DEFS[DEFAULT_MAP];
  const source = def.source;
  // Fit the map to the screen HEIGHT keeping the image's real aspect (no
  // distortion); the horizontal overflow is revealed by panning. Works for a
  // portrait map (Manhattan) or a wide landscape one (country map).
  const { width: imgW, height: imgH } = Image.resolveAssetSource(source);
  const RADAR_H = SCREEN_HEIGHT;
  const RADAR_W = Math.round(RADAR_H * (imgW / imgH));
  const INITIAL_PAN_X = Math.max(0, (RADAR_W - SCREEN_WIDTH) / 2);
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

  // Dismiss the preview: clears the selection so the panel hides (revealing any
  // pin it covered) and the pins un-dim. No-op once the move is confirmed.
  const handleClose = () => {
    if (confirmed) return;
    Haptics.selectionAsync();
    setSelectedId(null);
  };

  return (
    <View style={styles.root}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentOffset={{ x: INITIAL_PAN_X, y: 0 }}
        contentContainerStyle={styles.scrollContent}
        // Let a tap on a pin register while a drag pans the map.
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.canvas, { width: RADAR_W, height: RADAR_H }]}>
          <Image
            source={source}
            style={{ width: RADAR_W, height: RADAR_H }}
            resizeMode="stretch"
          />
          {def.streets ? <RadarStreets size={RADAR_W} height={RADAR_H} /> : null}

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
      </ScrollView>

      {/* Prompt — floats over the top of the map so it costs no vertical space. */}
      {prompt ? (
        <Animated.Text
          entering={FadeIn.duration(400)}
          style={[styles.prompt, { top: insets.top + 10 }]}
        >
          {prompt}
        </Animated.Text>
      ) : null}

      {/* Info panel — hidden until a pin is tapped. Floats over the bottom of the
          map. Shows the place's name + description and the confirm button. */}
      {selectedPin ? (
        <Animated.View
          key={selectedPin.id}
          entering={FadeInDown.duration(220)}
          style={[styles.infoPanel, { bottom: insets.bottom + 14 }]}
        >
          <Pressable
            style={styles.closeBtn}
            onPress={handleClose}
            disabled={confirmed}
            hitSlop={10}
            accessibilityLabel="Cerrar"
          >
            <Text style={styles.closeLabel}>✕</Text>
          </Pressable>
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
    ...StyleSheet.absoluteFillObject,
  },
  prompt: {
    position: "absolute",
    left: 0,
    right: 0,
    color: colors.dispatch.cyan,
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
    textAlign: "center",
    paddingHorizontal: 24,
    textShadowColor: "rgba(0,0,0,0.9)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  scrollContent: {
    // Center the map when it is narrower than the screen (e.g. very wide
    // displays); when it is wider, this has no effect and it just scrolls.
    flexGrow: 1,
    justifyContent: "center",
  },
  canvas: {
    position: "relative",
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
    position: "absolute",
    left: 12,
    right: 12,
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
    paddingRight: 34, // clear the close button in the top-right
  },
  closeBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.25)",
    backgroundColor: "rgba(226, 232, 240, 0.06)",
    zIndex: 2,
  },
  closeLabel: {
    color: "rgba(226, 232, 240, 0.85)",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 16,
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
