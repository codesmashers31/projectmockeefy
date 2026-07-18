import { ReactNode } from "react";
import { ChevronRight, Zap, Award, Users, Gift } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface InfoPanelProps {
  /** When true (e.g. below main on mobile), panel uses full width instead of 280px */
  fullWidth?: boolean;
}

const AdCard = ({
  onClick, tag, icon, title, subtitle, cta,
}: {
  onClick: () => void;
  tag: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  cta: string;
}) => (
  <button
    onClick={onClick}
    className="group w-full text-left relative overflow-hidden bg-white border border-slate-100 rounded-[24px] p-5 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_24px_-8px_rgba(0,79,203,0.12)] hover:-translate-y-0.5 transition-all duration-300"
  >
    <span className="inline-block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2.5">{tag}</span>
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-extrabold text-gray-900 leading-tight">{title}</p>
        <p className="text-[11px] text-gray-500 font-medium mt-1">{subtitle}</p>
      </div>
    </div>
    <span className="mt-4 inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 group-hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
      {cta} <ChevronRight className="w-3.5 h-3.5" />
    </span>
  </button>
);

const InfoPanel = ({ fullWidth }: InfoPanelProps) => {
  const navigate = useNavigate();

  return (
    <div className={`space-y-4 font-sans ${fullWidth ? "w-full max-w-full" : "max-w-[280px]"}`}>
      <AdCard
        onClick={() => navigate('/certificates')}
        tag="Mockeefy"
        icon={<Award className="w-4 h-4 text-amber-500" />}
        title="Get certified"
        subtitle="Complete 3 sessions & get referred to 500+ companies"
        cta="View progress"
      />
      <AdCard
        onClick={() => navigate('/resume-builder')}
        tag="Mockeefy"
        icon={<Gift className="w-4 h-4 text-emerald-600" />}
        title="Build your resume"
        subtitle="ATS-friendly resumes in minutes"
        cta="Get started"
      />
      <AdCard
        onClick={() => navigate('/watch-mock')}
        tag="Mockeefy"
        icon={<Users className="w-4 h-4 text-indigo-600" />}
        title="Watch a mock interview"
        subtitle="See how top candidates prepare"
        cta="Watch now"
      />
    </div>
  );
};

export const SkeletonInfoPanel = () => (
  <div className="space-y-4 animate-pulse">
    <div className="h-32 bg-white rounded-2xl border border-slate-100"></div>
    <div className="h-32 bg-white rounded-2xl border border-slate-100"></div>
  </div>
);

export default InfoPanel;
