import path from "node:path";
import { defineConfig } from "vitest/config";

const appWebSrcPath = path.resolve(__dirname, "../../ExameDesenvolvedorDeTestes/web/src");
const localNodeModules = path.resolve(__dirname, "node_modules");

export default defineConfig({
  resolve: {
    alias: {
      "@": appWebSrcPath,
      zod: path.resolve(localNodeModules, "zod"),
      axios: path.resolve(localNodeModules, "axios"),
      "@tanstack/react-query": path.resolve(localNodeModules, "@tanstack/react-query"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["unit/**/*.spec.ts", "unit/**/*.spec.tsx"],
    setupFiles: ["./unit/setup.ts"],
    clearMocks: true,
    mockReset: true,
    restoreMocks: true,
  },
});
