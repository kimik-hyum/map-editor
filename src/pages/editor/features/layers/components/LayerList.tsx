import type { LayerPanelViewModel } from "../model/layerPanelModel";
import { LayerListItem } from "./LayerListItem";

type LayerListProps = {
  viewModel: LayerPanelViewModel;
};

export function LayerList({ viewModel }: LayerListProps) {
  if (!viewModel.isReady) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm font-bold text-slate-500">
        레이어를 불러오는 중
      </div>
    );
  }

  if (viewModel.isEmpty) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-sm font-bold text-slate-500">
        표시할 레이어 없음
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-2">
        <div>
          <p className="m-0 text-xs font-black uppercase text-teal-700">Stack</p>
        </div>
        <div className="shrink-0 text-right text-[11px] font-black text-slate-500">
          <span className="block">{viewModel.layerCount} layers</span>
          <span className="block">{viewModel.featureCount} features</span>
        </div>
      </div>

      <ol className="m-0 grid min-h-0 list-none gap-2 overflow-auto p-0">
        {viewModel.layers.map((layer) => (
          <li key={layer.id}>
            <LayerListItem layer={layer} />
          </li>
        ))}
      </ol>
    </div>
  );
}
