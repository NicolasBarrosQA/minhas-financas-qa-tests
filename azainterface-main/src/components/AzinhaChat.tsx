
import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, MessageCirclePlus, Send, X } from "lucide-react";
import { Mascot } from "./Mascot";
import type { MascotMood } from "./Mascot";
import { useAccounts } from "@/hooks/useAccounts";
import { useCards } from "@/hooks/useCards";
import { useCategories } from "@/hooks/useCategories";
import { useCreateTransaction, useTransactions } from "@/hooks/useTransactions";
import { parseTransactionWithAssistant } from "@/services/azinhaAssistant";
import { decideAzinhaNextStep } from "@/services/azinhaDecisionEngine";
import { parseDraftCommand, type DraftCommandField } from "@/services/azinhaDraftCommand";
import { getFinanceQaReply } from "@/services/azinhaFinanceQa";
import {
  learnAzinhaCategoryCorrection,
  learnAzinhaDescriptionCorrection,
  suggestLearnedCategory,
  suggestLearnedDescription,
} from "@/services/azinhaLearning";
import { recordAzinhaMetric } from "@/services/azinhaMetrics";
import { inferSmartDescription, normalizeAzinhaText, sanitizeSmartDescription } from "@/services/azinhaTextIntelligence";
import type { Account, Card, Category, Transaction, TransactionType } from "@/types/entities";

import {
  TIMEZONE,
  EXAMPLE_PROMPTS,
  buildClarificationMergedText,
  buildDraftSummary,
  buildDraftValidationMessage,
  buildLowConfidenceIntro,
  clampInstallments,
  clampFabPosition,
  clearPendingDecisionTag,
  createMessage,
  createPendingClarificationState,
  expectationFromDecisionTag,
  extractClarificationHints,
  findAccountByName,
  findCardByName,
  findCategoryByName,
  formatCurrency,
  formatDateLabel,
  getAccountDisplayName,
  getCardDisplayName,
  getClarificationQuestion,
  getDefaultCategory,
  getDefaultFabPosition,
  getFabBounds,
  getLocalQuickReply,
  getLastUsedAccount,
  getLastUsedCard,
  getPrimaryAccounts,
  getViewportSize,
  getWelcomeMessages,
  looksLikeTransactionSentence,
  normalizeText,
  parseAmountInput,
  parseDateInput,
  parseTypeValue,
  resolveDraftFromParsed,
  toYmdInTimezone,
  type ChatMessage,
  type PendingClarificationState,
  type PendingTransactionDraft,
  type ViewportSize,
} from "./azinha/chatDomain";

export function AzinhaChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => getWelcomeMessages());
  const [inputValue, setInputValue] = useState("");
  const [mascotMood, setMascotMood] = useState<MascotMood>("happy");
  const [viewport, setViewport] = useState<ViewportSize>(() => getViewportSize());
  const [fabPos, setFabPos] = useState(() => getDefaultFabPosition(getViewportSize()));
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingDraft, setPendingDraft] = useState<PendingTransactionDraft | null>(null);
  const [pendingClarification, setPendingClarification] = useState<PendingClarificationState | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: accounts = [] } = useAccounts();
  const { data: cards = [] } = useCards();
  const { data: categories = [] } = useCategories();
  const { data: transactionsData } = useTransactions({ limit: 120 });
  const createTransaction = useCreateTransaction();

  const recentTransactions = useMemo(() => transactionsData?.data ?? [], [transactionsData]);
  const activeAccounts = useMemo(() => accounts.filter((account) => !account.isArchived), [accounts]);
  const activeCards = useMemo(() => cards.filter((card) => !card.isArchived), [cards]);
  const todayYmd = useMemo(() => toYmdInTimezone(TIMEZONE), []);

  const accountById = useMemo(() => new Map(accounts.map((account) => [account.id, account])), [accounts]);
  const cardById = useMemo(() => new Map(cards.map((card) => [card.id, card])), [cards]);
  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);

  const assistantDefaults = useMemo(() => {
    const lastUsedAccount = getLastUsedAccount(recentTransactions, activeAccounts);
    const lastUsedCard = getLastUsedCard(recentTransactions, activeCards);
    const { primary, secondary } = getPrimaryAccounts(activeAccounts, recentTransactions);

    return {
      lastUsedAccountName: lastUsedAccount ? getAccountDisplayName(lastUsedAccount) : null,
      lastUsedCardName: lastUsedCard ? getCardDisplayName(lastUsedCard) : null,
      primaryAccountName: primary ? getAccountDisplayName(primary) : null,
      secondaryAccountName: secondary ? getAccountDisplayName(secondary) : null,
    };
  }, [activeAccounts, activeCards, recentTransactions]);

  const applyLearnedHintsToDraft = (draft: PendingTransactionDraft, sourceText: string): PendingTransactionDraft => {
    let nextDraft = { ...draft };

    const learnedCategoryName = suggestLearnedCategory(sourceText, draft.type);
    if (learnedCategoryName) {
      const learnedCategory = findCategoryByName(categories, draft.type, learnedCategoryName);
      if (learnedCategory && learnedCategory.id !== nextDraft.categoryId) {
        nextDraft = { ...nextDraft, categoryId: learnedCategory.id };
      }
    }

    const learnedDescription = suggestLearnedDescription(sourceText, draft.type);
    if (learnedDescription) {
      const nextDescription = sanitizeSmartDescription(learnedDescription, sourceText, draft.type).slice(0, 140);
      if (nextDescription.length >= 3 && normalizeAzinhaText(nextDescription) !== normalizeAzinhaText(nextDraft.description)) {
        nextDraft = { ...nextDraft, description: nextDescription };
      }
    }

    return nextDraft;
  };

  const rememberLearningsFromConfirmedDraft = (draft: PendingTransactionDraft) => {
    const sourceText = draft._meta?.sourceText?.trim();
    if (!sourceText) return;

    const finalCategoryName = draft.categoryId ? categoryById.get(draft.categoryId)?.name || null : null;
    const initialCategoryName = draft._meta?.initialCategoryId
      ? categoryById.get(draft._meta.initialCategoryId)?.name || null
      : null;

    if (
      finalCategoryName &&
      normalizeText(finalCategoryName) !== normalizeText(initialCategoryName || "")
    ) {
      learnAzinhaCategoryCorrection(sourceText, draft.type, finalCategoryName);
    }

    const finalDescription = sanitizeSmartDescription(draft.description, sourceText, draft.type);
    if (
      finalDescription &&
      normalizeAzinhaText(finalDescription) !== normalizeAzinhaText(draft._meta?.initialDescription || "")
    ) {
      learnAzinhaDescriptionCorrection(sourceText, draft.type, finalDescription);
    }
  };

  const addAssistantMessage = (text: string) => {
    const sanitized = text
      .replace(/\r\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (!sanitized) return;
    setMessages((current) => [...current, createMessage("azinha", sanitized)]);
  };

  useEffect(() => {
    const target = messagesEndRef.current;
    if (target && typeof target.scrollIntoView === "function") {
      target.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [isOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleViewportChange = () => {
      const nextViewport = getViewportSize();
      setViewport(nextViewport);
      setFabPos((previous) => clampFabPosition(previous, nextViewport));
    };

    window.addEventListener("resize", handleViewportChange);
    window.addEventListener("orientationchange", handleViewportChange);

    return () => {
      window.removeEventListener("resize", handleViewportChange);
      window.removeEventListener("orientationchange", handleViewportChange);
    };
  }, []);

  const bounds = getFabBounds(viewport);

  const pushDraftSummary = (draft: PendingTransactionDraft, intro?: string) => {
    const summary = buildDraftSummary(draft, {
      accountById,
      cardById,
      categoryById,
    });
    addAssistantMessage(intro ? `${intro}\n\n${summary}` : summary);
  };

  const handleDraftCommand = async (userText: string, draft: PendingTransactionDraft) => {
    const parsedCommand = parseDraftCommand(userText);

    if (parsedCommand.kind === "confirm") {
      const validationMessage = buildDraftValidationMessage(draft, {
        accountById,
        cardById,
      });
      if (validationMessage) {
        setMascotMood("confused");
        addAssistantMessage(validationMessage);
        recordAzinhaMetric("clarification_requested", "draft_validation");
        return;
      }

      setIsProcessing(true);
      try {
        await createTransaction.mutateAsync({
          type: draft.type,
          amount: draft.amount,
          description: draft.description,
          date: draft.date,
          accountId: draft.accountId,
          cardId: draft.cardId,
          transferToAccountId: draft.transferToAccountId,
          installments: draft.installments,
          categoryId: draft.categoryId,
        });
        rememberLearningsFromConfirmedDraft(draft);
        recordAzinhaMetric("draft_confirmed");
        setPendingDraft(null);
        setPendingClarification(null);
        setMascotMood("celebrating");
        addAssistantMessage(
          draft.type === "DESPESA"
            ? "Lançamento salvo com sucesso. Gasto registrado."
            : "Lançamento salvo com sucesso.",
        );
      } catch (error) {
        recordAzinhaMetric("save_failed");
        setMascotMood("sad");
        const message = error instanceof Error ? error.message : "Não foi possível salvar o lançamento.";
        addAssistantMessage(`Não consegui salvar agora. ${message}`);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    if (parsedCommand.kind === "cancel") {
      recordAzinhaMetric("draft_canceled");
      setPendingDraft(null);
      setPendingClarification(null);
      setMascotMood("happy");
      addAssistantMessage("Rascunho cancelado. Quando quiser, montamos outro.");
      return;
    }

    const readFieldValue = (field: DraftCommandField, patterns: RegExp[]) => {
      if (parsedCommand.kind === "field" && parsedCommand.field === field) {
        return parsedCommand.value.trim();
      }
      for (const pattern of patterns) {
        const match = userText.match(pattern);
        const value = match?.[1]?.trim();
        if (value) return value;
      }
      return null;
    };

    const buildDraftForTypeChange = (baseDraft: PendingTransactionDraft, nextType: TransactionType): PendingTransactionDraft | null => {
      const fallbackAccount = getLastUsedAccount(recentTransactions, activeAccounts) || activeAccounts[0];
      const fallbackCard = getLastUsedCard(recentTransactions, activeCards) || activeCards[0];
      const { primary, secondary } = getPrimaryAccounts(activeAccounts, recentTransactions);
      const defaultCategory = getDefaultCategory(categories, nextType);

      if (nextType === "RECEITA") {
        const targetAccount =
          (baseDraft.accountId ? accountById.get(baseDraft.accountId) : undefined) ||
          fallbackAccount;
        if (!targetAccount) return null;

        return {
          ...baseDraft,
          type: "RECEITA",
          accountId: targetAccount.id,
          cardId: undefined,
          transferToAccountId: undefined,
          installments: undefined,
          categoryId: defaultCategory?.id,
        };
      }

      if (nextType === "DESPESA") {
        const targetAccount = baseDraft.accountId ? accountById.get(baseDraft.accountId) : undefined;
        const targetCard = baseDraft.cardId ? cardById.get(baseDraft.cardId) : undefined;
        const resolvedAccount = targetAccount || (!targetCard ? fallbackAccount : undefined);
        const resolvedCard = targetCard || (!resolvedAccount ? fallbackCard : undefined);

        if (!resolvedAccount && !resolvedCard) return null;

        return {
          ...baseDraft,
          type: "DESPESA",
          accountId: resolvedAccount?.id,
          cardId: resolvedCard?.id,
          transferToAccountId: undefined,
          installments: resolvedCard ? baseDraft.installments : undefined,
          categoryId: defaultCategory?.id,
        };
      }

      const sourceAccount =
        (baseDraft.accountId ? accountById.get(baseDraft.accountId) : undefined) ||
        fallbackAccount ||
        primary;
      let destinationAccount =
        (baseDraft.transferToAccountId ? accountById.get(baseDraft.transferToAccountId) : undefined) ||
        secondary;

      if (!sourceAccount || !destinationAccount) {
        const another = activeAccounts.find((account) => account.id !== sourceAccount?.id);
        if (!sourceAccount || !another) return null;
        destinationAccount = another;
      }

      if (sourceAccount.id === destinationAccount.id) {
        const another = activeAccounts.find((account) => account.id !== sourceAccount.id);
        if (!another) return null;
        destinationAccount = another;
      }

      return {
        ...baseDraft,
        type: "TRANSFERENCIA",
        accountId: sourceAccount.id,
        transferToAccountId: destinationAccount.id,
        cardId: undefined,
        installments: undefined,
        categoryId: defaultCategory?.id,
      };
    };

    const typeInput = readFieldValue("type", [/^tipo[:\s]+(.+)$/i]);
    if (typeInput) {
      const normalizedUserText = normalizeText(userText);
      const amountFromNaturalTypePhrase = parseAmountInput(userText);
      const typeFromNaturalTypePhrase = parseTypeValue(userText);
      const isNaturalTypeAndAmountPhrase =
        !!amountFromNaturalTypePhrase &&
        !!typeFromNaturalTypePhrase &&
        !/^tipo\b/.test(normalizedUserText);

      if (isNaturalTypeAndAmountPhrase && amountFromNaturalTypePhrase) {
        const typeFromPhrase = typeFromNaturalTypePhrase || draft.type;
        const draftForType =
          typeFromPhrase === draft.type ? { ...draft } : buildDraftForTypeChange(draft, typeFromPhrase);
        if (!draftForType) {
          addAssistantMessage("Não consegui ajustar o tipo agora por falta de conta ou cartão válido.");
          return;
        }

        const nextDraft: PendingTransactionDraft = {
          ...draftForType,
          amount: Number(amountFromNaturalTypePhrase.toFixed(2)),
        };

        const safeDraft = clearPendingDecisionTag(nextDraft);
        recordAzinhaMetric("draft_corrected", "amount");
        setPendingDraft(safeDraft);
        pushDraftSummary(safeDraft, `Anotado. Valor ajustado para ${formatCurrency(safeDraft.amount)}.`);
        return;
      }

      const nextType = parseTypeValue(typeInput);
      if (!nextType) {
        addAssistantMessage('Tipo inválido. Use: "tipo receita", "tipo despesa" ou "tipo transferência".');
        return;
      }

      const nextDraft = buildDraftForTypeChange(draft, nextType);
      if (!nextDraft) {
        addAssistantMessage("Não consegui trocar o tipo agora por falta de conta ou cartão válido.");
        return;
      }

      const normalizedTypeLabel =
        nextType === "RECEITA" ? "entrada" : nextType === "DESPESA" ? "saída" : "transferência";
      const safeDraft = clearPendingDecisionTag(nextDraft);
      recordAzinhaMetric("draft_corrected", "type");
      setPendingDraft(safeDraft);
      pushDraftSummary(safeDraft, `Entendido. Tipo ajustado para ${normalizedTypeLabel}.`);
      return;
    }

    const categoryInput = readFieldValue("category", [/^categoria[:\s]+(.+)$/i]);
    if (categoryInput) {
      const name = categoryInput;
      const nextCategory = findCategoryByName(categories, draft.type, name);
      if (!nextCategory) {
        const hints = categories
          .filter((category) => category.type === draft.type)
          .slice(0, 6)
          .map((category) => category.name)
          .join(", ");
        const categoryPendingDraft: PendingTransactionDraft = {
          ...draft,
          _meta: {
            ...draft._meta,
            pendingDecisionTag: "category_needed",
          },
        };
        setPendingDraft(categoryPendingDraft);
        addAssistantMessage(`Só preciso da categoria. Opções: ${hints}`);
        return;
      }
      const nextDraft = { ...draft, categoryId: nextCategory.id };
      recordAzinhaMetric("draft_corrected", "category");
      setPendingDraft(clearPendingDecisionTag(nextDraft));
      pushDraftSummary(nextDraft, `Anotado. Categoria ajustada para ${nextCategory.name}.`);
      return;
    }

    const normalizedUserText = normalizeText(userText);
    const categoryIntentWithoutValue =
      /^(?:categoria|cat|(?:mudar|mude|alterar|altere|trocar|troque|ajustar|ajuste|corrigir|corrija|editar|edite|atualizar|atualize|definir|defina)\s+(?:a\s+)?(?:categoria|cat))$/.test(
        normalizedUserText,
      );

    if (categoryIntentWithoutValue) {
      const hints = categories
        .filter((category) => category.type === draft.type)
        .slice(0, 6)
        .map((category) => category.name)
        .join(", ");

      const categoryPendingDraft: PendingTransactionDraft = {
        ...draft,
        _meta: {
          ...draft._meta,
          pendingDecisionTag: "category_needed",
        },
      };
      setPendingDraft(categoryPendingDraft);
      addAssistantMessage(`Qual categoria você quer usar? Opções: ${hints}`);
      return;
    }

    const dateInput = readFieldValue("date", [/^data[:\s]+(.+)$/i]);
    if (dateInput) {
      const parsedDate = parseDateInput(dateInput);
      if (!parsedDate) {
        addAssistantMessage("Data inválida. Envie em DD/MM/AAAA ou YYYY-MM-DD.");
        return;
      }
      const nextDraft = { ...draft, date: parsedDate };
      recordAzinhaMetric("draft_corrected", "date");
      setPendingDraft(clearPendingDecisionTag(nextDraft));
      pushDraftSummary(nextDraft, `Entendido. Data ajustada para ${formatDateLabel(parsedDate)}.`);
      return;
    }

    const accountInput = readFieldValue("account", [/^conta[:\s]+(.+)$/i]);
    if (accountInput) {
      if (draft.type === "TRANSFERENCIA") {
        addAssistantMessage('Em transferência, use "origem <conta>" ou "destino <conta>".');
        return;
      }
      if (draft.type === "DESPESA" && draft.cardId) {
        addAssistantMessage('Este rascunho está no cartão. Se quiser trocar, use "cartão <nome>".');
        return;
      }

      const account = findAccountByName(activeAccounts, accountInput);
      if (!account) {
        addAssistantMessage("Não encontrei essa conta. Envie o nome como está cadastrado.");
        return;
      }
      const nextDraft = { ...draft, accountId: account.id, cardId: undefined, installments: undefined };
      recordAzinhaMetric("draft_corrected", "account");
      setPendingDraft(clearPendingDecisionTag(nextDraft));
      pushDraftSummary(nextDraft, `Entendido. Conta ajustada para ${getAccountDisplayName(account)}.`);
      return;
    }

    const cardInput = readFieldValue("card", [/^cart[aã]o[:\s]+(.+)$/i]);
    if (cardInput) {
      if (draft.type !== "DESPESA") {
        addAssistantMessage("O comando de cartão vale apenas para saída.");
        return;
      }

      const card = findCardByName(activeCards, cardInput);
      if (!card) {
        addAssistantMessage("Não encontrei esse cartão. Tente nome, bandeira ou final.");
        return;
      }
      const nextDraft = { ...draft, cardId: card.id, accountId: undefined };
      recordAzinhaMetric("draft_corrected", "card");
      setPendingDraft(clearPendingDecisionTag(nextDraft));
      pushDraftSummary(nextDraft, `Anotado. Cartão ajustado para ${getCardDisplayName(card)}.`);
      return;
    }

    const sourceInput = readFieldValue("source", [/^origem[:\s]+(.+)$/i]);
    if (sourceInput) {
      if (draft.type !== "TRANSFERENCIA") {
        addAssistantMessage('O comando "origem" vale apenas para transferência.');
        return;
      }
      const account = findAccountByName(activeAccounts, sourceInput);
      if (!account) {
        addAssistantMessage("Não encontrei essa conta de origem.");
        return;
      }
      if (account.id === draft.transferToAccountId) {
        addAssistantMessage("Origem e destino precisam ser contas diferentes.");
        return;
      }
      const nextDraft = { ...draft, accountId: account.id };
      recordAzinhaMetric("draft_corrected", "source");
      setPendingDraft(clearPendingDecisionTag(nextDraft));
      pushDraftSummary(nextDraft, `Entendido. Origem ajustada para ${getAccountDisplayName(account)}.`);
      return;
    }

    const destinationInput = readFieldValue("destination", [/^destino[:\s]+(.+)$/i]);
    if (destinationInput) {
      if (draft.type !== "TRANSFERENCIA") {
        addAssistantMessage('O comando "destino" vale apenas para transferência.');
        return;
      }
      const account = findAccountByName(activeAccounts, destinationInput);
      if (!account) {
        addAssistantMessage("Não encontrei essa conta de destino.");
        return;
      }
      if (account.id === draft.accountId) {
        addAssistantMessage("Origem e destino precisam ser contas diferentes.");
        return;
      }
      const nextDraft = { ...draft, transferToAccountId: account.id };
      recordAzinhaMetric("draft_corrected", "destination");
      setPendingDraft(clearPendingDecisionTag(nextDraft));
      pushDraftSummary(nextDraft, `Anotado. Destino ajustado para ${getAccountDisplayName(account)}.`);
      return;
    }

    const installmentsInput = readFieldValue("installments", [
      /^parcelas?[:\s]+(\d{1,2})/i,
      /^(\d{1,2})\s*x$/i,
      /^(\d{1,2})\s*parcelas?$/i,
    ]);
    if (installmentsInput) {
      if (draft.type !== "DESPESA") {
        addAssistantMessage("O comando de parcelas vale apenas para saída.");
        return;
      }

      const installmentsDigits = installmentsInput.match(/\d{1,2}/)?.[0];
      if (!installmentsDigits) {
        addAssistantMessage("Não consegui entender a quantidade de parcelas. Exemplo: parcelas 3.");
        return;
      }

      const installments = clampInstallments(Number(installmentsDigits));
      let nextDraft: PendingTransactionDraft = { ...draft };
      if (installments > 1) {
        if (!nextDraft.cardId) {
          const fallbackCard = getLastUsedCard(recentTransactions, activeCards) || activeCards[0];
          if (!fallbackCard) {
            addAssistantMessage("Para parcelar, preciso de um cartão cadastrado.");
            return;
          }
          nextDraft = { ...nextDraft, cardId: fallbackCard.id, accountId: undefined };
        }
        nextDraft.installments = installments;
      } else {
        nextDraft.installments = undefined;
      }
      recordAzinhaMetric("draft_corrected", "installments");
      setPendingDraft(clearPendingDecisionTag(nextDraft));
      pushDraftSummary(nextDraft, installments > 1 ? `Entendido. Parcelamento ajustado para ${installments}x.` : "Anotado. Parcelamento removido.");
      return;
    }

    const descriptionInput = readFieldValue("description", [
      /^(?:descri[cç][aã]o|desc)[:\s]+(.+)$/i,
      /^(?:texto|detalhe)[:\s]+(.+)$/i,
    ]);
    if (descriptionInput) {
      const nextDescription = descriptionInput.trim();
      if (nextDescription.length < 3) {
        addAssistantMessage("A descrição ficou curta demais. Envie um texto um pouco mais completo.");
        return;
      }

      const safeDescription = sanitizeSmartDescription(nextDescription.slice(0, 140), draft._meta?.sourceText || userText, draft.type);
      const nextDraft = { ...draft, description: safeDescription };
      recordAzinhaMetric("draft_corrected", "description");
      setPendingDraft(clearPendingDecisionTag(nextDraft));
      pushDraftSummary(nextDraft, `Anotado. Descrição ajustada para "${safeDescription}".`);
      return;
    }

    const amountInput = readFieldValue("amount", [/^(?:valor|quantia|pre[cç]o|montante)[:\s]+(.+)$/i]);
    if (amountInput) {
      const nextAmount = parseAmountInput(amountInput);
      if (!nextAmount || nextAmount <= 0) {
        addAssistantMessage("Não consegui entender o valor. Exemplo: valor 129,90.");
        return;
      }

      const nextDraft = { ...draft, amount: Number(nextAmount.toFixed(2)) };
      recordAzinhaMetric("draft_corrected", "amount");
      setPendingDraft(clearPendingDecisionTag(nextDraft));
      pushDraftSummary(nextDraft, `Anotado. Valor ajustado para ${formatCurrency(nextDraft.amount)}.`);
      return;
    }

    const decisionTag = draft._meta?.pendingDecisionTag;
    const normalizedAnswer = normalizeText(userText);
    if (decisionTag) {
      if (decisionTag === "amount_needed") {
        const parsedAmount = parseAmountInput(userText);
        if (!parsedAmount || parsedAmount <= 0) {
          addAssistantMessage("Ainda preciso de um valor válido para continuar.");
          return;
        }

        const nextDraft = clearPendingDecisionTag({
          ...draft,
          amount: Number(parsedAmount.toFixed(2)),
        });
        setPendingDraft(nextDraft);
        recordAzinhaMetric("draft_corrected", "amount");
        pushDraftSummary(nextDraft, `Perfeito. Valor ajustado para ${formatCurrency(nextDraft.amount)}.`);
        return;
      }

      if (decisionTag === "type_needed") {
        const parsedType = parseTypeValue(userText);
        if (!parsedType) {
          addAssistantMessage('Ainda preciso confirmar o tipo: "receita", "despesa" ou "transferência".');
          return;
        }

        const migrated = buildDraftForTypeChange(draft, parsedType);
        if (!migrated) {
          addAssistantMessage("Não consegui ajustar o tipo com os dados atuais de conta/cartão.");
          return;
        }

        const safeDraft = clearPendingDecisionTag(migrated);
        setPendingDraft(safeDraft);
        recordAzinhaMetric("draft_corrected", "type");
        pushDraftSummary(safeDraft, "Entendido. Tipo ajustado.");
        return;
      }

      if (decisionTag === "source_needed" && draft.type === "DESPESA") {
        const mentionedCard = findCardByName(activeCards, userText);
        const mentionedAccount = findAccountByName(activeAccounts, userText);
        const saysCard = /\b(cartao|cartão|credito|crédito|fatura)\b/.test(normalizedAnswer);
        const saysAccount = /\b(conta|debito|débito|saldo|corrente)\b/.test(normalizedAnswer);

        if (mentionedCard || (saysCard && !saysAccount)) {
          const resolvedCard = mentionedCard || getLastUsedCard(recentTransactions, activeCards) || activeCards[0];
          if (!resolvedCard) {
            addAssistantMessage("Não encontrei cartão disponível para usar neste rascunho.");
            return;
          }

          const nextDraft = clearPendingDecisionTag({
            ...draft,
            cardId: resolvedCard.id,
            accountId: undefined,
          });
          setPendingDraft(nextDraft);
          recordAzinhaMetric("draft_corrected", "source");
          pushDraftSummary(nextDraft, `Perfeito. Fonte ajustada para cartão ${getCardDisplayName(resolvedCard)}.`);
          return;
        }

        if (mentionedAccount || (saysAccount && !saysCard)) {
          const resolvedAccount = mentionedAccount || getLastUsedAccount(recentTransactions, activeAccounts) || activeAccounts[0];
          if (!resolvedAccount) {
            addAssistantMessage("Não encontrei conta disponível para usar neste rascunho.");
            return;
          }

          const nextDraft = clearPendingDecisionTag({
            ...draft,
            accountId: resolvedAccount.id,
            cardId: undefined,
            installments: undefined,
          });
          setPendingDraft(nextDraft);
          recordAzinhaMetric("draft_corrected", "source");
          pushDraftSummary(nextDraft, `Perfeito. Fonte ajustada para conta ${getAccountDisplayName(resolvedAccount)}.`);
          return;
        }

        addAssistantMessage('Preciso confirmar a fonte: responda "na conta" ou "no cartão".');
        return;
      }

      if (decisionTag === "transfer_accounts_needed" && draft.type === "TRANSFERENCIA") {
        const pairMatch =
          userText.match(/\b(?:de|da|do|origem)\s+(.+?)\s+\b(?:para|pra|pro|destino)\s+(.+)$/i) ||
          userText.match(/\borigem\s+(.+?)\s+destino\s+(.+)$/i);

        let nextSourceId = draft.accountId;
        let nextDestinationId = draft.transferToAccountId;

        if (pairMatch?.[1] && pairMatch?.[2]) {
          const sourceCandidate = findAccountByName(activeAccounts, pairMatch[1].trim());
          const destinationCandidate = findAccountByName(activeAccounts, pairMatch[2].trim());
          if (sourceCandidate) nextSourceId = sourceCandidate.id;
          if (destinationCandidate) nextDestinationId = destinationCandidate.id;
        } else {
          const mentioned = findAccountByName(activeAccounts, userText);
          if (mentioned) {
            if (!nextSourceId) {
              nextSourceId = mentioned.id;
            } else if (!nextDestinationId && mentioned.id !== nextSourceId) {
              nextDestinationId = mentioned.id;
            }
          }
        }

        if (nextSourceId && nextDestinationId && nextSourceId !== nextDestinationId) {
          const nextDraft = clearPendingDecisionTag({
            ...draft,
            accountId: nextSourceId,
            transferToAccountId: nextDestinationId,
          });
          setPendingDraft(nextDraft);
          recordAzinhaMetric("draft_corrected", "transfer_accounts");
          pushDraftSummary(nextDraft, "Perfeito. Origem e destino ajustados.");
          return;
        }

        setPendingDraft({
          ...draft,
          accountId: nextSourceId,
          transferToAccountId: nextDestinationId,
        });
        addAssistantMessage('Ainda preciso de origem e destino. Exemplo: "de Nubank para Inter".');
        return;
      }

      if (
        decisionTag === "person_vs_transfer" ||
        decisionTag === "entity_person_or_item"
      ) {
        if (/\b(transfer|transferencia|transferência|pix|pessoa)\b/.test(normalizedAnswer)) {
          const migrated = buildDraftForTypeChange(draft, "TRANSFERENCIA");
          if (migrated) {
            const safeDraft = clearPendingDecisionTag(migrated);
            setPendingDraft(safeDraft);
            recordAzinhaMetric("draft_corrected", "type");
            pushDraftSummary(safeDraft, "Perfeito. Ajustei para transferência.");
            return;
          }
        }

        if (/\b(despesa|gasto|compra|doce|alimenta)\b/.test(normalizedAnswer)) {
          let adjusted = buildDraftForTypeChange(draft, "DESPESA");
          if (adjusted) {
            if (/\b(doce|alimenta)\b/.test(normalizedAnswer)) {
              const foodCategory = findCategoryByName(categories, "DESPESA", "Alimentação")
                || findCategoryByName(categories, "DESPESA", "Alimentacao");
              if (foodCategory) {
                adjusted = { ...adjusted, categoryId: foodCategory.id };
              }
            }
            const safeDraft = clearPendingDecisionTag(adjusted);
            setPendingDraft(safeDraft);
            recordAzinhaMetric("draft_corrected", "category");
            pushDraftSummary(safeDraft, "Perfeito. Mantive como saída e ajustei o rascunho.");
            return;
          }
        }
      }

      if (decisionTag === "category_needed") {
        const guessedCategory = findCategoryByName(categories, draft.type, userText);
        if (guessedCategory) {
          const safeDraft = clearPendingDecisionTag({ ...draft, categoryId: guessedCategory.id });
          setPendingDraft(safeDraft);
          recordAzinhaMetric("draft_corrected", "category");
          pushDraftSummary(safeDraft, `Anotado. Categoria ajustada para ${guessedCategory.name}.`);
          return;
        }

        const hints = categories
          .filter((category) => category.type === draft.type)
          .slice(0, 6)
          .map((category) => category.name)
          .join(", ");
        addAssistantMessage(`Não reconheci essa categoria. Escolha uma destas opções: ${hints}`);
        return;
      }
    }

    if (parsedCommand.kind === "unknown") {
      const directCategory = findCategoryByName(categories, draft.type, userText);
      if (directCategory) {
        const safeDraft = clearPendingDecisionTag({ ...draft, categoryId: directCategory.id });
        setPendingDraft(safeDraft);
        recordAzinhaMetric("draft_corrected", "category");
        pushDraftSummary(safeDraft, `Anotado. Categoria ajustada para ${directCategory.name}.`);
        return;
      }
    }

    const seemsOutOfContextWhileDraft =
      !looksLikeTransactionSentence(userText) &&
      !/\b(confirm|cancel|categoria|cat|data|conta|cartao|cartão|origem|destino|parcel|descri[cç][aã]o|descricao|descrição|desc|texto|detalhe|valor|tipo|mude|mudar|altere|alterar|troque|trocar|ajuste|ajustar|corrija|corrigir|edite|editar|atualize|atualizar|defina|definir)\b/.test(
        normalizeText(userText),
      );

    if (seemsOutOfContextWhileDraft) {
      addAssistantMessage(
        [
          "Estou com um rascunho aberto no momento.",
          'Para concluir, responda "confirmar" ou "cancelar".',
          "Se quiser começar outro lançamento, envie a nova transação em uma frase.",
        ].join("\n"),
      );
      return;
    }

    addAssistantMessage(
      [
        "Fiquei em dúvida sobre o ajuste.",
        "Escreva de forma direta o que deseja alterar. Exemplo: mudar descrição para almoço, trocar para transferência ou ajustar o valor para 129,90.",
        'Se preferir, responda apenas "confirmar" ou "cancelar".',
      ].join("\n"),
    );
  };

  const handleSend = async () => {
    const text = inputValue.trim();
    if (!text || isProcessing) return;

    setMessages((current) => [...current, createMessage("user", text)]);
    setInputValue("");
    setMascotMood("confused");
    recordAzinhaMetric("message_received");

    let textToParse = text;
    let sourceTextForMeta = text;
    let usedClarificationMerge = false;
    let activeClarificationState = pendingClarification;

    if (pendingDraft) {
      const parsedCommand = parseDraftCommand(text);
      if (parsedCommand.kind === "unknown" && looksLikeTransactionSentence(text)) {
        setPendingDraft(null);
        addAssistantMessage("Fechado. Vou tratar esta mensagem como um novo lançamento.");
      } else {
        await handleDraftCommand(text, pendingDraft);
        return;
      }
    }

    if (!pendingDraft && activeClarificationState) {
      const normalizedText = normalizeText(text);
      const tokenCount = normalizedText.split(" ").filter(Boolean).length;
      if (/\b(cancelar|cancela|nao quero|deixa pra la|deixa para la)\b/.test(normalizedText)) {
        setPendingClarification(null);
        activeClarificationState = null;
        setMascotMood("happy");
        addAssistantMessage("Perfeito. Encerramos esta confirmação.");
        return;
      }

      const incomingHints = extractClarificationHints(text);
      const hasContextWords = /\b(no|na|em|para|pra|pro|cartao|cartão|conta|pix|mercado|uber|ifood|padaria)\b/.test(
        normalizedText,
      );
      const looksLikeFreshTransaction =
        looksLikeTransactionSentence(text) &&
        normalizeText(text) !== normalizeText(activeClarificationState.sourceText) &&
        Boolean(incomingHints.type || incomingHints.amount) &&
        (tokenCount >= 3 || hasContextWords);

      if (looksLikeFreshTransaction) {
        setPendingClarification(null);
        activeClarificationState = null;
        addAssistantMessage("Fechado. Vou considerar esta mensagem como um novo lançamento.");
        sourceTextForMeta = text;
        textToParse = text;
      } else {
        const nextClarification: PendingClarificationState = {
          sourceText: activeClarificationState.sourceText,
          type: incomingHints.type || activeClarificationState.type,
          amount: incomingHints.amount || activeClarificationState.amount,
          expected: activeClarificationState.expected,
          prompt: activeClarificationState.prompt,
        };

        const expectsCoreHints =
          !nextClarification.expected ||
          nextClarification.expected === "type" ||
          nextClarification.expected === "amount";

        if (expectsCoreHints) {
          if (!nextClarification.type || !nextClarification.amount) {
            setPendingClarification(nextClarification);
            activeClarificationState = nextClarification;
            setMascotMood("confused");
            recordAzinhaMetric("clarification_requested", "missing_transaction_followup");
            addAssistantMessage(getClarificationQuestion(nextClarification));
            return;
          }

          setPendingClarification(null);
          activeClarificationState = null;
          sourceTextForMeta = nextClarification.sourceText;
          textToParse = buildClarificationMergedText(nextClarification);
          usedClarificationMerge = true;
        } else {
          setPendingClarification(null);
          activeClarificationState = null;
          sourceTextForMeta = `${nextClarification.sourceText}. ${text}`.trim();
          textToParse = sourceTextForMeta;
          usedClarificationMerge = true;
        }
      }
    }

    if (!pendingDraft && !activeClarificationState) {
      const freeCommand = parseDraftCommand(text);
      const normalizedFreeCommand = normalizeText(text);
      const isDirectControlCommand =
        /\b(confirmar|confirmo|confirma|confirme|salvar|salve|gravar|grave|cancelar|cancela|cancelo|descartar|anular)\b/.test(
          normalizedFreeCommand,
        ) && !/\b(nao quero|prefiro nao|agora nao|depois)\b/.test(normalizedFreeCommand);
      if ((freeCommand.kind === "confirm" || freeCommand.kind === "cancel") && isDirectControlCommand) {
        setMascotMood("happy");
        addAssistantMessage("Não há rascunho aberto no momento. Envie um lançamento em uma frase que eu organizo.");
        return;
      }
    }

    const financeQaReply = getFinanceQaReply(text, {
      recentTransactions,
      todayYmd,
    });
    if (financeQaReply) {
      setMascotMood("happy");
      addAssistantMessage(financeQaReply);
      recordAzinhaMetric("finance_qa_reply");
      return;
    }

    const localReply = getLocalQuickReply(text);
    if (localReply) {
      setMascotMood("happy");
      addAssistantMessage(localReply);
      return;
    }

    setIsProcessing(true);

    try {
      const response = await parseTransactionWithAssistant({
        text: textToParse,
        timezone: TIMEZONE,
        today: todayYmd,
        accounts: activeAccounts.map((account) => ({ name: getAccountDisplayName(account) })),
        cards: activeCards.map((card) => ({
          name: card.name,
          brand: card.brand || null,
          lastFourDigits: card.lastFourDigits || null,
        })),
        categories: categories.map((category) => ({ name: category.name, type: category.type })),
        defaults: assistantDefaults,
      });

      if (response.confidenceSignals.some((signal) => signal.startsWith("fallback_"))) {
        recordAzinhaMetric("fallback_response");
      }

      if (response.intent !== "TRANSACTION") {
        setMascotMood("happy");
        addAssistantMessage(response.answer || 'Entendi. Se quiser registrar, envie em uma frase: "gastei 45 no almoço".');
        return;
      }

      recordAzinhaMetric("transaction_signal");

      if (!response.transaction) {
        const fallbackHints = extractClarificationHints(sourceTextForMeta);
        const nextClarification = createPendingClarificationState(sourceTextForMeta, {
          type: fallbackHints.type,
          amount: fallbackHints.amount,
          prompt: response.clarification,
        });
        setPendingClarification(nextClarification);
        recordAzinhaMetric("clarification_requested", "missing_transaction");
        setMascotMood("confused");
        addAssistantMessage(
          getClarificationQuestion(nextClarification),
        );
        return;
      }

      const { draft, clarification } = resolveDraftFromParsed(response.transaction, {
        accounts,
        cards,
        categories,
        recentTransactions,
        todayYmd,
      });

      if (!draft) {
        const fallbackHints = extractClarificationHints(sourceTextForMeta);
        const clarificationPrompt =
          clarification || response.clarification || "Fiquei em dúvida em um ponto. Envie esse detalhe e eu concluo.";
        const nextClarification = createPendingClarificationState(sourceTextForMeta, {
          type: fallbackHints.type,
          amount: fallbackHints.amount,
          prompt: clarificationPrompt,
        });
        setPendingClarification(nextClarification);
        recordAzinhaMetric("clarification_requested", "resolve_draft");
        setMascotMood("confused");
        addAssistantMessage(getClarificationQuestion(nextClarification));
        return;
      }

      const draftDescription = usedClarificationMerge
        ? sanitizeSmartDescription(
            inferSmartDescription(sourceTextForMeta, draft.type),
            sourceTextForMeta,
            draft.type,
          )
        : draft.description;

      const draftWithMeta: PendingTransactionDraft = {
        ...draft,
        description: draftDescription,
        _meta: {
          sourceText: sourceTextForMeta,
          initialDescription: draftDescription,
          initialCategoryId: draft.categoryId,
          parseConfidence: response.confidence,
        },
      };

      const enrichedDraft = applyLearnedHintsToDraft(draftWithMeta, sourceTextForMeta);
      const validationMessage = buildDraftValidationMessage(enrichedDraft, {
        accountById,
        cardById,
      });

      const decision = decideAzinhaNextStep({
        userText: text,
        response,
        draft: enrichedDraft,
        validationMessage,
      });

      if (decision.tier !== "high") {
        recordAzinhaMetric("low_confidence");
      }

      if (decision.action === "rewrite") {
        const rewritePrompt =
          decision.question || validationMessage || "Preciso de mais detalhes para evitar um registro incorreto.";
        const fallbackHints = extractClarificationHints(sourceTextForMeta);
        const nextClarification = createPendingClarificationState(sourceTextForMeta, {
          type: fallbackHints.type,
          amount: fallbackHints.amount,
          expected: expectationFromDecisionTag(decision.tag),
          prompt: rewritePrompt,
        });
        setPendingClarification(nextClarification);
        recordAzinhaMetric("clarification_requested", decision.reason);
        setMascotMood("confused");
        addAssistantMessage(getClarificationQuestion(nextClarification));
        return;
      }

      const draftWithDecision: PendingTransactionDraft = decision.tag
        ? {
            ...enrichedDraft,
            _meta: {
              ...enrichedDraft._meta,
              pendingDecisionTag: decision.tag,
            },
          }
        : clearPendingDecisionTag(enrichedDraft);

      setPendingDraft(draftWithDecision);
      setPendingClarification(null);
      recordAzinhaMetric("draft_created");

      if (decision.action === "ask") {
        recordAzinhaMetric("clarification_requested", decision.reason);
        setMascotMood("confused");
        pushDraftSummary(
          draftWithDecision,
          decision.question || buildLowConfidenceIntro(response.confidence, draftWithDecision),
        );
        return;
      }

      setMascotMood("happy");
      pushDraftSummary(draftWithDecision);
    } catch (error) {
      recordAzinhaMetric("save_failed");
      setMascotMood("sad");
      const message = error instanceof Error ? error.message : "Falha ao analisar mensagem.";
      addAssistantMessage(`Não consegui processar sua mensagem agora. ${message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExampleClick = (prompt: string) => {
    setInputValue(prompt);
    inputRef.current?.focus();
  };

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            aria-label="Abrir chat da Azinha"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, x: 0, y: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            drag
            dragMomentum={false}
            dragElastic={0.1}
            dragConstraints={{
              top: bounds.minY - fabPos.y,
              left: bounds.minX - fabPos.x,
              right: bounds.maxX - fabPos.x,
              bottom: bounds.maxY - fabPos.y,
            }}
            onDragEnd={(_, info) => {
              setFabPos((previous) =>
                clampFabPosition(
                  {
                    x: previous.x + info.offset.x,
                    y: previous.y + info.offset.y,
                  },
                  viewport,
                ),
              );
            }}
            onTap={() => setIsOpen(true)}
            style={{ position: "fixed", left: fabPos.x, top: fabPos.y }}
            className="z-50 w-12 h-12 rounded-2xl bg-card backdrop-blur-md shadow-md flex items-center justify-center border border-border cursor-grab active:cursor-grabbing touch-none"
          >
            <MessageCirclePlus className="w-5 h-5 text-primary" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            />

            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] flex flex-col bg-background rounded-t-3xl shadow-2xl"
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <Mascot mood={mascotMood} size="sm" showBubble={false} />
                  <div>
                    <h3 className="text-sm font-bold text-foreground">Azinha</h3>
                    <p className="text-xs text-muted-foreground">Copiloto financeiro</p>
                  </div>
                </div>
                <button
                  aria-label="Fechar chat da Azinha"
                  onClick={() => setIsOpen(false)}
                  className="w-8 h-8 rounded-full bg-muted flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-[300px] max-h-[55vh]">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm ${
                        msg.sender === "user"
                          ? "bg-gradient-to-br from-amber-400 to-amber-500 text-amber-950 rounded-br-md"
                          : "bg-muted text-foreground rounded-bl-md"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </motion.div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {messages.length <= 1 && !pendingDraft && (
                <div className="px-4 pb-2">
                  <p className="text-xs text-muted-foreground mb-2 font-semibold">Experimente dizer:</p>
                  <div className="flex flex-wrap gap-2">
                    {EXAMPLE_PROMPTS.map((prompt) => (
                      <button
                        key={prompt}
                        onClick={() => handleExampleClick(prompt)}
                        className="text-xs bg-primary/10 text-primary font-semibold px-3 py-1.5 rounded-full hover:bg-primary/20 transition-colors"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="px-4 py-3 pb-safe border-t border-border">
                <div className="flex items-center gap-2 bg-muted/50 rounded-2xl px-4 py-2">
                  <input
                    aria-label="Mensagem para Azinha"
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleSend();
                      }
                    }}
                    placeholder={
                      pendingDraft
                        ? "Confirmar, cancelar ou ajustar (categoria/data/conta/cartão/descrição/valor...)"
                        : "Ex: Transferi 200 da Nubank para Inter"
                    }
                    className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                  />
                  <motion.button
                    aria-label="Enviar mensagem para Azinha"
                    whileTap={{ scale: 0.9 }}
                    onClick={() => void handleSend()}
                    disabled={!inputValue.trim() || isProcessing}
                    className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center disabled:opacity-40 disabled:scale-100 shadow-sm"
                  >
                    {isProcessing ? (
                      <Loader2 className="w-4 h-4 text-amber-900 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 text-amber-900" />
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}


