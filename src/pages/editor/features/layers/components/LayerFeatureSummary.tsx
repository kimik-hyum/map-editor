import type { LayerPanelViewModel } from "../model/layerPanelModel";

type LayerFeatureSummaryProps = {
  viewModel: LayerPanelViewModel;
};

export function LayerFeatureSummary({ viewModel }: LayerFeatureSummaryProps) {
  if (!viewModel.isReady) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm font-bold text-slate-500">
        도형을 불러오는 중
      </div>
    );
  }

  const features = viewModel.layers.flatMap((layer) =>
    layer.features.map((feature) => ({
      ...feature,
      layerName: layer.name,
    })),
  );

  if (features.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm font-bold text-slate-500">
        표시할 도형 없음
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {features.map((feature) => (
        <article
          className="flex min-w-0 items-start gap-2 rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm"
          key={feature.id}
        >
          <span
            className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: feature.accentColor }}
          />
          <div className="min-w-0 flex-1">
            <h3 className="m-0 truncate text-sm font-black text-slate-950">
              {feature.name}
            </h3>
            <p className="m-0 mt-0.5 truncate text-[11px] font-bold text-slate-500">
              {feature.layerName} · {feature.geometryKindLabel}
              {feature.selectionLabel ? ` · ${feature.selectionLabel}` : ""}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}
