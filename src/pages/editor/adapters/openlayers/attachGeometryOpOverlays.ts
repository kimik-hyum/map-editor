import type { Coordinate } from "ol/coordinate";
import MultiPolygon from "ol/geom/MultiPolygon";
import Polygon from "ol/geom/Polygon";
import type OpenLayersMap from "ol/Map";
import Overlay from "ol/Overlay";
import { forEachEditorContentLayer } from "./editorContentLayers";

// 후보 폴리곤 하나의 오버레이 입력(이름 + 제거 가능 여부).
// features/* 정책을 모르게 어댑터가 자체 정의합니다(구조가 같으면 모델 출력을 그대로 받습니다).
// 내부 입력 계약이라 export하지 않습니다(sync 인자 타입으로만 사용).
type GeometryOpOverlayInput = {
  featureId: string;
  name?: string;
  canSubtract: boolean;
};

// React가 마커 UI를 portal로 렌더할 대상 DOM과 부가 정보입니다.
export type GeometryOpOverlayHandle = {
  featureId: string;
  element: HTMLElement;
  name?: string;
  canSubtract: boolean;
};

// 콘텐츠 레이어에서 도형을 찾아 "면 내부 대표점"(지도 좌표)을 구합니다.
// OL이 이름 라벨을 놓는 바로 그 점이라, 칩이 라벨 자리에 안착하고 항상 면 안쪽임이 보장됩니다.
// MultiPolygon은 각 조각의 내부점 중 가장 넓은(측정값이 큰) 곳을 고릅니다. 못 찾으면 null.
function interiorCoordinate(map: OpenLayersMap, featureId: string): Coordinate | null {
  let coordinate: Coordinate | null = null;
  forEachEditorContentLayer(map, (layer) => {
    if (coordinate) {
      return;
    }
    const geometry = layer.getSource()?.getFeatureById(featureId)?.getGeometry();
    if (geometry instanceof Polygon) {
      coordinate = geometry.getInteriorPoint().getCoordinates().slice(0, 2);
    } else if (geometry instanceof MultiPolygon) {
      const points = geometry.getInteriorPoints().getCoordinates();
      // 각 점의 3번째 값은 그 조각의 가로 폭(측정값) — 가장 넓은 조각의 내부점을 쓴다.
      const widest = points.reduce<number[] | null>(
        (best, point) => ((point[2] ?? 0) > (best?.[2] ?? 0) ? point : best),
        null,
      );
      if (widest) {
        coordinate = widest.slice(0, 2);
      }
    }
  });
  return coordinate;
}

// 후보 도형마다 ol/Overlay(빈 div)를 만들어 도형 내부 대표점에 고정합니다.
// OL이 팬/줌/애니메이션 매 프레임 위치를 갱신하므로 moveend 수동 보정이 필요 없습니다.
// stopEvent로 마커 클릭/드래그가 지도로 전파되지 않습니다.
export function attachGeometryOpOverlays(map: OpenLayersMap) {
  const overlays = new Map<string, { overlay: Overlay; element: HTMLElement }>();

  // 입력 목록에 맞춰 오버레이를 생성/이동/제거하고, React가 portal할 핸들 목록을 반환합니다.
  // 내부점을 못 구한 후보(잘못된 도형·OL 피처 없음)는 건너뜁니다.
  const sync = (inputs: GeometryOpOverlayInput[]): GeometryOpOverlayHandle[] => {
    const positioned = inputs
      .map((input) => ({ input, coordinate: interiorCoordinate(map, input.featureId) }))
      .filter(
        (item): item is { input: GeometryOpOverlayInput; coordinate: Coordinate } =>
          item.coordinate !== null,
      );

    const nextIds = new Set(positioned.map(({ input }) => input.featureId));
    for (const [featureId, entry] of overlays) {
      if (!nextIds.has(featureId)) {
        map.removeOverlay(entry.overlay);
        overlays.delete(featureId);
      }
    }

    const handles: GeometryOpOverlayHandle[] = [];
    for (const { input, coordinate } of positioned) {
      let entry = overlays.get(input.featureId);
      if (!entry) {
        const element = document.createElement("div");
        const overlay = new Overlay({
          element,
          // 앵커(도형 내부 대표점)에 칩 중앙을 맞춰 도형 "안쪽"에 둔다(이웃 비침범·소속 명확).
          positioning: "center-center",
          stopEvent: true,
        });
        map.addOverlay(overlay);
        entry = { overlay, element };
        overlays.set(input.featureId, entry);
      }
      entry.overlay.setPosition(coordinate);
      handles.push({
        featureId: input.featureId,
        element: entry.element,
        name: input.name,
        canSubtract: input.canSubtract,
      });
    }
    return handles;
  };

  const detach = () => {
    for (const entry of overlays.values()) {
      map.removeOverlay(entry.overlay);
    }
    overlays.clear();
  };

  return { sync, detach };
}
