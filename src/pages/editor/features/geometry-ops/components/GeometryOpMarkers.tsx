import { GeometryOpMarker } from "./GeometryOpMarker";

// 후보 폴리곤 하나의 마커 데이터(화면 위치 + 제거 가능 여부). hook이 계산해 내려줍니다.
export type GeometryOpMarkerData = {
  featureId: string;
  x: number;
  y: number;
  canSubtract: boolean;
};

type GeometryOpMarkersProps = {
  markers: GeometryOpMarkerData[];
  // 후보 도형 id를 받아 선택 도형과 병합/제거합니다.
  onMerge: (featureId: string) => void;
  onSubtract: (featureId: string) => void;
};

// 선택된 폴리곤을 제외한 모든 후보 폴리곤 위에 병합/제거 마커를 띄우는 지도 오버레이입니다.
// 위치는 지도 컨테이너 기준 절대좌표이며, 지도 팬/줌 시 hook이 위치를 갱신합니다.
export function GeometryOpMarkers({
  markers,
  onMerge,
  onSubtract,
}: GeometryOpMarkersProps) {
  if (markers.length === 0) {
    return null;
  }

  return (
    <>
      {markers.map((marker) => (
        <GeometryOpMarker
          canSubtract={marker.canSubtract}
          key={marker.featureId}
          onMerge={() => onMerge(marker.featureId)}
          onSubtract={() => onSubtract(marker.featureId)}
          x={marker.x}
          y={marker.y}
        />
      ))}
    </>
  );
}
