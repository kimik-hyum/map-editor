import type { QueryClient } from "@tanstack/react-query";
import {
  isUsBoundaryObject,
  usBoundaryObjectUrl,
  US_BOUNDARY_VERSION,
} from "@/shared/config/usBoundaries";
import {
  planUsBoundaryView,
  usDisplayShardSchema,
  usIndexSchema,
  usManifestSchema,
  US_MAX_VERTICES,
  type UsBbox,
  type UsBoundaryKind,
  type UsCollection,
  type UsManifest,
  type UsDisplayShard,
} from "../model/usBoundaryModel";

async function readObject(key: string, signal: AbortSignal): Promise<unknown> {
  if (!isUsBoundaryObject(key))
    throw new Error("미국 경계 파일 경로가 올바르지 않습니다.");
  const response = await fetch(usBoundaryObjectUrl(key), { signal });
  if (!response.ok)
    throw new Error("미국 경계를 불러오지 못했습니다. 다시 시도해주세요.");
  return response.json();
}

export function usManifestOptions() {
  return {
    queryKey: ["us-boundary-manifest", US_BOUNDARY_VERSION],
    queryFn: async ({ signal }: { signal: AbortSignal }) =>
      usManifestSchema.parse(await readObject("manifest.json", signal)),
    staleTime: Infinity,
    gcTime: 30 * 60_000,
    retry: 1,
  };
}

export async function fetchUsBoundaryView(
  client: QueryClient,
  kind: UsBoundaryKind,
  bbox: UsBbox,
  signal: AbortSignal,
): Promise<UsCollection> {
  const manifest = await client.ensureQueryData(usManifestOptions());
  signal.throwIfAborted();
  const catalog = manifest.kinds.find((entry) => entry.kind === kind);
  if (!catalog) throw new Error("지원하지 않는 미국 경계 종류입니다.");
  const index = await fetchUsBoundaryIndex(client, catalog, signal);
  signal.throwIfAborted();
  const plan = planUsBoundaryView(index, catalog, bbox);
  const features: UsCollection["features"] = [];
  let next = 0;
  let vertices = 0;
  const seen = new Set<string>();
  const failureController = new AbortController();
  const downloadSignal = AbortSignal.any([signal, failureController.signal]);
  const worker = async () => {
    while (next < plan.shards.length) {
      downloadSignal.throwIfAborted();
      const shard = plan.shards[next++];
      const data = await fetchUsDisplayShard(client, kind, shard, downloadSignal);
      downloadSignal.throwIfAborted();
      for (const feature of data.features) {
        if (!plan.ids.has(feature.id) || seen.has(feature.id)) continue;
        vertices += feature.geometry.coordinates.reduce(
          (total, polygon) =>
            total + polygon.reduce((count, ring) => count + ring.length, 0),
          0,
        );
        if (vertices > US_MAX_VERTICES)
          throw new Error("상세 경계가 많습니다. 지도를 더 확대하고 불러와주세요.");
        seen.add(feature.id);
        features.push(feature);
      }
    }
  };
  try {
    await Promise.all(Array.from({ length: Math.min(4, plan.shards.length) }, worker));
  } catch (error) {
    failureController.abort();
    throw error;
  }
  if (seen.size !== plan.ids.size)
    throw new Error("일부 미국 경계가 누락되었습니다. 다시 시도해주세요.");
  return {
    type: "FeatureCollection",
    country: "US",
    version: US_BOUNDARY_VERSION,
    kind,
    tolerance: 0.00008,
    geometry_role: "display",
    truncated: false,
    features,
  };
}

export async function fetchUsBoundaryIndex(
  client: QueryClient,
  catalog: UsManifest["kinds"][number],
  signal: AbortSignal,
) {
  const kind = catalog.kind;
  const indexKey = ["us-boundary-index", US_BOUNDARY_VERSION, kind];
  // 요청 signal을 직접 전달해 화면/종류 변경 시 대용량 다운로드를 취소합니다.
  let index = client.getQueryData<ReturnType<typeof usIndexSchema.parse>>(indexKey);
  if (!index) {
    index = usIndexSchema.parse(await readObject(catalog.index, signal));
    if (index.kind !== kind) throw new Error("미국 경계 종류가 일치하지 않습니다.");
    client.setQueryData(indexKey, index);
  }
  signal.throwIfAborted();
  return index;
}

export async function fetchUsDisplayShard(
  client: QueryClient,
  kind: UsBoundaryKind,
  shard: UsManifest["kinds"][number]["shards"][number],
  signal: AbortSignal,
) {
  const key = ["us-boundary-shard", US_BOUNDARY_VERSION, shard.key];
  let data = client.getQueryData<UsDisplayShard>(key);
  if (!data) {
    data = usDisplayShardSchema.parse(await readObject(shard.key, signal));
    if (
      data.kind !== kind ||
      data.features.length !== shard.features ||
      data.features.some((f) => f.properties.kind !== kind)
    )
      throw new Error("미국 경계 응답이 파일 목록과 일치하지 않습니다.");
    signal.throwIfAborted();
    client.setQueryData(key, data);
  }
  return data;
}
