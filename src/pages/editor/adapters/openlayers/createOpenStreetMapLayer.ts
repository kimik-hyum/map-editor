import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";

// 기본 배경지도인 OSM 타일 레이어를 생성합니다.
export function createOpenStreetMapLayer() {
  return new TileLayer({
    source: new OSM(),
  });
}
