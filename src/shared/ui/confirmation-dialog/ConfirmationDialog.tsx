import { AlertDialog } from "@base-ui/react/alert-dialog";
import {
  CircleCheckBig,
  CircleHelp,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import { useRef } from "react";
import type {
  ConfirmationDialogInitialFocus,
  ConfirmationDialogTone,
} from "./confirmationDialogStore";

type ConfirmationDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: ConfirmationDialogTone;
  initialFocus: ConfirmationDialogInitialFocus;
  onConfirm: () => void;
  onCancel: () => void;
};

const toneStyles: Record<
  ConfirmationDialogTone,
  { icon: LucideIcon; iconClassName: string; confirmClassName: string }
> = {
  default: {
    icon: CircleHelp,
    iconClassName: "bg-slate-100 text-slate-700",
    confirmClassName: "bg-slate-950 hover:bg-slate-800 focus-visible:ring-slate-400",
  },
  danger: {
    icon: TriangleAlert,
    iconClassName: "bg-rose-50 text-rose-600",
    confirmClassName: "bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-300",
  },
  success: {
    icon: CircleCheckBig,
    iconClassName: "bg-emerald-50 text-emerald-600",
    confirmClassName:
      "bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-300",
  },
};

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone,
  initialFocus,
  onConfirm,
  onCancel,
}: ConfirmationDialogProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const confirmButtonRef = useRef<HTMLButtonElement>(null);
  const style = toneStyles[tone];
  const Icon = style.icon;

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          onCancel();
        }
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-[100] bg-slate-950/45 backdrop-blur-[1px] transition-opacity duration-150 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <AlertDialog.Viewport className="fixed inset-0 z-[101] flex items-center justify-center p-4">
          <AlertDialog.Popup
            initialFocus={
              initialFocus === "confirm" ? confirmButtonRef : cancelButtonRef
            }
            className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl outline-none transition duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0"
          >
            <div className="flex items-start gap-3">
              <span
                className={`flex h-10 w-10 flex-none items-center justify-center rounded-xl ${style.iconClassName}`}
              >
                <Icon aria-hidden className="h-5 w-5" strokeWidth={2.25} />
              </span>
              <div className="min-w-0 pt-0.5">
                <AlertDialog.Title className="text-base font-black text-slate-950">
                  {title}
                </AlertDialog.Title>
                {description ? (
                  <AlertDialog.Description className="mt-1 text-sm font-medium leading-5 text-slate-500">
                    {description}
                  </AlertDialog.Description>
                ) : null}
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                ref={cancelButtonRef}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-extrabold text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
                onClick={onCancel}
                type="button"
              >
                {cancelLabel}
              </button>
              <button
                ref={confirmButtonRef}
                className={`rounded-lg px-3.5 py-2 text-sm font-extrabold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 ${style.confirmClassName}`}
                onClick={onConfirm}
                type="button"
              >
                {confirmLabel}
              </button>
            </div>
          </AlertDialog.Popup>
        </AlertDialog.Viewport>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
