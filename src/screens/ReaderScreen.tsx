import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { SceneStage } from "../components/SceneStage";
import { DialogueBubble } from "../components/DialogueBubble";
import { ChoiceList } from "../components/ChoiceList";
import { NextButton } from "../components/NextButton";
import { GemBadge } from "../components/GemBadge";
import { useStoryProgress } from "../context/StoryProgressContext";
import { useNarrativeState } from "../context/NarrativeStateContext";
import { useEconomy } from "../context/EconomyContext";
import { useUserIdentity } from "../context/UserIdentityContext";
import { useI18n } from "../context/I18nContext";
import {
  Story,
  Choice,
  Line,
  PlayerState,
} from "../lib/engine/types";
import {
  getChapter,
  getBeat,
  resolveLines,
  isChapterTransition,
} from "../lib/engine/selectors";
import { applyChoiceEffects } from "../lib/engine/effects";
import { savePlayerState } from "../lib/storage";
import { analytics } from "../lib/analytics";
import { colors } from "../theme/colors";
import { sizes } from "../theme/sizes";
import storyData from "../content/stories/corazon-en-roaming.json";

type Props = NativeStackScreenProps<RootStackParamList, "Reader">;

const story = storyData as unknown as Story;

export function ReaderScreen({ navigation, route }: Props) {
  const { chapterId: initialChapterId, beatId: initialBeatId } = route.params;
  const { t } = useI18n();
  const { userId } = useUserIdentity();
  const progress = useStoryProgress();
  const narrative = useNarrativeState();
  const economy = useEconomy();
  const scrollRef = useRef<ScrollView>(null);

  const [chapterId, setChapterId] = useState(initialChapterId);
  const [beatId, setBeatId] = useState(initialBeatId);
  const [displayedLines, setDisplayedLines] = useState<Line[]>([]);
  const [lineIndex, setLineIndex] = useState(0);
  const [showChoices, setShowChoices] = useState(false);
  const [allLinesShown, setAllLinesShown] = useState(false);

  const chapter = getChapter(story, chapterId);
  const beat = chapter ? getBeat(chapter, beatId) : undefined;

  const currentPlayerState = useCallback((): PlayerState => {
    return {
      user_id: userId ?? "local",
      story_id: story.id,
      current_chapter: chapterId,
      current_beat: beatId,
      variables: narrative.variables,
      flags: narrative.flags,
      gems: economy.gems,
      choices_made: progress.choicesMade,
      completed_beats: progress.completedBeats,
      updated_at: new Date().toISOString(),
    };
  }, [
    userId,
    chapterId,
    beatId,
    narrative.variables,
    narrative.flags,
    economy.gems,
    progress.choicesMade,
    progress.completedBeats,
  ]);

  useEffect(() => {
    if (!beat) return;

    analytics.trackBeatView(beat.id);

    const state = currentPlayerState();
    const lines = resolveLines(beat, state);

    setDisplayedLines([]);
    setLineIndex(0);
    setShowChoices(false);
    setAllLinesShown(false);

    if (lines.length > 0) {
      setDisplayedLines([lines[0]]);
      setLineIndex(1);
    } else if (beat.type === "decision" && beat.decision) {
      setShowChoices(true);
    } else {
      setAllLinesShown(true);
    }
  }, [beatId, chapterId]);

  const advanceLine = useCallback(() => {
    if (!beat) return;

    const state = currentPlayerState();
    const lines = resolveLines(beat, state);

    if (lineIndex < lines.length) {
      setDisplayedLines((prev) => [...prev, lines[lineIndex]]);
      setLineIndex((prev) => prev + 1);
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } else {
      if (beat.type === "decision" && beat.decision) {
        setShowChoices(true);
      } else {
        setAllLinesShown(true);
      }
    }
  }, [beat, lineIndex, currentPlayerState]);

  const handleNext = useCallback(() => {
    if (!beat) return;

    progress.markBeatCompleted(beat.id);

    if (beat.type === "chapter_end" || beat.next === null) {
      analytics.trackContinuaraReached();
      const state = currentPlayerState();
      savePlayerState(state);
      navigation.replace("ChapterEnd", { type: "continuara" });
      return;
    }

    if (beat.type === "cliffhanger") {
      analytics.trackChapterComplete(chapterId);
      const state = currentPlayerState();
      savePlayerState(state);

      if (beat.next && isChapterTransition(beat.next, story)) {
        navigation.replace("ChapterEnd", {
          type: "chapter_transition",
          nextChapterId: beat.next,
        });
        return;
      }
    }

    if (beat.next) {
      if (isChapterTransition(beat.next, story)) {
        analytics.trackChapterComplete(chapterId);
        const nextChapter = getChapter(story, beat.next);
        if (nextChapter) {
          setChapterId(beat.next);
          setBeatId(nextChapter.start_beat);
          progress.setCurrentChapter(beat.next);
          progress.setCurrentBeat(nextChapter.start_beat);
          analytics.trackChapterStart(beat.next);
          const state = currentPlayerState();
          savePlayerState({
            ...state,
            current_chapter: beat.next,
            current_beat: nextChapter.start_beat,
          });
        }
      } else {
        setBeatId(beat.next);
        progress.setCurrentBeat(beat.next);
        const state = currentPlayerState();
        savePlayerState({ ...state, current_beat: beat.next });
      }
    }
  }, [beat, chapterId, currentPlayerState, navigation, progress]);

  const handleChoice = useCallback(
    (choice: Choice) => {
      if (choice.gem_cost > 0 && economy.gems < choice.gem_cost) {
        Alert.alert(t("gems_insufficient"), "", [
          { text: t("cancel"), style: "cancel" },
          {
            text: t("gems_go_shop"),
            onPress: () => navigation.navigate("Shop"),
          },
        ]);
        return;
      }

      const state = currentPlayerState();
      const newState = applyChoiceEffects(state, choice);

      if (choice.effects) {
        for (const [key, delta] of Object.entries(choice.effects)) {
          narrative.adjustVariable(key, delta);
        }
      }
      if (choice.set_flags) {
        for (const [key, val] of Object.entries(choice.set_flags)) {
          narrative.setFlag(key, val);
        }
      }
      if (choice.gem_cost > 0) {
        economy.spend(choice.gem_cost);
      }

      progress.addChoice(choice.id);
      progress.markBeatCompleted(beatId);

      analytics.trackChoiceMade(
        choice.id,
        choice.gem_cost,
        (choice.gem_cost ?? 0) > 0
      );

      savePlayerState({
        ...newState,
        current_beat: choice.next,
      });

      if (isChapterTransition(choice.next, story)) {
        const nextChapter = getChapter(story, choice.next);
        if (nextChapter) {
          setChapterId(choice.next);
          setBeatId(nextChapter.start_beat);
          progress.setCurrentChapter(choice.next);
          progress.setCurrentBeat(nextChapter.start_beat);
        }
      } else {
        setBeatId(choice.next);
        progress.setCurrentBeat(choice.next);
      }
    },
    [currentPlayerState, economy, narrative, progress, navigation, beatId, t]
  );

  const handleTapDialogue = useCallback(() => {
    if (!showChoices && !allLinesShown) {
      advanceLine();
    }
  }, [showChoices, allLinesShown, advanceLine]);

  if (!chapter || !beat) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Beat not found</Text>
      </View>
    );
  }

  const chapterTitle = t("reader_chapter_title", {
    number: chapter.order,
    title: chapter.title,
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.chapterLabel} numberOfLines={1}>
          {chapterTitle}
        </Text>
        <GemBadge onPress={() => navigation.navigate("Shop")} />
      </View>

      <SceneStage media={beat.media} />

      <Pressable
        style={styles.dialogueArea}
        onPress={handleTapDialogue}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.dialogueContent}
          showsVerticalScrollIndicator={false}
        >
          {displayedLines.map((line, idx) => (
            <DialogueBubble
              key={`${beat.id}-line-${idx}`}
              speaker={line.speaker}
              expression={line.expr}
              text={line.text}
              character={story.characters[line.speaker]}
              index={idx === displayedLines.length - 1 ? 0 : undefined}
            />
          ))}

          {showChoices && beat.decision && (
            <ChoiceList
              prompt={beat.decision.prompt}
              choices={beat.decision.choices}
              gems={economy.gems}
              onSelect={handleChoice}
            />
          )}
        </ScrollView>
      </Pressable>

      <View style={styles.bottomBar}>
        {!showChoices && !allLinesShown && (
          <NextButton onPress={advanceLine} />
        )}
        {allLinesShown && beat.next !== undefined && (
          <NextButton onPress={handleNext} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: sizes.spacing.md,
    paddingVertical: sizes.spacing.sm,
    backgroundColor: colors.bg.overlay,
  },
  chapterLabel: {
    fontSize: sizes.font.sm,
    color: colors.text.secondary,
    fontWeight: "600",
    flex: 1,
    marginRight: sizes.spacing.sm,
  },
  dialogueArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  dialogueContent: {
    paddingVertical: sizes.spacing.md,
  },
  bottomBar: {
    paddingVertical: sizes.spacing.md,
    paddingBottom: sizes.spacing.lg,
    alignItems: "center",
  },
  errorText: {
    color: colors.text.primary,
    fontSize: sizes.font.lg,
    textAlign: "center",
    marginTop: 100,
  },
});
