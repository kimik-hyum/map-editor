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
  center?: number[];
};

type RegionBoundaryLayerOptions = {
  onViewChange: (view: SnappedRegionView | null) => void;
  onMoveStart?: () => void;
};

type BoundaryCollection = {
  features: readonly { id: string | number; [key: string]: unknown }[];
  [key: string]: unknown;
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

  // 매우 낮은 줌에서 격자 맞춤이 극점을 넘으면 Mercator 분할이 NaN이 됩니다.
  const clamp = (value: number, limit: number) =>
    Math.max(-limit, Math.min(limit, value));
  const result = {
    zoom,
    center: map.getView().getCenter()?.slice(),
    minLng: clamp(Math.floor(minLng / step) * step, 180),
    minLat: clamp(Math.floor(minLat / step) * step, 85),
    maxLng: clamp(Math.ceil(maxLng / step) * step, 180),
    maxLat: clamp(Math.ceil(maxLat / step) * step, 85),
  };
  return result.minLng < result.maxLng && result.minLat < result.maxLat ? result : null;
}

// 참고 레이어를 부착하고, 화면 변화와 GeoJSON 동기화를 공통 핸들로 감쌉니다.
export function attachRegionBoundaryLayer(
  map: OpenLayersMap,
  options: RegionBoundaryLayerOptions,
) {
  const layer = createRegionBoundaryLayer();
  map.addLayer(layer);

  const reportView = () => {
    options.onViewChange(readSnappedView(map));
  };

  reportView();
  const moveEndKey = map.on("moveend", reportView);
  const moveStartKey = map.on("movestart", () => options.onMoveStart?.());
  const previousById = new Map<string, BoundaryCollection["features"][number]>();

  const sync = (collection: BoundaryCollection | null) => {
    const source = layer.getSource();
    if (!source) {
      return;
    }
    if (!collection) {
      if (previousById.size) source.clear();
      previousById.clear();
      return;
    }
    const incoming = new Map(
      collection.features.map((feature) => [String(feature.id), feature]),
    );
    for (const [id, previous] of previousById) {
      if (incoming.get(id) !== previous) {
        const feature = source.getFeatureById(id);
        if (feature) source.removeFeature(feature);
      }
    }
    const added = [...incoming].filter(
      ([id, feature]) => previousById.get(id) !== feature,
    );
    if (added.length)
      source.addFeatures(
        geojson.readFeatures({
          type: "FeatureCollection",
          features: added.map(([, feature]) => feature),
        }),
      );
    previousById.clear();
    for (const [id, feature] of incoming) previousById.set(id, feature);
  };

  const detach = () => {
    unByKey([moveEndKey, moveStartKey]);
    previousById.clear();
    map.removeLayer(layer);
  };

  return { layer, sync, detach } as {
    layer: RegionBoundaryLayer;
    sync: (collection: BoundaryCollection | null) => void;
    detach: () => void;
  };
}
