import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronDown } from "lucide-react";
import type {
  LayerFeatureListItemViewModel,
  LayerListItemViewModel,
} from "../model/layerPanelModel";
import { LayerFeatureList } from "./LayerFeatureList";
import { LayerVisibilityIcon } from "./LayerVisibilityIcon";

type LayerListItemProps = {
  layer: LayerListItemViewModel;
  onToggleLayerVisibility: (layer: LayerListItemViewModel) => void;
  onToggleFeatureVisibility: (feature: LayerFeatureListItemViewModel) => void;
  onSelectFeature: (feature: LayerFeatureListItemViewModel) => void;
  onActivateLayer: (layer: LayerListItemViewModel) => void;
};

export function LayerListItem({
  layer,
  onToggleLayerVisibility,
  onToggleFeatureVisibility,
  onSelectFeature,
  onActivateLayer,
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
        <LayerVisibilityIcon
          isDimmed={layer.isDimmed}
          isVisible={layer.isVisible}
          onToggle={() => onToggleLayerVisibility(layer)}
          subject="레이어"
        />

        <div className="min-w-0 flex-1">
          {/* 헤더 클릭 = 펼침/접힘 + 활성(포커스) 레이어 지정. */}
          <Collapsible.Trigger
            className="group flex w-full min-w-0 items-start justify-between gap-2 text-left"
            onClick={() => onActivateLayer(layer)}
          >
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
              <ChevronDown
                aria-hidden
                className="h-4 w-4 text-slate-400 transition-transform group-data-[panel-open]:rotate-180"
                strokeWidth={2}
              />
            </span>
          </Collapsible.Trigger>

          <div className="mt-2 flex flex-wrap gap-1">
            {layer.editabilityLabel ? (
              <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-extrabold text-amber-700 ring-1 ring-amber-200">
                {layer.editabilityLabel}
              </span>
            ) : null}
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
              onSelectFeature={onSelectFeature}
            />
          </Collapsible.Panel>
        </div>
      </div>
    </Collapsible.Root>
  );
}
