import type { QueryClient } from "@tanstack/react-query";
import type { BoundaryOriginalSource } from "./boundaryOriginalSource";
import { REGION_BOUNDARY_CACHE_MS } from "../model/regionQueryPolicy";
import { fetchRegionById } from "./regionsApi";

export function createRegionOriginalSource(
  client: QueryClient,
  subject: string,
): BoundaryOriginalSource {
  const queryKey = (id: string | number) => ["region-full", String(id), subject];
  return {
    scope: subject,
    getCachedGeometry: (id) =>
      client.getQueryData<Awaited<ReturnType<typeof fetchRegionById>>>(queryKey(id))
        ?.geometry,
    fetchGeometry: async (id, signal) => {
      signal.throwIfAborted();
      const full = await client.fetchQuery({
        queryKey: queryKey(id),
        queryFn: ({ signal }) => fetchRegionById(id, signal),
        staleTime: REGION_BOUNDARY_CACHE_MS,
        gcTime: REGION_BOUNDARY_CACHE_MS,
      });
      signal.throwIfAborted();
      if (!full) throw new Error("경계 원본 geometry가 없습니다.");
      return full.geometry;
    },
  };
}
