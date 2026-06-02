import React from "react";
import { View, Image, StyleSheet, Dimensions } from "react-native";
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
    return (
      <View style={styles.container}>
        <Image
          source={{ uri }}
          style={styles.image}
          resizeMode="cover"
          defaultSource={require("../../assets/splash-icon.png")}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Image
        source={{ uri }}
        style={styles.image}
        resizeMode="cover"
        defaultSource={require("../../assets/splash-icon.png")}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: IMAGE_HEIGHT,
    backgroundColor: colors.bg.secondary,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
