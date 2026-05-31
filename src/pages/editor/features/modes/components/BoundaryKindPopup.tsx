import type { RefObject } from "react";
import { useEditorStore } from "@/pages/editor/state/editorStore";
import { boundaryKindOptions } from "../model/boundaryKindModel";
import { ToolOptionPopup } from "./ToolOptionPopup";

type BoundaryKindPopupProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchor: RefObject<HTMLButtonElement | null>;
};

// 경계 도구의 종류(행정동/법정동/우편번호)를 고르는 팝업입니다. 공용 ToolOptionPopup에 store를 연결합니다.
// 병합·더하기·빼기 같은 처리는 폴리곤 흐름에서 담당합니다.
export function BoundaryKindPopup({
  open,
  onOpenChange,
  anchor,
}: BoundaryKindPopupProps) {
  const activeBoundaryKind = useEditorStore((state) => state.activeBoundaryKind);
  const setActiveBoundaryKind = useEditorStore((state) => state.setActiveBoundaryKind);

  return (
    <ToolOptionPopup
      activeId={activeBoundaryKind}
      anchor={anchor}
      onOpenChange={onOpenChange}
      onSelect={setActiveBoundaryKind}
      open={open}
      options={boundaryKindOptions}
      title="경계 종류"
    />
  );
}
