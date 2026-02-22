/**
 * Cover image generation for weekly digests.
 * Uses Claude to craft a visual prompt from digest text,
 * then Replicate FLUX Dev to generate the image.
 */
import Anthropic from '@anthropic-ai/sdk';
import config from './config.js';

let anthropic = null;


function getAnthropic() {
  if (!anthropic) {
    if (!config.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY not configured');
    anthropic = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY });
  }
  return anthropic;
}

export const WC3_STYLE_SUFFIX = 'Oil painting, Warcraft III concept art, dramatic chiaroscuro lighting, rich saturated colors, thick painterly brushstrokes, fantasy illustration inspired by Samwise Didier and Glenn Rane, dark atmospheric background';

/**
 * Suggest 3 visual scene ideas from digest text — for the Prompt section.
 * Returns { scenes: [{ score, title, scene }] } sorted by score desc.
 * Title is short (3-8 words), scene is a one-sentence visual description.
 */
export async function suggestScenes(digestText) {
  const client = getAnthropic();

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    system: `You suggest cover art scenes for a Warcraft III 4v4 gaming magazine.

Given a digest of the week's events, suggest exactly 3 DIFFERENT visual scene ideas for the cover. Each should cover a different story.

COMPOSITION RULES (critical — these make covers work):
- ONE focal subject. One hero in a scene, not a group battle. Think movie poster, not battle scene.
- Maximum 1-2 characters. A third can appear tiny/distant. More than that turns to mush.
- Wide shot with environment. Show the character IN a place — burning ruins, frozen throne room, crumbling arena. Not floating in fog.
- Left side must be dark/empty. Text overlays on the left. Keep the focal subject center or right.
- Story-specific but archetypal. A viewer should FEEL the story through the scene. A griefer sits smugly on ruins he caused. A rager's magic cracks the ground beneath him. Don't be too literal about game mechanics.
- The character's ATTITUDE and BODY LANGUAGE tell the story — not action sequences.

VISUAL DESCRIPTIONS (critical — FLUX doesn't know WC3 terminology):
- NEVER use game class names — describe the character visually instead.
- HUMAN: Blood Mage → "tall handsome elven sorcerer with fair skin, sharp cheekbones, long white hair, glowing green eyes, flowing crimson robes". Archmage → "elderly human wizard with long white beard, ornate blue and gold robes, glowing staff". Paladin → "heavily armored human knight in golden plate armor, glowing warhammer, white cape, holy light". Mountain King → "stocky armored dwarf warrior, massive warhammer, thick braided beard, storm-blue plate armor".
- ORC: Blademaster → "massive green-skinned orc warrior with topknot hairstyle, scarred face, wielding a curved burning blade, minimal armor showing tribal tattoos". Far Seer → "old green-skinned orc shaman in wolf pelt cloak, glowing white eyes, lightning crackling from hands". Tauren Chieftain → "towering bull-headed minotaur with huge horns, massive war totem, thick brown fur, bone and leather armor". Shadow Hunter → "lean blue-skinned troll with tusks, voodoo mask, serpent staff, feathered headdress".
- UNDEAD: Death Knight → "pale armored knight with glowing blue eyes, frost-covered black plate armor, runic greatsword". Lich → "skeletal floating mage in tattered dark robes, glowing blue eyes, frost magic swirling". Dread Lord → "winged vampiric demon in dark ornate armor, bat-like wings, pale face, glowing red eyes". Crypt Lord → "massive beetle-like undead creature with bone armor, scorpion tail, insectoid".
- NIGHT ELF: Demon Hunter → "muscular purple-skinned elf with blindfold, fel-green tattoos across chest, twin curved warglaives". Keeper of the Grove → "ancient half-stag half-elf creature with wooden antlers, bark-like skin, nature magic, forest guardian". Warden → "hooded night elf assassin in dark purple armor, crescent moon blade, shadowy". Priestess of the Moon → "elegant purple-skinned elven woman on a white tiger mount, silver armor, moon imagery".
- Say "elven" not "elf" for better results. Say "fair skin" or "warm skin tone" explicitly — FLUX defaults elves to grey/green.
- Avoid "pointed ears" alone — FLUX makes goblins. Pair with "tall, handsome/elegant, elven."

Rules:
- "title": 3-8 words, the story hook (e.g. "ToD vs GhostGGGL Tower War", "Sharky's 14-Day Exile")
- "scene": 2-3 sentences describing the visual scene using the VISUAL DESCRIPTIONS above. Be specific about: the character's appearance, their pose/expression, the environment, the color mood, and the lighting direction.
- "score": 1-10, how compelling this would be as cover art (drama, visual impact, community interest)
- Output JSON only: {"scenes": [{"score": 9, "title": "...", "scene": "..."}, ...]}
- Sort by score descending
- No markdown, no explanation`,
    messages: [{
      role: 'user',
      content: digestText.slice(0, 3000)
    }]
  });

  const text = response.content[0].text.trim();
  try {
    const parsed = JSON.parse(text);
    return parsed;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    return { scenes: [] };
  }
}

/**
 * Extract 3 headline options with scores and per-headline player casts.
 * Returns { headlines: [{ score, headline, players: [{ name, archetype, visual }] }] }
 * Sorted by score descending — first item is the LLM's preferred pick.
 */
export async function extractHeadline(digestText) {
  const client = getAnthropic();

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    system: `You write punchy headlines for a Warcraft III 4v4 gaming zine and cast each player as a character.

Generate exactly 3 different headline options from this digest. Each should cover a DIFFERENT story angle — don't just rephrase the same story.

Rules:
- Write SHORT headlines: 3-10 words. Punchy fragments OK. No fluff.
- Good examples: "ToD vs Mubarak. Necro Picks. Oxygen Wasted." / "Sharky Banned. Again." / "Three Griefers, One Ladder, Zero Chill"
- Each headline gets a "score" from 1-10 rating how compelling it is as a cover story (drama, visual potential, community interest)
- Each headline has its OWN players (1-3) relevant to THAT story:
  - "name": just the name before # in their battletag
  - "archetype": one-line character description based on what they did (e.g. "imperious pro who calls everyone stupid", "chaotic grinder who plays meme strats and won't stop queuing")
  - "visual": how to represent them in a Warcraft III fantasy painting (e.g. "a haughty archmage on a throne, radiating contempt", "a ragged necromancer surrounded by shambling skeletons, grinning")
- Output JSON only:
  {"headlines": [{"score": 9, "headline": "...", "players": [...]}, {"score": 7, "headline": "...", "players": [...]}, {"score": 5, "headline": "...", "players": [...]}]}
- Sort by score descending (best first)
- No markdown, no explanation`,
    messages: [{
      role: 'user',
      content: digestText.slice(0, 2000)
    }]
  });

  const text = response.content[0].text.trim();
  try {
    const parsed = JSON.parse(text);
    if (parsed.headlines) return parsed;
    // Fallback: if old format returned, wrap it
    if (parsed.headline) return { headlines: [{ score: 8, headline: parsed.headline, players: parsed.players || [] }] };
    return parsed;
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      const parsed = JSON.parse(match[0]);
      if (parsed.headlines) return parsed;
      if (parsed.headline) return { headlines: [{ score: 8, headline: parsed.headline, players: parsed.players || [] }] };
      return parsed;
    }
    return { headlines: [{ score: 5, headline: text.slice(0, 100), players: [] }] };
  }
}

/**
 * Detect actual image format from magic bytes.
 * Returns 'image/png', 'image/jpeg', 'image/gif', 'image/webp', or null.
 */
function detectMediaType(buffer) {
  if (buffer.length < 4) return null;
  // PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return 'image/png';
  // JPEG: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return 'image/jpeg';
  // GIF: 47 49 46
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) return 'image/gif';
  // WebP: 52 49 46 46 ... 57 45 42 50
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && buffer.length >= 12 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return 'image/webp';
  return null;
}

/**
 * Download an image URL and return as base64 data.
 * Detects actual format from magic bytes (not content-type header).
 * Returns { base64, mediaType } or null on failure.
 */
async function fetchImageAsBase64(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    const mediaType = detectMediaType(buffer);
    if (!mediaType) {
      console.warn('[CoverImage] Could not detect image format for:', url.slice(0, 80));
      return null;
    }
    return { base64: buffer.toString('base64'), mediaType };
  } catch {
    return null;
  }
}

/**
 * Build an image prompt that incorporates player character context.
 * playerContext: [{ name, race, archetype, visual, digestMentions, profilePicUrl }]
 *
 * If players have profile pics, downloads them and sends to Claude as
 * multimodal content so it can see exactly what each player looks like.
 *
 * IMPORTANT: FLUX Dev follows prompts well but weights early tokens most.
 * Scene description goes FIRST, style keywords go at the END.
 * Total prompt kept under 80 words for best results.
 */
export async function buildImagePromptWithPlayers(digestText, headline, playerContext) {
  const client = getAnthropic();

  // Download player avatars in parallel
  const avatarData = await Promise.all(
    (playerContext || []).map(p =>
      p.profilePicUrl ? fetchImageAsBase64(p.profilePicUrl) : Promise.resolve(null)
    )
  );

  // Build multimodal user message content
  const userContent = [];

  // Add player avatar images with full bio
  if (playerContext && playerContext.length > 0) {
    for (let i = 0; i < playerContext.length; i++) {
      const p = playerContext[i];
      const avatar = avatarData[i];
      if (avatar) {
        userContent.push({
          type: 'image',
          source: { type: 'base64', media_type: avatar.mediaType, data: avatar.base64 },
        });
      }
      // Rich character bio
      const lines = [`CHARACTER: "${p.name}"`];
      if (p.race) lines.push(`  Race: ${p.race}`);
      if (p.country) lines.push(`  Country: ${p.country}`);
      if (p.mmr) lines.push(`  MMR: ${p.mmr}`);
      if (p.archetype) lines.push(`  Personality: ${p.archetype}`);
      if (p.visual) lines.push(`  Visual direction: ${p.visual}`);
      if (p.digestMentions) lines.push(`  Recent drama: ${p.digestMentions}`);
      if (avatar) lines.push(`  [Avatar shown above — use this as the visual basis for this character]`);
      userContent.push({ type: 'text', text: lines.join('\n') });
    }
  }

  // Add headline + digest context
  userContent.push({
    type: 'text',
    text: `HEADLINE: ${headline}\n\nDIGEST CONTEXT:\n${digestText.slice(0, 600)}`
  });

  const hasAvatars = avatarData.some(a => a !== null);

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    system: `You write FLUX image generation prompts for a Warcraft III gaming zine cover.

YOUR JOB: Translate the headline, character bios, and (if shown) avatar portraits into ONE vivid scene description.
${hasAvatars ? `
AVATARS: You're shown player avatar portraits. These are Warcraft III hero icons. Look at the EXACT creature/hero depicted — its armor, species, colors, weapons — and describe that same figure in your scene. Don't guess; describe what you SEE.
` : ''}
COMPOSITION (critical — follow exactly):
- ONE focal character, center or right of frame. Left side dark/empty (text goes there).
- Wide shot: show the character IN an environment (ruins, throne room, battlefield, forest). Not floating in void.
- Maximum 2 characters. A third can be tiny/distant. No crowds or armies.
- Body language and attitude tell the story. A griefer smirks on rubble. A rager's magic cracks the earth. No generic action poses.
- Describe the dominant COLOR MOOD (fiery orange, cold blue, sickly green, etc.)
- Include LIGHTING DIRECTION (backlit, rim-lit from below, dramatic side-light, etc.)

CHARACTER DEPTH:
- Each character is a real person with a country, personality, and reputation. Blend their REAL identity with their WC3 hero.
- The character's ATTITUDE matters more than generic hero poses. Show personality through body language.

VISUAL DESCRIPTIONS (critical — FLUX doesn't know WC3 terminology):
- NEVER use game class names — describe the character visually instead.
- HUMAN: Blood Mage → "tall handsome elven sorcerer with fair skin, sharp cheekbones, long white hair, glowing green eyes, flowing crimson robes". Archmage → "elderly human wizard with long white beard, ornate blue and gold robes, glowing staff". Paladin → "heavily armored human knight in golden plate armor, glowing warhammer, white cape, holy light". Mountain King → "stocky armored dwarf warrior, massive warhammer, thick braided beard, storm-blue plate armor".
- ORC: Blademaster → "massive green-skinned orc warrior with topknot hairstyle, scarred face, wielding a curved burning blade, minimal armor showing tribal tattoos". Far Seer → "old green-skinned orc shaman in wolf pelt cloak, glowing white eyes, lightning crackling from hands". Tauren Chieftain → "towering bull-headed minotaur with huge horns, massive war totem, thick brown fur, bone and leather armor". Shadow Hunter → "lean blue-skinned troll with tusks, voodoo mask, serpent staff, feathered headdress".
- UNDEAD: Death Knight → "pale armored knight with glowing blue eyes, frost-covered black plate armor, runic greatsword". Lich → "skeletal floating mage in tattered dark robes, glowing blue eyes, frost magic swirling". Dread Lord → "winged vampiric demon in dark ornate armor, bat-like wings, pale face, glowing red eyes". Crypt Lord → "massive beetle-like undead creature with bone armor, scorpion tail, insectoid".
- NIGHT ELF: Demon Hunter → "muscular purple-skinned elf with blindfold, fel-green tattoos across chest, twin curved warglaives". Keeper of the Grove → "ancient half-stag half-elf creature with wooden antlers, bark-like skin, nature magic, forest guardian". Warden → "hooded night elf assassin in dark purple armor, crescent moon blade, shadowy". Priestess of the Moon → "elegant purple-skinned elven woman on a white tiger mount, silver armor, moon imagery".
- Say "elven" not "elf" for better results. Say "fair skin" or "warm skin tone" explicitly — FLUX defaults elves to grey/green.
- Avoid "pointed ears" alone — FLUX makes goblins. Pair with "tall, handsome/elegant, elven."

RULES:
- 40-60 words. Scene description ONLY. No style instructions (added separately).
- Start with the main subject/action. First words matter most to FLUX.
- Describe specific visual details: skin tone, hair, armor type, colors, weapons, expressions, environment.
- No text, logos, or UI. No real player names.
- Output ONLY the scene description.`,
    messages: [{
      role: 'user',
      content: userContent,
    }]
  });

  // Scene first, style suffix after — FLUX weights early tokens most
  return response.content[0].text.trim();
}

/**
 * Use Claude to extract the main story from a weekly digest
 * and craft an image generation prompt (fallback without player context).
 */
export async function buildImagePrompt(digestText) {
  const client = getAnthropic();

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 200,
    system: `You write FLUX image generation prompts for a Warcraft III gaming zine cover.

Given a weekly digest, extract the MAIN STORY and write a scene description.

COMPOSITION (critical — follow exactly):
- ONE focal character, center or right of frame. Left side dark/empty (text goes there).
- Wide shot: show the character IN an environment (ruins, throne room, battlefield, forest). Not floating in void.
- Maximum 2 characters. A third can be tiny/distant. No crowds or armies.
- Body language and attitude tell the story — no generic action poses.
- Describe the dominant COLOR MOOD (fiery orange, cold blue, sickly green, etc.)
- Include LIGHTING DIRECTION (backlit, rim-lit, dramatic side-light, etc.)

VISUAL DESCRIPTIONS (critical — FLUX doesn't know WC3 terminology):
- NEVER use game class names — describe the character visually instead.
- HUMAN: Blood Mage → "tall handsome elven sorcerer with fair skin, sharp cheekbones, long white hair, glowing green eyes, flowing crimson robes". Archmage → "elderly human wizard with long white beard, ornate blue and gold robes, glowing staff". Paladin → "heavily armored human knight in golden plate armor, glowing warhammer, white cape, holy light". Mountain King → "stocky armored dwarf warrior, massive warhammer, thick braided beard, storm-blue plate armor".
- ORC: Blademaster → "massive green-skinned orc warrior with topknot hairstyle, scarred face, wielding a curved burning blade, minimal armor showing tribal tattoos". Far Seer → "old green-skinned orc shaman in wolf pelt cloak, glowing white eyes, lightning crackling from hands". Tauren Chieftain → "towering bull-headed minotaur with huge horns, massive war totem, thick brown fur, bone and leather armor". Shadow Hunter → "lean blue-skinned troll with tusks, voodoo mask, serpent staff, feathered headdress".
- UNDEAD: Death Knight → "pale armored knight with glowing blue eyes, frost-covered black plate armor, runic greatsword". Lich → "skeletal floating mage in tattered dark robes, glowing blue eyes, frost magic swirling". Dread Lord → "winged vampiric demon in dark ornate armor, bat-like wings, pale face, glowing red eyes". Crypt Lord → "massive beetle-like undead creature with bone armor, scorpion tail, insectoid".
- NIGHT ELF: Demon Hunter → "muscular purple-skinned elf with blindfold, fel-green tattoos across chest, twin curved warglaives". Keeper of the Grove → "ancient half-stag half-elf creature with wooden antlers, bark-like skin, nature magic, forest guardian". Warden → "hooded night elf assassin in dark purple armor, crescent moon blade, shadowy". Priestess of the Moon → "elegant purple-skinned elven woman on a white tiger mount, silver armor, moon imagery".
- Say "elven" not "elf" for better results. Say "fair skin" or "warm skin tone" explicitly — FLUX defaults elves to grey/green.
- Avoid "pointed ears" alone — FLUX makes goblins. Pair with "tall, handsome/elegant, elven."

RULES:
- 40-60 words MAX. No style instructions — those are added separately.
- Start with the main subject immediately. First words matter most to FLUX.
- Describe characters using the VISUAL DESCRIPTIONS above, not game terminology.
- No text, no logos. No player names.
- Output ONLY the scene description.`,
    messages: [{
      role: 'user',
      content: `Weekly digest:\n\n${digestText.slice(0, 1500)}`
    }]
  });

  return response.content[0].text.trim();
}

/**
 * Call Replicate's FLUX Dev model and poll until complete.
 * Dev is slower (~10-30s) than Schnell but follows prompts much more accurately.
 * Returns the output image URL.
 */
async function runFlux(prompt) {
  const token = config.REPLICATE_API_TOKEN;
  if (!token) throw new Error('REPLICATE_API_TOKEN not configured');

  console.log('[CoverImage] Prompt length:', prompt.length, 'chars,', prompt.split(/\s+/).length, 'words');

  // Create prediction with retry on 429 rate limits
  let prediction;
  const maxRetries = 5;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const createRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-dev/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          prompt,
          num_outputs: 1,
          aspect_ratio: '16:9',
          output_format: 'png',
          output_quality: 90,
          guidance: 3.5,
          num_inference_steps: 28,
        },
      }),
    });

    if (createRes.status === 429) {
      // Parse retry_after from response, default 15s
      let waitSec = 15;
      try {
        const body = await createRes.json();
        if (body.retry_after) waitSec = Math.ceil(body.retry_after);
      } catch { /* use default */ }
      console.log(`[CoverImage] Rate limited, waiting ${waitSec}s (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise((r) => setTimeout(r, waitSec * 1000));
      continue;
    }

    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Replicate create failed (${createRes.status}): ${err}`);
    }

    prediction = await createRes.json();
    break;
  }

  if (!prediction) throw new Error('Replicate rate limit exceeded after retries');

  // Poll until completed or failed (FLUX Dev typically ~10-30s)
  const maxAttempts = 60;
  for (let i = 0; i < maxAttempts; i++) {
    if (prediction.status === 'succeeded') break;
    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      throw new Error(`Replicate prediction ${prediction.status}: ${prediction.error || 'unknown'}`);
    }

    await new Promise((r) => setTimeout(r, 1500));

    const pollRes = await fetch(prediction.urls.get, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!pollRes.ok) throw new Error(`Replicate poll failed (${pollRes.status})`);
    prediction = await pollRes.json();
  }

  if (prediction.status !== 'succeeded') {
    throw new Error('Replicate prediction timed out');
  }

  const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  if (!outputUrl) throw new Error('No output URL from Replicate');
  return outputUrl;
}

/**
 * Generate an image from a given prompt via FLUX Dev.
 * Returns the Replicate output URL (not downloaded).
 */
export async function generateImageFromPrompt(prompt) {
  console.log('[CoverImage] Generating from prompt:', prompt.slice(0, 100) + '...');
  const imageUrl = await runFlux(prompt);
  console.log('[CoverImage] Image ready:', imageUrl.slice(0, 80));
  return imageUrl;
}

/**
 * Generate a cover image for a weekly digest.
 * Returns the raw image bytes as a Buffer.
 */
export async function generateCoverImage(digestText) {
  // Step 1: Build a visual prompt from the digest content
  const scene = await buildImagePrompt(digestText);
  const imagePrompt = `${scene}. ${WC3_STYLE_SUFFIX}`;
  console.log('[CoverImage] Generated prompt:', imagePrompt.slice(0, 120) + '...');

  // Step 2: Generate the image with FLUX Dev via Replicate
  const imageUrl = await runFlux(imagePrompt);
  console.log('[CoverImage] Image generated, downloading...');

  // Step 3: Download the image bytes
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`Failed to download image (${imgRes.status})`);
  return Buffer.from(await imgRes.arrayBuffer());
}
