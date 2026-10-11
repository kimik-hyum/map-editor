import { afterEach, describe, expect, it, vi } from "vitest";
import {
  normalizeRegionSearch,
  regionSearchResponseSchema,
} from "../model/regionSearchModel";

const item = {
  id: "42",
  kind: "adminDong",
  name: "청운효자동",
  code: "1111051500",
  context: "서울특별시 종로구",
  center: [126.97, 37.58],
  bbox: [126.96, 37.57, 126.99, 37.6],
  minZoom: 12,
};
const response = { country: "KR", kind: "adminDong", items: [item], hasMore: false };
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});
async function api() {
  vi.stubEnv("VITE_SUPABASE_URL", "https://regions.test");
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-key");
  vi.stubEnv("VITE_E2E_AUTH_BYPASS", "true");
  return import("./regionsApi");
}
describe("경계 검색 계약", () => {
  it("한글 조합과 공백을 정규화한다", () => {
    expect(normalizeRegionSearch("  서울   종로 ")).toBe("서울 종로");
    expect(normalizeRegionSearch("청운".normalize("NFD"))).toBe("청운");
  });
  it("좌표 범위, bbox 방향, 결과 수를 검증한다", () => {
    expect(regionSearchResponseSchema.safeParse(response).success).toBe(true);
    for (const invalid of [
      { center: [999, 37] },
      { bbox: [128, 37, 126, 38] },
      { minZoom: 99 },
    ])
      expect(
        regionSearchResponseSchema.safeParse({
          ...response,
          items: [{ ...item, ...invalid }],
        }).success,
      ).toBe(false);
    expect(
      regionSearchResponseSchema.safeParse({ ...response, items: Array(21).fill(item) })
        .success,
    ).toBe(false);
  });
  it("검색 전용 인증 endpoint로 종류·검색어·취소 신호를 전달한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(response)));
    vi.stubGlobal("fetch", fetchMock);
    const { searchRegions } = await api();
    const controller = new AbortController();
    expect(await searchRegions("adminDong", " 청운 ", controller.signal)).toEqual(
      response,
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "https://regions.test/functions/v1/region-search",
      expect.objectContaining({
        method: "POST",
        signal: controller.signal,
        body: JSON.stringify({
          operation: "search",
          country: "KR",
          kind: "adminDong",
          query: "청운",
          limit: 20,
        }),
      }),
    );
  });
  it("다른 종류나 국가의 응답을 검색 결과로 표시하지 않는다", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ ...response, kind: "legalDong" })),
        ),
    );
    const { searchRegions } = await api();
    await expect(searchRegions("adminDong", "청운")).rejects.toThrow("경계 종류");
  });
  it("짧거나 긴 검색어는 서버 요청 전에 거절한다", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { searchRegions } = await api();
    for (const query of [" ", "동", "a".repeat(101)])
      await expect(searchRegions("adminDong", query)).rejects.toThrow("2–100자");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
