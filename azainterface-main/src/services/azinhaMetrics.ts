export type AzinhaMetricEvent =
  | "message_received"
  | "transaction_signal"
  | "draft_created"
  | "clarification_requested"
  | "low_confidence"
  | "draft_corrected"
  | "draft_confirmed"
  | "draft_canceled"
  | "save_failed"
  | "fallback_response"
  | "finance_qa_reply";

export type AzinhaMetricRecentItem = {
  at: string;
  event: AzinhaMetricEvent;
  detail?: string;
};

export type AzinhaMetricsSnapshot = {
  totals: {
    messages: number;
    transactionSignals: number;
    draftsCreated: number;
    clarifications: number;
    lowConfidence: number;
    corrections: number;
    confirmed: number;
    canceled: number;
    saveErrors: number;
    fallbackResponses: number;
    financeQaReplies: number;
  };
  rates: {
    draftSuccessRate: number;
    confirmationRate: number;
    correctionRate: number;
    fallbackRate: number;
    lowConfidenceRate: number;
  };
  recent: AzinhaMetricRecentItem[];
};

type AzinhaMetricsStore = {
  version: 1;
  counters: Record<AzinhaMetricEvent, number>;
  recent: AzinhaMetricRecentItem[];
  updatedAt: string;
};

const STORAGE_KEY = "azinha-metrics-v1";
const MAX_RECENT_ITEMS = 80;

const EVENT_KEYS: AzinhaMetricEvent[] = [
  "message_received",
  "transaction_signal",
  "draft_created",
  "clarification_requested",
  "low_confidence",
  "draft_corrected",
  "draft_confirmed",
  "draft_canceled",
  "save_failed",
  "fallback_response",
  "finance_qa_reply",
];

function createEmptyCounters(): Record<AzinhaMetricEvent, number> {
  return EVENT_KEYS.reduce((acc, eventName) => {
    acc[eventName] = 0;
    return acc;
  }, {} as Record<AzinhaMetricEvent, number>);
}

function createInitialStore(): AzinhaMetricsStore {
  return {
    version: 1,
    counters: createEmptyCounters(),
    recent: [],
    updatedAt: new Date().toISOString(),
  };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function clampRate(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function readStore(): AzinhaMetricsStore {
  if (typeof window === "undefined") return createInitialStore();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialStore();

    const parsed = JSON.parse(raw) as unknown;
    if (!isObject(parsed)) return createInitialStore();

    const countersRaw = isObject(parsed.counters) ? parsed.counters : {};
    const counters = createEmptyCounters();
    for (const key of EVENT_KEYS) {
      const value = Number(countersRaw[key]);
      counters[key] = Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
    }

    const recentRaw = Array.isArray(parsed.recent) ? parsed.recent : [];
    const recent: AzinhaMetricRecentItem[] = recentRaw
      .map((item) => {
        if (!isObject(item)) return null;
        const event = String(item.event || "") as AzinhaMetricEvent;
        if (!EVENT_KEYS.includes(event)) return null;
        const at = typeof item.at === "string" && item.at ? item.at : new Date().toISOString();
        const detail = typeof item.detail === "string" && item.detail.trim() ? item.detail.trim() : undefined;
        return { at, event, detail };
      })
      .filter((item): item is AzinhaMetricRecentItem => !!item)
      .slice(-MAX_RECENT_ITEMS);

    return {
      version: 1,
      counters,
      recent,
      updatedAt: typeof parsed.updatedAt === "string" && parsed.updatedAt ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return createInitialStore();
  }
}

function writeStore(store: AzinhaMetricsStore): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage write failures in restrictive environments.
  }
}

export function recordAzinhaMetric(event: AzinhaMetricEvent, detail?: string): void {
  const store = readStore();
  store.counters[event] = (store.counters[event] || 0) + 1;

  store.recent.push({
    at: new Date().toISOString(),
    event,
    detail: detail?.trim() || undefined,
  });

  if (store.recent.length > MAX_RECENT_ITEMS) {
    store.recent = store.recent.slice(store.recent.length - MAX_RECENT_ITEMS);
  }

  store.updatedAt = new Date().toISOString();
  writeStore(store);
}

export function getAzinhaMetricsSnapshot(): AzinhaMetricsSnapshot {
  const store = readStore();
  const totals = {
    messages: store.counters.message_received,
    transactionSignals: store.counters.transaction_signal,
    draftsCreated: store.counters.draft_created,
    clarifications: store.counters.clarification_requested,
    lowConfidence: store.counters.low_confidence,
    corrections: store.counters.draft_corrected,
    confirmed: store.counters.draft_confirmed,
    canceled: store.counters.draft_canceled,
    saveErrors: store.counters.save_failed,
    fallbackResponses: store.counters.fallback_response,
    financeQaReplies: store.counters.finance_qa_reply,
  };

  const rates = {
    draftSuccessRate: clampRate(totals.draftsCreated / Math.max(1, totals.transactionSignals)),
    confirmationRate: clampRate(totals.confirmed / Math.max(1, totals.draftsCreated)),
    correctionRate: clampRate(totals.corrections / Math.max(1, totals.draftsCreated)),
    fallbackRate: clampRate(totals.fallbackResponses / Math.max(1, totals.messages)),
    lowConfidenceRate: clampRate(totals.lowConfidence / Math.max(1, totals.transactionSignals)),
  };

  return {
    totals,
    rates,
    recent: [...store.recent].reverse(),
  };
}

export function resetAzinhaMetrics(): void {
  writeStore(createInitialStore());
}

export function formatAzinhaMetricDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
