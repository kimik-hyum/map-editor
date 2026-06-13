import type OpenLayersMap from "ol/Map";
import Overlay from "ol/Overlay";
import { fromLonLat } from "ol/proj";

// 후보 폴리곤 하나의 오버레이 입력(앵커 경위도 + 제거 가능 여부).
// features/* 정책을 모르게 어댑터가 자체 정의합니다(구조가 같으면 모델 출력을 그대로 받습니다).
// 내부 입력 계약이라 export하지 않습니다(sync 인자 타입으로만 사용).
type GeometryOpOverlayInput = {
  featureId: string;
  lonLat: [number, number];
  canSubtract: boolean;
};

// React가 마커 UI를 portal로 렌더할 대상 DOM과 부가 정보입니다.
export type GeometryOpOverlayHandle = {
  featureId: string;
  element: HTMLElement;
  canSubtract: boolean;
};

// ol/Overlay로 후보 도형마다 DOM 오버레이를 만들어 지도 좌표에 고정합니다.
// OL이 팬/줌/애니메이션 매 프레임 위치를 갱신하므로 moveend 수동 보정이 필요 없습니다.
// stopEvent로 마커 클릭/드래그가 지도로 전파되지 않습니다.
export function attachGeometryOpOverlays(map: OpenLayersMap) {
  const overlays = new Map<string, { overlay: Overlay; element: HTMLElement }>();

  // 입력 목록에 맞춰 오버레이를 생성/이동/제거하고, React가 portal할 핸들 목록을 반환합니다.
  const sync = (inputs: GeometryOpOverlayInput[]): GeometryOpOverlayHandle[] => {
    const nextIds = new Set(inputs.map((input) => input.featureId));
    for (const [featureId, entry] of overlays) {
      if (!nextIds.has(featureId)) {
        map.removeOverlay(entry.overlay);
        overlays.delete(featureId);
      }
    }

    const handles: GeometryOpOverlayHandle[] = [];
    for (const input of inputs) {
      let entry = overlays.get(input.featureId);
      if (!entry) {
        const element = document.createElement("div");
        const overlay = new Overlay({
          element,
          // 앵커(도형 상단 중앙)가 요소의 하단 중앙 → 마커가 도형 위쪽에 뜬다.
          positioning: "bottom-center",
          offset: [0, -8],
          stopEvent: true,
        });
        map.addOverlay(overlay);
        entry = { overlay, element };
        overlays.set(input.featureId, entry);
      }
      entry.overlay.setPosition(fromLonLat(input.lonLat));
      handles.push({
        featureId: input.featureId,
        element: entry.element,
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
