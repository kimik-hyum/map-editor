import { PaintBucket } from "lucide-react";
import type { HoleFillTool } from "../hooks/useHoleFillTool";

type HoleFillButtonProps = {
  featureId: string;
  name: string;
  tool: HoleFillTool;
};

export function HoleFillButton({ featureId, name, tool }: HoleFillButtonProps) {
  const reason = tool.getDisabledReason(featureId);
  const title =
    reason ?? "빈 공간 채우기 · 지정 면적 이하의 내부 구멍을 미리 보고 채웁니다";
  return (
    // disabled 버튼이 마우스 이벤트를 받지 않는 브라우저에서도 native title을 노출합니다.
    <span className="inline-flex shrink-0" title={title}>
      <button
        aria-label={`${name} 빈 공간 채우기`}
        aria-description={title}
        aria-haspopup="dialog"
        aria-expanded={tool.session?.featureId === featureId}
        className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded border-0 bg-transparent p-0 text-slate-500 transition-colors hover:bg-teal-50 hover:text-teal-700 disabled:pointer-events-none disabled:text-slate-300 disabled:opacity-40"
        disabled={reason !== null}
        onClick={(event) => tool.open(featureId, name, event.currentTarget)}
        title={title}
        type="button"
      >
        <PaintBucket aria-hidden className="h-3.5 w-3.5" />
      </button>
    </span>
  );
}
