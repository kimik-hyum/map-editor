import { useCallback, useEffect, useMemo, useRef } from "react";
import type { EditorMessagingController } from "@/pages/editor/messaging";
import { useEditorStore } from "@/pages/editor/state/editorStore";
import { ValidationState } from "@/pages/editor/types/editorTypes";
import { confirmDialog } from "@/shared/ui/confirmation-dialog";

type UseEditorSessionActionsOptions = {
  messaging: EditorMessagingController;
  hasPendingToolAction: boolean;
};

export function useEditorSessionActions({
  messaging,
  hasPendingToolAction,
}: UseEditorSessionActionsOptions) {
  const sessionId = useEditorStore((state) => state.sessionId);
  const scene = useEditorStore((state) => state.scene);
  const dirty = useEditorStore((state) => state.dirty);
  const completedSessionIdRef = useRef<string | null>(null);
  const pendingToolActionRef = useRef(hasPendingToolAction);
  pendingToolActionRef.current = hasPendingToolAction;

  const invalidFeatureCount = useMemo(
    () =>
      scene?.layers.reduce(
        (count, layer) =>
          count +
          layer.features.filter(
            (feature) => feature.state.validation === ValidationState.Invalid,
          ).length,
        0,
      ) ?? 0,
    [scene],
  );

  // 브라우저 닫기/새로고침도 미저장 편집을 잃는 경로이므로 native 이탈 확인을 붙입니다.
  // 완료·취소 메시지를 정상 전송한 뒤 부모가 팝업을 닫는 경우에는 다시 묻지 않습니다.
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      const current = useEditorStore.getState();
      if (
        (!current.dirty && !pendingToolActionRef.current) ||
        (completedSessionIdRef.current !== null &&
          current.sessionId === completedSessionIdRef.current)
      ) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  const submit = useCallback(() => {
    const current = useEditorStore.getState();
    const hasInvalidFeature =
      current.scene?.layers.some((layer) =>
        layer.features.some(
          (feature) => feature.state.validation === ValidationState.Invalid,
        ),
      ) ?? false;

    if (
      hasPendingToolAction ||
      !current.scene ||
      !current.sessionId ||
      hasInvalidFeature
    ) {
      return false;
    }

    completedSessionIdRef.current = current.sessionId;
    const sent = messaging.submit();
    if (!sent) {
      completedSessionIdRef.current = null;
    }
    return sent;
  }, [hasPendingToolAction, messaging]);

  const cancel = useCallback(async () => {
    if (hasPendingToolAction) {
      return false;
    }

    const contextAtRequest = useEditorStore.getState();
    if (!contextAtRequest.scene || !contextAtRequest.sessionId) {
      return false;
    }

    if (contextAtRequest.dirty) {
      const confirmed = await confirmDialog({
        title: "편집을 취소할까요?",
        description:
          "저장하지 않은 변경사항은 부모 창으로 전달되지 않고 모두 사라집니다.",
        confirmLabel: "저장하지 않고 닫기",
        cancelLabel: "계속 편집",
        tone: "danger",
        initialFocus: "cancel",
      });
      const current = useEditorStore.getState();
      if (
        !confirmed ||
        current.scene !== contextAtRequest.scene ||
        current.sessionId !== contextAtRequest.sessionId
      ) {
        return false;
      }
    }

    completedSessionIdRef.current = contextAtRequest.sessionId;
    const sent = messaging.cancel();
    if (!sent) {
      completedSessionIdRef.current = null;
    }
    return sent;
  }, [hasPendingToolAction, messaging]);

  const isReady = scene !== null && sessionId !== null;
  const submitBlockedReason = hasPendingToolAction
    ? "진행 중인 도형 작업을 먼저 완료하거나 취소하세요."
    : invalidFeatureCount > 0
      ? `오류가 있는 도형 ${invalidFeatureCount}개를 수정해야 완료할 수 있습니다.`
      : null;

  return {
    isReady,
    dirty,
    invalidFeatureCount,
    submitBlockedReason,
    canSubmit: isReady && submitBlockedReason === null,
    canCancel: isReady && !hasPendingToolAction,
    submit,
    cancel,
  };
}
