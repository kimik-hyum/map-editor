import Collection from "ol/Collection";
import type Feature from "ol/Feature";
import GeoJSON from "ol/format/GeoJSON";
import type Geometry from "ol/geom/Geometry";
import SimpleGeometry from "ol/geom/SimpleGeometry";
import type { EventsKey } from "ol/events";
import { primaryAction } from "ol/events/condition";
import Modify, { type ModifyEvent } from "ol/interaction/Modify";
import type OpenLayersMap from "ol/Map";
import { unByKey } from "ol/Observable";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";
import { editorDefaultTheme } from "@/pages/editor/theme/editorTheme";
import { canEditLayerVertices } from "@/pages/editor/types/editorTypes";
import type {
  EditorCoordinate,
  EditorScene,
  GeoJsonGeometry,
} from "@/pages/editor/types/editorTypes";
import { forEachEditorContentLayer } from "./editorContentLayers";
import { nearestVertexDistance } from "./geometryDistance";

type VertexModifyOptions = {
  // 항상 최신 scene을 읽어 편집 대상 레이어 상태를 확인합니다.
  getScene: () => EditorScene | null;
  // 실제 정점 드래그(이동)가 시작되면 제스처당 1회 호출. 삽입 후 이어지는 드래그도 포함.
  // (클릭 추가·우클릭 삭제처럼 드래그가 없는 제스처에선 호출되지 않음 → 핸들 깜빡임 없음)
  onActiveDrag: () => void;
  // 좌표가 실제로 바뀐 피처만 호출(EPSG:4326 GeoJSON).
  onCommit: (featureId: string, geometry: GeoJsonGeometry) => void;
  // 편집 제스처 종료 시(오버레이 복구 등). 커밋 여부와 무관하게 호출.
  onModifyEnd: () => void;
  // 정점이 "추가"된 제스처일 때 호출(외곽선 클릭 직후 selection 클릭을 무시시키기 위함).
  onInsert?: () => void;
};

function createHandleStyle(): Style {
  const token = editorDefaultTheme.vertexHandle;
  return new Style({
    image: new CircleStyle({
      radius: token.radius,
      fill: new Fill({ color: token.fillColor }),
      stroke: new Stroke({ color: token.strokeColor, width: token.strokeWidth }),
    }),
  });
}

const geoJsonFormat = new GeoJSON();

// 닫힌 링(폴리곤)의 마지막 좌표가 첫 좌표와 같도록 보장합니다(변환 후 안전망).
function closeRing(ring: EditorCoordinate[]): EditorCoordinate[] {
  if (ring.length === 0) {
    return ring;
  }
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) {
    return ring;
  }
  return [...ring, [first[0], first[1]]];
}

// 폴리곤/멀티폴리곤 링 닫힘을 정규화합니다. 그 외 타입은 그대로.
export function normalizeClosedRings(geometry: GeoJsonGeometry): GeoJsonGeometry {
  if (geometry.type === "Polygon") {
    return { type: "Polygon", coordinates: geometry.coordinates.map(closeRing) };
  }
  if (geometry.type === "MultiPolygon") {
    return {
      type: "MultiPolygon",
      coordinates: geometry.coordinates.map((polygon) => polygon.map(closeRing)),
    };
  }
  return geometry;
}

// OpenLayers geometry(EPSG:3857) → 에디터 GeoJSON(경위도). 링 닫힘까지 정규화.
export function olGeometryToEditorGeometry(geometry: Geometry): GeoJsonGeometry {
  const object = geoJsonFormat.writeGeometryObject(geometry, {
    featureProjection: "EPSG:3857",
    dataProjection: "EPSG:4326",
  }) as GeoJsonGeometry;
  return normalizeClosedRings(object);
}

function sameCoordinates(a: Geometry, b: Geometry): boolean {
  if (a instanceof SimpleGeometry && b instanceof SimpleGeometry) {
    return JSON.stringify(a.getCoordinates()) === JSON.stringify(b.getCoordinates());
  }
  return false;
}

// after가 before보다 정점이 늘었는지(=정점 추가 제스처인지) 판단합니다. stride(2D/3D)를 반영합니다.
export function hasMoreVertices(before: Geometry, after: Geometry): boolean {
  if (before instanceof SimpleGeometry && after instanceof SimpleGeometry) {
    const beforeCount = before.getFlatCoordinates().length / before.getStride();
    const afterCount = after.getFlatCoordinates().length / after.getStride();
    return afterCount > beforeCount;
  }
  return false;
}

// 우클릭 정점 삭제 판정 픽셀 허용오차(OL Modify pixelTolerance와 동일).
const DELETE_HIT_PX = 10;

// 선택된 도형의 정점을 드래그(이동)/우클릭(삭제)으로 편집합니다.
// - 선택 구조는 그대로 두고, Modify는 안정적인 Collection에만 바인딩합니다.
// - 드래그 중에는 OL 콘텐츠 피처가 실시간으로 움직이고, 끝(modifyend)에만 store에 커밋합니다.
// 반환: { sync(선택 id 재바인딩), setActive(모드별 활성 토글), detach() }.
export function attachVertexModify(map: OpenLayersMap, options: VertexModifyOptions) {
  const features = new Collection<Feature>();

  // Select 외 모드에서는 정점 편집(드래그/삽입/삭제·우클릭)을 전부 멈춘다.
  let active = true;

  // 드래그 시작 시 원본 geometry를 복제해 두고(=실제 변경 여부 판단). originals 비어있지 않음 = 편집 제스처 진행 중.
  const originals = new Map<string, Geometry>();
  // 이번 제스처에서 "실제 드래그 시작"을 이미 알렸는지(제스처당 1회만 핸들 숨김).
  let activeDragSignaled = false;

  const signalActiveDrag = () => {
    if (!activeDragSignaled) {
      activeDragSignaled = true;
      options.onActiveDrag();
    }
  };

  // modifystart: 원본 geometry 스냅샷(변경 여부 판단). 드래그 원인이면 즉시 드래그로 본다.
  const handleModifyStart = (event: ModifyEvent) => {
    originals.clear();
    activeDragSignaled = false;
    event.features.forEach((feature) => {
      const id = feature.getId();
      const geometry = feature.getGeometry();
      if (typeof id === "string" && geometry) {
        originals.set(id, geometry.clone());
      }
    });
    // 기존 정점 드래그는 modifystart 원인이 pointerdrag → 즉시 드래그로 본다.
    // (삽입은 pointerdown, 삭제는 pointerup이라 여기선 안 잡히고, 삽입 후 이어지는 드래그는 아래 pointerdrag에서 잡음)
    if (event.mapBrowserEvent?.type === "pointerdrag") {
      signalActiveDrag();
    }
  };

  // modifyend: 실제로 바뀐 피처만 store에 커밋. 정점 추가 제스처면 onInsert 알림.
  const handleModifyEnd = (event: ModifyEvent) => {
    let inserted = false;
    event.features.forEach((feature) => {
      const id = feature.getId();
      const geometry = feature.getGeometry();
      if (typeof id !== "string" || !geometry) {
        return;
      }
      const before = originals.get(id);
      // 실제로 바뀐 피처만 커밋(좌표 무변화/삭제 불가 정점 우클릭 등 no-op은 건너뜀).
      if (before && sameCoordinates(before, geometry)) {
        return;
      }
      if (before && hasMoreVertices(before, geometry)) {
        inserted = true;
      }
      options.onCommit(id, olGeometryToEditorGeometry(geometry));
    });
    originals.clear();
    activeDragSignaled = false;
    // 외곽선 클릭으로 정점을 추가한 경우, 같은 클릭에서 뒤따르는 selection 클릭이 선택을 흔들지 않게 알린다.
    if (inserted) {
      options.onInsert?.();
    }
    options.onModifyEnd();
  };

  // Modify 인스턴스 생성 + modifystart/modifyend 바인딩. 진행 중 제스처 취소 시 stale 내부 상태를
  // 버리려면 재생성이 필요하므로 함수로 둔다(startKey/endKey도 새 인스턴스에 다시 묶는다).
  let startKey: EventsKey;
  let endKey: EventsKey;
  const buildModify = () => {
    const instance = new Modify({
      features,
      // 좌클릭(primaryAction)만 편집 제스처로 받는다 → 우클릭은 Modify의 드래그/이동에 전혀 관여하지 않는다.
      // (좌클릭 외곽선=정점 추가, 좌클릭 정점 드래그=이동)
      condition: primaryAction,
      insertVertexCondition: (event) => primaryAction(event),
      // 내장 삭제(좌클릭/alt 등)는 끈다. 삭제는 아래 우클릭 전용 경로로만 처리한다(드래그 불가).
      deleteCondition: () => false,
      style: createHandleStyle(),
    });
    startKey = instance.on("modifystart", handleModifyStart);
    endKey = instance.on("modifyend", handleModifyEnd);
    return instance;
  };

  let modify = buildModify();
  // 마지막에 추가된 interaction이 먼저 처리되므로, 정점 근처에서는 팬보다 편집이 우선된다.
  map.addInteraction(modify);

  // 우클릭 = 정점 삭제 전용(드래그 없음). 우클릭은 condition에서 제외돼 Modify 드래그/이동을 시작하지 않으므로,
  // 커서 근처에 정점이 있을 때만 Modify.removePoint로 그 정점을 직접 제거한다(removePoint가 dragSegments를 스스로 세팅).
  const viewport = map.getViewport();
  const handleContextMenu = (event: MouseEvent) => {
    // 비활성 모드에서는 우클릭을 가로채지 않는다(브라우저 기본 동작 허용).
    if (!active) {
      return;
    }
    event.preventDefault();
    if (features.getLength() === 0) {
      return;
    }
    const resolution = map.getView().getResolution();
    if (resolution === undefined) {
      return;
    }
    const coordinate = map.getEventCoordinate(event);
    // 세그먼트·빈 곳 우클릭은 무시: 커서가 정점 허용오차 안일 때만 삭제.
    const geometries = features
      .getArray()
      .map((feature) => feature.getGeometry())
      .filter((geometry): geometry is Geometry => geometry != null);
    if (nearestVertexDistance(geometries, coordinate) > DELETE_HIT_PX * resolution) {
      return;
    }
    modify.removePoint(coordinate);
  };
  viewport.addEventListener("contextmenu", handleContextMenu);

  // 삽입(pointerdown) 후 이어서 정점을 끌 때처럼, 편집 제스처 중 실제 드래그가 시작되면 한 번 핸들을 숨긴다.
  const dragKey = map.on("pointerdrag", () => {
    if (active && originals.size > 0) {
      signalActiveDrag();
    }
  });

  // 진행 중 제스처가 inactive로 끊기면 OL Modify 내부 상태(dragSegments/featuresBeingModified/
  // handlingDownUpSequence)가 stale로 남는다(Map은 inactive interaction에 pointerup을 전달하지 않음).
  // 깨끗한 인스턴스로 교체해 그 잔여 상태를 제거한다.
  const recreateModify = () => {
    unByKey(startKey);
    unByKey(endKey);
    map.removeInteraction(modify);
    modify = buildModify();
    map.addInteraction(modify);
  };

  // 선택된 도형의 OL 피처를 Modify 컬렉션에 다시 바인딩(scene 재빌드 후에도 호출).
  const sync = (selectedIds: ReadonlySet<string>) => {
    features.clear();
    const scene = options.getScene();
    if (!scene || selectedIds.size === 0) {
      return;
    }
    // 보임 + 편집 가능 + 잠금 해제 레이어만 편집 대상으로 묶는다(선택 후 숨김/잠금되면 제외).
    forEachEditorContentLayer(map, (layer, layerId) => {
      if (!canEditLayerVertices(scene, layerId)) {
        return;
      }
      const source = layer.getSource();
      if (!source) {
        return;
      }
      for (const id of selectedIds) {
        const feature = source.getFeatureById(id);
        if (feature) {
          features.push(feature);
        }
      }
    });
  };

  // 모드 전환 등으로 비활성화될 때: 진행 중 편집 제스처는 원본으로 되돌리고 커밋하지 않는다.
  const setActive = (next: boolean) => {
    if (!next && originals.size > 0) {
      features.forEach((feature) => {
        const id = feature.getId();
        const original = typeof id === "string" ? originals.get(id) : undefined;
        if (original) {
          feature.setGeometry(original.clone());
        }
      });
      // inactive 전환으로 끊긴 제스처의 stale 내부 상태를 깨끗한 인스턴스로 버린다.
      recreateModify();
    }
    originals.clear();
    activeDragSignaled = false;
    active = next;
    modify.setActive(next);
  };

  const detach = () => {
    unByKey(startKey);
    unByKey(dragKey);
    unByKey(endKey);
    viewport.removeEventListener("contextmenu", handleContextMenu);
    map.removeInteraction(modify);
    features.clear();
  };

  return { sync, setActive, detach };
}
