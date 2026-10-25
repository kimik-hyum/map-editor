import type OpenLayersMap from "ol/Map";
import View from "ol/View";
import { fromLonLat, toLonLat } from "ol/proj";
import { expect, it } from "vitest";
import { createBoundaryCountryView } from "./boundaryCountryView";

it("국가별 마지막 위치·해상도·회전을 복원하고 같은 국가는 이동하지 않는다", () => {
  const view = new View({ center: fromLonLat([127, 37.5]), zoom: 12, rotation: 0.1 });
  const map = {
    getView: () => view,
    getSize: () => [1200, 800],
  } as unknown as OpenLayersMap;
  const activate = createBoundaryCountryView(map);
  const koreanCenter = view.getCenter();
  const koreanResolution = view.getResolution();
  activate("KR");
  expect(view.getCenter()).toEqual(koreanCenter);
  activate("US");
  expect(toLonLat(view.getCenter() ?? [])[0]).toBeLessThan(-70);
  view.setCenter(fromLonLat([-122.4, 37.8]));
  view.setZoom(10);
  view.setRotation(0);
  const usCenter = view.getCenter();
  const usResolution = view.getResolution();
  activate("US");
  expect(view.getCenter()).toEqual(usCenter);
  activate("KR");
  expect(view.getCenter()).toEqual(koreanCenter);
  expect(view.getResolution()).toBe(koreanResolution);
  expect(view.getRotation()).toBe(0.1);
  activate("US");
  expect(view.getCenter()).toEqual(usCenter);
  expect(view.getResolution()).toBe(usResolution);
  expect(view.getRotation()).toBe(0);
});
