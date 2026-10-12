import type OpenLayersMap from "ol/Map";
import type { BoundaryCountryCode } from "@/shared/config/boundaryCountries";
import { focusUsBoundaryPreset } from "./usBoundaryViewport";

// 국가 변경은 참고 지도의 위치만 바꾸며 편집 scene과 이력에 관여하지 않습니다.
export function createBoundaryCountryView(map: OpenLayersMap) {
  const view = map.getView();
  const capture = () => ({
    center: view.getCenter()?.slice(),
    resolution: view.getResolution(),
    rotation: view.getRotation(),
  });
  const positions: Partial<Record<BoundaryCountryCode, ReturnType<typeof capture>>> =
    {};
  let current: BoundaryCountryCode = "KR";
  return (country: BoundaryCountryCode) => {
    if (current === country) return;
    view.cancelAnimations();
    positions[current] = capture();
    current = country;
    const position = positions[country];
    if (position) {
      view.setCenter(position.center);
      view.setResolution(position.resolution);
      view.setRotation(position.rotation);
    } else if (country === "US") {
      focusUsBoundaryPreset(map, "new-york");
    }
  };
}
