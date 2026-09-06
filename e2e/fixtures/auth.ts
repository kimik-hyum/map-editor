import type { BrowserContext } from "@playwright/test";

export function createGoogleSession() {
  const user = {
    id: "11111111-1111-4111-8111-111111111111",
    aud: "authenticated",
    role: "authenticated",
    email: "maps-test@example.invalid",
    app_metadata: { provider: "google", providers: ["google"] },
    user_metadata: {},
    created_at: "2026-09-06T00:00:00Z",
  };
  const expiresAt = Math.floor(Date.now() / 1000) + 3600;
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  return {
    access_token: `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: user.id, exp: expiresAt, aud: "authenticated" })}.test-signature`,
    refresh_token: "local-test-refresh-token",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: expiresAt,
    user,
  };
}

export async function seedGoogleSession(context: BrowserContext) {
  await context.addInitScript((session) => {
    window.localStorage.setItem("sb-127-auth-token", JSON.stringify(session));
  }, createGoogleSession());
}
