import MultiPolygon from "ol/geom/MultiPolygon";
import Polygon from "ol/geom/Polygon";
import { fromLonLat } from "ol/proj";
import type { EditorCoordinate, GeoJsonGeometry } from "../../types/editorTypes";

// GeoJSON 경위도 좌표계를 OpenLayers가 렌더링하는 지도 투영 좌표계로 변환합니다.
function projectRing(ring: EditorCoordinate[]) {
  return ring.map((coordinate) => fromLonLat(coordinate));
}

// 에디터 도메인의 GeoJSON geometry를 OpenLayers geometry 객체로 변환합니다.
export function createOpenLayersGeometry(geometry: GeoJsonGeometry) {
  if (geometry.type === "Polygon") {
    return new Polygon(geometry.coordinates.map(projectRing));
  }

  if (geometry.type === "MultiPolygon") {
    return new MultiPolygon(
      geometry.coordinates.map((polygon) => polygon.map(projectRing)),
    );
  }

  return null;
}
