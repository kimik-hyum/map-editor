import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMapEditorHost } from "./map-editor-host.example";
import { inputScene } from "./input-scene.example";
import { bindMapEditor } from "./service-page.example";
import type { EditorSceneInput } from "./editor-contract.example";

const handlers = vi.hoisted(() => ({ open: vi.fn(), dispose: vi.fn() }));
vi.mock("./map-editor-host.example", () => ({
  createMapEditorHost: vi.fn(() => handlers),
}));

beforeEach(() => {
  vi.mocked(createMapEditorHost).mockClear();
  handlers.open.mockReset();
  handlers.dispose.mockReset();
});

function setup() {
  let scene: EditorSceneInput = structuredClone(inputScene);
  const button = new EventTarget() as HTMLButtonElement;
  const renderOnMap = vi.fn();
  const showEditorError = vi.fn();
  const cleanup = bindMapEditor({
    editorUrl: "https://editor.example/editor/",
    openButton: button,
    getScene: () => scene,
    applyScene: (result) => {
      scene = result;
    },
    renderOnMap,
    showEditorError,
  });
  const connection = vi.mocked(createMapEditorHost).mock.calls[0][0];
  return { button, renderOnMap, showEditorError, cleanup, connection };
}

describe("서비스 지도와 연결하는 복사용 예제", () => {
  it("결과를 다음 편집의 입력으로 보관하고 GeoJSON으로 지도에 반영한다", () => {
    const s = setup();
    const edited: EditorSceneInput = structuredClone(inputScene);
    edited.features[0].name = "수정한 권역";
    edited.features[0].visible = false;
    edited.features[0].properties = { deliveryZone: "A" };
    s.connection.onSubmit(edited);
    expect(s.connection.getScene()).toEqual(edited);
    expect(s.renderOnMap).toHaveBeenCalledWith({
      type: "FeatureCollection",
      features: edited.features.map((feature) => ({
        type: "Feature",
        id: feature.id,
        geometry: feature.geometry,
        properties: {
          ...feature.properties,
          name: feature.name,
          locked: feature.locked,
          visible: feature.visible,
        },
      })),
    });
  });

  it("취소는 지도를 변경하지 않고 정리 후에는 클릭해도 창을 열지 않는다", () => {
    const s = setup();
    s.button.dispatchEvent(new Event("click"));
    expect(handlers.open).toHaveBeenCalledOnce();
    s.connection.onCancel?.();
    expect(s.renderOnMap).not.toHaveBeenCalled();
    expect(s.connection.getScene()).toEqual(inputScene);
    s.cleanup();
    s.button.dispatchEvent(new Event("click"));
    expect(handlers.open).toHaveBeenCalledOnce();
    expect(handlers.dispose).toHaveBeenCalledOnce();
  });

  it("팝업 차단 오류를 서비스의 오류 UI에 전달한다", () => {
    const s = setup();
    handlers.open.mockImplementation(() => {
      throw new Error("팝업이 차단되었습니다.");
    });
    s.button.dispatchEvent(new Event("click"));
    expect(s.showEditorError).toHaveBeenCalledWith("팝업이 차단되었습니다.");
    expect(s.renderOnMap).not.toHaveBeenCalled();
  });
});
