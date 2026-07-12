import { useQuery } from "@tanstack/react-query";
import type OpenLayersMap from "ol/Map";
import { useEffect, useRef, useState } from "react";
import {
  attachRegionBoundaryLayer,
  type RegionBoundaryLayer,
  type SnappedRegionView,
} from "@/pages/editor/adapters/openlayers";
import { fetchRegionsByView } from "../api/regionsApi";
import { REGION_BOUNDARY_CACHE_MS } from "../model/regionQueryPolicy";

// 경계 레이어의 현재 상태(사이드 패널 표시용).
export type RegionBoundaryStatus = {
  loading: boolean;
  // 서버가 실제로 내려준 종류(줌이 멀면 선택과 달리 'sigungu'가 올 수 있음).
  kind: string | null;
  count: number;
  truncated: boolean;
  error: string | null;
};

// 경계는 월 1회 갱신되는 정적 데이터라 세션 내 재방문(같은 화면·같은 종류 복귀)은
// 네트워크 없이 캐시로 그립니다.
function sameView(a: SnappedRegionView, b: SnappedRegionView): boolean {
  return (
    a.zoom === b.zoom &&
    a.minLng === b.minLng &&
    a.minLat === b.minLat &&
    a.maxLng === b.maxLng &&
    a.maxLat === b.maxLat
  );
}

// 선택한 kind와 현재 화면(스냅 bbox·줌)에 맞춰 경계를 조회합니다.
// OpenLayers 객체 수명·좌표 변환은 adapter가 맡고, 이 훅은 Query와 UI 상태만 조율합니다.
export function useRegionBoundaries(
  map: OpenLayersMap | null,
  activeKind: string | null,
) {
  const attachmentRef = useRef<ReturnType<typeof attachRegionBoundaryLayer> | null>(
    null,
  );
  const [layer, setLayer] = useState<RegionBoundaryLayer | null>(null);
  const [view, setView] = useState<SnappedRegionView | null>(null);

  useEffect(() => {
    if (!map) {
      return;
    }

    const attachment = attachRegionBoundaryLayer(map, {
      onViewChange: (next) => {
        setView((previous) => (previous && sameView(previous, next) ? previous : next));
      },
    });
    attachmentRef.current = attachment;
    setLayer(attachment.layer);

    return () => {
      attachment.detach();
      attachmentRef.current = null;
      setLayer(null);
      setView(null);
    };
  }, [map]);

  const query = useQuery({
    queryKey: ["region-boundaries", "KR", activeKind, view],
    queryFn: ({ signal }) => {
      if (!view || !activeKind) {
        throw new Error("region query preconditions not met");
      }
      return fetchRegionsByView(
        {
          minLng: view.minLng,
          minLat: view.minLat,
          maxLng: view.maxLng,
          maxLat: view.maxLat,
          zoom: view.zoom,
          kind: activeKind,
        },
        signal,
      );
    },
    enabled: map !== null && activeKind !== null && view !== null,
    staleTime: REGION_BOUNDARY_CACHE_MS,
    gcTime: REGION_BOUNDARY_CACHE_MS,
    // kind 변경 때는 stale 경계를 비우고, 같은 kind의 pan/zoom 중에만 깜빡임을 줄입니다.
    placeholderData: (previousData, previousQuery) =>
      previousQuery?.queryKey[2] === activeKind ? previousData : undefined,
  });

  useEffect(() => {
    attachmentRef.current?.sync(activeKind && query.data ? query.data : null);
  }, [activeKind, query.data]);

  const status: RegionBoundaryStatus = {
    loading: query.isFetching,
    kind: activeKind && query.data ? query.data.kind : null,
    count: activeKind && query.data ? query.data.features.length : 0,
    truncated: activeKind && query.data ? query.data.truncated : false,
    error: query.isError
      ? query.error instanceof Error
        ? query.error.message
        : "경계 로드 실패"
      : null,
  };

  return { layer, status };
}
