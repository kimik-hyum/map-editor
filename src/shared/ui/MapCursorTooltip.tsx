import { type RefObject, useEffect, useRef, useState } from "react";

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
  const pointerRef = useRef<{ clientX: number; clientY: number } | null>(null);
  const [pointerInside, setPointerInside] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    const element = tooltipRef.current;
    if (!container || !element) {
      return;
    }

    let frameId = 0;

    const apply = () => {
      frameId = 0;
      const pointer = pointerRef.current;
      if (!pointer) {
        return;
      }

      const base = (element.offsetParent as HTMLElement | null) ?? container;
      const baseRect = base.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const pointerX = pointer.clientX - baseRect.left;
      const pointerY = pointer.clientY - baseRect.top;
      const minX = containerRect.left - baseRect.left;
      const minY = containerRect.top - baseRect.top;
      const maxX = containerRect.right - baseRect.left;
      const maxY = containerRect.bottom - baseRect.top;
      const width = element.offsetWidth;
      const height = element.offsetHeight;

      let x = pointerX + 12;
      if (x + width > maxX) {
        x = pointerX - width - 12;
      }
      x = Math.min(Math.max(x, minX), Math.max(minX, maxX - width));

      let y = pointerY - height - 16;
      if (y < minY) {
        y = pointerY + 16;
      }
      y = Math.min(Math.max(y, minY), Math.max(minY, maxY - height));

      element.style.transform = `translate(${x}px, ${y}px)`;
    };

    const scheduleApply = () => {
      if (frameId === 0) {
        frameId = requestAnimationFrame(apply);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      pointerRef.current = { clientX: event.clientX, clientY: event.clientY };
      scheduleApply();
    };

    const handlePointerEnter = (event: PointerEvent) => {
      pointerRef.current = { clientX: event.clientX, clientY: event.clientY };
      setPointerInside(true);
      scheduleApply();
    };
    const handlePointerLeave = () => setPointerInside(false);

    container.addEventListener("pointerenter", handlePointerEnter);
    container.addEventListener("pointerleave", handlePointerLeave);
    container.addEventListener("pointermove", handlePointerMove);
    if (pointerRef.current && pointerInside && text !== null) {
      scheduleApply();
    }
    return () => {
      container.removeEventListener("pointerenter", handlePointerEnter);
      container.removeEventListener("pointerleave", handlePointerLeave);
      container.removeEventListener("pointermove", handlePointerMove);
      if (frameId !== 0) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [containerRef, pointerInside, text]);

  return (
    <div
      ref={tooltipRef}
      role="status"
      aria-hidden={text === null || !pointerInside}
      className={`pointer-events-none absolute left-0 top-0 z-[1000] whitespace-nowrap rounded-md bg-gray-900/90 px-2 py-1 text-xs font-medium text-white shadow-lg ${
        text === null || !pointerInside ? "hidden" : ""
      }`}
    >
      {text}
    </div>
  );
}
