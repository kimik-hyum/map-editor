import { z } from "zod";
import {
  US_BOUNDARY_KINDS,
  US_BOUNDARY_VERSION,
  US_BOUNDARY_ORIGINAL_VERSION,
} from "@/shared/config/usBoundaries";

export const usKindSchema = z.enum(US_BOUNDARY_KINDS);
export type UsBoundaryKind = z.infer<typeof usKindSchema>;
export const usKindLabels: Record<UsBoundaryKind, string> = {
  state: "주·특별구·영토",
  county: "카운티",
  county_subdivision: "카운티 하위구역",
  place: "도시·타운",
  zcta: "우편번호 통계구역",
};
const longitude = z.number().finite().min(-180).max(180);
const latitude = z.number().finite().min(-90).max(90);
export const usBboxSchema = z
  .tuple([longitude, latitude, longitude, latitude])
  .refine(([west, south, east, north]) => west <= east && south <= north);
export type UsBbox = z.infer<typeof usBboxSchema>;
const shardSchema = z.object({
  key: z.string(),
  bytes: z.number().int().positive(),
  features: z.number().int().positive(),
});
const kindSchema = z.object({
  kind: usKindSchema,
  label: z.string(),
  index: z.string(),
  features: z.number().int().positive(),
  shards: z.array(shardSchema).max(512),
});
export const usManifestSchema = z.object({
  schema: z.literal("us-boundaries-display-v1"),
  source_version: z.literal(US_BOUNDARY_ORIGINAL_VERSION),
  version: z.literal(US_BOUNDARY_VERSION),
  country: z.literal("US"),
  crs: z.literal("EPSG:4326"),
  profile: z.literal("z15-plus"),
  tolerance: z.literal(0.00008),
  kinds: z.array(kindSchema).length(5),
});
export const usIndexSchema = z.object({
  version: z.literal(US_BOUNDARY_VERSION),
  country: z.literal("US"),
  kind: usKindSchema,
  items: z
    .array(z.object({ id: z.string(), bbox: usBboxSchema, object: z.string() }))
    .max(110_000),
});
const ringSchema = z.array(z.tuple([longitude, latitude])).min(4);
export const usCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  country: z.literal("US"),
  version: z.literal(US_BOUNDARY_VERSION),
  kind: usKindSchema,
  tolerance: z.literal(0.00008),
  geometry_role: z.literal("display"),
  truncated: z.literal(false),
  features: z
    .array(
      z.object({
        type: z.literal("Feature"),
        id: z.string(),
        bbox: usBboxSchema,
        geometry: z.object({
          type: z.literal("MultiPolygon"),
          coordinates: z.array(z.array(ringSchema).min(1)).min(1),
        }),
        properties: z
          .object({ kind: usKindSchema, code: z.string(), name: z.string() })
          .passthrough(),
      }),
    )
    .max(40_000),
});
// 저장된 표시 파일의 원본 참조까지 검증해 표시 geometry가 편집에 쓰이지 않게 합니다.
export const usDisplayShardSchema = usCollectionSchema.extend({
  source_version: z.literal(US_BOUNDARY_ORIGINAL_VERSION),
  original_object: z.string(),
});
export const usOriginalCollectionSchema = usCollectionSchema
  .omit({
    tolerance: true,
    geometry_role: true,
  })
  .extend({
    version: z.literal(US_BOUNDARY_ORIGINAL_VERSION),
    geometry_role: z.never().optional(),
    tolerance: z.never().optional(),
  });
export type UsDisplayShard = z.infer<typeof usDisplayShardSchema>;
export type UsManifest = z.infer<typeof usManifestSchema>;
export type UsIndex = z.infer<typeof usIndexSchema>;
export type UsCollection = z.infer<typeof usCollectionSchema>;
export const US_MAX_FEATURES = 2000;
export const US_MAX_BYTES = 20 * 1024 * 1024;
export const US_MAX_VERTICES = 1_000_000;

export function intersectsUsBbox(a: UsBbox, b: UsBbox): boolean {
  return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
}

export function planUsBoundaryView(
  index: UsIndex,
  kind: UsManifest["kinds"][number],
  bbox: UsBbox,
) {
  if (index.kind !== kind.kind) throw new Error("미국 경계 종류가 일치하지 않습니다.");
  const items = index.items.filter((item) => intersectsUsBbox(item.bbox, bbox));
  if (items.length > US_MAX_FEATURES)
    throw new Error("경계가 너무 많습니다. 지도를 확대하거나 주 경계를 선택해주세요.");
  const keys = new Set(items.map((item) => item.object));
  const shards = kind.shards.filter((shard) => keys.has(shard.key));
  if (shards.length !== keys.size)
    throw new Error("미국 경계 파일 목록이 일치하지 않습니다.");
  if (shards.reduce((sum, shard) => sum + shard.bytes, 0) > US_MAX_BYTES)
    throw new Error("조회 범위가 넓습니다. 지도를 확대하고 다시 불러와주세요.");
  return { ids: new Set(items.map((item) => item.id)), shards };
}
