import * as fs from "fs";
import * as path from "path";

const storiesDir = path.join(__dirname, "../src/content/stories");
const manifestPath = path.join(__dirname, "../src/content/manifest.json");

const storyFiles = fs.readdirSync(storiesDir).filter((f) => f.endsWith(".json"));

const stories = storyFiles.map((file) => {
  const raw = fs.readFileSync(path.join(storiesDir, file), "utf-8");
  const story = JSON.parse(raw);
  return {
    id: story.id,
    file: `stories/${file}`,
    version: story.version,
    chapters: story.chapters?.length ?? 0,
    locale_default: story.locale_default ?? "es",
  };
});

const manifest = {
  version: "1.0.0",
  generated_at: new Date().toISOString(),
  stories,
};

fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`✓ Manifest generated with ${stories.length} story(ies)`);
