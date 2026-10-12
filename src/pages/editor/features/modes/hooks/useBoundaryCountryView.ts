import type OpenLayersMap from "ol/Map";
import { useEffect, useRef } from "react";
import { createBoundaryCountryView } from "@/pages/editor/adapters/openlayers/boundaryCountryView";
import type { BoundaryCountryCode } from "@/shared/config/boundaryCountries";

export function useBoundaryCountryView(
  map: OpenLayersMap | null,
  country: BoundaryCountryCode,
  active: boolean,
  sessionId: string | null,
) {
  const scope = useRef<{
    map: OpenLayersMap;
    sessionId: string;
    activate: ReturnType<typeof createBoundaryCountryView>;
  } | null>(null);
  useEffect(() => {
    if (!map || !sessionId || !active) return;
    if (scope.current?.map !== map || scope.current.sessionId !== sessionId) {
      scope.current = { map, sessionId, activate: createBoundaryCountryView(map) };
    }
    scope.current.activate(country);
  }, [map, country, active, sessionId]);
}
