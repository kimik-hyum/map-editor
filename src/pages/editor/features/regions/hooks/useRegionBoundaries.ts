import { useBoundaryAccess } from "@/features/auth";
import type OpenLayersMap from "ol/Map";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  attachRegionBoundaryLayer,
  splitRegionView,
  type RegionBoundaryLayer,
  type SnappedRegionView,
} from "@/pages/editor/adapters/openlayers";
import type { RegionFeatureCollection } from "../api/regionsApi";
import { REGION_SPLIT_MAX_ZOOM } from "../model/regionQueryPolicy";
import { useRegionViewQueries } from "./useRegionViewQueries";

// 경계 레이어의 현재 상태(사이드메뉴 경계 도구 표시용).
export type RegionBoundaryStatus = {
  loading: boolean;
  // 서버가 실제로 내려준 종류(줌이 멀면 선택과 달리 'sigungu'가 올 수 있음).
  kind: string | null;
  count: number;
  truncated: boolean;
  error: string | null;
  completedRequests: number;
  totalRequests: number;
  failedRequests: number;
  retryFailed: () => void;
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
  const { allowed, subject } = useBoundaryAccess();
  const visibleKind = allowed ? activeKind : null;
  const attachmentRef = useRef<ReturnType<typeof attachRegionBoundaryLayer> | null>(
    null,
  );
  const [layer, setLayer] = useState<RegionBoundaryLayer | null>(null);
  const [view, setView] = useState<SnappedRegionView | null>(null);
  const [moving, setMoving] = useState(false);
  const previousRef = useRef<{ scope: string; data: RegionFeatureCollection } | null>(
    null,
  );

  useEffect(() => {
    if (!map) {
      return;
    }

    const attachment = attachRegionBoundaryLayer(map, {
      onMoveStart: () => setMoving(true),
      onViewChange: (next) => {
        setView((previous) =>
          previous && next && sameView(previous, next) ? previous : next,
        );
        setMoving(false);
      },
    });
    attachmentRef.current = attachment;
    setLayer(attachment.layer);

    return () => {
      attachment.detach();
      attachmentRef.current = null;
      setLayer(null);
      setView(null);
      previousRef.current = null;
    };
  }, [map]);

  const views = useMemo(() => {
    if (!view || !map || moving || !visibleKind) return [];
    const split = view.zoom <= REGION_SPLIT_MAX_ZOOM;
    return splitRegionView(view, split ? 2 : 1, split ? 4 : 1);
  }, [view, map, moving, visibleKind]);
  // 이동 시작·종류 변경·인증 해제로 구독을 해제하면 대기/실행 중인 요청도 취소됩니다.
  const query = useRegionViewQueries(views, visibleKind, subject);
  const scope =
    visibleKind && map && view
      ? JSON.stringify([visibleKind, subject, view.zoom])
      : null;
  const data =
    query.data ??
    (!query.error && previousRef.current?.scope === scope
      ? previousRef.current.data
      : null);

  useEffect(() => {
    if (!layer) return;
    attachmentRef.current?.sync(scope ? data : null);
    if (!scope) previousRef.current = null;
    else if (query.data) previousRef.current = { scope, data: query.data };
  }, [layer, scope, data, query.data]);

  const status: RegionBoundaryStatus = {
    loading: Boolean(visibleKind) && (moving || query.loading),
    kind: scope && data ? data.kind : null,
    count: scope && data ? data.features.length : 0,
    truncated: scope && data ? data.truncated : false,
    error: query.error,
    completedRequests: query.completedRequests,
    totalRequests: query.totalRequests,
    failedRequests: query.failedRequests,
    retryFailed: query.retryFailed,
  };

  return { layer, status };
}
