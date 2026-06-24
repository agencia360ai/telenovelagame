/**
 * Mission content linter. Run before shipping:
 *   npm run validate-missions
 *
 * Validates every src/content/missions/*.json against the `mission@1` schema:
 * reachability, dangling `next`, duplicate ids, unknown dispatch units, beats
 * that reference an undeclared asset, and basic decision/dispatch sanity.
 */
import * as fs from "fs";
import * as path from "path";

type Err = { file: string; path: string; message: string };

const UNITS = new Set(["police", "firefighters", "border_patrol"]);
const SPEAKERS = new Set(["caller", "operator", "dispatch", "narrator"]);

function validateMission(file: string, m: any): Err[] {
  const errs: Err[] = [];
  const add = (p: string, message: string) => errs.push({ file, path: p, message });

  if (m.schema !== "mission@1") add("root", `schema must be "mission@1"`);
  if (!m.id) add("root", "missing id");
  if (!m.start) add("root", "missing start beat id");
  if (!m.caller?.name || !m.caller?.type || !m.caller?.location) {
    add("root", "caller must have name, type and location");
  }
  if (typeof m.reward !== "number") add("root", "missing numeric reward");
  if (![1, 2, 3].includes(m.difficulty)) add("root", "difficulty must be 1, 2 or 3");
  if (m.category !== undefined && !["daily", "game_plot", "weekend"].includes(m.category)) {
    add("root", `bad category: ${m.category} (expected daily | game_plot | weekend)`);
  }

  const assetKeys = new Set<string>((m.assets ?? []).map((a: any) => a.key));
  for (const a of m.assets ?? []) {
    if (!a.key) add("assets", "asset missing key");
    if (!["video", "image"].includes(a.type)) add(`asset:${a.key}`, "bad type");
    if (!["intro", "ambient", "deploy", "still", "portrait"].includes(a.role)) {
      add(`asset:${a.key}`, `bad role: ${a.role}`);
    }
  }

  const beatIds = new Set<string>();
  const referenced = new Set<string>();
  const requireMedia = (where: string, ref: any) => {
    if (ref?.key && !assetKeys.has(ref.key)) {
      add(where, `media key "${ref.key}" not declared in assets[]`);
    }
  };

  for (const beat of m.beats ?? []) {
    if (beatIds.has(beat.id)) add(`beat:${beat.id}`, "duplicate beat id");
    beatIds.add(beat.id);

    if (!["dialogue", "decision", "dispatch", "outcome"].includes(beat.type)) {
      add(`beat:${beat.id}`, `bad beat type: ${beat.type}`);
    }

    requireMedia(`beat:${beat.id}`, beat.media);
    requireMedia(`beat:${beat.id}`, beat.deploy_media);

    const allLines = [
      ...(beat.lines ?? []),
      ...((beat.variants ?? []).flatMap((v: any) => v.lines ?? [])),
    ];
    for (const line of allLines) {
      if (!SPEAKERS.has(line.speaker)) {
        add(`beat:${beat.id}`, `unknown speaker: ${line.speaker}`);
      }
    }

    if (beat.next) referenced.add(beat.next);

    if (beat.type === "decision") {
      if (!beat.prompt) add(`beat:${beat.id}`, "decision missing prompt");
      if (!beat.choices?.length) add(`beat:${beat.id}`, "decision has no choices");
      for (const c of beat.choices ?? []) {
        if (!c.id) add(`beat:${beat.id}`, "choice missing id");
        if (!c.next) add(`choice:${c.id}`, "choice missing next");
        else referenced.add(c.next);
        if (typeof c.gem_cost === "number" && c.gem_cost < 0) {
          add(`choice:${c.id}`, "negative gem_cost");
        }
      }
    }

    if (beat.type === "dispatch") {
      const declared = [
        beat.correct,
        beat.default_correct,
        ...((beat.correct_rules ?? []).map((r: any) => r.unit)),
      ].filter(Boolean);
      if (declared.length === 0) {
        add(`beat:${beat.id}`, "dispatch beat has no correct/default_correct/correct_rules");
      }
      for (const u of declared) {
        if (!UNITS.has(u)) add(`beat:${beat.id}`, `unknown unit: ${u}`);
      }
      if (!beat.explanation) add(`beat:${beat.id}`, "dispatch missing explanation");
    }
  }

  if (m.start && !beatIds.has(m.start)) {
    add("root", `start beat "${m.start}" not found`);
  }
  for (const id of referenced) {
    if (!beatIds.has(id)) add("reference", `next "${id}" is not a beat`);
  }

  return errs;
}

const dir = path.join(__dirname, "../src/content/missions");
const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));

let total = 0;
for (const file of files) {
  const raw = fs.readFileSync(path.join(dir, file), "utf-8");
  let json: any;
  try {
    json = JSON.parse(raw);
  } catch (e) {
    console.error(`✗ ${file}: invalid JSON — ${(e as Error).message}`);
    total++;
    continue;
  }
  const errs = validateMission(file, json);
  total += errs.length;
  if (errs.length === 0) {
    console.log(`✓ ${file} — ${json.beats?.length ?? 0} beats, ok`);
  } else {
    for (const e of errs) console.error(`✗ ${e.file} [${e.path}] ${e.message}`);
  }
}

if (total > 0) {
  console.error(`\n${total} error(s) found.`);
  process.exit(1);
} else {
  console.log(`\nAll ${files.length} mission(s) valid.`);
}
