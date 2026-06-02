import * as fs from "fs";
import * as path from "path";

type ValidationError = { path: string; message: string };

function validate(storyPath: string): ValidationError[] {
  const errors: ValidationError[] = [];
  const raw = fs.readFileSync(storyPath, "utf-8");
  const story = JSON.parse(raw);

  if (!story.id) errors.push({ path: "root", message: "Missing story id" });
  if (!story.start_chapter) errors.push({ path: "root", message: "Missing start_chapter" });
  if (!story.characters || Object.keys(story.characters).length === 0) {
    errors.push({ path: "root", message: "No characters defined" });
  }
  if (!story.chapters || story.chapters.length === 0) {
    errors.push({ path: "root", message: "No chapters defined" });
  }

  const allBeatIds = new Set<string>();
  const allChoiceIds = new Set<string>();
  const chapterIds = new Set<string>();
  const referencedNextIds = new Set<string>();

  for (const chapter of story.chapters ?? []) {
    if (chapterIds.has(chapter.id)) {
      errors.push({ path: `chapter:${chapter.id}`, message: "Duplicate chapter id" });
    }
    chapterIds.add(chapter.id);

    if (!chapter.start_beat) {
      errors.push({ path: `chapter:${chapter.id}`, message: "Missing start_beat" });
    }

    const chapterBeatIds = new Set<string>();

    for (const beat of chapter.beats ?? []) {
      if (allBeatIds.has(beat.id)) {
        errors.push({ path: `beat:${beat.id}`, message: "Duplicate beat id" });
      }
      allBeatIds.add(beat.id);
      chapterBeatIds.add(beat.id);

      if (beat.next !== null && beat.next !== undefined) {
        referencedNextIds.add(beat.next);
      }

      if (beat.decision) {
        for (const choice of beat.decision.choices ?? []) {
          if (allChoiceIds.has(choice.id)) {
            errors.push({ path: `choice:${choice.id}`, message: "Duplicate choice id" });
          }
          allChoiceIds.add(choice.id);

          if (!choice.next) {
            errors.push({ path: `choice:${choice.id}`, message: "Choice missing next" });
          } else {
            referencedNextIds.add(choice.next);
          }

          if (choice.gem_cost < 0) {
            errors.push({ path: `choice:${choice.id}`, message: "Negative gem_cost" });
          }
        }
      }

      for (const speaker of (beat.lines ?? []).map((l: any) => l.speaker)) {
        if (speaker !== "narrator" && !story.characters[speaker]) {
          errors.push({ path: `beat:${beat.id}`, message: `Unknown speaker: ${speaker}` });
        }
      }
    }

    if (chapter.start_beat && !chapterBeatIds.has(chapter.start_beat)) {
      errors.push({
        path: `chapter:${chapter.id}`,
        message: `start_beat "${chapter.start_beat}" not found in chapter beats`,
      });
    }
  }

  for (const nextId of referencedNextIds) {
    if (!allBeatIds.has(nextId) && !chapterIds.has(nextId)) {
      errors.push({ path: "reference", message: `Referenced id "${nextId}" not found as beat or chapter` });
    }
  }

  if (!chapterIds.has(story.start_chapter)) {
    errors.push({ path: "root", message: `start_chapter "${story.start_chapter}" not found` });
  }

  return errors;
}

const storyFile = process.argv[2] ?? path.join(__dirname, "../src/content/stories/corazon-en-roaming.json");

console.log(`Validating: ${storyFile}`);
const errors = validate(storyFile);

if (errors.length === 0) {
  console.log("✓ Story is valid!");
  console.log(`  Beats: ${new Set<string>().size} (check logs for count)`);
  process.exit(0);
} else {
  console.error(`✗ ${errors.length} error(s) found:`);
  for (const e of errors) {
    console.error(`  [${e.path}] ${e.message}`);
  }
  process.exit(1);
}
