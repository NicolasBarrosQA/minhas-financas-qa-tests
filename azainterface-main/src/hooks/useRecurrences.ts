import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RecurrenceFrequency } from '@/types/entities';
import { useToast } from '@/hooks/use-toast';
import { findCategoryById } from '@/hooks/useCategories';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { getActiveUserId, getScopeKey } from '@/lib/sessionScope';

const QUERY_KEY = ['recurrences'];

const MONTH_BASED_FREQUENCIES: RecurrenceFrequency[] = [
  'MENSAL',
  'BIMESTRAL',
  'TRIMESTRAL',
  'SEMESTRAL',
  'ANUAL',
];

export interface Recurrence {
  id: string;
  name: string;
  amount: number;
  type: 'RECEITA' | 'DESPESA';
  frequency: RecurrenceFrequency;
  nextRun: string;
  isActive: boolean;
  categoryIcon: string;
  accountId?: string;
  categoryId?: string;
  dayOfMonth?: number;
  dayOfWeek?: number;
}

const recurrencesCacheByScope = new Map<string, Recurrence[]>();

function getScopedRecurrences(scope: string): Recurrence[] {
  return recurrencesCacheByScope.get(scope) ?? [];
}

type RecurrenceInput = {
  name: string;
  amount: number;
  type: 'RECEITA' | 'DESPESA';
  frequency: RecurrenceFrequency;
  accountId: string;
  categoryId?: string;
  dayOfMonth?: number;
  dayOfWeek?: number;
  startDate?: string;
  isActive?: boolean;
};

function toYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseInputDate(value?: string): Date {
  return value ? new Date(`${value}T12:00:00`) : new Date();
}

function normalizeDayOfMonth(value?: number): number | null {
  if (!value || !Number.isFinite(value)) return null;
  return Math.max(1, Math.min(31, Math.trunc(value)));
}

function normalizeDayOfWeek(value?: number): number | null {
  if (value === undefined || value === null || !Number.isFinite(value)) return null;
  const normalized = Math.trunc(value);
  return Math.max(0, Math.min(6, normalized));
}

function resolveScheduleFields(
  frequency: RecurrenceFrequency,
  baseDate: Date,
  dayOfMonth?: number,
  dayOfWeek?: number,
): { dayOfMonth: number | null; dayOfWeek: number | null } {
  if (frequency === 'SEMANAL') {
    return {
      dayOfMonth: null,
      dayOfWeek: normalizeDayOfWeek(dayOfWeek) ?? baseDate.getDay(),
    };
  }

  if (MONTH_BASED_FREQUENCIES.includes(frequency)) {
    return {
      dayOfMonth: normalizeDayOfMonth(dayOfMonth) ?? baseDate.getDate(),
      dayOfWeek: null,
    };
  }

  return {
    dayOfMonth: null,
    dayOfWeek: null,
  };
}

function mapRecurrenceRow(row: Tables<'recurrences'>): Recurrence {
  const category = findCategoryById(row.category_id || undefined);
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount || 0),
    type: row.type,
    frequency: row.frequency,
    nextRun: row.next_run,
    isActive: row.is_active,
    accountId: row.account_id || undefined,
    categoryId: row.category_id || undefined,
    dayOfMonth: row.day_of_month || undefined,
    dayOfWeek: row.day_of_week || undefined,
    categoryIcon: category?.icon || 'outros',
  };
}

export function getRecurrencesSnapshot(): Recurrence[] {
  const scope = getScopeKey(getActiveUserId());
  return [...getScopedRecurrences(scope)];
}

export function useRecurrences() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...QUERY_KEY, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const scope = getScopeKey(user?.id);
      const { data, error } = await supabase.from('recurrences').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const mapped = (data || []).map(mapRecurrenceRow);
      recurrencesCacheByScope.set(scope, mapped);
      return mapped;
    },
    staleTime: 20_000,
  });
}

export function useRecurrence(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...QUERY_KEY, user?.id, id],
    enabled: !!user?.id && !!id,
    queryFn: async () => {
      const scope = getScopeKey(user?.id);
      const { data, error } = await supabase.from('recurrences').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const mapped = mapRecurrenceRow(data);
      recurrencesCacheByScope.set(
        scope,
        getScopedRecurrences(scope).map((item) => (item.id === mapped.id ? mapped : item)),
      );
      return mapped;
    },
    staleTime: 20_000,
  });
}

export function useCreateRecurrence() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: RecurrenceInput) => {
      if (!user?.id) throw new Error('Usuario nao autenticado.');

      const startDate = parseInputDate(data.startDate);
      const schedule = resolveScheduleFields(data.frequency, startDate, data.dayOfMonth, data.dayOfWeek);

      const payload: Tables<'recurrences'>['Insert'] = {
        user_id: user.id,
        name: data.name,
        amount: Number(data.amount),
        type: data.type,
        frequency: data.frequency,
        account_id: data.accountId,
        category_id: data.categoryId || null,
        day_of_month: schedule.dayOfMonth,
        day_of_week: schedule.dayOfWeek,
        next_run: toYmd(startDate),
        is_active: data.isActive ?? true,
      };

      const { data: inserted, error } = await supabase.from('recurrences').insert(payload).select('*').single();
      if (error) throw error;
      const mapped = mapRecurrenceRow(inserted);
      const scope = getScopeKey(user.id);
      recurrencesCacheByScope.set(scope, [mapped, ...getScopedRecurrences(scope)]);
      return mapped;
    },
    onSuccess: (newRecurrence) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({
        title: 'Recorrencia criada!',
        description: `${newRecurrence.name} foi configurada com sucesso.`,
      });
    },
  });
}

export function useUpdateRecurrence() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RecurrenceInput> }) => {
      const { data: current, error: currentError } = await supabase.from('recurrences').select('*').eq('id', id).single();
      if (currentError) throw currentError;

      const nextFrequency = data.frequency || current.frequency;
      const baseDate = parseInputDate(data.startDate || current.next_run);
      const schedule = resolveScheduleFields(
        nextFrequency,
        baseDate,
        data.dayOfMonth ?? current.day_of_month ?? undefined,
        data.dayOfWeek ?? current.day_of_week ?? undefined,
      );

      const payload: Tables<'recurrences'>['Update'] = {
        name: data.name,
        amount: data.amount !== undefined ? Number(data.amount) : undefined,
        type: data.type,
        frequency: nextFrequency,
        account_id: data.accountId !== undefined ? data.accountId : undefined,
        category_id: data.categoryId !== undefined ? data.categoryId || null : undefined,
        day_of_month: schedule.dayOfMonth,
        day_of_week: schedule.dayOfWeek,
        is_active: data.isActive,
        next_run: data.startDate ? toYmd(baseDate) : current.next_run,
      };

      const { data: updated, error } = await supabase.from('recurrences').update(payload).eq('id', id).select('*').single();
      if (error) throw error;
      const mapped = mapRecurrenceRow(updated);
      const scope = getScopeKey(user?.id);
      recurrencesCacheByScope.set(
        scope,
        getScopedRecurrences(scope).map((item) => (item.id === mapped.id ? mapped : item)),
      );
      return mapped;
    },
    onSuccess: (updatedRecurrence) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({
        title: 'Recorrencia atualizada!',
        description: `${updatedRecurrence.name} foi atualizada.`,
      });
    },
  });
}

export function useDeleteRecurrence() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recurrences').delete().eq('id', id);
      if (error) throw error;
      const scope = getScopeKey(user?.id);
      recurrencesCacheByScope.set(
        scope,
        getScopedRecurrences(scope).filter((item) => item.id !== id),
      );
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({
        title: 'Recorrencia excluida',
        description: 'A recorrencia foi removida com sucesso.',
      });
    },
  });
}

export function useToggleRecurrence() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: current, error: currentError } = await supabase
        .from('recurrences')
        .select('id, is_active, name')
        .eq('id', id)
        .single();
      if (currentError) throw currentError;

      const { data: updated, error } = await supabase
        .from('recurrences')
        .update({ is_active: !current.is_active })
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;

      return mapRecurrenceRow(updated);
    },
    onSuccess: (updatedRecurrence) => {
      const scope = getScopeKey(user?.id);
      recurrencesCacheByScope.set(
        scope,
        getScopedRecurrences(scope).map((item) =>
          item.id === updatedRecurrence.id ? updatedRecurrence : item,
        ),
      );
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({
        title: updatedRecurrence.isActive ? 'Recorrencia ativada' : 'Recorrencia pausada',
        description: `${updatedRecurrence.name} foi ${updatedRecurrence.isActive ? 'ativada' : 'pausada'}.`,
      });
    },
  });
}

export const FREQUENCY_LABELS: Record<RecurrenceFrequency, string> = {
  DIARIA: 'Diaria',
  SEMANAL: 'Semanal',
  QUINZENAL: 'Quinzenal',
  MENSAL: 'Mensal',
  BIMESTRAL: 'Bimestral',
  TRIMESTRAL: 'Trimestral',
  SEMESTRAL: 'Semestral',
  ANUAL: 'Anual',
};

export function getFrequencyLabel(frequency: RecurrenceFrequency): string {
  return FREQUENCY_LABELS[frequency] || frequency;
}

export function getNextRunDate(recurrence: Recurrence): string {
  return new Date(recurrence.nextRun).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}
