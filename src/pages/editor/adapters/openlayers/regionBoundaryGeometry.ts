import type Feature from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import type Geometry from "ol/geom/Geometry";
import {
  isPolygonalGeometry,
  type GeoJsonGeometry,
  type PolygonalGeometry,
} from "@/pages/editor/types/editorTypes";

const geojson = new GeoJSON({
  dataProjection: "EPSG:4326",
  featureProjection: "EPSG:3857",
});
const receivedGeometries = new WeakMap<Feature<Geometry>, PolygonalGeometry>();

// 참고 경계는 편집하지 않습니다. 지도용 투영과 별도로 받은 좌표를 보존해,
// 역투영의 미세한 반올림 오차가 정밀 겹침 연산에 들어가지 않게 합니다.
// ID 대신 OL 객체에 연결하므로 같은 ID의 버전 교체에도 이전 좌표를 쓰지 않습니다.
export function readRegionBoundaryFeature(input: Record<string, unknown>) {
  const feature = geojson.readFeatures({
    type: "FeatureCollection",
    features: [input],
  })[0];
  const geometry = input.geometry as GeoJsonGeometry | undefined;
  if (geometry && isPolygonalGeometry(geometry)) {
    receivedGeometries.set(feature, geometry);
  }
  return feature;
}

export function getRegionBoundaryGeometry(feature: Feature<Geometry>) {
  return receivedGeometries.get(feature);
}
