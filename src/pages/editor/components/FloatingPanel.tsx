import type { ReactNode } from "react";
import { Rnd, type Props as RndProps } from "react-rnd";

type FloatingPanelSize = {
  width: number;
  height: number;
};

type FloatingPanelPosition = {
  x: number;
  y: number;
};

type FloatingPanelProps = {
  title: string;
  children?: ReactNode;
  className?: string;
  defaultPosition?: FloatingPanelPosition;
  defaultSize?: FloatingPanelSize;
  minHeight?: number;
  minWidth?: number;
};

const panelDragHandleClassName = "floating-panel-drag-handle";

function joinClassNames(...classNames: Array<string | undefined>) {
  return classNames.filter(Boolean).join(" ");
}

export function FloatingPanel({
  title,
  children,
  className,
  defaultPosition = { x: 24, y: 24 },
  defaultSize = { width: 320, height: 420 },
  minHeight = 220,
  minWidth = 260,
}: FloatingPanelProps) {
  const defaultValue: RndProps["default"] = {
    ...defaultPosition,
    ...defaultSize,
  };

  return (
    <Rnd
      bounds="parent"
      className={joinClassNames("z-[5]", className)}
      default={defaultValue}
      dragHandleClassName={panelDragHandleClassName}
      minHeight={minHeight}
      minWidth={minWidth}
    >
      <section
        className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-lg border border-slate-400/70 bg-white/95 text-[#172033] shadow-[0_18px_50px_rgba(15,23,42,0.16)]"
        aria-label={title}
      >
        <header
          className={joinClassNames(
            panelDragHandleClassName,
            "flex min-h-11 cursor-move select-none items-center border-b border-[#d6e0e7] bg-[#f8fafc] px-3.5",
          )}
        >
          <h2 className="m-0 text-sm font-black leading-[1.2] text-[#172033]">
            {title}
          </h2>
        </header>
        <div className="min-h-0 flex-1 overflow-auto p-3">{children}</div>
      </section>
    </Rnd>
  );
}
