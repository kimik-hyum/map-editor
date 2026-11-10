import type OpenLayersMap from "ol/Map";
import { useEffect, useRef, useState } from "react";
import {
  attachMapZoom,
  type MapZoomState,
} from "@/pages/editor/adapters/openlayers/attachMapZoom";

export function useMapZoom(map: OpenLayersMap | null) {
  const [state, setState] = useState<MapZoomState | null>(null);
  const handle = useRef<ReturnType<typeof attachMapZoom> | null>(null);
  useEffect(() => {
    if (!map) return;
    const attachment = attachMapZoom(map, setState);
    handle.current = attachment;
    return () => {
      attachment.detach();
      handle.current = null;
    };
  }, [map]);
  return {
    state: map ? state : null,
    setZoom: (zoom: number) => handle.current?.setZoom(zoom),
    stepZoom: (direction: 1 | -1) => handle.current?.stepZoom(direction),
  };
}
