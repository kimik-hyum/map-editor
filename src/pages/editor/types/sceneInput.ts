import type { EditorCoordinate } from "./geometry";
import type { EditorPolygonThemeToken } from "../theme/editorTheme";

// 호스트가 postMessage로 보내는 "최소 입력" 형식(v2)입니다.
// 에디터가 경계에서 normalize해 내부 EditorScene(리치 모델)으로 채웁니다.
// 원칙: 필수는 geometry 정도. 나머지는 선택이며 미입력 시 에디터가 기본값/파생값을 채웁니다.
// 입력 범위는 "현재 에디터가 실제로 그릴 수 있는 것"과 일치시킵니다(지금은 폴리곤 계열만).
// path/point 렌더가 열리면 이 입력도 함께 확장합니다.

export type EditorPolygonInputGeometry =
  | { type: "Polygon"; coordinates: EditorCoordinate[][] }
  | { type: "MultiPolygon"; coordinates: EditorCoordinate[][][] };

// 레이어 역할(미입력 시 editable). 내부 LayerRole/behavior로 매핑됩니다.
export type EditorLayerRoleInput = "editable" | "reference" | "background";

export type EditorFeatureInput = {
  // 유일한 필수 값. id/name/state 등은 생략하면 에디터가 채웁니다.
  geometry: EditorPolygonInputGeometry;
  id?: string;
  name?: string;
  visible?: boolean;
  // 선택 스타일 힌트(미입력 시 역할 기반 기본 테마).
  themeToken?: EditorPolygonThemeToken;
  properties?: Record<string, unknown>;
};

export type EditorLayerInput = {
  // features 키의 존재로 "레이어"임이 명시됩니다(깊이 추론이 아니라 명시 키).
  features: EditorFeatureInput[];
  id?: string;
  name?: string;
  role?: EditorLayerRoleInput;
  // 미입력 시 배열 순서로 부여됩니다.
  zIndex?: number;
  visible?: boolean;
  opacity?: number;
};

export type EditorSceneInput = {
  version: 2;
  // 이름 키 맵이 아니라 배열(순서·중복·리네임에 안전).
  layers: EditorLayerInput[];
  id?: string;
  name?: string;
  viewport?: {
    center?: EditorCoordinate;
    zoom?: number;
  };
};
