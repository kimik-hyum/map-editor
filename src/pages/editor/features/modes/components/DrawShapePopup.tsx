import type { RefObject } from "react";
import { useEditorStore } from "@/pages/editor/state/editorStore";
import { drawShapeOptions } from "../model/drawShapeModel";
import { ToolOptionPopup } from "./ToolOptionPopup";

type DrawShapePopupProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  anchor: RefObject<HTMLButtonElement | null>;
};

// 그리기(추가) 도구로 만들 도형(폴리곤/패스/마커)을 고르는 팝업입니다. 공용 ToolOptionPopup에 store를 연결합니다.
// 실제 그리기 인터랙션/렌더링은 후속(#12, #41)에서 담당합니다.
export function DrawShapePopup({ open, onOpenChange, anchor }: DrawShapePopupProps) {
  const activeDrawShape = useEditorStore((state) => state.activeDrawShape);
  const setActiveDrawShape = useEditorStore((state) => state.setActiveDrawShape);

  return (
    <ToolOptionPopup
      activeId={activeDrawShape}
      anchor={anchor}
      onOpenChange={onOpenChange}
      onSelect={setActiveDrawShape}
      open={open}
      options={drawShapeOptions}
      title="추가할 도형"
    />
  );
}
