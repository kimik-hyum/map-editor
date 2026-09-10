import { afterEach, describe, expect, it, vi } from "vitest";

const VALID_FEATURE = {
  type: "Feature",
  id: 101,
  geometry: {
    type: "MultiPolygon",
    coordinates: [
      [
        [
          [126.97, 37.57],
          [126.98, 37.57],
          [126.98, 37.58],
          [126.97, 37.57],
        ],
      ],
    ],
  },
  properties: { name: "테스트 구역" },
};

async function loadApi(baseUrl = "https://regions.test") {
  vi.stubEnv("VITE_SUPABASE_URL", baseUrl);
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "test-publishable-key");
  vi.stubEnv("VITE_E2E_AUTH_BYPASS", "true");
  return import("./regionsApi");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("regionsApi", () => {
  it("비선택 상위 tier를 포함한 region_kind 전체 카탈로그를 읽는다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            kind: "sigungu",
            label: "시군구",
            level: 1,
            min_zoom: 0,
            sort_order: 0,
            selectable: false,
          },
          {
            kind: "adminDong",
            label: "행정동",
            level: 2,
            min_zoom: 12,
            sort_order: 1,
            selectable: true,
          },
        ]),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { fetchRegionKinds } = await loadApi();

    const result = await fetchRegionKinds();

    expect(result.map(({ kind, selectable }) => ({ kind, selectable }))).toEqual([
      { kind: "sigungu", selectable: false },
      { kind: "adminDong", selectable: true },
    ]);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://regions.test/functions/v1/regions",
      expect.objectContaining({
        method: "POST",
        signal: undefined,
        body: JSON.stringify({ operation: "kinds", country: "KR" }),
      }),
    );
  });

  it("국가값을 Edge Function 요청 본문에 분리해 전달한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify([])));
    vi.stubGlobal("fetch", fetchMock);
    const { fetchRegionKinds } = await loadApi("https://regions.test/region-api/");

    await fetchRegionKinds("K&R");

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://regions.test/region-api/functions/v1/regions",
    );
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({
      operation: "kinds",
      country: "K&R",
    });
  });

  it("regions_by_view의 polygonal GeoJSON 응답만 통과시킨다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "FeatureCollection",
          country: "KR",
          kind: "adminDong",
          level: 2,
          truncated: false,
          features: [VALID_FEATURE],
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { fetchRegionsByView } = await loadApi();

    const result = await fetchRegionsByView({
      minLng: 126.9,
      minLat: 37.5,
      maxLng: 127,
      maxLat: 37.6,
      zoom: 12,
      kind: "adminDong",
    });

    expect(result.features[0]?.geometry.type).toBe("MultiPolygon");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://regions.test/functions/v1/regions",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          operation: "byView",
          minLng: 126.9,
          minLat: 37.5,
          maxLng: 127,
          maxLat: 37.6,
          zoom: 12,
          country: "KR",
          kind: "adminDong",
        }),
      }),
    );
  });

  it("경계 Feature에 Point 같은 지원하지 않는 geometry가 오면 거부한다", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            type: "FeatureCollection",
            country: "KR",
            kind: "adminDong",
            level: 2,
            truncated: false,
            features: [
              {
                ...VALID_FEATURE,
                geometry: { type: "Point", coordinates: [126.97, 37.57] },
              },
            ],
          }),
        ),
      ),
    );
    const { fetchRegionsByView } = await loadApi();

    await expect(
      fetchRegionsByView({
        minLng: 126.9,
        minLat: 37.5,
        maxLng: 127,
        maxLat: 37.6,
        zoom: 12,
        kind: "adminDong",
      }),
    ).rejects.toThrow("regions_by_view 응답 형식이 올바르지 않습니다.");
  });
});
