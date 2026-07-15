import { Briefcase, ChevronRight, Check, Lightbulb, Zap, BookOpen, Award } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useCertification } from "../hooks/useCertification";
import axios from "../lib/axios";
import { toast } from "sonner";

interface InfoPanelProps {
  /** When true (e.g. below main on mobile), panel uses full width instead of 280px */
  fullWidth?: boolean;
}

const InfoPanel = ({ fullWidth }: InfoPanelProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: certData } = useCertification();

  const completed = certData?.completedSessions ?? 0;
  const target = certData?.targetSessions ?? 3;
  const isEligible = certData?.isEligibleForCertificate ?? false;
  const hasCert = (certData?.certifications?.length ?? 0) > 0;
  const step1Done = completed >= target;
  const step2Active = step1Done && (hasCert || isEligible);
  const step3Active = hasCert;

  const handleGetCertificate = async () => {
    const userId = (user as any)?._id ?? user?.id;
    if (!userId) return;
    try {
      const res = await axios.post("/api/certifications/issue", { userId });
      if (res.data?.success) {
        toast.success("Certificate issued!");
        navigate("/certificates");
        window.location.reload();
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Could not issue certificate.");
    }
  };

  return (
    <div className={`space-y-4 font-sans ${fullWidth ? "w-full max-w-full" : "max-w-[280px]"}`}>

      {/* Book experts & related – no AI/Intelligence */}
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)] overflow-hidden hover:shadow-[0_8px_24px_-8px_rgba(0,79,203,0.12)] transition-shadow duration-300">
        <div className="px-5 py-4 border-b border-slate-50">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Premium — ₹159</p>
        </div>
        <div className="p-3.5 space-y-2">
          <button
            onClick={() => navigate('/my-sessions')}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50/50 hover:bg-gray-100 border border-transparent hover:border-gray-200 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0 shadow-sm">
              <BookOpen className="w-4 h-4 text-gray-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-gray-900">My bookings</p>
              <p className="text-[11px] font-medium text-gray-500 mt-0.5">View, join, and review</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
          </button>
          <button
            onClick={() => navigate('/tips')}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50/50 hover:bg-amber-50 border border-transparent hover:border-amber-100 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0 shadow-sm">
              <Lightbulb className="w-4 h-4 text-amber-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-gray-900">Interview tips</p>
              <p className="text-[11px] font-medium text-gray-500 mt-0.5">Get hired faster</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
          </button>
          <button
            onClick={() => navigate('/plans')}
            className="group w-full flex items-center gap-3 p-3.5 rounded-2xl bg-blue-50/50 hover:bg-blue-600 hover:text-white border border-transparent hover:border-blue-600 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-white border border-blue-100 flex items-center justify-center shrink-0 group-hover:border-transparent shadow-sm">
              <Zap className="w-4 h-4 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-bold text-gray-900 group-hover:text-white">Plans & pricing</p>
              <p className="text-[11px] font-medium text-gray-500 group-hover:text-blue-100 mt-0.5">Unlimited mocks</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-white shrink-0" />
          </button>
        </div>
      </div>

      {/* Interview → Certificate (3 completed = certificate) */}
      <div className="bg-white rounded-[24px] border border-slate-100 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)] p-6 hover:shadow-[0_8px_24px_-8px_rgba(0,79,203,0.12)] transition-shadow duration-300">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 rounded-xl bg-[#f4f7ff] text-blue-600 flex items-center justify-center shrink-0">
            <Briefcase className="w-4 h-4" />
          </div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Path to certificate</p>
        </div>
        <div className="space-y-5">
          <div className="flex gap-4 items-start relative">
            {/* Connecting line */}
            <div className="absolute left-[13px] top-7 bottom-[-20px] w-[2px] bg-gray-100" />
            
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 z-10 ${step1Done ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
              1
            </div>
            <div className="flex-1 min-w-0 pt-0.5 pb-2">
              <p className="text-sm font-bold text-gray-900">Complete 3 mock interviews</p>
              <p className="text-xs text-gray-500 font-medium mt-1">{completed} of {target} sessions done</p>
            </div>
            {step1Done && <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" strokeWidth={3} />}
          </div>
          <div className="flex gap-4 items-start relative">
            <div className="absolute left-[13px] top-7 bottom-[-20px] w-[2px] bg-gray-100" />
            
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 z-10 ${step2Active ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
              2
            </div>
            <div className="flex-1 min-w-0 pt-0.5 pb-2">
              <p className="text-sm font-bold text-gray-900">Earn your certificate</p>
              <p className="text-xs text-gray-500 font-medium mt-1">{hasCert ? "Certificate issued" : isEligible ? "Ready to claim" : "Available after step 1"}</p>
            </div>
            {(hasCert || isEligible) && <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" strokeWidth={3} />}
          </div>
          <div className="flex gap-4 items-start">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 shrink-0 z-10 ${step3Active ? 'bg-blue-600 border-blue-600 text-white' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
              3
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <p className="text-sm font-bold text-gray-900">Get referred to companies</p>
              <p className="text-xs text-gray-500 font-medium mt-1">500+ hiring companies in Pipeline Hub</p>
            </div>
            {step3Active && <Check className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" strokeWidth={3} />}
          </div>
          {isEligible ? (
            <button
              onClick={handleGetCertificate}
              className="w-full mt-6 flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[13px] font-bold transition-all shadow-sm"
            >
              <Award size={16} /> Get your certificate
            </button>
          ) : (
            <button
              onClick={() => navigate(hasCert ? '/certificates' : '/tips')}
              className="w-full mt-6 flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-[13px] font-bold transition-all shadow-sm"
            >
              {hasCert ? "View certificates" : "Open Pipeline Hub"} <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>

    </div>
  );
};

export const SkeletonInfoPanel = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-40 bg-white rounded-2xl border border-slate-100"></div>
    <div className="h-48 bg-white rounded-2xl border border-slate-100"></div>
  </div>
);

export default InfoPanel;
