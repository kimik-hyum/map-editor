import type { FeatureLike } from "ol/Feature";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import Fill from "ol/style/Fill";
import Stroke from "ol/style/Stroke";
import Style from "ol/style/Style";
import Text from "ol/style/Text";
import { editorDefaultTheme } from "@/pages/editor/theme/editorTheme";
import {
  getMapAnnotationMetrics,
  getMapAnnotationZoom,
} from "@/pages/editor/theme/mapAnnotationTheme";

// 외부 지역 경계는 편집 scene과 분리된 참고 레이어로 표시합니다.
const strokeStyle = new Style({
  stroke: new Stroke({
    color: editorDefaultTheme.regionBoundary.strokeColor,
    width: editorDefaultTheme.regionBoundary.strokeWidth,
  }),
});
const label = new Text({
  font: "600 14px ui-sans-serif, system-ui, sans-serif",
  fill: new Fill({ color: editorDefaultTheme.regionBoundary.labelColor }),
  stroke: new Stroke({ color: "#ffffff", width: 2 }),
  padding: [1, 2, 1, 2],
  overflow: true,
});
const labelStyle = new Style({ text: label });

function regionStyle(feature: FeatureLike, resolution: number): Style[] {
  const metrics = getMapAnnotationMetrics(getMapAnnotationZoom(resolution));
  label.setFont(`600 ${metrics.labelFontSize}px ui-sans-serif, system-ui, sans-serif`);
  label.setText(String(feature.get("name") ?? ""));
  return [strokeStyle, labelStyle];
}

export function createRegionBoundaryLayer() {
  const layer = new VectorLayer({
    source: new VectorSource(),
    style: (feature, resolution) => {
      const actionIds = layer.get("boundaryActionIds") as
        | ReadonlySet<string>
        | undefined;
      return actionIds?.has(String(feature.getId()))
        ? [strokeStyle]
        : regionStyle(feature, resolution);
    },
    declutter: true,
  });

  // OSM 위, 사용자 편집 콘텐츠(zIndex 10 이상) 아래에 둡니다.
  layer.setZIndex(1);
  return layer;
}

export type RegionBoundaryLayer = ReturnType<typeof createRegionBoundaryLayer>;

export function setRegionBoundaryActionIds(
  layer: RegionBoundaryLayer,
  ids: ReadonlySet<string>,
) {
  const previous = layer.get("boundaryActionIds") as ReadonlySet<string> | undefined;
  if (previous?.size === ids.size && [...ids].every((id) => previous.has(id))) return;
  layer.set("boundaryActionIds", ids, true);
  layer.changed();
}
