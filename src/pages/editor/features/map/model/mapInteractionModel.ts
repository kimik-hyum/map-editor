import { EditorMode } from "@/pages/editor/types/editorTypes";

// 현재 모드에서 어떤 지도 interaction을 켤지 결정하는 순수 정책입니다.
// React/OpenLayers를 모르며, useOpenLayersEditorMap이 이 결과를 어댑터 setActive에 적용합니다.
// 새 모드가 자체 동작을 갖게 되면 여기 플래그만 확장하면 됩니다.
export type MapInteractionActivation = {
  // 클릭 선택 + 호버.
  selection: boolean;
  // 정점 편집(이동/삽입/삭제) + 정점 핸들/상세 오버레이.
  vertexEdit: boolean;
  // 커서 위치 편집 힌트 툴팁(추가/삭제).
  affordance: boolean;
};

// 지금은 Select 모드만 편집 계열을 켭니다.
// Draw/Boundary/Radius는 아직 자체 지도 동작이 없으므로 편집 계열을 모두 끕니다(게이팅).
export function getMapInteractionActivation(
  mode: EditorMode,
): MapInteractionActivation {
  const isSelect = mode === EditorMode.Select;
  return {
    selection: isSelect,
    vertexEdit: isSelect,
    affordance: isSelect,
  };
}
