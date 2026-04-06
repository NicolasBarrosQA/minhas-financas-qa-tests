export type DraftCommandField =
  | "type"
  | "category"
  | "date"
  | "account"
  | "card"
  | "source"
  | "destination"
  | "installments"
  | "description"
  | "amount";

export type DraftCommand =
  | { kind: "confirm" }
  | { kind: "cancel" }
  | { kind: "field"; field: DraftCommandField; value: string }
  | { kind: "unknown" };

function stripDiacritics(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalize(value: string): string {
  return stripDiacritics(value).toLowerCase().replace(/\s+/g, " ").trim();
}

function tokenize(value: string): string[] {
  return normalize(value).split(/[^a-z0-9]+/).filter(Boolean);
}

function levenshtein(a: string, b: string, maxDistance: number): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const lengthDiff = Math.abs(a.length - b.length);
  if (lengthDiff > maxDistance) return maxDistance + 1;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 0; i < a.length; i += 1) {
    const current = [i + 1];
    let rowMin = current[0];

    for (let j = 0; j < b.length; j += 1) {
      const insertion = current[j] + 1;
      const deletion = previous[j + 1] + 1;
      const substitution = previous[j] + (a[i] === b[j] ? 0 : 1);
      const next = Math.min(insertion, deletion, substitution);
      current.push(next);
      rowMin = Math.min(rowMin, next);
    }

    if (rowMin > maxDistance) return maxDistance + 1;
    previous = current;
  }

  return previous[b.length];
}

function isNearToken(token: string, expected: string): boolean {
  if (!token || !expected) return false;
  if (token === expected) return true;
  if (token[0] !== expected[0]) return false;

  const maxDistance = Math.max(1, Math.min(2, Math.floor(expected.length / 4)));
  return levenshtein(token, expected, maxDistance) <= maxDistance;
}

function hasNearToken(tokens: string[], expectedWords: string[]): boolean {
  return tokens.some((token) => expectedWords.some((expected) => isNearToken(token, expected)));
}

function detectConfirm(normalized: string, tokens: string[]): boolean {
  if (/\bnao\s+(confirmar|salvar|gravar|concluir|prosseguir)\b/.test(normalized)) {
    return false;
  }

  if (/\b(pode\s+)?(confirmar|salvar|gravar|concluir|prosseguir)\b/.test(normalized)) {
    return true;
  }

  return hasNearToken(tokens, [
    "confirmar",
    "confirmo",
    "confirma",
    "confirme",
    "salvar",
    "salve",
    "gravar",
    "grave",
    "concluir",
    "prosseguir",
  ]);
}

function detectCancel(normalized: string, tokens: string[]): boolean {
  if (/\bnao\s+(salvar|confirmar|gravar|concluir|prosseguir)\b/.test(normalized)) {
    return true;
  }

  if (/\b(acho que nao|nao quero|prefiro nao)\b/.test(normalized)) {
    return true;
  }

  return hasNearToken(tokens, [
    "cancelar",
    "cancela",
    "cancelo",
    "descartar",
    "anular",
    "interromper",
  ]);
}

function extractValue(text: string, patterns: RegExp[]): string | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    const value = match?.[1]?.trim();
    if (value) return value;
  }
  return null;
}

const EDIT_VERB =
  "(?:mudar|muda|mude|alterar|altera|altere|trocar|troca|troque|ajustar|ajusta|ajuste|corrigir|corrige|corrija|editar|edita|edite|atualizar|atualiza|atualize|definir|define|defina)";
const ASSIGN_WORD = "(?:para|como|=|:|-)?";

const FIELD_PATTERNS: Array<{ field: DraftCommandField; patterns: RegExp[] }> = [
  {
    field: "type",
    patterns: [
      /^tipo\s*[:=-]?\s*(.+)$/i,
      new RegExp(`^${EDIT_VERB}\\s+(?:o\\s+)?tipo\\s*${ASSIGN_WORD}\\s*(.+)$`, "i"),
    ],
  },
  {
    field: "category",
    patterns: [
      /^(?:categoria|cat)\s*[:=-]?\s*(.+)$/i,
      new RegExp(`^${EDIT_VERB}\\s+(?:a\\s+)?(?:categoria|cat)\\s*${ASSIGN_WORD}\\s*(.+)$`, "i"),
    ],
  },
  {
    field: "date",
    patterns: [
      /^data\s*[:=-]?\s*(.+)$/i,
      new RegExp(`^${EDIT_VERB}\\s+(?:a\\s+)?data\\s*${ASSIGN_WORD}\\s*(.+)$`, "i"),
    ],
  },
  {
    field: "account",
    patterns: [
      /^conta\s*[:=-]?\s*(.+)$/i,
      /^(?:foi\s+na\s+conta)\s+(.+)$/i,
      new RegExp(`^${EDIT_VERB}\\s+(?:a\\s+)?conta\\s*${ASSIGN_WORD}\\s*(.+)$`, "i"),
    ],
  },
  {
    field: "card",
    patterns: [
      /^cart[aã]o\s*[:=-]?\s*(.+)$/i,
      /^(?:foi\s+no\s+cart[aã]o)\s+(.+)$/i,
      new RegExp(`^${EDIT_VERB}\\s+(?:o\\s+)?cart[aã]o\\s*${ASSIGN_WORD}\\s*(.+)$`, "i"),
    ],
  },
  {
    field: "source",
    patterns: [
      /^origem\s*[:=-]?\s*(.+)$/i,
      new RegExp(`^${EDIT_VERB}\\s+(?:a\\s+)?origem\\s*${ASSIGN_WORD}\\s*(.+)$`, "i"),
    ],
  },
  {
    field: "destination",
    patterns: [
      /^destino\s*[:=-]?\s*(.+)$/i,
      new RegExp(`^${EDIT_VERB}\\s+(?:o\\s+)?destino\\s*${ASSIGN_WORD}\\s*(.+)$`, "i"),
    ],
  },
  {
    field: "installments",
    patterns: [
      /^parcelas?\s*[:=-]?\s*(\d{1,2})(?:\s*x)?$/i,
      /^(?:em\s+)?(\d{1,2})\s*x$/i,
      /^(\d{1,2})\s*parcelas?$/i,
      /^(?:parcelar|parcelado)\s+(?:em\s+)?(\d{1,2})(?:\s*x)?$/i,
      new RegExp(`^${EDIT_VERB}\\s+(?:as\\s+)?parcelas?\\s*${ASSIGN_WORD}\\s*(\\d{1,2})(?:\\s*x)?$`, "i"),
    ],
  },
  {
    field: "description",
    patterns: [
      /^(?:descri[cç][aã]o|desc|texto|detalhe)\s*[:=-]?\s*(.+)$/i,
      new RegExp(`^${EDIT_VERB}\\s+(?:a\\s+)?(?:descri[cç][aã]o|desc|texto|detalhe)\\s*${ASSIGN_WORD}\\s*(.+)$`, "i"),
    ],
  },
  {
    field: "amount",
    patterns: [
      /^(?:valor|quantia|pre[cç]o|montante)\s*[:=-]?\s*(.+)$/i,
      new RegExp(`^${EDIT_VERB}\\s+(?:o\\s+)?(?:valor|quantia|pre[cç]o|montante)\\s*${ASSIGN_WORD}\\s*(.+)$`, "i"),
    ],
  },
];

const FIELD_ALIASES: Array<{ field: DraftCommandField; aliases: string[] }> = [
  { field: "type", aliases: ["tipo", "entrada", "saida", "transferencia", "transferência"] },
  { field: "category", aliases: ["categoria", "cat"] },
  { field: "date", aliases: ["data"] },
  { field: "account", aliases: ["conta"] },
  { field: "card", aliases: ["cartao", "credito"] },
  { field: "source", aliases: ["origem"] },
  { field: "destination", aliases: ["destino"] },
  { field: "installments", aliases: ["parcela", "parcelas", "x"] },
  { field: "description", aliases: ["descricao", "desc", "texto", "detalhe"] },
  { field: "amount", aliases: ["valor", "quantia", "preco", "montante"] },
];

const EDIT_VERBS = [
  "mudar",
  "muda",
  "mude",
  "alterar",
  "altera",
  "altere",
  "trocar",
  "troca",
  "troque",
  "ajustar",
  "ajusta",
  "ajuste",
  "corrigir",
  "corrige",
  "corrija",
  "editar",
  "edita",
  "edite",
  "atualizar",
  "atualiza",
  "atualize",
  "definir",
  "define",
  "defina",
];

function nearFieldByToken(token: string): DraftCommandField | null {
  for (const entry of FIELD_ALIASES) {
    if (entry.aliases.some((alias) => isNearToken(token, alias))) {
      return entry.field;
    }
  }

  return null;
}

function parseLooseFieldCommand(input: string): { field: DraftCommandField; value: string } | null {
  const normalized = normalize(input);
  const tokens = normalized.split(" ").filter(Boolean);
  if (tokens.length < 2) return null;

  const firstField = nearFieldByToken(tokens[0]);
  if (firstField) {
    const value = input.replace(/^\s*\S+\s+/, "").trim();
    if (value) return { field: firstField, value };
  }

  const isEditVerb = EDIT_VERBS.some((verb) => isNearToken(tokens[0], verb));
  if (isEditVerb && tokens.length >= 3) {
    const secondField = nearFieldByToken(tokens[1]);
    if (secondField) {
      let value = input.replace(/^\s*\S+\s+\S+\s*/i, "").trim();
      value = value.replace(/^(?:para|como|:|=|-)+\s*/i, "").trim();
      if (value) return { field: secondField, value };
    }
  }

  return null;
}

export function parseDraftCommand(input: string): DraftCommand {
  const text = input.trim();
  if (!text) return { kind: "unknown" };

  const normalized = normalize(text);
  const tokens = tokenize(text);

  if (detectCancel(normalized, tokens)) {
    return { kind: "cancel" };
  }

  if (detectConfirm(normalized, tokens)) {
    return { kind: "confirm" };
  }

  for (const fieldPattern of FIELD_PATTERNS) {
    const value = extractValue(text, fieldPattern.patterns);
    if (value) {
      return {
        kind: "field",
        field: fieldPattern.field,
        value,
      };
    }
  }

  const loose = parseLooseFieldCommand(text);
  if (loose) {
    return {
      kind: "field",
      field: loose.field,
      value: loose.value,
    };
  }

  return { kind: "unknown" };
}
