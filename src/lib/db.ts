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