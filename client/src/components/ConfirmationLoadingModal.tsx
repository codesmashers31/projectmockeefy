import React from "react";
import { createPortal } from "react-dom";

export type BookingFlowState =
  | "selecting"
  | "payment_processing"
  | "confirming"
  | "confirmed"
  | "error";

interface ConfirmationLoadingModalProps {
  expertName: string;
  isConfirming: boolean;
  usePortal?: boolean;
}

export const ConfirmationLoadingModal: React.FC<ConfirmationLoadingModalProps> = ({
  expertName,
  isConfirming,
  usePortal = true,
}) => {
  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmation-loading-title"
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div className="relative w-full max-w-md bg-white rounded-3xl border border-slate-200/90 shadow-[0_20px_50px_-12px_rgba(15,23,42,0.25)] ring-1 ring-slate-900/[0.04] p-6 sm:p-8 text-center animate-in zoom-in-95 duration-150 font-sans overflow-hidden flex flex-col items-center">
        {/* Top subtle gradient accent line (cleanly clipped by overflow-hidden) */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-blue-500 via-[#0755E8] to-indigo-600" />

        {/* Brand spinner */}
        <div className="w-14 h-14 rounded-2xl bg-[#EAF2FF] text-[#0755E8] border border-[#BFD7FE] flex items-center justify-center mb-4.5 shadow-xs">
          <div className="w-7 h-7 border-3 border-[#0755E8] border-t-transparent rounded-full animate-spin" />
        </div>

        <h3
          id="confirmation-loading-title"
          className="text-lg sm:text-xl font-bold text-slate-900 mb-2 tracking-tight"
        >
          {isConfirming ? "Confirming your meeting..." : "Processing payment..."}
        </h3>

        <div className="text-xs sm:text-sm text-slate-500 mb-5 leading-relaxed max-w-sm mx-auto text-balance">
          {isConfirming ? (
            <p>
              Your payment was successful! Finalizing your interview slot with{" "}
              <strong className="text-slate-800 font-semibold">{expertName}</strong>.
            </p>
          ) : (
            <p>
              Please complete your transaction in the secure checkout window to allocate your slot with{" "}
              <strong className="text-slate-800 font-semibold">{expertName}</strong>.
            </p>
          )}
        </div>

        {/* Status indicator pill - strictly centered and aligned */}
        <div className="w-full flex items-center justify-center">
          <div className="inline-flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-50 border border-slate-200/80 text-[11px] sm:text-xs font-medium text-slate-600 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
            <span className="whitespace-nowrap">Please do not close or refresh this window</span>
          </div>
        </div>
      </div>
    </div>
  );

  if (usePortal && typeof document !== "undefined") {
    return createPortal(content, document.body);
  }

  return content;
};
