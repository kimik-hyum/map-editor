import { Collapsible } from "@base-ui/react/collapsible";
import type {
  LayerFeatureListItemViewModel,
  LayerListItemViewModel,
} from "../model/layerPanelModel";
import { LayerFeatureList } from "./LayerFeatureList";

type LayerListItemProps = {
  layer: LayerListItemViewModel;
  onToggleFeatureVisibility: (feature: LayerFeatureListItemViewModel) => void;
};

export function LayerListItem({
  layer,
  onToggleFeatureVisibility,
}: LayerListItemProps) {
  return (
    <Collapsible.Root
      className={
        layer.isActive
          ? "rounded-lg border border-sky-300 bg-sky-50/80 p-2.5 shadow-sm"
          : "rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm"
      }
      defaultOpen
    >
      <div className="flex min-w-0 gap-2.5">
        <div className="min-w-0 flex-1">
          <Collapsible.Trigger className="group flex w-full min-w-0 items-start justify-between gap-2 text-left">
            <span className="min-w-0">
              <span className="block truncate text-sm font-black text-slate-950">
                {layer.name}
              </span>
              <span className="mt-0.5 block text-[11px] font-bold text-slate-500">
                {layer.featureCount}개 도형 · 불투명도 {Math.round(layer.opacity * 100)}
                %
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-1">
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-black text-slate-500">
                {layer.orderLabel}
              </span>
              <svg
                aria-hidden="true"
                className="h-4 w-4 text-slate-400 transition-transform group-data-[panel-open]:rotate-180"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>
          </Collapsible.Trigger>

          <div className="mt-2 flex flex-wrap gap-1">
            {layer.roleLabels.map((roleLabel) => (
              <span
                className="rounded bg-white px-1.5 py-0.5 text-[11px] font-extrabold text-slate-500 ring-1 ring-slate-200"
                key={roleLabel}
              >
                {roleLabel}
              </span>
            ))}
          </div>

          <Collapsible.Panel className="mt-2" keepMounted>
            <LayerFeatureList
              features={layer.features}
              onToggleFeatureVisibility={onToggleFeatureVisibility}
            />
          </Collapsible.Panel>
        </div>
      </div>
    </Collapsible.Root>
  );
}
