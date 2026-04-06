import { useCallback } from "react";
import type { AvatarConfig } from "@/types/avatar";
import { DEFAULT_AVATAR } from "@/types/avatar";
import {
  getDefaultUserPreferences,
  toAvatarPatch,
  useUpdateUserPreferences,
  useUserPreferences,
} from "@/hooks/useUserPreferences";

export function useAvatar() {
  const { data: preferences, isLoading } = useUserPreferences();
  const updatePreferences = useUpdateUserPreferences();

  const config = preferences?.avatar || getDefaultUserPreferences().avatar;

  const updateConfig = useCallback(
    (partial: Partial<AvatarConfig>) => {
      const patch = toAvatarPatch(partial);
      if (Object.keys(patch).length === 0) return;
      void updatePreferences.mutateAsync(patch);
    },
    [updatePreferences],
  );

  const resetConfig = useCallback(() => {
    void updatePreferences.mutateAsync(toAvatarPatch(DEFAULT_AVATAR));
  }, [updatePreferences]);

  return {
    config,
    updateConfig,
    resetConfig,
    isLoading,
    isSaving: updatePreferences.isPending,
  };
}
