import { lazy, type ComponentType, type LazyExoticComponent } from "react";

const RETRY_PREFIX = "lazy-retry";
const CHUNK_LOAD_ERROR_RE =
  /ChunkLoadError|Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk/i;

function isChunkLoadError(error: unknown): boolean {
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  return CHUNK_LOAD_ERROR_RE.test(message);
}

export function lazyWithRetry<T extends ComponentType<unknown>>(
  importer: () => Promise<{ default: T }>,
  moduleId: string,
): LazyExoticComponent<T> {
  return lazy(async () => {
    try {
      const module = await importer();
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(`${RETRY_PREFIX}:${moduleId}`);
      }
      return module;
    } catch (error) {
      if (typeof window !== "undefined" && isChunkLoadError(error)) {
        const retryKey = `${RETRY_PREFIX}:${moduleId}`;
        const alreadyRetried = window.sessionStorage.getItem(retryKey) === "1";

        if (!alreadyRetried) {
          window.sessionStorage.setItem(retryKey, "1");
          window.location.reload();
          return new Promise<never>(() => {});
        }
      }

      throw error;
    }
  });
}

