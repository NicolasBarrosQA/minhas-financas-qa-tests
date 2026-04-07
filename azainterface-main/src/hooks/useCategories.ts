import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Category, CategoryType, CreateCategoryPayload, UpdateCategoryPayload } from '@/types/entities';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';
import { getActiveUserId, getScopeKey } from '@/lib/sessionScope';

const QUERY_KEY = ['categories'];

const SYSTEM_CATEGORIES: Category[] = [
  { id: '00000000-0000-0000-0000-000000000101', userId: null, name: 'Salario', type: 'RECEITA', color: '#10B981', icon: 'trabalho', isSystem: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '00000000-0000-0000-0000-000000000102', userId: null, name: 'Freelance', type: 'RECEITA', color: '#06B6D4', icon: 'freelance', isSystem: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '00000000-0000-0000-0000-000000000103', userId: null, name: 'Investimentos', type: 'RECEITA', color: '#8B5CF6', icon: 'investimentos', isSystem: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '00000000-0000-0000-0000-000000000104', userId: null, name: 'Outros', type: 'RECEITA', color: '#6B7280', icon: 'dinheiro', isSystem: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '00000000-0000-0000-0000-000000000201', userId: null, name: 'Alimentacao', type: 'DESPESA', color: '#F59E0B', icon: 'alimentacao', isSystem: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '00000000-0000-0000-0000-000000000202', userId: null, name: 'Transporte', type: 'DESPESA', color: '#3B82F6', icon: 'transporte', isSystem: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '00000000-0000-0000-0000-000000000203', userId: null, name: 'Moradia', type: 'DESPESA', color: '#EC4899', icon: 'moradia', isSystem: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '00000000-0000-0000-0000-000000000204', userId: null, name: 'Saude', type: 'DESPESA', color: '#EF4444', icon: 'saude', isSystem: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '00000000-0000-0000-0000-000000000205', userId: null, name: 'Lazer', type: 'DESPESA', color: '#A855F7', icon: 'lazer', isSystem: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '00000000-0000-0000-0000-000000000206', userId: null, name: 'Educacao', type: 'DESPESA', color: '#14B8A6', icon: 'educacao', isSystem: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '00000000-0000-0000-0000-000000000207', userId: null, name: 'Pessoal', type: 'DESPESA', color: '#F97316', icon: 'pessoal', isSystem: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '00000000-0000-0000-0000-000000000208', userId: null, name: 'Outros', type: 'DESPESA', color: '#6B7280', icon: 'outros', isSystem: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
  { id: '00000000-0000-0000-0000-000000000301', userId: null, name: 'Transferencia', type: 'TRANSFERENCIA', color: '#6366F1', icon: 'transferencia', isSystem: true, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' },
];

const categoriesCacheByScope = new Map<string, Category[]>();

function getScopedCategories(scope: string): Category[] {
  return categoriesCacheByScope.get(scope) ?? [...SYSTEM_CATEGORIES];
}

function mapCategoryRow(row: Tables<'categories'>): Category {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    type: row.type,
    color: row.color || undefined,
    icon: row.icon || undefined,
    parentId: row.parent_id || undefined,
    isSystem: row.is_system,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function replaceCategoriesCache(items: Category[], scope: string) {
  categoriesCacheByScope.set(scope, [...items].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
}

export function getCategoriesSnapshot(): Category[] {
  const scope = getScopeKey(getActiveUserId());
  return [...getScopedCategories(scope)];
}

export function findCategoryById(id?: string): Category | undefined {
  if (!id) return undefined;
  const scope = getScopeKey(getActiveUserId());
  return getScopedCategories(scope).find((category) => category.id === id);
}

export function useCategories() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...QUERY_KEY, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const scope = getScopeKey(user?.id);
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('is_system', { ascending: false })
        .order('name', { ascending: true });

      if (error) throw error;

      const mapped = (data || []).map(mapCategoryRow);
      if (mapped.length > 0) {
        replaceCategoriesCache(mapped, scope);
      } else {
        categoriesCacheByScope.set(scope, [...SYSTEM_CATEGORIES]);
      }

      return [...getScopedCategories(scope)];
    },
    staleTime: 60_000,
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateCategoryPayload): Promise<Category> => {
      if (!user?.id) throw new Error('Usuario nao autenticado.');

      const payload: Tables<'categories'>['Insert'] = {
        user_id: user.id,
        name: data.name,
        type: data.type,
        color: data.color || null,
        icon: data.icon || null,
        parent_id: data.parentId || null,
        is_system: false,
      };

      const { data: inserted, error } = await supabase.from('categories').insert(payload).select('*').single();
      if (error) throw error;

      const mapped = mapCategoryRow(inserted);
      const scope = getScopeKey(user.id);
      categoriesCacheByScope.set(scope, [...getScopedCategories(scope), mapped]);
      return mapped;
    },
    onSuccess: (newCategory) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({
        title: 'Categoria criada!',
        description: `${newCategory.name} foi adicionada com sucesso.`,
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao criar categoria',
        description: 'Nao foi possivel criar a categoria. Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateCategoryPayload }): Promise<Category> => {
      const { data: existing, error: existingError } = await supabase
        .from('categories')
        .select('is_system')
        .eq('id', id)
        .single();
      if (existingError) throw existingError;
      if (existing?.is_system) {
        throw new Error('Categorias padrao nao podem ser editadas.');
      }

      const payload: Tables<'categories'>['Update'] = {
        name: data.name,
        color: data.color ?? null,
        icon: data.icon ?? null,
      };

      const { data: updated, error } = await supabase.from('categories').update(payload).eq('id', id).select('*').single();
      if (error) throw error;

      const mapped = mapCategoryRow(updated);
      const scope = getScopeKey(user?.id);
      categoriesCacheByScope.set(
        scope,
        getScopedCategories(scope).map((item) => (item.id === mapped.id ? mapped : item)),
      );
      return mapped;
    },
    onSuccess: (updatedCategory) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: 'Categoria atualizada!',
        description: `${updatedCategory.name} foi atualizada.`,
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao atualizar categoria',
        description: 'Nao foi possivel atualizar a categoria. Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, replacementCategoryId }: { id: string; replacementCategoryId?: string }): Promise<void> => {
      if (replacementCategoryId) {
        const { error: relinkError } = await supabase
          .from('transactions')
          .update({ category_id: replacementCategoryId })
          .eq('category_id', id);
        if (relinkError) throw relinkError;
      }

      const { error } = await supabase.from('categories').delete().eq('id', id).eq('is_system', false);
      if (error) throw error;

      const scope = getScopeKey(user?.id);
      categoriesCacheByScope.set(
        scope,
        getScopedCategories(scope).filter((item) => item.id !== id),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: 'Categoria excluida',
        description: 'A categoria foi removida com sucesso.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao excluir categoria',
        description: 'Nao foi possivel excluir a categoria. Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}

export function groupCategoriesByType(categories: Category[]): Record<CategoryType, Category[]> {
  const grouped: Record<CategoryType, Category[]> = {
    RECEITA: [],
    DESPESA: [],
    TRANSFERENCIA: [],
  };

  categories.forEach((category) => {
    if (!category.parentId) {
      grouped[category.type].push(category);
    }
  });

  return grouped;
}

export function getCategoryLabel(type: CategoryType): string {
  const labels: Record<CategoryType, string> = {
    RECEITA: 'Receitas',
    DESPESA: 'Despesas',
    TRANSFERENCIA: 'Transferencias',
  };
  return labels[type];
}

export function getSubcategories(categories: Category[], parentId: string): Category[] {
  return categories.filter((c) => c.parentId === parentId);
}

export const CATEGORY_COLORS = [
  '#EF4444', '#F97316', '#F59E0B', '#84CC16', '#22C55E',
  '#10B981', '#14B8A6', '#06B6D4', '#0EA5E9', '#3B82F6',
  '#6366F1', '#8B5CF6', '#A855F7', '#D946EF', '#EC4899',
];

export const CATEGORY_ICON_NAMES = [
  'trabalho', 'freelance', 'investimentos', 'dinheiro', 'alimentacao',
  'transporte', 'moradia', 'saude', 'lazer', 'educacao', 'pessoal',
  'compras', 'viagem', 'cinema', 'celular', 'roupa', 'presente',
  'energia', 'academia', 'pet', 'farmacia', 'livros', 'manutencao',
  'musica', 'cafe', 'outros',
];
