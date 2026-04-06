import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";

const PROFILE_QUERY_KEY = ["profile"];

type ProfileRow = {
  id: string;
  name: string | null;
  avatar_url: string | null;
};

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...PROFILE_QUERY_KEY, user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<ProfileRow | null> => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    staleTime: 30_000,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (payload: { name?: string | null; avatar_url?: string | null }) => {
      if (!user?.id) throw new Error("Usuario nao autenticado.");

      const { data, error } = await supabase
        .from("profiles")
        .upsert(
          {
            id: user.id,
            name: payload.name,
            avatar_url: payload.avatar_url,
          },
          { onConflict: "id" },
        )
        .select("id, name, avatar_url")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });
}
