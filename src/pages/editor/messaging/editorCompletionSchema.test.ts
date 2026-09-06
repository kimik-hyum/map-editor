import { describe, expect, it } from "vitest";
import union from "@turf/union";
import { feature, featureCollection } from "@turf/helpers";
import { unionGeometries } from "../features/geometry-ops/model/booleanOps";
import {
  UNION_REGRESSION_TARGET,
  UNION_REGRESSION_BOUNDARY,
} from "../features/geometry-ops/model/fixtures/degenerateUnion";
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
  it("각각 유효한 경계의 병합에서 생긴 퇴화 ring을 정리해 저장 검증을 통과한다", () => {
    const completion = (geometry: unknown) => ({
      type: EditorMessageType.Submit,
      sessionId: "boundary-regression",
      scene: { version: 2, features: [{ geometry }] },
    });
    expect(
      parseEditorCompletionMessage(completion(UNION_REGRESSION_TARGET)),
    ).not.toBeNull();
    expect(
      parseEditorCompletionMessage(completion(UNION_REGRESSION_BOUNDARY)),
    ).not.toBeNull();
    const raw = union(
      featureCollection([
        feature(UNION_REGRESSION_TARGET),
        feature(UNION_REGRESSION_BOUNDARY),
      ]),
    );
    expect(parseEditorCompletionMessage(completion(raw?.geometry))).toBeNull();
    const repaired = unionGeometries(
      UNION_REGRESSION_TARGET,
      UNION_REGRESSION_BOUNDARY,
    );
    expect(repaired).not.toBeNull();
    expect(parseEditorCompletionMessage(completion(repaired))).not.toBeNull();
    expect(repaired?.coordinates[0]).toEqual(raw?.geometry.coordinates[0]);
  });

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
    expect(
      parseEditorCompletionMessage({
        type: EditorMessageType.Cancel,
        sessionId: "",
      }),
    ).toBeNull();
  });
});
