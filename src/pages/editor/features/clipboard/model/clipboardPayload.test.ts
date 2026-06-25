import { describe, expect, it } from "vitest";
import {
  FeatureLifecycle,
  GeometryKind,
  SelectionState,
  ValidationState,
  type EditorFeature,
} from "../../../types/editorTypes";
import {
  EDITOR_CLIPBOARD_KIND,
  featureToClipboardInput,
  parseClipboardPayload,
  serializeClipboardPayload,
} from "./clipboardPayload";

function sampleFeature(): EditorFeature {
  return {
    id: "feature-1",
    name: "구역 가",
    geometryKind: GeometryKind.Polygon,
    feature: {
      type: "Feature",
      id: "feature-1",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 0],
          ],
        ],
      },
      properties: { label: "구역 가", note: "메모" },
    },
    state: {
      selection: SelectionState.None,
      lifecycle: FeatureLifecycle.Clean,
      validation: ValidationState.Valid,
      issues: [],
    },
    style: { themeToken: "editable" },
  };
}

describe("featureToClipboardInput", () => {
  it("geometry·name·themeToken·properties를 옮긴다", () => {
    const input = featureToClipboardInput(sampleFeature());

    expect(input.geometry.type).toBe("Polygon");
    expect(input.name).toBe("구역 가");
    expect(input.themeToken).toBe("editable");
    expect(input.properties).toEqual({ label: "구역 가", note: "메모" });
  });

  it("id·locked는 제외한다(붙여넣기 시 새 id·편집 가능)", () => {
    const input = featureToClipboardInput(sampleFeature());

    expect("id" in input).toBe(false);
    expect("locked" in input).toBe(false);
  });
});

describe("clipboard 직렬화/역직렬화", () => {
  it("라운드트립으로 도형 입력을 보존한다", () => {
    const inputs = [featureToClipboardInput(sampleFeature())];
    const parsed = parseClipboardPayload(serializeClipboardPayload(inputs));

    expect(parsed).toEqual(inputs);
  });

  it("kind 판별자를 포함해 직렬화한다", () => {
    const text = serializeClipboardPayload([featureToClipboardInput(sampleFeature())]);

    expect(JSON.parse(text).kind).toBe(EDITOR_CLIPBOARD_KIND);
  });
});

describe("parseClipboardPayload 거부", () => {
  it("빈 문자열은 null", () => {
    expect(parseClipboardPayload("")).toBeNull();
  });

  it("JSON이 아니면 null", () => {
    expect(parseClipboardPayload("not-json{")).toBeNull();
  });

  it("kind가 다르면 null(타 앱 클립보드 텍스트)", () => {
    const text = JSON.stringify({ kind: "other-app", version: 1, features: [] });

    expect(parseClipboardPayload(text)).toBeNull();
  });

  it("version이 다르면 null", () => {
    const text = JSON.stringify({
      kind: EDITOR_CLIPBOARD_KIND,
      version: 99,
      features: [],
    });

    expect(parseClipboardPayload(text)).toBeNull();
  });

  it("지원하지 않는 geometry(Point)는 null", () => {
    const text = JSON.stringify({
      kind: EDITOR_CLIPBOARD_KIND,
      version: 1,
      features: [{ geometry: { type: "Point", coordinates: [0, 0] } }],
    });

    expect(parseClipboardPayload(text)).toBeNull();
  });
});
