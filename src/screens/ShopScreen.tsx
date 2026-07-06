import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useI18n } from "../context/I18nContext";
import { useEconomy } from "../context/EconomyContext";
import { GemBadge } from "../components/GemBadge";
import { GEM_PACKS, purchaseGemPack } from "../lib/revenuecat";
import { analytics } from "../lib/analytics";
import { colors } from "../theme/colors";
import { sizes } from "../theme/sizes";
import { cardStyles } from "../theme/cardStyles";

type Props = NativeStackScreenProps<RootStackParamList, "Shop">;

export function ShopScreen({ navigation }: Props) {
  const { t } = useI18n();
  const { gems, earn } = useEconomy();

  const handlePurchase = async (packId: string) => {
    const result = await purchaseGemPack(packId);
    if (result.success) {
      earn(result.gems);
      analytics.trackGemPurchase(result.gems, packId);
    }
  };

  const handleFreeGems = () => {
    earn(5);
    analytics.track("gem_earned_ad");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>{"←"}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t("shop_title")}</Text>
        <GemBadge />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={[cardStyles.cardElevated, styles.freeGemsCard]}
          onPress={handleFreeGems}
          activeOpacity={0.7}
        >
          <Text style={styles.freeGemsIcon}>{"🎬"}</Text>
          <View>
            <Text style={styles.freeGemsTitle}>{t("shop_gems_free")}</Text>
            <Text style={styles.freeGemsDesc}>{t("shop_gems_free_desc")}</Text>
          </View>
          <Text style={styles.freeGemsReward}>+5 {"💎"}</Text>
        </TouchableOpacity>

        <View style={styles.packsGrid}>
          {GEM_PACKS.map((pack) => (
            <TouchableOpacity
              key={pack.id}
              style={[cardStyles.cardElevated, styles.packCard]}
              onPress={() => handlePurchase(pack.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.packGems}>{"💎"} {pack.gems}</Text>
              <Text style={styles.packLabel}>{pack.label}</Text>
              <View style={styles.priceButton}>
                <Text style={styles.priceText}>{pack.price}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: sizes.spacing.lg,
    paddingTop: sizes.spacing.md, // SafeAreaView already covers the status bar
    paddingBottom: sizes.spacing.md,
  },
  backButton: {
    fontSize: 28,
    color: colors.text.primary,
  },
  title: {
    fontSize: sizes.font.xl,
    fontWeight: "700",
    color: colors.text.primary,
  },
  content: {
    padding: sizes.spacing.lg,
  },
  freeGemsCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: sizes.spacing.md,
    marginBottom: sizes.spacing.xl,
    borderColor: colors.accent.gold,
  },
  freeGemsIcon: {
    fontSize: 32,
  },
  freeGemsTitle: {
    fontSize: sizes.font.lg,
    fontWeight: "700",
    color: colors.accent.gold,
  },
  freeGemsDesc: {
    fontSize: sizes.font.sm,
    color: colors.text.secondary,
  },
  freeGemsReward: {
    fontSize: sizes.font.lg,
    fontWeight: "700",
    color: colors.accent.gem,
    marginLeft: "auto",
  },
  packsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: sizes.spacing.md,
  },
  packCard: {
    width: "47%",
    alignItems: "center",
    gap: sizes.spacing.sm,
  },
  packGems: {
    fontSize: sizes.font.xxl,
    fontWeight: "800",
    color: colors.accent.gem,
  },
  packLabel: {
    fontSize: sizes.font.sm,
    color: colors.text.secondary,
  },
  priceButton: {
    backgroundColor: colors.accent.primary,
    borderRadius: sizes.radius.full,
    paddingVertical: sizes.spacing.sm,
    paddingHorizontal: sizes.spacing.lg,
    marginTop: sizes.spacing.sm,
  },
  priceText: {
    color: colors.text.primary,
    fontSize: sizes.font.md,
    fontWeight: "700",
  },
});
