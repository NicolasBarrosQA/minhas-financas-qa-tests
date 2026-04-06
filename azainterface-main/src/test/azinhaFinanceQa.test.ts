import { describe, expect, it } from "vitest";
import { getFinanceQaReply } from "@/services/azinhaFinanceQa";
import type { Transaction } from "@/types/entities";

function tx(partial: Partial<Transaction>): Transaction {
  return {
    id: partial.id || Math.random().toString(36).slice(2),
    userId: "user-1",
    type: partial.type || "DESPESA",
    amount: partial.amount || 0,
    description: partial.description || "Lancamento",
    date: partial.date || "2026-03-22",
    status: "EFETIVADA",
    origin: "MANUAL",
    isPending: false,
    isRecurring: false,
    createdAt: "2026-03-22T10:00:00Z",
    updatedAt: "2026-03-22T10:00:00Z",
    ...partial,
  };
}

describe("Azinha finance QA", () => {
  const transactions: Transaction[] = [
    tx({ type: "DESPESA", amount: 40, description: "Almoco", date: "2026-03-22" }),
    tx({ type: "DESPESA", amount: 18.5, description: "Uber", date: "2026-03-22" }),
    tx({ type: "RECEITA", amount: 200, description: "Freela", date: "2026-03-22" }),
    tx({ type: "DESPESA", amount: 120, description: "Mercado", date: "2026-03-10" }),
  ];

  it("answers daily expense question", () => {
    const reply = getFinanceQaReply("Quanto gastei hoje?", {
      recentTransactions: transactions,
      todayYmd: "2026-03-22",
    });

    expect(reply).toContain("58,50");
  });

  it("answers monthly summary question", () => {
    const reply = getFinanceQaReply("Me da um resumo do mes", {
      recentTransactions: transactions,
      todayYmd: "2026-03-22",
    });

    expect(reply?.toLowerCase()).toContain("saldo parcial");
  });

  it("answers monthly expenses question", () => {
    const reply = getFinanceQaReply("Quanto gastei no mes?", {
      recentTransactions: transactions,
      todayYmd: "2026-03-22",
    });

    expect(reply).toContain("178,50");
  });

  it("answers biggest monthly income question", () => {
    const reply = getFinanceQaReply("Qual foi minha maior entrada no mes?", {
      recentTransactions: transactions,
      todayYmd: "2026-03-22",
    });

    expect(reply?.toLowerCase()).toContain("maior entrada");
    expect(reply).toContain("200,00");
  });

  it("returns null for transaction-like message", () => {
    const reply = getFinanceQaReply("Gastei 45 no almoço", {
      recentTransactions: transactions,
      todayYmd: "2026-03-22",
    });

    expect(reply).toBeNull();
  });
});
