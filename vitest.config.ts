import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    // Mirror the @/* alias from tsconfig.json so imports work in tests.
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
