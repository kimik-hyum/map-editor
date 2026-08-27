import { useCallback, useEffect, useRef } from "react";
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

// 부모 창이 있을 때(window.opener) postMessage 핸드셰이크를 처리합니다.
// 마운트 시 데이터 없는 MAP_EDITOR_READY를 보내고, 첫 유효 INIT의 origin을 이 팝업의
// 통신 상대로 고정합니다. ERROR·SUBMIT·CANCEL은 연결된 정확한 origin에만 반환합니다.
type ConnectedParent = {
  window: Window;
  origin: string;
};

export type EditorMessagingController = {
  submit: () => boolean;
  cancel: () => boolean;
};

export function useEditorMessaging(): EditorMessagingController {
  const initializeFromMessage = useEditorStore((state) => state.initializeFromMessage);
  const connectedParentRef = useRef<ConnectedParent | null>(null);

  const submit = useCallback(() => {
    const parent = connectedParentRef.current;
    const { sessionId, scene } = useEditorStore.getState();
    if (!parent || !sessionId || !scene) {
      return false;
    }

    parent.window.postMessage(createSubmitMessage(sessionId, scene), parent.origin);
    return true;
  }, []);

  const cancel = useCallback(() => {
    const parent = connectedParentRef.current;
    const { sessionId } = useEditorStore.getState();
    if (!parent || !sessionId) {
      return false;
    }

    parent.window.postMessage(createCancelMessage(sessionId), parent.origin);
    return true;
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

  return { submit, cancel };
}
