import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Wallet, FileText, Video, Compass } from "lucide-react";

interface Banner {
  title: string;
  subtitle: string;
  cta: string;
  to: string;
  icon: ReactNode;
  gradient: string;
}

export const PromoBanners = () => {
  const navigate = useNavigate();

  const banners: Banner[] = [
    {
      title: "Become an Expert & Earn Weekly",
      subtitle: "Mentor candidates on your own schedule and get paid out every week.",
      cta: "Apply as an expert",
      to: "/signup",
      icon: <Wallet className="w-5 h-5" />,
      gradient: "from-emerald-600 to-teal-700",
    },
    {
      title: "AI Resume Builder",
      subtitle: "Build a recruiter-ready resume in minutes with guided AI suggestions.",
      cta: "Build my resume",
      to: "/resume-builder",
      icon: <FileText className="w-5 h-5" />,
      gradient: "from-blue-600 to-indigo-700",
    },
    {
      title: "AI Interview Simulator",
      subtitle: "Practice unlimited rounds with an AI interviewer before the real thing.",
      cta: "Start a mock round",
      to: "/ai-video",
      icon: <Video className="w-5 h-5" />,
      gradient: "from-violet-600 to-purple-700",
    },
  ];

  return (
    <section className="mb-10 grid grid-cols-1 sm:grid-cols-3 gap-4">
      {banners.map((b) => (
        <button
          key={b.title}
          onClick={() => navigate(b.to)}
          className={`group relative overflow-hidden text-left rounded-3xl p-6 bg-gradient-to-br ${b.gradient} shadow-[0_10px_30px_-10px_rgba(0,0,0,0.25)] hover:shadow-[0_16px_40px_-10px_rgba(0,0,0,0.35)] hover:-translate-y-0.5 transition-all duration-300`}
        >
          <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-white/15 border border-white/20 flex items-center justify-center text-white mb-4">
                {b.icon}
              </div>
              <h3 className="text-[16px] sm:text-[17px] font-extrabold text-white leading-tight mb-1.5">{b.title}</h3>
              <p className="text-[12.5px] text-white/75 font-medium leading-relaxed mb-4 max-w-[85%]">{b.subtitle}</p>
              <span className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-white bg-white/15 group-hover:bg-white/25 px-3.5 py-2 rounded-xl transition-colors">
                {b.cta} <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </span>
            </div>
          </div>
        </button>
      ))}
    </section>
  );
};

export default PromoBanners;
