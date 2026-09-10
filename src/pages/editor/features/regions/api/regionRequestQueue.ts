import { REGION_VIEW_CONCURRENCY } from "../model/regionQueryPolicy";

// Query observer가 사라지면 대기 작업도 제거합니다. 취소된 실제 fetch가 끝나기
// 전까지 슬롯을 유지해, 빠른 화면 전환으로 동시 요청 수가 늘어나지 않게 합니다.
export function createRegionRequestQueue(limit: number) {
  let active = 0;
  const waiting: Array<{ start: () => void; cancel: () => void }> = [];
  function drain() {
    while (active < limit && waiting.length) waiting.shift()?.start();
  }
  return function run<T>(signal: AbortSignal, work: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      if (signal.aborted) {
        reject(signal.reason);
        return;
      }
      const job = {
        cancel: () => {
          const index = waiting.indexOf(job);
          if (index >= 0) waiting.splice(index, 1);
          reject(signal.reason);
        },
        start: () => {
          signal.removeEventListener("abort", job.cancel);
          if (signal.aborted) {
            reject(signal.reason);
            return;
          }
          active++;
          Promise.resolve()
            .then(work)
            .then(
              (data) => (signal.aborted ? reject(signal.reason) : resolve(data)),
              reject,
            )
            .finally(() => {
              active--;
              drain();
            });
        },
      };
      signal.addEventListener("abort", job.cancel, { once: true });
      waiting.push(job);
      drain();
    });
  };
}

export const queueRegionViewRequest = createRegionRequestQueue(REGION_VIEW_CONCURRENCY);
