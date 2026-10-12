import { useQuery, useQueryClient } from "@tanstack/react-query";
import type OpenLayersMap from "ol/Map";
import { useEffect, useRef, useState } from "react";
import { attachRegionBoundaryLayer } from "@/pages/editor/adapters/openlayers/attachRegionBoundaryLayer";
import {
  focusUsBoundaryPreset,
  readUsBoundaryViewport,
  type UsBoundaryPreset,
} from "@/pages/editor/adapters/openlayers/usBoundaryViewport";
import { US_BOUNDARY_VERSION } from "@/shared/config/usBoundaries";
import { fetchUsBoundaryView } from "../api/usBoundariesApi";
import type { UsBbox, UsBoundaryKind } from "../model/usBoundaryModel";

export function useUsBoundaryPreview(map: OpenLayersMap | null) {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<UsBoundaryKind>("county");
  const [request, setRequest] = useState<{ kind: UsBoundaryKind; bbox: UsBbox } | null>(
    null,
  );
  const [moved, setMoved] = useState(false);
  const requestedBbox = useRef<UsBbox | null>(null);
  const attachment = useRef<ReturnType<typeof attachRegionBoundaryLayer> | null>(null);
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
  const query = useQuery({
    queryKey: ["us-boundary-view", US_BOUNDARY_VERSION, open ? request : null],
    queryFn: ({ signal }) => {
      if (!request) throw new Error("미국 경계 조회 범위를 선택해주세요.");
      return fetchUsBoundaryView(client, request.kind, request.bbox, signal);
    },
    enabled: open && !!request && !!map,
    staleTime: Infinity,
    gcTime: 5 * 60_000,
    retry: false,
  });
  useEffect(() => {
    if (!map) return;
    attachment.current?.sync(open && request && query.data ? query.data : null);
  }, [open, request, query.data, map]);
  const load = (selectedKind = kind) => {
    if (!map) return;
    const bbox = readUsBoundaryViewport(map);
    if (!bbox) return;
    requestedBbox.current = bbox;
    setMoved(false);
    setRequest({ kind: selectedKind, bbox });
  };
  const moveTo = (preset: UsBoundaryPreset) => {
    if (!map) return;
    const selectedKind = preset === "continental-us" ? "state" : kind;
    setKind(selectedKind);
    focusUsBoundaryPreset(map, preset);
    load(selectedKind);
  };
  return {
    open,
    kind,
    moved,
    loading: open && !!request && query.isFetching,
    count: open && request && query.data ? query.data.features.length : 0,
    hasResult: open && !!request && query.isSuccess,
    error: open && request && query.error ? query.error.message : null,
    show: () => {
      setOpen(true);
      moveTo("new-york");
    },
    close: () => {
      requestedBbox.current = null;
      setOpen(false);
      setRequest(null);
    },
    setKind: (next: UsBoundaryKind) => {
      requestedBbox.current = null;
      setKind(next);
      setRequest(null);
    },
    moveTo,
    load: () => load(),
    retry: () => {
      void query.refetch();
    },
  };
}
