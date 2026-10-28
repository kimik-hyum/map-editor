import type { Session } from "@supabase/supabase-js";

export const BROWSER_SESSION_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

// JWT의 iat/exp는 자동 갱신마다 바뀝니다. OAuth 인증 시각을 기준으로 삼아
// 같은 브라우저 세션의 7일 기한이 갱신이나 다른 기기의 로그인으로 늘어나지 않게 합니다.
// 이 값은 브라우저의 재로그인 정책용이며 서버의 JWT 검증을 대신하지 않습니다.
export function getBrowserSessionExpiresAt(session: Session): number {
  try {
    const payload = session.access_token.split(".")[1];
    const claims: unknown = JSON.parse(
      atob(payload.replace(/-/g, "+").replace(/_/g, "/")),
    );
    if (
      claims &&
      typeof claims === "object" &&
      "amr" in claims &&
      Array.isArray(claims.amr)
    ) {
      const timestamps = claims.amr.flatMap((entry: unknown) => {
        if (
          entry &&
          typeof entry === "object" &&
          "method" in entry &&
          entry.method === "oauth" &&
          "timestamp" in entry &&
          typeof entry.timestamp === "number" &&
          Number.isFinite(entry.timestamp) &&
          entry.timestamp > 0
        ) {
          return [entry.timestamp * 1000];
        }
        return [];
      });
      if (timestamps.length) {
        return Math.min(...timestamps) + BROWSER_SESSION_LIFETIME_MS;
      }
    }
  } catch {
    // 이전 저장 세션에 인증 이력이 없으면 Supabase의 로그인 시각을 사용합니다.
  }

  const signedInAt = Date.parse(session.user.last_sign_in_at ?? "");
  // 기준 시각을 알 수 없는 기존 세션에 새 7일을 부여하지 않고 재로그인합니다.
  return Number.isFinite(signedInAt) && signedInAt > 0
    ? signedInAt + BROWSER_SESSION_LIFETIME_MS
    : 0;
}

export function isBrowserSessionExpired(session: Session, now = Date.now()): boolean {
  return now >= getBrowserSessionExpiresAt(session);
}
