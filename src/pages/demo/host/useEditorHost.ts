import { useCallback, useEffect, useRef, useState } from "react";
import { sampleEditorScene } from "../fixtures/sampleEditorScene";
import {
  createInitMessage,
  getMessageType,
  isAllowedParentOrigin,
} from "../../editor/messaging";
import { EditorMessageType } from "../../editor/types/editorTypes";

export type EditorHostStatus = "idle" | "opening" | "connected" | "closed" | "error";

const EDITOR_WINDOW_NAME = "map-editor-child";
const EDITOR_WINDOW_FEATURES = "width=1280,height=860";

// demo(부모/호스트) 측 흐름입니다. 에디터를 새 창으로 열고,
// 자식이 보낸 MAP_EDITOR_READY에 응답해 MAP_EDITOR_INIT으로 샘플 scene을 전달합니다.
export function useEditorHost() {
  const [status, setStatus] = useState<EditorHostStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const childRef = useRef<Window | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const initSentRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearInterval(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (event.source !== childRef.current || !isAllowedParentOrigin(event.origin)) {
        return;
      }

      const messageType = getMessageType(event.data);

      if (messageType === EditorMessageType.Ready) {
        // 한 창당 INIT은 1회만 보낸다. StrictMode 개발 모드의 중복 READY 등에도 견고하게 동작한다.
        if (initSentRef.current) {
          return;
        }

        const sessionId = sessionIdRef.current ?? crypto.randomUUID();
        sessionIdRef.current = sessionId;
        initSentRef.current = true;
        childRef.current?.postMessage(
          createInitMessage(sessionId, sampleEditorScene),
          event.origin,
        );
        setStatus("connected");
        return;
      }

      if (messageType === EditorMessageType.Error) {
        const message = (event.data as { message?: string }).message;
        setErrorMessage(message ?? "에디터에서 오류를 반환했습니다.");
        setStatus("error");
      }
    }

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      clearCloseTimer();
    };
  }, [clearCloseTimer]);

  const openEditor = useCallback(() => {
    const child = window.open("/editor", EDITOR_WINDOW_NAME, EDITOR_WINDOW_FEATURES);

    if (!child) {
      setStatus("error");
      setErrorMessage("팝업이 차단되었습니다. 브라우저 팝업 허용 후 다시 시도하세요.");
      return;
    }

    childRef.current = child;
    sessionIdRef.current = null;
    initSentRef.current = false;
    setErrorMessage(null);
    setStatus("opening");

    clearCloseTimer();
    closeTimerRef.current = window.setInterval(() => {
      if (childRef.current?.closed) {
        clearCloseTimer();
        childRef.current = null;
        setStatus("closed");
      }
    }, 500);
  }, [clearCloseTimer]);

  return { status, errorMessage, openEditor };
}
