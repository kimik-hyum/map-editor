import { createPortal } from "react-dom";
import { GeometryOpMarker } from "./GeometryOpMarker";

// ol/Overlay가 지도 좌표에 고정한 DOM 핸들. 어댑터 핸들과 구조가 같아 그대로 받습니다(타입 결합 없음).
type GeometryOpOverlayHandle = {
  featureId: string;
  element: HTMLElement;
  name?: string;
  canSubtract: boolean;
};

type GeometryOpMarkersProps = {
  overlays: GeometryOpOverlayHandle[];
  // 후보 도형 id를 받아 선택 도형과 병합/제거합니다.
  onMerge: (featureId: string) => void;
  onSubtract: (featureId: string) => void;
};

// 각 후보 폴리곤의 ol/Overlay 요소 안에 병합/제거 마커를 portal로 렌더합니다.
// 위치 추적(팬·줌)은 OL이 매 프레임 처리하므로 여기서는 내용만 그립니다.
export function GeometryOpMarkers({
  overlays,
  onMerge,
  onSubtract,
}: GeometryOpMarkersProps) {
  return (
    <>
      {overlays.map((handle) =>
        createPortal(
          <GeometryOpMarker
            canSubtract={handle.canSubtract}
            name={handle.name}
            onMerge={() => onMerge(handle.featureId)}
            onSubtract={() => onSubtract(handle.featureId)}
          />,
          handle.element,
          handle.featureId,
        ),
      )}
    </>
  );
}
