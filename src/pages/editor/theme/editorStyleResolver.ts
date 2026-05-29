import { editorDefaultTheme, type EditorPolygonThemeToken } from "./editorTheme";
import {
  LayerRole,
  SelectionState,
  ValidationState,
  type EditorFeature,
  type EditorLayer,
  type EditorLayerViewState,
  type EditorStyle,
  VisibilityState,
} from "../types/editorTypes";

const layerRoleThemeTokens: Array<[LayerRole, EditorPolygonThemeToken]> = [
  [LayerRole.Background, "background"],
  [LayerRole.Mask, "mask"],
  [LayerRole.SnapTarget, "snapTarget"],
  [LayerRole.Reference, "reference"],
  [LayerRole.Readonly, "readonly"],
  [LayerRole.Editable, "editable"],
];

// 도형 상태, 레이어 역할, 명시 style 설정을 기준으로 사용할 폴리곤 테마 토큰을 결정합니다.
export function resolvePolygonThemeToken(
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

export function resolvePolygonStyle(
  feature: EditorFeature,
  layer: EditorLayer,
): Required<Pick<EditorStyle, "fillColor" | "strokeColor" | "strokeWidth">> &
  EditorStyle {
  const token = resolvePolygonThemeToken(feature, layer);

  return {
    ...editorDefaultTheme.polygon[token],
    ...layer.style,
    ...feature.style,
  };
}

export function resolveLayerEffectiveOpacity(view: EditorLayerViewState) {
  return view.visibility === VisibilityState.Dimmed ? view.opacity * 0.5 : view.opacity;
}
