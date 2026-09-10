import Collection from "ol/Collection";
import type BaseLayer from "ol/layer/Base";
import type VectorLayer from "ol/layer/Vector";
import { toLonLat } from "ol/proj";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createOpenLayersMap } from "@/pages/editor/adapters/openlayers/createOpenLayersMap";
import type { EditorSceneInput } from "@/pages/editor/types/editorTypes";
import { createDemoMap } from "./createDemoMap";

vi.mock("@/pages/editor/adapters/openlayers/createOpenLayersMap", () => ({
  createOpenLayersMap: vi.fn(),
}));
afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

function setup() {
  const layers = new Collection<BaseLayer>();
  const fit = vi.fn();
  const dispose = vi.fn();
  const setTarget = vi.fn();
  const updateSize = vi.fn();
  const observe = vi.fn();
  const disconnect = vi.fn();
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe = observe;
      disconnect = disconnect;
    },
  );
  vi.mocked(createOpenLayersMap).mockReturnValue({
    getLayers: () => layers,
    getView: () => ({ fit }),
    dispose,
    setTarget,
    updateSize,
  } as unknown as ReturnType<typeof createOpenLayersMap>);
  const target = {} as HTMLElement;
  const map = createDemoMap(target);
  return { map, layers, fit, dispose, setTarget, observe, disconnect, target };
}

describe("부모 지도 scene 동기화", () => {
  it("도형·숨김·순서를 표시하고 동일 지도에 수정본만 다시 그린다", () => {
    const s = setup();
    const scene: EditorSceneInput = {
      version: 2,
      features: [
        {
          id: "a",
          name: "수정 전",
          geometry: { type: "Point", coordinates: [127, 37] },
        },
        {
          id: "b",
          visible: false,
          geometry: { type: "Point", coordinates: [128, 38] },
        },
      ],
    };
    s.map.sync(scene);
    expect(s.observe).toHaveBeenCalledWith(s.target);
    expect(s.layers.getLength()).toBe(2);
    expect(s.layers.item(1).getVisible()).toBe(false);
    expect(s.fit).toHaveBeenCalledOnce();
    const edited: EditorSceneInput = {
      version: 2,
      features: [
        { ...scene.features[1], visible: true },
        {
          ...scene.features[0],
          name: "수정 후",
          geometry: { type: "Point", coordinates: [126, 36] },
        },
      ],
    };
    s.map.sync(edited);
    const layer = s.layers.item(1) as VectorLayer;
    const feature = layer.getSource()?.getFeatures()[0];
    expect(feature?.get("name")).toBe("수정 후");
    expect(feature?.getId()).toBe("a");
    const extent = feature?.getGeometry()?.getExtent() ?? [];
    expect(toLonLat([extent[0], extent[1]])[0]).toBeCloseTo(126, 6);
    expect(s.layers.item(0).getVisible()).toBe(true);
    expect(s.layers.item(0).getZIndex()).toBeLessThan(layer.getZIndex() ?? 0);
    expect(createOpenLayersMap).toHaveBeenCalledOnce();
    expect(scene.features[0].name).toBe("수정 전");
  });

  it("열린 샘플 Polygon을 닫아 표시하며 전달된 원본은 변경하지 않는다", () => {
    const s = setup();
    const scene: EditorSceneInput = {
      version: 2,
      features: [
        {
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [127, 37],
                [128, 37],
                [128, 38],
              ],
            ],
          },
        },
      ],
    };
    s.map.sync(scene);
    const layer = s.layers.item(0) as VectorLayer;
    const geometry = layer.getSource()?.getFeatures()[0].getGeometry();
    expect(geometry?.getType()).toBe("Polygon");
    expect(s.fit).toHaveBeenCalledWith(expect.any(Array), {
      padding: [48, 48, 48, 48],
      maxZoom: 16,
    });
    expect(scene.features[0].geometry).toEqual({
      type: "Polygon",
      coordinates: [
        [
          [127, 37],
          [128, 37],
          [128, 38],
        ],
      ],
    });
  });

  it("모두 숨김·빈 결과에서도 유효하지 않은 fit을 하지 않고 기존 도형을 제거한다", () => {
    const s = setup();
    s.map.sync({
      version: 2,
      features: [
        { visible: false, geometry: { type: "Point", coordinates: [127, 37] } },
      ],
    });
    expect(s.fit).not.toHaveBeenCalled();
    s.map.sync({ version: 2, features: [] });
    expect(s.layers.getLength()).toBe(0);
    expect(s.fit).not.toHaveBeenCalled();
    s.map.dispose();
    expect(s.disconnect).toHaveBeenCalledOnce();
    expect(s.setTarget).toHaveBeenCalledWith(undefined);
    expect(s.dispose).toHaveBeenCalledOnce();
  });
});
