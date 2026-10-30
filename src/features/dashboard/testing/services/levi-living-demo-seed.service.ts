/**
 * Import the Levi draft for the disposable dashboard preview account.
 * Run locally with: node --import tsx src/features/dashboard/testing/services/levi-living-demo-seed.service.ts
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { prisma } from "@/lib/db/adapters/prisma.adapter";
import { filesystemMediaStorage } from "@/lib/storage/adapters/filesystem-media.adapter";
import { normalizeRasterImage } from "@/lib/media/services/raster-image.service";
import { livingCharacterProfileSchema } from "@/features/seasons/living/schemas/living-season.schema";
import { livingArtworkSlots } from "@/features/seasons/living/utils/living-artwork-prompt.util";
import { IMAGE_TEMPLATE_DEFINITIONS } from "@/features/seasons/living/image-direction/constants/image-direction.constants";
import { assembleImagePromptPackage, sceneTemplateKey } from "@/features/seasons/living/image-direction/utils/image-prompt-package.util";
import { visualBriefFingerprint } from "@/features/seasons/living/image-direction/utils/visual-intent.util";

const email = "demotest@gmail.com";
const year = 2026;
const quarter = 4;
const assetRoot = path.resolve("assets/living-seasons/levi-2026-q4");
const setting = "An original Survey Corps rooftop planning workshop above a walled city's rooftops";
const visualBrief = "One continuous anime world with stone arches, maps, timber repairs, a rooftop lookout and distant walls. Across seven chapters the workshop becomes orderly and operational when progress is on track, remains incomplete when neutral, or shows a concrete repair backlog when far behind. Levi's restrained expression, pose and the scene lighting evolve together; the world never turns into generic horror or battle imagery.";

const profile = livingCharacterProfileSchema.parse({
  characterName: "Levi Ackerman",
  sourceWork: "Attack on Titan",
  adaptation: "TV anime",
  outputLanguage: "en",
  sources: [
    { id: "official-character", title: "Attack on Titan TV anime, Season 1 character profile", url: "https://shingeki.tv/season1/character/", notes: "Identifies Levi as the Survey Corps captain, known as humanity's strongest soldier; places him with Erwin and Eren and notes losses within his unit." },
    { id: "official-episode-19", title: "Attack on Titan TV anime, episode 19 synopsis", url: "https://shingeki.tv/season1/story/episode_19.php", notes: "Places Levi in a high-pressure choice with Eren and his squad. Use this to ground his practical approach to uncertainty, not to invent a direct quotation." },
    { id: "official-cleaning", title: "Attack on Titan TV anime, official Season 2 Levi special synopsis", url: "https://shingeki.tv/news/archives/3094", notes: "Official material includes Levi's cleaning behavior. It supports visual and occasional conversational references to order and neglected work." },
  ],
  speechPatterns: [
    { description: "Short, exact observations and direct instructions. He treats the user's recorded facts seriously and does not inflate progress or praise weak evidence.", sourceIds: ["official-character", "official-episode-19"] },
    { description: "When a decision is uncertain, he frames the available choices and accepts that outcomes cannot be guaranteed, rather than pretending certainty.", sourceIds: ["official-episode-19"] },
    { description: "Care is mostly shown through attention to preparation, people and consequences; concern can be dry and understated instead of sentimental.", sourceIds: ["official-character", "official-cleaning"] },
  ],
  signaturePhrases: [],
  canonReferences: [
    { description: "Erwin is Levi's commander in the Survey Corps. Refer to him only when a leadership or costly-decision analogy fits naturally.", sourceIds: ["official-character"] },
    { description: "Eren and Levi's squad were involved in a decision under uncertainty. Mention this only in a source-consistent, relevant context.", sourceIds: ["official-episode-19"] },
    { description: "Levi's preference for keeping a space clean and usable can appear as a dry observation about neglected work, never as an invented event.", sourceIds: ["official-cleaning"] },
  ],
  responseToSuccess: "Notice concrete progress with sparse approval, then name what has to be maintained. Do not make him euphoric or theatrical.",
  responseToSetback: "Name the measurable gap plainly. Avoid insults, invented motives, fatalism or a generic drill-sergeant voice. Point to the next concrete choice.",
  responseToRecovery: "Recognize a credible first step without calling it victory. Ask for the next repeatable action.",
  visualDirection: "Attack on Titan TV-anime Levi: short black undercut with side-swept fringe, cool grey eyes, compact build, Survey Corps jacket and green cloak. Reserved posture, controlled expressions; disappointment reads in his eyes and shoulders, success in a subtle easing of tension. Original rooftop workshop remains the same location through all chapters.",
  visualBoundaries: "Keep the same recognizable face, costume, body proportions and workshop. No extra people, generic super-hero poses, gore or automatic rage. Scenery and expression should react together. A phone composition must show his face and upper body clearly at 320 px; no interface copy over his face.",
});

async function storeImage(source: string, seasonId: string) {
  const raw = await readFile(path.join(assetRoot, source));
  const image = await normalizeRasterImage(raw);
  const storageKey = `media/seasons/${seasonId}/${randomUUID()}.webp`;
  await filesystemMediaStorage().put(storageKey, image.bytes);
  return { storageKey, width: image.width, height: image.height };
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("The Levi demo pack may only be seeded locally.");
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (!user) throw new Error(`Disposable account ${email} is missing.`);
  const season = await prisma.userSeason.findUnique({ where: { userId_year_quarter: { userId: user.id, year, quarter } } });
  if (!season || season.closedAt) throw new Error("The demo Season is unavailable or closed.");

  let identity = await prisma.seasonCotsIdentity.findFirst({ where: { userId: user.id, seasonId: season.id, active: true } });
  if (identity && identity.displayName !== profile.characterName) throw new Error("The demo Season already has another active character.");
  if (!identity) {
    identity = await prisma.seasonCotsIdentity.create({ data: {
      userId: user.id, seasonId: season.id, displayName: profile.characterName, subjectKind: "FICTIONAL",
    } });
    await prisma.seasonCotsContext.create({ data: {
      userId: user.id, identityId: identity.id, revision: 1, category: "anime",
      sourceWork: profile.sourceWork, adaptation: profile.adaptation, language: "en",
    } });
  }
  if (!identity) throw new Error("Could not create the demo character.");

  let pack = await prisma.livingSeasonPack.findUnique({ where: { seasonId: season.id } });
  if (pack && (pack.identityId !== identity.id || pack.setting !== setting || pack.visualBrief !== visualBrief))
    throw new Error("The demo Season has a different Living Season draft. Review it before replacing anything.");
  pack ??= await prisma.livingSeasonPack.create({ data: { userId: user.id, seasonId: season.id, identityId: identity.id, setting, visualBrief } });

  let savedProfile = await prisma.livingSeasonProfile.findFirst({ where: { packId: pack.id }, orderBy: { version: "desc" } });
  if (savedProfile && !isDeepStrictEqual(savedProfile.content, profile))
    throw new Error("The demo pack has a different profile revision. Review it before replacing anything.");
  savedProfile ??= await prisma.livingSeasonProfile.create({ data: {
    userId: user.id, packId: pack.id, identityId: identity.id, version: 1, content: profile,
  } });

  const visualIntent = {
    feeling: "Disciplined resolve and understated concern",
    demeanor: "Controlled, observant and direct rather than theatrical",
    anchors: "Levi's recognizable face, short black undercut, grey eyes, Survey Corps jacket and green cloak",
    atmosphere: "A purposeful rooftop workshop with detailed city depth and character-appropriate light",
    avoid: "Generic battle poses, extra people, automatic rage, gore and altered costume or proportions",
  };
  const fingerprint = visualBriefFingerprint(identity.id, savedProfile.version, setting, visualBrief);
  let intent = await prisma.livingVisualIntent.findFirst({ where: { packId: pack.id }, orderBy: { version: "desc" } });
  intent ??= await prisma.livingVisualIntent.create({ data: {
    userId: user.id, packId: pack.id, identityId: identity.id, profileVersion: savedProfile.version,
    briefFingerprint: fingerprint, version: 1, content: visualIntent,
  } });
  await prisma.imageDirectionTemplateVersion.createMany({ data: IMAGE_TEMPLATE_DEFINITIONS.map((item) => ({ userId: user.id, key: item.key, version: 1, text: item.text, publishedAt: new Date() })), skipDuplicates: true });
  const rows = await prisma.imageDirectionTemplateVersion.findMany({ where: { userId: user.id, publishedAt: { not: null } }, orderBy: { version: "desc" } });
  const templates = IMAGE_TEMPLATE_DEFINITIONS.map((item) => {
    const row = rows.find((candidate) => candidate.key === item.key);
    if (!row) throw new Error(`Missing image template ${item.key}`);
    return { key: row.key, version: row.version, text: row.text };
  });
  const promptFor = (variant: "reference-sheet" | `scene-${string}`, slot?: (typeof livingArtworkSlots)[number], reference?: { id: string; storageKey: string }) =>
    assembleImagePromptPackage({ variant, slot, profile, visualIntent, setting, visualBrief,
      identityId: identity.id, profileVersion: savedProfile.version, briefRevision: pack.briefRevision,
      intentVersion: intent.version, templates,
      references: reference ? [{ kind: "reference-sheet", id: reference.id, storageKey: reference.storageKey, href: `/api/direction/seasons/living/reference/${reference.id}` }] : [],
    });

  let reference = await prisma.livingSeasonReference.findFirst({ where: { packId: pack.id }, orderBy: { revision: "desc" } });
  if (!reference) {
    const image = await storeImage("reference-v1.png", season.id);
    const promptPackage = promptFor("reference-sheet");
    reference = await prisma.livingSeasonReference.create({ data: {
      userId: user.id, packId: pack.id, identityId: identity.id, briefRevision: pack.briefRevision,
      profileVersion: savedProfile.version, revision: 1, prompt: promptPackage.prompt, promptPackage, ...image,
    } });
  }

  let added = 0;
  for (const slot of livingArtworkSlots) {
    const existing = await prisma.livingSeasonArtwork.findFirst({ where: { packId: pack.id, ...slot }, orderBy: { revision: "desc" } });
    if (existing) continue;
    const state = slot.state.toLowerCase().replaceAll("_", "-");
    const format = slot.format.toLowerCase();
    const source = `ch${String(slot.chapter).padStart(2, "0")}-${state}-${format}.png`;
    const image = await storeImage(source, season.id);
    if (format === "mobile" ? image.width / image.height > 0.85 : image.width / image.height < 1.4)
      throw new Error(`${source} is not a valid ${format} composition.`);
    const promptPackage = promptFor(sceneTemplateKey(slot) as `scene-${string}`, slot, reference);
    await prisma.livingSeasonArtwork.create({ data: {
      userId: user.id, packId: pack.id, identityId: identity.id, briefRevision: pack.briefRevision,
      ...slot, revision: 1, prompt: promptPackage.prompt, promptPackage, ...image,
    } });
    added++;
  }

  console.log(JSON.stringify({ account: email, season: `${year} Q${quarter}`, character: identity.displayName, newArtwork: added, active: Boolean(pack.activeAt) }));
}

main().finally(() => prisma.$disconnect()).catch((error) => { console.error(error); process.exitCode = 1; });
