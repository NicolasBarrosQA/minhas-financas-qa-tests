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

  const accountSecondary = {
    id: "acc-2",
    userId: "user-1",
    name: "Conta Reserva",
    type: "CORRENTE" as const,
    balance: 500,
    initialBalance: 500,
    isAuto: false,
    isArchived: false,
    institution: "Inter",
    createdAt: "2026-03-24T00:00:00.000Z",
    updatedAt: "2026-03-24T00:00:00.000Z",
    cards: [],
  };

  const card = {
    id: "card-1",
    userId: "user-1",
    accountId: "acc-1",
    name: "Cartão Principal",
    type: "CREDITO" as const,
    limit: 3000,
    currentSpend: 0,
    availableLimit: 3000,
    closingDay: 10,
    dueDay: 20,
    brand: "Visa",
    lastFourDigits: "1234",
    isArchived: false,
    createdAt: "2026-03-24T00:00:00.000Z",
    updatedAt: "2026-03-24T00:00:00.000Z",
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
    accountSecondary,
    card,
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
  useAccounts: () => ({ data: [hoisted.account, hoisted.accountSecondary] }),
}));

vi.mock("@/hooks/useCards", () => ({
  useCards: () => ({ data: [hoisted.card] }),
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

function openChat() {
  fireEvent.click(screen.getByLabelText("Abrir chat da Azinha"));
}

function sendMessage(text: string) {
  fireEvent.change(screen.getByLabelText("Mensagem para Azinha"), {
    target: { value: text },
  });
  fireEvent.click(screen.getByLabelText("Enviar mensagem para Azinha"));
}

async function createDraftViaMessage(message = "gastei 120 no mercado na conta teste") {
  sendMessage(message);
  await waitFor(() => {
    expect(screen.getByText(/Posso salvar assim/i)).toBeInTheDocument();
  });
}

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
    openChat();
    await createDraftViaMessage();

    await waitFor(() => {
      expect(screen.getByText(/Posso salvar assim/i)).toBeInTheDocument();
      expect(screen.getByText(/Tipo:\s*Sa[íi]da/i)).toBeInTheDocument();
      expect(screen.getByText(/Valor:\s*R\$\s*120,00/i)).toBeInTheDocument();
      expect(screen.getByText(/Conta:\s*Conta Teste/i)).toBeInTheDocument();
    });
  });

  it("confirms draft even with typo command and calls transaction mutation", async () => {
    render(<AzinhaChat />);
    openChat();
    await createDraftViaMessage();
    sendMessage("confirmae");

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

  it("cancels draft with natural cancel command and does not save", async () => {
    render(<AzinhaChat />);
    openChat();
    await createDraftViaMessage();
    sendMessage("nao salvar");

    await waitFor(() => {
      expect(screen.getByText(/Rascunho cancelado/i)).toBeInTheDocument();
      expect(hoisted.createTransactionMock).not.toHaveBeenCalled();
    });
  });

  it("edits amount with typo field command, then confirms updated value", async () => {
    render(<AzinhaChat />);
    openChat();
    await createDraftViaMessage();

    sendMessage("valro 129,90");
    await waitFor(() => {
      expect(screen.getByText(/Valor ajustado para R\$\s*129,90/i)).toBeInTheDocument();
    });

    sendMessage("confirmar");

    await waitFor(() => {
      expect(hoisted.createTransactionMock).toHaveBeenCalledTimes(1);
      expect(hoisted.createTransactionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 129.9,
          type: "DESPESA",
        }),
      );
    });
  });

  it("accepts thousand separator in amount edit command", async () => {
    render(<AzinhaChat />);
    openChat();
    await createDraftViaMessage();

    sendMessage("valro 1.500");
    await waitFor(() => {
      expect(screen.getByText(/Valor ajustado para R\$\s*1\.500,00/i)).toBeInTheDocument();
    });

    sendMessage("confirmar");
    await waitFor(() => {
      expect(hoisted.createTransactionMock).toHaveBeenCalledTimes(1);
      expect(hoisted.createTransactionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 1500,
        }),
      );
    });
  });

  it("edits description and persists final edited draft", async () => {
    render(<AzinhaChat />);
    openChat();
    await createDraftViaMessage();

    sendMessage("mude a descrição para almoço com cliente");
    await waitFor(() => {
      expect(screen.getByText(/Descrição:\s*Almoço com cliente/i)).toBeInTheDocument();
    });

    sendMessage("confirmar");

    await waitFor(() => {
      expect(hoisted.createTransactionMock).toHaveBeenCalledTimes(1);
      expect(hoisted.createTransactionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          description: "Almoço com cliente",
        }),
      );
    });
  });

  it("supports clarification flow end-to-end and saves after follow-up", async () => {
    hoisted.parseTransactionMock
      .mockResolvedValueOnce({
        intent: "TRANSACTION",
        needsClarification: true,
        clarification: "Só preciso confirmar o valor.",
        answer: null,
        confidence: 0.46,
        confidenceSignals: ["needs_clarification"],
        transaction: null,
      })
      .mockResolvedValueOnce({
        intent: "TRANSACTION",
        needsClarification: false,
        clarification: null,
        answer: null,
        confidence: 0.87,
        confidenceSignals: [],
        transaction: {
          type: "DESPESA",
          amount: 50,
          description: "Mercado",
          date: "2026-03-24",
          installments: null,
          sourceKind: "ACCOUNT",
          sourceName: "Conta Teste",
          destinationName: null,
          categoryName: "Alimentacao",
        },
      });

    render(<AzinhaChat />);
    openChat();

    sendMessage("paguei mercado");
    await waitFor(() => {
      expect(screen.getByText(/Só preciso confirmar o valor/i)).toBeInTheDocument();
    });

    sendMessage("foi despesa 50");
    await waitFor(() => {
      expect(hoisted.parseTransactionMock).toHaveBeenCalledTimes(2);
      expect(screen.getByText(/Valor:\s*R\$\s*50,00/i)).toBeInTheDocument();
    });

    sendMessage("confirmar");
    await waitFor(() => {
      expect(hoisted.createTransactionMock).toHaveBeenCalledTimes(1);
      expect(hoisted.createTransactionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 50,
          type: "DESPESA",
        }),
      );
    });
  });

  it("allows canceling clarification before draft creation", async () => {
    hoisted.parseTransactionMock.mockResolvedValueOnce({
      intent: "TRANSACTION",
      needsClarification: true,
      clarification: "Só preciso confirmar o valor.",
      answer: null,
      confidence: 0.42,
      confidenceSignals: ["needs_clarification"],
      transaction: null,
    });

    render(<AzinhaChat />);
    openChat();

    sendMessage("paguei mercado");
    await waitFor(() => {
      expect(screen.getByText(/Só preciso confirmar o valor/i)).toBeInTheDocument();
    });

    sendMessage("deixa pra la");
    await waitFor(() => {
      expect(screen.getByText(/Encerramos esta confirmação/i)).toBeInTheDocument();
      expect(hoisted.createTransactionMock).not.toHaveBeenCalled();
    });
  });

  it("handles direct control command without active draft", async () => {
    render(<AzinhaChat />);
    openChat();

    sendMessage("confirmar");
    await waitFor(() => {
      expect(screen.getByText(/Não há rascunho aberto no momento/i)).toBeInTheDocument();
    });
  });

  it("treats a fresh transaction sentence as new draft when one is already open", async () => {
    hoisted.parseTransactionMock
      .mockResolvedValueOnce({
        intent: "TRANSACTION",
        needsClarification: false,
        clarification: null,
        answer: null,
        confidence: 0.91,
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
      })
      .mockResolvedValueOnce({
        intent: "TRANSACTION",
        needsClarification: false,
        clarification: null,
        answer: null,
        confidence: 0.9,
        confidenceSignals: [],
        transaction: {
          type: "DESPESA",
          amount: 40,
          description: "Uber",
          date: "2026-03-24",
          installments: null,
          sourceKind: "ACCOUNT",
          sourceName: "Conta Teste",
          destinationName: null,
          categoryName: "Transporte",
        },
      });

    render(<AzinhaChat />);
    openChat();
    await createDraftViaMessage("gastei 120 no mercado");

    sendMessage("gastei 40 no uber");

    await waitFor(() => {
      expect(screen.getByText(/Vou tratar esta mensagem como um novo lançamento/i)).toBeInTheDocument();
      expect(screen.getByText(/Valor:\s*R\$\s*40,00/i)).toBeInTheDocument();
      expect(hoisted.parseTransactionMock).toHaveBeenCalledTimes(2);
    });
  });
});

