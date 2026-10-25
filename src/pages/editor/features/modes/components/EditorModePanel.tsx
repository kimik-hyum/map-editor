import { useT } from "@/shared/i18n/useT";
import { Toggle } from "@base-ui/react/toggle";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { MovingHighlight, MovingHighlightItem } from "@/shared/ui/MovingHighlight";
import { useEditorStore } from "@/pages/editor/state/editorStore";
import { EditorMode } from "@/pages/editor/types/editorTypes";
import type { EditorTools } from "../hooks/useEditorTools";
import { drawShapeOptions } from "../model/drawShapeModel";
import { editorModeOptions } from "../model/editorModeModel";

export function EditorModePanel({
  tools,
  radiusAvailable,
  busy,
}: {
  tools: EditorTools;
  radiusAvailable: boolean;
  busy: boolean;
}) {
  const t = useT();
  const shape = useEditorStore((s) => s.activeDrawShape);
  const drawOption = drawShapeOptions.find((option) => option.id === shape);
  return (
    <MovingHighlight
      activeValue={tools.activeMode}
      indicatorClassName="rounded-lg bg-teal-50 ring-1 ring-teal-300"
    >
      <ToggleGroup
        aria-label={t("편집 도구")}
        orientation="vertical"
        className="grid gap-2 p-2"
        value={[tools.activeMode]}
        onValueChange={(value) =>
          void tools.activate((value[0] as EditorMode | undefined) ?? tools.activeMode)
        }
      >
        {editorModeOptions.map((tool) => {
          const Icon =
            tool.id === EditorMode.Draw && drawOption ? drawOption.icon : tool.icon;
          const label =
            tool.id === EditorMode.Draw && drawOption
              ? t("{{v0}} 그리기", { v0: t(drawOption.label) })
              : t(tool.label);
          const disabled = busy || (tool.id === EditorMode.Radius && !radiusAvailable);
          const title =
            tool.id === EditorMode.Radius && !radiusAvailable
              ? t("마커를 선택해야합니다")
              : busy
                ? t("경계 데이터를 적용하는 중입니다")
                : undefined;
          return (
            <MovingHighlightItem key={tool.id} value={tool.id} title={title}>
              <Toggle
                value={tool.id}
                aria-label={label}
                disabled={disabled}
                title={title ?? t(tool.description)}
                className="group flex w-full flex-col items-center gap-1.5 rounded-lg px-1 py-3 text-[11px] font-bold text-slate-500 hover:bg-slate-50 data-[pressed]:text-teal-700 data-[disabled]:pointer-events-none data-[disabled]:opacity-40"
              >
                <Icon aria-hidden className="h-5 w-5" strokeWidth={1.8} />
                <span className="leading-tight">
                  {tool.id === EditorMode.Draw ? (
                    t("그리기")
                  ) : tool.id === EditorMode.Boundary ? (
                    <>
                      <span className="block whitespace-nowrap">{t("경계")}</span>
                      <span className="block whitespace-nowrap">{t("데이터")}</span>
                    </>
                  ) : (
                    t(tool.label)
                  )}
                </span>
              </Toggle>
            </MovingHighlightItem>
          );
        })}
      </ToggleGroup>
    </MovingHighlight>
  );
}
