import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement, forwardRef, Fragment } from "react";

const hoisted = vi.hoisted(() => {
  const createTransactionMock = vi.fn().mockResolvedValue(undefined);
  const parseTransactionMock = vi.fn();
  const decideNextStepMock = vi.fn().mockReturnValue({
    tier: "high",
    action: "confirm",
    reason: "high_confidence",
    question: null,
    tag: null,
    slots: [],
  });

  const account = {
    id: "acc-1",
    userId: "user-1",
    name: "Conta Teste",
    type: "CORRENTE" as const,
    balance: 1000,
    initialBalance: 1000,
    isAuto: false,
    isArchived: false,
    institution: "Nubank",
    createdAt: "2026-03-24T00:00:00.000Z",
    updatedAt: "2026-03-24T00:00:00.000Z",
    cards: [],
  };

  const category = {
    id: "cat-1",
    userId: null,
    name: "Alimentacao",
    type: "DESPESA" as const,
    color: "#f59e0b",
    icon: "utensils",
    isSystem: true,
    createdAt: "2026-03-24T00:00:00.000Z",
    updatedAt: "2026-03-24T00:00:00.000Z",
  };

  return {
    createTransactionMock,
    parseTransactionMock,
    decideNextStepMock,
    account,
    category,
  };
});

vi.mock("framer-motion", () => {
  const motion = new Proxy(
    {},
    {
      get: (_, tag: string) =>
        forwardRef<HTMLElement, Record<string, unknown>>(
          (
            {
              children,
              onTap,
              initial: _initial,
              animate: _animate,
              exit: _exit,
              transition: _transition,
              drag: _drag,
              dragMomentum: _dragMomentum,
              dragElastic: _dragElastic,
              dragConstraints: _dragConstraints,
              whileTap: _whileTap,
              ...props
            },
            ref,
          ) =>
          createElement(tag, { ...props, ref, onClick: onTap ?? props.onClick }, children),
        ),
    },
  );

  return {
    motion,
    AnimatePresence: ({ children }: { children: unknown }) => createElement(Fragment, null, children),
  };
});

vi.mock("@/hooks/useAccounts", () => ({
  useAccounts: () => ({ data: [hoisted.account] }),
}));

vi.mock("@/hooks/useCards", () => ({
  useCards: () => ({ data: [] }),
}));

vi.mock("@/hooks/useCategories", () => ({
  useCategories: () => ({ data: [hoisted.category] }),
}));

vi.mock("@/hooks/useTransactions", () => ({
  useTransactions: () => ({ data: { data: [] } }),
  useCreateTransaction: () => ({ mutateAsync: hoisted.createTransactionMock }),
}));

vi.mock("@/services/azinhaAssistant", () => ({
  parseTransactionWithAssistant: hoisted.parseTransactionMock,
}));

vi.mock("@/services/azinhaDecisionEngine", () => ({
  decideAzinhaNextStep: hoisted.decideNextStepMock,
}));

vi.mock("@/services/azinhaMetrics", () => ({
  recordAzinhaMetric: vi.fn(),
}));

vi.mock("@/services/azinhaLearning", () => ({
  learnAzinhaCategoryCorrection: vi.fn(),
  learnAzinhaDescriptionCorrection: vi.fn(),
  suggestLearnedCategory: vi.fn(() => null),
  suggestLearnedDescription: vi.fn(() => null),
}));

import { AzinhaChat } from "@/components/AzinhaChat";

describe("AzinhaChat runtime flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.decideNextStepMock.mockReturnValue({
      tier: "high",
      action: "confirm",
      reason: "high_confidence",
      question: null,
      tag: null,
      slots: [],
    });
    hoisted.parseTransactionMock.mockResolvedValue({
      intent: "TRANSACTION",
      needsClarification: false,
      clarification: null,
      answer: null,
      confidence: 0.92,
      confidenceSignals: [],
      transaction: {
        type: "DESPESA",
        amount: 120,
        description: "Mercado",
        date: "2026-03-24",
        installments: null,
        sourceKind: "ACCOUNT",
        sourceName: "Conta Teste",
        destinationName: null,
        categoryName: "Alimentacao",
      },
    });
  });

  it("opens chat, sends a message and renders draft summary without crashing", async () => {
    render(<AzinhaChat />);

    fireEvent.click(screen.getByLabelText("Abrir chat da Azinha"));

    fireEvent.change(screen.getByLabelText("Mensagem para Azinha"), {
      target: { value: "gastei 120 no mercado na conta teste" },
    });
    fireEvent.click(screen.getByLabelText("Enviar mensagem para Azinha"));

    await waitFor(() => {
      expect(screen.getByText(/Posso salvar assim/i)).toBeInTheDocument();
      expect(screen.getByText(/Tipo:\s*Sa[íi]da/i)).toBeInTheDocument();
      expect(screen.getByText(/Valor:\s*R\$\s*120,00/i)).toBeInTheDocument();
      expect(screen.getByText(/Conta:\s*Conta Teste/i)).toBeInTheDocument();
    });
  });

  it("confirms the generated draft and calls transaction mutation", async () => {
    render(<AzinhaChat />);

    fireEvent.click(screen.getByLabelText("Abrir chat da Azinha"));

    fireEvent.change(screen.getByLabelText("Mensagem para Azinha"), {
      target: { value: "gastei 120 no mercado na conta teste" },
    });
    fireEvent.click(screen.getByLabelText("Enviar mensagem para Azinha"));

    await waitFor(() => {
      expect(screen.getByText(/Posso salvar assim/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Mensagem para Azinha"), {
      target: { value: "confirmar" },
    });
    fireEvent.click(screen.getByLabelText("Enviar mensagem para Azinha"));

    await waitFor(() => {
      expect(hoisted.createTransactionMock).toHaveBeenCalledTimes(1);
      expect(hoisted.createTransactionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "DESPESA",
          amount: 120,
          accountId: "acc-1",
        }),
      );
    });
  });
});

