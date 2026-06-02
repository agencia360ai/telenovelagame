import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";
import { sizes } from "../theme/sizes";
import { useI18n } from "../context/I18nContext";

type Props = {
  onPress: () => void;
};

export function NextButton({ onPress }: Props) {
  const { t } = useI18n();

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={styles.text}>{t("reader_next")}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.accent.primary,
    borderRadius: sizes.radius.xl,
    paddingVertical: sizes.spacing.md,
    paddingHorizontal: sizes.spacing.xl,
    alignSelf: "center",
    minWidth: sizes.button.minWidth,
    alignItems: "center",
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  text: {
    color: colors.text.primary,
    fontSize: sizes.font.lg,
    fontWeight: "800",
    letterSpacing: 2,
  },
});
