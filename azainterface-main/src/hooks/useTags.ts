import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { CreateTagPayload, Tag } from '@/types/entities';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

const QUERY_KEY = ['tags'];

function mapTagRow(row: Tables<'tags'>, transactionCount = 0): Tag {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    color: row.color || undefined,
    transactionCount,
    createdAt: row.created_at,
  };
}

export function useTags() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...QUERY_KEY, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return [];

      const [tagsRes, usageRes] = await Promise.all([
        supabase.from('tags').select('*').order('created_at', { ascending: false }),
        supabase
          .from('transaction_tags')
          .select('tag_id')
          .order('created_at', { ascending: false }),
      ]);

      if (tagsRes.error) throw tagsRes.error;
      if (usageRes.error) throw usageRes.error;

      const countByTag = new Map<string, number>();
      (usageRes.data || []).forEach((row) => {
        countByTag.set(row.tag_id, (countByTag.get(row.tag_id) || 0) + 1);
      });

      return (tagsRes.data || []).map((row) => mapTagRow(row, countByTag.get(row.id) || 0));
    },
    staleTime: 30_000,
  });
}

export function useCreateTag() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateTagPayload): Promise<Tag> => {
      if (!user?.id) throw new Error('Usuario nao autenticado.');

      const payload: Tables<'tags'>['Insert'] = {
        user_id: user.id,
        name: data.name,
        color: data.color || getRandomTagColor(),
      };

      const { data: inserted, error } = await supabase.from('tags').insert(payload).select('*').single();
      if (error) throw error;

      return mapTagRow(inserted, 0);
    },
    onSuccess: (newTag) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({
        title: 'Tag criada!',
        description: `${newTag.name} foi adicionada.`,
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao criar tag',
        description: 'Nao foi possivel criar a tag. Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateTag() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<CreateTagPayload> }): Promise<Tag> => {
      const payload: Tables<'tags'>['Update'] = {
        name: data.name,
        color: data.color,
      };

      const { data: updated, error } = await supabase.from('tags').update(payload).eq('id', id).select('*').single();
      if (error) throw error;
      return mapTagRow(updated, 0);
    },
    onSuccess: (updatedTag) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      toast({
        title: 'Tag atualizada!',
        description: `${updatedTag.name} foi atualizada.`,
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao atualizar tag',
        description: 'Nao foi possivel atualizar a tag. Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('tags').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast({
        title: 'Tag excluida',
        description: 'A tag foi removida com sucesso.',
      });
    },
    onError: () => {
      toast({
        title: 'Erro ao excluir tag',
        description: 'Nao foi possivel excluir a tag. Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}

export const SUGGESTED_TAG_COLORS = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD',
  '#98D8C8',
  '#F7DC6F',
  '#BB8FCE',
  '#85C1E9',
  '#F8B500',
  '#00CED1',
  '#FF69B4',
  '#20B2AA',
  '#FFD700',
];

export function getRandomTagColor(): string {
  return SUGGESTED_TAG_COLORS[Math.floor(Math.random() * SUGGESTED_TAG_COLORS.length)];
}
