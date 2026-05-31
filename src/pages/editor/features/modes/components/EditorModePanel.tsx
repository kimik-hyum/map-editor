import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { useRef, useState } from "react";
import { cn } from "../../../../../shared/utils/cn";
import { useEditorStore } from "../../../state/editorStore";
import { EditorMode } from "../../../types/editorTypes";
import { editorModeOptions } from "../model/editorModeModel";
import { BoundaryKindPopup } from "./BoundaryKindPopup";

// 좌측 도구 rail입니다. 활성 도구(EditorMode)가 맵 클릭의 의미를 결정합니다(기본: 선택).
// 경계 도구를 선택하면 경계 버튼 옆에 종류 선택 팝업을 띄웁니다.
export function EditorModePanel() {
  const activeMode = useEditorStore((state) => state.activeMode);
  const setActiveMode = useEditorStore((state) => state.setActiveMode);

  const boundaryAnchorRef = useRef<HTMLButtonElement>(null);
  const [boundaryPopupOpen, setBoundaryPopupOpen] = useState(false);

  return (
    <>
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
            return;
          }

          // 이미 활성화된 도구를 다시 누르면 value가 비워집니다. 경계 도구면 팝업을 다시 엽니다.
          if (activeMode === EditorMode.Boundary) {
            setBoundaryPopupOpen(true);
          }
        }}
      >
        {editorModeOptions.map((tool) => {
          const Icon = tool.icon;

          return (
            <Toggle
              aria-label={tool.label}
              className={cn(
                "group flex flex-col items-center gap-1 rounded-lg px-1 py-2.5 text-[11px] font-black transition-colors",
                "text-slate-500 hover:bg-slate-50",
                "data-[pressed]:bg-teal-50 data-[pressed]:text-teal-700 data-[pressed]:ring-1 data-[pressed]:ring-teal-300",
              )}
              key={tool.id}
              ref={tool.id === EditorMode.Boundary ? boundaryAnchorRef : undefined}
              title={tool.description}
              value={tool.id}
            >
              <Icon aria-hidden className="h-5 w-5" strokeWidth={2} />
              <span>{tool.label}</span>
            </Toggle>
          );
        })}
      </ToggleGroup>

      <BoundaryKindPopup
        anchor={boundaryAnchorRef}
        onOpenChange={setBoundaryPopupOpen}
        open={boundaryPopupOpen && activeMode === EditorMode.Boundary}
      />
    </>
  );
}
