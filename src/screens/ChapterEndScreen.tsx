import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useI18n } from "../context/I18nContext";
import { useStoryProgress } from "../context/StoryProgressContext";
import { getChapter } from "../lib/engine/selectors";
import { analytics } from "../lib/analytics";
import { colors } from "../theme/colors";
import { sizes } from "../theme/sizes";
import storyData from "../content/stories/corazon-en-roaming.json";
import { Story } from "../lib/engine/types";

type Props = NativeStackScreenProps<RootStackParamList, "ChapterEnd">;

const story = storyData as unknown as Story;

export function ChapterEndScreen({ navigation, route }: Props) {
  const { type, nextChapterId } = route.params;
  const { t } = useI18n();
  const progress = useStoryProgress();

  const handleContinue = () => {
    if (type === "chapter_transition" && nextChapterId) {
      const nextChapter = getChapter(story, nextChapterId);
      if (nextChapter) {
        progress.setCurrentChapter(nextChapterId);
        progress.setCurrentBeat(nextChapter.start_beat);
        analytics.trackChapterStart(nextChapterId);

        navigation.replace("Reader", {
          storyId: story.id,
          chapterId: nextChapterId,
          beatId: nextChapter.start_beat,
        });
      }
    } else {
      navigation.replace("Home");
    }
  };

  const isContinuara = type === "continuara";

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>
          {isContinuara ? t("continuara_title") : t("chapter_end_title")}
        </Text>

        {isContinuara && (
          <>
            <Text style={styles.message}>{t("continuara_message")}</Text>
            <Text style={styles.thanks}>{t("continuara_thanks")}</Text>
          </>
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {isContinuara ? "Volver al inicio" : t("chapter_end_next")}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: sizes.spacing.xl,
    gap: sizes.spacing.lg,
  },
  title: {
    fontSize: sizes.font.title,
    fontWeight: "800",
    color: colors.accent.primary,
    textAlign: "center",
  },
  message: {
    fontSize: sizes.font.lg,
    color: colors.text.secondary,
    textAlign: "center",
    lineHeight: 26,
  },
  thanks: {
    fontSize: sizes.font.md,
    color: colors.accent.gold,
    fontWeight: "600",
  },
  button: {
    backgroundColor: colors.accent.primary,
    borderRadius: sizes.radius.xl,
    paddingVertical: sizes.spacing.md,
    paddingHorizontal: sizes.spacing.xxl,
    marginTop: sizes.spacing.lg,
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonText: {
    color: colors.text.primary,
    fontSize: sizes.font.lg,
    fontWeight: "800",
    letterSpacing: 1,
  },
});
