import { describe, expect, it, vi } from "vitest";
import { createRegionRequestQueue } from "./regionRequestQueue";

function deferred() {
  let resolve!: (value: number) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<number>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
describe("region request queue", () => {
  it("최대 2개만 실행하고 응답 순서와 무관하게 다음 대기 요청을 시작한다", async () => {
    const run = createRegionRequestQueue(2);
    const jobs = Array.from({ length: 4 }, deferred);
    const starts: number[] = [];
    const results = jobs.map((job, i) =>
      run(new AbortController().signal, () => {
        starts.push(i);
        return job.promise;
      }),
    );
    await vi.waitFor(() => expect(starts).toEqual([0, 1]));
    jobs[1].resolve(1);
    await vi.waitFor(() => expect(starts).toEqual([0, 1, 2]));
    jobs[2].resolve(2);
    await vi.waitFor(() => expect(starts).toEqual([0, 1, 2, 3]));
    jobs[0].resolve(0);
    jobs[3].resolve(3);
    expect(await Promise.all(results)).toEqual([0, 1, 2, 3]);
  });
  it("취소된 대기 조각은 네트워크 호출 없이 제거한다", async () => {
    const run = createRegionRequestQueue(1);
    const first = deferred();
    const busy = run(new AbortController().signal, () => first.promise);
    const canceled = new AbortController();
    const work = vi.fn();
    const queued = run(canceled.signal, work);
    const rejected = expect(queued).rejects.toMatchObject({ name: "AbortError" });
    canceled.abort();
    await rejected;
    first.resolve(1);
    await busy;
    expect(work).not.toHaveBeenCalled();
  });
  it("취소를 무시하는 늦은 응답도 반환하지 않고, 실제 종료 후에만 슬롯을 비운다", async () => {
    const run = createRegionRequestQueue(1);
    const late = deferred();
    const controller = new AbortController();
    const old = run(controller.signal, () => late.promise);
    const rejected = expect(old).rejects.toMatchObject({ name: "AbortError" });
    await Promise.resolve();
    controller.abort();
    const nextWork = vi.fn(async () => 2);
    const next = run(new AbortController().signal, nextWork);
    await Promise.resolve();
    expect(nextWork).not.toHaveBeenCalled();
    late.resolve(1);
    await rejected;
    expect(await next).toBe(2);
  });
  it("서버 오류가 발생해도 다음 조각을 막지 않는다", async () => {
    const run = createRegionRequestQueue(1);
    const failed = run(new AbortController().signal, async () => {
      throw new Error("HTTP 500");
    });
    const next = run(new AbortController().signal, async () => 3);
    await expect(failed).rejects.toThrow("500");
    expect(await next).toBe(3);
  });
});
