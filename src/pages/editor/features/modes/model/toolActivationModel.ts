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
  const isRadius = mode === EditorMode.Radius;
  return {
    // 반경 입력 중에도 지도에서 다른 기준 마커를 선택할 수 있습니다.
    // 선택만 공유하고 정점 편집·이동·불리언 연산은 Select에 한정합니다.
    selection: isSelect || isRadius,
    vertexEdit: isSelect,
    affordance: isSelect,
    geometryOps: isSelect,
    draw: mode === EditorMode.Draw,
    boundary: mode === EditorMode.Boundary,
    radius: isRadius,
  };
}
