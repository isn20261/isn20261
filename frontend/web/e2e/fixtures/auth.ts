/**
 * Helper de login reutilizável para specs E2E.
 * IMPLEMENTAR na fase 9-10 do GSD.
 *
 * Usar com page.route() para interceptar a chamada de signIn
 * sem depender de Cognito real.
 */

// import type { Page } from "@playwright/test";
//
// export async function loginAs(page: Page, email: string): Promise<void> {
//   await page.route("**/cognito*", (route) =>
//     route.fulfill({
//       status: 200,
//       body: JSON.stringify({ AccessToken: "fake", IdToken: "fake", ExpiresIn: 3600 }),
//     })
//   );
//   await page.goto("/login");
//   await page.getByLabel(/e-mail/i).fill(email);
//   await page.getByLabel(/senha/i).fill("Senha@1234");
//   await page.getByRole("button", { name: /entrar/i }).click();
//   await page.waitForURL("/");
// }

export {};
