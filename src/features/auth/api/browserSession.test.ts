import type { Session, SupabaseClient } from "@supabase/supabase-js";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getBrowserSession } from "./browserSession";

const now = Date.parse("2026-10-28T00:00:00Z");

function fixture(signedInAt: string) {
  const session = {
    access_token: "legacy",
    user: { last_sign_in_at: signedInAt },
  } as Session;
  const auth = {
    getSession: vi.fn().mockResolvedValue({ data: { session }, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  };
  return { session, auth, client: { auth } as unknown as SupabaseClient };
}

afterEach(() => vi.useRealTimers());

describe("인증 요청 전 브라우저 세션 확인", () => {
  it("기한 내 세션을 그대로 사용한다", async () => {
    vi.useFakeTimers().setSystemTime(now);
    const { session, auth, client } = fixture("2026-10-27T00:00:00Z");
    expect(await getBrowserSession(client)).toBe(session);
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it("동시 요청도 만료된 세션을 반환하지 않고 현재 세션만 한 번 종료한다", async () => {
    vi.useFakeTimers().setSystemTime(now);
    const { auth, client } = fixture("2026-10-21T00:00:00Z");
    expect(
      await Promise.all([getBrowserSession(client), getBrowserSession(client)]),
    ).toEqual([null, null]);
    expect(auth.signOut).toHaveBeenCalledExactlyOnceWith({ scope: "local" });
  });

  it("로그아웃 요청이 실패해도 만료된 토큰을 API 호출에 넘기지 않는다", async () => {
    vi.useFakeTimers().setSystemTime(now);
    const { auth, client } = fixture("2026-10-20T00:00:00Z");
    auth.signOut.mockResolvedValueOnce({ error: new Error("offline") });
    await expect(getBrowserSession(client)).rejects.toThrow("offline");
    expect(await getBrowserSession(client)).toBe(null);
    expect(auth.signOut).toHaveBeenCalledTimes(2);
  });
});
