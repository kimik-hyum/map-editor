import { useEffect } from "react";
import { useEditorStore } from "../state/editorStore";
import { sampleEditorDocumentInitMessage } from "./sampleEditorDocumentMessage";

// 실제 postMessage 수신 훅이 생기기 전까지 샘플 init message를 store에 주입합니다.
export function useTempEditorDocumentMessage() {
  const document = useEditorStore((state) => state.document);
  const initializeFromMessage = useEditorStore(
    (state) => state.initializeFromMessage,
  );

  useEffect(() => {
    if (document) {
      return;
    }

    initializeFromMessage(sampleEditorDocumentInitMessage);
  }, [document, initializeFromMessage]);
}
