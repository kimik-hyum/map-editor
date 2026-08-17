import { describe, expect, it, vi } from "vitest";
import { ConfirmationDialogStore } from "./confirmationDialogStore";

describe("ConfirmationDialogStore", () => {
  it("전역 요청을 active snapshot으로 노출하고 응답 결과를 Promise로 반환한다", async () => {
    const store = new ConfirmationDialogStore();
    const listener = vi.fn();
    store.subscribe(listener);

    const result = store.confirm({
      title: "그리기를 취소할까요?",
      tone: "danger",
    });
    const request = store.getSnapshot().activeRequest;

    expect(request?.options.title).toBe("그리기를 취소할까요?");
    expect(listener).toHaveBeenCalled();
    expect(store.respond(request?.id ?? -1, true)).toBe(true);
    await expect(result).resolves.toBe(true);
    expect(store.getSnapshot().activeRequest).toBeNull();
  });

  it("동시 요청은 FIFO로 한 개씩 보여준다", async () => {
    const store = new ConfirmationDialogStore();
    const first = store.confirm({ title: "첫 번째" });
    const second = store.confirm({ title: "두 번째" });

    const firstRequest = store.getSnapshot().activeRequest;
    expect(firstRequest?.options.title).toBe("첫 번째");
    store.respond(firstRequest?.id ?? -1, false);
    await expect(first).resolves.toBe(false);

    const secondRequest = store.getSnapshot().activeRequest;
    expect(secondRequest?.options.title).toBe("두 번째");
    store.respond(secondRequest?.id ?? -1, true);
    await expect(second).resolves.toBe(true);
  });

  it("현재 요청과 다른 id의 응답은 무시한다", async () => {
    const store = new ConfirmationDialogStore();
    const result = store.confirm({ title: "확인" });
    const request = store.getSnapshot().activeRequest;

    expect(store.respond((request?.id ?? 0) + 1, true)).toBe(false);
    expect(store.getSnapshot().activeRequest?.id).toBe(request?.id);

    store.respond(request?.id ?? -1, false);
    await expect(result).resolves.toBe(false);
  });

  it("cancelAll은 활성·대기 요청을 모두 false로 정리한다", async () => {
    const store = new ConfirmationDialogStore();
    const first = store.confirm({ title: "첫 번째" });
    const second = store.confirm({ title: "두 번째" });

    store.cancelAll();

    await expect(first).resolves.toBe(false);
    await expect(second).resolves.toBe(false);
    expect(store.getSnapshot().activeRequest).toBeNull();
  });
});
