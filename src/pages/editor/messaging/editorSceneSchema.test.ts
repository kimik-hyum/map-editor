import { describe, expect, it } from "vitest";
import { sampleEditorScene } from "../fixtures/sampleEditorScene";
import { EditorMessageType } from "../types/editorTypes";
import { parseInitMessage } from "./editorSceneSchema";

const validInitMessage = {
  type: EditorMessageType.Init,
  sessionId: "session-1",
  scene: sampleEditorScene,
};

describe("parseInitMessage", () => {
  it("유효한 init 메시지를 통과시킨다", () => {
    const result = parseInitMessage(validInitMessage);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.message.sessionId).toBe("session-1");
      expect(result.message.scene.layers.length).toBeGreaterThan(0);
    }
  });

  it("객체가 아니거나 타입이 틀리면 거부한다", () => {
    expect(parseInitMessage(null).ok).toBe(false);
    expect(parseInitMessage({ type: "WRONG", sessionId: "s", scene: {} }).ok).toBe(
      false,
    );
  });

  it("scene 구조가 어긋나면 검증 이슈를 반환한다", () => {
    const result = parseInitMessage({
      type: EditorMessageType.Init,
      sessionId: "session-1",
      scene: { version: 1 }, // layers 누락
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].code).toBe("invalidPayload");
    }
  });

  it("좌표 구조가 잘못되면 거부한다", () => {
    const result = parseInitMessage({
      type: EditorMessageType.Init,
      sessionId: "session-1",
      scene: {
        version: 1,
        layers: [
          {
            id: "l1",
            name: "레이어",
            roles: ["editable"],
            geometryKinds: ["polygon"],
            view: { visibility: "visible", opacity: 1, zIndex: 1, labelVisible: true },
            behavior: {
              lock: "unlocked",
              editability: "editable",
              selectable: true,
              deletable: true,
              draggable: true,
            },
            features: [
              {
                id: "f1",
                geometryKind: "polygon",
                feature: {
                  type: "Feature",
                  geometry: { type: "Polygon", coordinates: [[[1]]] }, // 좌표가 [number, number] 아님
                },
                state: {
                  selection: "none",
                  lifecycle: "clean",
                  validation: "valid",
                  issues: [],
                },
              },
            ],
          },
        ],
      },
    });

    expect(result.ok).toBe(false);
  });
});
