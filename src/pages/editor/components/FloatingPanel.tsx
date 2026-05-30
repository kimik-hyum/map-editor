import type { ReactNode } from "react";
import { Rnd, type Props as RndProps } from "react-rnd";
import { cn } from "../../../shared/utils/cn";
import { PanelShell } from "./PanelShell";

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
      className={cn("z-[5]", className)}
      default={defaultValue}
      dragHandleClassName={panelDragHandleClassName}
      minHeight={minHeight}
      minWidth={minWidth}
    >
      <PanelShell
        ariaLabel={title}
        className="rounded-lg border border-slate-400/70 bg-white/95 text-ink shadow-[0_18px_50px_rgba(15,23,42,0.16)]"
        headerClassName={cn(
          panelDragHandleClassName,
          "flex min-h-11 cursor-move select-none items-center bg-surface px-3.5",
        )}
        bodyClassName="p-3"
        header={
          <h2 className="m-0 text-sm font-black leading-[1.2] text-ink">{title}</h2>
        }
      >
        {children}
      </PanelShell>
    </Rnd>
  );
}
