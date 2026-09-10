import { afterEach, describe, expect, it, vi } from "vitest";
import type { EditorSceneInput } from "@/pages/editor/types/editorTypes";
import { createEditorHost } from "./createEditorHost";

afterEach(() => vi.unstubAllGlobals());

function setup() {
  let scene: EditorSceneInput = {
    version: 2,
    features: [
      { id: "a", name: "처음", geometry: { type: "Point", coordinates: [127, 37] } },
    ],
  };
  let receive = (_event: MessageEvent<unknown>) => {};
  let checkClosed = () => {};
  const popup = { closed: false, postMessage: vi.fn(), focus: vi.fn(), close: vi.fn() };
  const open = vi.fn(() => popup);
  const clearInterval = vi.fn();
  const removeEventListener = vi.fn();
  vi.stubGlobal("window", {
    location: { href: "https://host.example/demo/" },
    open,
    addEventListener: (_type: string, listener: typeof receive) => {
      receive = listener;
    },
    removeEventListener,
    setInterval: (callback: () => void) => {
      checkClosed = callback;
      return 17;
    },
    clearInterval,
  });
  const onSubmit = vi.fn((next: EditorSceneInput) => {
    scene = next;
  });
  const onStatus = vi.fn();
  const onError = vi.fn();
  const onOpen = vi.fn();
  const host = createEditorHost({
    getScene: () => scene,
    onSubmit,
    onStatus,
    onError,
    onOpen,
  });
  const send = (
    data: unknown,
    origin = "https://host.example",
    source: unknown = popup,
  ) => receive({ data, origin, source } as MessageEvent<unknown>);
  const ready = () => {
    send({ type: "MAP_EDITOR_READY" });
    const calls = popup.postMessage.mock.calls;
    return calls[calls.length - 1][0] as { sessionId: string; scene: EditorSceneInput };
  };
  return {
    host,
    popup,
    open,
    send,
    ready,
    onSubmit,
    onStatus,
    onError,
    onOpen,
    clearInterval,
    removeEventListener,
    getScene: () => scene,
    checkClosed: () => checkClosed(),
  };
}

describe("Demo 부모 편집 회차", () => {
  it("현재 부모 데이터를 스냅샷으로 전달하고 반복 READY에도 같은 회차를 유지한다", () => {
    const s = setup();
    s.host.open();
    const init = s.ready();
    s.getScene().features[0].name = "외부 변경";
    expect(init.scene.features[0].name).toBe("처음");
    expect(s.ready()).toEqual(init);
    expect(s.popup.postMessage).toHaveBeenCalledWith(
      expect.anything(),
      "https://host.example",
    );
  });

  it("SUBMIT으로 부모 데이터를 교체·종료하고 다음 창에 수정본을 전달한다", () => {
    const s = setup();
    s.host.open();
    const init = s.ready();
    const edited = {
      ...init.scene,
      features: [{ ...init.scene.features[0], name: "수정됨", visible: false }],
    };
    s.send({ type: "MAP_EDITOR_SUBMIT", sessionId: init.sessionId, scene: edited });
    expect(s.getScene()).toEqual(edited);
    expect(s.popup.close).toHaveBeenCalledOnce();
    expect(s.onStatus).toHaveBeenLastCalledWith("submitted");
    expect(s.clearInterval).toHaveBeenCalledWith(17);
    s.host.open();
    const reopened = s.ready();
    expect(reopened.scene).toEqual(edited);
    expect(reopened.sessionId).not.toBe(init.sessionId);
  });

  it("취소·수동 종료는 부모 데이터를 바꾸지 않는다", () => {
    const s = setup();
    const before = structuredClone(s.getScene());
    s.host.open();
    s.send({ type: "MAP_EDITOR_CANCEL", sessionId: s.ready().sessionId });
    expect(s.getScene()).toEqual(before);
    expect(s.onSubmit).not.toHaveBeenCalled();
    expect(s.onStatus).toHaveBeenLastCalledWith("cancelled");
    s.host.open();
    s.popup.closed = true;
    s.checkClosed();
    expect(s.onStatus).toHaveBeenLastCalledWith("closed");
    expect(s.getScene()).toEqual(before);
    expect(s.clearInterval).toHaveBeenCalledWith(17);
  });

  it("중복 열기는 기존 팝업을 포커스하며 편집 회차를 초기화하지 않는다", () => {
    const s = setup();
    s.host.open();
    const init = s.ready();
    s.host.open();
    expect(s.open).toHaveBeenCalledOnce();
    expect(s.onOpen).toHaveBeenCalledOnce();
    expect(s.popup.focus).toHaveBeenCalledOnce();
    expect(s.ready().sessionId).toBe(init.sessionId);
  });

  it("다른 source·origin·session·잘못된 payload와 완료 후 재전송을 거부한다", () => {
    const s = setup();
    s.host.open();
    const init = s.ready();
    const result = {
      type: "MAP_EDITOR_SUBMIT",
      sessionId: init.sessionId,
      scene: init.scene,
    };
    s.send(result, "https://other.example");
    s.send(result, "https://host.example", {});
    s.send({ ...result, sessionId: "stale" });
    expect(s.onError).toHaveBeenLastCalledWith(null);
    s.send({
      ...result,
      scene: {
        version: 2,
        features: [{ geometry: { type: "Point", coordinates: [999, 37] } }],
      },
    });
    expect(s.onSubmit).not.toHaveBeenCalled();
    expect(s.popup.close).not.toHaveBeenCalled();
    expect(s.onError).toHaveBeenLastCalledWith(
      expect.stringContaining("저장하지 못했습니다"),
    );
    expect(s.onStatus).toHaveBeenLastCalledWith("error");
    expect(s.getScene()).toEqual(init.scene);
    s.send(result);
    s.send(result);
    expect(s.onSubmit).toHaveBeenCalledOnce();
    expect(s.onError).toHaveBeenLastCalledWith(null);
  });

  it("팝업 차단 뒤에도 부모 데이터가 남고 다시 시도할 수 있다", () => {
    const s = setup();
    s.open.mockReturnValueOnce(null as unknown as typeof s.popup);
    s.host.open();
    expect(s.onError).toHaveBeenCalledWith(expect.stringContaining("팝업이 차단"));
    expect(s.onOpen).not.toHaveBeenCalled();
    expect(s.getScene().features[0].name).toBe("처음");
    s.host.open();
    expect(s.ready().scene).toEqual(s.getScene());
    expect(s.onError).toHaveBeenLastCalledWith(null);
  });

  it("ERROR를 안전한 문자열로 처리하고 dispose 시 수신기·타이머를 해제한다", () => {
    const s = setup();
    s.host.open();
    s.send({ type: "MAP_EDITOR_ERROR", message: { invalid: true } });
    expect(s.onError).toHaveBeenCalledWith("에디터에서 오류를 반환했습니다.");
    s.host.dispose();
    expect(s.removeEventListener).toHaveBeenCalledWith("message", expect.any(Function));
    expect(s.clearInterval).toHaveBeenCalledWith(17);
    const calls = s.onStatus.mock.calls.length;
    s.send({ type: "MAP_EDITOR_READY" });
    expect(s.onStatus).toHaveBeenCalledTimes(calls);
  });
});
