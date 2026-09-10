import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";

// 기본 배경지도인 OSM 타일 레이어를 생성합니다.
export function createOpenStreetMapLayer() {
  return new TileLayer({
    // 별도 컨테이너로 분리해 배경 필터가 편집 도형 캔버스에 적용되지 않게 합니다.
    className: "osm-basemap",
    source: new OSM(),
  });
}
