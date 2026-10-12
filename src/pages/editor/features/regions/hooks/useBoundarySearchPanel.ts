import type OpenLayersMap from "ol/Map";
import { useState } from "react";
import { useEditorStore } from "@/pages/editor/state/editorStore";
import { useRegionSearch } from "./useRegionSearch";
import { useRegionKinds } from "./useRegionKinds";
import { fallbackRegionKinds } from "../model/regionKindModel";

export function useBoundarySearchPanel(map: OpenLayersMap | null, kind: string | null) {
  const sessionId = useEditorStore((state) => state.sessionId);
  const scope = JSON.stringify([sessionId, kind]);
  const [closedScope, setClosedScope] = useState<string | null>(null);
  const open = closedScope !== scope;
  const { data: kinds } = useRegionKinds("KR", kind !== null);
  const search = useRegionSearch(map, kind ?? "", open && kind !== null);
  const label =
    (kinds ?? fallbackRegionKinds).find((item) => item.kind === kind)?.label ??
    kind ??
    "경계";
  return {
    open: open && kind !== null,
    label,
    search,
    close: () => setClosedScope(scope),
    show: () => setClosedScope(null),
  };
}
