import DragPan from "ol/interaction/DragPan";
import PinchRotate from "ol/interaction/PinchRotate";
import PinchZoom from "ol/interaction/PinchZoom";
import type OpenLayersMap from "ol/Map";
import MapBrowserEvent from "ol/MapBrowserEvent";
import type BaseEvent from "ol/events/Event";

const isAnnotation = (target: EventTarget | null) =>
  target instanceof Element && target.closest(".map-annotation-overlay") !== null;

// 선택/정점/그리기 리스너보다 먼저 부착합니다. 오버레이에서 시작한 제스처는
// 기존 OL 탐색 interaction에만 전달해 관성·터치를 유지하고, 아래 도형 편집은 막습니다.
export function attachMapAnnotationNavigation(map: OpenLayersMap) {
  const navigation = map
    .getInteractions()
    .getArray()
    .filter(
      (interaction) =>
        interaction instanceof DragPan ||
        interaction instanceof PinchZoom ||
        interaction instanceof PinchRotate,
    )
    .reverse();
  const viewport = map.getViewport();
  const ownerWindow = map.getOwnerDocument().defaultView;
  let annotationGesture = false;
  let suppressClick = false;
  let lastPointer: PointerEvent | null = null;

  const forwardNavigation = (event: MapBrowserEvent) => {
    for (const interaction of navigation) {
      if (interaction.getActive() && !interaction.handleEvent(event)) break;
    }
  };
  const eventTypes = [
    "pointerdown",
    "pointermove",
    "pointerdrag",
    "pointerup",
    "click",
    "singleclick",
    "dblclick",
    "keydown",
  ];
  const handleEvent = (event: Event | BaseEvent) => {
    if (!(event instanceof MapBrowserEvent)) return;
    const overAnnotation = isAnnotation(event.originalEvent.target);
    if (event.type === "pointerdown" && event.activePointers?.length === 1) {
      annotationGesture = overAnnotation;
    }
    if (annotationGesture && event.type.startsWith("pointer")) {
      lastPointer = event.originalEvent as PointerEvent;
      // OL이 실제 드래그로 판정한 순간부터는 DOM click도 연산을 실행하지 않습니다.
      // 두 손가락/취소 역시 클릭이 아니며, 시작점으로 돌아와도 클릭으로 바뀌지 않습니다.
      if (
        event.type === "pointerdrag" ||
        (event.activePointers?.length ?? 0) > 1 ||
        lastPointer.type === "pointercancel"
      ) {
        suppressClick = true;
      }
      forwardNavigation(event);
      if (event.type === "pointerup" && !event.activePointers?.length) {
        annotationGesture = false;
        lastPointer = null;
      }
      // OL 이벤트만 소비합니다. 정상 DOM click/키보드 활성화는 버튼에 도달해야 합니다.
      return false;
    }
    if (
      overAnnotation &&
      !event.dragging &&
      ["pointermove", "click", "singleclick", "dblclick", "keydown"].includes(
        event.type,
      )
    ) {
      return false;
    }
  };
  for (const type of eventTypes) map.addEventListener(type, handleEvent);

  const resetClick = () => {
    if (!annotationGesture) suppressClick = false;
  };
  const guardClick = (event: MouseEvent) => {
    // detail=0인 Enter/Space·보조기술의 활성화는 직전 포인터 드래그와 무관합니다.
    if (!suppressClick || event.detail === 0) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  const cancel = () => {
    if (annotationGesture && lastPointer) {
      forwardNavigation(
        new MapBrowserEvent("pointerup", map, lastPointer, false, undefined, []),
      );
      map.getView().cancelAnimations();
      suppressClick = true;
    }
    annotationGesture = false;
    lastPointer = null;
  };
  viewport.addEventListener("pointerdown", resetClick, true);
  viewport.addEventListener("click", guardClick, true);
  viewport.addEventListener("dblclick", guardClick, true);
  ownerWindow?.addEventListener("blur", cancel);

  return {
    detach() {
      cancel();
      for (const type of eventTypes) map.removeEventListener(type, handleEvent);
      viewport.removeEventListener("pointerdown", resetClick, true);
      viewport.removeEventListener("click", guardClick, true);
      viewport.removeEventListener("dblclick", guardClick, true);
      ownerWindow?.removeEventListener("blur", cancel);
    },
  };
}
