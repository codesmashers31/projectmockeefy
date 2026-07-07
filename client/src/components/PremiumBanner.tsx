import { Sparkles, ChevronRight, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "./ui/button";
import { useAuth } from "../context/AuthContext";

export const PremiumBanner = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    if (user?.isPremium) {
        return null; // Don't show upgrade banner if already premium
    }

    const features = [
        "3 Free Mock Interviews",
        "Verified Certifications",
        "Priority Matching",
        "Expert Resume Edits"
    ];

    return (
        <div className="relative overflow-hidden rounded-2xl bg-white border border-gray-200 p-4 sm:p-5 shadow-sm mb-6 flex flex-col md:flex-row items-center gap-4 sm:gap-6 w-full">
            
            {/* Top Right Badge ("Just launched" style) */}
            <div className="absolute top-4 right-4 hidden md:block">
                <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100">
                    ₹159 / Month
                </span>
            </div>

            {/* Left Circular Logo */}
            <div className="shrink-0">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 border-2 border-white shadow-sm flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
                    <div className="relative z-10 flex flex-col items-center">
                        <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-[#004fcb] mb-0.5" strokeWidth={2.5} />
                        <span className="text-[8px] sm:text-[10px] font-black text-[#004fcb] uppercase tracking-wider">Premium</span>
                    </div>
                </div>
            </div>

            {/* Middle Content */}
            <div className="flex-1 min-w-0 flex flex-col justify-center text-center md:text-left pr-0 md:pr-40">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-1 md:hidden">
                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded-lg border border-indigo-100">
                        ₹159 / Month
                    </span>
                </div>
                
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 leading-tight mb-1">
                    Introducing Premium Monthly Pack
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mb-3 sm:mb-4">
                    Unlock exclusive interviews, expert feedback, and verified certification badges.
                </p>

                {/* Pill Tags below text */}
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                    {features.map((feature, i) => (
                        <div 
                            key={i} 
                            className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-medium text-gray-600 hover:border-[#004fcb] hover:text-[#004fcb] transition-colors cursor-default"
                        >
                            {feature}
                            <ChevronRight className="w-3 h-3 text-gray-400" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Action Button */}
            <div className="md:absolute md:right-5 md:top-1/2 md:-translate-y-1/2 mt-4 md:mt-0 w-full md:w-auto mt-2 md:mt-4">
                <Button
                    onClick={() => navigate('/payment', { state: { upgradeType: 'premium' } })}
                    className="w-full md:w-auto px-6 py-2.5 bg-[#004fcb] text-white hover:bg-blue-700 border-0 font-bold text-sm h-11 rounded-xl shadow-md transition-all"
                >
                    Upgrade now
                </Button>
            </div>
        </div>
    );
};

export default PremiumBanner;
