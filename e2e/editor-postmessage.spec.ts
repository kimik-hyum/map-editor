import { expect, test } from "@playwright/test";

// 부모(데모)와 팝업(에디터)이 수신한 postMessage를 캡처하기 위한 디버깅용 전역입니다.
type CapturedMessage = { origin: string; data: unknown };

declare global {
  interface Window {
    __editorReceivedMessages?: CapturedMessage[];
  }
}

function messageTypesOf(messages: CapturedMessage[]): Array<string | undefined> {
  return messages.map((entry) => (entry.data as { type?: string }).type);
}

test("데모가 새 창 에디터에 postMessage로 scene을 전달하고 에디터가 수신·렌더링한다", async ({
  context,
  page,
}) => {
  // 모든 창(부모/팝업)에서 수신한 message를 window.__editorReceivedMessages에 기록한다.
  await context.addInitScript(() => {
    window.__editorReceivedMessages = [];
    window.addEventListener("message", (event) => {
      window.__editorReceivedMessages?.push({
        origin: event.origin,
        data: event.data,
      });
    });
  });

  await page.goto("/demo");

  // 버튼 클릭 → 새 창(에디터)이 열리고 READY/INIT 핸드셰이크가 시작된다.
  const [editorPage] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("button", { name: "편집기 새 창으로 열기" }).click(),
  ]);
  await editorPage.waitForLoadState();

  // 데모 상태가 '연결됨'으로 바뀌면 READY 수신 + INIT 전송이 끝난 것이다.
  await expect(page.getByText("연결됨")).toBeVisible();

  // 수신한 scene이 실제로 에디터에 렌더링됐는지(동기화 지점) — 레이어 패널의 레이어 이름.
  await expect(editorPage.getByText("편집 대상 권역")).toBeVisible();

  // 1) 데모(부모)가 MAP_EDITOR_READY를 수신했는지
  const parentMessages = await page.evaluate(
    () => window.__editorReceivedMessages ?? [],
  );
  console.log("[demo 수신]", JSON.stringify(messageTypesOf(parentMessages)));
  expect(messageTypesOf(parentMessages)).toContain("MAP_EDITOR_READY");

  // 2) 에디터(팝업)가 MAP_EDITOR_INIT을 수신했고, 보낸 scene 값이 정확한지
  const editorMessages = await editorPage.evaluate(
    () => window.__editorReceivedMessages ?? [],
  );
  const initMessage = editorMessages.find(
    (entry) => (entry.data as { type?: string }).type === "MAP_EDITOR_INIT",
  );
  expect(initMessage, "에디터가 INIT 메시지를 수신해야 한다").toBeDefined();

  const initData = initMessage?.data as {
    sessionId?: string;
    scene?: { id?: string; name?: string; layers?: unknown[] };
  };
  console.log(
    "[editor 수신 INIT]",
    JSON.stringify({
      sessionId: initData?.sessionId,
      sceneId: initData?.scene?.id,
      sceneName: initData?.scene?.name,
      layerCount: initData?.scene?.layers?.length,
    }),
  );

  expect(initData?.sessionId).toBeTruthy();
  expect(initData?.scene?.id).toBe("sample-seoul-editor-scene");
  expect(initData?.scene?.name).toBe("서울 샘플 편집 씬");
  expect(initData?.scene?.layers?.length ?? 0).toBeGreaterThan(0);
});
