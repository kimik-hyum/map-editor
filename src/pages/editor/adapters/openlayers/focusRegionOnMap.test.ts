import type OpenLayersMap from "ol/Map";
import { describe, expect, it, vi } from "vitest";
import { toLonLat } from "ol/proj";
import { focusRegionOnMap } from "./focusRegionOnMap";

describe("경계 검색 지도 이동", () => {
  it("경계가 보이는 최소 줌을 보장하고 이전 이동 애니메이션을 취소한다", () => {
    const animate = vi.fn();
    const cancelAnimations = vi.fn();
    const map = {
      getSize: () => [1440, 900],
      getView: () => ({
        getProjection: () => "EPSG:3857",
        getResolutionForExtent: () => 1000,
        getZoomForResolution: () => 8,
        animate,
        cancelAnimations,
      }),
    } as unknown as OpenLayersMap;
    focusRegionOnMap(map, [126.97, 37.58], [126.96, 37.57, 126.99, 37.6], 12);
    expect(cancelAnimations).toHaveBeenCalledOnce();
    expect(animate).toHaveBeenCalledWith(
      expect.objectContaining({ zoom: 12, duration: 450 }),
    );
    const coordinate = toLonLat(animate.mock.calls[0][0].center);
    expect(coordinate[0]).toBeCloseTo(126.97);
    expect(coordinate[1]).toBeCloseTo(37.58);
  });
});
