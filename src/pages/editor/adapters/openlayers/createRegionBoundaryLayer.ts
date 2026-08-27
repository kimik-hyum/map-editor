import type { FeatureLike } from "ol/Feature";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import Text from "ol/style/Text";

// 외부 지역 경계는 편집 scene과 분리된 참고 레이어로 표시합니다.
const strokeStyle = new Style({
  stroke: new Stroke({ color: "#000000", width: 1 }),
});
const label = new Text({
  font: "600 11px ui-sans-serif, system-ui, sans-serif",
  fill: new Fill({ color: "#111827" }),
  stroke: new Stroke({ color: "#ffffff", width: 3 }),
  overflow: true,
});
const labelStyle = new Style({ text: label });

function regionStyle(feature: FeatureLike): Style[] {
  label.setText(String(feature.get("name") ?? ""));
  return [strokeStyle, labelStyle];
}

export function createRegionBoundaryLayer() {
  const layer = new VectorLayer({
    source: new VectorSource(),
    style: regionStyle,
    declutter: true,
  });

  // OSM 위, 사용자 편집 콘텐츠(zIndex 10 이상) 아래에 둡니다.
  layer.setZIndex(1);
  return layer;
}

export type RegionBoundaryLayer = ReturnType<typeof createRegionBoundaryLayer>;
