import GeoJSON from "ol/format/GeoJSON";
import type OpenLayersMap from "ol/Map";
import { unByKey } from "ol/Observable";
import { transformExtent } from "ol/proj";
import {
  createRegionBoundaryLayer,
  type RegionBoundaryLayer,
} from "./createRegionBoundaryLayer";

export type SnappedRegionView = {
  zoom: number;
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};

type RegionBoundaryLayerOptions = {
  onViewChange: (view: SnappedRegionView) => void;
};

const geojson = new GeoJSON({
  dataProjection: "EPSG:4326",
  featureProjection: "EPSG:3857",
});

// 화면을 현재 줌의 타일 폭 격자로 맞춰 작은 팬에 의한 재조회와 캐시 키 분산을 막습니다.
function readSnappedView(map: OpenLayersMap): SnappedRegionView | null {
  const size = map.getSize();
  if (!size) {
    return null;
  }

  const [minLng, minLat, maxLng, maxLat] = transformExtent(
    map.getView().calculateExtent(size),
    "EPSG:3857",
    "EPSG:4326",
  );
  const zoom = Math.floor(map.getView().getZoom() ?? 12);
  const step = 360 / 2 ** zoom;

  return {
    zoom,
    minLng: Math.floor(minLng / step) * step,
    minLat: Math.floor(minLat / step) * step,
    maxLng: Math.ceil(maxLng / step) * step,
    maxLat: Math.ceil(maxLat / step) * step,
  };
}

// 참고 레이어를 부착하고, 화면 변화와 GeoJSON 동기화를 공통 핸들로 감쌉니다.
export function attachRegionBoundaryLayer(
  map: OpenLayersMap,
  options: RegionBoundaryLayerOptions,
) {
  const layer = createRegionBoundaryLayer();
  map.addLayer(layer);

  const reportView = () => {
    const view = readSnappedView(map);
    if (view) {
      options.onViewChange(view);
    }
  };

  reportView();
  const moveEndKey = map.on("moveend", reportView);

  const sync = (collection: object | null) => {
    const source = layer.getSource();
    if (!source) {
      return;
    }
    source.clear();
    if (collection) {
      source.addFeatures(geojson.readFeatures(collection));
    }
  };

  const detach = () => {
    unByKey(moveEndKey);
    map.removeLayer(layer);
  };

  return { layer, sync, detach } as {
    layer: RegionBoundaryLayer;
    sync: (collection: object | null) => void;
    detach: () => void;
  };
}
