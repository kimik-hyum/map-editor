import { describe, expect, it } from "vitest";
import { EditorMessageType, type EditorSceneInput } from "../types/editorTypes";
import { createCancelMessage, createSubmitMessage } from "./editorMessageChannel";
import { parseEditorCompletionMessage } from "./editorCompletionSchema";
import { normalizeSceneInput } from "./normalizeSceneInput";

const sceneInput: EditorSceneInput = {
  version: 2,
  features: [
    {
      id: "feature-a",
      geometry: { type: "Point", coordinates: [127, 37.5] },
    },
  ],
};

describe("editor completion messages", () => {
  it("SUBMIT은 sessionId와 공개 v2 scene을 만들고 검증한다", () => {
    const message = createSubmitMessage(
      "session-submit",
      normalizeSceneInput(sceneInput),
    );

    expect(parseEditorCompletionMessage(message)).toEqual(message);
    expect(message.type).toBe(EditorMessageType.Submit);
    expect(message.scene.version).toBe(2);
    expect(message.scene).not.toHaveProperty("layers");
  });

  it("CANCEL은 sessionId만 반환한다", () => {
    const message = createCancelMessage("session-cancel");

    expect(parseEditorCompletionMessage(message)).toEqual({
      type: EditorMessageType.Cancel,
      sessionId: "session-cancel",
    });
  });

  it("내부 v1 scene이나 sessionId가 없는 완료 메시지는 거부한다", () => {
    expect(
      parseEditorCompletionMessage({
        type: EditorMessageType.Submit,
        sessionId: "session-invalid",
        scene: normalizeSceneInput(sceneInput),
      }),
    ).toBeNull();
    expect(parseEditorCompletionMessage({ type: EditorMessageType.Cancel })).toBeNull();
  });
});
