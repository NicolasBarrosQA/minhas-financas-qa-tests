import type { Transaction } from "@/types/entities";

const TRANSACTION_SIGNAL_RE =
  /\d|r\$|real|pix|transfer|transferi|gastei|recebi|comprei|paguei|cartao|parcela|entrada|saida|despesa|receita|fatura|deposit|depositei|saque|mercado|uber|ifood/i;

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function startOfMonth(ymd: string): string {
  const [year, month] = ymd.split("-");
  return `${year || "1970"}-${month || "01"}-01`;
}

function sumByType(items: Transaction[], type: Transaction["type"]): number {
  return items
    .filter((item) => item.type === type)
    .reduce((acc, item) => acc + Number(item.amount || 0), 0);
}

function filterByDate(items: Transaction[], date: string): Transaction[] {
  return items.filter((item) => item.date === date);
}

function filterByMonth(items: Transaction[], fromDate: string, toDate: string): Transaction[] {
  return items.filter((item) => item.date >= fromDate && item.date <= toDate);
}

function describeCount(label: string, count: number): string {
  const suffix = count === 1 ? "" : "s";
  return `${count} ${label}${suffix}`;
}

export function getFinanceQaReply(
  input: string,
  context: { recentTransactions: Transaction[]; todayYmd: string },
): string | null {
  const normalized = normalize(input);
  if (!normalized) return null;

  const looksLikeTransactionCommand =
    /\b(gastei|paguei|comprei|recebi|transferi|enviei|depositei)\b/.test(normalized) &&
    /\br\$|\b\d/.test(normalized) &&
    !/\b(quanto|total|resumo|saldo|balanco|balanço|quantas|numero|número)\b/.test(normalized);

  if (looksLikeTransactionCommand || (!/\?/.test(normalized) && TRANSACTION_SIGNAL_RE.test(normalized) && /\b(r\$|\d)\b/.test(normalized))) {
    return null;
  }

  const asksExpenseToday =
    /\b(quanto|total|soma|valor)\b.*\b(gastei|gasto|saidas?|despesas?)\b.*\b(hoje)\b/.test(normalized) ||
    /\b(gastei|gasto|saidas?|despesas?)\b.*\b(hoje)\b/.test(normalized);

  const asksIncomeToday =
    /\b(quanto|total|soma|valor)\b.*\b(recebi|receita|entradas?)\b.*\b(hoje)\b/.test(normalized) ||
    /\b(recebi|receita|entradas?)\b.*\b(hoje)\b/.test(normalized);

  const asksBalanceToday =
    /\b(saldo|balanco|balanço)\b.*\b(hoje)\b/.test(normalized) ||
    /\b(como\s+esta|como\s+est\w+)\b.*\b(hoje)\b/.test(normalized);

  const asksMonthSummary =
    /\b(resumo|fechamento|balanco|balanço)\b.*\b(mes|mês)\b/.test(normalized) ||
    /\b(como\s+esta|como\s+est\w+)\b.*\b(mes|mês)\b/.test(normalized);

  const asksExpenseMonth =
    /\b(quanto|total|soma|valor)\b.*\b(gastei|gasto|saidas?|despesas?)\b.*\b(mes|mês)\b/.test(normalized) ||
    /\b(gastei|gasto|saidas?|despesas?)\b.*\b(mes|mês)\b/.test(normalized);

  const asksIncomeMonth =
    /\b(quanto|total|soma|valor)\b.*\b(recebi|receita|entradas?)\b.*\b(mes|mês)\b/.test(normalized) ||
    /\b(recebi|receita|entradas?)\b.*\b(mes|mês)\b/.test(normalized);

  const asksBiggestExpense =
    /\b(maior|principal)\b.*\b(gasto|despesa|saida|saída)\b/.test(normalized) ||
    /\b(onde|em\s+que)\b.*\b(gastando|gastei\s+mais)\b/.test(normalized);

  const asksBiggestIncome =
    /\b(maior|principal)\b.*\b(receita|entrada|ganho)\b/.test(normalized) ||
    /\b(onde|em\s+que)\b.*\b(recebi\s+mais|ganhei\s+mais)\b/.test(normalized);

  const asksTransactionCountToday =
    /\b(quantas|quantos|numero|número)\b.*\b(transacoes|transações|lancamentos|lançamentos)\b.*\b(hoje)\b/.test(normalized);

  const asksTransactionCountMonth =
    /\b(quantas|quantos|numero|número)\b.*\b(transacoes|transações|lancamentos|lançamentos)\b.*\b(mes|mês)\b/.test(normalized);

  const todayItems = filterByDate(context.recentTransactions, context.todayYmd);
  const monthStart = startOfMonth(context.todayYmd);
  const monthItems = filterByMonth(context.recentTransactions, monthStart, context.todayYmd);

  if (asksExpenseToday) {
    const expense = sumByType(todayItems, "DESPESA");
    return `Hoje suas saídas somam ${formatCurrency(expense)}.`;
  }

  if (asksIncomeToday) {
    const income = sumByType(todayItems, "RECEITA");
    return `Hoje suas entradas somam ${formatCurrency(income)}.`;
  }

  if (asksBalanceToday) {
    const income = sumByType(todayItems, "RECEITA");
    const expense = sumByType(todayItems, "DESPESA");
    const balance = income - expense;
    return `Seu saldo do dia está em ${formatCurrency(balance)}. Entradas: ${formatCurrency(income)}. Saídas: ${formatCurrency(expense)}.`;
  }

  if (asksBiggestExpense) {
    const monthExpenses = monthItems.filter((item) => item.type === "DESPESA");

    if (monthExpenses.length === 0) {
      return "Ainda não há saídas registradas neste mês para comparar.";
    }

    const biggest = [...monthExpenses].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))[0];
    return `Sua maior saída no mês foi ${formatCurrency(Number(biggest.amount || 0))} em "${biggest.description}".`;
  }

  if (asksBiggestIncome) {
    const monthIncomes = monthItems.filter((item) => item.type === "RECEITA");

    if (monthIncomes.length === 0) {
      return "Ainda não há entradas registradas neste mês para comparar.";
    }

    const biggest = [...monthIncomes].sort((a, b) => Number(b.amount || 0) - Number(a.amount || 0))[0];
    return `Sua maior entrada no mês foi ${formatCurrency(Number(biggest.amount || 0))} em "${biggest.description}".`;
  }

  if (asksExpenseMonth) {
    const expense = sumByType(monthItems, "DESPESA");
    return `No mês, suas saídas somam ${formatCurrency(expense)}.`;
  }

  if (asksIncomeMonth) {
    const income = sumByType(monthItems, "RECEITA");
    return `No mês, suas entradas somam ${formatCurrency(income)}.`;
  }

  if (asksMonthSummary) {
    const income = sumByType(monthItems, "RECEITA");
    const expense = sumByType(monthItems, "DESPESA");
    const balance = income - expense;
    return [
      `Resumo do mês até agora:`,
      `- Entradas: ${formatCurrency(income)}`,
      `- Saídas: ${formatCurrency(expense)}`,
      `- Saldo parcial: ${formatCurrency(balance)}`,
    ].join("\n");
  }

  if (asksTransactionCountToday) {
    return `Hoje você registrou ${describeCount("lançamento", todayItems.length)}.`;
  }

  if (asksTransactionCountMonth) {
    return `No mês, você registrou ${describeCount("lançamento", monthItems.length)}.`;
  }

  return null;
}
