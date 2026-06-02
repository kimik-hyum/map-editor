import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import type VectorLayer from "ol/layer/Vector";
import type OpenLayersMap from "ol/Map";
import { unByKey } from "ol/Observable";
import type VectorSource from "ol/source/Vector";
import type { ProjectedVertex } from "./createVertexOverlay";

type VertexDetailOptions = {
  // 커서 주변 상세 정점을 그릴 오버레이 레이어.
  layer: VectorLayer<VectorSource>;
  // 현재 선택된 도형의 전체 투영 정점(EPSG:3857). 선택이 없으면 빈 배열을 돌려줍니다.
  getVertices: () => readonly ProjectedVertex[];
  // 커서로부터 이 픽셀 반경 안의 정점만 상세로 드러냅니다. 편집 grab 허용보다 크게 두세요.
  radiusPx: number;
};

// 커서 주변 반경의 "전체 정점"을 상세로 드러냅니다(detail-on-demand).
// 대표점은 평소 듬성하게 두고, 호버한 구간만 원본 정점이 촘촘히 채워지는 UX입니다.
// pointermove는 requestAnimationFrame으로 합쳐(throttle) 핫패스 비용을 줄입니다.
export function attachVertexDetail(
  map: OpenLayersMap,
  options: VertexDetailOptions,
): () => void {
  let frameId = 0;
  let pendingPixel: number[] | null = null;

  const renderDetail = () => {
    frameId = 0;

    const source = options.layer.getSource();
    if (!source) {
      return;
    }

    const vertices = options.getVertices();
    const pixel = pendingPixel;
    const resolution = map.getView().getResolution();
    if (vertices.length === 0 || !pixel || resolution === undefined) {
      source.clear(true);
      return;
    }

    const center = map.getCoordinateFromPixel(pixel);
    if (!center) {
      source.clear(true);
      return;
    }

    const radius = options.radiusPx * resolution;
    const radiusSquared = radius * radius;
    const handles: Feature[] = [];
    for (const vertex of vertices) {
      const dx = vertex.x - center[0];
      const dy = vertex.y - center[1];
      if (dx * dx + dy * dy <= radiusSquared) {
        handles.push(new Feature({ geometry: new Point([vertex.x, vertex.y]) }));
      }
    }

    source.clear(true);
    if (handles.length > 0) {
      source.addFeatures(handles);
    }
  };

  const scheduleRender = () => {
    if (frameId === 0) {
      frameId = requestAnimationFrame(renderDetail);
    }
  };

  const moveKey = map.on("pointermove", (event) => {
    if (event.dragging) {
      // 팬/줌 중에는 stale 상세점을 지운다(포인터를 다시 움직이면 복원).
      pendingPixel = null;
      scheduleRender();
      return;
    }
    pendingPixel = event.pixel;
    scheduleRender();
  });

  // 포인터가 지도를 벗어나면 상세를 지웁니다.
  const viewport = map.getViewport();
  const handlePointerLeave = () => {
    pendingPixel = null;
    scheduleRender();
  };
  viewport.addEventListener("pointerleave", handlePointerLeave);

  return () => {
    unByKey(moveKey);
    viewport.removeEventListener("pointerleave", handlePointerLeave);
    if (frameId !== 0) {
      cancelAnimationFrame(frameId);
    }
    options.layer.getSource()?.clear(true);
  };
}
