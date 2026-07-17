import { EditorMode } from "@/pages/editor/types/editorTypes";

// 활성 도구가 각 지도 controller에 허용하는 동작의 단일 정책입니다.
// 파생 상태이므로 store에 저장하지 않고 activeMode에서 매번 계산합니다.
export type ToolActivation = {
  selection: boolean;
  vertexEdit: boolean;
  affordance: boolean;
  geometryOps: boolean;
  draw: boolean;
  boundary: boolean;
  radius: boolean;
};

export function getToolActivation(mode: EditorMode): ToolActivation {
  const isSelect = mode === EditorMode.Select;
  return {
    selection: isSelect,
    vertexEdit: isSelect,
    affordance: isSelect,
    geometryOps: isSelect,
    draw: mode === EditorMode.Draw,
    boundary: mode === EditorMode.Boundary,
    radius: mode === EditorMode.Radius,
  };
}
