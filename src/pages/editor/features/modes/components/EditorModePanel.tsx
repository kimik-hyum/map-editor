import { ToggleGroup } from "@base-ui/react/toggle-group";
import { useMemo } from "react";
import { PanelShell } from "../../../components/PanelShell";
import { ToggleCard } from "../../../components/ToggleCard";
import { useEditorStore } from "../../../state/editorStore";
import type { EditorMode } from "../../../types/editorTypes";
import { editorModeOptions } from "../model/editorModeModel";

export function EditorModePanel() {
  const activeMode = useEditorStore((state) => state.activeMode);
  const setActiveMode = useEditorStore((state) => state.setActiveMode);
  const selectedMode = useMemo(
    () => editorModeOptions.find((mode) => mode.id === activeMode),
    [activeMode],
  );

  return (
    <PanelShell
      className="bg-white text-ink"
      headerClassName="px-5 py-4"
      bodyClassName="px-4 py-4"
      header={
        <>
          <p className="m-0 text-xs font-black uppercase text-brand">Mode</p>
          <h1 className="m-0 mt-1 text-lg font-black tracking-normal">권역 편집</h1>
        </>
      }
      footer={
        <div className="px-4 py-4">
          <p className="m-0 text-xs font-black uppercase text-ink-soft">Selected</p>
          <h2 className="m-0 mt-1 text-base font-black text-ink">
            {selectedMode?.title}
          </h2>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {selectedMode?.tags.map((tag) => (
              <span
                className="rounded bg-slate-100 px-2 py-1 text-[11px] font-black text-slate-600"
                key={tag}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      }
    >
      <ToggleGroup
        aria-label="편집 모드"
        className="grid gap-2"
        orientation="vertical"
        value={[activeMode]}
        onValueChange={(value) => {
          const nextMode = value[0] as EditorMode | undefined;

          if (nextMode) {
            setActiveMode(nextMode);
          }
        }}
      >
        {editorModeOptions.map((mode) => (
          <ToggleCard key={mode.id} value={mode.id}>
            <span className="flex items-start justify-between gap-3">
              <span className="min-w-0">
                <span className="block truncate text-sm font-black text-slate-900 group-data-[pressed]:text-teal-950">
                  {mode.title}
                </span>
                <span className="mt-1 flex flex-wrap gap-1">
                  {mode.tags.map((tag) => (
                    <span
                      className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-black text-slate-500 group-data-[pressed]:bg-white/80 group-data-[pressed]:text-teal-700"
                      key={tag}
                    >
                      {tag}
                    </span>
                  ))}
                </span>
              </span>
              <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-black text-slate-500 group-data-[pressed]:bg-teal-600 group-data-[pressed]:text-white">
                {mode.label}
              </span>
            </span>
          </ToggleCard>
        ))}
      </ToggleGroup>
    </PanelShell>
  );
}
