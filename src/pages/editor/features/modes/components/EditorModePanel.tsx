import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { useRef, useState } from "react";
import { MovingHighlight, MovingHighlightItem } from "@/shared/ui/MovingHighlight";
import { cn } from "@/shared/utils/cn";
import { useEditorStore } from "@/pages/editor/state/editorStore";
import { EditorMode } from "@/pages/editor/types/editorTypes";
import { boundaryKindOptions } from "../model/boundaryKindModel";
import { editorModeOptions } from "../model/editorModeModel";
import { BoundaryKindPopup } from "./BoundaryKindPopup";

// 좌측 도구 rail입니다. 활성 도구(EditorMode)가 맵 클릭의 의미를 결정합니다(기본: 선택).
// 경계 도구를 선택하면 경계 버튼 옆에 종류 선택 팝업을 띄웁니다.
export function EditorModePanel() {
  const activeMode = useEditorStore((state) => state.activeMode);
  const setActiveMode = useEditorStore((state) => state.setActiveMode);
  const activeBoundaryKind = useEditorStore((state) => state.activeBoundaryKind);

  // 경계 도구는 선택된 경계 종류(행정동/법정동/우편번호)의 아이콘과 이름을 그대로 보여줍니다.
  const activeBoundaryOption = boundaryKindOptions.find(
    (option) => option.id === activeBoundaryKind,
  );

  const boundaryAnchorRef = useRef<HTMLButtonElement>(null);
  const [boundaryPopupOpen, setBoundaryPopupOpen] = useState(false);

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
              return;
            }

            // 이미 활성화된 도구를 다시 누르면 value가 비워집니다. 경계 도구면 팝업을 다시 엽니다.
            if (activeMode === EditorMode.Boundary) {
              setBoundaryPopupOpen(true);
            }
          }}
        >
          {editorModeOptions.map((tool) => {
            const isBoundary = tool.id === EditorMode.Boundary;
            const Icon =
              isBoundary && activeBoundaryOption
                ? activeBoundaryOption.icon
                : tool.icon;
            const label =
              isBoundary && activeBoundaryOption
                ? activeBoundaryOption.label
                : tool.label;

            return (
              <MovingHighlightItem key={tool.id} value={tool.id}>
                <Toggle
                  aria-label={isBoundary ? `경계: ${label}` : label}
                  className={cn(
                    "group flex w-full flex-col items-center gap-1 rounded-lg px-1 py-2.5 text-[11px] font-black transition-colors",
                    "text-slate-500 hover:bg-slate-50/80 data-[pressed]:text-teal-700",
                  )}
                  ref={isBoundary ? boundaryAnchorRef : undefined}
                  title={isBoundary ? `경계 · ${tool.description}` : tool.description}
                  value={tool.id}
                >
                  <Icon aria-hidden className="h-5 w-5" strokeWidth={2} />
                  <span>{label}</span>
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
    </>
  );
}
