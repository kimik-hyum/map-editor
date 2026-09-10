import { afterEach, describe, expect, it, vi } from "vitest";
import { createMapEditorHost } from "./map-editor-host.example";
import { inputScene } from "./input-scene.example";
import { editorSceneInputSchema } from "./editor-contract.example";
import { parseInitMessage } from "@/pages/editor/messaging/editorSceneSchema";

afterEach(() => vi.unstubAllGlobals());

function setup() {
  let receive: (event: MessageEvent<unknown>) => void = () => {};
  const popup = { closed: false, focus: vi.fn(), close: vi.fn(), postMessage: vi.fn() };
  const open = vi.fn(() => popup);
  const removeEventListener = vi.fn();
  vi.stubGlobal("window", {
    location: { href: "https://host.example/" },
    open,
    addEventListener: (_type: string, listener: typeof receive) => {
      receive = listener;
    },
    removeEventListener,
  });
  const scene = structuredClone(inputScene);
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  const onError = vi.fn();
  const host = createMapEditorHost({
    editorUrl: "https://editor.example/editor/",
    getScene: () => scene,
    onSubmit,
    onCancel,
    onError,
  });
  const send = (
    data: unknown,
    origin = "https://editor.example",
    source: unknown = popup,
  ) => receive({ data, origin, source } as MessageEvent<unknown>);
  const ready = () => {
    send({ type: "MAP_EDITOR_READY" });
    const calls = popup.postMessage.mock.calls;
    return calls[calls.length - 1]?.[0] as {
      sessionId: string;
      scene: typeof scene;
    };
  };
  return {
    host,
    scene,
    popup,
    open,
    send,
    ready,
    onSubmit,
    onCancel,
    onError,
    removeEventListener,
  };
}

describe("복사용 부모 연동 예제", () => {
  it("READY에 정확한 origin·동일 세션·최초 입력 스냅샷을 보낸다", () => {
    const s = setup();
    s.host.open();
    const init = s.ready();
    s.scene.name = "부모에서 바뀐 데이터";
    const again = s.ready();
    expect(again.sessionId).toBe(init.sessionId);
    expect(again.scene.name).toBe(inputScene.name);
    expect(s.popup.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "MAP_EDITOR_INIT" }),
      "https://editor.example",
    );
    expect(parseInitMessage({ type: "MAP_EDITOR_INIT", ...init }).ok).toBe(true);
  });

  it("중복 열기는 편집 중 창을 닫지 않고 포커스한다", () => {
    const s = setup();
    s.host.open();
    s.host.open();
    expect(s.open).toHaveBeenCalledTimes(1);
    expect(s.popup.close).not.toHaveBeenCalled();
    expect(s.popup.focus).toHaveBeenCalledOnce();
  });

  it("다른 창·origin·세션과 잘못된 payload는 결과를 바꾸지 않는다", () => {
    const s = setup();
    s.host.open();
    const init = s.ready();
    const result = {
      type: "MAP_EDITOR_SUBMIT",
      sessionId: init.sessionId,
      scene: init.scene,
    };
    s.send(result, "https://other.example");
    s.send(result, "https://editor.example", {});
    s.send({ ...result, sessionId: "old-session" });
    s.send({
      ...result,
      scene: {
        version: 2,
        features: [{ geometry: { type: "Point", coordinates: [999, 0] } }],
      },
    });
    expect(s.onSubmit).not.toHaveBeenCalled();
    expect(s.popup.close).not.toHaveBeenCalled();
    s.send(result);
    expect(s.onSubmit).toHaveBeenCalledOnce();
    expect(s.popup.close).toHaveBeenCalledOnce();
    s.send(result);
    expect(s.onSubmit).toHaveBeenCalledOnce();
  });

  it("취소는 scene 없이 종료하고 ERROR는 부모에 전달한다", () => {
    const s = setup();
    s.host.open();
    const init = s.ready();
    s.send({ type: "MAP_EDITOR_ERROR", message: "입력 오류" });
    expect(s.onError).toHaveBeenCalledWith("입력 오류");
    s.send({ type: "MAP_EDITOR_CANCEL", sessionId: init.sessionId });
    expect(s.onCancel).toHaveBeenCalledOnce();
    expect(s.onSubmit).not.toHaveBeenCalled();
    s.host.dispose();
    expect(s.removeEventListener).toHaveBeenCalledWith("message", expect.any(Function));
  });

  it("팝업 차단을 명확히 알리고 다시 열 수 있다", () => {
    const s = setup();
    s.open.mockReturnValueOnce(null as unknown as typeof s.popup);
    expect(() => s.host.open()).toThrow("팝업이 차단");
    s.host.open();
    expect(s.ready().sessionId).toBeTruthy();
  });
});

describe("문서와 에디터의 공통 geometry 계약", () => {
  it.each([
    { geometry: { type: "Point", coordinates: [127, 37.5] }, valid: true },
    { geometry: { type: "Point", coordinates: [181, 37.5] }, valid: false },
    { geometry: { type: "Point", coordinates: [127, 91] }, valid: false },
    {
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [1, 1],
          ],
        ],
      },
      valid: true,
    },
    {
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [0, 0],
            [1, 0],
            [0, 0],
          ],
        ],
      },
      valid: false,
    },
    { geometry: { type: "GeometryCollection", geometries: [] }, valid: false },
  ])("입력 $geometry.type / 유효=$valid", ({ geometry, valid }) => {
    const scene = { version: 2, features: [{ geometry }] };
    expect(editorSceneInputSchema.safeParse(scene).success).toBe(valid);
    expect(
      parseInitMessage({ type: "MAP_EDITOR_INIT", sessionId: "test", scene }).ok,
    ).toBe(valid);
  });
});
