import { t } from "@/shared/i18n/i18n";
import type { PolygonalGeometry } from "@/pages/editor/types/editorTypes";
import type { QueryClient } from "@tanstack/react-query";
import {
  isUsBoundaryOriginalObject,
  usBoundaryOriginalUrl,
  US_BOUNDARY_ORIGINAL_VERSION,
} from "@/shared/config/usBoundaries";
import {
  usOriginalCollectionSchema,
  type UsBoundaryKind,
} from "../model/usBoundaryModel";
import {
  fetchUsBoundaryIndex,
  fetchUsDisplayShard,
  usManifestOptions,
} from "./usBoundariesApi";

const geometryCacheKey = (kind: UsBoundaryKind, id: string | number) => [
  "us-boundary-original-geometry",
  US_BOUNDARY_ORIGINAL_VERSION,
  kind,
  String(id),
];

// 선택해 가져온 원본은 ID로 바로 조회합니다. 버튼 표시만으로 다운로드하지 않습니다.
export function getCachedUsBoundaryOriginal(
  client: QueryClient,
  kind: UsBoundaryKind,
  id: string | number,
) {
  return client.getQueryData<PolygonalGeometry>(geometryCacheKey(kind, id));
}

// ID를 종류·버전과 함께 검증하고 표시 파일이 가리키는 원본에서만 선택합니다.
export async function fetchUsBoundaryOriginal(
  client: QueryClient,
  kind: UsBoundaryKind,
  id: string | number,
  signal: AbortSignal,
) {
  const prefix = `US:${US_BOUNDARY_ORIGINAL_VERSION}:${kind}:`;
  if (
    typeof id !== "string" ||
    !id.startsWith(prefix) ||
    !/^\d+$/.test(id.slice(prefix.length))
  )
    throw new Error(t("미국 경계 원본 ID가 올바르지 않습니다."));
  signal.throwIfAborted();
  const cached = getCachedUsBoundaryOriginal(client, kind, id);
  if (cached) return cached;
  const manifest = await client.ensureQueryData(usManifestOptions());
  signal.throwIfAborted();
  const catalog = manifest.kinds.find((entry) => entry.kind === kind);
  if (!catalog) throw new Error(t("지원하지 않는 미국 경계 종류입니다."));
  const index = await fetchUsBoundaryIndex(client, catalog, signal);
  const item = index.items.find((entry) => entry.id === id);
  const shard = catalog.shards.find((entry) => entry.key === item?.object);
  if (!shard) throw new Error(t("미국 경계 원본의 파일을 찾지 못했습니다."));
  const display = await fetchUsDisplayShard(client, kind, shard, signal);
  const originalPrefix = `us/${US_BOUNDARY_ORIGINAL_VERSION}/`;
  const key = display.original_object.slice(originalPrefix.length);
  if (
    !display.original_object.startsWith(originalPrefix) ||
    !isUsBoundaryOriginalObject(key) ||
    !key.startsWith(`originals/${kind}/`) ||
    !display.features.some((feature) => feature.id === id)
  )
    throw new Error(t("미국 경계 원본 참조가 일치하지 않습니다."));

  const cacheKey = ["us-boundary-original", US_BOUNDARY_ORIGINAL_VERSION, key];
  type Original = ReturnType<typeof usOriginalCollectionSchema.parse>;
  let original = client.getQueryData<Original>(cacheKey);
  if (!original) {
    const response = await fetch(usBoundaryOriginalUrl(key), { signal });
    if (!response.ok) throw new Error(t("미국 경계 원본을 불러오지 못했습니다."));
    original = usOriginalCollectionSchema.parse(await response.json());
    if (
      original.kind !== kind ||
      original.features.some(
        (feature) =>
          feature.properties.kind !== kind ||
          feature.id !== `${prefix}${feature.properties.code}`,
      )
    )
      throw new Error(t("미국 경계 원본의 종류와 ID가 일치하지 않습니다."));
    signal.throwIfAborted();
    client.setQueryData(cacheKey, original);
  }
  signal.throwIfAborted();
  const matches = original.features.filter((feature) => feature.id === id);
  if (matches.length !== 1)
    throw new Error(t("미국 경계 원본이 누락되었거나 중복되었습니다."));
  client.setQueryData(geometryCacheKey(kind, id), matches[0].geometry);
  return matches[0].geometry;
}
