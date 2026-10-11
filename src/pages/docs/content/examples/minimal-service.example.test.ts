import { afterEach, describe, expect, it, vi } from "vitest";
import { parseInitMessage } from "@/pages/editor/messaging/editorSceneSchema";
import type { EditorSceneInput } from "./editor-contract.example";
import { mountMinimalExample } from "./minimal-service.example";

afterEach(() => vi.unstubAllGlobals());

function setup() {
  let receive: (event: MessageEvent<unknown>) => void = () => {};
  const popup = {
    closed: false,
    focus: vi.fn(),
    close: vi.fn(),
    postMessage: vi.fn(),
  };
  const open = vi.fn(() => popup);
  const removeEventListener = vi.fn();
  vi.stubGlobal("window", {
    location: { href: "https://service.example/areas" },
    open,
    addEventListener: (_type: string, listener: typeof receive) => {
      receive = listener;
    },
    removeEventListener,
  });
  const button = new EventTarget() as HTMLButtonElement;
  const result = { textContent: "" } as HTMLElement;
  const cleanup = mountMinimalExample(button, result);
  const send = (data: unknown) =>
    receive({
      data,
      origin: "https://maps-editor.pages.dev",
      source: popup,
    } as unknown as MessageEvent<unknown>);
  const startEditing = () => {
    button.dispatchEvent(new Event("click"));
    send({ type: "MAP_EDITOR_READY" });
    const calls = popup.postMessage.mock.calls;
    return calls[calls.length - 1]?.[0] as {
      type: "MAP_EDITOR_INIT";
      sessionId: string;
      scene: EditorSceneInput;
    };
  };
  return {
    button,
    result,
    popup,
    open,
    send,
    startEditing,
    cleanup,
    removeEventListener,
  };
}

describe("서비스 페이지의 최소 연동 예제", () => {
  it("유효한 사각형을 보내고 편집 결과 전체를 표시해 다음 편집에 사용한다", () => {
    const s = setup();
    const initial = s.startEditing();
    expect(parseInitMessage(initial).ok).toBe(true);
    expect(initial.scene.features).toHaveLength(1);
    expect(initial.scene.features[0]).toMatchObject({
      id: "area-1",
      name: "예제 도형",
      geometry: { type: "Polygon" },
    });
    expect(s.open).toHaveBeenCalledWith(
      "https://maps-editor.pages.dev/editor/",
      expect.any(String),
      expect.any(String),
    );

    const edited = structuredClone(initial.scene);
    edited.features[0].name = "수정한 도형";
    edited.features.push({
      id: "point-1",
      geometry: { type: "Point", coordinates: [126.976, 37.58] },
    });
    s.send({
      type: "MAP_EDITOR_SUBMIT",
      sessionId: initial.sessionId,
      scene: edited,
    });
    expect(JSON.parse(s.result.textContent ?? "")).toEqual(edited);
    expect(s.popup.close).toHaveBeenCalledOnce();
    const next = s.startEditing();
    expect(next.scene).toEqual(edited);
    expect(next.sessionId).not.toBe(initial.sessionId);
    s.cleanup();
  });

  it("취소 후 다시 편집하면 기존 편집 데이터를 보낸다", () => {
    const s = setup();
    const initial = s.startEditing();
    s.send({ type: "MAP_EDITOR_CANCEL", sessionId: initial.sessionId });
    expect(s.result.textContent).toContain("기존 편집 데이터를 유지");
    expect(s.startEditing().scene).toEqual(initial.scene);
    s.cleanup();
  });

  it("팝업 차단을 표시하고 화면 정리 후에는 창과 메시지 연결을 제거한다", () => {
    const s = setup();
    s.open.mockReturnValueOnce(null as unknown as typeof s.popup);
    s.button.dispatchEvent(new Event("click"));
    expect(s.result.textContent).toBe("팝업이 차단되었습니다.");
    s.startEditing();
    s.cleanup();
    s.button.dispatchEvent(new Event("click"));
    expect(s.open).toHaveBeenCalledTimes(2);
    expect(s.popup.close).toHaveBeenCalledOnce();
    expect(s.removeEventListener).toHaveBeenCalledWith("message", expect.any(Function));
  });
});
