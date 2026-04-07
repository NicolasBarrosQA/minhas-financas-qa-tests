const ANON_SCOPE = "__anonymous__";

let activeUserId: string | null = null;

export function setActiveUserId(userId: string | null): void {
  activeUserId = userId;
}

export function getActiveUserId(): string | null {
  return activeUserId;
}

export function getScopeKey(userId?: string | null): string {
  return userId ?? ANON_SCOPE;
}

