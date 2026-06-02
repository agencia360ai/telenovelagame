import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { CharacterAvatar } from "./CharacterAvatar";
import { colors } from "../theme/colors";
import { sizes } from "../theme/sizes";
import { CharacterDef } from "../lib/engine/types";

type Props = {
  speaker: string;
  expression: string;
  text: string;
  character?: CharacterDef;
};

const CHARACTER_COLORS: Record<string, string> = {
  renata: colors.character.renata,
  dante: colors.character.dante,
  mariana: colors.character.mariana,
  sebastian: colors.character.sebastian,
};

export function DialogueBubble({ speaker, expression, text, character }: Props) {
  const avatarKey = character?.avatars?.[expression];
  const nameColor = CHARACTER_COLORS[speaker] ?? colors.accent.secondary;

  return (
    <View style={styles.container}>
      <CharacterAvatar
        avatarKey={avatarKey}
        characterId={speaker}
        size={sizes.scene.avatarSize}
      />
      <View style={styles.bubble}>
        <Text style={[styles.name, { color: nameColor }]}>
          {character?.name ?? speaker}
        </Text>
        <Text style={styles.text}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: sizes.spacing.md,
    paddingVertical: sizes.spacing.sm,
    gap: sizes.spacing.sm,
  },
  bubble: {
    flex: 1,
    backgroundColor: colors.bg.card,
    borderRadius: sizes.radius.lg,
    padding: sizes.spacing.md,
    borderWidth: 1,
    borderColor: colors.ui.border,
  },
  name: {
    fontSize: sizes.font.sm,
    fontWeight: "700",
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  text: {
    fontSize: sizes.font.md,
    color: colors.text.primary,
    lineHeight: 22,
  },
});
