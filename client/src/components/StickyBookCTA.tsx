import { useEffect, useState } from "react";
import { ArrowRight, X, PhoneCall } from "lucide-react";

interface StickyBookCTAProps {
  onBookNow: () => void;
}

export const StickyBookCTA = ({ onBookNow }: StickyBookCTAProps) => {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 480);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (dismissed || !visible) return null;

  return (
    <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] sm:w-auto px-0 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-3 sm:gap-5 bg-slate-900/95 backdrop-blur-md text-white rounded-2xl sm:rounded-full pl-4 sm:pl-6 pr-2.5 py-2.5 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.5)] border border-white/10">
        <div className="w-9 h-9 rounded-full bg-blue-600/90 flex items-center justify-center shrink-0">
          <PhoneCall className="w-4 h-4 text-white" />
        </div>
        <div className="min-w-0 hidden sm:block">
          <p className="text-[13px] font-bold leading-none">Need career guidance?</p>
          <p className="text-[11px] text-slate-300 font-medium mt-1 leading-none">Book a session with industry experts today.</p>
        </div>
        <p className="text-[12.5px] font-bold leading-tight sm:hidden">Book an expert session today</p>

        <button
          onClick={onBookNow}
          className="ml-auto shrink-0 flex items-center gap-1.5 bg-white text-slate-900 hover:bg-blue-50 font-bold text-[12.5px] px-4 sm:px-5 py-2.5 rounded-full transition-all active:scale-95"
        >
          Book Now <ArrowRight size={13} />
        </button>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

export default StickyBookCTA;
