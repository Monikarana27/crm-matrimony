/**
 * src/lib/ai/regenerate-embedding.ts
 *
 * Call this after any profile create/update to keep its embedding in sync.
 * Intentionally best-effort: any failure (Ollama down/slow, malformed
 * data, whatever) is caught and logged here, never thrown, so a profile
 * save can never fail because of this.
 */

import { prisma } from "@/lib/db/prisma";
import { generateEmbedding, toPgVectorLiteral } from "./embeddings";
import { buildProfileEmbeddingText, ProfileForEmbedding } from "./profile-text";

export async function regenerateProfileEmbedding(profileId: string): Promise<void> {
  try {
    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
      include: {
        religion: true,
        caste: true,
        gotra: true,
        motherTongueRef: true,
        partnerPreference: true,
      },
    });

    if (!profile) {
      console.warn(`regenerateProfileEmbedding: profile ${profileId} not found`);
      return;
    }

    const { partnerPreference, ...profileFields } = profile as any;

    const text = buildProfileEmbeddingText(
      profileFields as ProfileForEmbedding,
      partnerPreference
    );

    if (!text.trim()) {
      console.warn(`regenerateProfileEmbedding: no text to embed for ${profileId}`);
      return;
    }

    const vector = await generateEmbedding(text);
    const literal = toPgVectorLiteral(vector);

    await prisma.$executeRaw`
      UPDATE profiles SET embedding = ${literal}::vector WHERE id = ${profileId}
    `;
  } catch (err) {
    console.error(`regenerateProfileEmbedding failed for ${profileId}:`, err);
  }
}
