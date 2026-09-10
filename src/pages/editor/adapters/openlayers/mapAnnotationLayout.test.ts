import { describe, expect, it } from "vitest";
import {
  selectMapAnnotations,
  type MapAnnotationCandidate,
} from "./mapAnnotationLayout";

const item = (
  featureId: string,
  x: number,
  y: number,
  priority = 1,
): MapAnnotationCandidate => ({
  featureId,
  pixel: [x, y],
  width: 180,
  height: 80,
  priority,
});
describe("selectMapAnnotations", () => {
  it("화면 안의 서로 떨어진 경계는 호버 없이 모두 선택한다", () => {
    const candidates = [item("a", 150, 150), item("b", 450, 150), item("c", 750, 450)];
    expect(selectMapAnnotations(candidates, [1000, 600], 48)).toEqual(candidates);
  });
  it("화면 밖/일부 잘림/잘못된 좌표의 후보를 제외한다", () => {
    expect(
      selectMapAnnotations(
        [
          item("a", -50, 20),
          item("b", 50, 50),
          item("c", 950, 50),
          item("d", NaN, 100),
        ],
        [1000, 600],
        48,
      ),
    ).toEqual([]);
  });
  it("카드 사이 여백까지 고려하고 우선순위가 높은 후보를 남긴다", () => {
    expect(
      selectMapAnnotations(
        [item("a", 150, 150), item("b", 337, 150, 2)],
        [1000, 600],
        48,
      ).map((entry) => entry.featureId),
    ).toEqual(["b"]);
  });
  it("밀집 지역의 클릭/호버/키보드 대상은 큰 도형보다 우선한다", () => {
    expect(
      selectMapAnnotations(
        [item("a", 150, 150, 100), item("b", 150, 150, 1)],
        [1000, 600],
        48,
        "b",
      ).map((entry) => entry.featureId),
    ).toEqual(["b"]);
  });
  it("입력 순서가 바뀌어도 같은 결과이며 입력을 변경하지 않는다", () => {
    const input = [item("b", 150, 150), item("a", 150, 150)];
    const before = structuredClone(input);
    expect(selectMapAnnotations(input, [1000, 600], 48)).toEqual(
      selectMapAnnotations([...input].reverse(), [1000, 600], 48),
    );
    expect(input).toEqual(before);
  });
  it("카드 수 예산을 넘지 않고 작은 화면에서도 겹치지 않는다", () => {
    expect(
      selectMapAnnotations([item("a", 150, 150), item("b", 450, 150)], [1000, 600], 1),
    ).toHaveLength(1);
    expect(
      selectMapAnnotations([item("a", 150, 150), item("b", 150, 155)], [320, 600], 48),
    ).toHaveLength(1);
  });
});
