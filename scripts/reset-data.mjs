import { PrismaClient } from '@prisma/client';
import { rm } from 'node:fs/promises';
import path from 'node:path';

const db = new PrismaClient();
const root = process.cwd();

async function main() {
  // Child rows first (FKs), then sessions, then profiles. Users are kept (auth identities).
  const scores = await db.score.deleteMany({});
  const messages = await db.message.deleteMany({});
  const sessions = await db.session.deleteMany({});
  const profiles = await db.speakerProfile.deleteMany({});

  for (const dir of ['slides', path.join('public', 'recordings')]) {
    await rm(path.join(root, dir), { recursive: true, force: true });
  }

  console.log(`Reset complete: ${sessions.count} sessions, ${scores.count} scores, ${messages.count} messages, ${profiles.count} profiles deleted; slide + recording assets removed.`);
  await db.$disconnect();
}

main().catch(async (e) => { console.error('Reset failed:', e); await db.$disconnect(); process.exit(1); });
