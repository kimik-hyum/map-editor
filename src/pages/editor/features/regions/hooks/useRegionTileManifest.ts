import { useQuery } from "@tanstack/react-query";
import { fetchRegionTileManifest, RegionApiError } from "../api/regionsApi";
import {
  REGION_BOUNDARY_CACHE_MS,
  REGION_TILE_MANIFEST_REFRESH_MS,
} from "../model/regionQueryPolicy";

export function useRegionTileManifest(enabled: boolean, subject: string | null) {
  return useQuery({
    queryKey: ["region-tile-manifest", "KR", subject],
    enabled: enabled && !!subject,
    queryFn: ({ signal }) =>
      fetchRegionTileManifest(AbortSignal.any([signal, AbortSignal.timeout(15_000)])),
    staleTime: REGION_TILE_MANIFEST_REFRESH_MS,
    gcTime: REGION_BOUNDARY_CACHE_MS,
    refetchInterval: enabled ? REGION_TILE_MANIFEST_REFRESH_MS : false,
    refetchOnWindowFocus: true,
    retry: (count, error) =>
      count < 1 && (!(error instanceof RegionApiError) || error.status >= 500),
  });
}
