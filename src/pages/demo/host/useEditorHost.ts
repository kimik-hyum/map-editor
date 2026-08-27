import { useCallback, useEffect, useRef, useState } from "react";
import { sampleSceneInput } from "../fixtures/sampleEditorScene";
import {
  createInitMessage,
  getMessageType,
  parseEditorCompletionMessage,
} from "@/pages/editor/messaging";
import {
  EditorMessageType,
  type EditorSceneInput,
} from "@/pages/editor/types/editorTypes";

export type EditorHostStatus =
  | "idle"
  | "opening"
  | "connected"
  | "submitted"
  | "cancelled"
  | "closed"
  | "error";

const EDITOR_WINDOW_NAME = "map-editor-child";
const EDITOR_WINDOW_FEATURES = "width=1280,height=860";

// demo(부모/호스트) 측 흐름입니다. 에디터를 새 창으로 열고,
// 자식이 보낸 MAP_EDITOR_READY에 응답해 MAP_EDITOR_INIT으로 샘플 scene을 전달합니다.
export function useEditorHost() {
  const [status, setStatus] = useState<EditorHostStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedScene, setSubmittedScene] = useState<EditorSceneInput | null>(null);
  const childRef = useRef<Window | null>(null);
  const childOriginRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const closeTimerRef = useRef<number | null>(null);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearInterval(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const closeChild = useCallback(() => {
    clearCloseTimer();
    childRef.current?.close();
    childRef.current = null;
    childOriginRef.current = null;
    sessionIdRef.current = null;
  }, [clearCloseTimer]);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      if (
        event.source !== childRef.current ||
        event.origin !== childOriginRef.current
      ) {
        return;
      }

      const messageType = getMessageType(event.data);

      if (messageType === EditorMessageType.Ready) {
        // READY -> INIT은 idempotent하게 응답한다. 같은 창의 재마운트/새로고침으로 다시 온
        // READY에도 INIT을 보내야 에디터가 복구된다. 세션 ID는 창 단위로 유지한다.
        const sessionId = sessionIdRef.current ?? crypto.randomUUID();
        sessionIdRef.current = sessionId;
        childRef.current?.postMessage(
          createInitMessage(sessionId, sampleSceneInput),
          childOriginRef.current,
        );
        setStatus("connected");
        return;
      }

      if (messageType === EditorMessageType.Error) {
        const message = (event.data as { message?: string }).message;
        setErrorMessage(message ?? "에디터에서 오류를 반환했습니다.");
        setStatus("error");
        return;
      }

      if (
        messageType === EditorMessageType.Submit ||
        messageType === EditorMessageType.Cancel
      ) {
        const message = parseEditorCompletionMessage(event.data);
        if (!message || message.sessionId !== sessionIdRef.current) {
          return;
        }

        if (message.type === EditorMessageType.Submit) {
          setSubmittedScene(message.scene);
          setStatus("submitted");
        } else {
          setSubmittedScene(null);
          setStatus("cancelled");
        }
        // 메시지를 검증하고 결과를 보관한 뒤 부모가 자신이 연 팝업을 닫습니다.
        closeChild();
      }
    }

    window.addEventListener("message", handleMessage);
    return () => {
      window.removeEventListener("message", handleMessage);
      clearCloseTimer();
    };
  }, [clearCloseTimer, closeChild]);

  const openEditor = useCallback(() => {
    const editorUrl = new URL("/editor", window.location.href);
    const child = window.open(
      editorUrl.href,
      EDITOR_WINDOW_NAME,
      EDITOR_WINDOW_FEATURES,
    );

    if (!child) {
      setStatus("error");
      setErrorMessage("팝업이 차단되었습니다. 브라우저 팝업 허용 후 다시 시도하세요.");
      return;
    }

    childRef.current = child;
    childOriginRef.current = editorUrl.origin;
    sessionIdRef.current = null;
    setErrorMessage(null);
    setSubmittedScene(null);
    setStatus("opening");

    clearCloseTimer();
    closeTimerRef.current = window.setInterval(() => {
      if (childRef.current?.closed) {
        clearCloseTimer();
        childRef.current = null;
        childOriginRef.current = null;
        setStatus("closed");
      }
    }, 500);
  }, [clearCloseTimer]);

  return { status, errorMessage, submittedScene, openEditor };
}
