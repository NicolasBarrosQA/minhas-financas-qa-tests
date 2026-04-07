import { writeEvidence } from './evidence.js';
import type { EvidenceRecord } from './types.js';

type AssertionItem = {
  name: string;
  passed: boolean;
  details?: string;
};

type CaseTools = {
  step: (message: string) => void;
  assert: (name: string, condition: boolean, details?: string) => void;
  output: (key: string, value: unknown) => void;
  pushAssertion: (item: AssertionItem) => void;
};

export async function runCase(
  caseId: string,
  title: string,
  executor: (tools: CaseTools) => Promise<void>,
): Promise<void> {
  const startedAt = new Date().toISOString();
  const actions: string[] = [];
  const assertions: AssertionItem[] = [];
  const output: Record<string, unknown> = {};
  let status: EvidenceRecord['status'] = 'passed';
  let errorMessage: string | undefined;

  const tools: CaseTools = {
    step: (message) => {
      actions.push(message);
    },
    assert: (name, condition, details) => {
      assertions.push({ name, passed: condition, details });
      if (!condition) {
        throw new Error(details ? `${name}: ${details}` : name);
      }
    },
    output: (key, value) => {
      output[key] = value;
    },
    pushAssertion: (item) => {
      assertions.push(item);
      if (!item.passed) {
        throw new Error(item.details ? `${item.name}: ${item.details}` : item.name);
      }
    },
  };

  try {
    await executor(tools);
  } catch (error) {
    status = 'failed';
    errorMessage = error instanceof Error ? error.message : String(error);
  }

  const record: EvidenceRecord = {
    caseId,
    title,
    startedAt,
    finishedAt: new Date().toISOString(),
    status,
    actions,
    assertions,
    output,
    error: errorMessage,
  };

  await writeEvidence(record);

  if (status === 'failed') {
    throw new Error(errorMessage || `Caso ${caseId} falhou`);
  }
}

