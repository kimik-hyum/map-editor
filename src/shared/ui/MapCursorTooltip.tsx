import { type RefObject, useEffect, useRef } from "react";

type MapCursorTooltipProps = {
  // 표시할 문구. null이면 숨깁니다.
  text: string | null;
  // 커서 위치를 추적할 컨테이너(지도 영역). 이 영역 위에서 마우스를 따라다닙니다.
  containerRef: RefObject<HTMLElement | null>;
};

// 지도 위 어디서든 커서를 따라다니는 공용 툴팁입니다.
// 커서의 살짝 위쪽에 좌상단을 두는 left 정렬이며, text가 있을 때만 보입니다.
export function MapCursorTooltip({ text, containerRef }: MapCursorTooltipProps) {
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const element = tooltipRef.current;
    if (!container || !element) {
      return;
    }

    let frameId = 0;
    let pointerX = 0;
    let pointerY = 0;

    const apply = () => {
      frameId = 0;
      // 커서 기준 오른쪽 12px, 위쪽 16px 지점에 "아래 모서리"가 오도록(=커서 살짝 위), left 정렬.
      element.style.transform = `translate(${pointerX + 12}px, ${pointerY - 16}px) translateY(-100%)`;
    };

    const handlePointerMove = (event: PointerEvent) => {
      // 위치 기준은 툴팁의 positioned 조상(offsetParent). section/main 사이에 offset이 생겨도 어긋나지 않도록.
      const base = (element.offsetParent as HTMLElement | null) ?? container;
      const rect = base.getBoundingClientRect();
      pointerX = event.clientX - rect.left;
      pointerY = event.clientY - rect.top;
      if (frameId === 0) {
        frameId = requestAnimationFrame(apply);
      }
    };

    container.addEventListener("pointermove", handlePointerMove);
    return () => {
      container.removeEventListener("pointermove", handlePointerMove);
      if (frameId !== 0) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [containerRef]);

  return (
    <div
      ref={tooltipRef}
      role="status"
      aria-hidden={text === null}
      className={`pointer-events-none absolute left-0 top-0 z-[1000] whitespace-nowrap rounded-md bg-gray-900/90 px-2 py-1 text-xs font-medium text-white shadow-lg ${
        text === null ? "hidden" : ""
      }`}
    >
      {text}
    </div>
  );
}
