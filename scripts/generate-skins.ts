/**
 * Skin batch generator — Layer AI (GraphQL `createInference`, async + poll).
 *
 *   npm run generate-skins            # generate every skin missing a PNG
 *   npm run generate-skins -- --force # regenerate all, overwriting
 *   npm run generate-skins -- rookie  # only these ids
 *
 * Generates ONE dispatcher character wearing a different outfit per skin, in a
 * cel-shaded comic style, full body standing, and saves each as a PNG in
 * assets/skins/<id>.png — offline, pre-baked, shipped to every player.
 *
 * Layer API (verified):
 *   endpoint  https://api.app.layer.ai/graphql
 *   submit    mutation createInference(input){ ... on Inference{ id status } }
 *             use sync:false (sync:true can hang), then POLL.
 *   poll      getWorkspaceById(id){ inferences(input:{first}){ edges{ node{
 *               id status files{ url } } } } }
 *   style     EXPO_PUBLIC_LAYER_STYLE_ID (required by the API; "Cel-shaded").
 *   identity  EXPO_PUBLIC_LAYER_BASE_IMAGE_URL (optional) → img2img from one
 *             base image so the SAME character is kept across every skin.
 */
import * as fs from "fs";
import * as path from "path";
import { SKINS } from "../src/game/skins";

const ENDPOINT =
  process.env.EXPO_PUBLIC_LAYER_API_URL || "https://api.app.layer.ai/graphql";
const OUT_DIR = path.join(__dirname, "..", "assets", "skins");

const GEN = {
  batchSize: 1,
  generationType: "CREATE",
  guidanceScale: 6,
  width: 768, // 2:3 portrait — fits a full-body standing figure head to toe
  height: 1152,
  numInferenceSteps: 30,
};
// Style weight < 1 lets the prompt (full-body framing + moody lighting) come
// through instead of the style forcing a tight portrait crop.
const STYLE_WEIGHT = 0.7;

const POLL_INTERVAL_MS = 4000;
const POLL_TIMEOUT_MS = 240000;

// ── Character + scene (kept IDENTICAL across all skins) ──────────────────────
const CHARACTER =
  "full body long shot of a single male 911 dispatch operator standing, head " +
  "to toe, entire figure visible with legs and shoes, standing on a dark " +
  "reflective floor,";

const FRAMING =
  "dramatic moody dark background, glamorous midnight purple and blue cinematic " +
  "rim lighting, cel-shaded comic illustration, centered, full character visible";

// ── Per-skin outfit (the ONLY thing that changes) ───────────────────────────
const OUTFITS: Record<string, string> = {
  rookie: "plain navy-blue trainee dispatcher uniform",
  neon_pink: "sleek modern dispatcher uniform with hot-pink magenta accents",
  golden_hero: "commander uniform with gold trim and a hero badge",
  // (add more here as you expand the catalog)
  night_shift: "dark blue night-shift dispatcher uniform with reflective trim",
  senior_blues: "steel-blue senior dispatcher uniform with silver service pins",
  supervisor_dress:
    "formal supervisor dress uniform with gold epaulettes and shoulder braid",
  midnight_glam: "elegant tailored black dispatcher uniform with subtle sheen",
  director_legend: "ornate station-director uniform with gold insignia",
};

const buildPrompt = (outfit: string) => `${CHARACTER} ${outfit}, ${FRAMING}.`;

function loadEnv() {
  const envPath = path.join(__dirname, "..", ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

async function gql(query: string, variables?: any) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.EXPO_PUBLIC_LAYER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const json: any = await res.json().catch(() => null);
  if (!res.ok || !json) throw new Error(`HTTP ${res.status} ${res.statusText}`);
  if (json.errors) throw new Error(`GraphQL: ${JSON.stringify(json.errors)}`);
  return json.data;
}

const SUBMIT = `mutation C($input: CreateInferenceInput!){
  createInference(input:$input){ __typename
    ... on Inference{ id status }
    ... on Error{ code message } } }`;

const pollQuery = (ws: string) => `query{
  getWorkspaceById(id:"${ws}"){ ... on Workspace{
    inferences(input:{first:60}){ edges{ node{ id status files{ url } } } } } } }`;

async function submit(skinId: string): Promise<string> {
  const styleId = process.env.EXPO_PUBLIC_LAYER_STYLE_ID;
  // Optional: lock the SAME character across all skins. Set this to the image
  // URL of your chosen base avatar and every skin is generated img2img from it.
  const baseImage = process.env.EXPO_PUBLIC_LAYER_BASE_IMAGE_URL;
  const input = {
    sync: false,
    parameters: {
      ...GEN,
      prompt: buildPrompt(OUTFITS[skinId]),
      styles: styleId ? [{ id: styleId, weight: STYLE_WEIGHT }] : [],
      ...(baseImage ? { initImageUrl: baseImage } : {}),
    },
    workspaceId: process.env.EXPO_PUBLIC_LAYER_WORKSPACE_ID,
  };
  const d = await gql(SUBMIT, { input });
  const ci = d.createInference;
  if (ci.__typename === "Error") throw new Error(`${ci.code}: ${ci.message}`);
  return ci.id as string;
}

async function pollAndDownload(jobs: Record<string, string>) {
  const ws = process.env.EXPO_PUBLIC_LAYER_WORKSPACE_ID!;
  const pending = new Map(Object.entries(jobs)); // inferenceId → skinId
  const start = Date.now();
  while (pending.size && Date.now() - start < POLL_TIMEOUT_MS) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const d = await gql(pollQuery(ws));
    const edges = d.getWorkspaceById?.inferences?.edges ?? [];
    for (const { node } of edges) {
      const skinId = pending.get(node.id);
      if (!skinId) continue;
      if (node.status === "COMPLETE" && node.files?.[0]?.url) {
        const img = await fetch(node.files[0].url);
        const bytes = Buffer.from(await img.arrayBuffer());
        fs.writeFileSync(path.join(OUT_DIR, `${skinId}.png`), bytes);
        console.log(`  ✓ ${skinId}.png (${(bytes.length / 1024).toFixed(0)} KB)`);
        pending.delete(node.id);
      } else if (node.status === "FAILED") {
        console.error(`  ✗ ${skinId}: inference FAILED`);
        pending.delete(node.id);
      }
    }
  }
  for (const skinId of pending.values())
    console.error(`  ✗ ${skinId}: timed out waiting for completion`);
}

function printRegistrySnippet(ids: string[]) {
  console.log("\nSKIN_IMAGES (src/game/assets.ts) — bundled/offline:\n");
  console.log("export const SKIN_IMAGES: Record<string, number | string> = {");
  for (const s of SKINS) {
    const val = ids.includes(s.id)
      ? `require("../../assets/skins/${s.id}.png")`
      : '""';
    console.log(`  ${s.id}: ${val},`);
  }
  console.log("};");
}

async function main() {
  loadEnv();
  for (const k of ["EXPO_PUBLIC_LAYER_API_KEY", "EXPO_PUBLIC_LAYER_WORKSPACE_ID"]) {
    if (!process.env[k]) {
      console.error(`✗ ${k} is not set in .env. (See docs/SKINS_GUIDE.md)`);
      process.exit(1);
    }
  }
  if (!process.env.EXPO_PUBLIC_LAYER_STYLE_ID) {
    console.error("✗ EXPO_PUBLIC_LAYER_STYLE_ID is not set (Layer requires a style).");
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const onlyIds = args.filter((a) => !a.startsWith("--"));

  const targets = (onlyIds.length ? SKINS.filter((s) => onlyIds.includes(s.id)) : SKINS)
    .filter((s) => force || !fs.existsSync(path.join(OUT_DIR, `${s.id}.png`)))
    .map((s) => s.id);

  if (!targets.length) {
    console.log("Nothing to generate (all PNGs exist; use --force to redo).");
  } else {
    console.log(`Submitting ${targets.length} skin(s): ${targets.join(", ")}`);
    const jobs: Record<string, string> = {};
    for (const skinId of targets) {
      try {
        const infId = await submit(skinId);
        jobs[infId] = skinId;
        console.log(`  → ${skinId} submitted (${infId})`);
      } catch (e) {
        console.error(`  ✗ ${skinId}: ${(e as Error).message}`);
      }
    }
    console.log("Waiting for completions…");
    await pollAndDownload(jobs);
  }

  const made = SKINS.map((s) => s.id).filter((id) =>
    fs.existsSync(path.join(OUT_DIR, `${id}.png`))
  );
  printRegistrySnippet(made);
}

main();
