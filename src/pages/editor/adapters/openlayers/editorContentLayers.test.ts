import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { describe, expect, it } from "vitest";
import { editorLayerIdProperty } from "./createOpenLayersLayer";
import { getEditorLayerId, isEditorContentLayer } from "./editorContentLayers";

function vectorLayerWithId(id?: string) {
  const layer = new VectorLayer({ source: new VectorSource() });
  if (id !== undefined) {
    layer.set(editorLayerIdProperty, id);
  }
  return layer;
}

describe("getEditorLayerId", () => {
  it("에디터 레이어 id가 있으면 그 값을 반환한다", () => {
    expect(getEditorLayerId(vectorLayerWithId("layer-1"))).toBe("layer-1");
  });

  it("id 속성이 없으면 undefined", () => {
    expect(getEditorLayerId(vectorLayerWithId())).toBeUndefined();
  });

  it("VectorLayer가 아니어도 id 속성만 있으면 읽는다(베이스맵 등)", () => {
    const tile = new TileLayer({});
    tile.set(editorLayerIdProperty, "tile-1");
    expect(getEditorLayerId(tile)).toBe("tile-1");
  });
});

describe("isEditorContentLayer", () => {
  it("id가 있는 VectorLayer만 콘텐츠 레이어로 본다", () => {
    expect(isEditorContentLayer(vectorLayerWithId("layer-1"))).toBe(true);
  });

  it("id가 없는 VectorLayer는 제외", () => {
    expect(isEditorContentLayer(vectorLayerWithId())).toBe(false);
  });

  it("VectorLayer가 아니면 id가 있어도 제외(베이스맵·오버레이)", () => {
    const tile = new TileLayer({});
    tile.set(editorLayerIdProperty, "tile-1");
    expect(isEditorContentLayer(tile)).toBe(false);
  });
});
