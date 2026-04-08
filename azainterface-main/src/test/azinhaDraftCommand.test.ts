import { describe, expect, it } from "vitest";
import { parseDraftCommand } from "@/services/azinhaDraftCommand";

describe("Azinha draft command parser", () => {
  it("accepts confirmation with typo", () => {
    const command = parseDraftCommand("confirmae");
    expect(command.kind).toBe("confirm");
  });

  it("accepts confirmation in natural phrase", () => {
    const command = parseDraftCommand("pode salvar");
    expect(command.kind).toBe("confirm");
  });

  it("accepts cancellation in natural phrase", () => {
    const command = parseDraftCommand("nao salvar");
    expect(command.kind).toBe("cancel");
  });

  it("accepts cancellation with 'nao gravar'", () => {
    const command = parseDraftCommand("nao gravar");
    expect(command.kind).toBe("cancel");
  });

  it("accepts cancellation with 'nao concluir'", () => {
    const command = parseDraftCommand("nao concluir");
    expect(command.kind).toBe("cancel");
  });

  it("accepts cancellation in hesitant phrase", () => {
    const command = parseDraftCommand("acho que não");
    expect(command.kind).toBe("cancel");
  });

  it("extracts description change with accents", () => {
    const command = parseDraftCommand("mudar descrição para almoço com cliente");
    expect(command.kind).toBe("field");
    if (command.kind === "field") {
      expect(command.field).toBe("description");
      expect(command.value).toBe("almoço com cliente");
    }
  });

  it("extracts description change with imperative verb", () => {
    const command = parseDraftCommand("mude a descrição para Tigrinho");
    expect(command.kind).toBe("field");
    if (command.kind === "field") {
      expect(command.field).toBe("description");
      expect(command.value).toBe("Tigrinho");
    }
  });

  it("extracts loose field command", () => {
    const command = parseDraftCommand("descricao padaria do centro");
    expect(command.kind).toBe("field");
    if (command.kind === "field") {
      expect(command.field).toBe("description");
      expect(command.value).toBe("padaria do centro");
    }
  });

  it("extracts amount change", () => {
    const command = parseDraftCommand("valor 129,90");
    expect(command.kind).toBe("field");
    if (command.kind === "field") {
      expect(command.field).toBe("amount");
      expect(command.value).toBe("129,90");
    }
  });

  it("extracts amount change with adjacent letter transposition typo", () => {
    const command = parseDraftCommand("valro 129,90");
    expect(command.kind).toBe("field");
    if (command.kind === "field") {
      expect(command.field).toBe("amount");
      expect(command.value).toBe("129,90");
    }
  });

  it("extracts type change", () => {
    const command = parseDraftCommand("tipo transferencia");
    expect(command.kind).toBe("field");
    if (command.kind === "field") {
      expect(command.field).toBe("type");
      expect(command.value.toLowerCase()).toContain("transfer");
    }
  });

  it("extracts installments from natural phrase", () => {
    const command = parseDraftCommand("parcelar em 3x");
    expect(command.kind).toBe("field");
    if (command.kind === "field") {
      expect(command.field).toBe("installments");
      expect(command.value).toBe("3");
    }
  });

  it("extracts destination account", () => {
    const command = parseDraftCommand("trocar destino para Inter");
    expect(command.kind).toBe("field");
    if (command.kind === "field") {
      expect(command.field).toBe("destination");
      expect(command.value).toBe("Inter");
    }
  });

  it("returns unknown for unrelated text", () => {
    const command = parseDraftCommand("qual o clima hoje");
    expect(command.kind).toBe("unknown");
  });
});
