import { useCallback, useEffect, useRef, useState } from "react";
import { cancelAllConfirmationDialogs } from "@/shared/ui/confirmation-dialog";
import { useEditorStore } from "../state/editorStore";
import { EditorMessageType } from "../types/editorTypes";
import {
  createCancelMessage,
  createErrorMessage,
  createReadyMessage,
  createSubmitMessage,
  getMessageType,
  isAllowedParentOrigin,
  resolveReadyTargetOrigins,
} from "./editorMessageChannel";
import { parseInitMessage } from "./editorSceneSchema";
import { parseEditorCompletionMessage } from "./editorCompletionSchema";

// 부모 창이 있을 때(window.opener) postMessage 핸드셰이크를 처리합니다.
// 마운트 시 데이터 없는 MAP_EDITOR_READY를 보내고, 첫 유효 INIT의 origin을 이 팝업의
// 통신 상대로 고정합니다. ERROR·SUBMIT·CANCEL은 연결된 정확한 origin에만 반환합니다.
type ConnectedParent = {
  window: Window;
  origin: string;
};

export type EditorMessagingController = {
  errorMessage: string | null;
  submit: () => boolean;
  cancel: () => boolean;
};

export function useEditorMessaging(): EditorMessagingController {
  const initializeFromMessage = useEditorStore((state) => state.initializeFromMessage);
  const connectedParentRef = useRef<ConnectedParent | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const submit = useCallback(() => {
    const parent = connectedParentRef.current;
    const { sessionId, scene } = useEditorStore.getState();
    setErrorMessage(null);
    if (!parent || !sessionId || !scene || parent.window.closed) {
      setErrorMessage(
        "부모 창과 연결되어 있지 않아 저장할 수 없습니다. 부모 창을 확인하세요.",
      );
      return false;
    }

    try {
      const message = createSubmitMessage(sessionId, scene);
      // 내부 validation 플래그만 믿지 않고 부모가 받는 공개 데이터 전체를 다시 검증합니다.
      if (!parseEditorCompletionMessage(message)) {
        setErrorMessage(
          "저장할 수 없는 도형 데이터가 있습니다. 최근 편집을 실행 취소한 뒤 다시 시도하세요.",
        );
        return false;
      }
      parent.window.postMessage(message, parent.origin);
      return true;
    } catch {
      setErrorMessage(
        "편집 결과를 전송하지 못했습니다. 부모 창을 확인한 뒤 다시 저장하세요.",
      );
      return false;
    }
  }, []);

  const cancel = useCallback(() => {
    const parent = connectedParentRef.current;
    const { sessionId } = useEditorStore.getState();
    setErrorMessage(null);
    if (!parent || !sessionId || parent.window.closed) {
      setErrorMessage("부모 창과 연결되어 있지 않아 취소 결과를 전송할 수 없습니다.");
      return false;
    }

    try {
      parent.window.postMessage(createCancelMessage(sessionId), parent.origin);
      return true;
    } catch {
      setErrorMessage(
        "취소 결과를 전송하지 못했습니다. 부모 창을 확인한 뒤 다시 시도하세요.",
      );
      return false;
    }
  }, []);

  useEffect(() => {
    const opener = window.opener as Window | null;

    if (!opener) {
      return;
    }

    const parentWindow = opener;
    let connectedOrigin: string | null = null;

    function handleMessage(event: MessageEvent) {
      if (event.source !== parentWindow) {
        return;
      }

      if (
        connectedOrigin !== null
          ? event.origin !== connectedOrigin
          : !isAllowedParentOrigin(event.origin)
      ) {
        return;
      }

      if (getMessageType(event.data) !== EditorMessageType.Init) {
        return;
      }

      const parsed = parseInitMessage(event.data);

      if (parsed.ok) {
        connectedOrigin ??= event.origin;
        connectedParentRef.current = {
          window: parentWindow,
          origin: connectedOrigin,
        };
        // 이전 scene에서 열린 확인과 대기 Promise가 새 session의 상태를 뒤늦게 바꾸지 않게 합니다.
        cancelAllConfirmationDialogs();
        setErrorMessage(null);
        initializeFromMessage(parsed.message);
        return;
      }

      parentWindow.postMessage(
        createErrorMessage(parsed.message, parsed.issues),
        event.origin,
      );
    }

    window.addEventListener("message", handleMessage);
    for (const targetOrigin of resolveReadyTargetOrigins()) {
      parentWindow.postMessage(createReadyMessage(), targetOrigin);
    }

    return () => {
      window.removeEventListener("message", handleMessage);
      if (connectedParentRef.current?.window === parentWindow) {
        connectedParentRef.current = null;
      }
    };
  }, [initializeFromMessage]);

  return { submit, cancel, errorMessage };
}
