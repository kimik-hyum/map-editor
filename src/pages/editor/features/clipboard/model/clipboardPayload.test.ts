import { describe, expect, it } from "vitest";
import {
  EditabilityState,
  FeatureLifecycle,
  GeometryKind,
  LayerRole,
  LockState,
  SelectionState,
  ValidationState,
  VisibilityState,
  type EditorFeature,
  type EditorLayer,
  type EditorScene,
} from "../../../types/editorTypes";
import {
  collectClipboardInputs,
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

function featureLayer(id: string, name: string, zIndex: number): EditorLayer {
  return {
    id: `layer-${id}`,
    name,
    roles: [LayerRole.Editable],
    geometryKinds: [GeometryKind.Polygon],
    view: {
      visibility: VisibilityState.Visible,
      opacity: 1,
      zIndex,
      labelVisible: true,
    },
    behavior: {
      lock: LockState.Unlocked,
      editability: EditabilityState.Editable,
      selectable: true,
      deletable: true,
      draggable: true,
    },
    features: [
      {
        id,
        name,
        geometryKind: GeometryKind.Polygon,
        feature: {
          type: "Feature",
          id,
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
          properties: {},
        },
        state: {
          selection: SelectionState.None,
          lifecycle: FeatureLifecycle.Clean,
          validation: ValidationState.Valid,
          issues: [],
        },
      },
    ],
  };
}

describe("collectClipboardInputs - 시각 스택 순서", () => {
  // 배열 순서와 zIndex 순서를 일부러 어긋나게 둔다: 배열은 [위(z20), 아래(z10)]지만
  // 시각 스택 아래→위는 [아래, 위]. 패널 재정렬(zIndex만 변경) 후 상황을 재현한다.
  function stackScene(): EditorScene {
    return {
      version: 1,
      layers: [featureLayer("top", "위", 20), featureLayer("bottom", "아래", 10)],
    };
  }

  it("배열 순서가 아니라 zIndex 오름차순(아래→위)으로 모은다", () => {
    const inputs = collectClipboardInputs(stackScene(), ["top", "bottom"]);

    expect(inputs.map((input) => input.name)).toEqual(["아래", "위"]);
  });

  it("선택된 도형만 모은다", () => {
    const inputs = collectClipboardInputs(stackScene(), ["top"]);

    expect(inputs.map((input) => input.name)).toEqual(["위"]);
  });

  it("선택이 없으면 빈 배열", () => {
    expect(collectClipboardInputs(stackScene(), [])).toEqual([]);
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
