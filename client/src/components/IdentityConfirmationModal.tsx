import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { Award, ShieldCheck, CheckSquare, Square, ArrowRight, UserCheck, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface IdentityConfirmationModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onConfirmed: () => void;
  candidateName: string;
  categoryName?: string;
  milestoneNumber?: number;
  onConfirmApi: (confirmedName: string) => Promise<any>;
  submitting?: boolean;
}

export const IdentityConfirmationModal: React.FC<IdentityConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirmed,
  candidateName,
  categoryName,
  milestoneNumber,
  onConfirmApi,
  submitting: externalSubmitting = false,
}) => {
  const navigate = useNavigate();
  const [confirmedCheck, setConfirmedCheck] = useState(false);
  const [internalSubmitting, setInternalSubmitting] = useState(false);

  if (!isOpen) return null;

  const submitting = externalSubmitting || internalSubmitting;

  const handleConfirm = async () => {
    if (!confirmedCheck) {
      toast.error("Please check the confirmation box to verify your name.");
      return;
    }

    try {
      setInternalSubmitting(true);
      await onConfirmApi(candidateName);
      toast.success("Certificate recipient identity confirmed!");
      onConfirmed();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || err.message || "Failed to confirm certificate identity");
    } finally {
      setInternalSubmitting(false);
    }
  };

  const handleReviewProfile = () => {
    if (onClose) onClose();
    navigate("/profile");
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="verify-cert-name-title"
    >
      <div
        className="relative bg-white rounded-2xl sm:rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col text-left transition-all animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Decorative Top Accent Bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#0755E8] via-[#3B82F6] to-[#60A5FA]" />

        {/* Modal Header */}
        <div className="px-6 pt-6 pb-4 sm:px-7 sm:pt-7 border-b border-slate-100 flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#EAF2FF] border border-[#93B8FF]/50 flex items-center justify-center text-[#0755E8] shrink-0 shadow-xs">
            <Award className="w-6 h-6 text-[#0755E8]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EBF3FF] text-[#0755E8] border border-[#BFDBFE] text-[10.5px] font-bold uppercase tracking-wider mb-1.5">
              <ShieldCheck className="w-3 h-3 text-[#0755E8]" />
              <span>Identity Verification</span>
            </div>
            <h3 id="verify-cert-name-title" className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight leading-tight">
              Verify Certificate Name {categoryName ? `— ${categoryName}` : ""}
            </h3>
            <p className="text-xs sm:text-[13px] text-slate-500 mt-1 leading-relaxed">
              Your {categoryName ? `${categoryName} ` : ""}certificate {milestoneNumber ? `(Milestone ${milestoneNumber}) ` : ""}will be issued using the confirmed name below.
            </p>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-7 space-y-5">
          {/* Prominently Displayed Candidate Name Box */}
          <div className="bg-[#F8FAFC] border-2 border-[#E2E8F0] hover:border-[#BFDBFE] rounded-2xl p-4 sm:p-5 transition-colors">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              <span>Candidate Name</span>
              <span className="text-[11px] font-medium text-[#0755E8] bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                Official Credential
              </span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-[#0F172A] tracking-tight">
              {candidateName || "Candidate"}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-2">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>This name will be permanently stamped on your certificate upon issuance.</span>
            </div>
          </div>

          {/* Explicit Confirmation Checkbox */}
          <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer transition-colors group select-none">
            <input
              type="checkbox"
              checked={confirmedCheck}
              onChange={(e) => setConfirmedCheck(e.target.checked)}
              className="sr-only"
            />
            <div className="mt-0.5 shrink-0 text-[#0755E8]">
              {confirmedCheck ? (
                <CheckSquare className="w-5 h-5 text-[#0755E8] fill-blue-50" />
              ) : (
                <Square className="w-5 h-5 text-slate-400 group-hover:text-slate-600" />
              )}
            </div>
            <span className="text-xs sm:text-sm font-semibold text-slate-800 leading-snug">
              I confirm that this is my correct name for my certificate.
            </span>
          </label>

          {/* Security and Permanence Notice */}
          <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/80 border border-amber-200/70 text-amber-900 text-xs leading-relaxed">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p>
              Once issued, certificates permanently retain this confirmed name. Modifying your profile name later will not alter already-issued certificates.
            </p>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="px-6 py-4 sm:px-7 sm:py-5 border-t border-slate-100 bg-slate-50/80 flex flex-col-reverse sm:flex-row items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleReviewProfile}
            disabled={submitting}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200/70 border border-slate-300/80 bg-white shadow-2xs transition-all cursor-pointer text-center"
          >
            Review Profile
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!confirmedCheck || submitting}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#0755E8] hover:bg-[#0645C7] active:bg-[#053BA8] shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-98"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Confirming...</span>
              </>
            ) : (
              <>
                <span>Confirm Name</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
