import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useWardrobe } from "../context/WardrobeContext";
import { SkinAvatar } from "../components/SkinAvatar";
import { DEFAULT_SKIN_BY_GENDER, type Gender } from "../game/skins";
import { colors } from "../theme/colors";
import { sizes } from "../theme/sizes";

type Props = NativeStackScreenProps<RootStackParamList, "GenderSelect">;

/** First-launch screen: pick the avatar gender, then enter the dispatch center. */
export function GenderSelectScreen({ navigation }: Props) {
  const { chooseGender } = useWardrobe();

  const pick = (g: Gender) => {
    chooseGender(g);
    navigation.replace("DispatchLobby");
  };

  const Card = ({ g, label }: { g: Gender; label: string }) => (
    <Pressable style={styles.card} onPress={() => pick(g)}>
      <SkinAvatar skinId={DEFAULT_SKIN_BY_GENDER[g]} size={130} shape="portrait" />
      <Text style={styles.cardLabel}>{label}</Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>ELIGE TU DESPACHADOR</Text>
      <Text style={styles.subtitle}>Podrás cambiarlo luego en el vestuario.</Text>
      <View style={styles.row}>
        <Card g="female" label="Chica" />
        <Card g="male" label="Chico" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dispatch.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: sizes.spacing.lg,
    gap: sizes.spacing.md,
  },
  title: {
    color: colors.dispatch.cyan,
    fontSize: sizes.font.xl,
    fontWeight: "900",
    letterSpacing: 2,
    textAlign: "center",
  },
  subtitle: {
    color: colors.dispatch.textMuted,
    fontSize: sizes.font.sm,
    textAlign: "center",
    marginBottom: sizes.spacing.lg,
  },
  row: {
    flexDirection: "row",
    gap: sizes.spacing.lg,
  },
  card: {
    alignItems: "center",
    gap: sizes.spacing.sm,
    backgroundColor: colors.dispatch.panel,
    borderRadius: sizes.radius.lg,
    padding: sizes.spacing.lg,
    borderWidth: 1,
    borderColor: colors.dispatch.border,
  },
  cardLabel: {
    color: colors.dispatch.text,
    fontSize: sizes.font.lg,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
