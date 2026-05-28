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
      className={["floating-panel", className].filter(Boolean).join(" ")}
      default={defaultValue}
      dragHandleClassName="floating-panel__header"
      minHeight={minHeight}
      minWidth={minWidth}
    >
      <section className="floating-panel__surface" aria-label={title}>
        <header className="floating-panel__header">
          <h2>{title}</h2>
        </header>
        <div className="floating-panel__body">{children}</div>
      </section>
    </Rnd>
  );
}
