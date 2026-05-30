import { useEffect } from "react";
import { useEditorStore } from "../state/editorStore";
import { EditorMessageType } from "../types/editorTypes";
import {
  createErrorMessage,
  createReadyMessage,
  getMessageType,
  isAllowedParentOrigin,
  resolveParentTargetOrigin,
} from "./editorMessageChannel";
import { parseInitMessage } from "./editorSceneSchema";

// 부모 창이 있을 때(window.opener) postMessage 핸드셰이크를 처리합니다.
// 마운트 시 MAP_EDITOR_READY를 보내고, MAP_EDITOR_INIT을 Zod로 검증해 store에 주입하며,
// 검증 실패 시 MAP_EDITOR_ERROR를 부모 창에 반환합니다. 부모 창이 없으면 동작하지 않습니다.
export function useEditorMessaging() {
  const initializeFromMessage = useEditorStore((state) => state.initializeFromMessage);

  useEffect(() => {
    const opener = window.opener as Window | null;

    if (!opener) {
      return;
    }

    const parentWindow = opener;

    function handleMessage(event: MessageEvent) {
      if (event.source !== parentWindow || !isAllowedParentOrigin(event.origin)) {
        return;
      }

      if (getMessageType(event.data) !== EditorMessageType.Init) {
        return;
      }

      const parsed = parseInitMessage(event.data);

      if (parsed.ok) {
        initializeFromMessage(parsed.message);
        return;
      }

      parentWindow.postMessage(
        createErrorMessage(parsed.message, parsed.issues),
        event.origin,
      );
    }

    window.addEventListener("message", handleMessage);
    parentWindow.postMessage(createReadyMessage(), resolveParentTargetOrigin());

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [initializeFromMessage]);
}
