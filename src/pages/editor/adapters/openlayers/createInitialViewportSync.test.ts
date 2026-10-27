import { describe, expect, it } from "vitest";
import type OpenLayersMap from "ol/Map";
import View from "ol/View";
import { fromLonLat, toLonLat } from "ol/proj";
import { normalizeSceneInput } from "@/pages/editor/messaging/normalizeSceneInput";
import { createInitialViewportSync } from "./createInitialViewportSync";

function setup() {
  const view = new View({ center: fromLonLat([126.98, 37.57]), zoom: 12 });
  const sync = createInitialViewportSync({ getView: () => view } as OpenLayersMap);
  return { view, sync };
}

describe("첫 scene의 초기 지도 위치", () => {
  it("데이터 대기 후 도착한 미국 scene의 위치와 확대를 적용한다", () => {
    const { view, sync } = setup();
    sync.sync(null);
    sync.sync(
      normalizeSceneInput({
        version: 2,
        viewport: { center: [-73.973, 40.7725], zoom: 15 },
        features: [],
      }),
    );
    const center = toLonLat(view.getCenter() ?? []);
    expect(center[0]).toBeCloseTo(-73.973);
    expect(center[1]).toBeCloseTo(40.7725);
    expect(view.getZoom()).toBe(15);
  });
  it("편집·재INIT에는 사용자가 변경한 지도 위치를 유지한다", () => {
    const { view, sync } = setup();
    const scene = normalizeSceneInput({
      version: 2,
      viewport: { center: [-73.973, 40.7725], zoom: 15 },
      features: [],
    });
    sync.sync(scene);
    view.setCenter(fromLonLat([-122.4, 37.8]));
    view.setZoom(10);
    sync.sync(scene);
    sync.sync(null);
    sync.sync(
      normalizeSceneInput({
        version: 2,
        viewport: { center: [126.98, 37.57], zoom: 16 },
        features: [],
      }),
    );
    expect(toLonLat(view.getCenter() ?? [])[0]).toBeCloseTo(-122.4);
    expect(view.getZoom()).toBe(10);
  });
  it("viewport 없는 첫 scene은 기존 기본 뷰를 유지한다", () => {
    const { view, sync } = setup();
    sync.sync(normalizeSceneInput({ version: 2, features: [] }));
    expect(toLonLat(view.getCenter() ?? [])[0]).toBeCloseTo(126.98);
    expect(view.getZoom()).toBe(12);
  });
});
