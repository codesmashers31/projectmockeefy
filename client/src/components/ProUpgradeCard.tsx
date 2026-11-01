import { Crown, Check, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { useAuth } from "../context/AuthContext";
import PricingIllustration from "../assets/Pricing plans-pana.svg";

interface ProUpgradeCardProps {
    /** Compact variant with no illustration - used in narrow sticky sidebars so the card never outgrows the viewport. */
    compact?: boolean;
}

export const ProUpgradeCard = ({ compact = false }: ProUpgradeCardProps) => {
    const navigate = useNavigate();
    const { user } = useAuth();

    if (user?.isPremium) {
        return (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 border border-blue-100 p-5 shadow-sm group">
                <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-40 transition-opacity">
                    <Sparkles className="w-12 h-12 text-[#004fcb]" />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="bg-[#004fcb] text-white text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Premium</div>
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mb-1 mt-2">Free Sessions Left</h4>
                    <div className="flex items-end gap-1.5 mb-2">
                        <span className="text-2xl font-black text-[#004fcb]">{user?.freeInterviewsCount || 0}</span>
                        <span className="text-[10px] text-slate-500 font-bold mb-1 uppercase">Remaining</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium leading-tight mb-0">Use these credits to book any expert for free.</p>
                </div>
            </div>
        );
    }

    if (compact) {
        return (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#fcfdfd] to-[#f4f7ff] border border-slate-200 p-4 shadow-sm group">
                <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-blue-100/50 blur-2xl pointer-events-none" />
                <div className="relative z-10 flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-1.5">
                        <Crown className="w-3.5 h-3.5 text-[#004fcb] fill-current" />
                        <span className="font-extrabold text-[10px] tracking-widest uppercase text-blue-700">Plans</span>
                    </div>
                    <span className="text-[10px] font-black text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md">From ₹219</span>
                </div>
                <h3 className="relative z-10 font-extrabold text-gray-900 text-[13.5px] leading-tight mb-1.5">3-6 free mocks + certs</h3>
                <p className="relative z-10 text-[11px] text-gray-500 font-medium leading-relaxed mb-3.5">
                    Unlock verified badges, job referrals, and HR connect.
                </p>
                <Button
                    onClick={() => navigate('/plans')}
                    className="relative z-10 w-full bg-[#004fcb] text-white hover:bg-blue-700 border-0 font-bold text-xs h-9 shadow-sm transition-all rounded-xl"
                >
                    View Plans
                </Button>
            </div>
        );
    }

    return (
        <div className="relative overflow-hidden rounded-2xl bg-[#fcfdfd] border border-slate-200 p-0 shadow-sm flex flex-col group">

            {/* Header / Illustration Area */}
            <div className="relative h-[160px] w-full bg-gradient-to-b from-[#f4f7fb] to-white flex items-center justify-center overflow-hidden pt-4 pb-2">
                <img
                    src={PricingIllustration}
                    alt="Premium Plan Illustration"
                    className="relative z-10 w-full h-full object-contain transform scale-110"
                />
            </div>

            {/* Content Area */}
            <div className="p-5 pt-4">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-1.5">
                        <Crown className="w-4 h-4 text-[#004fcb] fill-current" />
                        <span className="font-extrabold text-[11px] tracking-widest uppercase text-blue-700">Membership</span>
                    </div>
                    <span className="text-[11px] font-black text-gray-900 bg-gray-100 px-2 py-0.5 rounded-md">From ₹219/mo</span>
                </div>

                <h3 className="font-extrabold text-gray-900 text-[15px] leading-tight mb-2">Pro & Ultimate Plans</h3>
                <p className="text-xs text-gray-500 font-medium leading-relaxed mb-4">
                    Unlock mock interviews, verified certificates, and direct job referral support.
                </p>

                <ul className="space-y-2 mb-5">
                    {[
                        "3 to 6 Free Mock Interviews",
                        "Verified Certifications",
                        "Job Referral Pipeline",
                        "30m HR Real Connect"
                    ].map((feature, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs font-semibold text-gray-700">
                            <Check className="w-3.5 h-3.5 text-[#004fcb] mt-0.5 shrink-0" strokeWidth={3} />
                            {feature}
                        </li>
                    ))}
                </ul>

                <Button
                    onClick={() => navigate('/plans')}
                    className="w-full bg-[#004fcb] text-white hover:bg-blue-700 border-0 font-bold text-xs h-10 shadow-sm transition-all rounded-xl"
                >
                    View Plans
                </Button>
            </div>
        </div>
    );
};

export default ProUpgradeCard;
