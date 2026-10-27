import { describe, expect, it, vi } from "vitest";
import { onRequest } from "../../../functions/_middleware";
import routes from "../../../public/_routes.json";

const context = (
  country?: string | null,
  path = "/ko/editor/",
  init?: RequestInit,
) => ({
  request: Object.assign(new Request(`https://preview.example${path}`, init), {
    cf: { country },
  }),
  next: vi.fn(async () => new Response("unchanged HTML")),
});

describe("언어 경로와 경계 기본값", () => {
  it("기존 주소는 쿼리와 해시를 유지해 한국어 경로로 영구 이동한다", async () => {
    const response = await onRequest(context("US", "/editor?country=KR#map"));
    expect(response.status).toBe(308);
    expect(response.headers.get("Location")).toBe(
      "https://preview.example/ko/editor?country=KR#map",
    );
  });

  it.each(["KR", "US", "JP", null, undefined])(
    "%s 접속에서도 언어 전환을 방해하는 자동 국가 쿼리를 붙이지 않는다",
    async (country) => {
      for (const locale of ["ko", "en"]) {
        for (const search of [
          "",
          "?country=",
          "?country=JP",
          "?country=KR",
          "?country=us",
        ]) {
          const c = context(country, `/${locale}/demo${search}`);
          const response = await onRequest(c);
          expect(await response.text()).toBe("unchanged HTML");
          expect(response.headers.get("Location")).toBeNull();
          expect(c.next).toHaveBeenCalledOnce();
        }
      }
    },
  );

  it.each([
    "/en/demo",
    "/en/editor",
    "/en/editor/",
    "/en/editor/index.html",
    "/ko/demo",
    "/ko/demo/",
    "/ko/demo/index.html",
    "/ko/editor/",
  ])("HEAD 진입 %s에도 접속 국가를 주입하지 않는다", async (path) => {
    const c = context("KR", path, { method: "HEAD" });
    expect((await onRequest(c)).status).toBe(200);
    expect(c.next).toHaveBeenCalledOnce();
  });

  it.each([
    "/ko/",
    "/en/authentication",
    "/auth/callback",
    "/api/regions",
    "/api/us-boundaries",
    "/ko/editor/other",
    "/assets/app.js",
  ])("다른 경로 %s는 그대로 전달한다", async (path) => {
    expect(await (await onRequest(context("US", path))).text()).toBe("unchanged HTML");
  });

  it("POST는 리디렉션하지 않고 Pages 라우팅은 HTML 진입점과 API로 한정한다", async () => {
    const c = context("KR", "/editor", { method: "POST" });
    expect((await onRequest(c)).status).toBe(200);
    expect(routes.include).toEqual(
      expect.arrayContaining(["/api/*", "/ko/*", "/en/*"]),
    );
    expect(routes.include).not.toContain("/assets/*");
  });
});
