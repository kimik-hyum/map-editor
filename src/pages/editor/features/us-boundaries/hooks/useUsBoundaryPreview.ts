import { useQuery, useQueryClient } from "@tanstack/react-query";
import type OpenLayersMap from "ol/Map";
import { useCallback, useEffect, useRef, useState } from "react";
import { attachRegionBoundaryLayer } from "@/pages/editor/adapters/openlayers/attachRegionBoundaryLayer";
import {
  focusUsBoundaryPreset,
  readUsBoundaryViewport,
  type UsBoundaryPreset,
} from "@/pages/editor/adapters/openlayers/usBoundaryViewport";
import { US_BOUNDARY_VERSION } from "@/shared/config/usBoundaries";
import { fetchUsBoundaryView } from "../api/usBoundariesApi";
import { usKindSchema, type UsBbox } from "../model/usBoundaryModel";

export function useUsBoundaryPreview(
  map: OpenLayersMap | null,
  selectedKind: string | null,
  sessionId: string | null,
) {
  const client = useQueryClient();
  const parsedKind = usKindSchema.safeParse(selectedKind);
  const kind = parsedKind.success ? parsedKind.data : null;
  const [bbox, setBbox] = useState<UsBbox | null>(null);
  const [moved, setMoved] = useState(false);
  const requestedBbox = useRef<UsBbox | null>(null);
  const attachment = useRef<ReturnType<typeof attachRegionBoundaryLayer> | null>(null);
  const load = useCallback(() => {
    if (!map) return;
    const next = readUsBoundaryViewport(map);
    if (!next) return;
    requestedBbox.current = next;
    setMoved(false);
    setBbox(next);
  }, [map]);
  useEffect(() => {
    if (!map) return;
    const handle = attachRegionBoundaryLayer(map, {
      onViewChange: () => {
        const current = readUsBoundaryViewport(map);
        const previous = requestedBbox.current;
        setMoved(
          Boolean(
            current &&
            previous &&
            current.some((n, i) => Math.abs(n - previous[i]) > 1e-7),
          ),
        );
      },
    });
    attachment.current = handle;
    return () => {
      handle.detach();
      attachment.current = null;
    };
  }, [map]);
  useEffect(() => {
    if (!map || !kind || !sessionId) return;
    load();
  }, [map, kind, sessionId, load]);
  const query = useQuery({
    queryKey: ["us-boundary-view", US_BOUNDARY_VERSION, sessionId, kind, bbox],
    queryFn: ({ signal }) => {
      if (!kind || !bbox) throw new Error("미국 경계 조회 범위를 선택해주세요.");
      return fetchUsBoundaryView(client, kind, bbox, signal);
    },
    enabled: !!kind && !!bbox && !!map && !!sessionId,
    staleTime: Infinity,
    gcTime: 5 * 60_000,
    retry: false,
  });
  useEffect(() => {
    if (!map) return;
    attachment.current?.sync(kind && query.data ? query.data : null);
  }, [kind, query.data, map]);
  return {
    kind,
    moved,
    loading: !!kind && query.isFetching,
    count: kind && query.data ? query.data.features.length : 0,
    hasResult: !!kind && query.isSuccess,
    error: kind && query.error ? query.error.message : null,
    moveTo: (preset: UsBoundaryPreset) => {
      if (!map) return;
      focusUsBoundaryPreset(map, preset);
      load();
    },
    load,
    retry: () => {
      void query.refetch();
    },
  };
}
