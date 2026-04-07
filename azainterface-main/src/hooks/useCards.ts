import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Card, CreateCardPayload, UpdateCardPayload } from '@/types/entities';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { getActiveUserId, getScopeKey } from '@/lib/sessionScope';

const QUERY_KEY = ['cards'];
const cardsCacheByScope = new Map<string, Card[]>();

function getScopedCards(scope: string): Card[] {
  return cardsCacheByScope.get(scope) ?? [];
}

function mapCardRow(row: Tables<'cards'>): Card {
  return {
    id: row.id,
    userId: row.user_id,
    accountId: row.account_id || undefined,
    name: row.name,
    type: row.type,
    limit: Number(row.credit_limit || 0),
    currentSpend: Number(row.current_spend || 0),
    availableLimit: Number(row.available_limit ?? Number(row.credit_limit || 0) - Number(row.current_spend || 0)),
    closingDay: row.closing_day,
    dueDay: row.due_day,
    brand: row.brand || undefined,
    lastFourDigits: row.last_four_digits || undefined,
    color: row.color || undefined,
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mergeCardsInCache(items: Card[], scope: string) {
  const byId = new Map(getScopedCards(scope).map((card) => [card.id, card]));
  items.forEach((item) => byId.set(item.id, item));
  cardsCacheByScope.set(scope, [...byId.values()]);
}

export function getCardsSnapshot(includeArchived = true): Card[] {
  const scope = getScopeKey(getActiveUserId());
  const scoped = getScopedCards(scope);
  return includeArchived ? [...scoped] : scoped.filter((card) => !card.isArchived);
}

export function findCardById(id?: string): Card | undefined {
  if (!id) return undefined;
  const scope = getScopeKey(getActiveUserId());
  return getScopedCards(scope).find((card) => card.id === id);
}

export function useCards(includeArchived = false) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...QUERY_KEY, user?.id, { includeArchived }],
    enabled: !!user?.id,
    queryFn: async () => {
      const scope = getScopeKey(user?.id);
      let query = supabase.from('cards').select('*').order('created_at', { ascending: false });
      if (!includeArchived) {
        query = query.eq('is_archived', false);
      }

      const { data, error } = await query;
      if (error) throw error;

      const mapped = (data || []).map(mapCardRow);
      mergeCardsInCache(mapped, scope);
      return mapped;
    },
    staleTime: 30_000,
  });
}

export function useArchivedCards() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...QUERY_KEY, user?.id, 'archived'],
    enabled: !!user?.id,
    queryFn: async () => {
      const scope = getScopeKey(user?.id);
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('is_archived', true)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      const mapped = (data || []).map(mapCardRow);
      mergeCardsInCache(mapped, scope);
      return mapped;
    },
    staleTime: 30_000,
  });
}

export function useCard(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...QUERY_KEY, user?.id, id],
    enabled: !!user?.id && !!id,
    queryFn: async () => {
      const scope = getScopeKey(user?.id);
      const { data, error } = await supabase.from('cards').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const mapped = mapCardRow(data);
      mergeCardsInCache([mapped], scope);
      return mapped;
    },
    staleTime: 30_000,
  });
}

export function useCreateCard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateCardPayload): Promise<Card> => {
      if (!user?.id) throw new Error('Usuario nao autenticado.');

      const payload: Tables<'cards'>['Insert'] = {
        user_id: user.id,
        account_id: data.accountId || null,
        name: data.name,
        type: data.type,
        credit_limit: Number(data.limit),
        current_spend: 0,
        closing_day: Number(data.closingDay),
        due_day: Number(data.dueDay),
        brand: data.brand || null,
        last_four_digits: data.lastFourDigits || null,
        color: data.color || null,
        is_archived: false,
      };

      const { data: inserted, error } = await supabase.from('cards').insert(payload).select('*').single();
      if (error) throw error;

      const mapped = mapCardRow(inserted);
      mergeCardsInCache([mapped], getScopeKey(user.id));
      return mapped;
    },
    onSuccess: (newCard) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({
        title: 'Cartao criado!',
        description: `${newCard.name} foi adicionado com sucesso.`,
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao criar cartao',
        description: 'Nao foi possivel criar o cartao. Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateCard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCardPayload }): Promise<Card> => {
      const payload: Tables<'cards'>['Update'] = {
        name: data.name,
        credit_limit: data.limit !== undefined ? Number(data.limit) : undefined,
        closing_day: data.closingDay !== undefined ? Number(data.closingDay) : undefined,
        due_day: data.dueDay !== undefined ? Number(data.dueDay) : undefined,
        account_id: data.accountId !== undefined ? data.accountId || null : undefined,
        color: data.color ?? null,
      };

      const { data: updated, error } = await supabase.from('cards').update(payload).eq('id', id).select('*').single();
      if (error) throw error;

      const mapped = mapCardRow(updated);
      mergeCardsInCache([mapped], getScopeKey(user?.id));
      return mapped;
    },
    onSuccess: (updatedCard) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({
        title: 'Cartao atualizado!',
        description: `${updatedCard.name} foi atualizado.`,
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao atualizar cartao',
        description: 'Nao foi possivel atualizar o cartao. Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteCard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('cards').update({ is_archived: true }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast({
        title: 'Cartao arquivado',
        description: 'O cartao foi arquivado para preservar o historico financeiro.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao excluir cartao',
        description: 'Nao foi possivel excluir o cartao. Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}

export function useArchiveCard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string): Promise<Card> => {
      const { data, error } = await supabase
        .from('cards')
        .update({ is_archived: true })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      const mapped = mapCardRow(data);
      mergeCardsInCache([mapped], getScopeKey(user?.id));
      return mapped;
    },
    onSuccess: (archivedCard) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({
        title: 'Cartao arquivado',
        description: `${archivedCard.name} foi arquivado com sucesso.`,
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao arquivar cartao',
        description: 'Nao foi possivel arquivar o cartao. Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}

export function useUnarchiveCard() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string): Promise<Card> => {
      const { data, error } = await supabase
        .from('cards')
        .update({ is_archived: false })
        .eq('id', id)
        .select('*')
        .single();

      if (error) throw error;
      const mapped = mapCardRow(data);
      mergeCardsInCache([mapped], getScopeKey(user?.id));
      return mapped;
    },
    onSuccess: (unarchivedCard) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast({
        title: 'Cartao restaurado',
        description: `${unarchivedCard.name} foi restaurado com sucesso.`,
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao restaurar cartao',
        description: 'Nao foi possivel restaurar o cartao. Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}

export function calculateAvailableLimit(card: Card): number {
  const spent = card.currentSpend || 0;
  return card.limit - spent;
}

export function calculateTotalAvailableLimit(cards: Card[]): number {
  return cards.reduce((total, card) => total + (card.availableLimit ?? calculateAvailableLimit(card)), 0);
}

export function getLimitUsagePercentage(card: Card): number {
  const spent = card.currentSpend || 0;
  if (card.limit <= 0) return 0;
  return (spent / card.limit) * 100;
}

export function getCardLimitStatus(card: Card): 'safe' | 'warning' | 'danger' {
  const percentage = getLimitUsagePercentage(card);
  if (percentage >= 90) return 'danger';
  if (percentage >= 70) return 'warning';
  return 'safe';
}

export const CARD_BRANDS = ['Visa', 'Mastercard', 'American Express', 'Elo', 'Hipercard', 'Diners Club'];

export const CARD_COLORS = [
  '#820AD1',
  '#FF7A00',
  '#005CA9',
  '#22C55E',
  '#EF4444',
  '#F59E0B',
  '#10B981',
  '#3B82F6',
  '#8B5CF6',
  '#EC4899',
  '#1A1A1A',
  '#FFD700',
  '#C0C0C0',
];
