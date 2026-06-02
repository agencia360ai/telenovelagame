import { Beat, Chapter, Line, Story, PlayerState } from "./types";
import { evaluateCondition } from "./conditions";

export function getChapter(
  story: Story,
  chapterId: string
): Chapter | undefined {
  return story.chapters.find((c) => c.id === chapterId);
}

export function getBeat(chapter: Chapter, beatId: string): Beat | undefined {
  return chapter.beats.find((b) => b.id === beatId);
}

export function resolveLines(beat: Beat, state: PlayerState): Line[] {
  if (beat.variants && beat.variants.length > 0) {
    for (const variant of beat.variants) {
      if (evaluateCondition(variant.when, state)) {
        return variant.lines;
      }
    }
  }
  return beat.lines ?? [];
}

export function getNextBeatId(beat: Beat): string | null {
  return beat.next ?? null;
}

export function isChapterTransition(nextId: string | null, story: Story): boolean {
  if (!nextId) return false;
  return story.chapters.some((c) => c.id === nextId);
}

export function getStartingBeat(
  story: Story,
  chapterId: string
): Beat | undefined {
  const chapter = getChapter(story, chapterId);
  if (!chapter) return undefined;
  return getBeat(chapter, chapter.start_beat);
}
