import type { Session } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import {
  BROWSER_SESSION_LIFETIME_MS,
  getBrowserSessionExpiresAt,
  isBrowserSessionExpired,
} from "./browserSessionLifetime";

const signedInAt = Date.parse("2026-10-01T00:00:00Z");
const deadline = signedInAt + BROWSER_SESSION_LIFETIME_MS;

function session(claims: unknown, lastSignInAt?: string): Session {
  return {
    access_token: `header.${btoa(JSON.stringify(claims))}.signature`,
    user: { last_sign_in_at: lastSignInAt },
  } as Session;
}

describe("브라우저 로그인 7일 기한", () => {
  it("7일 직전까지 유지하고 정확히 7일이 되면 만료한다", () => {
    const value = session({ amr: [{ method: "oauth", timestamp: signedInAt / 1000 }] });
    expect(isBrowserSessionExpired(value, deadline - 1)).toBe(false);
    expect(isBrowserSessionExpired(value, deadline)).toBe(true);
  });

  it("토큰 갱신과 다른 기기의 최근 로그인으로 기존 OAuth 기한을 연장하지 않는다", () => {
    const value = session(
      {
        iat: deadline / 1000,
        exp: deadline / 1000 + 3600,
        amr: [
          { method: "oauth", timestamp: signedInAt / 1000 },
          { method: "token_refresh", timestamp: deadline / 1000 },
        ],
      },
      new Date(deadline).toISOString(),
    );
    expect(getBrowserSessionExpiresAt(value)).toBe(deadline);
    expect(isBrowserSessionExpired(value, deadline)).toBe(true);
  });

  it("다시 OAuth 로그인하면 새 인증 시각부터 7일을 계산한다", () => {
    const value = session({ amr: [{ method: "oauth", timestamp: deadline / 1000 }] });
    expect(getBrowserSessionExpiresAt(value)).toBe(
      deadline + BROWSER_SESSION_LIFETIME_MS,
    );
  });

  it("인증 이력이 없는 기존 세션도 last_sign_in_at으로 만료를 계산한다", () => {
    expect(
      getBrowserSessionExpiresAt(session({}, new Date(signedInAt).toISOString())),
    ).toBe(deadline);
  });

  it.each([
    {},
    null,
    { amr: null },
    { amr: [null, { method: "oauth", timestamp: "invalid" }] },
  ])("로그인 시각을 복구할 수 없으면 새 유예 기간을 주지 않는다: %j", (claims) =>
    expect(isBrowserSessionExpired(session(claims), deadline)).toBe(true),
  );

  it("손상된 토큰이나 로그인 날짜에도 예외 없이 재로그인을 요구한다", () => {
    const value = session({}, "invalid");
    value.access_token = "broken";
    expect(isBrowserSessionExpired(value, deadline)).toBe(true);
  });
});
