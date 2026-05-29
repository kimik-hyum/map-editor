import { Fill, Stroke, Style, Text } from "ol/style";
import { editorDefaultTheme } from "../../theme/editorTheme";
import { resolvePolygonStyle } from "../../theme/editorStyleResolver";
import type { EditorFeature, EditorLayer } from "../../types/editorTypes";

// 에디터 도메인의 feature/layer style 값을 OpenLayers Style 객체로 변환합니다.
export function createOpenLayersStyle(feature: EditorFeature, layer: EditorLayer) {
  const polygonStyle = resolvePolygonStyle(feature, layer);
  const labelStyle = editorDefaultTheme.label;

  return new Style({
    fill: new Fill({
      color: polygonStyle.fillColor,
    }),
    stroke: new Stroke({
      color: polygonStyle.strokeColor,
      width: polygonStyle.strokeWidth,
    }),
    text: layer.view.labelVisible
      ? new Text({
          backgroundFill: new Fill({
            color: labelStyle.backgroundColor,
          }),
          backgroundStroke: new Stroke({
            color: labelStyle.borderColor,
            width: 1,
          }),
          fill: new Fill({
            color: labelStyle.color,
          }),
          font: "700 11px Inter, system-ui, sans-serif",
          overflow: true,
          padding: [2, 4, 2, 4],
          stroke: new Stroke({
            color: labelStyle.haloColor,
            width: 4,
          }),
          text: feature.name ?? String(feature.feature.id ?? ""),
        })
      : undefined,
  });
}
