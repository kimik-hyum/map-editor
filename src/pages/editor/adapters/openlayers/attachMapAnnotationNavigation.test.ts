import { afterEach, describe, expect, it, vi } from "vitest";
import Target from "ol/events/Target";
import DragPan from "ol/interaction/DragPan";
import PinchZoom from "ol/interaction/PinchZoom";
import type OpenLayersMap from "ol/Map";
import MapBrowserEvent from "ol/MapBrowserEvent";
import { attachMapAnnotationNavigation } from "./attachMapAnnotationNavigation";

class TestElement extends EventTarget {
  constructor(private readonly annotation = false) {
    super();
  }
  closest() {
    return this.annotation ? this : null;
  }
}

function setup() {
  vi.stubGlobal("Element", TestElement);
  const viewport = new TestElement();
  const annotation = new TestElement(true);
  const canvas = new TestElement();
  const ownerWindow = new EventTarget();
  const pan = new DragPan();
  const pinch = new PinchZoom();
  const panEvent = vi.spyOn(pan, "handleEvent").mockReturnValue(true);
  const pinchEvent = vi.spyOn(pinch, "handleEvent").mockReturnValue(true);
  const cancelAnimations = vi.fn();
  const map = Object.assign(new Target(), {
    getInteractions: () => ({ getArray: () => [pan, pinch] }),
    getViewport: () => viewport,
    getOwnerDocument: () => ({ defaultView: ownerWindow }),
    getView: () => ({ cancelAnimations }),
  }) as unknown as OpenLayersMap;
  const handle = attachMapAnnotationNavigation(map);

  const send = (
    type: string,
    target: TestElement = annotation,
    pointers = type === "pointerup" ? 0 : 1,
    originalType = type,
  ) => {
    if (type === "pointerdown") viewport.dispatchEvent(new Event("pointerdown"));
    const original = new Event(originalType, { cancelable: true });
    Object.defineProperty(original, "target", { value: target });
    const activePointers = Array.from(
      { length: pointers },
      () => original as PointerEvent,
    );
    return map.dispatchEvent(
      new MapBrowserEvent(
        type,
        map,
        original as PointerEvent,
        type === "pointerdrag",
        undefined,
        activePointers,
      ),
    );
  };
  const click = (detail = 1) => {
    const event = new Event("click", { cancelable: true });
    Object.defineProperty(event, "detail", { value: detail });
    viewport.dispatchEvent(event);
    return event.defaultPrevented;
  };
  return {
    ...handle,
    send,
    click,
    annotation,
    canvas,
    panEvent,
    pinchEvent,
    ownerWindow,
    cancelAnimations,
  };
}

afterEach(() => vi.unstubAllGlobals());

describe("지도 작업 오버레이의 탐색 입력 분리", () => {
  it("정상 버튼 클릭은 허용하고 아래 지도 선택·더블클릭·키 입력은 차단한다", () => {
    const t = setup();
    expect(t.send("pointerdown")).toBe(false);
    expect(t.send("pointerup")).toBe(false);
    expect(t.click()).toBe(false);
    for (const type of ["click", "singleclick", "dblclick", "keydown"]) {
      expect(t.send(type)).toBe(false);
    }
    expect(t.panEvent).toHaveBeenCalledTimes(2);
    t.detach();
  });

  it("버튼 밖으로 끌어도 팬을 이어가고 복귀·mouseup 뒤 클릭은 실행하지 않는다", () => {
    const t = setup();
    t.send("pointerdown");
    expect(t.send("pointerdrag", t.canvas)).toBe(false);
    t.send("pointerdrag");
    t.send("pointerup");
    expect(t.panEvent).toHaveBeenCalledTimes(4);
    expect(t.click()).toBe(true);
    expect(t.click(0)).toBe(false);
    t.send("pointerdown");
    t.send("pointerup");
    expect(t.click()).toBe(false);
    t.detach();
  });

  it("지도 면에서 시작해 버튼 위를 지나가는 드래그는 기존 interaction에 맡긴다", () => {
    const t = setup();
    expect(t.send("pointerdown", t.canvas)).not.toBe(false);
    expect(t.send("pointerdrag")).not.toBe(false);
    expect(t.send("pointerup")).not.toBe(false);
    expect(t.panEvent).not.toHaveBeenCalled();
    t.detach();
  });

  it("오버레이에서 시작한 다중 터치를 핀치에 전달하고 탭 연산은 차단한다", () => {
    const t = setup();
    t.send("pointerdown");
    t.send("pointerdown", t.canvas, 2);
    t.send("pointerup", t.canvas, 1);
    t.send("pointerup");
    expect(t.pinchEvent).toHaveBeenCalledTimes(4);
    expect(t.click()).toBe(true);
    t.detach();
  });

  it("pointercancel 후에는 클릭하지 않고 다음 제스처를 받을 수 있다", () => {
    const t = setup();
    t.send("pointerdown");
    t.send("pointerup", t.annotation, 0, "pointercancel");
    expect(t.click()).toBe(true);
    t.send("pointerdown");
    t.send("pointerup");
    expect(t.click()).toBe(false);
    t.detach();
  });

  it("창 포커스 상실과 detach는 진행 중 팬을 끝내고 리스너를 정리한다", () => {
    const t = setup();
    t.send("pointerdown");
    t.send("pointerdrag");
    t.ownerWindow.dispatchEvent(new Event("blur"));
    expect(t.panEvent.mock.lastCall?.[0].activePointers).toEqual([]);
    expect(t.cancelAnimations).toHaveBeenCalledOnce();
    expect(t.click()).toBe(true);
    t.detach();
    const count = t.panEvent.mock.calls.length;
    expect(t.send("pointerdown")).not.toBe(false);
    expect(t.panEvent).toHaveBeenCalledTimes(count);
    expect(t.click()).toBe(false);
  });
});
