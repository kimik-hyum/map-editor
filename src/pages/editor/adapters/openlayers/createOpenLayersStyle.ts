import { Fill, Stroke, Style, Text } from "ol/style";
import {
  editorDefaultTheme,
  type EditorPolygonThemeToken,
} from "../../theme/editorTheme";
import {
  LayerRole,
  SelectionState,
  ValidationState,
  type EditorFeature,
  type EditorLayer,
} from "../../types/editorTypes";

const layerRoleThemeTokens: Array<[LayerRole, EditorPolygonThemeToken]> = [
  [LayerRole.Background, "background"],
  [LayerRole.Mask, "mask"],
  [LayerRole.SnapTarget, "snapTarget"],
  [LayerRole.Reference, "reference"],
  [LayerRole.Readonly, "readonly"],
  [LayerRole.Editable, "editable"],
];

// 도형 상태, 레이어 역할, 명시 style 설정을 기준으로 사용할 폴리곤 테마 토큰을 결정합니다.
function resolvePolygonThemeToken(
  feature: EditorFeature,
  layer: EditorLayer,
): EditorPolygonThemeToken {
  if (feature.style?.themeToken) {
    return feature.style.themeToken;
  }

  if (layer.style?.themeToken) {
    return layer.style.themeToken;
  }

  if (feature.state.validation === ValidationState.Invalid) {
    return "invalid";
  }

  if (feature.state.validation === ValidationState.Warning) {
    return "warning";
  }

  if (feature.state.selection === SelectionState.Active) {
    return "active";
  }

  if (feature.state.selection === SelectionState.Selected) {
    return "selected";
  }

  return (
    layerRoleThemeTokens.find(([role]) => layer.roles.includes(role))?.[1] ?? "editable"
  );
}

// 에디터 도메인의 feature/layer style 값을 OpenLayers Style 객체로 변환합니다.
export function createOpenLayersStyle(feature: EditorFeature, layer: EditorLayer) {
  const token = resolvePolygonThemeToken(feature, layer);
  const polygonStyle = {
    ...editorDefaultTheme.polygon[token],
    ...layer.style,
    ...feature.style,
  };
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
