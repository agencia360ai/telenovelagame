import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  Pressable,
  Text,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import { Media } from "../lib/engine/types";
import { getMediaUrl } from "../lib/supabase";
import { colors } from "../theme/colors";

type Props = {
  media?: Media;
  fallbackColor?: string;
  onVideoEnd?: () => void;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_HEIGHT = SCREEN_WIDTH * 0.6;
const VIDEO_HEIGHT = SCREEN_WIDTH * 0.75;

export function SceneStage({ media, fallbackColor, onVideoEnd }: Props) {
  const opacity = useSharedValue(0);
  const videoRef = useRef<Video>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(false);

  useEffect(() => {
    opacity.value = 0;
    opacity.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
    setIsPaused(false);
    setShowControls(false);
  }, [media?.key]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!media) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: fallbackColor ?? colors.bg.secondary },
        ]}
      />
    );
  }

  const uri = getMediaUrl(media.key);

  if (media.type === "video") {
    const handlePlaybackStatus = (status: AVPlaybackStatus) => {
      if (status.isLoaded && status.didJustFinish) {
        onVideoEnd?.();
      }
    };

    const togglePause = () => {
      if (isPaused) {
        videoRef.current?.playAsync();
      } else {
        videoRef.current?.pauseAsync();
      }
      setIsPaused(!isPaused);
    };

    const toggleMute = () => {
      videoRef.current?.setIsMutedAsync(!isMuted);
      setIsMuted(!isMuted);
    };

    return (
      <Animated.View
        style={[styles.container, { height: VIDEO_HEIGHT }, animatedStyle]}
      >
        <Pressable
          style={styles.videoWrapper}
          onPress={() => setShowControls((v) => !v)}
        >
          <Video
            ref={videoRef}
            source={{ uri }}
            style={styles.video}
            resizeMode={ResizeMode.COVER}
            shouldPlay
            isMuted={isMuted}
            isLooping={false}
            onPlaybackStatusUpdate={handlePlaybackStatus}
          />
          {showControls && (
            <View style={styles.controlsOverlay}>
              <Pressable style={styles.controlBtn} onPress={togglePause}>
                <Text style={styles.controlIcon}>
                  {isPaused ? "▶" : "⏸"}
                </Text>
              </Pressable>
              <Pressable style={styles.controlBtn} onPress={toggleMute}>
                <Text style={styles.controlIcon}>
                  {isMuted ? "🔇" : "🔊"}
                </Text>
              </Pressable>
            </View>
          )}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Image source={{ uri }} style={styles.image} resizeMode="cover" />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    backgroundColor: colors.bg.secondary,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  videoWrapper: {
    flex: 1,
  },
  video: {
    width: "100%",
    height: "100%",
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 32,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  controlBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  controlIcon: {
    fontSize: 24,
    color: "#fff",
  },
});
