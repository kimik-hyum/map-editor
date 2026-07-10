import { z } from "zod";

// Supabase 지역경계 API 호출부입니다. 브라우저에 노출되는 publishable 키도 환경별 설정으로
// 분리하고, 누락을 숨긴 채 다른 프로젝트로 요청하지 않도록 호출 시점에 명시적으로 검증합니다.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function getSupabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("지역 경계 설정(VITE_SUPABASE_URL/ANON_KEY)이 없습니다.");
  }

  return {
    url: SUPABASE_URL,
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
    },
  };
}

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
  const { url: baseUrl, headers } = getSupabaseConfig();
  const requestUrl =
    `${baseUrl}/rest/v1/region_kind` +
    `?country=eq.${country}` +
    `&select=kind,label,level,min_zoom,sort_order,selectable&order=sort_order`;
  const res = await fetch(requestUrl, { headers, signal });
  if (!res.ok) {
    throw new Error(`region_kind 조회 실패: ${res.status}`);
  }
  return parseResponse(res, z.array(regionKindSchema), "region_kind");
}

// 원본 해상도 GeoJSON Feature(없으면 null).
export type RegionFeature = z.infer<typeof regionFeatureSchema> | null;

// 표시된 경계 row id로 단건 원본을 조회한다(편집 채택용).
// 월별 스왑 중에도 사용자가 본 바로 그 경계를 원본 해상도로 다시 받는다.
export async function fetchRegionById(
  boundaryId: number | string,
  signal?: AbortSignal,
): Promise<RegionFeature> {
  const { url, headers } = getSupabaseConfig();
  const res = await fetch(`${url}/rest/v1/rpc/region_by_id`, {
    method: "POST",
    headers,
    signal,
    body: JSON.stringify({ boundary_id: boundaryId }),
  });
  if (!res.ok) {
    throw new Error(`region_by_id 호출 실패: ${res.status}`);
  }
  return parseResponse(res, regionFeatureSchema.nullable(), "region_by_id");
}

// code 기반 원본 조회. 외부/편의 조회용으로 유지한다.
// 편집 연산은 표시 row와 1:1로 맞는 fetchRegionById를 사용한다.
export async function fetchRegionByCode(
  kind: string,
  code: string,
  country = "KR",
  signal?: AbortSignal,
): Promise<RegionFeature> {
  const { url, headers } = getSupabaseConfig();
  const res = await fetch(`${url}/rest/v1/rpc/region_by_code`, {
    method: "POST",
    headers,
    signal,
    body: JSON.stringify({ country, kind, code }),
  });
  if (!res.ok) {
    throw new Error(`region_by_code 호출 실패: ${res.status}`);
  }
  return parseResponse(res, regionFeatureSchema.nullable(), "region_by_code");
}

// 현재 화면 bbox + 줌 + 선택 kind로 경계를 받습니다(서버가 줌 tier를 결정).
// 좌표는 서버가 줌 티어별 허용오차로 단순화해 내려줍니다(표시용, 시각 손실 없음).
export async function fetchRegionsByView(
  q: RegionViewQuery,
  signal?: AbortSignal,
): Promise<RegionFeatureCollection> {
  const { url, headers } = getSupabaseConfig();
  const res = await fetch(`${url}/rest/v1/rpc/regions_by_view`, {
    method: "POST",
    headers,
    signal,
    body: JSON.stringify({
      min_lng: q.minLng,
      min_lat: q.minLat,
      max_lng: q.maxLng,
      max_lat: q.maxLat,
      zoom: q.zoom,
      country: q.country ?? "KR",
      kind: q.kind,
    }),
  });
  if (!res.ok) {
    throw new Error(`regions_by_view 호출 실패: ${res.status}`);
  }
  return parseResponse(res, regionFeatureCollectionSchema, "regions_by_view");
}
