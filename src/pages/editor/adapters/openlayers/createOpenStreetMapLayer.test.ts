import OSM from "ol/source/OSM";
import { expect, it } from "vitest";
import { createOpenStreetMapLayer } from "./createOpenStreetMapLayer";

it("OSM만 별도 렌더링 컨테이너를 사용해 벡터 도형과 CSS 필터를 공유하지 않는다", () => {
  const layer = createOpenStreetMapLayer();
  expect(layer.getClassName()).toBe("osm-basemap");
  expect(layer.getSource()).toBeInstanceOf(OSM);
});
