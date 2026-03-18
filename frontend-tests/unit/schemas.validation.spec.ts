import { describe, expect, it } from "vitest";
import { categoriaSchema, pessoaSchema, transacaoSchema } from "@/lib/schemas";
import { Finalidade, TipoTransacao } from "@/types/domain";

describe("Schemas - validacoes de entrada", () => {
  it("deve validar payload de pessoa com nome e data de nascimento", () => {
    const result = pessoaSchema.safeParse({
      nome: "Pessoa Teste",
      dataNascimento: new Date("1990-01-10T00:00:00.000Z"),
    });

    expect(result.success).toBe(true);
  });

  it("deve invalidar pessoa sem nome", () => {
    const result = pessoaSchema.safeParse({
      nome: "",
      dataNascimento: new Date("1990-01-10T00:00:00.000Z"),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join(".") === "nome")).toBe(true);
    }
  });

  it("deve validar payload de categoria com finalidade", () => {
    const result = categoriaSchema.safeParse({
      descricao: "Categoria Teste",
      finalidade: Finalidade.Despesa,
    });

    expect(result.success).toBe(true);
  });

  it("deve invalidar categoria sem descricao", () => {
    const result = categoriaSchema.safeParse({
      descricao: "",
      finalidade: Finalidade.Receita,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join(".") === "descricao")).toBe(true);
    }
  });

  it("deve validar payload completo de transacao", () => {
    const result = transacaoSchema.safeParse({
      descricao: "Transacao Valida",
      valor: 120.5,
      tipo: TipoTransacao.Despesa,
      categoriaId: "categoria-1",
      pessoaId: "pessoa-1",
      data: new Date("2026-03-17T00:00:00.000Z"),
    });

    expect(result.success).toBe(true);
  });

  it("deve invalidar transacao com valor zero ou negativo", () => {
    const result = transacaoSchema.safeParse({
      descricao: "Transacao Invalida",
      valor: 0,
      tipo: TipoTransacao.Despesa,
      categoriaId: "categoria-1",
      pessoaId: "pessoa-1",
      data: new Date("2026-03-17T00:00:00.000Z"),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join(".") === "valor")).toBe(true);
    }
  });

  it("deve invalidar transacao sem categoria", () => {
    const result = transacaoSchema.safeParse({
      descricao: "Sem categoria",
      valor: 10,
      tipo: TipoTransacao.Despesa,
      categoriaId: "",
      pessoaId: "pessoa-1",
      data: new Date("2026-03-17T00:00:00.000Z"),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join(".") === "categoriaId")).toBe(true);
    }
  });

  it("deve invalidar transacao sem pessoa", () => {
    const result = transacaoSchema.safeParse({
      descricao: "Sem pessoa",
      valor: 10,
      tipo: TipoTransacao.Despesa,
      categoriaId: "categoria-1",
      pessoaId: "",
      data: new Date("2026-03-17T00:00:00.000Z"),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join(".") === "pessoaId")).toBe(true);
    }
  });

  it("deve invalidar transacao sem data", () => {
    const result = transacaoSchema.safeParse({
      descricao: "Sem data",
      valor: 10,
      tipo: TipoTransacao.Despesa,
      categoriaId: "categoria-1",
      pessoaId: "pessoa-1",
      data: undefined,
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.join(".") === "data")).toBe(true);
    }
  });
});
