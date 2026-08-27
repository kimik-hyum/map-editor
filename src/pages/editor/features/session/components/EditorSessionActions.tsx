import { Check, X } from "lucide-react";
import type { EditorMessagingController } from "@/pages/editor/messaging";
import { useEditorSessionActions } from "../hooks/useEditorSessionActions";

type EditorSessionActionsProps = {
  messaging: EditorMessagingController;
  hasPendingToolAction: boolean;
};

export function EditorSessionActions({
  messaging,
  hasPendingToolAction,
}: EditorSessionActionsProps) {
  const actions = useEditorSessionActions({ messaging, hasPendingToolAction });

  if (!actions.isReady) {
    return null;
  }

  const statusText = actions.submitBlockedReason
    ? actions.submitBlockedReason
    : actions.dirty
      ? "저장하지 않은 변경사항이 있습니다."
      : "현재 상태를 그대로 완료할 수 있습니다.";

  return (
    <section
      aria-label="편집 완료"
      className="absolute right-4 top-4 z-40 flex max-w-[min(460px,calc(100%-32px))] items-center gap-3 rounded-xl border border-slate-200 bg-white/95 p-2.5 shadow-lg backdrop-blur-sm"
    >
      <p
        aria-live="polite"
        className={`m-0 min-w-0 flex-1 text-xs font-bold leading-4 ${
          actions.submitBlockedReason ? "text-amber-700" : "text-slate-500"
        }`}
      >
        {statusText}
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <button
          aria-label="편집 취소"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-extrabold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
          disabled={!actions.canCancel}
          onClick={() => void actions.cancel()}
          type="button"
        >
          <X aria-hidden className="h-3.5 w-3.5" strokeWidth={2.5} />
          취소
        </button>
        <button
          aria-label="저장하고 편집 완료"
          className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-xs font-extrabold text-white transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          disabled={!actions.canSubmit}
          onClick={actions.submit}
          title={actions.submitBlockedReason ?? "편집 결과를 부모 창으로 전송합니다."}
          type="button"
        >
          <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={2.5} />
          저장하고 완료
        </button>
      </div>
    </section>
  );
}
