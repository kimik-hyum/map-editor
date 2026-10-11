import { afterEach, describe, expect, it, vi } from "vitest";
import { onRequest } from "../../../../functions/api/[boundary]";
import { regionEndpoint } from "./regionEndpoint";

const secret = `test-gateway-${"x".repeat(32)}`;
const origin = "https://maps-editor.pages.dev";
function context(
  country: string | null | undefined = "KR",
  overrides: RequestInit = {},
) {
  const request = new Request(`${origin}/api/regions`, {
    method: "POST",
    headers: {
      Origin: origin,
      Authorization: "Bearer user-session",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ operation: "kinds", country: "KR" }),
    ...overrides,
  });
  Object.defineProperty(request, "cf", { value: { country } });
  return {
    request,
    env: { REGION_GATEWAY_SECRET: secret },
    params: { boundary: "regions" },
  };
}
afterEach(() => vi.unstubAllGlobals());

describe("Cloudflare 경계 국가 제한", () => {
  it.each(["US", "JP", "XX", "T1", null, ""])(
    "국가 %s 요청은 원본 조회 전에 거부한다",
    async (country) => {
      const fetcher = vi.fn();
      vi.stubGlobal("fetch", fetcher);
      const response = await onRequest(context(country));
      expect(response.status).toBe(403);
      expect(await response.json()).toMatchObject({ code: "REGION_COUNTRY_BLOCKED" });
      expect(fetcher).not.toHaveBeenCalled();
      expect(response.headers.get("cache-control")).toBe("private, no-store");
    },
  );
  it("cf가 없거나 국가 헤더를 위조해도 허용하지 않는다", async () => {
    const c = context("US");
    c.request.headers.set("CF-IPCountry", "KR");
    c.request.headers.set("X-Region-Country", "KR");
    c.request.headers.set("X-Region-Gateway", secret);
    expect((await onRequest(c)).status).toBe(403);
    const missing = new Request(c.request);
    expect((await onRequest({ ...c, request: missing })).status).toBe(403);
  });
  it.each(["regions", "region-search"])(
    "국내 %s 요청에만 서버 검증 정보를 붙이며 쿠키/위조 헤더를 전달하지 않는다",
    async (boundary) => {
      const fetcher = vi.fn().mockResolvedValue(
        new Response('{"items":[]}', {
          headers: {
            "X-Request-Id": "trace-id",
            "X-Region-Gateway": secret,
            "Set-Cookie": "private",
          },
        }),
      );
      vi.stubGlobal("fetch", fetcher);
      const c = context();
      c.params.boundary = boundary;
      c.request.headers.set("Cookie", "private-cookie");
      c.request.headers.set("X-Region-Gateway", "forged");
      c.request.headers.set("X-Region-Country", "US");
      c.request.headers.set("x-region", "us-east-1");
      const response = await onRequest(c);
      expect(response.status).toBe(200);
      const [url, init] = fetcher.mock.calls[0];
      expect(url).toBe(
        `https://wmfidaawutwavlwvqauh.supabase.co/functions/v1/${boundary}`,
      );
      expect(init.headers).toMatchObject({
        "X-Region-Gateway": secret,
        "X-Region-Country": "KR",
        "x-region": "ap-northeast-2",
        Authorization: "Bearer user-session",
      });
      expect(init.headers.Cookie).toBeUndefined();
      expect(JSON.parse(new TextDecoder().decode(init.body))).toEqual({
        operation: "kinds",
        country: "KR",
      });
      expect(response.headers.get("x-region-gateway")).toBeNull();
      expect(response.headers.get("set-cookie")).toBeNull();
      expect(response.headers.get("x-request-id")).toBe("trace-id");
    },
  );
  it("설정 누락, 임의 경로/Origin, 큰 본문은 전달하지 않는다", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const c = context();
    expect((await onRequest({ ...c, env: {} })).status).toBe(503);
    expect((await onRequest({ ...c, params: { boundary: "auth" } })).status).toBe(404);
    const wrongOrigin = context();
    wrongOrigin.request.headers.set("Origin", "https://untrusted.example");
    expect((await onRequest(wrongOrigin)).status).toBe(403);
    expect((await onRequest(context("KR", { body: "x".repeat(4097) }))).status).toBe(
      413,
    );
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("국내 OPTIONS만 허용하고 원본 실패를 일반 오류로 응답한다", async () => {
    expect(
      (await onRequest(context("KR", { method: "OPTIONS", body: null }))).status,
    ).toBe(204);
    expect(
      (await onRequest(context("US", { method: "OPTIONS", body: null }))).status,
    ).toBe(403);
    const fetcher = vi.fn().mockRejectedValue(new Error("private upstream error"));
    vi.stubGlobal("fetch", fetcher);
    const response = await onRequest(context());
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("private");
  });
  it("원본 리다이렉트를 따라가거나 브라우저에 우회 주소를 전달하지 않는다", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 307,
        headers: { Location: "https://other.example" },
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    const response = await onRequest(context());
    expect(fetcher.mock.calls[0][1].redirect).toBe("manual");
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(502);
    expect(response.headers.get("location")).toBeNull();
  });
  it("상용 프로젝트는 게이트웨이로, 자체 설치 서버는 기존 주소로 연결한다", () => {
    expect(regionEndpoint("https://wmfidaawutwavlwvqauh.supabase.co/")).toBe(
      `${origin}/api/regions`,
    );
    expect(regionEndpoint("https://custom.example/")).toBe(
      "https://custom.example/functions/v1/regions",
    );
  });
});
