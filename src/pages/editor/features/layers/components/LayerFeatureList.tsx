import type { LayerFeatureListItemViewModel } from "../model/layerPanelModel";

type LayerFeatureListProps = {
  features: LayerFeatureListItemViewModel[];
};

export function LayerFeatureList({ features }: LayerFeatureListProps) {
  if (features.length === 0) {
    return <p className="m-0 text-xs font-semibold text-slate-400">도형 없음</p>;
  }

  return (
    <ul className="m-0 grid list-none gap-1.5 p-0">
      {features.map((feature) => (
        <li
          className="flex min-w-0 items-start gap-2 rounded-md bg-slate-50 px-2 py-1.5"
          key={feature.id}
        >
          <span
            className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: feature.accentColor }}
          />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-black leading-5 text-slate-950">
              {feature.name}
            </span>
            <span className="flex gap-1.5 text-[11px] font-bold text-slate-500">
              <span>{feature.geometryKindLabel}</span>
              {feature.selectionLabel ? <span>{feature.selectionLabel}</span> : null}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
