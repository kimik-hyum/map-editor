import { z } from "zod";
import {
  EditorMessageType,
  type EditorCancelMessage,
  type EditorSubmitMessage,
} from "../types/editorTypes";
import { editorSceneInputSchema } from "./editorSceneSchema";

const editorSubmitMessageSchema = z.object({
  type: z.literal(EditorMessageType.Submit),
  sessionId: z.string(),
  scene: editorSceneInputSchema,
});

const editorCancelMessageSchema = z.object({
  type: z.literal(EditorMessageType.Cancel),
  sessionId: z.string(),
});

const editorCompletionMessageSchema = z.discriminatedUnion("type", [
  editorSubmitMessageSchema,
  editorCancelMessageSchema,
]);

export type EditorCompletionMessage = EditorSubmitMessage | EditorCancelMessage;

// 데모 호스트도 자식 창에서 온 완료 메시지를 신뢰하기 전에 런타임 검증합니다.
export function parseEditorCompletionMessage(
  data: unknown,
): EditorCompletionMessage | null {
  const result = editorCompletionMessageSchema.safeParse(data);
  return result.success ? (result.data as EditorCompletionMessage) : null;
}
