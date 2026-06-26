import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useWardrobe } from "../context/WardrobeContext";
import { useEconomy } from "../context/EconomyContext";
import { useDispatchProgress } from "../context/DispatchProgressContext";
import {
  skinsForGender,
  getSkinStatus,
  type Skin,
  type Gender,
} from "../game/skins";
import { RANKS } from "../game/ranks";
import { SkinAvatar } from "../components/SkinAvatar";
import { colors } from "../theme/colors";
import { sizes } from "../theme/sizes";

type Props = NativeStackScreenProps<RootStackParamList, "Wardrobe">;

export function WardrobeScreen({ navigation }: Props) {
  const { gender, chooseGender, equippedId, equip, owned, addOwned } =
    useWardrobe();
  const { gems, spend } = useEconomy();
  const { rankIndex } = useDispatchProgress();

  const activeGender: Gender = gender ?? "male";
  const ctx = { rankIndex, gems, owned };
  const skins = skinsForGender(activeGender);

  const handlePress = (skin: Skin) => {
    const status = getSkinStatus(skin, ctx, equippedId);
    if (status === "owned") {
      equip(skin.id); // already unlocked → wear it
    } else if (status === "unlockable") {
      // Premium skin the player can afford: confirm, spend gems, own + equip.
      Alert.alert(skin.name, `Buy for 💎 ${skin.gemCost}?`, [
        { text: "Cancel", style: "cancel" },
        {
          text: "Buy",
          onPress: () => {
            if (spend(skin.gemCost)) {
              addOwned(skin.id);
              equip(skin.id);
            }
          },
        },
      ]);
    } else if (status === "locked_gems") {
      Alert.alert(
        skin.name,
        `You need 💎 ${skin.gemCost} (you have 💎 ${gems}).`
      );
    }
    // equipped / locked_rank → no-op
  };

  const GenderTab = ({ g, label }: { g: Gender; label: string }) => (
    <Pressable
      onPress={() => chooseGender(g)}
      style={[styles.genderBtn, activeGender === g && styles.genderBtnOn]}
    >
      <Text
        style={[
          styles.genderBtnText,
          activeGender === g && styles.genderBtnTextOn,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Wardrobe</Text>
        <View style={[styles.backBtn, styles.gemChip]}>
          <Text style={styles.gemChipText}>💎 {gems}</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Gender switch */}
        <View style={styles.genderRow}>
          <GenderTab g="male" label="Male" />
          <GenderTab g="female" label="Female" />
        </View>

        {/* Equipped preview */}
        <View style={styles.previewCard}>
          <SkinAvatar skinId={equippedId} size={150} shape="portrait" selected />
          <Text style={styles.previewName}>
            {skins.find((s) => s.id === equippedId)?.name ?? ""}
          </Text>
          <Text style={styles.previewTag}>Equipped</Text>
        </View>

        <View style={styles.grid}>
          {skins.map((skin) => (
            <SkinCard
              key={skin.id}
              skin={skin}
              status={getSkinStatus(skin, ctx, equippedId)}
              onPress={() => handlePress(skin)}
            />
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SkinCard({
  skin,
  status,
  onPress,
}: {
  skin: Skin;
  status: ReturnType<typeof getSkinStatus>;
  onPress: () => void;
}) {
  const lockedRank = status === "locked_rank";

  let cta = "";
  let ctaColor: string = colors.dispatch.cyan;
  if (status === "equipped") {
    cta = "Equipped";
    ctaColor = colors.dispatch.cyan;
  } else if (status === "owned") {
    cta = "Equip";
    ctaColor = colors.ui.success;
  } else if (status === "unlockable") {
    cta = `💎 ${skin.gemCost}`;
    ctaColor = colors.dispatch.amber;
  } else if (status === "locked_gems") {
    cta = `💎 ${skin.gemCost}`;
    ctaColor = colors.dispatch.textMuted;
  } else {
    cta = `Reach ${RANKS[skin.rankRequired]?.name ?? ""}`;
    ctaColor = colors.dispatch.textMuted;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={lockedRank || status === "equipped"}
      style={[
        styles.card,
        status === "equipped" && styles.cardEquipped,
        {
          borderColor:
            status === "equipped" ? colors.dispatch.cyan : colors.dispatch.border,
        },
      ]}
    >
      <SkinAvatar
        skinId={skin.id}
        size={72}
        shape="portrait"
        locked={lockedRank}
        selected={status === "equipped"}
      />
      <Text style={styles.cardName} numberOfLines={1}>
        {skin.name}
      </Text>
      <Text style={[styles.cardCta, { color: ctaColor }]} numberOfLines={1}>
        {cta}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dispatch.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: sizes.spacing.md,
    paddingVertical: sizes.spacing.md,
  },
  backBtn: { width: 90 },
  backText: {
    color: colors.dispatch.cyan,
    fontSize: sizes.font.sm,
    fontWeight: "800",
  },
  gemChip: { alignItems: "flex-end" },
  gemChipText: {
    color: colors.dispatch.amber,
    fontSize: sizes.font.sm,
    fontWeight: "900",
  },
  title: {
    color: colors.dispatch.cyan,
    fontSize: sizes.font.lg,
    fontWeight: "900",
    letterSpacing: 2,
    textAlign: "center",
  },
  content: {
    padding: sizes.spacing.md,
    paddingBottom: sizes.spacing.xxl,
    gap: sizes.spacing.md,
  },
  genderRow: {
    flexDirection: "row",
    gap: 8,
    alignSelf: "center",
  },
  genderBtn: {
    paddingHorizontal: 22,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.dispatch.panel,
    borderWidth: 1,
    borderColor: colors.dispatch.border,
  },
  genderBtnOn: {
    backgroundColor: "rgba(34, 211, 238, 0.12)",
    borderColor: colors.dispatch.cyan,
  },
  genderBtnText: {
    color: colors.dispatch.textMuted,
    fontSize: sizes.font.sm,
    fontWeight: "900",
    letterSpacing: 1,
  },
  genderBtnTextOn: { color: colors.dispatch.cyan },
  previewCard: {
    backgroundColor: colors.dispatch.panel,
    borderRadius: sizes.radius.lg,
    padding: sizes.spacing.lg,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.dispatch.border,
  },
  previewName: {
    color: colors.dispatch.text,
    fontSize: sizes.font.lg,
    fontWeight: "900",
  },
  previewTag: {
    color: colors.dispatch.cyan,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  card: {
    width: "31%",
    flexGrow: 1,
    backgroundColor: colors.dispatch.panel,
    borderRadius: sizes.radius.md,
    paddingVertical: 12,
    paddingHorizontal: 6,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
  },
  cardEquipped: { backgroundColor: "rgba(34, 211, 238, 0.08)" },
  cardName: {
    color: colors.dispatch.text,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  cardCta: { fontSize: 10, fontWeight: "800", textAlign: "center" },
});
