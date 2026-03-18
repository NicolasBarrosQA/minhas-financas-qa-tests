import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import React, { type PropsWithChildren } from "react";
import { TipoTransacao } from "@/types/domain";
import { useCreateTransacao, useTransacoes } from "@/hooks/useTransacoes";
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

describe("Hooks de transacao", () => {
  it("useCreateTransacao deve enviar payload no formato esperado pelo backend", async () => {
    const baseDate = new Date("2026-03-17T12:30:00.000Z");

    vi.mocked(api.post).mockResolvedValueOnce({
      data: {
        id: "tx-1",
        descricao: "Receita teste",
        valor: 3000,
        tipo: 1,
        categoriaId: "cat-1",
        pessoaId: "pes-1",
        data: baseDate.toISOString(),
      },
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useCreateTransacao(), { wrapper });

    const created = await act(async () =>
      result.current.mutateAsync({
        descricao: "Receita teste",
        valor: 3000,
        tipo: TipoTransacao.Receita,
        categoriaId: "cat-1",
        pessoaId: "pes-1",
        data: baseDate,
      })
    );

    expect(api.post).toHaveBeenCalledWith("/transacoes", {
      Descricao: "Receita teste",
      Valor: 3000,
      Tipo: 1,
      CategoriaId: "cat-1",
      PessoaId: "pes-1",
      Data: baseDate.toISOString(),
    });

    expect(created.tipo).toBe(TipoTransacao.Receita);
    expect(created.data.toISOString()).toBe(baseDate.toISOString());
  });

  it("useTransacoes deve mapear corretamente tipo numerico e data da API", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      data: {
        items: [
          {
            id: "tx-despesa",
            descricao: "Despesa teste",
            valor: 50,
            tipo: 0,
            categoriaId: "cat-1",
            pessoaId: "pes-1",
            data: "2026-03-10T00:00:00.000Z",
          },
          {
            id: "tx-receita",
            descricao: "Receita teste",
            valor: 1200,
            tipo: 1,
            categoriaId: "cat-2",
            pessoaId: "pes-2",
            data: "2026-03-11T00:00:00.000Z",
          },
        ],
        total: 2,
        page: 1,
        pageSize: 10,
      },
    });

    const wrapper = createWrapper();
    const { result } = renderHook(() => useTransacoes({ page: 1, pageSize: 10 }), { wrapper });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    const items = result.current.data?.items ?? [];

    expect(items).toHaveLength(2);
    expect(items[0].tipo).toBe(TipoTransacao.Despesa);
    expect(items[1].tipo).toBe(TipoTransacao.Receita);
    expect(items[0].data.toISOString()).toBe("2026-03-10T00:00:00.000Z");
    expect(items[1].data.toISOString()).toBe("2026-03-11T00:00:00.000Z");
  });
});
