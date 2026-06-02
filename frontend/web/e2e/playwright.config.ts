/**
 * Playwright E2E config — DOCUMENTADO, não instalado.
 * Instalar quando o frontend estabilizar (fase 9-10 do GSD):
 *   pnpm add -D @playwright/test
 *   pnpm exec playwright install
 *
 * Decisões de design:
 * - page.route() para interceptar chamadas à API Gateway (sem depender de AWS real)
 * - fixtures/auth.ts centraliza helper de login reutilizável
 * - smoke.spec roda em CI a cada deploy; demais specs sob demanda
 */

// import { defineConfig, devices } from "@playwright/test";
//
// export default defineConfig({
//   testDir: "./",
//   fullyParallel: true,
//   retries: process.env.CI ? 2 : 0,
//   workers: process.env.CI ? 1 : undefined,
//   use: {
//     baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
//     trace: "on-first-retry",
//   },
//   projects: [
//     { name: "chromium", use: { ...devices["Desktop Chrome"] } },
//     { name: "mobile", use: { ...devices["Pixel 5"] } },
//   ],
// });

export {};
