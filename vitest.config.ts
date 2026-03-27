import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    exclude: ["node_modules", "dist", "examples"],
    testTimeout: 30_000, // Integration tests may be slow
  },
});
