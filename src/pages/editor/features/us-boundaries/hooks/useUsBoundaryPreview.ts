import { t } from "@/shared/i18n/i18n";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type OpenLayersMap from "ol/Map";
import { useEffect, useMemo, useRef, useState } from "react";
import { attachRegionBoundaryLayer } from "@/pages/editor/adapters/openlayers/attachRegionBoundaryLayer";
import {
  focusUsBoundaryPreset,
  readUsBoundaryViewports,
  type UsBoundaryPreset,
} from "@/pages/editor/adapters/openlayers/usBoundaryViewport";
import {
  US_BOUNDARY_VERSION,
  US_BOUNDARY_ORIGINAL_VERSION,
} from "@/shared/config/usBoundaries";
import type { BoundaryOriginalSource } from "../../regions/api/boundaryOriginalSource";
import {
  fetchUsBoundaryOriginal,
  getCachedUsBoundaryOriginal,
} from "../api/usBoundaryOriginalApi";
import { fetchUsBoundaryView } from "../api/usBoundariesApi";
import { usKindSchema, type UsBbox, type UsCollection } from "../model/usBoundaryModel";

export function useUsBoundaryPreview(
  map: OpenLayersMap | null,
  selectedKind: string | null,
  sessionId: string | null,
) {
  const client = useQueryClient();
  const parsedKind = usKindSchema.safeParse(selectedKind);
  const kind = parsedKind.success ? parsedKind.data : null;
  const scope = useMemo(() => ({ map, kind, sessionId }), [map, kind, sessionId]);
  const [request, setRequest] = useState<{
    scope: typeof scope;
    bboxes: UsBbox[];
  } | null>(null);
  const previous = useRef<{ scope: typeof scope; data: UsCollection } | null>(null);
  const [attached, setAttached] = useState<{
    scope: typeof scope;
    handle: ReturnType<typeof attachRegionBoundaryLayer>;
  } | null>(null);
  const originalSource = useMemo<BoundaryOriginalSource | null>(
    () =>
      kind
        ? {
            scope: `US:${US_BOUNDARY_ORIGINAL_VERSION}:${kind}`,
            getCachedGeometry: (id) => getCachedUsBoundaryOriginal(client, kind, id),
            fetchGeometry: (id, signal) =>
              fetchUsBoundaryOriginal(client, kind, id, signal),
          }
        : null,
    [client, kind],
  );
  const attachment = useRef<ReturnType<typeof attachRegionBoundaryLayer> | null>(null);

  useEffect(() => {
    if (!scope.map || !scope.kind || !scope.sessionId) return;
    const activeMap = scope.map;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const pause = () => {
      clearTimeout(timer);
      // Query key를 비워 이동 전 범위의 다운로드를 즉시 취소합니다.
      setRequest(null);
    };
    const handle = attachRegionBoundaryLayer(activeMap, {
      onMoveStart: pause,
      onViewChange: () => {
        pause();
        // moveend 후에도 연속 휠/키보드 이동이 이어지면 마지막 범위만 조회합니다.
        timer = setTimeout(() => {
          const bboxes = readUsBoundaryViewports(activeMap);
          if (bboxes) setRequest({ scope, bboxes });
        }, 200);
      },
    });
    attachment.current = handle;
    setAttached({ scope, handle });
    return () => {
      clearTimeout(timer);
      handle.detach();
      attachment.current = null;
    };
  }, [scope]);

  // 국가·종류·편집 회차를 바꿀 때 이전 범위로 요청하거나 늦은 결과를 표시하지 않습니다.
  const bboxes = request?.scope === scope ? request.bboxes : null;
  const query = useQuery({
    queryKey: ["us-boundary-view", US_BOUNDARY_VERSION, sessionId, kind, bboxes],
    queryFn: ({ signal }) => {
      if (!kind || !bboxes) throw new Error(t("미국 경계 조회 범위를 선택해주세요."));
      return fetchUsBoundaryView(client, kind, bboxes, signal);
    },
    enabled: !!kind && !!bboxes && !!map && !!sessionId,
    staleTime: Infinity,
    gcTime: 5 * 60_000,
    retry: false,
  });
  // 같은 종류의 다음 화면을 받는 동안 이미 표시한 참고 경계를 유지합니다.
  const data =
    query.data ??
    (!query.error && previous.current?.scope === scope ? previous.current.data : null);
  useEffect(() => {
    attachment.current?.sync(kind ? data : null);
    if (query.data) previous.current = { scope, data: query.data };
  }, [scope, kind, data, query.data]);

  return {
    layer: attached?.scope === scope ? attached.handle.layer : null,
    originalSource,
    kind,
    loading: !!kind && !!map && !!sessionId && (!bboxes || query.isFetching),
    count: kind && data ? data.features.length : 0,
    hasResult: !!kind && !!data,
    error: kind && query.error ? query.error.message : null,
    moveTo: (preset: UsBoundaryPreset) => {
      if (map) focusUsBoundaryPreset(map, preset);
    },
    retry: () => {
      if (bboxes) void query.refetch();
    },
  };
}
