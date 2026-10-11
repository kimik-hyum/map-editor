import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Rnd, type Props as RndProps } from "react-rnd";
import { cn } from "@/shared/utils/cn";
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
  onClose?: () => void;
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
  onClose,
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
      cancel="button, input, select, textarea"
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
          <>
            <h2 className="m-0 flex-1 text-sm font-black leading-[1.2] text-ink">
              {title}
            </h2>
            {onClose ? (
              <button
                aria-label={`${title} 닫기`}
                className="ml-2 flex h-7 w-7 items-center justify-center rounded text-slate-400 hover:bg-slate-200 hover:text-slate-700"
                onClick={onClose}
                type="button"
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            ) : null}
          </>
        }
      >
        {children}
      </PanelShell>
    </Rnd>
  );
}
