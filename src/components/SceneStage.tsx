import React, { useEffect } from "react";
import { View, Image, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useVideoPlayer, VideoView } from "expo-video";
import { Media } from "../lib/engine/types";
import { getMediaUrl } from "../lib/supabase";
import { getVideoAsset } from "../lib/videoAssets";
import { colors } from "../theme/colors";

type Props = {
  media?: Media;
  fallbackColor?: string;
  onVideoEnd?: () => void;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_HEIGHT = SCREEN_WIDTH * 0.6;
const VIDEO_HEIGHT = SCREEN_WIDTH * 0.75;

function VideoStage({ source, onVideoEnd }: { source: number | string; onVideoEnd?: () => void }) {
  const player = useVideoPlayer(source, (p) => {
    p.loop = false;
    p.play();
  });

  useEffect(() => {
    if (!onVideoEnd) return;
    const sub = player.addListener("playToEnd", () => {
      onVideoEnd();
    });
    return () => sub.remove();
  }, [player, onVideoEnd]);

  return (
    <VideoView
      player={player}
      style={styles.video}
      contentFit="cover"
      nativeControls
    />
  );
}

export function SceneStage({ media, fallbackColor, onVideoEnd }: Props) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = 0;
    opacity.value = withTiming(1, {
      duration: 400,
      easing: Easing.out(Easing.cubic),
    });
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

  if (media.type === "video") {
    const videoSource = getVideoAsset(media.key);
    return (
      <Animated.View
        style={[styles.container, { height: VIDEO_HEIGHT }, animatedStyle]}
      >
        <VideoStage key={media.key} source={videoSource} onVideoEnd={onVideoEnd} />
      </Animated.View>
    );
  }

  const uri = getMediaUrl(media.key);

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
  video: {
    width: "100%",
    height: "100%",
  },
});
