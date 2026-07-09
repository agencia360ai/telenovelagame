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
import { Gesture, GestureDetector } from "react-native-gesture-handler";
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

// ── Zoom config ──────────────────────────────────────────────────────────────
// Multipliers of the "fit full width" scale (the fully zoomed-out view where the
// whole map width is visible). Tweak these to change the starting/allowed zoom.
const INITIAL_ZOOM = 1.0; // 1 = start showing the whole map width; >1 = start more zoomed in
const MIN_ZOOM = 1.0; //     can't zoom out past the full-width view
const MAX_ZOOM = 4.0; //     how far the player can pinch-zoom in
// ─────────────────────────────────────────────────────────────────────────────

const PIN_SIZE = 26; // tappable pin bubble diameter
const PIN_TIP = Math.round(PIN_SIZE * 0.45);
const PIN_TOTAL_H = PIN_SIZE + PIN_TIP;
const HIT_W = 84; // hit-area / label width

function clampW(v: number, lo: number, hi: number) {
  "worklet";
  return Math.min(Math.max(v, lo), hi);
}

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
 * An interactive map for a `map` beat: pinch-to-zoom + drag-to-pan over the map
 * image, with tappable destination pins. Selection is two-step — tapping a pin
 * previews its info (name + description) in a panel; the move only fires (via
 * `onSelectPin`) once the player taps "Move here".
 *
 * The map opens fully zoomed OUT (whole width visible) and can be zoomed IN up to
 * MAX_ZOOM. Pins keep a constant on-screen size at any zoom (inverse-scaled) so
 * they stay visible and tappable even in the far-out country view.
 */
export function ExcursionMap({ prompt, map, pins, onSelectPin }: Props) {
  const insets = useSafeAreaInsets();
  // The pin being previewed (null = nothing tapped yet, so no panel/button).
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Latched once the player confirms, to lock the UI while the move resolves.
  const [confirmed, setConfirmed] = useState(false);
  const def = MAP_DEFS[map ?? DEFAULT_MAP] ?? MAP_DEFS[DEFAULT_MAP];
  const source = def.source;
  const selectedPin = pins.find((p) => p.id === selectedId) ?? null;

  // Canvas sized to the screen HEIGHT at scale 1, keeping the image aspect. The
  // gesture scale then shrinks/grows it; the fully zoomed-out scale is the one
  // that makes the canvas width match the screen width ("full horizontal").
  const { width: imgW, height: imgH } = Image.resolveAssetSource(source);
  const CANVAS_H = SCREEN_HEIGHT;
  const CANVAS_W = Math.round(CANVAS_H * (imgW / imgH));
  const fitWidthScale = SCREEN_WIDTH / CANVAS_W;
  const minScale = fitWidthScale * MIN_ZOOM;
  const maxScale = fitWidthScale * MAX_ZOOM;
  const initialScale = fitWidthScale * INITIAL_ZOOM;

  // Pan/zoom state (shared values driven by the gestures).
  const scale = useSharedValue(initialScale);
  const savedScale = useSharedValue(initialScale);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = clampW(savedScale.value * e.scale, minScale, maxScale);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      const maxX = Math.max(0, (CANVAS_W * scale.value - SCREEN_WIDTH) / 2);
      const maxY = Math.max(0, (CANVAS_H * scale.value - SCREEN_HEIGHT) / 2);
      tx.value = clampW(tx.value, -maxX, maxX);
      ty.value = clampW(ty.value, -maxY, maxY);
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  const pan = Gesture.Pan()
    .minDistance(6) // let a still tap reach the pins instead of panning
    .onUpdate((e) => {
      const maxX = Math.max(0, (CANVAS_W * scale.value - SCREEN_WIDTH) / 2);
      const maxY = Math.max(0, (CANVAS_H * scale.value - SCREEN_HEIGHT) / 2);
      tx.value = clampW(savedTx.value + e.translationX, -maxX, maxX);
      ty.value = clampW(savedTy.value + e.translationY, -maxY, maxY);
    })
    .onEnd(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  const gesture = Gesture.Simultaneous(pinch, pan);

  const canvasStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

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
      <GestureDetector gesture={gesture}>
        <Animated.View
          style={[styles.canvas, { width: CANVAS_W, height: CANVAS_H }, canvasStyle]}
        >
          <Image
            source={source}
            style={{ width: CANVAS_W, height: CANVAS_H }}
            resizeMode="stretch"
          />
          {def.streets ? <RadarStreets size={CANVAS_W} height={CANVAS_H} /> : null}

          {pins.map((pin) => (
            <PinMarker
              key={pin.id}
              pin={pin}
              px={pin.x * CANVAS_W}
              py={pin.y * CANVAS_H}
              mapScale={scale}
              pulse={pulse}
              chosen={selectedId === pin.id}
              dimmed={selectedId !== null && selectedId !== pin.id}
              disabled={confirmed}
              onPress={() => handlePreview(pin)}
            />
          ))}
        </Animated.View>
      </GestureDetector>

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

/**
 * One destination pin. Positioned at the map coord (px, py) INSIDE the scaled
 * canvas, but inverse-scaled by the map's zoom so its on-screen size stays
 * constant (a real map marker), keeping it visible/tappable at any zoom.
 */
function PinMarker({
  pin,
  px,
  py,
  mapScale,
  pulse,
  chosen,
  dimmed,
  disabled,
  onPress,
}: {
  pin: MapPinChoice;
  px: number;
  py: number;
  mapScale: SharedValue<number>;
  pulse: SharedValue<number>;
  chosen: boolean;
  dimmed: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  // Cancel the parent canvas scale so the marker keeps a fixed screen size.
  const counter = useAnimatedStyle(() => ({
    transform: [{ scale: 1 / mapScale.value }],
  }));
  const color = chosen ? colors.dispatch.cyan : colors.dispatch.amber;
  return (
    <Animated.View style={[styles.pinAnchor, { left: px, top: py }, counter]}>
      <PulseRing x={0} y={0} pulse={pulse} dimmed={dimmed} />
      <MapPin x={0} y={0} icon={pin.icon} size={PIN_SIZE} color={color} />
      <Pressable
        onPress={onPress}
        disabled={disabled}
        hitSlop={12}
        style={[styles.pinHit, { opacity: dimmed ? 0.35 : 1 }]}
      >
        <View style={{ height: PIN_TOTAL_H + 4 }} />
        <Text numberOfLines={1} style={[styles.label, { color }]}>
          {pin.label}
        </Text>
      </Pressable>
    </Animated.View>
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
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#05070d",
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
  canvas: {
    position: "relative",
    backgroundColor: "#05070d",
  },
  pinAnchor: {
    position: "absolute",
    width: 0,
    height: 0,
  },
  pinHit: {
    position: "absolute",
    left: -HIT_W / 2,
    top: -(PIN_TOTAL_H + 2),
    width: HIT_W,
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
