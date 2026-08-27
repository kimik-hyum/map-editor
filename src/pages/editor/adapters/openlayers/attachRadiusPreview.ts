import Feature from "ol/Feature";
import VectorLayer from "ol/layer/Vector";
import type OpenLayersMap from "ol/Map";
import VectorSource from "ol/source/Vector";
import { Fill, Stroke, Style } from "ol/style";
import type { GeoJsonGeometry } from "@/pages/editor/types/editorTypes";
import { createOpenLayersGeometry } from "./createOpenLayersGeometry";

const previewStyle = new Style({
  fill: new Fill({ color: "rgba(13, 148, 136, 0.16)" }),
  stroke: new Stroke({
    color: "rgba(13, 148, 136, 0.95)",
    width: 3,
    lineDash: [8, 6],
  }),
});

// 반경 입력 중인 원은 scene/history에 넣지 않고 전용 OpenLayers 레이어로만 보여줍니다.
export function attachRadiusPreview(map: OpenLayersMap) {
  const feature = new Feature();
  feature.setStyle(previewStyle);

  const layer = new VectorLayer({
    source: new VectorSource({ features: [feature] }),
    // scene 콘텐츠와 정점/조작 오버레이 사이에서 눈에 띄도록 충분히 높은 값으로 둡니다.
    zIndex: 90_000,
  });
  map.addLayer(layer);

  const sync = (geometry: GeoJsonGeometry | null) => {
    feature.setGeometry(geometry ? createOpenLayersGeometry(geometry) : undefined);
  };

  const detach = () => {
    map.removeLayer(layer);
  };

  return { sync, detach };
}
