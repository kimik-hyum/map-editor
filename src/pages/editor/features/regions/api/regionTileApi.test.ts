import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/features/auth/api/supabaseClient", () => ({
  getAuthenticatedFunctionRequest: async () => ({
    url: "https://regions.test",
    headers: { Authorization: "Bearer test-token" },
  }),
}));
import {
  fetchRegionTileManifest,
  fetchRegionsByTile,
  RegionApiError,
  type RegionTileManifest,
} from "./regionsApi";
const version = `12345678-1234-1234-1234-123456789012.${"a".repeat(32)}`;
const tile = { z: 7, x: 109, y: 49 };
const manifest: RegionTileManifest = {
  country: "KR",
  version,
  profile: "sigungu-4x-full-v1",
  kind: "sigungu",
  maxDisplayZoom: 10,
  minTileZoom: 6,
  maxTileZoom: 9,
  tiles: [tile],
};
const data = {
  type: "FeatureCollection",
  country: "KR",
  kind: "sigungu",
  level: 1,
  truncated: false,
  features: [],
  cache: { ...tile, version, profile: manifest.profile, status: "HIT" },
};
afterEach(() => vi.unstubAllGlobals());
describe("region tile API", () => {
  it("서버의 지원 정책/버전/고정 좌표를 검증한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify(manifest))),
    );
    expect(await fetchRegionTileManifest()).toEqual(manifest);
  });
  for (const status of [400, 404])
    it(`미지원 ${status}만 기존 bbox로 복귀한다`, async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status })));
      expect(await fetchRegionTileManifest()).toBeNull();
    });
  for (const status of [401, 403, 429, 500])
    it(`${status} 오류를 fallback으로 숨기지 않는다`, async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status })));
      await expect(fetchRegionTileManifest()).rejects.toMatchObject({ status });
    });
  it("잘못된 성공 manifest는 거부한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ ...manifest, maxDisplayZoom: 11 })),
        ),
    );
    await expect(fetchRegionTileManifest()).rejects.toThrow("응답 형식");
  });
  it("인증된 요청에 실제 표시 줌과 버전을 전달한다", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(data)));
    vi.stubGlobal("fetch", fetch);
    expect(
      (await fetchRegionsByTile(tile, manifest, 8, "legalDong")).cache?.version,
    ).toBe(version);
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({
      operation: "byTile",
      ...tile,
      country: "KR",
      version,
      zoom: 8,
      kind: "legalDong",
    });
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe("Bearer test-token");
  });
  it("409를 버전 재조회 가능한 오류로 보존한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 409 })),
    );
    await expect(
      fetchRegionsByTile(tile, manifest, 8, "legalDong"),
    ).rejects.toBeInstanceOf(RegionApiError);
  });
  for (const invalid of [
    { ...data, truncated: true },
    { ...data, cache: { ...data.cache, x: 108 } },
    { ...data, cache: { ...data.cache, version: version.replace(/a/g, "b") } },
  ])
    it("잘린 응답이나 다른 타일/버전은 캐시에 넣지 않는다", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue(new Response(JSON.stringify(invalid))),
      );
      await expect(fetchRegionsByTile(tile, manifest, 8, "legalDong")).rejects.toThrow(
        "일치하지 않습니다",
      );
    });
});
