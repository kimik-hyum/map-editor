import { z } from "zod";
import { getAuthenticatedFunctionRequest } from "@/features/auth/api/supabaseClient";

const coordinateSchema = z.tuple([z.number(), z.number()]);
const polygonalGeometrySchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("Polygon"),
    coordinates: z.array(z.array(coordinateSchema)).min(1),
  }),
  z.object({
    type: z.literal("MultiPolygon"),
    coordinates: z.array(z.array(z.array(coordinateSchema))).min(1),
  }),
]);

const regionKindSchema = z.object({
  kind: z.string().min(1),
  label: z.string().min(1),
  level: z.number().int(),
  min_zoom: z.number().finite(),
  sort_order: z.number().int(),
  selectable: z.boolean(),
});

const regionFeatureSchema = z.object({
  type: z.literal("Feature"),
  id: z.union([z.string(), z.number()]),
  geometry: polygonalGeometrySchema,
  properties: z.record(z.string(), z.unknown()).default({}),
});

const regionFeatureCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  country: z.string().length(2),
  kind: z.string().nullable(),
  level: z.number().int().nullable(),
  truncated: z.boolean(),
  features: z.array(regionFeatureSchema),
});

async function parseResponse<T>(
  response: Response,
  schema: z.ZodType<T>,
  label: string,
): Promise<T> {
  const payload: unknown = await response.json();
  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new Error(`${label} 응답 형식이 올바르지 않습니다.`);
  }
  return result.data;
}

async function callRegionFunction<T>(
  operation: string,
  payload: Record<string, unknown>,
  schema: z.ZodType<T>,
  label: string,
  signal?: AbortSignal,
): Promise<T> {
  const { headers, url } = await getAuthenticatedFunctionRequest();
  const response = await fetch(url, {
    method: "POST",
    headers,
    signal,
    body: JSON.stringify({ operation, ...payload }),
  });
  if (!response.ok) {
    throw new Error(`${label} 호출 실패: ${response.status}`);
  }
  return parseResponse(response, schema, label);
}

// region_kind 카탈로그의 한 행(메뉴 종류와 줌 전용 상위 종류를 모두 포함).
export type RegionKind = z.infer<typeof regionKindSchema>;

// regions_by_view RPC 응답. features는 OL GeoJSON 포맷이 그대로 읽습니다.
export type RegionFeatureCollection = z.infer<typeof regionFeatureCollectionSchema>;

export type RegionViewQuery = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
  zoom: number;
  kind: string;
  country?: string;
};

// 국가별 전체 경계 종류 목록. 메뉴는 selectable만 쓰고, 비선택 행은 줌 tier 라벨에 씁니다.
export async function fetchRegionKinds(
  country = "KR",
  signal?: AbortSignal,
): Promise<RegionKind[]> {
  return callRegionFunction(
    "kinds",
    { country },
    z.array(regionKindSchema),
    "region_kind",
    signal,
  );
}

// 원본 해상도 GeoJSON Feature(없으면 null).
export type RegionFeature = z.infer<typeof regionFeatureSchema> | null;

// 표시된 경계 row id로 단건 원본을 조회한다(편집 채택용).
// 월별 스왑 중에도 사용자가 본 바로 그 경계를 원본 해상도로 다시 받는다.
export async function fetchRegionById(
  boundaryId: number | string,
  signal?: AbortSignal,
): Promise<RegionFeature> {
  return callRegionFunction(
    "byId",
    { boundaryId },
    regionFeatureSchema.nullable(),
    "region_by_id",
    signal,
  );
}

// code 기반 원본 조회. 외부/편의 조회용으로 유지한다.
// 편집 연산은 표시 row와 1:1로 맞는 fetchRegionById를 사용한다.
export async function fetchRegionByCode(
  kind: string,
  code: string,
  country = "KR",
  signal?: AbortSignal,
): Promise<RegionFeature> {
  return callRegionFunction(
    "byCode",
    { code, country, kind },
    regionFeatureSchema.nullable(),
    "region_by_code",
    signal,
  );
}

// 현재 화면 bbox + 줌 + 선택 kind로 경계를 받습니다(서버가 줌 tier를 결정).
// 좌표는 서버가 줌 티어별 허용오차로 단순화해 내려줍니다(표시용, 시각 손실 없음).
export async function fetchRegionsByView(
  q: RegionViewQuery,
  signal?: AbortSignal,
): Promise<RegionFeatureCollection> {
  return callRegionFunction(
    "byView",
    {
      minLng: q.minLng,
      minLat: q.minLat,
      maxLng: q.maxLng,
      maxLat: q.maxLat,
      zoom: q.zoom,
      country: q.country ?? "KR",
      kind: q.kind,
    },
    regionFeatureCollectionSchema,
    "regions_by_view",
    signal,
  );
}
