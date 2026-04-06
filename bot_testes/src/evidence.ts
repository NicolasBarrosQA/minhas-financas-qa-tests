import fs from 'node:fs/promises';
import path from 'node:path';
import type { EvidenceRecord } from './types.js';

const CASES_DIR = path.resolve(process.cwd(), 'artifacts/cases');

function normalizeId(id: string): string {
  return id.replace(/[^a-z0-9-_]/gi, '_').toLowerCase();
}

export async function writeEvidence(record: EvidenceRecord): Promise<void> {
  await fs.mkdir(CASES_DIR, { recursive: true });
  const filename = `${normalizeId(record.caseId)}.json`;
  const target = path.join(CASES_DIR, filename);
  await fs.writeFile(target, JSON.stringify(record, null, 2), 'utf8');
}
