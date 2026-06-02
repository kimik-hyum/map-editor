import { Fill, Stroke, Style, Text } from "ol/style";
import { resolvePolygonStyle } from "@/pages/editor/theme/editorStyleResolver";
import { editorDefaultTheme } from "@/pages/editor/theme/editorTheme";
import type { EditorFeature, EditorLayer } from "@/pages/editor/types/editorTypes";

// 선택/호버 같은 store 기반 강조 상태입니다(scene 밖이라 스타일 단계에서 반영).
export type FeatureRenderEmphasis = {
  selected?: boolean;
  hovered?: boolean;
};

// rgba/rgb 색의 알파를 배율로 조절합니다(호버 강조용). 그 외 포맷은 그대로 둡니다.
function scaleFillAlpha(color: string, factor: number): string {
  const match = color.match(/^rgba?\(([^)]+)\)$/i);
  if (!match) {
    return color;
  }

  const parts = match[1].split(",").map((part) => part.trim());
  const [r, g, b] = parts;
  const alpha = parts[3] === undefined ? 1 : Number(parts[3]);
  const nextAlpha = Math.min(1, alpha * factor);
  return `rgba(${r}, ${g}, ${b}, ${nextAlpha})`;
}

// 에디터 도메인의 feature/layer style을 OpenLayers Style로 변환합니다.
// 선택은 selected 토큰으로 강조하고, 호버는 기존 채움 투명도만 키웁니다.
export function createOpenLayersStyle(
  feature: EditorFeature,
  layer: EditorLayer,
  emphasis: FeatureRenderEmphasis = {},
) {
  const base = resolvePolygonStyle(feature, layer);
  const labelStyle = editorDefaultTheme.label;

  let strokeColor = base.strokeColor;
  let fillColor = base.fillColor;
  let strokeWidth = base.strokeWidth;

  if (emphasis.selected) {
    const selected = editorDefaultTheme.polygon.selected;
    strokeColor = selected.strokeColor;
    fillColor = selected.fillColor;
    strokeWidth = base.strokeWidth + 2;
  } else if (emphasis.hovered) {
    fillColor = scaleFillAlpha(base.fillColor, 1.6);
  }

  return new Style({
    fill: new Fill({
      color: fillColor,
    }),
    stroke: new Stroke({
      color: strokeColor,
      width: strokeWidth,
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
