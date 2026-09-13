import { describe, expect, it } from "vitest";
import { parseConfigFileTextToJson } from "typescript";
import { editorSceneInputSchema } from "@/pages/editor/messaging/editorSceneSchema";
import { normalizeSceneInput } from "@/pages/editor/messaging/normalizeSceneInput";
import { serializeSceneOutput } from "@/pages/editor/messaging/serializeSceneOutput";
import inputSceneExplanation from "./examples/input-scene.example.jsonc?raw";
import {
  initMessageExample,
  roundtripInputScene,
  roundtripOutputScene,
  submitMessageExample,
} from "./roundtripExamples";

describe("문서의 입력·저장 결과 비교", () => {
  it("주석이 있는 JSONC 설명과 실제 새 창에 보내는 데이터가 일치한다", () => {
    const result = parseConfigFileTextToJson(
      "input-scene.example.jsonc",
      inputSceneExplanation,
    );
    expect(result.error).toBeUndefined();
    expect(result.config).toEqual(roundtripInputScene);
  });

  it("예제 입력을 실제 정규화하고 정점을 옮기면 문서의 출력과 일치한다", () => {
    expect(editorSceneInputSchema.parse(roundtripInputScene)).toEqual(
      roundtripInputScene,
    );
    const scene = normalizeSceneInput(structuredClone(roundtripInputScene));
    const geometry = scene.layers[0].features[0].feature.geometry;
    if (geometry.type !== "Polygon") throw new Error("예제는 Polygon이어야 합니다.");
    geometry.coordinates[0][2] = [126.984, 37.5865];
    const output = serializeSceneOutput(scene);
    expect(output).toEqual(roundtripOutputScene);
    expect(editorSceneInputSchema.safeParse(output).success).toBe(true);
    const originalGeometry = roundtripInputScene.features[0].geometry;
    if (originalGeometry.type !== "Polygon")
      throw new Error("첫 도형은 Polygon입니다.");
    expect(originalGeometry.coordinates[0][2]).toEqual([126.982, 37.5855]);
  });

  it("경로와 마커의 수정 좌표를 같은 ID·업무 속성과 함께 반환한다", () => {
    const scene = normalizeSceneInput(structuredClone(roundtripInputScene));
    const route = scene.layers.find((layer) =>
      layer.features.some((feature) => feature.id === "gyeongbokgung-route"),
    )?.features[0];
    const marker = scene.layers.find((layer) =>
      layer.features.some((feature) => feature.id === "gyeongbokgung-marker"),
    )?.features[0];
    if (route?.feature.geometry.type !== "LineString") throw new Error("경로 없음");
    if (marker?.feature.geometry.type !== "Point") throw new Error("마커 없음");
    route.feature.geometry.coordinates[1] = [126.977, 37.5805];
    marker.feature.geometry.coordinates = [126.975, 37.5775];
    const output = serializeSceneOutput(scene);
    expect(editorSceneInputSchema.parse(output)).toEqual(output);
    expect(output.features).toHaveLength(3);
    expect(output.features.find((feature) => feature.id === route.id)).toEqual({
      ...roundtripInputScene.features.find((feature) => feature.id === route.id),
      geometry: {
        type: "LineString",
        coordinates: [
          [126.976, 37.577],
          [126.977, 37.5805],
          [126.979, 37.5815],
        ],
      },
    });
    expect(output.features.find((feature) => feature.id === marker.id)).toEqual({
      ...roundtripInputScene.features.find((feature) => feature.id === marker.id),
      geometry: { type: "Point", coordinates: [126.975, 37.5775] },
    });
    expect(output.features[0]).toEqual(roundtripInputScene.features[0]);
  });

  it("표시한 INIT과 SUBMIT JSON은 동일 회차와 실제 입출력 계약을 사용한다", () => {
    const init = JSON.parse(initMessageExample);
    const submit = JSON.parse(submitMessageExample);
    expect(init).toEqual({
      type: "MAP_EDITOR_INIT",
      sessionId: "edit-example-1",
      scene: roundtripInputScene,
    });
    expect(submit).toEqual({
      type: "MAP_EDITOR_SUBMIT",
      sessionId: init.sessionId,
      scene: roundtripOutputScene,
    });
    expect(editorSceneInputSchema.safeParse(init.scene).success).toBe(true);
    expect(editorSceneInputSchema.safeParse(submit.scene).success).toBe(true);
  });
});
