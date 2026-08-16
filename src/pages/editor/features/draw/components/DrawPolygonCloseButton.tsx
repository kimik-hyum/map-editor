import { CircleDotDashed } from "lucide-react";

type DrawPolygonCloseButtonProps = {
  visible: boolean;
  enabled: boolean;
  vertexCount: number;
  onClose: () => void;
};

// 시작점 재클릭과 같은 결과를 만드는 키보드 접근 가능한 Polygon 완료 동작입니다.
export function DrawPolygonCloseButton({
  visible,
  enabled,
  vertexCount,
  onClose,
}: DrawPolygonCloseButtonProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="absolute bottom-7 left-1/2 z-40 -translate-x-1/2">
      <button
        aria-label="폴리곤 시작점에서 닫기"
        className="flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-extrabold text-white shadow-xl transition-colors enabled:hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-500"
        disabled={!enabled}
        onClick={onClose}
        type="button"
      >
        <CircleDotDashed aria-hidden className="h-4 w-4" strokeWidth={2.5} />
        <span>시작점에서 닫기</span>
        <span className="text-xs font-semibold text-white">{vertexCount}점</span>
      </button>
    </div>
  );
}
