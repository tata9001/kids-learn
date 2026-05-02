import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/kids-learn/",
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["@testing-library/jest-dom/vitest"],
    globals: true,
    passWithNoTests: true,
    exclude: ["**/node_modules/**", "**/dist/**", "**/e2e/**", "**/.worktrees/**"]
  }
});
