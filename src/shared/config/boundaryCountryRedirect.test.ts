import { describe, expect, it, vi } from "vitest";
import { onRequest } from "../../../functions/_middleware";
import routes from "../../../public/_routes.json";

const context = (country?: string | null, path = "/editor/", init?: RequestInit) => ({
  request: Object.assign(new Request(`https://preview.example${path}`, init), {
    cf: { country },
  }),
  next: vi.fn(async () => new Response("unchanged HTML")),
});

describe("접속 국가별 경계 기본값", () => {
  it.each(["KR", "US", "JP", "DE", "T1", "XX", null, undefined])(
    "%s 접속은 한국만 KR, 그 외에는 US로 이동한다",
    async (country) => {
      const c = context(
        country,
        "/editor/?parentOrigin=https%3A%2F%2Fhost.example#map",
      );
      const response = await onRequest(c);
      const target = new URL(response.headers.get("Location") ?? "");
      expect(response.status).toBe(302);
      expect(target.origin).toBe("https://preview.example");
      expect(target.searchParams.get("country")).toBe(country === "KR" ? "KR" : "US");
      expect(target.searchParams.get("parentOrigin")).toBe("https://host.example");
      expect(target.hash).toBe("#map");
      expect(response.headers.get("Cache-Control")).toBe("private, no-store");
      expect(response.headers.get("Cloudflare-CDN-Cache-Control")).toBe("no-store");
      expect(c.next).not.toHaveBeenCalled();
    },
  );

  it.each(["KR", "US", "us", "%20KR%20"])(
    "명시한 %s와 메뉴 선택 URL은 접속 국가보다 우선한다",
    async (country) => {
      for (const viewer of ["KR", "US", undefined]) {
        const c = context(viewer, `/editor?country=${country}`);
        const response = await onRequest(c);
        expect(await response.text()).toBe("unchanged HTML");
        expect(c.next).toHaveBeenCalledOnce();
      }
    },
  );

  it.each(["", "?country=", "?country=JP", "?country=invalid"])(
    "유효한 국가가 없는 %s는 접속 국가를 사용한다",
    async (search) => {
      for (const country of ["KR", "DE"]) {
        const response = await onRequest(context(country, `/demo${search}`));
        expect(
          new URL(response.headers.get("Location") ?? "").searchParams.get("country"),
        ).toBe(country === "KR" ? "KR" : "US");
      }
    },
  );

  it.each([
    "/demo",
    "/demo/",
    "/demo/index.html",
    "/editor",
    "/editor/",
    "/editor/index.html",
  ])("정적 진입 경로 %s도 같은 정책을 적용한다", async (path) => {
    const response = await onRequest(context("KR", path, { method: "HEAD" }));
    expect(response.status).toBe(302);
    expect(await response.text()).toBe("");
    expect(new URL(response.headers.get("Location") ?? "").pathname).toBe(path);
  });

  it("임의의 국가 헤더나 언어로 기본값을 바꾸지 않는다", async () => {
    const response = await onRequest(
      context("JP", "/editor", {
        headers: {
          "CF-IPCountry": "KR",
          "X-Forwarded-For": "127.0.0.1",
          "Accept-Language": "ko-KR",
        },
      }),
    );
    expect(response.headers.get("Location")).toBe(
      "https://preview.example/editor?country=US",
    );
  });

  it.each([
    "/",
    "/authentication",
    "/api/regions",
    "/api/us-boundaries",
    "/editor/other",
    "/assets/app.js",
  ])("다른 경로 %s는 그대로 전달한다", async (path) => {
    const c = context("US", path);
    expect(await (await onRequest(c)).text()).toBe("unchanged HTML");
  });

  it("POST는 리디렉션하지 않고 Pages 라우팅은 HTML 진입점과 API로 한정한다", async () => {
    const c = context("KR", "/editor", { method: "POST" });
    expect((await onRequest(c)).status).toBe(200);
    expect(routes.include).toEqual([
      "/api/*",
      "/demo",
      "/demo/*",
      "/editor",
      "/editor/*",
    ]);
  });
});
