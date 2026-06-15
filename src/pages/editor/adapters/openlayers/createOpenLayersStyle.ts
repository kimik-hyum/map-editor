import { Fill, Stroke, Style, Text } from "ol/style";
import { resolvePolygonStyle } from "@/pages/editor/theme/editorStyleResolver";
import { editorDefaultTheme } from "@/pages/editor/theme/editorTheme";
import type { EditorFeature, EditorLayer } from "@/pages/editor/types/editorTypes";

// 선택/호버 같은 store 기반 강조 상태입니다(scene 밖이라 스타일 단계에서 반영).
export type FeatureRenderEmphasis = {
  selected?: boolean;
  hovered?: boolean;
};

// 채움색의 알파를 배율로 조절합니다(호버/선택 강조용). rgba·rgb·hex(#rrggbb)를 다루고
// 그 외 포맷은 그대로 둡니다. hex처럼 이미 불투명(알파 1)이면 배율을 키워도 1로 캡됩니다.
export function scaleFillAlpha(color: string, factor: number): string {
  const rgbaMatch = color.match(/^rgba?\(([^)]+)\)$/i);
  if (rgbaMatch) {
    const parts = rgbaMatch[1].split(",").map((part) => part.trim());
    const [r, g, b] = parts;
    const alpha = parts[3] === undefined ? 1 : Number(parts[3]);
    const nextAlpha = Math.min(1, alpha * factor);
    return `rgba(${r}, ${g}, ${b}, ${nextAlpha})`;
  }

  const hexMatch = color.match(/^#([0-9a-f]{6})$/i);
  if (hexMatch) {
    const value = hexMatch[1];
    const r = Number.parseInt(value.slice(0, 2), 16);
    const g = Number.parseInt(value.slice(2, 4), 16);
    const b = Number.parseInt(value.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${Math.min(1, factor)})`;
  }

  return color;
}

// 에디터 도메인의 feature/layer style을 OpenLayers Style로 변환합니다.
// 선택은 도형의 "원래 색을 바꾸지 않고" 선 굵기 + 채움 불투명도 + 바깥 halo로 강조합니다
// (원색 식별 보존). 호버는 채움 불투명도만 키웁니다. 선택 시 [halo, 본 스타일] 배열을 반환합니다.
export function createOpenLayersStyle(
  feature: EditorFeature,
  layer: EditorLayer,
  emphasis: FeatureRenderEmphasis = {},
): Style | Style[] {
  const base = resolvePolygonStyle(feature, layer);
  const labelStyle = editorDefaultTheme.label;
  const emphasisTheme = editorDefaultTheme.emphasis;

  let fillColor = base.fillColor;
  let strokeWidth = base.strokeWidth;

  if (emphasis.selected) {
    fillColor = scaleFillAlpha(
      base.fillColor,
      emphasisTheme.selected.fillAlphaMultiplier,
    );
    strokeWidth = base.strokeWidth + emphasisTheme.selected.strokeWidthDelta;
  } else if (emphasis.hovered) {
    fillColor = scaleFillAlpha(
      base.fillColor,
      emphasisTheme.hovered.fillAlphaMultiplier,
    );
  }

  const mainStyle = new Style({
    fill: new Fill({
      color: fillColor,
    }),
    stroke: new Stroke({
      color: base.strokeColor,
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

  if (!emphasis.selected) {
    return mainStyle;
  }

  // 본 선 아래에 깔리는 반투명 글로우(halo). 같은 색 도형이 겹쳐도 선택을 구분해 준다.
  const haloStyle = new Style({
    stroke: new Stroke({
      color: emphasisTheme.selected.haloColor,
      width: strokeWidth + emphasisTheme.selected.haloWidthDelta,
    }),
  });

  return [haloStyle, mainStyle];
}
