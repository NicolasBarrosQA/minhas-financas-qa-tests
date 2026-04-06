import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { useAuth } from "@/providers/AuthProvider";
import type { AvatarAccessory, AvatarBaseColor, AvatarConfig } from "@/types/avatar";
import { DEFAULT_AVATAR } from "@/types/avatar";

const QUERY_KEY = ["user-preferences"];

const AVATAR_BASE_COLORS = ["pink", "gold", "blue", "lavender", "mint"] as const;
const AVATAR_ACCESSORIES = ["none", "crown", "aviator", "glasses", "partyhat", "flowers"] as const;

type AvatarBaseColorSet = (typeof AVATAR_BASE_COLORS)[number];
type AvatarAccessorySet = (typeof AVATAR_ACCESSORIES)[number];

const avatarBaseColorSet = new Set<string>(AVATAR_BASE_COLORS);
const avatarAccessorySet = new Set<string>(AVATAR_ACCESSORIES);

export type NotificationSettings = {
  dailyReminder: boolean;
  invoiceDue: boolean;
  budgetAlert: boolean;
  goalProgress: boolean;
  promotions: boolean;
};

export type SecuritySettings = {
  biometric: boolean;
  pinEnabled: boolean;
  twoFactorEnabled: boolean;
  recoveryKeyEnabled: boolean;
};

export interface UserPreferences {
  avatar: AvatarConfig;
  notifications: NotificationSettings;
  security: SecuritySettings;
}

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  dailyReminder: true,
  invoiceDue: true,
  budgetAlert: true,
  goalProgress: true,
  promotions: false,
};

const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  biometric: true,
  pinEnabled: false,
  twoFactorEnabled: false,
  recoveryKeyEnabled: false,
};

const DEFAULT_USER_PREFERENCES: UserPreferences = {
  avatar: DEFAULT_AVATAR,
  notifications: DEFAULT_NOTIFICATION_SETTINGS,
  security: DEFAULT_SECURITY_SETTINGS,
};

function normalizeAvatarBaseColor(value?: string | null): AvatarBaseColor {
  if (!value || !avatarBaseColorSet.has(value)) return DEFAULT_AVATAR.baseColor;
  return value as AvatarBaseColorSet;
}

function normalizeAvatarAccessory(value?: string | null): AvatarAccessory {
  if (!value || !avatarAccessorySet.has(value)) return DEFAULT_AVATAR.accessory;
  return value as AvatarAccessorySet;
}

function mapRowToPreferences(row: Tables<"user_preferences"> | null): UserPreferences {
  if (!row) return DEFAULT_USER_PREFERENCES;

  return {
    avatar: {
      baseColor: normalizeAvatarBaseColor(row.avatar_base_color),
      accessory: normalizeAvatarAccessory(row.avatar_accessory),
      background: row.avatar_background || DEFAULT_AVATAR.background,
    },
    notifications: {
      dailyReminder: row.notification_daily_reminder,
      invoiceDue: row.notification_invoice_due,
      budgetAlert: row.notification_budget_alert,
      goalProgress: row.notification_goal_progress,
      promotions: row.notification_promotions,
    },
    security: {
      biometric: row.security_biometric,
      pinEnabled: row.security_pin_enabled,
      twoFactorEnabled: row.security_two_factor_enabled,
      recoveryKeyEnabled: row.security_recovery_key_enabled,
    },
  };
}

async function ensurePreferencesRow(userId: string): Promise<Tables<"user_preferences">> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  if (data) return data;

  const { data: inserted, error: insertError } = await supabase
    .from("user_preferences")
    .insert({ user_id: userId })
    .select("*")
    .single();

  if (insertError) throw insertError;
  return inserted;
}

export function useUserPreferences() {
  const { user } = useAuth();

  return useQuery({
    queryKey: [...QUERY_KEY, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      if (!user?.id) return DEFAULT_USER_PREFERENCES;
      const row = await ensurePreferencesRow(user.id);
      return mapRowToPreferences(row);
    },
    staleTime: 30_000,
  });
}

export function useUpdateUserPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (patch: Tables<"user_preferences">["Update"]) => {
      if (!user?.id) throw new Error("Usuario nao autenticado.");

      const payload: Tables<"user_preferences">["Insert"] = {
        user_id: user.id,
        ...patch,
      };

      const { data, error } = await supabase
        .from("user_preferences")
        .upsert(payload, { onConflict: "user_id" })
        .select("*")
        .single();

      if (error) throw error;
      return mapRowToPreferences(data);
    },
    onSuccess: (preferences) => {
      queryClient.setQueryData([...QUERY_KEY, user?.id], preferences);
    },
  });
}

export function useNotificationSettings() {
  const { data, isLoading } = useUserPreferences();
  const updatePreferences = useUpdateUserPreferences();
  const settings = data?.notifications || DEFAULT_NOTIFICATION_SETTINGS;

  const setNotificationSetting = async (key: keyof NotificationSettings, value: boolean) => {
    const map: Record<keyof NotificationSettings, keyof Tables<"user_preferences">["Update"]> = {
      dailyReminder: "notification_daily_reminder",
      invoiceDue: "notification_invoice_due",
      budgetAlert: "notification_budget_alert",
      goalProgress: "notification_goal_progress",
      promotions: "notification_promotions",
    };

    await updatePreferences.mutateAsync({ [map[key]]: value });
  };

  return {
    settings,
    isLoading,
    isSaving: updatePreferences.isPending,
    setNotificationSetting,
  };
}

export function useSecuritySettings() {
  const { data, isLoading } = useUserPreferences();
  const updatePreferences = useUpdateUserPreferences();
  const settings = data?.security || DEFAULT_SECURITY_SETTINGS;

  const setSecuritySetting = async (key: keyof SecuritySettings, value: boolean) => {
    const map: Record<keyof SecuritySettings, keyof Tables<"user_preferences">["Update"]> = {
      biometric: "security_biometric",
      pinEnabled: "security_pin_enabled",
      twoFactorEnabled: "security_two_factor_enabled",
      recoveryKeyEnabled: "security_recovery_key_enabled",
    };

    await updatePreferences.mutateAsync({ [map[key]]: value });
  };

  return {
    settings,
    isLoading,
    isSaving: updatePreferences.isPending,
    setSecuritySetting,
  };
}

export function toAvatarPatch(config: Partial<AvatarConfig>): Tables<"user_preferences">["Update"] {
  const patch: Tables<"user_preferences">["Update"] = {};

  if (config.baseColor) {
    patch.avatar_base_color = avatarBaseColorSet.has(config.baseColor)
      ? config.baseColor
      : DEFAULT_AVATAR.baseColor;
  }

  if (config.accessory) {
    patch.avatar_accessory = avatarAccessorySet.has(config.accessory)
      ? config.accessory
      : DEFAULT_AVATAR.accessory;
  }

  if (config.background) {
    patch.avatar_background = config.background;
  }

  return patch;
}

export function getDefaultUserPreferences(): UserPreferences {
  return DEFAULT_USER_PREFERENCES;
}
