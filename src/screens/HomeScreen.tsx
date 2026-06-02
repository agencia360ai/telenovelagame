import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useI18n } from "../context/I18nContext";
import { useStoryProgress } from "../context/StoryProgressContext";
import { useNarrativeState } from "../context/NarrativeStateContext";
import { useEconomy } from "../context/EconomyContext";
import { useUserIdentity } from "../context/UserIdentityContext";
import { GemBadge } from "../components/GemBadge";
import { colors } from "../theme/colors";
import { sizes } from "../theme/sizes";
import { cardStyles } from "../theme/cardStyles";
import { loadPlayerState } from "../lib/storage";
import { analytics } from "../lib/analytics";
import storyData from "../content/stories/corazon-en-roaming.json";
import { Story } from "../lib/engine/types";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

const story = storyData as unknown as Story;

export function HomeScreen({ navigation }: Props) {
  const { t } = useI18n();
  const { userId } = useUserIdentity();
  const progress = useStoryProgress();
  const narrative = useNarrativeState();
  const economy = useEconomy();
  const [hasSave, setHasSave] = useState(false);

  useEffect(() => {
    (async () => {
      const saved = await loadPlayerState(story.id);
      if (saved) {
        setHasSave(true);
      }
    })();
  }, []);

  const startNewGame = () => {
    progress.loadProgress({
      storyId: story.id,
      currentChapter: story.start_chapter,
      currentBeat: story.chapters[0].start_beat,
      completedBeats: [],
      choicesMade: [],
    });
    narrative.loadState(
      { ...story.initial_variables },
      { ...story.initial_flags }
    );
    economy.setGems(story.starting_gems);
    analytics.trackStoryStart(story.id);
    analytics.trackChapterStart(story.start_chapter);

    navigation.navigate("Reader", {
      storyId: story.id,
      chapterId: story.start_chapter,
      beatId: story.chapters[0].start_beat,
    });
  };

  const continueGame = async () => {
    const saved = await loadPlayerState(story.id);
    if (!saved) return;

    progress.loadProgress({
      storyId: saved.story_id,
      currentChapter: saved.current_chapter,
      currentBeat: saved.current_beat,
      completedBeats: saved.completed_beats,
      choicesMade: saved.choices_made,
    });
    narrative.loadState(saved.variables, saved.flags);
    economy.setGems(saved.gems);

    navigation.navigate("Reader", {
      storyId: saved.story_id,
      chapterId: saved.current_chapter,
      beatId: saved.current_beat,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate("Settings")}>
          <Text style={styles.headerIcon}>{"⚙️"}</Text>
        </TouchableOpacity>
        <GemBadge onPress={() => navigation.navigate("Shop")} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heroSection}>
          <Text style={styles.appTitle}>{"Corazón en Roaming"}</Text>
          <Text style={styles.subtitle}>Una historia de amor y secretos</Text>
        </View>

        <View style={[cardStyles.cardElevated, styles.storyCard]}>
          <View style={styles.storyInfo}>
            <Text style={styles.storyTitle}>{story.title}</Text>
            <Text style={styles.storyMeta}>
              {story.chapters.length} {story.chapters.length === 1 ? "capítulo" : "capítulos"}
            </Text>
          </View>

          {hasSave ? (
            <View style={styles.buttonGroup}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={continueGame}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>{t("home_continue")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={startNewGame}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryButtonText}>
                  {t("home_new_game")}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={startNewGame}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryButtonText}>{t("home_play")}</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.chapterList}>
          <Text style={styles.sectionTitle}>Capítulos</Text>
          {story.chapters.map((chapter) => (
            <View key={chapter.id} style={[cardStyles.card, styles.chapterCard]}>
              <Text style={styles.chapterNumber}>
                {t("home_chapter", { number: chapter.order })}
              </Text>
              <Text style={styles.chapterTitle}>{chapter.title}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
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
  headerIcon: {
    fontSize: 24,
  },
  content: {
    paddingHorizontal: sizes.spacing.lg,
    paddingBottom: sizes.spacing.xxl,
  },
  heroSection: {
    alignItems: "center",
    paddingVertical: sizes.spacing.xl,
  },
  appTitle: {
    fontSize: sizes.font.title,
    fontWeight: "800",
    color: colors.accent.primary,
    textAlign: "center",
  },
  subtitle: {
    fontSize: sizes.font.md,
    color: colors.text.secondary,
    marginTop: sizes.spacing.sm,
  },
  storyCard: {
    marginBottom: sizes.spacing.xl,
  },
  storyInfo: {
    marginBottom: sizes.spacing.lg,
  },
  storyTitle: {
    fontSize: sizes.font.xl,
    fontWeight: "700",
    color: colors.text.primary,
  },
  storyMeta: {
    fontSize: sizes.font.sm,
    color: colors.text.muted,
    marginTop: 4,
  },
  buttonGroup: {
    gap: sizes.spacing.sm,
  },
  primaryButton: {
    backgroundColor: colors.accent.primary,
    borderRadius: sizes.radius.xl,
    paddingVertical: sizes.spacing.md,
    alignItems: "center",
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    color: colors.text.primary,
    fontSize: sizes.font.lg,
    fontWeight: "800",
    letterSpacing: 1,
  },
  secondaryButton: {
    borderRadius: sizes.radius.xl,
    paddingVertical: sizes.spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.ui.border,
  },
  secondaryButtonText: {
    color: colors.text.secondary,
    fontSize: sizes.font.md,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: sizes.font.lg,
    fontWeight: "700",
    color: colors.text.primary,
    marginBottom: sizes.spacing.md,
  },
  chapterList: {
    gap: sizes.spacing.sm,
  },
  chapterCard: {
    marginBottom: sizes.spacing.sm,
  },
  chapterNumber: {
    fontSize: sizes.font.xs,
    color: colors.accent.secondary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  chapterTitle: {
    fontSize: sizes.font.lg,
    color: colors.text.primary,
    fontWeight: "600",
    marginTop: 4,
  },
});
