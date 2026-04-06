import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Json, Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/providers/AuthProvider";

const QUERY_KEY = ["support-tickets"];

export type SupportTicketChannel = "chat" | "email" | "form" | "delete_account";
export type SupportTicketStatus = "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED";

export interface CreateSupportTicketInput {
  channel: SupportTicketChannel;
  subject: string;
  message: string;
  metadata?: Json;
}

export function useSupportTickets() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...QUERY_KEY, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return (data || []) as Tables<"support_tickets">[];
    },
    staleTime: 30_000,
  });
}

export function useCreateSupportTicket() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSupportTicketInput) => {
      if (!user?.id) throw new Error("Usuario nao autenticado.");

      const payload: Tables<"support_tickets">["Insert"] = {
        user_id: user.id,
        channel: input.channel,
        subject: input.subject,
        message: input.message,
        metadata: input.metadata || {},
        status: "OPEN",
      };

      const { data, error } = await supabase.from("support_tickets").insert(payload).select("*").single();
      if (error) throw error;
      return data as Tables<"support_tickets">;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

export function isOpenSupportStatus(status: string): boolean {
  return status === "OPEN" || status === "IN_PROGRESS";
}

export function getSupportStatusLabel(status: string): string {
  if (status === "OPEN") return "Aberto";
  if (status === "IN_PROGRESS") return "Em andamento";
  if (status === "RESOLVED") return "Resolvido";
  if (status === "CLOSED") return "Fechado";
  return status;
}

export function getLatestDeleteAccountTicket(
  tickets: Tables<"support_tickets">[],
): Tables<"support_tickets"> | null {
  const sorted = [...tickets]
    .filter((ticket) => ticket.channel === "delete_account")
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  return sorted[0] || null;
}
