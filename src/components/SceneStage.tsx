import React, { useEffect, useState } from "react";
import { View, Image, StyleSheet, Dimensions, ActivityIndicator } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { useVideoPlayer, VideoView } from "expo-video";
import { Media } from "../lib/engine/types";
import { getMediaUrl } from "../lib/supabase";
import { resolveVideoUri } from "../lib/videoAssets";
import { colors } from "../theme/colors";

type Props = {
  media?: Media;
  fallbackColor?: string;
  onVideoEnd?: () => void;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_HEIGHT = SCREEN_WIDTH * 0.6;
const VIDEO_HEIGHT = SCREEN_WIDTH * 0.75;

function VideoPlayer({ uri, onVideoEnd }: { uri: string; onVideoEnd?: () => void }) {
  const player = useVideoPlayer(uri, (p) => {
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

function VideoStage({ mediaKey, onVideoEnd }: { mediaKey: string; onVideoEnd?: () => void }) {
  const [videoUri, setVideoUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    resolveVideoUri(mediaKey).then((uri) => {
      if (!cancelled && uri) setVideoUri(uri);
    });
    return () => { cancelled = true; };
  }, [mediaKey]);

  if (!videoUri) {
    return (
      <View style={[styles.video, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.accent.primary} />
      </View>
    );
  }

  return <VideoPlayer key={videoUri} uri={videoUri} onVideoEnd={onVideoEnd} />;
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
    return (
      <Animated.View
        style={[styles.container, { height: VIDEO_HEIGHT }, animatedStyle]}
      >
        <VideoStage key={media.key} mediaKey={media.key} onVideoEnd={onVideoEnd} />
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
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.bg.secondary,
  },
});
