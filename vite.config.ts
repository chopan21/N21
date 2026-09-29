import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

const apiPort = process.env.PORT ?? "3001";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": `http://localhost:${apiPort}`,
    },
  },
  build: {
    outDir: "dist",
  },
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "src/**/*.test.{ts,tsx}"],
    setupFiles: ["./src/test-setup.ts"],
  },
});
