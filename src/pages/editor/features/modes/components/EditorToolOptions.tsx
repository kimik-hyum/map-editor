import { EditorMode } from "@/pages/editor/types/editorTypes";
import type { RegionBoundaryStatus } from "@/pages/editor/features/regions";
import { RegionSearchPanel } from "@/pages/editor/features/regions";
import type { useBoundarySearchPanel } from "@/pages/editor/features/regions/hooks/useBoundarySearchPanel";
import type { RadiusToolController } from "@/pages/editor/features/radius";
import { RadiusOptions } from "@/pages/editor/features/radius/components/RadiusOptions";
import type { useUsBoundaryPreview } from "@/pages/editor/features/us-boundaries";
import type { EditorTools } from "../hooks/useEditorTools";
import { BoundaryOptions } from "./BoundaryOptions";
import { DrawShapeOptions } from "./DrawShapeOptions";
import { SelectionOptions } from "./SelectionOptions";
export function EditorToolOptions({
  tools,
  radiusTool,
  confirmDiscardDraw,
  boundaryStatus,
  operationError,
  busy,
  usPreview,
  search,
  boundaryKind,
}: {
  tools: EditorTools;
  radiusTool: RadiusToolController;
  confirmDiscardDraw: () => Promise<boolean>;
  boundaryStatus: RegionBoundaryStatus;
  operationError: string | null;
  busy: boolean;
  usPreview: ReturnType<typeof useUsBoundaryPreview>;
  search: ReturnType<typeof useBoundarySearchPanel>;
  boundaryKind: string | null;
}) {
  switch (tools.inspectedMode) {
    case EditorMode.Boundary:
      return (
        <>
          <BoundaryOptions
            boundaryStatus={boundaryStatus}
            operationError={operationError}
            busy={busy}
            usPreview={usPreview}
            onCountryChange={tools.changeCountry}
            onSelectKind={(kind) => void tools.activate(EditorMode.Boundary, { kind })}
            onSearchOpen={search.show}
          />
          {search.open && boundaryKind && (
            <RegionSearchPanel
              key={boundaryKind}
              kind={boundaryKind}
              label={search.label}
              search={search.search}
              onClose={search.close}
            />
          )}
        </>
      );
    case EditorMode.Draw:
      return <DrawShapeOptions confirmDiscardDraw={confirmDiscardDraw} />;
    case EditorMode.Radius:
      return radiusTool.popupOpen ? (
        <RadiusOptions tool={radiusTool} />
      ) : (
        <SelectionOptions />
      );
    default:
      return <SelectionOptions />;
  }
}
