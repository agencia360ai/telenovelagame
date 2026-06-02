import React from "react";
import { View, Image, StyleSheet } from "react-native";
import { colors } from "../theme/colors";
import { sizes } from "../theme/sizes";
import { getMediaUrl } from "../lib/supabase";

type Props = {
  avatarKey?: string;
  characterId: string;
  size?: number;
};

const CHARACTER_COLORS: Record<string, string> = {
  renata: colors.character.renata,
  dante: colors.character.dante,
  mariana: colors.character.mariana,
  sebastian: colors.character.sebastian,
  narrator: colors.character.narrator,
};

export function CharacterAvatar({
  avatarKey,
  characterId,
  size = sizes.scene.avatarSize,
}: Props) {
  const borderColor = CHARACTER_COLORS[characterId] ?? colors.accent.secondary;

  if (avatarKey) {
    return (
      <View style={[styles.container, { width: size, height: size, borderColor }]}>
        <Image
          source={{ uri: getMediaUrl(avatarKey) }}
          style={{ width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 }}
        />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        styles.placeholder,
        {
          width: size,
          height: size,
          borderColor,
          backgroundColor: borderColor + "33",
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  placeholder: {
    borderStyle: "solid",
  },
});
