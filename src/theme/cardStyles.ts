import { StyleSheet } from "react-native";
import { colors } from "./colors";
import { sizes } from "./sizes";

export const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.card,
    borderRadius: sizes.radius.lg,
    padding: sizes.spacing.lg,
    borderWidth: 1,
    borderColor: colors.ui.border,
  },
  cardElevated: {
    backgroundColor: colors.bg.card,
    borderRadius: sizes.radius.lg,
    padding: sizes.spacing.lg,
    borderWidth: 1,
    borderColor: colors.ui.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: sizes.spacing.lg,
    paddingVertical: sizes.spacing.md,
  },
});
