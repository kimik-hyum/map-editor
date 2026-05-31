import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import type { LucideIcon } from "lucide-react";
import { type RefObject, useRef, useState } from "react";
import { MovingHighlight, MovingHighlightItem } from "@/shared/ui/MovingHighlight";
import { cn } from "@/shared/utils/cn";
import { useEditorStore } from "@/pages/editor/state/editorStore";
import { EditorMode } from "@/pages/editor/types/editorTypes";
import { boundaryKindOptions } from "../model/boundaryKindModel";
import { drawShapeOptions } from "../model/drawShapeModel";
import { editorModeOptions } from "../model/editorModeModel";
import { BoundaryKindPopup } from "./BoundaryKindPopup";
import { DrawShapePopup } from "./DrawShapePopup";

// 좌측 도구 rail입니다. 활성 도구(EditorMode)가 맵 클릭의 의미를 결정합니다(기본: 선택).
// 그리기·경계 도구는 버튼 옆에 하위 옵션 팝업을 띄우고, 선택된 옵션을 버튼 아이콘·이름에 반영합니다.
export function EditorModePanel() {
  const activeMode = useEditorStore((state) => state.activeMode);
  const setActiveMode = useEditorStore((state) => state.setActiveMode);
  const activeBoundaryKind = useEditorStore((state) => state.activeBoundaryKind);
  const activeDrawShape = useEditorStore((state) => state.activeDrawShape);

  const activeBoundaryOption = boundaryKindOptions.find(
    (option) => option.id === activeBoundaryKind,
  );
  const activeDrawOption = drawShapeOptions.find(
    (option) => option.id === activeDrawShape,
  );

  const boundaryAnchorRef = useRef<HTMLButtonElement>(null);
  const drawAnchorRef = useRef<HTMLButtonElement>(null);
  const [boundaryPopupOpen, setBoundaryPopupOpen] = useState(false);
  const [drawPopupOpen, setDrawPopupOpen] = useState(false);

  return (
    <>
      <MovingHighlight
        activeValue={activeMode}
        indicatorClassName="rounded-lg bg-teal-50 ring-1 ring-teal-300"
      >
        <ToggleGroup
          aria-label="편집 도구"
          className="grid gap-1 p-2"
          orientation="vertical"
          value={[activeMode]}
          onValueChange={(value) => {
            const next = value[0] as EditorMode | undefined;

            if (next) {
              setActiveMode(next);
              setBoundaryPopupOpen(next === EditorMode.Boundary);
              setDrawPopupOpen(next === EditorMode.Draw);
              return;
            }

            // 이미 활성화된 도구를 다시 누르면 value가 비워집니다. 옵션이 있는 도구면 팝업을 다시 엽니다.
            if (activeMode === EditorMode.Boundary) {
              setBoundaryPopupOpen(true);
            } else if (activeMode === EditorMode.Draw) {
              setDrawPopupOpen(true);
            }
          }}
        >
          {editorModeOptions.map((tool) => {
            // 경계/그리기 도구는 선택된 하위 옵션의 아이콘·이름을 버튼에 반영합니다.
            let subOption: { icon: LucideIcon; label: string } | undefined;
            let anchorRef: RefObject<HTMLButtonElement> | undefined;

            if (tool.id === EditorMode.Boundary) {
              subOption = activeBoundaryOption;
              anchorRef = boundaryAnchorRef;
            } else if (tool.id === EditorMode.Draw) {
              subOption = activeDrawOption;
              anchorRef = drawAnchorRef;
            }

            const Icon = subOption?.icon ?? tool.icon;
            // 하위 옵션이 있으면 "폴리곤 + 그리기" / "행정동 + 경계"처럼 도구 의미를 함께 보여줍니다.
            const primaryLabel = subOption?.label ?? tool.label;
            const toolWord = subOption ? tool.label : null;

            return (
              <MovingHighlightItem key={tool.id} value={tool.id}>
                <Toggle
                  aria-label={toolWord ? `${primaryLabel} ${toolWord}` : primaryLabel}
                  className={cn(
                    "group flex w-full flex-col items-center gap-1 rounded-lg px-1 py-2 text-[11px] font-black transition-colors",
                    "text-slate-500 hover:bg-slate-50/80 data-[pressed]:text-teal-700",
                  )}
                  ref={anchorRef}
                  title={
                    subOption ? `${tool.label} · ${tool.description}` : tool.description
                  }
                  value={tool.id}
                >
                  <Icon aria-hidden className="h-5 w-5" strokeWidth={2} />
                  <span className="flex flex-col items-center leading-tight">
                    <span>{primaryLabel}</span>
                    {toolWord ? (
                      <span className="mt-0.5 text-[9px] font-semibold text-slate-400 group-data-[pressed]:text-teal-600">
                        {toolWord}
                      </span>
                    ) : null}
                  </span>
                </Toggle>
              </MovingHighlightItem>
            );
          })}
        </ToggleGroup>
      </MovingHighlight>

      <BoundaryKindPopup
        anchor={boundaryAnchorRef}
        onOpenChange={setBoundaryPopupOpen}
        open={boundaryPopupOpen && activeMode === EditorMode.Boundary}
      />
      <DrawShapePopup
        anchor={drawAnchorRef}
        onOpenChange={setDrawPopupOpen}
        open={drawPopupOpen && activeMode === EditorMode.Draw}
      />
    </>
  );
}
