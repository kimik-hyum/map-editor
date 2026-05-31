import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { cn } from "../utils/cn";

type Rect = { top: number; left: number; width: number; height: number };

type MovingHighlightContextValue = {
  register: (value: string, element: HTMLElement | null) => void;
};

const MovingHighlightContext = createContext<MovingHighlightContextValue | null>(null);

type MovingHighlightProps = {
  // 현재 선택된 항목의 값입니다. 이 값이 바뀌면 인디케이터가 해당 항목으로 이동합니다.
  activeValue: string | null;
  className?: string;
  // 인디케이터의 외형(배경/테두리/모서리 등)을 지정합니다.
  indicatorClassName?: string;
  children: ReactNode;
};

// 선택된 항목 위치로 부드럽게 이동하는 범용 선택 인디케이터입니다.
// 항목의 실제 위치/크기를 측정해 따라가므로 가로·세로 어떤 배치(rail, 팝업, 세그먼트)에서도 동작합니다.
export function MovingHighlight({
  activeValue,
  className,
  indicatorClassName,
  children,
}: MovingHighlightProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsRef = useRef(new Map<string, HTMLElement>());
  const [rect, setRect] = useState<Rect | null>(null);

  const register = useCallback((value: string, element: HTMLElement | null) => {
    if (element) {
      itemsRef.current.set(value, element);
    } else {
      itemsRef.current.delete(value);
    }
  }, []);

  const measure = useCallback(() => {
    const container = containerRef.current;
    const active = activeValue ? itemsRef.current.get(activeValue) : null;

    if (!container || !active) {
      setRect(null);
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const activeRect = active.getBoundingClientRect();

    setRect({
      top: activeRect.top - containerRect.top,
      left: activeRect.left - containerRect.left,
      width: activeRect.width,
      height: activeRect.height,
    });
  }, [activeValue]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const handleResize = () => measure();
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(handleResize);

    observer?.observe(container);
    window.addEventListener("resize", handleResize);

    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [measure]);

  return (
    <MovingHighlightContext.Provider value={{ register }}>
      <div className={cn("relative", className)} ref={containerRef}>
        {rect ? (
          <span
            aria-hidden
            className={cn(
              "pointer-events-none absolute left-0 top-0 z-0 transition-[transform,width,height] duration-200 ease-out",
              indicatorClassName,
            )}
            style={{
              transform: `translate(${rect.left}px, ${rect.top}px)`,
              width: rect.width,
              height: rect.height,
            }}
          />
        ) : null}
        {children}
      </div>
    </MovingHighlightContext.Provider>
  );
}

type MovingHighlightItemProps = {
  // 인디케이터가 이 값과 MovingHighlight의 activeValue가 일치할 때 이 항목으로 이동합니다.
  value: string;
  className?: string;
  children: ReactNode;
};

// 인디케이터가 따라갈 항목 래퍼입니다. 인디케이터 위로 그려지도록 위치 기준과 z 순서를 갖습니다.
export function MovingHighlightItem({
  value,
  className,
  children,
}: MovingHighlightItemProps) {
  const context = useContext(MovingHighlightContext);
  const elementRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    context?.register(value, elementRef.current);

    return () => context?.register(value, null);
  }, [context, value]);

  return (
    <div className={cn("relative z-10", className)} ref={elementRef}>
      {children}
    </div>
  );
}
