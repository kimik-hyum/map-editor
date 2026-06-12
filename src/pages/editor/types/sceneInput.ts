import type { EditorCoordinate } from "./geometry";
import type { EditorPolygonThemeToken } from "../theme/editorTheme";

// 호스트가 postMessage로 보내는 "최소 입력" 형식(v2)입니다.
// 레이어 단계 없이 도형 목록만 보냅니다 — 에디터가 받아서 도형 하나당 내부 레이어 하나로
// 펼쳐 쌓습니다(1레이어 = 1도형). 그룹/순서 설계는 호스트 몫이 아닙니다.
// 원칙: 필수는 geometry 하나. 나머지는 선택이며 미입력 시 에디터가 기본값/파생값을 채웁니다.
// 입력 범위는 "현재 에디터가 실제로 그릴 수 있는 것"과 일치시킵니다(지금은 폴리곤 계열만).

export type EditorPolygonInputGeometry =
  | { type: "Polygon"; coordinates: EditorCoordinate[][] }
  | { type: "MultiPolygon"; coordinates: EditorCoordinate[][][] };

export type EditorFeatureInput = {
  // 유일한 필수 값. id/name 등은 생략하면 에디터가 채웁니다.
  geometry: EditorPolygonInputGeometry;
  id?: string;
  name?: string;
  // 잠금 = 읽기 전용 = 참고용. 기본 false(편집 가능).
  locked?: boolean;
  visible?: boolean;
  // 선택 스타일 힌트(미입력 시 잠금 여부 기반 기본 테마).
  themeToken?: EditorPolygonThemeToken;
  properties?: Record<string, unknown>;
};

export type EditorSceneInput = {
  version: 2;
  // 배열 순서 = 그리는 순서. 뒤에 있는 도형이 위에 그려집니다(패널 스택 맨 위 = 배열 마지막).
  features: EditorFeatureInput[];
  id?: string;
  name?: string;
  viewport?: {
    center?: EditorCoordinate;
    zoom?: number;
  };
};
