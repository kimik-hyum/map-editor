import { useQuery } from "@tanstack/react-query";
import type OpenLayersMap from "ol/Map";
import { useEffect, useState } from "react";
import { useBoundaryAccess } from "@/features/auth";
import { useEditorStore } from "@/pages/editor/state/editorStore";
import { focusRegionOnMap } from "@/pages/editor/adapters/openlayers";
import { searchRegions, RegionApiError } from "../api/regionsApi";
import {
  normalizeRegionSearch,
  REGION_SEARCH_MIN_LENGTH,
  type RegionSearchItem,
} from "../model/regionSearchModel";

export function useRegionSearch(
  map: OpenLayersMap | null,
  kind: string,
  enabled: boolean,
) {
  const { allowed, subject } = useBoundaryAccess();
  const sessionId = useEditorStore((state) => state.sessionId);
  const scope = `${sessionId}:${kind}`;
  const [draft, setDraft] = useState({ scope, value: "" });
  const input = draft.scope === scope ? draft.value : "";
  const [composing, setComposing] = useState(false);
  const [settled, setSettled] = useState("");
  const [selection, setSelection] = useState<{ scope: string; id: string } | null>(
    null,
  );
  const query = normalizeRegionSearch(input);
  useEffect(() => {
    // 한글의 마지막 음절은 입력을 멈춰도 조합 상태로 남을 수 있습니다.
    // 조합 종료 대신 마지막 입력값 변경을 기준으로 검색을 예약합니다.
    const timer = setTimeout(() => setSettled(query), 300);
    return () => clearTimeout(timer);
  }, [query]);
  const canRequest =
    enabled && allowed && !!subject && query.length >= REGION_SEARCH_MIN_LENGTH;
  const waiting = canRequest && query !== settled;
  const canSearch = canRequest && !waiting;
  const result = useQuery({
    queryKey: ["region-search", "KR", kind, subject, canSearch ? settled : null],
    queryFn: ({ signal }) => searchRegions(kind, settled, signal),
    enabled: canSearch,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    retry: (count, error) =>
      count < 1 && !(error instanceof RegionApiError && error.status < 500),
  });
  let error: string | null = null;
  if (canSearch && result.isError) {
    error = "검색 결과를 불러오지 못했습니다. 다시 시도해주세요.";
    if (result.error instanceof RegionApiError) {
      if (result.error.status === 429) {
        error = "검색 요청이 많습니다. 잠시 후 다시 검색해주세요.";
      } else if (
        result.error.code === "REGION_COUNTRY_BLOCKED" ||
        result.error.code === "REGION_GATEWAY_REQUIRED"
      ) {
        error = result.error.message;
      }
    }
  }
  return {
    input,
    setInput: (value: string) => {
      setDraft({ scope, value });
      setSelection(null);
    },
    setComposing,
    searchNow: () => {
      // 조합 확정용 Enter는 즉시 검색으로 처리하지 않습니다.
      if (!composing) setSettled(query);
    },
    hasQuery: query.length >= REGION_SEARCH_MIN_LENGTH,
    waiting,
    loading: canSearch && result.isFetching,
    error,
    items: canSearch ? (result.data?.items ?? []) : [],
    hasMore: canSearch && (result.data?.hasMore ?? false),
    selectedId: selection?.scope === scope ? selection.id : null,
    select: (item: RegionSearchItem) => {
      if (!map || !allowed || !enabled || item.kind !== kind) return;
      focusRegionOnMap(map, item.center, item.bbox, item.minZoom);
      setSelection({ scope, id: item.id });
    },
    retry: () => {
      void result.refetch();
    },
  };
}
