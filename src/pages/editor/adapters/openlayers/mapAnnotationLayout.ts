export type MapAnnotationCandidate = {
  featureId: string;
  pixel: readonly number[];
  width: number;
  height: number;
  priority: number;
};

// 화면 픽셀만 받는 순수 배치 정책. 선택한 후보는 좌표를 옮기지 않고 겹치는 카드만 덜어냅니다.
// 공간이 부족한 경계는 지도 이름을 유지하고, 포인터/클릭 시 우선순위 후보로 올릴 수 있습니다.
export function selectMapAnnotations<T extends MapAnnotationCandidate>(
  candidates: readonly T[],
  viewport: readonly number[],
  maxCount: number,
  preferredId: string | null = null,
): T[] {
  const ordered = [...candidates].sort((left, right) => {
    if (left.featureId === preferredId) return -1;
    if (right.featureId === preferredId) return 1;
    return (
      right.priority - left.priority || left.featureId.localeCompare(right.featureId)
    );
  });
  const result: T[] = [];
  const bounds: number[][] = [];
  for (const item of ordered) {
    if (result.length >= maxCount) break;
    const [x, y] = item.pixel;
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      item.width <= 0 ||
      item.height <= 0
    )
      continue;
    const box = [
      x - item.width / 2 - 4,
      y - item.height / 2 - 4,
      x + item.width / 2 + 4,
      y + item.height / 2 + 4,
    ];
    if (box[0] < 0 || box[1] < 0 || box[2] > viewport[0] || box[3] > viewport[1])
      continue;
    if (
      bounds.some(
        (other) =>
          box[0] < other[2] &&
          other[0] < box[2] &&
          box[1] < other[3] &&
          other[1] < box[3],
      )
    )
      continue;
    result.push(item);
    bounds.push(box);
  }
  return result;
}
