import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import os from 'os';

function getDatabaseUrl(): string {
  const envUrl = process.env.DATABASE_URL;
  const isVercel = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

  if (isVercel && (!envUrl || envUrl.startsWith('file:'))) {
    const tmpDbPath = path.join(os.tmpdir(), 'custom.db');
    if (!fs.existsSync(tmpDbPath)) {
      const candidates = [
        path.join(process.cwd(), 'db', 'custom.db'),
        path.join(process.cwd(), '.next', 'standalone', 'db', 'custom.db'),
        path.join(__dirname, '..', '..', 'db', 'custom.db'),
        path.join(__dirname, '..', '..', '..', 'db', 'custom.db'),
      ];
      for (const src of candidates) {
        if (fs.existsSync(src)) {
          try {
            fs.copyFileSync(src, tmpDbPath);
            break;
          } catch { /* continue */ }
        }
      }
    }
    return `file:${tmpDbPath}`;
  }

  return envUrl || 'file:./db/custom.db';
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const databaseUrl = getDatabaseUrl();

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: databaseUrl,
    log: ['query'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

let dbInitPromise: Promise<void> | null = null;

/**
 * Ensures all required SQLite tables (User, Session, Message, Score, SpeakerProfile)
 * exist in the database, preventing "table main.User does not exist" errors on Vercel lambda init.
 */
export async function ensureDbInitialized(targetDb: PrismaClient = db): Promise<void> {
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    try {
      await targetDb.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "User" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "email" TEXT,
          "displayName" TEXT,
          "interests" TEXT NOT NULL DEFAULT '[]',
          "onboardedAt" DATETIME,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await targetDb.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Session" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT,
          "title" TEXT NOT NULL,
          "audienceType" TEXT NOT NULL DEFAULT 'investor',
          "practiceMode" TEXT NOT NULL DEFAULT 'full',
          "mode" TEXT NOT NULL DEFAULT 'diagnostic',
          "stance" TEXT NOT NULL DEFAULT 'rigorous',
          "source" TEXT NOT NULL DEFAULT 'deck',
          "topic" TEXT,
          "content" TEXT NOT NULL DEFAULT '',
          "deckContext" TEXT NOT NULL DEFAULT '{}',
          "transcriptSegments" TEXT NOT NULL DEFAULT '[]',
          "examinerEvents" TEXT NOT NULL DEFAULT '[]',
          "deliverySamples" TEXT NOT NULL DEFAULT '[]',
          "findings" TEXT NOT NULL DEFAULT '[]',
          "summary" TEXT NOT NULL DEFAULT '',
          "keyPoints" TEXT NOT NULL DEFAULT '[]',
          "questions" TEXT NOT NULL DEFAULT '[]',
          "status" TEXT NOT NULL DEFAULT 'upload',
          "audioPath" TEXT,
          "outcomeRecorded" BOOLEAN NOT NULL DEFAULT 0,
          "customConfig" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
        );
      `);
      await targetDb.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Message" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "sessionId" TEXT NOT NULL,
          "role" TEXT NOT NULL,
          "content" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);
      await targetDb.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Score" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "sessionId" TEXT NOT NULL UNIQUE,
          "clarity" REAL NOT NULL DEFAULT 0,
          "confidence" REAL NOT NULL DEFAULT 0,
          "technical" REAL NOT NULL DEFAULT 0,
          "storytelling" REAL NOT NULL DEFAULT 0,
          "persuasiveness" REAL NOT NULL DEFAULT 0,
          "conciseness" REAL NOT NULL DEFAULT 0,
          "verbatimReading" REAL NOT NULL DEFAULT 0,
          "eyeContact" REAL NOT NULL DEFAULT 0,
          "posture" REAL NOT NULL DEFAULT 0,
          "cameraPresence" REAL NOT NULL DEFAULT 0,
          "overall" REAL NOT NULL DEFAULT 0,
          "feedback" TEXT NOT NULL DEFAULT '',
          "weaknesses" TEXT NOT NULL DEFAULT '[]',
          "recommendations" TEXT NOT NULL DEFAULT '[]',
          "knowledgeGaps" TEXT NOT NULL DEFAULT '[]',
          "judgeFeedback" TEXT NOT NULL DEFAULT '[]',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("sessionId") REFERENCES "Session" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);
      await targetDb.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "SpeakerProfile" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "userId" TEXT NOT NULL UNIQUE,
          "recurringWeaknesses" TEXT NOT NULL DEFAULT '[]',
          "dimensionBaselines" TEXT NOT NULL DEFAULT '{}',
          "totalSessions" INTEGER NOT NULL DEFAULT 0,
          "streak" INTEGER NOT NULL DEFAULT 0,
          "nextFocus" TEXT NOT NULL DEFAULT '',
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);
    } catch (err) {
      console.error('Error during ensureDbInitialized DDL execution:', err);
    }
  })();

  return dbInitPromise;
}