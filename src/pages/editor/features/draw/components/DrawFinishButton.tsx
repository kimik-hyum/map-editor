import { FlagTriangleRight } from "lucide-react";

type DrawFinishButtonProps = {
  visible: boolean;
  enabled: boolean;
  vertexCount: number;
  onFinish: () => void;
};

export function DrawFinishButton({
  visible,
  enabled,
  vertexCount,
  onFinish,
}: DrawFinishButtonProps) {
  if (!visible) {
    return null;
  }

  return (
    <div className="absolute bottom-7 left-1/2 z-40 -translate-x-1/2">
      <button
        aria-label="패스 그리기 완료"
        className="flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-extrabold text-white shadow-xl transition-colors enabled:hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-500"
        disabled={!enabled}
        onClick={onFinish}
        type="button"
      >
        <FlagTriangleRight aria-hidden className="h-4 w-4" strokeWidth={2.5} />
        <span>패스 완료</span>
        <span className="text-xs font-semibold text-white">{vertexCount}점</span>
      </button>
    </div>
  );
}
