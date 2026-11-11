import type OpenLayersMap from "ol/Map";
import { unByKey } from "ol/Observable";

export type MapZoomState = { zoom: number; minZoom: number; maxZoom: number };

// 지도 탐색은 편집 scene/history와 분리합니다. 휠·핀치·호스트 viewport 변경도 구독합니다.
export function attachMapZoom(
  map: OpenLayersMap,
  onChange: (state: MapZoomState) => void,
) {
  let view = map.getView();
  let frame: number | null = null;
  let previous: MapZoomState | null = null;
  const publish = () => {
    frame = null;
    const next = {
      zoom: view.getZoom() ?? view.getMinZoom(),
      // 세계 범위와 화면 크기에 따라 실제 도달 가능한 최소 줌이 달라집니다.
      minZoom: view.getConstrainedZoom(view.getMinZoom()) ?? view.getMinZoom(),
      maxZoom: view.getConstrainedZoom(view.getMaxZoom()) ?? view.getMaxZoom(),
    };
    if (
      previous?.zoom === next.zoom &&
      previous.minZoom === next.minZoom &&
      previous.maxZoom === next.maxZoom
    )
      return;
    previous = next;
    onChange(next);
  };
  const schedule = () => {
    if (frame === null) frame = requestAnimationFrame(publish);
  };
  let resolutionKey = view.on("change:resolution", schedule);
  let rotationKey = view.on("change:rotation", schedule);
  const sizeKey = map.on("change:size", schedule);
  const viewKey = map.on("change:view", () => {
    unByKey([resolutionKey, rotationKey]);
    view = map.getView();
    resolutionKey = view.on("change:resolution", schedule);
    rotationKey = view.on("change:rotation", schedule);
    schedule();
  });
  publish();
  const setZoom = (zoom: number) => {
    if (!Number.isFinite(zoom)) return;
    view.cancelAnimations();
    const constrained = view.getConstrainedZoom(zoom);
    if (constrained !== undefined) view.setZoom(constrained);
  };
  return {
    setZoom,
    stepZoom: (direction: 1 | -1) => {
      const zoom = view.getZoom() ?? view.getMinZoom();
      setZoom(
        direction === 1 ? Math.floor(zoom + 1e-8) + 1 : Math.ceil(zoom - 1e-8) - 1,
      );
    },
    detach: () => {
      unByKey([viewKey, sizeKey, resolutionKey, rotationKey]);
      if (frame !== null) cancelAnimationFrame(frame);
    },
  };
}
