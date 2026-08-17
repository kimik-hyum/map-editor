import LineString from "ol/geom/LineString";
import MultiLineString from "ol/geom/MultiLineString";
import MultiPoint from "ol/geom/MultiPoint";
import MultiPolygon from "ol/geom/MultiPolygon";
import Point from "ol/geom/Point";
import Polygon from "ol/geom/Polygon";
import { fromLonLat } from "ol/proj";
import type {
  EditorCoordinate,
  GeoJsonGeometry,
} from "@/pages/editor/types/editorTypes";

const projectCoordinate = (coordinate: EditorCoordinate) => fromLonLat(coordinate);
const projectCoordinates = (coordinates: EditorCoordinate[]) =>
  coordinates.map(projectCoordinate);

// 에디터 도메인의 GeoJSON geometry를 OpenLayers geometry 객체로 변환합니다.
export function createOpenLayersGeometry(geometry: GeoJsonGeometry) {
  if (geometry.type === "Point") {
    return new Point(projectCoordinate(geometry.coordinates));
  }

  if (geometry.type === "MultiPoint") {
    return new MultiPoint(projectCoordinates(geometry.coordinates));
  }

  if (geometry.type === "LineString") {
    return new LineString(projectCoordinates(geometry.coordinates));
  }

  if (geometry.type === "MultiLineString") {
    return new MultiLineString(geometry.coordinates.map(projectCoordinates));
  }

  if (geometry.type === "Polygon") {
    return new Polygon(geometry.coordinates.map(projectCoordinates));
  }

  if (geometry.type === "MultiPolygon") {
    return new MultiPolygon(
      geometry.coordinates.map((polygon) => polygon.map(projectCoordinates)),
    );
  }
}
