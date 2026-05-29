import type { LayerListItemViewModel } from "../model/layerPanelModel";
import { LayerFeatureList } from "./LayerFeatureList";
import { LayerVisibilityIcon } from "./LayerVisibilityIcon";

type LayerListItemProps = {
  layer: LayerListItemViewModel;
};

export function LayerListItem({ layer }: LayerListItemProps) {
  return (
    <article
      className={
        layer.isActive
          ? "rounded-lg border border-sky-300 bg-sky-50/80 p-2.5 shadow-sm"
          : "rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm"
      }
    >
      <div className="flex min-w-0 gap-2.5">
        <LayerVisibilityIcon isDimmed={layer.isDimmed} isVisible={layer.isVisible} />

        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="m-0 truncate text-sm font-black text-slate-950">
                {layer.name}
              </h3>
              <p className="m-0 mt-0.5 text-[11px] font-bold text-slate-500">
                {layer.featureCount}개 도형 · 불투명도 {Math.round(layer.opacity * 100)}
                %
              </p>
            </div>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-black text-slate-500">
              {layer.orderLabel}
            </span>
          </div>

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

          <div className="mt-2">
            <LayerFeatureList features={layer.features} />
          </div>
        </div>
      </div>
    </article>
  );
}
