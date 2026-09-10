import { useQueries, type UseQueryResult } from "@tanstack/react-query";
import type { SnappedRegionView } from "@/pages/editor/adapters/openlayers";
import {
  fetchRegionsByView,
  fetchRegionsByTile,
  RegionApiError,
  type RegionFeatureCollection,
  type RegionTileManifest,
  type RegionTile,
} from "../api/regionsApi";
import { queueRegionViewRequest } from "../api/regionRequestQueue";
import { mergeRegionCollections } from "../model/mergeRegionCollections";
import { REGION_BOUNDARY_CACHE_MS } from "../model/regionQueryPolicy";

function combine(results: UseQueryResult<RegionFeatureCollection>[]) {
  let data: RegionFeatureCollection | null = null;
  let error: string | null = null;
  let inconsistent = false;
  try {
    data = mergeRegionCollections(
      results.flatMap((result) => (result.data ? [result.data] : [])),
    );
  } catch (cause) {
    inconsistent = true;
    error = cause instanceof Error ? cause.message : "경계 응답을 합치지 못했습니다.";
  }
  const failed = results.filter((result) => result.isError);
  const versionConflict = failed.some(
    (result) => result.error instanceof RegionApiError && result.error.status === 409,
  );
  if (versionConflict) data = null;
  if (failed.length) {
    error =
      results.length > 1
        ? `일부 경계를 불러오지 못했습니다 (${failed.length}/${results.length}개 구역).`
        : (failed[0].error?.message ?? "경계 로드 실패");
  }
  return {
    data,
    versionConflict,
    error,
    loading: results.some((result) => result.isPending || result.isFetching),
    completedRequests: results.filter((result) => result.isSuccess).length,
    totalRequests: results.length,
    failedRequests: inconsistent ? results.length : failed.length,
    retryFailed: () => {
      for (const result of results) {
        if (!result.isFetching && (result.isError || inconsistent))
          void result.refetch();
      }
    },
  };
}

export function useRegionViewQueries(
  views: readonly SnappedRegionView[],
  kind: string | null,
  subject: string | null,
  tilePlan: {
    manifest: RegionTileManifest;
    tiles: readonly RegionTile[];
    zoom: number;
  } | null = null,
) {
  // 현재 키의 observer만 구독하므로 이전 화면에서 늦게 도착한 응답은 섞이지 않습니다.
  const result = useQueries({
    queries:
      kind && subject
        ? tilePlan
          ? tilePlan.tiles.map((tile) => ({
              queryKey: [
                "region-boundaries",
                "fixed-v1",
                "KR",
                tilePlan.manifest.version,
                tilePlan.manifest.profile,
                tile.z,
                tile.x,
                tile.y,
                subject,
              ],
              queryFn: ({ signal }: { signal: AbortSignal }) =>
                queueRegionViewRequest(signal, async () => {
                  signal.throwIfAborted();
                  return fetchRegionsByTile(
                    tile,
                    tilePlan.manifest,
                    tilePlan.zoom,
                    kind,
                    AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
                  );
                }),
              staleTime: REGION_BOUNDARY_CACHE_MS,
              gcTime: REGION_BOUNDARY_CACHE_MS,
              retry: (failureCount: number, error: Error) =>
                failureCount < 1 &&
                (!(error instanceof RegionApiError) || error.status >= 500),
              retryDelay: 1000,
            }))
          : views.map((view) => ({
              queryKey: ["region-boundaries", "tiles-v1", "KR", kind, view, subject],
              queryFn: ({ signal }: { signal: AbortSignal }) =>
                queueRegionViewRequest(signal, async () => {
                  signal.throwIfAborted();
                  return fetchRegionsByView(
                    { ...view, kind },
                    AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
                  );
                }),
              staleTime: REGION_BOUNDARY_CACHE_MS,
              gcTime: REGION_BOUNDARY_CACHE_MS,
              retry: (failureCount: number, error: Error) =>
                failureCount < 1 &&
                (!(error instanceof RegionApiError) || error.status >= 500),
              retryDelay: 1000,
            }))
        : [],
    combine,
  });
  if (tilePlan && tilePlan.tiles.length === 0)
    return {
      ...result,
      data: {
        type: "FeatureCollection" as const,
        country: "KR",
        kind: tilePlan.manifest.kind,
        level: 1,
        truncated: false,
        features: [],
      },
    };
  return result;
}
