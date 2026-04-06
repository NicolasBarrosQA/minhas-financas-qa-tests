import { beforeEach, describe, expect, it } from "vitest";
import {
  formatAzinhaMetricDate,
  getAzinhaMetricsSnapshot,
  recordAzinhaMetric,
  resetAzinhaMetrics,
} from "@/services/azinhaMetrics";

describe("Azinha metrics", () => {
  beforeEach(() => {
    window.localStorage.clear();
    resetAzinhaMetrics();
  });

  it("records counters and rates", () => {
    recordAzinhaMetric("message_received");
    recordAzinhaMetric("message_received");
    recordAzinhaMetric("transaction_signal");
    recordAzinhaMetric("draft_created");
    recordAzinhaMetric("draft_confirmed");

    const snapshot = getAzinhaMetricsSnapshot();
    expect(snapshot.totals.messages).toBe(2);
    expect(snapshot.totals.draftsCreated).toBe(1);
    expect(snapshot.rates.draftSuccessRate).toBe(1);
    expect(snapshot.rates.confirmationRate).toBe(1);
    expect(snapshot.recent.length).toBeGreaterThan(0);
  });

  it("resets all counters", () => {
    recordAzinhaMetric("message_received");
    recordAzinhaMetric("fallback_response");

    resetAzinhaMetrics();
    const snapshot = getAzinhaMetricsSnapshot();
    expect(snapshot.totals.messages).toBe(0);
    expect(snapshot.totals.fallbackResponses).toBe(0);
    expect(snapshot.recent.length).toBe(0);
  });

  it("formats metric date", () => {
    const label = formatAzinhaMetricDate("2026-03-22T14:30:00.000Z");
    expect(label).toContain("/");
    expect(label).toContain(":");
  });
});
