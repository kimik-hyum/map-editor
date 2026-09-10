import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth, useBoundaryAccess } from "@/features/auth";
import { confirmDialog } from "@/shared/ui/confirmation-dialog";
import { useEditorStore } from "@/pages/editor/state/editorStore";

export function useBoundaryLogin() {
  const { allowed } = useBoundaryAccess();
  const { error, signInWithGoogle } = useAuth();
  const controllerRef = useRef<AbortController | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showError, setShowError] = useState(false);

  const cancel = useCallback(() => {
    controllerRef.current?.abort();
    setShowError(false);
  }, []);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const requestBoundaryAccess = useCallback(async () => {
    if (allowed) {
      return true;
    }
    if (controllerRef.current) {
      return false;
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    setShowError(false);
    const context = useEditorStore.getState();
    // OAuth를 기다리는 중 새 INIT/편집/메뉴 변경이 오면 기존 로그인 의도를 폐기합니다.
    const unsubscribe = useEditorStore.subscribe((state) => {
      if (
        state.sessionId !== context.sessionId ||
        state.scene !== context.scene ||
        state.activeMode !== context.activeMode
      ) {
        controller.abort();
      }
    });

    try {
      const confirmed = await confirmDialog({
        title: "경계 데이터를 사용하려면 로그인해주세요",
        description:
          "일반 편집은 로그인 없이 사용할 수 있습니다. Google 로그인은 별도 창에서 진행되며, 부모 창에서 받은 데이터와 편집 내용은 그대로 유지됩니다.",
        confirmLabel: "Google로 로그인",
        cancelLabel: "취소",
        initialFocus: "cancel",
      });
      if (!confirmed || controller.signal.aborted) {
        return false;
      }
      setIsSigningIn(true);
      const success = await signInWithGoogle(controller.signal);
      if (controller.signal.aborted) {
        return false;
      }
      setShowError(!success);
      return success;
    } finally {
      unsubscribe();
      controllerRef.current = null;
      setIsSigningIn(false);
    }
  }, [allowed, signInWithGoogle]);

  return {
    requestBoundaryAccess,
    isSigningIn,
    error: showError ? error : null,
    cancel,
  };
}
