import { useT } from "@/shared/i18n/useT";
import { MousePointer2, MousePointerClick } from "lucide-react";
import { useEditorStore } from "@/pages/editor/state/editorStore";
export function SelectionOptions() {
  const t = useT();
  const count = useEditorStore((s) => s.selectedFeatureIds.length);
  return (
    <section aria-label={t("선택 옵션")} className="p-4">
      <div className="mb-4 flex items-center gap-2">
        <MousePointer2 aria-hidden className="h-4 w-4 text-teal-700" />
        <h3 className="text-sm font-extrabold text-slate-800">{t("선택")}</h3>
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <MousePointerClick aria-hidden className="mb-3 h-6 w-6 text-slate-400" />
        <p className="text-sm font-bold text-slate-700">
          {count
            ? t("{{v0}}개 도형 선택됨", { v0: count })
            : t("편집할 도형을 선택하세요")}
        </p>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {t("지도에서 도형을 누르거나 아래 레이어 목록에서 선택할 수 있습니다.")}
        </p>
      </div>
      <dl className="mt-4 grid grid-cols-[1fr_auto] gap-y-3 text-[11px] text-slate-500">
        <dt>{t("여러 도형 선택")}</dt>
        <dd className="font-semibold text-slate-700">{t("⌘ / Ctrl + 클릭")}</dd>
        <dt>{t("선택한 도형 이동")}</dt>
        <dd className="font-semibold text-slate-700">{t("⌘ / Ctrl + 드래그")}</dd>
        <dt>{t("정점 수정")}</dt>
        <dd className="font-semibold text-slate-700">
          {t("도형 하나 선택 후 드래그")}
        </dd>
      </dl>
    </section>
  );
}
