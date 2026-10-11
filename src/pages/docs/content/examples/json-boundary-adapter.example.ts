import bbox from "@turf/bbox";
import { z } from "zod";
import {
  normalizeRegionSearch,
  REGION_SEARCH_MIN_LENGTH,
  REGION_SEARCH_MAX_LENGTH,
  REGION_SEARCH_LIMIT,
  regionSearchResponseSchema,
  type RegionSearchResponse,
} from "@/pages/editor/features/regions/model/regionSearchModel";
import type {
  RegionFeature,
  RegionFeatureCollection,
  RegionKind,
  RegionTile,
  RegionTileManifest,
  RegionViewQuery,
} from "@/pages/editor/features/regions/api/regionsApi";

// 문서용 구현 예제입니다. 기본 에디터에는 자동 등록되지 않습니다.
// 직접 운영하는 편집기의 소스에서 기존 regionsApi.ts의 조회 함수를 이 구현에 위임하세요.
export type BoundaryDataAdapter = {
  searchRegions(
    kind: string,
    query: string,
    signal?: AbortSignal,
    country?: string,
  ): Promise<RegionSearchResponse>;
  fetchRegionKinds(country?: string, signal?: AbortSignal): Promise<RegionKind[]>;
  fetchRegionsByView(
    query: RegionViewQuery,
    signal?: AbortSignal,
  ): Promise<RegionFeatureCollection>;
  fetchRegionById(
    boundaryId: string | number,
    signal?: AbortSignal,
  ): Promise<RegionFeature>;
  fetchRegionByCode(
    kind: string,
    code: string,
    country?: string,
    signal?: AbortSignal,
  ): Promise<RegionFeature>;
  fetchRegionTileManifest(signal?: AbortSignal): Promise<RegionTileManifest | null>;
  fetchRegionsByTile(
    tile: RegionTile,
    manifest: RegionTileManifest,
    zoom: number,
    kind: string,
    signal?: AbortSignal,
  ): Promise<RegionFeatureCollection>;
};

const coordinate = z.tuple([
  z.number().min(-180).max(180),
  z.number().min(-90).max(90),
]);
const ring = z
  .array(coordinate)
  .min(4)
  .refine((points) => {
    const first = points[0];
    const last = points[points.length - 1];
    if (!first || !last) return false;
    return (
      first[0] === last[0] &&
      first[1] === last[1] &&
      new Set(points.map((point) => point.join(","))).size >= 3
    );
  }, "링을 닫고 서로 다른 정점을 3개 이상 넣어주세요.");
const polygon = z.array(ring).min(1);
const geometry = z.discriminatedUnion("type", [
  z.object({ type: z.literal("Polygon"), coordinates: polygon }),
  z.object({ type: z.literal("MultiPolygon"), coordinates: z.array(polygon).min(1) }),
]);
const bundleSchema = z
  .object({
    country: z.string().length(2),
    kinds: z.array(
      z.object({
        kind: z.string().min(1),
        label: z.string().min(1),
        level: z.number().int(),
        min_zoom: z.number().finite(),
        sort_order: z.number().int(),
        selectable: z.boolean(),
      }),
    ),
    features: z.array(
      z.object({
        type: z.literal("Feature"),
        id: z.string().min(1),
        geometry,
        properties: z
          .object({ kind: z.string().min(1), code: z.string(), name: z.string() })
          .passthrough(),
      }),
    ),
  })
  .superRefine((bundle, context) => {
    const kinds = new Set(bundle.kinds.map((kind) => kind.kind));
    const ids = new Set(bundle.features.map((feature) => feature.id));
    if (kinds.size !== bundle.kinds.length || ids.size !== bundle.features.length) {
      context.addIssue({
        code: "custom",
        message: "kind와 Feature.id는 중복될 수 없습니다.",
      });
    }
    if (bundle.features.some((feature) => !kinds.has(feature.properties.kind))) {
      context.addIssue({
        code: "custom",
        message: "모든 도형의 kind를 카탈로그에 등록하세요.",
      });
    }
  });

// 작은 공개 데이터셋용입니다. 전국 데이터는 bbox를 처리하는 자체 API로 분리하세요.
export function createJsonBoundaryAdapter(url: string): BoundaryDataAdapter {
  async function read(signal?: AbortSignal) {
    signal?.throwIfAborted();
    const response = await fetch(url, { signal });
    if (!response.ok) throw new Error(`경계 JSON 요청 실패: ${response.status}`);
    const payload: unknown = await response.json();
    signal?.throwIfAborted();
    return bundleSchema.parse(payload);
  }

  return {
    async searchRegions(kind, query, signal, country = "KR") {
      const normalized = normalizeRegionSearch(query).toLocaleLowerCase();
      if (
        normalized.length < REGION_SEARCH_MIN_LENGTH ||
        normalized.length > REGION_SEARCH_MAX_LENGTH
      ) {
        throw new Error("검색어는 2~100자로 입력하세요.");
      }
      const bundle = await read(signal);
      const catalog = bundle.kinds.find((item) => item.kind === kind);
      const terms = normalized.split(" ");
      const matches =
        country === bundle.country
          ? bundle.features.filter(
              ({ properties }) =>
                properties.kind === kind &&
                terms.every((term) =>
                  normalizeRegionSearch(
                    `${properties.name} ${properties.code} ${typeof properties.context === "string" ? properties.context : ""}`,
                  )
                    .toLocaleLowerCase()
                    .includes(term),
                ),
            )
          : [];
      return regionSearchResponseSchema.parse({
        country,
        kind,
        hasMore: matches.length > REGION_SEARCH_LIMIT,
        items: matches.slice(0, REGION_SEARCH_LIMIT).map((feature) => {
          const [west, south, east, north] = bbox(feature);
          return {
            id: feature.id,
            kind,
            code: feature.properties.code,
            name: feature.properties.name || feature.properties.code || feature.id,
            context:
              typeof feature.properties.context === "string"
                ? feature.properties.context
                : "",
            // 사각형 예제는 bbox 중심을 사용합니다. 복잡한 경계는 내부 대표점을 center로 제공하세요.
            center: feature.properties.center ?? [
              (west + east) / 2,
              (south + north) / 2,
            ],
            bbox: [west, south, east, north],
            minZoom: catalog?.min_zoom ?? 12,
          };
        }),
      });
    },
    async fetchRegionKinds(country = "KR", signal) {
      const bundle = await read(signal);
      return country === bundle.country
        ? [...bundle.kinds].sort((a, b) => a.sort_order - b.sort_order)
        : [];
    },
    async fetchRegionsByView(query, signal) {
      const bundle = await read(signal);
      const country = query.country ?? "KR";
      const kind = bundle.kinds.find((item) => item.kind === query.kind);
      const features =
        country === bundle.country && kind && query.zoom >= kind.min_zoom
          ? bundle.features.filter((feature) => {
              if (feature.properties.kind !== query.kind) return false;
              const [west, south, east, north] = bbox(feature);
              return (
                west <= query.maxLng &&
                east >= query.minLng &&
                south <= query.maxLat &&
                north >= query.minLat
              );
            })
          : [];
      // 화면 bbox와 겹치는 도형을 전체 좌표로 반환합니다. geometry를 화면에 맞춰 자르지 않습니다.
      return {
        type: "FeatureCollection",
        country,
        kind: query.kind,
        level: kind?.level ?? null,
        truncated: false,
        features,
      };
    },
    async fetchRegionById(boundaryId, signal) {
      const bundle = await read(signal);
      return (
        bundle.features.find((feature) => feature.id === String(boundaryId)) ?? null
      );
    },
    async fetchRegionByCode(kind, code, country = "KR", signal) {
      const bundle = await read(signal);
      return country === bundle.country
        ? (bundle.features.find(
            (feature) =>
              feature.properties.kind === kind && feature.properties.code === code,
          ) ?? null)
        : null;
    },
    async fetchRegionTileManifest(signal) {
      signal?.throwIfAborted();
      // 기존 hook은 null을 받으면 낮은 줌에서도 byView 경로를 사용합니다.
      return null;
    },
    async fetchRegionsByTile() {
      throw new Error("이 JSON 어댑터는 타일 조회 대신 byView를 사용합니다.");
    },
  };
}
