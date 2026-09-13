import { afterEach, beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";
import type * as RegionApi from "@/pages/editor/features/regions/api/regionsApi";
import bundle from "./boundaries.example.json";
import {
  createJsonBoundaryAdapter,
  type BoundaryDataAdapter,
} from "./json-boundary-adapter.example";

const fetchMock = vi.fn<typeof fetch>();
const adapter = createJsonBoundaryAdapter("/boundaries/regions.json");
const query = {
  minLng: 127.02,
  minLat: 37.49,
  maxLng: 127.03,
  maxLat: 37.5,
  zoom: 12,
  kind: "adminDong",
};

function respond(payload: unknown) {
  fetchMock.mockImplementation(
    async () =>
      new Response(JSON.stringify(payload), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
  );
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  respond(bundle);
});
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("문서의 공개 JSON 경계 어댑터", () => {
  it("기존 여섯 조회 함수의 입력·출력 계약과 호환된다", () => {
    expectTypeOf<BoundaryDataAdapter>().toEqualTypeOf<
      Pick<typeof RegionApi, keyof BoundaryDataAdapter>
    >();
  });

  it("국가별 카탈로그를 정렬하고 인증 헤더 없이 읽는다", async () => {
    const source = structuredClone(bundle);
    source.kinds.push({
      ...source.kinds[0],
      kind: "custom",
      label: "내 권역",
      sort_order: -1,
    });
    respond(source);
    expect((await adapter.fetchRegionKinds()).map((kind) => kind.kind)).toEqual([
      "custom",
      "adminDong",
    ]);
    expect(await adapter.fetchRegionKinds("JP")).toEqual([]);
    expect(fetchMock).toHaveBeenCalledWith("/boundaries/regions.json", {
      signal: undefined,
    });
  });

  it("일부만 보이는 bbox에도 채택할 원본 전체를 반환한다", async () => {
    const view = await adapter.fetchRegionsByView(query);
    expect(view).toEqual({
      type: "FeatureCollection",
      country: "KR",
      kind: "adminDong",
      level: 2,
      truncated: false,
      features: bundle.features,
    });
    expect(await adapter.fetchRegionById(view.features[0].id)).toEqual(
      bundle.features[0],
    );
    expect(await adapter.fetchRegionByCode("adminDong", "demo-001")).toEqual(
      bundle.features[0],
    );
    expect(await adapter.fetchRegionById("missing")).toBeNull();
    expect(await adapter.fetchRegionByCode("adminDong", "demo-001", "JP")).toBeNull();
  });

  it.each([
    { ...query, zoom: 11 },
    { ...query, country: "JP" },
    { ...query, kind: "unknown" },
    { ...query, minLng: 128, maxLng: 129 },
    { ...query, minLat: 38, maxLat: 39 },
  ])("줌·국가·종류·화면 밖의 경계를 제외한다: %j", async (input) => {
    expect((await adapter.fetchRegionsByView(input)).features).toEqual([]);
  });

  it("타일이 없어도 byView를 선택할 수 있도록 manifest는 null이다", async () => {
    expect(await adapter.fetchRegionTileManifest()).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("요청 중단 신호를 전달하고 이미 중단한 요청은 시작하지 않는다", async () => {
    const controller = new AbortController();
    await adapter.fetchRegionsByView(query, controller.signal);
    expect(fetchMock).toHaveBeenLastCalledWith("/boundaries/regions.json", {
      signal: controller.signal,
    });
    controller.abort();
    fetchMock.mockClear();
    await expect(
      adapter.fetchRegionKinds("KR", controller.signal),
    ).rejects.toMatchObject({ name: "AbortError" });
    await expect(
      adapter.fetchRegionTileManifest(controller.signal),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("HTTP 실패를 데이터 없음으로 처리하지 않는다", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));
    await expect(adapter.fetchRegionKinds()).rejects.toThrow("503");
  });

  it.each([
    [
      "빈 링",
      (source: typeof bundle) => {
        source.features[0].geometry.coordinates = [[]];
      },
    ],
    [
      "열린 링",
      (source: typeof bundle) => {
        source.features[0].geometry.coordinates[0].pop();
      },
    ],
    [
      "범위 밖 좌표",
      (source: typeof bundle) => {
        source.features[0].geometry.coordinates[0][1] = [181, 37];
      },
    ],
    [
      "중복 ID",
      (source: typeof bundle) => {
        source.features.push(structuredClone(source.features[0]));
      },
    ],
    [
      "중복 종류",
      (source: typeof bundle) => {
        source.kinds.push(structuredClone(source.kinds[0]));
      },
    ],
    [
      "없는 종류",
      (source: typeof bundle) => {
        source.features[0].properties.kind = "unknown";
      },
    ],
  ] as const)("잘못된 외부 데이터는 검증 오류를 낸다: %s", async (_label, change) => {
    const source = structuredClone(bundle);
    change(source);
    respond(source);
    await expect(adapter.fetchRegionsByView(query)).rejects.toMatchObject({
      name: "ZodError",
    });
  });
});
