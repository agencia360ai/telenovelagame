import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useI18n } from "../context/I18nContext";
import { useSettings } from "../context/SettingsContext";
import { restorePurchases } from "../lib/revenuecat";
import { colors } from "../theme/colors";
import { sizes } from "../theme/sizes";

type Props = NativeStackScreenProps<RootStackParamList, "Settings">;

export function SettingsScreen({ navigation }: Props) {
  const { t } = useI18n();
  const settings = useSettings();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>{"←"}</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t("settings_title")}</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.label}>{t("settings_language")}</Text>
          <View style={styles.langToggle}>
            <TouchableOpacity
              style={[
                styles.langOption,
                settings.locale === "es" && styles.langOptionActive,
              ]}
              onPress={() => settings.setLocale("es")}
            >
              <Text
                style={[
                  styles.langText,
                  settings.locale === "es" && styles.langTextActive,
                ]}
              >
                ES
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.langOption,
                settings.locale === "en" && styles.langOptionActive,
              ]}
              onPress={() => settings.setLocale("en")}
            >
              <Text
                style={[
                  styles.langText,
                  settings.locale === "en" && styles.langTextActive,
                ]}
              >
                EN
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>{t("settings_sound")}</Text>
          <Switch
            value={settings.soundEnabled}
            onValueChange={settings.setSoundEnabled}
            trackColor={{ false: colors.ui.border, true: colors.accent.primary }}
            thumbColor={colors.text.primary}
          />
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>{t("settings_haptics")}</Text>
          <Switch
            value={settings.hapticsEnabled}
            onValueChange={settings.setHapticsEnabled}
            trackColor={{ false: colors.ui.border, true: colors.accent.primary }}
            thumbColor={colors.text.primary}
          />
        </View>

        <TouchableOpacity
          style={styles.actionRow}
          onPress={restorePurchases}
        >
          <Text style={styles.actionText}>{t("settings_restore")}</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    paddingTop: sizes.spacing.xxl + sizes.spacing.md,
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
    gap: sizes.spacing.lg,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: sizes.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.ui.divider,
  },
  label: {
    fontSize: sizes.font.lg,
    color: colors.text.primary,
  },
  langToggle: {
    flexDirection: "row",
    borderRadius: sizes.radius.md,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.ui.border,
  },
  langOption: {
    paddingVertical: sizes.spacing.sm,
    paddingHorizontal: sizes.spacing.lg,
  },
  langOptionActive: {
    backgroundColor: colors.accent.primary,
  },
  langText: {
    fontSize: sizes.font.md,
    color: colors.text.muted,
    fontWeight: "600",
  },
  langTextActive: {
    color: colors.text.primary,
  },
  actionRow: {
    paddingVertical: sizes.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.ui.divider,
  },
  actionText: {
    fontSize: sizes.font.lg,
    color: colors.accent.secondary,
  },
});
