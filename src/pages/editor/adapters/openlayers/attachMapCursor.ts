import type OpenLayersMap from "ol/Map";
import { unByKey } from "ol/Observable";
import type { MapHoverCursor } from "@/pages/editor/theme/mapCursorTheme";

// 입력을 소비하지 않고 실제 뷰 이동만 관찰합니다. 그리기/정점 드래그를 팬으로 오인하지 않습니다.
export function attachMapCursor(map: OpenLayersMap) {
  const viewport = map.getViewport();
  const ownerDocument = map.getOwnerDocument();
  const ownerWindow = ownerDocument.defaultView;
  let pointerDown = false;
  let panning = false;
  viewport.classList.add("editor-map-viewport");

  const setPanning = (next: boolean) => {
    if (panning === next) return;
    panning = next;
    if (next) viewport.setAttribute("data-map-panning", "true");
    else viewport.removeAttribute("data-map-panning");
  };
  const handleDown = (event: PointerEvent) => {
    // 확대·축소 등 고정 컨트롤은 지도 드래그가 아닙니다.
    if (
      event.button !== 0 ||
      (event.target instanceof Element &&
        event.target.closest(".ol-overlaycontainer-stopevent"))
    )
      return;
    pointerDown = true;
  };
  const reset = () => {
    pointerDown = false;
    setPanning(false);
  };
  // interaction 처리 후 실제 팬이 반영된 프레임에서만 grabbing을 켭니다.
  // 이름/버튼에서 시작한 팬도 같은 뷰를 사용하므로 별도 제스처 정책이 필요 없습니다.
  const renderKey = map.on("postrender", () => {
    setPanning(pointerDown && map.getView().getInteracting());
  });
  viewport.addEventListener("pointerdown", handleDown, true);
  ownerDocument.addEventListener("pointerup", reset, true);
  ownerDocument.addEventListener("pointercancel", reset, true);
  ownerWindow?.addEventListener("blur", reset);

  return {
    setHoverCursor(cursor: MapHoverCursor) {
      viewport.style.setProperty("--editor-hover-cursor", cursor);
    },
    detach() {
      reset();
      unByKey(renderKey);
      viewport.removeEventListener("pointerdown", handleDown, true);
      ownerDocument.removeEventListener("pointerup", reset, true);
      ownerDocument.removeEventListener("pointercancel", reset, true);
      ownerWindow?.removeEventListener("blur", reset);
      viewport.classList.remove("editor-map-viewport");
      viewport.style.removeProperty("--editor-hover-cursor");
    },
  };
}
