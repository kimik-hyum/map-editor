import GeoJSON from "ol/format/GeoJSON";
import type Geometry from "ol/geom/Geometry";
import type {
  EditorCoordinate,
  GeoJsonGeometry,
} from "@/pages/editor/types/editorTypes";

const geoJsonFormat = new GeoJSON();

function closeRing(ring: EditorCoordinate[]): EditorCoordinate[] {
  if (ring.length === 0) {
    return ring;
  }
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) {
    return ring;
  }
  return [...ring, [first[0], first[1]]];
}

// 폴리곤/멀티폴리곤 링 닫힘을 정규화합니다. 그 외 geometry는 그대로 둡니다.
export function normalizeClosedRings(geometry: GeoJsonGeometry): GeoJsonGeometry {
  if (geometry.type === "Polygon") {
    return { type: "Polygon", coordinates: geometry.coordinates.map(closeRing) };
  }
  if (geometry.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geometry.coordinates.map((polygon) => polygon.map(closeRing)),
    };
  }
  return geometry;
}

// OpenLayers geometry(EPSG:3857)를 에디터 GeoJSON(EPSG:4326)으로 변환합니다.
export function olGeometryToEditorGeometry(geometry: Geometry): GeoJsonGeometry {
  const object = geoJsonFormat.writeGeometryObject(geometry, {
    featureProjection: "EPSG:3857",
    dataProjection: "EPSG:4326",
  }) as GeoJsonGeometry;
  return normalizeClosedRings(object);
}
