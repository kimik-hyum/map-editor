import { t } from "@/shared/i18n/i18n";
import { useQueries, type UseQueryResult } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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
import {
  refineTruncatedRegionViews,
  type RegionViewPart,
} from "../model/regionViewSubdivision";

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
    error =
      cause instanceof Error ? cause.message : t("경계 응답을 합치지 못했습니다.");
  }
  const failed = results.filter((result) => result.isError);
  const versionConflict = failed.some(
    (result) => result.error instanceof RegionApiError && result.error.status === 409,
  );
  if (versionConflict) data = null;
  if (failed.length) {
    error =
      results.length > 1
        ? t("일부 경계를 불러오지 못했습니다 ({{v0}}/{{v1}}개 구역).", {
            v0: failed.length,
            v1: results.length,
          })
        : (failed[0].error?.message ?? t("경계 로드 실패"));
  }
  return {
    data,
    versionConflict,
    error,
    loading: results.some((result) => result.isPending || result.isFetching),
    completedRequests: results.filter((result) => result.isSuccess).length,
    totalRequests: results.length,
    failedRequests: inconsistent ? results.length : failed.length,
    truncatedIndexes: results.flatMap((result, index) =>
      result.data?.truncated ? [index] : [],
    ),
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
  const scope = JSON.stringify([views, kind, subject]);
  const initialParts = useMemo(
    () => views.map((view) => ({ view, depth: 0 })),
    [views],
  );
  const [subdivision, setSubdivision] = useState<{
    scope: string;
    parts: readonly RegionViewPart[];
  } | null>(null);
  const parts = subdivision?.scope === scope ? subdivision.parts : initialParts;
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
          : parts.map(({ view }) => ({
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
  const refined = useMemo(
    () =>
      tilePlan ? parts : refineTruncatedRegionViews(parts, result.truncatedIndexes),
    [tilePlan, parts, result.truncatedIndexes],
  );
  useEffect(() => {
    if (refined !== parts) setSubdivision({ scope, parts: refined });
  }, [scope, parts, refined]);
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
  // 잘린 부모 응답을 완료 상태로 잠깐 표시하지 않고 자식 조회까지 로딩을 잇습니다.
  return { ...result, loading: result.loading || refined !== parts };
}
