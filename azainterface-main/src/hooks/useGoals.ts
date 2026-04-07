import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GoalStatus } from '@/types/entities';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import type { Enums, Tables } from '@/integrations/supabase/types';
import { getActiveUserId, getScopeKey } from '@/lib/sessionScope';

const QUERY_KEY = ['goals'];

type GoalMovementType = 'APORTE' | 'RETIRADA';

export interface GoalMovement {
  id: string;
  type: GoalMovementType;
  amount: number;
  date: string;
}

export interface Goal {
  id: string;
  name: string;
  icon: string;
  color: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  status: GoalStatus;
  streak: number;
}

const goalsCacheByScope = new Map<string, Goal[]>();

function getScopedGoals(scope: string): Goal[] {
  return goalsCacheByScope.get(scope) ?? [];
}

type GoalInput = {
  name: string;
  targetAmount: number;
  currentAmount?: number;
  deadline?: string | null;
  icon?: string;
  color?: string;
};

function toYmd(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calculateProgress(currentAmount: number, targetAmount: number): number {
  if (targetAmount <= 0) return 0;
  return Number(Math.min(100, (currentAmount / targetAmount) * 100).toFixed(2));
}

function resolveGoalStatus(goal: { currentAmount: number; targetAmount: number; status?: GoalStatus }): GoalStatus {
  if (goal.status === 'CANCELADA' || goal.status === 'PAUSADA') return goal.status;
  if (goal.currentAmount >= goal.targetAmount) return 'CONCLUIDA';
  return 'ANDAMENTO';
}

function mapGoalRow(row: Tables<'goals'>): Goal {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon || 'target',
    color: row.color || '#F5A623',
    targetAmount: Number(row.target_amount || 0),
    currentAmount: Number(row.current_amount || 0),
    deadline: row.deadline,
    status: row.status as GoalStatus,
    streak: 0,
  };
}

function mapMovementRow(row: Tables<'goal_movements'>): GoalMovement {
  return {
    id: row.id,
    type: row.type as GoalMovementType,
    amount: Number(row.amount || 0),
    date: row.created_at,
  };
}

export function getGoalsSnapshot(): Goal[] {
  const scope = getScopeKey(getActiveUserId());
  return [...getScopedGoals(scope)];
}

export function useGoals() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...QUERY_KEY, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const scope = getScopeKey(user?.id);
      const { data, error } = await supabase.from('goals').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      const mapped = (data || []).map(mapGoalRow);
      goalsCacheByScope.set(scope, mapped);
      return mapped;
    },
    staleTime: 20_000,
  });
}

export function useGoal(id: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...QUERY_KEY, user?.id, id],
    enabled: !!user?.id && !!id,
    queryFn: async () => {
      const scope = getScopeKey(user?.id);
      const { data, error } = await supabase.from('goals').select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const mapped = mapGoalRow(data);
      goalsCacheByScope.set(
        scope,
        getScopedGoals(scope).map((item) => (item.id === mapped.id ? mapped : item)),
      );
      return mapped;
    },
    staleTime: 20_000,
  });
}

export function useGoalMovements(goalId: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...QUERY_KEY, user?.id, goalId, 'movements'],
    enabled: !!user?.id && !!goalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goal_movements')
        .select('*')
        .eq('goal_id', goalId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(mapMovementRow);
    },
    staleTime: 20_000,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: GoalInput) => {
      if (!user?.id) throw new Error('Usuario nao autenticado.');

      const currentAmount = Number(data.currentAmount || 0);
      const targetAmount = Number(data.targetAmount);
      const status = resolveGoalStatus({ currentAmount, targetAmount });

      const payload: Tables<'goals'>['Insert'] = {
        user_id: user.id,
        name: data.name,
        target_amount: targetAmount,
        current_amount: currentAmount,
        progress: calculateProgress(currentAmount, targetAmount),
        deadline: data.deadline || null,
        status,
        icon: data.icon || 'target',
        color: data.color || '#F5A623',
      };

      const { data: inserted, error } = await supabase.from('goals').insert(payload).select('*').single();
      if (error) throw error;

      const mapped = mapGoalRow(inserted);
      const scope = getScopeKey(user.id);
      goalsCacheByScope.set(scope, [mapped, ...getScopedGoals(scope)]);
      return mapped;
    },
    onSuccess: (newGoal) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({
        title: 'Meta criada!',
        description: `${newGoal.name} foi adicionada com sucesso.`,
      });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<GoalInput> & { status?: GoalStatus } }) => {
      const { data: currentGoal, error: findError } = await supabase.from('goals').select('*').eq('id', id).single();
      if (findError) throw findError;

      const nextTargetAmount = data.targetAmount !== undefined ? Number(data.targetAmount) : Number(currentGoal.target_amount || 0);
      const nextCurrentAmount = data.currentAmount !== undefined ? Number(data.currentAmount) : Number(currentGoal.current_amount || 0);
      const nextStatus = resolveGoalStatus({
        currentAmount: nextCurrentAmount,
        targetAmount: nextTargetAmount,
        status: data.status,
      });

      const payload: Tables<'goals'>['Update'] = {
        name: data.name,
        target_amount: data.targetAmount !== undefined ? Number(data.targetAmount) : undefined,
        current_amount: data.currentAmount !== undefined ? Number(data.currentAmount) : undefined,
        deadline: data.deadline !== undefined ? data.deadline : undefined,
        icon: data.icon,
        color: data.color,
        status: nextStatus as Enums<'goal_status'>,
        progress: calculateProgress(nextCurrentAmount, nextTargetAmount),
      };

      const { data: updated, error } = await supabase.from('goals').update(payload).eq('id', id).select('*').single();
      if (error) throw error;
      const mapped = mapGoalRow(updated);
      const scope = getScopeKey(user?.id);
      goalsCacheByScope.set(
        scope,
        getScopedGoals(scope).map((item) => (item.id === mapped.id ? mapped : item)),
      );
      return mapped;
    },
    onSuccess: (updatedGoal) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({
        title: 'Meta atualizada!',
        description: `${updatedGoal.name} foi atualizada.`,
      });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('goals').delete().eq('id', id);
      if (error) throw error;
      const scope = getScopeKey(user?.id);
      goalsCacheByScope.set(
        scope,
        getScopedGoals(scope).filter((item) => item.id !== id),
      );
      return { id };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({
        title: 'Meta excluida',
        description: 'A meta foi removida com sucesso.',
      });
    },
  });
}

export function useAddGoalMovement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ goalId, data }: { goalId: string; data: { type: GoalMovementType; amount: number } }) => {
      const amount = Number(data.amount);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error('Invalid amount');

      const { data: response, error } = await supabase.rpc('add_goal_movement', {
        p_goal_id: goalId,
        p_type: data.type,
        p_amount: amount,
      });
      if (error) throw error;

      const row = Array.isArray(response) ? response[0] : response;
      if (!row) {
        throw new Error('No data returned by add_goal_movement');
      }

      const mappedGoal: Goal = {
        id: row.goal_id,
        name: row.goal_name,
        icon: row.goal_icon || 'target',
        color: row.goal_color || '#F5A623',
        targetAmount: Number(row.goal_target_amount || 0),
        currentAmount: Number(row.goal_current_amount || 0),
        deadline: row.goal_deadline,
        status: row.goal_status as GoalStatus,
        streak: 0,
      };

      const movement: GoalMovement = {
        id: row.movement_id,
        type: row.movement_type as GoalMovementType,
        amount: Number(row.movement_amount || 0),
        date: row.movement_created_at,
      };

      const scope = getScopeKey(getActiveUserId());
      goalsCacheByScope.set(
        scope,
        getScopedGoals(scope).map((item) => (item.id === mappedGoal.id ? mappedGoal : item)),
      );

      return {
        goal: mappedGoal,
        movement,
      };
    },
    onSuccess: (response, { data }) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({
        title: data.type === 'APORTE' ? 'Aporte registrado!' : 'Retirada registrada',
        description: `${getGoalProgress(response.goal).toFixed(0)}% concluido`,
      });
    },
  });
}

export function getGoalStatus(goal: Goal): {
  status: string;
  color: string;
  icon: string;
} {
  if (goal.status === 'CONCLUIDA') {
    return { status: 'Concluida', color: 'green', icon: 'check-circle' };
  }
  if (goal.status === 'CANCELADA') {
    return { status: 'Cancelada', color: 'gray', icon: 'x-circle' };
  }
  if (goal.status === 'PAUSADA') {
    return { status: 'Pausada', color: 'orange', icon: 'pause-circle' };
  }

  const daysToDeadline = goal.deadline
    ? Math.ceil((new Date(goal.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  if (daysToDeadline !== null && daysToDeadline < 0) {
    return { status: 'Vencida', color: 'red', icon: 'alert-circle' };
  }

  return { status: 'Em andamento', color: 'blue', icon: 'target' };
}

export function getGoalProgress(goal: Goal): number {
  if (goal.targetAmount === 0) return 0;
  return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
}

export function getDaysToDeadline(goal: Goal): number | null {
  if (!goal.deadline) return null;
  const diffTime = new Date(goal.deadline).getTime() - Date.now();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function normalizeGoalMovementDate(value?: string): string {
  if (!value) return toYmd(new Date());
  return value;
}
