import { describe, expect, it } from "vitest";
import {
  EditabilityState,
  EditorMessageType,
  GeometryKind,
  SelectionState,
} from "../types/editorTypes";
import { parseInitMessage } from "./editorSceneSchema";

// v2 최소 입력(레이어 단계 없는 도형 목록). parseInitMessage가 검증 후
// 도형 하나당 내부 레이어 하나로 normalize한다.
const validInput = {
  type: EditorMessageType.Init,
  sessionId: "session-1",
  scene: {
    version: 2,
    id: "test-scene",
    name: "테스트 씬",
    features: [
      {
        name: "도형",
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [126.9, 37.5],
              [127.0, 37.5],
              [127.0, 37.6],
            ],
          ],
        },
      },
    ],
  },
};

describe("parseInitMessage", () => {
  it("유효한 v2 입력을 통과시키고 내부 scene으로 normalize한다", () => {
    const result = parseInitMessage(validInput);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const { scene } = result.message;
      expect(result.message.sessionId).toBe("session-1");
      expect(scene.version).toBe(1); // 내부 모델 버전
      expect(scene.layers).toHaveLength(1); // 도형 1개 = 내부 레이어 1개
      // 잠금 미입력 → 편집 가능 기본값
      expect(scene.layers[0].behavior.editability).toBe(EditabilityState.Editable);
      const feature = scene.layers[0].features[0];
      expect(feature.id).toBeTruthy(); // 자동 생성
      expect(feature.geometryKind).toBe(GeometryKind.Polygon); // 파생
      expect(feature.state.selection).toBe(SelectionState.None); // 기본 state
    }
  });

  it("객체가 아니거나 타입이 틀리면 거부한다", () => {
    expect(parseInitMessage(null).ok).toBe(false);
    expect(parseInitMessage({ type: "WRONG", sessionId: "s", scene: {} }).ok).toBe(
      false,
    );
  });

  it("version이 2가 아니면 거부한다", () => {
    const result = parseInitMessage({
      ...validInput,
      scene: { ...validInput.scene, version: 1 },
    });
    expect(result.ok).toBe(false);
  });

  it("features가 없으면 검증 이슈를 반환한다", () => {
    const result = parseInitMessage({
      type: EditorMessageType.Init,
      sessionId: "s",
      scene: { version: 2 },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].code).toBe("invalidPayload");
    }
  });

  it("도형에 geometry가 없으면 거부한다", () => {
    const result = parseInitMessage({
      type: EditorMessageType.Init,
      sessionId: "s",
      scene: { version: 2, features: [{ name: "x" }] },
    });
    expect(result.ok).toBe(false);
  });

  it("좌표 구조가 잘못되면 거부한다", () => {
    const result = parseInitMessage({
      type: EditorMessageType.Init,
      sessionId: "s",
      scene: {
        version: 2,
        features: [{ geometry: { type: "Polygon", coordinates: [[[1]]] } }],
      },
    });
    expect(result.ok).toBe(false);
  });

  it("폴리곤이 아닌 geometry는 거부한다(현재 렌더 미지원)", () => {
    const result = parseInitMessage({
      type: EditorMessageType.Init,
      sessionId: "s",
      scene: {
        version: 2,
        features: [
          {
            geometry: {
              type: "LineString",
              coordinates: [
                [126.9, 37.5],
                [127.0, 37.6],
              ],
            },
          },
        ],
      },
    });
    expect(result.ok).toBe(false);
  });

  it("중복된 도형 id는 거부한다", () => {
    const polygon = {
      type: "Polygon",
      coordinates: [
        [
          [126.9, 37.5],
          [127.0, 37.5],
          [127.0, 37.6],
        ],
      ],
    };
    const result = parseInitMessage({
      type: EditorMessageType.Init,
      sessionId: "s",
      scene: {
        version: 2,
        features: [
          { id: "dup", geometry: polygon },
          { id: "dup", geometry: polygon },
        ],
      },
    });
    expect(result.ok).toBe(false);
  });
});
