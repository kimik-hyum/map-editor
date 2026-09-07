import type { Coordinate } from "ol/coordinate";
import type Feature from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import type Geometry from "ol/geom/Geometry";
import MultiPolygon from "ol/geom/MultiPolygon";
import Polygon from "ol/geom/Polygon";
import type OpenLayersMap from "ol/Map";
import { unByKey } from "ol/Observable";
import Overlay from "ol/Overlay";
import {
  estimateMapAnnotationHeight,
  getMapAnnotationMetrics,
} from "@/pages/editor/theme/mapAnnotationTheme";
import type { PolygonalGeometry } from "@/pages/editor/types/editorTypes";
import {
  setRegionBoundaryActionIds,
  type RegionBoundaryLayer,
} from "./createRegionBoundaryLayer";
import { selectMapAnnotations } from "./mapAnnotationLayout";

export type RegionBoundaryOverlay = {
  featureId: string;
  boundaryId: string | number;
  element: HTMLElement;
  name: string;
  displayGeometry: PolygonalGeometry;
  zoom: number;
};

const geojson = new GeoJSON();

function interiorCoordinate(geometry: Polygon | MultiPolygon): Coordinate | null {
  if (geometry instanceof Polygon)
    return geometry.getInteriorPoint().getCoordinates().slice(0, 2);
  const widest = geometry
    .getInteriorPoints()
    .getCoordinates()
    .reduce<number[] | null>(
      (best, point) =>
        best === null || (point[2] ?? 0) > (best[2] ?? 0) ? point : best,
      null,
    );
  return widest?.slice(0, 2) ?? null;
}

// 확대 후 대표점이 화면 밖으로 나가도, 화면 안의 실제 면 내부에 카드를 붙입니다.
function visibleCoordinate(
  map: OpenLayersMap,
  geometry: Polygon | MultiPolygon,
  coordinate: Coordinate,
  size: number[],
  width: number,
  height: number,
) {
  const fits = (point: Coordinate) => {
    const pixel = map.getPixelFromCoordinate(point);
    return (
      pixel &&
      pixel[0] > width / 2 + 8 &&
      pixel[0] < size[0] - width / 2 - 8 &&
      pixel[1] > height / 2 + 8 &&
      pixel[1] < size[1] - height / 2 - 8
    );
  };
  if (fits(coordinate)) return coordinate;
  for (const y of [0.5, 0.25, 0.75]) {
    for (const x of [0.5, 0.25, 0.75]) {
      const candidate = map.getCoordinateFromPixel([size[0] * x, size[1] * y]);
      if (candidate && fits(candidate) && geometry.intersectsCoordinate(candidate))
        return candidate;
    }
  }
  return coordinate;
}

// 현재 화면의 경계 카드를 상시 표시합니다. 화면 이동/종류 변경만 다시 배치하며,
// 포인터는 밀집 때문에 생략된 후보를 우선 표시하는 보조 경로로만 사용합니다.
export function attachRegionBoundaryOverlays(
  map: OpenLayersMap,
  layer: RegionBoundaryLayer,
  onChange: (overlays: RegionBoundaryOverlay[]) => void,
) {
  const entries = new Map<string, { overlay: Overlay; element: HTMLElement }>();
  const cache = new WeakMap<
    Feature<Geometry>,
    { revision: number; coordinate: Coordinate; displayGeometry: PolygonalGeometry }
  >();
  const source = layer.getSource();
  let frame: number | null = null;
  let preferredId: string | null = null;
  let previous: RegionBoundaryOverlay[] = [];

  const sync = () => {
    frame = null;
    const size = map.getSize();
    if (!size || !source) return;
    const zoom = Math.floor(map.getView().getZoom() ?? 12);
    const metrics = getMapAnnotationMetrics(zoom);
    const viewport = map.getView().calculateExtent(size);
    const candidates = source.getFeaturesInExtent(viewport).flatMap((feature) => {
      const boundaryId = feature.getId();
      const geometry = feature.getGeometry();
      if (
        (typeof boundaryId !== "number" && typeof boundaryId !== "string") ||
        !(geometry instanceof Polygon || geometry instanceof MultiPolygon)
      )
        return [];
      let cached = cache.get(feature);
      if (!cached || cached.revision !== feature.getRevision()) {
        const coordinate = interiorCoordinate(geometry);
        if (!coordinate) return [];
        cached = {
          revision: feature.getRevision(),
          coordinate,
          displayGeometry: geojson.writeGeometryObject(geometry, {
            featureProjection: "EPSG:3857",
            dataProjection: "EPSG:4326",
          }) as PolygonalGeometry,
        };
        cache.set(feature, cached);
      }
      const name =
        typeof feature.get("name") === "string"
          ? feature.get("name")
          : String(boundaryId);
      const height = estimateMapAnnotationHeight(name, zoom);
      const coordinate = visibleCoordinate(
        map,
        geometry,
        cached.coordinate,
        size,
        metrics.cardWidth,
        height,
      );
      const pixel = map.getPixelFromCoordinate(coordinate);
      if (!pixel) return [];
      return [
        {
          featureId: String(boundaryId),
          boundaryId,
          name,
          coordinate,
          pixel,
          width: metrics.cardWidth,
          height,
          priority: geometry.getArea(),
          displayGeometry: cached.displayGeometry,
        },
      ];
    });
    // 키보드 조작 중인 카드는 포인터가 다른 경계로 이동해도 교체하지 않습니다.
    const focusedId = [...entries].find(([, entry]) =>
      entry.element.contains(document.activeElement),
    )?.[0];
    const visible = selectMapAnnotations(
      candidates,
      size,
      metrics.maxCards,
      focusedId ?? preferredId,
    );
    const ids = new Set(visible.map((item) => item.featureId));
    for (const [id, entry] of entries) {
      if (!ids.has(id)) {
        map.removeOverlay(entry.overlay);
        entries.delete(id);
      }
    }
    const handles = visible.map((item) => {
      let entry = entries.get(item.featureId);
      if (!entry) {
        const element = document.createElement("div");
        const overlay = new Overlay({
          element,
          positioning: "center-center",
          stopEvent: true,
        });
        map.addOverlay(overlay);
        entry = { element, overlay };
        entries.set(item.featureId, entry);
      }
      entry.overlay.setPosition(item.coordinate);
      return {
        featureId: item.featureId,
        boundaryId: item.boundaryId,
        name: item.name,
        element: entry.element,
        displayGeometry: item.displayGeometry,
        zoom,
      };
    });
    setRegionBoundaryActionIds(layer, ids);
    if (
      handles.length !== previous.length ||
      handles.some((item, index) => {
        const old = previous[index];
        return (
          old?.featureId !== item.featureId ||
          old.element !== item.element ||
          old.name !== item.name ||
          old.zoom !== zoom ||
          old.displayGeometry !== item.displayGeometry
        );
      })
    ) {
      previous = handles;
      onChange(handles);
    }
  };
  const schedule = () => {
    if (frame === null) frame = requestAnimationFrame(sync);
  };
  const moveKey = map.on("pointermove", (event) => {
    if (event.dragging || !source) return;
    const id = source.getFeaturesAtCoordinate(event.coordinate)[0]?.getId();
    const next = id === undefined ? null : String(id);
    // 이미 보이는 카드들은 마우스 이동만으로 다시 정렬하지 않습니다.
    if (next !== preferredId && next !== null && !entries.has(next)) {
      preferredId = next;
      schedule();
    }
  });
  const clickKey = map.on("singleclick", (event) => {
    const id = source?.getFeaturesAtCoordinate(event.coordinate)[0]?.getId();
    preferredId = id === undefined ? null : String(id);
    schedule();
  });
  const moveEndKey = map.on("moveend", schedule);
  const sizeKey = map.on("change:size", schedule);
  const sourceKey = source?.on("change", schedule);
  schedule();
  return {
    detach() {
      unByKey([moveKey, clickKey, moveEndKey, sizeKey]);
      if (sourceKey) unByKey(sourceKey);
      if (frame !== null) cancelAnimationFrame(frame);
      for (const entry of entries.values()) map.removeOverlay(entry.overlay);
      entries.clear();
      setRegionBoundaryActionIds(layer, new Set());
    },
  };
}
