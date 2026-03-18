import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import React, { type PropsWithChildren } from "react";
import { useTransacoes } from "@/hooks/useTransacoes";
import { api } from "@/lib/api";

vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return function Wrapper({ children }: PropsWithChildren) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe("Transacoes - cenarios de bug conhecido", () => {
  it("deveria preservar categoriaDescricao e pessoaNome para a listagem [KnownBug]", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        items: [
          {
            id: "tx-1",
            descricao: "Compra mercado",
            valor: 150,
            tipo: 0,
            categoriaId: "cat-1",
            pessoaId: "pes-1",
            categoriaDescricao: "Alimentacao",
            pessoaNome: "Joao Silva",
            data: "2026-03-12T00:00:00.000Z",
          },
        ],
        total: 1,
        page: 1,
        pageSize: 10,
      },
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useTransacoes({ page: 1, pageSize: 10 }), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const item = result.current.data?.items?.[0] as unknown as Record<string, unknown>;
    expect(item?.categoriaDescricao).toBe("Alimentacao");
    expect(item?.pessoaNome).toBe("Joao Silva");
  });
});
