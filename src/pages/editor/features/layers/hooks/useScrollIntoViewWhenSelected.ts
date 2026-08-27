import { useEffect, useRef } from "react";

// 행이 "선택됨"으로 바뀌면 패널 스크롤 영역 안에서 그 행이 보이도록 스크롤합니다.
// 지도에서 도형을 클릭해도 패널이 해당 행으로 따라가게 하는 용도입니다.
// block: "nearest"라 이미 보이는 행(패널에서 직접 클릭한 경우)은 움직이지 않습니다.
export function useScrollIntoViewWhenSelected<Element extends HTMLElement>(
  isSelected: boolean,
) {
  const ref = useRef<Element | null>(null);

  useEffect(() => {
    if (isSelected) {
      ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [isSelected]);

  return ref;
}
