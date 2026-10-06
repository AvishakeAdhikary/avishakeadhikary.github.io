import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/** Unit tests: pure logic, content integrity and the ML code. Browser behaviour lives in tests/e2e (Playwright). */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/unit/**/*.test.ts"],
    environment: "node",
    testTimeout: 60_000,
    restoreMocks: true,
  },
});
