import { useEditorStore } from "@/pages/editor/state/editorStore";
import { drawShapeOptions } from "../model/drawShapeModel";
import { ToolOptionsSection } from "./ToolOptionsSection";

type DrawShapeOptionsProps = {
  confirmDiscardDraw: () => Promise<boolean>;
};

// 그리기(추가) 도구로 만들 도형(폴리곤/패스/마커)을 고르는 고정 옵션입니다. 공용 ToolOptionsSection에 store를 연결합니다.
export function DrawShapeOptions({ confirmDiscardDraw }: DrawShapeOptionsProps) {
  const activeDrawShape = useEditorStore((state) => state.activeDrawShape);
  const setActiveDrawShape = useEditorStore((state) => state.setActiveDrawShape);

  return (
    <ToolOptionsSection
      activeId={activeDrawShape}
      onSelect={(nextShape) => {
        if (nextShape === activeDrawShape) {
          return;
        }
        void (async () => {
          const context = useEditorStore.getState();
          if (!(await confirmDiscardDraw())) {
            return;
          }

          const currentContext = useEditorStore.getState();
          if (
            currentContext.sessionId === context.sessionId &&
            currentContext.scene === context.scene
          ) {
            setActiveDrawShape(nextShape);
          }
        })();
      }}
      options={drawShapeOptions}
      title="추가할 도형"
    />
  );
}
