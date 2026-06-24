import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Pressable,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useI18n } from "../context/I18nContext";
import { useWardrobe } from "../context/WardrobeContext";
import { useEconomy } from "../context/EconomyContext";
import { useDispatchProgress } from "../context/DispatchProgressContext";
import { SKINS, getSkinStatus, type Skin, type SkinTier } from "../game/skins";
import { RANKS } from "../game/ranks";
import { SkinAvatar } from "../components/SkinAvatar";
import { GemBadge } from "../components/GemBadge";
import { colors } from "../theme/colors";
import { sizes } from "../theme/sizes";

type Props = NativeStackScreenProps<RootStackParamList, "Wardrobe">;

const TIER_ORDER: SkinTier[] = ["rank", "premium", "prestige"];

export function WardrobeScreen({ navigation }: Props) {
  const { t } = useI18n();
  const { owned, equippedId, unlock, equip } = useWardrobe();
  const { gems } = useEconomy();
  const { rankIndex } = useDispatchProgress();

  const ctx = { rankIndex, gems, owned };

  const handlePress = (skin: Skin) => {
    const status = getSkinStatus(skin, ctx, equippedId);
    if (status === "equipped") return;
    if (status === "owned") {
      equip(skin.id);
      return;
    }
    if (status === "unlockable") {
      const res = unlock(skin.id);
      if (res.ok) equip(skin.id);
    }
    // locked_rank / locked_gems → no-op (the card shows the requirement)
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← {t("wardrobe_back")}</Text>
        </Pressable>
        <Text style={styles.title}>{t("wardrobe_title")}</Text>
        <GemBadge />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Equipped preview */}
        <View style={styles.previewCard}>
          <SkinAvatar skinId={equippedId} size={150} shape="portrait" selected />
          <Text style={styles.previewName}>
            {SKINS.find((s) => s.id === equippedId)?.name ?? ""}
          </Text>
          <Text style={styles.previewTag}>{t("wardrobe_equipped")}</Text>
        </View>

        {TIER_ORDER.map((tier) => {
          const skins = SKINS.filter((s) => s.tier === tier);
          if (skins.length === 0) return null;
          return (
            <View key={tier} style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t(`wardrobe_tier_${tier}`)}
              </Text>
              <View style={styles.grid}>
                {skins.map((skin) => (
                  <SkinCard
                    key={skin.id}
                    skin={skin}
                    status={getSkinStatus(skin, ctx, equippedId)}
                    onPress={() => handlePress(skin)}
                    t={t}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

function SkinCard({
  skin,
  status,
  onPress,
  t,
}: {
  skin: Skin;
  status: ReturnType<typeof getSkinStatus>;
  onPress: () => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}) {
  const locked = status === "locked_rank" || status === "locked_gems";

  let cta = "";
  let ctaColor: string = colors.dispatch.cyan;
  if (status === "equipped") {
    cta = t("wardrobe_equipped");
    ctaColor = colors.dispatch.cyan;
  } else if (status === "owned") {
    cta = t("wardrobe_equip");
    ctaColor = colors.ui.success;
  } else if (status === "unlockable") {
    cta =
      skin.gemCost > 0
        ? t("wardrobe_unlock_gems", { cost: skin.gemCost })
        : t("wardrobe_unlock_free");
    ctaColor = colors.accent.gold;
  } else if (status === "locked_rank") {
    cta = t("wardrobe_need_rank", {
      rank: RANKS[skin.rankRequired]?.name ?? "",
    });
    ctaColor = colors.dispatch.textMuted;
  } else if (status === "locked_gems") {
    cta = t("wardrobe_need_gems", { cost: skin.gemCost });
    ctaColor = colors.dispatch.textMuted;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={locked || status === "equipped"}
      style={[
        styles.card,
        status === "equipped" && styles.cardEquipped,
        { borderColor: status === "equipped" ? colors.dispatch.cyan : colors.dispatch.border },
      ]}
    >
      <SkinAvatar
        skinId={skin.id}
        size={72}
        shape="portrait"
        locked={locked}
        selected={status === "equipped"}
      />
      <Text style={styles.cardName} numberOfLines={1}>
        {skin.name}
      </Text>
      <Text style={[styles.cardCta, { color: ctaColor }]} numberOfLines={1}>
        {status === "unlockable" && skin.gemCost > 0 ? "💎 " : ""}
        {cta}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.dispatch.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: sizes.spacing.md,
    paddingVertical: sizes.spacing.md,
  },
  backBtn: {
    width: 90,
  },
  backText: {
    color: colors.dispatch.cyan,
    fontSize: sizes.font.sm,
    fontWeight: "800",
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
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: colors.dispatch.textMuted,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 4,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
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
  cardEquipped: {
    backgroundColor: "rgba(34, 211, 238, 0.08)",
  },
  cardName: {
    color: colors.dispatch.text,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  cardCta: {
    fontSize: 10,
    fontWeight: "800",
    textAlign: "center",
  },
});
