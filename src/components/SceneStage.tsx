import React, { useEffect } from "react";
import { View, Image, StyleSheet, Dimensions } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { Media } from "../lib/engine/types";
import { getMediaUrl } from "../lib/supabase";
import { colors } from "../theme/colors";

type Props = {
  media?: Media;
  fallbackColor?: string;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const IMAGE_HEIGHT = SCREEN_WIDTH * 0.6;

export function SceneStage({ media, fallbackColor }: Props) {
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

  const uri = getMediaUrl(media.key);

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Image
        source={{ uri }}
        style={styles.image}
        resizeMode="cover"
      />
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
});
