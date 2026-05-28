import { sampleEditorDocument } from "../fixtures/sampleEditorDocument";
import { EditorMessageType, type EditorInitMessage } from "../types/editorTypes";

// 실제 postMessage 연동 전까지 외부 부모 창이 보낸 초기화 메시지를 임시로 흉내냅니다.
export const sampleEditorDocumentInitMessage: EditorInitMessage = {
  type: EditorMessageType.Init,
  sessionId: "temp-sample-editor-session",
  document: sampleEditorDocument,
};
